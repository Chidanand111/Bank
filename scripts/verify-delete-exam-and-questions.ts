process.env.ADMIN_OVERRIDE = 'true';

import { prisma } from '../lib/prisma';
import {
  createExamAction,
  deleteExamAction,
  createMockTestAction,
  deleteMockTestAction,
  createQuestionAction,
} from '../lib/services/adminService';

async function runVerification() {
  console.log('=====================================================');
  console.log('VERIFYING CASCADE DELETION OF EXAMS & QUESTIONS (SAVE DB SPACE)');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testExamSlug = `exam-db-space-${timestamp}`;
  const testExamTitle = `Storage Test Exam ${timestamp}`;

  // ==========================================
  // SETUP: CREATE TEMPORARY EXAM WITH QUESTIONS
  // ==========================================
  console.log('--- STEP 1: Creating Test Exam and Populating Questions ---');

  const createExamRes = await createExamAction({
    title: testExamTitle,
    category: 'PO',
    description: 'Temporary exam to verify database storage cleanup and question purge on deletion',
  });

  assert(createExamRes.success === true, '1. Test exam created successfully');
  const examId = createExamRes.exam?.id || testExamSlug;

  // Retrieve default created section
  const section = await prisma.section.findFirst({
    where: { examId },
  });
  const sectionCode = section?.code || 'QUANT';

  // Create a Mock Test under this exam
  const testPaperSlug = `mock-paper-${timestamp}`;
  const testPaperTitle = `Test Exam Paper ${timestamp}`;

  const createTestRes = await createMockTestAction({
    title: testPaperTitle,
    slug: testPaperSlug,
    description: 'Paper to verify questions are deleted when paper is deleted',
    examId: examId,
    durationMinutes: 20,
    totalMarks: 20,
    cutoffMarks: 10,
    isPyq: true,
    year: 2025,
  });

  assert(createTestRes.success === true, '2. Test exam paper created successfully');
  const testPaperId = createTestRes.test?.id || testPaperSlug;

  // Seed question linked to this test paper
  const question1 = await createQuestionAction({
    examId: examId,
    mockTestId: testPaperId,
    sectionCode: sectionCode,
    topicName: 'Storage Test',
    text: `Test Question 1 for storage verification ${timestamp}`,
    difficulty: 'EASY',
    marks: 1,
    negativeMarks: 0.25,
    explanation: 'Testing cascade delete of questions',
    options: [
      { text: 'Option Alpha', isCorrect: true },
      { text: 'Option Beta', isCorrect: false },
    ],
  });

  assert(question1.success === true && Boolean(question1.question), '3. Question 1 created and linked to test paper');
  const q1Id = question1.question!.id;

  // Verify Question and Options are stored in Neon PostgreSQL
  const dbQ1Before = await prisma.question.findUnique({
    where: { id: q1Id },
    include: { options: true, mockTestQuestions: true },
  });
  assert(dbQ1Before !== null, '4. Question 1 confirmed in Neon PostgreSQL database');
  assert(dbQ1Before?.options.length === 2, '5. Question 1 options confirmed in Neon PostgreSQL');

  // ==========================================
  // TEST SUITE 1: DELETE EXAM PAPER DELETES ITS QUESTIONS
  // ==========================================
  console.log('\n--- STEP 2: Deleting Exam Paper -> Must Delete Questions to Save DB Space ---');

  const deleteTestRes = await deleteMockTestAction(testPaperId);
  assert(deleteTestRes.success === true, '6. deleteMockTestAction executed successfully');

  // Verify question 1 is deleted from Neon PostgreSQL
  const dbQ1After = await prisma.question.findUnique({
    where: { id: q1Id },
  });
  assert(dbQ1After === null, '7. Question 1 permanently purged from Neon PostgreSQL Question table');

  // Verify options for question 1 are deleted
  const q1OptionsCount = await prisma.option.count({
    where: { questionId: q1Id },
  });
  assert(q1OptionsCount === 0, '8. Options for Question 1 completely purged from Neon PostgreSQL Option table');

  // Verify mock test record is deleted
  const dbTestAfter = await prisma.mockTest.findUnique({
    where: { id: testPaperId },
  });
  assert(dbTestAfter === null, '9. MockTest record completely removed from Neon PostgreSQL');

  // ==========================================
  // TEST SUITE 2: DELETE EXAM DELETES ALL REMAINING QUESTIONS, SECTIONS & EXAM
  // ==========================================
  console.log('\n--- STEP 3: Deleting Exam -> Must Delete All Questions, Sections & Child Records ---');

  // Add a new question directly under the exam
  const question2 = await createQuestionAction({
    examId: examId,
    sectionCode: sectionCode,
    topicName: 'Direct Exam Question',
    text: `Direct Exam Question 2 for storage verification ${timestamp}`,
    difficulty: 'MEDIUM',
    marks: 1,
    negativeMarks: 0.25,
    explanation: 'Testing exam-level cascade delete',
    options: [
      { text: 'Option X', isCorrect: true },
      { text: 'Option Y', isCorrect: false },
      { text: 'Option Z', isCorrect: false },
    ],
  });

  assert(question2.success === true && Boolean(question2.question), '10. Question 2 created under exam');
  const q2Id = question2.question!.id;

  const dbQ2Before = await prisma.question.findUnique({
    where: { id: q2Id },
    include: { options: true },
  });
  assert(dbQ2Before !== null, '11. Question 2 verified in Neon PostgreSQL');
  assert(dbQ2Before?.options.length === 3, '12. Question 2 options verified in Neon PostgreSQL');

  // Now delete the entire Exam
  const deleteExamRes = await deleteExamAction(examId);
  assert(deleteExamRes.success === true, '13. deleteExamAction executed successfully');

  // Verify Question 2 is deleted from Neon DB
  const dbQ2After = await prisma.question.findUnique({
    where: { id: q2Id },
  });
  assert(dbQ2After === null, '14. Question 2 permanently deleted from Neon PostgreSQL');

  // Verify Options for Question 2 are deleted
  const q2OptionsCount = await prisma.option.count({
    where: { questionId: q2Id },
  });
  assert(q2OptionsCount === 0, '15. Options for Question 2 permanently deleted from Neon PostgreSQL');

  // Verify Sections are deleted
  const sectionsCount = await prisma.section.count({
    where: { examId },
  });
  assert(sectionsCount === 0, '16. All sections under deleted exam deleted from Neon PostgreSQL');

  // Verify Exam itself is deleted
  const dbExamAfter = await prisma.exam.findUnique({
    where: { id: examId },
  });
  assert(dbExamAfter === null, '17. Exam record permanently removed from Neon PostgreSQL');

  console.log('\n=====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification()
  .catch(err => {
    console.error('Verification failed with error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
