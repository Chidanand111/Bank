'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

export interface MathRendererProps {
  content?: string | null;
  className?: string;
}

interface Segment {
  type: 'text' | 'inline-math' | 'block-math';
  raw: string;
}

/**
 * MathRenderer parses and renders mixed text containing LaTeX formulas:
 * - Inline math: $formula$ or \(formula\)
 * - Block math: $$formula$$ or \[formula\]
 * Uses KaTeX for fast, beautiful mathematical typography.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const segments = useMemo(() => {
    if (!content) return [];

    // Regex to split on LaTeX delimiters:
    // 1. $$ ... $$ (block)
    // 2. \[ ... \] (block)
    // 3. $ ... $ (inline)
    // 4. \( ... \) (inline)
    const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$(?!\s)[^$\r\n]+?(?<!\s)\$|\\\([\s\S]+?\\\))/g;

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
      if (rawMatch.startsWith('$$') && rawMatch.endsWith('$$')) {
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

  // Fast path: if no LaTeX syntax was found, return plain text
  if (segments.length === 1 && segments[0].type === 'text') {
    return <span className={className}>{content}</span>;
  }

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
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
