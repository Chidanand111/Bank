/**
 * Client-Safe Image & Diagram Reference Classifier
 *
 * Pure utility function that safely executes in both browser (Client Components)
 * and server environments without pulling in Node.js fs or database drivers.
 */

export type ImageReferenceClassification = 'URL' | 'DATA_URI' | 'FILENAME' | 'NONE';

/**
 * Checks whether an image reference is an external/public URL, data URI, or local filename.
 */
export function classifyImageReference(ref?: string | null): ImageReferenceClassification {
  if (!ref || typeof ref !== 'string') return 'NONE';
  const trimmed = ref.trim();
  if (!trimmed) return 'NONE';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
    return 'URL';
  }
  if (trimmed.startsWith('data:image/')) {
    return 'DATA_URI';
  }
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/images/')) {
    return 'URL';
  }

  // Check if string clearly looks like an image filename (has standard image extension)
  const isImageFile = /\.(png|jpe?g|webp|gif|svg)$/i.test(trimmed);
  if (isImageFile) {
    return 'FILENAME';
  }

  return 'NONE';
}
