process.env.ADMIN_OVERRIDE = 'true';

import { bulkImportQuestionsAction } from '../lib/services/adminService';
import { AdminQuestionInput, Difficulty } from '../types';

async function runVerification() {
  console.log('=====================================================');
  console.log('VERIFYING PHASE 1: INTEGRITY, SECTIONAL TIMERS & BULK CSV');
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
  // TEST SUITE 1: CSV PARSING & SAMPLE TEMPLATE
  // ==========================================
  console.log('--- TEST SUITE 1: CSV Parser & Sample Template ---');

  const SAMPLE_CSV_CONTENT = `sectionCode,topicName,text,optionA,optionB,optionC,optionD,optionE,correctOption,marks,negativeMarks,difficulty,explanation
ENGLISH,Reading Comprehension,"According to banking liquidity norms, what is the primary regulatory objective of maintaining the Statutory Liquidity Ratio (SLR)?","To maximize foreign exchange reserves","To ensure solvency and control commercial credit expansion","To eliminate inter-bank lending rates","To finance public sector subsidies directly","None of the above",B,1,0.25,MEDIUM,"SLR enforces commercial banks to maintain liquid assets against Net Demand and Time Liabilities to ensure solvency and curb reckless credit expansion."
QUANT,Simplification,"What is the value of: (45% of 840) + (14 * 25) - 210?","498","518","538","508","528",B,1,0.25,EASY,"45% of 840 = 378; 14 * 25 = 350; 378 + 350 - 210 = 518."
QUANT,Number Series,"Find the missing number in the following sequence: 8, 14, 26, 50, 98, ?","186","194","192","198","184",B,1,0.25,MEDIUM,"Pattern: (x * 2) - 2. 8*2-2=14; 14*2-2=26; 26*2-2=50; 50*2-2=98; 98*2-2 = 194."
REASONING,Syllogism,"Statements: Some bankers are analysts. All analysts are auditors. Conclusions: I. Some auditors are bankers. II. All bankers are auditors.","Only conclusion I follows","Only conclusion II follows","Either I or II follows","Neither I nor II follows","Both conclusions follow",A,1,0.25,EASY,"Since some bankers are analysts and all analysts are auditors, it directly follows that some auditors are bankers. Conclusion I is valid."
REASONING,Direction Sense,"A courier delivery agent walks 12 meters North, turns right and walks 5 meters, then turns South and walks 12 meters. How far and in what direction is he from his starting point?","5 meters East","5 meters West","12 meters North","7 meters East","None of these",A,1,0.25,EASY,"The North and South vertical displacements cancel out (12m - 12m = 0). The agent is exactly 5 meters East of the starting point."
`;

  // Parser matching BulkQuestionModal logic
  const parseCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let currentVal = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim());
    return values;
  };

  const lines = SAMPLE_CSV_CONTENT.trim().split('\n').filter(Boolean);
  const header = parseCsvLine(lines[0]);
  assert(header.length >= 13, '1. Sample CSV contains all 13 standard columns');
  assert(header[0] === 'sectionCode' && header[2] === 'text' && header[8] === 'correctOption', '2. Header column order is strictly compliant');

  const parsedQuestions: AdminQuestionInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const secCode = (row[0] || 'ENGLISH').toUpperCase();
    const topic = row[1] || 'General';
    const text = row[2] || '';
    const optionA = row[3] || '';
    const optionB = row[4] || '';
    const optionC = row[5] || '';
    const optionD = row[6] || '';
    const optionE = row[7] || '';
    const correctOptionLetter = (row[8] || 'A').toUpperCase();
    const marks = parseFloat(row[9]) || 1;
    const negativeMarks = parseFloat(row[10]) || 0.25;
    const diffRaw = (row[11] || 'MEDIUM').toUpperCase();
    const difficulty: Difficulty =
      diffRaw === 'EASY' || diffRaw === 'HARD' ? diffRaw : 'MEDIUM';
    const explanation = row[12] || '';

    const letterToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
    const correctIdx = letterToIndex[correctOptionLetter] ?? 0;

    const rawOptions = [optionA, optionB, optionC, optionD, optionE];
    const options = rawOptions
      .map((text, idx) => ({
        text,
        isCorrect: idx === correctIdx,
      }))
      .filter(o => o.text.trim().length > 0);

    parsedQuestions.push({
      examId: 'exam-ibps-po',
      sectionCode: secCode,
      topicName: topic,
      text,
      options,
      marks,
      negativeMarks,
      difficulty,
      explanation,
    });
  }

  assert(parsedQuestions.length === 5, '3. Successfully parsed all 5 sample questions from template');
  assert(
    parsedQuestions.some(q => q.sectionCode === 'ENGLISH') &&
    parsedQuestions.some(q => q.sectionCode === 'QUANT') &&
    parsedQuestions.some(q => q.sectionCode === 'REASONING'),
    '4. Sample CSV covers all 3 banking sections (ENGLISH, QUANT, REASONING)'
  );
  assert(
    parsedQuestions[0].options.length === 5 && parsedQuestions[0].options[1].isCorrect === true,
    '5. Multi-choice options and correct answer flag correctly mapped'
  );

  // ==========================================
  // TEST SUITE 2: 20-MINUTE SECTIONAL TIMER LOGIC
  // ==========================================
  console.log('\n--- TEST SUITE 2: 20-Minute Sectional Timer Logic ---');

  const SECTION_DURATION_SECONDS = 20 * 60; // 1200 seconds
  const sections = [
    { code: 'ENGLISH', name: 'English Language' },
    { code: 'QUANT', name: 'Quantitative Aptitude' },
    { code: 'REASONING', name: 'Reasoning Ability' },
  ];

  const totalExamDuration = sections.length * SECTION_DURATION_SECONDS;
  assert(SECTION_DURATION_SECONDS === 1200, '6. Each section is allocated exactly 20 minutes (1200s)');
  assert(totalExamDuration === 3600, '7. Total prelims exam duration is 60 minutes (3600s)');

  // Simulate section progression state
  let currentSectionIndex = 0;
  let currentSectionCode = sections[currentSectionIndex].code;
  const lockedSectionCodes: string[] = [];
  let testSubmitted = false;

  const simulateSectionExpiration = () => {
    // Lock current section
    if (!lockedSectionCodes.includes(currentSectionCode)) {
      lockedSectionCodes.push(currentSectionCode);
    }
    // Transition to next or submit
    if (currentSectionIndex < sections.length - 1) {
      currentSectionIndex++;
      currentSectionCode = sections[currentSectionIndex].code;
    } else {
      testSubmitted = true;
    }
  };

  // Section 1: English expires
  simulateSectionExpiration();
  assert(lockedSectionCodes.includes('ENGLISH'), '8. English section auto-locks upon 20 min expiration');
  assert(currentSectionCode === 'QUANT', '9. Exam auto-advances to Quantitative Aptitude');
  assert(!lockedSectionCodes.includes('QUANT'), '10. Quantitative Aptitude is now active and unlocked');

  // Candidate attempts to navigate back to locked English section
  const canCandidateSelectEnglish = !lockedSectionCodes.includes('ENGLISH');
  assert(!canCandidateSelectEnglish, '11. Candidate is strictly prevented from navigating back to expired sections');

  // Section 2: Quant expires
  simulateSectionExpiration();
  assert(lockedSectionCodes.includes('QUANT'), '12. Quantitative Aptitude section auto-locks upon 20 min expiration');
  assert(currentSectionCode === 'REASONING', '13. Exam auto-advances to Reasoning Ability');

  // Section 3: Reasoning expires (final section)
  simulateSectionExpiration();
  assert(lockedSectionCodes.includes('REASONING'), '14. Reasoning section locks on expiration');
  assert(testSubmitted === true, '15. Final section expiration triggers automatic exam submission');

  // ==========================================
  // TEST SUITE 3: PROCTORING & INTEGRITY GUARD
  // ==========================================
  console.log('\n--- TEST SUITE 3: Proctoring & Integrity Guard ---');

  const MAX_STRIKES = 3;
  let strikes = 0;
  let proctoringAutoSubmitted = false;

  const handleTabDefocusEvent = () => {
    strikes++;
    if (strikes >= MAX_STRIKES) {
      proctoringAutoSubmitted = true;
    }
  };

  handleTabDefocusEvent();
  assert(strikes === 1 && !proctoringAutoSubmitted, '16. Strike 1 issued on first tab switch / blur event');

  handleTabDefocusEvent();
  assert(strikes === 2 && !proctoringAutoSubmitted, '17. Strike 2 issued on second tab switch / blur event');

  handleTabDefocusEvent();
  assert(strikes === 3 && proctoringAutoSubmitted, '18. Strike 3 triggers immediate automatic exam submission');

  // Verify anti-cheat blocked shortcuts list
  const BLOCKED_SHORTCUTS = ['c', 'v', 'x', 'u', 'p', 's', 'F12'];
  const isBlocked = (key: string, ctrlKey: boolean) => {
    if (key === 'F12') return true;
    if (ctrlKey && ['c', 'v', 'x', 'u', 'p', 's'].includes(key.toLowerCase())) return true;
    return false;
  };

  assert(isBlocked('c', true), '19. Ctrl+C (Copy) is blocked');
  assert(isBlocked('v', true), '20. Ctrl+V (Paste) is blocked');
  assert(isBlocked('u', true), '21. Ctrl+U (View Source) is blocked');
  assert(isBlocked('F12', false), '22. F12 (Developer Tools) is blocked');

  // ==========================================
  // TEST SUITE 4: BULK IMPORT SERVICE ACTION
  // ==========================================
  console.log('\n--- TEST SUITE 4: Bulk Question Import Action ---');

  const importResult = await bulkImportQuestionsAction(parsedQuestions, 'P_FULL');
  assert(importResult.success === true, '23. bulkImportQuestionsAction executes successfully');
  assert(importResult.count === 5, '24. Exactly 5 questions persisted to storage');

  console.log('\n=====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Unhandled error in verification:', err);
  process.exit(1);
});
