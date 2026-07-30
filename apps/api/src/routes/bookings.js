import crypto from 'node:crypto';
import { prisma } from '../server.js';
import { hoursBetween } from '../services/availability.js';
import { createCheckout } from '../services/mercadopago.js';
import { shareAt } from '../services/booking.js';

const shareUrlOf = (token) => `${process.env.BASE_URL || 'http://localhost:3333'}/s/${token}`;

export default async function bookingRoutes(app) {
  app.post('/bookings', {
    onRequest: [app.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['courtId', 'date', 'startTime', 'endTime', 'paymentMode'],
        properties: {
          courtId: { type: 'string' },
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          paymentMode: { type: 'string', enum: ['full', 'split', 'on_site'] },
          splitCount: { type: 'integer', minimum: 2, maximum: 30 },
          isPublic: { type: 'boolean' },
          spotsNeeded: { type: 'integer', minimum: 0, maximum: 30 },
        },
      },
    },
  }, async (req, reply) => {
    const { courtId, date, startTime, endTime, paymentMode, splitCount, isPublic, spotsNeeded } = req.body;
    if (paymentMode === 'split' && !splitCount)
      return reply.code(400).send({ error: 'Informe em quantas pessoas vai dividir (splitCount)' });

    const court = await prisma.court.findUnique({ where: { id: courtId }, include: { arena: true } });
    if (!court) return reply.code(404).send({ error: 'Quadra não encontrada' });

    const totalAmount = Math.round(court.pricePerHour * hoursBetween(startTime, endTime));
    if (totalAmount <= 0) return reply.code(400).send({ error: 'Horário inválido' });

    // Transação: impede duas reservas no mesmo horário (race condition)
    let booking;
    try {
      booking = await prisma.$transaction(async (tx) => {
        const conflict = await tx.booking.findFirst({
          where: {
            courtId, date, status: { in: ['pending', 'confirmed'] },
            startTime: { lt: endTime }, endTime: { gt: startTime },
          },
        });
        if (conflict) throw new Error('CONFLICT');
        return tx.booking.create({
          data: {
            courtId, userId: req.user.sub, date, startTime, endTime, totalAmount, paymentMode,
            splitCount: paymentMode === 'split' ? splitCount : null,
            shareToken: paymentMode === 'split' ? crypto.randomBytes(9).toString('base64url') : null,
            status: paymentMode === 'on_site' ? 'confirmed' : 'pending',
            isPublic: isPublic || false,
            spotsNeeded: spotsNeeded || 0,
          },
        });
      });
    } catch (e) {
      if (e.message === 'CONFLICT') return reply.code(409).send({ error: 'Esse horário acabou de ser reservado' });
      throw e;
    }

    const result = { booking, arena: court.arena.name, court: court.name };

    if (paymentMode === 'full') {
      const payment = await prisma.payment.create({
        data: { bookingId: booking.id, provider: process.env.MP_ACCESS_TOKEN ? 'mercadopago' : 'mock', method: 'pix', amount: totalAmount },
      });
      const { checkoutUrl, providerPaymentId } = await createCheckout(payment, `Reserva ${court.arena.name} — ${court.name} ${date} ${startTime}`);
      await prisma.payment.update({ where: { id: payment.id }, data: { checkoutUrl, providerPaymentId } });
      result.checkoutUrl = checkoutUrl;
    }
    if (paymentMode === 'split') {
      result.shareUrl = shareUrlOf(booking.shareToken);
      result.shareAmount = shareAt(totalAmount, splitCount, 0);
    }
    return reply.code(201).send(result);
  });

  app.get('/bookings/mine', { onRequest: [app.authenticate] }, async (req) => {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.sub },
      include: { court: { include: { arena: true } }, shares: true },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });
    return bookings.map((b) => ({
      ...b,
      shareUrl: b.shareToken ? shareUrlOf(b.shareToken) : null,
      paidShares: b.shares.filter((s) => s.status !== 'pending').length,
    }));
  });

  app.get('/bookings/open', async (req) => {
    const today = new Date().toISOString().slice(0, 10);
    const bookings = await prisma.booking.findMany({
      where: {
        isPublic: true,
        date: { gte: today },
        status: { in: ['pending', 'confirmed'] },
      },
      include: {
        court: { include: { arena: true } },
        shares: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return bookings.map((b) => {
      const paidShares = b.shares.filter((s) => s.status !== 'pending').length;
      const totalCost = b.totalAmount;
      const splitAmount = shareAt(totalCost, b.splitCount || 1, 0);

      return {
        id: b.id,
        arena: b.court.arena.name,
        sport: b.court.sport,
        date: b.date,
        startTime: b.startTime,
        spotsLeft: Math.max(0, b.spotsNeeded - paidShares),
        shareAmount: splitAmount,
        shareUrl: b.shareToken ? shareUrlOf(b.shareToken) : null,
      };
    }).filter(b => b.spotsLeft > 0);
  });

  app.get('/bookings/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const b = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { court: { include: { arena: true } }, shares: true, payments: true },
    });
    if (!b || b.userId !== req.user.sub) return reply.code(404).send({ error: 'Reserva não encontrada' });
    return { ...b, shareUrl: b.shareToken ? shareUrlOf(b.shareToken) : null };
  });

  app.post('/bookings/:id/cancel', { onRequest: [app.authenticate] }, async (req, reply) => {
    const b = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!b || b.userId !== req.user.sub) return reply.code(404).send({ error: 'Reserva não encontrada' });
    if (b.status === 'confirmed' && b.paymentMode !== 'on_site')
      return reply.code(400).send({ error: 'Reserva paga — solicite reembolso ao suporte' });
    return prisma.booking.update({ where: { id: b.id }, data: { status: 'cancelled' } });
  });

  app.post('/bookings/:id/invite', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { userId } = req.body;
    if (!userId) return reply.code(400).send({ error: 'Falta o userId do convidado' });

    const b = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { court: { include: { arena: true } }, shares: true },
    });

    if (!b || b.userId !== req.user.sub) return reply.code(404).send({ error: 'Reserva não encontrada' });
    if (b.paymentMode !== 'split') return reply.code(400).send({ error: 'Esta reserva não é dividida' });
    if (b.shares.length >= b.splitCount) return reply.code(409).send({ error: 'Todas as cotas já foram preenchidas' });
    if (b.shares.some(s => s.userId === userId)) return reply.code(409).send({ error: 'Usuário já convidado' });

    const guest = await prisma.user.findUnique({ where: { id: userId } });
    if (!guest) return reply.code(404).send({ error: 'Usuário não encontrado' });

    const amount = shareAt(b.totalAmount, b.splitCount, b.shares.length);
    const share = await prisma.splitShare.create({
      data: {
        bookingId: b.id,
        userId: guest.id,
        name: guest.name,
        phone: guest.phone,
        method: 'pix', // Default for app flow, can be paid later
        amount,
        status: 'pending',
      },
    });

    return reply.code(201).send({ share });
  });

  app.get('/invites', { onRequest: [app.authenticate] }, async (req, reply) => {
    const shares = await prisma.splitShare.findMany({
      where: { userId: req.user.sub, status: 'pending' },
      include: { booking: { include: { court: { include: { arena: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return shares;
  });

  app.post('/invites/:id/accept', { onRequest: [app.authenticate] }, async (req, reply) => {
    const share = await prisma.splitShare.findUnique({ where: { id: req.params.id } });
    if (!share || share.userId !== req.user.sub) return reply.code(404).send({ error: 'Convite não encontrado' });
    
    // Confirma a presença mas fica com pagamento pendente
    await prisma.splitShare.update({
      where: { id: share.id },
      data: { status: 'committed', method: 'pix' },
    });
    return { success: true };
  });

  app.post('/invites/:id/decline', { onRequest: [app.authenticate] }, async (req, reply) => {
    const share = await prisma.splitShare.findUnique({ where: { id: req.params.id } });
    if (!share || share.userId !== req.user.sub) return reply.code(404).send({ error: 'Convite não encontrado' });
    
    // Libera a vaga excluindo o registro pendente
    await prisma.splitShare.delete({ where: { id: share.id } });
    return { success: true };
  });

  app.post('/bookings/:id/pay-share', { onRequest: [app.authenticate] }, async (req, reply) => {
    const b = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { shares: true, user: true },
    });
    if (!b || b.userId !== req.user.sub) return reply.code(404).send({ error: 'Reserva não encontrada' });
    
    const existing = b.shares.find(s => s.userId === req.user.sub);
    if (existing) {
      await prisma.splitShare.update({
        where: { id: existing.id },
        data: { status: 'paid', method: 'pix' },
      });
    } else {
      if (b.shares.length >= b.splitCount) return reply.code(409).send({ error: 'As cotas já foram preenchidas' });
      const amount = shareAt(b.totalAmount, b.splitCount, b.shares.length);
      await prisma.splitShare.create({
        data: {
          bookingId: b.id,
          userId: req.user.sub,
          name: b.user.name,
          phone: b.user.phone,
          method: 'pix',
          amount,
          status: 'paid',
        },
      });
    }
    return { success: true };
  });

  app.patch('/bookings/:id/public', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { isPublic, spotsNeeded } = req.body;
    const b = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!b || b.userId !== req.user.sub) return reply.code(404).send({ error: 'Reserva não encontrada' });
    
    await prisma.booking.update({
      where: { id: b.id },
      data: { isPublic, spotsNeeded: spotsNeeded || 0 },
    });
    return { success: true };
  });
}
