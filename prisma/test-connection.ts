import { PrismaClient } from '@prisma/client';

async function testConnection() {
  const dbUrl = process.env.DATABASE_URL;
  console.log('\n--- BankMock Remote PostgreSQL Connection Test ---');

  if (!dbUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is not set in .env or environment.');
    console.log('Please define DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"');
    process.exit(1);
  }

  // Mask sensitive password in log
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`Connecting to: ${maskedUrl}`);

  const prisma = new PrismaClient();

  try {
    const startTime = Date.now();
    // Test raw query
    const result = await prisma.$queryRaw<any[]>`SELECT NOW() as current_time, version() as pg_version;`;
    const latency = Date.now() - startTime;

    console.log('✅ Connected successfully!');
    console.log(`⏱️ Latency: ${latency}ms`);
    console.log(`📅 Database Time: ${result[0]?.current_time}`);
    console.log(`🐘 PostgreSQL Version: ${result[0]?.pg_version?.split(' ')[0]} ${result[0]?.pg_version?.split(' ')[1]}`);

    // Query user count if table exists
    try {
      const userCount = await prisma.user.count();
      console.log(`👥 Registered Users in Database: ${userCount}`);
    } catch {
      console.log('ℹ️ Schema tables not yet pushed. Run `npm run db:push` to sync Prisma schema.');
    }
  } catch (error: any) {
    console.error('❌ Database Connection Failed:');
    console.error(error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
