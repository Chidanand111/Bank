/**
 * LaTeX & Markdown Table Parser for Competitive Exam Questions
 *
 * Parses LaTeX tabular environments (\begin{tabular}...\end{tabular}),
 * LaTeX array environments (\begin{array}...\end{array}), and Markdown tables (|...|),
 * extracting headers, body rows, alignments, and borders for high-fidelity HTML rendering.
 */

export interface ParsedTableData {
  headers: string[];
  rows: string[][];
  alignments: ('left' | 'center' | 'right')[];
  hasBorders: boolean;
  raw: string;
}

/**
 * Checks if a string contains a LaTeX or Markdown table.
 */
export function isTableContent(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return (
    trimmed.includes('\\begin{tabular}') ||
    trimmed.includes('\\begin{array}') ||
    trimmed.includes('\\begin{table}') ||
    /^\s*\|.+?\|\s*$/m.test(trimmed)
  );
}

/**
 * Cleans LaTeX cell content by stripping outer formatting braces while preserving inline math.
 * e.g., "\textbf{Year}" -> "Year", "\text{Production}" -> "Production", "\textbf{$15\%$}" -> "$15\%$"
 */
export function cleanLatexCell(cell: string): string {
  let cleaned = cell.trim();

  // Strip common LaTeX text styling macros repeatedly
  cleaned = cleaned
    .replace(/\\textbf\{([^{}]+)\}/g, '$1')
    .replace(/\\textit\{([^{}]+)\}/g, '$1')
    .replace(/\\underline\{([^{}]+)\}/g, '$1')
    .replace(/\\textsf\{([^{}]+)\}/g, '$1')
    .replace(/\\textsc\{([^{}]+)\}/g, '$1')
    .replace(/\\text\{([^{}]+)\}/g, '$1')
    .replace(/\\rm\{([^{}]+)\}/g, '$1');

  // Replace escaped ampersands, percent signs, and dollar signs
  cleaned = cleaned
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$');

  return cleaned.trim();
}

/**
 * Parses column alignment specification from LaTeX tabular argument, e.g. "{|c|c|r|l|}"
 */
function parseAlignments(alignSpec: string): {
  alignments: ('left' | 'center' | 'right')[];
  hasBorders: boolean;
} {
  const hasBorders = alignSpec.includes('|');
  const cleanSpec = alignSpec.replace(/[^a-zA-Z]/g, '').toLowerCase();

  const alignments: ('left' | 'center' | 'right')[] = [];
  for (const char of cleanSpec) {
    if (char === 'r') alignments.push('right');
    else if (char === 'l') alignments.push('left');
    else alignments.push('center');
  }

  return {
    alignments: alignments.length > 0 ? alignments : ['left'],
    hasBorders,
  };
}

/**
 * Splits a LaTeX row string by '&' while respecting math delimiters like $...$.
 */
function splitLatexCells(rowStr: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inMath = false;

  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    const prev = i > 0 ? rowStr[i - 1] : '';

    if (char === '$' && prev !== '\\') {
      inMath = !inMath;
      current += char;
    } else if (char === '&' && prev !== '\\' && !inMath) {
      cells.push(cleanLatexCell(current));
      current = '';
    } else {
      current += char;
    }
  }

  if (current.length > 0 || cells.length > 0) {
    cells.push(cleanLatexCell(current));
  }

  return cells;
}

/**
 * Parses a LaTeX tabular string (\begin{tabular}...\end{tabular}) into structured table data.
 */
export function parseLatexTable(rawTable: string): ParsedTableData | null {
  if (!rawTable || typeof rawTable !== 'string') return null;

  // Match \begin{tabular}{spec} ... \end{tabular} or \begin{array}{spec} ... \end{array}
  const tabularMatch = rawTable.match(
    /\\begin\{(tabular|array)\}\s*\{([^}]+)\}([\s\S]+?)\\end\{(tabular|array)\}/
  );

  if (!tabularMatch) {
    // Try matching Markdown table if not LaTeX tabular
    return parseMarkdownTable(rawTable);
  }

  const alignSpec = tabularMatch[2];
  const bodyContent = tabularMatch[3];
  const { alignments, hasBorders } = parseAlignments(alignSpec);

  // Split rows by '\\' (ignoring escaped backslashes)
  const rawRows = bodyContent.split(/\\\\(?![a-zA-Z])/);

  const parsedRows: string[][] = [];

  for (const rawRow of rawRows) {
    // Strip \hline, \cline{...}, \toprule, \midrule, \bottomrule
    const cleanRow = rawRow
      .replace(/\\hline/g, '')
      .replace(/\\cline\{[^}]+\}/g, '')
      .replace(/\\toprule/g, '')
      .replace(/\\midrule/g, '')
      .replace(/\\bottomrule/g, '')
      .trim();

    if (!cleanRow) continue;

    const cells = splitLatexCells(cleanRow);
    // Ignore rows where all cells are empty
    if (cells.some((c) => c.length > 0)) {
      parsedRows.push(cells);
    }
  }

  if (parsedRows.length === 0) return null;

  // First row is the header
  const headers = parsedRows[0];
  const rows = parsedRows.slice(1);

  // Pad alignments if row has more columns than spec
  const maxCols = Math.max(headers.length, ...rows.map((r) => r.length));
  while (alignments.length < maxCols) {
    alignments.push('center');
  }

  return {
    headers,
    rows,
    alignments,
    hasBorders,
    raw: rawTable,
  };
}

/**
 * Parses a standard Markdown table (| Header 1 | Header 2 |) into structured table data.
 */
export function parseMarkdownTable(rawMarkdown: string): ParsedTableData | null {
  if (!rawMarkdown || typeof rawMarkdown !== 'string') return null;

  const lines = rawMarkdown
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'));

  if (lines.length < 2) return null;

  // Extract headers from first line
  const headerCells = lines[0]
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());

  // Check second line for separator row, e.g. |:---|:---:|---:|
  const sepLine = lines[1];
  const isSeparator = /^\|[\s\-:]+(\|[\s\-:]+)+\|$/.test(sepLine);
  if (!isSeparator) return null;

  const sepCells = sepLine.slice(1, -1).split('|');
  const alignments: ('left' | 'center' | 'right')[] = sepCells.map((cell) => {
    const c = cell.trim();
    if (c.startsWith(':') && c.endsWith(':')) return 'center';
    if (c.endsWith(':')) return 'right';
    return 'left';
  });

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    const cells = line
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());
    if (cells.some((c) => c.length > 0)) {
      rows.push(cells);
    }
  }

  return {
    headers: headerCells,
    rows,
    alignments,
    hasBorders: true,
    raw: rawMarkdown,
  };
}

/**
 * Extracts embedded LaTeX tabular blocks from free-form text, splitting into
 * preceding text, table content, and trailing text.
 */
export function extractEmbeddedTables(
  text: string
): { type: 'text' | 'table'; content: string }[] {
  if (!text) return [];

  const regex = /(\\begin\{(tabular|array)\}\s*\{[^}]+\}[\s\S]+?\\end\{(tabular|array)\})/g;
  const parts: { type: 'text' | 'table'; content: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const preceding = text.substring(lastIndex, match.index);
      if (preceding.trim()) {
        parts.push({ type: 'text', content: preceding });
      }
    }

    parts.push({ type: 'table', content: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const trailing = text.substring(lastIndex);
    if (trailing.trim()) {
      parts.push({ type: 'text', content: trailing });
    }
  }

  return parts;
}
