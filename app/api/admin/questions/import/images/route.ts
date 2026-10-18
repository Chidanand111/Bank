import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/permissions';
import { saveBatchImages } from '@/lib/storage/mediaStorage';
import { detectImageFormat } from '@/lib/storage/zipValidator';
import { registerBatchImage, recordFailedImage, getImportBatch, createImportBatch } from '@/lib/storage/importBatchStore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Authorization Guard
    await requireAdmin();

    const formData = await request.formData();
    const batchId = (formData.get('batchId') as string) || `batch-${Date.now().toString(36)}`;
    
    // Ensure batch exists in store
    if (!getImportBatch(batchId)) {
      createImportBatch({ batchId });
    }

    const files = formData.getAll('files') as File[];
    if (files.length === 0) {
      const singleFile = formData.get('file') as File | null;
      if (singleFile) {
        files.push(singleFile);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No image files provided for upload.' },
        { status: 400 }
      );
    }

    const uploaded: Record<string, string> = {};
    const failed: { filename: string; reason: string }[] = [];
    const validImagesToSave: { filename: string; buffer: Uint8Array; mimeType: string }[] = [];

    // Bounded processing of images (up to 20 files per request)
    const filesToProcess = files.slice(0, 50);

    for (const file of filesToProcess) {
      const name = file.name || 'unnamed.png';

      // 10 MB limit per file
      if (file.size > 10 * 1024 * 1024) {
        failed.push({ filename: name, reason: 'Exceeds maximum size of 10 MB.' });
        recordFailedImage(batchId, name);
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Validate magic bytes
      const detected = detectImageFormat(buffer);
      if (!detected) {
        failed.push({ filename: name, reason: 'Invalid or unsupported format (magic bytes mismatch).' });
        recordFailedImage(batchId, name);
        continue;
      }

      validImagesToSave.push({
        filename: name,
        buffer,
        mimeType: detected.mimeType,
      });
    }

    if (validImagesToSave.length > 0) {
      const savedMap = await saveBatchImages(validImagesToSave, {
        batchId,
        category: 'questions',
      });

      for (const [key, stored] of savedMap.entries()) {
        uploaded[key] = stored.url;
        registerBatchImage(batchId, key, stored.url);
      }
    }

    return NextResponse.json({
      success: true,
      batchId,
      uploadedCount: Object.keys(uploaded).length,
      failedCount: failed.length,
      uploaded,
      failed,
    });
  } catch (err: unknown) {
    console.error('Image chunk upload error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal error uploading images.',
      },
      { status: 500 }
    );
  }
}
