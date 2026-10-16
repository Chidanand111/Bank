'use server';

import {
  invalidateQuestionsCache,
  invalidateLiveQuestionsCache,
} from '../cache';
import { requireAdmin } from '../auth/permissions';
import { EXAMS_DATA } from '../data/exams';
import { prisma } from '../prisma';
import { QuestionRepository } from '../db/repositories';
import {
  getAllQuestions,
  resolveGroupPassages as resolveGroupPassagesSync,
  addQuestionToJsonDb,
  updateQuestionInJsonDb,
  deleteQuestionFromJsonDb,
  deleteExamQuestionsFromStore,
  deleteQuestionsByIdsFromStore,
  syncQuestionsToStore,
  partitionQuestionsList as partitionQuestionsListSync,
  getFixedQuestionsForMockTest,
} from '../db/questionDb';
import { safeRevalidatePath } from './common';
import {
  adminQuestionInputSchema,
  bulkImportQuestionsSchema,
  validateInput,
} from '../validations/adminSchemas';
import {
  AdminQuestionInput,
  Difficulty,
  Question,
} from '@/types';

// In-memory working sets for admin modifications backed by JSON question store and Neon PostgreSQL
let dynamicQuestions: Question[] = getAllQuestions();

export async function getDynamicQuestions(): Promise<Question[]> {
  return dynamicQuestions;
}

export async function setDynamicQuestions(questions: Question[]): Promise<void> {
  dynamicQuestions = questions;
}

/**
 * Removes questions mapped to an exam from in-memory dynamic questions and JSON store mirror
 */
export async function removeQuestionsForExam(
  targetExamId: string,
  targetSlug: string,
  examTitle?: string
): Promise<number> {
  let deletedCount = 0;
  const initialDynCount = dynamicQuestions.length;
  dynamicQuestions = dynamicQuestions.filter(q => {
    const qExam = String(q.examId || '').toLowerCase();
    if (qExam === targetExamId.toLowerCase() || qExam === targetSlug.toLowerCase()) return false;
    if (examTitle && q.sectionName && q.topicName && q.pyqExam === examTitle) return false;
    return true;
  });
  deletedCount += Math.max(0, initialDynCount - dynamicQuestions.length);
  deletedCount += deleteExamQuestionsFromStore(targetExamId, examTitle);
  return deletedCount;
}

export async function partitionQuestionsList(
  questions: Question[],
  partitionId?: string
): Promise<Question[]> {
  return partitionQuestionsListSync(questions, partitionId || 'ALL');
}

export async function resolveGroupPassages(questions: Question[]): Promise<Question[]> {
  return resolveGroupPassagesSync(questions);
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
      const resolved = resolveGroupPassagesSync(combined);
      dynamicQuestions = resolved;
      syncQuestionsToStore(resolved);
      return resolved;
    }
  } catch (err) {
    console.warn('Neon DB query in questionService.loadFreshQuestionsFromDb:', err);
  }

  const fallback = dynamicQuestions && dynamicQuestions.length > 0 ? dynamicQuestions : getAllQuestions();
  return resolveGroupPassagesSync(fallback);
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
        list = partitionQuestionsListSync(sourceQuestions, filters.partition);
      }
    } catch {
      list = partitionQuestionsListSync(sourceQuestions, filters.partition);
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

  return resolveGroupPassagesSync(list);
}

/**
 * Creates a single question with Zod validation, passage deduplication, and DB persistence
 */
export async function createQuestionAction(
  input: AdminQuestionInput
): Promise<{ success: boolean; question?: Question; error?: string }> {
  await requireAdmin();

  const validated = validateInput(adminQuestionInputSchema, input);
  if (!validated.success) {
    return { success: false, error: validated.error };
  }
  const validData = validated.data;

  const exam =
    EXAMS_DATA.find(e => e.id === validData.examId || e.slug === validData.examId) ||
    EXAMS_DATA[0];
  const newQuestionId = `q-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Determine whether this question should persist passage/passageImageUrl to DB or reuse an existing group's
  let dbPassage: string | null = validData.passage?.trim() || null;
  let dbPassageImageUrl: string | null = validData.passageImageUrl?.trim() || null;
  const gId = validData.groupId?.trim();

  if (gId) {
    const existingInGroup = dynamicQuestions.find(
      q =>
        q.groupId?.trim().toLowerCase() === gId.toLowerCase() &&
        (Boolean(q.passage?.trim()) || Boolean(q.passageImageUrl?.trim()))
    );

    if (existingInGroup) {
      if (existingInGroup.passage && (!dbPassage || dbPassage === existingInGroup.passage.trim())) {
        dbPassage = null;
      }
      if (
        existingInGroup.passageImageUrl &&
        (!dbPassageImageUrl || dbPassageImageUrl === existingInGroup.passageImageUrl.trim())
      ) {
        dbPassageImageUrl = null;
      }
    }
  }

  const rawQuestion: Question = {
    id: newQuestionId,
    text: validData.text,
    imageUrl: validData.imageUrl || undefined,
    passage: dbPassage || validData.passage || undefined,
    passageImageUrl: dbPassageImageUrl || validData.passageImageUrl || undefined,
    groupId: gId || undefined,
    isPyq: Boolean(validData.isPyq),
    pyqYear: validData.pyqYear || undefined,
    pyqExam:
      validData.pyqExam ||
      (validData.isPyq
        ? validData.pyqYear === 2023
          ? 'SBI Clerk Prelims 2023-24'
          : 'SBI Clerk Prelims 2024'
        : undefined),
    difficulty: validData.difficulty as Difficulty,
    explanation: validData.explanation,
    marks: validData.marks,
    negativeMarks: validData.negativeMarks,
    examId: validData.examId || exam.id,
    sectionId: `sec-${validData.sectionCode.toLowerCase()}`,
    sectionCode: validData.sectionCode,
    sectionName:
      validData.sectionCode === 'QUANT'
        ? 'Quantitative Aptitude'
        : validData.sectionCode === 'ENGLISH'
        ? 'English Language'
        : 'Reasoning Ability',
    topicId: `top-${validData.topicName.toLowerCase().replace(/\s+/g, '-')}`,
    topicName: validData.topicName,
    options: validData.options.map((opt, i) => ({
      id: `opt-${newQuestionId}-${i + 1}`,
      questionId: newQuestionId,
      text: opt.text,
      imageUrl: opt.imageUrl || undefined,
      isCorrect: Boolean(opt.isCorrect),
      order: i + 1,
    })),
  };

  const hydratedList = resolveGroupPassagesSync([rawQuestion, ...dynamicQuestions]);
  dynamicQuestions = hydratedList;
  const newQuestion = hydratedList[0];

  addQuestionToJsonDb({
    id: newQuestionId,
    exam: validData.examId || (validData.isPyq ? (validData.pyqExam || 'SBI Clerk Prelims 2024 PYQ') : exam.title),
    examId: validData.examId,
    section: newQuestion.sectionName,
    topic: validData.topicName,
    question: validData.text,
    imageUrl: validData.imageUrl || undefined,
    passage: dbPassage || undefined,
    passageImageUrl: dbPassageImageUrl || undefined,
    groupId: gId || undefined,
    isPyq: validData.isPyq,
    pyqYear: validData.pyqYear || undefined,
    pyqExam: validData.pyqExam || undefined,
    options: validData.options.reduce((acc, opt, i) => {
      const key = String.fromCharCode(65 + i);
      if (opt.imageUrl) {
        acc[key] = { text: opt.text, imageUrl: opt.imageUrl };
      } else {
        acc[key] = opt.text;
      }
      return acc;
    }, {} as Record<string, string | { text: string; imageUrl?: string }>),
    answer: String.fromCharCode(65 + Math.max(0, validData.options.findIndex(o => o.isCorrect))),
    explanation: validData.explanation,
    difficulty: validData.difficulty as Difficulty,
    marks: validData.marks,
    negativeMarks: validData.negativeMarks,
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
  if (validData.mockTestId && validData.mockTestId !== 'ALL') {
    await invalidateLiveQuestionsCache(validData.mockTestId);
  }
  return { success: true, question: newQuestion };
}

/**
 * Bulk Question Importer Action with Zod batch validation and transactional safety
 */
export async function bulkImportQuestionsAction(
  questions: AdminQuestionInput[],
  partitionId?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  await requireAdmin();

  if (!questions || questions.length === 0) {
    return { success: false, count: 0, error: 'No questions provided for import.' };
  }

  const validated = validateInput(bulkImportQuestionsSchema, questions);
  if (!validated.success) {
    return { success: false, count: 0, error: validated.error };
  }

  // Registry to track group passages across the imported batch so they are saved only once
  const batchGroupRegistry = new Map<string, { passage?: string; passageImageUrl?: string }>();

  let importedCount = 0;
  for (const qInput of validated.data) {
    try {
      const inputToUse: AdminQuestionInput = {
        ...qInput,
        imageUrl: qInput.imageUrl || undefined,
        passage: qInput.passage || undefined,
        passageImageUrl: qInput.passageImageUrl || undefined,
        groupId: qInput.groupId || undefined,
        pyqYear: qInput.pyqYear || undefined,
        pyqExam: qInput.pyqExam || undefined,
        mockTestId: qInput.mockTestId || undefined,
        options: qInput.options.map(o => ({
          text: o.text,
          imageUrl: o.imageUrl || undefined,
          isCorrect: o.isCorrect,
        })),
      };

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
          if (!inputToUse.examId || inputToUse.examId === 'ALL') {
            if (partitionId.toLowerCase().includes('sbi') || partitionId.toLowerCase().includes('clerk')) {
              inputToUse.examId = 'exam-sbi-clerk';
            } else {
              inputToUse.examId = 'exam-ibps-po';
            }
          }
        }
      }

      const res = await createQuestionAction(inputToUse);
      if (res.success && res.question) {
        importedCount++;
      }
    } catch (e) {
      console.error('Error importing question row in questionService:', e);
    }
  }

  dynamicQuestions = resolveGroupPassagesSync(dynamicQuestions);
  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/admin');
  // Bust cached question list after bulk import
  await invalidateQuestionsCache();
  return { success: true, count: importedCount };
}

/**
 * Updates a question with Zod validation, in-memory sync, and Neon DB persistence
 */
export async function updateQuestionAction(
  questionId: string,
  input: AdminQuestionInput
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  if (!questionId?.trim()) {
    return { success: false, error: 'Question ID is required.' };
  }

  const validated = validateInput(adminQuestionInputSchema, input);
  if (!validated.success) {
    return { success: false, error: validated.error };
  }
  const validData = validated.data;

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
    text: validData.text,
    imageUrl: validData.imageUrl || undefined,
    passage: validData.passage || undefined,
    passageImageUrl: validData.passageImageUrl || undefined,
    groupId: validData.groupId || undefined,
    isPyq: validData.isPyq !== undefined ? validData.isPyq : (existing?.isPyq ?? false),
    pyqYear: validData.pyqYear !== undefined ? (validData.pyqYear || undefined) : existing?.pyqYear,
    pyqExam: validData.pyqExam || existing?.pyqExam,
    difficulty: validData.difficulty as Difficulty,
    explanation: validData.explanation,
    marks: validData.marks,
    negativeMarks: validData.negativeMarks,
    examId: existing?.examId || validData.examId || 'exam-ibps-po',
    sectionId: existing?.sectionId || `sec-${validData.sectionCode.toLowerCase()}`,
    sectionCode: validData.sectionCode,
    sectionName: existing?.sectionName || (validData.sectionCode === 'QUANT' ? 'Quantitative Aptitude' : validData.sectionCode === 'ENGLISH' ? 'English Language' : 'Reasoning Ability'),
    topicId: existing?.topicId || `top-${validData.topicName.toLowerCase().replace(/\s+/g, '-')}`,
    topicName: validData.topicName,
    options: validData.options.map((opt, i) => ({
      id: existing?.options[i]?.id || `opt-${actualId}-${i + 1}`,
      questionId: actualId,
      text: opt.text,
      imageUrl: opt.imageUrl || undefined,
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
    question: validData.text,
    imageUrl: validData.imageUrl || undefined,
    passage: validData.passage || undefined,
    passageImageUrl: validData.passageImageUrl || undefined,
    groupId: validData.groupId || undefined,
    isPyq: validData.isPyq,
    pyqYear: validData.pyqYear || undefined,
    pyqExam: validData.pyqExam || undefined,
    difficulty: validData.difficulty as Difficulty,
    explanation: validData.explanation,
    marks: validData.marks,
    negativeMarks: validData.negativeMarks,
    section: updatedQuestion.sectionName,
    topic: validData.topicName,
    options: validData.options.reduce((acc, opt, i) => {
      const key = String.fromCharCode(65 + i);
      if (opt.imageUrl) {
        acc[key] = { text: opt.text, imageUrl: opt.imageUrl };
      } else {
        acc[key] = opt.text;
      }
      return acc;
    }, {} as Record<string, string | { text: string; imageUrl?: string }>),
    answer: String.fromCharCode(65 + Math.max(0, validData.options.findIndex(o => o.isCorrect))),
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

      return resolveGroupPassagesSync(mapped);
    }
  } catch (err) {
    console.warn('getLiveExamQuestionsAction DB mockTest query fallback:', err);
  }

  const freshQuestions = await loadFreshQuestionsFromDb();
  const partitioned = partitionQuestionsListSync(freshQuestions, testIdOrSlug);
  if (partitioned && partitioned.length > 0) {
    return resolveGroupPassagesSync(partitioned);
  }

  // Robust fallback to static getFixedQuestionsForMockTest
  const fixed = getFixedQuestionsForMockTest(testIdOrSlug);
  if (fixed && fixed.length > 0) {
    return resolveGroupPassagesSync(fixed);
  }

  return resolveGroupPassagesSync(partitioned);
}

/**
 * Permanently deletes a single question across Neon PostgreSQL and in-memory store
 */
export async function deleteQuestionAction(
  questionId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  if (!questionId?.trim()) {
    return { success: false, error: 'Question ID is required.' };
  }

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
