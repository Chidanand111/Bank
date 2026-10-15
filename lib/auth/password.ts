import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a plain-text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plain-text password against a hash.
 * Also gracefully handles legacy plaintext entries during the transition.
 */
export async function verifyPassword(password: string, hashOrPlain: string | null | undefined): Promise<boolean> {
  if (!hashOrPlain || !password) return false;

  // If the stored value starts with bcrypt prefix $2a$, $2b$, or $2y$
  if (hashOrPlain.startsWith('$2a$') || hashOrPlain.startsWith('$2b$') || hashOrPlain.startsWith('$2y$')) {
    try {
      return await bcrypt.compare(password, hashOrPlain);
    } catch {
      return false;
    }
  }

  // Fallback for legacy dev seeds stored as plaintext
  return password === hashOrPlain;
}
