import { prisma } from '../server.js';

export default async function userRoutes(app) {
  app.get('/users/search', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { q } = req.query;
    if (!q || q.length < 3) return [];

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q } },
          { name: { contains: q } },
        ],
        id: { not: req.user.sub }, // Don't return the searcher
      },
      select: { id: true, name: true, username: true },
      take: 10,
    });

    return users.map(u => ({
      ...u,
      username: u.username || null, // Ensure it's explicitly null if missing
    }));
  });

  app.get('/users/recent-invites', { onRequest: [app.authenticate] }, async (req, reply) => {
    const shares = await prisma.splitShare.findMany({
      where: {
        booking: { userId: req.user.sub },
        userId: { not: null, not: req.user.sub }
      },
      orderBy: { createdAt: 'desc' },
      select: { user: { select: { id: true, name: true, username: true } } },
      take: 30
    });

    const uniqueUsers = [];
    const seen = new Set();
    for (const sh of shares) {
      if (sh.user && !seen.has(sh.user.id)) {
        seen.add(sh.user.id);
        uniqueUsers.push(sh.user);
      }
    }
    return uniqueUsers.slice(0, 5);
  });
}
