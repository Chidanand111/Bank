const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const qCount = await prisma.question.count();
  const oCount = await prisma.option.count();
  const tCount = await prisma.topic.count();
  const examCount = await prisma.exam.count();
  const ansCount = await prisma.answer.count();
  const attCount = await prisma.attempt.count();
  console.log({ examCount, tCount, qCount, oCount, ansCount, attCount });
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
