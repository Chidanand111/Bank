import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/permissions';
import { requestBatchCancellation, getImportBatch } from '@/lib/storage/importBatchStore';
import { safeCleanupUnreferencedBatchImages } from '@/lib/storage/mediaStorage';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ batchId: string }> }
) {
  try {
    await requireAdmin();
    const { batchId } = await context.params;
    const batch = getImportBatch(batchId);

    if (!batch) {
      return NextResponse.json(
        { success: false, error: `Batch "${batchId}" not found.` },
        { status: 404 }
      );
    }

    const cancelled = requestBatchCancellation(batchId);
    if (!cancelled) {
      return NextResponse.json(
        { success: false, error: `Batch is already in ${batch.status} state and cannot be cancelled.` },
        { status: 400 }
      );
    }

    // Safely cleanup unreferenced assets
    const cleanupResult = await safeCleanupUnreferencedBatchImages(batchId);

    return NextResponse.json({
      success: true,
      message: `Batch ${batchId} was successfully cancelled.`,
      cleanup: cleanupResult,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
