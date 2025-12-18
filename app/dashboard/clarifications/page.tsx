'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClarificationIndicator from '../../../components/ClarificationIndicator';
import ClarificationModal from '../../../components/ClarificationModal';
import DeanClarificationModal from '../../../components/DeanClarificationModal';
import { clarificationEngine } from '../../../lib/clarification-engine';

interface Request {
  _id: string;
  title: string;
  purpose: string;
  college: string;
  department: string;
  costEstimate: number;
  expenseCategory: string;
  status: string;
  createdAt: string;
  requester: {
    name: string;
    email: string;
  };
  history: any[];
  pendingClarification?: boolean;
  clarificationLevel?: string;
}

export default function ClarificationsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState(false);
  const [isDeanClarificationModalOpen, setIsDeanClarificationModalOpen] = useState(false);
  const [processingClarification, setProcessingClarification] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchClarificationRequests();
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch user');
      const user = await response.json();
      setCurrentUser(user);
      
      // Only allow requesters and Dean to access this page
      if (user.role !== 'requester' && user.role !== 'dean') {
        router.push('/dashboard');
        return;
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('Failed to load user information');
    }
  };

  const fetchClarificationRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all requests and filter for clarifications
      const response = await fetch('/api/requests', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch requests');
      
      const data = await response.json();
      
      // Filter for requests that need clarification from current user
      const clarificationRequests = data.requests.filter((request: Request) => 
        request.pendingClarification && request.clarificationLevel === currentUser.role
      );

      setRequests(clarificationRequests);
    } catch (err) {
      console.error('Error fetching clarification requests:', err);
      setError('Failed to load clarification requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestClick = (request: Request) => {
    setSelectedRequest(request);
    
    // Open appropriate modal based on user role and clarification type
    if (currentUser.role === 'dean' && clarificationEngine.isDeanMediatedClarification(request)) {
      setIsDeanClarificationModalOpen(true);
    } else {
      setIsClarificationModalOpen(true);
    }
  };

  const handleClarifyAndApprove = async (response: string, attachments: string[]) => {
    if (!selectedRequest) return;
    
    try {
      setProcessingClarification(true);
      const apiResponse = await fetch(`/api/requests/${selectedRequest._id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clarify_and_reapprove',
          notes: response,
          attachments
        }),
      });
      
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Failed to provide clarification');
      }

      // Refresh the list
      await fetchClarificationRequests();
      setIsClarificationModalOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      console.error('Clarification response error:', err);
      alert(err instanceof Error ? err.message : 'Failed to provide clarification');
    } finally {
      setProcessingClarification(false);
    }
  };

  const handleClarificationReject = async (reason: string) => {
    if (!selectedRequest) return;
    
    try {
      setProcessingClarification(true);
      const response = await fetch(`/api/requests/${selectedRequest._id}/approve`, {
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

      // Refresh the list
      await fetchClarificationRequests();
      setIsClarificationModalOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      console.error('Clarification rejection error:', err);
      alert(err instanceof Error ? err.message : 'Failed to reject request');
    } finally {
      setProcessingClarification(false);
    }
  };

  const handleDeanSendToRequester = async (message: string) => {
    if (!selectedRequest) return;
    
    try {
      setProcessingClarification(true);
      const response = await fetch(`/api/requests/${selectedRequest._id}/approve`, {
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

      // Refresh the list
      await fetchClarificationRequests();
      setIsDeanClarificationModalOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      console.error('Dean send to requester error:', err);
      alert(err instanceof Error ? err.message : 'Failed to send to requester');
    } finally {
      setProcessingClarification(false);
    }
  };

  const handleDeanReapprove = async (notes: string) => {
    if (!selectedRequest) return;
    
    try {
      setProcessingClarification(true);
      const response = await fetch(`/api/requests/${selectedRequest._id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clarify_and_reapprove',
          notes
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to re-approve request');
      }

      // Refresh the list
      await fetchClarificationRequests();
      setIsDeanClarificationModalOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      console.error('Dean re-approval error:', err);
      alert(err instanceof Error ? err.message : 'Failed to re-approve request');
    } finally {
      setProcessingClarification(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getClarificationInfo = (request: Request) => {
    const latestClarificationRequest = clarificationEngine.getLatestClarificationRequest(request);
    if (!latestClarificationRequest) return null;

    return {
      from: latestClarificationRequest.actor?.name || 'Unknown',
      role: latestClarificationRequest.actor?.role || 'Unknown',
      message: latestClarificationRequest.clarificationRequest || '',
      timestamp: latestClarificationRequest.timestamp || new Date().toISOString()
    };
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Loading clarification requests...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ClarificationIndicator size="lg" showText={false} />
              Clarification Requests
            </h1>
            <p className="text-gray-600 mt-2">
              {currentUser?.role === 'requester' 
                ? 'Requests that need your clarification response'
                : 'Rejection clarifications that need your review'
              }
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-600">{requests.length}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </div>
      </div>

      {/* Clarification Requests List */}
      {requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-md border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">
            {currentUser?.role === 'requester' 
              ? 'You have no pending clarification requests to respond to.'
              : 'You have no rejection clarifications to review.'
            }
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {requests.length} Request{requests.length !== 1 ? 's' : ''} Need{requests.length === 1 ? 's' : ''} Your Attention
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {requests.map((request) => {
              const clarificationInfo = getClarificationInfo(request);
              
              return (
                <div
                  key={request._id}
                  className="p-4 sm:p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleRequestClick(request)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <ClarificationIndicator size="sm" showText={false} />
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {request.title}
                        </h3>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {request.purpose}
                      </p>
                      
                      {clarificationInfo && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-yellow-800">
                              Clarification from {clarificationInfo.from} ({clarificationInfo.role.toUpperCase()})
                            </span>
                          </div>
                          <p className="text-sm text-yellow-700 line-clamp-2">
                            {clarificationInfo.message}
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            {new Date(clarificationInfo.timestamp).toLocaleString()}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{request.college} • {request.department}</span>
                        <span>₹{request.costEstimate.toLocaleString()}</span>
                        <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(request.status)}`}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-blue-600 font-medium">
                        Click to respond →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clarification Modal */}
      {selectedRequest && (
        <ClarificationModal
          isOpen={isClarificationModalOpen}
          onClose={() => {
            setIsClarificationModalOpen(false);
            setSelectedRequest(null);
          }}
          clarificationRequest={{
            actor: {
              name: getClarificationInfo(selectedRequest)?.from || 'Unknown',
              role: getClarificationInfo(selectedRequest)?.role || 'Unknown'
            },
            clarificationRequest: getClarificationInfo(selectedRequest)?.message || '',
            timestamp: getClarificationInfo(selectedRequest)?.timestamp || new Date().toISOString(),
            attachments: []
          }}
          onClarifyAndApprove={handleClarifyAndApprove}
          onReject={handleClarificationReject}
          loading={processingClarification}
          userRole={currentUser?.role || ''}
          isRequester={currentUser?.role === 'requester'}
        />
      )}

      {/* Dean Clarification Modal */}
      {selectedRequest && (
        (() => {
          const originalRejector = clarificationEngine.getOriginalRejector(selectedRequest);
          const latestRejection = selectedRequest.history
            ?.filter((h: any) => h.action === 'REJECT_WITH_CLARIFICATION')
            ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

          const requesterClarification = selectedRequest.history
            ?.filter((h: any) => h.action === 'CLARIFY_AND_REAPPROVE' && h.actor?.role === 'requester')
            ?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

          if (!originalRejector || !latestRejection) return null;

          return (
            <DeanClarificationModal
              isOpen={isDeanClarificationModalOpen}
              onClose={() => {
                setIsDeanClarificationModalOpen(false);
                setSelectedRequest(null);
              }}
              rejectionInfo={{
                rejector: {
                  name: originalRejector.name || 'Unknown',
                  role: originalRejector.role || 'Unknown'
                },
                rejectionReason: latestRejection.clarificationRequest || 'No reason provided',
                timestamp: latestRejection.timestamp || new Date().toISOString()
              }}
              requesterClarification={requesterClarification ? {
                response: requesterClarification.clarificationResponse || '',
                attachments: requesterClarification.clarificationAttachments || [],
                timestamp: requesterClarification.timestamp ? new Date(requesterClarification.timestamp).toISOString() : new Date().toISOString()
              } : undefined}
              onSendToRequester={handleDeanSendToRequester}
              onReapprove={handleDeanReapprove}
              loading={processingClarification}
            />
          );
        })()
      )}
    </div>
  );
}