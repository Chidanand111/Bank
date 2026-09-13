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

  // Seed Sections for IBPS PO
  const secReasoning = await prisma.section.upsert({
    where: { examId_code: { examId: ibpsPo.id, code: 'REASONING' } },
    update: {},
    create: {
      id: 'sec-ibps-p-reason',
      name: 'Reasoning Ability',
      code: 'REASONING',
      examId: ibpsPo.id,
      order: 1,
    },
  });

  const secQuant = await prisma.section.upsert({
    where: { examId_code: { examId: ibpsPo.id, code: 'QUANT' } },
    update: {},
    create: {
      id: 'sec-ibps-p-quant',
      name: 'Quantitative Aptitude',
      code: 'QUANT',
      examId: ibpsPo.id,
      order: 2,
    },
  });

  const secEnglish = await prisma.section.upsert({
    where: { examId_code: { examId: ibpsPo.id, code: 'ENGLISH' } },
    update: {},
    create: {
      id: 'sec-ibps-p-eng',
      name: 'English Language',
      code: 'ENGLISH',
      examId: ibpsPo.id,
      order: 3,
    },
  });

  const secGA = await prisma.section.upsert({
    where: { examId_code: { examId: ibpsPo.id, code: 'FINANCIAL_AWARENESS' } },
    update: {},
    create: {
      id: 'sec-ibps-p-ga',
      name: 'General / Financial Awareness',
      code: 'FINANCIAL_AWARENESS',
      examId: ibpsPo.id,
      order: 4,
    },
  });

  console.log('Sections seeded for IBPS PO');

  // Seed Questions & Options directly from the JSON database
  const { getAllQuestions } = await import('../lib/db/questionDb');
  const allQuestions = getAllQuestions();

  // 1. Collect unique topics
  const topicMap = new Map<string, { id: string; name: string; sectionId: string }>();
  for (const q of allQuestions) {
    const sectionId =
      q.sectionCode === 'REASONING'
        ? secReasoning.id
        : q.sectionCode === 'QUANT'
        ? secQuant.id
        : q.sectionCode === 'FINANCIAL_AWARENESS'
        ? secGA.id
        : secEnglish.id;
    topicMap.set(q.topicId, { id: q.topicId, name: q.topicName, sectionId });
  }

  await prisma.topic.createMany({
    data: Array.from(topicMap.values()),
    skipDuplicates: true,
  });

  // 2. Clean questions and options to reseed cleanly
  await prisma.mockTestQuestion.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();

  const questionData = allQuestions.map((q) => {
    const isIbps = q.examId === 'exam-ibps-po';
    const examTargetId = isIbps ? ibpsPo.id : sbiClerk.id;

    const sectionId =
      q.sectionCode === 'REASONING'
        ? secReasoning.id
        : q.sectionCode === 'QUANT'
        ? secQuant.id
        : q.sectionCode === 'FINANCIAL_AWARENESS'
        ? secGA.id
        : secEnglish.id;

    return {
      id: q.id,
      text: q.text,
      explanation: q.explanation,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      difficulty: q.difficulty as Difficulty,
      examId: examTargetId,
      sectionId: sectionId,
      topicId: q.topicId,
    };
  });

  await prisma.question.createMany({
    data: questionData,
  });

  const allOptions = allQuestions.flatMap((q) =>
    q.options.map((opt) => ({
      id: opt.id,
      questionId: q.id,
      text: opt.text,
      isCorrect: opt.isCorrect,
      order: opt.order,
    }))
  );

  await prisma.option.createMany({
    data: allOptions,
  });

  console.log(`Successfully seeded ${allQuestions.length} questions and ${allOptions.length} options from JSON database.`);

  // Seed Mock Test
  const mockTest = await prisma.mockTest.upsert({
    where: { slug: 'ibps-po-prelims-mock-1' },
    update: {
      durationMinutes: 60,
      totalMarks: 100,
      totalQuestions: 100,
      cutoffMarks: 54.5,
    },
    create: {
      id: 'mock-ibps-po-1',
      slug: 'ibps-po-prelims-mock-1',
      title: 'IBPS PO Prelims Full Mock Test 1',
      description: '100-Question dynamic full-length practice test for IBPS PO Prelims covering Reasoning Ability (35), Quantitative Aptitude (35), and English Language (30).',
      examId: ibpsPo.id,
      durationMinutes: 60,
      totalMarks: 100,
      totalQuestions: 100,
      cutoffMarks: 54.5,
      isFree: true,
      isPublished: true,
    },
  });

  // Link questions to Mock Test
  const { generateRandomizedMockTest } = await import('../lib/db/questionDb');
  const { MOCK_TESTS_DATA } = await import('../lib/data/mockTests');
  const template = MOCK_TESTS_DATA[0];
  const dynamicTest = generateRandomizedMockTest(template);

  const mockTestQuestionData = dynamicTest.questions.map((q, idx) => {
    const sectionId =
      q.sectionCode === 'REASONING'
        ? secReasoning.id
        : q.sectionCode === 'QUANT'
        ? secQuant.id
        : secEnglish.id;

    return {
      mockTestId: mockTest.id,
      questionId: q.id,
      sectionId: sectionId,
      order: idx + 1,
    };
  });

  await prisma.mockTestQuestion.createMany({
    data: mockTestQuestionData,
  });

  console.log(`Linked ${mockTestQuestionData.length} questions to Mock Test: ${mockTest.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
