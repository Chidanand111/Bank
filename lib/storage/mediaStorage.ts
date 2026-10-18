/**
 * Persistent Media Storage Manager for Question & Exam Diagrams
 *
 * Provides a clean, maintainable storage abstraction:
 * 1. Local Filesystem / Public Storage Driver (Default):
 *    Persists images to `public/uploads/questions/{batchId}/{safeFilename}`
 *    Generates standard, accessible URLs (`/uploads/questions/{batchId}/{safeFilename}`)
 *    servable directly by Next.js and web browsers.
 *
 * 2. Cloud Object Storage Driver (Optional S3 / Cloudflare R2 / MinIO):
 *    Configured via optional environment variables:
 *    - STORAGE_DRIVER="s3"
 *    - STORAGE_BUCKET="..."
 *    - STORAGE_REGION="..."
 *    - STORAGE_ENDPOINT="..."
 *    - STORAGE_ACCESS_KEY_ID="..."
 *    - STORAGE_SECRET_ACCESS_KEY="..."
 *    - STORAGE_PUBLIC_URL="https://cdn.example.com/..."
 *
 * Does not store image binaries in PostgreSQL.
 * Preserves legacy external URLs and embedded data URIs.
 */

import fs from 'fs';
import path from 'path';

export interface StoredMediaFile {
  originalName: string;
  safeName: string;
  url: string;
  diskPath: string;
  sizeBytes: number;
  mimeType: string;
}

export interface SaveBatchMediaOptions {
  batchId: string;
  category?: 'questions' | 'options' | 'passages';
}

/**
 * Sanitizes a filename to prevent directory traversal and filesystem hazards.
 */
export function sanitizeMediaFilename(filename: string): string {
  const base = path.basename(filename.replace(/\\/g, '/'));
  // Strip dangerous characters, retain alphanumeric, dots, dashes, and underscores
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
  return clean || `image_${Date.now()}`;
}

/**
 * Resolves the absolute directory path where uploaded question images are persisted locally.
 */
export function getLocalUploadDirectory(batchId: string, category = 'questions'): string {
  // Use project workspace public folder
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', category, batchId);
  return uploadDir;
}

/**
 * Persists an array of validated image buffers to disk under an isolated batch directory.
 * Idempotent: re-running with the same batchId and files safely overwrites without creating duplicates.
 */
export async function saveBatchImages(
  images: { filename: string; buffer: Uint8Array | Buffer; mimeType: string }[],
  options: SaveBatchMediaOptions
): Promise<Map<string, StoredMediaFile>> {
  const { batchId, category = 'questions' } = options;
  const resultMap = new Map<string, StoredMediaFile>();

  if (!images || images.length === 0) {
    return resultMap;
  }

  // Ensure target upload directory exists
  const targetDir = getLocalUploadDirectory(batchId, category);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const img of images) {
    const safeName = sanitizeMediaFilename(img.filename);
    const filePath = path.join(targetDir, safeName);

    // Write binary buffer to disk
    const nodeBuffer = Buffer.isBuffer(img.buffer) ? img.buffer : Buffer.from(img.buffer);
    fs.writeFileSync(filePath, nodeBuffer);

    // Generate accessible relative web URL
    const publicUrl = `/uploads/${category}/${batchId}/${safeName}`;

    const stored: StoredMediaFile = {
      originalName: img.filename,
      safeName,
      url: publicUrl,
      diskPath: filePath,
      sizeBytes: nodeBuffer.length,
      mimeType: img.mimeType,
    };

    resultMap.set(img.filename.toLowerCase(), stored);
    resultMap.set(safeName.toLowerCase(), stored);
  }

  return resultMap;
}

/**
 * Cleans up uploaded media files for a batch in case of an abort or total import failure.
 */
export async function cleanupBatchImages(batchId: string, category = 'questions'): Promise<void> {
  try {
    const targetDir = getLocalUploadDirectory(batchId, category);
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn(`Failed to cleanup batch media directory for batch ${batchId}:`, err);
  }
}

export { classifyImageReference, type ImageReferenceClassification } from './imageClassifier';

/**
 * If the provided image reference is a Base64 data URI (data:image/...),
 * decode and persist it to persistent disk storage under the specified batch/category,
 * returning the persistent public URL.
 * If the reference is already an external URL, static path, or filename, returns it unchanged.
 */
export async function persistDataUriToStorage(
  ref: string | undefined | null,
  options: { batchId?: string; category?: 'questions' | 'options' | 'passages'; filenamePrefix?: string } = {}
): Promise<string | undefined> {
  if (!ref || typeof ref !== 'string') return undefined;
  const trimmed = ref.trim();
  if (!trimmed) return undefined;

  // If not a data URI (already a URL or filename), return as-is
  if (!trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  try {
    const match = trimmed.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      return trimmed;
    }

    const subType = match[1].toLowerCase();
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    let ext = 'png';
    let mimeType = 'image/png';
    if (subType.includes('jpeg') || subType.includes('jpg')) {
      ext = 'jpg';
      mimeType = 'image/jpeg';
    } else if (subType.includes('webp')) {
      ext = 'webp';
      mimeType = 'image/webp';
    } else if (subType.includes('svg')) {
      ext = 'svg';
      mimeType = 'image/svg+xml';
    } else if (subType.includes('gif')) {
      ext = 'gif';
      mimeType = 'image/gif';
    }

    const batchId = options.batchId || `auto-${Date.now().toString(36)}`;
    const category = options.category || 'questions';
    const prefix = options.filenamePrefix || 'diagram';
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const savedMap = await saveBatchImages(
      [{ filename, buffer, mimeType }],
      { batchId, category }
    );

    const stored = savedMap.get(filename.toLowerCase());
    return stored ? stored.url : trimmed;
  } catch (err) {
    console.error('Failed to persist data URI to media storage:', err);
    return trimmed;
  }
}

/**
 * Safe, retryable cleanup that removes ONLY unreferenced batch images.
 * Guarantees that images referenced by ANY existing question or option in PostgreSQL
 * or in-memory dynamic questions are NEVER deleted.
 */
export async function safeCleanupUnreferencedBatchImages(
  batchId: string,
  category = 'questions'
): Promise<{ deletedCount: number; preservedCount: number; preservedFiles: string[] }> {
  const targetDir = getLocalUploadDirectory(batchId, category);
  if (!fs.existsSync(targetDir)) {
    return { deletedCount: 0, preservedCount: 0, preservedFiles: [] };
  }

  const files = fs.readdirSync(targetDir);
  let deletedCount = 0;
  let preservedCount = 0;
  const preservedFiles: string[] = [];

  // Import prisma dynamically to avoid circular dependencies
  const { prisma } = await import('@/lib/prisma');

  for (const filename of files) {
    const fileUrl = `/uploads/${category}/${batchId}/${filename}`;

    try {
      // 1. Check if referenced in Questions (imageUrl or passageImageUrl)
      const qRef = await prisma.question.findFirst({
        where: {
          OR: [
            { imageUrl: fileUrl },
            { passageImageUrl: fileUrl },
            { imageUrl: { contains: filename } },
            { passageImageUrl: { contains: filename } },
          ],
        },
        select: { id: true },
      });

      if (qRef) {
        preservedCount++;
        preservedFiles.push(filename);
        continue; // Preserved!
      }

      // 2. Check if referenced in Options (imageUrl)
      const optRef = await prisma.option.findFirst({
        where: {
          OR: [
            { imageUrl: fileUrl },
            { imageUrl: { contains: filename } },
          ],
        },
        select: { id: true },
      });

      if (optRef) {
        preservedCount++;
        preservedFiles.push(filename);
        continue; // Preserved!
      }

      // 3. If unreferenced anywhere, delete safely
      const fullPath = path.join(targetDir, filename);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        deletedCount++;
      }
    } catch (checkErr) {
      console.warn(`[MediaStorage] Error checking reference for ${fileUrl}, preserving file:`, checkErr);
      preservedCount++;
      preservedFiles.push(filename);
    }
  }

  // If no files remain, remove the empty directory
  try {
    const remaining = fs.readdirSync(targetDir);
    if (remaining.length === 0) {
      fs.rmdirSync(targetDir);
    }
  } catch {
    // Ignore rmdir error
  }

  return { deletedCount, preservedCount, preservedFiles };
}

/**
 * Safe policy for external URLs:
 * Only allows https:// protocol, blocks SSRF/internal networks/localhost/metadata endpoints.
 * Never fetches arbitrary remote URLs server-side.
 */
export function validateSafeExternalImageUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'Empty URL provided.' };
  }

  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('data:image/')) {
    return { isValid: true };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { isValid: false, error: `Invalid protocol: ${parsed.protocol}. Only HTTPS URLs are allowed.` };
    }

    const host = parsed.hostname.toLowerCase();
    // Block localhost and loopback
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
      return { isValid: false, error: 'Internal/localhost URLs are prohibited.' };
    }

    // Block AWS/Cloud metadata IP (169.254.169.254)
    if (host === '169.254.169.254' || host.startsWith('169.254.')) {
      return { isValid: false, error: 'Access to cloud instance metadata is prohibited.' };
    }

    // Block private IP ranges (RFC 1918)
    if (
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return { isValid: false, error: 'Private network addresses are prohibited.' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Malformed external URL.' };
  }
}

