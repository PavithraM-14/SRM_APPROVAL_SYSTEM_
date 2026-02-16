import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

function getUploadRoots(): string[] {
  const roots: string[] = [];

  const configuredPath = process.env.UPLOAD_DIR?.trim();
  if (configuredPath) {
    roots.push(isAbsolute(configuredPath)
      ? configuredPath
      : resolve(process.cwd(), configuredPath));
  }

  if (process.env.RENDER) {
    roots.push('/tmp/uploads');
  }

  roots.push(join(process.cwd(), 'public', 'uploads'));
  roots.push('/tmp/uploads');

  return Array.from(new Set(roots));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const filePath = searchParams.get('file');
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    const normalizedPath = decodeURIComponent(filePath).replace(/\\/g, '/').trim();

    // Security: Prevent path traversal
    if (!normalizedPath || normalizedPath.includes('..')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 403 }
      );
    }

    // Resolve storage path. Supports:
    // 1) /uploads/queries/file.pdf
    // 2) uploads/queries/file.pdf
    // 3) queries/file.pdf
    // 4) legacy filename-only values like sample-document.pdf
    const relativePath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
    const withoutUploadsPrefix = relativePath.startsWith('uploads/')
      ? relativePath.slice('uploads/'.length)
      : relativePath;

    const candidates = [
      withoutUploadsPrefix,
      join('queries', withoutUploadsPrefix),
      relativePath,
      // Try just the filename to be safe
      relativePath.split('/').pop() || '',
      join('queries', relativePath.split('/').pop() || '')
    ];

    const uploadRoots = getUploadRoots();

    console.log('View Debug:', {
        requested: filePath,
        roots: uploadRoots,
        candidates
    });

    let fullPath: string | null = null;
    let resolvedRelativePath: string | null = null;

    for (const rootPath of uploadRoots) {
      for (const candidate of candidates) {
        const candidatePath = join(rootPath, candidate);
        if (existsSync(candidatePath)) {
          fullPath = candidatePath;
          resolvedRelativePath = candidate;
          break;
        }
      }

      if (fullPath) {
        break;
      }
    }

    if (!fullPath || !resolvedRelativePath) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(fullPath);
    const fileName = resolvedRelativePath.split('/').pop() || 'view';
    
    // Determine content type based on file extension
    const extension = fileName.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'txt': 'text/plain'
    };

    if (extension && mimeTypes[extension]) {
      contentType = mimeTypes[extension];
    }

    // KEY DIFFERENCE: Use 'inline' instead of 'attachment' to view in browser
    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`, // 'inline' opens in browser
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('File view error:', error);
    return NextResponse.json(
      { error: 'Failed to view file' },
      { status: 500 }
    );
  }
}