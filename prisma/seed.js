const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Admin@2026', 10);
  
  await prisma.admin.upsert({
    where: { email: 'admin@glambyzeba.com' },
    update: {},
    create: {
      id: '1',
      email: 'admin@glambyzeba.com',
      name: 'Admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  
  console.log('✅ Admin created successfully!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());