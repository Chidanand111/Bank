import { Question, Option, Difficulty, MockTest } from '@/types';
import rawQuestionsData from '@/data/questions.json';

export interface RawJsonQuestion {
  id: number | string;
  exam: string;
  section: string;
  topic: string;
  question: string;
  options: Record<string, string>;
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
  const qId = typeof raw.id === 'number' ? `q-json-${raw.id}` : raw.id;
  const { examId } = mapExamToId(raw.exam);
  const { sectionCode, sectionId, sectionName } = mapSectionToCode(raw.section);
  const topicId = `top-${sectionCode.toLowerCase()}-${(raw.topic || 'general').toLowerCase().replace(/\s+/g, '-')}`;

  const optionKeys = Object.keys(raw.options || {}).sort();
  const options: Option[] = optionKeys.map((key, idx) => {
    const isCorrect = key.trim().toUpperCase() === (raw.answer || '').trim().toUpperCase();
    return {
      id: `opt-${qId}-${key.toLowerCase()}`,
      questionId: qId,
      text: raw.options[key],
      isCorrect,
      order: idx + 1,
    };
  });

  return {
    id: qId,
    text: raw.question,
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
 * Pick random questions from the JSON database by exam and/or section,
 * prioritizing questions the user has NOT seen before to prevent question repetition.
 */
export function pickRandomQuestions(params: {
  examSlug?: string;
  sectionCode?: string;
  count: number;
  excludeIds?: string[];
}): Question[] {
  const { examSlug, sectionCode, count, excludeIds = [] } = params;

  let pool = questionStore.map(normalizeQuestion);

  if (examSlug) {
    const isSbi = examSlug.includes('sbi');
    pool = pool.filter(q => {
      if (isSbi) return q.examId.includes('sbi');
      return q.examId.includes('ibps');
    });
  }

  if (sectionCode) {
    pool = pool.filter(q => q.sectionCode === sectionCode);
  }

  const excludeSet = new Set(excludeIds);

  // Separate into questions the user has never seen vs questions the user has previously seen
  const unseenPool = pool.filter(q => !excludeSet.has(q.id));
  const seenPool = pool.filter(q => excludeSet.has(q.id));

  const shuffledUnseen = shuffleArray(unseenPool);
  const shuffledSeen = shuffleArray(seenPool);

  // If there are enough unseen questions, pick 100% from unseen pool (zero repeats!)
  if (shuffledUnseen.length >= count) {
    return shuffledUnseen.slice(0, count);
  }

  // If unseen pool is smaller than count, take all available unseen questions
  // and supplement only the remainder from the seen pool
  const picked = [...shuffledUnseen];
  const remainingNeeded = count - picked.length;
  picked.push(...shuffledSeen.slice(0, remainingNeeded));
  return picked;
}

/**
 * Dynamically builds a mock test by randomly picking questions for each section from the JSON database,
 * filtering out questions the user has previously taken in past exams so questions do not repeat.
 */
export function generateRandomizedMockTest(
  template: MockTest,
  options?: {
    excludeQuestionIds?: string[];
  }
): MockTest {
  const randomizedQuestions: Question[] = [];
  const sessionUsedIds = new Set<string>();
  const userExcludedIds = new Set<string>(options?.excludeQuestionIds || []);

  for (const section of template.sections) {
    const neededCount = section.questionCount || 10;

    // Exclude both questions seen in previous exams AND questions picked earlier in this exam
    const combinedExcludes = Array.from(new Set([...Array.from(userExcludedIds), ...Array.from(sessionUsedIds)]));

    const picked = pickRandomQuestions({
      examSlug: template.examSlug,
      sectionCode: section.code,
      count: neededCount,
      excludeIds: combinedExcludes,
    });

    picked.forEach(q => {
      sessionUsedIds.add(q.id);
      randomizedQuestions.push(q);
    });
  }

  // Calculate actual total marks and total questions
  const totalMarks = randomizedQuestions.reduce((acc, q) => acc + q.marks, 0);
  const totalQuestions = randomizedQuestions.length;

  return {
    ...template,
    totalQuestions: totalQuestions > 0 ? totalQuestions : template.totalQuestions,
    totalMarks: totalMarks > 0 ? totalMarks : template.totalMarks,
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
