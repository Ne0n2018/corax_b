import path from 'node:path';

import { defineConfig } from 'prisma/config';

// Prisma 7: connection URL for migrate/db-push lives here (not in schema.prisma).
// Runtime still uses the pg driver adapter in PrismaService.
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  datasource: {
    url:
      process.env.POSTGRES_URI ||
      'postgresql://root:123456@localhost:5433/corax?schema=public',
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL ||
      'postgresql://root:123456@localhost:5433/corax_shadow?schema=public',
  },
});
