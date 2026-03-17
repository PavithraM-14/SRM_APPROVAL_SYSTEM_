import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import File from '../../../models/File';
import { getCurrentUser } from '../../../lib/auth';
import { validateFiles, generateSecureFilename } from '../../../lib/file-validation';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const isQuery = formData.get('isQuery') === 'true';
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const validationResult = validateFiles(files, isQuery);
    if (!validationResult.isValid) {
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }

    const uploadedFiles: string[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (buffer.length === 0) {
        return NextResponse.json(
          { error: `File "${file.name}" is empty. Please upload a valid PDF.` },
          { status: 400 }
        );
      }

      const filename = generateSecureFilename(file.name);

      const fileDoc = await File.create({
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        data: buffer,
        uploadedBy: user.id,
        isQuery,
      });

      uploadedFiles.push(fileDoc._id.toString());
    }

    console.log('✅ Files uploaded to MongoDB:', {
      count: uploadedFiles.length,
      uploadedBy: user.email,
      isQuery,
    });

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? `Failed to upload files: ${error.message}` : 'Failed to upload files' },
      { status: 500 }
    );
  }
}
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? `Failed to upload files: ${error.message}` : 'Failed to upload files' },
      { status: 500 }
    );
  }
}
