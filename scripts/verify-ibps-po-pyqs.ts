import { getFixedQuestionsForMockTest, partitionQuestionsList, getAllQuestions } from '../lib/db/questionDb';
import { getMockTestById } from '../lib/services/testService';
import { MOCK_TESTS_DATA } from '../lib/data/mockTests';

async function verify() {
  console.log('--- VERIFYING IBPS PO PYQ PAPERS & PARTITIONS ---');

  // 1. IBPS PO Mains 2025
  const q2025Mains = getFixedQuestionsForMockTest('mock-ibps-po-2025-mains-pyq');
  console.log(`[1] IBPS PO Mains 2025 Count: ${q2025Mains.length} (Expected: 155)`);
  if (q2025Mains.length !== 155) {
    throw new Error(`Expected 155 questions for 2025 Mains, got ${q2025Mains.length}`);
  }

  const m2025Reason = q2025Mains.filter(q => q.sectionCode === 'REASONING').length;
  const m2025Eng = q2025Mains.filter(q => q.sectionCode === 'ENGLISH').length;
  const m2025Quant = q2025Mains.filter(q => q.sectionCode === 'QUANT').length;
  const m2025GA = q2025Mains.filter(q => q.sectionCode === 'FINANCIAL_AWARENESS').length;
  console.log(`    Sections -> Reasoning: ${m2025Reason} (exp 45), English: ${m2025Eng} (exp 35), Quant/DI: ${m2025Quant} (exp 35), GA: ${m2025GA} (exp 40)`);

  if (m2025Reason !== 45 || m2025Eng !== 35 || m2025Quant !== 35 || m2025GA !== 40) {
    throw new Error('IBPS PO Mains 2025 sectional distribution mismatch!');
  }

  // 2. IBPS PO Prelims 2024
  const q2024 = getFixedQuestionsForMockTest('mock-ibps-po-2024-pyq');
  console.log(`[2] IBPS PO Prelims 2024 Count: ${q2024.length} (Expected: 100)`);
  if (q2024.length !== 100) {
    throw new Error(`Expected 100 questions for 2024 Prelims, got ${q2024.length}`);
  }

  const p2024Reason = q2024.filter(q => q.sectionCode === 'REASONING').length;
  const p2024Eng = q2024.filter(q => q.sectionCode === 'ENGLISH').length;
  const p2024Quant = q2024.filter(q => q.sectionCode === 'QUANT').length;
  console.log(`    Sections -> Reasoning: ${p2024Reason} (exp 35), English: ${p2024Eng} (exp 30), Quant: ${p2024Quant} (exp 35)`);

  if (p2024Reason !== 35 || p2024Eng !== 30 || p2024Quant !== 35) {
    throw new Error('IBPS PO Prelims 2024 sectional distribution mismatch!');
  }

  // 3. IBPS PO Prelims 2023
  const q2023 = getFixedQuestionsForMockTest('mock-ibps-po-2023-pyq');
  console.log(`[3] IBPS PO Prelims 2023 Count: ${q2023.length} (Expected: 100)`);
  if (q2023.length !== 100) {
    throw new Error(`Expected 100 questions for 2023 Prelims, got ${q2023.length}`);
  }

  const p2023Reason = q2023.filter(q => q.sectionCode === 'REASONING').length;
  const p2023Eng = q2023.filter(q => q.sectionCode === 'ENGLISH').length;
  const p2023Quant = q2023.filter(q => q.sectionCode === 'QUANT').length;
  console.log(`    Sections -> Reasoning: ${p2023Reason} (exp 35), English: ${p2023Eng} (exp 30), Quant: ${p2023Quant} (exp 35)`);

  if (p2023Reason !== 35 || p2023Eng !== 30 || p2023Quant !== 35) {
    throw new Error('IBPS PO Prelims 2023 sectional distribution mismatch!');
  }

  // 4. Partition Isolation
  const allQs = getAllQuestions();
  const sbiClerk2024 = partitionQuestionsList(allQs, 'mock-sbi-clerk-2024-pyq');
  const sbiClerk2023 = partitionQuestionsList(allQs, 'mock-sbi-clerk-2023-pyq');
  const ibpsPoMock1 = partitionQuestionsList(allQs, 'mock-ibps-po-1');

  console.log(`[4] Partition Isolation Checks:`);
  console.log(`    SBI Clerk 2024 count: ${sbiClerk2024.length} (Expected: 100)`);
  console.log(`    SBI Clerk 2023 count: ${sbiClerk2023.length} (Expected: 100)`);
  console.log(`    IBPS PO Mock 1 count: ${ibpsPoMock1.length} (Expected: 100)`);

  // Assert no IBPS questions leaked into SBI Clerk 2024
  const ibpsInSbi = sbiClerk2024.filter(q => String(q.id).includes('ibps'));
  if (ibpsInSbi.length > 0) {
    throw new Error(`Isolation breach: found ${ibpsInSbi.length} IBPS questions in SBI Clerk partition!`);
  }

  // Assert no PYQ questions leaked into standard practice Mock 1
  const pyqInMock1 = ibpsPoMock1.filter(q => q.isPyq || String(q.id).includes('2024') || String(q.id).includes('2023') || String(q.id).includes('2025'));
  if (pyqInMock1.length > 0) {
    throw new Error(`Isolation breach: found ${pyqInMock1.length} PYQ questions in standard IBPS PO Mock 1!`);
  }

  // 5. Test Service Loader
  const test2025 = await getMockTestById('mock-ibps-po-2025-mains-pyq');
  const test2024 = await getMockTestById('mock-ibps-po-2024-pyq');
  const test2023 = await getMockTestById('mock-ibps-po-2023-pyq');

  console.log(`[5] Test Service Simulation:`);
  console.log(`    2025 Mains test loaded: ${test2025?.title} (${test2025?.questions.length} Qs, ${test2025?.durationMinutes} mins)`);
  console.log(`    2024 Prelims test loaded: ${test2024?.title} (${test2024?.questions.length} Qs, ${test2024?.durationMinutes} mins)`);
  console.log(`    2023 Prelims test loaded: ${test2023?.title} (${test2023?.questions.length} Qs, ${test2023?.durationMinutes} mins)`);

  if (test2025?.questions.length !== 155 || test2024?.questions.length !== 100 || test2023?.questions.length !== 100) {
    throw new Error('Test service failed to load all questions for the tests!');
  }

  console.log('\n>>> ALL VERIFICATION CHECKS PASSED PERFECTLY! <<<');
}

verify().catch(e => {
  console.error('Verification failed:', e);
  process.exit(1);
});
