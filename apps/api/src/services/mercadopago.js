// Integração Mercado Pago com fallback simulado (sem token → mock).
// Em produção configure MP_ACCESS_TOKEN e o webhook /webhooks/mercadopago.
const MP_API = 'https://api.mercadopago.com';

export function isLive() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

/**
 * Cria uma cobrança para um Payment já persistido e devolve a URL de checkout.
 * external_reference = payment.id → o webhook sabe qual pagamento aprovar.
 */
export async function createCheckout(payment, description) {
  const base = process.env.BASE_URL || 'http://localhost:3333';
  if (!isLive()) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('MP_ACCESS_TOKEN não configurado — pagamentos reais são obrigatórios em produção');
    return { checkoutUrl: `${base}/mock-pay/${payment.id}`, providerPaymentId: `mock_${payment.id}` };
  }
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ title: description, quantity: 1, currency_id: 'BRL', unit_price: payment.amount / 100 }],
      external_reference: payment.id,
      payment_methods:
        payment.method === 'pix'
          ? { excluded_payment_types: [{ id: 'credit_card' }, { id: 'ticket' }] }
          : { excluded_payment_types: [{ id: 'ticket' }] },
      notification_url: `${base}/webhooks/mercadopago`,
    }),
  });
  if (!res.ok) throw new Error(`Mercado Pago: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { checkoutUrl: data.init_point, providerPaymentId: String(data.id) };
}

/** Busca detalhes de um pagamento no MP (usado pelo webhook). */
export async function fetchPayment(mpPaymentId) {
  const res = await fetch(`${MP_API}/v1/payments/${mpPaymentId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Mercado Pago: ${res.status}`);
  return res.json();
}
