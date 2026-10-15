'use server';

import { requireAdmin } from '../auth/permissions';
import { SAMPLE_ATTEMPTS } from '../data/sampleAttempts';
import { AttemptResult } from '@/types';

/**
 * Server-side Attempts viewer for Administrators
 */
export async function getAdminAllAttempts(): Promise<AttemptResult[]> {
  await requireAdmin();
  return SAMPLE_ATTEMPTS;
}
