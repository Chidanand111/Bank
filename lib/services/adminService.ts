'use server';

import { revalidatePath } from 'next/cache';
import {
  invalidateQuestionsCache,
  invalidateExamsCache,
  invalidateMockTestsCache,
  invalidateLiveQuestionsCache,
} from '../cache';
import { requireAdmin } from '../auth/permissions';
import {
  getDatabaseUsers,
  updateDatabaseUserRole,
  updateDatabaseUserStatus,
} from '../auth/session';
import { EXAMS_DATA, saveCustomExamsToFile } from '../data/exams';
import { MOCK_TESTS_DATA, saveCustomMockTestsToFile } from '../data/mockTests';
import { SAMPLE_ATTEMPTS } from '../data/sampleAttempts';
import { prisma } from '../prisma';
import {
  QuestionRepository,
  ExamRepository,
  MockTestRepository,
} from '../db/repositories';
import {
  getAllQuestions,
  resolveGroupPassages,
  addQuestionToJsonDb,
  updateQuestionInJsonDb,
  deleteQuestionFromJsonDb,
  deleteExamQuestionsFromStore,
  deleteQuestionsByIdsFromStore,
  syncQuestionsToStore,
  partitionQuestionsList,
  getFixedQuestionsForMockTest,
} from '../db/questionDb';

export { partitionQuestionsList, resolveGroupPassages };
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
  ExamStatus,
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

  const users = await getDatabaseUsers();
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
  const users = await getDatabaseUsers();
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

  const updated = await updateDatabaseUserStatus(userId, 'APPROVED');
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

  const updated = await updateDatabaseUserStatus(userId, 'REJECTED');
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

  const updated = await updateDatabaseUserStatus(userId, newStatus);
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

      // CRITICAL: Merge static questions from JSON store whose IDs are not in DB
      // Ensures newly added exam questions (e.g. IBPS PO 2025 Prelims PYQ) are immediately available
      const dbIds = new Set(mapped.map(q => String(q.id)));
      const staticQuestions = getAllQuestions().filter(q => !dbIds.has(String(q.id)));
      const combined = [...mapped, ...staticQuestions];

      // Resolve and hydrate shared passages across groups
      const resolved = resolveGroupPassages(combined);
      dynamicQuestions = resolved;
      syncQuestionsToStore(resolved);
      return resolved;
    }
  } catch (err) {
    console.warn('Neon DB query in adminService:', err);
  }

  const fallback = dynamicQuestions && dynamicQuestions.length > 0 ? dynamicQuestions : getAllQuestions();
  return resolveGroupPassages(fallback);
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

  return resolveGroupPassages(list);
}

export async function createQuestionAction(input: AdminQuestionInput): Promise<{ success: boolean; question?: Question; error?: string }> {
  await requireAdmin();

  const exam = EXAMS_DATA.find(e => e.id === input.examId || e.slug === input.examId) || EXAMS_DATA[0];
  const newQuestionId = `q-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Determine whether this question should persist passage/passageImageUrl to DB or reuse an existing group's
  let dbPassage: string | null = input.passage?.trim() || null;
  let dbPassageImageUrl: string | null = input.passageImageUrl?.trim() || null;
  const gId = input.groupId?.trim();

  if (gId) {
    const existingInGroup = dynamicQuestions.find(
      q => q.groupId?.trim().toLowerCase() === gId.toLowerCase() &&
           (Boolean(q.passage?.trim()) || Boolean(q.passageImageUrl?.trim()))
    );

    if (existingInGroup) {
      if (existingInGroup.passage && (!dbPassage || dbPassage === existingInGroup.passage.trim())) {
        dbPassage = null;
      }
      if (existingInGroup.passageImageUrl && (!dbPassageImageUrl || dbPassageImageUrl === existingInGroup.passageImageUrl.trim())) {
        dbPassageImageUrl = null;
      }
    }
  }

  const rawQuestion: Question = {
    id: newQuestionId,
    text: input.text,
    imageUrl: input.imageUrl,
    passage: dbPassage || input.passage || undefined,
    passageImageUrl: dbPassageImageUrl || input.passageImageUrl || undefined,
    groupId: gId || undefined,
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

  const hydratedList = resolveGroupPassages([rawQuestion, ...dynamicQuestions]);
  dynamicQuestions = hydratedList;
  const newQuestion = hydratedList[0];

  addQuestionToJsonDb({
    id: newQuestionId,
    exam: input.examId || (input.isPyq ? (input.pyqExam || 'SBI Clerk Prelims 2024 PYQ') : exam.title),
    examId: input.examId,
    section: newQuestion.sectionName,
    topic: input.topicName,
    question: input.text,
    imageUrl: input.imageUrl,
    passage: dbPassage || undefined,
    passageImageUrl: dbPassageImageUrl || undefined,
    groupId: gId || undefined,
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

  // Persist directly to Neon PostgreSQL Database via QuestionRepository
  try {
    await QuestionRepository.create(input, newQuestionId);
  } catch (dbErr) {
    console.warn('QuestionRepository.create error in createQuestionAction:', dbErr);
  }

  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/admin/tests');
  // Bust the cached question list and the specific live-questions entry
  await invalidateQuestionsCache();
  if (input.mockTestId && input.mockTestId !== 'ALL') {
    await invalidateLiveQuestionsCache(input.mockTestId);
  }
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

  // Registry to track group passages across the imported batch so they are saved only once
  const batchGroupRegistry = new Map<string, { passage?: string; passageImageUrl?: string }>();

  let importedCount = 0;
  for (const qInput of questions) {
    try {
      const inputToUse = { ...qInput };

      // De-duplicate group passages and DI images in batch
      if (inputToUse.groupId && inputToUse.groupId.trim()) {
        const gid = inputToUse.groupId.trim().toLowerCase();
        const existingInBatch = batchGroupRegistry.get(gid);

        if (!existingInBatch) {
          const existingInSys = dynamicQuestions.find(
            q => q.groupId?.trim().toLowerCase() === gid && (Boolean(q.passage?.trim()) || Boolean(q.passageImageUrl?.trim()))
          );

          if (existingInSys) {
            batchGroupRegistry.set(gid, {
              passage: existingInSys.passage?.trim() || undefined,
              passageImageUrl: existingInSys.passageImageUrl?.trim() || undefined,
            });
            if (existingInSys.passage && (!inputToUse.passage || inputToUse.passage.trim() === existingInSys.passage.trim())) {
              inputToUse.passage = undefined;
            }
            if (existingInSys.passageImageUrl && (!inputToUse.passageImageUrl || inputToUse.passageImageUrl.trim() === existingInSys.passageImageUrl.trim())) {
              inputToUse.passageImageUrl = undefined;
            }
          } else {
            batchGroupRegistry.set(gid, {
              passage: inputToUse.passage?.trim() || undefined,
              passageImageUrl: inputToUse.passageImageUrl?.trim() || undefined,
            });
          }
        } else {
          // Clear duplicate passage and DI image on subsequent questions
          if (existingInBatch.passage && (!inputToUse.passage || inputToUse.passage.trim() === existingInBatch.passage.trim())) {
            inputToUse.passage = undefined;
          }
          if (existingInBatch.passageImageUrl && (!inputToUse.passageImageUrl || inputToUse.passageImageUrl.trim() === existingInBatch.passageImageUrl.trim())) {
            inputToUse.passageImageUrl = undefined;
          }
        }
      }

      // If a specific partition is provided, assign it to question and associate target examId
      if (partitionId && partitionId !== 'ALL') {
        if (partitionId.startsWith('exam-')) {
          inputToUse.examId = partitionId;
          inputToUse.mockTestId = undefined;
        } else {
          inputToUse.mockTestId = partitionId;
          if (partitionId.toLowerCase().includes('sbi') || partitionId.toLowerCase().includes('clerk')) {
            inputToUse.examId = 'exam-sbi-clerk';
          } else if (!inputToUse.examId) {
            inputToUse.examId = 'exam-ibps-po';
          }
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

  dynamicQuestions = resolveGroupPassages(dynamicQuestions);
  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/admin');
  // Bust cached question list after bulk import
  await invalidateQuestionsCache();
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

  // Persist directly to Neon PostgreSQL Database via QuestionRepository
  try {
    await QuestionRepository.update(actualId, input);
  } catch (dbErr) {
    console.warn('QuestionRepository.update error in updateQuestionAction:', dbErr);
  }

  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/admin/tests');
  // Bust cached question list after update
  await invalidateQuestionsCache();
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
      const mapped: Question[] = dbMockTest.mockTestQuestions.map(mtq => {
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

      // Hydrate missing group passages from parent questions in DB if not in mock test
      const missingGroupIds = mapped
        .filter(q => q.groupId && !q.passage && !q.passageImageUrl)
        .map(q => q.groupId as string);

      if (missingGroupIds.length > 0) {
        try {
          const groupParents = await prisma.question.findMany({
            where: {
              groupId: { in: missingGroupIds },
              OR: [{ passage: { not: null } }, { passageImageUrl: { not: null } }],
            },
            select: { groupId: true, passage: true, passageImageUrl: true },
          });

          const groupParentMap = new Map(groupParents.map(gp => [gp.groupId!, gp]));
          for (const q of mapped) {
            if (q.groupId && (!q.passage && !q.passageImageUrl)) {
              const parent = groupParentMap.get(q.groupId);
              if (parent) {
                if (parent.passage) q.passage = parent.passage;
                if (parent.passageImageUrl) q.passageImageUrl = parent.passageImageUrl;
              }
            }
          }
        } catch (gpErr) {
          console.warn('Error fetching group parents in getLiveExamQuestionsAction:', gpErr);
        }
      }

      return resolveGroupPassages(mapped);
    }
  } catch (err) {
    console.warn('getLiveExamQuestionsAction DB mockTest query fallback:', err);
  }

  const freshQuestions = await loadFreshQuestionsFromDb();
  const partitioned = partitionQuestionsList(freshQuestions, testIdOrSlug);
  if (partitioned && partitioned.length > 0) {
    return resolveGroupPassages(partitioned);
  }

  // Robust fallback to static getFixedQuestionsForMockTest
  const fixed = getFixedQuestionsForMockTest(testIdOrSlug);
  if (fixed && fixed.length > 0) {
    return resolveGroupPassages(fixed);
  }

  return resolveGroupPassages(partitioned);
}

export async function deleteQuestionAction(questionId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  dynamicQuestions = dynamicQuestions.filter(q => q.id !== questionId);
  deleteQuestionFromJsonDb(questionId);
  deleteQuestionsByIdsFromStore([questionId]);

  try {
    await QuestionRepository.delete(questionId);
  } catch (dbErr) {
    console.warn('QuestionRepository.delete error in deleteQuestionAction:', dbErr);
  }

  safeRevalidatePath('/admin/questions');
  // Bust cached question list after delete
  await invalidateQuestionsCache();
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
        const status = existing?.status || (e.isActive ? 'published' : 'created');
        return {
          id: e.id,
          slug: e.slug,
          title: e.title,
          category: e.category,
          description: e.description,
          shortDescription: existing?.shortDescription || e.description,
          totalMockTests: e.mockTests?.length || existing?.totalMockTests || 0,
          status,
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
  const status: ExamStatus = input.status || 'published';

  // Safe Neon PostgreSQL Database sync via ExamRepository
  try {
    await ExamRepository.upsertExam(input);
  } catch (dbErr) {
    console.warn('ExamRepository.upsertExam error in createExamAction:', dbErr);
  }

  const defaultMockId = `mock-${slug}-prelims-1`;

  const fullExam: Exam = {
    id: newExamId,
    slug,
    title,
    category,
    description,
    shortDescription: description,
    totalMockTests: 1,
    status,
    patterns: [
      {
        stage: 'Prelims',
        totalQuestions: 100,
        totalMarks: 100,
        totalDurationMinutes: 60,
        sections: [
          { id: `sec-${slug}-eng`, name: 'English Language', code: 'ENGLISH', numQuestions: 30, maxMarks: 30, durationMinutes: 20, topics: ['Reading Comprehension', 'Error Detection', 'Para Jumbles'] },
          { id: `sec-${slug}-quant`, name: 'Quantitative Aptitude', code: 'QUANT', numQuestions: 35, maxMarks: 35, durationMinutes: 20, topics: ['Data Interpretation', 'Arithmetic', 'Number Series'] },
          { id: `sec-${slug}-reason`, name: 'Reasoning Ability', code: 'REASONING', numQuestions: 35, maxMarks: 35, durationMinutes: 20, topics: ['Puzzles', 'Seating Arrangement', 'Syllogism'] },
        ],
      },
      {
        stage: 'Mains',
        totalQuestions: 155,
        totalMarks: 200,
        totalDurationMinutes: 180,
        sections: [
          { id: `sec-${slug}-m-reason`, name: 'Reasoning Ability', code: 'REASONING', numQuestions: 45, maxMarks: 60, durationMinutes: 60, topics: ['Advanced Puzzles', 'Machine Input-Output', 'Logical Reasoning'] },
          { id: `sec-${slug}-m-eng`, name: 'English Language', code: 'ENGLISH', numQuestions: 35, maxMarks: 40, durationMinutes: 40, topics: ['Advanced Comprehension', 'Vocabulary', 'Paragraph Completion'] },
          { id: `sec-${slug}-m-quant`, name: 'Quantitative Aptitude', code: 'QUANT', numQuestions: 35, maxMarks: 60, durationMinutes: 45, topics: ['Data Analysis & Interpretation', 'Caselet DI'] },
          { id: `sec-${slug}-m-ga`, name: 'General / Banking Awareness', code: 'FINANCIAL_AWARENESS', numQuestions: 40, maxMarks: 40, durationMinutes: 35, topics: ['Banking Awareness', 'Monetary Policy', 'Current Affairs'] },
        ],
      },
    ],
  };

  const existingIdx = EXAMS_DATA.findIndex(e => e.id === fullExam.id || e.slug === fullExam.slug);
  if (existingIdx !== -1) {
    EXAMS_DATA[existingIdx] = fullExam;
  } else {
    EXAMS_DATA.push(fullExam);
  }
  saveCustomExamsToFile(EXAMS_DATA);

  // Automatically configure an initial Prelims practice mock test for this new exam
  const defaultMock: MockTest = {
    id: defaultMockId,
    slug: `${slug}-prelims-1`,
    title: `${title} Prelims Practice Mock 1`,
    description: `Full-length preliminary practice mock test for ${title}. Features sectional timers, TCS iON question palette, and detailed explanations.`,
    examId: fullExam.id,
    examSlug: fullExam.slug,
    examTitle: fullExam.title,
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 60,
    isFree: true,
    isFixed: true,
    isPyq: false,
    status,
    sections: [
      { id: `sec-${slug}-eng`, code: 'ENGLISH', name: 'English Language', questionCount: 30, marks: 30, durationMinutes: 20 },
      { id: `sec-${slug}-quant`, code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 35, marks: 35, durationMinutes: 20 },
      { id: `sec-${slug}-reason`, code: 'REASONING', name: 'Reasoning Ability', questionCount: 35, marks: 35, durationMinutes: 20 },
    ],
    questions: [],
  };

  if (!dynamicMockTests.some(t => t.id === defaultMock.id || t.slug === defaultMock.slug)) {
    dynamicMockTests.unshift(defaultMock);
  }
  if (!MOCK_TESTS_DATA.some(t => t.id === defaultMock.id || t.slug === defaultMock.slug)) {
    MOCK_TESTS_DATA.unshift(defaultMock);
  }
  saveCustomMockTestsToFile(dynamicMockTests);

  safeRevalidatePath('/admin/exams');
  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/exams');
  safeRevalidatePath('/tests');
  safeRevalidatePath('/dashboard');
  // Bust cached exam and mock-test lists
  await invalidateExamsCache();
  await invalidateMockTestsCache();
  return { success: true, exam: fullExam };
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
    await ExamRepository.updateTitle(examIdOrSlug, trimmedTitle, description);
  } catch (dbErr) {
    console.warn('ExamRepository.updateTitle error in updateExamTitleAction:', dbErr);
  }

  // Update in-memory EXAMS_DATA
  const staticExam = EXAMS_DATA.find(e => e.id === examIdOrSlug || e.slug === examIdOrSlug || e.slug === examIdOrSlug.replace(/^exam-/, ''));
  if (staticExam) {
    staticExam.title = trimmedTitle;
    if (description !== undefined) {
      staticExam.description = description.trim();
      staticExam.shortDescription = description.trim();
    }
  }
  saveCustomExamsToFile(EXAMS_DATA);

  // Update references in dynamicMockTests
  for (const mt of dynamicMockTests) {
    if (mt.examId === examIdOrSlug || mt.examSlug === examIdOrSlug.replace(/^exam-/, '')) {
      mt.examTitle = trimmedTitle;
    }
  }
  for (const mt of MOCK_TESTS_DATA) {
    if (mt.examId === examIdOrSlug || mt.examSlug === examIdOrSlug.replace(/^exam-/, '')) {
      mt.examTitle = trimmedTitle;
    }
  }
  saveCustomMockTestsToFile(dynamicMockTests);

  safeRevalidatePath('/admin/exams');
  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/exams');
  safeRevalidatePath('/tests');
  // Bust cached exam and mock-test lists after title update
  await invalidateExamsCache();
  await invalidateMockTestsCache();
  return { success: true };
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
    const delResult = await ExamRepository.deleteCascade(examIdOrSlug);
    deletedQuestionsCount = delResult.deletedQuestionsCount;
  } catch (dbErr) {
    console.warn('ExamRepository.deleteCascade error in deleteExamAction:', dbErr);
  }

  const targetExamId = examIdOrSlug.startsWith('exam-') ? examIdOrSlug : `exam-${examIdOrSlug}`;
  const targetSlug = examIdOrSlug.replace(/^exam-/, '');
  const examTitle = EXAMS_DATA.find(e => e.id === examIdOrSlug || e.slug === examIdOrSlug)?.title;

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
    return mt.examId !== targetExamId && mt.examId !== targetSlug && mt.examSlug !== targetSlug;
  });
  saveCustomMockTestsToFile(dynamicMockTests);

  // 6. Remove exam from in-memory EXAMS_DATA
  const staticIndex = EXAMS_DATA.findIndex(
    e => e.id === targetExamId || e.slug === targetSlug || e.id === examIdOrSlug || e.slug === examIdOrSlug
  );
  if (staticIndex !== -1) {
    EXAMS_DATA.splice(staticIndex, 1);
  }
  saveCustomExamsToFile(EXAMS_DATA);

  // 7. Revalidate Next.js cache paths
  safeRevalidatePath('/admin/exams');
  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/exams');
  safeRevalidatePath('/tests');
  safeRevalidatePath('/dashboard');

  return { success: true, count: deletedQuestionsCount };
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
    saveCustomMockTestsToFile(dynamicMockTests);

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
  let dbExam = null;
  try {
    dbExam = await prisma.exam.findFirst({
      where: { OR: [{ id: targetExamId }, { slug: targetExamId.replace('exam-', '') }] },
    });
  } catch (dbErr) {
    console.warn('Neon DB query fallback in createMockTestAction:', dbErr);
  }
  const exam = customExamObj || dbExam || EXAMS_DATA.find(e => e.id === targetExamId || e.slug === targetExamId.replace('exam-', '')) || EXAMS_DATA[0];

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

  const status: ExamStatus = input.status || 'published';

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
    status,
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
    await MockTestRepository.upsertMockTest(input, exam.id);
  } catch (dbErr) {
    console.warn('MockTestRepository.upsertMockTest error in createMockTestAction:', dbErr);
  }

  dynamicMockTests.unshift(newTest);
  saveCustomMockTestsToFile(dynamicMockTests);
  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/tests');
  // Bust cached mock-test list after creation
  await invalidateMockTestsCache();
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
    const delResult = await MockTestRepository.deleteCascade(testId);
    deletedQuestionsCount = delResult.deletedQuestionsCount;
  } catch (dbErr) {
    console.warn('MockTestRepository.deleteCascade error in deleteMockTestAction:', dbErr);
  }

  saveCustomMockTestsToFile(dynamicMockTests);
  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/tests');
  // Bust cached mock-test and question lists after deletion
  await invalidateMockTestsCache();
  await invalidateQuestionsCache();
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
  category: 'ALL' | 'PYQ' | 'MOCK' | 'EXAM';
  description: string;
  status?: ExamStatus;
}

/**
 * Toggle or explicitly update Exam Published / Created (Draft) State
 */
export async function toggleExamPublishAction(
  examIdOrSlug: string,
  targetStatus?: ExamStatus
): Promise<{ success: boolean; status?: ExamStatus; error?: string }> {
  await requireAdmin();

  let exam = EXAMS_DATA.find(
    e => e.id === examIdOrSlug || e.slug === examIdOrSlug || e.slug === examIdOrSlug.replace(/^exam-/, '')
  );
  if (!exam) {
    const allExams = await getAdminExams();
    exam = allExams.find(
      e => e.id === examIdOrSlug || e.slug === examIdOrSlug || e.slug === examIdOrSlug.replace(/^exam-/, '')
    );
    if (exam && !EXAMS_DATA.some(e => e.id === exam!.id)) {
      EXAMS_DATA.push(exam);
    }
  }
  if (!exam) {
    return { success: false, error: 'Exam not found.' };
  }

  const newStatus: ExamStatus = targetStatus || (exam.status === 'published' ? 'created' : 'published');
  exam.status = newStatus;
  saveCustomExamsToFile(EXAMS_DATA);

  // Sync associated mock tests to match exam state
  for (const t of dynamicMockTests) {
    if (t.examId === exam.id || t.examSlug === exam.slug) {
      t.status = newStatus;
    }
  }
  for (const t of MOCK_TESTS_DATA) {
    if (t.examId === exam.id || t.examSlug === exam.slug) {
      t.status = newStatus;
    }
  }
  saveCustomMockTestsToFile(dynamicMockTests);

  try {
    await prisma.exam.updateMany({
      where: {
        OR: [{ id: exam.id }, { slug: exam.slug }],
      },
      data: {
        isActive: newStatus === 'published',
      },
    });
    await prisma.mockTest.updateMany({
      where: {
        OR: [{ examId: exam.id }, { exam: { slug: exam.slug } }],
      },
      data: {
        isPublished: newStatus === 'published',
      },
    });
  } catch (err) {
    console.warn('Neon DB async sync on toggleExamPublishAction:', err);
  }

  safeRevalidatePath('/admin/exams');
  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/exams');
  safeRevalidatePath('/tests');
  safeRevalidatePath('/dashboard');
  // Bust cached exam and mock-test lists after publish toggle
  await invalidateExamsCache();
  await invalidateMockTestsCache();
  return { success: true, status: newStatus };
}

/**
 * Toggle or update Mock Test / Partition Published State
 */
export async function toggleMockTestPublishAction(
  testIdOrSlug: string,
  targetStatus?: ExamStatus
): Promise<{ success: boolean; status?: ExamStatus; error?: string }> {
  await requireAdmin();

  const test =
    dynamicMockTests.find(t => t.id === testIdOrSlug || t.slug === testIdOrSlug) ||
    MOCK_TESTS_DATA.find(t => t.id === testIdOrSlug || t.slug === testIdOrSlug);
  if (!test) {
    return { success: false, error: 'Mock test not found.' };
  }

  const newStatus: ExamStatus = targetStatus || (test.status === 'published' ? 'created' : 'published');
  test.status = newStatus;
  saveCustomMockTestsToFile(dynamicMockTests);

  try {
    await MockTestRepository.togglePublish(test.id, newStatus === 'published');
  } catch (err) {
    console.warn('MockTestRepository.togglePublish error in toggleMockTestPublishAction:', err);
  }

  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/tests');
  safeRevalidatePath('/dashboard');
  // Bust cached mock-test list after publish toggle
  await invalidateMockTestsCache();
  return { success: true, status: newStatus };
}

/**
 * Returns dynamic partitions consolidating default papers and any custom PYQ papers from DB
 */
export async function getAdminPartitions(): Promise<AdminPartitionInfo[]> {
  const [allTests, allExams] = await Promise.all([
    loadFreshMockTestsFromDb(),
    getAdminExams(),
  ]);

  const basePartitions: AdminPartitionInfo[] = [
    {
      id: 'ALL',
      label: 'All Questions',
      badge: 'Repository (All)',
      title: 'Complete Question Bank Repository',
      isPyq: false,
      examId: 'ALL',
      category: 'ALL',
      status: 'published',
      description: 'Browse, search, and manage all questions across all exams and subjects in the database.',
    },
  ];

  const examPartitions: AdminPartitionInfo[] = allExams.map(e => ({
    id: e.id,
    label: e.title,
    badge: e.status === 'created' ? 'Draft Exam' : 'Published Exam',
    title: `${e.title} - Question Bank`,
    isPyq: false,
    examId: e.id,
    category: 'EXAM',
    status: e.status || 'published',
    description: `All practice and dedicated questions mapped to ${e.title}.`,
  }));

  const testPartitions: AdminPartitionInfo[] = allTests.map(t => ({
    id: t.id,
    label: t.isPyq ? (t.year ? `${t.examTitle.split('(')[0].trim()} ${t.year} PYQ` : t.title) : t.title,
    badge: t.isPyq ? `Official Paper (${t.totalQuestions} Qs)` : `Fixed Exam (${t.totalQuestions} Qs)`,
    title: t.title,
    isPyq: Boolean(t.isPyq),
    pyqYear: t.year,
    examId: t.examId,
    category: t.isPyq ? 'PYQ' : 'MOCK',
    status: t.status || 'published',
    description: t.description || `${t.title} with dedicated questions.`,
  }));

  const map = new Map<string, AdminPartitionInfo>();
  for (const p of [...basePartitions, ...examPartitions, ...testPartitions]) {
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
