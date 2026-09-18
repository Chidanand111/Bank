'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  getAdminMockTests,
  getAdminExams,
  createMockTestAction,
  deleteMockTestAction,
  updateMockTestTitleAction,
} from '@/lib/services/adminService';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminMockTestInput, Exam, MockTest } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Award,
  PlusCircle,
  Trash2,
  Edit2,
  Clock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calendar,
  Sparkles,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

export default function AdminTestsPage() {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTest, setDeletingTest] = useState<MockTest | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit Test Title State
  const [editingTest, setEditingTest] = useState<MockTest | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [examId, setExamId] = useState('exam-ibps-po');
  const [customExamTitle, setCustomExamTitle] = useState('');
  const [customExamCategory, setCustomExamCategory] = useState<'PO' | 'CLERK' | 'SO' | 'OTHER'>('PO');
  const [isPyq, setIsPyq] = useState(false);
  const [year, setYear] = useState<number | ''>(new Date().getFullYear());
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalMarks, setTotalMarks] = useState(100);
  const [cutoffMarks, setCutoffMarks] = useState(60);
  const [sectionPreset, setSectionPreset] = useState<'PRELIMS_3' | 'MAINS_4' | 'CUSTOM'>('PRELIMS_3');

  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    try {
      const [testsData, examsData] = await Promise.all([
        getAdminMockTests(),
        getAdminExams(),
      ]);
      setTests(testsData);
      setExams(examsData);
    } catch (e) {
      console.error('Failed to load admin tests or exams:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = (asPyq = false) => {
    setIsPyq(asPyq);
    setYear(asPyq ? new Date().getFullYear() : '');
    setTitle(asPyq ? `SBI Clerk Prelims ${new Date().getFullYear()} - Previous Year Question Paper` : '');
    setSlug('');
    setDescription(asPyq ? 'Authentic Previous Year Exam Paper with fixed official questions and solution breakdowns.' : 'Full-length practice test.');
    setExamId('exam-ibps-po');
    setCustomExamTitle('');
    setSectionPreset('PRELIMS_3');
    setDurationMinutes(60);
    setTotalMarks(100);
    setCutoffMarks(60);
    setIsCreateModalOpen(true);
  };

  // Auto-adjust duration and marks on preset change
  const handlePresetChange = (preset: 'PRELIMS_3' | 'MAINS_4' | 'CUSTOM') => {
    setSectionPreset(preset);
    if (preset === 'PRELIMS_3') {
      setDurationMinutes(60);
      setTotalMarks(100);
      setCutoffMarks(65);
    } else if (preset === 'MAINS_4') {
      setDurationMinutes(180);
      setTotalMarks(200);
      setCutoffMarks(75);
    }
  };

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();

    let sections = [
      { code: 'ENGLISH', name: 'English Language', questionCount: 30, marks: 30 },
      { code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 35, marks: 35 },
      { code: 'REASONING', name: 'Reasoning Ability', questionCount: 35, marks: 35 },
    ];

    if (sectionPreset === 'MAINS_4') {
      sections = [
        { code: 'REASONING', name: 'Reasoning & Computer Aptitude', questionCount: 45, marks: 60 },
        { code: 'ENGLISH', name: 'English Language', questionCount: 35, marks: 40 },
        { code: 'QUANT', name: 'Data Analysis & Interpretation', questionCount: 35, marks: 60 },
        { code: 'FINANCIAL_AWARENESS', name: 'General / Banking Awareness', questionCount: 40, marks: 40 },
      ];
    }

    const inputData: AdminMockTestInput = {
      title,
      slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description,
      examId: examId === '__NEW_EXAM__' ? 'exam-custom' : examId,
      customExamTitle: examId === '__NEW_EXAM__' ? customExamTitle.trim() : undefined,
      customExamCategory: examId === '__NEW_EXAM__' ? customExamCategory : undefined,
      durationMinutes: Number(durationMinutes),
      totalMarks: Number(totalMarks),
      cutoffMarks: Number(cutoffMarks),
      isFree: true,
      isPyq: Boolean(isPyq),
      year: isPyq && year ? Number(year) : undefined,
      sections,
    };

    startTransition(async () => {
      const res = await createMockTestAction(inputData);
      if (res.success) {
        setFeedback({
          text: `${isPyq ? 'Previous Year Paper (PYQ)' : 'Mock Test Suite'} created successfully. You can now add fixed questions to it!`,
          type: 'success',
        });
        setIsCreateModalOpen(false);
        await loadData();
      } else {
        setFeedback({ text: res.error || 'Failed to create test.', type: 'error' });
      }
    });
  };

  const handleDeleteTest = () => {
    if (!deletingTest) return;

    startTransition(async () => {
      const res = await deleteMockTestAction(deletingTest.id);
      if (res.success) {
        const countMsg = res.count ? ` and ${res.count} associated question(s)` : '';
        setFeedback({
          text: `Exam paper "${deletingTest.title}"${countMsg} were permanently deleted from the database to save storage space.`,
          type: 'success',
        });
        setIsDeleteModalOpen(false);
        setDeletingTest(null);
        await loadData();
      } else {
        setFeedback({ text: res.error || 'Failed to delete test.', type: 'error' });
      }
    });
  };

  const openEditModal = (test: MockTest) => {
    setEditingTest(test);
    setEditTitle(test.title);
    setEditDescription(test.description || '');
  };

  const handleUpdateTestTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest) return;

    startTransition(async () => {
      const res = await updateMockTestTitleAction(editingTest.id, editTitle, editDescription);
      if (res.success) {
        setFeedback({ type: 'success', text: `Paper title updated to "${editTitle}" successfully.` });
        setEditingTest(null);
        await loadData();
      } else {
        setFeedback({ type: 'error', text: res.error || 'Failed to update paper title.' });
      }
    });
  };

  return (
    <div className="pb-16">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="purple" size="sm">EXAM SUITES & PYQ PAPERS</Badge>
              <span className="text-xs text-slate-500">• {tests.length} Total Papers</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Mock Test & PYQ Paper Management
            </h1>
            <p className="text-sm text-slate-600">
              Create official Previous Year Question Papers (PYQs) or standard practice tests, title any exam, configure duration and sectional patterns, and manage questions directly.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              onClick={() => openCreateModal(true)}
              className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 flex items-center gap-1.5 shadow-xs font-bold"
            >
              <Calendar className="w-4 h-4 text-purple-600" /> Create PYQ Paper
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => openCreateModal(false)}
              className="flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-4 h-4" /> Create Mock Test
            </Button>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Tests List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tests.map((test) => (
            <Card key={test.id} className="border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={test.isPyq ? 'purple' : 'blue'} size="sm">
                      {test.examTitle}
                    </Badge>
                    {test.isPyq && (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                        PYQ {test.year || ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(test)}
                      className="p-1.5 text-slate-600 hover:text-indigo-600 border-slate-200"
                      title="Edit this paper title"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => { setDeletingTest(test); setIsDeleteModalOpen(true); }}
                      className="p-1.5"
                      title="Delete this test paper"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">{test.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{test.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs text-slate-600">
                  <div className="text-center p-1.5 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Duration</span>
                    <span className="font-bold text-slate-800">{test.durationMinutes} mins</span>
                  </div>
                  <div className="text-center p-1.5 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Total Marks</span>
                    <span className="font-bold text-slate-800">{test.totalMarks}</span>
                  </div>
                  <div className="text-center p-1.5 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Questions</span>
                    <span className="font-bold text-indigo-700">{test.totalQuestions || test.questions?.length || 100} Qs</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                    Configured Sections ({test.sections.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {test.sections.map(s => (
                      <span key={s.code} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                        {s.name} ({s.questionCount} Qs)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Direct Action Links */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                  <Link
                    href={`/admin/questions?partition=${encodeURIComponent(test.id)}`}
                    className="flex-1 text-center py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Manage Questions ({test.questions?.length || test.totalQuestions || 0})
                  </Link>

                  <Link
                    href={`/test/${encodeURIComponent(test.slug || test.id)}`}
                    target="_blank"
                    className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    title="Preview Live Test Interface"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={isPyq ? 'Create Previous Year Question Paper (PYQ)' : 'Create New Mock Test Suite'}
      >
        <form onSubmit={handleCreateTest} className="space-y-4 text-xs">
          {/* Paper Type Toggle */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 block text-xs">Previous Year Question Paper (PYQ)?</span>
              <span className="text-[11px] text-slate-500">Marks this exam paper as an authentic official memory-based test</span>
            </div>
            <input
              type="checkbox"
              checked={isPyq}
              onChange={(e) => setIsPyq(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
            />
          </div>

          {/* Exam Selection / Custom Exam Creation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 block">Target Exam</label>
              <span className="text-[11px] text-indigo-600 font-semibold">Choose existing or create any custom exam title</span>
            </div>
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
              <option value="__NEW_EXAM__">➕ Create New Exam (Title it anything)...</option>
            </select>
          </div>

          {/* New Exam Input if selected */}
          {examId === '__NEW_EXAM__' && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5">
              <div>
                <label className="font-bold text-indigo-950 block mb-1">New Exam Title</label>
                <input
                  type="text"
                  required
                  value={customExamTitle}
                  onChange={(e) => setCustomExamTitle(e.target.value)}
                  placeholder="e.g. IBPS RRB Officer Scale 1, RBI Assistant, SBI PO, LIC AAO..."
                  className="w-full px-2.5 py-2 bg-white border border-indigo-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-indigo-950 block mb-1">Category</label>
                <select
                  value={customExamCategory}
                  onChange={(e) => setCustomExamCategory(e.target.value as any)}
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

          {/* PYQ Year (if PYQ) */}
          {isPyq && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Exam Paper Year</label>
              <input
                type="number"
                required
                value={year}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 2022, 2023, 2024"
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Paper Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isPyq ? 'e.g. SBI Clerk Prelims 2022 - Previous Year Question Paper' : 'e.g. IBPS PO Prelims Speed Drill Mock 3'}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Slug (URL identifier)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Leave blank to auto-generate from title"
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Description</label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paper overview, instructions, and syllabus coverage..."
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          {/* Section Pattern Preset */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Exam Pattern & Sections</label>
            <select
              value={sectionPreset}
              onChange={(e) => handlePresetChange(e.target.value as any)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
            >
              <option value="PRELIMS_3">Prelims Standard (3 Sections: English 30, Quant 35, Reasoning 35 — 100 Qs / 60 Mins)</option>
              <option value="MAINS_4">Mains Standard (4 Sections: Reasoning 45, English 35, Quant/DI 35, GA 40 — 155 Qs / 180 Mins)</option>
              <option value="CUSTOM">Custom Timing & Marks</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Duration (Mins)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Total Marks</label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Cut-Off Mark</label>
              <input
                type="number"
                step="0.5"
                value={cutoffMarks}
                onChange={(e) => setCutoffMarks(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="md" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {isPyq ? 'Publish PYQ Paper' : 'Create Test Suite'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingTest && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Exam Paper & Reclaim Database Storage"
          footer={
            <>
              <Button variant="secondary" size="md" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="md" isLoading={isPending} onClick={handleDeleteTest} className="font-bold">
                Delete Exam & All Questions
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3.5 bg-red-50 text-red-800 border border-red-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-900">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>Confirm Permanent Deletion to Save DB Storage</span>
              </div>
              <p>
                Are you sure you want to permanently delete <strong className="font-extrabold underline">{deletingTest.title}</strong>?
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                <li>All questions and options in this exam paper will be deleted to save space</li>
                <li>All student attempts and score analytics for this paper will be cleared</li>
              </ul>
            </div>
            <p className="text-slate-500 text-[11px] italic">
              Questions and associated data will be removed from Neon PostgreSQL and caches to free database space.
            </p>
          </div>
        </Modal>
      )}

      {/* Edit Test Title Modal */}
      {editingTest && (
        <Modal
          isOpen={Boolean(editingTest)}
          onClose={() => setEditingTest(null)}
          title="Edit Paper / Session Title"
        >
          <form onSubmit={handleUpdateTestTitle} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Paper Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. IBPS RRB PO 2024 Prelims Mock 1"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Description</label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                placeholder="Paper instructions, syllabus details, and structure..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="md" type="button" onClick={() => setEditingTest(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={isPending} className="bg-indigo-600 hover:bg-indigo-700">
                Save Paper Title
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
