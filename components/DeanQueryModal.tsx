'use client';

import { useState } from 'react';
import { ExclamationTriangleIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline';

interface DeanQueriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rejectionInfo: {
    rejector: { name: string; role: string };
    rejectionReason: string;
    timestamp: string;
  };
  requesterClarification?: {
    response: string;
    attachments?: string[];
    timestamp: string;
  };
  onSendToRequester: (message: string) => void;
  onReapprove: (notes: string) => void;
  loading?: boolean;
}

export default function DeanQueryModal({
  isOpen,
  onClose,
  rejectionInfo,
  requesterClarification,
  onSendToRequester,
  onReapprove,
  loading = false
}: DeanQueriesModalProps) {
  const [message, setMessage] = useState('');
  const [reapprovalNotes, setReapprovalNotes] = useState('');
  const [showReapprovalForm, setShowReapprovalForm] = useState(false);

  if (!isOpen) return null;

  const handleSendToRequester = () => {
    if (!message.trim()) {
      alert('Please provide a message for the requester');
      return;
    }
    onSendToRequester(message);
  };

  const handleReapprove = () => {
    if (!reapprovalNotes.trim()) {
      alert('Please provide notes for re-approval');
      return;
    }
    onReapprove(reapprovalNotes);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Request Rejected - Dean Review Required
              </h3>
              <p className="text-sm text-gray-500">
                Handle rejection from {rejectionInfo.rejector.role.toUpperCase()}
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

        {/* Rejection Details */}
        <div className="p-6 border-b border-gray-200">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <UserIcon className="w-4 h-4 mr-2" />
              Rejection from {rejectionInfo.rejector.name} ({rejectionInfo.rejector.role.toUpperCase()}):
            </h4>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-gray-800">{rejectionInfo.rejectionReason}</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Rejected on {new Date(rejectionInfo.timestamp).toLocaleString('en-GB')}
            </p>
          </div>
        </div>

        {/* Requester Response (if provided) */}
        {requesterClarification && (
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Requester&apos;s Response to Queries:
            </h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-800">{requesterClarification.response}</p>
            </div>
            
            {requesterClarification.attachments && requesterClarification.attachments.length > 0 && (
              <div className="mt-3">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Attachments:</h5>
                <div className="space-y-2">
                  {requesterClarification.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">📎 {attachment.split('/').pop()}</span>
                      <a 
                        href={`/api/download?file=${encodeURIComponent(attachment)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              Provided on {new Date(requesterClarification.timestamp).toLocaleString('en-GB')}
            </p>
          </div>
        )}

        {/* Action Forms */}
        {!requesterClarification ? (
          /* Send to Requester Form */
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Send to Requester for Response:
            </h4>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain what information is needed from the requester regarding the rejection..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={loading}
            />

            <div className="flex justify-between mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSendToRequester}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                disabled={loading || !message.trim()}
              >
                {loading ? 'Sending...' : 'Send to Requester'}
              </button>
            </div>
          </div>
        ) : (
          /* Review Response and Re-approve */
          <div className="p-6">
            {!showReapprovalForm ? (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">
                  Review the requester&apos;s response and decide:
                </h4>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setShowReapprovalForm(true)}
                    className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-green-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                  >
                    <span className="text-green-700 font-medium">Re-approve and Send Back</span>
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="w-full flex items-center justify-center space-x-2 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-700 font-medium">Need More Information</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Re-approval Notes:
                </h4>
                <textarea
                  value={reapprovalNotes}
                  onChange={(e) => setReapprovalNotes(e.target.value)}
                  placeholder="Add notes about why you're re-approving this request after reviewing the response..."
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                  disabled={loading}
                />
                
                <div className="flex justify-between mt-6">
                  <button
                    onClick={() => setShowReapprovalForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    disabled={loading}
                  >
                    Back
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
                      onClick={handleReapprove}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
                      disabled={loading || !reapprovalNotes.trim()}
                    >
                      {loading ? 'Processing...' : 'Re-approve Request'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}