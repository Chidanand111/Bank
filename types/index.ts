export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type ExamCategory = 'PO' | 'CLERK' | 'SO' | 'OTHER';
export type Role = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
  attemptCount?: number;
}

export interface SessionPayload {
  userId: string;
  role: Role;
  email: string;
  name: string;
  exp: number;
}

export type QuestionStatus = 
  | 'NOT_VISITED'
  | 'NOT_ANSWERED'
  | 'ANSWERED'
  | 'MARKED_FOR_REVIEW'
  | 'ANSWERED_AND_MARKED';

export interface Option {
  id: string;
  questionId: string;
  text: string;
  imageUrl?: string;
  isCorrect: boolean;
  order: number;
}

export interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  passage?: string;
  passageImageUrl?: string;
  groupId?: string;
  isPyq?: boolean;
  pyqYear?: number;
  pyqExam?: string;
  difficulty: Difficulty;
  explanation: string;
  marks: number;
  negativeMarks: number;
  examId: string;
  sectionId: string;
  sectionCode: string; // e.g. "QUANT", "REASONING", "ENGLISH", "GA"
  sectionName: string;
  topicId: string;
  topicName: string;
  options: Option[];
}

export interface SectionPattern {
  id: string;
  name: string;
  code: string;
  numQuestions: number;
  maxMarks: number;
  durationMinutes: number;
  topics: string[];
}

export interface ExamPattern {
  stage: 'Prelims' | 'Mains';
  sections: SectionPattern[];
  totalQuestions: number;
  totalMarks: number;
  totalDurationMinutes: number;
}

export interface Exam {
  id: string;
  slug: string;
  title: string;
  category: ExamCategory;
  description: string;
  shortDescription: string;
  patterns: ExamPattern[];
  totalMockTests: number;
}

export interface MockTestQuestion {
  id: string;
  mockTestId: string;
  questionId: string;
  question: Question;
  sectionId: string;
  sectionCode: string;
  sectionName: string;
  order: number;
}

export interface MockTest {
  id: string;
  slug: string;
  title: string;
  description: string;
  examId: string;
  examSlug: string;
  examTitle: string;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
  cutoffMarks: number;
  isFree: boolean;
  isFixed?: boolean;
  isPyq?: boolean;
  year?: number;
  sections: {
    id: string;
    code: string;
    name: string;
    durationMinutes?: number;
    questionCount: number;
    marks: number;
  }[];
  questions: Question[];
}

export interface UserResponseState {
  questionId: string;
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
  status: QuestionStatus;
  timeSpentSeconds: number;
}

export interface TestState {
  attemptId: string;
  mockTestId: string;
  startedAt: string;
  currentSectionCode: string;
  currentQuestionId: string;
  responses: Record<string, UserResponseState>;
  visitedQuestions: string[];
  remainingSeconds: number;
  isSubmitted: boolean;
}

export interface SectionResult {
  sectionCode: string;
  sectionName: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  maxScore: number;
  accuracy: number;
  cutoffMarks?: number;
  isCutoffCleared?: boolean;
}

export interface TopicResult {
  topicName: string;
  sectionCode: string;
  attempted: number;
  correct: number;
  total: number;
  accuracy: number;
}

export interface AttemptResult {
  id: string;
  mockTestId: string;
  mockTestTitle: string;
  examSlug: string;
  examTitle: string;
  userId: string;
  userName: string;
  startedAt: string;
  completedAt: string;
  timeTakenSeconds: number;
  totalDurationSeconds: number;
  score: number;
  maxScore: number;
  percentage: number;
  accuracy: number;
  totalQuestions: number;
  totalAttempted: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  cutoffMarks: number;
  isCutoffCleared: boolean;
  sectionResults: SectionResult[];
  topicResults: TopicResult[];
  questionDetails: {
    question: Question;
    selectedOptionId: string | null;
    isCorrect: boolean | null;
    status: QuestionStatus;
    marksObtained: number;
    timeSpentSeconds: number;
  }[];
}

export interface DashboardStats {
  totalTestsAttempted: number;
  averageScore: number;
  bestScore: number;
  averageAccuracy: number;
  totalTimeSpentMinutes: number;
  recentAttempts: AttemptResult[];
  sectionPerformance: {
    sectionCode: string;
    sectionName: string;
    averageAccuracy: number;
    totalAttempted: number;
    totalCorrect: number;
  }[];
  weakTopics: {
    topicName: string;
    sectionName: string;
    accuracy: number;
    recommendedPracticeCount: number;
  }[];
}

export interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  totalExams: number;
  totalQuestions: number;
  totalMockTests: number;
  totalAttempts: number;
  recentUsers: AuthUser[];
  recentAttempts: AttemptResult[];
  popularTests: {
    id: string;
    title: string;
    examTitle: string;
    attemptsCount: number;
  }[];
}

export interface AdminQuestionInput {
  examId: string;
  sectionCode: string;
  topicName: string;
  text: string;
  difficulty: Difficulty;
  explanation: string;
  marks: number;
  negativeMarks: number;
  imageUrl?: string;
  passage?: string;
  passageImageUrl?: string;
  groupId?: string;
  isPyq?: boolean;
  pyqYear?: number;
  pyqExam?: string;
  mockTestId?: string;
  options: {
    text: string;
    imageUrl?: string;
    isCorrect: boolean;
  }[];
}

export interface AdminExamInput {
  title: string;
  slug?: string;
  category?: ExamCategory;
  description?: string;
}

export interface AdminMockTestInput {
  title: string;
  slug: string;
  description: string;
  examId: string;
  customExamTitle?: string;
  customExamCategory?: ExamCategory;
  durationMinutes: number;
  totalMarks: number;
  cutoffMarks: number;
  isFree: boolean;
  isPyq?: boolean;
  year?: number;
  sections: {
    code: string;
    name: string;
    questionCount: number;
    marks: number;
  }[];
}
