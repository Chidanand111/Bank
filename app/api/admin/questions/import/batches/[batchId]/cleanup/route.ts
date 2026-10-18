import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/permissions';
import { getImportBatch } from '@/lib/storage/importBatchStore';
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

    const result = await safeCleanupUnreferencedBatchImages(batchId);

    return NextResponse.json({
      success: true,
      batchId,
      message: `Cleaned up ${result.deletedCount} unreferenced assets; preserved ${result.preservedCount} referenced assets.`,
      ...result,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
