/**
 * Format-Aware Diagram & Image Optimization Utility
 *
 * Implements a format-aware processing policy:
 * - Lossless PNG for line drawings, charts, circuit diagrams, and text-heavy figures.
 * - Preserves transparency for diagrams and transparent PNGs (never forces lossy white-filled JPEG).
 * - High-quality encoding (quality 0.90+) for photographic content.
 * - Protects vector graphics (SVG data URIs are preserved untouched for infinite crispness).
 * - Preserves exact aspect ratio and avoids repeatedly compressing already processed images.
 * - Enforces configurable dimension limits (default 1920px max dimension for razor-sharp math labels).
 */

export interface CompressionResult {
  compressedDataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatioPercent: number;
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp' | 'svg' | 'unknown';
  hasTransparency: boolean;
}

export interface ImageProcessingOptions {
  maxDimension?: number;
  quality?: number;
  preserveTransparency?: boolean;
  forceFormat?: 'auto' | 'png' | 'jpeg' | 'webp';
  maxFileSizeBytes?: number;
}

export const DEFAULT_IMAGE_OPTIONS: Required<ImageProcessingOptions> = {
  maxDimension: 1920, // High-DPI diagram legibility
  quality: 0.90, // High quality to eliminate text blurring and ring artifacts
  preserveTransparency: true,
  forceFormat: 'auto',
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB limit
};

/**
 * Calculates byte size of a Base64 data URI string
 */
export function getBase64SizeBytes(dataUrl: string): number {
  if (!dataUrl) return 0;
  const base64String = dataUrl.split(',')[1] || dataUrl;
  return Math.round((base64String.length * 3) / 4);
}

/**
 * Formats bytes to human-readable string (KB / MB)
 */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Determines whether a canvas contains any semi-transparent or transparent pixels.
 */
export function inspectCanvasTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  try {
    const imgData = ctx.getImageData(0, 0, width, height).data;
    // Step by 4 bytes (RGBA) checking the Alpha channel (index + 3)
    // Sample every 4th pixel for high-performance inspection
    for (let i = 3; i < imgData.length; i += 16) {
      if (imgData[i] < 250) {
        return true;
      }
    }
  } catch {
    // If CORS or tainted canvas, assume safe preservation of alpha
    return true;
  }
  return false;
}

/**
 * Compresses an image File from an <input type="file"> element using format-aware policy.
 */
export function compressImageFile(
  file: File,
  maxDimension = 1920,
  quality = 0.90,
  options: ImageProcessingOptions = {}
): Promise<CompressionResult> {
  const mergedOptions = { ...DEFAULT_IMAGE_OPTIONS, maxDimension, quality, ...options };
  return new Promise((resolve, reject) => {
    const originalSizeBytes = file.size;
    const reader = new FileReader();

    reader.onload = (event) => {
      const rawUrl = event.target?.result as string;
      if (!rawUrl) {
        return resolve({
          compressedDataUrl: '',
          originalSizeBytes,
          compressedSizeBytes: 0,
          compressionRatioPercent: 0,
          width: 0,
          height: 0,
          format: 'unknown',
          hasTransparency: false,
        });
      }

      compressDataUrl(rawUrl, mergedOptions.maxDimension, mergedOptions.quality, originalSizeBytes, mergedOptions)
        .then(resolve)
        .catch(reject);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Format-aware Data URL processor.
 * Preserves SVG vectors, PNG diagrams, and transparent backgrounds while maintaining aspect ratio.
 */
export function compressDataUrl(
  dataUrl: string,
  maxDimension = 1920,
  quality = 0.90,
  originalSizeBytes?: number,
  options: ImageProcessingOptions = {}
): Promise<CompressionResult> {
  const mergedOptions = { ...DEFAULT_IMAGE_OPTIONS, maxDimension, quality, ...options };

  return new Promise((resolve) => {
    const origSize = originalSizeBytes || getBase64SizeBytes(dataUrl);

    // 1. If not a base64 data URI (e.g. remote HTTP URL / static asset), return directly
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return resolve({
        compressedDataUrl: dataUrl,
        originalSizeBytes: origSize,
        compressedSizeBytes: origSize,
        compressionRatioPercent: 0,
        width: 0,
        height: 0,
        format: 'unknown',
        hasTransparency: false,
      });
    }

    // 2. Vector Graphics (SVG): NEVER rasterize or compress with lossy JPEG!
    if (dataUrl.startsWith('data:image/svg+xml')) {
      return resolve({
        compressedDataUrl: dataUrl,
        originalSizeBytes: origSize,
        compressedSizeBytes: origSize,
        compressionRatioPercent: 0,
        width: 0,
        height: 0,
        format: 'svg',
        hasTransparency: true,
      });
    }

    // Server-side fallback (if window or Image is unavailable)
    if (typeof window === 'undefined') {
      return resolve({
        compressedDataUrl: dataUrl,
        originalSizeBytes: origSize,
        compressedSizeBytes: origSize,
        compressionRatioPercent: 0,
        width: 0,
        height: 0,
        format: dataUrl.includes('image/png') ? 'png' : 'jpeg',
        hasTransparency: dataUrl.includes('image/png'),
      });
    }

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Validate dimensions
      if (width <= 0 || height <= 0) {
        return resolve({
          compressedDataUrl: dataUrl,
          originalSizeBytes: origSize,
          compressedSizeBytes: origSize,
          compressionRatioPercent: 0,
          width: 0,
          height: 0,
          format: 'unknown',
          hasTransparency: false,
        });
      }

      // Check if image is already appropriately sized
      const isDimensionAcceptable = width <= mergedOptions.maxDimension && height <= mergedOptions.maxDimension;
      const isFileReasonable = origSize < 2 * 1024 * 1024; // Less than 2 MB

      // Scale down proportionally only if it exceeds maximum allowable resolution
      if (!isDimensionAcceptable) {
        const ratio = Math.min(mergedOptions.maxDimension / width, mergedOptions.maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve({
          compressedDataUrl: dataUrl,
          originalSizeBytes: origSize,
          compressedSizeBytes: origSize,
          compressionRatioPercent: 0,
          width,
          height,
          format: 'unknown',
          hasTransparency: false,
        });
      }

      // Draw image to canvas with high smoothing quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Inspect transparency in image pixels
      const hasTransparency = inspectCanvasTransparency(ctx, width, height);

      // Determine output format based on format-aware policy:
      // If image has transparency or was originally PNG/diagram, maintain PNG
      const isOriginallyPng = dataUrl.startsWith('data:image/png');
      const isOriginallyWebP = dataUrl.startsWith('data:image/webp');

      let targetMime = 'image/jpeg';
      let formatResult: 'png' | 'jpeg' | 'webp' = 'jpeg';

      if (mergedOptions.forceFormat === 'png') {
        targetMime = 'image/png';
        formatResult = 'png';
      } else if (mergedOptions.forceFormat === 'webp') {
        targetMime = 'image/webp';
        formatResult = 'webp';
      } else if (mergedOptions.forceFormat === 'jpeg') {
        targetMime = 'image/jpeg';
        formatResult = 'jpeg';
      } else {
        // Auto mode:
        if (hasTransparency || (isOriginallyPng && mergedOptions.preserveTransparency)) {
          targetMime = 'image/png';
          formatResult = 'png';
        } else if (isOriginallyWebP) {
          targetMime = 'image/webp';
          formatResult = 'webp';
        } else {
          targetMime = 'image/jpeg';
          formatResult = 'jpeg';
        }
      }

      // If already acceptable size, PNG format, and no resize occurred, avoid repeated compression!
      if (isDimensionAcceptable && isFileReasonable && formatResult === 'png' && isOriginallyPng) {
        return resolve({
          compressedDataUrl: dataUrl,
          originalSizeBytes: origSize,
          compressedSizeBytes: origSize,
          compressionRatioPercent: 0,
          width,
          height,
          format: 'png',
          hasTransparency,
        });
      }

      let compressedDataUrl: string;
      if (formatResult === 'png') {
        compressedDataUrl = canvas.toDataURL('image/png');
      } else {
        compressedDataUrl = canvas.toDataURL(targetMime, mergedOptions.quality);
      }

      const compressedSizeBytes = getBase64SizeBytes(compressedDataUrl);
      const savings = Math.max(0, origSize - compressedSizeBytes);
      const compressionRatioPercent = origSize > 0 ? Math.round((savings / origSize) * 100) : 0;

      resolve({
        compressedDataUrl,
        originalSizeBytes: origSize,
        compressedSizeBytes,
        compressionRatioPercent,
        width,
        height,
        format: formatResult,
        hasTransparency,
      });
    };

    img.onerror = () => {
      resolve({
        compressedDataUrl: dataUrl,
        originalSizeBytes: origSize,
        compressedSizeBytes: origSize,
        compressionRatioPercent: 0,
        width: 0,
        height: 0,
        format: 'unknown',
        hasTransparency: false,
      });
    };

    img.src = dataUrl;
  });
}
