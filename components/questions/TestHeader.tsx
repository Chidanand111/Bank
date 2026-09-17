'use client';

import React from 'react';
import { Timer } from './Timer';
import { Button } from '../ui/Button';
import { ShieldCheck, Send, Lock, CheckCircle2, LogOut } from 'lucide-react';

export interface TestHeaderProps {
  testTitle: string;
  sections: { code: string; name: string }[];
  currentSectionCode: string;
  lockedSectionCodes?: string[];
  onSelectSection: (code: string) => void;
  remainingSeconds: number;
  totalRemainingSeconds?: number;
  timerLabel?: string;
  isSectionalTimer?: boolean;
  onTickTimer?: () => void;
  onTimeUp?: () => void;
  onSubmitClick: () => void;
  onExitClick?: () => void;
}

export const TestHeader: React.FC<TestHeaderProps> = ({
  testTitle,
  sections,
  currentSectionCode,
  lockedSectionCodes = [],
  onSelectSection,
  remainingSeconds,
  totalRemainingSeconds,
  timerLabel = 'Section Time',
  isSectionalTimer = false,
  onTickTimer,
  onTimeUp,
  onSubmitClick,
  onExitClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top title and timer bar */}
        <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">{testTitle}</h1>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 hidden sm:inline">BankMock CBT Console</span>
                {isSectionalTimer && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                    20m / Section (Official IBPS Pattern)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Timer
              remainingSeconds={remainingSeconds}
              label={timerLabel}
              totalRemainingSeconds={totalRemainingSeconds}
              onTick={onTickTimer}
              onTimeUp={onTimeUp}
            />

            {onExitClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExitClick}
                className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-red-700 hover:bg-red-50 hover:border-red-300 shrink-0"
                title="Exit exam without submitting (all answers will be erased)"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Exit Exam</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            )}

            <Button
              variant="danger"
              size="sm"
              onClick={onSubmitClick}
              className="flex items-center gap-1.5 font-semibold shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Submit Test</span>
              <span className="sm:hidden">Submit</span>
            </Button>
          </div>
        </div>

        {/* Section selection tabs */}
        <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2 shrink-0 flex items-center gap-1">
            Exam Sections:
          </span>
          {sections.map((sec) => {
            const isActive = sec.code === currentSectionCode;
            const isLocked = lockedSectionCodes.includes(sec.code);

            // When isSectionalTimer is true, candidate CANNOT navigate to any other section!
            const isDisabled = isSectionalTimer ? !isActive : isLocked;

            return (
              <button
                key={sec.code}
                disabled={isDisabled}
                onClick={() => {
                  if (!isSectionalTimer && !isLocked) {
                    onSelectSection(sec.code);
                  }
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs cursor-default'
                    : isLocked
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : isSectionalTimer
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-75'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
                }`}
                title={
                  isActive
                    ? 'Currently active section (20 minutes allocated)'
                    : isLocked
                    ? 'This section has concluded and is locked.'
                    : isSectionalTimer
                    ? 'This section will unlock automatically once the 20 minutes for the active section conclude.'
                    : sec.name
                }
              >
                {isLocked ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : isActive ? (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                ) : (
                  <Lock className="w-3 h-3 text-slate-400" />
                )}
                <span>{sec.name}</span>
                {isLocked ? (
                  <span className="text-[10px] text-emerald-600 font-bold">(Completed)</span>
                ) : isActive ? (
                  <span className="text-[10px] text-blue-100 font-bold">(Active)</span>
                ) : isSectionalTimer ? (
                  <span className="text-[10px] text-slate-400 font-medium">(Locked)</span>
                ) : null}
              </button>
            );
          })}

          {isSectionalTimer && (
            <span className="text-[11px] text-slate-500 italic ml-auto hidden md:inline">
              20m section lock active • Auto-advances to next section when timer concludes
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
