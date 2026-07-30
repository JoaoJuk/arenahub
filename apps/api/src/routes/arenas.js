import { prisma } from '../server.js';
import { buildSlots } from '../services/availability.js';
import { shareAt } from '../services/booking.js';

export default async function arenaRoutes(app) {
  // Busca pública de arenas: ?q= ?sport= ?city=
  app.get('/arenas', async (req) => {
    const { q, sport, city } = req.query;
    const arenas = await prisma.arena.findMany({ include: { courts: true } });
    const norm = (s) => (s || '').toLowerCase();
    return arenas
      .filter((a) => !q || norm(a.name).includes(norm(q)) || norm(a.city).includes(norm(q)))
      .filter((a) => !sport || norm(a.sports).includes(norm(sport)))
      .filter((a) => !city || norm(a.city) === norm(city))
      .map((a) => ({
        ...a,
        sports: a.sports.split(','),
        priceFrom: Math.min(...a.courts.map((c) => c.pricePerHour), Infinity),
      }));
  });

  app.get('/arenas/:id', async (req, reply) => {
    const arena = await prisma.arena.findUnique({
      where: { id: req.params.id },
      include: { courts: true },
    });
    if (!arena) return reply.code(404).send({ error: 'Arena não encontrada' });

    // Métrica de desempenho: registra a visualização do dia (não bloqueia a resposta)
    const today = new Date().toISOString().slice(0, 10);
    prisma.viewStat.upsert({
      where: { arenaId_date: { arenaId: arena.id, date: today } },
      update: { count: { increment: 1 } },
      create: { arenaId: arena.id, date: today, count: 1 },
    }).catch(() => {});

    const photos = (arena.photos || '').split(',').filter(Boolean);
    const courtPhotos = arena.courts.map((c) => c.photoUrl).filter(Boolean);
    return {
      ...arena,
      sports: arena.sports.split(','),
      photos: [...new Set([...(photos.length ? photos : arena.photoUrl ? [arena.photoUrl] : []), ...courtPhotos])],
    };
  });

  // Avaliações (público lê; jogador logado avalia)
  app.get('/arenas/:id/reviews', async (req) => {
    const reviews = await prisma.review.findMany({
      where: { arenaId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: reviews.map((r) => r.userId) } },
      select: { id: true, name: true },
    });
    const nameOf = Object.fromEntries(users.map((u) => [u.id, u.name]));
    return reviews.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, user: nameOf[r.userId] || 'Jogador', createdAt: r.createdAt }));
  });

  app.post('/arenas/:id/reviews', {
    onRequest: [app.authenticate],
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['rating'],
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string', maxLength: 500 },
        },
      },
    },
  }, async (req, reply) => {
    const arena = await prisma.arena.findUnique({ where: { id: req.params.id } });
    if (!arena) return reply.code(404).send({ error: 'Arena não encontrada' });
    await prisma.review.create({
      data: { arenaId: arena.id, userId: req.user.sub, rating: req.body.rating, comment: req.body.comment || '' },
    });
    // Recalcula a nota exibida aos jogadores
    const agg = await prisma.review.aggregate({ where: { arenaId: arena.id }, _avg: { rating: true } });
    await prisma.arena.update({
      where: { id: arena.id },
      data: { rating: Math.round((agg._avg.rating || 5) * 10) / 10 },
    });
    return reply.code(201).send({ ok: true });
  });

  // Slots livres de uma quadra em uma data
  app.get('/courts/:id/availability', async (req, reply) => {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const court = await prisma.court.findUnique({ where: { id: req.params.id } });
    if (!court) return reply.code(404).send({ error: 'Quadra não encontrada' });
    const bookings = await prisma.booking.findMany({
      where: { courtId: court.id, date, status: { in: ['pending', 'confirmed'] } },
    });
    return { date, court: { id: court.id, name: court.name }, slots: buildSlots(court, bookings, date) };
  });

  // Cadastro (donos de arena)
  app.post('/arenas', { onRequest: [app.authenticate] }, async (req, reply) => {
    if (req.user.role !== 'owner' && req.user.role !== 'admin')
      return reply.code(403).send({ error: 'Apenas donos de arena' });
    const { name, city, address, description = '', sports, photoUrl } = req.body;
    return prisma.arena.create({
      data: { ownerId: req.user.sub, name, city, address, description, photoUrl, sports: [].concat(sports).join(',') },
    });
  });

  // Matchmaking: rachas com cotas em aberto ("Falta um jogador?")
  app.get('/matches/open', async () => {
    const base = process.env.BASE_URL || 'http://localhost:3333';
    const today = new Date().toISOString().slice(0, 10);
    const bookings = await prisma.booking.findMany({
      where: { paymentMode: 'split', status: 'pending', date: { gte: today } },
      include: { court: { include: { arena: true } }, shares: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 15,
    });
    return bookings
      .filter((b) => b.shares.length < b.splitCount)
      .map((b) => ({
        id: b.id,
        arena: b.court.arena.name,
        arenaId: b.court.arenaId,
        city: b.court.arena.city,
        sport: b.court.sport,
        date: b.date,
        startTime: b.startTime,
        spotsLeft: b.splitCount - b.shares.length,
        shareAmount: shareAt(b.totalAmount, b.splitCount, b.shares.length),
        shareUrl: `${base}/s/${b.shareToken}`,
      }));
  });

  app.post('/arenas/:id/courts', { onRequest: [app.authenticate] }, async (req, reply) => {
    const arena = await prisma.arena.findUnique({ where: { id: req.params.id } });
    if (!arena) return reply.code(404).send({ error: 'Arena não encontrada' });
    if (arena.ownerId !== req.user.sub && req.user.role !== 'admin')
      return reply.code(403).send({ error: 'Sem permissão' });
    const { name, sport, pricePerHour, openHour = 8, closeHour = 23, photoUrl } = req.body;
    return prisma.court.create({ data: { arenaId: arena.id, name, sport, pricePerHour, openHour, closeHour, photoUrl } });
  });
}
