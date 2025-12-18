'use client';

import { useState } from 'react';
import { XMarkIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    _id: string;
    title: string;
    purpose: string;
    costEstimate: number;
    requester: { name: string };
  };
  userRole: string;
  onApprove: (notes: string, attachments: string[]) => void;
  onReject: (notes: string) => void;
  onRejectWithClarification: (clarificationRequest: string, attachments: string[]) => void;
  loading?: boolean;
}

export default function ApprovalModal({
  isOpen,
  onClose,
  request,
  userRole,
  onApprove,
  onReject,
  onRejectWithClarification,
  loading = false
}: ApprovalModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | 'reject_with_clarification' | null>(null);
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!action) return;

    switch (action) {
      case 'approve':
        onApprove(notes, attachments);
        break;
      case 'reject':
        if (!notes.trim()) {
          alert('Please provide a reason for rejection');
          return;
        }
        onReject(notes);
        break;
      case 'reject_with_clarification':
        if (!notes.trim()) {
          alert('Please provide a clarification request');
          return;
        }
        onRejectWithClarification(notes, attachments);
        break;
    }
  };

  const resetForm = () => {
    setAction(null);
    setNotes('');
    setAttachments([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Review Request
            </h3>
            <p className="text-sm text-gray-500">
              {request.title}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Request Details */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Requester</h4>
              <p className="text-sm text-gray-600">{request.requester.name}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">Cost Estimate</h4>
              <p className="text-sm text-gray-600">₹{request.costEstimate.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900">Purpose</h4>
            <p className="text-sm text-gray-600 mt-1">{request.purpose}</p>
          </div>
        </div>

        {/* Action Selection */}
        {!action && (
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Choose your action:
            </h4>
            <div className="space-y-3">
              {/* Approve Button */}
              <button
                onClick={() => setAction('approve')}
                className="w-full flex items-center space-x-3 p-4 border-2 border-green-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                <div className="text-left">
                  <div className="font-medium text-green-700">Approve Request</div>
                  <div className="text-sm text-green-600">Approve and forward to next level</div>
                </div>
              </button>

              {/* Reject with Clarification Button */}
              <button
                onClick={() => setAction('reject_with_clarification')}
                className="w-full flex items-center space-x-3 p-4 border-2 border-yellow-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
              >
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
                <div className="text-left">
                  <div className="font-medium text-yellow-700">Request Clarification</div>
                  <div className="text-sm text-yellow-600">Send back to previous level with questions</div>
                </div>
              </button>

              {/* Final Reject Button */}
              <button
                onClick={() => setAction('reject')}
                className="w-full flex items-center space-x-3 p-4 border-2 border-red-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                <XCircleIcon className="w-6 h-6 text-red-600" />
                <div className="text-left">
                  <div className="font-medium text-red-700">Reject Request</div>
                  <div className="text-sm text-red-600">Permanently reject this request</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Action Forms */}
        {action === 'approve' && (
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Approval Notes (Optional):
            </h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any comments or notes for this approval..."
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              disabled={loading}
            />
            
            <div className="flex justify-between mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                disabled={loading}
              >
                Back
              </button>
              <div className="space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Approve Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {action === 'reject_with_clarification' && (
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Clarification Request (Required):
            </h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What clarification do you need? Be specific about what information or changes are required..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
              disabled={loading}
            />

            {/* File Upload Placeholder */}
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">
                Attach Supporting Documents (Optional):
              </label>
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">
                  File upload functionality will be implemented here
                </p>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                disabled={loading}
              >
                Back
              </button>
              <div className="space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium transition-colors disabled:opacity-50"
                  disabled={loading || !notes.trim()}
                >
                  {loading ? 'Processing...' : 'Request Clarification'}
                </button>
              </div>
            </div>
          </div>
        )}

        {action === 'reject' && (
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Rejection Reason (Required):
            </h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain why this request is being permanently rejected..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              disabled={loading}
            />

            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="text-sm font-medium text-red-800">Warning: Final Rejection</h5>
                  <p className="text-sm text-red-700 mt-1">
                    This will permanently reject the request. The requester will be notified and the request cannot be resubmitted.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                disabled={loading}
              >
                Back
              </button>
              <div className="space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
                  disabled={loading || !notes.trim()}
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