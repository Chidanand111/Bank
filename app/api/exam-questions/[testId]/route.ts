import { NextRequest, NextResponse } from 'next/server';
import { getLiveExamQuestionsAction } from '@/lib/services/adminService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const questions = await getLiveExamQuestionsAction(testId);
    return NextResponse.json({ success: true, questions }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Failed to fetch exam questions:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
