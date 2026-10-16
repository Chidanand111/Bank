import { Exam } from '@/types';

export const EXAMS_DATA: Exam[] = [
  {
    id: 'exam-ibps-po',
    slug: 'ibps-po',
    title: 'IBPS PO (Probationary Officer)',
    category: 'PO',
    description: 'Institute of Banking Personnel Selection Probationary Officer examination for recruitment in 11 participating public sector banks across India.',
    shortDescription: 'Comprehensive preparation for IBPS PO Prelims & Mains exams with realistic full-length mock tests.',
    totalMockTests: 5,
    status: 'published',
    patterns: [
      {
        stage: 'Prelims',
        totalQuestions: 100,
        totalMarks: 100,
        totalDurationMinutes: 60,
        sections: [
          {
            id: 'sec-ibps-p-eng',
            name: 'English Language',
            code: 'ENGLISH',
            numQuestions: 30,
            maxMarks: 30,
            durationMinutes: 20,
            topics: ['Reading Comprehension', 'Cloze Test', 'Error Detection', 'Para Jumbles', 'Sentence Improvement']
          },
          {
            id: 'sec-ibps-p-quant',
            name: 'Quantitative Aptitude',
            code: 'QUANT',
            numQuestions: 35,
            maxMarks: 35,
            durationMinutes: 20,
            topics: ['Data Interpretation (DI)', 'Number Series', 'Quadratic Equations', 'Arithmetic Problems', 'Simplification & Approximation']
          },
          {
            id: 'sec-ibps-p-reason',
            name: 'Reasoning Ability',
            code: 'REASONING',
            numQuestions: 35,
            maxMarks: 35,
            durationMinutes: 20,
            topics: ['Puzzles & Seating Arrangement', 'Syllogisms', 'Inequalities', 'Blood Relations', 'Coding-Decoding']
          }
        ]
      },
      {
        stage: 'Mains',
        totalQuestions: 155,
        totalMarks: 200,
        totalDurationMinutes: 180,
        sections: [
          {
            id: 'sec-ibps-m-reason',
            name: 'Reasoning & Computer Aptitude',
            code: 'REASONING_COMP',
            numQuestions: 45,
            maxMarks: 60,
            durationMinutes: 60,
            topics: ['Advanced Puzzles', 'Machine Input-Output', 'Logical Reasoning', 'Computer Hardware & Networking']
          },
          {
            id: 'sec-ibps-m-eng',
            name: 'English Language',
            code: 'ENGLISH_MAINS',
            numQuestions: 35,
            maxMarks: 40,
            durationMinutes: 40,
            topics: ['Advanced Comprehension', 'Vocabulary', 'Paragraph Completion']
          },
          {
            id: 'sec-ibps-m-di',
            name: 'Data Analysis & Interpretation',
            code: 'DATA_ANALYSIS',
            numQuestions: 35,
            maxMarks: 60,
            durationMinutes: 45,
            topics: ['Caselet DI', 'Missing DI', 'Radar & Line Graphs', 'Probability & Data Sufficiency']
          },
          {
            id: 'sec-ibps-m-ga',
            name: 'General / Economy / Banking Awareness',
            code: 'BANKING_AWARENESS',
            numQuestions: 40,
            maxMarks: 40,
            durationMinutes: 35,
            topics: ['RBI Monetary Policy', 'Banking Instruments', 'Current Affairs', 'Financial Awareness']
          }
        ]
      }
    ]
  },
  {
    id: 'exam-sbi-clerk',
    slug: 'sbi-clerk',
    title: 'SBI Clerk (Junior Associate)',
    category: 'CLERK',
    description: 'State Bank of India Junior Associate (Customer Support & Sales) recruitment exam conducted annually across India.',
    shortDescription: 'Boost your speed and accuracy for SBI Clerk Prelims & Mains with speed drills and full mock tests.',
    totalMockTests: 4,
    status: 'published',
    patterns: [
      {
        stage: 'Prelims',
        totalQuestions: 100,
        totalMarks: 100,
        totalDurationMinutes: 60,
        sections: [
          {
            id: 'sec-sbi-p-eng',
            name: 'English Language',
            code: 'ENGLISH',
            numQuestions: 30,
            maxMarks: 30,
            durationMinutes: 20,
            topics: ['Reading Comprehension', 'Fill in the Blanks', 'Spelling Errors', 'Phrase Replacement']
          },
          {
            id: 'sec-sbi-p-num',
            name: 'Numerical Ability',
            code: 'QUANT',
            numQuestions: 35,
            maxMarks: 35,
            durationMinutes: 20,
            topics: ['Simplification & Calculation', 'Missing Number Series', 'Data Interpretation (Bar/Pie)', 'Word Problems']
          },
          {
            id: 'sec-sbi-p-reason',
            name: 'Reasoning Ability',
            code: 'REASONING',
            numQuestions: 35,
            maxMarks: 35,
            durationMinutes: 20,
            topics: ['Linear & Circular Puzzles', 'Alpha-Numeric Series', 'Direction Sense', 'Syllogism']
          }
        ]
      },
      {
        stage: 'Mains',
        totalQuestions: 190,
        totalMarks: 200,
        totalDurationMinutes: 160,
        sections: [
          {
            id: 'sec-sbi-m-ga',
            name: 'General / Financial Awareness',
            code: 'FINANCIAL_AWARENESS',
            numQuestions: 50,
            maxMarks: 50,
            durationMinutes: 35,
            topics: ['Union Budget', 'RBI Guidelines', 'Financial Institutions', 'Current Banking News']
          },
          {
            id: 'sec-sbi-m-eng',
            name: 'General English',
            code: 'ENGLISH',
            numQuestions: 40,
            maxMarks: 40,
            durationMinutes: 35,
            topics: ['Reading Comprehension', 'Sentence Rearrangement', 'Error Spotting']
          },
          {
            id: 'sec-sbi-m-quant',
            name: 'Quantitative Aptitude',
            code: 'QUANT',
            numQuestions: 50,
            maxMarks: 50,
            durationMinutes: 45,
            topics: ['Advanced DI', 'Data Sufficiency', 'Quantity I vs Quantity II', 'Higher Arithmetic']
          },
          {
            id: 'sec-sbi-m-reason',
            name: 'Reasoning Ability & Computer Aptitude',
            code: 'REASONING_COMP',
            numQuestions: 50,
            maxMarks: 60,
            durationMinutes: 45,
            topics: ['Floor Puzzles', 'Matrix Coding', 'Computer Fundamentals & Logic Gates']
          }
        ]
      }
    ]
  },
  {
    id: 'exam-ibps-po-2025-pyq',
    slug: 'ibps-po-2025-pyq',
    title: 'IBPS PO 2025 Previous Year Papers',
    category: 'PO',
    description: 'Authentic 2025 IBPS PO examination papers featuring official prelims questions, 20-minute sectional timers, and comprehensive explanations.',
    shortDescription: 'Official IBPS PO 2025 Prelims & Mains actual exam question papers with real exam scoring.',
    totalMockTests: 1,
    status: 'published',
    patterns: [
      {
        stage: 'Prelims',
        totalQuestions: 100,
        totalMarks: 100,
        totalDurationMinutes: 60,
        sections: [
          {
            id: 'sec-ibps-po-2025-p-eng',
            name: 'English Language',
            code: 'ENGLISH',
            numQuestions: 30,
            maxMarks: 30,
            durationMinutes: 20,
            topics: ['Reading Comprehension', 'Cloze Test', 'Error Detection', 'Para Jumbles']
          },
          {
            id: 'sec-ibps-po-2025-p-quant',
            name: 'Quantitative Aptitude',
            code: 'QUANT',
            numQuestions: 35,
            maxMarks: 35,
            durationMinutes: 20,
            topics: ['Data Interpretation (DI)', 'Arithmetic Problems', 'Number Series', 'Quadratic Equations']
          },
          {
            id: 'sec-ibps-po-2025-p-reason',
            name: 'Reasoning Ability',
            code: 'REASONING',
            numQuestions: 35,
            maxMarks: 35,
            durationMinutes: 20,
            topics: ['Puzzles & Seating Arrangement', 'Syllogisms', 'Inequalities', 'Blood Relations']
          }
        ]
      }
    ]
  },
  {
    id: 'exam-ssc-cgl',
    slug: 'ssc-cgl',
    title: 'SSC CGL (Combined Graduate Level)',
    category: 'SSC',
    description: 'Staff Selection Commission Combined Graduate Level Examination for premier Central Government Ministries and Department recruitments.',
    shortDescription: 'Official SSC CGL Tier-1 & Tier-2 mock test series with composite timing and negative marking.',
    totalMockTests: 1,
    status: 'published',
    patterns: [
      {
        stage: 'Prelims',
        totalQuestions: 100,
        totalMarks: 200,
        totalDurationMinutes: 60,
        sections: [
          {
            id: 'sec-ssc-cgl-reason',
            name: 'General Intelligence & Reasoning',
            code: 'REASONING',
            numQuestions: 25,
            maxMarks: 50,
            durationMinutes: 0,
            topics: ['Analogies', 'Classification', 'Series', 'Venn Diagrams', 'Coding-Decoding']
          },
          {
            id: 'sec-ssc-cgl-ga',
            name: 'General Awareness',
            code: 'GA',
            numQuestions: 25,
            maxMarks: 50,
            durationMinutes: 0,
            topics: ['Current Affairs', 'History', 'Polity', 'Geography', 'Economics', 'General Science']
          },
          {
            id: 'sec-ssc-cgl-quant',
            name: 'Quantitative Aptitude',
            code: 'QUANT',
            numQuestions: 25,
            maxMarks: 50,
            durationMinutes: 0,
            topics: ['Arithmetic', 'Algebra', 'Geometry', 'Trigonometry', 'Data Interpretation']
          },
          {
            id: 'sec-ssc-cgl-eng',
            name: 'English Comprehension',
            code: 'ENGLISH',
            numQuestions: 25,
            maxMarks: 50,
            durationMinutes: 0,
            topics: ['Reading Comprehension', 'Error Spotting', 'Active/Passive Voice', 'Direct/Indirect Speech']
          }
        ]
      }
    ]
  },
  {
    id: 'exam-rrb-ntpc',
    slug: 'rrb-ntpc',
    title: 'RRB NTPC (Non-Technical Popular Categories)',
    category: 'RAILWAY',
    description: 'Railway Recruitment Boards Non-Technical Popular Categories (CEN 01/2024) examination across Indian Railways zones.',
    shortDescription: 'Realistic RRB NTPC CBT-1 & CBT-2 mock exams featuring 90-minute composite countdown and 1/3rd negative marking.',
    totalMockTests: 1,
    status: 'published',
    patterns: [
      {
        stage: 'Prelims',
        totalQuestions: 100,
        totalMarks: 100,
        totalDurationMinutes: 90,
        sections: [
          {
            id: 'sec-rrb-ntpc-ga',
            name: 'General Awareness',
            code: 'GA',
            numQuestions: 40,
            maxMarks: 40,
            durationMinutes: 0,
            topics: ['General Science', 'Indian History', 'Polity', 'Geography', 'Current Events']
          },
          {
            id: 'sec-rrb-ntpc-math',
            name: 'Mathematics',
            code: 'QUANT',
            numQuestions: 30,
            maxMarks: 30,
            durationMinutes: 0,
            topics: ['Number System', 'Decimals & Fractions', 'LCM & HCF', 'Ratio & Proportion', 'Time & Work']
          },
          {
            id: 'sec-rrb-ntpc-reason',
            name: 'General Intelligence & Reasoning',
            code: 'REASONING',
            numQuestions: 30,
            maxMarks: 30,
            durationMinutes: 0,
            topics: ['Analogies', 'Coding-Decoding', 'Mathematical Operations', 'Relationships', 'Syllogisms']
          }
        ]
      }
    ]
  }
];

// Load persisted custom exams if available on server
if (typeof window === 'undefined') {
  try {
    const fs = require('fs');
    const path = require('path');
    const customExamsPath = path.resolve(process.cwd(), 'data', 'custom_exams.json');
    if (fs.existsSync(customExamsPath)) {
      const data = JSON.parse(fs.readFileSync(customExamsPath, 'utf8'));
      if (Array.isArray(data)) {
        for (const ex of data) {
          ex.status = ex.status || 'published';
          if (!EXAMS_DATA.some(e => e.id === ex.id || e.slug === ex.slug)) {
            EXAMS_DATA.push(ex);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load custom exams from disk:', err);
  }
}

export function saveCustomExamsToFile(_exams: Exam[]): void {
  // Phase 2: Filesystem writes permanently eliminated for 100% serverless compliance.
  // Custom exams are persisted directly to PostgreSQL via ExamRepository.
}
