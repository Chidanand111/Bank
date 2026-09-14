import { MockTest } from '@/types';

/**
 * Mock Test Templates
 * Note: Questions are stored in the database (@/data/questions.json)
 * and are picked dynamically and randomly from the database at the start
 * of each exam while guaranteeing non-repeating questions for that user.
 */
export const MOCK_TESTS_DATA: MockTest[] = [
  // --- IBPS PO MOCK 1 ---
  {
    id: 'mock-ibps-po-1',
    slug: 'ibps-po-prelims-mock-1',
    title: 'IBPS PO Prelims Full Mock Test 1',
    description: '100-Question dynamic full-length practice test for IBPS PO Prelims: 35 Reasoning Ability, 35 Quantitative Aptitude, and 30 English Language with zero question repetition.',
    examId: 'exam-ibps-po',
    examSlug: 'ibps-po',
    examTitle: 'IBPS PO (Probationary Officer)',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 54.5,
    isFree: true,
    isFixed: true,
    sections: [
      { id: 'sec-ibps-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
      { id: 'sec-ibps-p-quant', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-ibps-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
    ],
    questions: [],
  },

  // --- IBPS PO MOCK 2 ---
  {
    id: 'mock-ibps-po-2',
    slug: 'ibps-po-prelims-mock-2',
    title: 'IBPS PO Prelims Speed Drill Mock 2',
    description: '100-Question targeted practice test designed to evaluate speed and accuracy under strict timed conditions (35 Reasoning, 35 Quant, 30 English).',
    examId: 'exam-ibps-po',
    examSlug: 'ibps-po',
    examTitle: 'IBPS PO (Probationary Officer)',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 56.0,
    isFree: true,
    isFixed: true,
    sections: [
      { id: 'sec-ibps-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
      { id: 'sec-ibps-p-quant', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-ibps-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
    ],
    questions: [],
  },

  // --- SBI CLERK MOCK 1 ---
  {
    id: 'mock-sbi-clerk-1',
    slug: 'sbi-clerk-prelims-mock-1',
    title: 'SBI Clerk Prelims Full Mock Test 1',
    description: '100-Question full-length preliminary exam simulation featuring 35 Reasoning, 35 Numerical Ability, and 30 English Language questions.',
    examId: 'exam-sbi-clerk',
    examSlug: 'sbi-clerk',
    examTitle: 'SBI Clerk (Junior Associate)',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 68.5,
    isFree: true,
    isFixed: true,
    sections: [
      { id: 'sec-sbi-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
      { id: 'sec-sbi-p-num', code: 'QUANT', name: 'Numerical Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-sbi-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
    ],
    questions: [],
  },

  // --- SBI CLERK MOCK 2 ---
  {
    id: 'mock-sbi-clerk-2',
    slug: 'sbi-clerk-prelims-mock-2',
    title: 'SBI Clerk Prelims Speed Booster Mock 2',
    description: '100-Question speed drill for SBI Clerk: 35 Reasoning, 35 Numerical Ability, and 30 English Language questions with instant solution breakdown.',
    examId: 'exam-sbi-clerk',
    examSlug: 'sbi-clerk',
    examTitle: 'SBI Clerk (Junior Associate)',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 71.0,
    isFree: true,
    isFixed: true,
    sections: [
      { id: 'sec-sbi-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
      { id: 'sec-sbi-p-num', code: 'QUANT', name: 'Numerical Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-sbi-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
    ],
    questions: [],
  },

  // --- SBI CLERK 2024 PRELIMS PYQ (PREVIOUS YEAR PAPER) ---
  {
    id: 'mock-sbi-clerk-2024-pyq',
    slug: 'sbi-clerk-prelims-2024-pyq',
    title: 'SBI Clerk Prelims 2024 - Previous Year Question Paper',
    description: 'Authentic 100-question actual exam paper from SBI Clerk Prelims 2024 (35 Reasoning, 35 Numerical Ability, 30 English). Dedicated paper with exact official questions, interlinked puzzles, and reading passages.',
    examId: 'exam-sbi-clerk',
    examSlug: 'sbi-clerk',
    examTitle: 'SBI Clerk (Junior Associate)',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 74.5,
    isFree: true,
    isFixed: true,
    isPyq: true,
    year: 2024,
    sections: [
      { id: 'sec-sbi-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
      { id: 'sec-sbi-p-num', code: 'QUANT', name: 'Numerical Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-sbi-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
    ],
    questions: [],
  },

  // --- SBI CLERK 2023-24 PRELIMS PYQ (PREVIOUS YEAR PAPER) ---
  {
    id: 'mock-sbi-clerk-2023-pyq',
    slug: 'sbi-clerk-prelims-2023-pyq',
    title: 'SBI Clerk Prelims 2023-24 - Previous Year Question Paper',
    description: 'Authentic 100-question actual exam paper from SBI Clerk Prelims 2023-24 (Held on 05th Jan 2024). Features exact official questions, sectional timings, interlinked RC passages and reasoning puzzles.',
    examId: 'exam-sbi-clerk',
    examSlug: 'sbi-clerk',
    examTitle: 'SBI Clerk (Junior Associate)',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 74.5,
    isFree: true,
    isFixed: true,
    isPyq: true,
    year: 2023,
    sections: [
      { id: 'sec-sbi-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
      { id: 'sec-sbi-p-num', code: 'QUANT', name: 'Numerical Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-sbi-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
    ],
    questions: [],
  },
];
