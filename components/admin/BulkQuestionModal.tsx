'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AdminQuestionInput, AdminPartitionInfo, Difficulty } from '@/types';
import {
  bulkImportQuestionsAction,
  getAdminPartitions,
  getAdminExams,
} from '@/lib/services/adminService';
import { MathRenderer } from '../ui/MathRenderer';
import { DiagramViewer } from '../ui/DiagramViewer';
import { LatexTableViewer } from '../ui/LatexTableViewer';
import { compressDataUrl } from '@/lib/utils/imageCompressor';
import { validateAndExtractZip, ValidatedZipImage } from '@/lib/storage/zipValidator';
import { resolveQuestionDiagramReferences } from '@/lib/storage/questionImageResolver';
import { classifyImageReference } from '@/lib/storage/imageClassifier';
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Loader2,
  FileArchive,
  Image as ImageIcon,
  Trash2,
  XCircle,
  RotateCcw,
  Table as TableIcon,
} from 'lucide-react';

export interface BulkQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  partitions: { id: string; label: string; category?: string; isPyq?: boolean; pyqYear?: number }[];
  currentPartitionId: string;
  exams?: { id: string; title: string; category?: string }[];
}

// Sample CSV content with Reading Comprehension (RC), Tabular DI (LaTeX), DI charts, Reasoning puzzles, option images, and LaTeX math
const SAMPLE_CSV_CONTENT = `groupId,passage,passageImageUrl,table,imageUrl,sectionCode,topicName,text,optionA,optionA_image,optionB,optionB_image,optionC,optionC_image,optionD,optionD_image,optionE,optionE_image,correctOption,marks,negativeMarks,difficulty,explanation
DI-TAB-01,"Directions (Questions 1-2): The table below outlines recruitment data across four commercial banks in 2024. Total applicants, shortlisted percentages, and gender ratio (Male:Female) among shortlisted candidates are displayed. Study the data and answer the questions.","","\\begin{tabular}{|c|c|c|c|}\\hline \\textbf{Bank} & \\textbf{Total Applicants} & \\textbf{Shortlisted (\\%)} & \\textbf{Ratio (M:F)} \\\\ \\hline PNB & 24000 & 15\\% & 3:2 \\\\ \\hline BOB & 30000 & 20\\% & 5:3 \\\\ \\hline SBI & 45000 & 12\\% & 4:1 \\\\ \\hline CANARA & 18000 & 25\\% & 2:1 \\\\ \\hline \\end{tabular}","",QUANT,Data Interpretation,"What is the total number of candidates shortlisted in Bank of Baroda (BOB)?","6000","","5500","","6200","","5800","","None of these","",A,1,0.25,EASY,"Total shortlisted in BOB = 20% of 30,000 = 6,000 candidates."
DI-TAB-01,"","","","","QUANT,Data Interpretation,"What is the count of male shortlisted candidates in Punjab National Bank (PNB)?","2160","","2240","","2080","","2400","","1980","",A,1,0.25,MEDIUM,"PNB shortlisted = 15% of 24,000 = 3,600. Male ratio = 3 / (3 + 2) = 3/5. Male candidates = 3600 * (3/5) = 2,160."
RC-SET-01,"The Reserve Bank of India (RBI) operates as the nation's central monetary authority, tasked with maintaining price stability while fostering sustainable economic growth. In response to fluctuating global inflationary pressures, the Monetary Policy Committee (MPC) meticulously regulates the policy Repo Rate and the Cash Reserve Ratio (CRR). By fine-tuning these policy tools, the central bank directly influences domestic liquidity, commercial lending trajectories, and corporate capital expenditure cycles. Financial inclusion drives and digital banking innovations further amplify the transmission of monetary policy across rural and semi-urban banking sectors.","","","",ENGLISH,Reading Comprehension,"What is the primary dual mandate of the Reserve Bank of India highlighted in the passage?","Maximizing export revenue and foreign exchange","","Maintaining price stability while supporting economic growth","","Eliminating inter-bank lending rates completely","","Providing direct subsidies to commercial institutions","","None of the above","",B,1,0.25,MEDIUM,"As explicitly stated in the first sentence, the RBI's dual mandate focuses on maintaining price stability while fostering sustainable economic growth."
RC-SET-01,"","","","","ENGLISH,Reading Comprehension,"Which policy tool mentioned directly impacts commercial bank reserves without interest compensation?","Statutory Liquidity Ratio (SLR)","","Cash Reserve Ratio (CRR)","","Marginal Standing Facility (MSF)","","Open Market Operations (OMO)","","Reverse Repo Rate","",B,1,0.25,EASY,"The passage highlights the Cash Reserve Ratio (CRR), which requires commercial banks to maintain cash balances with the central bank."
DI-SET-01,"Directions (Questions 5-6): The following Data Interpretation chart displays branch manufacturing distribution across 4 quarters (Q1 to Q4). Total production stood at 2400 units: Q1 (20%), Q2 (30%), Q3 (25%), Q4 (25%). Study the information and answer the questions.","branch_production_q1_q4.png","","",QUANT,Data Interpretation,"What is the difference between total units produced in Q2 and Q1?","240 units","","300 units","","200 units","","180 units","","150 units","",A,1,0.25,EASY,"Total production = 2400. Q2 = 30% of 2400 = 720. Q1 = 20% of 2400 = 480. Difference = 720 - 480 = 240 units."
PUZZLE-SET-01,"Directions (Questions 7-8): Eight friends (A, B, C, D, E, F, G, and H) are sitting around a circular table facing the center. A sits third to the right of B. F sits second to the right of A. Only two people sit between F and C. D sits second to the left of C.","","","seating_arrangement_diagram.png",REASONING,Circular Seating Arrangement,"Who sits directly opposite to B in the arrangement?","F","","D","","H","","G","","C","",B,1,0.25,MEDIUM,"D sits directly opposite B (4 positions away in an 8-person circular table)."
GEOM-01,"","","","geom_problem.png",QUANT,Geometry,"Which of the following figures represents an equilateral triangle where all three medians are equal in length?","Figure A","optA_equilateral.png","Figure B","optB_isosceles.png","Figure C","optC_scalene.png","Figure D","optD_right.png","None of these","",A,1,0.25,MEDIUM,"In an equilateral triangle, all three sides are equal and all three medians are equal in length."
,,"","","","QUANT,Simplification,"Solve the expression: $\\sqrt{625} + \\frac{15}{3} \\times 4 - 2^3 = ?$","37","","42","","45","","39","","40","",A,1,0.25,EASY,"$\\sqrt{625} = 25$; $\\frac{15}{3} \\times 4 = 20$; $2^3 = 8$. Therefore: $25 + 20 - 8 = 37$."
,,"","","","QUANT,Quadratic Equations,"Find the roots of the quadratic equation: $x^2 - 7x + 12 = 0$","$x = 2, 6$","","$x = 3, 4$","","$x = -3, -4$","","$x = 1, 12$","","None of these","",B,1,0.25,MEDIUM,"Factorizing: $(x - 3)(x - 4) = 0 \\implies x = 3$ or $x = 4$."
,,"","","","FINANCIAL_AWARENESS,Banking Regulations,"Under the Basel III regulatory framework, what is the minimum Common Equity Tier 1 (CET1) capital ratio required to be maintained by banks?","4.5%","","5.5%","","6.0%","","8.0%","","9.0%","",B,1,0.25,MEDIUM,"Under Basel III norms, the minimum Tier 1 Common Equity ratio (CET1) is 5.5% (plus a capital conservation buffer of 2.5% in India)."
`;

export const BulkQuestionModal: React.FC<BulkQuestionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  partitions,
  currentPartitionId,
  exams = [],
}) => {
  const [modalPartitions, setModalPartitions] = useState<AdminPartitionInfo[]>(partitions as any);
  const [modalExams, setModalExams] = useState(exams);

  // Merge modalExams and all exam partitions from modalPartitions to ensure 100% presence of all exams
  const combinedExams = useMemo(() => {
    const list: { id: string; title: string; category?: string; slug?: string }[] = [...modalExams];
    for (const p of modalPartitions) {
      if (p.category === 'EXAM' || p.id.startsWith('exam-')) {
        const cleanSlug = p.id.replace(/^exam-/, '');
        const alreadyExists = list.some(
          (ex) =>
            ex.id === p.id ||
            ex.slug === cleanSlug ||
            ex.title.toLowerCase().trim() === p.label.toLowerCase().trim()
        );
        if (!alreadyExists) {
          list.push({
            id: p.id,
            slug: cleanSlug,
            title: p.label,
            category: 'PO',
          });
        }
      }
    }
    return list;
  }, [modalExams, modalPartitions]);

  const [selectedExamId, setSelectedExamId] = useState<string>(
    exams[0]?.id || 'exam-ibps-po'
  );
  const [selectedPartition, setSelectedPartition] = useState<string>(
    currentPartitionId !== 'ALL' ? currentPartitionId : partitions[1]?.id || 'ALL'
  );

  // Raw parsed questions before ZIP diagram substitution
  const [rawQuestions, setRawQuestions] = useState<AdminQuestionInput[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // ZIP Diagrams state
  const [zipFileName, setZipFileName] = useState<string>('');
  const [extractedImages, setExtractedImages] = useState<ValidatedZipImage[]>([]);
  const [zipImageMap, setZipImageMap] = useState<Map<string, ValidatedZipImage>>(new Map());
  const [zipBlobUrls, setZipBlobUrls] = useState<string[]>([]);
  const [zipPreviewUrlMap, setZipPreviewUrlMap] = useState<Map<string, string>>(new Map());
  const [zipErrors, setZipErrors] = useState<string[]>([]);
  const [zipWarnings, setZipWarnings] = useState<string[]>([]);
  const [isExtractingZip, setIsExtractingZip] = useState<boolean>(false);

  // Phase 3: Bounded & Resilient Import Lifecycle State
  const [duplicatePolicy, setDuplicatePolicy] = useState<'SKIP' | 'UPDATE' | 'REVIEW'>('SKIP');
  const [allowDestructiveUpdates, setAllowDestructiveUpdates] = useState<boolean>(false);
  const [importProgressText, setImportProgressText] = useState<string>('');
  const [finalReport, setFinalReport] = useState<any | null>(null);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      zipBlobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [zipBlobUrls]);

  const handleCloseModal = () => {
    zipBlobUrls.forEach((url) => URL.revokeObjectURL(url));
    setZipBlobUrls([]);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      // Refresh partitions and exams
      Promise.all([getAdminPartitions(), getAdminExams()])
        .then(([freshParts, freshExams]) => {
          if (freshParts && freshParts.length > 0) {
            setModalPartitions(freshParts);
          }
          if (freshExams && freshExams.length > 0) {
            setModalExams(freshExams);
          }

          const targetPartId = currentPartitionId && currentPartitionId !== 'ALL'
            ? currentPartitionId
            : undefined;

          if (targetPartId) {
            setSelectedPartition(targetPartId);
            const foundPart = (freshParts || []).find((p) => p.id === targetPartId);
            if (foundPart) {
              if (foundPart.category === 'EXAM' || foundPart.id.startsWith('exam-')) {
                const match = (freshExams || []).find(
                  (e) =>
                    e.id === foundPart.id ||
                    e.slug === foundPart.id.replace(/^exam-/, '') ||
                    e.title.toLowerCase().trim() === foundPart.label.toLowerCase().trim()
                );
                setSelectedExamId(match ? match.id : foundPart.id);
              } else if (foundPart.examId && foundPart.examId !== 'ALL') {
                const match = (freshExams || []).find(
                  (e) =>
                    e.id === foundPart.examId ||
                    e.slug === foundPart.examId.replace(/^exam-/, '')
                );
                setSelectedExamId(match ? match.id : foundPart.examId);
              }
            } else if (targetPartId.startsWith('exam-')) {
              setSelectedExamId(targetPartId);
            }
          }
        })
        .catch((err) => console.warn('Could not refresh partitions/exams on modal open:', err));

      if (currentPartitionId && currentPartitionId !== 'ALL') {
        setSelectedPartition(currentPartitionId);
        if (currentPartitionId.startsWith('exam-')) {
          setSelectedExamId(currentPartitionId);
        } else {
          const matchingExam = exams.find((e) => e.id === currentPartitionId);
          if (matchingExam) setSelectedExamId(matchingExam.id);
        }
      } else if (exams && exams.length > 0) {
        setSelectedExamId(exams[0].id);
      }
    }
  }, [isOpen, currentPartitionId, exams, partitions]);

  const handlePartitionChange = (partId: string) => {
    setSelectedPartition(partId);
    const found = modalPartitions.find((p) => p.id === partId);
    if (found) {
      if (found.category === 'EXAM' || found.id.startsWith('exam-')) {
        const matchingEx = combinedExams.find(
          (ex) =>
            ex.id === found.id ||
            ex.slug === found.id.replace(/^exam-/, '') ||
            ex.title.toLowerCase().trim() === found.label.toLowerCase().trim()
        );
        setSelectedExamId(matchingEx ? matchingEx.id : found.id);
      } else if (found.examId && found.examId !== 'ALL') {
        const matchingEx = combinedExams.find(
          (ex) =>
            ex.id === found.examId ||
            ex.slug === found.examId.replace(/^exam-/, '') ||
            ex.title.toLowerCase().trim() === (found.label || '').toLowerCase().trim()
        );
        setSelectedExamId(matchingEx ? matchingEx.id : found.examId);
      }
    }
  };

  const handleExamChange = (newExamId: string) => {
    setSelectedExamId(newExamId);
    const exObj = combinedExams.find((ex) => ex.id === newExamId);
    const matchingExamPart = modalPartitions.find(
      (p) =>
        p.id === newExamId ||
        (exObj &&
          (p.id === `exam-${exObj.slug}` ||
            p.id === exObj.slug ||
            p.label.toLowerCase().trim() === exObj.title.toLowerCase().trim()))
    );
    if (matchingExamPart) {
      setSelectedPartition(matchingExamPart.id);
    }
  };

  // 1. Download Sample CSV File (with UTF-8 BOM for Excel compatibility)
  const handleDownloadSampleCsv = () => {
    const blob = new Blob(['\uFEFF' + SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_banking_questions_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Download Sample JSON File
  const handleDownloadSampleJson = async () => {
    try {
      const res = await fetch('/sample_banking_questions_template.json');
      if (res.ok) {
        const jsonBlob = await res.blob();
        const url = URL.createObjectURL(jsonBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'sample_banking_questions_template.json');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // Fallback below
    }

    const link = document.createElement('a');
    link.href = '/sample_banking_questions_template.json';
    link.setAttribute('download', 'sample_banking_questions_template.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. RFC 4180 compliant CSV parser respecting quoted newlines and escaped quotes
  const parseFullCsv = (csvText: string, delimiter: string = ','): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentVal = '';
    let inQuotes = false;

    // Strip leading UTF-8 BOM if present
    const cleanText = csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText;

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      if (char === '"') {
        if (inQuotes && cleanText[i + 1] === '"') {
          currentVal += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && cleanText[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentVal.trim());
        currentVal = '';
        if (currentRow.some((val) => val.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentVal += char;
      }
    }

    if (currentVal.length > 0 || currentRow.length > 0) {
      currentRow.push(currentVal.trim());
      if (currentRow.some((val) => val.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  };

  const normalizeCsvText = (rawText: string): string => {
    const cleanText = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
    const lines = cleanText.split(/\r?\n/);
    const nonEmpty = lines.filter((l) => l.trim().length > 0);

    if (nonEmpty.length > 0) {
      const firstLine = nonEmpty[0].trim();
      const isOuterQuoted =
        (firstLine.startsWith('"') && firstLine.endsWith('"') && (firstLine.includes(',') || firstLine.includes(';'))) ||
        nonEmpty.slice(0, 5).every((l) => l.trim().startsWith('"') && l.trim().endsWith('"') && l.includes(','));

      if (isOuterQuoted) {
        return lines
          .map((line) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
              return trimmed.slice(1, -1).replace(/""/g, '"');
            }
            return line;
          })
          .join('\n');
      }
    }
    return cleanText;
  };

  const parseCsvWithFallbacks = (rawText: string): string[][] => {
    const text = normalizeCsvText(rawText);
    const rows = parseFullCsv(text, ',');

    if (rows.length > 0 && rows[0].length === 1 && rows[0][0].includes(';')) {
      const semiRows = parseFullCsv(text, ';');
      if (semiRows.length > 0 && semiRows[0].length > 1) {
        return semiRows;
      }
    }

    if (rows.length > 0 && rows[0].length === 1 && rows[0][0].includes(',')) {
      const lines = rawText.split(/\r?\n/);
      const strippedText = lines
        .map((l) => {
          let s = l.trim();
          if (s.startsWith('"') && s.endsWith('"')) {
            s = s.slice(1, -1).replace(/""/g, '"');
          }
          return s;
        })
        .join('\n');
      const retryRows = parseFullCsv(strippedText, ',');
      if (retryRows.length > 0 && retryRows[0].length > 1) {
        return retryRows;
      }
    }

    return rows;
  };

  const getFieldValue = (
    headers: string[],
    row: string[],
    aliases: string[]
  ): string => {
    const cleanAliases = aliases.map((a) => a.toLowerCase().replace(/[^a-z0-9]/g, ''));
    // 1. Exact match
    for (let i = 0; i < headers.length; i++) {
      const cleanH = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanAliases.includes(cleanH)) {
        return (row[i] || '').trim();
      }
    }
    // 2. Substring match
    for (let i = 0; i < headers.length; i++) {
      const cleanH = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanAliases.some((alias) => cleanH.includes(alias) || alias.includes(cleanH))) {
        return (row[i] || '').trim();
      }
    }
    return '';
  };

  const hasHeaderMatch = (headers: string[], aliases: string[]): boolean => {
    const cleanAliases = aliases.map((a) => a.toLowerCase().replace(/[^a-z0-9]/g, ''));
    return headers.some((h) => {
      const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanAliases.some((alias) => cleanH === alias || cleanH.includes(alias));
    });
  };

  // 4. File upload handler (CSV or JSON)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseErrors([]);
    setRawQuestions([]);
    setIsParsing(true);

    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (Array.isArray(json)) {
            const processedList: AdminQuestionInput[] = [];
            for (const item of json) {
              let pImg = item.passageImageUrl;
              let qImg = item.imageUrl;
              if (pImg && pImg.startsWith('data:image')) {
                const comp = await compressDataUrl(pImg);
                pImg = comp.compressedDataUrl;
              }
              if (qImg && qImg.startsWith('data:image')) {
                const comp = await compressDataUrl(qImg);
                qImg = comp.compressedDataUrl;
              }

              // Support nested options array or flat optionA..optionE
              let options = item.options;
              if (Array.isArray(options)) {
                options = options.map((o: any) => ({
                  text: o.text || '',
                  isCorrect: Boolean(o.isCorrect),
                  imageUrl: o.imageUrl || o.image || undefined,
                }));
              } else if (!options && (item.optionA || item.optionA_image || item.optionAImageUrl)) {
                const rawCorrect = (item.correctOption || 'A').trim().toUpperCase();
                options = [
                  { text: item.optionA || '', isCorrect: rawCorrect === 'A', imageUrl: item.optionA_image || item.optionAImageUrl || undefined },
                  { text: item.optionB || '', isCorrect: rawCorrect === 'B', imageUrl: item.optionB_image || item.optionBImageUrl || undefined },
                  ...(item.optionC || item.optionC_image || item.optionCImageUrl ? [{ text: item.optionC || '', isCorrect: rawCorrect === 'C', imageUrl: item.optionC_image || item.optionCImageUrl || undefined }] : []),
                  ...(item.optionD || item.optionD_image || item.optionDImageUrl ? [{ text: item.optionD || '', isCorrect: rawCorrect === 'D', imageUrl: item.optionD_image || item.optionDImageUrl || undefined }] : []),
                  ...(item.optionE || item.optionE_image || item.optionEImageUrl ? [{ text: item.optionE || '', isCorrect: rawCorrect === 'E', imageUrl: item.optionE_image || item.optionEImageUrl || undefined }] : []),
                ];
              }

              const itemExam = item.examId || item.exam;
              let rowExamId = selectedExamId;
              if (itemExam) {
                rowExamId = String(itemExam).startsWith('exam-') ? String(itemExam) : `exam-${String(itemExam).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
              }

              processedList.push({
                ...item,
                examId: item.examId || rowExamId,
                options,
                passageImageUrl: pImg,
                imageUrl: qImg,
                table: item.table || item.tabular || item.passageTable || undefined,
              });
            }
            setRawQuestions(processedList);
          } else {
            setParseErrors(['JSON file must contain an array of question objects.']);
          }
        } catch {
          setParseErrors(['Failed to parse JSON file. Please check syntax.']);
        } finally {
          setIsParsing(false);
        }
      };
      reader.onerror = () => {
        setParseErrors(['Failed to read file from disk.']);
        setIsParsing(false);
      };
      reader.readAsText(file);
    } else {
      // CSV Parsing
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string;
          if (!text) {
            setParseErrors(['Selected CSV file is empty.']);
            return;
          }

          const rows = parseCsvWithFallbacks(text);
          if (rows.length < 2) {
            setParseErrors(['CSV file must have at least a header row and one question row.']);
            return;
          }

          const headers = rows[0];
          const questions: AdminQuestionInput[] = [];
          const errors: string[] = [];

          // Validate essential columns
          const missingColumns: string[] = [];
          if (!hasHeaderMatch(headers, ['text', 'question', 'questiontext', 'qtext', 'problem', 'statement', 'q'])) {
            missingColumns.push('Question Text ("text" or "question")');
          }
          if (!hasHeaderMatch(headers, ['optiona', 'option1', 'opta', 'opt1', 'choicea', 'choice1', 'a'])) {
            missingColumns.push('Option A ("optionA" or "option1")');
          }
          if (!hasHeaderMatch(headers, ['optionb', 'option2', 'optb', 'opt2', 'choiceb', 'choice2', 'b'])) {
            missingColumns.push('Option B ("optionB" or "option2")');
          }
          if (!hasHeaderMatch(headers, ['correctoption', 'correct', 'answer', 'ans', 'key', 'correctanswer', 'anskey'])) {
            missingColumns.push('Correct Option ("correctOption" or "answer")');
          }

          if (missingColumns.length > 0) {
            setParseErrors([
              `Missing required CSV column headers: ${missingColumns.join(', ')}. Please check your file's header row.`,
            ]);
            return;
          }

          for (let idx = 1; idx < rows.length; idx++) {
            const rowValues = rows[idx];
            if (!rowValues || rowValues.length === 0 || rowValues.every((val) => !val.trim())) {
              continue;
            }

            const qText = getFieldValue(headers, rowValues, [
              'text',
              'question',
              'questiontext',
              'qtext',
              'problem',
              'statement',
              'q',
            ]);
            if (!qText) {
              errors.push(`Row ${idx + 1}: Question text cannot be empty.`);
              continue;
            }

            const optA = getFieldValue(headers, rowValues, [
              'optiona',
              'option1',
              'opta',
              'opt1',
              'choicea',
              'choice1',
              'a',
            ]);
            const optB = getFieldValue(headers, rowValues, [
              'optionb',
              'option2',
              'optb',
              'opt2',
              'choiceb',
              'choice2',
              'b',
            ]);
            const optC = getFieldValue(headers, rowValues, [
              'optionc',
              'option3',
              'optc',
              'opt3',
              'choicec',
              'choice3',
              'c',
            ]);
            const optD = getFieldValue(headers, rowValues, [
              'optiond',
              'option4',
              'optd',
              'opt4',
              'choiced',
              'choice4',
              'd',
            ]);
            const optE = getFieldValue(headers, rowValues, [
              'optione',
              'option5',
              'opte',
              'opt5',
              'choicee',
              'choice5',
              'e',
            ]);

            // Option Images support in CSV
            const optAImg = getFieldValue(headers, rowValues, ['optiona_image', 'optiona_img', 'optionaimage', 'opta_image', 'optaimg', 'optaimage', 'opt1_image', 'choicea_image']);
            const optBImg = getFieldValue(headers, rowValues, ['optionb_image', 'optionb_img', 'optionbimage', 'optb_image', 'optbimg', 'optbimage', 'opt2_image', 'choiceb_image']);
            const optCImg = getFieldValue(headers, rowValues, ['optionc_image', 'optionc_img', 'optioncimage', 'optc_image', 'optcimg', 'optcimage', 'opt3_image', 'choicec_image']);
            const optDImg = getFieldValue(headers, rowValues, ['optiond_image', 'optiond_img', 'optiondimage', 'optd_image', 'optdimg', 'optdimage', 'opt4_image', 'choiced_image']);
            const optEImg = getFieldValue(headers, rowValues, ['optione_image', 'optione_img', 'optioneimage', 'opte_image', 'opteimg', 'opteimage', 'opt5_image', 'choicee_image']);

            if ((!optA && !optAImg) || (!optB && !optBImg)) {
              errors.push(`Row ${idx + 1}: At least Option A and Option B (text or diagram) are required.`);
              continue;
            }

            const rawCorrect = getFieldValue(headers, rowValues, [
              'correctoption',
              'correct',
              'answer',
              'ans',
              'key',
              'correctanswer',
              'anskey',
            ]).trim();

            let correctLetter = 'A';
            const cleanCorrect = rawCorrect.toUpperCase().replace(/[^A-E0-9]/g, '');

            if (['A', 'B', 'C', 'D', 'E'].includes(cleanCorrect)) {
              correctLetter = cleanCorrect;
            } else if (cleanCorrect === '1') {
              correctLetter = 'A';
            } else if (cleanCorrect === '2') {
              correctLetter = 'B';
            } else if (cleanCorrect === '3') {
              correctLetter = 'C';
            } else if (cleanCorrect === '4') {
              correctLetter = 'D';
            } else if (cleanCorrect === '5') {
              correctLetter = 'E';
            } else {
              const lowerRaw = rawCorrect.toLowerCase();
              if (optA && lowerRaw === optA.toLowerCase()) correctLetter = 'A';
              else if (optB && lowerRaw === optB.toLowerCase()) correctLetter = 'B';
              else if (optC && lowerRaw === optC.toLowerCase()) correctLetter = 'C';
              else if (optD && lowerRaw === optD.toLowerCase()) correctLetter = 'D';
              else if (optE && lowerRaw === optE.toLowerCase()) correctLetter = 'E';
              else {
                correctLetter = 'A';
              }
            }

            const optionsList = [
              { text: optA || (optAImg ? 'Option A' : ''), isCorrect: correctLetter === 'A', imageUrl: optAImg || undefined },
              { text: optB || (optBImg ? 'Option B' : ''), isCorrect: correctLetter === 'B', imageUrl: optBImg || undefined },
              ...(optC || optCImg ? [{ text: optC || (optCImg ? 'Option C' : ''), isCorrect: correctLetter === 'C', imageUrl: optCImg || undefined }] : []),
              ...(optD || optDImg ? [{ text: optD || (optDImg ? 'Option D' : ''), isCorrect: correctLetter === 'D', imageUrl: optDImg || undefined }] : []),
              ...(optE || optEImg ? [{ text: optE || (optEImg ? 'Option E' : ''), isCorrect: correctLetter === 'E', imageUrl: optEImg || undefined }] : []),
            ];

            // Resolve Section Code
            const sectionCodeRaw = getFieldValue(headers, rowValues, [
              'sectioncode',
              'section',
              'subject',
              'sec',
            ]).toUpperCase();
            const sectionCode =
              sectionCodeRaw.includes('QUANT') || sectionCodeRaw.includes('MATH') || sectionCodeRaw.includes('NUM')
                ? 'QUANT'
                : sectionCodeRaw.includes('ENG') || sectionCodeRaw.includes('VERBAL')
                ? 'ENGLISH'
                : sectionCodeRaw.includes('GA') || sectionCodeRaw.includes('GEN') || sectionCodeRaw.includes('AWARE') || sectionCodeRaw.includes('FIN')
                ? 'GA'
                : 'REASONING';

            // Resolve Topic Name
            const topicName =
              getFieldValue(headers, rowValues, [
                'topicname',
                'topic',
                'subtopic',
                'category',
                'chapter',
              ]) || 'General';

            const difficultyRaw = getFieldValue(headers, rowValues, [
              'difficulty',
              'diff',
              'level',
            ]).toUpperCase();
            const difficulty: Difficulty =
              difficultyRaw === 'EASY' || difficultyRaw === 'HARD' ? difficultyRaw : 'MEDIUM';

            const marksStr = getFieldValue(headers, rowValues, ['marks', 'mark', 'positivescore', 'score']);
            const marks = parseFloat(marksStr || '1.0') || 1.0;

            const negMarksStr = getFieldValue(headers, rowValues, ['negativemarks', 'negmarks', 'penalty']);
            const negativeMarks = parseFloat(negMarksStr || '0.25') || 0.25;

            const explanation = getFieldValue(headers, rowValues, [
              'explanation',
              'solution',
              'sol',
              'exp',
            ]);

            const groupId =
              getFieldValue(headers, rowValues, ['groupid', 'group', 'setid', 'set', 'passageid']) || undefined;
            const passage =
              getFieldValue(headers, rowValues, ['passage', 'directions', 'context', 'comprehension']) || undefined;

            let passageImageUrl =
              getFieldValue(headers, rowValues, [
                'passageimageurl',
                'passageimage',
                'passageimg',
                'chartimageurl',
                'chartimage',
                'chartimg',
                'diimage',
                'diimg',
              ]) || undefined;

            let imageUrl =
              getFieldValue(headers, rowValues, ['imageurl', 'image', 'img', 'diagram', 'photo']) || undefined;

            if (passageImageUrl && passageImageUrl.startsWith('data:image')) {
              const comp = await compressDataUrl(passageImageUrl);
              passageImageUrl = comp.compressedDataUrl;
            }
            if (imageUrl && imageUrl.startsWith('data:image')) {
              const comp = await compressDataUrl(imageUrl);
              imageUrl = comp.compressedDataUrl;
            }

            const rowExam = getFieldValue(headers, rowValues, ['examid', 'exam', 'targetexam', 'mocktestid', 'paper']);
            let targetExamId = selectedExamId;
            if (rowExam) {
              targetExamId = rowExam.startsWith('exam-')
                ? rowExam
                : `exam-${rowExam.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            }

            const table =
              getFieldValue(headers, rowValues, [
                'table',
                'passagetable',
                'tabular',
                'datatable',
                'tabledata',
                'ditable',
                'di_table',
              ]) || undefined;

            questions.push({
              examId: targetExamId,
              sectionCode,
              topicName,
              text: qText,
              imageUrl,
              passage,
              passageImageUrl,
              table,
              groupId,
              difficulty,
              marks,
              negativeMarks,
              explanation,
              options: optionsList,
            });
          }

          if (questions.length === 0 && errors.length === 0) {
            errors.push(`No valid question rows could be read from ${file.name}. Please ensure questions have text and options.`);
          }

          setRawQuestions(questions);
          setParseErrors(errors);
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          setParseErrors([`Failed to parse CSV file: ${errorMsg}`]);
        } finally {
          setIsParsing(false);
        }
      };
      reader.onerror = () => {
        setParseErrors(['Failed to read file from disk.']);
        setIsParsing(false);
      };
      reader.readAsText(file);
    }
  };

  // 5. ZIP Diagrams Upload Handler
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setZipFileName(file.name);
    setZipErrors([]);
    setZipWarnings([]);
    setIsExtractingZip(true);

    // Revoke previous blob URLs
    zipBlobUrls.forEach((u) => URL.revokeObjectURL(u));
    setZipBlobUrls([]);
    setZipPreviewUrlMap(new Map());

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await validateAndExtractZip(new Uint8Array(arrayBuffer));

      if (!result.isValid) {
        setZipErrors(result.errors);
        setZipWarnings(result.warnings);
        setExtractedImages([]);
        setZipImageMap(new Map());
        return;
      }

      // Generate in-browser preview object URLs
      const newBlobs: string[] = [];
      const urlMap = new Map<string, string>();
      for (const img of result.images) {
        const blob = new Blob([img.buffer as any], { type: img.mimeType });
        const objUrl = URL.createObjectURL(blob);
        newBlobs.push(objUrl);
        urlMap.set(img.baseName.toLowerCase(), objUrl);
        urlMap.set(img.normalizedPath.toLowerCase(), objUrl);
      }

      setZipBlobUrls(newBlobs);
      setZipPreviewUrlMap(urlMap);
      setExtractedImages(result.images);
      setZipImageMap(result.imageMap);
      setZipWarnings(result.warnings);
    } catch (err: unknown) {
      setZipErrors([err instanceof Error ? err.message : 'Failed to inspect and extract ZIP archive.']);
    } finally {
      setIsExtractingZip(false);
    }
  };

  const handleClearZip = () => {
    zipBlobUrls.forEach((u) => URL.revokeObjectURL(u));
    setZipBlobUrls([]);
    setZipPreviewUrlMap(new Map());
    setExtractedImages([]);
    setZipImageMap(new Map());
    setZipFileName('');
    setZipErrors([]);
    setZipWarnings([]);
  };

  // 6. Reactive Resolution of Diagram References (for Preview & Error Highlighting)
  const { previewQuestions, resolutionReport } = useMemo(() => {
    if (rawQuestions.length === 0) {
      return { previewQuestions: [], resolutionReport: null };
    }

    const { updatedQuestions, report } = resolveQuestionDiagramReferences(
      rawQuestions,
      zipImageMap,
      zipPreviewUrlMap
    );

    return { previewQuestions: updatedQuestions, resolutionReport: report };
  }, [rawQuestions, zipImageMap, zipPreviewUrlMap]);

  const hasMissingReferences = Boolean(
    resolutionReport && resolutionReport.unresolvedReferences.length > 0
  );

  // 7. Submit Questions & Attach Diagrams via Bounded Incremental Uploads
  const handleImportSubmit = async () => {
    if (rawQuestions.length === 0) return;
    if (hasMissingReferences) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setParseErrors([]);

    try {
      const deterministicBatchId = `import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      setLastBatchId(deterministicBatchId);

      // 1. Separate bounded image upload (Avoids sending huge base64 in one Server Action)
      if (extractedImages.length > 0) {
        setImportProgressText(`Uploading ${extractedImages.length} diagrams in bounded batches...`);
        const chunkSize = 10;
        for (let i = 0; i < extractedImages.length; i += chunkSize) {
          const chunk = extractedImages.slice(i, i + chunkSize);
          const formData = new FormData();
          formData.append('batchId', deterministicBatchId);
          for (const img of chunk) {
            const blob = new Blob([img.buffer as any], { type: img.mimeType });
            formData.append('files', blob, img.baseName);
          }
          const uploadRes = await fetch('/api/admin/questions/import/images', {
            method: 'POST',
            body: formData,
          });
          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}));
            throw new Error(errData.error || `Failed to upload image chunk ${Math.floor(i / chunkSize) + 1}`);
          }
        }
      }

      // 2. Submit questions to bounded, resilient import pipeline
      setImportProgressText(`Importing ${rawQuestions.length} questions in bounded database chunks...`);
      const questionsToSubmit = rawQuestions.map((q) => ({
        ...q,
        examId: q.examId || selectedExamId,
      }));

      const res = await bulkImportQuestionsAction(
        questionsToSubmit,
        selectedPartition,
        undefined, // diagrams already uploaded separately to batchId
        deterministicBatchId,
        {
          duplicatePolicy,
          allowDestructiveUpdates,
        }
      );

      setImportProgressText('');
      if (res.report) {
        setFinalReport(res.report);
      }

      if (res.success && (!res.report || res.report.errors.length === 0)) {
        zipBlobUrls.forEach((u) => URL.revokeObjectURL(u));
        setZipBlobUrls([]);
        onSuccess(res.count);
        onClose();
      } else {
        if (res.error) {
          let errText = res.error;
          if (
            errText.includes('441') ||
            errText.includes('Minified React error') ||
            errText.includes('Server Components render')
          ) {
            errText = 'A server error occurred during import. Please verify your admin session is active and check the database connection.';
          }
          setParseErrors([errText]);
        }
      }
    } catch (submitErr: any) {
      setImportProgressText('');
      console.error('Import submit error:', submitErr);
      let errorMsg = submitErr instanceof Error ? submitErr.message : 'Unexpected error during import.';
      if (
        errorMsg.includes('441') ||
        errorMsg.includes('Minified React error') ||
        submitErr?.digest ||
        errorMsg.includes('Server Components render')
      ) {
        errorMsg = 'A server error occurred during import. Please verify your admin session is active and check the database connection.';
      }
      setParseErrors([errorMsg]);
    } finally {
      setIsSubmitting(false);
      setImportProgressText('');
    }
  };

  const handleRetryBatch = async () => {
    if (!lastBatchId) return;
    setIsRetrying(true);
    try {
      const { retryImportBatchAction } = await import('@/lib/services/adminService');
      const res = await retryImportBatchAction(lastBatchId, {
        duplicatePolicy,
        allowDestructiveUpdates,
      });
      if (res.report) {
        setFinalReport(res.report);
      }
      if (res.success && res.report.errors.length === 0) {
        onSuccess(res.report.questionsCreated);
        onClose();
      } else if (res.error) {
        let errText = res.error;
        if (
          errText.includes('441') ||
          errText.includes('Minified React error') ||
          errText.includes('Server Components render')
        ) {
          errText = 'A server error occurred during retry. Please verify your admin session is active.';
        }
        setParseErrors([errText]);
      }
    } catch (retryErr: any) {
      console.error('Retry batch error:', retryErr);
      let errorMsg = retryErr instanceof Error ? retryErr.message : 'Retry failed.';
      if (
        errorMsg.includes('441') ||
        errorMsg.includes('Minified React error') ||
        retryErr?.digest ||
        errorMsg.includes('Server Components render')
      ) {
        errorMsg = 'A server error occurred during retry. Please verify your admin session is active and check the database connection.';
      }
      setParseErrors([errorMsg]);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCloseModal} title="Bulk Question Importer (CSV / JSON + Diagrams ZIP)">
      <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        {/* Step 1: Sample CSV Download Box */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Configured CSV & JSON Template</h4>
                <p className="text-[11px] text-slate-600">
                  Pre-configured with RC passages, DI charts, Reasoning diagrams, LaTeX math, and optional ZIP filename diagram references.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadSampleCsv}
                className="bg-white hover:bg-blue-50 text-blue-700 border-blue-300 font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Download comprehensive sample CSV template with RC passages, DI charts, and LaTeX formulas"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadSampleJson}
                className="bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-300 font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Download comprehensive sample JSON template"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample JSON
              </Button>
            </div>
          </div>

          {/* Template Feature Pills */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-100/70 text-blue-800 text-[10px] font-semibold">
              <BookOpen className="w-3 h-3 text-blue-600" /> 4Q Reading Comprehension Set (RC-SET-01)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100/70 text-amber-800 text-[10px] font-semibold">
              📊 4Q Data Interpretation Set (DI-SET-01 + Chart Diagram)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-100/70 text-purple-800 text-[10px] font-semibold">
              🧩 4Q Seating Arrangement Puzzle (PUZZLE-SET-01)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-100/70 text-teal-800 text-[10px] font-semibold">
              🖼️ Diagrams ZIP Support (PNG, JPG, WebP, GIF)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100/70 text-emerald-800 text-[10px] font-semibold">
              📐 LaTeX Equations ($...$)
            </span>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Diagram & Image References:</strong> You can reference image files in <code>imageUrl</code>, <code>passageImageUrl</code>, or <code>optionA_image</code>..<code>optionE_image</code> (e.g. <code>branch_chart.png</code>). Upload the images in a companion <strong>.zip</strong> archive. Existing full URLs (<code>https://...</code>) and data URIs (<code>data:image/...</code>) continue to work seamlessly!
            </span>
          </div>

          <div className="text-[10px] text-slate-600 font-mono bg-white/90 p-2.5 rounded-xl border border-blue-100 overflow-x-auto whitespace-nowrap">
            Columns: groupId, passage, passageImageUrl, imageUrl, sectionCode, topicName, text, optionA, optionA_image, optionB, optionB_image, optionC, optionC_image, optionD, optionD_image, optionE, optionE_image, correctOption, marks, negativeMarks, difficulty, explanation
          </div>
        </div>

        {/* Step 2: Target Exam & Partition Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {combinedExams && combinedExams.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Target Banking Exam:
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => handleExamChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                {combinedExams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
                {selectedExamId && !combinedExams.some((ex) => ex.id === selectedExamId) && (
                  <option value={selectedExamId}>
                    {modalPartitions.find((p) => p.id === selectedExamId)?.label || selectedExamId}
                  </option>
                )}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Import Into Exam Partition / Paper:
            </label>
            <select
              value={selectedPartition}
              onChange={(e) => handlePartitionChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="ALL">🌐 All Questions (Master Question Bank)</option>

              {modalPartitions.filter(p => p.category === 'EXAM' || p.id.startsWith('exam-')).length > 0 && (
                <optgroup label="🏛️ Target Banking Exams">
                  {modalPartitions
                    .filter(p => p.category === 'EXAM' || p.id.startsWith('exam-'))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                </optgroup>
              )}

              {modalPartitions.filter(p => p.category === 'PYQ' || p.isPyq).length > 0 && (
                <optgroup label="★ Official Previous Year Papers (PYQ)">
                  {modalPartitions
                    .filter(p => p.category === 'PYQ' || p.isPyq)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} {p.pyqYear ? `(${p.pyqYear})` : ''}
                      </option>
                    ))}
                </optgroup>
              )}

              {modalPartitions.filter(p => p.id !== 'ALL' && !p.isPyq && p.category !== 'EXAM' && !p.id.startsWith('exam-')).length > 0 && (
                <optgroup label="🎯 Full Practice Mock Tests">
                  {modalPartitions
                    .filter(p => p.id !== 'ALL' && !p.isPyq && p.category !== 'EXAM' && !p.id.startsWith('exam-'))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                </optgroup>
              )}

              {selectedPartition && selectedPartition !== 'ALL' && !modalPartitions.some((p) => p.id === selectedPartition) && (
                <option value={selectedPartition}>
                  {combinedExams.find((ex) => ex.id === selectedPartition)?.title || selectedPartition}
                </option>
              )}
            </select>
          </div>
        </div>

        {/* Step 3: File Upload Dropzones (Questions File + Diagrams ZIP) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Box 1: CSV / JSON Questions Dropzone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>1. Questions File (.csv or .json):</span>
              <span className="text-[10px] text-blue-600 font-bold uppercase">Required</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4.5 text-center transition-colors bg-slate-50/50 hover:bg-blue-50/20 relative cursor-pointer min-h-[120px] flex flex-col items-center justify-center">
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  {isParsing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </div>
                <div className="text-xs text-slate-700 font-medium">
                  {isParsing ? (
                    <span className="font-bold text-blue-700 animate-pulse">Reading & analyzing {fileName}...</span>
                  ) : fileName ? (
                    <span className="font-bold text-blue-700">{fileName}</span>
                  ) : (
                    <>
                      <span className="font-bold text-blue-600">Choose CSV / JSON</span> or drag & drop
                    </>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">Questions, passages, and option structure</span>
              </div>
            </div>
          </div>

          {/* Box 2: Diagrams ZIP Archive Dropzone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>2. Diagrams Archive (.zip):</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Optional</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-teal-400 rounded-2xl p-4.5 text-center transition-colors bg-slate-50/50 hover:bg-teal-50/20 relative min-h-[120px] flex flex-col items-center justify-center">
              {zipFileName ? (
                <div className="flex flex-col items-center justify-center space-y-1.5 z-10">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
                    <FileArchive className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <span>{zipFileName}</span>
                    <Badge variant="green" size="sm">
                      {extractedImages.length} images
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearZip}
                    className="text-[10px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 hover:underline cursor-pointer pt-0.5"
                  >
                    <Trash2 className="w-3 h-3" /> Remove Archive
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleZipUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                      {isExtractingZip ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileArchive className="w-4 h-4" />
                      )}
                    </div>
                    <div className="text-xs text-slate-700 font-medium">
                      {isExtractingZip ? (
                        <span className="font-bold text-teal-700 animate-pulse">Inspecting diagrams in ZIP...</span>
                      ) : (
                        <>
                          <span className="font-bold text-teal-600">Choose .ZIP Archive</span> or drag & drop
                        </>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">PNG, JPG, WebP, GIF files referenced in CSV</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Fallback Warning if 0 questions parsed */}
        {fileName && !isParsing && rawQuestions.length === 0 && parseErrors.length === 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>No questions were extracted from {fileName}. Please ensure the file has a valid header and question rows.</span>
          </div>
        )}

        {/* ZIP Validation Errors */}
        {zipErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1 max-h-32 overflow-y-auto">
            <div className="font-bold flex items-center gap-1.5 text-red-900">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              ZIP Archive Validation Errors ({zipErrors.length}):
            </div>
            {zipErrors.map((err, i) => (
              <div key={i} className="text-[11px] text-red-700 pl-5">
                • {err}
              </div>
            ))}
          </div>
        )}

        {/* ZIP Warnings */}
        {zipWarnings.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1 max-h-28 overflow-y-auto">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Archive Notices ({zipWarnings.length}):
            </div>
            {zipWarnings.map((w: string, i: number) => (
              <div key={i} className="text-[11px] text-amber-700 pl-5">
                • {w}
              </div>
            ))}
          </div>
        )}

        {/* CSV Parse Errors if any */}
        {parseErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1 max-h-32 overflow-y-auto">
            <div className="font-bold flex items-center gap-1.5 text-red-900">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              Questions Validation Warnings ({parseErrors.length}):
            </div>
            {parseErrors.map((err, i) => (
              <div key={i} className="text-[11px] text-red-700 pl-5">
                • {err}
              </div>
            ))}
          </div>
        )}

        {/* Unresolved Missing Image References Warning Box */}
        {resolutionReport && resolutionReport.unresolvedReferences.length > 0 && (
          <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              Missing Image References ({resolutionReport.unresolvedReferences.length})
            </div>
            <p className="text-[11px] text-rose-700">
              The following diagram filenames are referenced in your questions but were not found in the uploaded ZIP archive. Please include these images in your ZIP or remove the reference before importing:
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {resolutionReport.unresolvedReferences.map((ref, idx) => (
                <div key={idx} className="text-[11px] bg-white/80 p-1.5 rounded border border-rose-200 flex items-center justify-between">
                  <span className="font-medium text-slate-800">
                    Row {ref.rowNumber} ({ref.questionIdentifier}) • <span className="font-bold text-rose-700">{ref.field}</span>
                  </span>
                  <span className="font-mono text-rose-800 font-semibold text-[10px]">
                    "{ref.referencedFilename}"
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagram Match Success Banner */}
        {resolutionReport && resolutionReport.resolvedCount > 0 && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Successfully resolved {resolutionReport.resolvedCount} diagram {resolutionReport.resolvedCount === 1 ? 'reference' : 'references'} against ZIP!
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">
              Ready for preview
            </span>
          </div>
        )}

        {/* Step 4: Parsed Questions Summary & Interactive Preview */}
        {previewQuestions.length > 0 && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Parsed {previewQuestions.length} Questions Ready to Review
              </span>
              <div className="flex gap-1.5">
                {['ENGLISH', 'QUANT', 'REASONING', 'GA'].map((sec) => {
                  const count = previewQuestions.filter((q) => q.sectionCode === sec).length;
                  if (count === 0) return null;
                  return (
                    <Badge key={sec} variant="blue" size="sm">
                      {sec}: {count}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Quick Preview of parsed questions with diagrams */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 text-xs">
              {previewQuestions.slice(0, 6).map((q, idx) => {
                const isMissingPImg = q.passageImageUrl && classifyImageReference(q.passageImageUrl) === 'FILENAME';
                const isMissingQImg = q.imageUrl && classifyImageReference(q.imageUrl) === 'FILENAME';

                return (
                  <div key={idx} className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 font-bold">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {q.sectionCode} • {q.topicName}
                        </span>
                        {q.groupId && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                            Group: {q.groupId}
                          </span>
                        )}
                        {(q.passage || q.passageImageUrl) && (
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            Passage Attached
                          </span>
                        )}
                        {q.imageUrl && (
                          <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            Diagram
                          </span>
                        )}
                      </div>
                      <span className="text-emerald-700">
                        Answer: Option {q.options.findIndex((o) => o.isCorrect) + 1}
                      </span>
                    </div>

                    {/* Passage text & Passage Diagram */}
                    {q.passage && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60 line-clamp-2">
                        {q.passage}
                      </div>
                    )}

                    {q.passageImageUrl && (
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                        <span className="text-[10px] font-bold text-slate-600 block">Passage / DI Diagram:</span>
                        {isMissingPImg ? (
                          <div className="text-[11px] text-rose-600 font-semibold bg-rose-50 border border-rose-200 p-2 rounded">
                            ⚠️ Referenced file "{q.passageImageUrl}" not found in ZIP archive
                          </div>
                        ) : (
                          <DiagramViewer
                            src={q.passageImageUrl}
                            alt="Passage Diagram Preview"
                            maxHeightClass="max-h-36"
                            className="rounded border border-slate-200"
                          />
                        )}
                      </div>
                    )}

                    {/* Data Table Preview (LaTeX / Tabular) */}
                    {q.table && (
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                          <TableIcon className="w-3 h-3 text-indigo-600" />
                          Data Table Preview:
                        </span>
                        <LatexTableViewer content={q.table} showCaption={false} />
                      </div>
                    )}

                    {/* Question Statement */}
                    <div className="font-semibold text-slate-800 text-xs">
                      <MathRenderer content={q.text} />
                    </div>

                    {/* Question Diagram */}
                    {q.imageUrl && (
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                        <span className="text-[10px] font-bold text-slate-600 block">Question Diagram:</span>
                        {isMissingQImg ? (
                          <div className="text-[11px] text-rose-600 font-semibold bg-rose-50 border border-rose-200 p-2 rounded">
                            ⚠️ Referenced file "{q.imageUrl}" not found in ZIP archive
                          </div>
                        ) : (
                          <DiagramViewer
                            src={q.imageUrl}
                            alt="Question Diagram Preview"
                            maxHeightClass="max-h-36"
                            className="rounded border border-slate-200"
                          />
                        )}
                      </div>
                    )}

                    {/* Options list with image preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oIdx) => {
                        const isMissingOptImg = opt.imageUrl && classifyImageReference(opt.imageUrl) === 'FILENAME';
                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 text-[11px] rounded-lg border flex flex-col justify-between gap-1.5 ${
                              opt.isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-medium">
                                <span className="font-bold mr-1">{String.fromCharCode(65 + oIdx)}.</span>
                                {opt.text || <span className="italic text-slate-400">[Diagram Option]</span>}
                              </span>
                              {opt.isCorrect && (
                                <span className="text-[9px] bg-emerald-200/80 text-emerald-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                                  Correct
                                </span>
                              )}
                            </div>
                            {opt.imageUrl && (
                              isMissingOptImg ? (
                                <div className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-200 p-1.5 rounded">
                                  ⚠️ Missing from ZIP: "{opt.imageUrl}"
                                </div>
                              ) : (
                                <div className="pt-1">
                                  <DiagramViewer
                                    src={opt.imageUrl}
                                    alt={`Option ${String.fromCharCode(65 + oIdx)} Diagram`}
                                    title={`Option ${String.fromCharCode(65 + oIdx)} Diagram`}
                                    maxHeightClass="max-h-24"
                                    className="rounded border border-slate-200"
                                  />
                                </div>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {previewQuestions.length > 6 && (
                <div className="text-[11px] text-slate-400 text-center pt-1 font-mono">
                  + {previewQuestions.length - 6} more questions in batch
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase 3: Duplicate Policy & Conflict Resolution Controls */}
        {rawQuestions.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Duplicate Question Handling Policy
              </span>
              <select
                value={duplicatePolicy}
                onChange={(e) => setDuplicatePolicy(e.target.value as any)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="SKIP">Skip Duplicates (Default & Safe)</option>
                <option value="REVIEW">Flag Duplicates for Review</option>
                <option value="UPDATE">Update Existing Matching Questions</option>
              </select>
            </div>

            {duplicatePolicy === 'UPDATE' && (
              <label className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowDestructiveUpdates}
                  onChange={(e) => setAllowDestructiveUpdates(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span>
                  <strong>Explicit Consent Required:</strong> I authorize overwriting existing questions if an identical statement is found in the same exam/section.
                </span>
              </label>
            )}
          </div>
        )}

        {/* Phase 3: Live Progress Status */}
        {importProgressText && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 animate-pulse">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            <div className="text-xs font-medium text-blue-900">{importProgressText}</div>
          </div>
        )}

        {/* Phase 3: Final Batch Execution Report */}
        {finalReport && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                Batch Import Report {lastBatchId ? `(${lastBatchId})` : ''}
              </h4>
              {finalReport.errors && finalReport.errors.length > 0 && lastBatchId && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  isLoading={isRetrying}
                  onClick={handleRetryBatch}
                  className="bg-white hover:bg-blue-50 text-blue-700 border-blue-300 text-xs font-bold flex items-center gap-1 shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry Failed Records
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="text-base font-black">{finalReport.questionsCreated}</div>
                <div className="text-[10px] text-emerald-700 font-semibold">Created</div>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                <div className="text-base font-black">{finalReport.questionsUpdated}</div>
                <div className="text-[10px] text-blue-700 font-semibold">Updated</div>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <div className="text-base font-black">{finalReport.duplicatesSkipped + finalReport.duplicatesRequiringReview}</div>
                <div className="text-[10px] text-amber-700 font-semibold">Duplicates</div>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                <div className="text-base font-black">{finalReport.errors ? finalReport.errors.length : 0}</div>
                <div className="text-[10px] text-rose-700 font-semibold">Errors / Failed</div>
              </div>
            </div>

            {finalReport.errors && finalReport.errors.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto text-[11px] p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-rose-700 block text-[10px] uppercase tracking-wider">
                  Row-Level Diagnostics ({finalReport.errors.length}):
                </span>
                {finalReport.errors.map((err: any, eIdx: number) => (
                  <div key={eIdx} className="text-slate-700 flex items-start gap-1">
                    <span className="font-bold text-rose-600 shrink-0">Row {err.row}:</span>
                    <span>{err.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            variant="secondary"
            size="md"
            onClick={handleCloseModal}
            disabled={isPending || isSubmitting || isParsing || isExtractingZip || isRetrying}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            isLoading={isPending || isSubmitting || isParsing || isExtractingZip || isRetrying}
            disabled={
              rawQuestions.length === 0 ||
              hasMissingReferences ||
              isPending ||
              isSubmitting ||
              isParsing ||
              isExtractingZip ||
              isRetrying
            }
            onClick={handleImportSubmit}
            className="bg-blue-600 hover:bg-blue-700 font-bold flex items-center gap-1.5"
            title={hasMissingReferences ? 'Please resolve missing image references before importing' : 'Import questions into database'}
          >
            <Sparkles className="w-4 h-4" />
            {isSubmitting
              ? importProgressText || 'Importing Questions...'
              : isParsing || isExtractingZip
              ? 'Analyzing Files...'
              : hasMissingReferences
              ? 'Resolve Missing Images to Import'
              : rawQuestions.length > 0
              ? `Import ${rawQuestions.length} Questions`
              : 'Import Questions'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
