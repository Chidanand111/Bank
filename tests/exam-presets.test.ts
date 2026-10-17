import { describe, it, expect } from 'vitest';
import {
  EXAM_PRESETS,
  EXAM_PRESET_OPTIONS,
  detectDefaultPresetForExam,
} from '@/lib/data/examPresets';

describe('Centralized Exam Presets & Section Timing Specifications', () => {
  it('should include all standard exam presets with explicit time in options', () => {
    expect(EXAM_PRESET_OPTIONS.length).toBeGreaterThanOrEqual(6);

    // Verify option labels contain explicit minutes and section breakdowns
    const prelimsOpt = EXAM_PRESET_OPTIONS.find(o => o.value === 'PRELIMS_3');
    expect(prelimsOpt?.label).toContain('20 min');
    expect(prelimsOpt?.label).toContain('60 Min');

    const mainsOpt = EXAM_PRESET_OPTIONS.find(o => o.value === 'MAINS_4');
    expect(mainsOpt?.label).toContain('60 min');
    expect(mainsOpt?.label).toContain('180 Min');

    const sscOpt = EXAM_PRESET_OPTIONS.find(o => o.value === 'SSC_TIER1_4');
    expect(sscOpt?.label).toContain('15 min');
    expect(sscOpt?.label).toContain('60 Min');

    const sscSectionalOpt = EXAM_PRESET_OPTIONS.find(o => o.value === 'SSC_TIER1_SECTIONAL');
    expect(sscSectionalOpt?.label).toContain('15 min');
    expect(sscSectionalOpt?.label).toContain('Locked');

    const rrbOpt = EXAM_PRESET_OPTIONS.find(o => o.value === 'RRB_NTPC_3');
    expect(rrbOpt?.label).toContain('30 min');
    expect(rrbOpt?.label).toContain('90 Min');
  });

  it('should accurately calculate and match SSC CGL Tier-1 timings, questions, and marks', () => {
    const ssc = EXAM_PRESETS.SSC_TIER1_4;
    expect(ssc.totalDuration).toBe(60);
    expect(ssc.totalMarks).toBe(200);
    expect(ssc.sections).toHaveLength(4);

    const totalQuestions = ssc.sections.reduce((acc, s) => acc + s.questionCount, 0);
    const totalMarks = ssc.sections.reduce((acc, s) => acc + s.marks, 0);
    const totalDuration = ssc.sections.reduce((acc, s) => acc + s.durationMinutes, 0);

    expect(totalQuestions).toBe(100);
    expect(totalMarks).toBe(200);
    expect(totalDuration).toBe(60);

    // Verify each section has 25 questions, 50 marks, 15 min
    for (const sec of ssc.sections) {
      expect(sec.questionCount).toBe(25);
      expect(sec.marks).toBe(50);
      expect(sec.durationMinutes).toBe(15);
    }
  });

  it('should accurately configure Banking Prelims and Mains timings', () => {
    const prelims = EXAM_PRESETS.PRELIMS_3;
    expect(prelims.totalDuration).toBe(60);
    expect(prelims.totalMarks).toBe(100);
    expect(prelims.sections).toHaveLength(3);
    for (const sec of prelims.sections) {
      expect(sec.durationMinutes).toBe(20);
    }

    const mains = EXAM_PRESETS.MAINS_4;
    expect(mains.totalDuration).toBe(180);
    expect(mains.totalMarks).toBe(200);
    expect(mains.sections).toHaveLength(4);
    const mainsDurationSum = mains.sections.reduce((acc, s) => acc + s.durationMinutes, 0);
    expect(mainsDurationSum).toBe(180);
  });

  it('should accurately configure RRB NTPC CBT-1 timings', () => {
    const rrb = EXAM_PRESETS.RRB_NTPC_3;
    expect(rrb.totalDuration).toBe(90);
    expect(rrb.totalMarks).toBe(100);
    expect(rrb.sections).toHaveLength(3);
    const rrbTotalQuestions = rrb.sections.reduce((acc, s) => acc + s.questionCount, 0);
    expect(rrbTotalQuestions).toBe(100);
    const rrbTotalMarks = rrb.sections.reduce((acc, s) => acc + s.marks, 0);
    expect(rrbTotalMarks).toBe(100);
  });

  it('should auto-detect the recommended preset for various exams and categories', () => {
    expect(detectDefaultPresetForExam('exam-ssc-cgl', 'SSC')).toBe('SSC_TIER1_4');
    expect(detectDefaultPresetForExam('custom-cgl-exam', 'OTHER')).toBe('SSC_TIER1_4');
    expect(detectDefaultPresetForExam('exam-rrb-ntpc', 'RAILWAY')).toBe('RRB_NTPC_3');
    expect(detectDefaultPresetForExam(undefined, 'RAILWAY')).toBe('RRB_NTPC_3');
    expect(detectDefaultPresetForExam('sbi-po-mains', 'PO')).toBe('MAINS_4');
    expect(detectDefaultPresetForExam('exam-ibps-po', 'PO')).toBe('PRELIMS_3');
    expect(detectDefaultPresetForExam('exam-sbi-clerk', 'CLERK')).toBe('PRELIMS_3');
  });
});
