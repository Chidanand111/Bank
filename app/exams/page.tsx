import React from 'react';
import Link from 'next/link';
import { getExams } from '@/lib/services/testService';
import { ExamCard } from '@/components/exams/ExamCard';
import { Badge } from '@/components/ui/Badge';
import { BookOpen, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default async function ExamsPage() {
  const exams = await getExams();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <Badge variant="blue" size="sm" className="mb-1">Banking Exam Catalog</Badge>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Target Banking Examinations
            </h1>
          </div>
        </div>
        <p className="text-slate-600 text-base max-w-3xl leading-relaxed">
          Explore complete pattern breakdowns, sectional weightages, and high-yield mock test series for Public Sector Banks (IBPS) and State Bank of India (SBI).
        </p>
      </div>

      {/* Exam Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <ExamCard key={exam.id} exam={exam} />
        ))}
      </div>

      {/* Pattern & Scoring Rules Overview */}
      <div className="bg-slate-900 text-white rounded-2xl p-8 space-y-6">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          Standard Marking Scheme & Rules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-300">
          <div className="space-y-1.5 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="font-semibold text-white block">Positive Marks</span>
            <p className="text-xs text-slate-400">
              Each correct answer awards +1.0 mark (or as specified by exam section weightage).
            </p>
          </div>
          <div className="space-y-1.5 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="font-semibold text-white block">Negative Marking</span>
            <p className="text-xs text-slate-400">
              0.25 marks (1/4th of question marks) deducted for every incorrect attempt.
            </p>
          </div>
          <div className="space-y-1.5 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="font-semibold text-white block">Sectional Timers</span>
            <p className="text-xs text-slate-400">
              Section switching is strictly timed. Unsaved questions auto-lock when section timer expires.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
