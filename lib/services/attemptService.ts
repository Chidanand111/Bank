'use server';

import { prisma } from '../prisma';
import { requireAdmin } from '../auth/permissions';
import { getCurrentUser } from '../auth/session';
import { SAMPLE_ATTEMPTS } from '../data/sampleAttempts';
import { safeRevalidatePath } from './common';
import { AttemptResult, Question, DashboardStats, SectionResult } from '@/types';
import { getCanonicalExamQuestions } from './questionService';
import { MOCK_TESTS_DATA } from '../data/mockTests';

/**
 * Persists an exam attempt result to Neon PostgreSQL with transactional answer details.
 * Performs rigorous server-side verification:
 * - Enforces authentication and approved account status
 * - Never trusts client-supplied scores, accuracy, or correctness flags
 * - Strictly binds the attempt to currentUser.id
 * - Prevents non-admin submission on unpublished exams
 * - Recalculates marks and answers using canonical database question records
 */
class DuplicateSubmissionError extends Error {
  constructor(message: string = 'Duplicate submission: This exam attempt has already been finalized.') {
    super(message);
    this.name = 'DuplicateSubmissionError';
  }
}

async function runInTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
  if (typeof (prisma as any).$transaction === 'function') {
    return (prisma as any).$transaction(async (tx: any) => callback(tx));
  }
  return callback(prisma);
}

/**
 * Persists an exam attempt result to Neon PostgreSQL with transactional answer details.
 * Performs rigorous server-side verification:
 * - Enforces authentication and approved account status (never substitutes a demo user)
 * - Never trusts client-supplied scores, accuracy, or correctness flags
 * - Strictly binds the attempt to currentUser.id
 * - Prevents non-admin submission on unpublished exams
 * - Rejects non-existent mock tests without fallback
 * - Validates question-to-exam and option-to-question relationships
 * - Atomically prevents duplicate submissions from overwriting finalized attempts
 * - Recalculates marks, section metrics, and answers using canonical database question records
 */
export async function saveAttemptAction(
  result: AttemptResult
): Promise<{ success: boolean; attemptId?: string; result?: AttemptResult; error?: string }> {
  try {
    if (!result || typeof result !== 'object') {
      return {
        success: false,
        error: 'Invalid payload: Attempt submission payload is required.',
      };
    }

    if (!result.mockTestId || typeof result.mockTestId !== 'string') {
      return {
        success: false,
        error: 'Invalid payload: mockTestId is required.',
      };
    }

    // 1. Enforce Server-Side Authentication & Status (Never fallback to demo user)
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in to submit an exam attempt.',
      };
    }

    if (currentUser.status && currentUser.status !== 'APPROVED') {
      return {
        success: false,
        error: 'Forbidden: Account approval required to submit exam attempts.',
      };
    }

    // Strictly bind the attempt to authenticated user ID
    const finalUserId = currentUser.id;

    // 2. Authoritative MockTest and Exam Lookup (Never fallback to random/first mock test)
    const dbMockTest = await prisma.mockTest.findFirst({
      where: {
        OR: [
          { id: result.mockTestId },
          { slug: result.mockTestId },
          { slug: result.mockTestId.replace(/^mock-/, '') },
        ],
      },
      include: {
        exam: true,
        mockTestQuestions: {
          orderBy: { order: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { order: 'asc' } },
                exam: true,
                section: true,
                topic: true,
              },
            },
            section: true,
          },
        },
      },
    });

    const staticTest = MOCK_TESTS_DATA.find(
      t => t.id === result.mockTestId || t.slug === result.mockTestId
    );

    if (!dbMockTest && !staticTest) {
      return {
        success: false,
        error: `Exam not found: Mock test "${result.mockTestId}" does not exist.`,
      };
    }

    // 3. Exam & Test Publication / Availability Check
    let isUnpublished = false;
    if (dbMockTest) {
      if (
        (dbMockTest as any).status === 'created' ||
        (dbMockTest as any).isPublished === false ||
        Boolean(dbMockTest.exam && (dbMockTest.exam as any).status === 'created')
      ) {
        isUnpublished = true;
      }
    } else if (staticTest && (staticTest as any).status === 'created') {
      isUnpublished = true;
    }

    if (isUnpublished && currentUser.role !== 'ADMIN') {
      return {
        success: false,
        error: 'Forbidden: Cannot submit attempt for an unpublished exam.',
      };
    }

    const finalMockTestId = dbMockTest?.id || staticTest?.id || result.mockTestId;

    // 4. Time Invariant Check: Prevent client-side timer manipulation
    const allocatedDuration = (dbMockTest?.durationMinutes || staticTest?.durationMinutes || 60) * 60;
    const maxAllowedSeconds = allocatedDuration + 180; // 3 minutes grace period
    const validatedTimeTaken = Math.min(
      Math.max(1, Math.round(result.timeTakenSeconds || 1)),
      maxAllowedSeconds
    );

    // 5. Load Canonical Questions with True Answers for Server-Side Re-Scoring
    let canonicalQuestions: Question[] = [];
    if (dbMockTest && dbMockTest.mockTestQuestions && dbMockTest.mockTestQuestions.length > 0) {
      canonicalQuestions = dbMockTest.mockTestQuestions.map(mtq => {
        const q = mtq.question;
        return {
          id: q.id,
          text: q.text,
          imageUrl: q.imageUrl || undefined,
          passage: q.passage || undefined,
          passageImageUrl: q.passageImageUrl || undefined,
          groupId: q.groupId || undefined,
          isPyq: q.isPyq,
          pyqYear: q.pyqYear || undefined,
          pyqExam: q.pyqExam || undefined,
          difficulty: (q.difficulty as any) || 'MEDIUM',
          explanation: q.explanation || '',
          marks: q.marks ?? 1.0,
          negativeMarks: q.negativeMarks ?? 0.25,
          examId: q.examId,
          sectionId: q.sectionId,
          sectionCode: mtq.section?.code || q.section?.code || 'GENERAL',
          sectionName: mtq.section?.name || q.section?.name || 'General',
          topicId: q.topicId,
          topicName: q.topic?.name || 'General',
          options: (q.options || []).map(opt => ({
            id: opt.id,
            questionId: opt.questionId,
            text: opt.text,
            imageUrl: opt.imageUrl || undefined,
            isCorrect: opt.isCorrect,
            order: opt.order,
          })),
        };
      });
    }

    if (canonicalQuestions.length === 0) {
      canonicalQuestions = await getCanonicalExamQuestions(result.mockTestId);
    }

    if (canonicalQuestions.length === 0 && staticTest && staticTest.questions) {
      canonicalQuestions = staticTest.questions;
    }

    // 6. Validate Question-to-Exam and Option-to-Question Relationships
    const canonicalQMap = new Map(canonicalQuestions.map(q => [q.id, q]));

    for (const qd of result.questionDetails || []) {
      const submittedQId = qd.question?.id;
      if (!submittedQId || !canonicalQMap.has(submittedQId)) {
        return {
          success: false,
          error: `Invalid question: Question "${submittedQId || 'unknown'}" does not belong to exam "${result.mockTestId}".`,
        };
      }

      if (qd.selectedOptionId) {
        const canonicalQ = canonicalQMap.get(submittedQId)!;
        const validOption = (canonicalQ.options || []).some(o => o.id === qd.selectedOptionId);
        if (!validOption) {
          return {
            success: false,
            error: `Invalid option: Selected option "${qd.selectedOptionId}" does not belong to question "${canonicalQ.id}".`,
          };
        }
      }
    }

    // 7. Authoritative Server-Side Scoring & Section Calculation
    let totalScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let totalAttempted = 0;
    let totalMaxScore = 0;

    const sectionMetricsMap: Record<string, {
      sectionName: string;
      totalQuestions: number;
      attempted: number;
      correct: number;
      incorrect: number;
      unanswered: number;
      score: number;
      maxScore: number;
    }> = {};

    const verifiedQuestionDetails: AttemptResult['questionDetails'] = [];

    const clientDetailMap = new Map(
      (result.questionDetails || []).map(qd => [qd.question?.id, qd])
    );

    const negRatio = dbMockTest?.negativeMarkRatio ?? staticTest?.negativeMarkRatio ?? 0.25;

    for (const canonicalQ of canonicalQuestions) {
      const clientDetail = clientDetailMap.get(canonicalQ.id);
      const selectedOptionId = clientDetail?.selectedOptionId || null;
      const isAnswered = Boolean(selectedOptionId);
      const isMarked =
        clientDetail?.status === 'MARKED_FOR_REVIEW' ||
        clientDetail?.status === 'ANSWERED_AND_MARKED';

      const qMarks = canonicalQ.marks ?? 1.0;
      const qNegMarks =
        typeof canonicalQ.negativeMarks === 'number'
          ? canonicalQ.negativeMarks
          : qMarks * negRatio;
      totalMaxScore += qMarks;

      const secCode = canonicalQ.sectionCode || 'GENERAL';
      if (!sectionMetricsMap[secCode]) {
        sectionMetricsMap[secCode] = {
          sectionName: canonicalQ.sectionName || 'General',
          totalQuestions: 0,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          unanswered: 0,
          score: 0,
          maxScore: 0,
        };
      }
      const secMetric = sectionMetricsMap[secCode];
      secMetric.totalQuestions += 1;
      secMetric.maxScore += qMarks;

      let isCorrect: boolean | null = null;
      let marksObtained = 0;

      if (isAnswered) {
        totalAttempted += 1;
        secMetric.attempted += 1;
        const selectedOpt = (canonicalQ.options || []).find(o => o.id === selectedOptionId);
        if (selectedOpt && selectedOpt.isCorrect) {
          isCorrect = true;
          correctCount += 1;
          secMetric.correct += 1;
          marksObtained = qMarks;
        } else {
          isCorrect = false;
          incorrectCount += 1;
          secMetric.incorrect += 1;
          marksObtained = -qNegMarks;
        }
      } else {
        unansweredCount += 1;
        secMetric.unanswered += 1;
        marksObtained = 0;
      }

      totalScore += marksObtained;
      secMetric.score += marksObtained;

      verifiedQuestionDetails.push({
        question: canonicalQ,
        selectedOptionId,
        isCorrect,
        status: isAnswered
          ? isMarked
            ? 'ANSWERED_AND_MARKED'
            : 'ANSWERED'
          : isMarked
          ? 'MARKED_FOR_REVIEW'
          : 'NOT_ANSWERED',
        marksObtained,
        timeSpentSeconds: clientDetail?.timeSpentSeconds || 0,
      });
    }

    const finalScore = parseFloat(totalScore.toFixed(2));
    const finalMaxScore = totalMaxScore > 0 ? totalMaxScore : (dbMockTest?.totalMarks || staticTest?.totalMarks || 100);
    const percentage = finalMaxScore > 0 ? (Math.max(0, finalScore) / finalMaxScore) * 100 : 0;
    const accuracy = totalAttempted > 0 ? (correctCount / totalAttempted) * 100 : 0;
    const cutoff = dbMockTest?.cutoffMarks || staticTest?.cutoffMarks || 60;
    const isSectional = (dbMockTest?.timerType === 'SECTIONAL_LOCKED') || (staticTest?.timerType === 'SECTIONAL_LOCKED');
    const testSections = (dbMockTest?.exam as any)?.sections || staticTest?.sections || [];

    const sectionResults = Object.entries(sectionMetricsMap).map(([code, m]) => {
      const secAccuracy = m.attempted > 0 ? (m.correct / m.attempted) * 100 : 0;
      const secDef = testSections.find((s: any) => s.code === code);
      let secCutoff = 0;
      if (typeof (secDef as any)?.cutoffMarks === 'number') {
        secCutoff = (secDef as any).cutoffMarks;
      } else if (isSectional && m.maxScore > 0) {
        secCutoff = parseFloat((m.maxScore * 0.35).toFixed(2));
      }
      const isSecCleared = secCutoff > 0 ? m.score >= secCutoff : true;

      return {
        sectionCode: code,
        sectionName: m.sectionName,
        totalQuestions: m.totalQuestions,
        attempted: m.attempted,
        correct: m.correct,
        incorrect: m.incorrect,
        unanswered: m.unanswered,
        score: parseFloat(m.score.toFixed(2)),
        maxScore: m.maxScore,
        accuracy: parseFloat(secAccuracy.toFixed(1)),
        cutoffMarks: secCutoff,
        isCutoffCleared: isSecCleared,
      };
    });

    const overallScoreMet = finalScore >= cutoff;
    const isCutoffCleared = isSectional && sectionResults.length > 0
      ? overallScoreMet && sectionResults.every(s => s.isCutoffCleared)
      : overallScoreMet;

    // 8. Atomic Database Transaction: Duplicate Check + Attempt Creation & Answer Finalization
    const attemptId = (result.id && result.id.trim()) || `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nowMs = Date.now();
    let startedAtDate: Date;
    if (result.startedAt && !isNaN(new Date(result.startedAt).getTime())) {
      const parsedStart = new Date(result.startedAt);
      startedAtDate = parsedStart.getTime() > nowMs + 5000 ? new Date(nowMs - validatedTimeTaken * 1000) : parsedStart;
    } else {
      startedAtDate = new Date(nowMs - validatedTimeTaken * 1000);
    }
    const completedAtDate = result.completedAt && !isNaN(new Date(result.completedAt).getTime())
      ? new Date(result.completedAt)
      : new Date(nowMs);

    const createdAttempt = await runInTransaction(async (tx) => {
      // Duplicate Submission & Finalization Check
      const existingAttempt = typeof tx?.attempt?.findUnique === 'function'
        ? await tx.attempt.findUnique({
            where: { id: attemptId },
          })
        : null;

      if (existingAttempt) {
        if (existingAttempt.isCompleted) {
          throw new DuplicateSubmissionError(
            'Duplicate submission: This exam attempt has already been finalized.'
          );
        }
        if (existingAttempt.userId !== finalUserId) {
          throw new Error('Forbidden: Attempt belongs to another candidate.');
        }
      }

      const saved = await tx.attempt.upsert({
        where: { id: attemptId },
        update: {
          timeTakenSeconds: validatedTimeTaken,
          score: finalScore,
          maxScore: finalMaxScore,
          accuracy: parseFloat(accuracy.toFixed(1)),
          totalAttempted,
          correctCount,
          incorrectCount,
          unansweredCount,
          isCompleted: true,
          completedAt: completedAtDate,
        },
        create: {
          id: attemptId,
          userId: finalUserId,
          mockTestId: finalMockTestId,
          startedAt: startedAtDate,
          completedAt: completedAtDate,
          timeTakenSeconds: validatedTimeTaken,
          score: finalScore,
          maxScore: finalMaxScore,
          accuracy: parseFloat(accuracy.toFixed(1)),
          totalAttempted,
          correctCount,
          incorrectCount,
          unansweredCount,
          isCompleted: true,
        },
      });

      // Persist child Answer records atomically
      for (const qd of verifiedQuestionDetails) {
        if (!qd.question?.id) continue;
        const qId = qd.question.id;
        const isAnswered = Boolean(qd.selectedOptionId);
        const isMarked =
          qd.status === 'MARKED_FOR_REVIEW' || qd.status === 'ANSWERED_AND_MARKED';

        const questionExists = typeof tx?.question?.findUnique === 'function'
          ? await tx.question.findUnique({
              where: { id: qId },
              select: { id: true },
            })
          : { id: qId };

        if (questionExists) {
          let validOptionId: string | null = null;
          if (qd.selectedOptionId) {
            const optExists = typeof tx?.option?.findUnique === 'function'
              ? await tx.option.findUnique({
                  where: { id: qd.selectedOptionId },
                  select: { id: true },
                })
              : { id: qd.selectedOptionId };
            if (optExists) validOptionId = optExists.id;
          }

          if (typeof tx?.answer?.upsert === 'function') {
            await tx.answer.upsert({
              where: {
                attemptId_questionId: {
                  attemptId: saved.id,
                  questionId: qId,
                },
              },
              update: {
                selectedOptionId: validOptionId,
                isMarkedForReview: isMarked,
                isAnswered,
                isCorrect: qd.isCorrect,
                marksObtained: qd.marksObtained,
                timeSpentSeconds: qd.timeSpentSeconds || 0,
              },
              create: {
                attemptId: saved.id,
                questionId: qId,
                selectedOptionId: validOptionId,
                isMarkedForReview: isMarked,
                isAnswered,
                isCorrect: qd.isCorrect,
                marksObtained: qd.marksObtained,
                timeSpentSeconds: qd.timeSpentSeconds || 0,
              },
            });
          }
        }
      }

      return saved;
    });

    safeRevalidatePath('/dashboard');
    safeRevalidatePath('/my-results');
    safeRevalidatePath('/admin/attempts');

    const verifiedResult: AttemptResult = {
      id: createdAttempt.id,
      mockTestId: finalMockTestId,
      mockTestTitle: dbMockTest?.title || staticTest?.title || result.mockTestTitle || 'Practice Mock',
      examSlug: dbMockTest?.exam?.slug || staticTest?.examSlug || result.examSlug || 'ibps-po',
      examTitle: dbMockTest?.exam?.title || staticTest?.examTitle || result.examTitle || 'Banking Examination',
      userId: currentUser.id,
      userName: currentUser.name,
      startedAt: startedAtDate.toISOString(),
      completedAt: completedAtDate.toISOString(),
      timeTakenSeconds: validatedTimeTaken,
      totalDurationSeconds: allocatedDuration,
      score: finalScore,
      maxScore: finalMaxScore,
      percentage: parseFloat(percentage.toFixed(1)),
      accuracy: parseFloat(accuracy.toFixed(1)),
      totalQuestions: totalAttempted + unansweredCount,
      totalAttempted,
      correctCount,
      incorrectCount,
      unansweredCount,
      cutoffMarks: cutoff,
      isCutoffCleared,
      sectionResults,
      topicResults: [],
      questionDetails: verifiedQuestionDetails,
    };

    return {
      success: true,
      attemptId: createdAttempt.id,
      result: verifiedResult,
    };
  } catch (err) {
    if (err instanceof DuplicateSubmissionError) {
      return {
        success: false,
        error: err.message,
      };
    }
    if (err instanceof Error && err.message.startsWith('Forbidden:')) {
      return {
        success: false,
        error: err.message,
      };
    }
    console.error('Failed to save attempt in database:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to persist attempt to database.',
    };
  }
}

/**
 * Retrieves a single attempt result by ID, enforcing strict IDOR access control.
 * Only the candidate who created the attempt or an authorized administrator can view it.
 */
export async function getAttemptByIdAction(attemptId: string): Promise<AttemptResult | null> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Unauthorized: Authentication required to view exam attempt results.');
  }
  if (currentUser.status && currentUser.status !== 'APPROVED') {
    throw new Error('Forbidden: Account approval required to view exam attempt results.');
  }

  try {
    const dbAttempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        user: true,
        mockTest: {
          include: { exam: true },
        },
        answers: {
          include: {
            question: {
              include: {
                options: { orderBy: { order: 'asc' } },
                section: true,
                topic: true,
              },
            },
            selectedOption: true,
          },
        },
      },
    });

    if (dbAttempt) {
      // Strict IDOR Authorization Check: User can only view their own results unless ADMIN
      const isOwner = dbAttempt.userId === currentUser.id;
      const isAdmin = currentUser.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        throw new Error('Access denied: You do not have permission to view another user\'s attempt result.');
      }

      const percentage =
        dbAttempt.maxScore > 0 ? (Math.max(0, dbAttempt.score) / dbAttempt.maxScore) * 100 : 0;
      const cutoff = dbAttempt.mockTest?.cutoffMarks || 60;

      const sectionMetricsMap: Record<string, {
        sectionName: string;
        totalQuestions: number;
        attempted: number;
        correct: number;
        incorrect: number;
        unanswered: number;
        score: number;
        maxScore: number;
      }> = {};

      const questionDetails: AttemptResult['questionDetails'] = dbAttempt.answers.map(ans => {
        const q = ans.question;
        const secCode = q.section?.code || 'GENERAL';
        if (!sectionMetricsMap[secCode]) {
          sectionMetricsMap[secCode] = {
            sectionName: q.section?.name || 'General',
            totalQuestions: 0,
            attempted: 0,
            correct: 0,
            incorrect: 0,
            unanswered: 0,
            score: 0,
            maxScore: 0,
          };
        }
        const m = sectionMetricsMap[secCode];
        m.totalQuestions += 1;
        m.maxScore += q.marks ?? 1.0;
        if (ans.isAnswered) {
          m.attempted += 1;
          if (ans.isCorrect) {
            m.correct += 1;
          } else {
            m.incorrect += 1;
          }
        } else {
          m.unanswered += 1;
        }
        m.score += ans.marksObtained;

        return {
          question: {
            id: q.id,
            text: q.text,
            imageUrl: q.imageUrl || undefined,
            passage: q.passage || undefined,
            passageImageUrl: q.passageImageUrl || undefined,
            groupId: q.groupId || undefined,
            isPyq: q.isPyq,
            pyqYear: q.pyqYear || undefined,
            pyqExam: q.pyqExam || undefined,
            difficulty: (q.difficulty as any) || 'MEDIUM',
            explanation: q.explanation || '',
            marks: q.marks ?? 1.0,
            negativeMarks: q.negativeMarks ?? 0.25,
            examId: q.examId,
            sectionId: q.sectionId,
            sectionCode: q.section?.code || 'GENERAL',
            sectionName: q.section?.name || 'General',
            topicId: q.topicId,
            topicName: q.topic?.name || 'General',
            options: q.options.map(opt => ({
              id: opt.id,
              questionId: opt.questionId,
              text: opt.text,
              imageUrl: opt.imageUrl || undefined,
              isCorrect: opt.isCorrect,
              order: opt.order,
            })),
          },
          selectedOptionId: ans.selectedOptionId,
          isCorrect: ans.isCorrect,
          status: ans.isAnswered
            ? ans.isMarkedForReview
              ? 'ANSWERED_AND_MARKED'
              : 'ANSWERED'
            : ans.isMarkedForReview
            ? 'MARKED_FOR_REVIEW'
            : 'NOT_ANSWERED',
          marksObtained: ans.marksObtained,
          timeSpentSeconds: ans.timeSpentSeconds,
        };
      });

      const isSectional = dbAttempt.mockTest?.timerType === 'SECTIONAL_LOCKED';
      const sectionResults: SectionResult[] = Object.entries(sectionMetricsMap).map(([code, m]) => {
        const accuracy = m.attempted > 0 ? (m.correct / m.attempted) * 100 : 0;
        const secCutoff = isSectional && m.maxScore > 0 ? parseFloat((m.maxScore * 0.35).toFixed(2)) : 0;
        return {
          sectionCode: code,
          sectionName: m.sectionName,
          totalQuestions: m.totalQuestions,
          attempted: m.attempted,
          correct: m.correct,
          incorrect: m.incorrect,
          unanswered: m.unanswered,
          score: parseFloat(m.score.toFixed(2)),
          maxScore: m.maxScore,
          accuracy: parseFloat(accuracy.toFixed(1)),
          cutoffMarks: secCutoff,
          isCutoffCleared: secCutoff > 0 ? m.score >= secCutoff : true,
        };
      });

      const overallScoreMet = dbAttempt.score >= cutoff;
      const isCutoffCleared = isSectional && sectionResults.length > 0
        ? overallScoreMet && sectionResults.every(s => s.isCutoffCleared)
        : overallScoreMet;

      return {
        id: dbAttempt.id,
        mockTestId: dbAttempt.mockTestId,
        mockTestTitle: dbAttempt.mockTest?.title || 'Banking Examination Practice Mock',
        examSlug: dbAttempt.mockTest?.exam?.slug || 'ibps-po',
        examTitle: dbAttempt.mockTest?.exam?.title || 'IBPS PO Prelims',
        userId: dbAttempt.userId,
        userName: dbAttempt.user?.name || 'Aspirant',
        startedAt: dbAttempt.startedAt ? (typeof dbAttempt.startedAt === 'string' ? dbAttempt.startedAt : dbAttempt.startedAt.toISOString()) : new Date().toISOString(),
        completedAt: dbAttempt.completedAt ? (typeof dbAttempt.completedAt === 'string' ? dbAttempt.completedAt : dbAttempt.completedAt.toISOString()) : new Date().toISOString(),
        timeTakenSeconds: dbAttempt.timeTakenSeconds,
        totalDurationSeconds: (dbAttempt.mockTest?.durationMinutes || 60) * 60,
        score: dbAttempt.score,
        maxScore: dbAttempt.maxScore,
        percentage: parseFloat(percentage.toFixed(1)),
        accuracy: dbAttempt.accuracy,
        totalQuestions: dbAttempt.totalAttempted + dbAttempt.unansweredCount,
        totalAttempted: dbAttempt.totalAttempted,
        correctCount: dbAttempt.correctCount,
        incorrectCount: dbAttempt.incorrectCount,
        unansweredCount: dbAttempt.unansweredCount,
        cutoffMarks: cutoff,
        isCutoffCleared,
        sectionResults,
        topicResults: [],
        questionDetails,
      };
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Access denied')) {
      throw err;
    }
    console.warn('Neon DB query error in getAttemptByIdAction:', err);
  }

  // Explicit sample attempt lookup with IDOR check
  if (attemptId.startsWith('att-sample-')) {
    const sample = SAMPLE_ATTEMPTS.find(a => a.id === attemptId);
    if (sample) {
      const isOwner = sample.userId === currentUser.id;
      const isAdmin = currentUser.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        throw new Error('Access denied: You do not have permission to view another user\'s attempt result.');
      }
      return sample;
    }
  }

  return null;
}

/**
 * Retrieves all attempts for a candidate from Neon PostgreSQL.
 * Non-admin users are strictly scoped to their own attempts.
 */
export async function getUserAttemptsAction(userId?: string): Promise<AttemptResult[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }
  if (currentUser.status && currentUser.status !== 'APPROVED') {
    throw new Error('Forbidden: Account approval required to view exam attempts.');
  }

  // IDOR Defense: Only administrators can specify a target userId other than their own
  const targetUserId = currentUser.role === 'ADMIN' && userId ? userId : currentUser.id;

  try {
    const dbAttempts = await prisma.attempt.findMany({
      where: { userId: targetUserId, isCompleted: true },
      include: {
        mockTest: { include: { exam: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (dbAttempts && dbAttempts.length > 0) {
      return dbAttempts.map(att => {
        const percentage =
          att.maxScore > 0 ? (Math.max(0, att.score) / att.maxScore) * 100 : 0;
        const cutoff = att.mockTest?.cutoffMarks || 60;
        return {
          id: att.id,
          mockTestId: att.mockTestId,
          mockTestTitle: att.mockTest?.title || 'Banking Examination Practice Mock',
          examSlug: att.mockTest?.exam?.slug || 'ibps-po',
          examTitle: att.mockTest?.exam?.title || 'IBPS PO Prelims',
          userId: att.userId,
          userName: currentUser.name || 'Aspirant',
          startedAt: att.startedAt.toISOString(),
          completedAt: att.completedAt?.toISOString() || new Date().toISOString(),
          timeTakenSeconds: att.timeTakenSeconds,
          totalDurationSeconds: (att.mockTest?.durationMinutes || 60) * 60,
          score: att.score,
          maxScore: att.maxScore,
          percentage: parseFloat(percentage.toFixed(1)),
          accuracy: att.accuracy,
          totalQuestions: att.totalAttempted + att.unansweredCount,
          totalAttempted: att.totalAttempted,
          correctCount: att.correctCount,
          incorrectCount: att.incorrectCount,
          unansweredCount: att.unansweredCount,
          cutoffMarks: cutoff,
          isCutoffCleared: att.score >= cutoff,
          sectionResults: [],
          topicResults: [],
          questionDetails: [],
        };
      });
    }
  } catch (err) {
    console.warn('Neon DB query error in getUserAttemptsAction:', err);
  }

  return [];
}

/**
 * Server-side Attempts viewer for Administrators, backed by Neon PostgreSQL
 */
export async function getAdminAllAttempts(): Promise<AttemptResult[]> {
  await requireAdmin();

  try {
    const dbAttempts = await prisma.attempt.findMany({
      include: {
        user: true,
        mockTest: { include: { exam: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (dbAttempts && dbAttempts.length > 0) {
      return dbAttempts.map(att => {
        const percentage =
          att.maxScore > 0 ? (Math.max(0, att.score) / att.maxScore) * 100 : 0;
        const cutoff = att.mockTest?.cutoffMarks || 60;
        return {
          id: att.id,
          mockTestId: att.mockTestId,
          mockTestTitle: att.mockTest?.title || 'Practice Mock',
          examSlug: att.mockTest?.exam?.slug || 'ibps-po',
          examTitle: att.mockTest?.exam?.title || 'IBPS PO',
          userId: att.userId,
          userName: att.user?.name || 'Aspirant',
          startedAt: att.startedAt.toISOString(),
          completedAt: att.completedAt?.toISOString() || new Date().toISOString(),
          timeTakenSeconds: att.timeTakenSeconds,
          totalDurationSeconds: (att.mockTest?.durationMinutes || 60) * 60,
          score: att.score,
          maxScore: att.maxScore,
          percentage: parseFloat(percentage.toFixed(1)),
          accuracy: att.accuracy,
          totalQuestions: att.totalAttempted + att.unansweredCount,
          totalAttempted: att.totalAttempted,
          correctCount: att.correctCount,
          incorrectCount: att.incorrectCount,
          unansweredCount: att.unansweredCount,
          cutoffMarks: cutoff,
          isCutoffCleared: att.score >= cutoff,
          sectionResults: [],
          topicResults: [],
          questionDetails: [],
        };
      });
    }
  } catch (err) {
    console.warn('Neon DB query in getAdminAllAttempts:', err);
  }

  return [];
}

/**
 * Authoritatively calculates student dashboard statistics from Neon PostgreSQL.
 * Strictly scopes data to the authenticated candidate, computes real performance metrics,
 * and isolates sample/demo data so production analytics are never inflated.
 */
export async function getUserDashboardStatsAction(dateRange?: {
  from?: string;
  to?: string;
}): Promise<DashboardStats> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      totalTestsAttempted: 0,
      averageScore: 0,
      bestScore: 0,
      averageAccuracy: 0,
      totalTimeSpentMinutes: 0,
      recentAttempts: [],
      sectionPerformance: [],
      weakTopics: [],
    };
  }
  if (currentUser.status && currentUser.status !== 'APPROVED') {
    throw new Error('Forbidden: Account approval required to view analytics.');
  }

  try {
    const dbAttempts = await prisma.attempt.findMany({
      where: {
        userId: currentUser.id,
        isCompleted: true,
        ...(dateRange?.from || dateRange?.to
          ? {
              createdAt: {
                ...(dateRange.from ? { gte: new Date(dateRange.from) } : {}),
                ...(dateRange.to ? { lte: new Date(dateRange.to) } : {}),
              },
            }
          : {}),
      },
      include: {
        mockTest: { include: { exam: true } },
        answers: {
          include: {
            question: {
              include: { section: true, topic: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!dbAttempts || dbAttempts.length === 0) {
      return {
        totalTestsAttempted: 0,
        averageScore: 0,
        bestScore: 0,
        averageAccuracy: 0,
        totalTimeSpentMinutes: 0,
        recentAttempts: [],
        sectionPerformance: [],
        weakTopics: [],
      };
    }

    const totalTestsAttempted = dbAttempts.length;
    const totalScore = dbAttempts.reduce((sum, a) => sum + a.score, 0);
    const averageScore = parseFloat((totalScore / totalTestsAttempted).toFixed(2));
    const bestScore = Math.max(...dbAttempts.map(a => a.score), 0);
    const totalAccuracy = dbAttempts.reduce((sum, a) => sum + a.accuracy, 0);
    const averageAccuracy = parseFloat((totalAccuracy / totalTestsAttempted).toFixed(1));
    const totalTimeSpentSeconds = dbAttempts.reduce((sum, a) => sum + a.timeTakenSeconds, 0);
    const totalTimeSpentMinutes = Math.round(totalTimeSpentSeconds / 60);

    // Track real section and topic performance
    const secStats: Record<string, { sectionName: string; totalScore: number; maxScore: number; attempted: number; correct: number }> = {};
    const topicStats: Record<string, { topicName: string; sectionName: string; attempted: number; correct: number; total: number }> = {};

    for (const att of dbAttempts) {
      for (const ans of att.answers) {
        const q = ans.question;
        const secCode = q.section?.code || 'GENERAL';
        const secName = q.section?.name || 'General';
        const topName = q.topic?.name || 'General';

        if (!secStats[secCode]) {
          secStats[secCode] = { sectionName: secName, totalScore: 0, maxScore: 0, attempted: 0, correct: 0 };
        }
        secStats[secCode].totalScore += ans.marksObtained;
        secStats[secCode].maxScore += q.marks ?? 1.0;
        if (ans.isAnswered) {
          secStats[secCode].attempted += 1;
          if (ans.isCorrect) secStats[secCode].correct += 1;
        }

        if (!topicStats[topName]) {
          topicStats[topName] = { topicName: topName, sectionName: secName, attempted: 0, correct: 0, total: 0 };
        }
        topicStats[topName].total += 1;
        if (ans.isAnswered) {
          topicStats[topName].attempted += 1;
          if (ans.isCorrect) topicStats[topName].correct += 1;
        }
      }
    }

    const sectionPerformance = Object.entries(secStats).map(([code, s]) => {
      const acc = s.attempted > 0 ? (s.correct / s.attempted) * 100 : 0;
      return {
        sectionCode: code,
        sectionName: s.sectionName,
        averageAccuracy: parseFloat(acc.toFixed(1)),
        totalAttempted: s.attempted,
        totalCorrect: s.correct,
      };
    });

    const weakTopics = Object.values(topicStats)
      .filter(t => t.attempted >= 2)
      .map(t => ({
        topicName: t.topicName,
        sectionName: t.sectionName,
        accuracy: parseFloat(((t.correct / t.attempted) * 100).toFixed(1)),
        recommendedPracticeCount: Math.max(5, Math.round((100 - (t.correct / t.attempted) * 100) / 2)),
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 4);

    const recentAttempts: AttemptResult[] = dbAttempts.slice(0, 5).map(att => {
      const percentage = att.maxScore > 0 ? (Math.max(0, att.score) / att.maxScore) * 100 : 0;
      const cutoff = att.mockTest?.cutoffMarks || 60;
      return {
        id: att.id,
        mockTestId: att.mockTestId,
        mockTestTitle: att.mockTest?.title || 'Practice Mock',
        examSlug: att.mockTest?.exam?.slug || 'ibps-po',
        examTitle: att.mockTest?.exam?.title || 'IBPS PO',
        userId: att.userId,
        userName: currentUser.name || 'Aspirant',
        startedAt: att.startedAt.toISOString(),
        completedAt: att.completedAt?.toISOString() || new Date().toISOString(),
        timeTakenSeconds: att.timeTakenSeconds,
        totalDurationSeconds: (att.mockTest?.durationMinutes || 60) * 60,
        score: att.score,
        maxScore: att.maxScore,
        percentage: parseFloat(percentage.toFixed(1)),
        accuracy: att.accuracy,
        totalQuestions: att.totalAttempted + att.unansweredCount,
        totalAttempted: att.totalAttempted,
        correctCount: att.correctCount,
        incorrectCount: att.incorrectCount,
        unansweredCount: att.unansweredCount,
        cutoffMarks: cutoff,
        isCutoffCleared: att.score >= cutoff,
        sectionResults: [],
        topicResults: [],
        questionDetails: [],
      };
    });

    return {
      totalTestsAttempted,
      averageScore,
      bestScore,
      averageAccuracy,
      totalTimeSpentMinutes,
      recentAttempts,
      sectionPerformance,
      weakTopics,
    };
  } catch (err) {
    console.error('getUserDashboardStatsAction error:', err);
    return {
      totalTestsAttempted: 0,
      averageScore: 0,
      bestScore: 0,
      averageAccuracy: 0,
      totalTimeSpentMinutes: 0,
      recentAttempts: [],
      sectionPerformance: [],
      weakTopics: [],
    };
  }
}
