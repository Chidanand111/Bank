'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const pathname = usePathname();

  if (pathname.startsWith('/test/')) {
    return null;
  }

  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1 */}
          <div className="md:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Bank<span className="text-blue-400">Mock</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              India’s premier online mock test platform for IBPS PO, SBI Clerk, and competitive banking recruitment examinations.
            </p>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Target Exams</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/exams/ibps-po" className="hover:text-white transition-colors">
                  IBPS PO Mock Tests
                </Link>
              </li>
              <li>
                <Link href="/exams/sbi-clerk" className="hover:text-white transition-colors">
                  SBI Clerk Mock Tests
                </Link>
              </li>
              <li>
                <span className="text-slate-600 cursor-not-allowed">RBI Grade B (Coming Soon)</span>
              </li>
              <li>
                <span className="text-slate-600 cursor-not-allowed">IBPS RRB Officer (Coming Soon)</span>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Practice & Prep</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/tests" className="hover:text-white transition-colors">
                  Full Length Mocks
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Performance Dashboard
                </Link>
              </li>
              <li>
                <Link href="/exams" className="hover:text-white transition-colors">
                  Exam Patterns & Syllabus
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Exam Standard</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our mock test environment accurately mirrors the official TCS iON exam engine with sectional timers, question status palettes, and negative marking rules (+1.0 / -0.25).
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} BankMock Preparation Platform. All rights reserved.</p>
          <div className="flex gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
