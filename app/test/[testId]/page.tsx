'use client';

import React, { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getMockTestById, saveAttemptResult } from '@/lib/services/testService';
import { saveAttemptAction } from '@/lib/services/adminService';
import { AttemptResult, MockTest, Question, QuestionStatus, UserResponseState } from '@/types';
import { TestHeader } from '@/components/questions/TestHeader';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { QuestionPalette } from '@/components/questions/QuestionPalette';
import { SubmitConfirmModal } from '@/components/questions/SubmitConfirmModal';
import { ProctoringGuard } from '@/components/questions/ProctoringGuard';
import { SubmissionStatusModal } from '@/components/questions/SubmissionStatusModal';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  LogOut,
  Lock,
} from 'lucide-react';
import { getUserSeenQuestionIds, recordUserSeenQuestions } from '@/lib/services/userQuestionTracker';
import {
  isExamComposite,
  calculateExamTimeRemaining,
  computeMonotonicRemainingTime,
  syncSectionalStateOnResume,
} from '@/lib/exam-engine/timingUtils';

export interface TestPageProps {
  params: Promise<{ testId: string }>;
}

export default function TestPage({ params }: TestPageProps) {
  const { testId } = use(params);
  const router = useRouter();

  const [test, setTest] = useState<MockTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentSectionCode, setCurrentSectionCode] = useState<string>('');
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
  const [responses, setResponses] = useState<Record<string, UserResponseState>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<string[]>([]);

  // Stable session attempt ID (preserved across retries to prevent duplicate submissions)
  const [sessionAttemptId, setSessionAttemptId] = useState<string>('');

  // Authoritative timing state
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [sessionDeadline, setSessionDeadline] = useState<number>(0);
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState<number>(0);
  const [lastRecordedRemainingSeconds, setLastRecordedRemainingSeconds] = useState<number>(0);

  // Composite Exam Master Timer (single countdown clock for SSC / Railway)
  const [compositeRemainingSeconds, setCompositeRemainingSeconds] = useState<number>(0);

  // Sectional Timing State (for Banking exams: IBPS PO, SBI Clerk)
  const [sectionTimers, setSectionTimers] = useState<Record<string, number>>({});
  const [lockedSectionCodes, setLockedSectionCodes] = useState<string[]>([]);
  const [sectionTransitionModal, setSectionTransitionModal] = useState<{
    isOpen: boolean;
    prevSectionName: string;
    nextSectionName: string;
  }>({ isOpen: false, prevSectionName: '', nextSectionName: '' });

  // Proctoring strikes
  const [proctoringStrikes, setProctoringStrikes] = useState<number>(0);

  // Modals & Submission state machine
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const isSubmittingRef = useRef(false);
  const isSubmittedRef = useRef(false);

  // Storage key for test state persistence
  const storageKey = `bankmock_test_progress_${testId}`;

  // Fetch test details at start of exam or restore in-progress session
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
      let inProgressAttemptId: string | null = null;
      let inProgressStartTime: number | null = null;
      let inProgressDeadline: number | null = null;
      let inProgressCompositeRemaining: number | null = null;
      let inProgressLastRecordedRemaining: number | null = null;
      let inProgressLastHeartbeat: number | null = null;

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
            if (parsed.sessionAttemptId) inProgressAttemptId = parsed.sessionAttemptId;
            if (typeof parsed.sessionStartTime === 'number') inProgressStartTime = parsed.sessionStartTime;
            if (typeof parsed.sessionDeadline === 'number') inProgressDeadline = parsed.sessionDeadline;
            if (typeof parsed.compositeRemainingSeconds === 'number') inProgressCompositeRemaining = parsed.compositeRemainingSeconds;
            if (typeof parsed.lastRecordedRemainingSeconds === 'number') inProgressLastRecordedRemaining = parsed.lastRecordedRemainingSeconds;
            if (typeof parsed.lastHeartbeatTime === 'number') inProgressLastHeartbeat = parsed.lastHeartbeatTime;
          }
        } catch (err) {
          console.error('Error reading saved session:', err);
        }
      }

      // 2. If resuming an active session
      if (inProgressQuestions && inProgressQuestions.length > 0) {
        try {
          const baseTest = await getMockTestById(testId);
          if (baseTest) {
            const isComposite = isExamComposite(baseTest);
            const totalAllocatedSecs = (baseTest.durationMinutes || 60) * 60;
            const now = Date.now();

            const stableAttemptId = inProgressAttemptId || `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const startTime = inProgressStartTime || now;
            const deadline = inProgressDeadline || (startTime + totalAllocatedSecs * 1000);
            const lastRecorded = inProgressLastRecordedRemaining ?? totalAllocatedSecs;
            const lastHeartbeat = inProgressLastHeartbeat ?? now;

            setSessionAttemptId(stableAttemptId);
            setSessionStartTime(startTime);
            setSessionDeadline(deadline);
            setLastRecordedRemainingSeconds(lastRecorded);
            setLastHeartbeatTime(now);

            const freshMap = new Map(baseTest.questions.map(q => [q.id, q]));
            const refreshedQuestions = inProgressQuestions.map(oldQ => {
              const fresh = freshMap.get(oldQ.id);
              if (!fresh) return oldQ;
              return {
                ...oldQ,
                imageUrl: fresh.imageUrl || oldQ.imageUrl,
                passage: fresh.passage || oldQ.passage,
                passageImageUrl: fresh.passageImageUrl || oldQ.passageImageUrl,
                groupId: fresh.groupId || oldQ.groupId,
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
            if (inProgressStrikes) setProctoringStrikes(inProgressStrikes);

            // Synchronize timing on resume with monotonic clock protection
            if (isComposite) {
              const clockSync = computeMonotonicRemainingTime({
                sessionDeadline: deadline,
                lastRecordedRemaining: inProgressCompositeRemaining ?? lastRecorded,
                lastHeartbeatTime: lastHeartbeat,
                now,
              });
              setCompositeRemainingSeconds(clockSync.effectiveRemaining);
              setLastRecordedRemainingSeconds(clockSync.effectiveRemaining);

              const initialSecCode = inProgressSectionCode || activeTest.sections[0]?.code || 'GENERAL';
              const initialQId = inProgressQuestionId || activeTest.questions.find(q => q.sectionCode === initialSecCode)?.id || activeTest.questions[0]?.id || '';
              setCurrentSectionCode(initialSecCode);
              setCurrentQuestionId(initialQId);
            } else {
              // Sectional locked: determine expired sections based on elapsed time
              const resumeSync = syncSectionalStateOnResume({
                sections: activeTest.sections,
                sessionStartTime: startTime,
                currentSectionTimers: inProgressSectionTimers || {},
                lockedSectionCodes: inProgressLockedSections || [],
                now,
              });

              setSectionTimers(resumeSync.updatedSectionTimers);
              setLockedSectionCodes(resumeSync.updatedLockedSections);

              const defaultSecCode = resumeSync.activeSectionCode || inProgressSectionCode || activeTest.sections[0]?.code || 'GENERAL';
              const defaultQId = inProgressQuestionId || activeTest.questions.find(q => q.sectionCode === defaultSecCode)?.id || activeTest.questions[0]?.id || '';
              setCurrentSectionCode(defaultSecCode);
              setCurrentQuestionId(defaultQId);
            }
          }
        } catch (err) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load exam session.');
        } finally {
          setLoading(false);
        }
        return;
      }

      // 3. New exam start: Retrieve questions
      try {
        const seenQuestionIds = getUserSeenQuestionIds();
        const freshTest = await getMockTestById(testId, seenQuestionIds);

        if (freshTest) {
          setTest(freshTest);

          const isComposite = isExamComposite(freshTest);
          const totalDurationSecs = (freshTest.durationMinutes || 60) * 60;
          const now = Date.now();
          const stableAttemptId = `att-${now}-${Math.random().toString(36).slice(2, 7)}`;
          const deadline = now + totalDurationSecs * 1000;

          setSessionAttemptId(stableAttemptId);
          setSessionStartTime(now);
          setSessionDeadline(deadline);
          setLastHeartbeatTime(now);
          setLastRecordedRemainingSeconds(totalDurationSecs);

          if (isComposite) {
            setCompositeRemainingSeconds(totalDurationSecs);
            const initialTimers: Record<string, number> = {};
            freshTest.sections.forEach((sec) => {
              initialTimers[sec.code] = totalDurationSecs;
            });
            setSectionTimers(initialTimers);
          } else {
            const initialTimers: Record<string, number> = {};
            freshTest.sections.forEach((sec) => {
              initialTimers[sec.code] = (sec.durationMinutes || 20) * 60;
            });
            setSectionTimers(initialTimers);
          }

          const initialSecCode = freshTest.sections[0]?.code || freshTest.questions[0]?.sectionCode || 'GENERAL';
          const initialQId = freshTest.questions.find(q => q.sectionCode === initialSecCode)?.id || freshTest.questions[0]?.id || '';

          setCurrentSectionCode(initialSecCode);
          setCurrentQuestionId(initialQId);
          setVisitedQuestions(initialQId ? [initialQId] : []);

          // Record newly assigned questions
          const newIds = freshTest.questions.map(q => q.id);
          recordUserSeenQuestions(undefined, newIds);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load exam session.');
      } finally {
        setLoading(false);
      }
    }
    loadTest();
  }, [testId, storageKey]);

  // Autosave responses, timers, and locks to localStorage
  useEffect(() => {
    if (!test || loading || isSubmittedRef.current || !sessionAttemptId) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          testId,
          sessionAttemptId,
          sessionStartTime,
          sessionDeadline,
          lastRecordedRemainingSeconds,
          lastHeartbeatTime,
          compositeRemainingSeconds,
          sectionTimers,
          lockedSectionCodes,
          proctoringStrikes,
          currentSectionCode,
          currentQuestionId,
          responses,
          visitedQuestions,
          questions: test.questions,
        })
      );
    } catch (err) {
      console.error('Autosave error:', err);
    }
  }, [
    responses,
    visitedQuestions,
    compositeRemainingSeconds,
    sectionTimers,
    lockedSectionCodes,
    proctoringStrikes,
    currentSectionCode,
    currentQuestionId,
    sessionAttemptId,
    sessionStartTime,
    sessionDeadline,
    lastRecordedRemainingSeconds,
    lastHeartbeatTime,
    test,
    loading,
    storageKey,
    testId,
  ]);

  // Submit Test logic with server-side validation and confirmed response handling
  const executeSubmission = useCallback(async () => {
    if (!test || isSubmittingRef.current || isSubmittedRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setIsSubmitModalOpen(false);
    setSubmissionPhase('submitting');
    setSubmissionError(null);

    const isComposite = isExamComposite(test);
    const totalAllocated = isComposite
      ? (test.durationMinutes || 60) * 60
      : test.sections.reduce((acc, s) => acc + (s.durationMinutes || 20) * 60, 0);

    const timingSummary = calculateExamTimeRemaining({
      test,
      isComposite,
      compositeRemainingSeconds,
      sectionTimers,
      lockedSectionCodes,
      currentSectionCode,
      isSubmitting: true,
    });

    const totalRemaining = timingSummary.totalRemainingSeconds;
    const totalTimeTaken = Math.max(1, Math.min(totalAllocated + 180, totalAllocated - totalRemaining));
    const attemptId = sessionAttemptId || `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Package candidate responses without client-side score assumptions
    const candidateQuestionDetails = (test.questions || []).map(q => {
      const resp = responses[q.id];
      const selectedOptionId = resp?.selectedOptionId || null;
      return {
        question: q,
        selectedOptionId,
        isCorrect: null,
        status: resp?.status || (selectedOptionId ? 'ANSWERED' : 'NOT_ANSWERED'),
        marksObtained: 0,
        timeSpentSeconds: resp?.timeSpentSeconds || 0,
      };
    });

    const candidatePayload: AttemptResult = {
      id: attemptId,
      mockTestId: test.id,
      mockTestTitle: test.title,
      examSlug: test.examSlug,
      examTitle: test.examTitle,
      userId: '',
      userName: '',
      startedAt: new Date(sessionStartTime || (Date.now() - totalTimeTaken * 1000)).toISOString(),
      completedAt: new Date().toISOString(),
      timeTakenSeconds: totalTimeTaken,
      totalDurationSeconds: totalAllocated,
      score: 0,
      maxScore: test.totalMarks,
      percentage: 0,
      accuracy: 0,
      totalQuestions: test.totalQuestions || test.questions.length,
      totalAttempted: 0,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      cutoffMarks: test.cutoffMarks,
      isCutoffCleared: false,
      sectionResults: [],
      topicResults: [],
      questionDetails: candidateQuestionDetails,
    };

    try {
      // 1. Authoritative server-side grading and persistence
      const saveRes = await saveAttemptAction(candidatePayload);

      if (saveRes.success && saveRes.result) {
        // Confirmed server success
        isSubmittedRef.current = true;
        saveAttemptResult(saveRes.result);
        setSubmissionPhase('success');

        try {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(`bankmock_proctoring_strikes_${testId}`);
        } catch (e) {
          console.error(e);
        }

        setTimeout(() => {
          router.push(`/result/${attemptId}`);
        }, 800);
        return;
      }

      // Check if duplicate submission (attempt already safely finalized on the server)
      if (saveRes.error && saveRes.error.toLowerCase().includes('already been finalized')) {
        isSubmittedRef.current = true;
        setSubmissionPhase('success');

        try {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(`bankmock_proctoring_strikes_${testId}`);
        } catch (e) {
          console.error(e);
        }

        setTimeout(() => {
          router.push(`/result/${attemptId}`);
        }, 800);
        return;
      }

      // Explicit server failure: Keep localStorage intact and allow retry
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setSubmissionPhase('error');
      setSubmissionError(saveRes.error || 'The server could not record your submission. Please retry.');
    } catch (networkErr: any) {
      console.error('Submission network error:', networkErr);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setSubmissionPhase('error');
      setSubmissionError(
        'Network connection interrupted. We could not reach the server to submit your test. Your responses remain safely preserved on your device. Please verify your connection and click Retry Submission.'
      );
    }
  }, [
    test,
    sessionAttemptId,
    sessionStartTime,
    compositeRemainingSeconds,
    sectionTimers,
    lockedSectionCodes,
    currentSectionCode,
    responses,
    storageKey,
    testId,
    router,
  ]);

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

  // Master 1-Second Countdown Clock with Monotonic Protection
  useEffect(() => {
    if (loading || isSubmitting || submissionPhase !== 'idle' || isSubmittedRef.current || !test || !sessionDeadline) return;

    const isComposite = isExamComposite(test);

    const timerId = setInterval(() => {
      const now = Date.now();
      setLastHeartbeatTime(now);

      if (isComposite) {
        setCompositeRemainingSeconds(prev => {
          const sync = computeMonotonicRemainingTime({
            sessionDeadline,
            lastRecordedRemaining: prev,
            lastHeartbeatTime,
            now,
          });

          const nextVal = Math.min(Math.max(0, prev - 1), sync.effectiveRemaining);
          setLastRecordedRemainingSeconds(nextVal);

          if (nextVal <= 0 || sync.isExpired) {
            clearInterval(timerId);
            setTimeout(() => {
              executeSubmission();
            }, 0);
            return 0;
          }
          return nextVal;
        });
      } else {
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

          const nextSecTime = currentSecTime - 1;
          return {
            ...prev,
            [currentSectionCode]: nextSecTime,
          };
        });
      }
    }, 1000);

    return () => clearInterval(timerId);
  }, [
    loading,
    isSubmitting,
    submissionPhase,
    test,
    currentSectionCode,
    sessionDeadline,
    lastHeartbeatTime,
    handleSectionTimeUp,
    executeSubmission,
  ]);

  // Compute Authoritative Remaining Times & Interaction Permissions
  const isComposite = isExamComposite(test);
  const timingSummary = calculateExamTimeRemaining({
    test,
    isComposite,
    compositeRemainingSeconds,
    sectionTimers,
    lockedSectionCodes,
    currentSectionCode,
    isSubmitting: isSubmitting || submissionPhase !== 'idle',
  });

  const {
    activeSectionRemainingSeconds,
    totalRemainingSeconds,
    isCurrentSectionExpired,
    isExamExpired,
    isInteractionDisabled,
  } = timingSummary;

  // Handle active section timer tick
  const handleSectionTimerTick = useCallback(() => {
    // Master interval handles countdown
  }, []);

  // Mark question as visited when changing question (constrained to active section or permitted cross-section)
  const selectQuestion = useCallback((qId: string) => {
    if (test) {
      const targetQ = test.questions.find(item => item.id === qId);
      if (!targetQ) return;
      // Disallow navigating to locked sections
      if (lockedSectionCodes.includes(targetQ.sectionCode)) {
        return;
      }
      // If cross-section navigation is allowed (SSC / Railway), auto-switch section
      if (targetQ.sectionCode !== currentSectionCode) {
        if (!test.allowSectionSwitch && test.timerType !== 'OVERALL_COMPOSITE') {
          return;
        }
        setCurrentSectionCode(targetQ.sectionCode);
      }
    }

    setCurrentQuestionId(qId);
    setVisitedQuestions(prev => (prev.includes(qId) ? prev : [...prev, qId]));
  }, [test, currentSectionCode, lockedSectionCodes]);

  // Handle Option Select (Blocked if section/exam is expired or submitting)
  const handleSelectOption = (optionId: string) => {
    if (isInteractionDisabled) return;

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

  // Clear Response (Blocked if section/exam is expired)
  const handleClearResponse = () => {
    if (isInteractionDisabled) return;

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

  // Mark for Review & Next (Blocked if section/exam is expired)
  const handleMarkForReview = () => {
    if (isInteractionDisabled) {
      handleNextQuestion();
      return;
    }

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

  // Save & Next (Navigation allowed; mutating blocked if section/exam is expired)
  const handleSaveAndNext = () => {
    if (!isInteractionDisabled) {
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
    }

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

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-red-200 shadow-xs max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
          <p className="text-sm text-slate-600">{loadError}</p>
          <Button onClick={() => router.push('/tests')}>Return to Practice Tests</Button>
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

  // Compute metrics for summary modal
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

      {/* 2. Header Console with Dynamic Timing Mode (Sectional or Overall Composite) */}
      <TestHeader
        testTitle={test.title}
        sections={test.sections}
        currentSectionCode={currentSectionCode}
        lockedSectionCodes={lockedSectionCodes}
        remainingSeconds={activeSectionRemainingSeconds}
        totalRemainingSeconds={isComposite ? undefined : totalRemainingSeconds}
        timerLabel={
          isComposite
            ? 'Total Exam Time Left'
            : `${activeSectionObj?.name || 'Section'} Time`
        }
        isSectionalTimer={!isComposite}
        allowSectionSwitch={isComposite}
        timerType={test.timerType || (isComposite ? 'OVERALL_COMPOSITE' : 'SECTIONAL_LOCKED')}
        onSelectSection={(selectedCode) => {
          if (isComposite) {
            if (lockedSectionCodes.includes(selectedCode)) return;
            setCurrentSectionCode(selectedCode);
            const firstQ = test.questions.find(q => q.sectionCode === selectedCode);
            if (firstQ) {
              setCurrentQuestionId(firstQ.id);
              setVisitedQuestions(prev => (prev.includes(firstQ.id) ? prev : [...prev, firstQ.id]));
            }
          }
        }}
        onTickTimer={handleSectionTimerTick}
        onTimeUp={isComposite ? executeSubmission : handleSectionTimeUp}
        onSubmitClick={() => setIsSubmitModalOpen(true)}
        onExitClick={() => setIsExitModalOpen(true)}
      />

      {/* Main Examination Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
        {/* Left Column: Active Question Card & Actions */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-600">
            <span className="font-bold text-slate-900">
              Active Section: <span className="text-blue-600">{activeSectionObj?.name || 'General'}</span>
            </span>
            <span className="font-mono text-slate-500">
              Question {currentQuestionIndex + 1} of {currentSectionQuestions.length}
            </span>
          </div>

          {/* Section Expired or Locked Banner */}
          {isInteractionDisabled && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 font-medium shadow-2xs">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {isExamExpired
                  ? 'Exam time limit has expired. Responses are locked for submission.'
                  : 'This section time limit has expired and answers are locked.'}
              </span>
            </div>
          )}

          <QuestionCard
            question={currentQuestion}
            questionIndex={currentQuestionIndex + 1}
            totalQuestionsInSection={currentSectionQuestions.length}
            selectedOptionId={currentResponse?.selectedOptionId || null}
            onSelectOption={handleSelectOption}
            disabled={isInteractionDisabled}
          />

          {/* Action Control Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkForReview}
                disabled={isInteractionDisabled}
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
                disabled={isInteractionDisabled}
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

      {/* Submission Status Modal (Saving Spinner, Success, Error with Safe Retry) */}
      <SubmissionStatusModal
        isOpen={submissionPhase !== 'idle'}
        phase={submissionPhase}
        errorMessage={submissionError}
        onRetry={executeSubmission}
        onClose={() => setSubmissionPhase('idle')}
        isExamExpired={isExamExpired}
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
                The time limit for <strong>{sectionTransitionModal.prevSectionName}</strong> has concluded and the section is now locked.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold">Next Section:</span>
              <span className="font-bold text-indigo-700">{sectionTransitionModal.nextSectionName}</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setSectionTransitionModal({ isOpen: false, prevSectionName: '', nextSectionName: '' })}
            className="w-full justify-center bg-blue-600 hover:bg-blue-700 font-bold"
          >
            Start {sectionTransitionModal.nextSectionName} <ArrowRight className="w-4 h-4 ml-1.5" />
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
              If you leave this exam session now without clicking <strong>Submit Test</strong>, all your selected answers and progress will be erased.
            </p>
            <p className="leading-relaxed font-semibold text-amber-800">
              When you restart or re-enter this exam, it will begin as a brand new test session.
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
