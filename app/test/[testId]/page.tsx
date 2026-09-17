'use client';

import React, { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getMockTestById, saveAttemptResult } from '@/lib/services/testService';
import { calculateAttemptResult } from '@/lib/scoring/scoreCalculator';
import { MockTest, Question, QuestionStatus, UserResponseState } from '@/types';
import { TestHeader } from '@/components/questions/TestHeader';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { QuestionPalette } from '@/components/questions/QuestionPalette';
import { SubmitConfirmModal } from '@/components/questions/SubmitConfirmModal';
import { ProctoringGuard } from '@/components/questions/ProctoringGuard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ChevronLeft, ChevronRight, Bookmark, RotateCcw, CheckCircle2, ArrowRight, AlertTriangle, LogOut } from 'lucide-react';
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
  
  // Sectional Timing State (20 minutes per section: 1200 seconds)
  const [sectionTimers, setSectionTimers] = useState<Record<string, number>>({});
  const [lockedSectionCodes, setLockedSectionCodes] = useState<string[]>([]);
  const [sectionTransitionModal, setSectionTransitionModal] = useState<{
    isOpen: boolean;
    prevSectionName: string;
    nextSectionName: string;
  }>({ isOpen: false, prevSectionName: '', nextSectionName: '' });

  // Proctoring strikes
  const [proctoringStrikes, setProctoringStrikes] = useState<number>(0);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const isSubmittedRef = useRef(false);

  // Storage key for test state persistence
  const storageKey = `bankmock_test_progress_${testId}`;

  // Fetch test details at start of exam
  useEffect(() => {
    async function loadTest() {
      // Check if candidate requested a clean restart or re-attempt
      const isReattemptOrRestart = typeof window !== 'undefined' && (
        window.location.search.includes('reattempt=true') ||
        window.location.search.includes('restart=true')
      );

      if (isReattemptOrRestart) {
        try {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(`bankmock_proctoring_strikes_${testId}`);
        } catch {
          // ignore
        }
      }

      // 1. Check if there's an in-progress session already saved (only if NOT re-attempt)
      let inProgressQuestions: Question[] | null = null;
      let inProgressResponses: Record<string, UserResponseState> | null = null;
      let inProgressVisited: string[] | null = null;
      let inProgressSectionTimers: Record<string, number> | null = null;
      let inProgressLockedSections: string[] | null = null;
      let inProgressStrikes: number | null = null;
      let inProgressSectionCode: string | null = null;
      let inProgressQuestionId: string | null = null;

      if (!isReattemptOrRestart) {
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.questions && parsed.questions.length > 0) {
              inProgressQuestions = parsed.questions;
            }
            if (parsed.responses) inProgressResponses = parsed.responses;
            if (parsed.visitedQuestions) inProgressVisited = parsed.visitedQuestions;
            if (parsed.sectionTimers) inProgressSectionTimers = parsed.sectionTimers;
            if (parsed.lockedSectionCodes) inProgressLockedSections = parsed.lockedSectionCodes;
            if (typeof parsed.proctoringStrikes === 'number') inProgressStrikes = parsed.proctoringStrikes;
            if (parsed.currentSectionCode) inProgressSectionCode = parsed.currentSectionCode;
            if (parsed.currentQuestionId) inProgressQuestionId = parsed.currentQuestionId;
          }
        } catch (err) {
          console.error('Error reading saved session:', err);
        }
      }

      // 2. If resuming an active session
      if (inProgressQuestions && inProgressQuestions.length > 0) {
        const baseTest = await getMockTestById(testId);
        if (baseTest) {
          const freshMap = new Map(baseTest.questions.map(q => [q.id, q]));
          const refreshedQuestions = inProgressQuestions.map(oldQ => {
            const fresh = freshMap.get(oldQ.id);
            if (!fresh) return oldQ;
            return {
              ...oldQ,
              imageUrl: fresh.imageUrl || oldQ.imageUrl,
              passageImageUrl: fresh.passageImageUrl || oldQ.passageImageUrl,
              options: oldQ.options.map((opt, idx) => ({
                ...opt,
                imageUrl: fresh.options[idx]?.imageUrl || opt.imageUrl,
              })),
            };
          });

          const activeTest: MockTest = {
            ...baseTest,
            questions: refreshedQuestions,
          };
          setTest(activeTest);

          if (inProgressResponses) setResponses(inProgressResponses);
          if (inProgressVisited) setVisitedQuestions(inProgressVisited);
          if (inProgressSectionTimers) setSectionTimers(inProgressSectionTimers);
          if (inProgressLockedSections) setLockedSectionCodes(inProgressLockedSections);
          if (inProgressStrikes) setProctoringStrikes(inProgressStrikes);

          const defaultSecCode = inProgressSectionCode || activeTest.sections[0]?.code || activeTest.questions[0]?.sectionCode || 'GENERAL';
          const defaultQId = inProgressQuestionId || activeTest.questions.find(q => q.sectionCode === defaultSecCode)?.id || activeTest.questions[0]?.id || '';

          setCurrentSectionCode(defaultSecCode);
          setCurrentQuestionId(defaultQId);
        }
        setLoading(false);
        return;
      }

      // 3. New exam start: Retrieve all questions previously seen by this user
      const seenQuestionIds = getUserSeenQuestionIds();
      const freshTest = await getMockTestById(testId, seenQuestionIds);

      if (freshTest) {
        setTest(freshTest);

        // Initialize 20 minutes (1200 seconds) per section
        const initialTimers: Record<string, number> = {};
        freshTest.sections.forEach((sec) => {
          // Standard banking: 20 mins per section = 1200 seconds
          initialTimers[sec.code] = (sec.durationMinutes || 20) * 60;
        });
        setSectionTimers(initialTimers);

        const initialSecCode = freshTest.sections[0]?.code || freshTest.questions[0]?.sectionCode || 'GENERAL';
        const initialQId = freshTest.questions.find(q => q.sectionCode === initialSecCode)?.id || freshTest.questions[0]?.id || '';

        setCurrentSectionCode(initialSecCode);
        setCurrentQuestionId(initialQId);
        setVisitedQuestions(initialQId ? [initialQId] : []);

        // Record these newly assigned questions
        const newIds = freshTest.questions.map(q => q.id);
        recordUserSeenQuestions(undefined, newIds);
      }
      setLoading(false);
    }
    loadTest();
  }, [testId, storageKey]);

  // Clean up in-progress answers on exit without submitting
  useEffect(() => {
    const handleUnloadExit = () => {
      if (!isSubmittedRef.current) {
        try {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(`bankmock_proctoring_strikes_${testId}`);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('beforeunload', handleUnloadExit);
    window.addEventListener('pagehide', handleUnloadExit);
    return () => {
      window.removeEventListener('beforeunload', handleUnloadExit);
      window.removeEventListener('pagehide', handleUnloadExit);
    };
  }, [storageKey, testId]);

  // Autosave responses, timers, and locks to localStorage
  useEffect(() => {
    if (!test || loading || isSubmittedRef.current) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          testId,
          questions: test.questions,
          responses,
          visitedQuestions,
          sectionTimers,
          lockedSectionCodes,
          proctoringStrikes,
          currentSectionCode,
          currentQuestionId,
        })
      );
    } catch (err) {
      console.error('Autosave error:', err);
    }
  }, [
    responses,
    visitedQuestions,
    sectionTimers,
    lockedSectionCodes,
    proctoringStrikes,
    currentSectionCode,
    currentQuestionId,
    test,
    loading,
    storageKey,
    testId,
  ]);

  // Submit Test logic
  const executeSubmission = useCallback(() => {
    if (!test || isSubmitting) return;
    isSubmittedRef.current = true;
    setIsSubmitting(true);

    // Calculate total time taken across all sections
    const totalAllocated = test.sections.reduce((acc, s) => acc + (s.durationMinutes || 20) * 60, 0);
    const totalRemaining = Object.values(sectionTimers).reduce((acc, v) => acc + v, 0);
    const totalTimeTaken = Math.max(1, totalAllocated - totalRemaining);

    const attemptId = `att-${Date.now()}`;
    const result = calculateAttemptResult(test, responses, totalTimeTaken, attemptId);

    // Save result to localStorage
    saveAttemptResult(result);

    // Clear saved progress
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`bankmock_proctoring_strikes_${testId}`);
    } catch (e) {
      console.error(e);
    }

    router.push(`/result/${attemptId}`);
  }, [test, isSubmitting, sectionTimers, responses, storageKey, testId, router]);

  // Active section remaining seconds
  const activeSectionRemainingSeconds = sectionTimers[currentSectionCode] ?? 1200;

  // Total remaining seconds across all unexpired sections
  const totalRemainingSeconds = Object.values(sectionTimers).reduce((sum, secVal) => sum + secVal, 0);

  // Handle Section Time Up -> Auto-transition to next section
  const handleSectionTimeUp = useCallback(() => {
    if (!test || !currentSectionCode) return;

    // Lock current section permanently
    setLockedSectionCodes(prev => (prev.includes(currentSectionCode) ? prev : [...prev, currentSectionCode]));

    const currentIndex = test.sections.findIndex(s => s.code === currentSectionCode);
    const hasNextSection = currentIndex >= 0 && currentIndex < test.sections.length - 1;

    if (hasNextSection) {
      const nextSec = test.sections[currentIndex + 1];
      const prevSec = test.sections[currentIndex];

      setSectionTransitionModal({
        isOpen: true,
        prevSectionName: prevSec.name,
        nextSectionName: nextSec.name,
      });

      setCurrentSectionCode(nextSec.code);
      const nextFirstQ = test.questions.find(q => q.sectionCode === nextSec.code);
      if (nextFirstQ) {
        setCurrentQuestionId(nextFirstQ.id);
        setVisitedQuestions(prev => (prev.includes(nextFirstQ.id) ? prev : [...prev, nextFirstQ.id]));
      }
    } else {
      // Final section finished -> auto-submit full test
      executeSubmission();
    }
  }, [test, currentSectionCode, executeSubmission]);

  // Master 1-Second Sectional Countdown Clock (decoupled from component re-renders)
  useEffect(() => {
    if (loading || isSubmitting || isSubmittedRef.current || !test || !currentSectionCode) return;

    const timerId = setInterval(() => {
      setSectionTimers(prev => {
        const currentSecTime = prev[currentSectionCode];
        if (typeof currentSecTime !== 'number') return prev;

        if (currentSecTime <= 1) {
          setTimeout(() => {
            handleSectionTimeUp();
          }, 0);
          return {
            ...prev,
            [currentSectionCode]: 0,
          };
        }

        return {
          ...prev,
          [currentSectionCode]: currentSecTime - 1,
        };
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [loading, isSubmitting, test, currentSectionCode, handleSectionTimeUp]);

  // Handle active section timer tick (no-op retained for backwards compatibility)
  const handleSectionTimerTick = useCallback(() => {
    // Clock is now handled by the master interval above
  }, []);

  // Mark question as visited when changing question (constrained to active section)
  const selectQuestion = useCallback((qId: string) => {
    if (test) {
      const targetQ = test.questions.find(item => item.id === qId);
      if (!targetQ) return;
      // Disallow navigating to locked sections
      if (lockedSectionCodes.includes(targetQ.sectionCode)) {
        return;
      }
      // Strict sectional timing prevents selecting questions outside active 20-minute section!
      if (targetQ.sectionCode !== currentSectionCode) {
        return;
      }
    }

    setCurrentQuestionId(qId);
    setVisitedQuestions(prev => (prev.includes(qId) ? prev : [...prev, qId]));
  }, [test, currentSectionCode, lockedSectionCodes]);

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
      const newStatus: QuestionStatus = isMarked ? 'MARKED_FOR_REVIEW' : 'NOT_ANSWERED';

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

      const isAnswered = Boolean(existing.selectedOptionId);
      const newMarked = !existing.isMarkedForReview;

      let newStatus: QuestionStatus = 'NOT_ANSWERED';
      if (isAnswered && newMarked) newStatus = 'ANSWERED_AND_MARKED';
      else if (newMarked) newStatus = 'MARKED_FOR_REVIEW';
      else if (isAnswered) newStatus = 'ANSWERED';

      return {
        ...prev,
        [currentQuestionId]: {
          ...existing,
          isMarkedForReview: newMarked,
          status: newStatus,
        },
      };
    });

    handleNextQuestion();
  };

  // Save & Next
  const handleSaveAndNext = () => {
    setResponses(prev => {
      const existing = prev[currentQuestionId] || {
        questionId: currentQuestionId,
        selectedOptionId: null,
        isMarkedForReview: false,
        status: 'NOT_ANSWERED',
        timeSpentSeconds: 0,
      };

      const isAnswered = Boolean(existing.selectedOptionId);
      let newStatus: QuestionStatus = isAnswered ? 'ANSWERED' : 'NOT_ANSWERED';
      if (isAnswered && existing.isMarkedForReview) newStatus = 'ANSWERED_AND_MARKED';

      return {
        ...prev,
        [currentQuestionId]: {
          ...existing,
          status: newStatus,
        },
      };
    });

    handleNextQuestion();
  };

  // Navigation Helpers (Constrained within current section)
  const currentSectionQuestions = test?.questions.filter(q => q.sectionCode === currentSectionCode) || [];
  const currentQuestionIndex = currentSectionQuestions.findIndex(q => q.id === currentQuestionId);

  const handleNextQuestion = () => {
    if (currentQuestionIndex < currentSectionQuestions.length - 1) {
      const nextQ = currentSectionQuestions[currentQuestionIndex + 1];
      selectQuestion(nextQ.id);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevQ = currentSectionQuestions[currentQuestionIndex - 1];
      selectQuestion(prevQ.id);
    }
  };

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
  const activeSectionObj = test.sections.find(s => s.code === currentSectionCode);

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
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none pb-16 lg:pb-0 relative">
      {/* 1. Exam Anti-Cheating & Proctoring Suite */}
      <ProctoringGuard
        testId={testId}
        initialStrikes={proctoringStrikes}
        onStrikesChange={(newStrikes) => setProctoringStrikes(newStrikes)}
        onMaxStrikesReached={executeSubmission}
      />

      {/* 2. Header Console with 20-Minute Sectional Timer and Strict Section Lock */}
      <TestHeader
        testTitle={test.title}
        sections={test.sections}
        currentSectionCode={currentSectionCode}
        lockedSectionCodes={lockedSectionCodes}
        remainingSeconds={activeSectionRemainingSeconds}
        totalRemainingSeconds={totalRemainingSeconds}
        timerLabel={`${activeSectionObj?.name || 'Section'} Time`}
        isSectionalTimer={true}
        onSelectSection={() => {
          // Strictly disabled: candidate cannot move to next section until active section 20-minute timer expires!
        }}
        onTickTimer={handleSectionTimerTick}
        onTimeUp={handleSectionTimeUp}
        onSubmitClick={() => setIsSubmitModalOpen(true)}
        onExitClick={() => setIsExitModalOpen(true)}
      />

      {/* Main Examination Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
        {/* Left Column: Active Question Card & Actions */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-600">
            <span className="font-bold text-slate-900">
              Active Section: <span className="text-blue-600">{activeSectionObj?.name}</span>
            </span>
            <span className="font-mono text-slate-500">
              Question {currentQuestionIndex + 1} of {currentSectionQuestions.length}
            </span>
          </div>

          <QuestionCard
            question={currentQuestion}
            questionIndex={currentQuestionIndex + 1}
            totalQuestionsInSection={currentSectionQuestions.length}
            selectedOptionId={currentResponse?.selectedOptionId || null}
            onSelectOption={handleSelectOption}
          />

          {/* Action Control Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkForReview}
                className={`flex items-center gap-1.5 ${
                  isMarkedForReview ? 'bg-purple-50 text-purple-700 border-purple-300' : ''
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>{isMarkedForReview ? 'Marked' : 'Mark for Review'}</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearResponse}
                className="flex items-center gap-1.5 text-slate-600"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Clear Response</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex <= 0}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAndNext}
                className="flex items-center gap-1.5 shadow-xs"
              >
                <span>Save & Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Question Palette Navigation */}
        <div className="lg:col-span-4 w-full">
          <QuestionPalette
            questions={currentSectionQuestions}
            responses={responses}
            visitedQuestions={visitedQuestions}
            currentQuestionId={currentQuestionId}
            onSelectQuestion={selectQuestion}
          />
        </div>
      </main>

      {/* Submit Confirmation Modal */}
      <SubmitConfirmModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirmSubmit={executeSubmission}
        totalQuestions={allQuestions.length}
        answeredCount={answeredCount}
        unansweredCount={unansweredCount}
        markedCount={markedCount}
        remainingSeconds={totalRemainingSeconds}
      />

      {/* Section Transition Modal */}
      <Modal
        isOpen={sectionTransitionModal.isOpen}
        onClose={() => setSectionTransitionModal({ isOpen: false, prevSectionName: '', nextSectionName: '' })}
        title="Section Time Expired — Auto Transition"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm">
                {sectionTransitionModal.prevSectionName} Completed
              </h4>
              <p className="mt-1 leading-relaxed text-blue-800">
                The 20-minute time limit for <strong>{sectionTransitionModal.prevSectionName}</strong> has concluded and the section is now locked.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold">Next Section:</span>
              <span className="font-bold text-indigo-700">{sectionTransitionModal.nextSectionName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold">Allocated Time:</span>
              <span className="font-mono font-bold text-slate-900">20 Minutes (1200s)</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setSectionTransitionModal({ isOpen: false, prevSectionName: '', nextSectionName: '' })}
            className="w-full justify-center bg-blue-600 hover:bg-blue-700 font-bold"
          >
            Start {sectionTransitionModal.nextSectionName} (20:00) <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </Modal>

      {/* Exit Exam Without Submitting Confirmation Modal */}
      <Modal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        title="Exit Exam Without Submitting?"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-900">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              All In-Progress Answers Will Be Erased
            </div>
            <p className="leading-relaxed">
              If you leave this exam session now without clicking <strong>Submit Test</strong>, all your selected answers and progress will be permanently erased.
            </p>
            <p className="leading-relaxed font-semibold text-amber-800">
              When you restart or re-enter this exam, it will begin as a brand new test with a full 60-minute countdown timer (20 minutes per section).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setIsExitModalOpen(false)}
            >
              Resume Test
            </Button>
            <Button
              variant="danger"
              size="md"
              type="button"
              onClick={() => {
                isSubmittedRef.current = true;
                try {
                  localStorage.removeItem(storageKey);
                  localStorage.removeItem(`bankmock_proctoring_strikes_${testId}`);
                } catch {
                  // ignore
                }
                router.push('/tests');
              }}
              className="font-bold flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Erase Answers & Exit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
