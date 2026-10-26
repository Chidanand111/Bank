import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { memoryMediaCache } from '@/lib/storage/mediaStorage';

export const dynamic = 'force-dynamic';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

function isSafeSubpath(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

function searchFileInDirectories(targetFilename: string, searchRoots: string[]): string | null {
  for (const sDir of searchRoots) {
    if (!fs.existsSync(sDir)) continue;
    try {
      // 1. Direct check in directory
      const directCand = path.join(sDir, targetFilename);
      if (fs.existsSync(directCand) && fs.statSync(directCand).isFile()) {
        return directCand;
      }
      // 2. Search batch subdirectories
      const entries = fs.readdirSync(sDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subCand = path.join(sDir, entry.name, targetFilename);
          if (fs.existsSync(subCand) && fs.statSync(subCand).isFile()) {
            return subCand;
          }
        }
      }
    } catch {
      // ignore directory access error
    }
  }
  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await context.params;

    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Security: Reject any segment containing traversal characters
    for (const seg of pathSegments) {
      if (seg === '..' || seg === '.' || seg.includes('\0') || seg.includes('/') || seg.includes('\\')) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    const relativeUrl = `/uploads/${pathSegments.join('/')}`;
    const apiRelativeUrl = `/api/media/${pathSegments.join('/')}`;

    // 1. Check in-memory media cache
    const cached = memoryMediaCache.get(relativeUrl) || memoryMediaCache.get(apiRelativeUrl);
    if (cached) {
      return new NextResponse(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          'Content-Type': cached.mimeType,
          'Content-Length': cached.buffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // 2. Resolve file on disk under public/uploads
    const relativePath = pathSegments.join(path.sep);
    const basePath = path.join(process.cwd(), 'public', 'uploads');
    const tmpBasePath = path.join(os.tmpdir(), 'bankmock_uploads');
    let fullPath = path.resolve(basePath, relativePath);

    // 3. Fallback to OS tmpdir (for serverless environments where public/uploads was read-only)
    if (!fs.existsSync(fullPath)) {
      const tmpFullPath = path.resolve(tmpBasePath, relativePath);
      if (fs.existsSync(tmpFullPath)) {
        fullPath = tmpFullPath;
      }
    }

    // 4. Resilient cross-batch fallback search
    // If the image was uploaded under an earlier batch folder or batch ID was regenerated,
    // search across all subdirectories under public/uploads and tmpdir.
    if (!fs.existsSync(fullPath)) {
      const targetFilename = pathSegments[pathSegments.length - 1];
      const category = pathSegments[0] || 'questions';

      const foundFallback = searchFileInDirectories(targetFilename, [
        path.join(basePath, category),
        basePath,
        path.join(tmpBasePath, category),
        tmpBasePath,
      ]);

      if (foundFallback) {
        fullPath = foundFallback;
      } else {
        return new NextResponse('Not Found', { status: 404 });
      }
    }

    // Security check: ensure resolved path is within allowed roots
    if (!isSafeSubpath(basePath, fullPath) && !isSafeSubpath(tmpBasePath, fullPath)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';

    const buffer = fs.readFileSync(fullPath);

    // Always cache resolved file in memory for subsequent sub-millisecond retrieval
    memoryMediaCache.set(relativeUrl, { buffer, mimeType: contentType });
    memoryMediaCache.set(apiRelativeUrl, { buffer, mimeType: contentType });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving media file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

