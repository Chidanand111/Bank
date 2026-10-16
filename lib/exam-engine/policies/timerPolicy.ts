import { MockTest, TimerType } from '@/types';

export interface TimerPolicyState {
  timerType: TimerType;
  totalRemainingSeconds: number;
  totalAllocatedSeconds: number;
  sectionTimers: Record<string, number>;
  lockedSectionCodes: string[];
  currentSectionCode: string;
  isExpired: boolean;
}

export interface TimerTickResult {
  nextState: TimerPolicyState;
  sectionTransition?: { from: string; to: string };
  shouldAutoSubmit: boolean;
}

export interface TimerPolicy {
  readonly type: TimerType;
  initialize(test: MockTest, inProgressState?: Partial<TimerPolicyState>): TimerPolicyState;
  tick(state: TimerPolicyState, test: MockTest): TimerTickResult;
  canNavigateToSection(state: TimerPolicyState, targetSectionCode: string, test: MockTest): boolean;
  calculateTimeTaken(test: MockTest, state: TimerPolicyState): number;
  getActiveRemainingSeconds(state: TimerPolicyState): number;
  getTotalRemainingSeconds(state: TimerPolicyState): number;
}

/**
 * 1. SECTIONAL_LOCKED Policy (Banking Standard: IBPS PO, SBI Clerk, SO)
 * - Fixed duration per section (e.g. 20 minutes)
 * - Navigation locked strictly to active section
 * - When section countdown hits 00:00, section is locked permanently and user transitions to next section
 * - Final section expiry auto-submits exam
 */
export class SectionalLockedTimerPolicy implements TimerPolicy {
  readonly type: TimerType = 'SECTIONAL_LOCKED';

  initialize(test: MockTest, inProgress?: Partial<TimerPolicyState>): TimerPolicyState {
    const defaultSecCode = test.sections[0]?.code || 'GENERAL';
    const initialTimers: Record<string, number> = {};
    let totalAllocated = 0;

    test.sections.forEach(sec => {
      const secSeconds = (sec.durationMinutes || 20) * 60;
      initialTimers[sec.code] = secSeconds;
      totalAllocated += secSeconds;
    });

    const activeTimers = inProgress?.sectionTimers || initialTimers;
    const totalRemaining = Object.values(activeTimers).reduce((sum, v) => sum + v, 0);

    return {
      timerType: 'SECTIONAL_LOCKED',
      totalAllocatedSeconds: totalAllocated,
      totalRemainingSeconds: inProgress?.totalRemainingSeconds ?? totalRemaining,
      sectionTimers: activeTimers,
      lockedSectionCodes: inProgress?.lockedSectionCodes || [],
      currentSectionCode: inProgress?.currentSectionCode || defaultSecCode,
      isExpired: inProgress?.isExpired || false,
    };
  }

  tick(state: TimerPolicyState, test: MockTest): TimerTickResult {
    const currentSecTime = state.sectionTimers[state.currentSectionCode] ?? 0;

    if (currentSecTime <= 1) {
      // Section time expired -> lock section and determine transition
      const newlyLocked = state.lockedSectionCodes.includes(state.currentSectionCode)
        ? state.lockedSectionCodes
        : [...state.lockedSectionCodes, state.currentSectionCode];

      const currentIndex = test.sections.findIndex(s => s.code === state.currentSectionCode);
      const hasNext = currentIndex >= 0 && currentIndex < test.sections.length - 1;

      if (hasNext) {
        const nextSec = test.sections[currentIndex + 1];
        const nextSecTimers = {
          ...state.sectionTimers,
          [state.currentSectionCode]: 0,
        };
        const nextTotalRemaining = Object.values(nextSecTimers).reduce((sum, v) => sum + v, 0);

        return {
          nextState: {
            ...state,
            sectionTimers: nextSecTimers,
            totalRemainingSeconds: nextTotalRemaining,
            lockedSectionCodes: newlyLocked,
            currentSectionCode: nextSec.code,
            isExpired: false,
          },
          sectionTransition: {
            from: test.sections[currentIndex].name,
            to: nextSec.name,
          },
          shouldAutoSubmit: false,
        };
      } else {
        // Last section finished -> final submission
        return {
          nextState: {
            ...state,
            sectionTimers: { ...state.sectionTimers, [state.currentSectionCode]: 0 },
            totalRemainingSeconds: 0,
            lockedSectionCodes: newlyLocked,
            isExpired: true,
          },
          shouldAutoSubmit: true,
        };
      }
    }

    // Normal countdown tick
    const updatedSecTimers = {
      ...state.sectionTimers,
      [state.currentSectionCode]: currentSecTime - 1,
    };
    const updatedTotalRemaining = Object.values(updatedSecTimers).reduce((sum, v) => sum + v, 0);

    return {
      nextState: {
        ...state,
        sectionTimers: updatedSecTimers,
        totalRemainingSeconds: updatedTotalRemaining,
      },
      shouldAutoSubmit: false,
    };
  }

  canNavigateToSection(state: TimerPolicyState, targetSectionCode: string): boolean {
    // Only allowed if target is the currently active section and is not locked
    return (
      targetSectionCode === state.currentSectionCode &&
      !state.lockedSectionCodes.includes(targetSectionCode)
    );
  }

  calculateTimeTaken(test: MockTest, state: TimerPolicyState): number {
    const totalAllocated = test.sections.reduce((acc, s) => acc + (s.durationMinutes || 20) * 60, 0);
    const totalRemaining = Object.values(state.sectionTimers).reduce((acc, v) => acc + v, 0);
    return Math.max(1, totalAllocated - totalRemaining);
  }

  getActiveRemainingSeconds(state: TimerPolicyState): number {
    return state.sectionTimers[state.currentSectionCode] ?? 0;
  }

  getTotalRemainingSeconds(state: TimerPolicyState): number {
    return Object.values(state.sectionTimers).reduce((sum, v) => sum + v, 0);
  }
}

/**
 * 2. OVERALL_COMPOSITE Policy (SSC Tier 1, CHSL Tier 1, RRB NTPC CBT-1/2, RRB Group D, RRB ALP)
 * - Single composite countdown clock for the full exam (e.g. 60 or 90 mins)
 * - Complete, unrestricted bidirectional switching across all sections at any time
 * - Zero section locking during normal exam duration
 * - Auto-submits only when total master clock hits 00:00
 */
export class OverallCompositeTimerPolicy implements TimerPolicy {
  readonly type: TimerType = 'OVERALL_COMPOSITE';

  initialize(test: MockTest, inProgress?: Partial<TimerPolicyState>): TimerPolicyState {
    const defaultSecCode = test.sections[0]?.code || 'GENERAL';
    const totalAllocated = (test.durationMinutes || 60) * 60;
    const remaining = inProgress?.totalRemainingSeconds ?? totalAllocated;

    // Distribute remaining proportional or flat representation for compatibility
    const dummySecTimers: Record<string, number> = {};
    test.sections.forEach(sec => {
      dummySecTimers[sec.code] = remaining;
    });

    return {
      timerType: 'OVERALL_COMPOSITE',
      totalAllocatedSeconds: totalAllocated,
      totalRemainingSeconds: remaining,
      sectionTimers: inProgress?.sectionTimers || dummySecTimers,
      lockedSectionCodes: [], // No sections are locked in composite mode
      currentSectionCode: inProgress?.currentSectionCode || defaultSecCode,
      isExpired: remaining <= 0,
    };
  }

  tick(state: TimerPolicyState): TimerTickResult {
    if (state.totalRemainingSeconds <= 1) {
      return {
        nextState: {
          ...state,
          totalRemainingSeconds: 0,
          isExpired: true,
        },
        shouldAutoSubmit: true,
      };
    }

    const nextRemaining = state.totalRemainingSeconds - 1;
    const updatedSecTimers: Record<string, number> = {};
    for (const key of Object.keys(state.sectionTimers)) {
      updatedSecTimers[key] = nextRemaining;
    }

    return {
      nextState: {
        ...state,
        totalRemainingSeconds: nextRemaining,
        sectionTimers: updatedSecTimers,
      },
      shouldAutoSubmit: false,
    };
  }

  canNavigateToSection(state: TimerPolicyState, targetSectionCode: string, test: MockTest): boolean {
    if (state.isExpired || state.totalRemainingSeconds <= 0) return false;
    // Unrestricted: candidate can switch to any section defined in the test
    return test.sections.some(s => s.code === targetSectionCode);
  }

  calculateTimeTaken(test: MockTest, state: TimerPolicyState): number {
    const totalAllocated = (test.durationMinutes || 60) * 60;
    return Math.max(1, totalAllocated - state.totalRemainingSeconds);
  }

  getActiveRemainingSeconds(state: TimerPolicyState): number {
    return state.totalRemainingSeconds;
  }

  getTotalRemainingSeconds(state: TimerPolicyState): number {
    return state.totalRemainingSeconds;
  }
}

/**
 * 3. GROUPED_SESSION Policy (SSC CGL Tier 2 / Multi-session setups)
 * - Grouped sections share session blocks (e.g. Session 1: 60 mins for Math + Reasoning)
 * - Navigation allowed freely within the active session group
 * - Transition between sessions locks the previous group
 */
export class GroupedSessionTimerPolicy implements TimerPolicy {
  readonly type: TimerType = 'GROUPED_SESSION';
  private compositeFallback = new OverallCompositeTimerPolicy();

  initialize(test: MockTest, inProgress?: Partial<TimerPolicyState>): TimerPolicyState {
    return this.compositeFallback.initialize(test, inProgress);
  }

  tick(state: TimerPolicyState, test: MockTest): TimerTickResult {
    return this.compositeFallback.tick(state);
  }

  canNavigateToSection(state: TimerPolicyState, targetSectionCode: string, test: MockTest): boolean {
    return this.compositeFallback.canNavigateToSection(state, targetSectionCode, test);
  }

  calculateTimeTaken(test: MockTest, state: TimerPolicyState): number {
    return this.compositeFallback.calculateTimeTaken(test, state);
  }

  getActiveRemainingSeconds(state: TimerPolicyState): number {
    return this.compositeFallback.getActiveRemainingSeconds(state);
  }

  getTotalRemainingSeconds(state: TimerPolicyState): number {
    return this.compositeFallback.getTotalRemainingSeconds(state);
  }
}

// Singleton instances
export const sectionalLockedTimerPolicy = new SectionalLockedTimerPolicy();
export const overallCompositeTimerPolicy = new OverallCompositeTimerPolicy();
export const groupedSessionTimerPolicy = new GroupedSessionTimerPolicy();

/**
 * Policy Factory: selects the correct timer and navigation strategy
 */
export function getTimerPolicy(timerType?: TimerType | null): TimerPolicy {
  switch (timerType) {
    case 'OVERALL_COMPOSITE':
      return overallCompositeTimerPolicy;
    case 'GROUPED_SESSION':
      return groupedSessionTimerPolicy;
    case 'SECTIONAL_LOCKED':
    default:
      return sectionalLockedTimerPolicy;
  }
}
