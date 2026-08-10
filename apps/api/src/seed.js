import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const gallery = {
  'Arena Beira-Mar': [
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
    'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800',
    'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800',
  ],
  'Centro Esportivo Ponta Grossa': [
    'https://images.unsplash.com/photo-1544919982-b61976f0ba43?w=800',
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800',
  ],
  'Ginásio Vila Nova': [
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
  ],
};

// Cada quadra tem a própria foto: a tela da arena abre a galeria na foto da quadra
// selecionada, então sem isto trocar de quadra não muda nada na tela.
const arenas = [
  { name: 'Arena Beira-Mar', city: 'Curitiba', address: 'Av. das Torres, 1200', sports: 'futebol,futevôlei', description: 'Quadras de grama sintética cobertas, bar e churrasqueira.', rating: 4.9, photoUrl: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800', courts: [
    { name: 'Quadra 1 — Society', sport: 'futebol', pricePerHour: 16000, openHour: 8, closeHour: 23, photoUrl: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800' },
    { name: 'Quadra 2 — Society', sport: 'futebol', pricePerHour: 14000, openHour: 8, closeHour: 23, photoUrl: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800' },
    { name: 'Areia 1 — Futevôlei', sport: 'futevôlei', pricePerHour: 9000, openHour: 9, closeHour: 22, photoUrl: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800' },
  ]},
  { name: 'Centro Esportivo Ponta Grossa', city: 'Curitiba', address: 'R. XV de Novembro, 300', sports: 'beach tennis,vôlei', description: 'Areia tratada diariamente, iluminação de LED e vestiários novos.', rating: 4.7, photoUrl: 'https://images.unsplash.com/photo-1544919982-b61976f0ba43?w=800', courts: [
    { name: 'BT 01', sport: 'beach tennis', pricePerHour: 12000, openHour: 7, closeHour: 22, photoUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800' },
    { name: 'BT 02', sport: 'beach tennis', pricePerHour: 12000, openHour: 7, closeHour: 22, photoUrl: 'https://images.unsplash.com/photo-1544919982-b61976f0ba43?w=800' },
  ]},
  { name: 'Ginásio Vila Nova', city: 'São Paulo', address: 'R. Augusta, 2500', sports: 'basquete,futsal', description: 'Piso profissional, placar eletrônico e arquibancada.', rating: 4.6, photoUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800', courts: [
    { name: 'Quadra Central', sport: 'futsal', pricePerHour: 18000, openHour: 8, closeHour: 23, photoUrl: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800' },
    { name: 'Quadra B', sport: 'basquete', pricePerHour: 15000, openHour: 8, closeHour: 22, photoUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800' },
  ]},
];

const owner = { name: 'Dono Demo', email: 'arena@liggo.app', phone: '41999990000', role: 'owner' };
const player = { name: 'Jogador Demo', email: 'demo@liggo.app', phone: '41988887777', role: 'player' };
const admin = { name: 'Admin Demo', email: 'admin@liggo.app', phone: '41977776666', role: 'admin' };

const passwordHash = await bcrypt.hash('123456', 10);
const ownerUser = await prisma.user.upsert({ where: { email: owner.email }, update: {}, create: { ...owner, passwordHash } });
await prisma.user.upsert({ where: { email: player.email }, update: {}, create: { ...player, passwordHash } });
await prisma.user.upsert({ where: { email: admin.email }, update: { role: 'admin' }, create: { ...admin, passwordHash } });

for (const a of arenas) {
  const { courts, ...data } = a;
  const photos = (gallery[a.name] || []).join(',');
  const exists = await prisma.arena.findFirst({ where: { name: a.name }, include: { courts: true } });
  if (exists) {
    await prisma.arena.update({ where: { id: exists.id }, data: { photos } });
    // Quadras já criadas não passavam por aqui, então um banco existente ficava
    // sem `photoUrl` e a galeria por quadra não tinha o que mostrar.
    for (const c of courts) {
      const existing = exists.courts.find((x) => x.name === c.name);
      if (existing) await prisma.court.update({ where: { id: existing.id }, data: { photoUrl: c.photoUrl } });
    }
    continue;
  }
  await prisma.arena.create({ data: { ...data, photos, ownerId: ownerUser.id, courts: { create: courts } } });
}
// ---- Dados de desempenho de exemplo (visualizações, avaliações, reservas passadas) ----
const beira = await prisma.arena.findFirst({ where: { name: 'Arena Beira-Mar' }, include: { courts: true } });
const demoUser = await prisma.user.findUnique({ where: { email: player.email } });
const hasViews = await prisma.viewStat.count();
if (beira && demoUser && hasViews === 0) {
  const day = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.toISOString().slice(0, 10); };
  const allArenas = await prisma.arena.findMany();
  for (let i = -13; i <= 0; i++) {
    for (const a of allArenas) {
      await prisma.viewStat.create({ data: { arenaId: a.id, date: day(i), count: 5 + Math.floor(Math.random() * 25) } });
    }
  }
  const court = beira.courts[0];
  if (court) {
    for (let i = -6; i < 0; i++) {
      await prisma.booking.create({
        data: {
          courtId: court.id, userId: demoUser.id, date: day(i),
          startTime: '19:00', endTime: '20:00',
          totalAmount: court.pricePerHour, paymentMode: 'full', status: 'done',
        },
      }).catch(() => {});
    }
  }
  const comments = [
    [5, 'Quadra impecável, iluminação ótima!'],
    [4, 'Muito bom, só o vestiário que estava cheio.'],
    [5, 'Melhor arena da região, voltaremos!'],
  ];
  for (const [rating, comment] of comments)
    await prisma.review.create({ data: { arenaId: beira.id, userId: demoUser.id, rating, comment } });
  console.log('📈 Dados de desempenho de exemplo criados (14 dias de visualizações, avaliações e histórico).');
}

// ---- Racha aberto de exemplo ------------------------------------------------
// Fora do bloco acima de propósito: aquele só roda em banco novo, e este precisa
// aparecer também em banco que já existe. Guardado pela própria existência de um
// racha aberto, então rodar o seed de novo não duplica.
{
  const arena = await prisma.arena.findFirst({ where: { name: 'Arena Beira-Mar' }, include: { courts: true } });
  const organizer = await prisma.user.findUnique({ where: { email: player.email } });
  const court = arena?.courts?.[0];
  const jaExiste = await prisma.booking.count({
    where: { isPublic: true, paymentMode: 'split', status: 'pending' },
  });

  if (court && organizer && jaExiste === 0) {
    const d = new Date(); d.setDate(d.getDate() + 3);
    const total = court.pricePerHour * 2;
    const splitCount = 6;
    await prisma.booking.create({
      data: {
        courtId: court.id,
        userId: organizer.id,
        date: d.toISOString().slice(0, 10),
        startTime: '20:00',
        endTime: '22:00',
        totalAmount: total,
        paymentMode: 'split',
        splitCount,
        isPublic: true,
        spotsNeeded: splitCount,
        status: 'pending',
        shareToken: randomBytes(9).toString('base64url'),
        // O organizador já entra com a cota dele paga — sobram 5 vagas.
        shares: {
          create: [{
            userId: organizer.id,
            name: organizer.name,
            phone: organizer.phone,
            method: 'pix',
            amount: Math.floor(total / splitCount) + (total % splitCount > 0 ? 1 : 0),
            status: 'paid',
          }],
        },
      },
    });
    console.log('⚽ Racha aberto de exemplo criado (Arena Beira-Mar, daqui a 3 dias, 5 vagas).');
  }
}

console.log('✅ Seed concluído: 3 arenas, 7 quadras. Logins (senha 123456): demo@liggo.app (jogador) · arena@liggo.app (dono) · admin@liggo.app (admin)');
await prisma.$disconnect();
