import React from 'react';
import { requireUser } from '@/lib/auth/permissions';
import { getDashboardStats } from '@/lib/services/testService';
import { RecentAttemptCard } from '@/components/dashboard/RecentAttemptCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FileCheck2, ArrowLeft, PlayCircle } from 'lucide-react';
import Link from 'next/link';

export default async function MyResultsPage() {
  const user = await requireUser('/my-results');
  const stats = getDashboardStats();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="blue" size="sm">PERSONAL SCORECARDS</Badge>
            <span className="text-xs text-slate-500">• {user.name}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            My Test Results & Analytics
          </h1>
          <p className="text-sm text-slate-600">
            Review detailed solutions, scores, cut-off benchmarks, and accuracy history for your attempted tests.
          </p>
        </div>

        <Link href="/tests">
          <Button variant="primary" size="md" className="flex items-center gap-2 shadow-xs">
            <PlayCircle className="w-4 h-4" /> Attempt Another Test
          </Button>
        </Link>
      </div>

      {/* Attempt List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-blue-600" />
            Completed Test Attempts ({stats.recentAttempts.length})
          </h2>
        </div>

        {stats.recentAttempts.length > 0 ? (
          <div className="space-y-4">
            {stats.recentAttempts.map((attempt) => (
              <RecentAttemptCard key={attempt.id} attempt={attempt} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
            <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">No Mock Tests Attempted Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start your first full-length IBPS PO or SBI Clerk mock test to track your performance.
            </p>
            <div className="pt-2">
              <Link href="/tests">
                <Button variant="primary" size="sm">Browse Mock Tests</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
