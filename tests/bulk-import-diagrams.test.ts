import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

// Mock in-memory DB store for QuestionRepository & Prisma
const createdDbQuestions = new Map<string, any>();

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      exam: {
        findFirst: vi.fn().mockImplementation(async () => ({
          id: 'exam-ibps-po',
          title: 'IBPS PO',
          slug: 'ibps-po',
          category: 'PO',
          sections: [
            {
              id: 'sec-quant',
              code: 'QUANT',
              name: 'Quantitative Aptitude',
              topics: [{ id: 'top-simplification', name: 'Simplification' }],
            },
          ],
        })),
        upsert: vi.fn().mockImplementation(async () => ({
          id: 'exam-ibps-po',
          title: 'IBPS PO',
          slug: 'ibps-po',
          category: 'PO',
        })),
      },
      mockTest: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      question: {
        findUnique: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
          if (createdDbQuestions.has(where.id)) {
            return createdDbQuestions.get(where.id);
          }
          return null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: { data: any }) => {
          const record = {
            id: data.id,
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
            options: (data.options?.create || []).map((o: any) => ({
              id: o.id,
              text: o.text,
              imageUrl: o.imageUrl,
              isCorrect: o.isCorrect,
              order: o.order,
            })),
          };
          createdDbQuestions.set(data.id, record);
          return record;
        }),
      },
      section: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockImplementation(async ({ create }) => ({
          id: create.id,
          code: create.code,
          name: create.name,
          topics: [],
        })),
        findFirst: vi.fn().mockResolvedValue({ id: 'sec-quant', code: 'QUANT', name: 'Quantitative Aptitude' }),
      },
      topic: {
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: data.id,
          name: data.name,
          sectionId: data.sectionId,
        })),
        findFirst: vi.fn().mockResolvedValue({ id: 'top-simplification', name: 'Simplification' }),
      },
    },
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

import {
  detectImageFormat,
  sanitizeZipEntryPath,
  validateAndExtractZip,
} from '@/lib/storage/zipValidator';
import {
  classifyImageReference,
  saveBatchImages,
  cleanupBatchImages,
} from '@/lib/storage/mediaStorage';
import {
  resolveQuestionDiagramReferences,
} from '@/lib/storage/questionImageResolver';
import { AdminQuestionInput } from '@/types';
import * as questionService from '@/lib/services/questionService';
import * as authPermissions from '@/lib/auth/permissions';

// Valid binary fixtures with proper magic byte signatures
const VALID_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR header
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
]);

const VALID_JPEG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xd9,
]);

const VALID_GIF_BYTES = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // "GIF89a"
  0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

const VALID_WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, // "RIFF"
  0x20, 0x00, 0x00, 0x00, // Size
  0x57, 0x45, 0x42, 0x50, // "WEBP"
  0x56, 0x50, 0x38, 0x20, // "VP8 "
  0x14, 0x00, 0x00, 0x00,
]);

const SPOOFED_TEXT_BYTES = new TextEncoder().encode('This is just plain text disguised as an image.');

function createTestQuestion(overrides: Partial<AdminQuestionInput> = {}): AdminQuestionInput {
  return {
    text: 'Sample test question',
    sectionCode: 'QUANT',
    topicName: 'Simplification',
    difficulty: 'MEDIUM',
    explanation: 'Sample explanation',
    marks: 1.0,
    negativeMarks: 0.25,
    options: [
      { text: 'Option A', isCorrect: true },
      { text: 'Option B', isCorrect: false },
    ],
    ...overrides,
  };
}

describe('1. ZIP Validation & Magic Byte Inspection', () => {
  it('identifies valid PNG, JPEG, GIF, and WebP signatures accurately', () => {
    expect(detectImageFormat(VALID_PNG_BYTES)?.format).toBe('png');
    expect(detectImageFormat(VALID_JPEG_BYTES)?.format).toBe('jpeg');
    expect(detectImageFormat(VALID_GIF_BYTES)?.format).toBe('gif');
    expect(detectImageFormat(VALID_WEBP_BYTES)?.format).toBe('webp');
  });

  it('rejects spoofed image files whose binary magic bytes do not match', () => {
    expect(detectImageFormat(SPOOFED_TEXT_BYTES)).toBeNull();
  });

  it('rejects path traversal attacks in ZIP entry filenames', () => {
    expect(sanitizeZipEntryPath('../../etc/passwd').error).toContain('Path traversal');
    expect(sanitizeZipEntryPath('images/../../secret.png').error).toContain('Path traversal');
    expect(sanitizeZipEntryPath('..\\windows\\system32\\cmd.exe').error).toContain('Path traversal');
  });

  it('rejects absolute paths in ZIP entry filenames', () => {
    expect(sanitizeZipEntryPath('/root/diagram.png').error).toContain('Absolute path rejected');
    expect(sanitizeZipEntryPath('C:/Windows/diagram.png').error).toContain('Absolute path rejected');
  });

  it('extracts and validates a clean ZIP containing multiple valid diagrams', async () => {
    const zip = new JSZip();
    zip.file('diagrams/di_chart.png', VALID_PNG_BYTES);
    zip.file('diagrams/puzzle_table.jpg', VALID_JPEG_BYTES);
    zip.file('optionA_diagram.webp', VALID_WEBP_BYTES);

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
    const result = await validateAndExtractZip(zipBuffer);

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.images.length).toBe(3);
    expect(result.imageMap.has('di_chart.png')).toBe(true);
    expect(result.imageMap.has('diagrams/di_chart.png')).toBe(true);
    expect(result.imageMap.has('optiona_diagram.webp')).toBe(true);
  });

  it('rejects ZIP containing spoofed corrupted image file', async () => {
    const zip = new JSZip();
    zip.file('fake_chart.png', SPOOFED_TEXT_BYTES);

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
    const result = await validateAndExtractZip(zipBuffer);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('magic byte signature'))).toBe(true);
  });

  it('flags ambiguous duplicate basenames located in different subdirectories', async () => {
    const zip = new JSZip();
    zip.file('folderA/common.png', VALID_PNG_BYTES);
    zip.file('folderB/common.png', VALID_PNG_BYTES);

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
    const result = await validateAndExtractZip(zipBuffer);

    expect(result.isValid).toBe(true);
    expect(result.warnings.some(w => w.includes('Duplicate filename "common.png"'))).toBe(true);
  });

  it('enforces maximum per-image size limits to protect server resources', async () => {
    const zip = new JSZip();
    const largePng = new Uint8Array(1024 * 1024); // 1 MB
    largePng.set(VALID_PNG_BYTES);
    zip.file('huge_chart.png', largePng);

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
    // Enforce 500 KB limit for test
    const result = await validateAndExtractZip(zipBuffer, { maxPerImageSizeBytes: 500 * 1024 });

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('exceeds maximum allowed size'))).toBe(true);
  });
});

describe('2. Image Reference Classification & Resolver', () => {
  it('correctly classifies URLs, data URIs, and local filename references', () => {
    expect(classifyImageReference('https://images.unsplash.com/photo.jpg')).toBe('URL');
    expect(classifyImageReference('http://example.com/chart.png')).toBe('URL');
    expect(classifyImageReference('data:image/svg+xml;utf8,<svg></svg>')).toBe('DATA_URI');
    expect(classifyImageReference('data:image/png;base64,iVBORw0KGgo=')).toBe('DATA_URI');
    expect(classifyImageReference('chart1.png')).toBe('FILENAME');
    expect(classifyImageReference('diagrams/reasoning_puzzle.jpg')).toBe('FILENAME');
    expect(classifyImageReference('optionB_equation.webp')).toBe('FILENAME');
  });

  it('does NOT interpret arbitrary text descriptions as local filenames', () => {
    expect(classifyImageReference('Refer to the circular arrangement table given above')).toBe('NONE');
    expect(classifyImageReference('Directions: Study the paragraph carefully')).toBe('NONE');
    expect(classifyImageReference('')).toBe('NONE');
    expect(classifyImageReference(undefined)).toBe('NONE');
  });

  it('resolves valid question, passage, and option diagrams from ZIP image map', async () => {
    const zip = new JSZip();
    zip.file('di_chart.png', VALID_PNG_BYTES);
    zip.file('q1_diagram.png', VALID_PNG_BYTES);
    zip.file('optA_img.png', VALID_PNG_BYTES);

    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
    const zipResult = await validateAndExtractZip(zipBuffer);

    const sampleQuestions: AdminQuestionInput[] = [
      createTestQuestion({
        text: 'What is the production ratio?',
        sectionCode: 'QUANT',
        topicName: 'DI',
        difficulty: 'MEDIUM',
        passageImageUrl: 'di_chart.png',
        imageUrl: 'q1_diagram.png',
        options: [
          { text: 'Option A', isCorrect: true, imageUrl: 'optA_img.png' },
          { text: 'Option B', isCorrect: false },
        ],
      }),
    ];

    const previewUrlMap = new Map<string, string>([
      ['di_chart.png', 'blob:http://localhost:3000/mock-blob-1'],
      ['q1_diagram.png', 'blob:http://localhost:3000/mock-blob-2'],
      ['opta_img.png', 'blob:http://localhost:3000/mock-blob-3'],
    ]);

    const { updatedQuestions, report } = resolveQuestionDiagramReferences(
      sampleQuestions,
      zipResult.imageMap,
      previewUrlMap
    );

    expect(report.resolvedCount).toBe(3);
    expect(report.unresolvedReferences.length).toBe(0);
    expect(updatedQuestions[0].passageImageUrl).toBe('blob:http://localhost:3000/mock-blob-1');
    expect(updatedQuestions[0].imageUrl).toBe('blob:http://localhost:3000/mock-blob-2');
    expect(updatedQuestions[0].options[0].imageUrl).toBe('blob:http://localhost:3000/mock-blob-3');
  });

  it('detects and reports missing image references with row numbers and question identifiers', async () => {
    const zip = new JSZip();
    zip.file('existing_image.png', VALID_PNG_BYTES);
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
    const zipResult = await validateAndExtractZip(zipBuffer);

    const questionsWithMissingImages: AdminQuestionInput[] = [
      createTestQuestion({
        groupId: 'DI-SET-01',
        text: 'DI Question 1',
        sectionCode: 'QUANT',
        topicName: 'DI',
        passageImageUrl: 'missing_chart.png',
        options: [
          { text: 'Choice 1', isCorrect: true },
          { text: 'Choice 2', isCorrect: false, imageUrl: 'missing_option.png' },
        ],
      }),
      createTestQuestion({
        text: 'Reasoning Question 2',
        sectionCode: 'REASONING',
        topicName: 'Puzzles',
        imageUrl: 'missing_puzzle.png',
        options: [
          { text: 'Choice A', isCorrect: true },
          { text: 'Choice B', isCorrect: false },
        ],
      }),
    ];

    const { report } = resolveQuestionDiagramReferences(
      questionsWithMissingImages,
      zipResult.imageMap
    );

    expect(report.unresolvedReferences.length).toBe(3);

    // Row 2 (first question after header)
    expect(report.unresolvedReferences[0]).toEqual({
      rowNumber: 2,
      questionIdentifier: 'DI-SET-01 (Q1)',
      field: 'passageImageUrl',
      referencedFilename: 'missing_chart.png',
    });

    // Row 2 option
    expect(report.unresolvedReferences[1]).toEqual({
      rowNumber: 2,
      questionIdentifier: 'DI-SET-01 (Q1)',
      field: 'optionB',
      referencedFilename: 'missing_option.png',
    });

    // Row 3 (second question)
    expect(report.unresolvedReferences[2]).toEqual({
      rowNumber: 3,
      questionIdentifier: 'Question 2',
      field: 'imageUrl',
      referencedFilename: 'missing_puzzle.png',
    });
  });

  it('preserves external HTTP URLs and SVG data URIs without attempting ZIP lookup', async () => {
    const emptyImageMap = new Map();

    const questionsWithExternalAssets: AdminQuestionInput[] = [
      createTestQuestion({
        text: 'RC Question 1',
        sectionCode: 'ENGLISH',
        topicName: 'Reading',
        imageUrl: 'https://cdn.bankexams.com/reading_chart.png',
        passageImageUrl: 'data:image/svg+xml;utf8,<svg width="100"></svg>',
        options: [
          { text: 'A', isCorrect: true, imageUrl: 'https://cdn.bankexams.com/optA.png' },
          { text: 'B', isCorrect: false },
        ],
      }),
    ];

    const { updatedQuestions, report } = resolveQuestionDiagramReferences(
      questionsWithExternalAssets,
      emptyImageMap
    );

    expect(report.unresolvedReferences.length).toBe(0);
    expect(updatedQuestions[0].imageUrl).toBe('https://cdn.bankexams.com/reading_chart.png');
    expect(updatedQuestions[0].passageImageUrl).toBe('data:image/svg+xml;utf8,<svg width="100"></svg>');
    expect(updatedQuestions[0].options[0].imageUrl).toBe('https://cdn.bankexams.com/optA.png');
  });
});

describe('3. Persistent Media Storage & URL Generation', () => {
  const testBatchId = `test-batch-${Date.now()}`;

  it('saves batch images into persistent public uploads folder with safe URLs and disk paths', async () => {
    const saved = await saveBatchImages(
      [
        {
          filename: 'branch_chart.png',
          buffer: Buffer.from(VALID_PNG_BYTES),
          mimeType: 'image/png',
        },
      ],
      { batchId: testBatchId, category: 'questions' }
    );

    expect(saved.has('branch_chart.png')).toBe(true);
    const stored = saved.get('branch_chart.png')!;
    expect(stored.url).toBe(`/uploads/questions/${testBatchId}/branch_chart.png`);
    expect(stored.diskPath).toBeTruthy();
    expect(fs.existsSync(stored.diskPath)).toBe(true);
  });

  it('cleans up batch directory cleanly', async () => {
    await cleanupBatchImages(testBatchId, 'questions');
    const batchDir = path.join(process.cwd(), 'public', 'uploads', 'questions', testBatchId);
    expect(fs.existsSync(batchDir)).toBe(false);
  });
});

describe('4. Authorization Guard & Role Verification', () => {
  it('blocks unauthenticated or non-admin users from executing bulk imports', async () => {
    const spy = vi.spyOn(authPermissions, 'requireAdmin').mockRejectedValueOnce(new Error('Unauthorized'));

    await expect(
      questionService.bulkImportQuestionsAction([
        createTestQuestion({
          text: 'Forbidden question',
        }),
      ])
    ).rejects.toThrow('Unauthorized');

    spy.mockRestore();
  });
});

describe('5. Bulk Import Flow & Idempotency / Safe Retries', () => {
  beforeEach(() => {
    vi.spyOn(authPermissions, 'requireAdmin').mockResolvedValue({
      id: 'admin-1',
      email: 'admin@bank.com',
      role: 'ADMIN',
      status: 'APPROVED',
      name: 'Admin',
    });
  });

  it('imports CSV questions with no images without requiring any ZIP archive', async () => {
    const questionsWithoutImages: AdminQuestionInput[] = [
      createTestQuestion({
        text: 'What is 10 + 10?',
        sectionCode: 'QUANT',
        topicName: 'Simplification',
        difficulty: 'EASY',
        explanation: '10 + 10 = 20',
        marks: 1.0,
        negativeMarks: 0.25,
        options: [
          { text: '20', isCorrect: true },
          { text: '25', isCorrect: false },
        ],
      }),
    ];

    const res = await questionService.bulkImportQuestionsAction(questionsWithoutImages);
    expect(res.success).toBe(true);
    expect(res.count).toBe(1);
  });

  it('preserves existing external image URLs and data URIs during import', async () => {
    const questionsWithUrls: AdminQuestionInput[] = [
      createTestQuestion({
        text: 'Solve the equation shown below',
        sectionCode: 'QUANT',
        topicName: 'Algebra',
        imageUrl: 'https://images.unsplash.com/photo-example.jpg',
        passageImageUrl: 'data:image/svg+xml;utf8,<svg></svg>',
        options: [
          { text: 'x = 2', isCorrect: true },
          { text: 'x = 4', isCorrect: false },
        ],
      }),
    ];

    const res = await questionService.bulkImportQuestionsAction(questionsWithUrls);
    expect(res.success).toBe(true);
    expect(res.count).toBe(1);
  });

  it('maps diagram filename references to persistent media URLs when images are uploaded', async () => {
    const batchId = `test-diagrams-${Date.now()}`;
    const base64Png = Buffer.from(VALID_PNG_BYTES).toString('base64');

    const questionsWithDiagrams: AdminQuestionInput[] = [
      createTestQuestion({
        text: 'Refer to the branch chart below',
        sectionCode: 'QUANT',
        topicName: 'DI',
        imageUrl: 'chart_q1.png',
        options: [
          { text: 'Option 1', isCorrect: true, imageUrl: 'opt1.png' },
          { text: 'Option 2', isCorrect: false },
        ],
      }),
    ];

    const images = [
      { filename: 'chart_q1.png', base64: base64Png, mimeType: 'image/png' },
      { filename: 'opt1.png', base64: base64Png, mimeType: 'image/png' },
    ];

    const res = await questionService.bulkImportQuestionsAction(
      questionsWithDiagrams,
      undefined,
      images,
      batchId
    );

    expect(res.success).toBe(true);
    expect(res.count).toBe(1);

    // Verify stored images exist on disk in public/uploads/questions/{batchId}/
    const diskFile1 = path.join(process.cwd(), 'public', 'uploads', 'questions', batchId, 'chart_q1.png');
    const diskFile2 = path.join(process.cwd(), 'public', 'uploads', 'questions', batchId, 'opt1.png');
    expect(fs.existsSync(diskFile1)).toBe(true);
    expect(fs.existsSync(diskFile2)).toBe(true);

    // Clean up test batch files
    await cleanupBatchImages(batchId, 'questions');
  });

  it('ensures safe retry idempotency: repeating an import with the same batch ID does not create duplicates', async () => {
    const deterministicBatchId = `idempotent-test-${Date.now()}`;

    const questions: AdminQuestionInput[] = [
      createTestQuestion({
        text: 'Idempotency verification question',
        sectionCode: 'REASONING',
        topicName: 'Syllogism',
        difficulty: 'MEDIUM',
        options: [
          { text: 'Statement I follows', isCorrect: true },
          { text: 'Statement II follows', isCorrect: false },
        ],
      }),
    ];

    // First attempt
    const res1 = await questionService.bulkImportQuestionsAction(
      questions,
      undefined,
      undefined,
      deterministicBatchId
    );
    expect(res1.success).toBe(true);
    expect(res1.count).toBe(1);

    // Retry attempt with same batchId (e.g. simulated network retry)
    const res2 = await questionService.bulkImportQuestionsAction(
      questions,
      undefined,
      undefined,
      deterministicBatchId
    );
    expect(res2.success).toBe(true);
    expect(res2.count).toBe(1);
  });
});
