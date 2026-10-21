import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import { uploadQuestionDiagramAction } from '@/lib/services/questionService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const formData = await request.formData();
    const result = await uploadQuestionDiagramAction(formData);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('API /api/admin/media/upload error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to upload media file.' },
      { status: 500 }
    );
  }
}
