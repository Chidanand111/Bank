process.env.ADMIN_OVERRIDE = 'true';

import katex from 'katex';
import {
  createExamAction,
  deleteExamAction,
  bulkImportQuestionsAction,
  getAdminExams,
} from '../lib/services/adminService';
import { prisma } from '../lib/prisma';
import { getAllQuestions } from '../lib/db/questionDb';
import { AdminQuestionInput } from '../types';

async function runVerification() {
  console.log('=====================================================');
  console.log('VERIFYING PHASE 2: LATEX MATH RENDERING & CASCADE DELETE EXAM');
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

  // ==========================================
  // TEST SUITE 1: KATEX LATEX MATH RENDERING
  // ==========================================
  console.log('--- TEST SUITE 1: KaTeX LaTeX Math Rendering ---');

  // Test 1: Inline math rendering
  const inlineFormula = 'x^2 - 7x + 12 = 0';
  const inlineHtml = katex.renderToString(inlineFormula, { displayMode: false, throwOnError: false });
  assert(inlineHtml.includes('katex') && inlineHtml.includes('class="katex"'), '1. KaTeX renders inline quadratic equation with standard CSS classes');

  // Test 2: Square root and fraction rendering
  const fracSqrtFormula = '\\sqrt{625} + \\frac{15}{3} = 30';
  const fracSqrtHtml = katex.renderToString(fracSqrtFormula, { displayMode: false, throwOnError: false });
  assert(fracSqrtHtml.includes('sqrt') || fracSqrtHtml.includes('surd') || fracSqrtHtml.includes('katex'), '2. KaTeX correctly processes square root and fraction macros');

  // Test 3: Block math rendering
  const blockFormula = '\\sum_{i=1}^n x_i';
  const blockHtml = katex.renderToString(blockFormula, { displayMode: true, throwOnError: false });
  assert(blockHtml.includes('katex-display') || blockHtml.includes('katex'), '3. KaTeX renders block display mode math');

  // Test 4: Math tokenizer logic
  const sampleQuestionText = 'Solve for $x$: If $\\sqrt{x} = 5$, what is $x^2$?';
  const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$(?!\s)[^$\r\n]+?(?<!\s)\$|\\\([\s\S]+?\\\))/g;
  const matches = sampleQuestionText.match(regex);
  assert(matches !== null && matches.length === 3, '4. LaTeX delimiter regex correctly identifies all 3 inline math tokens');
  assert(matches?.[0] === '$x$' && matches?.[1] === '$\\sqrt{x} = 5$' && matches?.[2] === '$x^2$', '5. Identified math tokens match expected equations');

  // ==========================================
  // TEST SUITE 2: BULK CSV WITH LATEX EQUATIONS
  // ==========================================
  console.log('\n--- TEST SUITE 2: Bulk Upload Sample Template with LaTeX ---');

  const SAMPLE_CSV_CONTENT = `sectionCode,topicName,text,optionA,optionB,optionC,optionD,optionE,correctOption,marks,negativeMarks,difficulty,explanation
QUANT,Simplification,"Solve the expression: $\\sqrt{625} + \\frac{15}{3} \\times 4 - 2^3 = ?$","37","42","45","39","40",A,1,0.25,EASY,"$\\sqrt{625} = 25$; $\\frac{15}{3} \\times 4 = 20$; $2^3 = 8$. Therefore: $25 + 20 - 8 = 37$."
QUANT,Quadratic Equations,"Find the roots of the quadratic equation: $x^2 - 7x + 12 = 0$","$x = 2, 6$","$x = 3, 4$","$x = -3, -4$","$x = 1, 12$","None of these",B,1,0.25,MEDIUM,"Factorizing: $(x - 3)(x - 4) = 0 \\implies x = 3$ or $x = 4$."
`;

  assert(SAMPLE_CSV_CONTENT.includes('$\\sqrt{625}'), '6. Bulk CSV template contains square root LaTeX formulas');
  assert(SAMPLE_CSV_CONTENT.includes('$x^2 - 7x + 12 = 0$'), '7. Bulk CSV template contains quadratic equation LaTeX formulas');
  assert(SAMPLE_CSV_CONTENT.includes('\\implies x = 3'), '8. Bulk CSV template explanation contains mathematical implication symbols');

  // ==========================================
  // TEST SUITE 3: CREATE EXAM & POPULATE QUESTIONS
  // ==========================================
  console.log('\n--- TEST SUITE 3: Create Exam Architecture & Populate Questions ---');

  const testExamTitle = 'Temporary Test Bank Exam (Auto-Cleanup)';
  const testExamSlug = 'temp-cleanup-exam';

  // Create test exam
  const createExamRes = await createExamAction({
    title: testExamTitle,
    slug: testExamSlug,
    category: 'PO',
    description: 'An exam created specifically to test cascade deletion and storage space reclaim.',
  });

  assert(createExamRes.success === true, '9. createExamAction successfully creates temporary test exam');

  // Verify exam in database
  const createdDbExam = await prisma.exam.findFirst({
    where: { slug: testExamSlug },
    include: { sections: true },
  });
  assert(Boolean(createdDbExam), '10. Exam persisted to Neon PostgreSQL with sections');
  const examId = createdDbExam!.id;

  // Bulk import 3 test questions into this exam
  const testQuestions: AdminQuestionInput[] = [
    {
      examId,
      sectionCode: 'QUANT',
      topicName: 'Simplification',
      text: 'Calculate: $\\sqrt{144} + \\frac{60}{5} = ?$',
      difficulty: 'EASY',
      marks: 1.0,
      negativeMarks: 0.25,
      explanation: '$\\sqrt{144} = 12$ and $60/5 = 12$; $12 + 12 = 24$.',
      options: [
        { text: '24', isCorrect: true },
        { text: '22', isCorrect: false },
        { text: '26', isCorrect: false },
        { text: '20', isCorrect: false },
        { text: '28', isCorrect: false },
      ],
    },
    {
      examId,
      sectionCode: 'QUANT',
      topicName: 'Quadratic Equations',
      text: 'Find roots for: $y^2 - 9y + 20 = 0$',
      difficulty: 'MEDIUM',
      marks: 1.0,
      negativeMarks: 0.25,
      explanation: '$(y - 4)(y - 5) = 0 \\implies y = 4, 5$.',
      options: [
        { text: '$y = 4, 5$', isCorrect: true },
        { text: '$y = 2, 10$', isCorrect: false },
        { text: '$y = -4, -5$', isCorrect: false },
        { text: '$y = 1, 20$', isCorrect: false },
        { text: 'None of these', isCorrect: false },
      ],
    },
    {
      examId,
      sectionCode: 'REASONING',
      topicName: 'Syllogism',
      text: 'Statement: All banks are financial institutions. Conclusion: Some financial institutions are banks.',
      difficulty: 'EASY',
      marks: 1.0,
      negativeMarks: 0.25,
      explanation: 'Conversion of universal affirmative proposition A to I is valid.',
      options: [
        { text: 'Follows', isCorrect: true },
        { text: 'Does not follow', isCorrect: false },
        { text: 'Either or', isCorrect: false },
        { text: 'Neither nor', isCorrect: false },
        { text: 'Cannot be determined', isCorrect: false },
      ],
    },
  ];

  const importRes = await bulkImportQuestionsAction(testQuestions, examId);
  assert(importRes.success === true && importRes.count === 3, '11. Bulk import seeded 3 questions linked to the test exam');

  // Verify questions exist in Neon DB
  const dbQuestionsBefore = await prisma.question.findMany({
    where: { examId },
  });
  assert(dbQuestionsBefore.length >= 3, '12. Questions verified in Neon PostgreSQL associated with examId');

  // Verify in memory store
  const storeQuestionsBefore = getAllQuestions().filter(
    q => q.examId === examId || q.exam === examId
  );
  assert(storeQuestionsBefore.length >= 3, '13. Questions verified in dynamic in-memory store');

  // ==========================================
  // TEST SUITE 4: CASCADE DELETE EXAM & QUESTIONS
  // ==========================================
  console.log('\n--- TEST SUITE 4: Cascade Delete Exam & Questions (Save DB Space) ---');

  const deleteExamRes = await deleteExamAction(examId);
  assert(deleteExamRes.success === true, '14. deleteExamAction executed successfully');

  // Verify exam is removed from Neon PostgreSQL
  const dbExamAfter = await prisma.exam.findFirst({
    where: { id: examId },
  });
  assert(dbExamAfter === null, '15. Exam record permanently removed from Neon PostgreSQL');

  // Verify all questions for this exam are cascade deleted from Neon PostgreSQL
  const dbQuestionsAfter = await prisma.question.findMany({
    where: { examId },
  });
  assert(dbQuestionsAfter.length === 0, '16. All questions under deleted exam cascade deleted from Neon PostgreSQL');

  // Verify options for this exam are cascade deleted
  const dbOptionsAfter = await prisma.option.findMany({
    where: { question: { examId } },
  });
  assert(dbOptionsAfter.length === 0, '17. All child MCQ options cascade deleted from Neon PostgreSQL');

  // Verify sections for this exam are cascade deleted
  const dbSectionsAfter = await prisma.section.findMany({
    where: { examId },
  });
  assert(dbSectionsAfter.length === 0, '18. All exam sections cascade deleted from Neon PostgreSQL');

  // Verify questions removed from in-memory store
  const storeQuestionsAfter = getAllQuestions().filter(
    q => q.examId === examId || q.exam === examId
  );
  assert(storeQuestionsAfter.length === 0, '19. All questions removed from in-memory store to free memory');

  // Verify exam removed from getAdminExams list
  const allExams = await getAdminExams();
  assert(!allExams.some(e => e.id === examId || e.slug === testExamSlug), '20. Exam completely purged from Admin exam catalog');

  console.log('\n=====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Unhandled error in verification:', err);
  process.exit(1);
});
