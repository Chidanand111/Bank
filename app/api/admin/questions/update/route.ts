import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/permissions';
import { updateQuestionAction } from '@/lib/services/adminService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
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
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
