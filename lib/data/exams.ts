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
  }
];
