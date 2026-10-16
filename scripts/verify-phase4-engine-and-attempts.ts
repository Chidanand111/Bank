import { prisma } from '../lib/prisma';
import { saveAttemptAction, getAttemptByIdAction, getUserAttemptsAction, getAdminAllAttempts } from '../lib/services/attemptService';
import { AttemptResult } from '../types';
import assert from 'assert';

async function main() {
  console.log('=== Starting Phase 4: Exam Engine & Attempt Persistence Verification ===');

  const testAttemptId = `att-verify-phase4-${Date.now()}`;
  const testUserId = 'user-student-1';

  // 1. Find a valid mock test and question in DB
  const dbTest = await prisma.mockTest.findFirst({
    include: { mockTestQuestions: { include: { question: { include: { options: true } } } } },
  });

  assert(dbTest, 'At least one MockTest exists in Neon DB');
  const targetMockTestId = dbTest.id;
  const sampleQuestion = dbTest.mockTestQuestions[0]?.question;

  console.log(`1. Target Mock Test: "${dbTest.title}" (ID: ${targetMockTestId})`);

  // 2. Prepare mock attempt result payload
  const mockResult: AttemptResult = {
    id: testAttemptId,
    mockTestId: targetMockTestId,
    mockTestTitle: dbTest.title,
    examSlug: 'ibps-po',
    examTitle: 'IBPS PO Prelims',
    userId: testUserId,
    userName: 'Rahul Sharma (Student)',
    startedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    completedAt: new Date().toISOString(),
    timeTakenSeconds: 3540,
    totalDurationSeconds: 3600,
    score: 65.5,
    maxScore: 100,
    percentage: 65.5,
    accuracy: 82.5,
    totalQuestions: 100,
    totalAttempted: 70,
    correctCount: 60,
    incorrectCount: 10,
    unansweredCount: 30,
    cutoffMarks: 58.5,
    isCutoffCleared: true,
    sectionResults: [],
    topicResults: [],
    questionDetails: sampleQuestion ? [
      {
        question: sampleQuestion as any,
        selectedOptionId: sampleQuestion.options[0]?.id || null,
        isCorrect: true,
        status: 'ANSWERED',
        marksObtained: 1.0,
        timeSpentSeconds: 35,
      },
    ] : [],
  };

  // 3. Test saveAttemptAction
  console.log('2. Saving attempt to Neon PostgreSQL...');
  const saveRes = await saveAttemptAction(mockResult);
  assert(saveRes.success, `saveAttemptAction succeeded: ${saveRes.error}`);
  assert.strictEqual(saveRes.attemptId, testAttemptId, 'Returned attemptId matches');
  console.log('✓ Attempt saved successfully to Neon PostgreSQL');

  // 4. Verify in database
  const dbRecord = await prisma.attempt.findUnique({
    where: { id: testAttemptId },
    include: { answers: true, user: true, mockTest: true },
  });
  assert(dbRecord, 'Attempt found in Neon DB');
  assert.strictEqual(dbRecord.score, 65.5, 'DB score matches');
  assert.strictEqual(dbRecord.isCompleted, true, 'isCompleted is true');
  assert.strictEqual(dbRecord.timeTakenSeconds, 3540, 'timeTakenSeconds matches');
  if (sampleQuestion) {
    assert(dbRecord.answers.length > 0, 'Child answers saved in DB');
    console.log(`✓ Verified ${dbRecord.answers.length} child answer records in Neon DB`);
  }
  console.log('✓ Direct DB record verification passed');

  // 5. Test getAttemptByIdAction
  console.log('3. Fetching attempt via getAttemptByIdAction...');
  const fetched = await getAttemptByIdAction(testAttemptId);
  assert(fetched, 'getAttemptByIdAction returned attempt result');
  assert.strictEqual(fetched.id, testAttemptId, 'Fetched ID matches');
  assert.strictEqual(fetched.score, 65.5, 'Fetched score matches');
  assert.strictEqual(fetched.isCutoffCleared, true, 'Fetched isCutoffCleared matches');
  console.log('✓ getAttemptByIdAction verified');

  // 6. Test getUserAttemptsAction
  console.log('4. Fetching user attempts via getUserAttemptsAction...');
  const userAttempts = await getUserAttemptsAction(dbRecord.userId);
  const foundInUserAttempts = userAttempts.some(a => a.id === testAttemptId);
  assert(foundInUserAttempts, 'Created attempt appears in getUserAttemptsAction');
  console.log(`✓ Verified attempt in user attempts list (${userAttempts.length} total user attempts)`);

  // 7. Cleanup verification attempt
  console.log('5. Cleaning up verification attempt from Neon DB...');
  await prisma.answer.deleteMany({ where: { attemptId: testAttemptId } });
  await prisma.attempt.delete({ where: { id: testAttemptId } });
  console.log('✓ Cleanup completed successfully');

  console.log('\nALL PHASE 4 ENGINE & ATTEMPT PERSISTENCE CHECKS PASSED PERFECTLY!');
}

main()
  .catch(err => {
    console.error('Phase 4 verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
