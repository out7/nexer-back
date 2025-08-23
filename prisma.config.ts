import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma'),
  migrations: {
    seed: 'bun prisma/seeds/seed.ts',
  },
});
