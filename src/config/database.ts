import { PrismaClient } from "@prisma/client";
import { isDev } from "./env.js";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: isDev ? ["error", "warn"] : ["error"] });

if (isDev) globalForPrisma.prisma = prisma;

export async function connectDatabase(): Promise<void> { await prisma.$connect(); }
export async function disconnectDatabase(): Promise<void> { await prisma.$disconnect(); }
