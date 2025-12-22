'use client';

import { useState } from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import FileUpload from './FileUpload';

interface QueriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  clarificationRequest: {
    actor: { name: string; role: string };
    clarificationRequest: string;
    timestamp: string;
    attachments?: string[];
  };
  onClarifyAndApprove: (response: string, attachments: string[]) => void;
  onReject: (reason: string) => void;
  loading?: boolean;
  userRole?: string;
  isRequester?: boolean;
}

export default function ClarificationModal({
  isOpen,
  onClose,
  clarificationRequest,
  onClarifyAndApprove,
  onReject,
  loading = false,
  userRole = '',
  isRequester = false
}: QueriesModalProps) {
  const [clarificationResponse, setClarificationResponse] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleClarifyAndApprove = () => {
    if (!clarificationResponse.trim()) {
      alert('Please provide a response to the queries');
      return;
    }
    onClarifyAndApprove(clarificationResponse, attachments);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onReject(rejectReason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Queries Required
              </h3>
              <p className="text-sm text-gray-500">
                Response needed from {clarificationRequest.actor.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Queries Request */}
        <div className="p-6 border-b border-gray-200">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Question from {clarificationRequest.actor.name} ({clarificationRequest.actor.role}):
            </h4>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-gray-800">{clarificationRequest.clarificationRequest}</p>
            </div>
          </div>

          {clarificationRequest.attachments && clarificationRequest.attachments.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Attachments:</h5>
              <div className="space-y-2">
                {clarificationRequest.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center min-w-0 flex-1">
                      <svg className="flex-shrink-0 h-4 w-4 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700 truncate">{attachment.split('/').pop() || attachment}</span>
                    </div>
                    <a 
                      href={`/api/download?file=${encodeURIComponent(attachment)}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 whitespace-nowrap ml-2"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Requested on {new Date(clarificationRequest.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Response Form */}
        {!showRejectForm ? (
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Your Response to Queries:
            </h4>
            <textarea
              value={clarificationResponse}
              onChange={(e) => setClarificationResponse(e.target.value)}
              placeholder="Provide your response to the queries here..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={loading}
            />

            {/* File Upload - Only for Requesters */}
            {isRequester && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attach Supporting Documents (Optional):
                </label>
                <FileUpload
                  onFilesUploaded={setAttachments}
                  maxFiles={3}
                  disabled={loading}
                  existingFiles={attachments}
                  isClarification={true}
                />
                <p className="text-xs text-blue-600 mt-2">
                  Only PDF files can be attached during query responses
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setShowRejectForm(true)}
                className="px-4 py-2 text-red-600 hover:text-red-800 font-medium transition-colors"
                disabled={loading}
              >
                Cannot Answer - Reject
              </button>
              <div className="space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClarifyAndApprove}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
                  disabled={loading || !clarificationResponse.trim()}
                >
                  {loading ? 'Processing...' : 'Approve with Response'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Reject Form */
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Reason for Rejection:
            </h4>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why you cannot provide the requested information..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              disabled={loading}
            />

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setShowRejectForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                disabled={loading}
              >
                Back to Response
              </button>
              <div className="space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
                  disabled={loading || !rejectReason.trim()}
                >
                  {loading ? 'Processing...' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}