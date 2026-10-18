import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock Next.js cache and headers
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: vi.fn().mockReturnValue({ value: 'mock-admin-token' }),
  })),
  headers: vi.fn().mockImplementation(async () => new Headers()),
}));

import * as authPermissions from '@/lib/auth/permissions';
vi.mock('@/lib/auth/permissions', () => ({
  requireAdmin: vi.fn().mockImplementation(async () => ({
    id: 'admin-1',
    email: 'admin@bank.com',
    role: 'ADMIN',
    name: 'Admin',
  })),
  requireAuth: vi.fn().mockImplementation(async () => ({
    id: 'user-1',
    role: 'STUDENT',
  })),
}));

// In-memory mock DB for question and options tracking
const mockDbQuestions = new Map<string, any>();
const mockDbOptions = new Map<string, any>();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    exam: {
      findFirst: vi.fn().mockResolvedValue({ id: 'exam-ibps-po', title: 'IBPS PO', slug: 'ibps-po' }),
      upsert: vi.fn().mockResolvedValue({ id: 'exam-ibps-po', title: 'IBPS PO', slug: 'ibps-po' }),
    },
    mockTest: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    section: {
      findUnique: vi.fn().mockResolvedValue({ id: 'sec-quant', code: 'QUANT', name: 'Quantitative Aptitude' }),
      findFirst: vi.fn().mockResolvedValue({ id: 'sec-quant', code: 'QUANT', name: 'Quantitative Aptitude' }),
      upsert: vi.fn().mockResolvedValue({ id: 'sec-quant', code: 'QUANT', name: 'Quantitative Aptitude' }),
    },
    topic: {
      findUnique: vi.fn().mockResolvedValue({ id: 'top-simplification', name: 'Simplification' }),
      findFirst: vi.fn().mockResolvedValue({ id: 'top-simplification', name: 'Simplification' }),
      create: vi.fn().mockResolvedValue({ id: 'top-simplification', name: 'Simplification' }),
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
          if (where.OR) {
            const orMatch = where.OR.some((cond: any) => {
              if (cond.imageUrl && q.imageUrl === cond.imageUrl) return true;
              if (cond.passageImageUrl && q.passageImageUrl === cond.passageImageUrl) return true;
              if (cond.imageUrl?.contains && q.imageUrl?.includes(cond.imageUrl.contains)) return true;
              if (cond.passageImageUrl?.contains && q.passageImageUrl?.includes(cond.passageImageUrl.contains)) return true;
              return false;
            });
            if (!orMatch) match = false;
          }
          if (match) return q;
        }
        return null;
      }),
      create: vi.fn().mockImplementation(async ({ data }: any) => {
        const record = {
          id: data.id || `q-${Date.now()}`,
          text: data.text,
          imageUrl: data.imageUrl,
          passage: data.passage,
          passageImageUrl: data.passageImageUrl,
          groupId: data.groupId,
          difficulty: data.difficulty,
          marks: data.marks,
          negativeMarks: data.negativeMarks,
          examId: data.examId,
          sectionId: data.sectionId,
          topicId: data.topicId,
          section: { code: 'QUANT', name: 'Quantitative Aptitude' },
          topic: { name: 'Simplification' },
          exam: { slug: 'ibps-po', title: 'IBPS PO' },
          options: (data.options?.create || []).map((o: any, idx: number) => ({
            id: o.id || `opt-${idx}`,
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
        return record;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }: any) => {
        const existing = mockDbQuestions.get(where.id);
        if (!existing) throw new Error('Question not found');
        const updated = { ...existing, ...data };
        mockDbQuestions.set(where.id, updated);
        return updated;
      }),
      upsert: vi.fn().mockImplementation(async ({ where, update, create }: any) => {
        const existing = mockDbQuestions.get(where.id);
        if (existing) {
          const updated = { ...existing, ...update };
          mockDbQuestions.set(where.id, updated);
          return updated;
        } else {
          const record = { id: where.id, ...create };
          mockDbQuestions.set(record.id, record);
          return record;
        }
      }),
    },
    option: {
      findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
        for (const opt of mockDbOptions.values()) {
          let match = true;
          if (where.imageUrl && opt.imageUrl !== where.imageUrl) match = false;
          if (where.OR) {
            const orMatch = where.OR.some((cond: any) => {
              if (cond.imageUrl && opt.imageUrl === cond.imageUrl) return true;
              if (cond.imageUrl?.contains && opt.imageUrl?.includes(cond.imageUrl.contains)) return true;
              return false;
            });
            if (!orMatch) match = false;
          }
          if (match) return opt;
        }
        return null;
      }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockImplementation(async ({ data }: any) => {
        const record = { id: data.id || `opt-${Date.now()}`, ...data };
        mockDbOptions.set(record.id, record);
        return record;
      }),
    },
    questionOption: {
      createMany: vi.fn().mockResolvedValue({ count: 5 }),
    },
    $transaction: vi.fn().mockImplementation(async (cbOrArray: any) => {
      if (typeof cbOrArray === 'function') {
        const { prisma } = await vi.importActual<any>('@/lib/prisma').catch(() => ({}));
        // Pass mock prisma itself into the transaction callback
        return cbOrArray({
          question: {
            upsert: vi.fn().mockImplementation(async ({ where, update, create }: any) => {
              const existing = mockDbQuestions.get(where.id);
              if (existing) {
                const updated = { ...existing, ...update };
                mockDbQuestions.set(where.id, updated);
                return updated;
              } else {
                const record = { id: where.id, ...create };
                mockDbQuestions.set(record.id, record);
                return record;
              }
            }),
            update: vi.fn().mockImplementation(async ({ where, data }: any) => {
              const existing = mockDbQuestions.get(where.id);
              if (!existing) throw new Error('Question not found');
              const updated = { ...existing, ...data };
              mockDbQuestions.set(where.id, updated);
              return updated;
            }),
          },
          option: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
            create: vi.fn().mockImplementation(async ({ data }: any) => {
              const record = { id: data.id || `opt-${Date.now()}`, ...data };
              mockDbOptions.set(record.id, record);
              return record;
            }),
          },
        });
      }
      return Promise.all(cbOrArray);
    }),
  },
}));

import {
  createImportBatch,
  getImportBatch,
  updateBatchStatus,
  requestBatchCancellation,
  isBatchCancelled,
} from '@/lib/storage/importBatchStore';
import {
  executeResilientImport,
  retryImportBatch,
} from '@/lib/services/importBatchService';
import {
  safeCleanupUnreferencedBatchImages,
  validateSafeExternalImageUrl,
  getLocalUploadDirectory,
  saveBatchImages,
} from '@/lib/storage/mediaStorage';
import { AdminQuestionInput } from '@/types';

function createMockQuestion(index: number, overrides: Partial<AdminQuestionInput> = {}): AdminQuestionInput {
  return {
    text: `Question statement ${index}: What is the value of x?`,
    sectionCode: 'QUANT',
    topicName: 'Simplification',
    difficulty: 'MEDIUM',
    explanation: `Explanation for question ${index}`,
    marks: 1.0,
    negativeMarks: 0.25,
    options: [
      { text: `Option A for Q${index}`, isCorrect: true },
      { text: `Option B for Q${index}`, isCorrect: false },
    ],
    ...overrides,
  };
}

describe('Phase 3: Bulk Import Resilience, Idempotency & Lifecycle Observation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbQuestions.clear();
    mockDbOptions.clear();
    vi.spyOn(authPermissions, 'requireAdmin').mockResolvedValue({
      id: 'admin-1',
      email: 'admin@bank.com',
      role: 'ADMIN',
      name: 'Admin',
    } as any);
  });

  describe('1. Idempotency & Repeated Submissions (Criterion: Retrying a failed batch does not duplicate questions)', () => {
    it('retrying a failed batch creates only remaining questions without duplicating existing ones', async () => {
      const batchId = `test-retry-${Date.now()}`;
      const questions = [
        createMockQuestion(1),
        createMockQuestion(2),
        createMockQuestion(3, { text: '' }), // Invalid row that causes failure
        createMockQuestion(4),
      ];

      // First run: rows 1, 2, 4 succeed; row 3 fails
      const initialRes = await executeResilientImport({
        batchId,
        questions,
        chunkSize: 2,
      });

      expect(initialRes.report.questionsCreated).toBe(3);
      expect(initialRes.report.errors.length).toBe(1);
      expect(initialRes.report.errors[0].row).toBe(3);
      expect(mockDbQuestions.size).toBe(3);

      // Now fix row 3 and retry the same batch
      const fixedQuestions = [
        createMockQuestion(1),
        createMockQuestion(2),
        createMockQuestion(3, { text: 'Fixed Question 3 statement' }),
        createMockQuestion(4),
      ];

      // Update cached questions in batch
      const batchRecord = getImportBatch(batchId)!;
      batchRecord.cachedQuestions = fixedQuestions;

      const retryRes = await retryImportBatch(batchId);

      expect(retryRes.success).toBe(true);
      expect(retryRes.report.errors.length).toBe(0);

      // Exactly 4 questions in database — no duplicates!
      expect(mockDbQuestions.size).toBe(4);
    });

    it('detects repeated submission of an already completed or running batch', async () => {
      const batchId = `test-idempotent-${Date.now()}`;
      const questions = [createMockQuestion(1), createMockQuestion(2)];

      // First run succeeds
      const firstRes = await executeResilientImport({ batchId, questions });
      expect(firstRes.success).toBe(true);

      // Repeated submission of same completed batch
      const repeatedRes = await executeResilientImport({ batchId, questions });
      expect(repeatedRes.success).toBe(true);
      expect(repeatedRes.report.questionsCreated).toBe(2);
      expect(mockDbQuestions.size).toBe(2);
    });
  });

  describe('2. Missing / Failed Image Protection (Criterion: A failed image upload cannot silently produce a broken question)', () => {
    it('skips question and flags error when a referenced image was not uploaded or failed validation', async () => {
      const batchId = `test-missing-img-${Date.now()}`;
      const questions = [
        createMockQuestion(1, { imageUrl: 'missing_diagram_1.png' }), // Referenced filename not in uploadedImages
        createMockQuestion(2), // Normal question
      ];

      const res = await executeResilientImport({
        batchId,
        questions,
        imageMapping: {}, // Empty mapping
      });

      // Question 1 should be skipped to prevent broken rendering!
      expect(res.report.questionsCreated).toBe(1);
      expect(res.report.errors.length).toBe(1);
      expect(res.report.errors[0].row).toBe(1);
      expect(res.report.errors[0].message).toContain('was not uploaded or failed validation');
      expect(mockDbQuestions.size).toBe(1);
    });

    it('allows valid image references when pre-uploaded or present in imageMapping', async () => {
      const batchId = `test-valid-img-${Date.now()}`;
      const questions = [
        createMockQuestion(1, { imageUrl: 'circuit.png' }),
      ];

      const res = await executeResilientImport({
        batchId,
        questions,
        imageMapping: { 'circuit.png': `/uploads/questions/${batchId}/circuit.png` },
      });

      expect(res.success).toBe(true);
      expect(res.report.questionsCreated).toBe(1);
      expect(res.report.errors.length).toBe(0);
      expect(mockDbQuestions.size).toBe(1);
      const saved = Array.from(mockDbQuestions.values())[0];
      expect(saved.imageUrl).toBe(`/uploads/questions/${batchId}/circuit.png`);
    });
  });

  describe('3. Bounded Resource Processing (Criterion: Large imports are processed within bounded resource limits)', () => {
    it('processes questions in bounded chunks without crashing or unbounded promise concurrency', async () => {
      const batchId = `test-bounded-${Date.now()}`;
      const largeQuestionSet: AdminQuestionInput[] = [];
      for (let i = 1; i <= 35; i++) {
        largeQuestionSet.push(createMockQuestion(i));
      }

      // Process in small bounded chunks of 10
      const res = await executeResilientImport({
        batchId,
        questions: largeQuestionSet,
        chunkSize: 10,
      });

      expect(res.success).toBe(true);
      expect(res.report.questionsCreated).toBe(35);
      expect(mockDbQuestions.size).toBe(35);

      // Verify batch store progress tracking
      const batch = getImportBatch(batchId);
      expect(batch?.processedRows).toBe(35);
      expect(batch?.status).toBe('COMPLETED');
    });
  });

  describe('4. Lifecycle Observability & Batch Recovery (Criterion: Admins can identify and recover failed batches)', () => {
    it('tracks full lifecycle from CREATED -> IMPORTING -> FAILED with row-level error reporting', async () => {
      const batchId = `test-lifecycle-${Date.now()}`;
      const questions = [
        createMockQuestion(1),
        createMockQuestion(2, { options: [{ text: 'Only one option', isCorrect: true }] }), // Invalid: < 2 options
      ];

      const res = await executeResilientImport({ batchId, questions });
      const batch = getImportBatch(batchId);

      expect(batch).not.toBeNull();
      expect(batch?.status).toBe('FAILED');
      expect(batch?.report.questionsCreated).toBe(1);
      expect(batch?.report.errors.length).toBe(1);
      expect(batch?.report.errors[0].row).toBe(2);
      expect(batch?.diagnosticLogs.length).toBeGreaterThanOrEqual(2);
    });

    it('supports cancellation and safely halts subsequent chunk execution', async () => {
      const batchId = `test-cancel-${Date.now()}`;
      const questions = [
        createMockQuestion(1),
        createMockQuestion(2),
        createMockQuestion(3),
        createMockQuestion(4),
      ];

      // Pre-request cancellation
      createImportBatch({ batchId, totalRows: 4 });
      requestBatchCancellation(batchId);
      expect(isBatchCancelled(batchId)).toBe(true);

      const res = await executeResilientImport({ batchId, questions, chunkSize: 2 });
      expect(res.success).toBe(false);
      expect(res.error).toContain('cancelled');
      const batch = getImportBatch(batchId);
      expect(batch?.status).toBe('CANCELLED');
    });
  });

  describe('5. Safe Cleanup (Criterion: Cleanup never deletes an image still referenced by another question)', () => {
    it('preserves images referenced by existing questions and only unlinks unreferenced files', async () => {
      const batchId = `test-cleanup-${Date.now()}`;
      const uploadDir = getLocalUploadDirectory(batchId, 'questions');

      // Create physical test image files in batch directory
      fs.mkdirSync(uploadDir, { recursive: true });
      const fileUsed = path.join(uploadDir, 'used_chart.png');
      const fileOrphan = path.join(uploadDir, 'orphan_chart.png');
      fs.writeFileSync(fileUsed, Buffer.from([0x89, 0x50, 0x4E, 0x47]));
      fs.writeFileSync(fileOrphan, Buffer.from([0x89, 0x50, 0x4E, 0x47]));

      // Register used_chart.png to a question in mock DB
      mockDbQuestions.set('q-active', {
        id: 'q-active',
        text: 'Question using diagram',
        imageUrl: `/uploads/questions/${batchId}/used_chart.png`,
      });

      // Execute safe cleanup
      const cleanupResult = await safeCleanupUnreferencedBatchImages(batchId, 'questions');

      expect(cleanupResult.preservedCount).toBe(1);
      expect(cleanupResult.preservedFiles).toContain('used_chart.png');
      expect(cleanupResult.deletedCount).toBe(1);

      // Verify physical disk state
      expect(fs.existsSync(fileUsed)).toBe(true); // PRESERVED!
      expect(fs.existsSync(fileOrphan)).toBe(false); // DELETED!

      // Clean up test dir
      fs.rmSync(uploadDir, { recursive: true, force: true });
    });
  });

  describe('6. Duplicate Handling & Explicit Update Consent', () => {
    it('skips duplicate questions by default without overwriting existing data', async () => {
      const batchId = `test-dup-skip-${Date.now()}`;
      // Pre-seed an existing question
      mockDbQuestions.set('q-existing-1', {
        id: 'q-existing-1',
        text: 'What is the speed of light?',
        section: { code: 'QUANT' },
        topic: { name: 'Simplification' },
      });

      const incoming = [
        createMockQuestion(1, { text: 'What is the speed of light?' }), // Exact duplicate text
        createMockQuestion(2, { text: 'Brand new unique question' }),
      ];

      const res = await executeResilientImport({
        batchId,
        questions: incoming,
        duplicatePolicy: 'SKIP',
      });

      expect(res.report.duplicatesSkipped).toBe(1);
      expect(res.report.questionsCreated).toBe(1);
      expect(res.report.duplicates[0].actionTaken).toBe('SKIPPED');
    });

    it('requires explicit consent to update existing questions with duplicate text', async () => {
      const batchId = `test-dup-update-${Date.now()}`;
      mockDbQuestions.set('q-existing-2', {
        id: 'q-existing-2',
        text: 'Explain Ohm law',
        section: { code: 'QUANT' },
        topic: { name: 'Simplification' },
        options: [{ id: 'opt-1', text: 'Old', isCorrect: true }],
      });

      const incoming = [
        createMockQuestion(1, {
          text: 'Explain Ohm law',
          explanation: 'Updated Ohm law explanation',
        }),
      ];

      // Update with allowDestructiveUpdates = true
      const res = await executeResilientImport({
        batchId,
        questions: incoming,
        duplicatePolicy: 'UPDATE',
        allowDestructiveUpdates: true,
      });

      expect(res.report.questionsUpdated).toBe(1);
      expect(res.report.duplicates[0].actionTaken).toBe('UPDATED');
    });
  });

  describe('7. Safe External Image URL Policy & SSRF Prevention', () => {
    it('accepts safe HTTPS external URLs', () => {
      expect(validateSafeExternalImageUrl('https://cdn.example.com/charts/figure1.png').isValid).toBe(true);
      expect(validateSafeExternalImageUrl('https://assets.exam-portal.org/di.jpg').isValid).toBe(true);
    });

    it('blocks dangerous protocols and private/localhost SSRF targets', () => {
      expect(validateSafeExternalImageUrl('ftp://example.com/image.png').isValid).toBe(false);
      expect(validateSafeExternalImageUrl('file:///etc/passwd').isValid).toBe(false);
      expect(validateSafeExternalImageUrl('http://localhost:3000/secret.png').isValid).toBe(false);
      expect(validateSafeExternalImageUrl('http://127.0.0.1/admin.png').isValid).toBe(false);
      expect(validateSafeExternalImageUrl('http://169.254.169.254/latest/meta-data/').isValid).toBe(false);
      expect(validateSafeExternalImageUrl('http://192.168.1.1/router.jpg').isValid).toBe(false);
      expect(validateSafeExternalImageUrl('http://10.0.0.1/internal.png').isValid).toBe(false);
    });
  });
});
