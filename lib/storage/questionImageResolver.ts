/**
 * Question Image & Diagram Reference Resolver
 *
 * Resolves diagram references (question imageUrl, passageImageUrl, and option images)
 * against uploaded ZIP archive contents, while strictly preserving external URLs and data URIs.
 * Detects missing, ambiguous, or malformed image references prior to database commit.
 */

import { AdminQuestionInput } from '@/types';
import { ValidatedZipImage } from './zipValidator';
import { classifyImageReference } from './mediaStorage';

export interface UnresolvedImageReference {
  rowNumber: number;
  questionIdentifier: string; // e.g. "Row 4", "Q4", or "DI-SET-01"
  field: 'imageUrl' | 'passageImageUrl' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'optionE';
  referencedFilename: string;
}

export interface ImageResolutionReport {
  resolvedCount: number;
  unresolvedReferences: UnresolvedImageReference[];
  missingFilenames: string[];
  resolvedImages: ValidatedZipImage[];
}

/**
 * Normalizes a filename query for matching against ZIP entry maps.
 */
export function normalizeFilenameQuery(query: string): string {
  return query
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .toLowerCase();
}

/**
 * Searches the zip map for a matching image by full relative path, filename basename, or sanitized name.
 */
export function findMatchingZipImage(
  reference: string,
  imageMap: Map<string, ValidatedZipImage>
): ValidatedZipImage | null {
  if (!reference) return null;
  const cleanRef = normalizeFilenameQuery(reference);

  // 1. Direct match on normalized relative path (e.g. "diagrams/q1.png")
  if (imageMap.has(cleanRef)) {
    return imageMap.get(cleanRef)!;
  }

  // 2. Basename match (e.g. "q1.png")
  const baseName = cleanRef.split('/').pop() || cleanRef;
  if (imageMap.has(baseName)) {
    return imageMap.get(baseName)!;
  }

  return null;
}

/**
 * Inspects all questions in an import batch and matches their diagram references against the ZIP image map.
 */
export function resolveQuestionDiagramReferences(
  questions: AdminQuestionInput[],
  imageMap: Map<string, ValidatedZipImage>,
  urlMapping?: Map<string, string> // Optional stored URL map for committing to database
): {
  updatedQuestions: AdminQuestionInput[];
  report: ImageResolutionReport;
} {
  const unresolved: UnresolvedImageReference[] = [];
  const missingSet = new Set<string>();
  const usedImages = new Set<ValidatedZipImage>();
  let resolvedCount = 0;

  const updatedQuestions = questions.map((q, idx) => {
    const rowNum = idx + 2; // Row 1 is header, so questions start at Row 2
    const qId = q.groupId ? `${q.groupId} (Q${idx + 1})` : `Question ${idx + 1}`;

    const newQ: AdminQuestionInput = {
      ...q,
      options: q.options ? [...q.options] : [],
    };

    // 1. Resolve question.imageUrl
    if (q.imageUrl) {
      const classification = classifyImageReference(q.imageUrl);
      if (classification === 'FILENAME') {
        const matched = findMatchingZipImage(q.imageUrl, imageMap);
        if (matched) {
          usedImages.add(matched);
          resolvedCount++;
          if (urlMapping) {
            newQ.imageUrl = urlMapping.get(matched.baseName.toLowerCase()) || urlMapping.get(matched.normalizedPath.toLowerCase()) || q.imageUrl;
          }
        } else {
          unresolved.push({
            rowNumber: rowNum,
            questionIdentifier: qId,
            field: 'imageUrl',
            referencedFilename: q.imageUrl,
          });
          missingSet.add(q.imageUrl);
        }
      }
    }

    // 2. Resolve question.passageImageUrl
    if (q.passageImageUrl) {
      const classification = classifyImageReference(q.passageImageUrl);
      if (classification === 'FILENAME') {
        const matched = findMatchingZipImage(q.passageImageUrl, imageMap);
        if (matched) {
          usedImages.add(matched);
          resolvedCount++;
          if (urlMapping) {
            newQ.passageImageUrl = urlMapping.get(matched.baseName.toLowerCase()) || urlMapping.get(matched.normalizedPath.toLowerCase()) || q.passageImageUrl;
          }
        } else {
          unresolved.push({
            rowNumber: rowNum,
            questionIdentifier: qId,
            field: 'passageImageUrl',
            referencedFilename: q.passageImageUrl,
          });
          missingSet.add(q.passageImageUrl);
        }
      }
    }

    // 3. Resolve option images
    if (newQ.options && newQ.options.length > 0) {
      newQ.options = newQ.options.map((opt, optIdx) => {
        if (!opt.imageUrl) return opt;
        const classification = classifyImageReference(opt.imageUrl);
        if (classification === 'FILENAME') {
          const matched = findMatchingZipImage(opt.imageUrl, imageMap);
          const optLetter = ['optionA', 'optionB', 'optionC', 'optionD', 'optionE'][optIdx] as any;
          if (matched) {
            usedImages.add(matched);
            resolvedCount++;
            const finalUrl = urlMapping?.get(matched.baseName.toLowerCase()) || urlMapping?.get(matched.normalizedPath.toLowerCase()) || opt.imageUrl;
            return { ...opt, imageUrl: finalUrl };
          } else {
            unresolved.push({
              rowNumber: rowNum,
              questionIdentifier: qId,
              field: optLetter || `option${optIdx + 1}`,
              referencedFilename: opt.imageUrl,
            });
            missingSet.add(opt.imageUrl);
          }
        }
        return opt;
      });
    }

    return newQ;
  });

  return {
    updatedQuestions,
    report: {
      resolvedCount,
      unresolvedReferences: unresolved,
      missingFilenames: Array.from(missingSet),
      resolvedImages: Array.from(usedImages),
    },
  };
}
