import React from 'react';
import { requireAdmin } from '@/lib/auth/permissions';
import { getAdminAllAttempts } from '@/lib/services/adminService';
import { AdminNav } from '@/components/admin/AdminNav';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, formatSecondsToReadable } from '@/lib/utils/formatters';
import { FileCheck2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function AdminAttemptsPage() {
  await requireAdmin('/admin/attempts');
  const attempts = await getAdminAllAttempts();

  return (
    <div className="pb-16">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-1">
          <Badge variant="purple" size="sm">PLATFORM SUBMISSIONS</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Test Attempts & Score Logs
          </h1>
          <p className="text-sm text-slate-600">
            Audit test attempts across all mock test suites, check score distributions, and verify cut-off clearance.
          </p>
        </div>

        <Card className="border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Mock Test</th>
                  <th className="py-3.5 px-4 text-center">Score</th>
                  <th className="py-3.5 px-4 text-center">Accuracy</th>
                  <th className="py-3.5 px-4 text-center">Time Spent</th>
                  <th className="py-3.5 px-4 text-center">Cutoff Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{att.userName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{att.userId}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{att.mockTestTitle}</div>
                      <div className="text-[11px] text-slate-500">{formatDate(att.completedAt)}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-blue-700 text-base">{att.score}</span>
                      <span className="text-xs text-slate-400"> / {att.maxScore}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {att.accuracy}%
                    </td>

                    <td className="py-3.5 px-4 text-center text-xs text-slate-600">
                      {formatSecondsToReadable(att.timeTakenSeconds)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {att.isCutoffCleared ? (
                        <Badge variant="green" size="sm">Cleared</Badge>
                      ) : (
                        <Badge variant="amber" size="sm">Below Cutoff</Badge>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/result/${att.id}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          Inspect Result
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
