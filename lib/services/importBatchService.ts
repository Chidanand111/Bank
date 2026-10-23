/**
 * Bounded & Resilient Import Batch Service (Phase 3)
 *
 * Implements:
 * 1. Bounded resource processing (chunked question execution, no unbounded Promise.all).
 * 2. Idempotency & duplicate review policy (stable identifiers, explicit update consent).
 * 3. Failure recovery & safe retry without question duplication.
 * 4. Image reference validation (failed image upload never silently creates a broken question).
 * 5. Safe cleanup that never deletes referenced assets.
 */

import { AdminQuestionInput } from '@/types';
import { requireAdmin } from '@/lib/auth/permissions';
import { prisma } from '@/lib/prisma';
import {
  getImportBatch,
  createImportBatch,
  updateBatchStatus,
  recordBatchProgress,
  isBatchCancelled,
  ImportBatchMetadata,
  ImportBatchReport,
  RowError,
  DuplicateRecord,
  DuplicateActionPolicy,
} from '@/lib/storage/importBatchStore';
import {
  classifyImageReference,
  validateSafeExternalImageUrl,
  safeCleanupUnreferencedBatchImages,
} from '@/lib/storage/mediaStorage';
import { createQuestionAction, updateQuestionAction } from './questionService';
import { safeRevalidatePath } from './common';
import { invalidateQuestionsCache } from '../cache';

export interface ChunkedImportParams {
  batchId?: string;
  questions: AdminQuestionInput[];
  partitionId?: string;
  chunkSize?: number;
  duplicatePolicy?: DuplicateActionPolicy;
  allowDestructiveUpdates?: boolean;
  imageMapping?: Record<string, string>;
  filename?: string;
}

/**
 * Executes a resilient, chunked import of questions within bounded resource limits.
 */
export async function executeResilientImport(
  params: ChunkedImportParams
): Promise<{ success: boolean; batch: ImportBatchMetadata; report: ImportBatchReport; error?: string }> {
  // 1. Authorization Guard
  try {
    await requireAdmin();
  } catch (authErr: any) {
    if (authErr?.message === 'NEXT_REDIRECT' || authErr?.digest?.startsWith('NEXT_REDIRECT')) {
      throw new Error('Unauthorized: Admin session expired. Please log in.');
    }
    throw authErr;
  }

  const {
    questions,
    partitionId,
    chunkSize = 15, // Process in bounded chunks of 15 to respect Neon DB limits
    duplicatePolicy = 'SKIP',
    allowDestructiveUpdates = false,
    imageMapping = {},
    filename = 'import.csv',
  } = params;

  if (!questions || questions.length === 0) {
    throw new Error('No questions provided for import.');
  }

  const activeBatchId =
    params.batchId || `import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  // 2. Idempotency & Repeated Submission Check
  let batch = getImportBatch(activeBatchId);
  if (batch) {
    if (batch.status === 'IMPORTING') {
      return {
        success: false,
        batch,
        report: batch.report,
        error: `Import batch "${activeBatchId}" is currently in progress. Repeated submission ignored.`,
      };
    }
    if (batch.status === 'COMPLETED') {
      return {
        success: true,
        batch,
        report: batch.report,
      };
    }
  } else {
    batch = createImportBatch({
      batchId: activeBatchId,
      filename,
      partitionId,
      duplicatePolicy,
      allowDestructiveUpdates,
      totalRows: questions.length,
      cachedQuestions: questions,
    });
  }

  // Transition to IMPORTING
  updateBatchStatus(activeBatchId, 'IMPORTING', {
    logMessage: `Starting bounded chunk processing (${questions.length} rows, chunk size: ${chunkSize}).`,
  });

  const startTime = Date.now();

  // Merge any passed imageMapping into batch record
  for (const [key, url] of Object.entries(imageMapping)) {
    batch.uploadedImages[key.toLowerCase()] = url;
  }

  // Pre-resolve partitionId
  let resolvedExamId: string | undefined = undefined;
  let resolvedMockTestId: string | undefined = undefined;

  if (partitionId && partitionId !== 'ALL') {
    const cleanSlug = partitionId.replace(/^(exam|mock)-/, '');
    try {
      const dbExam = await prisma.exam.findFirst({
        where: {
          OR: [
            { id: partitionId },
            { slug: partitionId },
            { slug: cleanSlug },
            { id: `exam-${cleanSlug}` },
          ],
        },
      });

      if (dbExam) {
        resolvedExamId = dbExam.id;
      } else {
        const dbMock = await prisma.mockTest.findFirst({
          where: {
            OR: [
              { id: partitionId },
              { slug: partitionId },
              { slug: cleanSlug },
              { id: `mock-${cleanSlug}` },
            ],
          },
        });
        if (dbMock) {
          resolvedMockTestId = dbMock.id;
          resolvedExamId = dbMock.examId;
        }
      }
    } catch (partitionErr) {
      console.warn('[executeResilientImport] Partition resolution DB warning:', partitionErr);
    }
  }

  // 3. Process questions in bounded chunks
  const totalQuestions = questions.length;
  let currentIdx = 0;

  while (currentIdx < totalQuestions) {
    // Check for cancellation before processing chunk
    if (isBatchCancelled(activeBatchId)) {
      updateBatchStatus(activeBatchId, 'CANCELLED', {
        logMessage: `Import cancelled at row ${currentIdx + 1} of ${totalQuestions}.`,
      });
      await safeCleanupUnreferencedBatchImages(activeBatchId);
      const updated = getImportBatch(activeBatchId)!;
      return { success: false, batch: updated, report: updated.report, error: 'Import was cancelled by admin.' };
    }

    const chunkEnd = Math.min(currentIdx + chunkSize, totalQuestions);
    const chunk = questions.slice(currentIdx, chunkEnd);

    const chunkErrors: RowError[] = [];
    const chunkDuplicates: DuplicateRecord[] = [];
    const chunkSkipped: { row: number; reason: string }[] = [];
    let chunkCreated = 0;
    let chunkUpdated = 0;
    let chunkDupSkipped = 0;
    let chunkDupReview = 0;

    for (let i = 0; i < chunk.length; i++) {
      const globalIdx = currentIdx + i;
      const rowNum = globalIdx + 1;
      const qInput = chunk[i];

      try {
        // A. Basic Validation
        if (!qInput.text || !qInput.text.trim()) {
          chunkErrors.push({ row: rowNum, message: 'Question statement is empty.' });
          continue;
        }

        if (!qInput.options || qInput.options.length < 2) {
          chunkErrors.push({ row: rowNum, message: 'Question must have at least 2 options.' });
          continue;
        }

        if (!qInput.options.some((o) => o.isCorrect)) {
          chunkErrors.push({ row: rowNum, message: 'At least one option must be marked as correct.' });
          continue;
        }

        const deterministicId = qInput.id || `q-${activeBatchId}-${rowNum}`;

        // B. Retry / Idempotency Check (Does this exact question from this batch already exist in DB?)
        let existingInBatch: { id: string } | null = null;
        try {
          existingInBatch = await prisma.question.findUnique({
            where: { id: deterministicId },
            select: { id: true },
          });
        } catch {
          existingInBatch = null;
        }

        if (existingInBatch) {
          // Already created in a prior run of this batch! Skip safely without re-inserting
          chunkCreated++; // Count as existing successfully
          continue;
        }

        // C. Duplicate Detection Strategy (Does a question with identical text already exist in exam/section?)
        const targetExam = resolvedExamId || qInput.examId || 'exam-ibps-po';
        let existingDup: any = null;
        if (typeof prisma?.question?.findFirst === 'function') {
          try {
            existingDup = await prisma.question.findFirst({
              where: {
                text: qInput.text.trim(),
                section: { code: qInput.sectionCode },
              },
              select: { id: true, text: true },
            });
          } catch {
            existingDup = null;
          }
        }

        if (existingDup) {
          if (duplicatePolicy === 'SKIP') {
            chunkDupSkipped++;
            chunkDuplicates.push({
              row: rowNum,
              text: qInput.text.slice(0, 80),
              existingQuestionId: existingDup.id,
              actionTaken: 'SKIPPED',
            });
            continue;
          } else if (duplicatePolicy === 'UPDATE' && allowDestructiveUpdates) {
            // Explicit admin intent to update
            const updateRes = await updateQuestionAction(existingDup.id, {
              ...qInput,
              examId: targetExam,
            });

            if (updateRes.success) {
              chunkUpdated++;
              chunkDuplicates.push({
                row: rowNum,
                text: qInput.text.slice(0, 80),
                existingQuestionId: existingDup.id,
                actionTaken: 'UPDATED',
              });
              continue;
            } else {
              chunkErrors.push({ row: rowNum, message: `Failed to update duplicate: ${updateRes.error}` });
              continue;
            }
          } else {
            // REVIEW mode
            chunkDupReview++;
            chunkDuplicates.push({
              row: rowNum,
              text: qInput.text.slice(0, 80),
              existingQuestionId: existingDup.id,
              actionTaken: 'REQUIRES_REVIEW',
            });
            continue;
          }
        }

        // D. Image Reference Resolution & Broken Image Prevention
        // Acceptance Criterion 2: "A failed image upload cannot silently produce a broken question."
        let resolvedQImg = qInput.imageUrl?.trim() || undefined;
        let resolvedPImg = qInput.passageImageUrl?.trim() || undefined;

        if (resolvedQImg) {
          const refType = classifyImageReference(resolvedQImg);
          if (refType === 'FILENAME') {
            const clean = resolvedQImg.toLowerCase().replace(/\\/g, '/');
            const base = clean.split('/').pop() || clean;
            const mapped = batch.uploadedImages[clean] || batch.uploadedImages[base];

            if (!mapped) {
              // Image referenced but not uploaded / missing!
              chunkErrors.push({
                row: rowNum,
                field: 'imageUrl',
                message: `Referenced image "${resolvedQImg}" was not uploaded or failed validation. Question skipped to prevent broken rendering.`,
              });
              continue;
            }
            resolvedQImg = mapped;
          } else if (refType === 'URL') {
            const urlCheck = validateSafeExternalImageUrl(resolvedQImg);
            if (!urlCheck.isValid) {
              chunkErrors.push({ row: rowNum, field: 'imageUrl', message: urlCheck.error || 'Invalid external image URL.' });
              continue;
            }
          }
        }

        if (resolvedPImg) {
          const refType = classifyImageReference(resolvedPImg);
          if (refType === 'FILENAME') {
            const clean = resolvedPImg.toLowerCase().replace(/\\/g, '/');
            const base = clean.split('/').pop() || clean;
            const mapped = batch.uploadedImages[clean] || batch.uploadedImages[base];

            if (!mapped) {
              chunkErrors.push({
                row: rowNum,
                field: 'passageImageUrl',
                message: `Referenced passage diagram "${resolvedPImg}" was not uploaded or failed validation. Question skipped to prevent broken rendering.`,
              });
              continue;
            }
            resolvedPImg = mapped;
          } else if (refType === 'URL') {
            const urlCheck = validateSafeExternalImageUrl(resolvedPImg);
            if (!urlCheck.isValid) {
              chunkErrors.push({ row: rowNum, field: 'passageImageUrl', message: urlCheck.error || 'Invalid external image URL.' });
              continue;
            }
          }
        }

        // Resolve option images
        let hasOptionImageError = false;
        const resolvedOptions = qInput.options.map((opt, oIdx) => {
          let optImg = opt.imageUrl?.trim() || undefined;
          if (optImg) {
            const refType = classifyImageReference(optImg);
            if (refType === 'FILENAME') {
              const clean = optImg.toLowerCase().replace(/\\/g, '/');
              const base = clean.split('/').pop() || clean;
              const mapped = batch.uploadedImages[clean] || batch.uploadedImages[base];
              if (!mapped) {
                chunkErrors.push({
                  row: rowNum,
                  field: `options[${oIdx}].imageUrl`,
                  message: `Referenced option diagram "${optImg}" was not uploaded. Question skipped to prevent broken rendering.`,
                });
                hasOptionImageError = true;
              } else {
                optImg = mapped;
              }
            }
          }
          return { ...opt, imageUrl: optImg };
        });

        if (hasOptionImageError) {
          continue;
        }

        // E. Persist Question to Database
        const inputToPersist: AdminQuestionInput = {
          ...qInput,
          examId: resolvedExamId || qInput.examId,
          mockTestId: resolvedMockTestId || qInput.mockTestId,
          imageUrl: resolvedQImg,
          passageImageUrl: resolvedPImg,
          options: resolvedOptions,
        };

        const createRes = await createQuestionAction(inputToPersist, deterministicId);
        if (createRes.success) {
          chunkCreated++;
        } else {
          chunkErrors.push({
            row: rowNum,
            message: createRes.error || 'Database error creating question record.',
          });
        }
      } catch (rowErr) {
        chunkErrors.push({
          row: rowNum,
          message: rowErr instanceof Error ? rowErr.message : 'Unexpected row processing error.',
        });
      }
    }

    // Record progress for this chunk
    recordBatchProgress(activeBatchId, {
      processedDelta: chunk.length,
      createdDelta: chunkCreated,
      updatedDelta: chunkUpdated,
      duplicatesSkippedDelta: chunkDupSkipped,
      duplicatesReviewDelta: chunkDupReview,
      newErrors: chunkErrors,
      newDuplicates: chunkDuplicates,
      newSkipped: chunkSkipped,
      newLog: `Processed rows ${currentIdx + 1} to ${chunkEnd} (Created: ${chunkCreated}, Updated: ${chunkUpdated}, Duplicates: ${chunkDupSkipped + chunkDupReview}, Errors: ${chunkErrors.length}).`,
    });

    currentIdx = chunkEnd;
  }

  // 4. Finalize Batch State & Reporting
  let finalBatch = getImportBatch(activeBatchId);
  if (!finalBatch) {
    finalBatch = createImportBatch({
      batchId: activeBatchId,
      filename,
      partitionId,
      duplicatePolicy,
      allowDestructiveUpdates,
      totalRows: questions.length,
    });
  }
  finalBatch.report.durationMs = Date.now() - startTime;

  const totalErrors = finalBatch.report.errors.length;
  const totalCreated = finalBatch.report.questionsCreated;

  if (totalErrors > 0) {
    updateBatchStatus(activeBatchId, 'FAILED', {
      logMessage: `Import finished with ${totalErrors} errors (${totalCreated} created, ${finalBatch.report.questionsUpdated} updated).`,
      completedAt: new Date().toISOString(),
    });
  } else {
    updateBatchStatus(activeBatchId, 'COMPLETED', {
      logMessage: `Import completed successfully. Created: ${totalCreated}, Updated: ${finalBatch.report.questionsUpdated}.`,
      completedAt: new Date().toISOString(),
    });
  }

  safeRevalidatePath('/admin/questions');
  safeRevalidatePath('/admin');
  await invalidateQuestionsCache();

  return {
    success: totalErrors === 0 && (totalCreated > 0 || finalBatch.report.questionsUpdated > 0),
    batch: finalBatch,
    report: finalBatch.report,
    error: totalErrors > 0 ? `${totalErrors} question rows failed during import.` : undefined,
  };
}

/**
 * Retries a failed or partially completed import batch.
 * Re-uses deterministic IDs to prevent duplicate question creation.
 */
export async function retryImportBatch(
  batchId: string,
  overrides: {
    duplicatePolicy?: DuplicateActionPolicy;
    allowDestructiveUpdates?: boolean;
  } = {}
): Promise<{ success: boolean; batch: ImportBatchMetadata; report: ImportBatchReport; error?: string }> {
  try {
    await requireAdmin();
  } catch (authErr: any) {
    if (authErr?.message === 'NEXT_REDIRECT' || authErr?.digest?.startsWith('NEXT_REDIRECT')) {
      throw new Error('Unauthorized: Admin session expired. Please log in.');
    }
    throw authErr;
  }

  const batch = getImportBatch(batchId);
  if (!batch) {
    throw new Error(`Batch "${batchId}" not found for retry.`);
  }

  if (batch.status === 'IMPORTING') {
    throw new Error(`Batch "${batchId}" is currently running. Please wait for it to finish.`);
  }

  if (!batch.cachedQuestions || batch.cachedQuestions.length === 0) {
    throw new Error(`Batch "${batchId}" does not contain cached questions for retry.`);
  }

  // Clear previous errors and reset counters for retry attempt
  batch.report.errors = [];
  batch.report.invalidRowsCount = 0;
  batch.report.questionsCreated = 0;
  batch.report.questionsUpdated = 0;
  batch.report.duplicatesSkipped = 0;
  batch.report.duplicatesRequiringReview = 0;
  batch.report.skippedRecordsCount = 0;
  batch.report.skippedReasons = [];
  batch.processedRows = 0;
  batch.status = 'READY_FOR_REVIEW';
  batch.cancellationRequested = false;
  batch.diagnosticLogs.push(`[${new Date().toISOString()}] Initiating retry for batch ${batchId}.`);

  return executeResilientImport({
    batchId,
    questions: batch.cachedQuestions,
    partitionId: batch.partitionId,
    duplicatePolicy: overrides.duplicatePolicy || batch.duplicatePolicy,
    allowDestructiveUpdates: overrides.allowDestructiveUpdates ?? batch.allowDestructiveUpdates,
    imageMapping: batch.uploadedImages,
    filename: batch.filename,
  });
}
