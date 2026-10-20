import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isTableContent,
  cleanLatexCell,
  parseLatexTable,
  parseMarkdownTable,
  extractEmbeddedTables,
} from '@/lib/utils/tableParser';
import {
  questionOptionInputSchema,
  adminQuestionInputSchema,
  bulkImportQuestionsSchema,
} from '@/lib/validations/adminSchemas';
import {
  classifyImageReference,
  resolveQuestionDiagramReferences,
} from '@/lib/storage/questionImageResolver';
import { AdminQuestionInput } from '@/types';

// Mock DB store for question repository
const inMemoryQuestions = new Map<string, any>();

vi.mock('@/lib/auth/permissions', () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN',
  }),
}));

vi.mock('@/lib/services/common', () => ({
  safeRevalidatePath: vi.fn(),
}));

vi.mock('@/lib/cache', () => ({
  invalidateQuestionsCache: vi.fn(),
  invalidateLiveQuestionsCache: vi.fn(),
  getCachedQuestions: vi.fn().mockResolvedValue(null),
  setCachedQuestions: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    exam: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'exam-ibps-po',
        title: 'IBPS PO Prelims',
        slug: 'ibps-po',
        category: 'PO',
        sections: [
          {
            id: 'sec-quant',
            code: 'QUANT',
            name: 'Quantitative Aptitude',
            topics: [{ id: 'top-di', name: 'Data Interpretation' }],
          },
        ],
      }),
      upsert: vi.fn().mockResolvedValue({
        id: 'exam-ibps-po',
        title: 'IBPS PO Prelims',
        slug: 'ibps-po',
        category: 'PO',
      }),
    },
    mockTest: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    question: {
      findUnique: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
        return inMemoryQuestions.get(where.id) || null;
      }),
      create: vi.fn().mockImplementation(async ({ data }: { data: any }) => {
        const record = {
          id: data.id || `q-${Date.now()}`,
          text: data.text,
          imageUrl: data.imageUrl,
          passage: data.passage,
          passageImageUrl: data.passageImageUrl,
          table: data.table,
          groupId: data.groupId,
          difficulty: data.difficulty,
          marks: data.marks,
          negativeMarks: data.negativeMarks,
          examId: data.examId,
          sectionId: data.sectionId,
          topicId: data.topicId,
          options: (data.options?.create || []).map((o: any, idx: number) => ({
            id: o.id || `opt-${idx + 1}`,
            text: o.text,
            imageUrl: o.imageUrl,
            isCorrect: o.isCorrect,
            order: o.order,
          })),
        };
        inMemoryQuestions.set(record.id, record);
        return record;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }: { where: { id: string }; data: any }) => {
        const existing = inMemoryQuestions.get(where.id);
        if (!existing) throw new Error('Question not found');
        const updated = {
          ...existing,
          ...data,
          options: (data.options?.create || existing.options).map((o: any, idx: number) => ({
            id: o.id || `opt-${idx + 1}`,
            text: o.text ?? '',
            imageUrl: o.imageUrl ?? null,
            isCorrect: Boolean(o.isCorrect),
            order: o.order ?? idx + 1,
          })),
        };
        inMemoryQuestions.set(where.id, updated);
        return updated;
      }),
      upsert: vi.fn().mockImplementation(async ({ where, update, create }: any) => {
        const existing = inMemoryQuestions.get(where.id);
        const data = existing ? update : create;
        const updated = {
          ...(existing || {}),
          ...data,
          id: where.id,
        };
        inMemoryQuestions.set(where.id, updated);
        return updated;
      }),
      delete: vi.fn().mockImplementation(async ({ where }: { where: { id: string } }) => {
        inMemoryQuestions.delete(where.id);
        return { id: where.id };
      }),
    },
    option: {
      deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
      create: vi.fn().mockImplementation(async ({ data }: any) => data),
    },
    $transaction: vi.fn().mockImplementation(async (operations: any) => {
      if (Array.isArray(operations)) {
        return Promise.all(operations);
      }
      if (typeof operations === 'function') {
        return operations();
      }
      return operations;
    }),
  },
}));

describe('LaTeX & Markdown Table Parser (tableParser.ts)', () => {
  describe('isTableContent', () => {
    it('detects LaTeX \\begin{tabular}', () => {
      const raw = '\\begin{tabular}{|c|c|}\\hline Year & Sales \\\\ \\hline 2021 & 500 \\\\ \\hline \\end{tabular}';
      expect(isTableContent(raw)).toBe(true);
    });

    it('detects LaTeX \\begin{array}', () => {
      const raw = '\\begin{array}{ccc} a & b & c \\\\ 1 & 2 & 3 \\end{array}';
      expect(isTableContent(raw)).toBe(true);
    });

    it('detects Markdown table format', () => {
      const raw = '| Column A | Column B |\n|---|---|\n| Val 1 | Val 2 |';
      expect(isTableContent(raw)).toBe(true);
    });

    it('returns false for plain question text and standard math formulas', () => {
      expect(isTableContent('Find the value of $x^2 + 5x + 6 = 0$.')).toBe(false);
      expect(isTableContent(null)).toBe(false);
      expect(isTableContent(undefined)).toBe(false);
    });
  });

  describe('cleanLatexCell', () => {
    it('removes \\textbf, \\textit, and \\text wrappers while preserving text', () => {
      expect(cleanLatexCell('\\textbf{Year}')).toBe('Year');
      expect(cleanLatexCell('\\textit{Production}')).toBe('Production');
      expect(cleanLatexCell('\\text{Category A}')).toBe('Category A');
    });

    it('preserves inline math formulas like $x^2$ and $\\frac{a}{b}$', () => {
      expect(cleanLatexCell('\\textbf{$15\\%$}')).toBe('$15%$');
      expect(cleanLatexCell('$\\sqrt{256}$')).toBe('$\\sqrt{256}$');
      expect(cleanLatexCell('$\\frac{x}{y}$')).toBe('$\\frac{x}{y}$');
    });

    it('unescapes LaTeX special symbols like \\& and \\%', () => {
      expect(cleanLatexCell('Profit \\& Loss')).toBe('Profit & Loss');
      expect(cleanLatexCell('100\\%')).toBe('100%');
      expect(cleanLatexCell('\\$500')).toBe('$500');
    });
  });

  describe('parseLatexTable', () => {
    it('parses structured DI tabular table with alignments and headers', () => {
      const latex = `
        \\begin{tabular}{|l|c|r|}
        \\hline
        \\textbf{State} & \\textbf{Wheat (Tons)} & \\textbf{Rice (Tons)} \\\\
        \\hline
        Punjab & $450$ & $320$ \\\\
        Haryana & $380$ & $290$ \\\\
        \\hline
        \\end{tabular}
      `;

      const result = parseLatexTable(latex);
      expect(result).not.toBeNull();
      expect(result?.hasBorders).toBe(true);
      expect(result?.headers).toEqual(['State', 'Wheat (Tons)', 'Rice (Tons)']);
      expect(result?.alignments[0]).toBe('left');
      expect(result?.alignments[1]).toBe('center');
      expect(result?.alignments[2]).toBe('right');
      expect(result?.rows).toHaveLength(2);
      expect(result?.rows[0]).toEqual(['Punjab', '$450$', '$320$']);
      expect(result?.rows[1]).toEqual(['Haryana', '$380$', '$290$']);
    });

    it('gracefully handles empty or malformed LaTeX without crashing', () => {
      expect(parseLatexTable('')).toBeNull();
      expect(parseLatexTable('Not a table')).toBeNull();
      expect(parseLatexTable('\\begin{tabular}{|c|} \\hline \\end{tabular}')).toBeNull();
    });
  });

  describe('parseMarkdownTable', () => {
    it('parses Markdown table with colon-based alignments', () => {
      const md = `
        | Subject | Marks | Percentage |
        |:---|:---:|---:|
        | English | 28 | 93.3% |
        | Quant | 35 | 100% |
      `;

      const result = parseMarkdownTable(md);
      expect(result).not.toBeNull();
      expect(result?.headers).toEqual(['Subject', 'Marks', 'Percentage']);
      expect(result?.alignments).toEqual(['left', 'center', 'right']);
      expect(result?.rows).toHaveLength(2);
      expect(result?.rows[0]).toEqual(['English', '28', '93.3%']);
    });
  });

  describe('extractEmbeddedTables', () => {
    it('extracts table embedded between introductory and follow-up text', () => {
      const text = `
        Direction: Refer to the following table to answer questions 1 to 5:
        \\begin{tabular}{|c|c|}
        \\hline
        Year & Profit \\\\
        \\hline
        2020 & 100 \\\\
        \\hline
        \\end{tabular}
        Note: All figures are in millions of dollars.
      `;

      const parts = extractEmbeddedTables(text);
      expect(parts.length).toBe(3);
      expect(parts[0].type).toBe('text');
      expect(parts[0].content).toContain('Direction: Refer to the following table');
      expect(parts[1].type).toBe('table');
      expect(parts[1].content).toContain('\\begin{tabular}');
      expect(parts[2].type).toBe('text');
      expect(parts[2].content).toContain('Note: All figures are in millions');
    });
  });
});

describe('Validation Schemas (adminSchemas.ts)', () => {
  it('validates questionOptionInputSchema with text-only option', () => {
    const res = questionOptionInputSchema.safeParse({
      text: 'Option A text',
      isCorrect: true,
    });
    expect(res.success).toBe(true);
  });

  it('validates questionOptionInputSchema with image-only option (empty text)', () => {
    const res = questionOptionInputSchema.safeParse({
      text: '',
      imageUrl: 'optA_triangle.png',
      isCorrect: true,
    });
    expect(res.success).toBe(true);
  });

  it('validates questionOptionInputSchema with both text and imageUrl', () => {
    const res = questionOptionInputSchema.safeParse({
      text: 'Right Angle Triangle',
      imageUrl: 'optA_triangle.png',
      isCorrect: true,
    });
    expect(res.success).toBe(true);
  });

  it('rejects option when BOTH text and imageUrl are missing or empty', () => {
    const res = questionOptionInputSchema.safeParse({
      text: '   ',
      imageUrl: '',
      isCorrect: false,
    });
    expect(res.success).toBe(false);
  });

  it('validates adminQuestionInputSchema containing table and option diagrams', () => {
    const validQuestion: AdminQuestionInput = {
      sectionCode: 'QUANT',
      topicName: 'Data Interpretation',
      text: 'What is the average production of wheat in Punjab over 3 years?',
      difficulty: 'MEDIUM',
      explanation: 'Average = (450 + 500 + 550) / 3 = 500.',
      marks: 1.0,
      negativeMarks: 0.25,
      table: '\\begin{tabular}{|c|c|}\\hline Year & Wheat \\\\ \\hline 2021 & 450 \\\\ \\hline \\end{tabular}',
      options: [
        { text: '480', isCorrect: false },
        { text: '500', isCorrect: true },
        { text: '', imageUrl: 'optC_chart.png', isCorrect: false },
        { text: '520', isCorrect: false },
      ],
    };

    const res = adminQuestionInputSchema.safeParse(validQuestion);
    expect(res.success).toBe(true);
  });

  it('validates bulkImportQuestionsSchema containing questions with tables and option diagrams', () => {
    const batch = [
      {
        sectionCode: 'QUANT',
        topicName: 'Geometry',
        text: 'Which shape represents an equilateral triangle?',
        difficulty: 'EASY',
        explanation: 'Option A has all sides equal.',
        options: [
          { text: '', imageUrl: 'optA_equilateral.png', isCorrect: true },
          { text: '', imageUrl: 'optB_scalene.png', isCorrect: false },
        ],
      },
      {
        sectionCode: 'QUANT',
        topicName: 'Tabular DI',
        text: 'What is the ratio of income to expenditure in 2022?',
        difficulty: 'MEDIUM',
        table: '\\begin{tabular}{|c|c|c|}\\hline Year & Income & Exp \\\\ \\hline 2022 & 600 & 400 \\\\ \\hline \\end{tabular}',
        options: [
          { text: '3:2', isCorrect: true },
          { text: '2:3', isCorrect: false },
        ],
      },
    ];

    const res = bulkImportQuestionsSchema.safeParse(batch);
    expect(res.success).toBe(true);
  });
});

describe('Option Image Reference Resolution (questionImageResolver.ts)', () => {
  it('correctly classifies image reference types', () => {
    expect(classifyImageReference('diagram.png')).toBe('FILENAME');
    expect(classifyImageReference('images/sub/optA.jpg')).toBe('FILENAME');
    expect(classifyImageReference('https://cdn.example.com/opt.png')).toBe('URL');
    expect(classifyImageReference('data:image/png;base64,iVBORw0KGgo=')).toBe('DATA_URI');
    expect(classifyImageReference('')).toBe('NONE');
  });

  it('resolves option images against uploaded ZIP archive image map', () => {
    const questions: AdminQuestionInput[] = [
      {
        sectionCode: 'REASONING',
        topicName: 'Figure Series',
        text: 'Select the missing figure from the options below:',
        difficulty: 'MEDIUM',
        explanation: 'Pattern rotates 90 degrees clockwise.',
        marks: 1.0,
        negativeMarks: 0.25,
        options: [
          { text: '', imageUrl: 'fig_optA.png', isCorrect: true },
          { text: '', imageUrl: 'fig_optB.png', isCorrect: false },
          { text: 'None of these', isCorrect: false },
        ],
      },
    ];

    const zipImageMap = new Map<string, any>();
    zipImageMap.set('fig_opta.png', {
      baseName: 'fig_optA.png',
      normalizedPath: 'fig_opta.png',
      buffer: Buffer.from('mock-png-data-A'),
    });
    zipImageMap.set('fig_optb.png', {
      baseName: 'fig_optB.png',
      normalizedPath: 'fig_optb.png',
      buffer: Buffer.from('mock-png-data-B'),
    });

    const urlMapping = new Map<string, string>();
    urlMapping.set('fig_opta.png', '/uploads/questions/batch-1/fig_opta.png');
    urlMapping.set('fig_optb.png', '/uploads/questions/batch-1/fig_optb.png');

    const result = resolveQuestionDiagramReferences(questions, zipImageMap, urlMapping);

    expect(result.report.unresolvedReferences).toHaveLength(0);
    expect(result.report.resolvedCount).toBe(2);
    expect(result.updatedQuestions[0].options[0].imageUrl).toBe('/uploads/questions/batch-1/fig_opta.png');
    expect(result.updatedQuestions[0].options[1].imageUrl).toBe('/uploads/questions/batch-1/fig_optb.png');
    expect(result.updatedQuestions[0].options[2].imageUrl).toBeUndefined();
  });

  it('flags missing option images when filename is not present in ZIP archive', () => {
    const questions: AdminQuestionInput[] = [
      {
        sectionCode: 'QUANT',
        topicName: 'Geometry',
        text: 'Identify the obtuse triangle:',
        difficulty: 'EASY',
        explanation: 'Option B has angle > 90.',
        marks: 1.0,
        negativeMarks: 0.25,
        options: [
          { text: '', imageUrl: 'missing_triangle_A.png', isCorrect: false },
          { text: '', imageUrl: 'missing_triangle_B.png', isCorrect: true },
        ],
      },
    ];

    const emptyZipMap = new Map();
    const result = resolveQuestionDiagramReferences(questions, emptyZipMap);

    expect(result.report.unresolvedReferences).toHaveLength(2);
    expect(result.report.unresolvedReferences[0].referencedFilename).toBe('missing_triangle_A.png');
    expect(result.report.unresolvedReferences[0].field).toBe('optionA');
    expect(result.report.unresolvedReferences[1].referencedFilename).toBe('missing_triangle_B.png');
    expect(result.report.unresolvedReferences[1].field).toBe('optionB');
  });
});

describe('Question Repository Integration with Table & Option Images', () => {
  beforeEach(() => {
    inMemoryQuestions.clear();
  });

  it('persists and retrieves question with LaTeX table and option diagrams', async () => {
    const { QuestionRepository } = await import('@/lib/db/repositories/questionRepository');

    const input: AdminQuestionInput = {
      examId: 'exam-ibps-po',
      sectionCode: 'QUANT',
      topicName: 'Data Interpretation',
      text: 'What was the percentage increase in rice production from 2021 to 2022?',
      difficulty: 'HARD',
      explanation: 'Increase = (350 - 280) / 280 * 100 = 25%.',
      marks: 1.0,
      negativeMarks: 0.25,
      table: '\\begin{tabular}{|c|c|}\\hline Year & Rice \\\\ \\hline 2021 & 280 \\\\ 2022 & 350 \\\\ \\hline \\end{tabular}',
      groupId: 'DI-TAB-01',
      options: [
        { text: '20%', isCorrect: false },
        { text: '25%', isCorrect: true },
        { text: '30%', isCorrect: false },
        { text: '', imageUrl: '/uploads/questions/batch-1/optD_chart.png', isCorrect: false },
      ],
    };

    const created = await QuestionRepository.create(input, 'test-q-table-01');
    expect(created).toBeDefined();
    expect(created.table).toBe(input.table);
    expect(created.options).toHaveLength(4);
    expect(created.options[3].imageUrl).toBe('/uploads/questions/batch-1/optD_chart.png');

    // Retrieve via repository
    const fetched = await QuestionRepository.findById('test-q-table-01');
    expect(fetched).not.toBeNull();
    expect(fetched?.table).toContain('\\begin{tabular}');
    expect(fetched?.groupId).toBe('DI-TAB-01');
    expect(fetched?.options[3].imageUrl).toBe('/uploads/questions/batch-1/optD_chart.png');

    // Update with modified table
    const updated = await QuestionRepository.update('test-q-table-01', {
      table: '\\begin{tabular}{|c|c|}\\hline Year & Rice (Updated) \\\\ \\hline 2021 & 300 \\\\ \\hline \\end{tabular}',
    });
    expect(updated).not.toBeNull();
    expect(updated?.table).toContain('Rice (Updated)');
  });
});
