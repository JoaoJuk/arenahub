import { prisma } from '../server.js';
import { hoursBetween, nowInBR } from '../services/availability.js';

const dateOffset = (base, days) => {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Rotas do dono da arena (role: owner ou admin). */
export default async function ownerRoutes(app) {
  const ownerOnly = async (req, reply) => {
    if (!['owner', 'admin'].includes(req.user.role))
      return reply.code(403).send({ error: 'Apenas donos de arena' });
  };

  const myCourts = async (userId) => {
    const arenas = await prisma.arena.findMany({ where: { ownerId: userId }, include: { courts: true } });
    return { arenas, courts: arenas.flatMap((a) => a.courts) };
  };

  // Minhas arenas (com quadras)
  app.get('/owner/arenas', { onRequest: [app.authenticate, ownerOnly] }, async (req) => {
    const { arenas } = await myCourts(req.user.sub);
    return arenas.map((a) => ({ ...a, sports: a.sports.split(',') }));
  });

  // Resumo completo: hoje, semana, gráfico, pendências e próximas reservas
  app.get('/owner/summary', { onRequest: [app.authenticate, ownerOnly] }, async (req) => {
    const { arenas, courts } = await myCourts(req.user.sub);
    const courtIds = courts.map((c) => c.id);
    const { today, hour } = nowInBR();
    const weekDates = Array.from({ length: 7 }, (_, i) => dateOffset(today, i - 6)); // últimos 7 dias

    const week = await prisma.booking.findMany({
      where: { courtId: { in: courtIds }, date: { in: weekDates }, status: { in: ['pending', 'confirmed'] } },
      include: { shares: true },
    });
    const real = week.filter((b) => b.paymentMode !== 'blocked'); // bloqueios não contam como venda
    const todays = real.filter((b) => b.date === today);

    const sum = (list) => list.reduce((s, b) => s + b.totalAmount, 0);
    const openHours = courts.reduce((s, c) => s + (c.closeHour - c.openHour), 0);
    const bookedToday = todays.reduce((s, b) => s + hoursBetween(b.startTime, b.endTime), 0);

    // Gráfico: reservas por dia (últimos 7 dias)
    const series = weekDates.map((d) => ({
      date: d,
      label: new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      count: real.filter((b) => b.date === d).length,
    }));

    // Ações pendentes (o que precisa da atenção do dono)
    const upcomingAll = await prisma.booking.findMany({
      where: { courtId: { in: courtIds }, date: { gte: today }, status: { in: ['pending', 'confirmed'] } },
      include: { user: { select: { name: true } }, court: true, shares: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    const upcoming = upcomingAll.filter((b) => b.paymentMode !== 'blocked');
    const splitsIncomplete = upcoming.filter(
      (b) => b.paymentMode === 'split' && b.status === 'pending'
    ).length;
    const onSiteToday = upcoming.filter(
      (b) => b.date === today && (b.paymentMode === 'on_site' || b.shares.some((s) => s.method === 'on_site'))
    ).length;

    // Arena "aberta agora"? (alguma quadra dentro do horário de funcionamento)
    const openNow = courts.some((c) => hour >= c.openHour && hour < c.closeHour);

    return {
      arenaName: arenas[0]?.name || 'Sua arena',
      rating: arenas[0]?.rating ?? null,
      openNow,
      arenaCount: arenas.length,
      courtCount: courts.length,
      today: {
        bookings: todays.length,
        revenue: sum(todays.filter((b) => b.status === 'confirmed')),
        occupation: openHours ? Math.round((bookedToday / openHours) * 100) : 0,
      },
      week: {
        bookings: real.length,
        revenue: sum(real.filter((b) => b.status === 'confirmed')),
      },
      series,
      pending: { splitsIncomplete, onSiteToday },
      upcoming: upcoming.slice(0, 10).map((b) => ({
        id: b.id, date: b.date, startTime: b.startTime, endTime: b.endTime,
        court: b.court.name, player: b.user.name, status: b.status,
        paymentMode: b.paymentMode, totalAmount: b.totalAmount,
        paidShares: b.shares.filter((s) => s.status !== 'pending').length,
        splitCount: b.splitCount,
      })),
    };
  });

  // Desempenho (estilo iFood): período de 7 ou 30 dias + comparação com o anterior
  app.get('/owner/performance', { onRequest: [app.authenticate, ownerOnly] }, async (req) => {
    const days = Number(req.query.days) === 30 ? 30 : 7;
    const { arenas, courts } = await myCourts(req.user.sub);
    const courtIds = courts.map((c) => c.id);
    const arenaIds = arenas.map((a) => a.id);
    const { today } = nowInBR();

    const range = (offsetStart, offsetEnd) =>
      Array.from({ length: offsetEnd - offsetStart + 1 }, (_, i) => dateOffset(today, offsetStart + i));
    const cur = range(-(days - 1), 0);
    const prev = range(-(2 * days - 1), -days);

    const bookings = await prisma.booking.findMany({
      where: {
        courtId: { in: courtIds },
        date: { in: [...cur, ...prev] },
        status: { in: ['pending', 'confirmed', 'done'] },
        paymentMode: { not: 'blocked' },
      },
    });
    const views = await prisma.viewStat.findMany({
      where: { arenaId: { in: arenaIds }, date: { in: [...cur, ...prev] } },
    });
    const firstBookings = await prisma.booking.groupBy({
      by: ['userId'],
      where: { courtId: { in: courtIds }, paymentMode: { not: 'blocked' } },
      _min: { date: true },
    });

    const metricsOf = (dates) => {
      const bs = bookings.filter((b) => dates.includes(b.date));
      const revenue = bs.filter((b) => ['confirmed', 'done'].includes(b.status)).reduce((s, b) => s + b.totalAmount, 0);
      return {
        bookings: bs.length,
        revenue,
        ticket: bs.length ? Math.round(revenue / bs.length) : 0,
        views: views.filter((v) => dates.includes(v.date)).reduce((s, v) => s + v.count, 0),
        newClients: firstBookings.filter((f) => dates.includes(f._min.date)).length,
      };
    };
    const current = metricsOf(cur);
    const previous = metricsOf(prev);
    const delta = (c, p) => (p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100));

    return {
      days,
      current,
      previous,
      deltas: {
        bookings: delta(current.bookings, previous.bookings),
        revenue: delta(current.revenue, previous.revenue),
        ticket: delta(current.ticket, previous.ticket),
        views: delta(current.views, previous.views),
        newClients: delta(current.newClients, previous.newClients),
      },
      series: cur.map((d) => ({
        date: d,
        label: d.slice(8) + '/' + d.slice(5, 7),
        bookings: bookings.filter((b) => b.date === d).length,
        views: views.filter((v) => v.date === d).reduce((s, v) => s + v.count, 0),
        revenue: bookings.filter((b) => b.date === d && ['confirmed', 'done'].includes(b.status)).reduce((s, b) => s + b.totalAmount, 0),
      })),
    };
  });

  // Avaliações das minhas arenas
  app.get('/owner/reviews', { onRequest: [app.authenticate, ownerOnly] }, async (req) => {
    const { arenas } = await myCourts(req.user.sub);
    const reviews = await prisma.review.findMany({
      where: { arenaId: { in: arenas.map((a) => a.id) } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: reviews.map((r) => r.userId) } },
      select: { id: true, name: true },
    });
    const nameOf = Object.fromEntries(users.map((u) => [u.id, u.name]));
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
    return {
      average: avg ? Math.round(avg * 10) / 10 : null,
      total: reviews.length,
      reviews: reviews.map((r) => ({
        id: r.id, rating: r.rating, comment: r.comment,
        user: nameOf[r.userId] || 'Jogador', createdAt: r.createdAt,
      })),
    };
  });

  // Agenda visual de uma quadra em um dia (livre / reservado / bloqueado)
  app.get('/owner/agenda', { onRequest: [app.authenticate, ownerOnly] }, async (req, reply) => {
    const { courtId, date } = req.query;
    const court = await prisma.court.findUnique({ where: { id: courtId || '' }, include: { arena: true } });
    if (!court) return reply.code(404).send({ error: 'Quadra não encontrada' });
    if (court.arena.ownerId !== req.user.sub && req.user.role !== 'admin')
      return reply.code(403).send({ error: 'Sem permissão' });

    const day = date || nowInBR().today;
    const bookings = await prisma.booking.findMany({
      where: { courtId: court.id, date: day, status: { in: ['pending', 'confirmed'] } },
      include: { user: { select: { name: true } }, shares: true },
    });

    const slots = [];
    for (let h = court.openHour; h < court.closeHour; h++) {
      const start = `${String(h).padStart(2, '0')}:00`;
      const end = `${String(h + 1).padStart(2, '0')}:00`;
      const b = bookings.find((x) => x.startTime < end && x.endTime > start);
      slots.push({
        startTime: start,
        endTime: end,
        state: !b ? 'free' : b.paymentMode === 'blocked' ? 'blocked' : 'booked',
        booking: b && {
          id: b.id, player: b.user.name, status: b.status, paymentMode: b.paymentMode,
          totalAmount: b.totalAmount,
          paidShares: b.shares.filter((s) => s.status !== 'pending').length,
          splitCount: b.splitCount,
        },
      });
    }
    return { date: day, court: { id: court.id, name: court.name }, slots };
  });

  // Bloquear um horário (manutenção, evento, uso próprio)
  app.post('/owner/block', {
    onRequest: [app.authenticate, ownerOnly],
    schema: {
      body: {
        type: 'object',
        required: ['courtId', 'date', 'startTime', 'endTime'],
        properties: {
          courtId: { type: 'string' },
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          startTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          endTime: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
        },
      },
    },
  }, async (req, reply) => {
    const { courtId, date, startTime, endTime } = req.body;
    const court = await prisma.court.findUnique({ where: { id: courtId }, include: { arena: true } });
    if (!court) return reply.code(404).send({ error: 'Quadra não encontrada' });
    if (court.arena.ownerId !== req.user.sub && req.user.role !== 'admin')
      return reply.code(403).send({ error: 'Sem permissão' });
    try {
      const block = await prisma.$transaction(async (tx) => {
        const conflict = await tx.booking.findFirst({
          where: {
            courtId, date, status: { in: ['pending', 'confirmed'] },
            startTime: { lt: endTime }, endTime: { gt: startTime },
          },
        });
        if (conflict) throw new Error('CONFLICT');
        return tx.booking.create({
          data: {
            courtId, userId: req.user.sub, date, startTime, endTime,
            totalAmount: 0, paymentMode: 'blocked', status: 'confirmed',
          },
        });
      });
      return reply.code(201).send(block);
    } catch (e) {
      if (e.message === 'CONFLICT') return reply.code(409).send({ error: 'Esse horário já tem reserva' });
      throw e;
    }
  });

  // Liberar um horário bloqueado
  app.post('/owner/unblock/:id', { onRequest: [app.authenticate, ownerOnly] }, async (req, reply) => {
    const b = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { court: { include: { arena: true } } },
    });
    if (!b || b.paymentMode !== 'blocked') return reply.code(404).send({ error: 'Bloqueio não encontrado' });
    if (b.court.arena.ownerId !== req.user.sub && req.user.role !== 'admin')
      return reply.code(403).send({ error: 'Sem permissão' });
    return prisma.booking.update({ where: { id: b.id }, data: { status: 'cancelled' } });
  });
}
