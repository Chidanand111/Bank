import React from 'react';
import Link from 'next/link';
import { AttemptResult } from '@/types';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatDate, formatSecondsToReadable } from '@/lib/utils/formatters';
import { ArrowRight, CheckCircle2, XCircle, Clock } from 'lucide-react';

export interface RecentAttemptCardProps {
  attempt: AttemptResult;
}

export const RecentAttemptCard: React.FC<RecentAttemptCardProps> = ({ attempt }) => {
  return (
    <Card hoverEffect className="border border-slate-200">
      <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="blue" size="sm">
              {attempt.examTitle}
            </Badge>
            {attempt.isCutoffCleared ? (
              <Badge variant="green" size="sm">
                Cutoff Cleared
              </Badge>
            ) : (
              <Badge variant="amber" size="sm">
                Below Cutoff
              </Badge>
            )}
          </div>

          <h4 className="text-base font-bold text-slate-900">{attempt.mockTestTitle}</h4>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {formatDate(attempt.completedAt)} ({formatSecondsToReadable(attempt.timeTakenSeconds)})
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {attempt.correctCount} Correct
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-red-500" /> {attempt.incorrectCount} Incorrect
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Score</span>
            <span className="text-xl font-extrabold text-blue-700">
              {attempt.score} <span className="text-xs font-normal text-slate-500">/ {attempt.maxScore}</span>
            </span>
          </div>

          <div className="flex gap-2">
            <Link href={`/result/${attempt.id}`}>
              <Button variant="outline" size="sm">
                Result
              </Button>
            </Link>
            <Link href={`/review/${attempt.id}`}>
              <Button variant="primary" size="sm" className="flex items-center gap-1">
                Review
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
