// prisma.config.cjs
const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URI ||
  'postgresql://root:123456@db:5432/corax?schema=public';

module.exports = {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: dbUrl,
  },
};
