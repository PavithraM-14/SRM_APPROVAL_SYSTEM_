'use client';

import { useEffect, useState } from 'react';

interface AttachmentListProps {
  attachments: string[];
  title?: string;
  className?: string;
  highlightColor?: 'blue' | 'green';
}

interface FileMetadata {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export default function AttachmentList({ 
  attachments, 
  title = 'Attachments',
  className = '',
  highlightColor = 'blue'
}: AttachmentListProps) {
  const [fileMetadata, setFileMetadata] = useState<Record<string, FileMetadata>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      const metadata: Record<string, FileMetadata> = {};

      for (const fileId of attachments) {
        try {
          const response = await fetch(`/api/files/${fileId}`);
          if (response.ok) {
            const data = await response.json();
            metadata[fileId] = data;
          }
        } catch (error) {
          console.error(`Failed to fetch metadata for ${fileId}:`, error);
        }
      }

      setFileMetadata(metadata);
      setLoading(false);
    };

    if (attachments.length > 0) {
      fetchMetadata();
    } else {
      setLoading(false);
    }
  }, [attachments]);

  if (attachments.length === 0) {
    return null;
  }

  const bgColor = highlightColor === 'green' ? 'bg-green-50' : 'bg-white';
  const textColor = highlightColor === 'green' ? 'text-green-800' : 'text-gray-900';

  return (
    <div className={className}>
      <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 bg-gray-100 px-3 py-2 rounded-md">
        {title}
      </h4>
      <div className="border rounded-lg divide-y divide-gray-200">
        {attachments.map((fileId, i) => {
          const metadata = fileMetadata[fileId];
          const fileName = metadata?.originalName || 'Loading...';
          const isPDF = fileName.toLowerCase().endsWith('.pdf');

          return (
            <div 
              key={i} 
              className={`p-3 flex flex-col xs:flex-row xs:justify-between xs:items-center gap-2 ${bgColor}`}
            >
              <span className={`text-xs sm:text-sm break-all flex-1 min-w-0 ${textColor}`}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  fileName
                )}
              </span>
              <div className="flex gap-2">
                {/* View Button (only for PDFs) */}
                {isPDF && !loading && (
                  <a 
                    href={`/api/view?file=${encodeURIComponent(fileId)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 transition-colors text-xs sm:text-sm font-medium px-2 py-1 rounded bg-green-50 hover:bg-green-100 whitespace-nowrap flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </a>
                )}
                
                {/* Download Button */}
                {!loading && (
                  <a 
                    href={`/api/download?file=${encodeURIComponent(fileId)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 transition-colors text-xs sm:text-sm font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 whitespace-nowrap flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
