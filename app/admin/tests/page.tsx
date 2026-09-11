'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  getAdminMockTests,
  createMockTestAction,
  deleteMockTestAction,
} from '@/lib/services/adminService';
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminMockTestInput, MockTest } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Award, PlusCircle, Trash2, Clock, FileText, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

export default function AdminTestsPage() {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTest, setDeletingTest] = useState<MockTest | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [examId, setExamId] = useState('exam-ibps-po');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalMarks, setTotalMarks] = useState(100);
  const [cutoffMarks, setCutoffMarks] = useState(60);

  const [isPending, startTransition] = useTransition();

  const loadTests = async () => {
    try {
      const data = await getAdminMockTests();
      setTests(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();

    const inputData: AdminMockTestInput = {
      title,
      slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description,
      examId,
      durationMinutes: Number(durationMinutes),
      totalMarks: Number(totalMarks),
      cutoffMarks: Number(cutoffMarks),
      isFree: true,
      sections: [
        { code: 'ENGLISH', name: 'English Language', questionCount: 30, marks: 30 },
        { code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 35, marks: 35 },
        { code: 'REASONING', name: 'Reasoning Ability', questionCount: 35, marks: 35 },
      ],
    };

    startTransition(async () => {
      const res = await createMockTestAction(inputData);
      if (res.success) {
        setFeedback({ text: 'Mock test created successfully.', type: 'success' });
        setIsCreateModalOpen(false);
        setTitle('');
        setSlug('');
        setDescription('');
        await loadTests();
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
        setFeedback({ text: 'Mock test deleted successfully.', type: 'success' });
        setIsDeleteModalOpen(false);
        setDeletingTest(null);
        await loadTests();
      } else {
        setFeedback({ text: res.error || 'Failed to delete test.', type: 'error' });
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
              <Badge variant="purple" size="sm">MOCK TEST SUITES</Badge>
              <span className="text-xs text-slate-500">• {tests.length} Active Tests</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Mock Test Management
            </h1>
            <p className="text-sm text-slate-600">
              Create, configure duration, set sectional question quotas, cut-off benchmarks, and publish mock tests.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" /> Create Mock Test
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

        {/* Tests List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tests.map((test) => (
            <Card key={test.id} className="border border-slate-200 shadow-xs flex flex-col justify-between">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="blue" size="sm">{test.examTitle}</Badge>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => { setDeletingTest(test); setIsDeleteModalOpen(true); }}
                    className="p-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">{test.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{test.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-xs text-slate-600">
                  <div className="text-center p-1.5 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Duration</span>
                    <span className="font-bold text-slate-800">{test.durationMinutes} mins</span>
                  </div>
                  <div className="text-center p-1.5 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Marks</span>
                    <span className="font-bold text-slate-800">{test.totalMarks}</span>
                  </div>
                  <div className="text-center p-1.5 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Cutoff</span>
                    <span className="font-bold text-slate-800">{test.cutoffMarks}</span>
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Mock Test Suite"
      >
        <form onSubmit={handleCreateTest} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Target Exam</label>
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="exam-ibps-po">IBPS PO</option>
              <option value="exam-sbi-clerk">SBI Clerk</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Test Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. IBPS PO Prelims Speed Drill Mock 3"
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Slug (URL identifier)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ibps-po-prelims-mock-3 (leave blank to auto-generate)"
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
              placeholder="Comprehensive prelims test covering all syllabus sections..."
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
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
            <Button variant="primary" size="md" type="submit" isLoading={isPending}>
              Create Test Suite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingTest && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Mock Test Deletion"
          footer={
            <>
              <Button variant="secondary" size="md" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="md" isLoading={isPending} onClick={handleDeleteTest}>
                Delete Test
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>Are you sure you want to permanently delete this mock test?</span>
            </div>
            <p className="font-bold text-slate-900">{deletingTest.title}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
