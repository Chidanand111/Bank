'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AdminQuestionInput, Difficulty } from '@/types';
import { bulkImportQuestionsAction } from '@/lib/services/adminService';
import { MathRenderer } from '../ui/MathRenderer';
import { compressDataUrl } from '@/lib/utils/imageCompressor';
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export interface BulkQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  partitions: { id: string; label: string }[];
  currentPartitionId: string;
  exams?: { id: string; title: string; category?: string }[];
}

// Sample CSV content with Reading Comprehension (RC), Data Interpretation (DI) charts, Reasoning puzzles, and LaTeX math
const SAMPLE_CSV_CONTENT = `groupId,passage,passageImageUrl,imageUrl,sectionCode,topicName,text,optionA,optionB,optionC,optionD,optionE,correctOption,marks,negativeMarks,difficulty,explanation
RC-SET-01,"The Reserve Bank of India (RBI) operates as the nation's central monetary authority, tasked with maintaining price stability while fostering sustainable economic growth. In response to fluctuating global inflationary pressures, the Monetary Policy Committee (MPC) meticulously regulates the policy Repo Rate and the Cash Reserve Ratio (CRR). By fine-tuning these policy tools, the central bank directly influences domestic liquidity, commercial lending trajectories, and corporate capital expenditure cycles. Financial inclusion drives and digital banking innovations further amplify the transmission of monetary policy across rural and semi-urban banking sectors.","","",ENGLISH,Reading Comprehension,"What is the primary dual mandate of the Reserve Bank of India highlighted in the passage?","Maximizing export revenue and foreign exchange","Maintaining price stability while supporting economic growth","Eliminating inter-bank lending rates completely","Providing direct subsidies to commercial institutions","None of the above",B,1,0.25,MEDIUM,"As explicitly stated in the first sentence, the RBI's dual mandate focuses on maintaining price stability while fostering sustainable economic growth."
RC-SET-01,"","","",ENGLISH,Reading Comprehension,"Which policy tool mentioned directly impacts commercial bank reserves without interest compensation?","Statutory Liquidity Ratio (SLR)","Cash Reserve Ratio (CRR)","Marginal Standing Facility (MSF)","Open Market Operations (OMO)","Reverse Repo Rate",B,1,0.25,EASY,"The passage highlights the Cash Reserve Ratio (CRR), which requires commercial banks to maintain cash balances with the central bank."
RC-SET-01,"","","",ENGLISH,Reading Comprehension,"According to the context, what role do digital banking innovations play in monetary economics?","They bypass central banking authority entirely","They amplify the transmission of monetary policy across wider sectors","They eliminate all credit risks in retail lending","They reduce corporate capital expenditures to zero","None of the above",B,1,0.25,MEDIUM,"The passage notes that digital banking innovations amplify the transmission of monetary policy across rural and semi-urban banking sectors."
RC-SET-01,"","","",ENGLISH,Reading Comprehension,"Which word from the passage is closest in meaning to 'carefully and with great attention to detail'?","Fluctuating","Meticulously","Trajectories","Transmission","Expenditure",B,1,0.25,EASY,"'Meticulously' means in a way that shows great attention to detail or very thoroughly."
DI-SET-01,"Directions (Questions 5-8): The following Data Interpretation chart displays branch manufacturing distribution across 4 quarters (Q1 to Q4). Total production stood at 2400 units: Q1 (20%), Q2 (30%), Q3 (25%), Q4 (25%). Study the information and answer the questions.","data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='260' viewBox='0 0 600 260'><rect width='100%' height='100%' fill='%23f8fafc'/><text x='300' y='32' text-anchor='middle' font-size='16' font-family='sans-serif' font-weight='bold' fill='%230f172a'>Branch Production Units (Total = 2400)</text><rect x='60' y='140' width='80' height='90' fill='%233b82f6'/><text x='100' y='130' text-anchor='middle' font-size='12' font-weight='bold' fill='%231e293b'>Q1: 480 (20%)</text><rect x='190' y='95' width='80' height='135' fill='%2310b981'/><text x='230' y='85' text-anchor='middle' font-size='12' font-weight='bold' fill='%231e293b'>Q2: 720 (30%)</text><rect x='320' y='117' width='80' height='113' fill='%23f59e0b'/><text x='360' y='107' text-anchor='middle' font-size='12' font-weight='bold' fill='%231e293b'>Q3: 600 (25%)</text><rect x='450' y='117' width='80' height='113' fill='%238b5cf6'/><text x='490' y='107' text-anchor='middle' font-size='12' font-weight='bold' fill='%231e293b'>Q4: 600 (25%)</text><line x1='30' y1='230' x2='570' y2='230' stroke='%2364748b' stroke-width='2'/></svg>","",QUANT,Data Interpretation,"What is the difference between total units produced in Q2 and Q1?","240 units","300 units","200 units","180 units","150 units",A,1,0.25,EASY,"Total production = 2400. Q2 = 30% of 2400 = 720. Q1 = 20% of 2400 = 480. Difference = 720 - 480 = 240 units."
DI-SET-01,"","","",QUANT,Data Interpretation,"What is the ratio of combined production in (Q1 + Q3) to (Q2 + Q4)?","$9 : 11$","$1 : 1$","$3 : 4$","$5 : 6$","None of these",A,1,0.25,MEDIUM,"Q1 + Q3 = 20% + 25% = 45%. Q2 + Q4 = 30% + 25% = 55%. Ratio = 45 : 55 = 9 : 11."
DI-SET-01,"","","",QUANT,Data Interpretation,"If production in Q5 is projected to be 15% higher than Q2, how many units will be produced in Q5?","828 units","810 units","840 units","800 units","790 units",A,1,0.25,MEDIUM,"Q2 production = 720 units. 15% increase = 720 * 1.15 = 828 units."
DI-SET-01,"","","",QUANT,Data Interpretation,"What is the average number of units produced per quarter across Q1, Q2, and Q3?","600 units","580 units","620 units","640 units","610 units",A,1,0.25,EASY,"Total for Q1+Q2+Q3 = 480 + 720 + 600 = 1800 units. Average = 1800 / 3 = 600 units."
PUZZLE-SET-01,"Directions (Questions 9-12): Eight friends (A, B, C, D, E, F, G, and H) are sitting around a circular table facing the center. A sits third to the right of B. F sits second to the right of A. Only two people sit between F and C. D sits second to the left of C. E is an immediate neighbor of neither A nor C. G sits third to the left of H.","","",REASONING,Circular Seating Arrangement,"Who sits directly opposite to B in the arrangement?","F","D","H","G","C",B,1,0.25,MEDIUM,"Plotting clockwise from B: B, E, H, A, D, G, F, C. D sits directly opposite B (4 positions away in an 8-person circular table)."
PUZZLE-SET-01,"","","",REASONING,Circular Seating Arrangement,"Who sits to the immediate left of A?","H","D","F","B","E",A,1,0.25,EASY,"Facing the center, H is to the immediate left (clockwise predecessor) of A."
PUZZLE-SET-01,"","","",REASONING,Circular Seating Arrangement,"How many persons sit between F and B when counted from the right of F?","One","Two","Three","Four","None",A,1,0.25,MEDIUM,"Counting clockwise from F: only C sits between F and B. Thus exactly one person sits between them."
PUZZLE-SET-01,"","","",REASONING,Circular Seating Arrangement,"Four of the following five are alike based on their positions and form a group. Which one does not belong to the group?","B - H","A - G","D - F","G - C","E - A",E,1,0.25,HARD,"In B-H, A-G, D-F, and G-C, exactly one person sits between the pairs. In E-A, there is also one person (H), but they are sitting in opposite orientation."
,,"","",QUANT,Simplification,"Solve the expression: $\\\\sqrt{625} + \\\\frac{15}{3} \\\\times 4 - 2^3 = ?$","37","42","45","39","40",A,1,0.25,EASY,"$\\\\sqrt{625} = 25$; $\\\\frac{15}{3} \\\\times 4 = 20$; $2^3 = 8$. Therefore: $25 + 20 - 8 = 37$."
,,"","",QUANT,Quadratic Equations,"Find the roots of the quadratic equation: $x^2 - 7x + 12 = 0$","$x = 2, 6$","$x = 3, 4$","$x = -3, -4$","$x = 1, 12$","None of these",B,1,0.25,MEDIUM,"Factorizing: $(x - 3)(x - 4) = 0 \\\\implies x = 3$ or $x = 4$."
,,"","",REASONING,Syllogism,"Statements: Some bankers are analysts. All analysts are auditors. Conclusions: I. Some auditors are bankers. II. All bankers are auditors.","Only conclusion I follows","Only conclusion II follows","Either I or II follows","Neither I nor II follows","Both conclusions follow",A,1,0.25,EASY,"Since some bankers are analysts and all analysts are auditors, it directly follows that some auditors are bankers. Conclusion I is valid."
,,"","",FINANCIAL_AWARENESS,Banking Regulations,"Under the Basel III regulatory framework, what is the minimum Common Equity Tier 1 (CET1) capital ratio required to be maintained by banks?","4.5%","5.5%","6.0%","8.0%","9.0%",B,1,0.25,MEDIUM,"Under Basel III norms, the minimum Tier 1 Common Equity ratio (CET1) is 5.5% (plus a capital conservation buffer of 2.5% in India)."
`;

export const BulkQuestionModal: React.FC<BulkQuestionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  partitions,
  currentPartitionId,
  exams = [],
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(
    exams[0]?.id || 'exam-ibps-po'
  );
  const [selectedPartition, setSelectedPartition] = useState<string>(
    currentPartitionId !== 'ALL' ? currentPartitionId : partitions[1]?.id || 'ALL'
  );

  useEffect(() => {
    if (isOpen) {
      if (currentPartitionId && currentPartitionId !== 'ALL') {
        setSelectedPartition(currentPartitionId);
        if (currentPartitionId.startsWith('exam-')) {
          setSelectedExamId(currentPartitionId);
        } else {
          const matchingExam = exams.find(e => e.id === currentPartitionId);
          if (matchingExam) setSelectedExamId(matchingExam.id);
        }
      } else if (exams && exams.length > 0) {
        setSelectedExamId(exams[0].id);
      }
    }
  }, [isOpen, currentPartitionId, exams]);

  const [parsedQuestions, setParsedQuestions] = useState<AdminQuestionInput[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isPending, startTransition] = useTransition();

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
  const parseFullCsv = (csvText: string): string[][] => {
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
      } else if (char === ',' && !inQuotes) {
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

  // 4. File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseErrors([]);
    setParsedQuestions([]);

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
                const comp = await compressDataUrl(pImg, 900, 0.76);
                pImg = comp.compressedDataUrl;
              }
              if (qImg && qImg.startsWith('data:image')) {
                const comp = await compressDataUrl(qImg, 900, 0.76);
                qImg = comp.compressedDataUrl;
              }

              // Support both nested options array and flat optionA..optionE
              let options = item.options;
              if (!options && item.optionA) {
                const rawCorrect = (item.correctOption || 'A').trim().toUpperCase();
                options = [
                  { text: item.optionA, isCorrect: rawCorrect === 'A' },
                  { text: item.optionB, isCorrect: rawCorrect === 'B' },
                  ...(item.optionC ? [{ text: item.optionC, isCorrect: rawCorrect === 'C' }] : []),
                  ...(item.optionD ? [{ text: item.optionD, isCorrect: rawCorrect === 'D' }] : []),
                  ...(item.optionE ? [{ text: item.optionE, isCorrect: rawCorrect === 'E' }] : []),
                ];
              }

              // Determine exam ID for JSON items
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
              });
            }
            setParsedQuestions(processedList);
          } else {
            setParseErrors(['JSON file must contain an array of question objects.']);
          }
        } catch {
          setParseErrors(['Failed to parse JSON file. Please check syntax.']);
        }
      };
      reader.readAsText(file);
    } else {
      // CSV Parsing
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (!text) return;

        const rows = parseFullCsv(text);
        if (rows.length < 2) {
          setParseErrors(['CSV file must have at least a header row and one question row.']);
          return;
        }

        const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const questions: AdminQuestionInput[] = [];
        const errors: string[] = [];

        // Validate required headers
        const requiredHeaders = ['sectioncode', 'topicname', 'text', 'optiona', 'optionb', 'correctoption'];
        const missing = requiredHeaders.filter((rh) => !headers.some((h) => h.includes(rh)));
        if (missing.length > 0) {
          setParseErrors([`Missing required CSV column headers: ${missing.join(', ')}`]);
          return;
        }

        for (let idx = 1; idx < rows.length; idx++) {
          const rowValues = rows[idx];
          if (rowValues.length < 6) continue; // skip incomplete rows

          const rowData: Record<string, string> = {};
          headers.forEach((h, i) => {
            rowData[h] = rowValues[i] || '';
          });

          // Extract fields
          const sectionCodeRaw = (rowData['sectioncode'] || 'REASONING').toUpperCase();
          const sectionCode = sectionCodeRaw.includes('QUANT')
            ? 'QUANT'
            : sectionCodeRaw.includes('ENG')
            ? 'ENGLISH'
            : sectionCodeRaw.includes('GA') || sectionCodeRaw.includes('GEN')
            ? 'GA'
            : 'REASONING';

          const topicName = rowData['topicname'] || 'General';
          const qText = rowData['text'] || rowData['question'] || '';
          if (!qText) {
            errors.push(`Row ${idx + 1}: Question text cannot be empty.`);
            continue;
          }

          const optA = rowData['optiona'] || '';
          const optB = rowData['optionb'] || '';
          const optC = rowData['optionc'] || '';
          const optD = rowData['optiond'] || '';
          const optE = rowData['optione'] || '';

          const rawCorrect = (rowData['correctoption'] || 'A').trim().toUpperCase();
          const correctLetter = ['A', 'B', 'C', 'D', 'E'].includes(rawCorrect)
            ? rawCorrect
            : rawCorrect === '1'
            ? 'A'
            : rawCorrect === '2'
            ? 'B'
            : rawCorrect === '3'
            ? 'C'
            : rawCorrect === '4'
            ? 'D'
            : rawCorrect === '5'
            ? 'E'
            : 'A';

          const optionsList = [
            { text: optA, isCorrect: correctLetter === 'A' },
            { text: optB, isCorrect: correctLetter === 'B' },
            ...(optC ? [{ text: optC, isCorrect: correctLetter === 'C' }] : []),
            ...(optD ? [{ text: optD, isCorrect: correctLetter === 'D' }] : []),
            ...(optE ? [{ text: optE, isCorrect: correctLetter === 'E' }] : []),
          ];

          if (optionsList.length < 2) {
            errors.push(`Row ${idx + 1}: At least Option A and Option B are required.`);
            continue;
          }

          const difficultyRaw = (rowData['difficulty'] || 'MEDIUM').toUpperCase();
          const difficulty: Difficulty =
            difficultyRaw === 'EASY' || difficultyRaw === 'HARD' ? difficultyRaw : 'MEDIUM';

          const marks = parseFloat(rowData['marks'] || '1.0') || 1.0;
          const negativeMarks = parseFloat(rowData['negativemarks'] || '0.25') || 0.25;
          const explanation = rowData['explanation'] || '';

          const groupId = (rowData['groupid'] || rowData['group'] || rowData['setid'] || '').trim() || undefined;
          const passage = (rowData['passage'] || rowData['directions'] || rowData['context'] || '').trim() || undefined;
          let passageImageUrl = (rowData['passageimageurl'] || rowData['passageimage'] || rowData['chartimageurl'] || rowData['diimage'] || '').trim() || undefined;
          let imageUrl = (rowData['imageurl'] || rowData['image'] || rowData['diagram'] || '').trim() || undefined;

          // Auto-compress base64 images if present in CSV
          if (passageImageUrl && passageImageUrl.startsWith('data:image')) {
            const comp = await compressDataUrl(passageImageUrl, 900, 0.76);
            passageImageUrl = comp.compressedDataUrl;
          }
          if (imageUrl && imageUrl.startsWith('data:image')) {
            const comp = await compressDataUrl(imageUrl, 900, 0.76);
            imageUrl = comp.compressedDataUrl;
          }

          // Determine target exam ID from row or modal selection
          const rowExam = (rowData['examid'] || rowData['exam'] || rowData['targetexam'] || '').trim();
          let targetExamId = selectedExamId;
          if (rowExam) {
            targetExamId = rowExam.startsWith('exam-') ? rowExam : `exam-${rowExam.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          } else if (selectedPartition && selectedPartition !== 'ALL') {
            if (selectedPartition.toLowerCase().includes('sbi') || selectedPartition.toLowerCase().includes('clerk')) {
              targetExamId = 'exam-sbi-clerk';
            } else if (selectedPartition.startsWith('exam-')) {
              targetExamId = selectedPartition;
            }
          }

          questions.push({
            examId: targetExamId,
            sectionCode,
            topicName,
            text: qText,
            imageUrl,
            passage,
            passageImageUrl,
            groupId,
            difficulty,
            marks,
            negativeMarks,
            explanation,
            options: optionsList,
          });
        }

        setParsedQuestions(questions);
        setParseErrors(errors);
      };
      reader.readAsText(file);
    }
  };

  // 4. Submit questions
  const handleImportSubmit = () => {
    if (parsedQuestions.length === 0) return;

    startTransition(async () => {
      const res = await bulkImportQuestionsAction(parsedQuestions, selectedPartition);
      if (res.success) {
        onSuccess(res.count);
        onClose();
      } else {
        setParseErrors([res.error || 'Failed to import questions.']);
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Question Importer (CSV / JSON)">
      <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        {/* Step 1: Sample CSV Download Box */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Required CSV Format Template</h4>
                <p className="text-[11px] text-slate-600">
                  Download our pre-configured CSV template containing RC passages, DI charts, and LaTeX math formatting.
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
              📊 4Q Data Interpretation Set (DI-SET-01 + SVG Chart)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-100/70 text-purple-800 text-[10px] font-semibold">
              🧩 4Q Seating Arrangement Puzzle (PUZZLE-SET-01)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100/70 text-emerald-800 text-[10px] font-semibold">
              📐 LaTeX Equations ($...$)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-100/70 text-rose-800 text-[10px] font-semibold">
              🏛️ Financial / Banking Awareness
            </span>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Smart Storage Optimization:</strong> For Reading Comprehension (RC) sets, DI chart sets, and Puzzles, enter a common <code>groupId</code> (e.g. <code>RC-SET-01</code>, <code>DI-SET-01</code>) and provide the passage or chart image once on the first question. The system will store it once in the database to save space, while rendering it automatically across all 4-8 questions in that set!
            </span>
          </div>

          <div className="text-[10px] text-slate-600 font-mono bg-white/90 p-2.5 rounded-xl border border-blue-100 overflow-x-auto whitespace-nowrap">
            Columns: groupId, passage, passageImageUrl, imageUrl, sectionCode, topicName, text, optionA, optionB, optionC, optionD, optionE, correctOption, marks, negativeMarks, difficulty, explanation
          </div>
        </div>

        {/* Step 2: Target Exam & Partition Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exams && exams.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Target Banking Exam:
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Import Into Exam Partition / Paper:
            </label>
            <select
              value={selectedPartition}
              onChange={(e) => setSelectedPartition(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {partitions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} {p.id === 'ALL' ? '(Master Question Bank)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 3: File Upload Dropzone */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">Upload Questions File (.csv or .json):</label>
          <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50 hover:bg-blue-50/20 relative cursor-pointer">
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs text-slate-700 font-medium">
                {fileName ? (
                  <span className="font-bold text-blue-700">{fileName}</span>
                ) : (
                  <>
                    <span className="font-bold text-blue-600">Click to upload</span> or drag and drop CSV / JSON
                  </>
                )}
              </div>
              <span className="text-[10px] text-slate-400">Supports standard banking CSV sheets or exported JSON arrays</span>
            </div>
          </div>
        </div>

        {/* Error Messages if any */}
        {parseErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1 max-h-32 overflow-y-auto">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              Validation Warnings ({parseErrors.length}):
            </div>
            {parseErrors.map((err, i) => (
              <div key={i} className="text-[11px] text-red-700 pl-5">
                • {err}
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Parsed Questions Summary & Preview */}
        {parsedQuestions.length > 0 && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Parsed {parsedQuestions.length} Questions Ready to Import
              </span>
              <div className="flex gap-1.5">
                {['ENGLISH', 'QUANT', 'REASONING', 'GA'].map((sec) => {
                  const count = parsedQuestions.filter((q) => q.sectionCode === sec).length;
                  if (count === 0) return null;
                  return (
                    <Badge key={sec} variant="blue" size="sm">
                      {sec}: {count}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Quick Preview of parsed questions */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 text-xs">
              {parsedQuestions.slice(0, 5).map((q, idx) => (
                <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 font-bold">
                    <div className="flex items-center gap-1.5">
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
                          Passage / DI Attached
                        </span>
                      )}
                      {q.groupId && !q.passage && !q.passageImageUrl && (
                        <span className="bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded">
                          Reuses Group Passage
                        </span>
                      )}
                    </div>
                    <span className="text-emerald-700">
                      Answer: Option {q.options.findIndex((o) => o.isCorrect) + 1}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800 line-clamp-2 text-xs">
                    <MathRenderer content={q.text} />
                  </div>
                </div>
              ))}
              {parsedQuestions.length > 5 && (
                <div className="text-[11px] text-slate-400 text-center pt-1 font-mono">
                  + {parsedQuestions.length - 5} more questions in file
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            isLoading={isPending}
            disabled={parsedQuestions.length === 0}
            onClick={handleImportSubmit}
            className="bg-blue-600 hover:bg-blue-700 font-bold flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            Import {parsedQuestions.length > 0 ? `${parsedQuestions.length} Questions` : 'Questions'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
