'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserDashboardStatsAction } from '@/lib/services/adminService';
import { getDashboardStats } from '@/lib/services/testService';
import { DashboardStats } from '@/types';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentAttemptCard } from '@/components/dashboard/RecentAttemptCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  BarChart2,
  Award,
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  TrendingUp,
  Sparkles,
  Calendar,
  FileCheck2,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dateFilter, setDateFilter] = useState<'ALL' | '30D' | '7D'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    let dateRange: { from?: string; to?: string } | undefined = undefined;
    if (dateFilter === '7D') {
      dateRange = { from: new Date(Date.now() - 7 * 86400000).toISOString() };
    } else if (dateFilter === '30D') {
      dateRange = { from: new Date(Date.now() - 30 * 86400000).toISOString() };
    }

    getUserDashboardStatsAction(dateRange)
      .then(dbStats => {
        if (!isMounted) return;
        if (dbStats && dbStats.totalTestsAttempted > 0) {
          setStats(dbStats);
        } else {
          // Check local storage for CBT attempts without blending sample data
          const localData = getDashboardStats({ includeSampleData: false });
          setStats(localData);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const localData = getDashboardStats({ includeSampleData: false });
        setStats(localData);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dateFilter]);

  if (loading && !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Loading Student Dashboard...</h2>
      </div>
    );
  }

  const currentStats = stats || {
    totalTestsAttempted: 0,
    averageScore: 0,
    bestScore: 0,
    averageAccuracy: 0,
    totalTimeSpentMinutes: 0,
    recentAttempts: [],
    sectionPerformance: [],
    weakTopics: [],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Dashboard Top Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <Badge variant="blue" size="sm">ASPIRANT DASHBOARD</Badge>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Performance & Analytics Hub
          </h1>
          <p className="text-sm text-slate-600">
            Track your mock test results, accuracy trends, and targeted topic improvements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200">
            <button
              onClick={() => setDateFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${dateFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('30D')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${dateFilter === '30D' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateFilter('7D')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${dateFilter === '7D' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
            >
              Last 7 Days
            </button>
          </div>

          <Link href="/tests">
            <Button variant="primary" size="md" className="flex items-center gap-2 shadow-xs">
              <PlayCircle className="w-4 h-4" /> Start New Test
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Mocks Attempted"
          value={currentStats.totalTestsAttempted}
          subtitle={`${currentStats.totalTimeSpentMinutes} minutes practiced`}
          icon={BarChart2}
          color="blue"
        />
        <StatCard
          title="Average Score"
          value={currentStats.averageScore}
          subtitle="Across completed mock tests"
          icon={Award}
          color="green"
        />
        <StatCard
          title="Best Score"
          value={currentStats.bestScore}
          subtitle="Highest scored mock"
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Average Accuracy"
          value={`${currentStats.averageAccuracy}%`}
          subtitle="Overall precision rate"
          icon={Target}
          color="amber"
        />
      </div>

      {currentStats.totalTestsAttempted === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <FileCheck2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-800">No Mock Test Attempts Found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              You haven&apos;t completed any mock tests in this period yet. Complete your first IBPS PO or SBI Clerk test to unlock section accuracy and diagnostic insights.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/tests">
              <Button variant="primary" size="md" className="inline-flex items-center gap-2">
                <PlayCircle className="w-4 h-4" /> Browse Available Mocks
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Section & Weak Topics Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Section Accuracy Performance */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border border-slate-200">
                <CardHeader className="flex justify-between items-center">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" /> Sectional Accuracy Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentStats.sectionPerformance.length > 0 ? (
                    currentStats.sectionPerformance.map((sec) => (
                      <div key={sec.sectionCode} className="space-y-2">
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-slate-900">{sec.sectionName}</span>
                          <span className="text-blue-700">{sec.averageAccuracy}% Accuracy</span>
                        </div>
                        <ProgressBar
                          value={sec.averageAccuracy}
                          color={sec.averageAccuracy >= 85 ? 'green' : sec.averageAccuracy >= 75 ? 'blue' : 'amber'}
                          size="md"
                        />
                        <div className="flex justify-between text-xs text-slate-500 pt-0.5">
                          <span>Attempted: {sec.totalAttempted} Qs</span>
                          <span>Correct: {sec.totalCorrect} Qs</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-sm text-slate-500">
                      Take more tests to generate detailed sectional accuracy breakdown.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Weak Topics & Recommendations */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" /> Weak Topics & Focus Areas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentStats.weakTopics.length > 0 ? (
                    currentStats.weakTopics.map((topic, i) => (
                      <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                          <span>{topic.topicName}</span>
                          <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            {topic.accuracy}% Accuracy
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500">
                          <span>{topic.sectionName}</span>
                          <span className="text-blue-600 font-semibold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-blue-500" /> +{topic.recommendedPracticeCount} Practice Drills
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-sm text-slate-500">
                      Great job! No weak topics detected with below 75% accuracy.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Attempts History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Recent Mock Test Attempts
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                Showing last {currentStats.recentAttempts.length} attempts
              </span>
            </div>

            <div className="space-y-4">
              {currentStats.recentAttempts.map((attempt) => (
                <RecentAttemptCard key={attempt.id} attempt={attempt} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
