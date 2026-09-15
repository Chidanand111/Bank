import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function testConnection(url: string, label: string) {
  console.log(`Testing ${label}...`);
  const client = new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  });
  try {
    const start = Date.now();
    const count = await client.question.count();
    console.log(`✓ ${label} SUCCESS in ${Date.now() - start}ms! Question count: ${count}`);
    await client.$disconnect();
    return true;
  } catch (err) {
    console.log(`✗ ${label} FAILED:`, (err as any).message);
    await client.$disconnect();
    return false;
  }
}

async function main() {
  const currentUrl = process.env.DATABASE_URL!;
  console.log('Current URL (masked):', currentUrl.replace(/:[^:@]+@/, ':***@'));

  // 1. Try with connect_timeout=30
  const timeoutUrl = currentUrl.includes('connect_timeout')
    ? currentUrl
    : currentUrl + (currentUrl.includes('?') ? '&connect_timeout=30' : '?connect_timeout=30');

  await testConnection(timeoutUrl, 'Direct with connect_timeout=30');

  // 2. Try with pooler
  if (!currentUrl.includes('-pooler')) {
    const poolerUrl = timeoutUrl.replace('ep-red-wildflower-aeanr4by.', 'ep-red-wildflower-aeanr4by-pooler.');
    await testConnection(poolerUrl, 'Neon Pooler with connect_timeout=30');
  }
}

main();
