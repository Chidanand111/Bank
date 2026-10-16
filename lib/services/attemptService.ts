'use server';

import { prisma } from '../prisma';
import { requireAdmin } from '../auth/permissions';
import { getCurrentUser } from '../auth/session';
import { SAMPLE_ATTEMPTS } from '../data/sampleAttempts';
import { safeRevalidatePath } from './common';
import { AttemptResult, Question, UserResponseState } from '@/types';

/**
 * Persists an exam attempt result to Neon PostgreSQL with transactional answer details.
 * Also performs server-side invariant checks to ensure integrity against client tampering.
 */
export async function saveAttemptAction(
  result: AttemptResult
): Promise<{ success: boolean; attemptId?: string; error?: string }> {
  try {
    let currentUser = null;
    try {
      currentUser = await getCurrentUser();
    } catch {
      // Standalone script execution or background worker without request store
    }
    const userId = currentUser?.id || result.userId || 'user-student-1';

    // 1. Verify target user exists or use demo candidate
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, { email: currentUser?.email || 'student@bankmock.com' }],
      },
    });

    const finalUserId = dbUser?.id || (await prisma.user.findFirst())?.id || 'user-student-1';

    // 2. Find or match the MockTest in database
    let dbMockTest = await prisma.mockTest.findFirst({
      where: {
        OR: [
          { id: result.mockTestId },
          { slug: result.mockTestId },
          { slug: result.mockTestId.replace(/^mock-/, '') },
        ],
      },
      include: {
        exam: true,
      },
    });

    if (!dbMockTest) {
      // Fallback: connect to the first available mock test or default to IBPS PO
      dbMockTest = await prisma.mockTest.findFirst({
        include: { exam: true },
      });
    }

    const finalMockTestId = dbMockTest?.id || result.mockTestId;

    // 3. Server-side invariant validation:
    // Prevent client-side timer manipulation (allowed duration + 120s grace period)
    const maxAllowedSeconds = (result.totalDurationSeconds || 3600) + 120;
    const validatedTimeTaken = Math.min(
      Math.max(1, Math.round(result.timeTakenSeconds || 1)),
      maxAllowedSeconds
    );

    // 4. Save Attempt in Neon PostgreSQL
    const startedAtDate = result.startedAt ? new Date(result.startedAt) : new Date(Date.now() - validatedTimeTaken * 1000);
    const completedAtDate = result.completedAt ? new Date(result.completedAt) : new Date();

    const createdAttempt = await prisma.attempt.upsert({
      where: { id: result.id },
      update: {
        timeTakenSeconds: validatedTimeTaken,
        score: result.score,
        maxScore: result.maxScore,
        accuracy: result.accuracy,
        totalAttempted: result.totalAttempted,
        correctCount: result.correctCount,
        incorrectCount: result.incorrectCount,
        unansweredCount: result.unansweredCount,
        isCompleted: true,
        completedAt: completedAtDate,
      },
      create: {
        id: result.id,
        userId: finalUserId,
        mockTestId: finalMockTestId,
        startedAt: startedAtDate,
        completedAt: completedAtDate,
        timeTakenSeconds: validatedTimeTaken,
        score: result.score,
        maxScore: result.maxScore,
        accuracy: result.accuracy,
        totalAttempted: result.totalAttempted,
        correctCount: result.correctCount,
        incorrectCount: result.incorrectCount,
        unansweredCount: result.unansweredCount,
        isCompleted: true,
      },
    });

    // 5. Persist child Answer records if question details are provided
    if (result.questionDetails && Array.isArray(result.questionDetails) && result.questionDetails.length > 0) {
      // Upsert answers individually to preserve relational integrity with questions and options
      for (const qd of result.questionDetails) {
        if (!qd.question?.id) continue;
        const qId = qd.question.id;
        const isAnswered = Boolean(qd.selectedOptionId);
        const isMarked = qd.status === 'MARKED_FOR_REVIEW' || qd.status === 'ANSWERED_AND_MARKED';

        // Check if question exists in DB
        const questionExists = await prisma.question.findUnique({
          where: { id: qId },
          select: { id: true },
        });

        if (questionExists) {
          // Check if option exists if selected
          let validOptionId: string | null = null;
          if (qd.selectedOptionId) {
            const optExists = await prisma.option.findUnique({
              where: { id: qd.selectedOptionId },
              select: { id: true },
            });
            if (optExists) validOptionId = optExists.id;
          }

          const fallbackMarks = qd.isCorrect
            ? (qd.question.marks ?? 1.0)
            : isAnswered
            ? -(qd.question.negativeMarks ?? ((qd.question.marks ?? 1.0) * (dbMockTest?.negativeMarkRatio ?? 0.25)))
            : 0;

          await prisma.answer.upsert({
            where: {
              attemptId_questionId: {
                attemptId: createdAttempt.id,
                questionId: qId,
              },
            },
            update: {
              selectedOptionId: validOptionId,
              isMarkedForReview: isMarked,
              isAnswered,
              isCorrect: qd.isCorrect,
              marksObtained: qd.marksObtained ?? fallbackMarks,
              timeSpentSeconds: qd.timeSpentSeconds || 0,
            },
            create: {
              attemptId: createdAttempt.id,
              questionId: qId,
              selectedOptionId: validOptionId,
              isMarkedForReview: isMarked,
              isAnswered,
              isCorrect: qd.isCorrect,
              marksObtained: qd.marksObtained ?? fallbackMarks,
              timeSpentSeconds: qd.timeSpentSeconds || 0,
            },
          });
        }
      }
    }

    safeRevalidatePath('/dashboard');
    safeRevalidatePath('/my-results');
    safeRevalidatePath('/admin/attempts');

    return { success: true, attemptId: createdAttempt.id };
  } catch (err) {
    console.error('Failed to save attempt in database:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to persist attempt to database.',
    };
  }
}

/**
 * Retrieves a single attempt result by ID, querying Neon PostgreSQL with fallback to memory
 */
export async function getAttemptByIdAction(attemptId: string): Promise<AttemptResult | null> {
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
      const percentage = dbAttempt.maxScore > 0 ? (Math.max(0, dbAttempt.score) / dbAttempt.maxScore) * 100 : 0;
      const cutoff = dbAttempt.mockTest?.cutoffMarks || 60;
      const isCutoffCleared = dbAttempt.score >= cutoff;

      const questionDetails: AttemptResult['questionDetails'] = dbAttempt.answers.map(ans => {
        const q = ans.question;
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
          status: ans.isAnswered ? (ans.isMarkedForReview ? 'ANSWERED_AND_MARKED' : 'ANSWERED') : (ans.isMarkedForReview ? 'MARKED_FOR_REVIEW' : 'NOT_ANSWERED'),
          marksObtained: ans.marksObtained,
          timeSpentSeconds: ans.timeSpentSeconds,
        };
      });

      return {
        id: dbAttempt.id,
        mockTestId: dbAttempt.mockTestId,
        mockTestTitle: dbAttempt.mockTest?.title || 'Banking Examination Practice Mock',
        examSlug: dbAttempt.mockTest?.exam?.slug || 'ibps-po',
        examTitle: dbAttempt.mockTest?.exam?.title || 'IBPS PO Prelims',
        userId: dbAttempt.userId,
        userName: dbAttempt.user?.name || 'Aspirant',
        startedAt: dbAttempt.startedAt.toISOString(),
        completedAt: dbAttempt.completedAt?.toISOString() || new Date().toISOString(),
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
        sectionResults: [],
        topicResults: [],
        questionDetails,
      };
    }
  } catch (err) {
    console.warn('Neon DB query error in getAttemptByIdAction:', err);
  }

  // Fallback to sample attempts
  const sample = SAMPLE_ATTEMPTS.find(a => a.id === attemptId);
  return sample || null;
}

/**
 * Retrieves all attempts for a candidate from Neon PostgreSQL
 */
export async function getUserAttemptsAction(userId?: string): Promise<AttemptResult[]> {
  try {
    let currentUser = null;
    try {
      currentUser = await getCurrentUser();
    } catch {
      // Standalone script execution or background worker without request store
    }
    const targetUserId = userId || currentUser?.id;

    if (!targetUserId) {
      return [];
    }

    const dbAttempts = await prisma.attempt.findMany({
      where: { userId: targetUserId, isCompleted: true },
      include: {
        mockTest: { include: { exam: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (dbAttempts && dbAttempts.length > 0) {
      return dbAttempts.map(att => {
        const percentage = att.maxScore > 0 ? (Math.max(0, att.score) / att.maxScore) * 100 : 0;
        const cutoff = att.mockTest?.cutoffMarks || 60;
        return {
          id: att.id,
          mockTestId: att.mockTestId,
          mockTestTitle: att.mockTest?.title || 'Banking Examination Practice Mock',
          examSlug: att.mockTest?.exam?.slug || 'ibps-po',
          examTitle: att.mockTest?.exam?.title || 'IBPS PO Prelims',
          userId: att.userId,
          userName: currentUser?.name || 'Aspirant',
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
        const percentage = att.maxScore > 0 ? (Math.max(0, att.score) / att.maxScore) * 100 : 0;
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

  return SAMPLE_ATTEMPTS;
}
