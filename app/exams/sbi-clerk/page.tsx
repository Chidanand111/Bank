import React from 'react';
import Link from 'next/link';
import { getExamBySlug, getMockTests } from '@/lib/services/testService';
import { PatternTable } from '@/components/exams/PatternTable';
import { TestCard } from '@/components/tests/TestCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, BookOpen, Clock, FileText, ArrowLeft, PlayCircle } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function SBIClerkPage() {
  const exam = await getExamBySlug('sbi-clerk');
  if (!exam) return notFound();

  const mockTests = await getMockTests('sbi-clerk');

  const prelimsPattern = exam.patterns.find(p => p.stage === 'Prelims');
  const mainsPattern = exam.patterns.find(p => p.stage === 'Mains');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Navigation Back Link */}
      <div>
        <Link href="/exams" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to All Exams
        </Link>
      </div>

      {/* Hero Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-xl shadow-xs">
              SBI
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="blue" size="sm">STATE BANK OF INDIA</Badge>
                <Badge variant="slate" size="sm">JUNIOR ASSOCIATE</Badge>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{exam.title}</h1>
            </div>
          </div>
          <Link href="#available-tests">
            <Button variant="primary" size="lg" className="flex items-center gap-2 shadow-xs">
              <PlayCircle className="w-5 h-5" /> Start SBI Clerk Mock
            </Button>
          </Link>
        </div>

        <p className="text-slate-600 text-base leading-relaxed max-w-4xl">
          {exam.description}
        </p>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium block">Prelims Questions</span>
            <span className="text-lg font-bold text-slate-900">100 Qs (60 Mins)</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium block">Mains Questions</span>
            <span className="text-lg font-bold text-slate-900">190 Qs (160 Mins)</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium block">Negative Marking</span>
            <span className="text-lg font-bold text-red-600">-0.25 Per Wrong</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium block">Available Mocks</span>
            <span className="text-lg font-bold text-blue-600">{mockTests.length} Full Length</span>
          </div>
        </div>
      </div>

      {/* Prelims Exam Pattern */}
      {prelimsPattern && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              SBI Clerk Prelims Exam Pattern
            </h2>
            <Badge variant="blue" size="sm">Phase 1 Qualifying</Badge>
          </div>
          <PatternTable pattern={prelimsPattern} />
        </div>
      )}

      {/* Mains Exam Pattern */}
      {mainsPattern && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-600" />
              SBI Clerk Mains Exam Pattern
            </h2>
            <Badge variant="purple" size="sm">Phase 2 Final Selection</Badge>
          </div>
          <PatternTable pattern={mainsPattern} />
        </div>
      )}

      {/* Available Mock Tests Section */}
      <div id="available-tests" className="space-y-6 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <Badge variant="blue" size="sm" className="mb-1">Test Series</Badge>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              SBI Clerk Mock Test Series
            </h2>
          </div>
          <span className="text-sm font-semibold text-slate-500">
            {mockTests.length} Practice Tests Available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockTests.map((test) => (
            <TestCard key={test.id} test={test} />
          ))}
        </div>
      </div>
    </div>
  );
}
