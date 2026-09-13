import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const q = await prisma.question.count();
  const pyq = await prisma.question.count({ where: { isPyq: true } });
  const opt = await prisma.option.count();
  console.log({ totalQuestions: q, pyqQuestions: pyq, options: opt });
  await prisma.$disconnect();
}
run();
