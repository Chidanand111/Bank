'use client';

import React, { useEffect } from 'react';
import { Clock } from 'lucide-react';
import { formatSecondsToMMSS } from '@/lib/utils/formatters';

export interface TimerProps {
  remainingSeconds: number;
  onTick: () => void;
  onTimeUp: () => void;
}

export const Timer: React.FC<TimerProps> = ({
  remainingSeconds,
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

  const isUrgent = remainingSeconds < 300; // less than 5 minutes

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono font-bold transition-colors ${
        isUrgent
          ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
          : 'bg-slate-50 text-slate-800 border-slate-200'
      }`}
    >
      <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-500' : 'text-slate-500'}`} />
      <span>{formatSecondsToMMSS(remainingSeconds)}</span>
    </div>
  );
};
