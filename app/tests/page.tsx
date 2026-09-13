import React from 'react';
import { getMockTests } from '@/lib/services/testService';
import { TestCard } from '@/components/tests/TestCard';
import { Badge } from '@/components/ui/Badge';
import { Award, Search } from 'lucide-react';
import Link from 'next/link';

export interface TestsPageProps {
  searchParams: Promise<{ exam?: string }>;
}

export default async function TestsPage({ searchParams }: TestsPageProps) {
  const resolvedSearchParams = await searchParams;
  const examFilter = resolvedSearchParams.exam || 'all';
  const allTests = await getMockTests();

  const filteredTests = examFilter === 'all'
    ? allTests
    : examFilter === 'pyq'
    ? allTests.filter(t => t.isPyq)
    : allTests.filter(t => t.examSlug === examFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <Badge variant="blue" size="sm" className="mb-1">All Practice Series</Badge>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Full-Length Banking Mock Tests
            </h1>
          </div>
        </div>
        <p className="text-slate-600 text-base max-w-3xl leading-relaxed">
          Realistic preliminary and main examination practice papers with countdown sectional timers, TCS iON question palette, and detailed explanations.
        </p>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Filter Exam:</span>
          <Link
            href="/tests"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              examFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Tests ({allTests.length})
          </Link>
          <Link
            href="/tests?exam=ibps-po"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              examFilter === 'ibps-po'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            IBPS PO ({allTests.filter(t => t.examSlug === 'ibps-po').length})
          </Link>
          <Link
            href="/tests?exam=sbi-clerk"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              examFilter === 'sbi-clerk'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            SBI Clerk ({allTests.filter(t => t.examSlug === 'sbi-clerk').length})
          </Link>
          <Link
            href="/tests?exam=pyq"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              examFilter === 'pyq'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            ★ PYQ Papers ({allTests.filter(t => t.isPyq).length})
          </Link>
        </div>
      </div>

      {/* Test List Grid */}
      {filteredTests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTests.map((test) => (
            <TestCard key={test.id} test={test} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <Search className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No mock tests found for this exam filter.</h3>
          <p className="text-xs text-slate-500">Try selecting 'All Tests' to explore available mock tests.</p>
        </div>
      )}
    </div>
  );
}
