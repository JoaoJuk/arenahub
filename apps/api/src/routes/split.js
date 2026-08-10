import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../server.js';
import { createCheckout } from '../services/mercadopago.js';
import { maybeConfirm, shareAt, heldShares } from '../services/booking.js';

const webDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../web');
const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function loadBooking(token) {
  return prisma.booking.findUnique({
    where: { shareToken: token },
    include: { court: { include: { arena: true } }, shares: true },
  });
}

export default async function splitRoutes(app) {
  // Página pública do link (convidado NÃO precisa do app)
  app.get('/s/:token', async (req, reply) => {
    const b = await loadBooking(req.params.token);
    if (!b) return reply.code(404).type('text/html').send('<h1>Link inválido ou expirado</h1>');
    const html = fs.readFileSync(path.join(webDir, 'split.html'), 'utf8')
      .replaceAll('{{TOKEN}}', b.shareToken)
      .replaceAll('{{ARENA}}', b.court.arena.name)
      .replaceAll('{{COURT}}', b.court.name)
      .replaceAll('{{DATE}}', b.date.split('-').reverse().join('/'))
      .replaceAll('{{TIME}}', `${b.startTime}–${b.endTime}`)
      .replaceAll('{{SHARE_AMOUNT}}', brl(shareAt(b.totalAmount, b.splitCount, heldShares(b.shares).length)))
      .replaceAll('{{TOTAL}}', brl(b.totalAmount));
    return reply.type('text/html').send(html);
  });

  // Estado da divisão (JSON — usado pela página e pelo app)
  app.get('/split/:token', async (req, reply) => {
    const b = await loadBooking(req.params.token);
    if (!b) return reply.code(404).send({ error: 'Link inválido' });
    return {
      arena: b.court.arena.name, court: b.court.name, date: b.date,
      startTime: b.startTime, endTime: b.endTime, status: b.status,
      totalAmount: b.totalAmount, splitCount: b.splitCount,
      shareAmount: shareAt(b.totalAmount, b.splitCount, heldShares(b.shares).length),
      // Pedidos ainda não aceitos pelo organizador não aparecem nem contam vaga.
      shares: heldShares(b.shares).map((s) => ({ name: s.name, method: s.method, status: s.status })),
      remaining: b.splitCount - heldShares(b.shares).length,
    };
  });

  // Convidado entra na divisão: nome + telefone + forma de pagamento
  app.post('/split/:token/join', {
    config: { rateLimit: { max: 15, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['name', 'phone', 'method'],
        properties: {
          name: { type: 'string', minLength: 2 },
          phone: { type: 'string', minLength: 8 },
          method: { type: 'string', enum: ['pix', 'card', 'on_site'] },
        },
      },
    },
  }, async (req, reply) => {
    const { name, phone, method } = req.body;

    // Transação: recontagem das cotas DENTRO dela — dois amigos clicando ao
    // mesmo tempo na última vaga não estouram o splitCount.
    let b, share;
    try {
      ({ b, share } = await prisma.$transaction(async (tx) => {
        const cur = await tx.booking.findUnique({
          where: { shareToken: req.params.token },
          include: { court: { include: { arena: true } }, shares: true },
        });
        if (!cur) throw new Error('NOT_FOUND');
        if (cur.status === 'cancelled') throw new Error('CANCELLED');
        const held = heldShares(cur.shares);
        if (held.length >= cur.splitCount) throw new Error('FULL');
        const amount = shareAt(cur.totalAmount, cur.splitCount, held.length);
        const created = await tx.splitShare.create({
          data: {
            bookingId: cur.id, name, phone, method, amount,
            status: method === 'on_site' ? 'committed' : 'pending',
          },
        });
        return { b: cur, share: created };
      }));
    } catch (e) {
      if (e.message === 'NOT_FOUND') return reply.code(404).send({ error: 'Link inválido' });
      if (e.message === 'CANCELLED') return reply.code(410).send({ error: 'Reserva cancelada' });
      if (e.message === 'FULL') return reply.code(409).send({ error: 'Todas as cotas já foram preenchidas' });
      throw e;
    }
    const amount = share.amount;

    let checkoutUrl = null;
    if (method !== 'on_site') {
      const payment = await prisma.payment.create({
        data: {
          bookingId: b.id, shareId: share.id, method, amount,
          provider: process.env.MP_ACCESS_TOKEN ? 'mercadopago' : 'mock',
        },
      });
      const co = await createCheckout(payment, `Cota ${name} — ${b.court.arena.name} ${b.date} ${b.startTime}`);
      checkoutUrl = co.checkoutUrl;
      await prisma.payment.update({ where: { id: payment.id }, data: { checkoutUrl, providerPaymentId: co.providerPaymentId } });
    }
    await maybeConfirm(b.id);
    return reply.code(201).send({ shareId: share.id, amount, method, checkoutUrl });
  });
}
