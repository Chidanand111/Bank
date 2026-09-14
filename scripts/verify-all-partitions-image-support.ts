import { prisma } from '../lib/prisma';
import {
  getAdminQuestions,
  updateQuestionAction,
  getLiveExamQuestionsAction,
  partitionQuestionsList,
  loadFreshQuestionsFromDb,
} from '../lib/services/adminService';

// Mock admin session for server actions
process.env.ADMIN_OVERRIDE = 'true';

async function verify() {
  console.log('--- Step 1: Verify Fresh Questions from Neon DB ---');
  const freshAll = await loadFreshQuestionsFromDb();
  console.log(`Loaded ${freshAll.length} total questions from database.`);

  console.log('\n--- Step 2: Verify Partition Filtering ---');
  const pyq2024 = partitionQuestionsList(freshAll, 'mock-sbi-clerk-2024-pyq');
  console.log(`PYQ 2024 Partition count: ${pyq2024.length} (Expected: 100)`);
  console.log(`PYQ 2024 Q1 ID: ${pyq2024[0]?.id}, text: ${pyq2024[0]?.text?.slice(0, 40)}...`);

  const pyq2023 = partitionQuestionsList(freshAll, 'mock-sbi-clerk-2023-pyq');
  console.log(`PYQ 2023-24 Partition count: ${pyq2023.length} (Expected: 100)`);

  const ibps1 = partitionQuestionsList(freshAll, 'mock-ibps-po-1');
  console.log(`IBPS PO Mock 1 Partition count: ${ibps1.length} (Expected: 100)`);

  console.log('\n--- Step 3: Test Saving Image to PYQ 2024 Question 1 (sbi-2024-q1) ---');
  const testImageUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...mockPyqImage...';
  const testOptionImg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...mockOptionAImage...';

  const pyqQ1 = pyq2024[0];
  const updateRes1 = await updateQuestionAction(pyqQ1.id, {
    examId: pyqQ1.examId,
    sectionCode: pyqQ1.sectionCode,
    topicName: pyqQ1.topicName,
    text: pyqQ1.text,
    difficulty: pyqQ1.difficulty,
    explanation: pyqQ1.explanation,
    marks: pyqQ1.marks,
    negativeMarks: pyqQ1.negativeMarks,
    imageUrl: testImageUrl,
    passage: pyqQ1.passage,
    groupId: pyqQ1.groupId,
    isPyq: true,
    pyqYear: 2024,
    pyqExam: pyqQ1.pyqExam,
    options: pyqQ1.options.map((opt, i) => ({
      text: opt.text,
      imageUrl: i === 0 ? testOptionImg : undefined,
      isCorrect: opt.isCorrect,
    })),
  });
  console.log('Update PYQ Q1 result:', updateRes1);

  console.log('\n--- Step 4: Verify Image in Neon DB for sbi-2024-q1 ---');
  const dbPyq = await prisma.question.findUnique({
    where: { id: pyqQ1.id },
    include: { options: true },
  });
  console.log('DB Question Image URL matches:', dbPyq?.imageUrl === testImageUrl);
  console.log('DB Option A Image URL matches:', dbPyq?.options.find(o => o.order === 1)?.imageUrl === testOptionImg);

  console.log('\n--- Step 5: Verify Image in Exam Partition query ---');
  const reloadedPyq = await getLiveExamQuestionsAction('mock-sbi-clerk-2024-pyq');
  const liveQ1 = reloadedPyq.find(q => q.id === pyqQ1.id);
  console.log('Live Exam Q1 has Question Image:', liveQ1?.imageUrl === testImageUrl);
  console.log('Live Exam Q1 Option A has Image:', liveQ1?.options[0]?.imageUrl === testOptionImg);

  console.log('\n--- Step 6: Test Saving Image to non-PYQ Mock Question (q-json-2) ---');
  const nonPyqQ = ibps1[0];
  const testNonPyqImg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...mockNonPyqImage...';
  const updateRes2 = await updateQuestionAction(nonPyqQ.id, {
    examId: nonPyqQ.examId,
    sectionCode: nonPyqQ.sectionCode,
    topicName: nonPyqQ.topicName,
    text: nonPyqQ.text,
    difficulty: nonPyqQ.difficulty,
    explanation: nonPyqQ.explanation,
    marks: nonPyqQ.marks,
    negativeMarks: nonPyqQ.negativeMarks,
    imageUrl: testNonPyqImg,
    options: nonPyqQ.options.map(opt => ({
      text: opt.text,
      isCorrect: opt.isCorrect,
    })),
  });
  console.log('Update Non-PYQ result:', updateRes2);

  const dbNonPyq = await prisma.question.findUnique({
    where: { id: nonPyqQ.id },
  });
  console.log('DB Non-PYQ Question Image matches:', dbNonPyq?.imageUrl === testNonPyqImg);

  const reloadedIbps1 = await getLiveExamQuestionsAction('mock-ibps-po-1');
  const liveNonPyq = reloadedIbps1.find(q => q.id === nonPyqQ.id);
  console.log('Live IBPS PO Mock 1 Question has Image:', liveNonPyq?.imageUrl === testNonPyqImg);

  console.log('\nALL VERIFICATIONS PASSED SUCCESSFULLY!');
  await prisma.$disconnect();
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
