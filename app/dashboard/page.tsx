'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
  Sparkles
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const data = getDashboardStats();
    setStats(data);
  }, []);

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Loading Student Dashboard...</h2>
      </div>
    );
  }

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

        <Link href="/tests">
          <Button variant="primary" size="md" className="flex items-center gap-2 shadow-xs">
            <PlayCircle className="w-4 h-4" /> Start New Test
          </Button>
        </Link>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Mocks Attempted"
          value={stats.totalTestsAttempted}
          subtitle={`${stats.totalTimeSpentMinutes} minutes practiced`}
          icon={BarChart2}
          color="blue"
        />
        <StatCard
          title="Average Score"
          value={stats.averageScore}
          subtitle="Across all mock tests"
          icon={Award}
          color="green"
        />
        <StatCard
          title="Best Score"
          value={stats.bestScore}
          subtitle="Highest scored mock"
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Average Accuracy"
          value={`${stats.averageAccuracy}%`}
          subtitle="Overall precision rate"
          icon={Target}
          color="amber"
        />
      </div>

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
              {stats.sectionPerformance.map((sec) => (
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
              ))}
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
              {stats.weakTopics.map((topic, i) => (
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
              ))}
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
            Showing last {stats.recentAttempts.length} attempts
          </span>
        </div>

        <div className="space-y-4">
          {stats.recentAttempts.map((attempt) => (
            <RecentAttemptCard key={attempt.id} attempt={attempt} />
          ))}
        </div>
      </div>
    </div>
  );
}
