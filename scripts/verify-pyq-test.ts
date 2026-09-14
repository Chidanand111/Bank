import { MOCK_TESTS_DATA } from '../lib/data/mockTests';
import { generateRandomizedMockTest } from '../lib/db/questionDb';

// 1. Verify 2024 PYQ
const pyq2024 = MOCK_TESTS_DATA.find(t => t.id === 'mock-sbi-clerk-2024-pyq');
const gen2024 = generateRandomizedMockTest(pyq2024!);
console.log('--- 2024 PYQ TEST VERIFICATION ---');
console.log('Title:', gen2024.title);
console.log('Total Questions:', gen2024.questions.length);
console.log('Non-PYQ questions (Must be 0):', gen2024.questions.filter(q => !q.isPyq).length);

// 2. Verify 2023 PYQ
const pyq2023 = MOCK_TESTS_DATA.find(t => t.id === 'mock-sbi-clerk-2023-pyq');
const gen2023 = generateRandomizedMockTest(pyq2023!);
console.log('--- 2023 PYQ TEST VERIFICATION ---');
console.log('Title:', gen2023.title);
console.log('Total Questions:', gen2023.questions.length);
console.log('Non-PYQ questions (Must be 0):', gen2023.questions.filter(q => !q.isPyq).length);
console.log('Sections:', gen2023.sections.map(s => ({ code: s.code, count: s.questionCount })));
console.log('First Question ID:', gen2023.questions[0]?.id);
console.log('Last Question ID:', gen2023.questions[gen2023.questions.length - 1]?.id);
