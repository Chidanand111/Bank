'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  getAdminQuestions,
  createQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
  getAdminPartitions,
  getAdminExams,
  createMockTestAction,
  AdminPartitionInfo,
} from '@/lib/services/adminService';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminMockTestInput, AdminQuestionInput, Difficulty, Exam, Question } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  PlusCircle,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Layers,
  Sparkles,
  BookOpen,
  Calendar,
  X,
  Upload,
  Plus,
} from 'lucide-react';

export type ExamPartition = AdminPartitionInfo;

const PARTITIONS: ExamPartition[] = [
  {
    id: 'ALL',
    label: 'All Questions',
    badge: 'Repository (All)',
    title: 'Complete Question Bank Repository',
    isPyq: false,
    examId: 'ALL',
    category: 'ALL',
    description: 'Browse, search, and manage all questions across all exams and subjects in the database.',
  },
  {
    id: 'mock-sbi-clerk-2024-pyq',
    label: 'SBI Clerk 2024 PYQ',
    badge: 'Official Paper (100 Qs)',
    title: 'SBI Clerk Prelims 2024 - Previous Year Question Paper',
    isPyq: true,
    pyqYear: 2024,
    examId: 'exam-sbi-clerk',
    category: 'PYQ',
    description: 'Authentic 100-question paper from SBI Clerk Prelims 2024. Questions are fixed in exact official paper order (35 Reasoning, 35 Numerical Ability, 30 English).',
  },
  {
    id: 'mock-sbi-clerk-2023-pyq',
    label: 'SBI Clerk 2023-24 PYQ',
    badge: 'Official Paper (100 Qs)',
    title: 'SBI Clerk Prelims 2023-24 - Previous Year Question Paper',
    isPyq: true,
    pyqYear: 2023,
    examId: 'exam-sbi-clerk',
    category: 'PYQ',
    description: 'Authentic 100-question paper from SBI Clerk Prelims 2023-24 (Held on Jan 5, 2024). Fixed in exact official paper order.',
  },
  {
    id: 'mock-ibps-po-2025-mains-pyq',
    label: 'IBPS PO 2025 Mains PYQ',
    badge: 'Official Paper (155 Qs)',
    title: 'IBPS PO Mains 2025 - Previous Year Question Paper',
    isPyq: true,
    pyqYear: 2025,
    examId: 'exam-ibps-po',
    category: 'PYQ',
    description: 'Authentic 155-question paper from IBPS PO Mains 2025 (Held on Oct 12, 2025): Reasoning & Computer Aptitude (45 Qs), English Language (35 Qs), Data Analysis & Interpretation (35 Qs), and General / Banking Awareness (40 Qs).',
  },
  {
    id: 'mock-ibps-po-2024-pyq',
    label: 'IBPS PO 2024 PYQ',
    badge: 'Official Paper (100 Qs)',
    title: 'IBPS PO Prelims 2024 - Previous Year Question Paper',
    isPyq: true,
    pyqYear: 2024,
    examId: 'exam-ibps-po',
    category: 'PYQ',
    description: 'Authentic 100-question paper from IBPS PO Prelims 2024 (Held on Oct 19, 2024): Reasoning Ability (35 Qs), English Language (30 Qs), and Quantitative Aptitude (35 Qs).',
  },
  {
    id: 'mock-ibps-po-2023-pyq',
    label: 'IBPS PO 2023 PYQ',
    badge: 'Official Paper (100 Qs)',
    title: 'IBPS PO Prelims 2023 - Previous Year Question Paper',
    isPyq: true,
    pyqYear: 2023,
    examId: 'exam-ibps-po',
    category: 'PYQ',
    description: 'Authentic 100-question paper from IBPS PO Prelims 2023 (Held on Sep 23, 2023): English Language (30 Qs), Quantitative Aptitude (35 Qs), and Reasoning Ability (35 Qs).',
  },
  {
    id: 'mock-ibps-po-1',
    label: 'IBPS PO Mock 1',
    badge: 'Fixed Exam (100 Qs)',
    title: 'IBPS PO Prelims Full Mock Test 1',
    isPyq: false,
    examId: 'exam-ibps-po',
    category: 'MOCK',
    description: 'Fixed 100-question full practice test for IBPS PO (35 Reasoning, 35 Quant, 30 English). Zero randomization across test attempts.',
  },
  {
    id: 'mock-ibps-po-2',
    label: 'IBPS PO Mock 2',
    badge: 'Fixed Exam (100 Qs)',
    title: 'IBPS PO Prelims Speed Drill Mock 2',
    isPyq: false,
    examId: 'exam-ibps-po',
    category: 'MOCK',
    description: 'Fixed 100-question speed drill practice exam for IBPS PO with dedicated non-overlapping questions.',
  },
  {
    id: 'mock-sbi-clerk-1',
    label: 'SBI Clerk Mock 1',
    badge: 'Fixed Exam (100 Qs)',
    title: 'SBI Clerk Prelims Full Mock Test 1',
    isPyq: false,
    examId: 'exam-sbi-clerk',
    category: 'MOCK',
    description: 'Fixed 100-question simulation practice test for SBI Clerk Prelims.',
  },
  {
    id: 'mock-sbi-clerk-2',
    label: 'SBI Clerk Mock 2',
    badge: 'Fixed Exam (100 Qs)',
    title: 'SBI Clerk Prelims Speed Booster Mock 2',
    isPyq: false,
    examId: 'exam-sbi-clerk',
    category: 'MOCK',
    description: 'Fixed 100-question speed drill test for SBI Clerk Junior Associate.',
  },
];

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Partition selector
  const [activePartitionId, setActivePartitionId] = useState<string>('ALL');

  // Filters
  const [search, setSearch] = useState('');
  const [examId, setExamId] = useState('ALL');
  const [sectionCode, setSectionCode] = useState('ALL');
  const [difficulty, setDifficulty] = useState('ALL');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form fields
  const [formExamId, setFormExamId] = useState('exam-ibps-po');
  const [formSectionCode, setFormSectionCode] = useState('QUANT');
  const [formTopicName, setFormTopicName] = useState('Number Series');
  const [formText, setFormText] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<Difficulty>('MEDIUM');
  const [formExplanation, setFormExplanation] = useState('');
  const [formMarks, setFormMarks] = useState(1.0);
  const [formNegativeMarks, setFormNegativeMarks] = useState(0.25);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formPassage, setFormPassage] = useState('');
  const [formPassageImageUrl, setFormPassageImageUrl] = useState('');
  const [formGroupId, setFormGroupId] = useState('');
  const [formIsPyq, setFormIsPyq] = useState(false);
  const [formPyqYear, setFormPyqYear] = useState<number | ''>('');
  const [formPyqExam, setFormPyqExam] = useState('');

  // 5 Options with both text and imageUrl
  const [options, setOptions] = useState<Array<{ text: string; imageUrl: string; isCorrect: boolean }>>([
    { text: '', imageUrl: '', isCorrect: true },
    { text: '', imageUrl: '', isCorrect: false },
    { text: '', imageUrl: '', isCorrect: false },
    { text: '', imageUrl: '', isCorrect: false },
    { text: '', imageUrl: '', isCorrect: false },
  ]);

  // Image file to compressed Base64 converter for direct database storage
  const handleImageFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected if needed
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawUrl = event.target?.result as string;
      if (!rawUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 850;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill crisp white background so transparent diagram PNGs don't turn black
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.78);
          onSuccess(compressed);
        } else {
          onSuccess(rawUrl);
        }
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  };

  const [isPending, startTransition] = useTransition();

  const [partitions, setPartitions] = useState<ExamPartition[]>(PARTITIONS);
  const [exams, setExams] = useState<Exam[]>([]);

  // Create PYQ Modal States
  const [isCreatePyqModalOpen, setIsCreatePyqModalOpen] = useState(false);
  const [pyqTitle, setPyqTitle] = useState('');
  const [pyqExamId, setPyqExamId] = useState('exam-ibps-po');
  const [pyqCustomExamTitle, setPyqCustomExamTitle] = useState('');
  const [pyqCustomExamCategory, setPyqCustomExamCategory] = useState<'PO' | 'CLERK' | 'SO' | 'OTHER'>('PO');
  const [pyqYear, setPyqYear] = useState<number | ''>(new Date().getFullYear());
  const [pyqDuration, setPyqDuration] = useState(60);
  const [pyqMarks, setPyqMarks] = useState(100);
  const [pyqCutoff, setPyqCutoff] = useState(60);
  const [pyqDescription, setPyqDescription] = useState('Authentic Previous Year Question Paper with official questions.');
  const [pyqPreset, setPyqPreset] = useState<'PRELIMS_3' | 'MAINS_4'>('PRELIMS_3');

  const activePartition = partitions.find(p => p.id === activePartitionId) || partitions[0] || PARTITIONS[0];

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await getAdminQuestions({
        search: search || undefined,
        partition: activePartitionId !== 'ALL' ? activePartitionId : undefined,
        examId: examId !== 'ALL' ? examId : undefined,
        sectionCode: sectionCode !== 'ALL' ? sectionCode : undefined,
        difficulty: difficulty !== 'ALL' ? difficulty : undefined,
      });
      setQuestions(data);
    } catch (e) {
      console.error('Failed to load questions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const partParam = urlParams.get('partition');
      if (partParam) {
        setActivePartitionId(partParam);
      }
    }

    const loadMeta = async () => {
      try {
        const [parts, examsList] = await Promise.all([
          getAdminPartitions(),
          getAdminExams(),
        ]);
        if (parts && parts.length > 0) setPartitions(parts);
        if (examsList && examsList.length > 0) setExams(examsList);
      } catch (err) {
        console.warn('Failed to load partitions or exams:', err);
      }
    };
    loadMeta();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [activePartitionId, search, examId, sectionCode, difficulty]);

  const handleCreatePyqFromModal = (e: React.FormEvent) => {
    e.preventDefault();

    let sections = [
      { code: 'ENGLISH', name: 'English Language', questionCount: 30, marks: 30 },
      { code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 35, marks: 35 },
      { code: 'REASONING', name: 'Reasoning Ability', questionCount: 35, marks: 35 },
    ];

    if (pyqPreset === 'MAINS_4') {
      sections = [
        { code: 'REASONING', name: 'Reasoning & Computer Aptitude', questionCount: 45, marks: 60 },
        { code: 'ENGLISH', name: 'English Language', questionCount: 35, marks: 40 },
        { code: 'QUANT', name: 'Data Analysis & Interpretation', questionCount: 35, marks: 60 },
        { code: 'FINANCIAL_AWARENESS', name: 'General / Banking Awareness', questionCount: 40, marks: 40 },
      ];
    }

    const inputData: AdminMockTestInput = {
      title: pyqTitle.trim(),
      slug: pyqTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-pyq',
      description: pyqDescription.trim(),
      examId: pyqExamId === '__NEW_EXAM__' ? 'exam-custom' : pyqExamId,
      customExamTitle: pyqExamId === '__NEW_EXAM__' ? pyqCustomExamTitle.trim() : undefined,
      customExamCategory: pyqExamId === '__NEW_EXAM__' ? pyqCustomExamCategory : undefined,
      durationMinutes: Number(pyqDuration),
      totalMarks: Number(pyqMarks),
      cutoffMarks: Number(pyqCutoff),
      isFree: true,
      isPyq: true,
      year: pyqYear !== '' ? Number(pyqYear) : new Date().getFullYear(),
      sections,
    };

    startTransition(async () => {
      const res = await createMockTestAction(inputData);
      if (res.success && res.test) {
        const parts = await getAdminPartitions();
        setPartitions(parts);
        setActivePartitionId(res.test.id);
        setIsCreatePyqModalOpen(false);
        setFeedback({
          text: `PYQ Paper "${res.test.title}" created successfully! Click "Add Question to this Exam" below to start adding questions.`,
          type: 'success',
        });
        setPyqTitle('');
        setPyqCustomExamTitle('');
      } else {
        setFeedback({ text: res.error || 'Failed to create PYQ paper.', type: 'error' });
      }
    });
  };

  const openCreateModal = (targetPartition?: ExamPartition) => {
    const part = targetPartition || (activePartitionId !== 'ALL' ? activePartition : null);

    setEditingQuestionId(null);
    setFormExamId(part && part.examId !== 'ALL' ? part.examId : 'exam-ibps-po');
    setFormSectionCode('QUANT');
    setFormTopicName(part?.isPyq ? 'Previous Year Official' : 'Number Series');
    setFormText('');
    setFormDifficulty('MEDIUM');
    setFormExplanation('');
    setFormMarks(1.0);
    setFormNegativeMarks(0.25);
    setFormImageUrl('');
    setFormPassage('');
    setFormPassageImageUrl('');
    setFormGroupId('');
    setFormIsPyq(Boolean(part?.isPyq));
    setFormPyqYear(part?.pyqYear || (part?.isPyq ? 2024 : ''));
    setFormPyqExam(part?.isPyq ? part.title : '');
    setOptions([
      { text: '', imageUrl: '', isCorrect: true },
      { text: '', imageUrl: '', isCorrect: false },
      { text: '', imageUrl: '', isCorrect: false },
      { text: '', imageUrl: '', isCorrect: false },
      { text: '', imageUrl: '', isCorrect: false },
    ]);
    setIsEditModalOpen(true);
  };

  const openEditModal = (q: Question) => {
    setEditingQuestionId(q.id);
    setFormExamId(q.examId);
    setFormSectionCode(q.sectionCode);
    setFormTopicName(q.topicName);
    setFormText(q.text);
    setFormDifficulty(q.difficulty);
    setFormExplanation(q.explanation);
    setFormMarks(q.marks);
    setFormNegativeMarks(q.negativeMarks);
    setFormImageUrl(q.imageUrl || '');
    setFormPassage(q.passage || '');
    setFormPassageImageUrl(q.passageImageUrl || '');
    setFormGroupId(q.groupId || '');
    setFormIsPyq(Boolean(q.isPyq));
    setFormPyqYear(q.pyqYear || '');
    setFormPyqExam(q.pyqExam || '');
    setOptions(
      q.options.map(opt => ({
        text: opt.text || '',
        imageUrl: opt.imageUrl || '',
        isCorrect: opt.isCorrect,
      }))
    );
    setIsEditModalOpen(true);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim()) return;

    const inputData: AdminQuestionInput = {
      examId: formExamId,
      sectionCode: formSectionCode,
      topicName: formTopicName,
      text: formText,
      difficulty: formDifficulty,
      explanation: formExplanation,
      marks: Number(formMarks),
      negativeMarks: Number(formNegativeMarks),
      imageUrl: formImageUrl.trim() || undefined,
      passage: formPassage.trim() || undefined,
      passageImageUrl: formPassageImageUrl.trim() || undefined,
      groupId: formGroupId.trim() || undefined,
      isPyq: formIsPyq,
      pyqYear: formPyqYear !== '' ? Number(formPyqYear) : undefined,
      pyqExam: formPyqExam.trim() || undefined,
      mockTestId: activePartitionId !== 'ALL' ? activePartitionId : undefined,
      options: options.map(o => ({
        text: o.text.trim(),
        imageUrl: o.imageUrl.trim() || undefined,
        isCorrect: o.isCorrect,
      })),
    };

    startTransition(async () => {
      let res: { success: boolean; error?: string } | undefined;
      try {
        if (editingQuestionId) {
          res = await updateQuestionAction(editingQuestionId, inputData);
          if (!res?.success) {
            // Direct API route fallback for large payloads / proxies
            const apiRes = await fetch('/api/admin/questions/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ questionId: editingQuestionId, inputData }),
            });
            res = await apiRes.json();
          }
        } else {
          res = await createQuestionAction(inputData);
        }
      } catch (saveErr) {
        console.warn('Server Action save error, falling back to API route:', saveErr);
        if (editingQuestionId) {
          try {
            const apiRes = await fetch('/api/admin/questions/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ questionId: editingQuestionId, inputData }),
            });
            res = await apiRes.json();
          } catch (apiErr) {
            res = { success: false, error: apiErr instanceof Error ? apiErr.message : String(apiErr) };
          }
        } else {
          res = { success: false, error: saveErr instanceof Error ? saveErr.message : String(saveErr) };
        }
      }

      if (res?.success) {
        setFeedback({
          text: `Question successfully ${editingQuestionId ? 'updated' : 'created'} and saved to Database.`,
          type: 'success',
        });
        setIsEditModalOpen(false);
        await loadQuestions();
      } else {
        setFeedback({ text: res?.error || 'Failed to save question to database.', type: 'error' });
      }
    });
  };

  const handleDeleteQuestion = () => {
    if (!deletingQuestion) return;

    startTransition(async () => {
      const res = await deleteQuestionAction(deletingQuestion.id);
      if (res.success) {
        setFeedback({ text: 'Question deleted successfully.', type: 'success' });
        setIsDeleteModalOpen(false);
        setDeletingQuestion(null);
        await loadQuestions();
      } else {
        setFeedback({ text: res.error || 'Failed to delete question.', type: 'error' });
      }
    });
  };

  return (
    <div className="pb-16 bg-slate-50/50 min-h-screen">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-4">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="purple" size="sm">QUESTION BANK & EXAM PARTITIONS</Badge>
              <span className="text-xs text-slate-500 font-medium">• {questions.length} Questions Displayed</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Question Management & Partitions
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl">
              Curate, edit, and assign fixed questions for each exam session. Fully supports images in questions, passages, and options, with dedicated partitions for Previous Year Papers (2024 & 2023) and practice mocks.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              variant="primary"
              size="md"
              onClick={() => openCreateModal()}
              className="flex items-center gap-1.5 shadow-xs w-full sm:w-auto justify-center"
            >
              <PlusCircle className="w-4 h-4" />
              {activePartitionId !== 'ALL' ? `Add to ${activePartition.label}` : 'Add New Question'}
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Partition Tabs Selector */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Exam Partitions & Sessions:
              </span>
              <span className="text-[11px] text-slate-400 hidden md:inline">
                • Select a partition to view, edit, or add fixed questions for that specific exam
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreatePyqModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold border-purple-300 text-purple-700 hover:bg-purple-50 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              + Create New PYQ Paper
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {partitions.map(partition => {
              const isActive = activePartitionId === partition.id;
              return (
                <button
                  key={partition.id}
                  onClick={() => setActivePartitionId(partition.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {partition.category === 'PYQ' && (
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-amber-300' : 'bg-purple-600'}`} />
                  )}
                  <span>{partition.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {partition.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Exam Partition Banner (When specific exam selected) */}
        {activePartitionId !== 'ALL' && (
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-amber-400 text-amber-950 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md shadow-xs">
                  {activePartition.category === 'PYQ' ? 'Official Previous Year Paper' : 'Fixed Exam Session'}
                </span>
                {activePartition.pyqYear && (
                  <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Year {activePartition.pyqYear}
                  </span>
                )}
                <span className="bg-indigo-700/80 text-indigo-100 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                  {questions.length} Questions (Fixed Paper)
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activePartition.title}
              </h2>
              <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed">
                {activePartition.description}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => openCreateModal(activePartition)}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold border-none shadow-sm flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" /> Add Question to this Exam
              </Button>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search question statement or topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Target Exams</option>
              <option value="exam-ibps-po">IBPS PO</option>
              <option value="exam-sbi-clerk">SBI Clerk</option>
            </select>
          </div>

          <div>
            <select
              value={sectionCode}
              onChange={(e) => setSectionCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Sections</option>
              <option value="QUANT">Quantitative / Numerical</option>
              <option value="REASONING">Reasoning Ability</option>
              <option value="ENGLISH">English Language</option>
              <option value="FINANCIAL_AWARENESS">General / Banking Awareness</option>
            </select>
          </div>

          <div>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading exam questions...
            </div>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No questions found matching your filter.</p>
              <p className="text-xs text-slate-400">Try adjusting your search criteria or add a new question.</p>
              <Button variant="primary" size="sm" onClick={() => openCreateModal()}>
                + Add Question
              </Button>
            </div>
          ) : (
            questions.map((q, idx) => (
              <Card key={q.id} className="border border-slate-200 hover:border-slate-300 transition-colors shadow-xs">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  {/* Card Header Info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md">
                        #{idx + 1}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">
                        ID: {q.id}
                      </span>
                      <Badge variant="blue" size="sm">{q.sectionName}</Badge>
                      <Badge variant="slate" size="sm">Topic: {q.topicName}</Badge>
                      <Badge
                        variant={q.difficulty === 'HARD' ? 'red' : q.difficulty === 'MEDIUM' ? 'amber' : 'green'}
                        size="sm"
                      >
                        {q.difficulty}
                      </Badge>
                      {q.isPyq && (
                        <span className="text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                          PYQ {q.pyqYear || ''}
                        </span>
                      )}
                      {(q.imageUrl || q.passageImageUrl || q.options.some(o => o.imageUrl)) && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> Has Images
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">
                        +{q.marks} / -{q.negativeMarks} Marks
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(q)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600"
                        title="Edit question and options"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => { setDeletingQuestion(q); setIsDeleteModalOpen(true); }}
                        className="p-1.5"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Interlinked Directions / Comprehension Passage */}
                  {(q.passage || q.passageImageUrl) && (
                    <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3.5 space-y-2 text-xs text-slate-700">
                      <div className="font-bold text-indigo-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Passage / Puzzle Context {q.groupId ? `(${q.groupId})` : ''}</span>
                      </div>
                      {q.passage && (
                        <div className="line-clamp-3 hover:line-clamp-none transition-all whitespace-pre-line text-slate-600 leading-relaxed font-normal">
                          {q.passage}
                        </div>
                      )}
                      {q.passageImageUrl && (
                        <div className="pt-2 border-t border-indigo-100">
                          <span className="text-[10px] font-bold text-indigo-900 block mb-1">Passage Reference Diagram:</span>
                          <img
                            src={q.passageImageUrl}
                            alt="Passage Reference Diagram"
                            className="max-h-48 rounded-lg border border-indigo-200 object-contain bg-white shadow-2xs"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Question Text */}
                  <div className="text-sm font-semibold text-slate-900 whitespace-pre-line leading-relaxed">
                    {q.text}
                  </div>

                  {/* Question Image (if any) */}
                  {q.imageUrl && (
                    <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50 max-w-md inline-block shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Question Diagram:
                      </div>
                      <img
                        src={q.imageUrl}
                        alt="Question Diagram"
                        className="max-h-48 rounded-md object-contain bg-white border border-slate-100 p-1"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* 5 Options Preview with images */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    {q.options.map((opt, i) => (
                      <div
                        key={opt.id || i}
                        className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 ${
                          opt.isCorrect
                            ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 font-semibold'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span>
                            <strong className="mr-1.5 text-slate-500">{String.fromCharCode(65 + i)}.</strong>
                            {opt.text || <span className="italic text-slate-400">[Image Option]</span>}
                          </span>
                          {opt.isCorrect && (
                            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                              Correct
                            </span>
                          )}
                        </div>
                        {opt.imageUrl && (
                          <div className="mt-1 border border-slate-200 rounded p-1 bg-white inline-block max-w-[180px]">
                            <img
                              src={opt.imageUrl}
                              alt={`Option ${String.fromCharCode(65 + i)}`}
                              className="max-h-20 rounded object-contain"
                              loading="lazy"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step-by-Step Explanation */}
                  {q.explanation && (
                    <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                      <span className="font-bold text-slate-700">Explanation: </span>
                      {q.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Question Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={
          editingQuestionId
            ? 'Edit Exam Question'
            : activePartitionId !== 'ALL'
            ? `Add Question to ${activePartition.label}`
            : 'Create New Question'
        }
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
          {/* Section 1: Exam & Subject Categorization */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Exam & Section Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Exam</label>
                <select
                  value={formExamId}
                  onChange={(e) => setFormExamId(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="exam-ibps-po">IBPS PO</option>
                  <option value="exam-sbi-clerk">SBI Clerk</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Section</label>
                <select
                  value={formSectionCode}
                  onChange={(e) => setFormSectionCode(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="QUANT">Quantitative / Numerical</option>
                  <option value="REASONING">Reasoning Ability</option>
                  <option value="ENGLISH">English Language</option>
                  <option value="FINANCIAL_AWARENESS">General / Banking Awareness</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Topic Name</label>
                <input
                  type="text"
                  required
                  value={formTopicName}
                  onChange={(e) => setFormTopicName(e.target.value)}
                  placeholder="e.g. Syllogism / Reading Comprehension"
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Difficulty</label>
                <select
                  value={formDifficulty}
                  onChange={(e) => setFormDifficulty(e.target.value as Difficulty)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>

            {/* PYQ Assignment */}
            <div className="pt-2 border-t border-slate-200/80 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsPyq}
                  onChange={(e) => setFormIsPyq(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                />
                <span className="font-semibold text-slate-800">
                  This is a Previous Year Official Question (PYQ)
                </span>
              </label>

              {formIsPyq && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">PYQ Year</label>
                    <input
                      type="number"
                      value={formPyqYear}
                      onChange={(e) => setFormPyqYear(e.target.value ? Number(e.target.value) : '')}
                      placeholder="e.g. 2024 or 2023"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">PYQ Official Exam Name</label>
                    <input
                      type="text"
                      value={formPyqExam}
                      onChange={(e) => setFormPyqExam(e.target.value)}
                      placeholder="e.g. SBI Clerk Prelims 2024"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Passage / Puzzle Context */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                Reading Passage / Interlinked Context (Optional)
              </span>
              <span className="text-[10px] text-slate-400 font-normal">For RC, DI & Puzzles</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Passage / Directions Text</label>
              <textarea
                rows={3}
                value={formPassage}
                onChange={(e) => setFormPassage(e.target.value)}
                placeholder="Paste reading comprehension text or puzzle directions here..."
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-slate-700 block mb-1">Passage / DI Reference Diagram</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg cursor-pointer text-xs font-semibold shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload from Device</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFileChange(e, (dataUrl) => setFormPassageImageUrl(dataUrl))}
                  />
                </label>
                <input
                  type="text"
                  value={formPassageImageUrl}
                  onChange={(e) => setFormPassageImageUrl(e.target.value)}
                  placeholder="Or paste image URL / Base64..."
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
                {formPassageImageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormPassageImageUrl('')}
                    className="text-red-600 hover:bg-red-50 text-xs py-1"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="pt-1">
                <label className="font-semibold text-slate-700 block mb-1">Context Group ID (Optional)</label>
                <input
                  type="text"
                  value={formGroupId}
                  onChange={(e) => setFormGroupId(e.target.value)}
                  placeholder="e.g. Directions (Q. 1-5)"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            {formPassageImageUrl && (
              <div className="border border-slate-200 rounded-lg p-2 bg-white inline-block">
                <span className="text-[10px] text-slate-500 font-bold block mb-1">Passage Diagram Preview:</span>
                <img
                  src={formPassageImageUrl}
                  alt="Passage Preview"
                  className="max-h-36 rounded object-contain"
                />
              </div>
            )}
          </div>

          {/* Section 3: Question Statement & Diagram */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Question Statement & Diagram</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Question Text <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="Enter complete question statement..."
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Question Image / Diagram</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg cursor-pointer text-xs font-semibold shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload from Device</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFileChange(e, (dataUrl) => setFormImageUrl(dataUrl))}
                  />
                </label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="Or paste image URL / Base64..."
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
                {formImageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormImageUrl('')}
                    className="text-red-600 hover:bg-red-50 text-xs py-1"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {formImageUrl && (
                <div className="mt-2 border border-slate-200 rounded-lg p-2 bg-white inline-block">
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">Question Diagram Preview:</span>
                  <img
                    src={formImageUrl}
                    alt="Question Diagram Preview"
                    className="max-h-36 rounded object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 4: 5 Multiple Choice Options (Text AND Images) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                5 Options (Select radio for correct answer)
              </span>
              <span className="text-[10px] text-slate-500">Supports text, image, or both</span>
            </div>

            <div className="space-y-3">
              {options.map((opt, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border transition-colors ${
                    opt.isCorrect
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={opt.isCorrect}
                      onChange={() => {
                        setOptions(prev => prev.map((o, idx) => ({ ...o, isCorrect: idx === i })));
                      }}
                      className="w-4 h-4 text-indigo-600 cursor-pointer"
                    />
                    <span className="font-black text-slate-700 w-5">
                      {String.fromCharCode(65 + i)}:
                    </span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, text: val } : o));
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)} text`}
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                    {opt.isCorrect && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Correct
                      </span>
                    )}
                  </div>

                  {/* Option Image Upload / URL Field */}
                  <div className="pl-6 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <div className="flex-1 flex flex-wrap items-center gap-2 w-full">
                      <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md cursor-pointer text-[11px] font-semibold shrink-0">
                        <Upload className="w-3 h-3 text-indigo-600" />
                        <span>Upload Option Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileChange(e, (dataUrl) => {
                            setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, imageUrl: dataUrl } : o));
                          })}
                        />
                      </label>
                      <input
                        type="text"
                        value={opt.imageUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, imageUrl: val } : o));
                        }}
                        placeholder={`Or paste image URL / Base64 for Option ${String.fromCharCode(65 + i)}`}
                        className="flex-1 min-w-[180px] px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-700 focus:bg-white"
                      />
                      {opt.imageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, imageUrl: '' } : o));
                          }}
                          className="text-[10px] text-red-600 hover:underline shrink-0 font-semibold"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {opt.imageUrl && (
                      <div className="border border-slate-200 rounded p-1 bg-white inline-block shrink-0">
                        <img
                          src={opt.imageUrl}
                          alt={`Option ${String.fromCharCode(65 + i)} preview`}
                          className="max-h-16 rounded object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Explanation & Scoring */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Step-by-Step Solution & Explanation <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={formExplanation}
                onChange={(e) => setFormExplanation(e.target.value)}
                placeholder="Enter complete step-by-step solution..."
                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Marks (+)</label>
                <input
                  type="number"
                  step="0.25"
                  value={formMarks}
                  onChange={(e) => setFormMarks(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Negative Penalty (-)</label>
                <input
                  type="number"
                  step="0.25"
                  value={formNegativeMarks}
                  onChange={(e) => setFormNegativeMarks(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 sticky bottom-0 bg-white p-2">
            <Button variant="secondary" size="md" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={isPending}>
              {editingQuestionId ? 'Save Changes' : 'Create Question'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingQuestion && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Question Deletion"
          footer={
            <>
              <Button variant="secondary" size="md" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="md" isLoading={isPending} onClick={handleDeleteQuestion}>
                Delete Question
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>Are you sure you want to permanently delete this question from the repository?</span>
            </div>
            <p className="font-medium text-slate-900 line-clamp-3 italic">
              "{deletingQuestion.text}"
            </p>
          </div>
        </Modal>
      )}

      {/* Create PYQ Paper Modal */}
      <Modal
        isOpen={isCreatePyqModalOpen}
        onClose={() => setIsCreatePyqModalOpen(false)}
        title="Create New PYQ Paper & Dedicated Partition"
      >
        <form onSubmit={handleCreatePyqFromModal} className="space-y-4 text-xs">
          <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              Create an official Previous Year Question (PYQ) paper under any existing or custom exam. A dedicated partition will be created immediately, allowing you to add, manage, and curate official questions for this exact paper.
            </span>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Select Exam or Title a New One <span className="text-red-500">*</span>
            </label>
            <select
              value={pyqExamId}
              onChange={(e) => setPyqExamId(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.category})
                </option>
              ))}
              <option value="__NEW_EXAM__">+ Create New Exam (Title it anything)...</option>
            </select>
          </div>

          {pyqExamId === '__NEW_EXAM__' && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
              <div>
                <label className="font-bold text-indigo-950 block mb-1">
                  Custom Exam Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pyqCustomExamTitle}
                  onChange={(e) => setPyqCustomExamTitle(e.target.value)}
                  placeholder="e.g. IBPS RRB Officer Scale 1, RBI Assistant, SBI PO, LIC AAO..."
                  className="w-full px-2.5 py-2 bg-white border border-indigo-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-indigo-950 block mb-1">Category</label>
                <select
                  value={pyqCustomExamCategory}
                  onChange={(e) => setPyqCustomExamCategory(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs"
                >
                  <option value="PO">PO (Probationary Officer / Scale 1)</option>
                  <option value="CLERK">Clerk (Junior Associate / Assistant)</option>
                  <option value="SO">SO (Specialist Officer)</option>
                  <option value="OTHER">Other Banking / Insurance</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Paper Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                value={pyqYear}
                onChange={(e) => setPyqYear(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 2024, 2023, 2022"
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Exam Preset
              </label>
              <select
                value={pyqPreset}
                onChange={(e) => {
                  const val = e.target.value as 'PRELIMS_3' | 'MAINS_4';
                  setPyqPreset(val);
                  if (val === 'PRELIMS_3') {
                    setPyqDuration(60);
                    setPyqMarks(100);
                    setPyqCutoff(60);
                  } else {
                    setPyqDuration(180);
                    setPyqMarks(200);
                    setPyqCutoff(90);
                  }
                }}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
              >
                <option value="PRELIMS_3">Prelims Standard (3 Sections: Eng 30, Quant 35, Reas 35 — 100 M / 60 Min)</option>
                <option value="MAINS_4">Mains Standard (4 Sections: Reas 45, Eng 35, Quant 35, GA 40 — 200 M / 180 Min)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              PYQ Paper Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={pyqTitle}
              onChange={(e) => setPyqTitle(e.target.value)}
              placeholder="e.g. IBPS RRB PO 2023 Prelims - Shift 1 Official Question Paper"
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Description / Notes</label>
            <textarea
              required
              rows={2}
              value={pyqDescription}
              onChange={(e) => setPyqDescription(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Duration (Min)</label>
              <input
                type="number"
                value={pyqDuration}
                onChange={(e) => setPyqDuration(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Total Marks</label>
              <input
                type="number"
                value={pyqMarks}
                onChange={(e) => setPyqMarks(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Cutoff Marks</label>
              <input
                type="number"
                value={pyqCutoff}
                onChange={(e) => setPyqCutoff(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button variant="secondary" size="md" type="button" onClick={() => setIsCreatePyqModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={isPending} className="bg-purple-600 hover:bg-purple-700">
              Create PYQ & Open Partition
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
