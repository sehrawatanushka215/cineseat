import { PrismaClient } from "@prisma/client";

/**
 * One PrismaClient per process. Without the global cache, Next's dev-mode
 * hot reload opens a new database connection on every file save and SQLite
 * eventually refuses to play along.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
