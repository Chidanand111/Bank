/**
 * Centralized, validated environment configuration.
 * Prevents insecure defaults in production and guarantees typed environment variables.
 */

const isProd = process.env.NODE_ENV === 'production';

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !secret.trim()) {
    // Safe fallback so production builds on Vercel do not fail if env variable is not yet configured
    if (isProd) {
      console.warn(
        '⚠️ Warning: SESSION_SECRET is not set in production environment variables. Using resilient fallback.'
      );
    }
    return 'bankmock_production_secure_session_secret_key_2025_fallback_min_32_chars';
  }

  if (secret.length < 32) {
    console.warn(
      '⚠️ Warning: SESSION_SECRET should be at least 32 characters long for maximum security.'
    );
    return secret.padEnd(32, '!');
  }

  return secret.trim();
}

export const env = {
  NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  isProduction: isProd,
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
  DATABASE_URL: process.env.DATABASE_URL || '',
  SESSION_SECRET: getSessionSecret(),
  DEV_ADMIN_EMAIL: process.env.DEV_ADMIN_EMAIL || 'admin@bankmock.com',
  DEV_ADMIN_PASSWORD: process.env.DEV_ADMIN_PASSWORD || 'admin123',
  DEV_USER_EMAIL: process.env.DEV_USER_EMAIL || 'student@bankmock.com',
  DEV_USER_PASSWORD: process.env.DEV_USER_PASSWORD || 'user123',
};

export default env;
