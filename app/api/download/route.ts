import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Ensure this route is treated as dynamic to avoid static export analysis errors
export const dynamic = 'force-dynamic';

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
    // 3) legacy filename-only values like sample-document.pdf
    const relativePath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
    const candidates = relativePath.startsWith('uploads/')
      ? [relativePath]
      : [`uploads/queries/${relativePath}`, `uploads/${relativePath}`, relativePath];

    let fullPath: string | null = null;
    let resolvedRelativePath: string | null = null;

    for (const candidate of candidates) {
      const candidatePath = join(process.cwd(), 'public', candidate);
      if (existsSync(candidatePath)) {
        fullPath = candidatePath;
        resolvedRelativePath = candidate;
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
    const fileName = resolvedRelativePath.split('/').pop() || 'download';
    
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

    // Use the standard Web Response to return binary content
    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}