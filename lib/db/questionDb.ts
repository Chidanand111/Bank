import { Question, Option, Difficulty, MockTest } from '@/types';
import rawQuestionsData from '@/data/questions.json';
import pyqQuestionsData from '@/data/sbi_clerk_2024_pyq.json';

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
const combinedRaw = [...(rawQuestionsData as RawJsonQuestion[]), ...(pyqQuestionsData as RawJsonQuestion[])];
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
  if (norm.includes('reason')) {
    return { sectionCode: 'REASONING', sectionId: 'sec-ibps-p-reason', sectionName: 'Reasoning Ability' };
  }
  if (norm.includes('quant') || norm.includes('numer') || norm.includes('math')) {
    return { sectionCode: 'QUANT', sectionId: 'sec-ibps-p-quant', sectionName: 'Quantitative Aptitude' };
  }
  if (norm.includes('eng')) {
    return { sectionCode: 'ENGLISH', sectionId: 'sec-ibps-p-eng', sectionName: 'English Language' };
  }
  if (norm.includes('general') || norm.includes('aware') || norm.includes('ga')) {
    return { sectionCode: 'FINANCIAL_AWARENESS', sectionId: 'sec-sbi-m-ga', sectionName: 'General / Financial Awareness' };
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

  const isPyq = raw.isPyq ?? Boolean(raw.exam?.toLowerCase().includes('2024') || raw.exam?.toLowerCase().includes('pyq'));
  const pyqYear = raw.pyqYear ?? (raw.exam?.includes('2024') ? 2024 : undefined);

  return {
    id: qId,
    text: raw.question,
    imageUrl: raw.imageUrl,
    passage: raw.passage,
    passageImageUrl: raw.passageImageUrl,
    groupId: raw.groupId,
    isPyq,
    pyqYear,
    pyqExam: raw.pyqExam || (isPyq ? 'SBI Clerk Prelims 2024' : undefined),
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

  // 1. SBI Clerk 2024 PYQ (Authentic 100 official questions)
  if (norm.includes('2024-pyq') || norm.includes('2024_pyq') || norm === 'pyq-2024') {
    const pyq2024 = allQuestions
      .filter(q => Boolean(q.isPyq) && (q.pyqYear === 2024 || String(q.id).toLowerCase().includes('2024')))
      .sort((a, b) => {
        const numA = parseInt(String(a.id).replace(/\D+/g, ''), 10) || 0;
        const numB = parseInt(String(b.id).replace(/\D+/g, ''), 10) || 0;
        return numA - numB;
      });
    if (pyq2024.length > 0) return pyq2024;
  }

  // 2. SBI Clerk 2023-24 PYQ (Authentic 100 official questions)
  if (norm.includes('2023-pyq') || norm.includes('2023_pyq') || norm === 'pyq-2023') {
    const pyq2023 = allQuestions
      .filter(q => Boolean(q.isPyq) && (q.pyqYear === 2023 || q.pyqYear === 2024 || String(q.id).toLowerCase().includes('2024')))
      .sort((a, b) => {
        const numA = parseInt(String(a.id).replace(/\D+/g, ''), 10) || 0;
        const numB = parseInt(String(b.id).replace(/\D+/g, ''), 10) || 0;
        return numA - numB;
      });
    if (pyq2023.length > 0) return pyq2023;
  }

  // Standard practice questions partitioned by section
  const nonPyqQuestions = allQuestions.filter(q => !q.isPyq && !String(q.id).toLowerCase().includes('2024'));

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

  // 3. IBPS PO Mock 1: Fixed 30 English (0..29), 35 Quant (0..34), 35 Reasoning (0..34)
  if (norm.includes('ibps-po-1') || norm.includes('ibps-po-prelims-mock-1')) {
    return [
      ...sliceSection(engPool, 0, 30, 'ENGLISH', 'English Language'),
      ...sliceSection(quantPool, 0, 35, 'QUANT', 'Quantitative Aptitude'),
      ...sliceSection(reasonPool, 0, 35, 'REASONING', 'Reasoning Ability'),
    ];
  }

  // 4. IBPS PO Mock 2: Fixed 30 English (30..59), 35 Quant (35..69), 35 Reasoning (35..69)
  if (norm.includes('ibps-po-2') || norm.includes('ibps-po-prelims-mock-2')) {
    return [
      ...sliceSection(engPool, 30, 30, 'ENGLISH', 'English Language'),
      ...sliceSection(quantPool, 35, 35, 'QUANT', 'Quantitative Aptitude'),
      ...sliceSection(reasonPool, 35, 35, 'REASONING', 'Reasoning Ability'),
    ];
  }

  // 5. SBI Clerk Mock 1: Fixed 30 English (60..89), 35 Quant (70..104), 35 Reasoning (70..104)
  if (norm.includes('sbi-clerk-1') || norm.includes('sbi-clerk-prelims-mock-1')) {
    return [
      ...sliceSection(engPool, 60, 30, 'ENGLISH', 'English Language'),
      ...sliceSection(quantPool, 70, 35, 'QUANT', 'Numerical Ability'),
      ...sliceSection(reasonPool, 70, 35, 'REASONING', 'Reasoning Ability'),
    ];
  }

  // 6. SBI Clerk Mock 2: Fixed 30 English (0..29), 35 Quant (35..69), 35 Reasoning (0..34)
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
 * Returns questions for an exam partition in Admin view.
 */
export function getQuestionsForExamPartition(partitionKey: string): Question[] {
  const allQuestions = getAllQuestions();
  const normKey = (partitionKey || 'ALL').toLowerCase().trim();

  if (normKey === 'all') {
    return allQuestions;
  }

  if (normKey === 'pyq-2024' || normKey === 'mock-sbi-clerk-2024-pyq' || normKey === 'sbi-clerk-prelims-2024-pyq') {
    return allQuestions
      .filter(q => Boolean(q.isPyq) && (q.pyqYear === 2024 || String(q.id).toLowerCase().includes('2024')))
      .sort((a, b) => {
        const numA = parseInt(String(a.id).replace(/\D+/g, ''), 10) || 0;
        const numB = parseInt(String(b.id).replace(/\D+/g, ''), 10) || 0;
        return numA - numB;
      });
  }

  if (normKey === 'pyq-2023' || normKey === 'mock-sbi-clerk-2023-pyq' || normKey === 'sbi-clerk-prelims-2023-pyq') {
    return allQuestions
      .filter(q => Boolean(q.isPyq) && (q.pyqYear === 2023 || q.pyqYear === 2024 || String(q.id).toLowerCase().includes('2024')))
      .sort((a, b) => {
        const numA = parseInt(String(a.id).replace(/\D+/g, ''), 10) || 0;
        const numB = parseInt(String(b.id).replace(/\D+/g, ''), 10) || 0;
        return numA - numB;
      });
  }

  return getFixedQuestionsForMockTest(partitionKey);
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
  const idx = questionStore.findIndex(q => String(q.id) === String(id));
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
  questionStore = questionStore.filter(q => String(q.id) !== String(id));
  return questionStore.length < initialLen;
}
