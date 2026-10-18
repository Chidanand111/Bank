import { prisma } from '../../prisma';
import { resolveGroupPassages } from '../questionDb';
import {
  AdminQuestionInput,
  Difficulty,
  Question,
  Option,
} from '@/types';

export interface QuestionFilters {
  search?: string;
  examId?: string;
  sectionCode?: string;
  difficulty?: string;
  partition?: string;
}

/**
 * Question Repository
 * Provides 100% serverless, zero-filesystem-write persistence for questions and options,
 * directly backed by Neon PostgreSQL.
 */
export class QuestionRepository {
  /**
   * Find a single question by ID with options, exam, section, and topic relations
   */
  static async findById(id: string): Promise<Question | null> {
    const q = await prisma.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { order: 'asc' } },
        exam: true,
        section: true,
        topic: true,
      },
    });

    if (!q) return null;

    const mapped: Question = {
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
      options: q.options.map((opt: { id: string; questionId: string; text: string; imageUrl: string | null; isCorrect: boolean; order: number }) => ({
        id: opt.id,
        questionId: opt.questionId,
        text: opt.text,
        imageUrl: opt.imageUrl || undefined,
        isCorrect: opt.isCorrect,
        order: opt.order,
      })),
    };

    return mapped;
  }

  /**
   * Find all questions in Neon PostgreSQL, sorted by ID
   */
  static async findAll(): Promise<Question[]> {
    const dbQuestions = await prisma.question.findMany({
      include: {
        options: { orderBy: { order: 'asc' } },
        exam: true,
        section: true,
        topic: true,
      },
      orderBy: { id: 'asc' },
    });

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

    return resolveGroupPassages(mapped);
  }

  /**
   * Create a question with options transactionally in Neon PostgreSQL without writing to the disk
   */
  static async create(
    input: AdminQuestionInput,
    overrideId?: string
  ): Promise<Question> {
    const newQuestionId = overrideId || `q-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Resolve or find target Exam in database
    let dbExam = input.examId
      ? await prisma.exam.findFirst({
          where: {
            OR: [
              { id: input.examId },
              { slug: input.examId },
              { slug: input.examId.replace(/^exam-/, '') },
              { id: `exam-${input.examId.replace(/^exam-/, '')}` },
            ],
          },
          include: { sections: { include: { topics: true } } },
        })
      : await prisma.exam.findFirst({
          include: { sections: { include: { topics: true } } },
        });

    if (!dbExam && input.examId) {
      const cleanSlug = input.examId.replace(/^exam-/, '');
      const titleToUse = cleanSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      try {
        dbExam = await prisma.exam.upsert({
          where: { slug: cleanSlug },
          update: { isActive: true },
          create: {
            id: input.examId.startsWith('exam-') ? input.examId : `exam-${cleanSlug}`,
            slug: cleanSlug,
            title: titleToUse,
            category: 'PO',
            description: `${titleToUse} Examination`,
            isActive: true,
          },
          include: { sections: { include: { topics: true } } },
        });
      } catch (upsertErr) {
        console.warn('Auto-upsert exam in QuestionRepository.create:', upsertErr);
      }
    }

    const finalExamId = dbExam?.id || input.examId || (await prisma.exam.findFirst())?.id || 'exam-ibps-po';
    let finalSecId: string;
    let finalTopicId: string;

    if (dbExam) {
      let existingSec = dbExam.sections?.find(s => s.code === input.sectionCode);
      if (!existingSec) {
        const secName = input.sectionCode === 'QUANT' ? 'Quantitative Aptitude'
          : input.sectionCode === 'ENGLISH' ? 'English Language'
          : input.sectionCode === 'FINANCIAL_AWARENESS' ? 'General / Banking Awareness'
          : 'Reasoning Ability';
        const candidateSecId = `sec-${dbExam.slug}-${input.sectionCode.toLowerCase()}`;
        const existingSecById = await prisma.section.findUnique({ where: { id: candidateSecId } });
        const finalCandidateSecId = existingSecById ? `${candidateSecId}-${Date.now().toString(36)}` : candidateSecId;

        existingSec = await prisma.section.upsert({
          where: { examId_code: { examId: dbExam.id, code: input.sectionCode } },
          update: { name: secName },
          create: {
            id: finalCandidateSecId,
            name: secName,
            code: input.sectionCode,
            examId: dbExam.id,
          },
          include: { topics: true },
        });
      }
      finalSecId = existingSec.id;

      let existingTopic = existingSec.topics?.find(t => t.name.toLowerCase() === input.topicName.toLowerCase());
      if (!existingTopic) {
        existingTopic = await prisma.topic.create({
          data: {
            id: `top-${dbExam.slug}-${input.topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
            name: input.topicName || 'General',
            sectionId: finalSecId,
          },
        });
      }
      finalTopicId = existingTopic.id;
    } else {
      const fallbackSec = await prisma.section.findFirst({ where: { code: input.sectionCode } }) || await prisma.section.findFirst();
      finalSecId = fallbackSec?.id || `sec-${input.sectionCode.toLowerCase()}`;
      const fallbackTopic = await prisma.topic.findFirst({ where: { sectionId: finalSecId } }) || await prisma.topic.findFirst();
      finalTopicId = fallbackTopic?.id || `top-${input.topicName.toLowerCase()}`;
    }

    const gId = input.groupId?.trim() || null;
    const dbPassage = input.passage?.trim() || null;
    const dbPassageImageUrl = input.passageImageUrl?.trim() || null;

    const diffToUse: Difficulty =
      String(input.difficulty || '').toUpperCase() === 'EASY'
        ? 'EASY'
        : String(input.difficulty || '').toUpperCase() === 'HARD'
        ? 'HARD'
        : 'MEDIUM';
    const marksToUse = typeof input.marks === 'number' ? input.marks : Number(input.marks) || 1.0;
    const negMarksToUse = typeof input.negativeMarks === 'number' ? input.negativeMarks : Number(input.negativeMarks) >= 0 ? Number(input.negativeMarks) : 0.25;
    const pyqYearToUse = input.pyqYear ? Number(input.pyqYear) : null;

    // Safe retry / idempotency check: if question already exists, avoid duplicate insert
    const existingById = await prisma.question.findUnique({
      where: { id: newQuestionId },
      include: {
        options: { orderBy: { order: 'asc' } },
        exam: true,
        section: true,
        topic: true,
      },
    });

    if (existingById) {
      return {
        id: existingById.id,
        text: existingById.text,
        imageUrl: existingById.imageUrl || undefined,
        passage: existingById.passage || undefined,
        passageImageUrl: existingById.passageImageUrl || undefined,
        groupId: existingById.groupId || undefined,
        isPyq: existingById.isPyq,
        pyqYear: existingById.pyqYear || undefined,
        pyqExam: existingById.pyqExam || undefined,
        difficulty: (existingById.difficulty as Difficulty) || 'MEDIUM',
        explanation: existingById.explanation || '',
        marks: existingById.marks ?? 1.0,
        negativeMarks: existingById.negativeMarks ?? 0.25,
        examId: existingById.examId,
        sectionId: existingById.sectionId,
        sectionCode: existingById.section?.code || 'GENERAL',
        sectionName: existingById.section?.name || 'General',
        topicId: existingById.topicId,
        topicName: existingById.topic?.name || 'General',
        options: existingById.options.map((opt: { id: string; questionId: string; text: string; imageUrl: string | null; isCorrect: boolean; order: number }) => ({
          id: opt.id,
          questionId: opt.questionId,
          text: opt.text,
          imageUrl: opt.imageUrl || undefined,
          isCorrect: opt.isCorrect,
          order: opt.order,
        })),
      };
    }

    // Transactional question + options creation
    const created = await prisma.question.create({
      data: {
        id: newQuestionId,
        text: input.text,
        imageUrl: input.imageUrl || null,
        passage: dbPassage,
        passageImageUrl: dbPassageImageUrl,
        groupId: gId,
        isPyq: Boolean(input.isPyq),
        pyqYear: pyqYearToUse,
        pyqExam: input.pyqExam || null,
        difficulty: diffToUse,
        explanation: input.explanation || '',
        marks: marksToUse,
        negativeMarks: negMarksToUse,
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
      include: {
        options: { orderBy: { order: 'asc' } },
        exam: true,
        section: true,
        topic: true,
      },
    });

    // Optionally link to mock test if specified
    const targetMockId = input.mockTestId && input.mockTestId !== 'ALL' ? input.mockTestId : undefined;
    if (targetMockId || (input.isPyq && input.pyqExam)) {
      try {
        const cleanMockSlug = targetMockId ? targetMockId.replace(/^mock-/, '') : '';
        const dbMockTest = await prisma.mockTest.findFirst({
          where: {
            OR: [
              ...(targetMockId ? [{ id: targetMockId }, { slug: targetMockId }, { slug: cleanMockSlug }] : []),
              ...(input.pyqExam ? [{ title: input.pyqExam }, { slug: input.pyqExam.toLowerCase().replace(/[^a-z0-9]+/g, '-') }] : []),
            ],
          },
          include: { mockTestQuestions: true },
        });

        if (dbMockTest) {
          const orderCount = dbMockTest.mockTestQuestions.length;
          await prisma.mockTestQuestion.upsert({
            where: {
              mockTestId_questionId: {
                mockTestId: dbMockTest.id,
                questionId: newQuestionId,
              },
            },
            update: { order: orderCount + 1 },
            create: {
              mockTestId: dbMockTest.id,
              questionId: newQuestionId,
              sectionId: finalSecId,
              order: orderCount + 1,
            },
          });
        }
      } catch (mockLinkErr) {
        console.warn('Mock test link error in QuestionRepository.create:', mockLinkErr);
      }
    }

    return {
      id: created.id,
      text: created.text,
      imageUrl: created.imageUrl || undefined,
      passage: created.passage || undefined,
      passageImageUrl: created.passageImageUrl || undefined,
      groupId: created.groupId || undefined,
      isPyq: created.isPyq,
      pyqYear: created.pyqYear || undefined,
      pyqExam: created.pyqExam || undefined,
      difficulty: (created.difficulty as Difficulty) || 'MEDIUM',
      explanation: created.explanation || '',
      marks: created.marks ?? 1.0,
      negativeMarks: created.negativeMarks ?? 0.25,
      examId: created.examId,
      examSlug: created.exam?.slug,
      examTitle: created.exam?.title,
      sectionId: created.sectionId,
      sectionCode: created.section?.code || input.sectionCode,
      sectionName: created.section?.name || (input.sectionCode === 'QUANT' ? 'Quantitative Aptitude' : input.sectionCode === 'ENGLISH' ? 'English Language' : 'Reasoning Ability'),
      topicId: created.topicId,
      topicName: created.topic?.name || input.topicName,
      options: created.options.map(opt => ({
        id: opt.id,
        questionId: opt.questionId,
        text: opt.text,
        imageUrl: opt.imageUrl || undefined,
        isCorrect: opt.isCorrect,
        order: opt.order,
      })),
    };
  }

  /**
   * Update question and replace its options transactionally in Neon PostgreSQL
   */
  static async update(id: string, input: AdminQuestionInput): Promise<Question | null> {
    const existing = await prisma.question.findUnique({
      where: { id },
      include: { section: true, topic: true, exam: true },
    });

    const finalExamId = existing?.examId || input.examId || 'exam-ibps-po';
    const finalSecId = existing?.sectionId || `sec-${input.sectionCode.toLowerCase()}`;
    const finalTopicId = existing?.topicId || `top-${input.topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    await prisma.$transaction([
      prisma.question.upsert({
        where: { id },
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
          id,
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
      }),
      prisma.option.deleteMany({ where: { questionId: id } }),
      ...input.options.map((opt, i) =>
        prisma.option.create({
          data: {
            id: `opt-${id}-${i + 1}`,
            questionId: id,
            text: opt.text || '',
            imageUrl: opt.imageUrl || null,
            isCorrect: opt.isCorrect,
            order: i + 1,
          },
        })
      ),
    ]);

    return this.findById(id);
  }

  /**
   * Delete question and cascade child records in Neon PostgreSQL
   */
  static async delete(id: string): Promise<boolean> {
    await prisma.$transaction([
      prisma.answer.deleteMany({ where: { questionId: id } }),
      prisma.mockTestQuestion.deleteMany({ where: { questionId: id } }),
      prisma.option.deleteMany({ where: { questionId: id } }),
      prisma.question.delete({ where: { id } }),
    ]);
    return true;
  }

  /**
   * Bulk import questions with transactional safety and zero filesystem writes
   */
  static async bulkCreate(
    questions: AdminQuestionInput[],
    partitionId?: string
  ): Promise<number> {
    let imported = 0;
    const batchGroupRegistry = new Map<string, { passage?: string; passageImageUrl?: string }>();

    for (const qInput of questions) {
      const inputToUse = { ...qInput };

      // De-duplicate group passages in batch
      if (inputToUse.groupId && inputToUse.groupId.trim()) {
        const gid = inputToUse.groupId.trim().toLowerCase();
        const existingInBatch = batchGroupRegistry.get(gid);
        if (!existingInBatch) {
          batchGroupRegistry.set(gid, {
            passage: inputToUse.passage?.trim() || undefined,
            passageImageUrl: inputToUse.passageImageUrl?.trim() || undefined,
          });
        } else {
          if (existingInBatch.passage && (!inputToUse.passage || inputToUse.passage.trim() === existingInBatch.passage.trim())) {
            inputToUse.passage = undefined;
          }
          if (existingInBatch.passageImageUrl && (!inputToUse.passageImageUrl || inputToUse.passageImageUrl.trim() === existingInBatch.passageImageUrl.trim())) {
            inputToUse.passageImageUrl = undefined;
          }
        }
      }

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

      await this.create(inputToUse);
      imported++;
    }

    return imported;
  }
}
