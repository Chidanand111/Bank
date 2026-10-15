import { prisma } from '../../prisma';
import { AdminMockTestInput, Difficulty, MockTest, Question } from '@/types';

/**
 * MockTest Repository
 * Provides 100% serverless, zero-filesystem-write persistence for Mock Tests and PYQs,
 * directly backed by Neon PostgreSQL.
 */
export class MockTestRepository {
  /**
   * Fetch all mock tests from Neon PostgreSQL
   */
  static async getMockTests(includeDrafts = false): Promise<MockTest[]> {
    const dbTests = await prisma.mockTest.findMany({
      where: includeDrafts ? {} : { isPublished: true },
      include: {
        exam: {
          include: { sections: true },
        },
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
      orderBy: { createdAt: 'desc' },
    });

    return dbTests.map(t => {
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

      const sections = t.exam?.sections && t.exam.sections.length > 0
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
          ];

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
        status: t.isPublished ? 'published' : 'created',
        sections,
        questions: liveQuestions,
      };
    });
  }

  /**
   * Find single mock test by ID or slug
   */
  static async findByIdOrSlug(idOrSlug: string): Promise<MockTest | null> {
    const cleanSlug = idOrSlug.replace(/^mock-/, '');
    const t = await prisma.mockTest.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug },
          { slug: cleanSlug },
        ],
      },
      include: {
        exam: {
          include: { sections: true },
        },
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

    if (!t) return null;

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

    const sections = t.exam?.sections && t.exam.sections.length > 0
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
        ];

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
      status: t.isPublished ? 'published' : 'created',
      sections,
      questions: liveQuestions,
    };
  }

  /**
   * Upsert a MockTest in Neon PostgreSQL
   */
  static async upsertMockTest(
    input: AdminMockTestInput,
    resolvedExamId: string
  ): Promise<MockTest> {
    const title = input.title.trim();
    const rawSlug = input.slug?.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = input.isPyq && !rawSlug.includes('pyq') ? `${rawSlug}-pyq` : rawSlug;
    const newId = `mock-${slug}`;
    const isPyq = Boolean(input.isPyq);
    const year = input.year ? Number(input.year) : (isPyq ? new Date().getFullYear() : null);
    const isPublished = input.status !== undefined ? input.status === 'published' : true;

    await prisma.mockTest.upsert({
      where: { slug },
      update: {
        title,
        description: input.description,
        examId: resolvedExamId,
        durationMinutes: input.durationMinutes || 60,
        totalMarks: input.totalMarks || 100,
        totalQuestions: input.sections?.reduce((acc, s) => acc + (s.questionCount || 0), 0) || 100,
        cutoffMarks: input.cutoffMarks || 60,
        isFree: input.isFree ?? true,
        isPublished,
        isFixed: true,
        isPyq,
        year,
      },
      create: {
        id: newId,
        slug,
        title,
        description: input.description || `${title} Examination Practice Paper`,
        examId: resolvedExamId,
        durationMinutes: input.durationMinutes || 60,
        totalMarks: input.totalMarks || 100,
        totalQuestions: input.sections?.reduce((acc, s) => acc + (s.questionCount || 0), 0) || 100,
        cutoffMarks: input.cutoffMarks || 60,
        isFree: input.isFree ?? true,
        isPublished,
        isFixed: true,
        isPyq,
        year,
      },
    });

    const test = await this.findByIdOrSlug(newId);
    return test!;
  }

  /**
   * Cascade delete Mock Test and all associated questions, options, attempts, answers
   */
  static async deleteCascade(testIdOrSlug: string): Promise<{ success: boolean; deletedQuestionsCount: number }> {
    const cleanSlug = testIdOrSlug.replace(/^mock-/, '');
    const dbTest = await prisma.mockTest.findFirst({
      where: {
        OR: [
          { id: testIdOrSlug },
          { slug: testIdOrSlug },
          { slug: cleanSlug },
        ],
      },
      include: {
        mockTestQuestions: { select: { questionId: true } },
      },
    });

    if (!dbTest) {
      return { success: false, deletedQuestionsCount: 0 };
    }

    const directQIds = dbTest.mockTestQuestions.map(mtq => mtq.questionId);

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

    // Cascade delete in FK order
    if (questionIds.length > 0) {
      await prisma.answer.deleteMany({
        where: {
          OR: [
            { questionId: { in: questionIds } },
            { attempt: { mockTestId: dbTest.id } },
          ],
        },
      });

      await prisma.option.deleteMany({
        where: { questionId: { in: questionIds } },
      });

      await prisma.mockTestQuestion.deleteMany({
        where: {
          OR: [
            { mockTestId: dbTest.id },
            { questionId: { in: questionIds } },
          ],
        },
      });

      await prisma.attempt.deleteMany({
        where: { mockTestId: dbTest.id },
      });

      await prisma.question.deleteMany({
        where: { id: { in: questionIds } },
      });
    } else {
      await prisma.mockTestQuestion.deleteMany({ where: { mockTestId: dbTest.id } });
      await prisma.attempt.deleteMany({ where: { mockTestId: dbTest.id } });
    }

    await prisma.mockTest.delete({ where: { id: dbTest.id } });

    return { success: true, deletedQuestionsCount: questionIds.length };
  }

  /**
   * Toggle Mock Test publish status
   */
  static async togglePublish(testIdOrSlug: string, isPublished: boolean): Promise<boolean> {
    const cleanSlug = testIdOrSlug.replace(/^mock-/, '');
    const res = await prisma.mockTest.updateMany({
      where: {
        OR: [
          { id: testIdOrSlug },
          { slug: testIdOrSlug },
          { slug: cleanSlug },
        ],
      },
      data: { isPublished },
    });
    return res.count > 0;
  }
}
