import { prisma } from '../lib/prisma';

async function reset() {
  await prisma.question.update({ where: { id: 'sbi-2024-q1' }, data: { imageUrl: null } });
  await prisma.option.updateMany({ where: { questionId: 'sbi-2024-q1' }, data: { imageUrl: null } });
  await prisma.question.update({ where: { id: 'q-json-2' }, data: { imageUrl: null } });
  console.log('Cleaned test images from database successfully.');
  await prisma.$disconnect();
}

reset().catch(console.error);
