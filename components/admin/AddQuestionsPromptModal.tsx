'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircle2,
  PlusCircle,
  Upload,
  FileSpreadsheet,
  Edit3,
  EyeOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export interface AddQuestionsPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  examTitle: string;
  onAddSingle: () => void;
  onAddBulk: () => void;
}

export const AddQuestionsPromptModal: React.FC<AddQuestionsPromptModalProps> = ({
  isOpen,
  onClose,
  examTitle,
  onAddSingle,
  onAddBulk,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
    >
      <div className="space-y-6 pt-1">
        {/* Header Celebration */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
            <span>Status: Created (Draft - Hidden from Students)</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Exam Created Successfully!
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            <strong className="text-slate-900 font-extrabold">{examTitle}</strong> has been initialized. It will remain <strong className="text-amber-800 font-semibold">hidden from students</strong> until you choose to publish it.
          </p>
        </div>

        {/* Prompt Question */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
            How would you like to add questions to this exam?
          </p>
        </div>

        {/* Two Primary Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: 1-by-1 Questions */}
          <div
            onClick={onAddSingle}
            className="group cursor-pointer bg-white border-2 border-slate-200 hover:border-indigo-500 rounded-2xl p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                  Add 1 by 1 Question
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Curate questions individually using our interactive editor with complete control over each item.
                </p>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1 pt-1 font-medium">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Math LaTeX & formula formatting
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Figure diagrams & DI chart uploads
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Reading comprehension passages
                </li>
              </ul>
            </div>

            <Button
              variant="primary"
              size="md"
              type="button"
              onClick={onAddSingle}
              className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold flex items-center justify-center gap-1.5 text-xs shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Add Questions 1 by 1
              <ArrowRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Card 2: Bulk Upload */}
          <div
            onClick={onAddBulk}
            className="group cursor-pointer bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-5 transition-all shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                  Bulk Upload (CSV / JSON)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Quickly import dozens or hundreds of questions at once using spreadsheets or JSON files.
                </p>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1 pt-1 font-medium">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Upload 100+ questions in seconds
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Ready-to-use CSV & JSON templates
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Pre-import validation & error check
                </li>
              </ul>
            </div>

            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={onAddBulk}
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 font-bold flex items-center justify-center gap-1.5 text-xs shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Bulk Upload (CSV / JSON)
              <ArrowRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        {/* Footer Dismiss & Guidance */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-slate-500 text-[11px]">
            💡 You can always add questions later and click <strong className="text-emerald-700 font-bold">"Publish Exam"</strong> when ready for students.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 font-semibold shrink-0"
          >
            I'll Add Questions Later
          </Button>
        </div>
      </div>
    </Modal>
  );
};
