import crypto from 'node:crypto';
import { prisma } from '../server.js';

/**
 * Verificação de e-mail e celular por código de 6 dígitos (padrão iFood/99).
 * Sem provedor configurado (EMAIL_API_KEY / SMS_API_KEY), roda em MODO DEV:
 * o código volta na resposta (`devCode`) para testar sem custo.
 * Em produção sem provedor → erro (mesma filosofia do pagamento simulado).
 */

export function normTarget(channel, target) {
  return channel === 'email'
    ? String(target).trim().toLowerCase()
    : String(target).replace(/\D/g, '');
}

const providerConfigured = (channel) =>
  channel === 'email' ? Boolean(process.env.EMAIL_API_KEY) : Boolean(process.env.SMS_API_KEY);

export async function requestCode(channel, rawTarget) {
  const target = normTarget(channel, rawTarget);
  const code = String(crypto.randomInt(100000, 1000000));
  await prisma.verificationCode.deleteMany({ where: { channel, target } });
  await prisma.verificationCode.create({
    data: { channel, target, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });

  if (providerConfigured(channel)) {
    // TODO: integrar provedor real aqui (ex.: SendGrid/Resend p/ e-mail, Twilio/Zenvia p/ SMS)
    return { sent: true };
  }
  if (process.env.NODE_ENV === 'production')
    throw new Error(`Provedor de ${channel === 'email' ? 'e-mail' : 'SMS'} não configurado em produção`);
  return { sent: true, devCode: code }; // modo dev
}

export async function checkCode(channel, rawTarget, code) {
  const target = normTarget(channel, rawTarget);
  const rec = await prisma.verificationCode.findFirst({ where: { channel, target, code: String(code) } });
  return Boolean(rec && rec.expiresAt > new Date());
}
