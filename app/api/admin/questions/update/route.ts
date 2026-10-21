import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import { updateQuestionAction } from '@/lib/services/adminService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { questionId, inputData } = body;
    if (!questionId || !inputData) {
      return NextResponse.json({ success: false, error: 'Missing questionId or inputData' }, { status: 400 });
    }
    const res = await updateQuestionAction(questionId, inputData);
    if (!res.success) {
      return NextResponse.json(res, { status: 400 });
    }
    return NextResponse.json(res);
  } catch (error) {
    console.error('API updateQuestion error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
