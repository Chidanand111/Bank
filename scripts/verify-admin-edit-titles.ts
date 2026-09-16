import 'dotenv/config';
process.env.ADMIN_OVERRIDE = 'true';

import { prisma } from '../lib/prisma';
import { updateExamTitleAction, updateMockTestTitleAction, getAdminExams } from '../lib/services/adminService';

async function testEditTitles() {
  console.log('=== Verifying Admin Title Editing for Exams & Test Papers ===');

  console.log('1. Testing updateExamTitleAction for exam-ibps-po...');
  const originalExams = await getAdminExams();
  const ibpsExam = originalExams.find(e => e.id === 'exam-ibps-po' || e.slug === 'ibps-po');
  const originalTitle = ibpsExam?.title || 'IBPS PO';

  const testTitle = 'IBPS PO (Probationary Officer) - Verified Title ' + Date.now();
  const updateExamRes = await updateExamTitleAction('exam-ibps-po', testTitle, 'Updated description for verification.');
  if (!updateExamRes.success) {
    throw new Error('Failed to update exam title: ' + updateExamRes.error);
  }

  const updatedDbExam = await prisma.exam.findFirst({
    where: { OR: [{ id: 'exam-ibps-po' }, { slug: 'ibps-po' }] },
  });
  console.log(`✓ Neon DB Exam Title updated to: "${updatedDbExam?.title}"`);
  if (updatedDbExam?.title !== testTitle) {
    throw new Error('Neon DB Exam Title does not match updated title');
  }

  console.log('2. Testing updateMockTestTitleAction for mock test / PYQ paper...');
  const testPaper = await prisma.mockTest.findFirst();
  if (testPaper) {
    const originalPaperTitle = testPaper.title;
    const testNewPaperTitle = 'Verified Paper Title ' + Date.now();
    const updatePaperRes = await updateMockTestTitleAction(testPaper.id, testNewPaperTitle, 'Updated notes.');
    if (!updatePaperRes.success) {
      throw new Error('Failed to update mock test title: ' + updatePaperRes.error);
    }

    const updatedDbPaper = await prisma.mockTest.findUnique({ where: { id: testPaper.id } });
    console.log(`✓ Neon DB MockTest Title updated to: "${updatedDbPaper?.title}"`);
    if (updatedDbPaper?.title !== testNewPaperTitle) {
      throw new Error('Neon DB MockTest Title mismatch');
    }

    // Restore original paper title
    await updateMockTestTitleAction(testPaper.id, originalPaperTitle);
    console.log('✓ Restored test paper title back to original.');
  }

  // Restore original exam title
  await updateExamTitleAction('exam-ibps-po', originalTitle);
  console.log(`✓ Restored exam-ibps-po title back to "${originalTitle}".`);

  console.log('\nALL TITLE EDITING CHECKS PASSED PERFECTLY!');
  await prisma.$disconnect();
}

testEditTitles().catch(async (err) => {
  console.error('FAILED:', err);
  await prisma.$disconnect();
  process.exit(1);
});
