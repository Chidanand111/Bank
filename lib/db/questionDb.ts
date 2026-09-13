import { Question, Option, Difficulty, MockTest } from '@/types';
import rawQuestionsData from '@/data/questions.json';

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

// In-memory working database initialized from JSON file
let questionStore: RawJsonQuestion[] = [...(rawQuestionsData as RawJsonQuestion[])];

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
export function generateRandomizedMockTest(
  template: MockTest,
  options?: {
    excludeQuestionIds?: string[];
  }
): MockTest {
  // Strict Isolation for Fixed / PYQ Mock Tests:
  // Strictly serve only its authentic questions in exact order.
  // NO random or external questions are EVER injected into this exam.
  if (template.isFixed || template.isPyq) {
    const allQuestions = questionStore.map(normalizeQuestion);
    const isThisPyqQuestion = (q: Question) => {
      if (template.slug === 'sbi-clerk-prelims-2024-pyq' || template.id === 'mock-sbi-clerk-2024-pyq') {
        const idStr = String(q.id).toLowerCase();
        return (
          Boolean(q.isPyq && q.pyqYear === 2024) ||
          (q.pyqExam ? q.pyqExam.toLowerCase().includes('2024') : false) ||
          idStr.includes('sbi-2024') ||
          idStr.includes('sbi-clerk-2024')
        );
      }
      return Boolean(q.isPyq);
    };

    const dedicatedQuestions = allQuestions.filter(isThisPyqQuestion);
    const questionsToServe = dedicatedQuestions.length > 0 ? dedicatedQuestions : template.questions;

    const updatedSections = template.sections.map(sec => {
      const count = questionsToServe.filter(q => q.sectionCode === sec.code).length;
      return {
        ...sec,
        questionCount: count || sec.questionCount,
        marks: count || sec.marks,
      };
    });

    const totalQuestions = questionsToServe.length || template.totalQuestions;
    const totalMarks = questionsToServe.reduce((acc, q) => acc + q.marks, 0) || template.totalMarks;

    return {
      ...template,
      totalQuestions,
      totalMarks,
      sections: updatedSections,
      questions: questionsToServe,
    };
  }

  const randomizedQuestions: Question[] = [];
  const sessionUsedIds = new Set<string>();
  const userExcludedIds = new Set<string>(options?.excludeQuestionIds || []);

  // Standard banking prelims quotas: 35 Reasoning, 35 Quantitative Aptitude, 30 English Language
  const SECTION_QUOTAS: Record<string, number> = {
    REASONING: 35,
    QUANT: 35,
    ENGLISH: 30,
  };

  // Ensure sections have standard 100-question quotas
  const updatedSections = template.sections.map(sec => {
    const defaultQuota = SECTION_QUOTAS[sec.code] || 35;
    const targetCount = sec.questionCount || defaultQuota;
    const targetMarks = sec.marks || targetCount;
    const duration = sec.durationMinutes || 20;
    return {
      ...sec,
      questionCount: targetCount,
      marks: targetMarks,
      durationMinutes: duration,
    };
  });

  for (const section of updatedSections) {
    const neededCount = section.questionCount;
    const combinedExcludes = Array.from(new Set([...Array.from(userExcludedIds), ...Array.from(sessionUsedIds)]));

    const picked = pickRandomQuestions({
      examSlug: template.examSlug,
      sectionCode: section.code,
      count: neededCount,
      excludeIds: combinedExcludes,
    });

    picked.forEach(q => {
      sessionUsedIds.add(q.id);
      randomizedQuestions.push({
        ...q,
        sectionId: section.id,
        sectionCode: section.code,
        sectionName: section.name,
      });
    });
  }

  // Safety guarantee: If total questions picked is less than 100, fill remaining up to 100
  if (randomizedQuestions.length < 100) {
    const allQuestions = questionStore.map(normalizeQuestion);
    const unused = allQuestions.filter(q => !sessionUsedIds.has(q.id));
    const shuffledUnused = shuffleArray(unused);

    for (const q of shuffledUnused) {
      if (randomizedQuestions.length >= 100) break;
      sessionUsedIds.add(q.id);
      randomizedQuestions.push(q);
    }

    // If still under 100 (e.g. tiny test db), cycle questions with cloned IDs
    let cycleIdx = 0;
    while (randomizedQuestions.length < 100 && randomizedQuestions.length > 0) {
      const baseQ = randomizedQuestions[cycleIdx % randomizedQuestions.length];
      const cloneId = `${baseQ.id}-dup-${randomizedQuestions.length + 1}`;
      randomizedQuestions.push({
        ...baseQ,
        id: cloneId,
      });
      cycleIdx++;
    }
  }

  const totalQuestions = randomizedQuestions.length;
  const totalMarks = randomizedQuestions.reduce((acc, q) => acc + q.marks, 0);

  return {
    ...template,
    durationMinutes: 60,
    totalQuestions: totalQuestions,
    totalMarks: totalMarks,
    sections: updatedSections,
    questions: randomizedQuestions,
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
