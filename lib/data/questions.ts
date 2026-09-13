import { Question } from '@/types';
import { getAllQuestions } from '../db/questionDb';

/**
 * Question Bank Access Layer
 * All questions are persisted in the database (@/data/questions.json)
 * and are picked dynamically and randomly per user.
 */

// Dynamic views loaded from the central database
export const getAllDatabaseQuestions = (): Question[] => getAllQuestions();

export const IBPS_PO_QUESTIONS: Question[] = getAllQuestions().filter(q => q.examId.includes('ibps'));
export const SBI_CLERK_QUESTIONS: Question[] = getAllQuestions().filter(q => q.examId.includes('sbi'));
export const NEW_IBPS_PO_30_QUESTIONS: Question[] = getAllQuestions().slice(0, 30);
