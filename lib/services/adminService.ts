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
} from '../db/questionDb';
import { AdminMockTestInput, AdminQuestionInput, AdminStats, AuthUser, MockTest, Question, Role } from '@/types';

// In-memory working sets for admin modifications backed by JSON question store
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

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Server-side Question Management
 */
export async function getAdminQuestions(filters?: {
  search?: string;
  examId?: string;
  sectionCode?: string;
  difficulty?: string;
  partition?: string;
}): Promise<Question[]> {
  await requireAdmin();

  let list: Question[];

  if (filters?.partition && filters.partition !== 'ALL') {
    list = getQuestionsForExamPartition(filters.partition);
  } else {
    list = [...dynamicQuestions];
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

  revalidatePath('/admin/questions');
  return { success: true };
}

export async function updateQuestionAction(
  questionId: string,
  input: AdminQuestionInput
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const index = dynamicQuestions.findIndex(q => q.id === questionId);
  if (index === -1) {
    return { success: false, error: 'Question not found.' };
  }

  const existing = dynamicQuestions[index];
  const updatedQuestion: Question = {
    ...existing,
    text: input.text,
    imageUrl: input.imageUrl,
    passage: input.passage,
    passageImageUrl: input.passageImageUrl,
    groupId: input.groupId,
    isPyq: input.isPyq !== undefined ? input.isPyq : existing.isPyq,
    pyqYear: input.pyqYear !== undefined ? input.pyqYear : existing.pyqYear,
    pyqExam: input.pyqExam || existing.pyqExam,
    difficulty: input.difficulty,
    explanation: input.explanation,
    marks: input.marks,
    negativeMarks: input.negativeMarks,
    sectionCode: input.sectionCode,
    topicName: input.topicName,
    options: input.options.map((opt, i) => ({
      id: existing.options[i]?.id || `opt-${questionId}-${i + 1}`,
      questionId,
      text: opt.text,
      imageUrl: opt.imageUrl,
      isCorrect: opt.isCorrect,
      order: i + 1,
    })),
  };

  dynamicQuestions[index] = updatedQuestion;

  updateQuestionInJsonDb(questionId, {
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

  // Persist directly to Neon PostgreSQL Database
  try {
    await prisma.question.update({
      where: { id: questionId },
      data: {
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
    });

    // Update options in database
    await prisma.option.deleteMany({ where: { questionId } });
    for (let i = 0; i < input.options.length; i++) {
      const opt = input.options[i];
      await prisma.option.create({
        data: {
          id: `opt-${questionId}-${i + 1}`,
          questionId,
          text: opt.text || '',
          imageUrl: opt.imageUrl || null,
          isCorrect: opt.isCorrect,
          order: i + 1,
        },
      });
    }
  } catch (dbErr) {
    console.warn('Neon DB async sync on updateQuestion:', dbErr);
  }

  revalidatePath('/admin/questions');
  return { success: true };
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

  revalidatePath('/admin/questions');
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
  revalidatePath('/admin/tests');
  return { success: true };
}

export async function deleteMockTestAction(testId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  dynamicMockTests = dynamicMockTests.filter(t => t.id !== testId);
  revalidatePath('/admin/tests');
  return { success: true };
}

/**
 * Server-side Attempts viewer for Admin
 */
export async function getAdminAllAttempts() {
  await requireAdmin();
  return SAMPLE_ATTEMPTS;
}
