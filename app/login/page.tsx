'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loginAction, demoLoginAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, User, Lock, Mail, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleManualLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    startTransition(async () => {
      const res = await loginAction(null, formData);
      if (res && !res.success && res.error) {
        setError(res.error);
      }
    });
  };

  const handleDemoLogin = (role: 'USER' | 'ADMIN') => {
    setError(null);
    startTransition(async () => {
      await demoLoginAction(role);
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
            Sign In to BankMock
          </h1>
          <p className="text-xs text-slate-500">
            Access your student dashboard or administrator exam console
          </p>
        </div>

        {/* Demo Accounts Quick-Access Panel */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Evaluation Demo Accounts
            </span>
            <Badge variant="blue" size="sm">One-Click</Badge>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug">
            Click below to instantly create a verified server-side session:
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDemoLogin('ADMIN')}
              className="p-3 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl text-left transition-all hover:shadow-xs group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-indigo-900">ADMIN</span>
                <Badge variant="purple" size="sm">Admin Console</Badge>
              </div>
              <div className="text-[10px] text-slate-500 truncate">admin@bankmock.com</div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">Password: admin123</div>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDemoLogin('USER')}
              className="p-3 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl text-left transition-all hover:shadow-xs group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-blue-900">USER</span>
                <Badge variant="blue" size="sm">Student</Badge>
              </div>
              <div className="text-[10px] text-slate-500 truncate">student@bankmock.com</div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">Password: user123</div>
            </button>
          </div>
        </div>

        {/* Main Login Form */}
        <Card className="border border-slate-200 shadow-md">
          <CardContent className="p-6">
            <form onSubmit={handleManualLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Email Address</label>
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
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isPending}
                className="w-full justify-center shadow-xs"
              >
                Sign In <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              Don't have an account?{' '}
              <Link href="/register" className="font-bold text-blue-600 hover:text-blue-700">
                Register as a Student
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
