/**
 * Centralized Exam Presets & Section Timing Specifications
 * Covers Banking (Prelims & Mains), SSC (CGL Tier-1 Composite & Sectional Timed),
 * Railway (RRB NTPC CBT-1), and Custom Configurations.
 */

export type ExamPresetKey =
  | 'PRELIMS_3'
  | 'MAINS_4'
  | 'SSC_TIER1_4'
  | 'SSC_TIER1_SECTIONAL'
  | 'RRB_NTPC_3'
  | 'CUSTOM';

export interface ExamPresetSection {
  code: string;
  name: string;
  questionCount: number;
  marks: number;
  durationMinutes: number;
}

export interface ExamPresetConfig {
  id: ExamPresetKey;
  label: string;
  shortLabel: string;
  badge: string;
  totalDuration: number; // in minutes
  totalMarks: number;
  cutoffMarks: number;
  timerType: 'SECTIONAL_LOCKED' | 'OVERALL_COMPOSITE';
  allowSectionSwitch: boolean;
  negativeMarkRatio: number;
  stage: string;
  sections: ExamPresetSection[];
  description: string;
}

export const EXAM_PRESETS: Record<ExamPresetKey, ExamPresetConfig> = {
  PRELIMS_3: {
    id: 'PRELIMS_3',
    label: 'Banking Prelims (3 Sections: Eng 30 [20 min], Quant 35 [20 min], Reas 35 [20 min] — 100 Qs / 100 M / 60 Min)',
    shortLabel: 'Banking Prelims (100 Qs / 60 Min)',
    badge: '🔒 20 Min / Section Auto-Locking • Banking Speed Test • -0.25 Negative Marking',
    totalDuration: 60,
    totalMarks: 100,
    cutoffMarks: 60,
    timerType: 'SECTIONAL_LOCKED',
    allowSectionSwitch: false,
    negativeMarkRatio: 0.25,
    stage: 'Prelims',
    description: 'Standard 3-section Banking Prelims format (SBI / IBPS PO & Clerk) with strict 20-minute section windows.',
    sections: [
      { code: 'ENGLISH', name: 'English Language', questionCount: 30, marks: 30, durationMinutes: 20 },
      { code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 35, marks: 35, durationMinutes: 20 },
      { code: 'REASONING', name: 'Reasoning Ability', questionCount: 35, marks: 35, durationMinutes: 20 },
    ],
  },

  MAINS_4: {
    id: 'MAINS_4',
    label: 'Banking Mains (4 Sections: Reas 45 [60 min], Eng 35 [40 min], Quant 35 [45 min], GA 40 [35 min] — 155 Qs / 200 M / 180 Min)',
    shortLabel: 'Banking Mains (155 Qs / 180 Min)',
    badge: '🔒 180 Min Mains Clock (35–60 min / section auto-lock) • -0.25 Negative Marking',
    totalDuration: 180,
    totalMarks: 200,
    cutoffMarks: 85,
    timerType: 'SECTIONAL_LOCKED',
    allowSectionSwitch: false,
    negativeMarkRatio: 0.25,
    stage: 'Mains',
    description: 'Full-length 4-section Banking Mains examination pattern with varying sectional timing and weightages.',
    sections: [
      { code: 'REASONING', name: 'Reasoning & Computer Aptitude', questionCount: 45, marks: 60, durationMinutes: 60 },
      { code: 'ENGLISH', name: 'English Language', questionCount: 35, marks: 40, durationMinutes: 40 },
      { code: 'QUANT', name: 'Data Analysis & Interpretation', questionCount: 35, marks: 60, durationMinutes: 45 },
      { code: 'FINANCIAL_AWARENESS', name: 'General / Banking Awareness', questionCount: 40, marks: 40, durationMinutes: 35 },
    ],
  },

  SSC_TIER1_4: {
    id: 'SSC_TIER1_4',
    label: 'SSC CGL Tier-1 Composite (4 Sections: GI & Reas 25 [15 min], GA 25 [15 min], Quant 25 [15 min], Eng 25 [15 min] — 100 Qs / 200 M / 60 Min Composite)',
    shortLabel: 'SSC CGL Tier-1 Composite (100 Qs / 60 Min)',
    badge: '⚡ 60 Mins Overall Countdown • Free Section Navigation • -0.50 Negative Marking',
    totalDuration: 60,
    totalMarks: 200,
    cutoffMarks: 135,
    timerType: 'OVERALL_COMPOSITE',
    allowSectionSwitch: true,
    negativeMarkRatio: 0.50,
    stage: 'Tier-1',
    description: 'Official SSC CGL Tier-1 format: 4 sections with 25 Qs & 50 Marks each (15 min suggested allocation, 60 min total composite timer with free section navigation).',
    sections: [
      { code: 'REASONING', name: 'General Intelligence & Reasoning', questionCount: 25, marks: 50, durationMinutes: 15 },
      { code: 'GA', name: 'General Awareness', questionCount: 25, marks: 50, durationMinutes: 15 },
      { code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 25, marks: 50, durationMinutes: 15 },
      { code: 'ENGLISH', name: 'English Comprehension', questionCount: 25, marks: 50, durationMinutes: 15 },
    ],
  },

  SSC_TIER1_SECTIONAL: {
    id: 'SSC_TIER1_SECTIONAL',
    label: 'SSC CGL Tier-1 Sectional Timed (4 Sections: GI & Reas 25 [15 min], GA 25 [15 min], Quant 25 [15 min], Eng 25 [15 min] — 100 Qs / 200 M / 15 Min Each Locked)',
    shortLabel: 'SSC CGL Tier-1 Sectional Timed (100 Qs / 4x15 Min)',
    badge: '🔒 15 Min / Section Auto-Locking • Enforced Section Clock • -0.50 Negative Marking',
    totalDuration: 60,
    totalMarks: 200,
    cutoffMarks: 135,
    timerType: 'SECTIONAL_LOCKED',
    allowSectionSwitch: false,
    negativeMarkRatio: 0.50,
    stage: 'Tier-1',
    description: 'Strict speed drill format for SSC CGL Tier-1: 15 minutes strictly enforced per section with auto-locking.',
    sections: [
      { code: 'REASONING', name: 'General Intelligence & Reasoning', questionCount: 25, marks: 50, durationMinutes: 15 },
      { code: 'GA', name: 'General Awareness', questionCount: 25, marks: 50, durationMinutes: 15 },
      { code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 25, marks: 50, durationMinutes: 15 },
      { code: 'ENGLISH', name: 'English Comprehension', questionCount: 25, marks: 50, durationMinutes: 15 },
    ],
  },

  RRB_NTPC_3: {
    id: 'RRB_NTPC_3',
    label: 'RRB NTPC CBT-1 (3 Sections: GA 40 [30 min], Math 30 [30 min], Reas 30 [30 min] — 100 Qs / 100 M / 90 Min Composite)',
    shortLabel: 'RRB NTPC CBT-1 (100 Qs / 90 Min)',
    badge: '⚡ 90 Mins Overall Countdown • Free Section Navigation • -1/3 Negative Marking',
    totalDuration: 90,
    totalMarks: 100,
    cutoffMarks: 72,
    timerType: 'OVERALL_COMPOSITE',
    allowSectionSwitch: true,
    negativeMarkRatio: 0.333,
    stage: 'CBT-1',
    description: 'Official Railway Recruitment Board NTPC CBT-1 pattern: 90 minutes composite timer with 1/3 negative marking.',
    sections: [
      { code: 'GA', name: 'General Awareness', questionCount: 40, marks: 40, durationMinutes: 30 },
      { code: 'QUANT', name: 'Mathematics', questionCount: 30, marks: 30, durationMinutes: 30 },
      { code: 'REASONING', name: 'General Intelligence & Reasoning', questionCount: 30, marks: 30, durationMinutes: 30 },
    ],
  },

  CUSTOM: {
    id: 'CUSTOM',
    label: 'Custom Timing & Pattern (Manual Entry)',
    shortLabel: 'Custom Pattern',
    badge: '⚙️ Custom Section Setup • Configurable Timing & Marks',
    totalDuration: 60,
    totalMarks: 100,
    cutoffMarks: 60,
    timerType: 'SECTIONAL_LOCKED',
    allowSectionSwitch: false,
    negativeMarkRatio: 0.25,
    stage: 'Exam',
    description: 'Configure custom duration, marks, cutoffs, and section allocations manually.',
    sections: [],
  },
};

export const EXAM_PRESET_OPTIONS: { value: ExamPresetKey; label: string }[] = [
  { value: 'PRELIMS_3', label: EXAM_PRESETS.PRELIMS_3.label },
  { value: 'MAINS_4', label: EXAM_PRESETS.MAINS_4.label },
  { value: 'SSC_TIER1_4', label: EXAM_PRESETS.SSC_TIER1_4.label },
  { value: 'SSC_TIER1_SECTIONAL', label: EXAM_PRESETS.SSC_TIER1_SECTIONAL.label },
  { value: 'RRB_NTPC_3', label: EXAM_PRESETS.RRB_NTPC_3.label },
  { value: 'CUSTOM', label: EXAM_PRESETS.CUSTOM.label },
];

/**
 * Intelligent helper to auto-select an exam preset when an admin picks an exam or category.
 */
export function detectDefaultPresetForExam(examIdOrCategory?: string, category?: string): ExamPresetKey {
  const norm = (examIdOrCategory || '').toLowerCase();
  const cat = (category || '').toUpperCase();

  if (cat === 'SSC' || norm.includes('ssc') || norm.includes('cgl')) {
    return 'SSC_TIER1_4';
  }
  if (cat === 'RAILWAY' || norm.includes('railway') || norm.includes('rrb') || norm.includes('ntpc')) {
    return 'RRB_NTPC_3';
  }
  if (norm.includes('mains')) {
    return 'MAINS_4';
  }
  return 'PRELIMS_3';
}
