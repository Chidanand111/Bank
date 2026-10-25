'use server';

import {
  invalidateMockTestsCache,
  invalidateQuestionsCache,
} from '../cache';
import { requireAdmin } from '../auth/permissions';
import { MOCK_TESTS_DATA, saveCustomMockTestsToFile } from '../data/mockTests';
import { EXAMS_DATA } from '../data/exams';
import { prisma } from '../prisma';
import { MockTestRepository } from '../db/repositories';
import { safeRevalidatePath } from './common';
import {
  adminMockTestInputSchema,
  updateMockTestTitleSchema,
  validateInput,
} from '../validations/adminSchemas';
import {
  AdminMockTestInput,
  AdminPartitionInfo,
  Difficulty,
  Exam,
  ExamStatus,
  MockTest,
  Question,
} from '@/types';

export type { AdminPartitionInfo };

// In-memory working sets for admin modifications
let dynamicMockTests: MockTest[] = [...MOCK_TESTS_DATA];
const deletedMockTestIds = new Set<string>();

export async function getDynamicMockTests(): Promise<MockTest[]> {
  return dynamicMockTests.filter(m => !deletedMockTestIds.has(m.id) && !deletedMockTestIds.has(m.slug));
}

export async function setDynamicMockTests(tests: MockTest[]): Promise<void> {
  dynamicMockTests = tests;
}

export async function addMockTestToMemory(test: MockTest): Promise<void> {
  if (!dynamicMockTests.some(t => t.id === test.id || t.slug === test.slug)) {
    dynamicMockTests.unshift(test);
  }
  if (!MOCK_TESTS_DATA.some(t => t.id === test.id || t.slug === test.slug)) {
    MOCK_TESTS_DATA.unshift(test);
  }
  saveCustomMockTestsToFile(dynamicMockTests);
}

export async function removeMockTestsForExam(targetExamId: string, targetSlug: string): Promise<void> {
  dynamicMockTests = dynamicMockTests.filter(mt => {
    return mt.examId !== targetExamId && mt.examId !== targetSlug && mt.examSlug !== targetSlug;
  });
  saveCustomMockTestsToFile(dynamicMockTests);
}

export async function updateMockTestsExamTitle(examIdOrSlug: string, newTitle: string): Promise<void> {
  const normSlug = examIdOrSlug.replace(/^exam-/, '');
  for (const mt of dynamicMockTests) {
    if (mt.examId === examIdOrSlug || mt.examSlug === normSlug) {
      mt.examTitle = newTitle;
    }
  }
  for (const mt of MOCK_TESTS_DATA) {
    if (mt.examId === examIdOrSlug || mt.examSlug === normSlug) {
      mt.examTitle = newTitle;
    }
  }
  saveCustomMockTestsToFile(dynamicMockTests);
}

export async function setMockTestsStatusForExam(
  examId: string,
  examSlug: string,
  status: ExamStatus
): Promise<void> {
  for (const t of dynamicMockTests) {
    if (t.examId === examId || t.examSlug === examSlug) {
      t.status = status;
    }
  }
  for (const t of MOCK_TESTS_DATA) {
    if (t.examId === examId || t.examSlug === examSlug) {
      t.status = status;
    }
  }
  saveCustomMockTestsToFile(dynamicMockTests);
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
        const existingTemplate =
          dynamicMockTests.find(mt => mt.id === t.id || mt.slug === t.slug) ||
          MOCK_TESTS_DATA.find(mt => mt.id === t.id || mt.slug === t.slug);
        if (existingTemplate) {
          existingTemplate.status = (t.isPublished ? 'published' : 'created') as ExamStatus;
        }

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

        const isSsc = t.exam?.category === 'SSC' || (t.exam?.slug && t.exam.slug.includes('ssc'));
        const sections =
          existingTemplate?.sections ||
          (t.exam?.sections && t.exam.sections.length > 0
            ? t.exam.sections.map(s => ({
                id: s.id,
                code: s.code,
                name: s.name,
                questionCount: isSsc ? 25 : s.code === 'FINANCIAL_AWARENESS' ? 40 : 35,
                marks: isSsc ? 50 : s.code === 'FINANCIAL_AWARENESS' ? 40 : 35,
                durationMinutes: isSsc ? 15 : s.code === 'FINANCIAL_AWARENESS' ? 35 : 20,
              }))
            : isSsc
            ? [
                { id: `sec-${t.slug}-reason`, code: 'REASONING', name: 'General Intelligence & Reasoning', questionCount: 25, marks: 50, durationMinutes: 15 },
                { id: `sec-${t.slug}-ga`, code: 'GA', name: 'General Awareness', questionCount: 25, marks: 50, durationMinutes: 15 },
                { id: `sec-${t.slug}-quant`, code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 25, marks: 50, durationMinutes: 15 },
                { id: `sec-${t.slug}-eng`, code: 'ENGLISH', name: 'English Comprehension', questionCount: 25, marks: 50, durationMinutes: 15 },
              ]
            : [
                {
                  id: `sec-${t.slug}-eng`,
                  code: 'ENGLISH',
                  name: 'English Language',
                  questionCount: 30,
                  marks: 30,
                  durationMinutes: 20,
                },
                {
                  id: `sec-${t.slug}-quant`,
                  code: 'QUANT',
                  name: 'Quantitative Aptitude',
                  questionCount: 35,
                  marks: 35,
                  durationMinutes: 20,
                },
                {
                  id: `sec-${t.slug}-reason`,
                  code: 'REASONING',
                  name: 'Reasoning Ability',
                  questionCount: 35,
                  marks: 35,
                  durationMinutes: 20,
                },
              ]);

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
          status: (t.isPublished ? 'published' : 'created') as ExamStatus,
          sections,
          questions: liveQuestions,
        };
      });

      const merged: MockTest[] = mapped.filter(
        m => !deletedMockTestIds.has(m.id) && !deletedMockTestIds.has(m.slug)
      );
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
    console.warn('Neon DB query in mockTestService.loadFreshMockTestsFromDb:', err);
  }
  return dynamicMockTests.filter(
    m => !deletedMockTestIds.has(m.id) && !deletedMockTestIds.has(m.slug)
  );
}

/**
 * Server-side Mock Test & PYQ Management for Administrators
 */
export async function getAdminMockTests(): Promise<MockTest[]> {
  await requireAdmin();
  return await loadFreshMockTestsFromDb();
}

/**
 * Creates a mock test or PYQ paper with Zod input validation and database sync
 */
export async function createMockTestAction(
  input: AdminMockTestInput
): Promise<{ success: boolean; test?: MockTest; error?: string }> {
  await requireAdmin();

  const validated = validateInput(adminMockTestInputSchema, input);
  if (!validated.success) {
    return { success: false, error: validated.error };
  }
  const validData = validated.data;

  let targetExamId = validData.examId;
  let customExamObj: Exam | undefined;

  // Support "create new exam he can title it anything"
  if (validData.customExamTitle?.trim()) {
    const { createExamAction } = await import('./examService');
    const examRes = await createExamAction({
      title: validData.customExamTitle.trim(),
      category: validData.customExamCategory || 'OTHER',
      description: `${validData.customExamTitle.trim()} Examination Papers`,
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
  const exam =
    customExamObj ||
    dbExam ||
    EXAMS_DATA.find(e => e.id === targetExamId || e.slug === targetExamId.replace('exam-', '')) ||
    EXAMS_DATA[0];

  const title = validData.title.trim();
  const rawSlug =
    validData.slug?.trim() ||
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = validData.isPyq && !rawSlug.includes('pyq') ? `${rawSlug}-pyq` : rawSlug;
  const newId = `mock-${slug}`;

  const isPyq = Boolean(validData.isPyq);
  const year = validData.year
    ? Number(validData.year)
    : isPyq
    ? new Date().getFullYear()
    : undefined;

  const defaultSections: {
    code: string;
    name: string;
    questionCount: number;
    marks: number;
    durationMinutes?: number;
  }[] =
    exam.category === 'RAILWAY'
      ? [
          { code: 'GA', name: 'General Awareness', questionCount: 40, marks: 40, durationMinutes: 30 },
          { code: 'QUANT', name: 'Mathematics', questionCount: 30, marks: 30, durationMinutes: 30 },
          { code: 'REASONING', name: 'General Intelligence & Reasoning', questionCount: 30, marks: 30, durationMinutes: 30 },
        ]
      : exam.category === 'SSC'
      ? [
          { code: 'REASONING', name: 'General Intelligence & Reasoning', questionCount: 25, marks: 50, durationMinutes: 15 },
          { code: 'GA', name: 'General Awareness', questionCount: 25, marks: 50, durationMinutes: 15 },
          { code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 25, marks: 50, durationMinutes: 15 },
          { code: 'ENGLISH', name: 'English Comprehension', questionCount: 25, marks: 50, durationMinutes: 15 },
        ]
      : [
          { code: 'ENGLISH', name: 'English Language', questionCount: 30, marks: 30, durationMinutes: 20 },
          { code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 35, marks: 35, durationMinutes: 20 },
          { code: 'REASONING', name: 'Reasoning Ability', questionCount: 35, marks: 35, durationMinutes: 20 },
        ];

  const targetSections =
    validData.sections && validData.sections.length > 0 ? validData.sections : defaultSections;
  const totalQuestions = targetSections.reduce((acc, s) => acc + (s.questionCount || 0), 0);
  const totalMarks = validData.totalMarks || (exam.category === 'SSC' ? 200 : 100);
  const status: ExamStatus = validData.status || 'published';

  const isOverallTimer = exam.category === 'SSC' || exam.category === 'RAILWAY';
  const resolvedTimerType = validData.timerType || (isOverallTimer ? 'OVERALL_COMPOSITE' : 'SECTIONAL_LOCKED');
  const resolvedAllowSwitch = validData.allowSectionSwitch ?? isOverallTimer;
  const resolvedNegativeRatio =
    validData.negativeMarkRatio ?? (exam.category === 'SSC' ? 0.5 : exam.category === 'RAILWAY' ? 0.333 : 0.25);

  const newTest: MockTest = {
    id: newId,
    slug,
    title,
    description: validData.description || `${title} Examination Practice Paper`,
    examId: exam.id,
    examSlug: exam.slug,
    examTitle: exam.title,
    durationMinutes: validData.durationMinutes || (exam.category === 'RAILWAY' ? 90 : 60),
    totalMarks,
    totalQuestions,
    cutoffMarks: validData.cutoffMarks || (exam.category === 'SSC' ? 120 : 60),
    isFree: validData.isFree ?? true,
    isFixed: true,
    isPyq,
    year,
    timerType: resolvedTimerType,
    allowSectionSwitch: resolvedAllowSwitch,
    negativeMarkRatio: resolvedNegativeRatio,
    stage: validData.stage || (exam.category === 'SSC' ? 'Tier-1' : exam.category === 'RAILWAY' ? 'CBT-1' : 'Prelims'),
    status,
    sections: targetSections.map(s => ({
      id: `sec-${s.code.toLowerCase()}`,
      code: s.code,
      name: s.name,
      questionCount: s.questionCount,
      marks: s.marks,
      durationMinutes: s.durationMinutes !== undefined ? s.durationMinutes : (exam.category === 'SSC' ? 15 : s.code === 'FINANCIAL_AWARENESS' ? 35 : s.questionCount >= 40 ? 45 : 20),
    })),
    questions: [],
  };

  try {
    await MockTestRepository.upsertMockTest({
      ...validData,
      totalMarks,
      timerType: resolvedTimerType,
      allowSectionSwitch: resolvedAllowSwitch,
      negativeMarkRatio: resolvedNegativeRatio,
      stage: newTest.stage,
    }, exam.id);
  } catch (dbErr) {
    console.error('MockTestRepository.upsertMockTest error in createMockTestAction:', dbErr);
    return {
      success: false,
      error: dbErr instanceof Error ? dbErr.message : 'Database error creating mock test',
    };
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

/**
 * Updates a mock test title with Zod validation and cache invalidation
 */
export async function updateMockTestTitleAction(
  testIdOrSlug: string,
  newTitle: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const validated = validateInput(updateMockTestTitleSchema, {
    testIdOrSlug,
    newTitle,
    description,
  });
  if (!validated.success) {
    return { success: false, error: validated.error };
  }
  const { newTitle: validTitle, description: validDesc } = validated.data;
  const trimmedTitle = validTitle.trim();

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
          ...(validDesc !== undefined ? { description: validDesc.trim() } : {}),
        },
      });
    }

    // Update in-memory dynamicMockTests
    const inMem = dynamicMockTests.find(
      t => t.id === testIdOrSlug || t.slug === testIdOrSlug || (dbTest && t.id === dbTest.id)
    );
    if (inMem) {
      inMem.title = trimmedTitle;
      if (validDesc) inMem.description = validDesc.trim();
    }

    const staticMem = MOCK_TESTS_DATA.find(
      t => t.id === testIdOrSlug || t.slug === testIdOrSlug || (dbTest && t.id === dbTest.id)
    );
    if (staticMem) {
      staticMem.title = trimmedTitle;
      if (validDesc) staticMem.description = validDesc.trim();
    }
    saveCustomMockTestsToFile(dynamicMockTests);

    safeRevalidatePath('/admin/tests');
    safeRevalidatePath('/admin/questions');
    safeRevalidatePath('/tests');
    // Bust cached mock-test lists after title update
    await invalidateMockTestsCache();

    return { success: true };
  } catch (err) {
    console.error('Failed to update mock test title:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Permanently deletes a mock test across Neon PostgreSQL and in-memory store
 */
export async function deleteMockTestAction(
  testId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  await requireAdmin();

  if (!testId?.trim()) {
    return { success: false, error: 'Test ID is required.' };
  }

  // Preserve historical scorecard integrity: check if this mock test has any completed student attempts
  try {
    const cleanSlug = testId.replace(/^mock-/, '');
    const existingAttempt = await prisma.attempt.findFirst({
      where: {
        OR: [
          { mockTestId: testId },
          { mockTestId: `mock-${cleanSlug}` },
          { mockTestId: cleanSlug },
          { mockTest: { slug: cleanSlug } },
          { mockTest: { id: testId } },
        ],
        isCompleted: true,
      },
      select: { id: true, userId: true },
    });
    if (existingAttempt) {
      return {
        success: false,
        error: `Cannot delete mock test "${testId}" because it contains finalized student exam attempts. Preserving historical scorecards is required.`,
      };
    }
  } catch (checkErr) {
    console.warn('Error checking attempt references for mock test deletion:', checkErr);
  }

  let deletedQuestionsCount = 0;
  try {
    const delResult = await MockTestRepository.deleteCascade(testId);
    deletedQuestionsCount = delResult.deletedQuestionsCount;
  } catch (dbErr) {
    console.error('MockTestRepository.deleteCascade error in deleteMockTestAction:', dbErr);
    return {
      success: false,
      error: dbErr instanceof Error ? dbErr.message : 'Database error deleting mock test',
    };
  }

  deletedMockTestIds.add(testId);
  deletedMockTestIds.add(testId.replace(/^mock-/, ''));
  dynamicMockTests = dynamicMockTests.filter(t => t.id !== testId && t.slug !== testId);
  saveCustomMockTestsToFile(dynamicMockTests);

  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/tests');
  // Bust cached mock-test and question lists after deletion
  await invalidateMockTestsCache();
  await invalidateQuestionsCache();
  return { success: true, count: deletedQuestionsCount };
}

/**
 * Toggle or update Mock Test / Partition Published State
 */
export async function toggleMockTestPublishAction(
  testIdOrSlug: string,
  targetStatus?: ExamStatus
): Promise<{ success: boolean; status?: ExamStatus; error?: string }> {
  await requireAdmin();

  if (!testIdOrSlug?.trim()) {
    return { success: false, error: 'Test ID is required.' };
  }

  const cleanSlug = testIdOrSlug.replace(/^mock-/, '');
  const test =
    dynamicMockTests.find(t => t.id === testIdOrSlug || t.slug === testIdOrSlug || t.slug === cleanSlug) ||
    MOCK_TESTS_DATA.find(t => t.id === testIdOrSlug || t.slug === testIdOrSlug || t.slug === cleanSlug);

  const dbTest = await prisma.mockTest.findFirst({
    where: {
      OR: [
        { id: testIdOrSlug },
        { slug: testIdOrSlug },
        { slug: cleanSlug },
        { id: `mock-${cleanSlug}` },
      ],
    },
  });

  if (!test && !dbTest) {
    return { success: false, error: 'Mock test not found.' };
  }

  const currentIsPublished = dbTest !== null ? dbTest.isPublished : test?.status === 'published';
  const newStatus: ExamStatus = targetStatus || (currentIsPublished ? 'created' : 'published');

  try {
    await MockTestRepository.togglePublish(dbTest?.id || test?.id || testIdOrSlug, newStatus === 'published');
  } catch (err) {
    console.error('MockTestRepository.togglePublish error in toggleMockTestPublishAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Database error toggling mock test publish status',
    };
  }

  if (test) {
    test.status = newStatus;
  }
  saveCustomMockTestsToFile(dynamicMockTests);

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
  const { getAdminExams } = await import('./examService');
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

  const seedPyqLabels: Record<string, string> = {
    'mock-sbi-clerk-2024-pyq': 'SBI Clerk 2024 PYQ',
    'mock-sbi-clerk-2023-pyq': 'SBI Clerk 2023-24 PYQ',
    'mock-ibps-po-2025-pyq': 'IBPS PO 2025 PYQ',
    'mock-ibps-po-2025-mains-pyq': 'IBPS PO 2025 Mains PYQ',
    'mock-ibps-po-2024-pyq': 'IBPS PO 2024 PYQ',
    'mock-ibps-po-2023-pyq': 'IBPS PO 2023 PYQ',
  };

  const testPartitions: AdminPartitionInfo[] = allTests.map(t => {
    // Only untouched legacy seed mock tests retain their concise seed pill labels
    const isSeedWithDefaultTitle =
      Boolean(seedPyqLabels[t.id]) &&
      (t.title === 'SBI Clerk Prelims 2024 - Previous Year Question Paper' ||
        t.title === 'SBI Clerk Prelims 2023-24 - Previous Year Question Paper' ||
        t.title === 'IBPS PO Prelims 2025 - Previous Year Question Paper' ||
        t.title === 'IBPS PO Mains 2025 - Previous Year Question Paper' ||
        t.title === 'IBPS PO Prelims 2024 - Previous Year Question Paper' ||
        t.title === 'IBPS PO Prelims 2023 - Previous Year Question Paper');

    // For all user-created exams, custom papers, edited titles, and newly created PYQs:
    // ALWAYS PRESERVE AND DISPLAY THE GIVEN TITLE (t.title)
    const label = isSeedWithDefaultTitle
      ? seedPyqLabels[t.id]
      : (t.title?.trim() || (t.isPyq && t.year ? `${t.examTitle.split('(')[0].trim()} ${t.year} PYQ` : t.title));

    return {
      id: t.id,
      label,
      badge: t.isPyq ? `Official Paper (${t.totalQuestions} Qs)` : `Fixed Exam (${t.totalQuestions} Qs)`,
      title: t.title,
      isPyq: Boolean(t.isPyq),
      pyqYear: t.year,
      examId: t.examId,
      category: t.isPyq ? 'PYQ' : 'MOCK',
      status: t.status || 'published',
      description: t.description || `${t.title} with dedicated questions.`,
    };
  });

  const map = new Map<string, AdminPartitionInfo>();
  for (const p of [...basePartitions, ...examPartitions, ...testPartitions]) {
    if (!map.has(p.id)) {
      map.set(p.id, p);
    }
  }

  return Array.from(map.values());
}
