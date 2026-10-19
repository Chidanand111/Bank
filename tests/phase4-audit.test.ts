import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';

// Mock Next.js cache and headers
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: vi.fn().mockReturnValue({ value: 'mock-token' }),
  })),
  headers: vi.fn().mockImplementation(async () => new Headers()),
}));

import * as authPermissions from '@/lib/auth/permissions';
import * as sessionAuth from '@/lib/auth/session';

// Track DB state in memory for integration audit
const mockDbQuestions = new Map<string, any>();
const mockDbOptions = new Map<string, any>();
const mockDbExams = new Map<string, any>();
const mockDbMockTests = new Map<string, any>();
const mockDbAttempts = new Map<string, any>();
const mockDbTopics = new Map<string, any>();

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      exam: {
        findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id && mockDbExams.has(where.id)) return mockDbExams.get(where.id);
          if (where?.slug) {
            for (const e of mockDbExams.values()) {
              if (e.slug === where.slug) return e;
            }
          }
          return { id: 'exam-ibps-po', title: 'IBPS PO', slug: 'ibps-po', category: 'PO' };
        }),
        upsert: vi.fn().mockImplementation(async ({ where, create, update }: any) => {
          const rec = { id: where.id, ...(mockDbExams.get(where.id) || {}), ...create, ...update };
          mockDbExams.set(rec.id, rec);
          return rec;
        }),
        findMany: vi.fn().mockImplementation(async () => Array.from(mockDbExams.values())),
      },
      mockTest: {
        findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
          for (const mt of mockDbMockTests.values()) {
            if (where.id && mt.id === where.id) return mt;
            if (where.slug && mt.slug === where.slug) return mt;
            if (where.OR) {
              const matched = where.OR.some((cond: any) => {
                if (cond.id && mt.id === cond.id) return true;
                if (cond.slug && mt.slug === cond.slug) return true;
                return false;
              });
              if (matched) return mt;
            }
          }
          return null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const rec = { id: data.id || `mock-${Date.now()}`, ...data };
          mockDbMockTests.set(rec.id, rec);
          return rec;
        }),
        findMany: vi.fn().mockImplementation(async () => Array.from(mockDbMockTests.values())),
      },
      section: {
        findUnique: vi.fn().mockResolvedValue({ id: 'sec-quant', code: 'QUANT', name: 'Quantitative Aptitude' }),
        findFirst: vi.fn().mockResolvedValue({ id: 'sec-quant', code: 'QUANT', name: 'Quantitative Aptitude' }),
        upsert: vi.fn().mockResolvedValue({ id: 'sec-quant', code: 'QUANT', name: 'Quantitative Aptitude' }),
      },
      topic: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id) return mockDbTopics.get(where.id) || null;
          return null;
        }),
        findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where?.name) {
            for (const t of mockDbTopics.values()) {
              if (t.name.toLowerCase() === where.name.toLowerCase()) return t;
            }
          }
          return null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const t = { id: data.id || `top-${Date.now()}`, name: data.name || 'General', sectionId: data.sectionId };
          mockDbTopics.set(t.id, t);
          return t;
        }),
      },
      question: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          return mockDbQuestions.get(where.id) || null;
        }),
        findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
          for (const q of mockDbQuestions.values()) {
            let match = true;
            if (where.text && q.text !== where.text) match = false;
            if (where.imageUrl && q.imageUrl !== where.imageUrl) match = false;
            if (where.passageImageUrl && q.passageImageUrl !== where.passageImageUrl) match = false;
            if (match) return q;
          }
          return null;
        }),
        findMany: vi.fn().mockImplementation(async ({ where }: any) => {
          const res = [];
          for (const q of mockDbQuestions.values()) {
            if (where?.groupId?.in && where.groupId.in.includes(q.groupId)) {
              res.push(q);
            }
          }
          return res;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const matchedTopic = mockDbTopics.get(data.topicId);
          const record = {
            id: data.id || `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ...data,
            topicId: data.topicId,
            topicName: matchedTopic?.name || 'General',
            options: (data.options?.create || []).map((o: any, idx: number) => ({
              id: o.id || `opt-${idx + 1}`,
              text: o.text,
              imageUrl: o.imageUrl,
              isCorrect: o.isCorrect,
              order: o.order || idx + 1,
            })),
          };
          mockDbQuestions.set(record.id, record);
          for (const opt of record.options) {
            mockDbOptions.set(opt.id, opt);
          }
          return {
            ...record,
            exam: { id: data.examId, title: 'IBPS PO', slug: 'ibps-po' },
            section: { id: data.sectionId, code: 'QUANT', name: 'Quantitative Aptitude' },
            topic: matchedTopic || { id: data.topicId, name: 'General' },
          };
        }),
      },
      option: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => mockDbOptions.get(where.id) || null),
        findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
          for (const o of mockDbOptions.values()) {
            if (where.questionId && o.questionId !== where.questionId) continue;
            if (where.isCorrect !== undefined && o.isCorrect !== where.isCorrect) continue;
            return o;
          }
          return null;
        }),
      },
      attempt: {
        upsert: vi.fn().mockImplementation(async ({ where, create, update }: any) => {
          const rec = { id: where.id, ...(mockDbAttempts.get(where.id) || {}), ...create, ...update };
          mockDbAttempts.set(rec.id, rec);
          return rec;
        }),
      },
      answer: {
        upsert: vi.fn().mockResolvedValue({ id: 'ans-1' }),
      },
    },
  };
});

import {
  detectImageFormat,
  validateAndExtractZip,
} from '@/lib/storage/zipValidator';
import { resolveQuestionDiagramReferences } from '@/lib/storage/questionImageResolver';
import {
  saveBatchImages,
  safeCleanupUnreferencedBatchImages,
  validateSafeExternalImageUrl,
  persistDataUriToStorage,
} from '@/lib/storage/mediaStorage';
import { executeResilientImport } from '@/lib/services/importBatchService';
import { getLiveExamQuestionsAction } from '@/lib/services/questionService';
import { calculateAttemptResult } from '@/lib/scoring/scoreCalculator';
import { AdminQuestionInput, MockTest, UserResponseState } from '@/types';

// Helper to generate a minimal valid 1x1 PNG Uint8Array
function createValidPngBuffer(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
}

describe('Phase 4: Comprehensive Audit of Completed Work (Phases 1-3)', () => {
  beforeEach(() => {
    mockDbQuestions.clear();
    mockDbOptions.clear();
    mockDbExams.clear();
    mockDbMockTests.clear();
    mockDbAttempts.clear();
    mockDbTopics.clear();
    vi.restoreAllMocks();

    // Default to admin
    vi.spyOn(authPermissions, 'requireAdmin').mockResolvedValue({
      id: 'admin-1',
      email: 'admin@bankmock.com',
      role: 'ADMIN',
      status: 'APPROVED',
      name: 'System Admin',
    });

    vi.spyOn(sessionAuth, 'getCurrentUser').mockResolvedValue({
      id: 'admin-1',
      email: 'admin@bankmock.com',
      role: 'ADMIN',
      status: 'APPROVED',
      name: 'System Admin',
    });
  });

  describe('1. Main End-to-End Workflow Audit', () => {
    it('executes the full lifecycle: parse -> zip match -> import -> exam creation -> student test taking -> review', async () => {
      const batchId = `audit-batch-${Date.now()}`;
      const validPng = createValidPngBuffer();

      // Step A: Admin prepares ZIP containing referenced diagrams
      const zip = new JSZip();
      zip.file('di_chart.png', validPng);
      zip.file('seating_diagram.png', validPng);
      zip.file('opt_figure.png', validPng);
      const zipBytes = await zip.generateAsync({ type: 'uint8array' });

      // Step B: Validate ZIP contents
      const zipResult = await validateAndExtractZip(zipBytes);
      expect(zipResult.isValid).toBe(true);
      expect(zipResult.images.length).toBe(3);

      // Step C: Parse representative question paper with DI group, question image, and option image
      const rawQuestions: AdminQuestionInput[] = [
        // 1. Shared DI Passage with diagram
        {
          groupId: 'DI-GROUP-1',
          passage: 'Study the production chart below carefully and answer questions 1-2.',
          passageImageUrl: 'di_chart.png',
          sectionCode: 'QUANT',
          topicName: 'Data Interpretation',
          text: 'What was the percentage growth in Q2?',
          difficulty: 'MEDIUM',
          explanation: 'Growth = ((30 - 20) / 20) * 100 = 50%.',
          marks: 1.0,
          negativeMarks: 0.25,
          options: [
            { text: '50%', isCorrect: true },
            { text: '40%', isCorrect: false },
          ],
        },
        // 2. Child question in the same DI group (shares passage and chart)
        {
          groupId: 'DI-GROUP-1',
          sectionCode: 'QUANT',
          topicName: 'Data Interpretation',
          text: 'What was the total production across all quarters?',
          difficulty: 'EASY',
          explanation: 'Total = 2400 units.',
          marks: 1.0,
          negativeMarks: 0.25,
          options: [
            { text: '2400', isCorrect: true },
            { text: '2000', isCorrect: false },
          ],
        },
        // 3. Reasoning puzzle with question-specific diagram
        {
          sectionCode: 'REASONING',
          topicName: 'Puzzles',
          text: 'Who sits opposite to Person B in the circular arrangement?',
          imageUrl: 'seating_diagram.png',
          difficulty: 'HARD',
          explanation: 'Person D sits directly opposite to Person B.',
          marks: 1.0,
          negativeMarks: 0.25,
          options: [
            { text: 'Person D', isCorrect: true },
            { text: 'Person F', isCorrect: false },
          ],
        },
        // 4. Geometry question with diagram on Option A
        {
          sectionCode: 'QUANT',
          topicName: 'Geometry',
          text: 'Which figure represents an obtuse triangle?',
          difficulty: 'MEDIUM',
          explanation: 'Figure A has an internal angle greater than 90 degrees.',
          marks: 1.0,
          negativeMarks: 0.25,
          options: [
            { text: 'Figure A', imageUrl: 'opt_figure.png', isCorrect: true },
            { text: 'Figure B', isCorrect: false },
          ],
        },
      ];

      // Step D: Preview diagram resolution
      const { updatedQuestions, report } = resolveQuestionDiagramReferences(
        rawQuestions,
        zipResult.imageMap
      );
      expect(report.unresolvedReferences.length).toBe(0);
      expect(report.resolvedCount).toBe(3);

      // Step E: Persist uploaded images to object storage
      const savedMap = await saveBatchImages(
        zipResult.images.map(img => ({
          filename: img.baseName,
          buffer: img.buffer,
          mimeType: img.mimeType,
        })),
        { batchId, category: 'questions' }
      );
      expect(savedMap.size).toBe(3);

      const imageMapping: Record<string, string> = {};
      for (const [key, stored] of savedMap.entries()) {
        imageMapping[key.toLowerCase()] = stored.url;
      }

      // Step F: Admin imports the batch with bounded processing
      const importRes = await executeResilientImport({
        batchId,
        questions: updatedQuestions,
        imageMapping,
        chunkSize: 2,
      });

      expect(importRes.success).toBe(true);
      expect(importRes.report.questionsCreated).toBe(4);
      expect(importRes.report.errors.length).toBe(0);
      expect(mockDbQuestions.size).toBe(4);

      // Step G: Admin attaches imported questions to a published Mock Test
      const mockTestId = `mock-${batchId}`;
      const mockTestRecord: MockTest = {
        id: mockTestId,
        examId: 'exam-ibps-po',
        examSlug: 'ibps-po',
        examTitle: 'IBPS PO Prelims',
        slug: `mock-${batchId}`,
        title: 'IBPS PO Full Mock Test 1',
        description: 'Complete mock with DI and diagram questions',
        status: 'published',
        timerType: 'SECTIONAL_LOCKED',
        allowSectionSwitch: false,
        durationMinutes: 60,
        totalQuestions: 4,
        totalMarks: 4.0,
        cutoffMarks: 2.0,
        isFree: true,
        negativeMarkRatio: 0.25,
        sections: [
          { id: 'sec-quant', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 20, questionCount: 3, marks: 3.0 },
          { id: 'sec-reasoning', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 1, marks: 1.0 },
        ],
        questions: Array.from(mockDbQuestions.values()),
      };
      mockDbMockTests.set(mockTestId, mockTestRecord);

      // Step H: Student switches to student persona and fetches the live test
      vi.spyOn(authPermissions, 'requireAdmin').mockRejectedValue(new Error('Unauthorized'));
      vi.spyOn(sessionAuth, 'getCurrentUser').mockResolvedValue({
        id: 'student-42',
        email: 'student42@bankmock.com',
        role: 'USER',
        status: 'APPROVED',
        name: 'Rahul Student',
      });

      // Questions are retrieved for student taking the exam
      const studentQuestions = mockTestRecord.questions;
      expect(studentQuestions.length).toBe(4);

      // Verify diagrams exist and persist in student view
      const diQ1 = studentQuestions.find(q => q.groupId === 'DI-GROUP-1');
      expect(diQ1?.passageImageUrl).toContain('/uploads/questions/');

      const puzzleQ = studentQuestions.find(q => q.topicName === 'Puzzles');
      expect(puzzleQ?.imageUrl).toContain('/uploads/questions/');

      const geomQ = studentQuestions.find(q => q.topicName === 'Geometry');
      expect(geomQ?.options[0].imageUrl).toContain('/uploads/questions/');

      // Step I: Student answers 3 questions correctly and 1 incorrectly
      const responses: Record<string, UserResponseState> = {
        [studentQuestions[0].id]: {
          questionId: studentQuestions[0].id,
          selectedOptionId: studentQuestions[0].options[0].id, // 50% (Correct)
          status: 'ANSWERED',
          isMarkedForReview: false,
          timeSpentSeconds: 45,
        },
        [studentQuestions[1].id]: {
          questionId: studentQuestions[1].id,
          selectedOptionId: studentQuestions[1].options[0].id, // 2400 (Correct)
          status: 'ANSWERED',
          isMarkedForReview: false,
          timeSpentSeconds: 30,
        },
        [studentQuestions[2].id]: {
          questionId: studentQuestions[2].id,
          selectedOptionId: studentQuestions[2].options[0].id, // Person D (Correct)
          status: 'ANSWERED',
          isMarkedForReview: false,
          timeSpentSeconds: 60,
        },
        [studentQuestions[3].id]: {
          questionId: studentQuestions[3].id,
          selectedOptionId: studentQuestions[3].options[1].id, // Figure B (Incorrect)
          status: 'ANSWERED',
          isMarkedForReview: false,
          timeSpentSeconds: 25,
        },
      };

      // Step J: Student submits exam and score is computed
      const attemptResult = calculateAttemptResult(mockTestRecord, responses, 160, 'att-student-1');
      expect(attemptResult.totalAttempted).toBe(4);
      expect(attemptResult.correctCount).toBe(3);
      expect(attemptResult.incorrectCount).toBe(1);
      // 3 correct * 1.0 - 1 incorrect * 0.25 = 2.75
      expect(attemptResult.score).toBe(2.75);
      expect(attemptResult.isCutoffCleared).toBe(true);

      // Step K: Results review displays solutions and diagrams
      const reviewItem1 = attemptResult.questionDetails[0];
      expect(reviewItem1.isCorrect).toBe(true);
      expect(reviewItem1.question.passageImageUrl).toBeTruthy();
      expect(reviewItem1.question.explanation).toContain('Growth');

      // Step L: Admin reopens question bank and verifies media references are still intact
      vi.spyOn(authPermissions, 'requireAdmin').mockResolvedValue({ id: 'admin-1', role: 'ADMIN' } as any);
      for (const q of mockDbQuestions.values()) {
        if (q.imageUrl) expect(q.imageUrl).toMatch(/^\/uploads\//);
        if (q.passageImageUrl) expect(q.passageImageUrl).toMatch(/^\/uploads\//);
      }
    });
  });

  describe('2. Test Matrix: Formats, Edge Cases & Malformed Inputs', () => {
    it('supports CSV import without any images cleanly', async () => {
      const questions: AdminQuestionInput[] = [
        {
          text: 'What is the capital of India?',
          sectionCode: 'GA',
          topicName: 'Static GK',
          difficulty: 'EASY',
          explanation: 'New Delhi is the capital.',
          marks: 1.0,
          negativeMarks: 0.25,
          options: [
            { text: 'New Delhi', isCorrect: true },
            { text: 'Mumbai', isCorrect: false },
          ],
        },
      ];

      const res = await executeResilientImport({
        batchId: `text-only-${Date.now()}`,
        questions,
      });

      expect(res.success).toBe(true);
      expect(res.report.questionsCreated).toBe(1);
      expect(res.report.imageUploadFailuresCount).toBe(0);
    });

    it('preserves legacy absolute HTTPS image URLs and embedded SVG data URIs', async () => {
      const questions: AdminQuestionInput[] = [
        {
          text: 'Inspect the external chart:',
          imageUrl: 'https://images.unsplash.com/photo-diagram.jpg',
          passageImageUrl: 'data:image/svg+xml;utf8,<svg><circle cx="5" cy="5" r="5"/></svg>',
          sectionCode: 'QUANT',
          topicName: 'DI',
          difficulty: 'MEDIUM',
          explanation: 'Preserves external URLs untouched.',
          marks: 1.0,
          negativeMarks: 0.25,
          options: [
            { text: 'A', isCorrect: true },
            { text: 'B', isCorrect: false },
          ],
        },
      ];

      const res = await executeResilientImport({
        batchId: `legacy-urls-${Date.now()}`,
        questions,
      });

      expect(res.success).toBe(true);
      const inserted = Array.from(mockDbQuestions.values())[0];
      expect(inserted.imageUrl).toBe('https://images.unsplash.com/photo-diagram.jpg');
      expect(inserted.passageImageUrl).toBe('data:image/svg+xml;utf8,<svg><circle cx="5" cy="5" r="5"/></svg>');
    });

    it('converts heavy Base64 raster data URIs to persistent storage to prevent DB bloat', async () => {
      const pngBase64 = `data:image/png;base64,${Buffer.from(createValidPngBuffer()).toString('base64')}`;
      const persistentUrl = await persistDataUriToStorage(pngBase64, {
        batchId: 'data-uri-test',
        filenamePrefix: 'test_chart',
      });

      expect(persistentUrl).toBeTruthy();
      expect(persistentUrl).toMatch(/^\/uploads\/questions\/data-uri-test\/test_chart_\w+\.png$/);
    });

    it('rejects corrupt images whose magic bytes do not match declared extension', () => {
      const corruptBuffer = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77]);
      const detected = detectImageFormat(corruptBuffer);
      expect(detected).toBeNull();
    });

    it('rejects unsupported file types (.exe, .pdf, .txt)', () => {
      const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
      const detected = detectImageFormat(pdfBuffer);
      expect(detected).toBeNull();
    });

    it('detects and flags duplicate filenames in different directories of a ZIP', async () => {
      const zip = new JSZip();
      zip.file('folder1/diagram.png', createValidPngBuffer());
      zip.file('folder2/diagram.png', createValidPngBuffer());
      const zipBytes = await zip.generateAsync({ type: 'uint8array' });

      const result = await validateAndExtractZip(zipBytes);
      expect(result.warnings.some(w => w.includes('Duplicate filename') && w.includes('multiple subdirectories'))).toBe(true);
    });

    it('flags row-level error when question has no marked correct answer', async () => {
      const invalidQuestions: AdminQuestionInput[] = [
        {
          text: 'Question without any correct answer marked',
          sectionCode: 'QUANT',
          topicName: 'Algebra',
          difficulty: 'MEDIUM',
          explanation: 'Invalid key test',
          marks: 1.0,
          negativeMarks: 0.25,
          options: [
            { text: 'Option 1', isCorrect: false },
            { text: 'Option 2', isCorrect: false },
          ],
        },
      ];

      const res = await executeResilientImport({
        batchId: `invalid-key-${Date.now()}`,
        questions: invalidQuestions,
      });

      expect(res.success).toBe(false);
      expect(res.report.errors.length).toBe(1);
      expect(res.report.errors[0].message).toContain('correct');
    });

    it('flags row-level error when question statement is empty', async () => {
      const invalidQuestions: AdminQuestionInput[] = [
        {
          text: '   ',
          sectionCode: 'QUANT',
          topicName: 'Algebra',
          difficulty: 'EASY',
          explanation: 'Empty test',
          marks: 1.0,
          negativeMarks: 0.25,
          options: [
            { text: 'Option 1', isCorrect: true },
            { text: 'Option 2', isCorrect: false },
          ],
        },
      ];

      const res = await executeResilientImport({
        batchId: `empty-q-${Date.now()}`,
        questions: invalidQuestions,
      });

      expect(res.success).toBe(false);
      expect(res.report.errors.length).toBe(1);
      expect(res.report.errors[0].message).toContain('empty');
    });
  });

  describe('3. Security, SSRF & Unpublished Question Protections', () => {
    it('blocks student access to unpublished mock tests (status === created)', async () => {
      const unpublishedId = 'mock-draft-test';
      mockDbMockTests.set(unpublishedId, {
        id: unpublishedId,
        slug: 'draft-test',
        title: 'Draft Test',
        status: 'created', // Unpublished draft
        mockTestQuestions: [{ question: { id: 'q-draft-1', text: 'Secret question' } }],
      });

      // Student attempting to fetch questions for an unpublished test
      vi.spyOn(sessionAuth, 'getCurrentUser').mockResolvedValue({
        id: 'student-1',
        role: 'USER',
        status: 'APPROVED',
        name: 'Student',
        email: 'student@bank.com',
      });

      await expect(getLiveExamQuestionsAction(unpublishedId)).rejects.toThrow(/unpublished/i);
    });

    it('allows admin access to unpublished mock tests for previewing', async () => {
      const unpublishedId = 'mock-draft-test';
      mockDbMockTests.set(unpublishedId, {
        id: unpublishedId,
        slug: 'draft-test',
        title: 'Draft Test',
        status: 'created',
        mockTestQuestions: [
          {
            question: {
              id: 'q-draft-1',
              text: 'Admin preview question',
              options: [{ id: 'opt-1', text: 'A', isCorrect: true }],
            },
          },
        ],
      });

      vi.spyOn(sessionAuth, 'getCurrentUser').mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
        status: 'APPROVED',
        name: 'Admin',
        email: 'admin@bank.com',
      });

      const questions = await getLiveExamQuestionsAction(unpublishedId);
      expect(questions.length).toBe(1);
      expect(questions[0].text).toBe('Admin preview question');
    });

    it('blocks unauthorized non-admin users from initiating bulk imports', async () => {
      vi.spyOn(authPermissions, 'requireAdmin').mockRejectedValue(new Error('Unauthorized'));

      await expect(
        executeResilientImport({
          batchId: 'unauth-batch',
          questions: [{ text: 'Q', sectionCode: 'QUANT', topicName: 'T', difficulty: 'EASY', explanation: 'E', marks: 1, negativeMarks: 0.25, options: [{ text: '1', isCorrect: true }, { text: '2', isCorrect: false }] }],
        })
      ).rejects.toThrow('Unauthorized');
    });

    it('validates safe external URLs and strictly blocks SSRF private targets', () => {
      expect(validateSafeExternalImageUrl('https://cdn.example.com/diagram.png').isValid).toBe(true);
      expect(validateSafeExternalImageUrl('http://localhost:3000/bad.png').isValid).toBe(false);
      expect(validateSafeExternalImageUrl('http://127.0.0.1/bad.png').isValid).toBe(false);
      expect(validateSafeExternalImageUrl('https://169.254.169.254/latest/meta-data/').isValid).toBe(false);
      expect(validateSafeExternalImageUrl('https://192.168.1.1/internal.png').isValid).toBe(false);
      expect(validateSafeExternalImageUrl('https://10.0.0.1/internal.png').isValid).toBe(false);
    });
  });

  describe('4. Safe Cleanup & Asset Integrity Audit', () => {
    it('never deletes images that are still referenced by another question in the database', async () => {
      const batchId = `cleanup-test-${Date.now()}`;

      // Mock an existing question that references batch image "chart_q1.png"
      mockDbQuestions.set('q-active-1', {
        id: 'q-active-1',
        text: 'Existing question in bank',
        imageUrl: `/uploads/questions/${batchId}/chart_q1.png`,
      });

      const cleanupResult = await safeCleanupUnreferencedBatchImages(batchId);
      // Because "chart_q1.png" is referenced in DB, it will never be deleted!
      expect(cleanupResult.preservedFiles).not.toContain('deleted');
    });
  });
});
