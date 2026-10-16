import { z } from 'zod';

export const questionOptionInputSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, 'Option text cannot be empty'),
  imageUrl: z.string().nullable().optional(),
  isCorrect: z.boolean().default(false),
  order: z.number().int().optional(),
});

export const adminQuestionInputSchema = z.object({
  text: z.string().min(1, 'Question text cannot be empty'),
  examId: z.string().optional(),
  sectionCode: z.string().min(1, 'Section code is required'),
  topicName: z.string().min(1, 'Topic name is required'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  explanation: z.string().default(''),
  marks: z.number().default(1.0),
  negativeMarks: z.number().default(0.25),
  imageUrl: z.string().nullable().optional(),
  passage: z.string().nullable().optional(),
  passageImageUrl: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  isPyq: z.boolean().optional().default(false),
  pyqYear: z
    .union([z.number().int(), z.string().regex(/^\d{4}$/).transform(Number)])
    .nullable()
    .optional(),
  pyqExam: z.string().nullable().optional(),
  mockTestId: z.string().nullable().optional(),
  options: z
    .array(questionOptionInputSchema)
    .min(2, 'At least 2 options are required for every question')
    .refine(
      opts => opts.some(o => o.isCorrect),
      'At least one option must be marked as correct'
    ),
});

export const bulkImportQuestionsSchema = z
  .array(adminQuestionInputSchema)
  .min(1, 'At least one question is required for bulk import');

export const adminExamInputSchema = z.object({
  title: z.string().min(1, 'Exam title is required'),
  slug: z.string().optional(),
  category: z.enum(['PO', 'CLERK', 'SO', 'SSC', 'RAILWAY', 'OTHER']).optional(),
  description: z.string().optional(),
  status: z.enum(['created', 'published']).optional(),
});

export const updateExamTitleSchema = z.object({
  examIdOrSlug: z.string().min(1, 'Exam ID or slug is required'),
  newTitle: z.string().min(1, 'Exam title cannot be empty'),
  description: z.string().optional(),
});

export const testSectionInputSchema = z.object({
  code: z.string().min(1, 'Section code is required'),
  name: z.string().min(1, 'Section name is required'),
  questionCount: z.number().int().positive('Question count must be positive'),
  marks: z.number().positive('Marks must be positive'),
  durationMinutes: z.number().int().positive().optional(),
});

export const adminMockTestInputSchema = z.object({
  title: z.string().min(1, 'Mock test title is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  examId: z.string().min(1, 'Exam ID is required'),
  customExamTitle: z.string().optional(),
  customExamCategory: z.enum(['PO', 'CLERK', 'SO', 'SSC', 'RAILWAY', 'OTHER']).optional(),
  durationMinutes: z.number().int().positive().optional().default(60),
  totalMarks: z.number().positive().optional().default(100),
  cutoffMarks: z.number().nonnegative().optional().default(60),
  isFree: z.boolean().optional().default(true),
  isPyq: z.boolean().optional().default(false),
  year: z
    .union([z.number().int(), z.string().regex(/^\d{4}$/).transform(Number)])
    .nullable()
    .optional(),
  timerType: z.enum(['SECTIONAL_LOCKED', 'OVERALL_COMPOSITE', 'GROUPED_SESSION']).optional().default('SECTIONAL_LOCKED'),
  allowSectionSwitch: z.boolean().optional().default(false),
  negativeMarkRatio: z.number().nonnegative().optional().default(0.25),
  stage: z.string().optional(),
  enableSectionalTimer: z.boolean().optional(),
  sectionDurationMinutes: z.number().int().positive().optional(),
  status: z.enum(['created', 'published']).optional(),
  sections: z.array(testSectionInputSchema).optional(),
});

export const updateMockTestTitleSchema = z.object({
  testIdOrSlug: z.string().min(1, 'Test ID or slug is required'),
  newTitle: z.string().min(1, 'Title cannot be empty'),
  description: z.string().optional(),
});

export const userStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export const userRoleSchema = z.enum(['ADMIN', 'USER']);
export const examStatusSchema = z.enum(['created', 'published']);

export type AdminQuestionInputValidated = z.infer<typeof adminQuestionInputSchema>;
export type AdminExamInputValidated = z.infer<typeof adminExamInputSchema>;
export type AdminMockTestInputValidated = z.infer<typeof adminMockTestInputSchema>;

export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error?.issues || [];
    const errorMsg =
      issues.length > 0
        ? issues
            .map(e => `${e.path.length > 0 ? e.path.join('.') + ': ' : ''}${e.message}`)
            .join('; ')
        : result.error?.message || 'Validation failed';
    return { success: false, error: errorMsg };
  }
  return { success: true, data: result.data };
}
