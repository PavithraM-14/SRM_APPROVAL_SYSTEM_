import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import File from '../../../models/File';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = request.nextUrl;
    const fileId = searchParams.get('file');
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return NextResponse.json(
        { error: 'Invalid file ID' },
        { status: 400 }
      );
    }

    // Retrieve file from MongoDB
    const fileDoc = await File.findById(fileId);

    if (!fileDoc) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    console.log('👁️ File view:', {
      fileId: fileDoc._id,
      filename: fileDoc.originalName,
      size: fileDoc.size,
      mimeType: fileDoc.mimeType
    });

    // Return file for inline viewing (opens in browser)
    return new Response(fileDoc.data, {
      headers: {
        'Content-Type': fileDoc.mimeType,
        'Content-Disposition': `inline; filename="${fileDoc.originalName}"`,
        'Content-Length': fileDoc.size.toString(),
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
