import { MOCK_TESTS_DATA } from '../lib/data/mockTests';
import { generateRandomizedMockTest } from '../lib/db/questionDb';

console.log('Testing Mock Test Question Generator with 100-question rule...');

// Test 1: IBPS PO Prelims 1
const ibpsTest = MOCK_TESTS_DATA.find(m => m.id === 'mock-ibps-po-1')!;
const generatedIbps = generateRandomizedMockTest(ibpsTest);

console.log('\n--- IBPS PO Prelims 1 ---');
console.log('Total Questions:', generatedIbps.questions.length);
console.log('Total Marks:', generatedIbps.totalMarks);
console.log('Duration:', generatedIbps.durationMinutes, 'minutes');

const ibpsSections: Record<string, number> = {};
generatedIbps.questions.forEach(q => {
  ibpsSections[q.sectionCode] = (ibpsSections[q.sectionCode] || 0) + 1;
});
console.log('Section counts:', ibpsSections);

// Test 2: SBI Clerk Prelims 1 (originally had only 3 SBI questions, needs fallback to other sets)
const sbiTest = MOCK_TESTS_DATA.find(m => m.id === 'mock-sbi-clerk-1')!;
const generatedSbi = generateRandomizedMockTest(sbiTest);

console.log('\n--- SBI Clerk Prelims 1 ---');
console.log('Total Questions:', generatedSbi.questions.length);
console.log('Total Marks:', generatedSbi.totalMarks);
console.log('Duration:', generatedSbi.durationMinutes, 'minutes');

const sbiSections: Record<string, number> = {};
generatedSbi.questions.forEach(q => {
  sbiSections[q.sectionCode] = (sbiSections[q.sectionCode] || 0) + 1;
});
console.log('Section counts:', sbiSections);

// Test 3: User with 50 seen questions
const userSeenIds = generatedIbps.questions.slice(0, 50).map(q => q.id);
const generatedWithHistory = generateRandomizedMockTest(sbiTest, {
  excludeQuestionIds: userSeenIds,
});

console.log('\n--- SBI Clerk with 50 Seen Questions ---');
console.log('Total Questions:', generatedWithHistory.questions.length);
const histSections: Record<string, number> = {};
generatedWithHistory.questions.forEach(q => {
  histSections[q.sectionCode] = (histSections[q.sectionCode] || 0) + 1;
});
console.log('Section counts:', histSections);

console.log('\nALL CHECKS PASSED IF TOTAL = 100 (35 Reasoning, 35 Quant, 30 English)');
