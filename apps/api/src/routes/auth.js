import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../server.js';
import { requestCode, checkCode, normTarget } from '../services/verify.js';
import { cpfValid, businessDocValid } from '../services/validators.js';

export default async function authRoutes(app) {
  // ---- Verificação de e-mail / celular (código de 6 dígitos) ----
  app.post('/verify/request', {
    config: { rateLimit: { max: 6, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['channel', 'target'],
        properties: {
          channel: { type: 'string', enum: ['email', 'phone'] },
          target: { type: 'string', minLength: 5 },
        },
      },
    },
  }, async (req) => requestCode(req.body.channel, req.body.target));

  app.post('/verify/confirm', {
    config: { rateLimit: { max: 12, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['channel', 'target', 'code'],
        properties: {
          channel: { type: 'string', enum: ['email', 'phone'] },
          target: { type: 'string' },
          code: { type: 'string', minLength: 6, maxLength: 6 },
        },
      },
    },
  }, async (req) => ({ valid: await checkCode(req.body.channel, req.body.target, req.body.code) }));

  // ---- Cadastro (jogador ou estabelecimento) com verificações ----
  app.post('/auth/register', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'phone', 'password', 'cpf', 'emailCode', 'phoneCode'],
        properties: {
          name: { type: 'string', minLength: 2 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', minLength: 10 },
          password: { type: 'string', minLength: 8 },
          cpf: { type: 'string', minLength: 11 },
          emailCode: { type: 'string', minLength: 6, maxLength: 6 },
          phoneCode: { type: 'string', minLength: 6, maxLength: 6 },
          role: { type: 'string', enum: ['player', 'owner'] },
          business: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 2 },
              doc: { type: 'string', minLength: 11 }, // CNPJ ou CPF (MEI)
              city: { type: 'string', minLength: 2 },
              address: { type: 'string', minLength: 4 },
              sports: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  }, async (req, reply) => {
    const { name, password, cpf, emailCode, phoneCode, role = 'player', business } = req.body;
    const email = normTarget('email', req.body.email);
    const phone = normTarget('phone', req.body.phone);
    const cpfDigits = cpf.replace(/\D/g, '');

    // Validações no servidor (nunca confiar só no app)
    if (!cpfValid(cpfDigits)) return reply.code(400).send({ error: 'CPF inválido' });
    if (!(await checkCode('email', email, emailCode)))
      return reply.code(400).send({ error: 'Código do e-mail inválido ou expirado' });
    if (!(await checkCode('phone', phone, phoneCode)))
      return reply.code(400).send({ error: 'Código do celular inválido ou expirado' });

    if (role === 'owner') {
      if (!business?.name || !business?.doc || !business?.city || !business?.address)
        return reply.code(400).send({ error: 'Dados do estabelecimento incompletos' });
      if (!businessDocValid(business.doc))
        return reply.code(400).send({ error: 'CNPJ/CPF do estabelecimento inválido' });
    }

    if (await prisma.user.findUnique({ where: { email } }))
      return reply.code(409).send({ error: 'E-mail já cadastrado' });
    if (await prisma.user.findFirst({ where: { cpf: cpfDigits } }))
      return reply.code(409).send({ error: 'CPF já cadastrado' });

    const user = await prisma.user.create({
      data: { name, email, phone, cpf: cpfDigits, role, passwordHash: await bcrypt.hash(password, 10) },
    });

    if (role === 'owner') {
      await prisma.arena.create({
        data: {
          ownerId: user.id,
          name: business.name,
          city: business.city,
          address: business.address,
          cnpj: business.doc.replace(/\D/g, ''),
          sports: (business.sports?.length ? business.sports : ['futebol']).join(','),
        },
      });
    }

    // Códigos usados não servem de novo
    await prisma.verificationCode.deleteMany({ where: { target: { in: [email, phone] } } });

    const token = app.jwt.sign({ sub: user.id, role: user.role });
    return { token, user: { id: user.id, name, email, phone, role: user.role } };
  });

  // Rate limit: proteção contra força bruta de senha
  app.post('/auth/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { email, password } = req.body || {};
    const user = await prisma.user.findUnique({ where: { email: normTarget('email', email || '') } });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash)))
      return reply.code(401).send({ error: 'E-mail ou senha inválidos' });
    const token = app.jwt.sign({ sub: user.id, role: user.role });
    return { token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } };
  });

  app.get('/me', { onRequest: [app.authenticate] }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
  });

  // LGPD: exclusão de conta — anonimiza os dados pessoais e invalida o acesso.
  app.delete('/me', { onRequest: [app.authenticate] }, async (req) => {
    const id = req.user.sub;
    await prisma.user.update({
      where: { id },
      data: {
        name: 'Usuário removido',
        email: `removido_${id}@liggo.invalid`,
        phone: '',
        cpf: null,
        passwordHash: crypto.randomBytes(32).toString('hex'),
      },
    });
    return { ok: true, message: 'Conta excluída e dados pessoais anonimizados' };
  });
}
