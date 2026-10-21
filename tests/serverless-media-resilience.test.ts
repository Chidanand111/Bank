import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  saveBatchImages,
  getLocalUploadDirectory,
  memoryMediaCache,
} from '@/lib/storage/mediaStorage';
import { getBatchStorageDirectory } from '@/lib/storage/importBatchStore';

describe('Serverless Read-Only Filesystem & Media Resilience', () => {
  const batchId = `import-${Date.now().toString(36)}-test`;

  beforeEach(() => {
    memoryMediaCache.clear();
  });

  it('generates a valid upload directory path without crashing', () => {
    const dir = getLocalUploadDirectory(batchId, 'questions');
    expect(dir).toBeDefined();
    expect(typeof dir).toBe('string');
    expect(dir).toContain(batchId);
  });

  it('saves batch images without throwing ENOENT even if primary directory is not available', async () => {
    const dummyBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG header
    const images = [
      {
        filename: 'diagram1.png',
        buffer: dummyBuffer,
        mimeType: 'image/png',
      },
    ];

    const result = await saveBatchImages(images, { batchId, category: 'questions' });
    expect(result).toBeDefined();
    expect(result.size).toBeGreaterThanOrEqual(1);

    const stored = result.get('diagram1.png');
    expect(stored).toBeDefined();
    expect(stored?.url).toBe(`/uploads/questions/${batchId}/diagram1.png`);

    // Verify it is also present in memory media cache for instant zero-disk retrieval
    expect(memoryMediaCache.has(stored!.url)).toBe(true);
  });

  it('getBatchStorageDirectory safely returns a writable directory without throwing ENOENT', () => {
    const batchDir = getBatchStorageDirectory();
    expect(batchDir).toBeDefined();
    expect(typeof batchDir).toBe('string');
  });

  it('simulates read-only /var/task filesystem mkdir error and verifies graceful fallback', async () => {
    const originalMkdirSync = fs.mkdirSync;
    const readOnlyError = new Error("ENOENT: no such file or directory, mkdir '/var/task/public/uploads/questions/" + batchId + "'");
    (readOnlyError as any).code = 'ENOENT';

    // Mock mkdirSync to fail if called on /var/task or public/uploads
    const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation((targetPath: any, opts: any) => {
      const p = String(targetPath).replace(/\\/g, '/');
      if (p.includes('/var/task') || p.includes('public/uploads')) {
        throw readOnlyError;
      }
      return originalMkdirSync(targetPath, opts);
    });

    try {
      const dummyBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG header
      const images = [
        {
          filename: 'geometry_proof.jpg',
          buffer: dummyBuffer,
          mimeType: 'image/jpeg',
        },
      ];

      // Must NOT throw the ENOENT error!
      const result = await saveBatchImages(images, {
        batchId: `import-readonly-${Date.now().toString(36)}`,
        category: 'questions',
      });

      expect(result).toBeDefined();
      const stored = result.get('geometry_proof.jpg');
      expect(stored).toBeDefined();
      expect(stored?.url).toContain('geometry_proof.jpg');
    } finally {
      mkdirSpy.mockRestore();
    }
  });
});
