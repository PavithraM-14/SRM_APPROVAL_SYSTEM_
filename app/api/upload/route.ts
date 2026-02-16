import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';
import { existsSync } from 'fs';
import { validateFiles, generateSecureFilename } from '../../../lib/file-validation';

function getUploadRootCandidates(): string[] {
  const candidates: string[] = [];

  const configuredPath = process.env.UPLOAD_DIR?.trim();
  if (configuredPath) {
    candidates.push(isAbsolute(configuredPath)
      ? configuredPath
      : resolve(process.cwd(), configuredPath));
  }

  // On Render, prioritize /tmp if no persistent disk is configured
  // This ensures uploads work (ephemerally) without permission errors
  if (process.env.RENDER) {
    candidates.push('/tmp/uploads');
  }

  // Fallbacks for environments where configured path isn't writable
  candidates.push(join(process.cwd(), 'public', 'uploads'));
  candidates.push('/tmp/uploads');

  return Array.from(new Set(candidates));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const isQuery = formData.get('isQuery') === 'true';
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate all files with query context
    const validationResult = validateFiles(files, isQuery);
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const uploadRootCandidates = getUploadRootCandidates();
    let lastUploadError: unknown = null;

    for (const rootPath of uploadRootCandidates) {
      try {
        const uploadDir = join(rootPath, 'queries');

        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }

        const uploadedFiles: string[] = [];

        for (const file of files) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);

          const filename = generateSecureFilename(file.name);
          const filepath = join(uploadDir, filename);
          await writeFile(filepath, buffer);

          // Keep DB path format stable
          uploadedFiles.push(`/uploads/queries/${filename}`);
        }

        return NextResponse.json({
          success: true,
          files: uploadedFiles,
          message: `${uploadedFiles.length} file(s) uploaded successfully`
        });
      } catch (error) {
        lastUploadError = error;
      }
    }

    console.error('All upload paths failed:', lastUploadError);
    throw lastUploadError;

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? `Failed to upload files: ${error.message}` : 'Failed to upload files' },
      { status: 500 }
    );
  }
}