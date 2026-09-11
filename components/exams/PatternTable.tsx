import React from 'react';
import { ExamPattern } from '@/types';

export interface PatternTableProps {
  pattern: ExamPattern;
}

export const PatternTable: React.FC<PatternTableProps> = ({ pattern }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
          <tr>
            <th className="py-3.5 px-4">Section Name</th>
            <th className="py-3.5 px-4 text-center">No. of Questions</th>
            <th className="py-3.5 px-4 text-center">Max Marks</th>
            <th className="py-3.5 px-4 text-center">Duration</th>
            <th className="py-3.5 px-4">Key Topics</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {pattern.sections.map((sec) => (
            <tr key={sec.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="py-3.5 px-4 font-medium text-slate-900">{sec.name}</td>
              <td className="py-3.5 px-4 text-center font-semibold text-blue-600">{sec.numQuestions}</td>
              <td className="py-3.5 px-4 text-center">{sec.maxMarks}</td>
              <td className="py-3.5 px-4 text-center">{sec.durationMinutes} mins</td>
              <td className="py-3.5 px-4 text-xs text-slate-500">
                {sec.topics.slice(0, 3).join(', ')}...
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
          <tr>
            <td className="py-3.5 px-4">Total ({pattern.stage})</td>
            <td className="py-3.5 px-4 text-center text-blue-700">{pattern.totalQuestions}</td>
            <td className="py-3.5 px-4 text-center">{pattern.totalMarks}</td>
            <td className="py-3.5 px-4 text-center">{pattern.totalDurationMinutes} mins</td>
            <td className="py-3.5 px-4 text-xs text-slate-500">Full Length Pattern</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
