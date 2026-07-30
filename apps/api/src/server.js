import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import arenaRoutes from './routes/arenas.js';
import bookingRoutes from './routes/bookings.js';
import splitRoutes from './routes/split.js';
import webhookRoutes from './routes/webhooks.js';
import ownerRoutes from './routes/owner.js';
import adminRoutes from './routes/admin.js';
import userRoutes from './routes/users.js';

const isProd = process.env.NODE_ENV === 'production';

// Em produção, subir sem segredo forte seria uma falha grave — melhor nem subir.
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET é obrigatório em produção (mínimo 32 caracteres).');
}

const app = Fastify({ logger: true });
export const prisma = new PrismaClient();

// CORS: em produção, restrinja às origens do app (CORS_ORIGINS="https://app.seudominio.com,https://seudominio.com")
const origins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
await app.register(cors, { origin: origins.length ? origins : !isProd });

// Rate limit global (rotas sensíveis têm limites próprios via config.rateLimit)
await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret',
  sign: { expiresIn: process.env.JWT_EXPIRES || '7d' },
});

app.decorate('authenticate', async (req, reply) => {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Sessão inválida ou expirada — faça login novamente' });
  }
});

app.get('/health', async () => ({ ok: true, service: 'arenahub-api' }));

await app.register(authRoutes);
await app.register(arenaRoutes);
await app.register(bookingRoutes);
await app.register(splitRoutes);
await app.register(webhookRoutes);
await app.register(ownerRoutes);
await app.register(adminRoutes);
await app.register(userRoutes);

const port = Number(process.env.PORT || 3333);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
