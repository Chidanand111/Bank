import React from 'react';
import { requireAdmin } from '@/lib/auth/permissions';
import { getExams } from '@/lib/services/testService';
import { AdminNav } from '@/components/admin/AdminNav';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FolderTree, Clock, Award } from 'lucide-react';

export default async function AdminSectionsPage() {
  await requireAdmin('/admin/sections');
  const exams = await getExams();

  const allSections = exams.flatMap(e =>
    e.patterns.flatMap(p =>
      p.sections.map(s => ({
        ...s,
        examTitle: e.title,
        stage: p.stage,
      }))
    )
  );

  return (
    <div className="pb-16">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-1">
          <Badge variant="purple" size="sm">SECTION SCHEMA</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Exam Sections & Timing Configurations
          </h1>
          <p className="text-sm text-slate-600">
            Define sectional question quotas, sectional time limits, and negative marking rules.
          </p>
        </div>

        <Card className="border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Section Name</th>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Exam & Stage</th>
                  <th className="py-3.5 px-4 text-center">Questions</th>
                  <th className="py-3.5 px-4 text-center">Max Marks</th>
                  <th className="py-3.5 px-4 text-center">Time Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {allSections.map((sec, idx) => (
                  <tr key={`${sec.code}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{sec.name}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-blue-700">{sec.code}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {sec.examTitle} ({sec.stage})
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">{sec.numQuestions}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">{sec.maxMarks}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-600">
                      {sec.durationMinutes} mins
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
