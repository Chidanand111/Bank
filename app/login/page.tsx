'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loginAction, demoStudentLoginAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, Lock, Mail, AlertCircle, Sparkles, ArrowRight, UserPlus, Clock } from 'lucide-react';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (urlError === 'pending') {
      setError(
        'Account Pending Approval: Your candidate account is awaiting administrator verification before you can access mock tests.'
      );
    } else if (urlError === 'rejected') {
      setError('Account Application Rejected: Please contact platform support for assistance.');
    }
  }, [urlError]);

  const handleManualLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('callbackUrl', callbackUrl);

    startTransition(async () => {
      const res = await loginAction(null, formData);
      if (res && !res.success && res.error) {
        setError(res.error);
      }
    });
  };

  const handleDemoStudentLogin = () => {
    setError(null);
    startTransition(async () => {
      await demoStudentLoginAction();
    });
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-md mb-1">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Candidate Sign In
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Log in to access your full-length mock tests, live timer sessions, and detailed performance analytics.
          </p>
        </div>

        {/* Candidate Demo Quick-Access Panel */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Candidate Demo Access
            </span>
            <Badge variant="blue" size="sm">
              Instant
            </Badge>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug">
            Evaluate the candidate test experience instantly with our pre-approved student account:
          </p>

          <button
            type="button"
            disabled={isPending}
            onClick={handleDemoStudentLogin}
            className="w-full p-3 bg-white hover:bg-blue-50/80 border border-blue-200 hover:border-blue-300 rounded-xl text-left transition-all hover:shadow-xs group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                Rahul Sharma (Student)
              </span>
              <span className="text-[11px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                Take Test <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 truncate">student@bankmock.com</div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">Password: user123</div>
          </button>
        </div>

        {/* Candidate Login Form */}
        <Card className="border border-slate-200 shadow-md">
          <CardContent className="p-6">
            <form onSubmit={handleManualLogin} className="space-y-4">
              {error && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    error.includes('Pending Approval')
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {error.includes('Pending Approval') ? (
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Candidate Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-700 block">Password</label>
                  <span className="text-[11px] text-slate-400">Min 6 characters</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isPending}
                className="w-full justify-center shadow-xs mt-2"
              >
                Sign In to Test Dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col items-center gap-2 text-xs text-slate-600 text-center">
              <div>
                New candidate?{' '}
                <Link
                  href="/register"
                  className="font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Register Account (Requires Approval)
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
