'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ClarificationIndicator from '../../../components/ClarificationIndicator';

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
  history?: any[];
  pendingClarification?: boolean;
  clarificationLevel?: string;
  _visibility?: {
    category: 'pending' | 'approved' | 'in_progress' | 'completed';
    userAction?: 'approve' | 'clarify' | null;
  };
}

export default function RequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');
  
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    fetchCurrentUser();
    fetchRequests();
  }, []);

  useEffect(() => {
    // Set active filter based on URL parameter
    if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      setActiveFilter(statusFilter);
    } else {
      setActiveFilter('all');
    }
  }, [statusFilter]);

  useEffect(() => {
    // Filter requests based on active filter
    if (activeFilter === 'all') {
      setFilteredRequests(requests);
    } else {
      const filtered = requests.filter(request => {
        if (activeFilter === 'pending') {
          return !['approved', 'rejected'].includes(request.status);
        }
        return request.status === activeFilter;
      });
      setFilteredRequests(filtered);
    }
  }, [requests, activeFilter]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch user');
      const user = await response.json();
      setCurrentUser(user);
      
      // Redirect non-requesters to approvals page
      if (user.role !== 'requester') {
        router.push('/dashboard/approvals');
        return;
      }
    } catch {
      setCurrentUser(null);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/requests', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch requests');

      const data = await response.json();
      setRequests(data.requests);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'draft':
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getClarificationStatus = (request: Request) => {
    if (!request.history) return null;
    
    // Find latest Dean clarification
    const latestClarification = request.history
      .filter((h: any) => h.action === 'clarify' && h.clarificationTarget && h.actor?.role === 'dean')
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (!latestClarification) return null;
    
    // Check if department has responded
    const departmentResponse = request.history.find((h: any) => 
      h.departmentResponse && h.timestamp > latestClarification.timestamp
    );
    
    if (departmentResponse) {
      return {
        type: 'completed',
        department: latestClarification.clarificationTarget,
        respondedBy: departmentResponse.departmentResponse,
        responseDate: departmentResponse.timestamp
      };
    } else if (request.status === 'department_checks') {
      return {
        type: 'pending',
        department: latestClarification.clarificationTarget,
        requestDate: latestClarification.timestamp
      };
    }
    
    return null;
  };

  if (loading || !currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show access denied for non-requesters
  if (currentUser.role !== 'requester') {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Access Restricted</h3>
          <p className="text-yellow-700 mb-4">This page is only accessible to requesters. You will be redirected to your approvals page.</p>
          <button
            onClick={() => router.push('/dashboard/approvals')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Pending Approvals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 flex flex-col sm:flex-row sm:items-center">
            <span>My Requests</span>
            {activeFilter !== 'all' && (
              <span className="text-lg sm:text-xl lg:text-2xl font-normal text-gray-600 sm:ml-2 mt-1 sm:mt-0">
                • {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
              </span>
            )}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {activeFilter === 'all' 
              ? 'View and manage your submitted requests'
              : `Showing ${activeFilter} requests`
            }
          </p>

          {currentUser && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Logged in as: <span className="font-medium">{currentUser.name || currentUser.email}</span>
            </p>
          )}
        </div>

        <div className="flex gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={fetchRequests}
            className="px-3 sm:px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 shadow-sm transition text-sm sm:text-base active:scale-95"
          >
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">↻</span>
          </button>

          {currentUser?.role === 'requester' && (
            <button
              onClick={() => router.push('/dashboard/requests/create')}
              className="px-3 sm:px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md transition text-sm sm:text-base active:scale-95"
            >
              <span className="hidden sm:inline">+ Create Request</span>
              <span className="sm:hidden">+ New</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="mb-4 sm:mb-6 flex flex-wrap gap-2 sm:gap-3">
        {[
          { key: 'all', label: 'All Requests', count: requests.length },
          { key: 'pending', label: 'Pending', count: requests.filter(r => !['approved', 'rejected'].includes(r.status)).length },
          { key: 'approved', label: 'Approved', count: requests.filter(r => r.status === 'approved').length },
          { key: 'rejected', label: 'Rejected', count: requests.filter(r => r.status === 'rejected').length },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => {
              setActiveFilter(filter.key);
              // Use router.replace to avoid adding to history stack
              if (filter.key === 'all') {
                router.replace('/dashboard/requests');
              } else {
                router.replace(`/dashboard/requests?status=${filter.key}`);
              }
            }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-all active:scale-95 ${
              activeFilter === filter.key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">{filter.label} ({filter.count})</span>
            <span className="sm:hidden">{filter.label.split(' ')[0]} ({filter.count})</span>
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* No Requests */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-md border border-gray-100">
          <svg
            className="mx-auto h-14 w-14 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {requests.length === 0 ? 'No requests found' : `No ${activeFilter} requests found`}
          </h3>
          <p className="text-gray-500 mt-1">
            {requests.length === 0 
              ? 'Start by creating a new request'
              : activeFilter === 'all' 
                ? 'No requests match your criteria'
                : `You don't have any ${activeFilter} requests yet`
            }
          </p>

          <div className="mt-6 flex gap-3 justify-center">
            {currentUser?.role === 'requester' && (
              <button
                onClick={() => router.push('/dashboard/requests/create')}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition"
              >
                + New Request
              </button>
            )}
            {activeFilter !== 'all' && requests.length > 0 && (
              <button
                onClick={() => {
                  setActiveFilter('all');
                  router.push('/dashboard/requests');
                }}
                className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow transition"
              >
                View All Requests
              </button>
            )}
          </div>
        </div>
      ) : (

        /* Requests List */
        <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
          {/* Results Summary */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredRequests.length} of {requests.length} requests
              {activeFilter !== 'all' && (
                <span className="ml-2">
                  • Filtered by: <span className="font-medium text-gray-900">{activeFilter}</span>
                </span>
              )}
            </p>
          </div>

          <ul className="divide-y divide-gray-200">

            {filteredRequests.map((request) => (
              <li key={request._id}>
                <div
                  className="hover:bg-gray-50 hover:scale-[1.01] transition cursor-pointer rounded-xl p-3 sm:p-4 active:scale-[0.99]"
                  onClick={() => router.push(`/dashboard/requests/${request._id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-blue-700 truncate">
                        {request.title}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center justify-between sm:justify-end">
                      {/* User's involvement badge */}
                      {request._visibility && currentUser?.role !== 'requester' && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          request._visibility.category === 'pending' 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : request._visibility.category === 'approved' || request._visibility.userAction === 'approve'
                            ? 'bg-green-100 text-green-700'
                            : request._visibility.category === 'in_progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {request._visibility.category === 'pending' && '⏳ Pending Your Action'}
                          {request._visibility.category === 'approved' && '✓ Approved'}
                          {request._visibility.category === 'in_progress' && request._visibility.userAction === 'approve' && '✓ You Approved'}
                          {request._visibility.category === 'in_progress' && request._visibility.userAction === 'clarify' && '❓ You Clarified'}
                          {request._visibility.category === 'in_progress' && !request._visibility.userAction && '👁️ Visible'}
                          {request._visibility.category === 'completed' && '✅ Completed'}
                        </span>
                      )}

                      {(() => {
                        const clarificationStatus = getClarificationStatus(request);
                        if (clarificationStatus?.type === 'completed') {
                          return (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 whitespace-nowrap">
                              ✓ {clarificationStatus.respondedBy.toUpperCase()} Responded
                            </span>
                          );
                        } else if (clarificationStatus?.type === 'pending') {
                          return (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 whitespace-nowrap">
                              ⏳ Awaiting {clarificationStatus.department.toUpperCase()}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusBadgeClass(request.status)}`}>
                          {request.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {request.pendingClarification && request.clarificationLevel === currentUser?.role && (
                          <ClarificationIndicator size="sm" showText={false} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Meta info */}
                  <p className="text-xs sm:text-sm text-gray-600 mt-2 line-clamp-2">
                    {request.purpose.substring(0, 120)}
                    {request.purpose.length > 120 && '...'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <span className="px-2 sm:px-3 py-1 rounded-full bg-blue-100 text-blue-800 whitespace-nowrap">
                      ₹{request.costEstimate.toLocaleString()}
                    </span>

                    <span className="px-2 sm:px-3 py-1 rounded-full bg-gray-100 text-gray-800 truncate max-w-[200px]">
                      {request.college} • {request.department}
                    </span>

                    <span className="px-2 sm:px-3 py-1 rounded-full bg-purple-100 text-purple-800 truncate max-w-[150px]">
                      {request.expenseCategory}
                    </span>

                    <span className="px-2 sm:px-3 py-1 rounded-full bg-gray-200 text-gray-700 whitespace-nowrap sm:ml-auto">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </li>
            ))}

          </ul>
        </div>
      )}
    </div>
  );
}
