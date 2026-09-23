import { PrismaClient } from "./generated/prisma";

// Singleton Prisma client. In dev with tsx watch, stash it on `global` so a
// module reload doesn't open a fresh pool of connections every time.
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
