import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

/**
 * Стартовые данные для локальной разработки.
 * Запуск: npx prisma db seed
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const tenant = await prisma.tenant.upsert({
    where: { domain: 'demo.local' },
    update: { name: 'Демо ВУЗ' },
    create: {
      name: 'Демо ВУЗ',
      domain: 'demo.local',
    },
  });

  const passwordHash = await bcrypt.hash('demo123', 12);

  const demoUsers = [
    {
      email: 'admin@demo.local',
      fullName: 'Админ Демо',
      role: UserRole.admin,
    },
    {
      email: 'teacher@demo.local',
      fullName: 'Преподаватель Демо',
      role: UserRole.teacher,
    },
    {
      email: 'student@demo.local',
      fullName: 'Студент Демо',
      role: UserRole.student,
    },
  ] as const;

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: {
        tenantId_email: { tenantId: tenant.id, email: u.email },
      },
      update: { fullName: u.fullName, role: u.role },
      create: {
        tenantId: tenant.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        passwordHash,
      },
    });
  }

  console.log(`Seed OK: tenant "${tenant.name}", users: ${demoUsers.map((u) => u.email).join(', ')}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
