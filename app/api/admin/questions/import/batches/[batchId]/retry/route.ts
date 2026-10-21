import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import { retryImportBatch } from '@/lib/services/importBatchService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ batchId: string }> }
) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const { batchId } = await context.params;
    const body = await request.json().catch(() => ({}));

    const result = await retryImportBatch(batchId, {
      duplicatePolicy: body.duplicatePolicy,
      allowDestructiveUpdates: body.allowDestructiveUpdates,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Batch retry error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retry import batch.',
      },
      { status: 500 }
    );
  }
}
