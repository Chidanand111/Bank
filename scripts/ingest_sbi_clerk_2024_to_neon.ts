import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to Neon PostgreSQL DB...');
  const jsonPath = path.join(process.cwd(), 'data', 'sbi_clerk_2024_pyq.json');
  const pyqQuestions = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`Loaded ${pyqQuestions.length} questions from ${jsonPath}`);

  // 1. Ensure Exam exists
  const exam = await prisma.exam.upsert({
    where: { slug: 'sbi-clerk' },
    update: {
      title: 'SBI Clerk (Junior Associate)',
      category: 'CLERK',
      description: 'State Bank of India Junior Associates (Customer Support & Sales) Recruitment Examination',
      isActive: true,
    },
    create: {
      id: 'exam-sbi-clerk',
      slug: 'sbi-clerk',
      title: 'SBI Clerk (Junior Associate)',
      category: 'CLERK',
      description: 'State Bank of India Junior Associates (Customer Support & Sales) Recruitment Examination',
      isActive: true,
    },
  });
  console.log('Exam ensured:', exam.id);

  // 2. Ensure Sections exist
  const engSection = await prisma.section.upsert({
    where: { examId_code: { examId: exam.id, code: 'ENGLISH' } },
    update: { name: 'English Language', order: 1 },
    create: {
      id: 'sec-sbi-p-eng',
      examId: exam.id,
      code: 'ENGLISH',
      name: 'English Language',
      order: 1,
    },
  });

  const quantSection = await prisma.section.upsert({
    where: { examId_code: { examId: exam.id, code: 'QUANT' } },
    update: { name: 'Numerical Ability', order: 2 },
    create: {
      id: 'sec-sbi-p-num',
      examId: exam.id,
      code: 'QUANT',
      name: 'Numerical Ability',
      order: 2,
    },
  });

  const reasonSection = await prisma.section.upsert({
    where: { examId_code: { examId: exam.id, code: 'REASONING' } },
    update: { name: 'Reasoning Ability', order: 3 },
    create: {
      id: 'sec-sbi-p-reason',
      examId: exam.id,
      code: 'REASONING',
      name: 'Reasoning Ability',
      order: 3,
    },
  });
  console.log('Sections ensured: English, Quant, Reasoning');

  // 3. Ensure MockTest session exists
  const mockTest = await prisma.mockTest.upsert({
    where: { slug: 'sbi-clerk-prelims-2024-pyq' },
    update: {
      title: 'SBI Clerk Prelims 2024 - Previous Year Question Paper',
      description: 'Authentic 100-question actual exam paper from SBI Clerk Prelims 2024 (35 Reasoning, 35 Numerical Ability, 30 English). Dedicated paper with exact official questions, interlinked puzzles, and reading passages.',
      examId: exam.id,
      durationMinutes: 60,
      totalMarks: 100,
      totalQuestions: 100,
      cutoffMarks: 74.5,
      isFree: true,
      isPublished: true,
      isFixed: true,
      isPyq: true,
      year: 2024,
    },
    create: {
      id: 'mock-sbi-clerk-2024-pyq',
      slug: 'sbi-clerk-prelims-2024-pyq',
      title: 'SBI Clerk Prelims 2024 - Previous Year Question Paper',
      description: 'Authentic 100-question actual exam paper from SBI Clerk Prelims 2024 (35 Reasoning, 35 Numerical Ability, 30 English). Dedicated paper with exact official questions, interlinked puzzles, and reading passages.',
      examId: exam.id,
      durationMinutes: 60,
      totalMarks: 100,
      totalQuestions: 100,
      cutoffMarks: 74.5,
      isFree: true,
      isPublished: true,
      isFixed: true,
      isPyq: true,
      year: 2024,
    },
  });
  console.log('MockTest ensured:', mockTest.id);

  // Helper to map topic
  const topicCache = new Map<string, string>();
  async function getOrCreateTopic(name: string, sectionId: string): Promise<string> {
    const key = `${sectionId}_${name.toLowerCase()}`;
    if (topicCache.has(key)) return topicCache.get(key)!;

    let topic = await prisma.topic.findFirst({
      where: { sectionId, name: { equals: name, mode: 'insensitive' } },
    });

    if (!topic) {
      topic = await prisma.topic.create({
        data: {
          name,
          sectionId,
        },
      });
    }

    topicCache.set(key, topic.id);
    return topic.id;
  }

  // 4. Ingest each question
  let qOrder = 1;
  for (const raw of pyqQuestions) {
    let sec = engSection;
    if (raw.section.toLowerCase().includes('quant') || raw.section.toLowerCase().includes('numer') || raw.section.toLowerCase().includes('math')) {
      sec = quantSection;
    } else if (raw.section.toLowerCase().includes('reason')) {
      sec = reasonSection;
    }

    const topicId = await getOrCreateTopic(raw.topic || 'General', sec.id);

    // Delete existing options if updating
    await prisma.option.deleteMany({
      where: { questionId: raw.id },
    });

    const question = await prisma.question.upsert({
      where: { id: raw.id },
      update: {
        text: raw.question,
        passage: raw.passage || null,
        passageImageUrl: raw.passageImageUrl || null,
        imageUrl: raw.imageUrl || null,
        groupId: raw.groupId || null,
        isPyq: true,
        pyqYear: 2024,
        pyqExam: 'SBI Clerk Prelims 2024',
        difficulty: 'MEDIUM',
        explanation: raw.explanation || '',
        marks: 1.0,
        negativeMarks: 0.25,
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
        pyqYear: 2024,
        pyqExam: 'SBI Clerk Prelims 2024',
        difficulty: 'MEDIUM',
        explanation: raw.explanation || '',
        marks: 1.0,
        negativeMarks: 0.25,
        examId: exam.id,
        sectionId: sec.id,
        topicId: topicId,
      },
    });

    // Create Options
    const optKeys = Object.keys(raw.options || {}).sort();
    let optOrder = 1;
    for (const key of optKeys) {
      const optVal = raw.options[key];
      const optText = typeof optVal === 'string' ? optVal : (optVal?.text || '');
      const optImg = typeof optVal === 'object' ? optVal?.imageUrl : null;
      const isCorrect = key.trim().toUpperCase() === (raw.answer || '').trim().toUpperCase();

      await prisma.option.create({
        data: {
          id: `opt-${raw.id}-${key.toLowerCase()}`,
          questionId: question.id,
          text: optText,
          imageUrl: optImg,
          isCorrect,
          order: optOrder++,
        },
      });
    }

    // Link Question to MockTest in MockTestQuestion
    await prisma.mockTestQuestion.upsert({
      where: {
        mockTestId_questionId: {
          mockTestId: mockTest.id,
          questionId: question.id,
        },
      },
      update: {
        order: qOrder,
        sectionId: sec.id,
      },
      create: {
        mockTestId: mockTest.id,
        questionId: question.id,
        sectionId: sec.id,
        order: qOrder,
      },
    });

    qOrder++;
  }

  console.log(`Successfully ingested and linked all ${pyqQuestions.length} questions to ${mockTest.title}!`);

  const totalQuestions = await prisma.question.count();
  const totalPyq = await prisma.question.count({ where: { isPyq: true } });
  const totalOptions = await prisma.option.count();
  const testQCount = await prisma.mockTestQuestion.count({ where: { mockTestId: mockTest.id } });

  console.log({
    totalQuestionsInDb: totalQuestions,
    totalPyqQuestionsInDb: totalPyq,
    totalOptionsInDb: totalOptions,
    questionsLinkedTo2024PYQTest: testQCount,
  });

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
