// Enable admin override for background verification execution
process.env.ADMIN_OVERRIDE = 'true';

import { prisma } from '../lib/prisma';
import {
  bulkImportQuestionsAction,
  getLiveExamQuestionsAction,
  deleteQuestionAction,
  loadFreshQuestionsFromDb,
} from '../lib/services/adminService';
import { resolveGroupPassages } from '../lib/db/questionDb';
import { getBase64SizeBytes, formatByteSize } from '../lib/utils/imageCompressor';
import { AdminQuestionInput } from '../types';

async function main() {
  console.log('\n--- 1. Testing Image Utilities & Size Calculations ---');
  const sampleDataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(4000);
  const sizeBytes = getBase64SizeBytes(sampleDataUrl);
  const formatted = formatByteSize(sizeBytes);
  console.log(`Calculated size: ${sizeBytes} bytes (${formatted})`);
  if (sizeBytes <= 0) throw new Error('Base64 size calculation failed.');
  console.log('✓ Image size calculations verified successfully.');

  console.log('\n--- 2. Testing In-Memory resolveGroupPassages Utility ---');
  const sampleGroupQuestions = [
    {
      id: 'test-q1',
      groupId: 'GROUP-TEST-01',
      passage: 'Shared Reading Comprehension Passage for Bank Exam.',
      passageImageUrl: 'data:image/jpeg;base64,chart123',
      text: 'Question 1',
    },
    {
      id: 'test-q2',
      groupId: 'GROUP-TEST-01',
      passage: null,
      passageImageUrl: null,
      text: 'Question 2',
    },
    {
      id: 'test-q3',
      groupId: 'GROUP-TEST-01',
      passage: undefined,
      passageImageUrl: undefined,
      text: 'Question 3',
    },
    {
      id: 'test-standalone',
      groupId: undefined,
      passage: undefined,
      text: 'Question 4 (Standalone)',
    },
  ];

  const resolved = resolveGroupPassages(sampleGroupQuestions);
  if (resolved[1].passage !== 'Shared Reading Comprehension Passage for Bank Exam.') {
    throw new Error('resolveGroupPassages failed to hydrate passage on Q2');
  }
  if (resolved[1].passageImageUrl !== 'data:image/jpeg;base64,chart123') {
    throw new Error('resolveGroupPassages failed to hydrate passageImageUrl on Q2');
  }
  if (resolved[2].passage !== 'Shared Reading Comprehension Passage for Bank Exam.') {
    throw new Error('resolveGroupPassages failed to hydrate passage on Q3');
  }
  if (resolved[3].passage !== undefined) {
    throw new Error('resolveGroupPassages improperly attached passage to standalone question');
  }
  console.log('✓ resolveGroupPassages correctly hydrated all group questions without affecting standalone questions.');

  console.log('\n--- 3. Testing Database De-duplication in Bulk Import ---');
  const testGroupId = `VERIFY-RC-${Date.now()}`;
  const sharedPassageText = 'The Reserve Bank of India regulates commercial banks through statutory reserves and policy repo rates.';
  const sharedChartImage = 'data:image/jpeg;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  // 5 rows in CSV batch belonging to the same group, each repeating the passage and image
  const batch: AdminQuestionInput[] = Array.from({ length: 5 }, (_, i) => ({
    examId: 'exam-ibps-po',
    sectionCode: 'ENGLISH',
    topicName: 'Reading Comprehension',
    text: `RC Group Test Question #${i + 1} regarding monetary framework?`,
    groupId: testGroupId,
    passage: sharedPassageText,
    passageImageUrl: sharedChartImage,
    difficulty: 'MEDIUM',
    marks: 1.0,
    negativeMarks: 0.25,
    explanation: `Explanation for question #${i + 1}.`,
    options: [
      { text: `Option A for Q${i + 1}`, isCorrect: true },
      { text: `Option B for Q${i + 1}`, isCorrect: false },
      { text: `Option C for Q${i + 1}`, isCorrect: false },
      { text: `Option D for Q${i + 1}`, isCorrect: false },
      { text: `Option E for Q${i + 1}`, isCorrect: false },
    ],
  }));

  console.log(`Submitting batch of 5 questions under groupId: ${testGroupId}...`);
  const importRes = await bulkImportQuestionsAction(batch, 'mock-ibps-po-1');
  console.log(`Import result: count=${importRes.count}, success=${importRes.success}`);
  if (!importRes.success || importRes.count !== 5) {
    throw new Error(`Bulk import failed: ${importRes.error || 'Count mismatch'}`);
  }

  // 4. Verify PostgreSQL Database rows directly
  console.log('\n--- 4. Checking Neon PostgreSQL Storage Rows ---');
  const dbRows = await prisma.question.findMany({
    where: { groupId: testGroupId },
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${dbRows.length} question rows in Neon PostgreSQL.`);
  if (dbRows.length !== 5) throw new Error(`Expected 5 rows in DB, got ${dbRows.length}`);

  const rowsWithPassage = dbRows.filter(r => r.passage !== null && r.passage !== '');
  const rowsWithoutPassage = dbRows.filter(r => r.passage === null || r.passage === '');
  const rowsWithImage = dbRows.filter(r => r.passageImageUrl !== null && r.passageImageUrl !== '');
  const rowsWithoutImage = dbRows.filter(r => r.passageImageUrl === null || r.passageImageUrl === '');

  console.log(`DB Rows with stored passage: ${rowsWithPassage.length}`);
  console.log(`DB Rows with NULL passage (space saved): ${rowsWithoutPassage.length}`);
  console.log(`DB Rows with stored chart image: ${rowsWithImage.length}`);
  console.log(`DB Rows with NULL chart image (space saved): ${rowsWithoutImage.length}`);

  if (rowsWithPassage.length !== 1 || rowsWithoutPassage.length !== 4) {
    throw new Error(`Storage optimization assertion failed: expected 1 stored passage and 4 NULL passages.`);
  }
  if (rowsWithImage.length !== 1 || rowsWithoutImage.length !== 4) {
    throw new Error(`Storage optimization assertion failed: expected 1 stored image and 4 NULL images.`);
  }
  console.log('✓ PostgreSQL storage optimization verified: 80% DB storage space saved for this 5-question group!');

  // 5. Test Live Exam Query Hydration
  console.log('\n--- 5. Testing Live Exam Questions Hydration ---');
  const liveQuestions = await getLiveExamQuestionsAction('mock-ibps-po-1');
  const groupQuestionsInLiveExam = liveQuestions.filter(q => q.groupId === testGroupId);

  console.log(`Live exam returned ${groupQuestionsInLiveExam.length} questions for group ${testGroupId}`);
  if (groupQuestionsInLiveExam.length !== 5) {
    throw new Error(`Expected all 5 group questions in live exam, got ${groupQuestionsInLiveExam.length}`);
  }

  for (let idx = 0; idx < groupQuestionsInLiveExam.length; idx++) {
    const q = groupQuestionsInLiveExam[idx];
    if (!q.passage || q.passage !== sharedPassageText) {
      throw new Error(`Question #${idx + 1} (${q.id}) did not receive hydrated passage text!`);
    }
    if (!q.passageImageUrl || q.passageImageUrl !== sharedChartImage) {
      throw new Error(`Question #${idx + 1} (${q.id}) did not receive hydrated passage image diagram!`);
    }
  }
  console.log('✓ All 5 questions in the live exam successfully display the shared passage and DI chart!');

  // 6. Clean up test questions
  console.log('\n--- 6. Cleaning Up Test Data ---');
  for (const row of dbRows) {
    await deleteQuestionAction(row.id);
  }
  console.log(`✓ Deleted ${dbRows.length} test questions from database.`);

  console.log('\n=== ALL PASSAGE DE-DUPLICATION & DI COMPRESSION TESTS PASSED! ===\n');
}

main()
  .catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
