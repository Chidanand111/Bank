import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/crypto';
import { SESSION_COOKIE_NAME, findDatabaseUserById } from '@/lib/auth/session';
import { getLiveExamQuestionsAction } from '@/lib/services/adminService';
import { toStudentSafeQuestions } from '@/lib/utils/questionDto';
import { prisma } from '@/lib/prisma';
import { MOCK_TESTS_DATA } from '@/lib/data/mockTests';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;

    // 1. Double-Layer Defense: Server-Side Authentication
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const payload = await verifySession(sessionToken);
    if (!payload) {
      const res = NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or expired session.' },
        { status: 401 }
      );
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    // 2. Canonical DB User and Account-Status Check
    const dbUser = await findDatabaseUserById(payload.userId);
    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: User account not found.' },
        { status: 401 }
      );
    }

    const userStatus = dbUser.status || payload.status || 'APPROVED';
    if (userStatus !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Account approval required.' },
        { status: 403 }
      );
    }

    const isAdmin = dbUser.role === 'ADMIN';

    // 3. Mock Test and Parent Exam Publication Check
    let isUnpublished = false;
    try {
      const dbMockTest = await prisma.mockTest.findFirst({
        where: {
          OR: [
            { id: testId },
            { slug: testId },
            { slug: testId.replace(/^mock-/, '') },
          ],
        },
        include: {
          exam: true,
        },
      });

      if (dbMockTest) {
        if ((dbMockTest as any).status === 'created' || (dbMockTest as any).isPublished === false) {
          isUnpublished = true;
        }
        if (dbMockTest.exam && (dbMockTest.exam as any).status === 'created') {
          isUnpublished = true;
        }
      } else {
        const staticTest = MOCK_TESTS_DATA.find(t => t.id === testId || t.slug === testId);
        if (staticTest && (staticTest as any).status === 'created') {
          isUnpublished = true;
        }
      }
    } catch (err) {
      console.warn('Error checking mock test publication status in route handler:', err);
    }

    if (isUnpublished && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: This mock test is unpublished and only accessible to administrators.',
        },
        { status: 403 }
      );
    }

    // 4. Load questions
    const rawQuestions = await getLiveExamQuestionsAction(testId);

    // 5. Enforce Student-Safe DTO for Non-Admin Candidates
    const finalQuestions = isAdmin
      ? rawQuestions
      : toStudentSafeQuestions(rawQuestions);

    return NextResponse.json(
      { success: true, questions: finalQuestions },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('Access restricted') || errorMsg.includes('unpublished')) {
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 403 }
      );
    }

    console.error('Failed to fetch exam questions:', error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
