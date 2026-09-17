'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ShieldAlert, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export interface ProctoringGuardProps {
  candidateName?: string;
  candidateEmail?: string;
  testId: string;
  enabled?: boolean;
  maxStrikes?: number;
  initialStrikes?: number;
  onStrikesChange?: (strikes: number) => void;
  onMaxStrikesReached: () => void;
}

export const ProctoringGuard: React.FC<ProctoringGuardProps> = ({
  candidateName = 'Candidate',
  candidateEmail = 'candidate@bankmock.com',
  testId,
  enabled = true,
  maxStrikes = 3,
  initialStrikes = 0,
  onStrikesChange,
  onMaxStrikesReached,
}) => {
  const [strikes, setStrikes] = useState<number>(initialStrikes);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningReason, setWarningReason] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenBanner, setShowFullscreenBanner] = useState(false);
  
  // Guard against duplicate triggers within a short window
  const lastViolationTimeRef = useRef<number>(0);

  // Sync external strikes change
  useEffect(() => {
    if (initialStrikes > 0) {
      setStrikes(initialStrikes);
    }
  }, [initialStrikes]);

  const recordViolation = useCallback((reason: string) => {
    if (!enabled) return;

    const now = Date.now();
    // Debounce violations within 2 seconds
    if (now - lastViolationTimeRef.current < 2000) return;
    lastViolationTimeRef.current = now;

    setStrikes((prev) => {
      const nextStrikes = prev + 1;
      if (onStrikesChange) {
        onStrikesChange(nextStrikes);
      }

      setWarningReason(reason);
      setShowWarningModal(true);

      if (nextStrikes >= maxStrikes) {
        // Automatically submit test when max strikes reached
        setTimeout(() => {
          onMaxStrikesReached();
        }, 1500);
      }

      return nextStrikes;
    });
  }, [enabled, maxStrikes, onStrikesChange, onMaxStrikesReached]);

  // 1. Fullscreen change listener
  useEffect(() => {
    if (!enabled) return;

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        setShowFullscreenBanner(true);
      } else {
        setShowFullscreenBanner(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [enabled]);

  // Request fullscreen
  const enterFullscreen = useCallback(() => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Browser may block automatic fullscreen without user interaction
      });
    }
  }, []);

  // 2. Tab-switch & window blur detection
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordViolation('Tab switching or minimizing the exam window detected');
      }
    };

    const handleWindowBlur = () => {
      recordViolation('Focus lost from exam browser window');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, recordViolation]);

  // 3. Prevent Copy/Paste, Right Click, and DevTools Shortcuts
  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Block Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+P, Ctrl+S
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (['c', 'v', 'x', 'u', 'p', 's', 'a'].includes(key)) {
          e.preventDefault();
          return false;
        }
      }
      // Block PrintScreen
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);

  return (
    <>
      {/* Dynamic Faint Anti-Leak Watermark across background */}
      <div
        className="pointer-events-none fixed inset-0 z-10 overflow-hidden opacity-[0.035] select-none flex flex-wrap gap-24 p-8 text-slate-900 font-mono text-xs rotate-[-12deg]"
        aria-hidden="true"
      >
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="whitespace-nowrap">
            {candidateName} • {candidateEmail} • ID: {testId.slice(0, 14)}
          </div>
        ))}
      </div>

      {/* Top Warning Bar when not in Fullscreen */}
      {showFullscreenBanner && !isFullscreen && (
        <div className="sticky top-0 z-50 bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Official Exam Rule: Please maintain Fullscreen Mode to prevent violation strikes.</span>
          </div>
          <button
            onClick={enterFullscreen}
            className="bg-white text-amber-900 px-2.5 py-1 rounded-md text-xs font-bold hover:bg-amber-50 cursor-pointer transition-colors"
          >
            Enter Fullscreen
          </button>
        </div>
      )}

      {/* Proctoring Violation Alert Modal */}
      <Modal
        isOpen={showWarningModal}
        onClose={() => {
          if (strikes < maxStrikes) {
            setShowWarningModal(false);
          }
        }}
        title="Exam Proctoring Alert"
      >
        <div className="space-y-4">
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              strikes >= maxStrikes
                ? 'bg-red-50 border-red-300 text-red-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            {strikes >= maxStrikes ? (
              <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="font-extrabold text-sm">
                {strikes >= maxStrikes
                  ? 'Maximum Violations Reached — Exam Terminating'
                  : `Proctoring Strike ${strikes} of ${maxStrikes}`}
              </h4>
              <p className="text-xs mt-1 leading-relaxed">{warningReason}</p>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" /> Exam Security & Conduct Rules:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>Do not switch tabs, open other applications, or minimize the window.</li>
              <li>Right-click, text selection, and shortcut copying are strictly disabled.</li>
              <li>
                You have <strong className="text-slate-900">{Math.max(0, maxStrikes - strikes)}</strong> warning
                {maxStrikes - strikes === 1 ? '' : 's'} remaining before your exam is automatically submitted.
              </li>
            </ul>
          </div>

          {strikes < maxStrikes ? (
            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setShowWarningModal(false);
                  enterFullscreen();
                }}
                className="w-full justify-center bg-blue-600 hover:bg-blue-700 font-bold"
              >
                I Understand & Resume Examination
              </Button>
            </div>
          ) : (
            <div className="pt-2 text-center text-xs font-bold text-red-600 animate-pulse">
              Submitting examination responses now...
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
