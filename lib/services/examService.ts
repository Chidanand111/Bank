'use server';

import {
  invalidateExamsCache,
  invalidateMockTestsCache,
} from '../cache';
import { requireAdmin } from '../auth/permissions';
import { EXAMS_DATA, saveCustomExamsToFile } from '../data/exams';
import { prisma } from '../prisma';
import { ExamRepository, MockTestRepository } from '../db/repositories';
import { safeRevalidatePath } from './common';
import {
  adminExamInputSchema,
  updateExamTitleSchema,
  validateInput,
} from '../validations/adminSchemas';
import {
  addMockTestToMemory,
  removeMockTestsForExam,
  updateMockTestsExamTitle,
  setMockTestsStatusForExam,
} from './mockTestService';
import { removeQuestionsForExam } from './questionService';
import { AdminExamInput, Exam, ExamStatus, MockTest } from '@/types';

/**
 * Server-side Exam Management & Listing for Administrators
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
        const status: ExamStatus = e.isActive ? 'published' : 'created';
        if (existing) {
          existing.status = status;
        }
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
    console.warn('Neon DB query in examService.getAdminExams:', err);
  }
  return EXAMS_DATA;
}

/**
 * Creates an Exam category with Zod validation, pattern initialization, and default mock test
 */
export async function createExamAction(
  input: AdminExamInput
): Promise<{ success: boolean; exam?: Exam; error?: string }> {
  await requireAdmin();

  const validated = validateInput(adminExamInputSchema, input);
  if (!validated.success) {
    return { success: false, error: validated.error };
  }
  const validData = validated.data;

  const title = validData.title.trim();
  const slug =
    validData.slug?.trim() ||
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const category =
    validData.category ||
    (title.toLowerCase().includes('clerk')
      ? 'CLERK'
      : title.toLowerCase().includes('so')
      ? 'SO'
      : 'PO');
  const description =
    validData.description?.trim() || `${title} Recruitment Examination for Banking Aspirants`;

  const newExamId = `exam-${slug}`;
  const status: ExamStatus = validData.status || 'published';

  // Safe Neon PostgreSQL Database sync via ExamRepository
  let dbExam: Exam;
  try {
    dbExam = await ExamRepository.upsertExam({
      title,
      slug,
      category,
      description,
      status,
    });
  } catch (dbErr) {
    console.error('ExamRepository.upsertExam error in createExamAction:', dbErr);
    return {
      success: false,
      error: dbErr instanceof Error ? dbErr.message : 'Database error creating exam',
    };
  }

  const defaultMockId = `mock-${slug}-prelims-1`;

  // Upsert initial practice mock test in Neon PostgreSQL as well
  try {
    await MockTestRepository.upsertMockTest(
      {
        examId: dbExam.id,
        title: `${title} Prelims Practice Mock 1`,
        slug: `${slug}-prelims-1`,
        description: `Full-length preliminary practice mock test for ${title}. Features sectional timers, TCS iON question palette, and detailed explanations.`,
        durationMinutes: 60,
        totalMarks: 100,
        cutoffMarks: 60,
        isFree: true,
        status,
      },
      dbExam.id
    );
  } catch (mockErr) {
    console.warn('MockTestRepository.upsertMockTest error in createExamAction:', mockErr);
  }

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
          {
            id: `sec-${slug}-eng`,
            name: 'English Language',
            code: 'ENGLISH',
            numQuestions: 30,
            maxMarks: 30,
            durationMinutes: 20,
            topics: ['Reading Comprehension', 'Error Detection', 'Para Jumbles'],
          },
          {
            id: `sec-${slug}-quant`,
            name: 'Quantitative Aptitude',
            code: 'QUANT',
            numQuestions: 35,
            maxMarks: 35,
            durationMinutes: 20,
            topics: ['Data Interpretation', 'Arithmetic', 'Number Series'],
          },
          {
            id: `sec-${slug}-reason`,
            name: 'Reasoning Ability',
            code: 'REASONING',
            numQuestions: 35,
            maxMarks: 35,
            durationMinutes: 20,
            topics: ['Puzzles', 'Seating Arrangement', 'Syllogism'],
          },
        ],
      },
      {
        stage: 'Mains',
        totalQuestions: 155,
        totalMarks: 200,
        totalDurationMinutes: 180,
        sections: [
          {
            id: `sec-${slug}-m-reason`,
            name: 'Reasoning Ability',
            code: 'REASONING',
            numQuestions: 45,
            maxMarks: 60,
            durationMinutes: 60,
            topics: ['Advanced Puzzles', 'Machine Input-Output', 'Logical Reasoning'],
          },
          {
            id: `sec-${slug}-m-eng`,
            name: 'English Language',
            code: 'ENGLISH',
            numQuestions: 35,
            maxMarks: 40,
            durationMinutes: 40,
            topics: ['Advanced Comprehension', 'Vocabulary', 'Paragraph Completion'],
          },
          {
            id: `sec-${slug}-m-quant`,
            name: 'Quantitative Aptitude',
            code: 'QUANT',
            numQuestions: 35,
            maxMarks: 60,
            durationMinutes: 45,
            topics: ['Data Analysis & Interpretation', 'Caselet DI'],
          },
          {
            id: `sec-${slug}-m-ga`,
            name: 'General / Banking Awareness',
            code: 'FINANCIAL_AWARENESS',
            numQuestions: 40,
            maxMarks: 40,
            durationMinutes: 35,
            topics: ['Banking Awareness', 'Monetary Policy', 'Current Affairs'],
          },
        ],
      },
    ],
  };

  const existingIdx = EXAMS_DATA.findIndex(
    e => e.id === fullExam.id || e.slug === fullExam.slug
  );
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
      {
        id: `sec-${slug}-eng`,
        code: 'ENGLISH',
        name: 'English Language',
        questionCount: 30,
        marks: 30,
        durationMinutes: 20,
      },
      {
        id: `sec-${slug}-quant`,
        code: 'QUANT',
        name: 'Quantitative Aptitude',
        questionCount: 35,
        marks: 35,
        durationMinutes: 20,
      },
      {
        id: `sec-${slug}-reason`,
        code: 'REASONING',
        name: 'Reasoning Ability',
        questionCount: 35,
        marks: 35,
        durationMinutes: 20,
      },
    ],
    questions: [],
  };

  await addMockTestToMemory(defaultMock);

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

/**
 * Updates an Exam title and description with Zod validation across DB and in-memory caches
 */
export async function updateExamTitleAction(
  examIdOrSlug: string,
  newTitle: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const validated = validateInput(updateExamTitleSchema, {
    examIdOrSlug,
    newTitle,
    description,
  });
  if (!validated.success) {
    return { success: false, error: validated.error };
  }
  const { newTitle: validTitle, description: validDesc } = validated.data;
  const trimmedTitle = validTitle.trim();

  try {
    await ExamRepository.updateTitle(examIdOrSlug, trimmedTitle, validDesc);
  } catch (dbErr) {
    console.warn('ExamRepository.updateTitle error in updateExamTitleAction:', dbErr);
  }

  // Update in-memory EXAMS_DATA
  const staticExam = EXAMS_DATA.find(
    e =>
      e.id === examIdOrSlug ||
      e.slug === examIdOrSlug ||
      e.slug === examIdOrSlug.replace(/^exam-/, '')
  );
  if (staticExam) {
    staticExam.title = trimmedTitle;
    if (validDesc !== undefined) {
      staticExam.description = validDesc.trim();
      staticExam.shortDescription = validDesc.trim();
    }
  }
  saveCustomExamsToFile(EXAMS_DATA);

  // Update references in dynamicMockTests
  await updateMockTestsExamTitle(examIdOrSlug, trimmedTitle);

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
 * mock tests, and attempts across Neon PostgreSQL and the in-memory store.
 */
export async function deleteExamAction(
  examIdOrSlug: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  await requireAdmin();

  if (!examIdOrSlug?.trim()) {
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

  // Remove all matching questions from in-memory dynamicQuestions and JSON store mirror
  deletedQuestionsCount += await removeQuestionsForExam(targetExamId, targetSlug, examTitle);

  // Remove matching mock tests from dynamicMockTests
  await removeMockTestsForExam(targetExamId, targetSlug);

  // Remove exam from in-memory EXAMS_DATA
  const staticIndex = EXAMS_DATA.findIndex(
    e =>
      e.id === targetExamId ||
      e.slug === targetSlug ||
      e.id === examIdOrSlug ||
      e.slug === examIdOrSlug
  );
  if (staticIndex !== -1) {
    EXAMS_DATA.splice(staticIndex, 1);
  }
  saveCustomExamsToFile(EXAMS_DATA);

  // Revalidate Next.js cache paths
  safeRevalidatePath('/admin/exams');
  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/admin/tests');
  safeRevalidatePath('/exams');
  safeRevalidatePath('/tests');
  safeRevalidatePath('/dashboard');

  return { success: true, count: deletedQuestionsCount };
}

/**
 * Toggle or explicitly update Exam Published / Created (Draft) State
 */
export async function toggleExamPublishAction(
  examIdOrSlug: string,
  targetStatus?: ExamStatus
): Promise<{ success: boolean; status?: ExamStatus; error?: string }> {
  await requireAdmin();

  const cleanSlug = examIdOrSlug.replace(/^exam-/, '');

  // Look up in Neon PostgreSQL first to guarantee accuracy
  let dbExam = await prisma.exam.findFirst({
    where: {
      OR: [
        { id: examIdOrSlug },
        { slug: examIdOrSlug },
        { slug: cleanSlug },
        { id: `exam-${cleanSlug}` },
      ],
    },
  });

  let exam = EXAMS_DATA.find(
    e =>
      e.id === examIdOrSlug ||
      e.slug === examIdOrSlug ||
      e.slug === cleanSlug
  );

  if (!exam && dbExam) {
    exam = {
      id: dbExam.id,
      slug: dbExam.slug,
      title: dbExam.title,
      category: dbExam.category,
      description: dbExam.description,
      shortDescription: dbExam.description,
      totalMockTests: 1,
      status: dbExam.isActive ? 'published' : 'created',
      patterns: [],
    };
    EXAMS_DATA.push(exam);
  }

  if (!exam && !dbExam) {
    const allExams = await getAdminExams();
    exam = allExams.find(
      e =>
        e.id === examIdOrSlug ||
        e.slug === examIdOrSlug ||
        e.slug === cleanSlug
    );
  }

  if (!exam && !dbExam) {
    return { success: false, error: 'Exam not found.' };
  }

  const currentStatus: ExamStatus = dbExam
    ? (dbExam.isActive ? 'published' : 'created')
    : (exam?.status || 'published');

  const newStatus: ExamStatus =
    targetStatus || (currentStatus === 'published' ? 'created' : 'published');

  if (exam) {
    exam.status = newStatus;
  }
  saveCustomExamsToFile(EXAMS_DATA);

  // Sync associated mock tests in memory to match exam state
  const targetExamId = dbExam?.id || exam?.id || examIdOrSlug;
  const targetSlug = dbExam?.slug || exam?.slug || cleanSlug;
  await setMockTestsStatusForExam(targetExamId, targetSlug, newStatus);

  try {
    await prisma.exam.updateMany({
      where: {
        OR: [
          { id: targetExamId },
          { slug: targetSlug },
          { id: examIdOrSlug },
          { slug: examIdOrSlug },
          { slug: cleanSlug },
          { id: `exam-${cleanSlug}` },
        ],
      },
      data: {
        isActive: newStatus === 'published',
      },
    });

    await prisma.mockTest.updateMany({
      where: {
        OR: [
          { examId: targetExamId },
          { examId: examIdOrSlug },
          { examId: `exam-${targetSlug}` },
          { exam: { slug: targetSlug } },
        ],
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
