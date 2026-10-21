import { PrismaClient, Role, UserStatus, Difficulty, ExamCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding BankMock database with initial development data...');

  const adminEmail = process.env.DEV_ADMIN_EMAIL || 'admin@bankmock.com';
  const adminPassword = process.env.DEV_ADMIN_PASSWORD || 'admin123';
  const userEmail = process.env.DEV_USER_EMAIL || 'student@bankmock.com';
  const userPassword = process.env.DEV_USER_PASSWORD || 'user123';

  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
  const hashedUserPassword = await bcrypt.hash(userPassword, 10);

  // Seed Admin User
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
      status: UserStatus.APPROVED,
      password: hashedAdminPassword,
    },
    create: {
      email: adminEmail,
      name: 'Platform Admin',
      password: hashedAdminPassword,
      role: Role.ADMIN,
      status: UserStatus.APPROVED,
    },
  });

  // Seed Regular Student User
  const student = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      role: Role.USER,
      status: UserStatus.APPROVED,
      password: hashedUserPassword,
    },
    create: {
      email: userEmail,
      name: 'Rahul Sharma',
      password: hashedUserPassword,
      role: Role.USER,
      status: UserStatus.APPROVED,
    },
  });

  // Seed Pending Candidate User for Approval Flow testing
  const pending = await prisma.user.upsert({
    where: { email: 'pending@bankmock.com' },
    update: {
      role: Role.USER,
      status: UserStatus.PENDING,
      password: hashedUserPassword,
    },
    create: {
      email: 'pending@bankmock.com',
      name: 'Pooja Verma',
      password: hashedUserPassword,
      role: Role.USER,
      status: UserStatus.PENDING,
    },
  });

  console.log(`Seeded Admin: ${admin.email} (Role: ${admin.role}, Status: ${admin.status})`);
  console.log(`Seeded Student: ${student.email} (Role: ${student.role}, Status: ${student.status})`);
  console.log(`Seeded Pending: ${pending.email} (Role: ${pending.role}, Status: ${pending.status})`);

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

  const sscCgl = await prisma.exam.upsert({
    where: { slug: 'ssc-cgl' },
    update: {},
    create: {
      slug: 'ssc-cgl',
      title: 'SSC CGL (Combined Graduate Level)',
      category: ExamCategory.SSC,
      description: 'Staff Selection Commission Combined Graduate Level Examination for premier Central Government Ministries and Department recruitments.',
    },
  });

  console.log('Exams seeded successfully:', ibpsPo.title, sbiClerk.title, sscCgl.title);

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

  // Seed Sections for SSC CGL (25 Qs, 50 Marks, 15 min each)
  const secSscReason = await prisma.section.upsert({
    where: { examId_code: { examId: sscCgl.id, code: 'REASONING' } },
    update: {},
    create: {
      id: 'sec-ssc-cgl-reason',
      name: 'General Intelligence & Reasoning',
      code: 'REASONING',
      examId: sscCgl.id,
      order: 1,
    },
  });

  const secSscGA = await prisma.section.upsert({
    where: { examId_code: { examId: sscCgl.id, code: 'GA' } },
    update: {},
    create: {
      id: 'sec-ssc-cgl-ga',
      name: 'General Awareness',
      code: 'GA',
      examId: sscCgl.id,
      order: 2,
    },
  });

  const secSscQuant = await prisma.section.upsert({
    where: { examId_code: { examId: sscCgl.id, code: 'QUANT' } },
    update: {},
    create: {
      id: 'sec-ssc-cgl-quant',
      name: 'Quantitative Aptitude',
      code: 'QUANT',
      examId: sscCgl.id,
      order: 3,
    },
  });

  const secSscEnglish = await prisma.section.upsert({
    where: { examId_code: { examId: sscCgl.id, code: 'ENGLISH' } },
    update: {},
    create: {
      id: 'sec-ssc-cgl-eng',
      name: 'English Comprehension',
      code: 'ENGLISH',
      examId: sscCgl.id,
      order: 4,
    },
  });

  console.log('Sections seeded for IBPS PO and SSC CGL');

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
      explanation: q.explanation || '',
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
      isCorrect: Boolean(opt.isCorrect),
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

  // Link questions to IBPS PO Mock Test
  const { getFixedQuestionsForMockTest } = await import('../lib/db/questionDb');
  const ibpsQuestions = getFixedQuestionsForMockTest(mockTest.slug);

  const mockTestQuestionData = ibpsQuestions.map((q, idx) => {
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

  // Seed SSC CGL Mock Test (100 Qs, 200 Marks, 60 Mins, 15m / section)
  const sscMock = await prisma.mockTest.upsert({
    where: { slug: 'ssc-cgl-tier-1-full-mock-1' },
    update: {
      durationMinutes: 60,
      totalMarks: 200,
      totalQuestions: 100,
      cutoffMarks: 135.0,
      timerType: 'OVERALL_COMPOSITE',
      allowSectionSwitch: true,
      negativeMarkRatio: 0.50,
      stage: 'Tier-1',
    },
    create: {
      id: 'mock-ssc-cgl-tier1-1',
      slug: 'ssc-cgl-tier-1-full-mock-1',
      title: 'SSC CGL Tier-1 Full Mock Test 1',
      description: 'Official pattern 100-Question mock test for SSC CGL Tier-1: 25 Reasoning (50 marks, 15 min), 25 General Awareness (50 marks, 15 min), 25 Quantitative Aptitude (50 marks, 15 min), 25 English (50 marks, 15 min) (+2 marks, -0.50 negative, 60 mins composite timer).',
      examId: sscCgl.id,
      durationMinutes: 60,
      totalMarks: 200,
      totalQuestions: 100,
      cutoffMarks: 135.0,
      isFree: true,
      isPublished: true,
      timerType: 'OVERALL_COMPOSITE',
      allowSectionSwitch: true,
      negativeMarkRatio: 0.50,
      stage: 'Tier-1',
    },
  });

  const sscQuestions = getFixedQuestionsForMockTest(sscMock.slug);
  const sscMockQuestionData = sscQuestions.map((q, idx) => {
    const sectionId =
      q.sectionCode === 'REASONING'
        ? secSscReason.id
        : q.sectionCode === 'GA'
        ? secSscGA.id
        : q.sectionCode === 'QUANT'
        ? secSscQuant.id
        : secSscEnglish.id;

    return {
      mockTestId: sscMock.id,
      questionId: q.id,
      sectionId: sectionId,
      order: idx + 1,
    };
  });

  await prisma.mockTestQuestion.createMany({
    data: sscMockQuestionData,
  });

  console.log(`Linked ${sscMockQuestionData.length} questions to SSC CGL Mock Test: ${sscMock.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
