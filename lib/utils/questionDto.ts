import { Question, StudentSafeQuestion, StudentSafeOption } from '@/types';

/**
 * Strips sensitive answer keys, explanations, and internal metadata from an Option.
 * Guarantees `isCorrect` is never exposed to student-facing clients.
 */
export function toStudentSafeOption(option: {
  id: string;
  text: string;
  imageUrl?: string;
  order: number;
  [key: string]: any;
}): StudentSafeOption {
  return {
    id: option.id,
    text: option.text,
    imageUrl: option.imageUrl || undefined,
    order: typeof option.order === 'number' ? option.order : 0,
  };
}

/**
 * Converts a database or internal question model into a student-safe DTO.
 * Explicitly removes:
 * - explanation
 * - isCorrect on options
 * - any internal answer keys or correctness metadata
 */
export function toStudentSafeQuestion(question: Question): StudentSafeQuestion {
  return {
    id: question.id,
    text: question.text,
    imageUrl: question.imageUrl,
    passage: question.passage,
    passageImageUrl: question.passageImageUrl,
    table: question.table,
    groupId: question.groupId,
    isPyq: question.isPyq,
    pyqYear: question.pyqYear,
    pyqExam: question.pyqExam,
    difficulty: question.difficulty,
    marks: question.marks,
    negativeMarks: question.negativeMarks,
    examId: question.examId,
    examSlug: question.examSlug,
    examTitle: question.examTitle,
    sectionId: question.sectionId,
    sectionCode: question.sectionCode,
    sectionName: question.sectionName,
    topicId: question.topicId,
    topicName: question.topicName,
    mockTestId: question.mockTestId,
    options: (question.options || []).map(toStudentSafeOption),
  };
}

/**
 * Batch converts an array of questions into student-safe DTOs.
 */
export function toStudentSafeQuestions(questions: Question[]): StudentSafeQuestion[] {
  return questions.map(toStudentSafeQuestion);
}
