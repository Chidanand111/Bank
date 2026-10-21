import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import { listImportBatches, createImportBatch } from '@/lib/storage/importBatchStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const batches = listImportBatches(50);
    return NextResponse.json({ success: true, batches });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }
    const body = await request.json().catch(() => ({}));
    const newBatch = createImportBatch({
      batchId: body.batchId,
      filename: body.filename,
      partitionId: body.partitionId,
      examId: body.examId,
      duplicatePolicy: body.duplicatePolicy,
      allowDestructiveUpdates: body.allowDestructiveUpdates,
      totalRows: body.totalRows,
      cachedQuestions: body.questions,
    });

    return NextResponse.json({ success: true, batch: newBatch });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to create import batch' },
      { status: 500 }
    );
  }
}
