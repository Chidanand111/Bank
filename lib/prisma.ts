import { PrismaClient } from '@prisma/client';

// Known Neon PostgreSQL connection string for BankMock isolation schema
const NEON_DEFAULT_URL =
  'postgresql://neondb_owner:npg_OfCgI5hvq9wL@ep-red-wildflower-aeanr4by-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require&schema=bankmock&connect_timeout=30';

function resolveDatabaseUrl(): string {
  const candidate =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (candidate && candidate.trim() && !candidate.includes('127.0.0.1:5432')) {
    return candidate.trim();
  }

  // Fallback to project Neon PostgreSQL cluster with schema=bankmock
  return NEON_DEFAULT_URL;
}

const activeDatabaseUrl = resolveDatabaseUrl();
process.env.DATABASE_URL = activeDatabaseUrl;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: activeDatabaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Cache PrismaClient instance to avoid connection exhaustion in serverless environments
globalForPrisma.prisma = prisma;

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL || '';
  return Boolean(
    url.trim() &&
    !url.includes('127.0.0.1:5432') &&
    !url.includes('user:password')
  );
}

export default prisma;
