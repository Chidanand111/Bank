import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, status: true },
  });
  console.log('Current users in DB:\n', JSON.stringify(users, null, 2));

  // Admin user details
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bankmock.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'System Admin',
      password: hashedPassword,
      role: Role.ADMIN,
      status: UserStatus.APPROVED,
    },
    create: {
      email: adminEmail,
      name: 'System Admin',
      password: hashedPassword,
      role: Role.ADMIN,
      status: UserStatus.APPROVED,
    },
  });

  const isMatch = await bcrypt.compare(adminPassword, admin.password!);

  console.log('\n--- Admin User Configured Successfully ---');
  console.log(`ID: ${admin.id}`);
  console.log(`Email: ${admin.email}`);
  console.log(`Name: ${admin.name}`);
  console.log(`Role: ${admin.role}`);
  console.log(`Status: ${admin.status}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`Password Verified: ${isMatch}`);
}

main()
  .catch((e) => {
    console.error('Error managing admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
