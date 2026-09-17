import React from 'react';
import { Question } from '@/types';
import { Badge } from '../ui/Badge';
import { MathRenderer } from '../ui/MathRenderer';
import { CheckCircle2, XCircle, HelpCircle, BookOpen } from 'lucide-react';

export interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  totalQuestionsInSection: number;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  isReviewMode?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionIndex,
  totalQuestionsInSection,
  selectedOptionId,
  onSelectOption,
  isReviewMode = false,
}) => {
  if (!question) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-8 text-center text-slate-500">
        Loading question content...
      </div>
    );
  }

  const hasPassage = Boolean(question.passage || question.passageImageUrl);
  const optionsList = Array.isArray(question.options) ? question.options : [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Question Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
            Q{questionIndex + 1}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            of {totalQuestionsInSection} in {question.sectionName || 'Section'}
          </span>
          {question.isPyq && (
            <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
              PYQ {question.pyqYear || '2024'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="slate" size="sm">
            Topic: {question.topicName || 'General'}
          </Badge>
          <Badge variant="blue" size="sm">
            +{question.marks ?? 1.0} / -{question.negativeMarks ?? 0.25} Marks
          </Badge>
        </div>
      </div>

      {/* Question Content */}
      <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-5">
        {/* Interlinked Directions / Comprehension Passage Box */}
        {hasPassage && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 sm:p-5 text-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900 border-b border-indigo-100/80 pb-2">
              <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Directions & Context {question.groupId ? `(${question.groupId})` : ''}</span>
            </div>
            {question.passage && (
              <div className="text-sm sm:text-base leading-relaxed text-slate-700 font-normal whitespace-pre-line max-h-72 overflow-y-auto pr-2">
                <MathRenderer content={question.passage} />
              </div>
            )}
            {question.passageImageUrl && (
              <div className="mt-3 border border-indigo-200 rounded-xl overflow-hidden bg-white p-2.5 max-w-2xl shadow-xs">
                <img
                  src={question.passageImageUrl}
                  alt="Passage Reference Diagram"
                  className="max-h-72 w-auto object-contain rounded"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        )}

        {/* Question Text */}
        <div className="text-slate-900 text-base leading-relaxed font-semibold whitespace-pre-line">
          <MathRenderer content={question.text} />
        </div>

        {/* Optional Question Image */}
        {question.imageUrl && (
          <div className="my-3 border border-slate-200 rounded-xl overflow-hidden bg-white p-2.5 max-w-2xl inline-block shadow-xs">
            <img
              src={question.imageUrl}
              alt="Question Diagram"
              className="max-h-72 w-auto object-contain rounded"
              loading="lazy"
              onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
            />
          </div>
        )}

        {/* MCQ Options */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            Choose the correct option:
          </span>

          {optionsList.map((option, idx) => {
            const isSelected = selectedOptionId === option.id;
            const isCorrectOption = option.isCorrect;

            let optionStyle = 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-800 bg-white';
            let badgeIcon = null;

            if (isReviewMode) {
              if (isCorrectOption) {
                optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                badgeIcon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
              } else if (isSelected && !isCorrectOption) {
                optionStyle = 'border-red-500 bg-red-50 text-red-900 font-semibold';
                badgeIcon = <XCircle className="w-5 h-5 text-red-600 shrink-0" />;
              } else {
                optionStyle = 'border-slate-200 bg-slate-50 opacity-60 text-slate-600';
              }
            } else if (isSelected) {
              optionStyle = 'border-blue-600 bg-blue-50/80 text-blue-900 font-semibold shadow-xs';
            }

            return (
              <label
                key={option.id}
                onClick={() => !isReviewMode && onSelectOption(option.id)}
                className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${optionStyle}`}
              >
                {/* Radio Circle / Review Icon */}
                {isReviewMode ? (
                  badgeIcon || (
                    <span className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0 mt-0.5">
                      {String.fromCharCode(65 + idx)}
                    </span>
                  )
                ) : (
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 text-slate-500 bg-white'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </div>
                )}

                <div className="flex-1 text-sm sm:text-base leading-snug pt-0.5 space-y-2">
                  {option.text ? (
                    <div><MathRenderer content={option.text} /></div>
                  ) : option.imageUrl ? (
                    <div className="text-xs text-slate-500 font-medium italic">[Figure / Diagram Option]</div>
                  ) : null}
                  {option.imageUrl && (
                    <div className="border border-slate-200 rounded-lg p-1.5 bg-white inline-block shadow-2xs hover:shadow-sm transition-shadow">
                      <img
                        src={option.imageUrl}
                        alt={`Option ${String.fromCharCode(65 + idx)} illustration`}
                        className="max-h-40 object-contain rounded"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>

                {isSelected && !isReviewMode && (
                  <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
                    Selected
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {/* Detailed Solution Box in Review Mode */}
        {isReviewMode && (
          <div className="mt-6 p-5 rounded-xl border border-blue-200 bg-blue-50/60 text-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              Detailed Explanation & Solution
            </div>
            <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              <MathRenderer content={question.explanation} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
