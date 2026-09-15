import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface RawJsonQuestion {
  id: string;
  exam: string;
  section: string;
  topic: string;
  question: string;
  imageUrl?: string;
  passage?: string;
  passageImageUrl?: string;
  groupId?: string;
  isPyq?: boolean;
  pyqYear?: number;
  pyqExam?: string;
  options: Record<string, string | { text: string; imageUrl?: string }>;
  answer: string;
  explanation: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  marks?: number;
  negativeMarks?: number;
}

async function main() {
  console.log('Connecting to Neon PostgreSQL DB...');

  // 1. Ensure IBPS PO Exam exists
  const exam = await prisma.exam.upsert({
    where: { slug: 'ibps-po' },
    update: {
      title: 'IBPS PO (Probationary Officer)',
      category: 'PO',
      description: 'Institute of Banking Personnel Selection Probationary Officers / Management Trainees Examination',
      isActive: true,
    },
    create: {
      id: 'exam-ibps-po',
      slug: 'ibps-po',
      title: 'IBPS PO (Probationary Officer)',
      category: 'PO',
      description: 'Institute of Banking Personnel Selection Probationary Officers / Management Trainees Examination',
      isActive: true,
    },
  });
  console.log('Exam ensured:', exam.id);

  // 2. Ensure Sections exist
  const engSection = await prisma.section.upsert({
    where: { examId_code: { examId: exam.id, code: 'ENGLISH' } },
    update: { name: 'English Language', order: 1 },
    create: {
      id: 'sec-ibps-p-eng',
      examId: exam.id,
      code: 'ENGLISH',
      name: 'English Language',
      order: 1,
    },
  });

  const quantSection = await prisma.section.upsert({
    where: { examId_code: { examId: exam.id, code: 'QUANT' } },
    update: { name: 'Quantitative Aptitude', order: 2 },
    create: {
      id: 'sec-ibps-p-quant',
      examId: exam.id,
      code: 'QUANT',
      name: 'Quantitative Aptitude',
      order: 2,
    },
  });

  const reasonSection = await prisma.section.upsert({
    where: { examId_code: { examId: exam.id, code: 'REASONING' } },
    update: { name: 'Reasoning Ability', order: 3 },
    create: {
      id: 'sec-ibps-p-reason',
      examId: exam.id,
      code: 'REASONING',
      name: 'Reasoning Ability',
      order: 3,
    },
  });

  const gaSection = await prisma.section.upsert({
    where: { examId_code: { examId: exam.id, code: 'FINANCIAL_AWARENESS' } },
    update: { name: 'General / Banking Awareness', order: 4 },
    create: {
      id: 'sec-ibps-m-ga',
      examId: exam.id,
      code: 'FINANCIAL_AWARENESS',
      name: 'General / Banking Awareness',
      order: 4,
    },
  });
  console.log('Sections ensured: ENGLISH, QUANT, REASONING, FINANCIAL_AWARENESS');

  // Topic cache helper
  const topicCache = new Map<string, string>();
  async function getOrCreateTopic(name: string, sectionId: string): Promise<string> {
    const safeName = name?.trim() || 'General';
    const key = `${sectionId}_${safeName.toLowerCase()}`;
    if (topicCache.has(key)) return topicCache.get(key)!;

    let topic = await prisma.topic.findFirst({
      where: { sectionId, name: { equals: safeName, mode: 'insensitive' } },
    });

    if (!topic) {
      topic = await prisma.topic.create({
        data: {
          name: safeName,
          sectionId,
        },
      });
    }

    topicCache.set(key, topic.id);
    return topic.id;
  }

  // Papers configuration
  const papersToIngest = [
    {
      dataFile: 'ibps_po_2025_mains_pyq.json',
      mockTestId: 'mock-ibps-po-2025-mains-pyq',
      slug: 'ibps-po-mains-2025-pyq',
      title: 'IBPS PO Mains 2025 - Previous Year Question Paper',
      description: 'Authentic 155-question actual exam paper from IBPS PO Mains 2025 (Held on Oct 12, 2025). Features Reasoning & Computer Aptitude (45 Qs), English Language (35 Qs), Data Analysis & Interpretation (35 Qs), and General / Banking Awareness (40 Qs).',
      durationMinutes: 180,
      totalMarks: 200,
      totalQuestions: 155,
      cutoffMarks: 78.5,
      pyqYear: 2025,
      pyqExam: 'IBPS PO Mains 2025',
    },
    {
      dataFile: 'ibps_po_2024_prelims_pyq.json',
      mockTestId: 'mock-ibps-po-2024-pyq',
      slug: 'ibps-po-prelims-2024-pyq',
      title: 'IBPS PO Prelims 2024 - Previous Year Question Paper',
      description: 'Authentic 100-question actual exam paper from IBPS PO Prelims 2024 (Held on Oct 19, 2024). Features Reasoning Ability (35 Qs), English Language (30 Qs), and Quantitative Aptitude (35 Qs).',
      durationMinutes: 60,
      totalMarks: 100,
      totalQuestions: 100,
      cutoffMarks: 53.5,
      pyqYear: 2024,
      pyqExam: 'IBPS PO Prelims 2024',
    },
    {
      dataFile: 'ibps_po_2023_prelims_pyq.json',
      mockTestId: 'mock-ibps-po-2023-pyq',
      slug: 'ibps-po-prelims-2023-pyq',
      title: 'IBPS PO Prelims 2023 - Previous Year Question Paper',
      description: 'Authentic 100-question actual exam paper from IBPS PO Prelims 2023 (Held on Sep 23, 2023). Features English Language (30 Qs), Quantitative Aptitude (35 Qs), and Reasoning Ability (35 Qs).',
      durationMinutes: 60,
      totalMarks: 100,
      totalQuestions: 100,
      cutoffMarks: 54.0,
      pyqYear: 2023,
      pyqExam: 'IBPS PO Prelims 2023',
    },
  ];

  async function withRetry<T>(fn: () => Promise<T>, retries = 6, delayMs = 2000): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        console.warn(`[Neon Retry] Query failed (attempt ${i + 1}/${retries}): ${err?.message || err}. Reconnecting in ${delayMs * (i + 1)}ms...`);
        try {
          await prisma.$disconnect();
        } catch {}
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        try {
          await prisma.$connect();
        } catch {}
      }
    }
    throw lastError;
  }

  for (const paper of papersToIngest) {
    const jsonPath = path.join(process.cwd(), 'data', paper.dataFile);
    const questions: RawJsonQuestion[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`\n======================================================`);
    console.log(`Processing ${paper.title} (${questions.length} questions from ${paper.dataFile})`);

    // Ensure MockTest exists
    const mockTest = await withRetry(() => prisma.mockTest.upsert({
      where: { slug: paper.slug },
      update: {
        title: paper.title,
        description: paper.description,
        examId: exam.id,
        durationMinutes: paper.durationMinutes,
        totalMarks: paper.totalMarks,
        totalQuestions: paper.totalQuestions,
        cutoffMarks: paper.cutoffMarks,
        isFree: true,
        isPublished: true,
        isFixed: true,
        isPyq: true,
        year: paper.pyqYear,
      },
      create: {
        id: paper.mockTestId,
        slug: paper.slug,
        title: paper.title,
        description: paper.description,
        examId: exam.id,
        durationMinutes: paper.durationMinutes,
        totalMarks: paper.totalMarks,
        totalQuestions: paper.totalQuestions,
        cutoffMarks: paper.cutoffMarks,
        isFree: true,
        isPublished: true,
        isFixed: true,
        isPyq: true,
        year: paper.pyqYear,
      },
    }));
    console.log(`MockTest ensured: ${mockTest.id} (${mockTest.slug})`);

    let qOrder = 1;
    for (const raw of questions) {
      const currentQOrder = qOrder;

      // Check if already processed and linked
      const existingLink = await withRetry(() => prisma.mockTestQuestion.findUnique({
        where: {
          mockTestId_questionId: {
            mockTestId: mockTest.id,
            questionId: raw.id,
          },
        },
      }));
      if (existingLink) {
        if (currentQOrder % 25 === 0 || currentQOrder === questions.length) {
          console.log(`  Already processed ${currentQOrder}/${questions.length} questions...`);
        }
        qOrder++;
        continue;
      }

      const secNorm = (raw.section || '').toLowerCase();
      let sec = reasonSection;
      if (secNorm.includes('eng')) {
        sec = engSection;
      } else if (secNorm.includes('quant') || secNorm.includes('numer') || secNorm.includes('math') || secNorm.includes('data') || secNorm.includes('analysis') || secNorm.includes('interpret')) {
        sec = quantSection;
      } else if (secNorm.includes('general') || secNorm.includes('aware') || secNorm.includes('ga') || secNorm.includes('bank') || secNorm.includes('financial')) {
        sec = gaSection;
      } else if (secNorm.includes('reason') || secNorm.includes('computer')) {
        sec = reasonSection;
      }

      const topicId = await withRetry(() => getOrCreateTopic(raw.topic || 'General', sec.id));

      // Upsert question with retry
      const question = await withRetry(() => prisma.question.upsert({
        where: { id: raw.id },
        update: {
          text: raw.question,
          passage: raw.passage || null,
          passageImageUrl: raw.passageImageUrl || null,
          imageUrl: raw.imageUrl || null,
          groupId: raw.groupId || null,
          isPyq: true,
          pyqYear: paper.pyqYear,
          pyqExam: paper.pyqExam,
          difficulty: raw.difficulty || 'MEDIUM',
          explanation: raw.explanation || '',
          marks: raw.marks ?? 1.0,
          negativeMarks: raw.negativeMarks ?? 0.25,
          examId: exam.id,
          sectionId: sec.id,
          topicId: topicId,
        },
        create: {
          id: raw.id,
          text: raw.question,
          passage: raw.passage || null,
          passageImageUrl: raw.passageImageUrl || null,
          imageUrl: raw.imageUrl || null,
          groupId: raw.groupId || null,
          isPyq: true,
          pyqYear: paper.pyqYear,
          pyqExam: paper.pyqExam,
          difficulty: raw.difficulty || 'MEDIUM',
          explanation: raw.explanation || '',
          marks: raw.marks ?? 1.0,
          negativeMarks: raw.negativeMarks ?? 0.25,
          examId: exam.id,
          sectionId: sec.id,
          topicId: topicId,
        },
      }));

      // Delete existing options
      await withRetry(() => prisma.option.deleteMany({
        where: { questionId: raw.id },
      }));

      // Batch create options
      const optKeys = Object.keys(raw.options || {}).sort();
      const optionsToCreate = optKeys.map((key, idx) => {
        const optVal = raw.options[key];
        const optText = typeof optVal === 'string' ? optVal : (optVal?.text || '');
        const optImg = typeof optVal === 'object' ? optVal?.imageUrl : null;
        const isCorrect = key.trim().toUpperCase() === (raw.answer || '').trim().toUpperCase();
        return {
          id: `opt-${raw.id}-${key.toLowerCase()}`,
          questionId: question.id,
          text: optText,
          imageUrl: optImg,
          isCorrect,
          order: idx + 1,
        };
      });

      if (optionsToCreate.length > 0) {
        await withRetry(() => prisma.option.createMany({
          data: optionsToCreate,
        }));
      }

      // Link Question to MockTest in MockTestQuestion
      await withRetry(() => prisma.mockTestQuestion.upsert({
        where: {
          mockTestId_questionId: {
            mockTestId: mockTest.id,
            questionId: question.id,
          },
        },
        update: {
          order: currentQOrder,
          sectionId: sec.id,
        },
        create: {
          mockTestId: mockTest.id,
          questionId: question.id,
          sectionId: sec.id,
          order: currentQOrder,
        },
      }));

      if (qOrder % 25 === 0 || qOrder === questions.length) {
        console.log(`  Processed ${qOrder}/${questions.length} questions...`);
      }
      qOrder++;
    }

    const linkedCount = await withRetry(() => prisma.mockTestQuestion.count({ where: { mockTestId: mockTest.id } }));
    console.log(`Successfully ingested and linked ${linkedCount} questions to ${mockTest.title}!`);
  }

  // Summary counts
  const totalQuestions = await prisma.question.count();
  const totalPyq = await prisma.question.count({ where: { isPyq: true } });
  const totalOptions = await prisma.option.count();

  console.log('\n================ ALL INGESTIONS COMPLETE ================');
  console.log({
    totalQuestionsInDb: totalQuestions,
    totalPyqQuestionsInDb: totalPyq,
    totalOptionsInDb: totalOptions,
  });

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Ingestion failed with error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
