import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to Neon PostgreSQL to create 2023 PYQ session...');

  const exam = await prisma.exam.findUnique({
    where: { slug: 'sbi-clerk' },
  });

  if (!exam) {
    console.error('SBI Clerk Exam not found');
    return;
  }

  // 1. Create or update the 2023 mock test
  const mockTest2023 = await prisma.mockTest.upsert({
    where: { slug: 'sbi-clerk-prelims-2023-pyq' },
    update: {
      title: 'SBI Clerk Prelims 2023-24 - Previous Year Question Paper',
      description: 'Authentic 100-question actual exam paper from SBI Clerk Prelims 2023-24 (Held on 05th Jan 2024). Exact official questions, sectional timings, interlinked reading comprehension and puzzles.',
      examId: exam.id,
      durationMinutes: 60,
      totalMarks: 100,
      totalQuestions: 100,
      cutoffMarks: 74.5,
      isFree: true,
      isPublished: true,
      isFixed: true,
      isPyq: true,
      year: 2023,
    },
    create: {
      id: 'mock-sbi-clerk-2023-pyq',
      slug: 'sbi-clerk-prelims-2023-pyq',
      title: 'SBI Clerk Prelims 2023-24 - Previous Year Question Paper',
      description: 'Authentic 100-question actual exam paper from SBI Clerk Prelims 2023-24 (Held on 05th Jan 2024). Exact official questions, sectional timings, interlinked reading comprehension and puzzles.',
      examId: exam.id,
      durationMinutes: 60,
      totalMarks: 100,
      totalQuestions: 100,
      cutoffMarks: 74.5,
      isFree: true,
      isPublished: true,
      isFixed: true,
      isPyq: true,
      year: 2023,
    },
  });

  console.log('2023 PYQ Mock Test ensured:', mockTest2023.id);

  // 2. Fetch all 100 questions from the 2024 mock test to link them to the 2023 session as well
  const existingLinks = await prisma.mockTestQuestion.findMany({
    where: { mockTestId: 'mock-sbi-clerk-2024-pyq' },
    orderBy: { order: 'asc' },
  });

  console.log(`Found ${existingLinks.length} questions linked to 2024 PYQ test. Linking to 2023 PYQ test...`);

  for (const link of existingLinks) {
    await prisma.mockTestQuestion.upsert({
      where: {
        mockTestId_questionId: {
          mockTestId: mockTest2023.id,
          questionId: link.questionId,
        },
      },
      update: {
        order: link.order,
        sectionId: link.sectionId,
      },
      create: {
        mockTestId: mockTest2023.id,
        questionId: link.questionId,
        sectionId: link.sectionId,
        order: link.order,
      },
    });
  }

  console.log(`Successfully linked all 100 questions to ${mockTest2023.title}!`);
  await prisma.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
