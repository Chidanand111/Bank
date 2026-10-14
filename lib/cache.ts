/**
 * lib/cache.ts
 *
 * Centralised caching layer for expensive database reads.
 *
 * Strategy:
 *  - `unstable_cache`   → Next.js full-route cache (persists across requests, supports
 *                          tag-based invalidation with revalidateTag / revalidatePath).
 *  - React `cache`      → per-request memoisation (deduplicates identical calls within
 *                          the same server render pass; costs nothing on repeated calls).
 *
 * Cache tags mirror the mutation sites in adminService.ts so that writes
 * can surgically bust only the stale entries.
 *
 * TTL / revalidation:
 *  - Questions & mock-test details: 5 minutes (content rarely changes mid-session)
 *  - Exam list: 10 minutes (very stable)
 *  - Mock-test list: 5 minutes
 */

import { unstable_cache } from 'next/cache';
import { cache } from 'react';

// ─── Cache tag constants ──────────────────────────────────────────────────────

export const CACHE_TAGS = {
  questions: 'questions',
  exams: 'exams',
  mockTests: 'mock-tests',
  liveQuestions: (testId: string) => `live-questions-${testId}`,
} as const;

// ─── TTLs (seconds) ───────────────────────────────────────────────────────────

const TTL = {
  questions: 300,   // 5 min
  exams: 600,       // 10 min
  mockTests: 300,   // 5 min
  liveQuestions: 300,
} as const;

// ─── Cached question loader ───────────────────────────────────────────────────

/**
 * Returns the full questions list from Neon, cached for TTL seconds.
 * Invalidated by: createQuestionAction, updateQuestionAction, deleteQuestionAction,
 *                 bulkImportQuestionsAction.
 */
export const getCachedQuestions = unstable_cache(
  async () => {
    const { loadFreshQuestionsFromDb } = await import('./services/adminService');
    return loadFreshQuestionsFromDb();
  },
  ['questions-list'],
  { tags: [CACHE_TAGS.questions], revalidate: TTL.questions }
);

// ─── Cached exam loader ───────────────────────────────────────────────────────

/**
 * Returns the merged (DB + static) exam list, cached for TTL seconds.
 * Invalidated by: createExamAction, updateExamTitleAction, deleteExamAction,
 *                 toggleExamPublishAction.
 */
export const getCachedExams = unstable_cache(
  async () => {
    const { getAdminExams } = await import('./services/adminService');
    return getAdminExams();
  },
  ['exams-list'],
  { tags: [CACHE_TAGS.exams], revalidate: TTL.exams }
);

// ─── Cached mock-test list loader ────────────────────────────────────────────

/**
 * Returns the merged (DB + static) mock-test list, cached for TTL seconds.
 * Invalidated by: createMockTestAction, deleteMockTestAction,
 *                 updateMockTestTitleAction, toggleMockTestPublishAction.
 */
export const getCachedMockTests = unstable_cache(
  async () => {
    const { loadFreshMockTestsFromDb } = await import('./services/adminService');
    return loadFreshMockTestsFromDb();
  },
  ['mock-tests-list'],
  { tags: [CACHE_TAGS.mockTests], revalidate: TTL.mockTests }
);

// ─── Cached per-test live questions ──────────────────────────────────────────

/**
 * Returns the ordered question list for a specific mock test, cached per testId.
 * Invalidated by: createQuestionAction (with mockTestId), deleteQuestionAction,
 *                 updateQuestionAction.
 */
export const getCachedLiveQuestions = (testIdOrSlug: string) =>
  unstable_cache(
    async () => {
      const { getLiveExamQuestionsAction } = await import('./services/adminService');
      return getLiveExamQuestionsAction(testIdOrSlug);
    },
    [`live-questions-${testIdOrSlug}`],
    {
      tags: [CACHE_TAGS.liveQuestions(testIdOrSlug), CACHE_TAGS.questions],
      revalidate: TTL.liveQuestions,
    }
  )();

// ─── Per-request deduplication (React cache) ─────────────────────────────────
// These wrappers collapse duplicate DB calls that happen during a single render
// pass (e.g. layout + page both loading exams). They do NOT persist across requests.

export const dedupedGetExams = cache(getCachedExams);
export const dedupedGetMockTests = cache(getCachedMockTests);
export const dedupedGetQuestions = cache(getCachedQuestions);

// ─── Cache invalidation helpers ───────────────────────────────────────────────
// Import and call these from mutation server actions after writes succeed.

export async function invalidateQuestionsCache() {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(CACHE_TAGS.questions);
}

export async function invalidateExamsCache() {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(CACHE_TAGS.exams);
}

export async function invalidateMockTestsCache() {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(CACHE_TAGS.mockTests);
}

export async function invalidateLiveQuestionsCache(testIdOrSlug: string) {
  const { revalidateTag } = await import('next/cache');
  revalidateTag(CACHE_TAGS.liveQuestions(testIdOrSlug));
}
