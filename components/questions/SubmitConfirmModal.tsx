import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle, CheckCircle2, Clock, HelpCircle, Bookmark } from 'lucide-react';

export interface SubmitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  markedCount: number;
  remainingSeconds: number;
}

export const SubmitConfirmModal: React.FC<SubmitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmSubmit,
  totalQuestions,
  answeredCount,
  unansweredCount,
  markedCount,
  remainingSeconds,
}) => {
  const remainingMins = Math.floor(remainingSeconds / 60);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Mock Test Confirmation"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Resume Test
          </Button>
          <Button variant="danger" size="md" onClick={onConfirmSubmit}>
            Yes, Submit Test Now
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Are you sure you want to submit your test?</p>
            <p className="mt-0.5 text-amber-800">
              Once submitted, you cannot edit your responses. You still have{' '}
              <span className="font-bold text-amber-950">{remainingMins} minutes</span> remaining.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-sm">
          <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
            Attempt Summary
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
              <span className="text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" /> Answered
              </span>
              <span className="font-bold text-slate-900 text-sm">{answeredCount}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
              <span className="text-slate-600 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-red-500" /> Unanswered
              </span>
              <span className="font-bold text-slate-900 text-sm">{unansweredCount}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-amber-500" /> Marked Review
              </span>
              <span className="font-bold text-slate-900 text-sm">{markedCount}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" /> Total Questions
              </span>
              <span className="font-bold text-slate-900 text-sm">{totalQuestions}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
