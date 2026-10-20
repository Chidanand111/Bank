'use client';

import React, { useMemo } from 'react';
import katex from 'katex';
import { parseLatexTable } from '@/lib/utils/tableParser';

export interface MathRendererProps {
  content?: string | null;
  className?: string;
}

interface Segment {
  type: 'text' | 'inline-math' | 'block-math' | 'table';
  raw: string;
}

/**
 * MathRenderer parses and renders mixed text containing LaTeX formulas and tables:
 * - Inline math: $formula$ or \(formula\)
 * - Block math: $$formula$$ or \[formula\]
 * - LaTeX tables: \begin{tabular}{...}...\end{tabular} or \begin{array}{...}...\end{array}
 * Uses KaTeX for fast, beautiful mathematical typography and HTML5 for responsive tabular layout.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const segments = useMemo(() => {
    if (!content) return [];

    // Regex to split on LaTeX tables and math delimiters:
    // 1. \begin{tabular|array}{...} ... \end{tabular|array} (table)
    // 2. $$ ... $$ (block)
    // 3. \[ ... \] (block)
    // 4. $ ... $ (inline)
    // 5. \( ... \) (inline)
    const regex = /(\\begin\{(?:tabular|array)\}\s*\{[^}]+\}[\s\S]+?\\end\{(?:tabular|array)\}|\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$(?!\s)[^$\r\n]+?(?<!\s)\$|\\\([\s\S]+?\\\))/g;

    const parts: Segment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          raw: content.substring(lastIndex, match.index),
        });
      }

      const rawMatch = match[0];
      if (rawMatch.startsWith('\\begin{tabular}') || rawMatch.startsWith('\\begin{array}')) {
        parts.push({
          type: 'table',
          raw: rawMatch,
        });
      } else if (rawMatch.startsWith('$$') && rawMatch.endsWith('$$')) {
        parts.push({
          type: 'block-math',
          raw: rawMatch.slice(2, -2).trim(),
        });
      } else if (rawMatch.startsWith('\\[') && rawMatch.endsWith('\\]')) {
        parts.push({
          type: 'block-math',
          raw: rawMatch.slice(2, -2).trim(),
        });
      } else if (rawMatch.startsWith('\\(') && rawMatch.endsWith('\\)')) {
        parts.push({
          type: 'inline-math',
          raw: rawMatch.slice(2, -2).trim(),
        });
      } else if (rawMatch.startsWith('$') && rawMatch.endsWith('$')) {
        parts.push({
          type: 'inline-math',
          raw: rawMatch.slice(1, -1).trim(),
        });
      } else {
        parts.push({
          type: 'text',
          raw: rawMatch,
        });
      }

      lastIndex = match.index + rawMatch.length;
    }

    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        raw: content.substring(lastIndex),
      });
    }

    return parts;
  }, [content]);

  if (!content) return null;

  // Fast path: if no LaTeX syntax or table was found, return plain text
  if (segments.length === 1 && segments[0].type === 'text') {
    return <span className={className}>{content}</span>;
  }

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'table') {
          const tableData = parseLatexTable(seg.raw);
          if (tableData) {
            return (
              <span key={idx} className="block my-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full min-w-full border-collapse text-xs sm:text-sm">
                  {tableData.headers.length > 0 && (
                    <thead className="bg-slate-100/90 text-slate-900 border-b-2 border-slate-200">
                      <tr>
                        {tableData.headers.map((headerText, colIdx) => {
                          const align = tableData.alignments[colIdx] || 'left';
                          const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                          return (
                            <th
                              key={colIdx}
                              scope="col"
                              className={`px-3.5 py-2.5 font-bold tracking-tight text-slate-800 ${alignClass}`}
                            >
                              <MathRenderer content={headerText} />
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {tableData.rows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="even:bg-slate-50/50 hover:bg-indigo-50/40 transition-colors"
                      >
                        {row.map((cellText, colIdx) => {
                          const align = tableData.alignments[colIdx] || 'left';
                          const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                          return (
                            <td
                              key={colIdx}
                              className={`px-3.5 py-2 align-middle ${alignClass}`}
                            >
                              <MathRenderer content={cellText} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </span>
            );
          }
        }

        if (seg.type === 'block-math') {
          try {
            const html = katex.renderToString(seg.raw, {
              displayMode: true,
              throwOnError: false,
            });
            return (
              <span
                key={idx}
                className="block my-2 overflow-x-auto text-center"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return (
              <span key={idx} className="block my-2 text-red-500 font-mono text-xs">
                $${seg.raw}$$
              </span>
            );
          }
        }

        if (seg.type === 'inline-math') {
          try {
            const html = katex.renderToString(seg.raw, {
              displayMode: false,
              throwOnError: false,
            });
            return (
              <span
                key={idx}
                className="inline-block px-0.5 align-baseline"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return (
              <span key={idx} className="inline-block text-red-500 font-mono text-xs">
                ${seg.raw}$
              </span>
            );
          }
        }

        return <React.Fragment key={idx}>{seg.raw}</React.Fragment>;
      })}
    </span>
  );
};
