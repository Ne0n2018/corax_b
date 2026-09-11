import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client';
import { AuthMetod, UserRole } from '../src/generated/prisma/enums';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Передаем адаптер в конструктор
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPasswordHash = await argon2.hash('HqdEd1m$');
  const userPasswordHash = await argon2.hash('Ne0n_21022005');

  const usersToSeed = [
    {
      email: 'edalinb@mail.ru',
      password: adminPasswordHash,
      displayName: 'Креер Эдгар',
      metod: AuthMetod.CREDENTIALS,
      role: UserRole.ADMIN,
      isVerified: true,
    },
    {
      email: 'beevertm@gmail.com',
      password: userPasswordHash,
      displayName: 'Воробьев Борис',
      metod: AuthMetod.CREDENTIALS,
      role: UserRole.ADMIN,
      isVerified: true,
    },
  ];

  for (const userData of usersToSeed) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
  }

  console.log('Сидинг пользователей успешно завершён.');
}

main()
  .catch((e) => {
    console.error('Ошибка сидинга:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
