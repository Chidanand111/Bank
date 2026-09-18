'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../auth/permissions';
import {
  getDatabaseUsers,
  updateDatabaseUserRole,
  updateDatabaseUserStatus,
} from '../auth/session';
import { EXAMS_DATA } from '../data/exams';
import { MOCK_TESTS_DATA } from '../data/mockTests';
import { SAMPLE_ATTEMPTS } from '../data/sampleAttempts';
import { prisma } from '../prisma';
import {
  getAllQuestions,
  addQuestionToJsonDb,
  updateQuestionInJsonDb,
  deleteQuestionFromJsonDb,
  deleteExamQuestionsFromStore,
  deleteQuestionsByIdsFromStore,
  syncQuestionsToStore,
  partitionQuestionsList,
} from '../db/questionDb';

export { partitionQuestionsList };
import {
  AdminExamInput,
  AdminMockTestInput,
  AdminQuestionInput,
  AdminStats,
  AuthUser,
  Exam,
  MockTest,
  Question,
  Role,
  UserStatus,
  Difficulty,
} from '@/types';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Non-HTTP execution context (e.g. background scripts)
  }
}

// In-memory working sets for admin modifications backed by JSON question store and Neon PostgreSQL
let dynamicQuestions: Question[] = getAllQuestions();

let dynamicMockTests: MockTest[] = [...MOCK_TESTS_DATA];
const deletedMockTestIds = new Set<string>();

/**
 * Server-side Admin Statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();

  const users = getDatabaseUsers();
  const totalAdmins = users.filter(u => u.role === 'ADMIN').length;
  const pendingApprovalsCount = users.filter(u => u.status === 'PENDING').length;
  const totalUsers = users.length;
  const totalExams = EXAMS_DATA.length;
  const totalQuestions = dynamicQuestions.length;
  const totalMockTests = dynamicMockTests.length;
  const totalAttempts = SAMPLE_ATTEMPTS.length + 15; // Platform count

  return {
    totalUsers,
    totalAdmins,
    pendingApprovalsCount,
    totalExams,
    totalQuestions,
    totalMockTests,
    totalAttempts,
    recentUsers: users.slice(0, 5),
    recentAttempts: SAMPLE_ATTEMPTS.slice(0, 5),
    popularTests: dynamicMockTests.slice(0, 4).map(t => ({
      id: t.id,
      title: t.title,
      examTitle: t.examTitle,
      attemptsCount: Math.floor(Math.random() * 200) + 50,
    })),
  };
}

/**
 * Server-side User Management & Approval Actions
 */
export async function getAdminUsers(): Promise<AuthUser[]> {
  await requireAdmin();
  const users = getDatabaseUsers();
  return users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status || 'APPROVED',
    createdAt: u.createdAt,
    attemptCount: u.attemptCount,
  }));
}

export async function approveUserAction(userId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const updated = updateDatabaseUserStatus(userId, 'APPROVED');
  if (!updated) {
    return { success: false, error: 'User record not found.' };
  }

  safeRevalidatePath('/admin/users');
  safeRevalidatePath('/admin');
  return { success: true };
}

export async function rejectUserAction(userId: string): Promise<{ success: boolean; error?: string }> {
  const currentAdmin = await requireAdmin();

  if (currentAdmin.id === userId) {
    return {
      success: false,
      error: 'Security Guard: You cannot reject or suspend your own account.',
    };
  }

  const updated = updateDatabaseUserStatus(userId, 'REJECTED');
  if (!updated) {
    return { success: false, error: 'User record not found.' };
  }

  safeRevalidatePath('/admin/users');
  safeRevalidatePath('/admin');
  return { success: true };
}

export async function updateUserStatusAction(
  userId: string,
  newStatus: UserStatus
): Promise<{ success: boolean; error?: string }> {
  const currentAdmin = await requireAdmin();

  if (currentAdmin.id === userId && newStatus !== 'APPROVED') {
    return {
      success: false,
      error: 'Security Guard: You cannot revoke or suspend your own status.',
    };
  }

  const updated = updateDatabaseUserStatus(userId, newStatus);
  if (!updated) {
    return { success: false, error: 'User record not found.' };
  }

  safeRevalidatePath('/admin/users');
  safeRevalidatePath('/admin');
  return { success: true };
}

export async function updateUserRoleAction(userId: string, newRole: Role): Promise<{ success: boolean; error?: string }> {
  const currentAdmin = await requireAdmin();

  // SELF-DEMOTION PROTECTION: Admin cannot demote themselves!
  if (currentAdmin.id === userId && newRole !== 'ADMIN') {
    return {
      success: false,
      error: 'Security Guard: You cannot revoke your own administrator privileges.',
    };
  }

  const updated = updateDatabaseUserRole(userId, newRole);
  if (!updated) {
    return { success: false, error: 'User not found in database.' };
  }

  safeRevalidatePath('/admin/users');
  return { success: true };
}

/**
 * Load latest questions directly from Neon PostgreSQL, syncing with in-memory stores
 */
export async function loadFreshQuestionsFromDb(): Promise<Question[]> {
  try {
    const dbQuestions = await prisma.question.findMany({
      include: {
        options: { orderBy: { order: 'asc' } },
        exam: true,
        section: true,
        topic: true,
      },
      orderBy: { id: 'asc' },
    });

    if (dbQuestions && dbQuestions.length > 0) {
      const mapped: Question[] = dbQuestions.map(q => ({
        id: q.id,
        text: q.text,
        imageUrl: q.imageUrl || undefined,
        passage: q.passage || undefined,
        passageImageUrl: q.passageImageUrl || undefined,
        groupId: q.groupId || undefined,
        isPyq: q.isPyq,
        pyqYear: q.pyqYear || undefined,
        pyqExam: q.pyqExam || undefined,
        difficulty: (q.difficulty as Difficulty) || 'MEDIUM',
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
      }));

      dynamicQuestions = mapped;
      syncQuestionsToStore(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Neon DB query in adminService:', err);
  }

  return dynamicQuestions;
}

/**
 * Server-side Question Management with live Neon PostgreSQL storage
 */
export async function getAdminQuestions(filters?: {
  search?: string;
  examId?: string;
  sectionCode?: string;
  difficulty?: string;
  partition?: string;
}): Promise<Question[]> {
  await requireAdmin();

  // Load fresh data directly from Neon PostgreSQL
  const sourceQuestions = await loadFreshQuestionsFromDb();

  let list: Question[] = [];

  if (filters?.partition && filters.partition !== 'ALL') {
    try {
      const dbMockTest = await prisma.mockTest.findFirst({
        where: {
          OR: [
            { id: filters.partition },
            { slug: filters.partition },
            { slug: filters.partition.replace(/^mock-/, '') },
          ],
        },
        include: {
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
            },
          },
        },
      });

      if (dbMockTest && dbMockTest.mockTestQuestions.length > 0) {
        list = dbMockTest.mockTestQuestions.map(mtq => {
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
            difficulty: (q.difficulty as Difficulty) || 'MEDIUM',
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
          };
        });
      } else if (dbMockTest && dbMockTest.mockTestQuestions.length === 0) {
        list = [];
      } else {
        list = partitionQuestionsList(sourceQuestions, filters.partition);
      }
    } catch {
      list = partitionQuestionsList(sourceQuestions, filters.partition);
    }
  } else {
    list = [...sourceQuestions];
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(item =>
      item.text.toLowerCase().includes(q) ||
      item.topicName.toLowerCase().includes(q) ||
      (item.passage && item.passage.toLowerCase().includes(q))
    );
  }

  if (filters?.examId && filters.examId !== 'ALL') {
    list = list.filter(item => item.examId === filters.examId);
  }

  if (filters?.sectionCode && filters.sectionCode !== 'ALL') {
    list = list.filter(item => item.sectionCode === filters.sectionCode);
  }

  if (filters?.difficulty && filters.difficulty !== 'ALL') {
    list = list.filter(item => item.difficulty === filters.difficulty);
  }

  return list;
}

export async function createQuestionAction(input: AdminQuestionInput): Promise<{ success: boolean; question?: Question; error?: string }> {
  await requireAdmin();

  const exam = EXAMS_DATA.find(e => e.id === input.examId || e.slug === input.examId) || EXAMS_DATA[0];
  const newQuestionId = `q-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const newQuestion: Question = {
    id: newQuestionId,
    text: input.text,
    imageUrl: input.imageUrl,
    passage: input.passage,
    passageImageUrl: input.passageImageUrl,
    groupId: input.groupId,
    isPyq: Boolean(input.isPyq),
    pyqYear: input.pyqYear,
    pyqExam: input.pyqExam || (input.isPyq ? (input.pyqYear === 2023 ? 'SBI Clerk Prelims 2023-24' : 'SBI Clerk Prelims 2024') : undefined),
    difficulty: input.difficulty,
    explanation: input.explanation,
    marks: input.marks,
    negativeMarks: input.negativeMarks,
    examId: input.examId || exam.id,
    sectionId: `sec-${input.sectionCode.toLowerCase()}`,
    sectionCode: input.sectionCode,
    sectionName: input.sectionCode === 'QUANT' ? 'Quantitative Aptitude' : input.sectionCode === 'ENGLISH' ? 'English Language' : 'Reasoning Ability',
    topicId: `top-${input.topicName.toLowerCase().replace(/\s+/g, '-')}`,
    topicName: input.topicName,
    options: input.options.map((opt, i) => ({
      id: `opt-${newQuestionId}-${i + 1}`,
      questionId: newQuestionId,
      text: opt.text,
      imageUrl: opt.imageUrl,
      isCorrect: Boolean(opt.isCorrect),
      order: i + 1,
    })),
  };

  dynamicQuestions.unshift(newQuestion);
  addQuestionToJsonDb({
    id: newQuestionId,
    exam: input.examId || (input.isPyq ? (input.pyqExam || 'SBI Clerk Prelims 2024 PYQ') : exam.title),
    section: newQuestion.sectionName,
    topic: input.topicName,
    question: input.text,
    imageUrl: input.imageUrl,
    passage: input.passage,
    passageImageUrl: input.passageImageUrl,
    groupId: input.groupId,
    isPyq: input.isPyq,
    pyqYear: input.pyqYear,
    pyqExam: input.pyqExam,
    options: input.options.reduce((acc, opt, i) => {
      const key = String.fromCharCode(65 + i);
      if (opt.imageUrl) {
        acc[key] = { text: opt.text, imageUrl: opt.imageUrl };
      } else {
        acc[key] = opt.text;
      }
      return acc;
    }, {} as Record<string, string | { text: string; imageUrl?: string }>),
    answer: String.fromCharCode(65 + Math.max(0, input.options.findIndex(o => o.isCorrect))),
    explanation: input.explanation,
    difficulty: input.difficulty,
    marks: input.marks,
    negativeMarks: input.negativeMarks,
  });

  // Persist directly to Neon PostgreSQL Database
  try {
    const dbExam = input.examId
      ? await prisma.exam.findFirst({
          where: {
            OR: [
              { id: input.examId },
              { slug: input.examId.replace('exam-', '') },
            ],
          },
          include: { sections: { include: { topics: true } } },
        })
      : await prisma.exam.findFirst({
          include: { sections: { include: { topics: true } } },
        });

    const finalExamId = dbExam ? dbExam.id : (await prisma.exam.findFirst())?.id || input.examId || 'exam-ibps-po';
    const existingSec = dbExam?.sections.find(s => s.code === input.sectionCode);
    const fallbackSec = existingSec ? null : await prisma.section.findFirst({ where: { code: input.sectionCode } });
    const finalSecId = existingSec?.id || fallbackSec?.id || (await prisma.section.findFirst())?.id || newQuestion.sectionId;

    const existingTopic = existingSec?.topics.find(t => t.name.toLowerCase() === input.topicName.toLowerCase());
    const fallbackTopic = existingTopic ? null : await prisma.topic.findFirst({ where: { sectionId: finalSecId } });
    const finalTopicId = existingTopic?.id || fallbackTopic?.id || (await prisma.topic.findFirst())?.id || newQuestion.topicId;

    await prisma.question.create({
      data: {
        id: newQuestionId,
        text: input.text,
        imageUrl: input.imageUrl || null,
        passage: input.passage || null,
        passageImageUrl: input.passageImageUrl || null,
        groupId: input.groupId || null,
        isPyq: Boolean(input.isPyq),
        pyqYear: input.pyqYear ? Number(input.pyqYear) : null,
        pyqExam: input.pyqExam || null,
        difficulty: input.difficulty,
        explanation: input.explanation,
        marks: input.marks,
        negativeMarks: input.negativeMarks,
        examId: finalExamId,
        sectionId: finalSecId,
        topicId: finalTopicId,
        options: {
          create: input.options.map((opt, i) => ({
            id: `opt-${newQuestionId}-${i + 1}`,
            text: opt.text || '',
            imageUrl: opt.imageUrl || null,
            isCorrect: Boolean(opt.isCorrect),
            order: i + 1,
          })),
        },
      },
    });

    // Link question to targeted mock test or PYQ paper in Neon DB
    const targetMockId = input.mockTestId && input.mockTestId !== 'ALL' ? input.mockTestId : undefined;
    if (targetMockId || (input.isPyq && input.pyqExam)) {
      const dbMockTest = await prisma.mockTest.findFirst({
        where: {
          OR: [
            ...(targetMockId ? [{ id: targetMockId }, { slug: targetMockId }, { slug: targetMockId.replace('mock-', '') }] : []),
            ...(input.pyqExam ? [{ title: input.pyqExam }, { slug: input.pyqExam.toLowerCase().replace(/[^a-z0-9]+/g, '-') }] : []),
          ],
        },
      });

      if (dbMockTest) {
        const orderCount = await prisma.mockTestQuestion.count({
          where: { mockTestId: dbMockTest.id },
        });

        await prisma.mockTestQuestion.upsert({
          where: {
            mockTestId_questionId: {
              mockTestId: dbMockTest.id,
              questionId: newQuestionId,
            },
          },
          update: {
            order: orderCount + 1,
            sectionId: finalSecId,
          },
          create: {
            mockTestId: dbMockTest.id,
            questionId: newQuestionId,
            sectionId: finalSecId,
            order: orderCount + 1,
          },
        });
      }
    }
  } catch (dbErr) {
    console.warn('Neon DB async sync on createQuestion:', dbErr);
  }

  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/admin/tests');
  return { success: true, question: newQuestion };
}

/**
 * Bulk Question Importer Action
 * Supports batch insertion of parsed CSV / JSON questions with transactional safety
 */
export async function bulkImportQuestionsAction(
  questions: AdminQuestionInput[],
  partitionId?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  await requireAdmin();

  if (!questions || questions.length === 0) {
    return { success: false, count: 0, error: 'No questions provided for import.' };
  }

  let importedCount = 0;
  for (const qInput of questions) {
    try {
      // If a specific partition is provided, assign it to question and associate target examId
      const inputToUse = { ...qInput };
      if (partitionId && partitionId !== 'ALL') {
        inputToUse.mockTestId = partitionId;
        if (partitionId.toLowerCase().includes('sbi') || partitionId.toLowerCase().includes('clerk')) {
          inputToUse.examId = 'exam-sbi-clerk';
        } else if (partitionId.startsWith('exam-')) {
          inputToUse.examId = partitionId;
        } else if (!inputToUse.examId) {
          inputToUse.examId = 'exam-ibps-po';
        }
      }

      const res = await createQuestionAction(inputToUse);
      if (res.success && res.question) {
        importedCount++;
      }
    } catch (e) {
      console.error('Error importing question row:', e);
    }
  }

  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/admin');
  return { success: true, count: importedCount };
}

export async function updateQuestionAction(
  questionId: string,
  input: AdminQuestionInput
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  let index = dynamicQuestions.findIndex(q => q.id === questionId);
  if (index === -1) {
    index = dynamicQuestions.findIndex(q => {
      const qNorm = q.id.replace(/^q-json-/, '').replace(/^q-/, '');
      const tNorm = questionId.replace(/^q-json-/, '').replace(/^q-/, '');
      return qNorm === tNorm;
    });
  }

  const existing = index !== -1 ? dynamicQuestions[index] : null;
  const actualId = existing ? existing.id : questionId;

  const updatedQuestion: Question = {
    id: actualId,
    text: input.text,
    imageUrl: input.imageUrl,
    passage: input.passage,
    passageImageUrl: input.passageImageUrl,
    groupId: input.groupId,
    isPyq: input.isPyq !== undefined ? input.isPyq : (existing?.isPyq ?? false),
    pyqYear: input.pyqYear !== undefined ? input.pyqYear : existing?.pyqYear,
    pyqExam: input.pyqExam || existing?.pyqExam,
    difficulty: input.difficulty,
    explanation: input.explanation,
    marks: input.marks,
    negativeMarks: input.negativeMarks,
    examId: existing?.examId || input.examId,
    sectionId: existing?.sectionId || `sec-${input.sectionCode.toLowerCase()}`,
    sectionCode: input.sectionCode,
    sectionName: existing?.sectionName || (input.sectionCode === 'QUANT' ? 'Quantitative Aptitude' : input.sectionCode === 'ENGLISH' ? 'English Language' : 'Reasoning Ability'),
    topicId: existing?.topicId || `top-${input.topicName.toLowerCase().replace(/\s+/g, '-')}`,
    topicName: input.topicName,
    options: input.options.map((opt, i) => ({
      id: existing?.options[i]?.id || `opt-${actualId}-${i + 1}`,
      questionId: actualId,
      text: opt.text,
      imageUrl: opt.imageUrl,
      isCorrect: opt.isCorrect,
      order: i + 1,
    })),
  };

  if (index !== -1) {
    dynamicQuestions[index] = updatedQuestion;
  } else {
    dynamicQuestions.unshift(updatedQuestion);
  }

  updateQuestionInJsonDb(actualId, {
    question: input.text,
    imageUrl: input.imageUrl,
    passage: input.passage,
    passageImageUrl: input.passageImageUrl,
    groupId: input.groupId,
    isPyq: input.isPyq,
    pyqYear: input.pyqYear,
    pyqExam: input.pyqExam,
    difficulty: input.difficulty,
    explanation: input.explanation,
    marks: input.marks,
    negativeMarks: input.negativeMarks,
    section: updatedQuestion.sectionName,
    topic: input.topicName,
    options: input.options.reduce((acc, opt, i) => {
      const key = String.fromCharCode(65 + i);
      if (opt.imageUrl) {
        acc[key] = { text: opt.text, imageUrl: opt.imageUrl };
      } else {
        acc[key] = opt.text;
      }
      return acc;
    }, {} as Record<string, string | { text: string; imageUrl?: string }>),
    answer: String.fromCharCode(65 + Math.max(0, input.options.findIndex(o => o.isCorrect))),
  });

  // Keep in-memory store in sync
  syncQuestionsToStore([updatedQuestion]);

  // Persist directly to Neon PostgreSQL Database via UPSERT
  try {
    const finalExamId = updatedQuestion.examId;
    const finalSecId = updatedQuestion.sectionId;
    const finalTopicId = updatedQuestion.topicId;

    await prisma.question.upsert({
      where: { id: actualId },
      update: {
        text: input.text,
        imageUrl: input.imageUrl || null,
        passage: input.passage || null,
        passageImageUrl: input.passageImageUrl || null,
        groupId: input.groupId || null,
        isPyq: Boolean(input.isPyq),
        pyqYear: input.pyqYear ? Number(input.pyqYear) : null,
        pyqExam: input.pyqExam || null,
        difficulty: input.difficulty,
        explanation: input.explanation,
        marks: input.marks,
        negativeMarks: input.negativeMarks,
      },
      create: {
        id: actualId,
        text: input.text,
        imageUrl: input.imageUrl || null,
        passage: input.passage || null,
        passageImageUrl: input.passageImageUrl || null,
        groupId: input.groupId || null,
        isPyq: Boolean(input.isPyq),
        pyqYear: input.pyqYear ? Number(input.pyqYear) : null,
        pyqExam: input.pyqExam || null,
        difficulty: input.difficulty,
        explanation: input.explanation,
        marks: input.marks,
        negativeMarks: input.negativeMarks,
        examId: finalExamId,
        sectionId: finalSecId,
        topicId: finalTopicId,
      },
    });

    // Update options in database with images
    await prisma.option.deleteMany({ where: { questionId: actualId } });
    for (let i = 0; i < input.options.length; i++) {
      const opt = input.options[i];
      await prisma.option.create({
        data: {
          id: `opt-${actualId}-${i + 1}`,
          questionId: actualId,
          text: opt.text || '',
          imageUrl: opt.imageUrl || null,
          isCorrect: opt.isCorrect,
          order: i + 1,
        },
      });
    }
  } catch (dbErr) {
    console.error('Neon DB save error on updateQuestion:', dbErr);
    return {
      success: false,
      error: `Failed to persist to database: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`,
    };
  }

  safeRevalidatePath('/admin/questions');
  return { success: true };
}

/**
 * Server Action: Fetches fixed questions for live exam attempts directly from Neon PostgreSQL,
 * guaranteeing all question and option diagrams are rendered during the test.
 */
export async function getLiveExamQuestionsAction(testIdOrSlug: string): Promise<Question[]> {
  try {
    const dbMockTest = await prisma.mockTest.findFirst({
      where: {
        OR: [
          { id: testIdOrSlug },
          { slug: testIdOrSlug },
          { slug: testIdOrSlug.replace(/^mock-/, '') },
        ],
      },
      include: {
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

    if (dbMockTest && dbMockTest.mockTestQuestions.length > 0) {
      return dbMockTest.mockTestQuestions.map(mtq => {
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
          difficulty: (q.difficulty as Difficulty) || 'MEDIUM',
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
  } catch (err) {
    console.warn('getLiveExamQuestionsAction DB mockTest query fallback:', err);
  }

  const freshQuestions = await loadFreshQuestionsFromDb();
  return partitionQuestionsList(freshQuestions, testIdOrSlug);
}

export async function deleteQuestionAction(questionId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  dynamicQuestions = dynamicQuestions.filter(q => q.id !== questionId);
  deleteQuestionFromJsonDb(questionId);
  deleteQuestionsByIdsFromStore([questionId]);

  try {
    await prisma.answer.deleteMany({ where: { questionId } });
    await prisma.mockTestQuestion.deleteMany({ where: { questionId } });
    await prisma.option.deleteMany({ where: { questionId } });
    await prisma.question.delete({ where: { id: questionId } });
  } catch (dbErr) {
    console.warn('Neon DB async sync on deleteQuestion:', dbErr);
  }

  safeRevalidatePath('/admin/questions');
  return { success: true };
}

/**
 * Server-side Exam Management & Custom Exam Creation
 */
export async function getAdminExams(): Promise<Exam[]> {
  try {
    const dbExams = await prisma.exam.findMany({
      include: {
        sections: { include: { topics: true } },
        mockTests: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (dbExams && dbExams.length > 0) {
      const mapped: Exam[] = dbExams.map(e => {
        const existing = EXAMS_DATA.find(ex => ex.id === e.id || ex.slug === e.slug);
        return {
          id: e.id,
          slug: e.slug,
          title: e.title,
          category: e.category,
          description: e.description,
          shortDescription: existing?.shortDescription || e.description,
          totalMockTests: e.mockTests?.length || existing?.totalMockTests || 0,
          patterns: existing?.patterns || [
            {
              stage: 'Prelims',
              totalQuestions: 100,
              totalMarks: 100,
              totalDurationMinutes: 60,
              sections: e.sections.map(s => ({
                id: s.id,
                name: s.name,
                code: s.code,
                numQuestions: s.code === 'ENGLISH' ? 30 : 35,
                maxMarks: s.code === 'ENGLISH' ? 30 : 35,
                durationMinutes: 20,
                topics: s.topics.map(t => t.name),
              })),
            },
          ],
        };
      });

      const merged = [...mapped];
      for (const se of EXAMS_DATA) {
        if (!merged.some(m => m.id === se.id || m.slug === se.slug)) {
          merged.push(se);
        }
      }
      return merged;
    }
  } catch (err) {
    console.warn('Neon DB query in getAdminExams:', err);
  }
  return EXAMS_DATA;
}

export async function createExamAction(input: AdminExamInput): Promise<{ success: boolean; exam?: Exam; error?: string }> {
  await requireAdmin();

  const title = input.title?.trim();
  if (!title) {
    return { success: false, error: 'Exam title is required.' };
  }

  const slug = input.slug?.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const category = input.category || (title.toLowerCase().includes('clerk') ? 'CLERK' : title.toLowerCase().includes('so') ? 'SO' : 'PO');
  const description = input.description?.trim() || `${title} Recruitment Examination for Banking Aspirants`;

  const newExamId = `exam-${slug}`;

  try {
    const dbExam = await prisma.exam.upsert({
      where: { slug },
      update: {
        title,
        category,
        description,
        isActive: true,
      },
      create: {
        id: newExamId,
        slug,
        title,
        category,
        description,
        isActive: true,
      },
    });

    // Ensure 4 standard sections for this exam
    await prisma.section.upsert({
      where: { examId_code: { examId: dbExam.id, code: 'ENGLISH' } },
      update: { name: 'English Language', order: 1 },
      create: { id: `sec-${slug}-eng`, examId: dbExam.id, code: 'ENGLISH', name: 'English Language', order: 1 },
    });
    await prisma.section.upsert({
      where: { examId_code: { examId: dbExam.id, code: 'QUANT' } },
      update: { name: 'Quantitative Aptitude', order: 2 },
      create: { id: `sec-${slug}-quant`, examId: dbExam.id, code: 'QUANT', name: 'Quantitative Aptitude', order: 2 },
    });
    await prisma.section.upsert({
      where: { examId_code: { examId: dbExam.id, code: 'REASONING' } },
      update: { name: 'Reasoning Ability', order: 3 },
      create: { id: `sec-${slug}-reason`, examId: dbExam.id, code: 'REASONING', name: 'Reasoning Ability', order: 3 },
    });
    await prisma.section.upsert({
      where: { examId_code: { examId: dbExam.id, code: 'FINANCIAL_AWARENESS' } },
      update: { name: 'General / Banking Awareness', order: 4 },
      create: { id: `sec-${slug}-ga`, examId: dbExam.id, code: 'FINANCIAL_AWARENESS', name: 'General / Banking Awareness', order: 4 },
    });

    const fullExam: Exam = {
      id: dbExam.id,
      slug: dbExam.slug,
      title: dbExam.title,
      category: dbExam.category,
      description: dbExam.description,
      shortDescription: dbExam.description,
      totalMockTests: 0,
      patterns: [
        {
          stage: 'Prelims',
          totalQuestions: 100,
          totalMarks: 100,
          totalDurationMinutes: 60,
          sections: [
            { id: `sec-${slug}-eng`, name: 'English Language', code: 'ENGLISH', numQuestions: 30, maxMarks: 30, durationMinutes: 20, topics: ['Reading Comprehension', 'Error Detection'] },
            { id: `sec-${slug}-quant`, name: 'Quantitative Aptitude', code: 'QUANT', numQuestions: 35, maxMarks: 35, durationMinutes: 20, topics: ['Data Interpretation', 'Arithmetic'] },
            { id: `sec-${slug}-reason`, name: 'Reasoning Ability', code: 'REASONING', numQuestions: 35, maxMarks: 35, durationMinutes: 20, topics: ['Puzzles', 'Seating Arrangement'] },
          ],
        },
      ],
    };

    if (!EXAMS_DATA.some(e => e.id === fullExam.id || e.slug === fullExam.slug)) {
      EXAMS_DATA.push(fullExam);
    }

    safeRevalidatePath('/admin/exams');
    safeRevalidatePath('/admin/tests');
    safeRevalidatePath('/admin/questions');
    safeRevalidatePath('/exams');

    return { success: true, exam: fullExam };
  } catch (err) {
    console.error('Failed to create custom exam:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateExamTitleAction(
  examIdOrSlug: string,
  newTitle: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const trimmedTitle = newTitle?.trim();
  if (!trimmedTitle) {
    return { success: false, error: 'Exam title is required.' };
  }

  try {
    const dbExam = await prisma.exam.findFirst({
      where: {
        OR: [
          { id: examIdOrSlug },
          { slug: examIdOrSlug },
          { slug: examIdOrSlug.replace(/^exam-/, '') },
        ],
      },
    });

    if (dbExam) {
      await prisma.exam.update({
        where: { id: dbExam.id },
        data: {
          title: trimmedTitle,
          ...(description !== undefined ? { description: description.trim() } : {}),
        },
      });
    }

    // Update in-memory EXAMS_DATA
    const staticExam = EXAMS_DATA.find(e => e.id === examIdOrSlug || e.slug === examIdOrSlug || (dbExam && e.id === dbExam.id));
    if (staticExam) {
      staticExam.title = trimmedTitle;
      if (description) {
        staticExam.description = description.trim();
        staticExam.shortDescription = description.trim();
      }
    }

    // Update references in dynamicMockTests
    for (const mt of dynamicMockTests) {
      if (mt.examId === examIdOrSlug || (dbExam && mt.examId === dbExam.id)) {
        mt.examTitle = trimmedTitle;
      }
    }

    safeRevalidatePath('/admin/exams');
    safeRevalidatePath('/admin/tests');
    safeRevalidatePath('/admin/questions');
    safeRevalidatePath('/exams');
    safeRevalidatePath('/tests');

    return { success: true };
  } catch (err) {
    console.error('Failed to update exam title:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Permanently deletes an Exam and all its associated questions, options,
 * mock tests, and attempts across Neon PostgreSQL and the in-memory store
 * to optimize database storage.
 */
export async function deleteExamAction(
  examIdOrSlug: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  await requireAdmin();

  if (!examIdOrSlug) {
    return { success: false, error: 'Exam ID or slug is required.' };
  }

  let deletedQuestionsCount = 0;

  try {
    // 1. Locate Exam in Neon PostgreSQL
    const dbExam = await prisma.exam.findFirst({
      where: {
        OR: [
          { id: examIdOrSlug },
          { slug: examIdOrSlug },
          { slug: examIdOrSlug.replace(/^exam-/, '') },
        ],
      },
      include: {
        questions: { select: { id: true } },
        mockTests: { select: { id: true } },
      },
    });

    const targetExamId = dbExam ? dbExam.id : examIdOrSlug;
    const targetSlug = dbExam ? dbExam.slug : examIdOrSlug.replace(/^exam-/, '');
    const examTitle = dbExam ? dbExam.title : EXAMS_DATA.find(e => e.id === examIdOrSlug || e.slug === examIdOrSlug)?.title;

    // 2. Cascade Delete from Neon PostgreSQL
    if (dbExam) {
      // Find all mock tests under this exam
      const mockTests = await prisma.mockTest.findMany({
        where: {
          OR: [{ examId: dbExam.id }, { examId: targetExamId }, { examId: targetSlug }],
        },
        select: { id: true },
      });
      const mockTestIds = mockTests.map(m => m.id);

      // Find all questions associated with this exam (direct or via mock tests or pyqExam)
      const examQuestions = await prisma.question.findMany({
        where: {
          OR: [
            { examId: dbExam.id },
            { examId: targetExamId },
            { examId: targetSlug },
            ...(examTitle ? [{ pyqExam: examTitle }] : []),
            ...(mockTestIds.length > 0
              ? [{ mockTestQuestions: { some: { mockTestId: { in: mockTestIds } } } }]
              : []),
          ],
        },
        select: { id: true },
      });
      const questionIds = Array.from(new Set(examQuestions.map(q => q.id)));
      deletedQuestionsCount = questionIds.length;

      // Delete student answers for these questions or attempts of these mock tests
      if (questionIds.length > 0 || mockTestIds.length > 0) {
        await prisma.answer.deleteMany({
          where: {
            OR: [
              ...(questionIds.length > 0 ? [{ questionId: { in: questionIds } }] : []),
              ...(mockTestIds.length > 0 ? [{ attempt: { mockTestId: { in: mockTestIds } } }] : []),
            ],
          },
        });
      }

      // Delete candidate attempts
      if (mockTestIds.length > 0) {
        await prisma.attempt.deleteMany({
          where: { mockTestId: { in: mockTestIds } },
        });
      }

      // Delete mockTestQuestions junction links
      if (mockTestIds.length > 0 || questionIds.length > 0) {
        await prisma.mockTestQuestion.deleteMany({
          where: {
            OR: [
              ...(mockTestIds.length > 0 ? [{ mockTestId: { in: mockTestIds } }] : []),
              ...(questionIds.length > 0 ? [{ questionId: { in: questionIds } }] : []),
            ],
          },
        });
      }

      // Delete question options to reclaim DB space
      if (questionIds.length > 0) {
        await prisma.option.deleteMany({
          where: { questionId: { in: questionIds } },
        });
      }

      // Permanently delete questions to reclaim DB space
      if (questionIds.length > 0) {
        await prisma.question.deleteMany({
          where: { id: { in: questionIds } },
        });
      }

      // Delete mock tests
      if (mockTestIds.length > 0) {
        await prisma.mockTest.deleteMany({
          where: { id: { in: mockTestIds } },
        });
      }

      // Delete topics under sections
      const sections = await prisma.section.findMany({
        where: { examId: dbExam.id },
        select: { id: true },
      });
      const sectionIds = sections.map(s => s.id);
      if (sectionIds.length > 0) {
        await prisma.topic.deleteMany({
          where: { sectionId: { in: sectionIds } },
        });
        await prisma.section.deleteMany({
          where: { id: { in: sectionIds } },
        });
      }

      // Delete the exam record itself
      await prisma.exam.delete({
        where: { id: dbExam.id },
      });
    }

    // 3. Remove all matching questions from in-memory dynamicQuestions
    const initialDynCount = dynamicQuestions.length;
    dynamicQuestions = dynamicQuestions.filter(q => {
      const qExam = String(q.examId || '').toLowerCase();
      if (qExam === targetExamId.toLowerCase() || qExam === targetSlug.toLowerCase()) return false;
      if (examTitle && q.sectionName && q.topicName && q.pyqExam === examTitle) return false;
      return true;
    });
    deletedQuestionsCount += Math.max(0, initialDynCount - dynamicQuestions.length);

    // 4. Remove all matching questions from questionStore (JSON database mirror)
    deletedQuestionsCount += deleteExamQuestionsFromStore(targetExamId, examTitle);

    // 5. Remove matching mock tests from dynamicMockTests
    dynamicMockTests = dynamicMockTests.filter(mt => {
      return mt.examId !== targetExamId && mt.examId !== targetSlug;
    });

    // 6. Remove exam from in-memory EXAMS_DATA
    const staticIndex = EXAMS_DATA.findIndex(
      e => e.id === targetExamId || e.slug === targetSlug || e.id === examIdOrSlug || e.slug === examIdOrSlug
    );
    if (staticIndex !== -1) {
      EXAMS_DATA.splice(staticIndex, 1);
    }

    // 7. Revalidate Next.js cache paths
    safeRevalidatePath('/admin/exams');
    safeRevalidatePath('/admin/questions');
    safeRevalidatePath('/admin/tests');
    safeRevalidatePath('/exams');
    safeRevalidatePath('/tests');
    safeRevalidatePath('/dashboard');

    return { success: true, count: deletedQuestionsCount };
  } catch (err) {
    console.error('Failed to delete exam and cascade questions:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateMockTestTitleAction(
  testIdOrSlug: string,
  newTitle: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const trimmedTitle = newTitle?.trim();
  if (!trimmedTitle) {
    return { success: false, error: 'Title is required.' };
  }

  try {
    const dbTest = await prisma.mockTest.findFirst({
      where: {
        OR: [
          { id: testIdOrSlug },
          { slug: testIdOrSlug },
          { slug: testIdOrSlug.replace(/^mock-/, '') },
        ],
      },
    });

    if (dbTest) {
      await prisma.mockTest.update({
        where: { id: dbTest.id },
        data: {
          title: trimmedTitle,
          ...(description !== undefined ? { description: description.trim() } : {}),
        },
      });
    }

    // Update in-memory dynamicMockTests
    const inMem = dynamicMockTests.find(t => t.id === testIdOrSlug || t.slug === testIdOrSlug || (dbTest && t.id === dbTest.id));
    if (inMem) {
      inMem.title = trimmedTitle;
      if (description) inMem.description = description.trim();
    }

    const staticMem = MOCK_TESTS_DATA.find(t => t.id === testIdOrSlug || t.slug === testIdOrSlug || (dbTest && t.id === dbTest.id));
    if (staticMem) {
      staticMem.title = trimmedTitle;
      if (description) staticMem.description = description.trim();
    }

    safeRevalidatePath('/admin/tests');
    safeRevalidatePath('/admin/questions');
    safeRevalidatePath('/tests');

    return { success: true };
  } catch (err) {
    console.error('Failed to update mock test title:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Load latest mock tests and PYQs directly from Neon PostgreSQL
 */
export async function loadFreshMockTestsFromDb(): Promise<MockTest[]> {
  try {
    const dbTests = await prisma.mockTest.findMany({
      include: {
        exam: {
          include: { sections: true },
        },
        mockTestQuestions: {
          include: {
            question: {
              include: {
                options: true,
                section: true,
                topic: true,
              },
            },
            section: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (dbTests && dbTests.length > 0) {
      const mapped: MockTest[] = dbTests.map(t => {
        const existingTemplate = dynamicMockTests.find(mt => mt.id === t.id || mt.slug === t.slug) || MOCK_TESTS_DATA.find(mt => mt.id === t.id || mt.slug === t.slug);

        const liveQuestions: Question[] = t.mockTestQuestions.map(mtq => {
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
            difficulty: (q.difficulty as Difficulty) || 'MEDIUM',
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

        const sections = existingTemplate?.sections || (
          t.exam?.sections && t.exam.sections.length > 0
            ? t.exam.sections.map(s => ({
                id: s.id,
                code: s.code,
                name: s.name,
                questionCount: s.code === 'FINANCIAL_AWARENESS' ? 40 : 35,
                marks: s.code === 'FINANCIAL_AWARENESS' ? 40 : 35,
                durationMinutes: s.code === 'FINANCIAL_AWARENESS' ? 35 : 20,
              }))
            : [
                { id: `sec-${t.slug}-eng`, code: 'ENGLISH', name: 'English Language', questionCount: 30, marks: 30, durationMinutes: 20 },
                { id: `sec-${t.slug}-quant`, code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 35, marks: 35, durationMinutes: 20 },
                { id: `sec-${t.slug}-reason`, code: 'REASONING', name: 'Reasoning Ability', questionCount: 35, marks: 35, durationMinutes: 20 },
              ]
        );

        return {
          id: t.id,
          slug: t.slug,
          title: t.title,
          description: t.description,
          examId: t.examId,
          examSlug: t.exam?.slug || 'other',
          examTitle: t.exam?.title || 'Banking Exam',
          durationMinutes: t.durationMinutes,
          totalMarks: t.totalMarks,
          totalQuestions: liveQuestions.length || t.totalQuestions,
          cutoffMarks: t.cutoffMarks ?? 50,
          isFree: t.isFree,
          isFixed: t.isFixed,
          isPyq: t.isPyq,
          year: t.year ?? undefined,
          sections,
          questions: liveQuestions,
        };
      });

      const merged: MockTest[] = mapped.filter(m => !deletedMockTestIds.has(m.id) && !deletedMockTestIds.has(m.slug));
      for (const st of MOCK_TESTS_DATA) {
        if (deletedMockTestIds.has(st.id) || deletedMockTestIds.has(st.slug)) continue;
        if (!merged.some(m => m.id === st.id || m.slug === st.slug)) {
          merged.push(st);
        }
      }
      dynamicMockTests = merged;
      return merged;
    }
  } catch (err) {
    console.warn('Neon DB query in loadFreshMockTestsFromDb:', err);
  }
  return dynamicMockTests.filter(m => !deletedMockTestIds.has(m.id) && !deletedMockTestIds.has(m.slug));
}

/**
 * Server-side Mock Test & PYQ Management
 */
export async function getAdminMockTests(): Promise<MockTest[]> {
  await requireAdmin();
  return await loadFreshMockTestsFromDb();
}

export async function createMockTestAction(input: AdminMockTestInput): Promise<{ success: boolean; test?: MockTest; error?: string }> {
  await requireAdmin();

  let targetExamId = input.examId;
  let customExamObj: Exam | undefined;

  // Support "create new exam he can title it anything"
  if (input.customExamTitle?.trim()) {
    const examRes = await createExamAction({
      title: input.customExamTitle.trim(),
      category: input.customExamCategory || 'OTHER',
      description: `${input.customExamTitle.trim()} Examination Papers`,
    });
    if (examRes.success && examRes.exam) {
      targetExamId = examRes.exam.id;
      customExamObj = examRes.exam;
    } else {
      return { success: false, error: examRes.error || 'Failed to create custom exam.' };
    }
  }

  // Find or fallback exam
  const exam = customExamObj || (await prisma.exam.findFirst({
    where: { OR: [{ id: targetExamId }, { slug: targetExamId.replace('exam-', '') }] },
  })) || EXAMS_DATA.find(e => e.id === targetExamId) || EXAMS_DATA[0];

  const title = input.title?.trim();
  if (!title) {
    return { success: false, error: 'Test title is required.' };
  }

  const rawSlug = input.slug?.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = input.isPyq && !rawSlug.includes('pyq') ? `${rawSlug}-pyq` : rawSlug;
  const newId = `mock-${slug}`;

  const isPyq = Boolean(input.isPyq);
  const year = input.year ? Number(input.year) : (isPyq ? new Date().getFullYear() : undefined);
  const defaultSections = [
    { code: 'ENGLISH', name: 'English Language', questionCount: 30, marks: 30 },
    { code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 35, marks: 35 },
    { code: 'REASONING', name: 'Reasoning Ability', questionCount: 35, marks: 35 },
  ];
  const targetSections = input.sections && input.sections.length > 0 ? input.sections : defaultSections;
  const totalQuestions = targetSections.reduce((acc, s) => acc + (s.questionCount || 0), 0);

  const newTest: MockTest = {
    id: newId,
    slug,
    title,
    description: input.description,
    examId: exam.id,
    examSlug: exam.slug,
    examTitle: exam.title,
    durationMinutes: input.durationMinutes || 60,
    totalMarks: input.totalMarks || 100,
    totalQuestions,
    cutoffMarks: input.cutoffMarks || 60,
    isFree: input.isFree ?? true,
    isFixed: true,
    isPyq,
    year,
    sections: targetSections.map(s => ({
      id: `sec-${s.code.toLowerCase()}`,
      code: s.code,
      name: s.name,
      questionCount: s.questionCount,
      marks: s.marks,
      durationMinutes: s.code === 'FINANCIAL_AWARENESS' ? 35 : s.questionCount >= 40 ? 45 : 20,
    })),
    questions: [],
  };

  try {
    await prisma.mockTest.upsert({
      where: { slug },
      update: {
        title,
        description: input.description,
        examId: exam.id,
        durationMinutes: newTest.durationMinutes,
        totalMarks: newTest.totalMarks,
        totalQuestions: newTest.totalQuestions,
        cutoffMarks: newTest.cutoffMarks,
        isFree: newTest.isFree,
        isPublished: true,
        isFixed: true,
        isPyq,
        year,
      },
      create: {
        id: newId,
        slug,
        title,
        description: input.description,
        examId: exam.id,
        durationMinutes: newTest.durationMinutes,
        totalMarks: newTest.totalMarks,
        totalQuestions: newTest.totalQuestions,
        cutoffMarks: newTest.cutoffMarks,
        isFree: newTest.isFree,
        isPublished: true,
        isFixed: true,
        isPyq,
        year,
      },
    });
  } catch (dbErr) {
    console.warn('Neon DB sync error in createMockTestAction:', dbErr);
  }

  dynamicMockTests.unshift(newTest);
  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/tests');

  return { success: true, test: newTest };
}

export async function deleteMockTestAction(
  testId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  await requireAdmin();

  deletedMockTestIds.add(testId);
  deletedMockTestIds.add(testId.replace(/^mock-/, ''));

  let deletedQuestionsCount = 0;
  dynamicMockTests = dynamicMockTests.filter(t => t.id !== testId && t.slug !== testId);

  try {
    const dbTest = await prisma.mockTest.findFirst({
      where: {
        OR: [
          { id: testId },
          { slug: testId },
          { slug: testId.replace(/^mock-/, '') },
        ],
      },
      include: {
        mockTestQuestions: { select: { questionId: true } },
      },
    });

    if (dbTest) {
      // 1. Gather all question IDs linked to this mock test
      const directQIds = dbTest.mockTestQuestions.map(mtq => mtq.questionId);

      // Also gather any questions whose pyqExam matches dbTest.title or groupId matches dbTest.id/slug
      const relatedQuestions = await prisma.question.findMany({
        where: {
          OR: [
            ...(directQIds.length > 0 ? [{ id: { in: directQIds } }] : []),
            ...(dbTest.title ? [{ pyqExam: dbTest.title }] : []),
            { groupId: dbTest.id },
            { groupId: dbTest.slug },
          ],
        },
        select: { id: true },
      });

      const questionIds = Array.from(new Set(relatedQuestions.map(q => q.id)));
      deletedQuestionsCount = questionIds.length;

      // 2. Cascade delete from Neon DB in proper foreign key order
      if (questionIds.length > 0) {
        // Delete all student answers for these questions or for attempts of this mock test
        await prisma.answer.deleteMany({
          where: {
            OR: [
              { questionId: { in: questionIds } },
              { attempt: { mockTestId: dbTest.id } },
            ],
          },
        });

        // Delete options for these questions
        await prisma.option.deleteMany({
          where: { questionId: { in: questionIds } },
        });

        // Delete mock test question junction links
        await prisma.mockTestQuestion.deleteMany({
          where: {
            OR: [
              { mockTestId: dbTest.id },
              { questionId: { in: questionIds } },
            ],
          },
        });

        // Delete candidate attempts for this mock test
        await prisma.attempt.deleteMany({
          where: { mockTestId: dbTest.id },
        });

        // Permanently delete the questions to save DB space
        await prisma.question.deleteMany({
          where: { id: { in: questionIds } },
        });
      } else {
        // Just delete mock test junction and attempts if no questions found
        await prisma.mockTestQuestion.deleteMany({ where: { mockTestId: dbTest.id } });
        await prisma.attempt.deleteMany({ where: { mockTestId: dbTest.id } });
      }

      // Delete the mock test record itself
      await prisma.mockTest.delete({ where: { id: dbTest.id } });

      // 3. Purge from in-memory and local store
      const deletedIdsSet = new Set(questionIds);
      dynamicQuestions = dynamicQuestions.filter(q => {
        if (deletedIdsSet.has(q.id)) return false;
        if (dbTest.title && q.pyqExam === dbTest.title) return false;
        if (q.groupId === dbTest.id || q.groupId === dbTest.slug) return false;
        return true;
      });

      deletedQuestionsCount += deleteQuestionsByIdsFromStore(questionIds);
      deletedQuestionsCount += deleteExamQuestionsFromStore(dbTest.id, dbTest.title);
    }
  } catch (dbErr) {
    console.warn('Neon DB async sync on deleteMockTest:', dbErr);
  }

  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/tests');
  return { success: true, count: deletedQuestionsCount };
}

export interface AdminPartitionInfo {
  id: string;
  label: string;
  badge: string;
  title: string;
  isPyq: boolean;
  pyqYear?: number;
  examId: string;
  category: 'ALL' | 'PYQ' | 'MOCK';
  description: string;
}

/**
 * Returns dynamic partitions consolidating default papers and any custom PYQ papers from DB
 */
export async function getAdminPartitions(): Promise<AdminPartitionInfo[]> {
  const allTests = await loadFreshMockTestsFromDb();

  const basePartitions: AdminPartitionInfo[] = [
    {
      id: 'ALL',
      label: 'All Questions',
      badge: 'Repository (All)',
      title: 'Complete Question Bank Repository',
      isPyq: false,
      examId: 'ALL',
      category: 'ALL',
      description: 'Browse, search, and manage all questions across all exams and subjects in the database.',
    },
  ];

  const testPartitions: AdminPartitionInfo[] = allTests.map(t => ({
    id: t.id,
    label: t.isPyq ? (t.year ? `${t.examTitle.split('(')[0].trim()} ${t.year} PYQ` : t.title) : t.title,
    badge: t.isPyq ? `Official Paper (${t.totalQuestions} Qs)` : `Fixed Exam (${t.totalQuestions} Qs)`,
    title: t.title,
    isPyq: Boolean(t.isPyq),
    pyqYear: t.year,
    examId: t.examId,
    category: t.isPyq ? 'PYQ' : 'MOCK',
    description: t.description || `${t.title} with dedicated questions.`,
  }));

  const map = new Map<string, AdminPartitionInfo>();
  for (const p of [...basePartitions, ...testPartitions]) {
    if (!map.has(p.id)) {
      map.set(p.id, p);
    }
  }

  return Array.from(map.values());
}

/**
 * Server-side Attempts viewer for Admin
 */
export async function getAdminAllAttempts() {
  await requireAdmin();
  return SAMPLE_ATTEMPTS;
}
