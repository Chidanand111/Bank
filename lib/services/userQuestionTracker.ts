/**
 * User Question History Tracker
 * Tracks all questions attempted/seen by each user to guarantee non-repeating
 * questions in subsequent exam attempts.
 */

const SEEN_QUESTIONS_KEY_PREFIX = 'bankmock_user_seen_questions_';
const GUEST_ID_KEY = 'bankmock_device_user_id';

/**
 * Get or generate a persistent user identifier on the client
 */
export function getCurrentClientUserId(): string {
  if (typeof window === 'undefined') return 'server_user';
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    return 'default_user';
  }
}

/**
 * Retrieve all question IDs that this user has already seen or attempted
 */
export function getUserSeenQuestionIds(userId: string = getCurrentClientUserId()): string[] {
  if (typeof window === 'undefined') return [];
  try {
    // 1. Direct seen questions registry
    const rawDirect = localStorage.getItem(`${SEEN_QUESTIONS_KEY_PREFIX}${userId}`);
    const directSeen: string[] = rawDirect ? JSON.parse(rawDirect) : [];

    // 2. Comprehensive check: past completed attempts in localStorage
    const attemptsRaw = localStorage.getItem('bankmock_attempts');
    const attempts = attemptsRaw ? JSON.parse(attemptsRaw) : [];
    const fromAttempts = new Set<string>();

    if (Array.isArray(attempts)) {
      for (const att of attempts) {
        if (att.questionDetails && Array.isArray(att.questionDetails)) {
          att.questionDetails.forEach((qd: { questionId?: string; question?: { id?: string } }) => {
            const qId = qd.questionId || qd.question?.id;
            if (qId) fromAttempts.add(qId);
          });
        }
        if (att.userResponses && typeof att.userResponses === 'object') {
          Object.keys(att.userResponses).forEach(qid => fromAttempts.add(qid));
        }
      }
    }

    const merged = Array.from(new Set([...directSeen, ...Array.from(fromAttempts)]));
    return merged.filter(Boolean);
  } catch (err) {
    console.error('Failed to get user seen questions:', err);
    return [];
  }
}

/**
 * Record question IDs as seen for the user
 */
export function recordUserSeenQuestions(userId: string = getCurrentClientUserId(), questionIds: string[]): void {
  if (typeof window === 'undefined' || !questionIds || questionIds.length === 0) return;
  try {
    const existing = getUserSeenQuestionIds(userId);
    const updated = Array.from(new Set([...existing, ...questionIds]));
    localStorage.setItem(`${SEEN_QUESTIONS_KEY_PREFIX}${userId}`, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to record user seen questions:', err);
  }
}

/**
 * Reset question history for a user (allowing a fresh restart)
 */
export function resetUserSeenQuestions(userId: string = getCurrentClientUserId()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${SEEN_QUESTIONS_KEY_PREFIX}${userId}`);
  } catch (err) {
    console.error('Failed to reset user seen questions:', err);
  }
}
