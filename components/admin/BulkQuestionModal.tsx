'use client';

import React, { useState, useTransition } from 'react';
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
}

// Sample CSV content with Reading Comprehension (RC) and Data Interpretation (DI) sets sharing passages/images
const SAMPLE_CSV_CONTENT = `groupId,passage,passageImageUrl,imageUrl,sectionCode,topicName,text,optionA,optionB,optionC,optionD,optionE,correctOption,marks,negativeMarks,difficulty,explanation
RC-SET-01,"The Reserve Bank of India (RBI) operates as the nation's central monetary authority, tasked with maintaining price stability while fostering sustainable economic growth. In response to fluctuating global inflationary pressures, the Monetary Policy Committee (MPC) meticulously regulates the policy Repo Rate and the Cash Reserve Ratio (CRR). By fine-tuning these policy tools, the central bank directly influences domestic liquidity, commercial lending trajectories, and corporate capital expenditure cycles. Financial inclusion drives and digital banking innovations further amplify the transmission of monetary policy across rural and semi-urban banking sectors.","","",ENGLISH,Reading Comprehension,"What is the primary dual mandate of the Reserve Bank of India highlighted in the passage?","Maximizing export revenue and foreign exchange","Maintaining price stability while supporting economic growth","Eliminating inter-bank lending rates completely","Providing direct subsidies to commercial institutions","None of the above",B,1,0.25,MEDIUM,"As explicitly stated in the first sentence, the RBI's dual mandate focuses on maintaining price stability while fostering sustainable economic growth."
RC-SET-01,"","","",ENGLISH,Reading Comprehension,"Which policy tool mentioned directly impacts commercial bank reserves without interest compensation?","Statutory Liquidity Ratio (SLR)","Cash Reserve Ratio (CRR)","Marginal Standing Facility (MSF)","Open Market Operations (OMO)","Reverse Repo Rate",B,1,0.25,EASY,"The passage highlights the Cash Reserve Ratio (CRR), which requires commercial banks to maintain cash balances with the central bank."
RC-SET-01,"","","",ENGLISH,Reading Comprehension,"According to the context, what role do digital banking innovations play in monetary economics?","They bypass central banking authority entirely","They amplify the transmission of monetary policy across wider sectors","They eliminate all credit risks in retail lending","They reduce corporate capital expenditures to zero","None of the above",B,1,0.25,MEDIUM,"The passage notes that digital banking innovations amplify the transmission of monetary policy across rural and semi-urban banking sectors."
DI-SET-01,"Directions (Questions 4-5): The following Data Interpretation set assesses branch unit manufacturing across 4 quarterly periods. Total production across Q1 to Q4 stood at 2400 units with percentage distribution: Q1 (20%), Q2 (30%), Q3 (25%), Q4 (25%). Study the data and answer the questions.","","",QUANT,Data Interpretation,"What is the difference between total units produced in Q2 and Q1?","240 units","300 units","200 units","180 units","150 units",A,1,0.25,EASY,"Total production = 2400. Q2 = 30% of 2400 = 720. Q1 = 20% of 2400 = 480. Difference = 720 - 480 = 240 units."
DI-SET-01,"","","",QUANT,Data Interpretation,"What is the ratio of combined production in (Q1 + Q3) to (Q2 + Q4)?","$9 : 11$","$1 : 1$","$3 : 4$","$5 : 6$","None of these",A,1,0.25,MEDIUM,"Q1 + Q3 = 20% + 25% = 45%. Q2 + Q4 = 30% + 25% = 55%. Ratio = 45 : 55 = 9 : 11."
,,"","",QUANT,Simplification,"Solve the expression: $\\\\sqrt{625} + \\\\frac{15}{3} \\\\times 4 - 2^3 = ?$","37","42","45","39","40",A,1,0.25,EASY,"$\\\\sqrt{625} = 25$; $\\\\frac{15}{3} \\\\times 4 = 20$; $2^3 = 8$. Therefore: $25 + 20 - 8 = 37$."
,,"","",REASONING,Syllogism,"Statements: Some bankers are analysts. All analysts are auditors. Conclusions: I. Some auditors are bankers. II. All bankers are auditors.","Only conclusion I follows","Only conclusion II follows","Either I or II follows","Neither I nor II follows","Both conclusions follow",A,1,0.25,EASY,"Since some bankers are analysts and all analysts are auditors, it directly follows that some auditors are bankers. Conclusion I is valid."
`;

export const BulkQuestionModal: React.FC<BulkQuestionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  partitions,
  currentPartitionId,
}) => {
  const [selectedPartition, setSelectedPartition] = useState<string>(
    currentPartitionId !== 'ALL' ? currentPartitionId : partitions[1]?.id || 'ALL'
  );
  const [parsedQuestions, setParsedQuestions] = useState<AdminQuestionInput[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  // 1. Download Sample CSV File
  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_banking_questions_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Helper to parse a CSV line respecting quotes
  const parseCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let currentVal = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim());
    return values;
  };

  // 3. File upload handler
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
              processedList.push({
                ...item,
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

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setParseErrors(['CSV file must have at least a header row and one question row.']);
          return;
        }

        const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const questions: AdminQuestionInput[] = [];
        const errors: string[] = [];

        // Validate required headers
        const requiredHeaders = ['sectioncode', 'topicname', 'text', 'optiona', 'optionb', 'correctoption'];
        const missing = requiredHeaders.filter((rh) => !headers.some((h) => h.includes(rh)));
        if (missing.length > 0) {
          setParseErrors([`Missing required CSV column headers: ${missing.join(', ')}`]);
          return;
        }

        for (let idx = 1; idx < lines.length; idx++) {
          const rowValues = parseCsvLine(lines[idx]);
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

          // Determine target exam ID from selected partition
          let targetExamId = 'exam-ibps-po';
          if (selectedPartition && selectedPartition !== 'ALL') {
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

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadSampleCsv}
              className="bg-white hover:bg-blue-50 text-blue-700 border-blue-300 font-bold shrink-0 flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download Sample CSV
            </Button>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Smart Storage Optimization:</strong> For Reading Comprehension (RC) sets and Data Interpretation (DI) chart sets, enter a common <code>groupId</code> (e.g. <code>RC-SET-01</code>) and provide the passage or chart image once on the first question. The system will store it only once in the database to save storage, while rendering it automatically across all 4-8 questions in that set!
            </span>
          </div>

          <div className="text-[10px] text-slate-600 font-mono bg-white/90 p-2.5 rounded-xl border border-blue-100 overflow-x-auto whitespace-nowrap">
            Columns: groupId, passage, passageImageUrl, imageUrl, sectionCode, topicName, text, optionA, optionB, optionC, optionD, optionE, correctOption, marks, negativeMarks, difficulty, explanation
          </div>
        </div>

        {/* Step 2: Target Partition Selection */}
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
