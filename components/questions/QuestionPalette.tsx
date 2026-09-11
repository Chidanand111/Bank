'use client';

import React, { useState } from 'react';
import { QuestionStatus, UserResponseState } from '@/types';
import { Grid, ChevronUp, ChevronDown } from 'lucide-react';

export interface QuestionPaletteProps {
  questions: { id: string; sectionCode: string }[];
  currentQuestionId: string;
  responses: Record<string, UserResponseState>;
  visitedQuestions: string[];
  onSelectQuestion: (questionId: string) => void;
}

export function getQuestionStatus(
  questionId: string,
  responses: Record<string, UserResponseState>,
  visitedQuestions: string[]
): QuestionStatus {
  const resp = responses[questionId];
  const isVisited = visitedQuestions.includes(questionId) || Boolean(resp);
  const isAnswered = Boolean(resp?.selectedOptionId);
  const isMarked = Boolean(resp?.isMarkedForReview);

  if (isAnswered && isMarked) return 'ANSWERED_AND_MARKED';
  if (isMarked) return 'MARKED_FOR_REVIEW';
  if (isAnswered) return 'ANSWERED';
  if (isVisited) return 'NOT_ANSWERED';
  return 'NOT_VISITED';
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentQuestionId,
  responses,
  visitedQuestions,
  onSelectQuestion,
}) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Count metrics for summary legend
  let answeredCount = 0;
  let notAnsweredCount = 0;
  let notVisitedCount = 0;
  let markedCount = 0;
  let answeredAndMarkedCount = 0;

  questions.forEach(q => {
    const status = getQuestionStatus(q.id, responses, visitedQuestions);
    if (status === 'ANSWERED') answeredCount++;
    else if (status === 'NOT_ANSWERED') notAnsweredCount++;
    else if (status === 'MARKED_FOR_REVIEW') markedCount++;
    else if (status === 'ANSWERED_AND_MARKED') answeredAndMarkedCount++;
    else notVisitedCount++;
  });

  const getStatusColorClasses = (status: QuestionStatus, isCurrent: boolean) => {
    let classes = '';
    switch (status) {
      case 'ANSWERED':
        classes = 'bg-blue-600 text-white hover:bg-blue-700';
        break;
      case 'NOT_ANSWERED':
        classes = 'bg-red-500 text-white hover:bg-red-600';
        break;
      case 'MARKED_FOR_REVIEW':
        classes = 'bg-amber-500 text-white hover:bg-amber-600';
        break;
      case 'ANSWERED_AND_MARKED':
        classes = 'bg-emerald-600 text-white hover:bg-emerald-700';
        break;
      case 'NOT_VISITED':
      default:
        classes = 'bg-slate-200 text-slate-700 hover:bg-slate-300';
        break;
    }

    if (isCurrent) {
      classes += ' ring-2 ring-blue-600 ring-offset-2 font-bold scale-105';
    }

    return classes;
  };

  const paletteContent = (
    <div className="space-y-4">
      {/* Status Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-slate-200 border border-slate-300 inline-block shrink-0" />
          <span>Not Visited ({notVisitedCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-red-500 inline-block shrink-0" />
          <span>Not Answered ({notAnsweredCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-blue-600 inline-block shrink-0" />
          <span>Answered ({answeredCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-amber-500 inline-block shrink-0" />
          <span>Marked Review ({markedCount})</span>
        </div>
        <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-slate-200">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block shrink-0" />
          <span>Answered & Marked ({answeredAndMarkedCount})</span>
        </div>
      </div>

      {/* Question Grid */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          Question Palette ({questions.length} total)
        </span>
        <div className="grid grid-cols-5 gap-2 max-h-[340px] overflow-y-auto p-1 scrollbar-thin">
          {questions.map((q, idx) => {
            const status = getQuestionStatus(q.id, responses, visitedQuestions);
            const isCurrent = q.id === currentQuestionId;
            return (
              <button
                key={q.id}
                onClick={() => {
                  onSelectQuestion(q.id);
                  setIsMobileExpanded(false);
                }}
                className={`h-9 w-full rounded-md text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${getStatusColorClasses(
                  status,
                  isCurrent
                )}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Palette */}
      <div className="hidden lg:block w-72 bg-white rounded-xl border border-slate-200 p-4 shadow-xs h-fit sticky top-28 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Grid className="w-4 h-4 text-blue-600" /> Question Palette
          </h3>
        </div>
        {paletteContent}
      </div>

      {/* Mobile Collapsible Panel */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg">
        <button
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="w-full py-2.5 px-4 bg-slate-900 text-white flex items-center justify-between text-xs font-bold uppercase tracking-wider"
        >
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-blue-400" />
            Question Palette ({answeredCount}/{questions.length} Answered)
          </div>
          {isMobileExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {isMobileExpanded && (
          <div className="p-4 max-h-[60vh] overflow-y-auto bg-white">
            {paletteContent}
          </div>
        )}
      </div>
    </>
  );
};
