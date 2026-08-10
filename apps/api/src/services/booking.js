import { prisma } from '../server.js';

/**
 * Valor exato da cota de índice `index` (0 = primeira a entrar).
 * Divide sem sobrar/faltar centavos: as primeiras cotas absorvem o resto.
 * Ex.: R$ 160,00 / 3 → 53,34 + 53,33 + 53,33 = 160,00
 */
export function shareAt(totalAmount, splitCount, index) {
  const base = Math.floor(totalAmount / splitCount);
  const remainder = totalAmount % splitCount;
  return base + (index < remainder ? 1 : 0);
}

/**
 * Cotas que de fato ocupam vaga.
 *
 * `requested` é um pedido esperando o organizador aceitar — não segura vaga nem
 * entra no cálculo do valor. Toda contagem de "quantas cotas já existem" tem que
 * passar por aqui, senão um pedido pendente rouba a vaga de quem foi aceito e
 * ainda desloca o índice do `shareAt`, cobrando o centavo errado.
 */
export const heldShares = (shares) => shares.filter((s) => s.status !== 'requested');

/** Confirma a reserva quando todas as cotas estão pagas ou comprometidas. */
export async function maybeConfirm(bookingId) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { shares: true } });
  const done = b.shares.filter((s) => s.status === 'paid' || s.status === 'committed').length;
  if (b.splitCount && done >= b.splitCount && b.status === 'pending')
    await prisma.booking.update({ where: { id: bookingId }, data: { status: 'confirmed' } });
}
