import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getExamBySlug, getMockTests } from '@/lib/services/testService';
import { getCurrentUser } from '@/lib/auth/session';
import { PatternTable } from '@/components/exams/PatternTable';
import { TestCard } from '@/components/tests/TestCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BookOpen, Clock, FileText, ArrowLeft, PlayCircle, PlusCircle, ShieldAlert } from 'lucide-react';
import { notFound } from 'next/navigation';

export interface ExamPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true;

export async function generateStaticParams() {
  return [
    { slug: 'ibps-po' },
    { slug: 'sbi-clerk' },
  ];
}

export async function generateMetadata({ params }: ExamPageProps): Promise<Metadata> {
  const { slug } = await params;
  const exam = await getExamBySlug(slug, true);

  if (!exam) {
    return {
      title: 'Exam Not Found | BankMock',
      description: 'The requested banking examination could not be found.',
    };
  }

  return {
    title: `${exam.title} - Mock Tests, Pattern & Syllabus | BankMock`,
    description:
      exam.description ||
      `Prepare for ${exam.title} with full-length online mock tests, authentic sectional timing, detailed solutions, and performance analytics.`,
    openGraph: {
      title: `${exam.title} Preparation | BankMock`,
      description: exam.description,
      type: 'website',
    },
    keywords: [
      exam.title,
      `${exam.category} Mock Test`,
      'Banking Exam Prep',
      'Prelims Exam Pattern',
      'Mains Exam Pattern',
      'Free Banking Mock',
    ],
  };
}

export default async function DynamicExamPage({ params }: ExamPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'ADMIN';
  const exam = await getExamBySlug(slug, isAdmin);

  if (!exam) {
    return notFound();
  }

  const mockTests = await getMockTests(slug, isAdmin);

  const prelimsPattern = exam.patterns?.find(p => p.stage === 'Prelims' || p.stage === 'Tier-1' || p.stage === 'CBT-1') || exam.patterns?.[0];
  const mainsPattern = exam.patterns?.find(p => p.stage === 'Mains' || p.stage === 'Tier-2' || p.stage === 'CBT-2');

  const negativeMarkText = exam.category === 'SSC'
    ? '-0.50 Per Wrong (+2.0 Correct)'
    : exam.category === 'RAILWAY'
    ? '-0.333 Per Wrong (1/3rd)'
    : '-0.25 Per Wrong';

  const categorySubBadge = exam.category === 'SSC'
    ? 'SSC EXAM PREP'
    : exam.category === 'RAILWAY'
    ? 'RAILWAYS EXAM PREP'
    : 'BANKING EXAM PREP';

  const firstStageLabel = exam.category === 'SSC' ? 'Tier-1 Pattern' : exam.category === 'RAILWAY' ? 'CBT-1 Pattern' : 'Prelims Pattern';
  const secondStageLabel = exam.category === 'SSC' ? 'Tier-2 Pattern' : exam.category === 'RAILWAY' ? 'CBT-2 Pattern' : 'Mains Pattern';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Navigation Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/exams"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Exams
        </Link>
        {isAdmin && (
          <Link
            href="/admin/exams"
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            Open in Admin ↗
          </Link>
        )}
      </div>

      {/* Admin Draft Notification */}
      {isAdmin && exam.status === 'created' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Draft Exam Preview:</strong> This exam is currently in draft mode (hidden from students). You are viewing this page with administrator preview privileges.
            </span>
          </div>
          <Link
            href="/admin/exams"
            className="text-amber-800 font-bold hover:underline shrink-0"
          >
            Publish in Admin ↗
          </Link>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-xl shadow-xs">
              {exam.category}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="blue" size="sm">{exam.category} EXAMINATION</Badge>
                {exam.status === 'created' && (
                  <Badge variant="amber" size="sm" className="font-bold flex items-center gap-1 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Draft Preview
                  </Badge>
                )}
                <Badge variant="slate" size="sm">{categorySubBadge}</Badge>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{exam.title}</h1>
            </div>
          </div>
          <Link href={mockTests.length > 0 ? `#available-tests` : `/tests?exam=${slug}`}>
            <Button variant="primary" size="lg" className="flex items-center gap-2 shadow-xs">
              <PlayCircle className="w-5 h-5" /> Start {exam.title.split('(')[0].trim()} Mock
            </Button>
          </Link>
        </div>

        <p className="text-slate-600 text-base leading-relaxed max-w-4xl">
          {exam.description}
        </p>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium block">{firstStageLabel}</span>
            <span className="text-lg font-bold text-slate-900">
              {prelimsPattern ? `${prelimsPattern.totalQuestions} Qs (${prelimsPattern.totalDurationMinutes} Mins)` : '100 Qs (60 Mins)'}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium block">{secondStageLabel}</span>
            <span className="text-lg font-bold text-slate-900">
              {mainsPattern ? `${mainsPattern.totalQuestions} Qs (${mainsPattern.totalDurationMinutes} Mins)` : 'Phase 2 Breakdown'}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium block">Negative Marking</span>
            <span className="text-lg font-bold text-red-600">{negativeMarkText}</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium block">Available Mocks</span>
            <span className="text-lg font-bold text-blue-600">{mockTests.length} Mock Paper(s)</span>
          </div>
        </div>
      </div>

      {/* Prelims Exam Pattern */}
      {prelimsPattern && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              {exam.title} {prelimsPattern.stage} Exam Pattern
            </h2>
            <Badge variant="blue" size="sm">Phase 1 Screening</Badge>
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
              {exam.title} {mainsPattern.stage} Exam Pattern
            </h2>
            <Badge variant="purple" size="sm">Phase 2 Merit Ranking</Badge>
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
              {exam.title} Mock Test Series
            </h2>
          </div>
          <span className="text-sm font-semibold text-slate-500">
            {mockTests.length} Practice Tests Available
          </span>
        </div>

        {mockTests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockTests.map((test) => (
              <TestCard key={test.id} test={test} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
            <h3 className="text-lg font-bold text-slate-800">Mock Tests in Preparation</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Our academic team is finalizing authentic practice sets for {exam.title}. In the meantime, you can practice full mock tests from our other banking series.
            </p>
            <div className="pt-2">
              <Link href="/tests">
                <Button variant="primary" size="md">
                  Explore All Mock Tests
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
