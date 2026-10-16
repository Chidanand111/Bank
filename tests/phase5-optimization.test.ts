import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/services/testService', () => ({
  getExamBySlug: vi.fn(async (slug: string) => {
    if (slug === 'ibps-po') {
      return {
        id: 'exam-ibps-po',
        title: 'IBPS PO (Probationary Officer)',
        category: 'PO',
        description: 'Comprehensive exam for Probationary Officers.',
      };
    }
    return null;
  }),
  getMockTests: vi.fn(async () => []),
  getExams: vi.fn(async () => []),
}));

import { generateMetadata as generateExamMetadata, generateStaticParams as generateExamStaticParams } from '@/app/exams/[slug]/page';
import { metadata as examsMetadata } from '@/app/exams/page';
import { metadata as testsMetadata } from '@/app/tests/page';
import { metadata as myResultsMetadata } from '@/app/my-results/page';
import { metadata as homeMetadata } from '@/app/page';
import { metadata as adminLayoutMetadata } from '@/app/admin/layout';
import { metadata as resultLayoutMetadata } from '@/app/result/layout';
import { metadata as reviewLayoutMetadata } from '@/app/review/layout';
import { metadata as testLayoutMetadata } from '@/app/test/layout';

describe('Phase 5: Production Optimization, Caching & SEO Verification', () => {
  describe('Pagination Logic & Invariants', () => {
    function computePagination(totalCount: number, requestedPage: number, pageSize: number | 'ALL') {
      const effectivePageSize = pageSize === 'ALL' ? (totalCount || 1) : pageSize;
      const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(totalCount / effectivePageSize));
      const safeCurrentPage = Math.min(Math.max(1, requestedPage), totalPages);
      const startIndex = totalCount === 0 ? 0 : (safeCurrentPage - 1) * effectivePageSize;
      const endIndex = pageSize === 'ALL' ? totalCount : Math.min(startIndex + effectivePageSize, totalCount);

      const delta = 2;
      const range: (number | string)[] = [];
      for (let i = Math.max(2, safeCurrentPage - delta); i <= Math.min(totalPages - 1, safeCurrentPage + delta); i++) {
        range.push(i);
      }
      if (safeCurrentPage - delta > 2) {
        range.unshift('...');
      }
      if (safeCurrentPage + delta < totalPages - 1) {
        range.push('...');
      }
      range.unshift(1);
      if (totalPages > 1) {
        range.push(totalPages);
      }

      return {
        totalCount,
        totalPages,
        safeCurrentPage,
        startIndex,
        endIndex,
        range,
        itemCountOnPage: endIndex - startIndex,
      };
    }

    it('calculates 920 questions across standard 25-item pages', () => {
      const result = computePagination(920, 1, 25);
      expect(result.totalPages).toBe(37);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(25);
      expect(result.itemCountOnPage).toBe(25);
      expect(result.range[0]).toBe(1);
      expect(result.range[result.range.length - 1]).toBe(37);
    });

    it('clamps out-of-bounds requested pages', () => {
      const negativeResult = computePagination(100, -5, 25);
      expect(negativeResult.safeCurrentPage).toBe(1);

      const overflowResult = computePagination(100, 999, 25);
      expect(overflowResult.safeCurrentPage).toBe(4);
      expect(overflowResult.startIndex).toBe(75);
      expect(overflowResult.endIndex).toBe(100);
    });

    it('handles Show All (ALL) mode gracefully with 1 total page', () => {
      const allResult = computePagination(920, 1, 'ALL');
      expect(allResult.totalPages).toBe(1);
      expect(allResult.startIndex).toBe(0);
      expect(allResult.endIndex).toBe(920);
      expect(allResult.itemCountOnPage).toBe(920);
    });

    it('correctly maps the final partial page', () => {
      // 920 items at 50 per page = 18 full pages of 50 (900), page 19 has 20
      const lastPageResult = computePagination(920, 19, 50);
      expect(lastPageResult.totalPages).toBe(19);
      expect(lastPageResult.startIndex).toBe(900);
      expect(lastPageResult.endIndex).toBe(920);
      expect(lastPageResult.itemCountOnPage).toBe(20);
    });
  });

  describe('Next.js Static Generation & Dynamic Routing', () => {
    it('provides generateStaticParams for canonical banking exams', async () => {
      const params = await generateExamStaticParams();
      expect(params).toEqual([
        { slug: 'ibps-po' },
        { slug: 'sbi-clerk' },
      ]);
    });

    it('generates dynamic SEO metadata for valid exam slug', async () => {
      const meta = await generateExamMetadata({
        params: Promise.resolve({ slug: 'ibps-po' }),
      });
      expect(meta.title).toContain('IBPS PO');
      expect(meta.description).toBeDefined();
      expect(meta.openGraph).toBeDefined();
    });

    it('handles missing exam slug gracefully in metadata', async () => {
      const meta = await generateExamMetadata({
        params: Promise.resolve({ slug: 'non-existent-exam-slug' }),
      });
      expect(meta.title).toBe('Exam Not Found | BankMock');
    });
  });

  describe('SEO & Robots Protection Invariants', () => {
    it('contains descriptive titles and meta descriptions on public pages', () => {
      expect(homeMetadata.title).toContain('BankMock');
      expect(examsMetadata.title).toContain('Banking Exams Catalog');
      expect(testsMetadata.title).toContain('Banking Mock Tests');
      expect(myResultsMetadata.title).toContain('My Results');
    });

    it('enforces noindex on private and administrator routes', () => {
      expect(adminLayoutMetadata.robots).toEqual({ index: false, follow: false });
      expect(resultLayoutMetadata.robots).toEqual({ index: false, follow: false });
      expect(reviewLayoutMetadata.robots).toEqual({ index: false, follow: false });
      expect(testLayoutMetadata.robots).toEqual({ index: false, follow: false });
    });
  });
});
