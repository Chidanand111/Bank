import React from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShieldAlert, ArrowLeft, LayoutDashboard, LogIn, Lock } from 'lucide-react';

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <Card className="border-2 border-red-200 shadow-xl overflow-hidden">
          <div className="bg-red-500 p-6 text-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">403 - Access Denied</h1>
            <p className="text-red-100 text-xs mt-1">
              Administrator Privileges Required
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-slate-700">Current Session:</span>
                {user ? (
                  <span className="font-mono text-slate-900 font-bold">{user.email}</span>
                ) : (
                  <span className="text-amber-700 font-bold">Unauthenticated Guest</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Assigned Role:</span>
                <Badge variant={user?.role === 'ADMIN' ? 'purple' : 'blue'} size="sm">
                  {user?.role || 'NONE'}
                </Badge>
              </div>
            </div>

            <div className="text-sm text-slate-600 space-y-2 leading-relaxed">
              <p>
                The administrative portal (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-xs">/admin</code>) is strictly restricted to platform administrators with verified server-side <strong className="text-slate-800">ADMIN</strong> role authority.
              </p>
              <p className="text-xs text-slate-500">
                To test administrator features such as managing questions, mock tests, and role assignments, sign in using the dedicated Administrator account.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/dashboard" className="w-full">
                <Button variant="outline" size="md" className="w-full flex items-center justify-center gap-1.5">
                  <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
                </Button>
              </Link>
              <Link href="/login" className="w-full">
                <Button variant="primary" size="md" className="w-full flex items-center justify-center gap-1.5">
                  <LogIn className="w-4 h-4" /> Sign In as Admin
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
