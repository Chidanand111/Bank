import React from 'react';
import { requireAdmin } from '@/lib/auth/permissions';
import { getAdminStats } from '@/lib/services/adminService';
import { AdminNav } from '@/components/admin/AdminNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, formatSecondsToReadable } from '@/lib/utils/formatters';
import {
  Users,
  Shield,
  BookOpen,
  HelpCircle,
  Award,
  FileCheck2,
  PlusCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Settings
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const currentAdmin = await requireAdmin('/admin');
  const stats = await getAdminStats();

  return (
    <div className="pb-16">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Admin Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="purple" size="sm">ADMIN CONSOLE</Badge>
              <span className="text-xs text-slate-500 font-mono">Logged in as {currentAdmin.email}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Platform Administration Overview
            </h1>
            <p className="text-sm text-slate-600">
              Manage bank exams, question banks, mock test suites, and user role privileges.
            </p>
          </div>

          <div className="flex gap-2">
            <Link href="/admin/questions">
              <Button variant="primary" size="sm" className="flex items-center gap-1.5 shadow-xs">
                <PlusCircle className="w-4 h-4" /> Add Question
              </Button>
            </Link>
            <Link href="/admin/tests">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                <Award className="w-4 h-4" /> Manage Tests
              </Button>
            </Link>
          </div>
        </div>

        {/* Pending Approvals Alert Banner */}
        {Boolean(stats.pendingApprovalsCount && stats.pendingApprovalsCount > 0) && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/80 border border-amber-300 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950">
                  {stats.pendingApprovalsCount} Candidate Registration{stats.pendingApprovalsCount > 1 ? 's' : ''} Awaiting Approval
                </h4>
                <p className="text-xs text-amber-800">
                  New candidates cannot access full-length mock tests until verified and approved by an administrator.
                </p>
              </div>
            </div>
            <Link href="/admin/users">
              <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 shadow-xs">
                Review & Approve ({stats.pendingApprovalsCount}) <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* 6 Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Users</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{stats.totalUsers}</div>
              <span className="text-[10px] text-slate-400 block">Registered Students</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Admins</span>
                <Shield className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-extrabold text-indigo-900">{stats.totalAdmins}</div>
              <span className="text-[10px] text-slate-400 block">System Operators</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Exams</span>
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{stats.totalExams}</div>
              <span className="text-[10px] text-slate-400 block">IBPS PO, SBI Clerk</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Questions</span>
                <HelpCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{stats.totalQuestions}</div>
              <span className="text-[10px] text-slate-400 block">Active in Bank</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Mock Tests</span>
                <Award className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{stats.totalMockTests}</div>
              <span className="text-[10px] text-slate-400 block">Prelims Series</span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Attempts</span>
                <FileCheck2 className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{stats.totalAttempts}</div>
              <span className="text-[10px] text-slate-400 block">Total Submissions</span>
            </CardContent>
          </Card>
        </div>

        {/* 3 Split Panels: Recent Users, Recent Attempts, Popular Tests */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Users */}
          <Card className="flex flex-col">
            <CardHeader className="flex justify-between items-center pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Recent Users
              </CardTitle>
              <Link href="/admin/users" className="text-xs text-blue-600 hover:underline font-semibold">
                Manage All
              </Link>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-slate-100 flex-1">
              {stats.recentUsers.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                  </div>
                  <Badge variant={u.role === 'ADMIN' ? 'purple' : 'slate'} size="sm">
                    {u.role}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Test Attempts */}
          <Card className="flex flex-col">
            <CardHeader className="flex justify-between items-center pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-purple-600" /> Recent Test Submissions
              </CardTitle>
              <Link href="/admin/attempts" className="text-xs text-blue-600 hover:underline font-semibold">
                View All
              </Link>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-slate-100 flex-1">
              {stats.recentAttempts.map((att) => (
                <div key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="max-w-[180px]">
                    <div className="font-bold text-slate-900 truncate">{att.mockTestTitle}</div>
                    <div className="text-[11px] text-slate-500">
                      {formatDate(att.completedAt)} • {formatSecondsToReadable(att.timeTakenSeconds)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-blue-700 block">{att.score} Marks</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">{att.accuracy}% Acc</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Popular Mock Tests */}
          <Card className="flex flex-col">
            <CardHeader className="flex justify-between items-center pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Popular Mock Tests
              </CardTitle>
              <Link href="/admin/tests" className="text-xs text-blue-600 hover:underline font-semibold">
                Manage
              </Link>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-slate-100 flex-1">
              {stats.popularTests.map((t) => (
                <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{t.title}</div>
                    <div className="text-[11px] text-slate-500">{t.examTitle}</div>
                  </div>
                  <Badge variant="green" size="sm">
                    {t.attemptsCount} Attempts
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
