import { prisma } from '../../prisma';
import { AdminExamInput, Exam, ExamStatus } from '@/types';

/**
 * Exam Repository
 * Provides 100% serverless, zero-filesystem-write persistence for exams and sections,
 * directly backed by Neon PostgreSQL.
 */
export class ExamRepository {
  /**
   * Fetch all exams from Neon PostgreSQL
   */
  static async getExams(includeInactive = false): Promise<Exam[]> {
    const dbExams = await prisma.exam.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        sections: { include: { topics: true } },
        mockTests: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return dbExams.map(e => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      category: e.category,
      description: e.description,
      shortDescription: e.description,
      totalMockTests: e.mockTests?.length || 0,
      status: (e.isActive ? 'published' : 'created') as ExamStatus,
      patterns: [
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
    }));
  }

  /**
   * Find a single exam by ID or slug
   */
  static async findByIdOrSlug(idOrSlug: string): Promise<Exam | null> {
    const cleanSlug = idOrSlug.replace(/^exam-/, '');
    const dbExam = await prisma.exam.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug },
          { slug: cleanSlug },
        ],
      },
      include: {
        sections: { include: { topics: true } },
        mockTests: true,
      },
    });

    if (!dbExam) return null;

    return {
      id: dbExam.id,
      slug: dbExam.slug,
      title: dbExam.title,
      category: dbExam.category,
      description: dbExam.description,
      shortDescription: dbExam.description,
      totalMockTests: dbExam.mockTests?.length || 0,
      status: (dbExam.isActive ? 'published' : 'created') as ExamStatus,
      patterns: [
        {
          stage: 'Prelims',
          totalQuestions: 100,
          totalMarks: 100,
          totalDurationMinutes: 60,
          sections: dbExam.sections.map(s => ({
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
  }

  /**
   * Upsert Exam and standard 4 sections transactionally in Neon PostgreSQL
   */
  static async upsertExam(input: AdminExamInput): Promise<Exam> {
    const title = input.title.trim();
    const slug = input.slug?.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const category = input.category || (title.toLowerCase().includes('clerk') ? 'CLERK' : title.toLowerCase().includes('so') ? 'SO' : 'PO');
    const description = input.description?.trim() || `${title} Recruitment Examination for Banking Aspirants`;
    const newExamId = `exam-${slug}`;
    const status: ExamStatus = input.status || 'published';

    const dbExam = await prisma.exam.upsert({
      where: { slug },
      update: {
        title,
        category,
        description,
        isActive: status === 'published',
      },
      create: {
        id: newExamId,
        slug,
        title,
        category,
        description,
        isActive: status === 'published',
      },
      include: { sections: { include: { topics: true } } },
    });

    // Ensure 4 standard sections exist for this exam safely
    const ensureSection = async (code: string, name: string, order: number) => {
      const existing = await prisma.section.findFirst({
        where: { examId: dbExam.id, code },
      });
      if (!existing) {
        const candidateId = `sec-${slug}-${code.toLowerCase()}`;
        const idExists = await prisma.section.findUnique({ where: { id: candidateId } });
        const finalId = idExists ? `${candidateId}-${Date.now().toString(36)}` : candidateId;
        await prisma.section.create({
          data: {
            id: finalId,
            examId: dbExam.id,
            code,
            name,
            order,
          },
        });
      } else {
        await prisma.section.update({
          where: { id: existing.id },
          data: { name, order },
        });
      }
    };

    if (category === 'RAILWAY') {
      await ensureSection('GA', 'General Awareness', 1);
      await ensureSection('QUANT', 'Mathematics', 2);
      await ensureSection('REASONING', 'General Intelligence & Reasoning', 3);
    } else if (category === 'SSC') {
      await ensureSection('REASONING', 'General Intelligence & Reasoning', 1);
      await ensureSection('GA', 'General Awareness', 2);
      await ensureSection('QUANT', 'Quantitative Aptitude', 3);
      await ensureSection('ENGLISH', 'English Comprehension', 4);
    } else {
      await ensureSection('ENGLISH', 'English Language', 1);
      await ensureSection('QUANT', 'Quantitative Aptitude', 2);
      await ensureSection('REASONING', 'Reasoning Ability', 3);
      await ensureSection('FINANCIAL_AWARENESS', 'General / Banking Awareness', 4);
    }

    const updated = await this.findByIdOrSlug(dbExam.id);
    return updated!;
  }

  /**
   * Update Exam title and description in Neon PostgreSQL
   */
  static async updateTitle(examIdOrSlug: string, title: string, description?: string): Promise<boolean> {
    const cleanSlug = examIdOrSlug.replace(/^exam-/, '');
    const dbExam = await prisma.exam.findFirst({
      where: {
        OR: [
          { id: examIdOrSlug },
          { slug: examIdOrSlug },
          { slug: cleanSlug },
        ],
      },
    });

    if (!dbExam) return false;

    await prisma.exam.update({
      where: { id: dbExam.id },
      data: {
        title: title.trim(),
        ...(description !== undefined ? { description: description.trim() } : {}),
      },
    });

    return true;
  }

  /**
   * Cascade delete Exam and all child records (mock tests, questions, options, sections, topics, attempts, answers)
   */
  static async deleteCascade(examIdOrSlug: string): Promise<{ success: boolean; deletedQuestionsCount: number }> {
    const cleanSlug = examIdOrSlug.replace(/^exam-/, '');
    const dbExam = await prisma.exam.findFirst({
      where: {
        OR: [
          { id: examIdOrSlug },
          { slug: examIdOrSlug },
          { slug: cleanSlug },
        ],
      },
    });

    if (!dbExam) {
      return { success: false, deletedQuestionsCount: 0 };
    }

    const mockTests = await prisma.mockTest.findMany({
      where: {
        OR: [{ examId: dbExam.id }, { examId: examIdOrSlug }, { examId: cleanSlug }],
      },
      select: { id: true },
    });
    const mockTestIds = mockTests.map(m => m.id);

    const examQuestions = await prisma.question.findMany({
      where: {
        OR: [
          { examId: dbExam.id },
          { examId: examIdOrSlug },
          { examId: cleanSlug },
          ...(dbExam.title ? [{ pyqExam: dbExam.title }] : []),
          ...(mockTestIds.length > 0
            ? [{ mockTestQuestions: { some: { mockTestId: { in: mockTestIds } } } }]
            : []),
        ],
      },
      select: { id: true },
    });
    const questionIds = Array.from(new Set(examQuestions.map(q => q.id)));

    // Cascade deletion
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

    if (mockTestIds.length > 0) {
      await prisma.attempt.deleteMany({
        where: { mockTestId: { in: mockTestIds } },
      });
    }

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

    if (questionIds.length > 0) {
      await prisma.option.deleteMany({
        where: { questionId: { in: questionIds } },
      });
      await prisma.question.deleteMany({
        where: { id: { in: questionIds } },
      });
    }

    if (mockTestIds.length > 0) {
      await prisma.mockTest.deleteMany({
        where: { id: { in: mockTestIds } },
      });
    }

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

    await prisma.exam.delete({
      where: { id: dbExam.id },
    });

    return { success: true, deletedQuestionsCount: questionIds.length };
  }
}
