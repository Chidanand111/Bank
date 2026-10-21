import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

function resolveDatabaseUrl(): string {
  // 1. Direct environment variable lookup
  const candidate =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (candidate && candidate.trim() && !candidate.includes('127.0.0.1:5432')) {
    return candidate.trim();
  }

  // 2. Local development fallback: parse .env if not loaded yet into process.env
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]?.trim() && !match[1].includes('127.0.0.1:5432')) {
        return match[1].trim();
      }
    }
  } catch {
    // Ignore error reading .env
  }

  // 3. Fallback dummy placeholder to allow PrismaClient instantiation without hardcoded secrets
  return (
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/bankmock?sslmode=disable&connect_timeout=15'
  );
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
    !url.includes('localhost:5432') &&
    !url.includes('user:password') &&
    !url.includes('postgres:postgres')
  );
}

export default prisma;
