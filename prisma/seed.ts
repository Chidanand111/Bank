import { PrismaClient, Role, Difficulty, ExamCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding BankMock database with initial development data...');

  const adminEmail = process.env.DEV_ADMIN_EMAIL || 'admin@bankmock.com';
  const adminPassword = process.env.DEV_ADMIN_PASSWORD || 'admin123';
  const userEmail = process.env.DEV_USER_EMAIL || 'student@bankmock.com';
  const userPassword = process.env.DEV_USER_PASSWORD || 'user123';

  // Seed Admin User
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
    },
    create: {
      email: adminEmail,
      name: 'Platform Admin',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  // Seed Regular Student User
  const student = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      role: Role.USER,
    },
    create: {
      email: userEmail,
      name: 'Rahul Sharma',
      password: userPassword,
      role: Role.USER,
    },
  });

  console.log(`Seeded Admin: ${admin.email} (Role: ${admin.role})`);
  console.log(`Seeded Student: ${student.email} (Role: ${student.role})`);

  // Seed Target Exams
  const ibpsPo = await prisma.exam.upsert({
    where: { slug: 'ibps-po' },
    update: {},
    create: {
      slug: 'ibps-po',
      title: 'IBPS PO (Probationary Officer)',
      category: ExamCategory.PO,
      description: 'Institute of Banking Personnel Selection Probationary Officer examination for 11 participating public sector banks.',
    },
  });

  const sbiClerk = await prisma.exam.upsert({
    where: { slug: 'sbi-clerk' },
    update: {},
    create: {
      slug: 'sbi-clerk',
      title: 'SBI Clerk (Junior Associate)',
      category: ExamCategory.CLERK,
      description: 'State Bank of India Junior Associate examination conducted across India.',
    },
  });

  console.log('Exams seeded successfully:', ibpsPo.title, sbiClerk.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
