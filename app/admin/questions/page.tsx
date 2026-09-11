'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  getAdminQuestions,
  createQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
} from '@/lib/services/adminService';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminQuestionInput, Difficulty, Question } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  HelpCircle,
  PlusCircle,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Filter
} from 'lucide-react';

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [options, setOptions] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  const [isPending, startTransition] = useTransition();

  const loadQuestions = async () => {
    try {
      const data = await getAdminQuestions({
        search: search || undefined,
        examId: examId !== 'ALL' ? examId : undefined,
        sectionCode: sectionCode !== 'ALL' ? sectionCode : undefined,
        difficulty: difficulty !== 'ALL' ? difficulty : undefined,
      });
      setQuestions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [search, examId, sectionCode, difficulty]);

  const openCreateModal = () => {
    setEditingQuestionId(null);
    setFormExamId('exam-ibps-po');
    setFormSectionCode('QUANT');
    setFormTopicName('Number Series');
    setFormText('');
    setFormDifficulty('MEDIUM');
    setFormExplanation('');
    setFormMarks(1.0);
    setFormNegativeMarks(0.25);
    setFormImageUrl('');
    setOptions([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
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
    setOptions(
      q.options.map(opt => ({ text: opt.text, isCorrect: opt.isCorrect }))
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
      options,
    };

    startTransition(async () => {
      let res;
      if (editingQuestionId) {
        res = await updateQuestionAction(editingQuestionId, inputData);
      } else {
        res = await createQuestionAction(inputData);
      }

      if (res.success) {
        setFeedback({ text: `Question successfully ${editingQuestionId ? 'updated' : 'created'}.`, type: 'success' });
        setIsEditModalOpen(false);
        await loadQuestions();
      } else {
        setFeedback({ text: res.error || 'Failed to save question.', type: 'error' });
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
    <div className="pb-16">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="purple" size="sm">QUESTION BANK REPOSITORY</Badge>
              <span className="text-xs text-slate-500">• {questions.length} Items</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Question Management
            </h1>
            <p className="text-sm text-slate-600">
              Create, curate, edit, and delete questions with 5-option multiple-choice formatting, step-by-step explanations, and diagrams.
            </p>
          </div>

          <Button variant="primary" size="md" onClick={openCreateModal} className="flex items-center gap-1.5 shadow-xs">
            <PlusCircle className="w-4 h-4" /> Add New Question
          </Button>
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

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search question or topic..."
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
              <option value="ALL">All Exams</option>
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
          {questions.map((q, idx) => (
            <Card key={q.id} className="border border-slate-200 hover:border-slate-300 transition-colors">
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                      #{idx + 1}
                    </span>
                    <Badge variant="blue" size="sm">{q.sectionName}</Badge>
                    <Badge variant="slate" size="sm">Topic: {q.topicName}</Badge>
                    <Badge variant={q.difficulty === 'HARD' ? 'red' : q.difficulty === 'MEDIUM' ? 'amber' : 'green'} size="sm">
                      {q.difficulty}
                    </Badge>
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
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => { setDeletingQuestion(q); setIsDeleteModalOpen(true); }}
                      className="p-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="text-sm font-medium text-slate-900 whitespace-pre-line leading-relaxed">
                  {q.text}
                </div>

                {/* Options preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  {q.options.map((opt, i) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        opt.isCorrect
                          ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 font-semibold'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>
                        <strong className="mr-1.5 text-slate-500">{String.fromCharCode(65 + i)}.</strong>
                        {opt.text}
                      </span>
                      {opt.isCorrect && (
                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Correct
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Explanation preview */}
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                  <span className="font-bold text-slate-700">Explanation: </span>
                  {q.explanation}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Add / Edit Question Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingQuestionId ? 'Edit Exam Question' : 'Create New Practice Question'}
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Exam</label>
              <select
                value={formExamId}
                onChange={(e) => setFormExamId(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
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
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="QUANT">Quantitative / Numerical</option>
                <option value="REASONING">Reasoning Ability</option>
                <option value="ENGLISH">English Language</option>
                <option value="FINANCIAL_AWARENESS">General / Banking Awareness</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Topic Name</label>
              <input
                type="text"
                required
                value={formTopicName}
                onChange={(e) => setFormTopicName(e.target.value)}
                placeholder="e.g. Syllogism"
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Difficulty</label>
              <select
                value={formDifficulty}
                onChange={(e) => setFormDifficulty(e.target.value as Difficulty)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Question Text</label>
            <textarea
              required
              rows={3}
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              placeholder="Enter full question statement..."
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          {/* 5 Options */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-700 block">
              Options (Select Radio for Correct Answer)
            </label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctOption"
                  checked={opt.isCorrect}
                  onChange={() => {
                    setOptions(prev => prev.map((o, idx) => ({ ...o, isCorrect: idx === i })));
                  }}
                  className="w-4 h-4 text-indigo-600 cursor-pointer"
                />
                <span className="font-bold text-slate-500 w-4">{String.fromCharCode(65 + i)}:</span>
                <input
                  type="text"
                  required
                  value={opt.text}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, text: val } : o));
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + i)} text`}
                  className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Step-by-Step Explanation</label>
            <textarea
              required
              rows={2}
              value={formExplanation}
              onChange={(e) => setFormExplanation(e.target.value)}
              placeholder="Enter complete step-by-step solution..."
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
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
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Negative Penalty (-)</label>
              <input
                type="number"
                step="0.25"
                value={formNegativeMarks}
                onChange={(e) => setFormNegativeMarks(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
    </div>
  );
}
