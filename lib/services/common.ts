import { revalidatePath } from 'next/cache';

/**
 * Safely triggers Next.js path revalidation without throwing when invoked
 * in non-HTTP background script or testing execution contexts.
 */
export function safeRevalidatePath(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // Non-HTTP execution context (e.g., CLI maintenance scripts, Vitest runner)
  }
}
