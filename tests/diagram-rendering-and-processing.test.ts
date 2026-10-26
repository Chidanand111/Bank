import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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

// Mock Prisma for persistence checks
vi.mock('@/lib/prisma', () => ({
  prisma: {
    exam: {
      findFirst: vi.fn().mockResolvedValue({ id: 'exam-ibps-po', title: 'IBPS PO' }),
    },
    mockTest: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    question: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async ({ data }: any) => ({
        id: data.id || 'q-1',
        ...data,
        section: { code: 'QUANT', name: 'Quantitative Aptitude' },
        topic: { name: 'Simplification' },
        exam: { slug: 'ibps-po', title: 'IBPS PO' },
        options: (data.options?.create || []).map((o: any, idx: number) => ({
          id: `opt-${idx}`,
          questionId: data.id || 'q-1',
          text: o.text,
          imageUrl: o.imageUrl,
          isCorrect: o.isCorrect,
          order: o.order || idx + 1,
        })),
      })),
      update: vi.fn().mockImplementation(async ({ where, data }: any) => ({
        id: where.id,
        ...data,
      })),
    },
    questionOption: {
      createMany: vi.fn().mockResolvedValue({ count: 5 }),
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
  },
}));

import {
  DEFAULT_IMAGE_OPTIONS,
  getBase64SizeBytes,
  formatByteSize,
  inspectCanvasTransparency,
  compressDataUrl,
} from '@/lib/utils/imageCompressor';
import {
  detectImageFormat,
  isValidImageExtension,
} from '@/lib/storage/zipValidator';
import {
  classifyImageReference,
  sanitizeMediaFilename,
  persistDataUriToStorage,
  getLocalUploadDirectory,
} from '@/lib/storage/mediaStorage';
import fs from 'fs';
import path from 'path';

describe('Phase 2: Exam Diagram Readability & Format-Aware Image Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authPermissions, 'requireAdmin').mockResolvedValue({
      id: 'admin-1',
      email: 'admin@bank.com',
      role: 'ADMIN',
      name: 'Admin',
    } as any);
  });

  describe('1. Tiny Mathematical Labels & Readability Limits', () => {
    it('enforces High-DPI max dimension of at least 1920px to preserve tiny mathematical labels', () => {
      expect(DEFAULT_IMAGE_OPTIONS.maxDimension).toBeGreaterThanOrEqual(1920);
    });

    it('enforces high image quality >= 0.90 to avoid ringing and blur around math subscripts/superscripts', () => {
      expect(DEFAULT_IMAGE_OPTIONS.quality).toBeGreaterThanOrEqual(0.90);
    });

    it('preserves exact aspect ratio when scaling landscape diagrams', () => {
      // Landscape: 3840 x 1920 (aspect ratio 2:1)
      const origW = 3840;
      const origH = 1920;
      const maxDim = DEFAULT_IMAGE_OPTIONS.maxDimension; // 1920
      const ratio = Math.min(maxDim / origW, maxDim / origH); // 1920 / 3840 = 0.5
      const scaledW = Math.round(origW * ratio); // 1920
      const scaledH = Math.round(origH * ratio); // 960

      expect(scaledW).toBe(1920);
      expect(scaledH).toBe(960);
      expect(scaledW / scaledH).toBeCloseTo(origW / origH, 4);
    });

    it('preserves exact aspect ratio when scaling portrait diagrams (e.g., tall circuit diagrams)', () => {
      // Portrait: 1200 x 3600 (aspect ratio 1:3)
      const origW = 1200;
      const origH = 3600;
      const maxDim = DEFAULT_IMAGE_OPTIONS.maxDimension; // 1920
      const ratio = Math.min(maxDim / origW, maxDim / origH); // 1920 / 3600 = 0.5333...
      const scaledW = Math.round(origW * ratio); // 640
      const scaledH = Math.round(origH * ratio); // 1920

      expect(scaledW).toBe(640);
      expect(scaledH).toBe(1920);
      expect(scaledW / scaledH).toBeCloseTo(origW / origH, 4);
    });

    it('correctly calculates base64 byte sizes and human-readable formats', () => {
      const sample100B = 'data:image/png;base64,' + 'A'.repeat(136); // ~102 bytes
      const bytes = getBase64SizeBytes(sample100B);
      expect(bytes).toBeGreaterThan(90);
      expect(formatByteSize(512)).toBe('512 B');
      expect(formatByteSize(2048)).toBe('2.0 KB');
      expect(formatByteSize(5 * 1024 * 1024)).toBe('5.00 MB');
    });
  });

  describe('2. Transparent Diagrams & Lossless Formats', () => {
    it('detects transparent pixels in canvas alpha channel', () => {
      const width = 4;
      const height = 4;
      const rgbaData = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < rgbaData.length; i += 4) {
        rgbaData[i] = 255;
        rgbaData[i + 1] = 255;
        rgbaData[i + 2] = 255;
        rgbaData[i + 3] = 255; // Opaque
      }

      const mockCtxOpaque = {
        getImageData: vi.fn().mockReturnValue({ data: rgbaData }),
      } as unknown as CanvasRenderingContext2D;

      expect(inspectCanvasTransparency(mockCtxOpaque, width, height)).toBe(false);

      // Now introduce a semi-transparent pixel (Alpha = 128)
      rgbaData[3] = 128;
      const mockCtxTransparent = {
        getImageData: vi.fn().mockReturnValue({ data: rgbaData }),
      } as unknown as CanvasRenderingContext2D;

      expect(inspectCanvasTransparency(mockCtxTransparent, width, height)).toBe(true);
    });

    it('protects SVG vector graphics by returning data URI untouched without rasterization', async () => {
      const svgDataUrl = 'data:image/svg+xml;utf8,<svg><circle cx="50" cy="50" r="40"/></svg>';
      const result = await compressDataUrl(svgDataUrl);

      expect(result.format).toBe('svg');
      expect(result.hasTransparency).toBe(true);
      expect(result.compressedDataUrl).toBe(svgDataUrl);
      expect(result.compressionRatioPercent).toBe(0);
    });

    it('preserves transparent PNG format rather than forcing white JPEG conversion', async () => {
      const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = await compressDataUrl(pngDataUrl);

      expect(result.format).toBe('png');
      expect(result.hasTransparency).toBe(true);
      expect(result.compressedDataUrl).toBe(pngDataUrl);
    });
  });

  describe('3. Legacy URLs, Historical Data URIs & Storage References', () => {
    it('correctly classifies various image reference formats', () => {
      expect(classifyImageReference('https://images.unsplash.com/photo-1')).toBe('URL');
      expect(classifyImageReference('http://cdn.example.org/diagram.png')).toBe('URL');
      expect(classifyImageReference('//assets.exam.com/circuit.jpg')).toBe('URL');
      expect(classifyImageReference('/uploads/questions/batch1/photo.png')).toBe('URL');
      expect(classifyImageReference('/images/mock-test-icon.png')).toBe('URL');

      expect(classifyImageReference('data:image/png;base64,iVBORw0KGgo=')).toBe('DATA_URI');
      expect(classifyImageReference('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe('DATA_URI');

      expect(classifyImageReference('diagram_1.png')).toBe('FILENAME');
      expect(classifyImageReference('charts/figure_3.svg')).toBe('FILENAME');
      expect(classifyImageReference('geometry.jpg')).toBe('FILENAME');

      expect(classifyImageReference('')).toBe('NONE');
      expect(classifyImageReference(null)).toBe('NONE');
      expect(classifyImageReference('   ')).toBe('NONE');
    });

    it('passes legacy external URLs directly through compressDataUrl without attempting to compress', async () => {
      const legacyHttpUrl = 'https://s3.amazonaws.com/exam-bucket/diagrams/q12.png';
      const result = await compressDataUrl(legacyHttpUrl);

      expect(result.compressedDataUrl).toBe(legacyHttpUrl);
      expect(result.compressionRatioPercent).toBe(0);
      expect(result.format).toBe('unknown');
    });
  });

  describe('4. Magic Byte Verification & Corrupt File Rejection', () => {
    it('identifies genuine PNG files via binary magic bytes (89 50 4E 47)', () => {
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
      const detected = detectImageFormat(pngHeader);

      expect(detected).not.toBeNull();
      expect(detected?.format).toBe('png');
      expect(detected?.mimeType).toBe('image/png');
    });

    it('identifies genuine JPEG files via binary magic bytes (FF D8 FF)', () => {
      const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      const detected = detectImageFormat(jpegHeader);

      expect(detected).not.toBeNull();
      expect(detected?.format).toBe('jpeg');
      expect(detected?.mimeType).toBe('image/jpeg');
    });

    it('identifies genuine WebP files via binary magic bytes (RIFF....WEBP)', () => {
      const webpHeader = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00, // file size
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      const detected = detectImageFormat(webpHeader);

      expect(detected).not.toBeNull();
      expect(detected?.format).toBe('webp');
      expect(detected?.mimeType).toBe('image/webp');
    });

    it('identifies genuine GIF files via binary magic bytes (GIF87a / GIF89a)', () => {
      const gifHeader = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x10, 0x00]);
      const detected = detectImageFormat(gifHeader);

      expect(detected).not.toBeNull();
      expect(detected?.format).toBe('gif');
      expect(detected?.mimeType).toBe('image/gif');
    });

    it('rejects corrupt image files and fake extensions', () => {
      const textBuffer = new TextEncoder().encode('Hello, this is not an image file!');
      const detected = detectImageFormat(textBuffer);
      expect(detected).toBeNull();

      expect(detectImageFormat(new Uint8Array([]))).toBeNull();
      expect(detectImageFormat(new Uint8Array([0x89, 0x50]))).toBeNull();
    });

    it('validates supported file extensions case-insensitively', () => {
      expect(isValidImageExtension('figure.PNG')).toBe(true);
      expect(isValidImageExtension('chart.JpEg')).toBe(true);
      expect(isValidImageExtension('vector.svg')).toBe(true);
      expect(isValidImageExtension('icon.webp')).toBe(true);
      expect(isValidImageExtension('script.exe')).toBe(false);
      expect(isValidImageExtension('questions.csv')).toBe(false);
    });
  });

  describe('5. Storage Architecture & PostgreSQL Base64 Prevention', () => {
    it('sanitizes media filenames to eliminate directory traversal hazards', () => {
      expect(sanitizeMediaFilename('../../etc/passwd.png')).toBe('passwd.png');
      expect(sanitizeMediaFilename('..\\..\\windows\\system32\\cmd.jpg')).toBe('cmd.jpg');
      expect(sanitizeMediaFilename('Chart #1 & Analysis (2024).png')).toBe('chart__1___analysis__2024_.png');
      expect(sanitizeMediaFilename('')).toMatch(/^image_\d+/);
    });

    it('converts Base64 data URIs to persistent disk storage and returns clean relative URL', async () => {
      const singlePixelPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const batchId = `test-persist-${Date.now()}`;

      const storedUrl = await persistDataUriToStorage(singlePixelPng, {
        batchId,
        category: 'questions',
        filenamePrefix: 'test_diag',
      });

      expect(storedUrl).toBeDefined();
      expect(storedUrl).toMatch(/^\/uploads\/questions\/test-persist-/);
      expect(storedUrl).toMatch(/\.png$/);

      // Verify file was physically written to public/uploads directory
      const localDir = getLocalUploadDirectory(batchId, 'questions');
      const filename = path.basename(storedUrl!);
      const fullPath = path.join(localDir, filename);

      expect(fs.existsSync(fullPath)).toBe(true);

      // Clean up test file
      fs.rmSync(localDir, { recursive: true, force: true });
    });

    it('returns external URLs and filenames untouched when passed to persistDataUriToStorage', async () => {
      const httpUrl = 'https://example.com/assets/diagram.png';
      expect(await persistDataUriToStorage(httpUrl)).toBe(httpUrl);

      const localRef = '/uploads/questions/batch-1/diagram.png';
      expect(await persistDataUriToStorage(localRef)).toBe(localRef);

      const plainFilename = 'circuit_diagram.png';
      expect(await persistDataUriToStorage(plainFilename)).toBe(plainFilename);

      expect(await persistDataUriToStorage(undefined)).toBeUndefined();
      expect(await persistDataUriToStorage(null)).toBeUndefined();
    });
  });

  describe('6. Diagram Upload API & Authorization Guard', () => {
    it('blocks unauthenticated / non-admin access to diagram upload action', async () => {
      const spy = vi.spyOn(authPermissions, 'requireAdmin').mockRejectedValueOnce(new Error('Unauthorized: Admin access required'));

      const { uploadQuestionDiagramAction } = await import('@/lib/services/questionService');
      const formData = new FormData();
      formData.append('file', new Blob(['fake content'], { type: 'image/png' }), 'diagram.png');

      await expect(uploadQuestionDiagramAction(formData)).rejects.toThrow('Unauthorized: Admin access required');
      spy.mockRestore();
    });

    it('rejects diagram uploads with no file provided', async () => {
      const { uploadQuestionDiagramAction } = await import('@/lib/services/questionService');
      const formData = new FormData();

      const res = await uploadQuestionDiagramAction(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('No image file provided');
    });

    it('rejects corrupt/unsupported diagram files during direct upload', async () => {
      const { uploadQuestionDiagramAction } = await import('@/lib/services/questionService');
      const formData = new FormData();
      const corruptBlob = new Blob(['Not a valid image header content'], { type: 'image/png' });
      formData.append('file', corruptBlob, 'corrupt.png');

      const res = await uploadQuestionDiagramAction(formData);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid or unsupported image file');
    });

    it('successfully processes and saves valid diagram upload returning persistent URL', async () => {
      const { uploadQuestionDiagramAction } = await import('@/lib/services/questionService');
      const formData = new FormData();

      // Real 1x1 PNG bytes
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG Header
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82,
      ]);

      const validBlob = new Blob([pngBytes], { type: 'image/png' });
      formData.append('file', validBlob, 'valid_diagram.png');

      const res = await uploadQuestionDiagramAction(formData);
      expect(res.success).toBe(true);
      expect(res.url).toMatch(/^\/uploads\/questions\/diag-/);
      expect(res.filename).toBe('valid_diagram.png');
    });
  });

  describe('7. End-to-End Question Persistence without Base64 DB Accumulation', () => {
    it('converts inline base64 image to persistent storage URL during createQuestionAction', async () => {
      const { createQuestionAction } = await import('@/lib/services/questionService');

      const pngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const res = await createQuestionAction({
        text: 'What is the circuit impedance?',
        examId: 'exam-ibps-po',
        sectionCode: 'QUANT',
        topicName: 'Simplification',
        difficulty: 'MEDIUM',
        explanation: 'Detailed solution for circuit impedance',
        marks: 1.0,
        negativeMarks: 0.25,
        imageUrl: pngBase64, // Base64 uploaded by admin
        options: [
          { text: '10 Ohms', isCorrect: true },
          { text: '20 Ohms', isCorrect: false },
        ],
      });

      expect(res.success).toBe(true);
      expect(res.question).toBeDefined();

      // Verify the persisted question imageUrl is NOT the original Base64 payload,
      // but a clean persistent storage URL!
      expect(res.question?.imageUrl).toMatch(/^\/uploads\/questions\/manual-q-/);
      expect(res.question?.imageUrl?.startsWith('data:image/')).toBe(false);
    });
  });

  describe('8. Resilient Cross-Batch Media Serving & Diagram Recovery', () => {
    it('successfully recovers and serves a diagram located in an alternate batch directory', async () => {
      const { GET } = await import('@/app/api/media/[...path]/route');
      const { memoryMediaCache } = await import('@/lib/storage/mediaStorage');

      // 1. Setup a test batch directory with a dummy image file
      const sourceBatchId = `test-src-batch-${Date.now()}`;
      const sourceDir = path.join(process.cwd(), 'public', 'uploads', 'questions', sourceBatchId);
      fs.mkdirSync(sourceDir, { recursive: true });

      const testImageName = `recovery_diagram_${Date.now()}.png`;
      const sourceFilePath = path.join(sourceDir, testImageName);
      const dummyPngBytes = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      ]);
      fs.writeFileSync(sourceFilePath, dummyPngBytes);

      try {
        // 2. Request the image pointing to a DIFFERENT, nonexistent batch ID
        const nonexistentBatchId = `nonexistent-batch-${Date.now()}`;
        const req = new NextRequest(`http://localhost:3000/api/media/questions/${nonexistentBatchId}/${testImageName}`);
        const res = await GET(req, {
          params: Promise.resolve({
            path: ['questions', nonexistentBatchId, testImageName],
          }),
        });

        // 3. Verify it was successfully resolved, served with 200, and cached in memory
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('image/png');

        const cached = memoryMediaCache.get(`/uploads/questions/${nonexistentBatchId}/${testImageName}`);
        expect(cached).toBeDefined();
        expect(cached?.mimeType).toBe('image/png');
      } finally {
        fs.rmSync(sourceDir, { recursive: true, force: true });
      }
    });

    it('rejects path traversal attempts with 403 Forbidden', async () => {
      const { GET } = await import('@/app/api/media/[...path]/route');
      const req = new NextRequest('http://localhost:3000/api/media/questions/../../etc/passwd');
      const res = await GET(req, {
        params: Promise.resolve({
          path: ['questions', '..', '..', 'etc', 'passwd'],
        }),
      });
      expect(res.status).toBe(403);
    });
  });
});

