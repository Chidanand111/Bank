'use client';

import React from 'react';
import { Button } from '../ui/Button';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';

export interface SubmissionStatusModalProps {
  isOpen: boolean;
  phase: 'idle' | 'submitting' | 'success' | 'error';
  errorMessage?: string | null;
  onRetry: () => void;
  onClose: () => void;
  isExamExpired?: boolean;
}

export const SubmissionStatusModal: React.FC<SubmissionStatusModalProps> = ({
  isOpen,
  phase,
  errorMessage,
  onRetry,
  onClose,
  isExamExpired = false,
}) => {
  if (!isOpen || phase === 'idle') return null;

  const isSubmitting = phase === 'submitting';
  const isSuccess = phase === 'success';
  const isError = phase === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transform transition-all z-10 p-6 text-center">
        {/* Submitting State */}
        {isSubmitting && (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Submitting Examination</h3>
              <p className="mt-1 text-sm text-slate-600">
                Authoritatively grading responses and recording your exam attempt on the server...
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
              Please do not close, refresh, or navigate away while submission is finalizing.
            </div>
          </div>
        )}

        {/* Success State */}
        {isSuccess && (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Submission Confirmed!</h3>
              <p className="mt-1 text-sm text-slate-600">
                Your exam has been finalized and validated. Redirecting to your detailed scorecard...
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-700 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              Attempt securely persisted to Neon PostgreSQL
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="space-y-4 py-2">
            <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Submission Failed</h3>
              <p className="mt-1 text-xs text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-200 font-medium">
                {errorMessage || 'A network error or server timeout interrupted the submission.'}
              </p>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-left text-xs space-y-1">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                Answers are safe on your device
              </div>
              <p className="text-blue-800 leading-relaxed">
                All your answers remain securely saved in your browser session. No data was lost. You can safely retry submission without creating duplicate attempts.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {!isExamExpired && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={onClose}
                  className="flex-1 justify-center flex items-center gap-1.5 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Review Answers
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={onRetry}
                className="flex-1 justify-center flex items-center gap-1.5 font-bold shadow-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Submission
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
