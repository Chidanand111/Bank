/**
 * Persistent Import Batch Store & Lifecycle Manager (Phase 3)
 *
 * Implements a reliable, observable, and retryable lifecycle:
 * CREATED -> UPLOADING -> VALIDATING -> READY_FOR_REVIEW -> IMPORTING -> COMPLETED / FAILED / CANCELLED
 *
 * Persists batch metadata safely to filesystem (.storage/import_batches/{batchId}.json)
 * with an in-memory cache for fast lookups. No database schema migration needed.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

export type ImportBatchStatus =
  | 'CREATED'
  | 'UPLOADING'
  | 'VALIDATING'
  | 'READY_FOR_REVIEW'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type DuplicateActionPolicy = 'SKIP' | 'UPDATE' | 'REVIEW';

export interface RowError {
  row: number;
  questionText?: string;
  field?: string;
  message: string;
}

export interface DuplicateRecord {
  row: number;
  text: string;
  existingQuestionId: string;
  actionTaken: 'SKIPPED' | 'UPDATED' | 'REQUIRES_REVIEW';
}

export interface ImportBatchReport {
  totalRows: number;
  questionsCreated: number;
  questionsUpdated: number;
  duplicatesSkipped: number;
  duplicatesRequiringReview: number;
  invalidRowsCount: number;
  imageUploadFailuresCount: number;
  skippedRecordsCount: number;
  errors: RowError[];
  duplicates: DuplicateRecord[];
  skippedReasons: { row: number; reason: string }[];
  durationMs?: number;
}

export interface ImportBatchMetadata {
  id: string;
  status: ImportBatchStatus;
  filename?: string;
  partitionId?: string;
  examId?: string;
  duplicatePolicy: DuplicateActionPolicy;
  allowDestructiveUpdates: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  totalRows: number;
  processedRows: number;
  report: ImportBatchReport;
  uploadedImages: Record<string, string>; // original filename / normalized path -> stored public URL
  failedImages: string[];
  cancellationRequested?: boolean;
  diagnosticLogs: string[];
  // Raw questions cached for safe retry
  cachedQuestions?: any[];
}

// In-memory cache for high-speed synchronous access
const memoryBatchCache = new Map<string, ImportBatchMetadata>();

/**
 * Returns the directory path where batch JSON files are stored.
 */
export function getBatchStorageDirectory(): string {
  const dir = path.join(process.cwd(), '.storage', 'import_batches');
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch {
    // Fallback to true OS tmpdir if .storage cannot be created (e.g. serverless read-only /var/task)
    const tmpDir = path.join(os.tmpdir(), 'bankmock_batches');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch (tmpErr) {
      console.warn('[ImportBatchStore] Failed to create tmpDir fallback:', tmpErr);
    }
    return tmpDir;
  }
}

function getBatchFilePath(batchId: string): string {
  const safeId = batchId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(getBatchStorageDirectory(), `${safeId}.json`);
}

/**
 * Persists batch metadata to disk safely.
 */
function persistBatchToDisk(batch: ImportBatchMetadata): void {
  try {
    const filePath = getBatchFilePath(batch.id);
    const serialized = JSON.stringify(batch, null, 2);
    fs.writeFileSync(filePath, serialized, 'utf-8');
  } catch (err) {
    console.warn(`[ImportBatchStore] Failed to write batch ${batch.id} to disk:`, err);
  }
}

/**
 * Loads batch metadata from disk if not present in memory cache.
 */
function loadBatchFromDisk(batchId: string): ImportBatchMetadata | null {
  try {
    const filePath = getBatchFilePath(batchId);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data) as ImportBatchMetadata;
      memoryBatchCache.set(batchId, parsed);
      return parsed;
    }
  } catch (err) {
    console.warn(`[ImportBatchStore] Failed to read batch ${batchId} from disk:`, err);
  }
  return null;
}

/**
 * Creates and initializes a new Import Batch.
 */
export function createImportBatch(params: {
  batchId?: string;
  filename?: string;
  partitionId?: string;
  examId?: string;
  duplicatePolicy?: DuplicateActionPolicy;
  allowDestructiveUpdates?: boolean;
  totalRows?: number;
  cachedQuestions?: any[];
}): ImportBatchMetadata {
  const id = params.batchId || `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const newBatch: ImportBatchMetadata = {
    id,
    status: 'CREATED',
    filename: params.filename || 'import_questions.csv',
    partitionId: params.partitionId,
    examId: params.examId,
    duplicatePolicy: params.duplicatePolicy || 'SKIP',
    allowDestructiveUpdates: Boolean(params.allowDestructiveUpdates),
    createdAt: now,
    updatedAt: now,
    totalRows: params.totalRows || 0,
    processedRows: 0,
    report: {
      totalRows: params.totalRows || 0,
      questionsCreated: 0,
      questionsUpdated: 0,
      duplicatesSkipped: 0,
      duplicatesRequiringReview: 0,
      invalidRowsCount: 0,
      imageUploadFailuresCount: 0,
      skippedRecordsCount: 0,
      errors: [],
      duplicates: [],
      skippedReasons: [],
    },
    uploadedImages: {},
    failedImages: [],
    cancellationRequested: false,
    diagnosticLogs: [`[${now}] Batch ${id} initialized with status CREATED.`],
    cachedQuestions: params.cachedQuestions,
  };

  memoryBatchCache.set(id, newBatch);
  persistBatchToDisk(newBatch);
  return newBatch;
}

/**
 * Retrieves a batch by ID.
 */
export function getImportBatch(batchId: string): ImportBatchMetadata | null {
  if (memoryBatchCache.has(batchId)) {
    return memoryBatchCache.get(batchId)!;
  }
  return loadBatchFromDisk(batchId);
}

/**
 * Updates the lifecycle status of an import batch.
 */
export function updateBatchStatus(
  batchId: string,
  newStatus: ImportBatchStatus,
  details?: {
    logMessage?: string;
    completedAt?: string;
  }
): ImportBatchMetadata | null {
  const batch = getImportBatch(batchId);
  if (!batch) return null;

  batch.status = newStatus;
  batch.updatedAt = new Date().toISOString();
  if (details?.completedAt) {
    batch.completedAt = details.completedAt;
  }

  const logEntry = `[${batch.updatedAt}] Transitioned status to ${newStatus}.${details?.logMessage ? ` ${details.logMessage}` : ''}`;
  batch.diagnosticLogs.push(logEntry);

  memoryBatchCache.set(batchId, batch);
  persistBatchToDisk(batch);
  return batch;
}

/**
 * Records progress and incremental report changes during chunked processing.
 */
export function recordBatchProgress(
  batchId: string,
  update: {
    processedDelta?: number;
    createdDelta?: number;
    updatedDelta?: number;
    duplicatesSkippedDelta?: number;
    duplicatesReviewDelta?: number;
    newErrors?: RowError[];
    newDuplicates?: DuplicateRecord[];
    newSkipped?: { row: number; reason: string }[];
    newLog?: string;
  }
): ImportBatchMetadata | null {
  const batch = getImportBatch(batchId);
  if (!batch) return null;

  if (update.processedDelta) batch.processedRows += update.processedDelta;
  if (update.createdDelta) batch.report.questionsCreated += update.createdDelta;
  if (update.updatedDelta) batch.report.questionsUpdated += update.updatedDelta;
  if (update.duplicatesSkippedDelta) batch.report.duplicatesSkipped += update.duplicatesSkippedDelta;
  if (update.duplicatesReviewDelta) batch.report.duplicatesRequiringReview += update.duplicatesReviewDelta;

  if (update.newErrors && update.newErrors.length > 0) {
    batch.report.errors.push(...update.newErrors);
    batch.report.invalidRowsCount = batch.report.errors.length;
  }

  if (update.newDuplicates && update.newDuplicates.length > 0) {
    batch.report.duplicates.push(...update.newDuplicates);
  }

  if (update.newSkipped && update.newSkipped.length > 0) {
    batch.report.skippedReasons.push(...update.newSkipped);
    batch.report.skippedRecordsCount = batch.report.skippedReasons.length;
  }

  batch.updatedAt = new Date().toISOString();
  if (update.newLog) {
    batch.diagnosticLogs.push(`[${batch.updatedAt}] ${update.newLog}`);
  }

  memoryBatchCache.set(batchId, batch);
  persistBatchToDisk(batch);
  return batch;
}

/**
 * Registers an uploaded image mapping for a batch.
 */
export function registerBatchImage(
  batchId: string,
  filename: string,
  storedUrl: string
): void {
  const batch = getImportBatch(batchId);
  if (!batch) return;

  batch.uploadedImages[filename.toLowerCase()] = storedUrl;
  batch.updatedAt = new Date().toISOString();
  persistBatchToDisk(batch);
}

/**
 * Records failed image uploads.
 */
export function recordFailedImage(batchId: string, filename: string): void {
  const batch = getImportBatch(batchId);
  if (!batch) return;

  if (!batch.failedImages.includes(filename)) {
    batch.failedImages.push(filename);
    batch.report.imageUploadFailuresCount = batch.failedImages.length;
  }
  batch.updatedAt = new Date().toISOString();
  persistBatchToDisk(batch);
}

/**
 * Requests cancellation of a batch.
 */
export function requestBatchCancellation(batchId: string): boolean {
  const batch = getImportBatch(batchId);
  if (!batch) return false;

  if (batch.status === 'COMPLETED' || batch.status === 'CANCELLED') {
    return false;
  }

  batch.cancellationRequested = true;
  batch.status = 'CANCELLED';
  batch.updatedAt = new Date().toISOString();
  batch.diagnosticLogs.push(`[${batch.updatedAt}] Cancellation requested by admin.`);

  memoryBatchCache.set(batchId, batch);
  persistBatchToDisk(batch);
  return true;
}

/**
 * Checks whether cancellation has been requested for a running batch.
 */
export function isBatchCancelled(batchId: string): boolean {
  const batch = getImportBatch(batchId);
  return Boolean(batch?.cancellationRequested || batch?.status === 'CANCELLED');
}

/**
 * Lists recent batches sorted by creation date descending.
 */
export function listImportBatches(limit = 20): ImportBatchMetadata[] {
  const dir = getBatchStorageDirectory();
  const batches: ImportBatchMetadata[] = [];

  try {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const content = fs.readFileSync(/*turbopackIgnore: true*/ (path.join as any)(/*turbopackIgnore: true*/ dir, file), 'utf-8');
          const batch = JSON.parse(content) as ImportBatchMetadata;
          batches.push(batch);
        } catch {
          // Ignore corrupt individual file
        }
      }
    }
  } catch (err) {
    console.warn('[ImportBatchStore] Failed to list batches:', err);
  }

  // Merge in-memory cache
  for (const [id, batch] of memoryBatchCache.entries()) {
    if (!batches.some(b => b.id === id)) {
      batches.push(batch);
    }
  }

  batches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return batches.slice(0, limit);
}
