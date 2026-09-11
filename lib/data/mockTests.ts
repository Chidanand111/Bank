import { MockTest, Question } from '@/types';
import { IBPS_PO_QUESTIONS, SBI_CLERK_QUESTIONS } from './questions';

export const MOCK_TESTS_DATA: MockTest[] = [
  // --- IBPS PO MOCK 1 ---
  {
    id: 'mock-ibps-po-1',
    slug: 'ibps-po-prelims-mock-1',
    title: 'IBPS PO Prelims Full Mock Test 1',
    description: 'Latest pattern full-length practice test for IBPS PO Prelims with sectional timing and detailed solutions.',
    examId: 'exam-ibps-po',
    examSlug: 'ibps-po',
    examTitle: 'IBPS PO (Probationary Officer)',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 58.5,
    isFree: true,
    sections: [
      { id: 'sec-ibps-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
      { id: 'sec-ibps-p-quant', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-ibps-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
    ],
    questions: [
      ...IBPS_PO_QUESTIONS,
      // Additional English generated questions
      {
        id: 'q-ibps-e5',
        text: 'In the following sentence, four words are printed in bold. One of these bold words may be misspelt or contextually inappropriate. Find out the word.\n\n"The **unprecendented** rise in global crude oil prices has **exacerbated** the current account **deficit** of importing **nations**."',
        difficulty: 'MEDIUM',
        explanation: 'The word "unprecendented" is misspelt. The correct spelling is "unprecedented" (without the extra "n" after "ce").',
        marks: 1.0,
        negativeMarks: 0.25,
        examId: 'exam-ibps-po',
        sectionId: 'sec-ibps-p-eng',
        sectionCode: 'ENGLISH',
        sectionName: 'English Language',
        topicId: 'top-eng-spell',
        topicName: 'Spelling Errors',
        options: [
          { id: 'opt-e5-1', questionId: 'q-ibps-e5', text: 'unprecendented', isCorrect: true, order: 1 },
          { id: 'opt-e5-2', questionId: 'q-ibps-e5', text: 'exacerbated', isCorrect: false, order: 2 },
          { id: 'opt-e5-3', questionId: 'q-ibps-e5', text: 'deficit', isCorrect: false, order: 3 },
          { id: 'opt-e5-4', questionId: 'q-ibps-e5', text: 'nations', isCorrect: false, order: 4 },
          { id: 'opt-e5-5', questionId: 'q-ibps-e5', text: 'All correct', isCorrect: false, order: 5 },
        ]
      },
      // Additional Quant generated questions
      {
        id: 'q-ibps-q5',
        text: 'A pipe can fill a tank in 12 hours, while another pipe can empty it in 18 hours. If both pipes are opened together when the tank is half-full, how many hours will it take to fill the remaining half of the tank?',
        difficulty: 'MEDIUM',
        explanation: 'Filling pipe rate = +1/12 per hour.\nEmptying pipe rate = -1/18 per hour.\nNet filling rate = 1/12 - 1/18 = (3 - 2)/36 = 1/36 per hour.\nTime to fill full tank = 36 hours.\nTime to fill remaining half (1/2 tank) = 36 × (1/2) = 18 hours.',
        marks: 1.0,
        negativeMarks: 0.25,
        examId: 'exam-ibps-po',
        sectionId: 'sec-ibps-p-quant',
        sectionCode: 'QUANT',
        sectionName: 'Quantitative Aptitude',
        topicId: 'top-quant-pipes',
        topicName: 'Pipes & Cisterns',
        options: [
          { id: 'opt-q5-1', questionId: 'q-ibps-q5', text: '12 hours', isCorrect: false, order: 1 },
          { id: 'opt-q5-2', questionId: 'q-ibps-q5', text: '18 hours', isCorrect: true, order: 2 },
          { id: 'opt-q5-3', questionId: 'q-ibps-q5', text: '24 hours', isCorrect: false, order: 3 },
          { id: 'opt-q5-4', questionId: 'q-ibps-q5', text: '15 hours', isCorrect: false, order: 4 },
          { id: 'opt-q5-5', questionId: 'q-ibps-q5', text: '36 hours', isCorrect: false, order: 5 },
        ]
      },
      // Additional Reasoning questions
      {
        id: 'q-ibps-r5',
        text: 'In a certain code, STATEMENTS is written as TTMSTENSEMA. How is GOVERNMENT coded in that system?',
        difficulty: 'HARD',
        explanation: 'Observe pattern of letter positions: Alternate letters are extracted and swapped in groups. GOVERNMENT yields OERMETNVGN.',
        marks: 1.0,
        negativeMarks: 0.25,
        examId: 'exam-ibps-po',
        sectionId: 'sec-ibps-p-reason',
        sectionCode: 'REASONING',
        sectionName: 'Reasoning Ability',
        topicId: 'top-reason-coding',
        topicName: 'Coding-Decoding',
        options: [
          { id: 'opt-r5-1', questionId: 'q-ibps-r5', text: 'OERMETNVGN', isCorrect: true, order: 1 },
          { id: 'opt-r5-2', questionId: 'q-ibps-r5', text: 'OERMETVNGN', isCorrect: false, order: 2 },
          { id: 'opt-r5-3', questionId: 'q-ibps-r5', text: 'REMETNVGNO', isCorrect: false, order: 3 },
          { id: 'opt-r5-4', questionId: 'q-ibps-r5', text: 'GNOVERMETN', isCorrect: false, order: 4 },
          { id: 'opt-r5-5', questionId: 'q-ibps-r5', text: 'OGVERNMETN', isCorrect: false, order: 5 },
        ]
      }
    ]
  },

  // --- IBPS PO MOCK 2 ---
  {
    id: 'mock-ibps-po-2',
    slug: 'ibps-po-prelims-mock-2',
    title: 'IBPS PO Prelims Speed Drill Mock 2',
    description: 'High-yield practice test designed to test speed, selection strategy, and accuracy under strict exam conditions.',
    examId: 'exam-ibps-po',
    examSlug: 'ibps-po',
    examTitle: 'IBPS PO (Probationary Officer)',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 61.0,
    isFree: true,
    sections: [
      { id: 'sec-ibps-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
      { id: 'sec-ibps-p-quant', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-ibps-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
    ],
    questions: [
      {
        id: 'q-ibps2-e1',
        text: 'Identify the word that is OPPOSITE in meaning to **EQUIVOCAL**.\n\n"The spokesperson gave an equivocal answer when questioned about the bank merger timelines."',
        difficulty: 'MEDIUM',
        explanation: '"Equivocal" means open to more than one interpretation; ambiguous or vague. The opposite is "Unambiguous" (clear, explicit).',
        marks: 1.0,
        negativeMarks: 0.25,
        examId: 'exam-ibps-po',
        sectionId: 'sec-ibps-p-eng',
        sectionCode: 'ENGLISH',
        sectionName: 'English Language',
        topicId: 'top-eng-ant',
        topicName: 'Antonyms',
        options: [
          { id: 'opt-b2e1-1', questionId: 'q-ibps2-e1', text: 'Ambiguous', isCorrect: false, order: 1 },
          { id: 'opt-b2e1-2', questionId: 'q-ibps2-e1', text: 'Unambiguous', isCorrect: true, order: 2 },
          { id: 'opt-b2e1-3', questionId: 'q-ibps2-e1', text: 'Evasive', isCorrect: false, order: 3 },
          { id: 'opt-b2e1-4', questionId: 'q-ibps2-e1', text: 'Dubious', isCorrect: false, order: 4 },
          { id: 'opt-b2e1-5', questionId: 'q-ibps2-e1', text: 'Obscure', isCorrect: false, order: 5 },
        ]
      },
      {
        id: 'q-ibps2-q1',
        text: 'What is the ratio of compound interest earned on ₹20,000 for 2 years at 20% per annum to the simple interest earned on the same principal at the same rate for the same time?',
        difficulty: 'MEDIUM',
        explanation: 'Simple Interest = (20000 × 20 × 2) / 100 = ₹8,000.\nCompound Interest = 20000 × [(1.20)² - 1] = 20000 × [1.44 - 1] = 20000 × 0.44 = ₹8,800.\nRatio CI : SI = 8800 : 8000 = 11 : 10.',
        marks: 1.0,
        negativeMarks: 0.25,
        examId: 'exam-ibps-po',
        sectionId: 'sec-ibps-p-quant',
        sectionCode: 'QUANT',
        sectionName: 'Quantitative Aptitude',
        topicId: 'top-quant-ci-si',
        topicName: 'CI & SI Ratio',
        options: [
          { id: 'opt-b2q1-1', questionId: 'q-ibps2-q1', text: '10 : 9', isCorrect: false, order: 1 },
          { id: 'opt-b2q1-2', questionId: 'q-ibps2-q1', text: '11 : 10', isCorrect: true, order: 2 },
          { id: 'opt-b2q1-3', questionId: 'q-ibps2-q1', text: '12 : 11', isCorrect: false, order: 3 },
          { id: 'opt-b2q1-4', questionId: 'q-ibps2-q1', text: '21 : 20', isCorrect: false, order: 4 },
          { id: 'opt-b2q1-5', questionId: 'q-ibps2-q1', text: '5 : 4', isCorrect: false, order: 5 },
        ]
      },
      {
        id: 'q-ibps2-r1',
        text: 'Statements:\nP > Q ≥ R = S < T ≤ U\nConclusions:\nI. P > S\nII. U > R',
        difficulty: 'EASY',
        explanation: 'From P > Q ≥ R = S, we have P > S (Conclusion I is TRUE).\nFrom R = S < T ≤ U, we have R < U → U > R (Conclusion II is TRUE).\nTherefore, both conclusions follow.',
        marks: 1.0,
        negativeMarks: 0.25,
        examId: 'exam-ibps-po',
        sectionId: 'sec-ibps-p-reason',
        sectionCode: 'REASONING',
        sectionName: 'Reasoning Ability',
        topicId: 'top-reason-ineq',
        topicName: 'Inequalities',
        options: [
          { id: 'opt-b2r1-1', questionId: 'q-ibps2-r1', text: 'Only Conclusion I follows', isCorrect: false, order: 1 },
          { id: 'opt-b2r1-2', questionId: 'q-ibps2-r1', text: 'Only Conclusion II follows', isCorrect: false, order: 2 },
          { id: 'opt-b2r1-3', questionId: 'q-ibps2-r1', text: 'Both Conclusion I and II follow', isCorrect: true, order: 3 },
          { id: 'opt-b2r1-4', questionId: 'q-ibps2-r1', text: 'Neither Conclusion I nor II follows', isCorrect: false, order: 4 },
          { id: 'opt-b2r1-5', questionId: 'q-ibps2-r1', text: 'Either Conclusion I or II follows', isCorrect: false, order: 5 },
        ]
      }
    ]
  },

  // --- SBI CLERK MOCK 1 ---
  {
    id: 'mock-sbi-clerk-1',
    slug: 'sbi-clerk-prelims-mock-1',
    title: 'SBI Clerk Prelims Full Mock Test 1',
    description: 'Realistic preliminary exam mockup featuring high-frequency questions in Numerical Ability, English, and Reasoning.',
    examId: 'exam-sbi-clerk',
    examSlug: 'sbi-clerk',
    examTitle: 'SBI Clerk (Junior Associate)',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 72.5,
    isFree: true,
    sections: [
      { id: 'sec-sbi-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
      { id: 'sec-sbi-p-num', code: 'QUANT', name: 'Numerical Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-sbi-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
    ],
    questions: [
      ...SBI_CLERK_QUESTIONS,
      {
        id: 'q-sbi-n4',
        text: 'What will come in place of question mark (?) in the following series?\n\n5, 11, 23, 47, 95, ?',
        difficulty: 'EASY',
        explanation: 'Pattern: Each term is multiplied by 2 and added 1.\n5 × 2 + 1 = 11\n11 × 2 + 1 = 23\n23 × 2 + 1 = 47\n47 × 2 + 1 = 95\n95 × 2 + 1 = 191.',
        marks: 1.0,
        negativeMarks: 0.25,
        examId: 'exam-sbi-clerk',
        sectionId: 'sec-sbi-p-num',
        sectionCode: 'QUANT',
        sectionName: 'Numerical Ability',
        topicId: 'top-num-series',
        topicName: 'Number Series',
        options: [
          { id: 'opt-sn4-1', questionId: 'q-sbi-n4', text: '185', isCorrect: false, order: 1 },
          { id: 'opt-sn4-2', questionId: 'q-sbi-n4', text: '191', isCorrect: true, order: 2 },
          { id: 'opt-sn4-3', questionId: 'q-sbi-n4', text: '190', isCorrect: false, order: 3 },
          { id: 'opt-sn4-4', questionId: 'q-sbi-n4', text: '195', isCorrect: false, order: 4 },
          { id: 'opt-sn4-5', questionId: 'q-sbi-n4', text: '189', isCorrect: false, order: 5 },
        ]
      }
    ]
  },

  // --- SBI CLERK MOCK 2 ---
  {
    id: 'mock-sbi-clerk-2',
    slug: 'sbi-clerk-prelims-mock-2',
    title: 'SBI Clerk Prelims Speed Booster Mock 2',
    description: 'Targeted practice for speed calculation, fast comprehension, and quick logical reasoning.',
    examId: 'exam-sbi-clerk',
    examSlug: 'sbi-clerk',
    examTitle: 'SBI Clerk (Junior Associate)',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 74.0,
    isFree: true,
    sections: [
      { id: 'sec-sbi-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
      { id: 'sec-sbi-p-num', code: 'QUANT', name: 'Numerical Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
      { id: 'sec-sbi-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
    ],
    questions: [
      {
        id: 'q-sbi2-n1',
        text: 'The average age of 5 employees in a bank branch is 32 years. If the manager’s age is included, the average age increases by 3 years. What is the age of the manager?',
        difficulty: 'EASY',
        explanation: 'Total age of 5 employees = 5 × 32 = 160 years.\nTotal people including manager = 6.\nNew average age = 32 + 3 = 35 years.\nTotal age of 6 people = 6 × 35 = 210 years.\nManager\'s age = 210 - 160 = 50 years.',
        marks: 1.0,
        negativeMarks: 0.25,
        examId: 'exam-sbi-clerk',
        sectionId: 'sec-sbi-p-num',
        sectionCode: 'QUANT',
        sectionName: 'Numerical Ability',
        topicId: 'top-num-avg',
        topicName: 'Averages',
        options: [
          { id: 'opt-sb2n1-1', questionId: 'q-sbi2-n1', text: '45 years', isCorrect: false, order: 1 },
          { id: 'opt-sb2n1-2', questionId: 'q-sbi2-n1', text: '50 years', isCorrect: true, order: 2 },
          { id: 'opt-sb2n1-3', questionId: 'q-sbi2-n1', text: '48 years', isCorrect: false, order: 3 },
          { id: 'opt-sb2n1-4', questionId: 'q-sbi2-n1', text: '52 years', isCorrect: false, order: 4 },
          { id: 'opt-sb2n1-5', questionId: 'q-sbi2-n1', text: '55 years', isCorrect: false, order: 5 },
        ]
      }
    ]
  }
];
