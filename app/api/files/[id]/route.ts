import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import File from '../../../../models/File';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const fileId = params.id;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return NextResponse.json(
        { error: 'Invalid file ID' },
        { status: 400 }
      );
    }

    // Retrieve file metadata (without the binary data)
    const fileDoc = await File.findById(fileId).select('-data');

    if (!fileDoc) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      _id: fileDoc._id,
      filename: fileDoc.filename,
      originalName: fileDoc.originalName,
      mimeType: fileDoc.mimeType,
      size: fileDoc.size,
      uploadedBy: fileDoc.uploadedBy,
      isQuery: fileDoc.isQuery,
      createdAt: fileDoc.createdAt,
      updatedAt: fileDoc.updatedAt
    });

  } catch (error) {
    console.error('File metadata error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file metadata' },
      { status: 500 }
    );
  }
}
