import React from 'react';
import { requireAdmin } from '@/lib/auth/permissions';
import { getExams } from '@/lib/services/testService';
import { AdminNav } from '@/components/admin/AdminNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BookOpen, FolderTree, Layers, CheckCircle2 } from 'lucide-react';

export default async function AdminExamsPage() {
  await requireAdmin('/admin/exams');
  const exams = await getExams();

  return (
    <div className="pb-16">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-1">
          <Badge variant="purple" size="sm">EXAM ARCHITECTURE</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Target Exams & Pattern Schema
          </h1>
          <p className="text-sm text-slate-600">
            Configure examination categories, Prelims/Mains phase breakdowns, and participating bank details.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <Card key={exam.id} className="border border-slate-200 shadow-xs">
              <CardHeader className="flex justify-between items-center pb-3">
                <div>
                  <Badge variant="blue" size="sm" className="mb-1">{exam.category} EXAM</Badge>
                  <CardTitle className="text-lg font-bold">{exam.title}</CardTitle>
                </div>
                <Badge variant="green" size="sm">Active</Badge>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">{exam.description}</p>
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Configured Stages ({exam.patterns.length})
                  </span>
                  {exam.patterns.map((p) => (
                    <div key={p.stage} className="p-2.5 bg-slate-50 rounded-lg flex justify-between items-center">
                      <span className="font-bold text-slate-800">{p.stage} Stage</span>
                      <span className="text-slate-600">
                        {p.totalQuestions} Qs • {p.totalMarks} Marks • {p.totalDurationMinutes} Mins
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
