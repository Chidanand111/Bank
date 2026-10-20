'use client';

import React, { useMemo } from 'react';
import { parseLatexTable, ParsedTableData } from '@/lib/utils/tableParser';
import { MathRenderer } from './MathRenderer';
import { Table as TableIcon } from 'lucide-react';

export interface LatexTableViewerProps {
  content?: string | null;
  data?: ParsedTableData | null;
  title?: string;
  className?: string;
  showCaption?: boolean;
}

/**
 * LatexTableViewer renders LaTeX tabular environments (\begin{tabular}...\end{tabular})
 * and Markdown tables as responsive, beautifully styled HTML tables with KaTeX cell formatting.
 */
export const LatexTableViewer: React.FC<LatexTableViewerProps> = ({
  content,
  data,
  title,
  className = '',
  showCaption = true,
}) => {
  const parsedData = useMemo(() => {
    if (data) return data;
    if (!content) return null;
    return parseLatexTable(content);
  }, [content, data]);

  if (!parsedData || (parsedData.headers.length === 0 && parsedData.rows.length === 0)) {
    if (content) {
      return <MathRenderer content={content} className={className} />;
    }
    return null;
  }

  const { headers, rows, alignments, hasBorders } = parsedData;

  const getAlignClass = (colIdx: number) => {
    const align = alignments[colIdx] || 'left';
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  const borderClass = hasBorders
    ? 'border-x border-slate-200/80 first:border-l-0 last:border-r-0'
    : '';

  return (
    <div
      className={`my-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-sm ${className}`}
    >
      {/* Optional Table Caption Bar */}
      {showCaption && title && (
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/90 px-4 py-2 text-xs font-bold text-slate-700">
          <TableIcon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          <span>{title}</span>
        </div>
      )}

      {/* Responsive Horizontal Scroll Container */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-xs sm:text-sm">
          {headers.length > 0 && (
            <thead className="bg-slate-100/80 text-slate-900 border-b-2 border-slate-200">
              <tr>
                {headers.map((headerText, colIdx) => (
                  <th
                    key={colIdx}
                    scope="col"
                    className={`px-3.5 py-2.5 font-bold tracking-tight text-slate-800 ${getAlignClass(
                      colIdx
                    )} ${borderClass}`}
                  >
                    <MathRenderer content={headerText} />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="even:bg-slate-50/50 hover:bg-indigo-50/40 transition-colors"
              >
                {row.map((cellText, colIdx) => (
                  <td
                    key={colIdx}
                    className={`px-3.5 py-2 align-middle ${getAlignClass(colIdx)} ${borderClass}`}
                  >
                    <MathRenderer content={cellText} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
