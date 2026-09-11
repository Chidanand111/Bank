import React from 'react';
import Link from 'next/link';
import { Exam } from '@/types';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ArrowRight, BookOpen, Clock, FileText } from 'lucide-react';

export interface ExamCardProps {
  exam: Exam;
}

export const ExamCard: React.FC<ExamCardProps> = ({ exam }) => {
  const prelimsPattern = exam.patterns.find(p => p.stage === 'Prelims');

  return (
    <Card hoverEffect className="flex flex-col h-full">
      <CardContent className="p-6 flex flex-col justify-between flex-1 space-y-5">
        <div>
          <div className="flex justify-between items-start gap-3 mb-3">
            <Badge variant="blue" size="md">
              {exam.category} EXAM
            </Badge>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              {exam.totalMockTests} Mocks Available
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
            {exam.title}
          </h3>

          <p className="text-sm text-slate-600 mt-2 line-clamp-2">
            {exam.shortDescription}
          </p>
        </div>

        {prelimsPattern && (
          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-100 space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Prelims Pattern
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>{prelimsPattern.totalQuestions} Questions</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>{prelimsPattern.totalDurationMinutes} Mins</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>{prelimsPattern.sections.length} Sections</span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex gap-3">
          <Link href={`/exams/${exam.slug}`} className="w-full">
            <Button variant="outline" size="md" className="w-full">
              Exam Details
            </Button>
          </Link>
          <Link href={`/tests?exam=${exam.slug}`} className="w-full">
            <Button variant="primary" size="md" className="w-full flex items-center justify-center gap-1.5">
              Take Mock
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
