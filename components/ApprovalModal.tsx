'use client';

import { useState, useRef } from 'react';
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
    status?: string;
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
  const [action, setAction] = useState<'approve' | 'reject' | 'reject_with_clarification'>('reject');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
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
    setAction('reject');
    setNotes('');
    setAttachments([]);
    setUrlInput('');
    setShowUrlInput(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      setAttachments(prev => [...prev, urlInput.trim()]);
      setUrlInput('');
      setShowUrlInput(false); // Hide the input after adding URL
    }
  };

  const handleShowUrlInput = () => {
    setShowUrlInput(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const validFiles = [...files].filter(f => f.type === 'application/pdf');
    if (validFiles.length !== files.length) {
      alert('Only PDF documents are allowed.');
      return;
    }

    try {
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('files', file);
      });

      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploaded = await res.json();
      setAttachments(prev => [...prev, ...uploaded.files]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'File upload failed.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              Process Request
            </h3>
            <p className="text-sm text-gray-500">
              Current status: <span className="font-mono">{request.status || 'pending'}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Request Details Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">{request.title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Requester</span>
                <p className="text-sm text-gray-900">{request.requester.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Cost Estimate</span>
                <p className="text-sm text-gray-900">₹{request.costEstimate.toLocaleString()}</p>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Purpose</span>
              <p className="text-sm text-gray-900">{request.purpose}</p>
            </div>
          </div>
          
          {/* Document Attachments Section */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Document Attachments</h4>
            
            {/* Upload Buttons */}
            <div className="flex gap-3 mb-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                Upload File
              </button>
              <button
                onClick={handleShowUrlInput}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                disabled={loading}
              >
                Add URL
              </button>
            </div>

            {/* URL Input - Only shown when Add URL is clicked */}
            {showUrlInput && (
              <div className="mb-4 flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Enter URL..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                  autoFocus
                />
                <button
                  onClick={handleAddUrl}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  disabled={loading || !urlInput.trim()}
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowUrlInput(false);
                    setUrlInput('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* File Type Info */}
            <div className="text-xs text-gray-500 mb-4">
              <p className="font-medium mb-1">Supported file types:</p>
              <p>Documents: PDF only</p>
              <p>Maximum file size: 10MB per file</p>
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {attachment.startsWith('/uploads/') ? attachment.split('/').pop() : attachment}
                    </span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-800 text-sm ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Section */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Action</h4>
            
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              disabled={loading}
            >
              <option value="reject">Reject</option>
              <option value="approve">Approve</option>
              <option value="reject_with_clarification">Request Clarification</option>
            </select>

            {/* Action Options Display */}
            <div className="mt-3 space-y-2">
              {action === 'reject' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                    <span className="font-medium text-red-700">Reject</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">Permanently reject this request</p>
                </div>
              )}
              
              {action === 'approve' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-700">Approve</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Approve and forward to next level</p>
                </div>
              )}
              
              {action === 'reject_with_clarification' && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 mr-2" />
                    <span className="font-medium text-orange-700">Request Clarification</span>
                  </div>
                  <p className="text-sm text-orange-600 mt-1">
                    The Dean has requested clarification from your department. Please provide your response.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">Notes</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                action === 'approve' 
                  ? "Add any comments or notes for this approval..." 
                  : action === 'reject_with_clarification'
                  ? "What additional information or clarification do you need?"
                  : "Please provide a reason for rejection..."
              }
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
              disabled={loading || (action !== 'approve' && !notes.trim())}
            >
              {loading ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}