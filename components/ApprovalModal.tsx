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
  onApprove: (notes: string, attachments: string[], sopReference?: string, budgetAvailable?: boolean) => void;
  onReject: (notes: string) => void;
  onRejectWithClarification: (queryRequest: string, attachments: string[]) => void;
  onForward?: (notes: string, attachments: string[]) => void;
  onClarify?: (notes: string, attachments: string[], target?: string) => void;
  onSendToDean?: (notes: string, attachments: string[]) => void;
  onSendToVP?: (notes: string, attachments: string[]) => void;
  onSendToChairman?: (notes: string, attachments: string[]) => void;
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
  onForward,
  onClarify,
  onSendToDean,
  onSendToVP,
  onSendToChairman,
  loading = false
}: ApprovalModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | 'reject_with_clarification' | 'forward' | 'clarify' | 'send_to_dean' | 'send_to_vp' | 'send_to_chairman'>(() => {
    if (userRole === 'institution_manager' && request.status === 'manager_review') {
      return 'forward';
    }
    if (userRole === 'institution_manager' && request.status === 'institution_verified') {
      return 'send_to_dean';
    }
    if (['hr', 'it', 'audit', 'mma'].includes(userRole) && request.status === 'department_checks') {
      return 'forward';
    }
    return 'approve';
  });
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [target, setTarget] = useState(''); // For Dean department selection
  
  // SOP specific fields
  const [sopReference, setSopReference] = useState('');
  const [sopReferenceAvailable, setSopReferenceAvailable] = useState<boolean | null>(null);
  
  // Accountant specific fields
  const [budgetAvailable, setBudgetAvailable] = useState<boolean | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
    // Validation for SOP Verifier
    if (userRole === 'sop_verifier') {
      if (sopReferenceAvailable === null) {
        alert('Please select whether SOP reference is available or not');
        return;
      }
      if (sopReferenceAvailable && !sopReference.trim()) {
        alert('Please enter the SOP reference number');
        return;
      }
      // For SOP, always approve - no other actions allowed
      const finalSopReference = sopReferenceAvailable ? sopReference : undefined;
      onApprove(notes, attachments, finalSopReference, undefined);
      return;
    }
    
    // Validation for Accountant
    if (userRole === 'accountant') {
      if (budgetAvailable === null) {
        alert('Please select whether budget is available or not');
        return;
      }
      // For Accountant, always approve - no other actions allowed
      onApprove(notes, attachments, undefined, budgetAvailable);
      return;
    }

    // For Institution Manager in manager_review status, handle forward action
    if (userRole === 'institution_manager' && request.status === 'manager_review' && action === 'forward') {
      if (onForward) {
        onForward(notes, attachments);
      } else {
        alert('Forward action not configured');
      }
      return;
    }

    // For Institution Manager in institution_verified status, handle send_to_dean action
    if (userRole === 'institution_manager' && request.status === 'institution_verified' && action === 'send_to_dean') {
      if (onSendToDean) {
        onSendToDean(notes, attachments);
      } else {
        alert('Send to Dean action not configured');
      }
      return;
    }

    // For Institution Manager in institution_verified status, handle send_to_vp action
    if (userRole === 'institution_manager' && request.status === 'institution_verified' && action === 'send_to_vp') {
      if (onSendToVP) {
        onSendToVP(notes, attachments);
      } else {
        alert('Send to VP action not configured');
      }
      return;
    }

    // For Dean in dean_review or dean_verification status, handle send_to_chairman action
    if (userRole === 'dean' && (request.status === 'dean_review' || request.status === 'dean_verification') && action === 'send_to_chairman') {
      if (onSendToChairman) {
        onSendToChairman(notes, attachments);
      } else {
        alert('Send to Chairman action not configured');
      }
      return;
    }

    // For Department users in department_checks status, handle their actions
    if (['hr', 'it', 'audit', 'mma'].includes(userRole) && request.status === 'department_checks') {
      if (action === 'forward') {
        if (onForward) {
          onForward(notes, attachments);
        } else {
          alert('Forward action not configured');
        }
        return;
      }
      // For reject and reject_with_clarification, fall through to the switch statement below
    }

    // For Dean clarify action (send to department)
    if (userRole === 'dean' && action === 'clarify') {
      if (!target) {
        alert('Please select a department for verification');
        return;
      }
      if (onClarify) {
        onClarify(notes, attachments, target);
      } else {
        alert('Clarify action not configured');
      }
      return;
    }

    // For other roles and actions, handle different actions
    switch (action) {
      case 'approve':
      case 'forward':
        onApprove(notes, attachments, undefined, undefined);
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
          alert('Please provide clarification request for the requester');
          return;
        }
        onRejectWithClarification(notes, attachments);
        break;
      case 'clarify':
        if (!notes.trim()) {
          alert('Please provide instructions for the department');
          return;
        }
        if (onClarify) {
          onClarify(notes, attachments, target);
        } else {
          alert('Clarify action not configured');
        }
        break;
    }
  };

  const resetForm = () => {
    setAction('approve');
    setNotes('');
    setAttachments([]);
    setUrlInput('');
    setShowUrlInput(false);
    setTarget('');
    setSopReference('');
    setSopReferenceAvailable(null);
    setBudgetAvailable(null);
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
      setShowUrlInput(false);
    }
  };

  const handleShowUrlInput = () => {
    setShowUrlInput(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf');
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

  const isSopVerifier = userRole === 'sop_verifier';
  const isAccountant = userRole === 'accountant';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              {isSopVerifier ? 'SOP Verification' : isAccountant ? 'Budget Verification' : 'Process Request'}
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

          {/* SOP Verifier Specific Section */}
          {isSopVerifier && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-lg font-medium text-blue-900 mb-4">SOP Reference Verification</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Is SOP reference available for this request?
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="sopAvailable"
                        checked={sopReferenceAvailable === true}
                        onChange={() => setSopReferenceAvailable(true)}
                        className="mr-2"
                        disabled={loading}
                      />
                      <span className="text-sm">Yes, reference available</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="sopAvailable"
                        checked={sopReferenceAvailable === false}
                        onChange={() => setSopReferenceAvailable(false)}
                        className="mr-2"
                        disabled={loading}
                      />
                      <span className="text-sm">No, not available</span>
                    </label>
                  </div>
                </div>

                {sopReferenceAvailable === true && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SOP Reference Number *
                    </label>
                    <input
                      type="text"
                      value={sopReference}
                      onChange={(e) => setSopReference(e.target.value)}
                      placeholder="Enter SOP reference number (e.g., SOP-2024-001)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading}
                    />
                  </div>
                )}

                {sopReferenceAvailable === false && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> No SOP reference is available for this type of request. 
                      This will be recorded in the approval history.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Accountant Specific Section */}
          {isAccountant && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-lg font-medium text-green-900 mb-4">Budget Verification</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Status for ₹{request.costEstimate.toLocaleString()}
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="budgetStatus"
                        checked={budgetAvailable === true}
                        onChange={() => setBudgetAvailable(true)}
                        className="mr-2"
                        disabled={loading}
                      />
                      <span className="text-sm">Budget Available</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="budgetStatus"
                        checked={budgetAvailable === false}
                        onChange={() => setBudgetAvailable(false)}
                        className="mr-2"
                        disabled={loading}
                      />
                      <span className="text-sm">Budget Not Available</span>
                    </label>
                  </div>
                </div>

                {budgetAvailable === true && (
                  <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>✓ Budget Available:</strong> Sufficient funds are available for this request. 
                      The request will proceed through the standard approval workflow.
                    </p>
                  </div>
                )}

                {budgetAvailable === false && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>⚠ Budget Not Available:</strong> Insufficient funds for this request. 
                      This will require special approval through the Dean pathway.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
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

            {/* URL Input */}
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
            
            {(isSopVerifier || isAccountant) ? (
              // Simplified interface for SOP and Accountant - only approve option
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-700">
                    {isSopVerifier ? 'Complete SOP Verification' : 'Complete Budget Verification'}
                  </span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  {isSopVerifier 
                    ? 'Complete SOP verification and forward to next step' 
                    : 'Complete budget verification and forward to next step'
                  }
                </p>
              </div>
            ) : userRole === 'dean' && (request.status === 'dean_review' || request.status === 'dean_verification') ? (
              // Special interface for Dean in dean_review or dean_verification status
              <>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  disabled={loading}
                >
                  {request.status === 'dean_review' ? (
                    <>
                      <option value="approve">Approve to Chief Director</option>
                      <option value="send_to_chairman">Send to Chairman</option>
                      <option value="clarify">Send to Department for Verification</option>
                      <option value="reject">Reject</option>
                      <option value="reject_with_clarification">Raise Clarification</option>
                    </>
                  ) : (
                    // dean_verification status - after department verification
                    <>
                      <option value="approve">Approve to Chief Director</option>
                      <option value="send_to_chairman">Send to Chairman</option>
                      <option value="reject">Reject</option>
                      <option value="reject_with_clarification">Raise Clarification</option>
                    </>
                  )}
                </select>

                {/* Action Options Display */}
                <div className="mt-3 space-y-2">
                  {action === 'approve' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                        <span className="font-medium text-green-700">Approve to Chief Director</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        {request.status === 'dean_verification' 
                          ? 'Department verification complete. Approve and send to Chief Director.'
                          : 'Approve and send directly to Chief Director.'
                        }
                      </p>
                    </div>
                  )}

                  {action === 'send_to_chairman' && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircleIcon className="w-5 h-5 text-purple-600 mr-2" />
                        <span className="font-medium text-purple-700">Send to Chairman</span>
                      </div>
                      <p className="text-sm text-purple-600 mt-1">
                        Send this request directly to Chairman for final approval, bypassing Chief Director.
                      </p>
                    </div>
                  )}
                  
                  {action === 'clarify' && request.status === 'dean_review' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center">
                        <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="font-medium text-blue-700">Send to Department for Verification</span>
                      </div>
                      <p className="text-sm text-blue-600 mt-1">
                        Send this request to HR, IT, AUDIT, or MMA department for verification. They will review and return it to you for final approval.
                      </p>
                      
                      {/* Department Selection */}
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Department for Verification:
                        </label>
                        <select
                          value={target || ''}
                          onChange={(e) => setTarget(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          disabled={loading}
                        >
                          <option value="">Choose department...</option>
                          <option value="hr">HR Department</option>
                          <option value="it">IT Department</option>
                          <option value="audit">Audit Department</option>
                          <option value="mma">MMA Department</option>
                        </select>
                      </div>
                    </div>
                  )}
                  
                  {action === 'reject' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                        <span className="font-medium text-red-700">Reject</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">Permanently reject this request</p>
                    </div>
                  )}
                  
                  {action === 'reject_with_clarification' && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center">
                        <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 mr-2" />
                        <span className="font-medium text-orange-700">Raise Clarification</span>
                      </div>
                      <p className="text-sm text-orange-600 mt-1">
                        Request additional information from the requester
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : ['hr', 'it', 'audit', 'mma'].includes(userRole) && request.status === 'department_checks' ? (
              // Special interface for Department users in department_checks status
              <>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  disabled={loading}
                >
                  <option value="forward">Complete Verification & Send to Dean</option>
                  <option value="reject">Reject</option>
                  <option value="reject_with_clarification">Raise Clarification</option>
                </select>

                {/* Action Options Display */}
                <div className="mt-3 space-y-2">
                  {action === 'forward' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                        <span className="font-medium text-green-700">Complete Verification & Send to Dean</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Complete your department verification and send back to Dean for final approval.
                      </p>
                    </div>
                  )}
                  
                  {action === 'reject' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                        <span className="font-medium text-red-700">Reject</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">Permanently reject this request</p>
                    </div>
                  )}
                  
                  {action === 'reject_with_clarification' && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center">
                        <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 mr-2" />
                        <span className="font-medium text-orange-700">Raise Clarification</span>
                      </div>
                      <p className="text-sm text-orange-600 mt-1">
                        Request additional information from the requester
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : userRole === 'institution_manager' && request.status === 'manager_review' ? (
              // Special interface for Institution Manager in manager_review status
              <>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  disabled={loading}
                >
                  <option value="forward">Send to SOP & Budget Verification</option>
                  <option value="reject">Reject</option>
                  <option value="reject_with_clarification">Raise Clarification</option>
                </select>

                {/* Action Options Display */}
                <div className="mt-3 space-y-2">
                  {action === 'forward' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                        <span className="font-medium text-green-700">Send for Parallel Verification</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        This will send the request to both SOP Verifier and Accountant simultaneously for parallel processing.
                      </p>
                    </div>
                  )}
                  
                  {action === 'reject' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                        <span className="font-medium text-red-700">Reject</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">Permanently reject this request</p>
                    </div>
                  )}
                  
                  {action === 'reject_with_clarification' && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center">
                        <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 mr-2" />
                        <span className="font-medium text-orange-700">Raise Clarification</span>
                      </div>
                      <p className="text-sm text-orange-600 mt-1">
                        Request additional information from the requester
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : userRole === 'institution_manager' && request.status === 'institution_verified' ? (
              // Interface for Institution Manager after verification is complete
              <>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  disabled={loading}
                >
                  <option value="send_to_dean">Send to Dean</option>
                  <option value="send_to_vp">Send to VP</option>
                  <option value="reject_with_clarification">Raise Clarification</option>
                  <option value="reject">Reject</option>
                </select>

                {/* Action Options Display */}
                <div className="mt-3 space-y-2">
                  {action === 'send_to_dean' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="font-medium text-blue-700">Send to Dean</span>
                      </div>
                      <p className="text-sm text-blue-600 mt-1">
                        Send this request directly to Dean for review. Dean will then forward to Chairman for final approval.
                      </p>
                    </div>
                  )}

                  {action === 'send_to_vp' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                        <span className="font-medium text-green-700">Send to VP</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Send this request through normal approval flow: VP → HOI → Dean → Chief Director.
                      </p>
                    </div>
                  )}
                  
                  {action === 'reject_with_clarification' && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center">
                        <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 mr-2" />
                        <span className="font-medium text-orange-700">Raise Clarification</span>
                      </div>
                      <p className="text-sm text-orange-600 mt-1">
                        Request additional information from the requester
                      </p>
                    </div>
                  )}
                  
                  {action === 'reject' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <XCircleIcon className="w-5 h-5 text-red-600 mr-2" />
                        <span className="font-medium text-red-700">Reject</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">Permanently reject this request</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Full interface for other roles
              <>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  disabled={loading}
                >
                  <option value="approve">Approve</option>
                  <option value="reject">Reject</option>
                  <option value="reject_with_clarification">Raise Clarification</option>
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
                        <span className="font-medium text-orange-700">Raise Clarification</span>
                      </div>
                      <p className="text-sm text-orange-600 mt-1">
                        Request additional information from the requester
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Notes Section */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">
              {(isSopVerifier || isAccountant) ? 'Comments (Optional)' : 
               (['hr', 'it', 'audit', 'mma'].includes(userRole) && action === 'forward') ? 'Comments (Optional)' :
               action === 'approve' ? 'Comments (Optional)' : 'Notes'}
            </h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isSopVerifier
                  ? "Add any comments about the SOP verification... (Optional)"
                  : isAccountant
                  ? "Add any comments about the budget verification... (Optional)"
                  : (['hr', 'it', 'audit', 'mma'].includes(userRole) && action === 'forward')
                  ? "Add any comments about your department verification... (Optional)"
                  : action === 'approve' 
                  ? "Add any comments or notes for this approval..."
                  : action === 'reject_with_clarification'
                  ? "What clarification do you need from the requester?"
                  : "Please provide a reason for rejection..."
              }
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={loading}
            />
            {((isSopVerifier || isAccountant) || (['hr', 'it', 'audit', 'mma'].includes(userRole) && action === 'forward')) && (
              <p className="text-xs text-gray-500 mt-1">
                Comments are optional. You can leave this blank if no additional notes are needed.
              </p>
            )}
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
              disabled={loading || (
                // For SOP and Accountant, only check their specific requirements
                (isSopVerifier && sopReferenceAvailable === null) ||
                (isSopVerifier && sopReferenceAvailable === true && !sopReference.trim()) ||
                (isAccountant && budgetAvailable === null) ||
                // For department users, notes are optional for forward action, required for reject actions
                (['hr', 'it', 'audit', 'mma'].includes(userRole) && action !== 'forward' && !notes.trim()) ||
                // For other roles, check notes requirement for non-approve actions
                (!isSopVerifier && !isAccountant && !['hr', 'it', 'audit', 'mma'].includes(userRole) && action !== 'approve' && !notes.trim())
              )}
            >
              {loading ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
