'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getAttemptResultById } from '@/lib/services/testService';
import { AttemptResult, Question } from '@/types';
import { QuestionCard } from '@/components/questions/QuestionCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, XCircle, HelpCircle, Grid } from 'lucide-react';

export interface ReviewPageProps {
  params: Promise<{ attemptId: string }>;
}

export default function ReviewPage({ params }: ReviewPageProps) {
  const { attemptId } = use(params);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED'>('ALL');

  useEffect(() => {
    const data = getAttemptResultById(attemptId);
    if (data) setResult(data);
  }, [attemptId]);

  if (!result || !result.questionDetails || result.questionDetails.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Loading Question Review & Solutions...</h2>
        <p className="text-slate-500 text-sm">Preparing detailed step-by-step explanations.</p>
        <Link href={`/result/${attemptId}`}>
          <Button variant="outline" size="sm">Back to Scorecard</Button>
        </Link>
      </div>
    );
  }

  const allQuestions = result.questionDetails;

  const filteredQuestions = allQuestions.filter(item => {
    if (statusFilter === 'CORRECT') return item.isCorrect === true;
    if (statusFilter === 'INCORRECT') return item.isCorrect === false;
    if (statusFilter === 'UNATTEMPTED') return item.selectedOptionId === null;
    return true;
  });

  const currentItem = filteredQuestions[currentQuestionIndex] || filteredQuestions[0] || allQuestions[0];
  const question = currentItem.question;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <Link href={`/result/${result.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Scorecard
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Detailed Solution Review: {result.mockTestTitle}
          </h1>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => { setStatusFilter('ALL'); setCurrentQuestionIndex(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({allQuestions.length})
          </button>
          <button
            onClick={() => { setStatusFilter('CORRECT'); setCurrentQuestionIndex(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'CORRECT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Correct ({result.correctCount})
          </button>
          <button
            onClick={() => { setStatusFilter('INCORRECT'); setCurrentQuestionIndex(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'INCORRECT' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-red-700'
            }`}
          >
            Incorrect ({result.incorrectCount})
          </button>
          <button
            onClick={() => { setStatusFilter('UNATTEMPTED'); setCurrentQuestionIndex(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'UNATTEMPTED' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unattempted ({result.unansweredCount})
          </button>
        </div>
      </div>

      {/* Main Review Workspace */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Question Panel */}
        <div className="flex-1 space-y-4">
          {/* Question Status Banner */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            currentItem.isCorrect === true
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : currentItem.isCorrect === false
              ? 'bg-red-50 text-red-900 border-red-200'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              {currentItem.isCorrect === true && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {currentItem.isCorrect === false && <XCircle className="w-4 h-4 text-red-600" />}
              {currentItem.isCorrect === null && <HelpCircle className="w-4 h-4 text-slate-500" />}
              <span>
                {currentItem.isCorrect === true
                  ? 'Correctly Answered (+1.0 Marks)'
                  : currentItem.isCorrect === false
                  ? 'Incorrectly Answered (-0.25 Marks)'
                  : 'Unattempted (0 Marks)'}
              </span>
            </div>

            <span className="font-mono">
              Question {currentQuestionIndex + 1} of {filteredQuestions.length}
            </span>
          </div>

          <QuestionCard
            question={question}
            questionIndex={currentQuestionIndex}
            totalQuestionsInSection={filteredQuestions.length}
            selectedOptionId={currentItem.selectedOptionId}
            onSelectOption={() => {}}
            isReviewMode={true}
          />

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <Button
              variant="outline"
              size="sm"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Question
            </Button>

            <span className="text-xs font-bold text-slate-500">
              {currentQuestionIndex + 1} / {filteredQuestions.length}
            </span>

            <Button
              variant="primary"
              size="sm"
              disabled={currentQuestionIndex === filteredQuestions.length - 1}
              onClick={() => setCurrentQuestionIndex(prev => Math.min(filteredQuestions.length - 1, prev + 1))}
              className="flex items-center gap-1 shadow-xs"
            >
              Next Question <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Quick Question Selector Palette */}
        <div className="w-full lg:w-72 bg-white rounded-xl border border-slate-200 p-4 space-y-3 h-fit sticky top-20">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
            <Grid className="w-4 h-4 text-blue-600" /> Solution Palette
          </h3>

          <div className="grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto p-1 scrollbar-thin">
            {filteredQuestions.map((item, idx) => {
              const isCurrent = idx === currentQuestionIndex;
              let bgClass = 'bg-slate-200 text-slate-700';
              if (item.isCorrect === true) bgClass = 'bg-emerald-600 text-white';
              else if (item.isCorrect === false) bgClass = 'bg-red-500 text-white';

              return (
                <button
                  key={item.question.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`h-9 w-full rounded-md text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${bgClass} ${
                    isCurrent ? 'ring-2 ring-blue-600 ring-offset-2 font-bold scale-105' : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
