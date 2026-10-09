import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Prevent Prisma from throwing: "You must provide a nonempty URL. The environment variable DATABASE_URL resolved to an empty string."
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]?.trim()) {
        process.env.DATABASE_URL = match[1].trim();
      }
    }
  } catch {
    // Ignore error reading .env
  }
}

// If still empty, provide a valid placeholder PostgreSQL URL with short timeout so schema validation passes
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/bankmock?sslmode=disable&connect_timeout=2';
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Cache PrismaClient instance to avoid connection exhaustion in serverless environments
globalForPrisma.prisma = prisma;

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL || '';
  return Boolean(
    url.trim() &&
    !url.includes('127.0.0.1:5432/bankmock') &&
    !url.includes('user:password')
  );
}

export default prisma;
