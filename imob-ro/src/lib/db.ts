// Note: Run `pnpm prisma generate` after setting up DATABASE_URL
// This file will work after Prisma client is generated

let prisma: unknown;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require("@prisma/client");

  const globalForPrisma = globalThis as unknown as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma: any | undefined;
  };

  prisma = globalForPrisma.prisma ?? new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
} catch {
  // Prisma client not generated yet
  prisma = null;
}

export { prisma };
