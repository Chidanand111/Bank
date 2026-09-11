'use client';

import React from 'react';
import { Timer } from './Timer';
import { Button } from '../ui/Button';
import { ShieldCheck, Send } from 'lucide-react';

export interface TestHeaderProps {
  testTitle: string;
  sections: { code: string; name: string }[];
  currentSectionCode: string;
  onSelectSection: (code: string) => void;
  remainingSeconds: number;
  onTickTimer: () => void;
  onTimeUp: () => void;
  onSubmitClick: () => void;
}

export const TestHeader: React.FC<TestHeaderProps> = ({
  testTitle,
  sections,
  currentSectionCode,
  onSelectSection,
  remainingSeconds,
  onTickTimer,
  onTimeUp,
  onSubmitClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top title and timer bar */}
        <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 line-clamp-1">{testTitle}</h1>
              <span className="text-xs text-slate-500 hidden sm:inline">BankMock Exam Console</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Timer
              remainingSeconds={remainingSeconds}
              onTick={onTickTimer}
              onTimeUp={onTimeUp}
            />

            <Button
              variant="danger"
              size="sm"
              onClick={onSubmitClick}
              className="flex items-center gap-1.5 font-semibold"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Submit Test</span>
              <span className="sm:hidden">Submit</span>
            </Button>
          </div>
        </div>

        {/* Section selection tabs */}
        <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2 shrink-0">
            Sections:
          </span>
          {sections.map((sec) => {
            const isActive = sec.code === currentSectionCode;
            return (
              <button
                key={sec.code}
                onClick={() => onSelectSection(sec.code)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {sec.name}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
