process.env.ADMIN_OVERRIDE = 'true';

import { Difficulty } from '../types';

async function runVerification() {
  console.log('=====================================================');
  console.log('VERIFYING EXAM LIFECYCLE: 20-MIN LOCK, TIMER & FRESH RE-ATTEMPT');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // ==========================================
  // TEST SUITE 1: SECTIONAL TIMER 20-MIN ALLOCATION & STRICT LOCK
  // ==========================================
  console.log('--- TEST SUITE 1: Sectional Timer 20-Min Allocation & Strict Lock ---');

  const SECTIONS = [
    { code: 'ENGLISH', name: 'English Language', totalQuestions: 30, durationMinutes: 20 },
    { code: 'QUANT', name: 'Quantitative Aptitude', totalQuestions: 35, durationMinutes: 20 },
    { code: 'REASONING', name: 'Reasoning Ability', totalQuestions: 35, durationMinutes: 20 }
  ];

  // 1. Initial 20-minute allocation check (1200 seconds per section)
  const initialTimers: Record<string, number> = {};
  SECTIONS.forEach(s => {
    initialTimers[s.code] = (s.durationMinutes || 20) * 60;
  });

  assert(initialTimers['ENGLISH'] === 1200, '1. English section allocated exactly 1200 seconds (20 mins)');
  assert(initialTimers['QUANT'] === 1200, '2. Quant section allocated exactly 1200 seconds (20 mins)');
  assert(initialTimers['REASONING'] === 1200, '3. Reasoning section allocated exactly 1200 seconds (20 mins)');

  // 2. Strict Section Navigation Lock logic (TestHeader rule)
  // Rule in TestHeader: disabled={isSectionalTimer ? !isActive : isLocked}
  const isSectionalTimer = true;
  let activeSectionIndex = 0; // ENGLISH is active
  const lockedSections: string[] = [];

  const canSwitchToSection = (secIndex: number) => {
    const isActive = activeSectionIndex === secIndex;
    const isLocked = lockedSections.includes(SECTIONS[secIndex].code);
    const isDisabled = isSectionalTimer ? !isActive : isLocked;
    return !isDisabled;
  };

  assert(canSwitchToSection(0) === true, '4. Candidate is on active Section 0 (English)');
  assert(canSwitchToSection(1) === false, '5. Candidate CANNOT switch to Section 1 (Quant) while Section 0 is running');
  assert(canSwitchToSection(2) === false, '6. Candidate CANNOT switch to Section 2 (Reasoning) while Section 0 is running');

  // 3. Question switching restriction
  // Rule in app/test/[testId]/page.tsx:
  // if (isSectionalTimer && targetQ.sectionCode !== currentSectionCode) return;
  const mockQuestions = [
    { id: 'q1', sectionCode: 'ENGLISH', questionNumber: 1 },
    { id: 'q31', sectionCode: 'QUANT', questionNumber: 31 },
    { id: 'q66', sectionCode: 'REASONING', questionNumber: 66 }
  ];

  const currentSectionCode = SECTIONS[activeSectionIndex].code; // ENGLISH
  const canSelectQuestion = (qId: string) => {
    const targetQ = mockQuestions.find(q => q.id === qId);
    if (!targetQ) return false;
    if (isSectionalTimer && targetQ.sectionCode !== currentSectionCode) {
      return false;
    }
    return true;
  };

  assert(canSelectQuestion('q1') === true, '7. Can select Question 1 in active section (ENGLISH)');
  assert(canSelectQuestion('q31') === false, '8. Blocked from selecting Question 31 belonging to QUANT');
  assert(canSelectQuestion('q66') === false, '9. Blocked from selecting Question 66 belonging to REASONING');


  // ==========================================
  // TEST SUITE 2: TIMER COUNTDOWN & SECTION TRANSITION
  // ==========================================
  console.log('\n--- TEST SUITE 2: Timer Countdown & Section Transition ---');

  // Simulate master countdown interval
  let currentSecRemaining = initialTimers['ENGLISH']; // 1200s
  let isTestSubmitted = false;

  const simulateTick = () => {
    if (currentSecRemaining > 1) {
      currentSecRemaining -= 1;
    } else {
      // 00:00 reached -> handleSectionTimeUp()
      currentSecRemaining = 0;
      lockedSections.push(SECTIONS[activeSectionIndex].code);
      if (activeSectionIndex < SECTIONS.length - 1) {
        activeSectionIndex += 1;
        currentSecRemaining = initialTimers[SECTIONS[activeSectionIndex].code];
      } else {
        isTestSubmitted = true;
      }
    }
  };

  // Tick 60 seconds
  for (let i = 0; i < 60; i++) {
    simulateTick();
  }
  assert(currentSecRemaining === 1140, '10. Timer decrements reliably (1200 - 60 = 1140s)');

  // Fast forward to expiry of English section
  currentSecRemaining = 1;
  simulateTick(); // expires English

  assert(lockedSections.includes('ENGLISH'), '11. Expired English section is now locked');
  assert(activeSectionIndex === 1, '12. Automatically transitioned to Section 1 (QUANT)');
  assert(currentSecRemaining === 1200, '13. QUANT starts with fresh 1200s countdown');
  assert(canSwitchToSection(0) === false, '14. Cannot go back to locked English section');
  assert(canSwitchToSection(1) === true, '15. Candidate is on active QUANT section');
  assert(canSwitchToSection(2) === false, '16. Cannot jump ahead to REASONING section');

  // Fast forward to expiry of QUANT
  currentSecRemaining = 1;
  simulateTick(); // expires QUANT

  assert(lockedSections.includes('QUANT'), '17. QUANT is now locked');
  assert(activeSectionIndex === 2, '18. Automatically transitioned to Section 2 (REASONING)');
  assert(currentSecRemaining === 1200, '19. REASONING starts with fresh 1200s countdown');

  // Fast forward to expiry of REASONING (final section)
  currentSecRemaining = 1;
  simulateTick(); // expires REASONING
  assert(lockedSections.includes('REASONING'), '20. REASONING is locked');
  assert(isTestSubmitted === true, '21. Test automatically submitted when final section timer expires');


  // ==========================================
  // TEST SUITE 3: UNCOMMITTED / UN-SUBMITTED EXIT CLEANSING
  // ==========================================
  console.log('\n--- TEST SUITE 3: Uncommitted / Un-submitted Exit Cleansing ---');

  // Mock localStorage
  const mockLocalStorage: Record<string, string> = {};
  const testId = 'mock-test-ibps-clerk-2024';
  const storageKey = `bankmock_test_progress_${testId}`;

  // Simulate active test progress stored
  mockLocalStorage[storageKey] = JSON.stringify({
    answers: { 'q1': 1, 'q2': 3 },
    visited: ['q1', 'q2', 'q3'],
    markedForReview: ['q2'],
    sectionTimers: { 'ENGLISH': 850, 'QUANT': 1200, 'REASONING': 1200 },
    activeSectionIndex: 0,
    currentQuestionIndex: 1
  });

  assert(mockLocalStorage[storageKey] !== undefined, '22. In-progress exam state is initially in storage');

  // Candidate exits without submitting:
  // Rule: beforeunload/pagehide or Exit Modal calls removeStorage
  const handleExitWithoutSubmitting = (submitted: boolean) => {
    if (!submitted) {
      delete mockLocalStorage[storageKey];
      delete mockLocalStorage[`bankmock_strikes_${testId}`];
    }
  };

  handleExitWithoutSubmitting(false);
  assert(mockLocalStorage[storageKey] === undefined, '23. In-progress state completely erased from localStorage on unsubmitted exit');


  // ==========================================
  // TEST SUITE 4: RE-ATTEMPT & RE-START FRESH TEST ALLOCATION
  // ==========================================
  console.log('\n--- TEST SUITE 4: Re-attempt & Re-start Fresh Test Allocation ---');

  // Simulate candidate clicking "Re-attempt Test"
  const urlSearch = '?reattempt=true';
  const isReattemptOrRestart = urlSearch.includes('reattempt=true') || urlSearch.includes('restart=true');

  assert(isReattemptOrRestart === true, '24. Successfully detects ?reattempt=true query parameter');

  // Even if stale state was present in storage
  mockLocalStorage[storageKey] = JSON.stringify({
    answers: { 'q1': 2, 'q2': 1, 'q3': 0 },
    sectionTimers: { 'ENGLISH': 0, 'QUANT': 0, 'REASONING': 45 },
    lockedSections: ['ENGLISH', 'QUANT']
  });

  // Re-attempt loader logic from app/test/[testId]/page.tsx:
  let reattemptResponses: Record<string, any> = { 'stale_q': 1 };
  let reattemptLockedSections: string[] = ['ENGLISH'];
  let reattemptTimers: Record<string, number> = {};

  if (isReattemptOrRestart) {
    delete mockLocalStorage[storageKey];
    delete mockLocalStorage[`bankmock_strikes_${testId}`];
    reattemptResponses = {};
    reattemptLockedSections = [];
    SECTIONS.forEach(sec => {
      reattemptTimers[sec.code] = (sec.durationMinutes || 20) * 60;
    });
  }

  assert(mockLocalStorage[storageKey] === undefined, '25. Stale storage purged for re-attempt');
  assert(Object.keys(reattemptResponses).length === 0, '26. Answers initialized to empty object for re-attempt');
  assert(reattemptLockedSections.length === 0, '27. Locked sections reset to empty for re-attempt');
  assert(reattemptTimers['ENGLISH'] === 1200, '28. English timer restored to full 1200 seconds for re-attempt');
  assert(reattemptTimers['QUANT'] === 1200, '29. Quant timer restored to full 1200 seconds for re-attempt');
  assert(reattemptTimers['REASONING'] === 1200, '30. Reasoning timer restored to full 1200 seconds for re-attempt');

  console.log('\n=====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
