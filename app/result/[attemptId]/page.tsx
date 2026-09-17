'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getAttemptResultById } from '@/lib/services/testService';
import { AttemptResult } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatSecondsToReadable, formatDate } from '@/lib/utils/formatters';
import {
  Award,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  LayoutDashboard,
  ShieldCheck,
  Target,
  FileText
} from 'lucide-react';

export interface ResultPageProps {
  params: Promise<{ attemptId: string }>;
}

export default function ResultPage({ params }: ResultPageProps) {
  const { attemptId } = use(params);
  const [result, setResult] = useState<AttemptResult | null>(null);

  useEffect(() => {
    const data = getAttemptResultById(attemptId);
    if (data) setResult(data);
  }, [attemptId]);

  if (!result) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Loading Test Scorecard...</h2>
        <p className="text-slate-500 text-sm">Retrieving performance metrics.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="blue" size="sm">{result.examTitle}</Badge>
            {result.isCutoffCleared ? (
              <Badge variant="green" size="sm">CUTOFF CLEARED</Badge>
            ) : (
              <Badge variant="amber" size="sm">BELOW CUTOFF BENCHMARK</Badge>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{result.mockTestTitle}</h1>
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Submitted on {formatDate(result.completedAt)} • Time Spent: {formatSecondsToReadable(result.timeTakenSeconds)}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Link href={`/test/${encodeURIComponent(result.mockTestId || 'mock-ibps-po-1')}?reattempt=true`}>
            <Button variant="primary" size="md" className="flex items-center gap-1.5 shadow-xs bg-indigo-600 hover:bg-indigo-700">
              <RotateCcw className="w-4 h-4" /> Re-attempt Test
            </Button>
          </Link>
          <Link href={`/review/${result.id}`}>
            <Button variant="outline" size="md" className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Review Solutions
            </Button>
          </Link>
          <Link href="/tests">
            <Button variant="secondary" size="md" className="flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Try Another Test
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary" size="md" className="flex items-center gap-1.5">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Score & Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Score Card */}
        <Card className="border-2 border-blue-600 bg-blue-50/40 shadow-xs">
          <CardContent className="p-6 text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 block">Total Score</span>
            <div className="text-4xl font-black text-blue-900">
              {result.score}{' '}
              <span className="text-sm font-semibold text-slate-500">/ {result.maxScore}</span>
            </div>
            <div className="text-xs font-semibold text-blue-800 bg-blue-100 py-1 px-3 rounded-full inline-block">
              Percentage: {result.percentage}%
            </div>
          </CardContent>
        </Card>

        {/* Accuracy Card */}
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Overall Accuracy</span>
            <div className="text-4xl font-black text-slate-900">{result.accuracy}%</div>
            <div className="pt-1">
              <ProgressBar value={result.accuracy} color={result.accuracy >= 80 ? 'green' : 'amber'} size="sm" />
            </div>
          </CardContent>
        </Card>

        {/* Attempt Breakdown Card */}
        <Card>
          <CardContent className="p-6 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block text-center">Questions Attempted</span>
            <div className="text-3xl font-extrabold text-slate-900 text-center">
              {result.totalAttempted}{' '}
              <span className="text-xs font-normal text-slate-500">/ {result.totalQuestions}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{result.correctCount} Correct</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-red-700">
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                <span>{result.incorrectCount} Incorrect</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cut-off Target Card */}
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Target Cut-Off</span>
            <div className="text-3xl font-extrabold text-slate-900">{result.cutoffMarks}</div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block ${
              result.isCutoffCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {result.isCutoffCleared ? 'Cut-off Cleared' : 'Needs + ' + (result.cutoffMarks - result.score).toFixed(2) + ' Marks'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Section-Wise Performance Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Section-Wise Performance Analysis
          </h2>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Section Name</th>
                <th className="py-3.5 px-4 text-center">Attempted / Total</th>
                <th className="py-3.5 px-4 text-center">Correct</th>
                <th className="py-3.5 px-4 text-center">Incorrect</th>
                <th className="py-3.5 px-4 text-center">Unanswered</th>
                <th className="py-3.5 px-4 text-center">Accuracy %</th>
                <th className="py-3.5 px-4 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {result.sectionResults.map((sec) => (
                <tr key={sec.sectionCode} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{sec.sectionName}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-semibold text-slate-900">{sec.attempted}</span> / {sec.totalQuestions}
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-emerald-600">{sec.correct}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-red-500">{sec.incorrect}</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">{sec.unanswered}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-blue-700">
                    {sec.accuracy.toFixed(1)}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                    {sec.score.toFixed(2)} <span className="text-xs font-normal text-slate-400">/ {sec.maxScore}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
