import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import { getImportBatch } from '@/lib/storage/importBatchStore';
import { safeCleanupUnreferencedBatchImages } from '@/lib/storage/mediaStorage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ batchId: string }> }
) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { batchId } = await context.params;
    const batch = getImportBatch(batchId);

    if (!batch) {
      return NextResponse.json(
        { success: false, error: `Batch "${batchId}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, batch });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ batchId: string }> }
) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { batchId } = await context.params;

    // Clean up unreferenced batch images safely (never deletes referenced assets)
    const cleanupResult = await safeCleanupUnreferencedBatchImages(batchId);

    return NextResponse.json({
      success: true,
      message: `Cleaned up unreferenced assets for batch ${batchId}.`,
      ...cleanupResult,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
