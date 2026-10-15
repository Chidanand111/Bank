import { describe, it, expect } from 'vitest';
import { signSession, verifySession } from '@/lib/auth/crypto';
import { SessionPayload } from '@/types';

describe('Session Crypto & Token Verification', () => {
  const validPayload: SessionPayload = {
    userId: 'user-test-123',
    email: 'test@example.com',
    name: 'Test Student',
    role: 'USER',
    status: 'APPROVED',
    exp: Date.now() + 1000 * 60 * 60, // 1 hour in the future
  };

  it('signs and verifies a valid session payload', async () => {
    const token = await signSession(validPayload);
    expect(typeof token).toBe('string');
    expect(token.includes('.')).toBe(true);

    const verified = await verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(validPayload.userId);
    expect(verified?.email).toBe(validPayload.email);
    expect(verified?.role).toBe('USER');
  });

  it('rejects an expired session token', async () => {
    const expiredPayload: SessionPayload = {
      ...validPayload,
      exp: Date.now() - 1000, // 1 second in the past
    };

    const token = await signSession(expiredPayload);
    const verified = await verifySession(token);
    expect(verified).toBeNull();
  });

  it('rejects a tampered session token', async () => {
    const token = await signSession(validPayload);
    const [, sig] = token.split('.');

    // Tamper with the header/payload portion (e.g., attempt role elevation)
    const tamperedPayload = Buffer.from(JSON.stringify({ ...validPayload, role: 'ADMIN' })).toString('base64url');
    const tamperedToken = `${tamperedPayload}.${sig}`;

    const verified = await verifySession(tamperedToken);
    expect(verified).toBeNull();
  });

  it('rejects a malformed token string', async () => {
    expect(await verifySession('')).toBeNull();
    expect(await verifySession('invalid-token-without-dot')).toBeNull();
    expect(await verifySession('part1.part2.part3')).toBeNull();
  });
});
