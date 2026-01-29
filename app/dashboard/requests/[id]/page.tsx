'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ApprovalModal from '../../../../components/ApprovalModal';
import QueryModal from '../../../../components/QueryModal';
import QueryIndicator from '../../../../components/QueryIndicator';
import DeanQueryModal from '../../../../components/DeanQueryModal';
import ApprovalHistory from '../../../../components/ApprovalHistory';
import ApprovalWorkflow from '../../../../components/ApprovalWorkflow';
import { RequestStatus, ActionType, UserRole } from '../../../../lib/types';
import { approvalEngine } from '../../../../lib/approval-engine';
import { queryEngine } from '../../../../lib/query-engine';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Simple Direct Clarification Modal Component
interface DirectQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    _id: string;
    title: string;
    requester: { name: string };
  };
  onSubmit: (queryRequest: string, attachments: string[]) => void;
  loading?: boolean;
}

function DirectQueryModal({
  isOpen,
  onClose,
  request,
  onSubmit,
  loading = false
}: DirectQueryModalProps) {
  const [queryRequest, setQueryRequest] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!queryRequest.trim()) {
      alert('Please provide a query request');
      return;
    }
    onSubmit(queryRequest, []);
    setQueryRequest('');
  };

  const handleClose = () => {
    setQueryRequest('');
    onClose();
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
                Raise Query
              </h3>
              <p className="text-sm text-gray-500">
                {request.title}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Send this request back to <strong>{request.requester.name}</strong> with questions or requests for additional information.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Query Request *
            </label>
            <textarea
              value={queryRequest}
              onChange={(e) => setQueryRequest(e.target.value)}
              placeholder="What additional information do you need from the requester?"
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
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
              disabled={loading || !queryRequest.trim()}
            >
              {loading ? 'Sending...' : 'Send Queries to Requester'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

interface ApprovalHistoryItem {
  _id: string;
  action: ActionType;
  actor: User;
  notes?: string;
  budgetAvailable?: boolean;
  forwardedMessage?: string;
  attachments?: string[];
  previousStatus?: RequestStatus;
  newStatus?: RequestStatus;
  timestamp: Date;
  queryRequest?: string;
  queryResponse?: string;
  queryAttachments?: string[];
  requiresClarification?: boolean;
  isDeanMediated?: boolean;
  originalRejector?: string;
}

interface Request {
  _id: string;
  requestId?: string;
  title: string;
  purpose: string;
  college: string;
  department: string;
  costEstimate: number;
  expenseCategory: string;
  sopReference?: string;
  attachments: string[];
  requester: User;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  history: ApprovalHistoryItem[];
  pendingQuery?: boolean;
  queryLevel?: string;
  budgetAllocated?: number;
  budgetSpent?: number;
  budgetBalance?: number;
  budgetAvailable?: boolean;
}

export default function RequestDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [isDeanQueryModalOpen, setIsDeanQueryModalOpen] = useState(false);
  const [isDirectQueryModalOpen, setIsDirectQueryModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showApprovalHistory, setShowApprovalHistory] = useState(false);
  const [processingApproval, setProcessingApproval] = useState(false);

  useEffect(() => {
    fetchRequest();
    fetchCurrentUser();
  }, [params.id]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const fetchRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/requests/${params.id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error('Request not found');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to view this request');
        } else if (response.status === 401) {
          throw new Error('Please log in to view this request');
        }
        throw new Error(errorData.error || 'Failed to fetch request');
      }

      const data = await response.json();
      setRequest(data);

      // Auto-open appropriate queries modal if request needs response from current user
      // IMPORTANT: Only REQUESTERS and DEAN (in Dean-mediated cases) can provide responses to queries
      if (currentUser && data.pendingQuery && data.queryLevel === currentUser.role) {
        if (currentUser.role === 'dean' && queryEngine.isDeanMediatedClarification(data)) {
          setIsDeanQueryModalOpen(true);
        } else if (currentUser.role === 'requester') {
          // Only auto-open for requesters, not for the original rejectors
          setIsQueryModalOpen(true);
        }
        // For other roles (VP, Manager, etc.), don't auto-open any modal
        // They should see the request in their rejected list until requester responds
      }

    } catch (err) {
      console.error('Error fetching request:', err);
      setError(err instanceof Error ? err.message : 'Failed to load request');
    } finally {
      setLoading(false);
    }
  };

  const handleForward = async (notes: string, attachments: string[]) => {
    try {
      setProcessingApproval(true);
      const response = await fetch(`/api/requests/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'forward',
          notes,
          attachments
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to forward request');
      }

      await fetchRequest();
      setIsApprovalModalOpen(false);

    } catch (err) {
      console.error('Forward error:', err);
      throw err;
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleClarify = async (notes: string, attachments: string[], target?: string) => {
    try {
      setProcessingApproval(true);
      const response = await fetch(`/api/requests/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clarify',
          notes,
          attachments,
          target
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send for department verification');
      }

      await fetchRequest();
      setIsApprovalModalOpen(false);

    } catch (err) {
      console.error('Clarify error:', err);
      throw err;
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleApprove = async (notes: string, attachments: string[], sopReference?: string, budgetAvailable?: boolean, budgetData?: { allocated: number; spent: number; balance: number }) => {
    try {
      setProcessingApproval(true);
      const response = await fetch(`/api/requests/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          notes,
          attachments,
          sopReference,
          budgetAvailable,
          budgetData
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process approval');
      }

      await fetchRequest();
      setIsApprovalModalOpen(false);

    } catch (err) {
      console.error('Approval error:', err);
      throw err;
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleReject = async (notes: string) => {
    try {
      setProcessingApproval(true);
      const response = await fetch(`/api/requests/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          notes
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process rejection');
      }

      await fetchRequest();
      setIsApprovalModalOpen(false);

    } catch (err) {
      console.error('Rejection error:', err);
      throw err;
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleRejectWithClarification = async (queryRequest: string, attachments: string[]) => {
    try {
      setProcessingApproval(true);
      const response = await fetch(`/api/requests/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_with_query',
          notes: queryRequest,
          attachments
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request query');
      }

      await fetchRequest();
      setIsApprovalModalOpen(false);

    } catch (err) {
      console.error('Clarification request error:', err);
      throw err;
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleQueryAndApprove = async (response: string, attachments: string[]) => {
    try {
      setProcessingApproval(true);
      const apiResponse = await fetch(`/api/requests/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'query_and_reapprove',
          notes: response,
          attachments
        }),
      });
      
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Failed to provide query');
      }

      await fetchRequest();
      setIsQueryModalOpen(false);

    } catch (err) {
      console.error('Response error:', err);
      throw err;
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleClarificationReject = async (reason: string) => {
    try {
      setProcessingApproval(true);
      const response = await fetch(`/api/requests/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          notes: reason
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject request');
      }

      await fetchRequest();
      setIsQueryModalOpen(false);

    } catch (err) {
      console.error('Clarification rejection error:', err);
      throw err;
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleDeanSendToRequester = async (message: string) => {
    try {
      setProcessingApproval(true);
      const response = await fetch(`/api/requests/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dean_send_to_requester',
          notes: message
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send to requester');
      }

      await fetchRequest();
      setIsDeanQueryModalOpen(false);

    } catch (err) {
      console.error('Dean send to requester error:', err);
      throw err;
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleDeanReapprove = async (notes: string) => {
    try {
      setProcessingApproval(true);
      const response = await fetch(`/api/requests/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'query_and_reapprove',
          notes
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to re-approve request');
      }

      await fetchRequest();
      setIsDeanQueryModalOpen(false);

    } catch (err) {
      console.error('Dean re-approval error:', err);
      throw err;
    } finally {
      setProcessingApproval(false);
    }
  };

  // Institution Manager specific handlers
  const handleSendToDean = async (notes: string, attachments: string[]) => {
    if (!request) return;
    
    try {
      setProcessingApproval(true);
      console.log('[DEBUG] handleSendToDean called:', {
        requestId: params.id,
        requestStatus: request.status,
        userRole: currentUser?.role,
        notes,
        attachments
      });
      
      const response = await fetch(`/api/requests/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_to_dean',
          notes,
          attachments
        }),
      });
      
      console.log('[DEBUG] API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[DEBUG] API error:', errorData);
        throw new Error(errorData.error || 'Failed to send to Dean');
      }

      const responseData = await response.json();
      console.log('[DEBUG] API success response:', responseData);

      await fetchRequest();
      setIsApprovalModalOpen(false);

    } catch (err) {
      console.error('Send to Dean error:', err);
      throw err;
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleSendToVP = async (notes: string, attachments: string[]) => {
    try {
      setProcessingApproval(true);
      const response = await fetch(`/api/requests/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_to_vp',
          notes,
          attachments
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send to VP');
      }

      await fetchRequest();
      setIsApprovalModalOpen(false);

    } catch (err) {
      console.error('Send to VP error:', err);
      throw err;
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleSendToChairman = async (notes: string, attachments: string[]) => {
    if (!request) return;
    
    try {
      setProcessingApproval(true);
      console.log('[DEBUG] handleSendToChairman called:', {
        requestId: params.id,
        requestStatus: request.status,
        userRole: currentUser?.role,
        notes,
        attachments
      });
      
      const response = await fetch(`/api/requests/${params.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_to_chairman',
          notes,
          attachments
        }),
      });
      
      console.log('[DEBUG] API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[DEBUG] API error:', errorData);
        throw new Error(errorData.error || 'Failed to send to Chairman');
      }

      const responseData = await response.json();
      console.log('[DEBUG] API success response:', responseData);

      await fetchRequest();
      setIsApprovalModalOpen(false);

    } catch (err) {
      console.error('Send to Chairman error:', err);
      throw err;
    } finally {
      setProcessingApproval(false);
    }
  };

  const hideWorkflowAndHistory =
    currentUser?.role === 'sop_verifier' || currentUser?.role === 'accountant';

  const handleBackToRequests = () => {
    // Try to go back in history first, fallback to appropriate page based on user role
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback based on user role
      if (currentUser?.role === UserRole.REQUESTER) {
        router.push('/dashboard/requests');
      } else {
        router.push('/dashboard/approvals');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-base sm:text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-sm sm:text-base text-red-700">{error || 'Request not found'}</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleBackToRequests}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base active:scale-95"
            >
              {currentUser?.role === UserRole.REQUESTER ? 'Back to My Requests' : 'Back to Approvals'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm sm:text-base active:scale-95"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">

      {/* Back Button */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={handleBackToRequests}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm sm:text-base active:scale-95"
        >
          <svg className="mr-1 h-4 w-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" />
          </svg>
          <span className="hidden sm:inline">{currentUser?.role === UserRole.REQUESTER ? 'Back to My Requests' : 'Back to Approvals'}</span>
          <span className="sm:hidden">Back</span>
        </button>
      </div>

      {/* Request Details */}
      <div className="bg-white shadow rounded-lg sm:rounded-xl mb-6 sm:mb-8">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 break-words">{request.title}</h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">{request.purpose}</p>
        </div>

        {/* Details */}
        <div className="px-4 sm:px-6 py-4 sm:py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="w-full space-y-6">
              {/* Request Information */}
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 bg-gray-100 px-3 py-2 rounded-md">Request Information</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 items-start">
                    <dt className="text-xs sm:text-sm font-medium text-gray-700">ID</dt>
                    <dd className="text-xs sm:text-sm text-gray-900 break-all col-span-2">
                      {request.requestId || request._id.slice(-6)}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-start">
                    <dt className="text-xs sm:text-sm font-medium text-gray-700">Requester</dt>
                    <dd className="text-xs sm:text-sm text-gray-900 break-words col-span-2">{request.requester.name}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-start">
                    <dt className="text-xs sm:text-sm font-medium text-gray-700">Email</dt>
                    <dd className="text-xs sm:text-sm text-gray-900 break-all col-span-2">{request.requester.email}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-start">
                    <dt className="text-xs sm:text-sm font-medium text-gray-700">Institution</dt>
                    <dd className="text-xs sm:text-sm text-gray-900 break-words col-span-2">{request.college}</dd>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-start">
                    <dt className="text-xs sm:text-sm font-medium text-gray-700">Department</dt>
                    <dd className="text-xs sm:text-sm text-gray-900 break-words col-span-2">
                      {request.department.replace(/^Department of\s*/i, '')}
                    </dd>
                  </div>
                </div>
              </div>

              {/* Status Information - show on left side only if there's financial/budget info, otherwise it goes to right side */}
              {((request.costEstimate > 0 || (request.expenseCategory && request.expenseCategory.trim() !== '') || request.sopReference) || 
                (request.costEstimate > 0 && (request.budgetAllocated > 0 || request.budgetSpent > 0 || (request.budgetBalance !== undefined && request.budgetBalance !== 0)))) && (
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 bg-gray-100 px-3 py-2 rounded-md">Status Information</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 items-start">
                      <dt className="text-xs sm:text-sm font-medium text-gray-700">Status</dt>
                      <dd className="text-xs sm:text-sm col-span-2">
                        <span className="text-xs sm:text-sm text-gray-900">
                          {request.status === 'parallel_verification' 
                            ? 'VERIFICATION' 
                            : request.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {request.pendingQuery && request.queryLevel === currentUser?.role && (
                          <QueryIndicator size="sm" showText={false} />
                        )}
                      </dd>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-start">
                      <dt className="text-xs sm:text-sm font-medium text-gray-700">Created</dt>
                      <dd className="text-xs sm:text-sm text-gray-900 col-span-2">{new Date(request.createdAt).toLocaleDateString('en-GB')}</dd>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full space-y-6">
              {/* Conditionally show Financial Information section */}
              {(request.costEstimate > 0 || (request.expenseCategory && request.expenseCategory.trim() !== '') || request.sopReference) && (
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 bg-gray-100 px-3 py-2 rounded-md">Financial Information</h4>
                  <div className="space-y-3">
                    {request.costEstimate > 0 && (
                      <div className="grid grid-cols-3 gap-2 items-start">
                        <dt className="text-xs sm:text-sm font-medium text-gray-700">Cost Estimate</dt>
                        <dd className="text-sm sm:text-base font-semibold text-green-600 col-span-2">₹{request.costEstimate.toLocaleString()}</dd>
                      </div>
                    )}

                    {request.expenseCategory && request.expenseCategory.trim() !== '' && (
                      <div className="grid grid-cols-3 gap-2 items-start">
                        <dt className="text-xs sm:text-sm font-medium text-gray-700">Expense Category</dt>
                        <dd className="text-xs sm:text-sm text-gray-900 break-words col-span-2">{request.expenseCategory}</dd>
                      </div>
                    )}

                    {request.sopReference && (
                      <div className="grid grid-cols-3 gap-2 items-start">
                        <dt className="text-xs sm:text-sm font-medium text-gray-700">SOP Reference</dt>
                        <dd className="text-xs sm:text-sm text-gray-900 break-words col-span-2">{request.sopReference}</dd>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Budget Details - show only if there's meaningful budget data and cost estimate > 0 */}
              {request.costEstimate > 0 && (request.budgetAllocated > 0 || request.budgetSpent > 0 || (request.budgetBalance !== undefined && request.budgetBalance !== 0)) && (
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 bg-gray-100 px-3 py-2 rounded-md">Budget Details</h4>
                  <div className="space-y-3">
                    {request.budgetAllocated > 0 && (
                      <div className="grid grid-cols-3 gap-2 items-start">
                        <dt className="text-xs sm:text-sm font-medium text-gray-700">Budget Allocated</dt>
                        <dd className="text-sm sm:text-base font-semibold text-blue-600 col-span-2">₹{request.budgetAllocated.toLocaleString()}</dd>
                      </div>
                    )}

                    {request.budgetSpent > 0 && (
                      <div className="grid grid-cols-3 gap-2 items-start">
                        <dt className="text-xs sm:text-sm font-medium text-gray-700">Budget Spent</dt>
                        <dd className="text-sm sm:text-base font-semibold text-orange-600 col-span-2">₹{request.budgetSpent.toLocaleString()}</dd>
                      </div>
                    )}

                    {request.budgetBalance !== undefined && (
                      <div className="grid grid-cols-3 gap-2 items-start">
                        <dt className="text-xs sm:text-sm font-medium text-gray-700">Budget Available</dt>
                        <dd className={`text-sm sm:text-base font-semibold col-span-2 ${
                          request.budgetBalance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ₹{request.budgetBalance.toLocaleString()}
                        </dd>
                      </div>
                    )}

                    {/* Budget Availability Status */}
                    {request.budgetBalance !== undefined && (
                      <div className="grid grid-cols-3 gap-2 items-start">
                        <dt className="text-xs sm:text-sm font-medium text-gray-700">Budget Availability</dt>
                        <dd className="text-xs sm:text-sm col-span-2">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            request.budgetBalance >= request.costEstimate 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {request.budgetBalance >= request.costEstimate ? 'Available' : 'Not Available'}
                          </span>
                        </dd>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Information - show on right side only if there's NO financial/budget info */}
              {!((request.costEstimate > 0 || (request.expenseCategory && request.expenseCategory.trim() !== '') || request.sopReference) || 
                (request.costEstimate > 0 && (request.budgetAllocated > 0 || request.budgetSpent > 0 || (request.budgetBalance !== undefined && request.budgetBalance !== 0)))) && (
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 bg-gray-100 px-3 py-2 rounded-md">Status Information</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 items-start">
                      <dt className="text-xs sm:text-sm font-medium text-gray-700">Status</dt>
                      <dd className="text-xs sm:text-sm col-span-2">
                        <span className="text-xs sm:text-sm text-gray-900">
                          {request.status === 'parallel_verification' 
                            ? 'VERIFICATION' 
                            : request.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {request.pendingQuery && request.queryLevel === currentUser?.role && (
                          <QueryIndicator size="sm" showText={false} />
                        )}
                      </dd>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-start">
                      <dt className="text-xs sm:text-sm font-medium text-gray-700">Created</dt>
                      <dd className="text-xs sm:text-sm text-gray-900 col-span-2">{new Date(request.createdAt).toLocaleDateString('en-GB')}</dd>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ✅ UPDATED Attachments Section with View Button */}
          {request.attachments?.length > 0 && (
            <div className="mt-4 sm:mt-6">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 bg-gray-100 px-3 py-2 rounded-md">Attachments</h4>
              <div className="border rounded-lg divide-y divide-gray-200">
                {request.attachments.map((a, i) => {
                  const fileName = a.split('/').pop();
                  const isPDF = fileName?.toLowerCase().endsWith('.pdf');
                  
                  return (
                    <div key={i} className="p-3 flex flex-col xs:flex-row xs:justify-between xs:items-center gap-2">
                      <span className="text-xs sm:text-sm break-all flex-1 min-w-0">{fileName}</span>
                      <div className="flex gap-2">
                        {/* View Button (only for PDFs) */}
                        {isPDF && (
                          <a 
                            href={`/api/view?file=${encodeURIComponent(a)}`} 
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
                        <a 
                          href={`/api/download?file=${encodeURIComponent(a)}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 transition-colors text-xs sm:text-sm font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 whitespace-nowrap flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          

          {/* Query Response Attachments (latest) */}
          {(() => {
            const latestRequesterClarification = request.history
              ?.filter((h: any) => h.action === 'CLARIFY_AND_REAPPROVE' && h.actor?.role === 'requester' && (h.queryAttachments?.length > 0))
              ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            if (!latestRequesterClarification) return null;

            const files: string[] = latestRequesterClarification.queryAttachments || [];
            return (
              <div className="mt-4 sm:mt-6">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 bg-gray-100 px-3 py-2 rounded-md">Query Response Attachments</h4>
                <div className="border rounded-lg divide-y divide-gray-200">
                  {files.map((a, i) => {
                    const fileName = a.split('/').pop();
                    const isPDF = fileName?.toLowerCase().endsWith('.pdf');
                    return (
                      <div key={i} className="p-3 flex flex-col xs:flex-row xs:justify-between xs:items-center gap-2 bg-blue-50">
                        <span className="text-xs sm:text-sm break-all flex-1 min-w-0 text-blue-800">{fileName}</span>
                        <div className="flex gap-2">
                          {isPDF && (
                            <a
                              href={`/api/view?file=${encodeURIComponent(a)}`}
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
                          <a
                            href={`/api/download?file=${encodeURIComponent(a)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 transition-colors text-xs sm:text-sm font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 whitespace-nowrap flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Process Request Button */}
          {(() => {
            // Check if request needs response from this user
            // IMPORTANT: Only REQUESTERS and DEAN (in Dean-mediated cases) can provide responses to queries
            const needsClarification = request.pendingQuery && request.queryLevel === currentUser?.role;
            
            // SPECIAL CASE: Dean handling mediated rejection (regardless of pendingQuery status)
            // The Dean should always see the "Handle Rejection" button when it's a Dean-mediated case
            if (currentUser?.role === 'dean' && queryEngine.isDeanMediatedClarification(request)) {
              const waitingOnRequester = request.pendingQuery && request.queryLevel === UserRole.REQUESTER;

              if (waitingOnRequester) {
                return (
                  <div className="mt-4 sm:mt-6">
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded flex items-center gap-2">
                      <QueryIndicator size="sm" showText={false} />
                      <span className="text-xs sm:text-sm text-yellow-800">
                        Clarification sent to requester. Awaiting their response.
                      </span>
                    </div>
                  </div>
                );
              }

              // Check if requester has responded
              const requesterHasResponded = request.history?.some(
                (h: any) => h.action === 'CLARIFY_AND_REAPPROVE' && h.actor?.role === 'requester'
              );
              
              return (
                <div className="mt-4 sm:mt-6 flex flex-col gap-3">
                  <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2">
                    <QueryIndicator size="sm" showText={false} />
                    <span className="text-xs sm:text-sm text-red-800">
                      {requesterHasResponded 
                        ? 'Requester responded. Review and decide below.' 
                        : 'Awaiting requester response. You can still take action.'}
                    </span>
                  </div>
                  <div className="flex justify-center sm:justify-start">
                    <button
                      onClick={() => {
                        console.log('[DEBUG] Handle Rejection clicked');
                        setIsDeanQueryModalOpen(true);
                      }}
                      className="w-full sm:w-auto min-w-[200px] px-4 sm:px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium active:scale-95 shadow-sm flex items-center justify-center gap-2"
                    >
                      <QueryIndicator size="sm" showText={false} className="text-white" />
                      Handle Rejection
                    </button>
                  </div>
                </div>
              );
            }
            
            // If requester needs to provide query, show the button
            if (currentUser?.role === 'requester' && needsClarification) {
              return (
                <div className="mt-4 sm:mt-6 flex justify-center sm:justify-start">
                  <button
                    onClick={() => setIsQueryModalOpen(true)}
                    className="w-full sm:w-auto min-w-[200px] px-4 sm:px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm sm:text-base font-medium active:scale-95 shadow-sm flex items-center justify-center gap-2"
                  >
                    <QueryIndicator size="sm" showText={false} className="text-white" />
                    Respond to Clarification
                  </button>
                </div>
              );
            }
            
            // For non-requesters, check if they're authorized to process this request status
            if (currentUser?.role === 'requester') return null;
            
            if (needsClarification) {
              // Requester: allow responding directly (already handled above)
              if (currentUser?.role === 'requester') {
                return (
                  <div className="mt-4 sm:mt-6 flex flex-col gap-3">
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded flex items-center gap-2">
                      <QueryIndicator size="sm" showText={false} />
                      <span className="text-xs sm:text-sm text-yellow-800">Please respond to the queries below.</span>
                    </div>
                    <div className="flex justify-center sm:justify-start">
                      <button
                        onClick={() => setIsQueryModalOpen(true)}
                        className="w-full sm:w-auto min-w-[200px] px-4 sm:px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm sm:text-base font-medium active:scale-95 shadow-sm flex items-center justify-center gap-2"
                      >
                        <QueryIndicator size="sm" showText={false} className="text-white" />
                        Respond to Clarification
                      </button>
                    </div>
                  </div>
                );
              }

              // Other approvers: show banner but still allow processing actions below if authorized
              // Banner
              const banner = (
                <div className="mt-4 sm:mt-6">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded flex items-center gap-2">
                    <QueryIndicator size="sm" showText={false} />
                    <span className="text-xs sm:text-sm text-yellow-800">Awaiting requester response. You can still review and act if needed.</span>
                  </div>
                </div>
              );

              const requiredApprovers = approvalEngine.getRequiredApprover(request.status as RequestStatus);
              const isAuthorized = requiredApprovers.includes(currentUser?.role as UserRole);

              return isAuthorized ? (
                <div className="mt-4 sm:mt-6 flex flex-col gap-3">
                  {banner}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
                    <button
                      onClick={() => setIsApprovalModalOpen(true)}
                      className="w-full sm:w-auto min-w-[200px] px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium active:scale-95 shadow-sm"
                    >
                      Process Request
                    </button>
                    <button
                      onClick={() => setIsDirectQueryModalOpen(true)}
                      className="w-full sm:w-auto min-w-[200px] px-4 sm:px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm sm:text-base font-medium active:scale-95 shadow-sm flex items-center justify-center gap-2"
                    >
                      <ExclamationTriangleIcon className="w-5 h-5" />
                      Raise Query
                    </button>
                  </div>
                </div>
              ) : banner;
            }
            
            const requiredApprovers = approvalEngine.getRequiredApprover(request.status as RequestStatus);
            const isAuthorized = requiredApprovers.includes(currentUser?.role as UserRole);
            
            return isAuthorized ? (
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
                {/* Main Process Request Button */}
                <button
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="w-full sm:w-auto min-w-[200px] px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium active:scale-95 shadow-sm"
                >
                  Process Request
                </button>
                
                {/* Dedicated Raise Query Button */}
                <button
                  onClick={() => setIsDirectQueryModalOpen(true)}
                  className="w-full sm:w-auto min-w-[200px] px-4 sm:px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm sm:text-base font-medium active:scale-95 shadow-sm flex items-center justify-center gap-2"
                >
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  Raise Query
                </button>
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* Workflow + History (hidden for SOP, Accountant) */}
      {!hideWorkflowAndHistory && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white shadow rounded-lg sm:rounded-xl p-4 sm:p-6">
            <ApprovalWorkflow currentStatus={request.status} />
          </div>

          <div className="bg-white shadow rounded-lg sm:rounded-xl p-4 sm:p-6">
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3 mb-4">
              <h3 className="text-sm sm:text-base font-medium text-gray-900">Approval History</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-600">
                  {showApprovalHistory ? 'Hide' : 'Show'} History
                </span>
                <button
                  onClick={() => setShowApprovalHistory(!showApprovalHistory)}
                  className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    showApprovalHistory ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={showApprovalHistory}
                  aria-label="Toggle approval history"
                >
                  <span
                    className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
                      showApprovalHistory ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            {showApprovalHistory && (
              <div className="transition-all duration-300 ease-in-out">
                <ApprovalHistory history={request.history} currentStatus={request.status} />
              </div>
            )}
            
            {!showApprovalHistory && (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-xs sm:text-sm">Click the toggle above to view approval history</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval Modal */}
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        request={{
          _id: request._id,
          title: request.title,
          purpose: request.purpose,
          costEstimate: request.costEstimate,
          requester: { name: request.requester.name },
          status: request.status,
          budgetAllocated: request.budgetAllocated,
          budgetSpent: request.budgetSpent,
          budgetBalance: request.budgetBalance,
          budgetAvailable: request.budgetAvailable
        }}
        userRole={currentUser?.role || ''}
        onApprove={handleApprove}
        onReject={handleReject}
        onRejectWithClarification={handleRejectWithClarification}
        onForward={handleForward}
        onClarify={handleClarify}
        onSendToDean={handleSendToDean}
        onSendToVP={handleSendToVP}
        onSendToChairman={handleSendToChairman}
        loading={processingApproval}
      />

      {/* Clarification Modal */}
      {(() => {
        // Get the latest query request
        const latestQueryRequest = queryEngine.getLatestQueryRequest(request);
        
        if (!latestQueryRequest) return null;

        return (
          <QueryModal
            isOpen={isQueryModalOpen}
            onClose={() => setIsQueryModalOpen(false)}
            queryRequest={{
              actor: {
                name: latestQueryRequest.actor?.name || 'Unknown',
                role: latestQueryRequest.actor?.role || 'Unknown'
              },
              queryRequest: latestQueryRequest.queryRequest || '',
              timestamp: latestQueryRequest.timestamp || new Date().toISOString(),
              attachments: latestQueryRequest.attachments || []
            }}
            onQueryAndApprove={handleQueryAndApprove}
            onReject={handleClarificationReject}
            loading={processingApproval}
            userRole={currentUser?.role || ''}
            isRequester={currentUser?.role === 'requester'}
          />
        );
      })()}

      {/* Dean Clarification Modal */}
      {(() => {
        // Only show for Dean handling above-Dean rejections
        if (currentUser?.role !== 'dean' || !queryEngine.isDeanMediatedClarification(request)) {
          console.log('[DEBUG] DeanQueryModal not rendering:', {
            isDean: currentUser?.role === 'dean',
            isDeanMediated: queryEngine.isDeanMediatedClarification(request)
          });
          return null;
        }

        const originalRejector = queryEngine.getOriginalRejector(request);
        
        // Look for rejection with clarification or any query-related entry
        const latestRejection = request.history
          ?.filter((h: any) => 
            h.action === 'REJECT_WITH_CLARIFICATION' || 
            (h.requiresClarification && h.queryRequest)
          )
          ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        // Check if requester has provided query
        const requesterClarification = request.history
          ?.filter((h: any) => h.action === 'CLARIFY_AND_REAPPROVE' && h.actor?.role === 'requester')
          ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        console.log('[DEBUG] DeanQueryModal data:', {
          originalRejector,
          latestRejection: latestRejection ? {
            action: latestRejection.action,
            queryRequest: latestRejection.queryRequest,
            timestamp: latestRejection.timestamp
          } : null,
          requesterClarification: requesterClarification ? 'exists' : 'none',
          isDeanQueryModalOpen
        });

        if (!originalRejector) {
          console.log('[DEBUG] No originalRejector found');
          return null;
        }
        
        if (!latestRejection) {
          console.log('[DEBUG] No latestRejection found, history:', request.history?.map((h: any) => ({
            action: h.action,
            requiresClarification: h.requiresClarification
          })));
          return null;
        }

        return (
          <DeanQueryModal
            isOpen={isDeanQueryModalOpen}
            onClose={() => {
              console.log('[DEBUG] Closing DeanQueryModal');
              setIsDeanQueryModalOpen(false);
            }}
            rejectionInfo={{
              rejector: {
                name: originalRejector.name || 'Unknown',
                role: originalRejector.role || 'Unknown'
              },
              rejectionReason: latestRejection.queryRequest || latestRejection.notes || 'No reason provided',
              timestamp: latestRejection.timestamp ? new Date(latestRejection.timestamp).toISOString() : new Date().toISOString()
            }}
            requesterClarification={requesterClarification ? {
              response: requesterClarification.queryResponse || '',
              attachments: requesterClarification.queryAttachments || [],
              timestamp: requesterClarification.timestamp ? new Date(requesterClarification.timestamp).toISOString() : new Date().toISOString()
            } : undefined}
            onSendToRequester={handleDeanSendToRequester}
            onReapprove={handleDeanReapprove}
            loading={processingApproval}
          />
        );
      })()}

      {/* Direct Clarification Modal */}
      <DirectQueryModal
        isOpen={isDirectQueryModalOpen}
        onClose={() => setIsDirectQueryModalOpen(false)}
        request={{
          _id: request._id,
          title: request.title,
          requester: { name: request.requester.name }
        }}
        onSubmit={handleRejectWithClarification}
        loading={processingApproval}
      />

    </div>
  );
}