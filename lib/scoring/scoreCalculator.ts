import { AttemptResult, MockTest, SectionResult, UserResponseState } from '@/types';

export function calculateAttemptResult(
  mockTest: MockTest,
  responses: Record<string, UserResponseState>,
  timeTakenSeconds: number,
  attemptId: string = `att-${Date.now()}`
): AttemptResult {
  let totalScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let totalAttempted = 0;

  // Track per section
  const sectionMetricsMap: Record<string, {
    sectionName: string;
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    score: number;
    maxScore: number;
  }> = {};

  // Initialize section maps
  mockTest.sections.forEach(sec => {
    sectionMetricsMap[sec.code] = {
      sectionName: sec.name,
      totalQuestions: 0,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      score: 0,
      maxScore: 0,
    };
  });

  const questionDetails: AttemptResult['questionDetails'] = [];

  mockTest.questions.forEach(question => {
    const secCode = question.sectionCode || mockTest.sections[0]?.code || 'GENERAL';
    if (!sectionMetricsMap[secCode]) {
      sectionMetricsMap[secCode] = {
        sectionName: question.sectionName || 'Section',
        totalQuestions: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        score: 0,
        maxScore: 0,
      };
    }

    const secMetric = sectionMetricsMap[secCode];
    secMetric.totalQuestions += 1;
    secMetric.maxScore += question.marks;

    const resp = responses[question.id];
    const selectedOptionId = resp?.selectedOptionId || null;
    const isAnswered = Boolean(selectedOptionId);

    let isCorrect: boolean | null = null;
    let marksObtained = 0;

    if (isAnswered) {
      totalAttempted += 1;
      secMetric.attempted += 1;
      
      const correctOption = question.options.find(o => o.isCorrect);
      if (correctOption && selectedOptionId === correctOption.id) {
        isCorrect = true;
        correctCount += 1;
        secMetric.correct += 1;
        marksObtained = question.marks;
      } else {
        isCorrect = false;
        incorrectCount += 1;
        secMetric.incorrect += 1;
        marksObtained = -question.negativeMarks;
      }
    } else {
      unansweredCount += 1;
      secMetric.unanswered += 1;
      marksObtained = 0;
    }

    totalScore += marksObtained;
    secMetric.score += marksObtained;

    questionDetails.push({
      question,
      selectedOptionId,
      isCorrect,
      status: resp?.status || 'NOT_VISITED',
      marksObtained,
      timeSpentSeconds: resp?.timeSpentSeconds || 0,
    });
  });

  const overallAccuracy = totalAttempted > 0 ? (correctCount / totalAttempted) * 100 : 0;
  const percentage = mockTest.totalMarks > 0 ? (Math.max(0, totalScore) / mockTest.totalMarks) * 100 : 0;
  const isCutoffCleared = totalScore >= mockTest.cutoffMarks;

  const sectionResults: SectionResult[] = Object.entries(sectionMetricsMap).map(([code, m]) => {
    const accuracy = m.attempted > 0 ? (m.correct / m.attempted) * 100 : 0;
    return {
      sectionCode: code,
      sectionName: m.sectionName,
      totalQuestions: m.totalQuestions,
      attempted: m.attempted,
      correct: m.correct,
      incorrect: m.incorrect,
      unanswered: m.unanswered,
      score: m.score,
      maxScore: m.maxScore,
      accuracy,
      isCutoffCleared: true
    };
  });

  return {
    id: attemptId,
    mockTestId: mockTest.id,
    mockTestTitle: mockTest.title,
    examSlug: mockTest.examSlug,
    examTitle: mockTest.examTitle,
    userId: 'user-current',
    userName: 'Aspirant',
    startedAt: new Date(Date.now() - timeTakenSeconds * 1000).toISOString(),
    completedAt: new Date().toISOString(),
    timeTakenSeconds,
    totalDurationSeconds: mockTest.durationMinutes * 60,
    score: parseFloat(totalScore.toFixed(2)),
    maxScore: mockTest.totalMarks,
    percentage: parseFloat(percentage.toFixed(1)),
    accuracy: parseFloat(overallAccuracy.toFixed(1)),
    totalQuestions: mockTest.totalQuestions || mockTest.questions.length,
    totalAttempted,
    correctCount,
    incorrectCount,
    unansweredCount,
    cutoffMarks: mockTest.cutoffMarks,
    isCutoffCleared,
    sectionResults,
    topicResults: [],
    questionDetails
  };
}
