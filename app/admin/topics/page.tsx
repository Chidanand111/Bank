import React from 'react';
import { requireAdmin } from '@/lib/auth/permissions';
import { getExams } from '@/lib/services/testService';
import { AdminNav } from '@/components/admin/AdminNav';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tags, BookOpen } from 'lucide-react';

export default async function AdminTopicsPage() {
  await requireAdmin('/admin/topics');
  const exams = await getExams();

  const allTopics: { topic: string; sectionName: string; examTitle: string }[] = [];
  exams.forEach(e => {
    e.patterns.forEach(p => {
      p.sections.forEach(s => {
        s.topics.forEach(t => {
          allTopics.push({
            topic: t,
            sectionName: s.name,
            examTitle: e.title,
          });
        });
      });
    });
  });

  return (
    <div className="pb-16">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-1">
          <Badge variant="purple" size="sm">SYLLABUS & TOPIC TAXONOMY</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Curriculum Topics & Subject Taxonomy
          </h1>
          <p className="text-sm text-slate-600">
            Categorize practice questions under banking exam syllabus topics for accuracy diagnostics and weak-topic analysis.
          </p>
        </div>

        <Card className="border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Topic Name</th>
                  <th className="py-3.5 px-4">Subject / Section</th>
                  <th className="py-3.5 px-4">Associated Exam</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {allTopics.map((item, idx) => (
                  <tr key={`${item.topic}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.topic}</td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-blue-700">{item.sectionName}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{item.examTitle}</td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="green" size="sm">Active Syllabus</Badge>
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
