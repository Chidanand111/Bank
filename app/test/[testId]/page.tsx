'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getMockTestById, saveAttemptResult } from '@/lib/services/testService';
import { calculateAttemptResult } from '@/lib/scoring/scoreCalculator';
import { MockTest, Question, QuestionStatus, UserResponseState } from '@/types';
import { TestHeader } from '@/components/questions/TestHeader';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { QuestionPalette } from '@/components/questions/QuestionPalette';
import { SubmitConfirmModal } from '@/components/questions/SubmitConfirmModal';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight, Bookmark, RotateCcw, Send } from 'lucide-react';
import { getUserSeenQuestionIds, recordUserSeenQuestions } from '@/lib/services/userQuestionTracker';

export interface TestPageProps {
  params: Promise<{ testId: string }>;
}

export default function TestPage({ params }: TestPageProps) {
  const { testId } = use(params);
  const router = useRouter();

  const [test, setTest] = useState<MockTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSectionCode, setCurrentSectionCode] = useState<string>('');
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
  const [responses, setResponses] = useState<Record<string, UserResponseState>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3600);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Storage key for test state persistence
  const storageKey = `bankmock_test_progress_${testId}`;

  // Fetch test details at start of exam
  useEffect(() => {
    async function loadTest() {
      // 1. Check if there's an in-progress session already saved
      let inProgressQuestions: Question[] | null = null;
      let inProgressResponses: Record<string, UserResponseState> | null = null;
      let inProgressVisited: string[] | null = null;
      let inProgressSeconds: number | null = null;

      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.questions && parsed.questions.length > 0) {
            inProgressQuestions = parsed.questions;
          }
          if (parsed.responses) inProgressResponses = parsed.responses;
          if (parsed.visitedQuestions) inProgressVisited = parsed.visitedQuestions;
          if (typeof parsed.remainingSeconds === 'number' && parsed.remainingSeconds > 0) {
            inProgressSeconds = parsed.remainingSeconds;
          }
        }
      } catch (err) {
        console.error('Error reading saved session:', err);
      }

      // 2. If resuming an active session, preserve its exact question set
      if (inProgressQuestions && inProgressQuestions.length > 0) {
        const baseTest = await getMockTestById(testId);
        if (baseTest) {
          const activeTest: MockTest = {
            ...baseTest,
            questions: inProgressQuestions,
          };
          setTest(activeTest);
          if (inProgressResponses) setResponses(inProgressResponses);
          if (inProgressVisited) setVisitedQuestions(inProgressVisited);
          if (inProgressSeconds) setRemainingSeconds(inProgressSeconds);

          const initialSecCode = activeTest.sections[0]?.code || activeTest.questions[0]?.sectionCode || 'GENERAL';
          const initialQId = activeTest.questions.find(q => q.sectionCode === initialSecCode)?.id || activeTest.questions[0]?.id || '';
          setCurrentSectionCode(initialSecCode);
          setCurrentQuestionId(initialQId);
        }
        setLoading(false);
        return;
      }

      // 3. New exam start: Retrieve all questions previously seen by this user across past exams
      const seenQuestionIds = getUserSeenQuestionIds();

      // Pick randomly from the database excluding any question the user has already seen
      const freshTest = await getMockTestById(testId, seenQuestionIds);
      if (freshTest) {
        setTest(freshTest);
        setRemainingSeconds(freshTest.durationMinutes * 60);

        const initialSecCode = freshTest.sections[0]?.code || freshTest.questions[0]?.sectionCode || 'GENERAL';
        const initialQId = freshTest.questions.find(q => q.sectionCode === initialSecCode)?.id || freshTest.questions[0]?.id || '';

        setCurrentSectionCode(initialSecCode);
        setCurrentQuestionId(initialQId);
        setVisitedQuestions(initialQId ? [initialQId] : []);

        // Record these newly assigned questions immediately so they will not repeat in subsequent exams
        const newIds = freshTest.questions.map(q => q.id);
        recordUserSeenQuestions(undefined, newIds);
      }
      setLoading(false);
    }
    loadTest();
  }, [testId, storageKey]);

  // Autosave responses & timer to localStorage
  useEffect(() => {
    if (!test || loading) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          testId,
          questions: test.questions,
          responses,
          visitedQuestions,
          remainingSeconds,
          currentSectionCode,
          currentQuestionId,
        })
      );
    } catch (err) {
      console.error('Autosave error:', err);
    }
  }, [responses, visitedQuestions, remainingSeconds, currentSectionCode, currentQuestionId, test, loading, storageKey]);

  // Mark question as visited when changing question
  const selectQuestion = useCallback((qId: string) => {
    setCurrentQuestionId(qId);
    setVisitedQuestions(prev => (prev.includes(qId) ? prev : [...prev, qId]));

    if (test) {
      const q = test.questions.find(item => item.id === qId);
      if (q && q.sectionCode !== currentSectionCode) {
        setCurrentSectionCode(q.sectionCode);
      }
    }
  }, [test, currentSectionCode]);

  // Handle Option Select
  const handleSelectOption = (optionId: string) => {
    setResponses(prev => {
      const existing = prev[currentQuestionId] || {
        questionId: currentQuestionId,
        selectedOptionId: null,
        isMarkedForReview: false,
        status: 'NOT_ANSWERED',
        timeSpentSeconds: 0,
      };

      // Toggle off if clicking the already selected option
      const newSelectedOptionId = existing.selectedOptionId === optionId ? null : optionId;
      const isAnswered = Boolean(newSelectedOptionId);
      const isMarked = existing.isMarkedForReview;

      let newStatus: QuestionStatus = 'NOT_ANSWERED';
      if (isAnswered && isMarked) newStatus = 'ANSWERED_AND_MARKED';
      else if (isMarked) newStatus = 'MARKED_FOR_REVIEW';
      else if (isAnswered) newStatus = 'ANSWERED';

      return {
        ...prev,
        [currentQuestionId]: {
          ...existing,
          selectedOptionId: newSelectedOptionId,
          status: newStatus,
        },
      };
    });
  };

  // Clear Response
  const handleClearResponse = () => {
    setResponses(prev => {
      const existing = prev[currentQuestionId];
      if (!existing) return prev;

      const isMarked = existing.isMarkedForReview;
      let newStatus: QuestionStatus = isMarked ? 'MARKED_FOR_REVIEW' : 'NOT_ANSWERED';

      return {
        ...prev,
        [currentQuestionId]: {
          ...existing,
          selectedOptionId: null,
          status: newStatus,
        },
      };
    });
  };

  // Mark for Review & Next
  const handleMarkForReview = () => {
    setResponses(prev => {
      const existing = prev[currentQuestionId] || {
        questionId: currentQuestionId,
        selectedOptionId: null,
        isMarkedForReview: false,
        status: 'NOT_ANSWERED',
        timeSpentSeconds: 0,
      };

      const newIsMarked = !existing.isMarkedForReview;
      const isAnswered = Boolean(existing.selectedOptionId);

      let newStatus: QuestionStatus = 'NOT_ANSWERED';
      if (isAnswered && newIsMarked) newStatus = 'ANSWERED_AND_MARKED';
      else if (newIsMarked) newStatus = 'MARKED_FOR_REVIEW';
      else if (isAnswered) newStatus = 'ANSWERED';

      return {
        ...prev,
        [currentQuestionId]: {
          ...existing,
          isMarkedForReview: newIsMarked,
          status: newStatus,
        },
      };
    });

    // Automatically navigate to next question
    handleNextQuestion();
  };

  // Navigation Helpers
  const questionsInCurrentSection = test?.questions.filter(q => q.sectionCode === currentSectionCode) || [];
  const currentSectionQuestions = questionsInCurrentSection.length > 0 ? questionsInCurrentSection : (test?.questions || []);
  const currentQuestionIndex = currentSectionQuestions.findIndex(q => q.id === currentQuestionId);

  const handleNextQuestion = () => {
    if (currentQuestionIndex < currentSectionQuestions.length - 1) {
      const nextQ = currentSectionQuestions[currentQuestionIndex + 1];
      selectQuestion(nextQ.id);
    } else {
      // Find next section if at end of section
      const secIdx = test?.sections.findIndex(s => s.code === currentSectionCode) ?? -1;
      if (test && secIdx >= 0 && secIdx < test.sections.length - 1) {
        const nextSec = test.sections[secIdx + 1];
        setCurrentSectionCode(nextSec.code);
        const nextSecFirstQ = test.questions.find(q => q.sectionCode === nextSec.code);
        if (nextSecFirstQ) selectQuestion(nextSecFirstQ.id);
      }
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevQ = currentSectionQuestions[currentQuestionIndex - 1];
      selectQuestion(prevQ.id);
    } else {
      // Find prev section
      const secIdx = test?.sections.findIndex(s => s.code === currentSectionCode) ?? -1;
      if (test && secIdx > 0) {
        const prevSec = test.sections[secIdx - 1];
        setCurrentSectionCode(prevSec.code);
        const prevSecQuestions = test.questions.filter(q => q.sectionCode === prevSec.code);
        const lastQ = prevSecQuestions[prevSecQuestions.length - 1];
        if (lastQ) selectQuestion(lastQ.id);
      }
    }
  };

  // Timer Tick
  const handleTimerTick = useCallback(() => {
    setRemainingSeconds(prev => Math.max(0, prev - 1));
  }, []);

  // Submit Test logic
  const executeSubmission = useCallback(() => {
    if (!test || isSubmitting) return;
    setIsSubmitting(true);

    const totalTimeTaken = test.durationMinutes * 60 - remainingSeconds;
    const attemptId = `att-${Date.now()}`;
    const result = calculateAttemptResult(test, responses, totalTimeTaken, attemptId);

    // Save result to localStorage
    saveAttemptResult(result);

    // Clear saved progress
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error(e);
    }

    router.push(`/result/${attemptId}`);
  }, [test, isSubmitting, remainingSeconds, responses, storageKey, router]);

  // Handle Time Up Auto-Submit
  const handleTimeUp = useCallback(() => {
    executeSubmission();
  }, [executeSubmission]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">Loading BankMock Exam Engine...</p>
        </div>
      </div>
    );
  }

  if (!test || !test.questions || test.questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Exam Session Not Found</h2>
          <p className="text-sm text-slate-500">The requested test paper could not be loaded.</p>
          <Button onClick={() => router.push('/tests')}>Return to Practice Tests</Button>
        </div>
      </div>
    );
  }

  const currentQuestion = test.questions.find(q => q.id === currentQuestionId) || currentSectionQuestions[0] || test.questions[0];
  const currentResponse = responses[currentQuestion?.id || ''];
  const isMarkedForReview = Boolean(currentResponse?.isMarkedForReview);

  // Compute metrics for modal
  const allQuestions = test.questions;
  let answeredCount = 0;
  let markedCount = 0;
  allQuestions.forEach(q => {
    const r = responses[q.id];
    if (r?.selectedOptionId) answeredCount++;
    if (r?.isMarkedForReview) markedCount++;
  });
  const unansweredCount = allQuestions.length - answeredCount;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none pb-16 lg:pb-0">
      {/* Test Header Console */}
      <TestHeader
        testTitle={test.title}
        sections={test.sections}
        currentSectionCode={currentSectionCode}
        onSelectSection={(code) => {
          setCurrentSectionCode(code);
          const firstQ = test.questions.find(q => q.sectionCode === code);
          if (firstQ) selectQuestion(firstQ.id);
        }}
        remainingSeconds={remainingSeconds}
        onTickTimer={handleTimerTick}
        onTimeUp={handleTimeUp}
        onSubmitClick={() => setIsSubmitModalOpen(true)}
      />

      {/* Main Examination Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col lg:flex-row gap-6">
        {/* Question Panel */}
        <div className="flex-1 flex flex-col min-h-[500px]">
          <QuestionCard
            question={currentQuestion}
            questionIndex={currentQuestionIndex >= 0 ? currentQuestionIndex : 0}
            totalQuestionsInSection={currentSectionQuestions.length}
            selectedOptionId={currentResponse?.selectedOptionId || null}
            onSelectOption={handleSelectOption}
          />

          {/* Controls Bar */}
          <div className="bg-white border-t border-slate-200 p-4 rounded-b-xl mt-px shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevQuestion}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearResponse}
                className="text-slate-600 hover:text-slate-900"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear Response
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isMarkedForReview ? 'warning' : 'outline'}
                size="sm"
                onClick={handleMarkForReview}
                className="flex items-center gap-1.5"
              >
                <Bookmark className="w-4 h-4" />
                {isMarkedForReview ? 'Marked for Review' : 'Mark for Review & Next'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleNextQuestion}
                className="flex items-center gap-1 shadow-xs"
              >
                Save & Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Palette Panel */}
        <QuestionPalette
          questions={currentSectionQuestions.map(q => ({ id: q.id, sectionCode: q.sectionCode }))}
          currentQuestionId={currentQuestionId}
          responses={responses}
          visitedQuestions={visitedQuestions}
          onSelectQuestion={selectQuestion}
        />
      </div>

      {/* Confirmation Modal */}
      <SubmitConfirmModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirmSubmit={executeSubmission}
        totalQuestions={allQuestions.length}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        markedCount={markedCount}
        remainingSeconds={remainingSeconds}
      />
    </div>
  );
}
