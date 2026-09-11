import React from 'react';
import { requireUser } from '@/lib/auth/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { logoutAction } from '@/lib/auth/actions';
import { User, Mail, Shield, Calendar, Award, LogOut, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default async function ProfilePage() {
  const user = await requireUser('/profile');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{user.name}</h1>
              <Badge variant={user.role === 'ADMIN' ? 'purple' : 'blue'} size="md">
                {user.role}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono">{user.email}</p>
          </div>
        </div>

        <form action={logoutAction}>
          <Button variant="danger" size="sm" className="flex items-center gap-1.5">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </form>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" /> Account Security & Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-slate-700">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500">Database Role:</span>
              <span className="font-extrabold text-slate-900">{user.role}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500">Session Security:</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> HttpOnly Signed Cookie
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500">Account ID:</span>
              <span className="font-mono text-slate-600 text-[11px]">{user.id}</span>
            </div>
            {user.role === 'ADMIN' && (
              <div className="pt-2">
                <Link href="/admin">
                  <Button variant="primary" size="sm" className="w-full">
                    Go to Admin Management Console
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" /> Exam Readiness & Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-slate-700">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500">Tests Attempted:</span>
              <span className="font-extrabold text-blue-700 text-sm">{user.attemptCount || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500">Target Exams:</span>
              <span className="font-semibold text-slate-900">IBPS PO, SBI Clerk</span>
            </div>
            <div className="pt-2 flex gap-2">
              <Link href="/dashboard" className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  View Dashboard
                </Button>
              </Link>
              <Link href="/my-results" className="w-full">
                <Button variant="secondary" size="sm" className="w-full">
                  My Results
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
