/**
 * Centralized, validated environment configuration.
 * Prevents insecure defaults in production and guarantees typed environment variables.
 */

const isProd = process.env.NODE_ENV === 'production';

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !secret.trim()) {
    if (isProd) {
      throw new Error(
        'CRITICAL SECURITY ERROR: SESSION_SECRET is not set in production. You must define a high-entropy secret key.'
      );
    }
    // Safe dev fallback with clear warning
    console.warn(
      '⚠️ Warning: SESSION_SECRET is not defined. Using development fallback. DO NOT USE IN PRODUCTION.'
    );
    return 'bankmock_development_only_insecure_fallback_secret_32_chars_long!';
  }

  if (secret.length < 32 && isProd) {
    throw new Error(
      'SECURITY ERROR: SESSION_SECRET must be at least 32 characters long in production.'
    );
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
