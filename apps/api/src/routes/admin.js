import { prisma } from '../server.js';

/** Rotas do administrador da plataforma (role: admin). */
export default async function adminRoutes(app) {
  const adminOnly = async (req, reply) => {
    if (req.user.role !== 'admin')
      return reply.code(403).send({ error: 'Apenas administradores' });
  };

  // Visão geral da plataforma
  app.get('/admin/stats', { onRequest: [app.authenticate, adminOnly] }, async () => {
    const [users, arenas, bookings, gmv] = await Promise.all([
      prisma.user.count(),
      prisma.arena.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({ _sum: { totalAmount: true }, where: { status: { in: ['confirmed', 'done'] } } }),
    ]);
    const recent = await prisma.booking.findMany({
      include: { user: { select: { name: true } }, court: { include: { arena: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    return {
      users, arenas, bookings,
      gmv: gmv._sum.totalAmount || 0,
      recent: recent.map((b) => ({
        id: b.id, date: b.date, startTime: b.startTime, status: b.status,
        arena: b.court.arena.name, court: b.court.name, player: b.user.name, totalAmount: b.totalAmount,
      })),
    };
  });

  app.get('/admin/users', { onRequest: [app.authenticate, adminOnly] }, async () => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  });

  app.get('/admin/arenas', { onRequest: [app.authenticate, adminOnly] }, async () => {
    const arenas = await prisma.arena.findMany({
      include: { owner: { select: { name: true, email: true } }, courts: { select: { id: true } } },
    });
    return arenas.map((a) => ({
      id: a.id, name: a.name, city: a.city, rating: a.rating,
      owner: a.owner?.name || '—', courtCount: a.courts.length, sports: a.sports.split(','),
    }));
  });

  // Alterar papel de um usuário (player ↔ owner ↔ admin)
  app.patch('/admin/users/:id/role', {
    onRequest: [app.authenticate, adminOnly],
    schema: { body: { type: 'object', required: ['role'], properties: { role: { type: 'string', enum: ['player', 'owner', 'admin'] } } } },
  }, async (req, reply) => {
    if (req.params.id === req.user.sub)
      return reply.code(400).send({ error: 'Você não pode alterar o próprio papel' });
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: req.body.role } });
    return { id: user.id, role: user.role };
  });

  // Cancelar qualquer reserva (suporte/moderação)
  app.post('/admin/bookings/:id/cancel', { onRequest: [app.authenticate, adminOnly] }, async (req, reply) => {
    const b = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!b) return reply.code(404).send({ error: 'Reserva não encontrada' });
    return prisma.booking.update({ where: { id: b.id }, data: { status: 'cancelled' } });
  });
}
