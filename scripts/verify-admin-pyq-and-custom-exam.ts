import 'dotenv/config';
process.env.ADMIN_OVERRIDE = 'true';

import { prisma } from '../lib/prisma';
import {
  createMockTestAction,
  createQuestionAction,
  getAdminPartitions,
  getAdminQuestions,
} from '../lib/services/adminService';
import { getMockTests, getMockTestById } from '../lib/services/testService';

async function runVerification() {
  console.log('=== Starting Admin Custom Exam & PYQ Creation Verification ===');

  console.log('Warming up Neon DB connection...');
  await prisma.$queryRaw`SELECT 1`;
  console.log('✓ Neon DB connection active');

  const customTitle = 'Test Custom RRB PO Exam ' + Date.now();
  const pyqPaperTitle = 'Test RRB PO 2023 Prelims Official Paper ' + Date.now();

  console.log(`1. Creating PYQ under brand new custom exam: "${customTitle}"`);
  const createTestResult = await createMockTestAction({
    title: pyqPaperTitle,
    slug: 'test-rrb-po-2023-pyq-' + Date.now(),
    description: 'Official test paper for verification.',
    examId: '__NEW_EXAM__',
    customExamTitle: customTitle,
    customExamCategory: 'PO',
    durationMinutes: 45,
    totalMarks: 80,
    cutoffMarks: 55,
    isFree: true,
    isPyq: true,
    year: 2023,
    sections: [
      { code: 'REASONING', name: 'Reasoning Ability', questionCount: 40, marks: 40 },
      { code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 40, marks: 40 },
    ],
  });

  if (!createTestResult.success || !createTestResult.test) {
    throw new Error('Failed to create mock test: ' + createTestResult.error);
  }

  const createdTest = createTestResult.test;
  console.log(`✓ Mock Test created successfully with ID: ${createdTest.id}, examId: ${createdTest.examId}`);

  // Check in DB
  const dbTest = await prisma.mockTest.findUnique({
    where: { id: createdTest.id },
    include: { exam: { include: { sections: true } } },
  });
  console.log(`✓ DB Verification: Found MockTest in Neon DB with Exam Title: "${dbTest?.exam?.title}", Year: ${dbTest?.year}, isPyq: ${dbTest?.isPyq}`);
  if (!dbTest || dbTest.exam.title !== customTitle) {
    throw new Error('DB test or custom exam title mismatch');
  }

  console.log('2. Verifying getAdminPartitions contains the newly created PYQ partition...');
  const partitions = await getAdminPartitions();
  const foundPartition = partitions.find(p => p.id === createdTest.id);
  if (!foundPartition) {
    throw new Error('Newly created PYQ partition not found in getAdminPartitions()');
  }
  console.log(`✓ Partition found: ${foundPartition.label} [${foundPartition.badge}], isPyq: ${foundPartition.isPyq}`);

  console.log('3. Adding a question specifically into this new PYQ partition...');
  const createQResult = await createQuestionAction({
    examId: createdTest.examId,
    sectionCode: 'REASONING',
    topicName: 'Syllogism',
    text: 'Verification Question: Statements: All Banks are Safe. All Safe are Secure. Conclusions: I. All Banks are Secure. II. Some Secure are Banks.',
    difficulty: 'EASY',
    explanation: 'Both conclusions I and II follow by standard syllogism deduction.',
    marks: 1.0,
    negativeMarks: 0.25,
    isPyq: true,
    pyqYear: 2023,
    pyqExam: pyqPaperTitle,
    mockTestId: createdTest.id,
    options: [
      { text: 'Both conclusion I and II follow', isCorrect: true },
      { text: 'Only conclusion I follows', isCorrect: false },
      { text: 'Only conclusion II follows', isCorrect: false },
      { text: 'Neither conclusion I nor II follows', isCorrect: false },
      { text: 'Either conclusion I or II follows', isCorrect: false },
    ],
  });

  if (!createQResult.success || !createQResult.question) {
    throw new Error('Failed to create question: ' + createQResult.error);
  }

  const createdQuestion = createQResult.question;
  console.log(`✓ Question created with ID: ${createdQuestion.id}`);

  // Verify MockTestQuestion link in DB
  const link = await prisma.mockTestQuestion.findUnique({
    where: {
      mockTestId_questionId: {
        mockTestId: createdTest.id,
        questionId: createdQuestion.id,
      },
    },
  });
  if (!link) {
    throw new Error('mockTestQuestion link not found in Neon DB!');
  }
  console.log(`✓ MockTestQuestion link exists in Neon DB with order: ${link.order}`);

  console.log('4. Verifying question loads in admin partition filter...');
  const partitionQuestions = await getAdminQuestions({ partition: createdTest.id });
  console.log(`✓ Loaded ${partitionQuestions.length} questions for partition ${createdTest.id}`);
  if (!partitionQuestions.some(q => q.id === createdQuestion.id)) {
    throw new Error('Created question does not appear in admin partition questions');
  }

  console.log('5. Verifying student test runner APIs (getMockTestById & getQuestionsForTest)...');
  const runnerTest = await getMockTestById(createdTest.id);
  if (!runnerTest) {
    throw new Error('getMockTestById failed to return created test');
  }
  console.log(`✓ Runner loaded test: "${runnerTest.title}" with ${runnerTest.sections.length} sections`);

  const runnerQuestions = runnerTest.questions || [];
  console.log(`✓ Runner loaded ${runnerQuestions.length} questions for this test`);
  if (!runnerQuestions.some(q => q.id === createdQuestion.id)) {
    throw new Error('Runner questions does not contain the newly added question');
  }

  console.log('6. Verifying student mock test catalog (getMockTests)...');
  const allTests = await getMockTests();
  const catalogTest = allTests.find(t => t.id === createdTest.id);
  if (!catalogTest || !catalogTest.isPyq) {
    throw new Error('Test not found in student test catalog or isPyq is false');
  }
  console.log(`✓ Test found in student catalog: "${catalogTest.title}" (isPyq: ${catalogTest.isPyq})`);

  console.log('7. Cleaning up test data from Neon DB...');
  await prisma.mockTestQuestion.deleteMany({ where: { mockTestId: createdTest.id } });
  await prisma.option.deleteMany({ where: { questionId: createdQuestion.id } });
  await prisma.question.delete({ where: { id: createdQuestion.id } });
  await prisma.mockTest.delete({ where: { id: createdTest.id } });
  await prisma.section.deleteMany({ where: { examId: createdTest.examId } });
  await prisma.exam.delete({ where: { id: createdTest.examId } });
  console.log('✓ Cleanup completed successfully.');

  console.log('\nALL VERIFICATION CHECKS PASSED PERFECTLY!');
  await prisma.$disconnect();
}

runVerification().catch(async (e) => {
  console.error('VERIFICATION FAILED:', e);
  await prisma.$disconnect();
  process.exit(1);
});
