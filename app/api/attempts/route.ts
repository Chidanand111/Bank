import { NextRequest, NextResponse } from 'next/server';
import { saveAttemptAction, getAttemptByIdAction, getUserAttemptsAction } from '@/lib/services/attemptService';
import { AttemptResult } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AttemptResult;
    const res = await saveAttemptAction(body);

    if (!res.success) {
      let status = 400;
      if (res.error?.includes('Unauthorized')) {
        status = 401;
      } else if (res.error?.includes('Forbidden')) {
        status = 403;
      } else if (res.error?.includes('Duplicate submission')) {
        status = 409;
      } else if (res.error?.includes('Exam not found') || res.error?.includes('not found')) {
        status = 404;
      }
      return NextResponse.json(res, { status });
    }

    return NextResponse.json(res, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');

    if (attemptId) {
      const attempt = await getAttemptByIdAction(attemptId);
      if (!attempt) {
        return NextResponse.json({ success: false, error: 'Attempt not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, attempt }, { status: 200 });
    }

    const attempts = await getUserAttemptsAction();
    return NextResponse.json({ success: true, attempts }, { status: 200 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    const status = errorMsg.includes('Unauthorized')
      ? 401
      : errorMsg.includes('Access denied') || errorMsg.includes('Forbidden')
      ? 403
      : 500;
    return NextResponse.json({ success: false, error: errorMsg }, { status });
  }
}
