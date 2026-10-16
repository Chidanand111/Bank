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

  // --- IBPS PO 2025 MAINS PYQ (PREVIOUS YEAR PAPER) ---
  {
    id: 'mock-ibps-po-2025-mains-pyq',
    slug: 'ibps-po-mains-2025-pyq',
    title: 'IBPS PO Mains 2025 - Previous Year Question Paper',
    description: 'Authentic 155-question actual exam paper from IBPS PO Mains 2025 (Held on Oct 12, 2025). Features Reasoning & Computer Aptitude (45 Qs), English Language (35 Qs), Data Analysis & Interpretation (35 Qs), and General / Financial Awareness (40 Qs).',
    examId: 'exam-ibps-po',
    examSlug: 'ibps-po',
    examTitle: 'IBPS PO (Probationary Officer)',
    durationMinutes: 180,
    totalMarks: 200,
    totalQuestions: 155,
    cutoffMarks: 78.5,
    isFree: true,
    isFixed: true,
    isPyq: true,
    year: 2025,
    sections: [
      { id: 'sec-ibps-m-reason', code: 'REASONING', name: 'Reasoning & Computer Aptitude', durationMinutes: 60, questionCount: 45, marks: 60 },
      { id: 'sec-ibps-m-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 40, questionCount: 35, marks: 40 },
      { id: 'sec-ibps-m-quant', code: 'QUANT', name: 'Data Analysis & Interpretation', durationMinutes: 45, questionCount: 35, marks: 60 },
      { id: 'sec-ibps-m-ga', code: 'FINANCIAL_AWARENESS', name: 'General / Banking Awareness', durationMinutes: 35, questionCount: 40, marks: 40 },
    ],
    questions: [],
  },

  // --- IBPS PO 2025 PRELIMS PYQ (PREVIOUS YEAR PAPER) ---
  {
    id: 'mock-ibps-po-2025-pyq',
    slug: 'ibps-po-prelims-2025-pyq',
    title: 'IBPS PO Prelims 2025 - Previous Year Question Paper',
    description: 'Authentic 100-question actual exam paper from IBPS PO Prelims 2025. Features Reasoning Ability (35 Qs), Quantitative Aptitude (35 Qs), and English Language (30 Qs) with 20-minute sectional timings.',
    examId: 'exam-ibps-po-2025-pyq',
    examSlug: 'ibps-po-2025-pyq',
    examTitle: 'IBPS PO 2025 Previous Year Papers',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 55.0,
    isFree: true,
    isFixed: true,
    isPyq: true,
    year: 2025,
    status: 'published',
    sections: [
      { id: 'sec-ibps-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-ibps-p-quant', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-ibps-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
    ],
    questions: [],
  },

  // --- IBPS PO 2024 PRELIMS PYQ (PREVIOUS YEAR PAPER) ---
  {
    id: 'mock-ibps-po-2024-pyq',
    slug: 'ibps-po-prelims-2024-pyq',
    title: 'IBPS PO Prelims 2024 - Previous Year Question Paper',
    description: 'Authentic 100-question actual exam paper from IBPS PO Prelims 2024 (Held on Oct 19, 2024). Features Reasoning Ability (35 Qs), English Language (30 Qs), and Quantitative Aptitude (35 Qs).',
    examId: 'exam-ibps-po',
    examSlug: 'ibps-po',
    examTitle: 'IBPS PO (Probationary Officer)',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 53.5,
    isFree: true,
    isFixed: true,
    isPyq: true,
    year: 2024,
    sections: [
      { id: 'sec-ibps-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-ibps-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
      { id: 'sec-ibps-p-quant', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 20, questionCount: 35, marks: 35 },
    ],
    questions: [],
  },

  // --- IBPS PO 2023 PRELIMS PYQ (PREVIOUS YEAR PAPER) ---
  {
    id: 'mock-ibps-po-2023-pyq',
    slug: 'ibps-po-prelims-2023-pyq',
    title: 'IBPS PO Prelims 2023 - Previous Year Question Paper',
    description: 'Authentic 100-question actual exam paper from IBPS PO Prelims 2023 (Held on Sep 23, 2023). Features English Language (30 Qs), Quantitative Aptitude (35 Qs), and Reasoning Ability (35 Qs).',
    examId: 'exam-ibps-po',
    examSlug: 'ibps-po',
    examTitle: 'IBPS PO (Probationary Officer)',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 54.0,
    isFree: true,
    isFixed: true,
    isPyq: true,
    year: 2023,
    sections: [
      { id: 'sec-ibps-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
      { id: 'sec-ibps-p-quant', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-ibps-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
    ],
    questions: [],
  },

  // --- SSC CGL TIER 1 MOCK 1 ---
  {
    id: 'mock-ssc-cgl-tier1-1',
    slug: 'ssc-cgl-tier-1-full-mock-1',
    title: 'SSC CGL Tier-1 Full Mock Test 1 (Composite 60 Mins)',
    description: 'Official pattern 100-Question mock test for SSC CGL Tier-1: 25 Reasoning (50 marks, 15 min), 25 General Awareness (50 marks, 15 min), 25 Quantitative Aptitude (50 marks, 15 min), 25 English (50 marks, 15 min) (+2 marks, -0.50 negative, 60 mins composite timer).',
    examId: 'exam-ssc-cgl',
    examSlug: 'ssc-cgl',
    examTitle: 'SSC CGL (Combined Graduate Level)',
    durationMinutes: 60,
    totalMarks: 200,
    totalQuestions: 100,
    cutoffMarks: 135.0,
    isFree: true,
    isFixed: true,
    timerType: 'OVERALL_COMPOSITE',
    allowSectionSwitch: true,
    negativeMarkRatio: 0.50,
    stage: 'Tier-1',
    sections: [
      { id: 'sec-ssc-cgl-reason', code: 'REASONING', name: 'General Intelligence & Reasoning', durationMinutes: 15, questionCount: 25, marks: 50 },
      { id: 'sec-ssc-cgl-ga', code: 'GA', name: 'General Awareness', durationMinutes: 15, questionCount: 25, marks: 50 },
      { id: 'sec-ssc-cgl-quant', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 15, questionCount: 25, marks: 50 },
      { id: 'sec-ssc-cgl-eng', code: 'ENGLISH', name: 'English Comprehension', durationMinutes: 15, questionCount: 25, marks: 50 },
    ],
    questions: [],
  },

  // --- SSC CGL TIER 1 SECTIONAL TIMED MOCK (15m PER SECTION) ---
  {
    id: 'mock-ssc-cgl-tier1-2',
    slug: 'ssc-cgl-tier-1-sectional-mock-2',
    title: 'SSC CGL Tier-1 Sectional Timed Mock (15 Mins / Section)',
    description: '100-Question test with strict 15-minute sectional timers per section: 25 Reasoning (15m, 50 marks), 25 General Awareness (15m, 50 marks), 25 Quantitative Aptitude (15m, 50 marks), 25 English (15m, 50 marks) (+2 marks, -0.50 negative, auto-lock on expiry).',
    examId: 'exam-ssc-cgl',
    examSlug: 'ssc-cgl',
    examTitle: 'SSC CGL (Combined Graduate Level)',
    durationMinutes: 60,
    totalMarks: 200,
    totalQuestions: 100,
    cutoffMarks: 135.0,
    isFree: true,
    isFixed: true,
    timerType: 'SECTIONAL_LOCKED',
    allowSectionSwitch: false,
    negativeMarkRatio: 0.50,
    stage: 'Tier-1',
    sections: [
      { id: 'sec-ssc-cgl-reason-s', code: 'REASONING', name: 'General Intelligence & Reasoning', durationMinutes: 15, questionCount: 25, marks: 50 },
      { id: 'sec-ssc-cgl-ga-s', code: 'GA', name: 'General Awareness', durationMinutes: 15, questionCount: 25, marks: 50 },
      { id: 'sec-ssc-cgl-quant-s', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 15, questionCount: 25, marks: 50 },
      { id: 'sec-ssc-cgl-eng-s', code: 'ENGLISH', name: 'English Comprehension', durationMinutes: 15, questionCount: 25, marks: 50 },
    ],
    questions: [],
  },

  // --- RRB NTPC CBT-1 MOCK 1 ---
  {
    id: 'mock-rrb-ntpc-cbt1-1',
    slug: 'rrb-ntpc-cbt-1-full-mock-1',
    title: 'RRB NTPC CBT-1 Full Mock Test 1',
    description: 'Official pattern 100-Question mock test for RRB NTPC 1st Stage CBT: 40 General Awareness, 30 Mathematics, 30 Reasoning (+1 mark, -0.333 negative, 90 mins composite countdown).',
    examId: 'exam-rrb-ntpc',
    examSlug: 'rrb-ntpc',
    examTitle: 'RRB NTPC (Non-Technical Popular Categories)',
    durationMinutes: 90,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 72.0,
    isFree: true,
    isFixed: true,
    timerType: 'OVERALL_COMPOSITE',
    allowSectionSwitch: true,
    negativeMarkRatio: 0.333,
    stage: 'CBT-1',
    sections: [
      { id: 'sec-rrb-ntpc-ga', code: 'GA', name: 'General Awareness', durationMinutes: 0, questionCount: 40, marks: 40 },
      { id: 'sec-rrb-ntpc-math', code: 'QUANT', name: 'Mathematics', durationMinutes: 0, questionCount: 30, marks: 30 },
      { id: 'sec-rrb-ntpc-reason', code: 'REASONING', name: 'General Intelligence & Reasoning', durationMinutes: 0, questionCount: 30, marks: 30 },
    ],
    questions: [],
  },
];

MOCK_TESTS_DATA.forEach(t => {
  if (!t.status) t.status = 'published';
});

// Load persisted custom mock tests if available on server
if (typeof window === 'undefined') {
  try {
    const fs = require('fs');
    const path = require('path');
    const customTestsPath = path.resolve(process.cwd(), 'data', 'custom_mock_tests.json');
    if (fs.existsSync(customTestsPath)) {
      const data = JSON.parse(fs.readFileSync(customTestsPath, 'utf8'));
      if (Array.isArray(data)) {
        for (const t of data) {
          t.status = t.status || 'published';
          if (!MOCK_TESTS_DATA.some(mt => mt.id === t.id || mt.slug === t.slug)) {
            MOCK_TESTS_DATA.push(t);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load custom mock tests from disk:', err);
  }
}

export function saveCustomMockTestsToFile(_tests: MockTest[]): void {
  // Phase 2: Filesystem writes permanently eliminated for 100% serverless compliance.
  // Custom mock tests and PYQs are persisted directly to PostgreSQL via MockTestRepository.
}

