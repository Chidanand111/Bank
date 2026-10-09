import { getExams, getMockTests, getMockTestById } from '../lib/services/testService';
import { getLiveExamQuestionsAction, loadFreshQuestionsFromDb } from '../lib/services/adminService';
import { getFixedQuestionsForMockTest } from '../lib/db/questionDb';

async function main() {
  console.log('--- 1. Testing getExams() ---');
  const exams = await getExams();
  console.log('Total published exams:', exams.length);
  const pyq2025Exam = exams.find(e => e.id === 'exam-ibps-po-2025-pyq' || e.slug === 'ibps-po-2025-pyq');
  if (!pyq2025Exam) {
    throw new Error('exam-ibps-po-2025-pyq NOT found in getExams()!');
  }
  console.log('Found Exam:', pyq2025Exam.title, '| Status:', pyq2025Exam.status);

  console.log('\n--- 2. Testing getMockTests() ---');
  const allTests = await getMockTests();
  console.log('Total mock tests:', allTests.length);
  const test2025 = allTests.find(t => t.id === 'mock-ibps-po-2025-pyq');
  if (!test2025) {
    throw new Error('mock-ibps-po-2025-pyq NOT found in getMockTests()!');
  }
  console.log('Found Test:', test2025.title, '| ExamSlug:', test2025.examSlug);

  const ibpsPoFilterTests = await getMockTests('ibps-po');
  console.log('Tests under ibps-po filter:', ibpsPoFilterTests.length);
  if (!ibpsPoFilterTests.some(t => t.id === 'mock-ibps-po-2025-pyq')) {
    throw new Error('mock-ibps-po-2025-pyq should be included in ibps-po filter!');
  }

  const pyqFilterTests = await getMockTests('ibps-po-2025-pyq');
  console.log('Tests under ibps-po-2025-pyq filter:', pyqFilterTests.length);
  if (!pyqFilterTests.some(t => t.id === 'mock-ibps-po-2025-pyq')) {
    throw new Error('mock-ibps-po-2025-pyq should be found for its own slug!');
  }

  console.log('\n--- 3. Testing getLiveExamQuestionsAction ---');
  const liveQs = await getLiveExamQuestionsAction('mock-ibps-po-2025-pyq');
  console.log('Live questions count:', liveQs.length);
  if (liveQs.length !== 100) {
    throw new Error(`Expected 100 questions, got ${liveQs.length}!`);
  }

  const reasoningCount = liveQs.filter(q => q.sectionCode === 'REASONING').length;
  const quantCount = liveQs.filter(q => q.sectionCode === 'QUANT').length;
  const englishCount = liveQs.filter(q => q.sectionCode === 'ENGLISH').length;
  console.log(`Reasoning: ${reasoningCount}, Quant: ${quantCount}, English: ${englishCount}`);
  if (reasoningCount !== 35 || quantCount !== 35 || englishCount !== 30) {
    throw new Error(`Section distribution mismatch: R:${reasoningCount}, Q:${quantCount}, E:${englishCount}`);
  }

  console.log('\n--- 4. Testing getMockTestById ---');
  const loadedTest = await getMockTestById('mock-ibps-po-2025-pyq');
  if (!loadedTest || !loadedTest.questions || loadedTest.questions.length !== 100) {
    throw new Error(`getMockTestById failed! Questions count: ${loadedTest?.questions?.length}`);
  }
  console.log('Loaded test title:', loadedTest.title);
  console.log('Total questions in loaded test:', loadedTest.questions.length);
  console.log('Section counts:', loadedTest.sections.map(s => `${s.name}: ${s.questionCount}`));

  console.log('\n✅ ALL VERIFICATIONS PASSED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
