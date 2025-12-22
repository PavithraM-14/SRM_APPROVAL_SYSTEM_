import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('file');
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Security: Only allow files from uploads directory
    if (!filePath.startsWith('/uploads/')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 403 }
      );
    }

    const fullPath = join(process.cwd(), 'public', filePath);
    
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(fullPath);
    const fileName = filePath.split('/').pop() || 'view';
    
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
    return new NextResponse(new Uint8Array(fileBuffer), {
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