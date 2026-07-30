import { prisma } from '../server.js';
import { fetchPayment, isLive } from '../services/mercadopago.js';
import { maybeConfirm } from '../services/booking.js';

// Rotas simuladas só existem fora de produção E sem token real configurado.
const mockAllowed = () => !isLive() && process.env.NODE_ENV !== 'production';

/** Marca um Payment como aprovado e propaga (cota paga → reserva confirmada). */
async function approvePayment(paymentId, providerEventId) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === 'approved') return payment; // idempotente
  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'approved', providerEventId },
  });
  if (payment.shareId)
    await prisma.splitShare.update({ where: { id: payment.shareId }, data: { status: 'paid' } });
  const booking = await prisma.booking.findUnique({ where: { id: payment.bookingId } });
  if (booking.paymentMode === 'full')
    await prisma.booking.update({ where: { id: booking.id }, data: { status: 'confirmed' } });
  else await maybeConfirm(booking.id);
  return payment;
}

export default async function webhookRoutes(app) {
  // Webhook Mercado Pago (idempotente via providerEventId único)
  app.post('/webhooks/mercadopago', async (req, reply) => {
    const { type, data } = req.body || {};
    if (type !== 'payment' || !data?.id) return reply.send({ ignored: true });
    const eventId = `mp_${data.id}`;
    const dup = await prisma.payment.findUnique({ where: { providerEventId: eventId } });
    if (dup) return reply.send({ ok: true, duplicate: true });
    const mp = await fetchPayment(data.id);
    if (mp.status === 'approved' && mp.external_reference)
      await approvePayment(mp.external_reference, eventId);
    return reply.send({ ok: true });
  });

  // ---- Modo simulado (sem MP_ACCESS_TOKEN) ----
  app.get('/mock-pay/:id', async (req, reply) => {
    if (!mockAllowed()) return reply.code(404).send();
    const p = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!p) return reply.code(404).type('text/html').send('<h1>Pagamento não encontrado</h1>');
    const brl = (p.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return reply.type('text/html').send(`<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;display:grid;place-items:center;min-height:90vh;background:#0e1a13;color:#fff;text-align:center">
      <div><h2>💳 Checkout simulado</h2><p>Valor: <b>${brl}</b> · método: ${p.method}</p>
      <p style="opacity:.7">Sem MP_ACCESS_TOKEN configurado — ambiente de testes.</p>
      <button onclick="fetch('/payments/${p.id}/simulate',{method:'POST'}).then(()=>{document.body.innerHTML='<h1 style=\\'font-family:system-ui\\'>✅ Pagamento aprovado!</h1><p>Pode fechar esta página.</p>'})" style="padding:14px 28px;font-size:16px;border-radius:12px;border:0;background:#22c55e;color:#04170b;font-weight:700;cursor:pointer">Aprovar pagamento</button></div></body></html>`);
  });

  app.post('/payments/:id/simulate', async (req, reply) => {
    if (!mockAllowed()) return reply.code(403).send({ error: 'Disponível apenas em modo simulado' });
    const p = await approvePayment(req.params.id, `mock_evt_${req.params.id}`);
    if (!p) return reply.code(404).send({ error: 'Pagamento não encontrado' });
    return { ok: true, status: 'approved' };
  });
}
