'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { adminLoginAction, demoAdminLoginAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Shield, Lock, Mail, AlertTriangle, KeyRound, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAdminLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('callbackUrl', callbackUrl);

    startTransition(async () => {
      const res = await adminLoginAction(null, formData);
      if (res && !res.success && res.error) {
        setError(res.error);
      }
    });
  };

  const handleAdminDemoLogin = () => {
    setError(null);
    startTransition(async () => {
      await demoAdminLoginAction();
    });
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Header with high-security branding */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-lg shadow-indigo-950/50 mb-1">
            <KeyRound className="w-7 h-7" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="purple" size="sm">
              RESTRICTED PORTAL
            </Badge>
            <span className="text-xs text-slate-400 font-mono">ADMIN-CONSOLE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Administrator Gateway
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Direct authenticated access for examination controllers, question authors, and platform managers.
          </p>
        </div>

        {/* Demo Quick-Access for Admin Evaluation */}
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4.5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Admin Evaluation Account
            </span>
            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/50">
              One-Click
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Sign in instantly with pre-configured administrator authority:
          </p>

          <button
            type="button"
            disabled={isPending}
            onClick={handleAdminDemoLogin}
            className="w-full p-3 bg-slate-900 hover:bg-slate-800/90 border border-indigo-500/40 hover:border-indigo-400 rounded-xl text-left transition-all group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Platform Administrator
              </span>
              <span className="text-[11px] font-bold text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                Enter Console <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-300">admin@bankmock.com</div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">Password: admin123</div>
          </button>
        </div>

        {/* Admin Login Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-4">
          <form onSubmit={handleAdminLogin} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bankmock.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:bg-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-600 focus:bg-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Standard student/candidate accounts cannot log in here. Candidate registration and tests are managed separately.
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isPending}
              className="w-full justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 shadow-md shadow-indigo-950"
            >
              Sign In to Admin Portal <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Candidate Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
