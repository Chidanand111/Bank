'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getAdminExams, updateExamTitleAction, createExamAction, deleteExamAction } from '@/lib/services/adminService';
import { AdminNav } from '@/components/admin/AdminNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Exam, ExamCategory } from '@/types';
import { Edit2, PlusCircle, CheckCircle2, Layers, Trash2, AlertTriangle } from 'lucide-react';

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Modal State
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ExamCategory>('PO');
  const [newDescription, setNewDescription] = useState('');

  // Delete Modal State
  const [deletingExam, setDeletingExam] = useState<Exam | null>(null);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await getAdminExams();
      setExams(data);
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const openEditModal = (exam: Exam) => {
    setEditingExam(exam);
    setEditTitle(exam.title);
    setEditDescription(exam.description || '');
  };

  const handleUpdateTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;

    startTransition(async () => {
      const res = await updateExamTitleAction(editingExam.id, editTitle, editDescription);
      if (res.success) {
        setFeedback({ type: 'success', text: `Exam title updated to "${editTitle}" successfully.` });
        setEditingExam(null);
        await loadExams();
      } else {
        setFeedback({ type: 'error', text: res.error || 'Failed to update exam title.' });
      }
    });
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createExamAction({
        title: newTitle.trim(),
        category: newCategory,
        description: newDescription.trim() || `${newTitle.trim()} Recruitment Examination`,
      });
      if (res.success) {
        setFeedback({ type: 'success', text: `Exam "${newTitle}" created successfully.` });
        setIsCreateModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        await loadExams();
      } else {
        setFeedback({ type: 'error', text: res.error || 'Failed to create exam.' });
      }
    });
  };

  const handleDeleteExam = async () => {
    if (!deletingExam) return;

    startTransition(async () => {
      const res = await deleteExamAction(deletingExam.id);
      if (res.success) {
        setFeedback({
          type: 'success',
          text: `Exam "${deletingExam.title}" and all its questions/tests were permanently deleted from the database to reclaim space.`,
        });
        setDeletingExam(null);
        await loadExams();
      } else {
        setFeedback({ type: 'error', text: res.error || 'Failed to delete exam.' });
      }
    });
  };

  return (
    <div className="pb-16 min-h-screen bg-slate-50/50">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="purple" size="sm">EXAM ARCHITECTURE & SCHEMAS</Badge>
              <span className="text-xs text-slate-500">• {exams.length} Configured Exams</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Target Exams & Pattern Schema
            </h1>
            <p className="text-sm text-slate-600">
              Configure examination categories, Prelims/Mains phase breakdowns, and edit exam titles.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 shadow-xs bg-indigo-600 hover:bg-indigo-700 font-bold shrink-0"
          >
            <PlusCircle className="w-4 h-4" /> Create New Exam
          </Button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Exams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 text-center py-12 text-xs text-slate-400">Loading exams architecture...</div>
          ) : (
            exams.map((exam) => (
              <Card key={exam.id} className="border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
                <CardHeader className="flex justify-between items-start pb-3">
                  <div className="space-y-1">
                    <Badge variant="blue" size="sm" className="mb-1">{exam.category} EXAM</Badge>
                    <CardTitle className="text-lg font-bold text-slate-900">{exam.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(exam)}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      title="Edit this exam title"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeletingExam(exam)}
                      className="flex items-center gap-1 text-xs font-bold shrink-0"
                      title="Delete this exam and all its questions"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                    <Badge variant="green" size="sm">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <p className="text-slate-600 leading-relaxed">{exam.description}</p>
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                      Configured Stages ({exam.patterns?.length || 1})
                    </span>
                    {(exam.patterns || []).map((p) => (
                      <div key={p.stage} className="p-2.5 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-100">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          {p.stage} Stage
                        </span>
                        <span className="text-slate-600">
                          {p.totalQuestions} Qs • {p.totalMarks} Marks • {p.totalDurationMinutes} Mins
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Edit Exam Title Modal */}
      {editingExam && (
        <Modal
          isOpen={Boolean(editingExam)}
          onClose={() => setEditingExam(null)}
          title="Edit Exam Title & Details"
        >
          <form onSubmit={handleUpdateTitle} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Exam Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. IBPS RRB Officer Scale 1 (PO)"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This title will reflect across all test papers, catalog filters, and student dashboards.
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Description</label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                placeholder="Official exam syllabus, scope, and participating banks..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="md" type="button" onClick={() => setEditingExam(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={isPending} className="bg-indigo-600 hover:bg-indigo-700">
                Save Exam Title
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create New Exam Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Exam Architecture"
      >
        <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              New Exam Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. IBPS RRB Assistant, RBI Grade B, LIC HFL..."
            />
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as ExamCategory)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="PO">PO (Probationary Officer / Scale 1)</option>
              <option value="CLERK">Clerk (Junior Associate / Assistant)</option>
              <option value="SO">SO (Specialist Officer)</option>
              <option value="OTHER">Other Banking / Insurance</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">Description</label>
            <textarea
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              placeholder="Overview of this recruitment examination..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" size="md" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={isPending} className="bg-indigo-600 hover:bg-indigo-700">
              Create Exam
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Exam Confirmation Modal */}
      {deletingExam && (
        <Modal
          isOpen={Boolean(deletingExam)}
          onClose={() => !isPending && setDeletingExam(null)}
          title="Delete Exam & Reclaim Database Storage"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-2 text-red-900">
              <div className="flex items-center gap-2 font-bold text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                Permanent Cascade Deletion Warning
              </div>
              <p className="leading-relaxed">
                Are you sure you want to permanently delete <strong className="font-extrabold underline">{deletingExam.title}</strong>?
              </p>
              <p className="leading-relaxed text-red-800 font-semibold">
                To maximize database storage space, this action will automatically cascade and permanently delete:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-medium text-red-800">
                <li>All questions, passages, and figure diagrams belonging to this exam</li>
                <li>All MCQ options, answer keys, and solution explanations</li>
                <li>All mock tests, test paper links, and section configurations</li>
                <li>All candidate attempt records and score analytics under this exam</li>
              </ul>
            </div>

            <p className="text-slate-500 text-[11px] italic">
              This action is immediate and irreversible. Both Neon PostgreSQL and in-memory question stores will be updated to free database space.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                size="md"
                type="button"
                disabled={isPending}
                onClick={() => setDeletingExam(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                type="button"
                isLoading={isPending}
                onClick={handleDeleteExam}
                className="font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Exam & All Questions
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
