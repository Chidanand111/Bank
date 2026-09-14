import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.question.count();
  const pyqs = await prisma.question.count({ where: { isPyq: true } });
  const samplePyq = await prisma.question.findFirst({
    where: { isPyq: true },
    select: { id: true, text: true, isPyq: true, pyqYear: true, imageUrl: true }
  });
  const sampleNonPyq = await prisma.question.findFirst({
    where: { isPyq: false },
    select: { id: true, text: true, isPyq: true, imageUrl: true }
  });
  console.log('Total Questions in DB:', total);
  console.log('PYQ Questions in DB:', pyqs);
  console.log('Sample PYQ:', samplePyq);
  console.log('Sample Non-PYQ:', sampleNonPyq);
  await prisma.$disconnect();
}

main().catch(console.error);
