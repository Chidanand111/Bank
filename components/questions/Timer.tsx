'use client';

import React, { useEffect } from 'react';
import { Clock, Hourglass } from 'lucide-react';
import { formatSecondsToMMSS } from '@/lib/utils/formatters';

export interface TimerProps {
  remainingSeconds: number;
  label?: string;
  totalRemainingSeconds?: number;
  onTick: () => void;
  onTimeUp: () => void;
}

export const Timer: React.FC<TimerProps> = ({
  remainingSeconds,
  label = 'Section Time',
  totalRemainingSeconds,
  onTick,
  onTimeUp,
}) => {
  useEffect(() => {
    if (remainingSeconds <= 0) {
      onTimeUp();
      return;
    }

    const timerId = setInterval(() => {
      onTick();
    }, 1000);

    return () => clearInterval(timerId);
  }, [remainingSeconds, onTick, onTimeUp]);

  const isUrgent = remainingSeconds < 180; // less than 3 minutes

  return (
    <div className="flex items-center gap-2">
      {/* Primary Section Countdown Timer */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono font-bold transition-all shadow-2xs ${
          isUrgent
            ? 'bg-red-50 text-red-600 border-red-300 animate-pulse ring-2 ring-red-200'
            : 'bg-blue-50/70 text-blue-900 border-blue-200'
        }`}
      >
        <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-500' : 'text-blue-600'}`} />
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-slate-500">
            {label}
          </span>
          <span className="text-sm font-bold tracking-tight">{formatSecondsToMMSS(remainingSeconds)}</span>
        </div>
      </div>

      {/* Optional Total Exam Countdown Timer */}
      {typeof totalRemainingSeconds === 'number' && (
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-mono font-semibold">
          <Hourglass className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-sans text-slate-500 uppercase">Total:</span>
          <span>{formatSecondsToMMSS(totalRemainingSeconds)}</span>
        </div>
      )}
    </div>
  );
};
