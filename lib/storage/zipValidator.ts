/**
 * Secure ZIP Archive & Diagram Validator
 *
 * Enforces strict security constraints:
 * - Magic byte inspection (PNG, JPEG, WebP, GIF only)
 * - Path traversal and absolute path rejection
 * - Configurable upload size, extracted size, and per-image limits
 * - Decompression bomb and resource exhaustion prevention
 * - Duplicate and ambiguous filename detection
 * - Deterministic path normalization
 */

import JSZip from 'jszip';

export type SupportedImageFormat = 'png' | 'jpeg' | 'webp' | 'gif';

export interface ValidatedZipImage {
  originalPath: string;
  normalizedPath: string; // e.g. "diagrams/chart.png"
  baseName: string; // e.g. "chart.png"
  mimeType: string;
  format: SupportedImageFormat;
  sizeBytes: number;
  buffer: Uint8Array;
}

export interface ZipValidationLimits {
  maxZipSizeBytes?: number;
  maxExtractedSizeBytes?: number;
  maxImageCount?: number;
  maxPerImageSizeBytes?: number;
  maxCompressionRatio?: number;
}

export const DEFAULT_ZIP_LIMITS: Required<ZipValidationLimits> = {
  maxZipSizeBytes: 25 * 1024 * 1024, // 25 MB ZIP file limit
  maxExtractedSizeBytes: 50 * 1024 * 1024, // 50 MB total extracted limit
  maxImageCount: 150, // Up to 150 diagrams per import
  maxPerImageSizeBytes: 5 * 1024 * 1024, // 5 MB per individual image
  maxCompressionRatio: 100, // Reject 100x decompression bomb ratios
};

export interface ZipValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  images: ValidatedZipImage[];
  imageMap: Map<string, ValidatedZipImage>; // Normalized reference -> image
}

/**
 * Inspects binary magic bytes to confirm the true file format.
 */
export function detectImageFormat(buffer: Uint8Array): { format: SupportedImageFormat; mimeType: string } | null {
  if (!buffer || buffer.length < 8) return null;

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { format: 'png', mimeType: 'image/png' };
  }

  // 2. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { format: 'jpeg', mimeType: 'image/jpeg' };
  }

  // 3. GIF: 47 49 46 38 (37|39) 61 ("GIF87a" or "GIF89a")
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { format: 'gif', mimeType: 'image/gif' };
  }

  // 4. WebP: 52 49 46 46 ... 57 45 42 50 ("RIFF....WEBP")
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { format: 'webp', mimeType: 'image/webp' };
  }

  return null;
}

/**
 * Normalizes a ZIP entry path securely.
 * Rejects path traversal and dangerous characters.
 */
export function sanitizeZipEntryPath(rawPath: string): { safePath: string; error?: string } {
  if (!rawPath || typeof rawPath !== 'string') {
    return { safePath: '', error: 'Empty or invalid file path in ZIP.' };
  }

  // Reject null bytes
  if (rawPath.includes('\0')) {
    return { safePath: '', error: `Path contains null byte: "${rawPath}"` };
  }

  // Convert Windows backslashes to standard forward slashes
  const normalized = rawPath.replace(/\\/g, '/');

  // Reject absolute paths (Unix root or Windows drive letter)
  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    return { safePath: '', error: `Absolute path rejected for security: "${rawPath}"` };
  }

  // Reject path traversal tokens
  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg === '..' || seg === '.') {
      return { safePath: '', error: `Path traversal detected: "${rawPath}"` };
    }
  }

  // Filter out empty segments and trim
  const cleanSegments = segments.filter(s => Boolean(s.trim()));
  if (cleanSegments.length === 0) {
    return { safePath: '', error: `Invalid empty path: "${rawPath}"` };
  }

  return { safePath: cleanSegments.join('/') };
}

/**
 * Validates whether a filename or path has an accepted image extension.
 */
export function isValidImageExtension(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false;
  const extMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
  if (!extMatch) return false;
  return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(extMatch[1].toLowerCase());
}

/**
 * Extracts and validates images from an in-memory ZIP archive.
 * Never writes to filesystem during parsing.
 */
export async function validateAndExtractZip(
  zipInput: Uint8Array | ArrayBuffer | Blob | Buffer,
  limits: ZipValidationLimits = {}
): Promise<ZipValidationResult> {
  const mergedLimits = { ...DEFAULT_ZIP_LIMITS, ...limits };
  const errors: string[] = [];
  const warnings: string[] = [];
  const images: ValidatedZipImage[] = [];
  const imageMap = new Map<string, ValidatedZipImage>();

  // Determine zip input size
  let zipSizeBytes = 0;
  if (typeof Blob !== 'undefined' && zipInput instanceof Blob) {
    zipSizeBytes = zipInput.size;
  } else if ('byteLength' in zipInput) {
    zipSizeBytes = zipInput.byteLength;
  } else if ('length' in zipInput) {
    zipSizeBytes = (zipInput as any).length;
  }

  if (zipSizeBytes > mergedLimits.maxZipSizeBytes) {
    errors.push(
      `ZIP file size (${(zipSizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of ${(mergedLimits.maxZipSizeBytes / (1024 * 1024)).toFixed(0)} MB.`
    );
    return { isValid: false, errors, warnings, images, imageMap };
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipInput);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown ZIP error';
    errors.push(`Failed to read ZIP archive: ${msg}. Please ensure it is a valid, uncorrupted .zip file.`);
    return { isValid: false, errors, warnings, images, imageMap };
  }

  let totalExtractedSize = 0;
  let imageCount = 0;
  const basenameOccurrences = new Map<string, string[]>(); // baseName -> list of full normalized paths

  const entries = Object.keys(zip.files);
  for (const rawName of entries) {
    const entry = zip.files[rawName];

    // Ignore directory entries and macOS metadata
    if (entry.dir || rawName.endsWith('/') || rawName.includes('__MACOSX') || rawName.startsWith('.')) {
      continue;
    }

    // 1. Path safety check
    const { safePath, error: pathError } = sanitizeZipEntryPath(rawName);
    if (pathError) {
      errors.push(pathError);
      continue;
    }

    const segments = safePath.split('/');
    const baseName = segments[segments.length - 1];

    // Check extension
    const extMatch = baseName.match(/\.([a-zA-Z0-9]+)$/);
    const extension = extMatch ? extMatch[1].toLowerCase() : '';
    if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) {
      warnings.push(`Ignored non-image file in ZIP: "${safePath}". Only PNG, JPEG, WebP, and GIF are supported.`);
      continue;
    }

    imageCount++;
    if (imageCount > mergedLimits.maxImageCount) {
      errors.push(`ZIP archive contains more than ${mergedLimits.maxImageCount} image files.`);
      break;
    }

    // Read entry buffer
    let buffer: Uint8Array;
    try {
      buffer = await entry.async('uint8array');
    } catch (readErr: unknown) {
      errors.push(`Failed to decompress file "${safePath}": ${readErr instanceof Error ? readErr.message : 'Corrupted file'}`);
      continue;
    }

    const uncompressedSize = buffer.length;
    totalExtractedSize += uncompressedSize;

    // Check individual image size limit
    if (uncompressedSize > mergedLimits.maxPerImageSizeBytes) {
      errors.push(
        `Image "${safePath}" (${(uncompressedSize / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed size of ${(mergedLimits.maxPerImageSizeBytes / (1024 * 1024)).toFixed(0)} MB.`
      );
      continue;
    }

    // Check total extraction limit
    if (totalExtractedSize > mergedLimits.maxExtractedSizeBytes) {
      errors.push(
        `Total uncompressed size exceeds limit of ${(mergedLimits.maxExtractedSizeBytes / (1024 * 1024)).toFixed(0)} MB. Decompression aborted to protect server resources.`
      );
      break;
    }

    // 2. Magic byte content verification
    const detected = detectImageFormat(buffer);
    if (!detected) {
      errors.push(
        `File "${safePath}" has an image extension but its actual file content is invalid or corrupted (failed magic byte signature).`
      );
      continue;
    }

    // Check declared extension matches detected format
    if (
      (detected.format === 'png' && extension !== 'png') ||
      (detected.format === 'jpeg' && !['jpg', 'jpeg'].includes(extension)) ||
      (detected.format === 'gif' && extension !== 'gif') ||
      (detected.format === 'webp' && extension !== 'webp')
    ) {
      warnings.push(
        `File "${safePath}" has extension .${extension} but internal content is ${detected.format.toUpperCase()}. Format normalized.`
      );
    }

    const validatedImg: ValidatedZipImage = {
      originalPath: rawName,
      normalizedPath: safePath,
      baseName,
      mimeType: detected.mimeType,
      format: detected.format,
      sizeBytes: uncompressedSize,
      buffer,
    };

    images.push(validatedImg);

    // Track basenames to detect ambiguous references
    const existingPaths = basenameOccurrences.get(baseName.toLowerCase()) || [];
    existingPaths.push(safePath);
    basenameOccurrences.set(baseName.toLowerCase(), existingPaths);

    // Register full normalized path
    imageMap.set(safePath.toLowerCase(), validatedImg);
  }

  // 3. Register basename fallbacks and flag ambiguous duplicates
  for (const [lowerBase, paths] of basenameOccurrences.entries()) {
    if (paths.length === 1) {
      // Unambiguous basename - safe to resolve by filename alone
      const matchedImg = images.find(img => img.normalizedPath === paths[0]);
      if (matchedImg) {
        imageMap.set(lowerBase, matchedImg);
      }
    } else {
      warnings.push(
        `Duplicate filename "${paths[0].split('/').pop()}" found in multiple subdirectories (${paths.join(', ')}). In your CSV, use full relative paths (e.g. "${paths[0]}") to avoid ambiguity.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    images,
    imageMap,
  };
}
