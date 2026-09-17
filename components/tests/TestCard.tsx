import React from 'react';
import Link from 'next/link';
import { MockTest } from '@/types';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Clock, FileText, Award, PlayCircle } from 'lucide-react';

export interface TestCardProps {
  test: MockTest;
}

export const TestCard: React.FC<TestCardProps> = ({ test }) => {
  return (
    <Card hoverEffect className="flex flex-col h-full border border-slate-200">
      <CardContent className="p-6 flex flex-col justify-between flex-1 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-3">
            <Badge variant="blue" size="sm">
              {test.examTitle}
            </Badge>
            {test.isPyq ? (
              <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                ★ {test.year ? `${test.year} PYQ PAPER` : 'PYQ PAPER'}
              </span>
            ) : test.isFree ? (
              <Badge variant="green" size="sm">
                FREE MOCK
              </Badge>
            ) : (
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                20m/Section
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
            {test.title}
          </h3>
          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
            {test.description}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-xs text-slate-600">
          <div className="flex flex-col items-center p-2 rounded-lg bg-slate-50">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-500" /> Questions
            </span>
            <span className="font-semibold text-slate-900 text-sm mt-0.5">{test.totalQuestions}</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-slate-50">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-blue-500" /> Marks
            </span>
            <span className="font-semibold text-slate-900 text-sm mt-0.5">{test.totalMarks}</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-slate-50">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" /> Time
            </span>
            <span className="font-semibold text-slate-900 text-sm mt-0.5">{test.durationMinutes} m</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-500">
            Cut-off Benchmark: <span className="font-semibold text-slate-700">{test.cutoffMarks}</span>
          </div>
          <Link href={`/test/${test.id}`}>
            <Button variant="primary" size="sm" className="flex items-center gap-1.5 shadow-xs">
              <PlayCircle className="w-4 h-4" />
              Start Test
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
