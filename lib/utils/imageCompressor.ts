/**
 * Image Compression Utility for Bank Exam Diagrams and Data Interpretation (DI) Charts.
 * Automatically resizes large images, enforces white backgrounds for transparent chart PNGs,
 * and encodes to optimized JPEG format to minimize PostgreSQL database storage consumption.
 */

export interface CompressionResult {
  compressedDataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatioPercent: number;
  width: number;
  height: number;
}

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
 * Compresses an image File from an <input type="file"> element
 */
export function compressImageFile(
  file: File,
  maxDimension = 900,
  quality = 0.76
): Promise<CompressionResult> {
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
        });
      }

      compressDataUrl(rawUrl, maxDimension, quality, originalSizeBytes)
        .then(resolve)
        .catch(reject);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses a Base64 Data URL or loaded Image
 */
export function compressDataUrl(
  dataUrl: string,
  maxDimension = 900,
  quality = 0.76,
  originalSizeBytes?: number
): Promise<CompressionResult> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      // Server-side environment fallback
      const size = getBase64SizeBytes(dataUrl);
      return resolve({
        compressedDataUrl: dataUrl,
        originalSizeBytes: originalSizeBytes || size,
        compressedSizeBytes: size,
        compressionRatioPercent: 0,
        width: 0,
        height: 0,
      });
    }

    const origSize = originalSizeBytes || getBase64SizeBytes(dataUrl);

    // If not a data URL (e.g. remote HTTP URL), return directly
    if (!dataUrl.startsWith('data:image')) {
      return resolve({
        compressedDataUrl: dataUrl,
        originalSizeBytes: origSize,
        compressedSizeBytes: origSize,
        compressionRatioPercent: 0,
        width: 0,
        height: 0,
      });
    }

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Scale down while maintaining aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
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
        });
      }

      // Fill pure white background so transparent chart PNGs don't become pitch black
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Encode as optimized JPEG
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
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
      });
    };

    img.src = dataUrl;
  });
}
