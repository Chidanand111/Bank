'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../auth/permissions';
import { getDatabaseUsers, updateDatabaseUserRole, getCurrentUser } from '../auth/session';
import { EXAMS_DATA } from '../data/exams';
import { MOCK_TESTS_DATA } from '../data/mockTests';
import { SAMPLE_ATTEMPTS } from '../data/sampleAttempts';
import { prisma } from '../prisma';
import {
  getAllQuestions,
  addQuestionToJsonDb,
  updateQuestionInJsonDb,
  deleteQuestionFromJsonDb,
  getQuestionsForExamPartition,
  syncQuestionsToStore,
  partitionQuestionsList,
} from '../db/questionDb';
import { AdminMockTestInput, AdminQuestionInput, AdminStats, AuthUser, MockTest, Question, Role, Difficulty } from '@/types';

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

/**
 * Server-side Admin Statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();

  const users = getDatabaseUsers();
  const totalAdmins = users.filter(u => u.role === 'ADMIN').length;
  const totalUsers = users.length;
  const totalExams = EXAMS_DATA.length;
  const totalQuestions = dynamicQuestions.length;
  const totalMockTests = dynamicMockTests.length;
  const totalAttempts = SAMPLE_ATTEMPTS.length + 15; // Platform count

  return {
    totalUsers,
    totalAdmins,
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
 * Server-side User Management
 */
export async function getAdminUsers(): Promise<AuthUser[]> {
  await requireAdmin();
  const users = getDatabaseUsers();
  return users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    attemptCount: u.attemptCount,
  }));
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

  let list: Question[] = filters?.partition && filters.partition !== 'ALL'
    ? partitionQuestionsList(sourceQuestions, filters.partition)
    : [...sourceQuestions];

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

export async function createQuestionAction(input: AdminQuestionInput): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const exam = EXAMS_DATA.find(e => e.id === input.examId) || EXAMS_DATA[0];
  const newQuestionId = `q-custom-${Date.now()}`;

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
    examId: exam.id,
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
      isCorrect: opt.isCorrect,
      order: i + 1,
    })),
  };

  dynamicQuestions.unshift(newQuestion);
  addQuestionToJsonDb({
    id: newQuestionId,
    exam: input.isPyq ? (input.pyqExam || 'SBI Clerk Prelims 2024 PYQ') : exam.title,
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
    const dbExam = await prisma.exam.findFirst({
      where: {
        OR: [
          { id: input.examId },
          { slug: input.examId.replace('exam-', '') },
        ],
      },
      include: { sections: { include: { topics: true } } },
    });

    const finalExamId = dbExam ? dbExam.id : (await prisma.exam.findFirst())?.id || input.examId;
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
            isCorrect: opt.isCorrect,
            order: i + 1,
          })),
        },
      },
    });
  } catch (dbErr) {
    console.warn('Neon DB async sync on createQuestion:', dbErr);
  }

  safeRevalidatePath('/admin/questions');
  return { success: true };
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
  const freshQuestions = await loadFreshQuestionsFromDb();
  return partitionQuestionsList(freshQuestions, testIdOrSlug);
}

export async function deleteQuestionAction(questionId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  dynamicQuestions = dynamicQuestions.filter(q => q.id !== questionId);
  deleteQuestionFromJsonDb(questionId);

  try {
    await prisma.option.deleteMany({ where: { questionId } });
    await prisma.question.delete({ where: { id: questionId } });
  } catch (dbErr) {
    console.warn('Neon DB async sync on deleteQuestion:', dbErr);
  }

  safeRevalidatePath('/admin/questions');
  return { success: true };
}

/**
 * Server-side Mock Test Management
 */
export async function getAdminMockTests(): Promise<MockTest[]> {
  await requireAdmin();
  return dynamicMockTests;
}

export async function createMockTestAction(input: AdminMockTestInput): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const exam = EXAMS_DATA.find(e => e.id === input.examId) || EXAMS_DATA[0];
  const newId = `mock-custom-${Date.now()}`;

  const newTest: MockTest = {
    id: newId,
    slug: input.slug,
    title: input.title,
    description: input.description,
    examId: exam.id,
    examSlug: exam.slug,
    examTitle: exam.title,
    durationMinutes: input.durationMinutes,
    totalMarks: input.totalMarks,
    totalQuestions: input.sections.reduce((acc, s) => acc + s.questionCount, 0) || 100,
    cutoffMarks: input.cutoffMarks,
    isFree: input.isFree,
    sections: input.sections.map(s => ({
      id: `sec-${s.code.toLowerCase()}`,
      code: s.code,
      name: s.name,
      questionCount: s.questionCount,
      marks: s.marks,
      durationMinutes: 20,
    })),
    questions: dynamicQuestions.slice(0, 10), // Assign initial questions
  };

  dynamicMockTests.unshift(newTest);
  safeRevalidatePath('/admin/tests');
  return { success: true };
}

export async function deleteMockTestAction(testId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  dynamicMockTests = dynamicMockTests.filter(t => t.id !== testId);
  safeRevalidatePath('/admin/tests');
  return { success: true };
}

/**
 * Server-side Attempts viewer for Admin
 */
export async function getAdminAllAttempts() {
  await requireAdmin();
  return SAMPLE_ATTEMPTS;
}
