import { MockTest, TimerType } from '@/types';

export interface ExamTimingState {
  timerType: TimerType;
  isComposite: boolean;
  compositeRemainingSeconds: number;
  sectionTimers: Record<string, number>;
  lockedSectionCodes: string[];
  currentSectionCode: string;
}

export interface ExamTimingSummary {
  activeSectionRemainingSeconds: number;
  totalRemainingSeconds: number;
  isCurrentSectionExpired: boolean;
  isExamExpired: boolean;
  isInteractionDisabled: boolean;
}

export interface ClockSyncResult {
  effectiveRemaining: number;
  isExpired: boolean;
  clockTampered: boolean;
}

/**
 * Determines whether the exam uses a single overall composite clock (e.g. SSC, Railway)
 * or strictly locked sectional countdowns (e.g. Banking: IBPS, SBI).
 */
export function isExamComposite(
  test: { timerType?: TimerType; allowSectionSwitch?: boolean } | null | undefined
): boolean {
  if (!test) return false;
  return test.timerType === 'OVERALL_COMPOSITE' || Boolean(test.allowSectionSwitch);
}

/**
 * Calculates authoritative remaining time for active section and total exam.
 * Fixes composite timer duplication bug:
 * - In composite exams, total remaining time equals the single master clock (NEVER multiplied by section count).
 * - In sectional locked exams, total remaining time is the sum of unexpired / unstarted sections.
 * - In single section exams, active section time and total time are identical.
 */
export function calculateExamTimeRemaining(params: {
  test: MockTest | null;
  isComposite: boolean;
  compositeRemainingSeconds: number;
  sectionTimers: Record<string, number>;
  lockedSectionCodes: string[];
  currentSectionCode: string;
  isSubmitting?: boolean;
}): ExamTimingSummary {
  const {
    test,
    isComposite,
    compositeRemainingSeconds,
    sectionTimers,
    lockedSectionCodes,
    currentSectionCode,
    isSubmitting = false,
  } = params;

  if (!test) {
    return {
      activeSectionRemainingSeconds: 0,
      totalRemainingSeconds: 0,
      isCurrentSectionExpired: true,
      isExamExpired: true,
      isInteractionDisabled: true,
    };
  }

  // 1. Single Section Exam (e.g. Sectional practice test or single-subject paper)
  const isSingleSection = (test.sections || []).length <= 1;

  if (isComposite) {
    const remaining = Math.max(0, compositeRemainingSeconds);
    const isExpired = remaining <= 0;
    return {
      activeSectionRemainingSeconds: remaining,
      totalRemainingSeconds: remaining, // Master countdown only — NEVER summed across sections
      isCurrentSectionExpired: isExpired,
      isExamExpired: isExpired,
      isInteractionDisabled: isExpired || isSubmitting,
    };
  }

  if (isSingleSection) {
    const secCode = currentSectionCode || test.sections[0]?.code || 'GENERAL';
    const secDefaultSecs = ((test.sections[0]?.durationMinutes) || test.durationMinutes || 20) * 60;
    const remaining = Math.max(0, sectionTimers[secCode] ?? secDefaultSecs);
    const isLocked = lockedSectionCodes.includes(secCode);
    const isExpired = remaining <= 0 || isLocked;

    return {
      activeSectionRemainingSeconds: remaining,
      totalRemainingSeconds: remaining,
      isCurrentSectionExpired: isExpired,
      isExamExpired: isExpired,
      isInteractionDisabled: isExpired || isSubmitting,
    };
  }

  // 2. Multi-Section SECTIONAL_LOCKED Exam (e.g. IBPS PO / SBI Clerk)
  const activeSecObj = test.sections.find(s => s.code === currentSectionCode) || test.sections[0];
  const activeDefaultSecs = (activeSecObj?.durationMinutes || 20) * 60;
  const activeRemaining = Math.max(
    0,
    sectionTimers[currentSectionCode] ?? activeDefaultSecs
  );

  const isCurrentLocked = lockedSectionCodes.includes(currentSectionCode);
  const isCurrentSectionExpired = activeRemaining <= 0 || isCurrentLocked;

  // Total remaining is the sum of remaining seconds across all unexpired sections
  let totalRemaining = 0;
  for (const sec of test.sections) {
    if (lockedSectionCodes.includes(sec.code)) {
      continue; // Expired/locked sections contribute 0
    }
    const secRemaining = sectionTimers[sec.code] ?? ((sec.durationMinutes || 20) * 60);
    totalRemaining += Math.max(0, secRemaining);
  }

  const allSectionsLocked = test.sections.every(s => lockedSectionCodes.includes(s.code));
  const isExamExpired = totalRemaining <= 0 || allSectionsLocked;

  return {
    activeSectionRemainingSeconds: activeRemaining,
    totalRemainingSeconds: totalRemaining,
    isCurrentSectionExpired,
    isExamExpired,
    isInteractionDisabled: isCurrentSectionExpired || isExamExpired || isSubmitting,
  };
}

/**
 * Enforces monotonic countdown protection against client-side clock rollback or manipulation.
 * Also accounts for true wall-clock time elapsed while the browser tab was closed or suspended.
 */
export function computeMonotonicRemainingTime(params: {
  sessionDeadline: number;
  lastRecordedRemaining: number;
  lastHeartbeatTime?: number;
  now?: number;
}): ClockSyncResult {
  const now = params.now ?? Date.now();
  const wallClockRemaining = Math.max(0, Math.floor((params.sessionDeadline - now) / 1000));

  let clockTampered = false;

  // Detect backwards clock manipulation
  if (
    (typeof params.lastHeartbeatTime === 'number' && now < params.lastHeartbeatTime - 2000) ||
    wallClockRemaining > params.lastRecordedRemaining
  ) {
    clockTampered = true;
  }

  // Authoritative constraint: remaining time can NEVER exceed lastRecordedRemaining
  const effectiveRemaining = Math.max(
    0,
    Math.min(params.lastRecordedRemaining, wallClockRemaining)
  );

  const isExpired = effectiveRemaining <= 0 || now >= params.sessionDeadline;

  return {
    effectiveRemaining,
    isExpired,
    clockTampered,
  };
}

/**
 * On page resume or reload for SECTIONAL_LOCKED exams:
 * Checks which sections expired while the candidate was away and adjusts the active section.
 */
export function syncSectionalStateOnResume(params: {
  sections: { code: string; durationMinutes?: number }[];
  sessionStartTime: number;
  currentSectionTimers: Record<string, number>;
  lockedSectionCodes: string[];
  now?: number;
}): {
  updatedSectionTimers: Record<string, number>;
  updatedLockedSections: string[];
  activeSectionCode: string;
  isAllExpired: boolean;
} {
  const { sections, sessionStartTime, currentSectionTimers, lockedSectionCodes } = params;
  const now = params.now ?? Date.now();
  const totalElapsedSecs = Math.max(0, Math.floor((now - sessionStartTime) / 1000));

  const updatedSectionTimers = { ...currentSectionTimers };
  const updatedLockedSections = [...lockedSectionCodes];

  let cumulativeTime = 0;
  let activeSectionCode = sections[0]?.code || 'GENERAL';
  let foundActive = false;

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const secAllocated = (sec.durationMinutes || 20) * 60;
    const secEndTime = cumulativeTime + secAllocated;

    if (totalElapsedSecs >= secEndTime) {
      // This section has completely expired
      if (!updatedLockedSections.includes(sec.code)) {
        updatedLockedSections.push(sec.code);
      }
      updatedSectionTimers[sec.code] = 0;
    } else if (totalElapsedSecs >= cumulativeTime && !foundActive) {
      // Currently within this section's window
      foundActive = true;
      activeSectionCode = sec.code;
      const remainingInSec = secAllocated - (totalElapsedSecs - cumulativeTime);
      updatedSectionTimers[sec.code] = Math.max(0, remainingInSec);
    } else if (foundActive) {
      // Subsequent section that has not yet started
      if (!updatedSectionTimers[sec.code] || updatedSectionTimers[sec.code] > secAllocated) {
        updatedSectionTimers[sec.code] = secAllocated;
      }
    }

    cumulativeTime += secAllocated;
  }

  const isAllExpired = totalElapsedSecs >= cumulativeTime || sections.every(s => updatedLockedSections.includes(s.code));

  return {
    updatedSectionTimers,
    updatedLockedSections,
    activeSectionCode: isAllExpired ? (sections[sections.length - 1]?.code || activeSectionCode) : activeSectionCode,
    isAllExpired,
  };
}
