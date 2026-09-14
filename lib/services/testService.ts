import { AttemptResult, DashboardStats, Exam, MockTest } from '@/types';
import { EXAMS_DATA } from '../data/exams';
import { MOCK_TESTS_DATA } from '../data/mockTests';
import { INITIAL_DASHBOARD_STATS, SAMPLE_ATTEMPTS } from '../data/sampleAttempts';
import { generateRandomizedMockTest } from '../db/questionDb';

import { recordUserSeenQuestions } from './userQuestionTracker';

const ATTEMPTS_STORAGE_KEY = 'bankmock_attempts';

export async function getExams(): Promise<Exam[]> {
  return EXAMS_DATA;
}

export async function getExamBySlug(slug: string): Promise<Exam | null> {
  const exam = EXAMS_DATA.find(e => e.slug === slug);
  return exam || null;
}

export async function getMockTests(examSlug?: string): Promise<MockTest[]> {
  if (examSlug) {
    return MOCK_TESTS_DATA.filter(m => m.examSlug === examSlug);
  }
  return MOCK_TESTS_DATA;
}

export async function getMockTestById(
  idOrSlug: string,
  excludeQuestionIds?: string[]
): Promise<MockTest | null> {
  const test = MOCK_TESTS_DATA.find(m => m.id === idOrSlug || m.slug === idOrSlug);
  if (!test) return null;

  // 1. Fetch live questions directly with diagrams from Neon PostgreSQL via Server Action
  try {
    const { getLiveExamQuestionsAction } = await import('./adminService');
    const liveQuestions = await getLiveExamQuestionsAction(test.id || test.slug);
    if (liveQuestions && liveQuestions.length > 0) {
      const updatedSections = test.sections.map(sec => {
        const count = liveQuestions.filter(q => q.sectionCode === sec.code).length;
        return {
          ...sec,
          questionCount: count || sec.questionCount,
          marks: count || sec.marks,
        };
      });

      return {
        ...test,
        isFixed: true,
        durationMinutes: test.durationMinutes || 60,
        totalQuestions: liveQuestions.length,
        totalMarks: liveQuestions.reduce((acc, q) => acc + (q.marks || 1), 0) || test.totalMarks,
        sections: updatedSections,
        questions: liveQuestions,
      };
    }
  } catch (err) {
    console.warn('Fallback to local deterministic questions for test:', err);
  }

  // Fallback to local deterministic questions
  return generateRandomizedMockTest(test, { excludeQuestionIds });
}

export function saveAttemptResult(result: AttemptResult): void {
  if (typeof window === 'undefined') return;
  try {
    const existingStr = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    const existing: AttemptResult[] = existingStr ? JSON.parse(existingStr) : [];
    // Remove if duplicate ID exists
    const filtered = existing.filter(a => a.id !== result.id);
    filtered.unshift(result);
    localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(filtered));

    // Record question IDs as seen for this user so future exams won't repeat them
    if (result.questionDetails && Array.isArray(result.questionDetails)) {
      const qIds = result.questionDetails
        .map(qd => qd.question?.id)
        .filter(Boolean) as string[];
      recordUserSeenQuestions(undefined, qIds);
    }
  } catch (err) {
    console.error('Failed to save attempt in localStorage:', err);
  }
}

export function getAttemptResultById(attemptId: string): AttemptResult | null {
  if (typeof window !== 'undefined') {
    try {
      const existingStr = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
      if (existingStr) {
        const attempts: AttemptResult[] = JSON.parse(existingStr);
        const found = attempts.find(a => a.id === attemptId);
        if (found) return found;
      }
    } catch (err) {
      console.error('Failed to parse attempts from localStorage:', err);
    }
  }

  // Fallback to sample attempts
  const sample = SAMPLE_ATTEMPTS.find(a => a.id === attemptId);
  return sample || null;
}

export function getDashboardStats(): DashboardStats {
  let userAttempts: AttemptResult[] = [];
  if (typeof window !== 'undefined') {
    try {
      const existingStr = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
      if (existingStr) {
        userAttempts = JSON.parse(existingStr);
      }
    } catch (err) {
      console.error('Error loading attempts:', err);
    }
  }

  const allAttempts = [...userAttempts, ...SAMPLE_ATTEMPTS];

  if (allAttempts.length === 0) {
    return INITIAL_DASHBOARD_STATS;
  }

  const totalTestsAttempted = allAttempts.length;
  const totalScore = allAttempts.reduce((acc, curr) => acc + curr.score, 0);
  const averageScore = parseFloat((totalScore / totalTestsAttempted).toFixed(2));
  const bestScore = Math.max(...allAttempts.map(a => a.score));
  const totalAccuracy = allAttempts.reduce((acc, curr) => acc + curr.accuracy, 0);
  const averageAccuracy = parseFloat((totalAccuracy / totalTestsAttempted).toFixed(1));
  const totalTimeSpentSeconds = allAttempts.reduce((acc, curr) => acc + curr.timeTakenSeconds, 0);

  return {
    totalTestsAttempted,
    averageScore,
    bestScore,
    averageAccuracy,
    totalTimeSpentMinutes: Math.round(totalTimeSpentSeconds / 60),
    recentAttempts: allAttempts.slice(0, 5),
    sectionPerformance: INITIAL_DASHBOARD_STATS.sectionPerformance,
    weakTopics: INITIAL_DASHBOARD_STATS.weakTopics,
  };
}
