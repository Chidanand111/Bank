// Web Crypto API HMAC-SHA256 Token implementation (compatible with Edge and Node.js)
import { SessionPayload } from '@/types';

const SESSION_SECRET = process.env.SESSION_SECRET || 'bankmock_super_secure_session_secret_key_2025_prod_ready';

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function base64UrlEncode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64url');
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64url').toString('utf-8');
  }
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const key = await getCryptoKey();
  const enc = new TextEncoder();
  const headerAndPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(headerAndPayload));

  let signatureBase64: string;
  if (typeof Buffer !== 'undefined') {
    signatureBase64 = Buffer.from(signatureBuffer).toString('base64url');
  } else {
    const bytes = new Uint8Array(signatureBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    signatureBase64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  return `${headerAndPayload}.${signatureBase64}`;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [headerAndPayload, signatureBase64] = parts;
    const key = await getCryptoKey();
    const enc = new TextEncoder();

    let base64 = signatureBase64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = typeof Buffer !== 'undefined'
      ? Buffer.from(signatureBase64, 'base64url').toString('binary')
      : atob(base64);

    const sigBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      sigBytes[i] = binary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes.buffer as ArrayBuffer,
      enc.encode(headerAndPayload)
    );

    if (!isValid) return null;

    const payloadJson = base64UrlDecode(headerAndPayload);
    const payload: SessionPayload = JSON.parse(payloadJson);

    // Check expiration
    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch (err) {
    console.error('Session verification error:', err);
    return null;
  }
}
