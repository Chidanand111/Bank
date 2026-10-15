import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('Password Hashing & Verification', () => {
  it('hashes and correctly verifies passwords', async () => {
    const raw = 'SuperSecureP@ss123';
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const isMatch = await verifyPassword(raw, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword('WrongPassword', hash);
    expect(isWrong).toBe(false);
  });

  it('supports legacy plaintext passwords for backward compatibility', async () => {
    const legacyPlain = 'admin123';
    expect(await verifyPassword('admin123', legacyPlain)).toBe(true);
    expect(await verifyPassword('wrong', legacyPlain)).toBe(false);
  });

  it('handles empty or null inputs safely', async () => {
    expect(await verifyPassword('', '')).toBe(false);
    expect(await verifyPassword('test', null)).toBe(false);
    expect(await verifyPassword('test', undefined)).toBe(false);
  });
});
