const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('12345678', 10);
  const user = await prisma.user.upsert({
    where: { email: 'teste@gmail.com' },
    update: { username: 'teste', passwordHash: hash, phone: '41999998888' },
    create: {
      name: 'João Teste',
      email: 'teste@gmail.com',
      username: 'teste',
      phone: '41999998888',
      passwordHash: hash,
    },
  });
  console.log('Usuário de teste criado:', user.email, 'Senha: 12345678');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
