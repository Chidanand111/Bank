import { NextRequest, NextResponse } from 'next/server';
import { loadFreshQuestionsFromDb } from '@/lib/services/adminService';
import { partitionQuestionsList } from '@/lib/db/questionDb';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const freshQuestions = await loadFreshQuestionsFromDb();
    const questions = partitionQuestionsList(freshQuestions, testId);
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
