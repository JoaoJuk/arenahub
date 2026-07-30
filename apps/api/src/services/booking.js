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

/** Confirma a reserva quando todas as cotas estão pagas ou comprometidas. */
export async function maybeConfirm(bookingId) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { shares: true } });
  const done = b.shares.filter((s) => s.status === 'paid' || s.status === 'committed').length;
  if (b.splitCount && done >= b.splitCount && b.status === 'pending')
    await prisma.booking.update({ where: { id: bookingId }, data: { status: 'confirmed' } });
}
