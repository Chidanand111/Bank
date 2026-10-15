import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import {
  addQuestionToJsonDb,
  updateQuestionInJsonDb,
  deleteQuestionFromJsonDb,
  saveCustomQuestionsToFile,
} from '@/lib/db/questionDb';
import { saveCustomExamsToFile } from '@/lib/data/exams';
import { saveCustomMockTestsToFile } from '@/lib/data/mockTests';
import { CACHE_TAGS, invalidateQuestionsCache, invalidateExamsCache, invalidateMockTestsCache, invalidateLiveQuestionsCache } from '@/lib/cache';
import { QuestionRepository, ExamRepository, MockTestRepository } from '@/lib/db/repositories';

describe('Phase 2: Data Store Unification & Filesystem Elimination', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Filesystem Elimination Guarantee (Zero fs.writeFileSync)', () => {
    it('guarantees saveCustomQuestionsToFile never invokes fs.writeFileSync', () => {
      const writeSpy = vi.spyOn(fs, 'writeFileSync');
      saveCustomQuestionsToFile();
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('guarantees saveCustomExamsToFile never invokes fs.writeFileSync', () => {
      const writeSpy = vi.spyOn(fs, 'writeFileSync');
      saveCustomExamsToFile([]);
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('guarantees saveCustomMockTestsToFile never invokes fs.writeFileSync', () => {
      const writeSpy = vi.spyOn(fs, 'writeFileSync');
      saveCustomMockTestsToFile([]);
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('guarantees adding a question to in-memory store never writes to disk', () => {
      const writeSpy = vi.spyOn(fs, 'writeFileSync');
      const q = addQuestionToJsonDb({
        id: 'test-serverless-q-' + Date.now(),
        exam: 'IBPS PO',
        section: 'Quantitative Aptitude',
        topic: 'Data Interpretation',
        question: 'What is 2 + 2?',
        options: { A: '1', B: '2', C: '3', D: '4' },
        answer: 'D',
        explanation: '2 + 2 = 4',
        difficulty: 'EASY',
      });

      expect(q).toBeDefined();
      expect(q.text).toBe('What is 2 + 2?');
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('guarantees updating a question in in-memory store never writes to disk', () => {
      const writeSpy = vi.spyOn(fs, 'writeFileSync');
      const testId = 'test-update-q-' + Date.now();
      addQuestionToJsonDb({
        id: testId,
        exam: 'IBPS PO',
        section: 'Reasoning Ability',
        topic: 'Syllogism',
        question: 'Original Question Text',
        options: { A: 'A', B: 'B' },
        answer: 'A',
        explanation: 'Initial',
      });

      const updated = updateQuestionInJsonDb(testId, {
        question: 'Updated Question Text via In-Memory Store',
      });

      expect(updated).toBeDefined();
      expect(updated?.text).toBe('Updated Question Text via In-Memory Store');
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('guarantees deleting a question from in-memory store never writes to disk', () => {
      const writeSpy = vi.spyOn(fs, 'writeFileSync');
      const testId = 'test-del-q-' + Date.now();
      addQuestionToJsonDb({
        id: testId,
        exam: 'SBI Clerk',
        section: 'English Language',
        topic: 'Error Detection',
        question: 'Delete me',
        options: { A: 'A' },
        answer: 'A',
        explanation: 'Delete',
      });

      const deleted = deleteQuestionFromJsonDb(testId);
      expect(deleted).toBe(true);
      expect(writeSpy).not.toHaveBeenCalled();
    });
  });

  describe('2. Repository Layer Interface & Invariants', () => {
    it('exposes QuestionRepository with required CRUD and bulk methods', () => {
      expect(QuestionRepository).toBeDefined();
      expect(typeof QuestionRepository.create).toBe('function');
      expect(typeof QuestionRepository.update).toBe('function');
      expect(typeof QuestionRepository.delete).toBe('function');
      expect(typeof QuestionRepository.bulkCreate).toBe('function');
      expect(typeof QuestionRepository.findAll).toBe('function');
      expect(typeof QuestionRepository.findById).toBe('function');
    });

    it('exposes ExamRepository with required lifecycle methods', () => {
      expect(ExamRepository).toBeDefined();
      expect(typeof ExamRepository.getExams).toBe('function');
      expect(typeof ExamRepository.findByIdOrSlug).toBe('function');
      expect(typeof ExamRepository.upsertExam).toBe('function');
      expect(typeof ExamRepository.updateTitle).toBe('function');
      expect(typeof ExamRepository.deleteCascade).toBe('function');
    });

    it('exposes MockTestRepository with required lifecycle methods', () => {
      expect(MockTestRepository).toBeDefined();
      expect(typeof MockTestRepository.getMockTests).toBe('function');
      expect(typeof MockTestRepository.findByIdOrSlug).toBe('function');
      expect(typeof MockTestRepository.upsertMockTest).toBe('function');
      expect(typeof MockTestRepository.deleteCascade).toBe('function');
      expect(typeof MockTestRepository.togglePublish).toBe('function');
    });
  });

  describe('3. Cache Tag Hierarchy and Next.js Invalidation Layer', () => {
    it('defines distinct, isolated cache tags for all major entities', () => {
      expect(CACHE_TAGS.questions).toBe('questions');
      expect(CACHE_TAGS.exams).toBe('exams');
      expect(CACHE_TAGS.mockTests).toBe('mock-tests');
      expect(CACHE_TAGS.liveQuestions('test-123')).toBe('live-questions-test-123');
    });

    it('executes cache invalidation helpers cleanly without uncaught exceptions', async () => {
      await expect(invalidateQuestionsCache()).resolves.not.toThrow();
      await expect(invalidateExamsCache()).resolves.not.toThrow();
      await expect(invalidateMockTestsCache()).resolves.not.toThrow();
      await expect(invalidateLiveQuestionsCache('test-mock-1')).resolves.not.toThrow();
    });
  });
});
