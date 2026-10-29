import crypto from 'node:crypto';
import { prisma } from '../server.js';
import { hoursBetween } from '../services/availability.js';
import { createCheckout } from '../services/mercadopago.js';
import { shareAt, heldShares, maybeConfirm } from '../services/booking.js';

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
    const me = req.user.sub;
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { userId: me },
          // Reservas em que entrei como cotista. `requested` fica de fora: o
          // pedido só vira reserva minha depois que o organizador aceita.
          { shares: { some: { userId: me, status: { in: ['pending', 'committed', 'paid'] } } } },
        ],
      },
      include: { court: { include: { arena: true } }, shares: true },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });
    return bookings.map((b) => {
      const held = heldShares(b.shares);
      const isOrganizer = b.userId === me;
      return {
        ...b,
        // Só o organizador recebe o link de convite.
        shareUrl: isOrganizer && b.shareToken ? shareUrlOf(b.shareToken) : null,
        paidShares: held.filter((s) => s.status !== 'pending').length,
        myRole: isOrganizer ? 'organizer' : 'participant',
        // Aviso na lista: é onde o organizador descobre que tem gente pedindo
        // para entrar (não existe notificação no app ainda).
        pendingRequests: isOrganizer ? b.shares.filter((s) => s.status === 'requested').length : 0,
      };
    });
  });

  app.get('/bookings/open', async (req) => {
    // Rota pública (o card aparece para quem nem entrou), mas se vier um token
    // válido dá para dizer se VOCÊ já pediu para entrar neste racha.
    let me = null;
    try { await req.jwtVerify(); me = req.user.sub; } catch { /* visitante */ }

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
      const held = heldShares(b.shares);
      const taken = held.length;
      const paidShares = held.filter((s) => s.status !== 'pending').length;
      const splitAmount = shareAt(b.totalAmount, b.splitCount || 1, 0);
      const mine = me ? b.shares.find((s) => s.userId === me) : null;

      return {
        id: b.id,
        arena: b.court.arena.name,
        sport: b.court.sport,
        date: b.date,
        startTime: b.startTime,
        spotsLeft: Math.max(0, b.spotsNeeded - taken),
        // O card de racha da home mostra "+N confirmados" ao lado das vagas —
        // sem estes dois campos ele teria só metade da informação.
        confirmed: paidShares,
        spotsTotal: b.spotsNeeded,
        shareAmount: splitAmount,
        shareUrl: b.shareToken ? shareUrlOf(b.shareToken) : null,
        // 'requested' | 'pending' | 'committed' | 'paid' | null — o card usa
        // para saber se mostra "Pedir para entrar" ou "Pedido enviado".
        myStatus: mine ? mine.status : null,
        isOrganizer: me ? b.userId === me : false,
      };
    }).filter((b) => b.spotsLeft > 0 || b.myStatus);
  });

  app.get('/bookings/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const b = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { court: { include: { arena: true } }, shares: true, payments: true },
    });
    if (!b) return reply.code(404).send({ error: 'Reserva não encontrada' });

    // Quem tem cota também abre a tela — senão o jogador aceito num racha não
    // conseguiria nem ver a reserva, nem pagar a parte dele.
    const me = req.user.sub;
    const myShare = b.shares.find((s) => s.userId === me) || null;
    const isOrganizer = b.userId === me;
    if (!isOrganizer && !myShare) return reply.code(404).send({ error: 'Reserva não encontrada' });

    return {
      ...b,
      // O link de convite é do organizador; participante não distribui vaga.
      shareUrl: isOrganizer && b.shareToken ? shareUrlOf(b.shareToken) : null,
      myRole: isOrganizer ? 'organizer' : 'participant',
      myShare,
    };
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
    const held = heldShares(b.shares);
    if (held.length >= b.splitCount) return reply.code(409).send({ error: 'Todas as cotas já foram preenchidas' });
    if (b.shares.some(s => s.userId === userId)) return reply.code(409).send({ error: 'Usuário já convidado' });

    const guest = await prisma.user.findUnique({ where: { id: userId } });
    if (!guest) return reply.code(404).send({ error: 'Usuário não encontrado' });

    const amount = shareAt(b.totalAmount, b.splitCount, held.length);
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
    // Sem isto, fechar as cotas pelo app nunca confirmava a reserva — só o
    // caminho do link público e o webhook de pagamento confirmavam.
    await maybeConfirm(share.bookingId);
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
    if (!b) return reply.code(404).send({ error: 'Reserva não encontrada' });

    // Antes só o organizador passava aqui, então o participante não conseguia
    // pagar a própria cota. Agora quem tem cota paga a dele.
    const me = req.user.sub;
    const existing = b.shares.find((s) => s.userId === me);
    const isOrganizer = b.userId === me;
    if (!isOrganizer && !existing) return reply.code(404).send({ error: 'Reserva não encontrada' });
    if (existing && existing.status === 'requested')
      return reply.code(409).send({ error: 'Seu pedido ainda não foi aceito pelo organizador' });

    if (existing) {
      await prisma.splitShare.update({
        where: { id: existing.id },
        data: { status: 'paid', method: 'pix' },
      });
    } else {
      const held = heldShares(b.shares);
      if (held.length >= b.splitCount) return reply.code(409).send({ error: 'As cotas já foram preenchidas' });
      const amount = shareAt(b.totalAmount, b.splitCount, held.length);
      await prisma.splitShare.create({
        data: {
          bookingId: b.id,
          userId: me,
          name: b.user.name,
          phone: b.user.phone,
          method: 'pix',
          amount,
          status: 'paid',
        },
      });
    }
    await maybeConfirm(b.id);
    return { success: true };
  });

  // ---- Pedir para entrar num racha aberto ------------------------------------
  // O jogador pede, o organizador aceita. Enquanto está `requested` a cota não
  // ocupa vaga nem entra no cálculo do valor (ver heldShares em services/booking).

  app.post('/bookings/:id/join-request', { onRequest: [app.authenticate] }, async (req, reply) => {
    const me = req.user.sub;
    const b = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { shares: true },
    });
    if (!b) return reply.code(404).send({ error: 'Racha não encontrado' });
    if (b.userId === me) return reply.code(400).send({ error: 'Você é o organizador deste racha' });
    if (b.paymentMode !== 'split' || !b.isPublic)
      return reply.code(400).send({ error: 'Este racha não está aberto para entrada' });
    if (b.status === 'cancelled') return reply.code(410).send({ error: 'Racha cancelado' });
    if (b.shares.some((s) => s.userId === me))
      return reply.code(409).send({ error: 'Você já está neste racha' });
    if (heldShares(b.shares).length >= b.spotsNeeded)
      return reply.code(409).send({ error: 'Não há mais vagas' });

    const user = await prisma.user.findUnique({ where: { id: me } });
    const share = await prisma.splitShare.create({
      data: {
        bookingId: b.id,
        userId: me,
        name: user.name,
        phone: user.phone,
        method: 'pix',
        // Valor provisório: recalculado na aprovação, quando o índice da cota
        // finalmente existe.
        amount: shareAt(b.totalAmount, b.splitCount || 1, heldShares(b.shares).length),
        status: 'requested',
      },
    });
    return reply.code(201).send({ share });
  });

  app.post('/bookings/:id/requests/:shareId/approve', { onRequest: [app.authenticate] }, async (req, reply) => {
    const b = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { shares: true },
    });
    if (!b || b.userId !== req.user.sub) return reply.code(404).send({ error: 'Reserva não encontrada' });

    const request = b.shares.find((s) => s.id === req.params.shareId && s.status === 'requested');
    if (!request) return reply.code(404).send({ error: 'Pedido não encontrado' });

    const held = heldShares(b.shares);
    if (held.length >= b.splitCount) return reply.code(409).send({ error: 'Todas as cotas já foram preenchidas' });

    await prisma.splitShare.update({
      where: { id: request.id },
      // O valor gravado no pedido usou um índice velho — agora que a cota entra
      // de fato na conta, recalcula com a posição real.
      data: { status: 'pending', amount: shareAt(b.totalAmount, b.splitCount, held.length) },
    });
    await maybeConfirm(b.id);
    return { success: true };
  });

  app.post('/bookings/:id/requests/:shareId/reject', { onRequest: [app.authenticate] }, async (req, reply) => {
    const b = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { shares: true } });
    if (!b || b.userId !== req.user.sub) return reply.code(404).send({ error: 'Reserva não encontrada' });

    const request = b.shares.find((s) => s.id === req.params.shareId && s.status === 'requested');
    if (!request) return reply.code(404).send({ error: 'Pedido não encontrado' });

    await prisma.splitShare.delete({ where: { id: request.id } });
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
