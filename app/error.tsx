'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full p-8 text-center space-y-6">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Page Failed to Load
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            The page encountered a temporary network glitch or update. Please reload to load the latest version.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              reset();
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="flex items-center justify-center gap-2 shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            Reload Page
          </Button>

          <Link href="/tests">
            <Button
              variant="outline"
              size="md"
              className="w-full flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              All Tests
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
