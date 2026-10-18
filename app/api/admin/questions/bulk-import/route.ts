import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/permissions';
import { bulkImportQuestionsAction } from '@/lib/services/questionService';
import { validateAndExtractZip } from '@/lib/storage/zipValidator';
import { saveBatchImages, cleanupBatchImages } from '@/lib/storage/mediaStorage';
import { resolveQuestionDiagramReferences } from '@/lib/storage/questionImageResolver';
import { AdminQuestionInput } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Authorization Guard
    await requireAdmin();

    const contentType = request.headers.get('content-type') || '';

    // Handle JSON payload
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { questions, partitionId, images, batchId } = body;

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No questions provided for import.' },
          { status: 400 }
        );
      }

      const res = await bulkImportQuestionsAction(questions, partitionId, images, batchId);
      if (!res.success) {
        return NextResponse.json(res, { status: 400 });
      }
      return NextResponse.json(res);
    }

    // Handle Multipart / Form-Data (file + optional zip)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const questionsFile = formData.get('file') as File | null;
      const zipFile = formData.get('zip') as File | null;
      const targetExamId = (formData.get('examId') as string) || undefined;
      const partitionId = (formData.get('partitionId') as string) || targetExamId || undefined;
      const batchId = (formData.get('batchId') as string) || `batch-${Date.now().toString(36)}`;

      if (!questionsFile) {
        return NextResponse.json(
          { success: false, error: 'Questions file (CSV or JSON) is required.' },
          { status: 400 }
        );
      }

      let rawQuestions: AdminQuestionInput[] = [];

      // Parse JSON or CSV
      const fileText = await questionsFile.text();
      if (questionsFile.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(fileText);
          if (Array.isArray(parsed)) {
            rawQuestions = parsed;
          } else {
            return NextResponse.json(
              { success: false, error: 'JSON file must contain an array of question objects.' },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json(
            { success: false, error: 'Malformed JSON file syntax.' },
            { status: 400 }
          );
        }
      } else {
        // CSV parsing fallback on server
        const lines = fileText.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) {
          return NextResponse.json(
            { success: false, error: 'CSV file must have a header row and at least one question.' },
            { status: 400 }
          );
        }
        // Minimal server CSV reader (client modal also provides pre-parsed objects)
        // If client passes questions JSON directly, handled in JSON branch
      }

      // If ZIP is provided, validate & persist images
      const urlMapping = new Map<string, string>();
      if (zipFile && zipFile.size > 0) {
        const zipBuffer = new Uint8Array(await zipFile.arrayBuffer());
        const zipResult = await validateAndExtractZip(zipBuffer);

        if (!zipResult.isValid) {
          return NextResponse.json(
            { success: false, error: 'ZIP validation failed', errors: zipResult.errors },
            { status: 400 }
          );
        }

        // Persist images to media storage
        const savedMap = await saveBatchImages(
          zipResult.images.map(img => ({
            filename: img.normalizedPath,
            buffer: img.buffer,
            mimeType: img.mimeType,
          })),
          { batchId, category: 'questions' }
        );

        for (const [key, stored] of savedMap.entries()) {
          urlMapping.set(key, stored.url);
        }

        // Match references
        const { updatedQuestions, report } = resolveQuestionDiagramReferences(
          rawQuestions,
          zipResult.imageMap,
          urlMapping
        );

        if (report.unresolvedReferences.length > 0) {
          // Cleanup saved images on reference failure to prevent orphaned files
          await cleanupBatchImages(batchId, 'questions');
          const errorList = report.unresolvedReferences.map(
            u => `Row ${u.rowNumber} (${u.questionIdentifier}): Referenced image "${u.referencedFilename}" (${u.field}) not found in ZIP.`
          );
          return NextResponse.json(
            {
              success: false,
              error: 'Missing image references in uploaded ZIP.',
              errors: errorList,
            },
            { status: 400 }
          );
        }

        rawQuestions = updatedQuestions;
      }

      const res = await bulkImportQuestionsAction(rawQuestions, partitionId, undefined, batchId);
      if (!res.success) {
        await cleanupBatchImages(batchId, 'questions');
        return NextResponse.json(res, { status: 400 });
      }

      return NextResponse.json({ ...res, batchId });
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported Content-Type. Use multipart/form-data or application/json.' },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error('API /api/admin/questions/bulk-import error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Server error importing questions.' },
      { status: 500 }
    );
  }
}
