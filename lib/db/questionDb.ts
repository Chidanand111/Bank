import { Question, Option, Difficulty, MockTest } from '@/types';
import rawQuestionsData from '@/data/questions.json';
import pyqQuestionsData from '@/data/sbi_clerk_2024_pyq.json';
import ibpsPo2024Data from '@/data/ibps_po_2024_prelims_pyq.json';
import ibpsPo2023Data from '@/data/ibps_po_2023_prelims_pyq.json';
import ibpsPo2025MainsData from '@/data/ibps_po_2025_mains_pyq.json';

export interface RawJsonQuestion {
  id: number | string;
  exam: string;
  section: string;
  topic: string;
  question: string;
  imageUrl?: string;
  passage?: string;
  passageImageUrl?: string;
  groupId?: string;
  isPyq?: boolean;
  pyqYear?: number;
  pyqExam?: string;
  options: Record<string, string | { text: string; imageUrl?: string }>;
  answer: string;
  explanation: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  marks?: number;
  negativeMarks?: number;
}

// In-memory working database initialized from JSON files (deduplicated by ID)
const combinedRaw = [
  ...(rawQuestionsData as RawJsonQuestion[]),
  ...(pyqQuestionsData as RawJsonQuestion[]),
  ...(ibpsPo2024Data as RawJsonQuestion[]),
  ...(ibpsPo2023Data as RawJsonQuestion[]),
  ...(ibpsPo2025MainsData as RawJsonQuestion[]),
];
const initialStore: RawJsonQuestion[] = [];
const seenStoreIds = new Set<string>();
for (const q of combinedRaw) {
  const strId = String(q.id);
  if (!seenStoreIds.has(strId)) {
    seenStoreIds.add(strId);
    initialStore.push(q);
  }
}
let questionStore: RawJsonQuestion[] = initialStore;

/**
 * Standardize Exam names to exam IDs and slugs
 */
export function mapExamToId(examName: string): { examId: string; examSlug: string } {
  if (examName && examName.startsWith('exam-')) {
    return { examId: examName, examSlug: examName.replace(/^exam-/, '') };
  }
  const norm = (examName || '').toLowerCase();
  if (norm.includes('sbi') || norm.includes('clerk')) {
    return { examId: 'exam-sbi-clerk', examSlug: 'sbi-clerk' };
  }
  return { examId: 'exam-ibps-po', examSlug: 'ibps-po' };
}

/**
 * Standardize Section names to section codes and IDs
 */
export function mapSectionToCode(sectionName: string): { sectionCode: string; sectionId: string; sectionName: string } {
  const norm = (sectionName || '').toLowerCase();
  if (norm.includes('reason') || norm.includes('computer')) {
    return { sectionCode: 'REASONING', sectionId: 'sec-ibps-p-reason', sectionName: sectionName || 'Reasoning Ability' };
  }
  if (norm.includes('quant') || norm.includes('numer') || norm.includes('math') || norm.includes('data') || norm.includes('analysis') || norm.includes('interpret')) {
    return { sectionCode: 'QUANT', sectionId: 'sec-ibps-p-quant', sectionName: sectionName || 'Quantitative Aptitude' };
  }
  if (norm.includes('eng')) {
    return { sectionCode: 'ENGLISH', sectionId: 'sec-ibps-p-eng', sectionName: sectionName || 'English Language' };
  }
  if (norm.includes('general') || norm.includes('aware') || norm.includes('ga') || norm.includes('bank') || norm.includes('financial')) {
    return { sectionCode: 'FINANCIAL_AWARENESS', sectionId: 'sec-ibps-m-ga', sectionName: sectionName || 'General / Banking Awareness' };
  }
  return { sectionCode: 'GENERAL', sectionId: 'sec-general', sectionName: sectionName };
}

/**
 * Convert a raw JSON question into the full application Question format
 */
export function normalizeQuestion(raw: RawJsonQuestion): Question {
  const qId = typeof raw.id === 'number' ? `q-json-${raw.id}` : String(raw.id);
  const { examId } = mapExamToId(raw.exam);
  const { sectionCode, sectionId, sectionName } = mapSectionToCode(raw.section);
  const topicId = `top-${sectionCode.toLowerCase()}-${(raw.topic || 'general').toLowerCase().replace(/\s+/g, '-')}`;

  const optionKeys = Object.keys(raw.options || {}).sort();
  const options: Option[] = optionKeys.map((key, idx) => {
    const rawOpt = raw.options[key];
    const optText = typeof rawOpt === 'string' ? rawOpt : (rawOpt?.text || '');
    const optImg = typeof rawOpt === 'object' ? rawOpt?.imageUrl : undefined;
    const isCorrect = key.trim().toUpperCase() === (raw.answer || '').trim().toUpperCase();
    return {
      id: `opt-${qId}-${key.toLowerCase()}`,
      questionId: qId,
      text: optText,
      imageUrl: optImg,
      isCorrect,
      order: idx + 1,
    };
  });

  const isPyq = raw.isPyq ?? Boolean(
    raw.exam?.toLowerCase().includes('2024') ||
    raw.exam?.toLowerCase().includes('2023') ||
    raw.exam?.toLowerCase().includes('2025') ||
    raw.exam?.toLowerCase().includes('pyq')
  );
  const pyqYear = raw.pyqYear ?? (
    raw.exam?.includes('2025') ? 2025 :
    raw.exam?.includes('2023') ? 2023 :
    raw.exam?.includes('2024') ? 2024 : undefined
  );

  return {
    id: qId,
    text: raw.question,
    imageUrl: raw.imageUrl,
    passage: raw.passage,
    passageImageUrl: raw.passageImageUrl,
    groupId: raw.groupId,
    isPyq,
    pyqYear,
    pyqExam: raw.pyqExam || (isPyq ? (raw.exam || 'SBI Clerk Prelims 2024') : undefined),
    difficulty: (raw.difficulty as Difficulty) || 'MEDIUM',
    explanation: raw.explanation || '',
    marks: raw.marks ?? 1.0,
    negativeMarks: raw.negativeMarks ?? 0.25,
    examId,
    sectionId,
    sectionCode,
    sectionName,
    topicId,
    topicName: raw.topic,
    options,
  };
}

/**
 * Get all raw JSON questions from the database
 */
export function getRawQuestions(): RawJsonQuestion[] {
  return questionStore;
}

/**
 * Get all normalized questions from the JSON database
 */
export function getAllQuestions(): Question[] {
  return questionStore.map(normalizeQuestion);
}

/**
 * Fisher-Yates array shuffle for true randomness
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick random questions from the JSON database by exam and/or section.
 * Prioritizes unseen questions from the primary exam set; if not enough are available
 * in that set, it seamlessly picks from other sets to fulfill the quota.
 */
export function pickRandomQuestions(params: {
  examSlug?: string;
  sectionCode?: string;
  count: number;
  excludeIds?: string[];
}): Question[] {
  const { examSlug, sectionCode, count, excludeIds = [] } = params;
  const excludeSet = new Set(excludeIds);

  const allQuestions = questionStore.map(normalizeQuestion);

  // 1. Filter by section if specified
  const sectionQuestions = sectionCode
    ? allQuestions.filter(q => q.sectionCode === sectionCode)
    : allQuestions;

  const isMatchingExam = (q: Question) => {
    if (!examSlug) return true;
    const isSbi = examSlug.includes('sbi');
    return isSbi ? q.examId.includes('sbi') : q.examId.includes('ibps');
  };

  const primarySet = sectionQuestions.filter(isMatchingExam);
  const otherSets = sectionQuestions.filter(q => !isMatchingExam(q));

  // Prioritize unseen questions first
  const primaryUnseen = shuffleArray(primarySet.filter(q => !excludeSet.has(q.id)));
  const otherUnseen = shuffleArray(otherSets.filter(q => !excludeSet.has(q.id)));
  const primarySeen = shuffleArray(primarySet.filter(q => excludeSet.has(q.id)));
  const otherSeen = shuffleArray(otherSets.filter(q => excludeSet.has(q.id)));

  const picked: Question[] = [];
  const pickedIds = new Set<string>();

  const addQuestions = (source: Question[]) => {
    for (const q of source) {
      if (picked.length >= count) break;
      if (!pickedIds.has(q.id)) {
        picked.push(q);
        pickedIds.add(q.id);
      }
    }
  };

  // Stage 1: Unseen questions from primary set
  addQuestions(primaryUnseen);

  // Stage 2: Unseen questions from other sets ("if not available on that set pick from random other set")
  if (picked.length < count) {
    addQuestions(otherUnseen);
  }

  // Stage 3: Seen questions from primary set
  if (picked.length < count) {
    addQuestions(primarySeen);
  }

  // Stage 4: Seen questions from other sets
  if (picked.length < count) {
    addQuestions(otherSeen);
  }

  // Stage 5: If section pool is still smaller than count, pick from ANY other set/section in DB
  if (picked.length < count) {
    const remainingAllUnseen = shuffleArray(allQuestions.filter(q => !excludeSet.has(q.id) && !pickedIds.has(q.id)));
    const remainingAllSeen = shuffleArray(allQuestions.filter(q => !pickedIds.has(q.id)));
    addQuestions(remainingAllUnseen);
    addQuestions(remainingAllSeen);
  }

  return picked.slice(0, count);
}

/**
 * Dynamically builds a 100-question mock test (35 Reasoning, 35 Quantitative Aptitude, 30 English Language).
 * If questions are not available on that exam's set, it automatically picks from random other sets
 * while prioritizing unseen questions for that user.
 */
/**
 * Deterministically retrieves fixed questions for any mock test.
 * Random selection is removed: each exam has dedicated, fixed questions.
 * PYQ exams (2024 and 2023) remain strictly authentic and unchanged.
 */
export function getFixedQuestionsForMockTest(testIdOrSlug: string): Question[] {
  const allQuestions = questionStore.map(normalizeQuestion);
  const norm = (testIdOrSlug || '').toLowerCase().trim();

  // 1. IBPS PO Mains 2025 PYQ (Authentic 155 official questions)
  if ((norm.includes('ibps') && norm.includes('2025')) || norm === 'mock-ibps-po-2025-mains-pyq' || norm === 'ibps-po-mains-2025-pyq') {
    const pyq2025Mains = allQuestions
      .filter(q => Boolean(q.isPyq) && (q.pyqExam?.includes('IBPS PO Mains 2025') || String(q.id).toLowerCase().includes('ibps-po-2025')))
      .sort((a, b) => {
        const matchA = String(a.id).match(/-q(\d+)$/i) || String(a.id).match(/(\d+)$/);
        const matchB = String(b.id).match(/-q(\d+)$/i) || String(b.id).match(/(\d+)$/);
        const numA = matchA ? parseInt(matchA[1], 10) : 0;
        const numB = matchB ? parseInt(matchB[1], 10) : 0;
        return numA - numB;
      });
    if (pyq2025Mains.length > 0) return pyq2025Mains;
  }

  // 2. IBPS PO Prelims 2024 PYQ (Authentic 100 official questions)
  if ((norm.includes('ibps') && norm.includes('2024')) || norm === 'mock-ibps-po-2024-pyq' || norm === 'ibps-po-prelims-2024-pyq') {
    const pyq2024IBPS = allQuestions
      .filter(q => Boolean(q.isPyq) && (q.pyqExam?.includes('IBPS PO Prelims 2024') || String(q.id).toLowerCase().includes('ibps-po-2024')))
      .sort((a, b) => {
        const matchA = String(a.id).match(/-q(\d+)$/i) || String(a.id).match(/(\d+)$/);
        const matchB = String(b.id).match(/-q(\d+)$/i) || String(b.id).match(/(\d+)$/);
        const numA = matchA ? parseInt(matchA[1], 10) : 0;
        const numB = matchB ? parseInt(matchB[1], 10) : 0;
        return numA - numB;
      });
    if (pyq2024IBPS.length > 0) return pyq2024IBPS;
  }

  // 3. IBPS PO Prelims 2023 PYQ (Authentic 100 official questions)
  if ((norm.includes('ibps') && norm.includes('2023')) || norm === 'mock-ibps-po-2023-pyq' || norm === 'ibps-po-prelims-2023-pyq') {
    const pyq2023IBPS = allQuestions
      .filter(q => Boolean(q.isPyq) && (q.pyqExam?.includes('IBPS PO Prelims 2023') || String(q.id).toLowerCase().includes('ibps-po-2023')))
      .sort((a, b) => {
        const matchA = String(a.id).match(/-q(\d+)$/i) || String(a.id).match(/(\d+)$/);
        const matchB = String(b.id).match(/-q(\d+)$/i) || String(b.id).match(/(\d+)$/);
        const numA = matchA ? parseInt(matchA[1], 10) : 0;
        const numB = matchB ? parseInt(matchB[1], 10) : 0;
        return numA - numB;
      });
    if (pyq2023IBPS.length > 0) return pyq2023IBPS;
  }

  // 4. SBI Clerk 2024 PYQ (Authentic 100 official questions)
  if (
    (norm.includes('sbi') && (norm.includes('2024') || norm === 'mock-sbi-clerk-2024-pyq' || norm === 'sbi-clerk-prelims-2024-pyq')) ||
    (!norm.includes('ibps') && (norm.includes('2024-pyq') || norm.includes('2024_pyq') || norm === 'pyq-2024'))
  ) {
    const pyq2024 = allQuestions
      .filter(q => Boolean(q.isPyq) && (q.pyqExam?.includes('SBI Clerk') || String(q.id).toLowerCase().includes('sbi')) && (q.pyqYear === 2024 || String(q.id).toLowerCase().includes('2024')))
      .sort((a, b) => {
        const matchA = String(a.id).match(/-q(\d+)$/i) || String(a.id).match(/(\d+)$/);
        const matchB = String(b.id).match(/-q(\d+)$/i) || String(b.id).match(/(\d+)$/);
        const numA = matchA ? parseInt(matchA[1], 10) : 0;
        const numB = matchB ? parseInt(matchB[1], 10) : 0;
        return numA - numB;
      });
    if (pyq2024.length > 0) return pyq2024;
  }

  // 5. SBI Clerk 2023-24 PYQ (Authentic 100 official questions)
  if (
    (norm.includes('sbi') && (norm.includes('2023') || norm === 'mock-sbi-clerk-2023-pyq' || norm === 'sbi-clerk-prelims-2023-pyq')) ||
    (!norm.includes('ibps') && (norm.includes('2023-pyq') || norm.includes('2023_pyq') || norm === 'pyq-2023'))
  ) {
    const pyq2023 = allQuestions
      .filter(q => Boolean(q.isPyq) && (q.pyqExam?.includes('SBI Clerk') || String(q.id).toLowerCase().includes('sbi')) && (q.pyqYear === 2023 || q.pyqYear === 2024 || String(q.id).toLowerCase().includes('2024')))
      .sort((a, b) => {
        const matchA = String(a.id).match(/-q(\d+)$/i) || String(a.id).match(/(\d+)$/);
        const matchB = String(b.id).match(/-q(\d+)$/i) || String(b.id).match(/(\d+)$/);
        const numA = matchA ? parseInt(matchA[1], 10) : 0;
        const numB = matchB ? parseInt(matchB[1], 10) : 0;
        return numA - numB;
      });
    if (pyq2023.length > 0) return pyq2023;
  }

  // Dynamic match for any custom-created PYQ or Mock Test
  const dynamicMatch = allQuestions.filter(q => {
    const qPyq = (q.pyqExam || '').toLowerCase().trim();
    const qId = String(q.id).toLowerCase().trim();
    const cleanNorm = norm.replace(/^mock-/, '');
    return (
      (qPyq && (qPyq === norm || cleanNorm.includes(qPyq) || qPyq.includes(cleanNorm))) ||
      qId.includes(cleanNorm)
    );
  });
  if (dynamicMatch.length > 0) {
    return dynamicMatch.sort((a, b) => {
      const matchA = String(a.id).match(/-q(\d+)$/i) || String(a.id).match(/(\d+)$/);
      const matchB = String(b.id).match(/-q(\d+)$/i) || String(b.id).match(/(\d+)$/);
      const numA = matchA ? parseInt(matchA[1], 10) : 0;
      const numB = matchB ? parseInt(matchB[1], 10) : 0;
      return numA - numB;
    });
  }

  // If a custom PYQ paper was requested but has no questions yet, return empty array
  if (norm.includes('pyq')) {
    return [];
  }

  // Standard practice questions partitioned by section (strictly exclude any PYQ)
  const nonPyqQuestions = allQuestions.filter(q =>
    !q.isPyq &&
    !String(q.id).toLowerCase().includes('2024') &&
    !String(q.id).toLowerCase().includes('2023') &&
    !String(q.id).toLowerCase().includes('2025') &&
    !String(q.id).toLowerCase().includes('ibps-po-20') &&
    !String(q.id).toLowerCase().includes('sbi-clerk-20')
  );

  const engPool = nonPyqQuestions.filter(q => q.sectionCode === 'ENGLISH');
  const quantPool = nonPyqQuestions.filter(q => q.sectionCode === 'QUANT');
  const reasonPool = nonPyqQuestions.filter(q => q.sectionCode === 'REASONING');

  // Helper to slice fixed quota deterministically
  const sliceSection = (pool: Question[], start: number, count: number, secCode: string, secName: string): Question[] => {
    const list: Question[] = [];
    for (let i = 0; i < count; i++) {
      const item = pool[(start + i) % (pool.length || 1)];
      if (item) {
        list.push({
          ...item,
          sectionCode: secCode,
          sectionName: secName,
        });
      }
    }
    return list;
  };

  // 6. IBPS PO Mock 1: Fixed 30 English (0..29), 35 Quant (0..34), 35 Reasoning (0..34)
  if (norm.includes('ibps-po-1') || norm.includes('ibps-po-prelims-mock-1')) {
    return [
      ...sliceSection(engPool, 0, 30, 'ENGLISH', 'English Language'),
      ...sliceSection(quantPool, 0, 35, 'QUANT', 'Quantitative Aptitude'),
      ...sliceSection(reasonPool, 0, 35, 'REASONING', 'Reasoning Ability'),
    ];
  }

  // 7. IBPS PO Mock 2: Fixed 30 English (30..59), 35 Quant (35..69), 35 Reasoning (35..69)
  if (norm.includes('ibps-po-2') || norm.includes('ibps-po-prelims-mock-2')) {
    return [
      ...sliceSection(engPool, 30, 30, 'ENGLISH', 'English Language'),
      ...sliceSection(quantPool, 35, 35, 'QUANT', 'Quantitative Aptitude'),
      ...sliceSection(reasonPool, 35, 35, 'REASONING', 'Reasoning Ability'),
    ];
  }

  // 8. SBI Clerk Mock 1: Fixed 30 English (60..89), 35 Quant (70..104), 35 Reasoning (70..104)
  if (norm.includes('sbi-clerk-1') || norm.includes('sbi-clerk-prelims-mock-1')) {
    return [
      ...sliceSection(engPool, 60, 30, 'ENGLISH', 'English Language'),
      ...sliceSection(quantPool, 70, 35, 'QUANT', 'Numerical Ability'),
      ...sliceSection(reasonPool, 70, 35, 'REASONING', 'Reasoning Ability'),
    ];
  }

  // 9. SBI Clerk Mock 2: Fixed 30 English (0..29), 35 Quant (35..69), 35 Reasoning (0..34)
  if (norm.includes('sbi-clerk-2') || norm.includes('sbi-clerk-prelims-mock-2')) {
    return [
      ...sliceSection(engPool, 0, 30, 'ENGLISH', 'English Language'),
      ...sliceSection(quantPool, 35, 35, 'QUANT', 'Numerical Ability'),
      ...sliceSection(reasonPool, 0, 35, 'REASONING', 'Reasoning Ability'),
    ];
  }

  // Default fallback: 100 fixed questions
  return [
    ...sliceSection(engPool, 0, 30, 'ENGLISH', 'English Language'),
    ...sliceSection(quantPool, 0, 35, 'QUANT', 'Quantitative Aptitude'),
    ...sliceSection(reasonPool, 0, 35, 'REASONING', 'Reasoning Ability'),
  ];
}

/**
 * Partition questions list deterministically for any exam or partition key
 */
export function partitionQuestionsList(all: Question[], partitionKey: string): Question[] {
  const normKey = (partitionKey || 'ALL').toLowerCase().trim();
  if (normKey === 'all') return all;

  // 1. IBPS PO Mains 2025 PYQ (155 Authentic Questions)
  if ((normKey.includes('ibps') && normKey.includes('2025')) || normKey === 'mock-ibps-po-2025-mains-pyq' || normKey === 'ibps-po-mains-2025-pyq') {
    return all
      .filter(q => Boolean(q.isPyq) && (q.pyqExam?.includes('IBPS PO Mains 2025') || String(q.id).toLowerCase().includes('ibps-po-2025')))
      .sort((a, b) => {
        const matchA = String(a.id).match(/-q(\d+)$/i) || String(a.id).match(/(\d+)$/);
        const matchB = String(b.id).match(/-q(\d+)$/i) || String(b.id).match(/(\d+)$/);
        const numA = matchA ? parseInt(matchA[1], 10) : 0;
        const numB = matchB ? parseInt(matchB[1], 10) : 0;
        return numA - numB;
      });
  }

  // 2. IBPS PO Prelims 2024 PYQ (100 Authentic Questions)
  if ((normKey.includes('ibps') && normKey.includes('2024')) || normKey === 'mock-ibps-po-2024-pyq' || normKey === 'ibps-po-prelims-2024-pyq') {
    return all
      .filter(q => Boolean(q.isPyq) && (q.pyqExam?.includes('IBPS PO Prelims 2024') || String(q.id).toLowerCase().includes('ibps-po-2024')))
      .sort((a, b) => {
        const matchA = String(a.id).match(/-q(\d+)$/i) || String(a.id).match(/(\d+)$/);
        const matchB = String(b.id).match(/-q(\d+)$/i) || String(b.id).match(/(\d+)$/);
        const numA = matchA ? parseInt(matchA[1], 10) : 0;
        const numB = matchB ? parseInt(matchB[1], 10) : 0;
        return numA - numB;
      });
  }

  // 3. IBPS PO Prelims 2023 PYQ (100 Authentic Questions)
  if ((normKey.includes('ibps') && normKey.includes('2023')) || normKey === 'mock-ibps-po-2023-pyq' || normKey === 'ibps-po-prelims-2023-pyq') {
    return all
      .filter(q => Boolean(q.isPyq) && (q.pyqExam?.includes('IBPS PO Prelims 2023') || String(q.id).toLowerCase().includes('ibps-po-2023')))
      .sort((a, b) => {
        const matchA = String(a.id).match(/-q(\d+)$/i) || String(a.id).match(/(\d+)$/);
        const matchB = String(b.id).match(/-q(\d+)$/i) || String(b.id).match(/(\d+)$/);
        const numA = matchA ? parseInt(matchA[1], 10) : 0;
        const numB = matchB ? parseInt(matchB[1], 10) : 0;
        return numA - numB;
      });
  }

  // 4. SBI Clerk 2024 PYQ (100 Authentic Questions)
  if (
    normKey.includes('sbi') && (normKey.includes('2024') || normKey === 'mock-sbi-clerk-2024-pyq' || normKey === 'sbi-clerk-prelims-2024-pyq')
  ) {
    return all
      .filter(q => Boolean(q.isPyq) && (q.pyqExam?.includes('SBI Clerk') || String(q.id).toLowerCase().includes('sbi')) && (q.pyqYear === 2024 || String(q.id).toLowerCase().includes('2024')))
      .sort((a, b) => {
        const matchA = String(a.id).match(/-q(\d+)$/i) || String(a.id).match(/(\d+)$/);
        const matchB = String(b.id).match(/-q(\d+)$/i) || String(b.id).match(/(\d+)$/);
        const numA = matchA ? parseInt(matchA[1], 10) : 0;
        const numB = matchB ? parseInt(matchB[1], 10) : 0;
        return numA - numB;
      });
  }

  // 5. SBI Clerk 2023-24 PYQ (100 Authentic Questions)
  if (
    normKey.includes('sbi') && (normKey.includes('2023') || normKey === 'mock-sbi-clerk-2023-pyq' || normKey === 'sbi-clerk-prelims-2023-pyq')
  ) {
    return all
      .filter(q => Boolean(q.isPyq) && (q.pyqExam?.includes('SBI Clerk') || String(q.id).toLowerCase().includes('sbi')) && (q.pyqYear === 2023 || q.pyqYear === 2024 || String(q.id).toLowerCase().includes('2024')))
      .sort((a, b) => {
        const matchA = String(a.id).match(/-q(\d+)$/i) || String(a.id).match(/(\d+)$/);
        const matchB = String(b.id).match(/-q(\d+)$/i) || String(b.id).match(/(\d+)$/);
        const numA = matchA ? parseInt(matchA[1], 10) : 0;
        const numB = matchB ? parseInt(matchB[1], 10) : 0;
        return numA - numB;
      });
  }

  // Dynamic match for any custom-created PYQ or Mock Test partition
  const dynamicMatch = all.filter(q => {
    const qPyq = (q.pyqExam || '').toLowerCase().trim();
    const qId = String(q.id).toLowerCase().trim();
    const cleanNorm = normKey.replace(/^mock-/, '');
    return (
      (qPyq && (qPyq === normKey || cleanNorm.includes(qPyq) || qPyq.includes(cleanNorm))) ||
      qId.includes(cleanNorm)
    );
  });
  if (dynamicMatch.length > 0) {
    return dynamicMatch.sort((a, b) => {
      const matchA = String(a.id).match(/-q(\d+)$/i) || String(a.id).match(/(\d+)$/);
      const matchB = String(b.id).match(/-q(\d+)$/i) || String(b.id).match(/(\d+)$/);
      const numA = matchA ? parseInt(matchA[1], 10) : 0;
      const numB = matchB ? parseInt(matchB[1], 10) : 0;
      return numA - numB;
    });
  }

  // If a custom PYQ partition was requested but has no questions yet, return empty list
  if (normKey.includes('pyq')) {
    return [];
  }

  // Sliced standard practice tests (strictly exclude any PYQ)
  const nonPyq = all.filter(q =>
    !q.isPyq &&
    !String(q.id).toLowerCase().includes('2024') &&
    !String(q.id).toLowerCase().includes('2023') &&
    !String(q.id).toLowerCase().includes('2025') &&
    !String(q.id).toLowerCase().includes('ibps-po-20') &&
    !String(q.id).toLowerCase().includes('sbi-clerk-20')
  );
  const engPool = nonPyq.filter(q => q.sectionCode === 'ENGLISH');
  const quantPool = nonPyq.filter(q => q.sectionCode === 'QUANT');
  const reasonPool = nonPyq.filter(q => q.sectionCode === 'REASONING');

  const sliceSection = (pool: Question[], start: number, count: number, secCode: string, secName: string): Question[] => {
    const list: Question[] = [];
    for (let i = 0; i < count; i++) {
      const item = pool[(start + i) % (pool.length || 1)];
      if (item) {
        list.push({
          ...item,
          sectionCode: secCode,
          sectionName: secName,
        });
      }
    }
    return list;
  };

  if (normKey.includes('ibps-po-1') || normKey.includes('ibps-po-prelims-mock-1')) {
    return [
      ...sliceSection(engPool, 0, 30, 'ENGLISH', 'English Language'),
      ...sliceSection(quantPool, 0, 35, 'QUANT', 'Quantitative Aptitude'),
      ...sliceSection(reasonPool, 0, 35, 'REASONING', 'Reasoning Ability'),
    ];
  }

  if (normKey.includes('ibps-po-2') || normKey.includes('ibps-po-prelims-mock-2')) {
    return [
      ...sliceSection(engPool, 30, 30, 'ENGLISH', 'English Language'),
      ...sliceSection(quantPool, 35, 35, 'QUANT', 'Quantitative Aptitude'),
      ...sliceSection(reasonPool, 35, 35, 'REASONING', 'Reasoning Ability'),
    ];
  }

  if (normKey.includes('sbi-clerk-1') || normKey.includes('sbi-clerk-prelims-mock-1')) {
    return [
      ...sliceSection(engPool, 60, 30, 'ENGLISH', 'English Language'),
      ...sliceSection(quantPool, 70, 35, 'QUANT', 'Numerical Ability'),
      ...sliceSection(reasonPool, 70, 35, 'REASONING', 'Reasoning Ability'),
    ];
  }

  if (normKey.includes('sbi-clerk-2') || normKey.includes('sbi-clerk-prelims-mock-2')) {
    return [
      ...sliceSection(engPool, 0, 30, 'ENGLISH', 'English Language'),
      ...sliceSection(quantPool, 35, 35, 'QUANT', 'Numerical Ability'),
      ...sliceSection(reasonPool, 0, 35, 'REASONING', 'Reasoning Ability'),
    ];
  }

  return [
    ...sliceSection(engPool, 0, 30, 'ENGLISH', 'English Language'),
    ...sliceSection(quantPool, 0, 35, 'QUANT', 'Quantitative Aptitude'),
    ...sliceSection(reasonPool, 0, 35, 'REASONING', 'Reasoning Ability'),
  ];
}

/**
 * Returns questions for an exam partition in Admin view.
 */
export function getQuestionsForExamPartition(partitionKey: string): Question[] {
  return partitionQuestionsList(getAllQuestions(), partitionKey);
}

/**
 * Builds a deterministic 100-question mock test with fixed questions.
 * Random selection is permanently removed.
 * Authentic PYQ papers (2024 and 2023) remain strictly unchanged.
 */
export function generateRandomizedMockTest(
  template: MockTest,
  _options?: {
    excludeQuestionIds?: string[];
  }
): MockTest {
  const questionsToServe = getFixedQuestionsForMockTest(template.id || template.slug);

  const updatedSections = template.sections.map(sec => {
    const count = questionsToServe.filter(q => q.sectionCode === sec.code).length;
    return {
      ...sec,
      questionCount: count || sec.questionCount,
      marks: count || sec.marks,
    };
  });

  const totalQuestions = questionsToServe.length || template.totalQuestions;
  const totalMarks = questionsToServe.reduce((acc, q) => acc + (q.marks || 1), 0) || template.totalMarks;

  return {
    ...template,
    isFixed: true,
    durationMinutes: template.durationMinutes || 60,
    totalQuestions,
    totalMarks,
    sections: updatedSections,
    questions: questionsToServe,
  };
}

/**
 * Check if store question ID matches query question ID across formats
 */
export function matchesQuestionId(storeId: number | string, queryId: number | string): boolean {
  const sStr = String(storeId).trim().toLowerCase();
  const qStr = String(queryId).trim().toLowerCase();
  if (sStr === qStr) return true;

  const sNorm = sStr.replace(/^q-json-/, '').replace(/^q-/, '');
  const qNorm = qStr.replace(/^q-json-/, '').replace(/^q-/, '');
  if (sNorm === qNorm) return true;
  if (sStr === qNorm || sNorm === qStr) return true;

  // Handle PYQ id variations like 'sbi-2024-q1' vs 'q-sbi-2024-1' or 'ibps-po-2024-prelims-q1'
  const sDigits = sStr.match(/\d+/g)?.join('');
  const qDigits = qStr.match(/\d+/g)?.join('');
  if (sStr.includes('sbi') && qStr.includes('sbi') && sDigits && qDigits && sDigits === qDigits) {
    return true;
  }
  if (sStr.includes('ibps') && qStr.includes('ibps') && sDigits && qDigits && sDigits === qDigits) {
    return true;
  }

  return false;
}

/**
 * Add a new question to the JSON database
 */
export function addQuestionToJsonDb(newQuestion: RawJsonQuestion): Question {
  const id = newQuestion.id || Date.now();
  const q: RawJsonQuestion = { ...newQuestion, id };
  questionStore.push(q);
  return normalizeQuestion(q);
}

/**
 * Update an existing question in the JSON database
 */
export function updateQuestionInJsonDb(id: number | string, updates: Partial<RawJsonQuestion>): Question | null {
  const idx = questionStore.findIndex(q => matchesQuestionId(q.id, id));
  if (idx === -1) return null;

  questionStore[idx] = {
    ...questionStore[idx],
    ...updates,
  };
  return normalizeQuestion(questionStore[idx]);
}

/**
 * Delete a question from the JSON database
 */
export function deleteQuestionFromJsonDb(id: number | string): boolean {
  const initialLen = questionStore.length;
  questionStore = questionStore.filter(q => !matchesQuestionId(q.id, id));
  return questionStore.length < initialLen;
}

/**
 * Permanently deletes all questions belonging to an Exam (or exam title) from the in-memory store.
 * Frees up memory and synchronization storage.
 */
export function deleteExamQuestionsFromStore(examId: string, examTitle?: string): number {
  const initialLen = questionStore.length;
  const targetId = examId.toLowerCase();
  const targetTitle = examTitle?.toLowerCase();

  questionStore = questionStore.filter(q => {
    const qExam = String(q.exam || '').toLowerCase();
    if (qExam === targetId) return false;
    if (qExam.replace(/^exam-/, '') === targetId.replace(/^exam-/, '')) return false;
    if (targetTitle && qExam === targetTitle) return false;
    return true;
  });

  return initialLen - questionStore.length;
}

/**
 * Synchronize questions from PostgreSQL / Admin into in-memory questionStore
 */
export function syncQuestionsToStore(questions: Question[]): void {
  for (const q of questions) {
    const idx = questionStore.findIndex(existing => matchesQuestionId(existing.id, q.id));
    const optionsRecord: Record<string, string | { text: string; imageUrl?: string }> = {};
    q.options.forEach((opt, i) => {
      const key = String.fromCharCode(65 + i);
      if (opt.imageUrl) {
        optionsRecord[key] = { text: opt.text, imageUrl: opt.imageUrl };
      } else {
        optionsRecord[key] = opt.text;
      }
    });

    if (idx !== -1) {
      questionStore[idx] = {
        ...questionStore[idx],
        question: q.text,
        imageUrl: q.imageUrl,
        passage: q.passage,
        passageImageUrl: q.passageImageUrl,
        groupId: q.groupId,
        isPyq: q.isPyq,
        pyqYear: q.pyqYear,
        pyqExam: q.pyqExam,
        difficulty: q.difficulty,
        explanation: q.explanation,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        options: optionsRecord,
        answer: String.fromCharCode(65 + Math.max(0, q.options.findIndex(o => o.isCorrect))),
      };
    } else {
      questionStore.push({
        id: q.id,
        exam: q.examId,
        section: q.sectionName,
        topic: q.topicName,
        question: q.text,
        imageUrl: q.imageUrl,
        passage: q.passage,
        passageImageUrl: q.passageImageUrl,
        groupId: q.groupId,
        isPyq: q.isPyq,
        pyqYear: q.pyqYear,
        pyqExam: q.pyqExam,
        options: optionsRecord,
        answer: String.fromCharCode(65 + Math.max(0, q.options.findIndex(o => o.isCorrect))),
        explanation: q.explanation,
        difficulty: q.difficulty,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
      });
    }
  }
}

