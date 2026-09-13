import { MOCK_TESTS_DATA } from '../lib/data/mockTests';
import { generateRandomizedMockTest } from '../lib/db/questionDb';

const pyqTemplate = MOCK_TESTS_DATA.find(t => t.id === 'mock-sbi-clerk-2024-pyq');
if (!pyqTemplate) {
  console.error('PYQ template not found!');
  process.exit(1);
}

const generatedPyq = generateRandomizedMockTest(pyqTemplate);
console.log('--- PYQ TEST VERIFICATION ---');
console.log('Title:', generatedPyq.title);
console.log('Total Questions:', generatedPyq.questions.length);
console.log('Sections:', generatedPyq.sections.map(s => ({ code: s.code, count: s.questionCount })));
console.log('First 3 Question IDs:', generatedPyq.questions.slice(0, 3).map(q => ({ id: q.id, topic: q.topicName, hasPassage: !!q.passage })));
console.log('Last 3 Question IDs:', generatedPyq.questions.slice(-3).map(q => ({ id: q.id, topic: q.topicName, hasPassage: !!q.passage })));

// Check sections question counts
const engCount = generatedPyq.questions.filter(q => q.sectionCode === 'ENGLISH').length;
const quantCount = generatedPyq.questions.filter(q => q.sectionCode === 'QUANT').length;
const reasonCount = generatedPyq.questions.filter(q => q.sectionCode === 'REASONING').length;
console.log('Actual Question Counts by Section:', { ENGLISH: engCount, QUANT: quantCount, REASONING: reasonCount });

// Check that all 100 questions are PYQ
const nonPyqCount = generatedPyq.questions.filter(q => !q.isPyq).length;
console.log('Non-PYQ questions in PYQ test (Must be 0):', nonPyqCount);

console.log('--- REGULAR TEST VERIFICATION ---');
const poTemplate = MOCK_TESTS_DATA.find(t => t.id === 'mock-ibps-po-1');
const generatedPo = generateRandomizedMockTest(poTemplate!);
console.log('PO Test Total Questions:', generatedPo.questions.length);
console.log('PO Test Sections:', generatedPo.sections.map(s => ({ code: s.code, count: s.questionCount })));
