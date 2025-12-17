'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
  history?: any[];
}

export default function ApprovalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status'); // Get status from URL query
  
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>(statusFilter || 'pending');

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchApprovals(activeTab);
    }
  }, [currentUser, activeTab]);

  // Update active tab when URL changes
  useEffect(() => {
    if (statusFilter) {
      setActiveTab(statusFilter);
    } else {
      setActiveTab('pending'); // Default to pending if no status filter
    }
  }, [statusFilter]);

  const fetchCurrentUser = async () => {
    console.log('[DEBUG] fetchCurrentUser called in approvals page');
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const userData = await response.json();
        console.log('[DEBUG] Current user in approvals page:', userData);
        setCurrentUser(userData);
        
        // Redirect requesters to their requests page
        if (userData.role === 'requester') {
          router.push('/dashboard/requests');
          return;
        }
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const fetchApprovals = async (status: string = 'pending') => {
    console.log('[DEBUG] fetchApprovals called with status:', status);
    try {
      setLoading(true);
      setError(null);
      
      // Build URL with status filter
      const url = status === 'all' 
        ? '/api/approvals' 
        : `/api/approvals?status=${status}`;
      
      console.log('[DEBUG] Making request to:', url);
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      console.log('[DEBUG] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }

      const data = await response.json();
      console.log('[DEBUG] Response data:', data);
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error fetching approvals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL without page reload
    if (tab === 'pending') {
      router.push('/dashboard/approvals');
    } else {
      router.push(`/dashboard/approvals?status=${tab}`);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'manager_review':
        return 'bg-blue-100 text-blue-700';
      case 'parallel_verification':
        return 'bg-yellow-100 text-yellow-700';
      case 'vp_approval':
        return 'bg-purple-100 text-purple-700';
      case 'dean_review':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusDisplayName = (status: string) => {
    return status.replace(/_/g, ' ').toUpperCase();
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'all':
        return 'All Requests';
      case 'approved':
        return 'Approved Requests';
      case 'rejected':
        return 'Rejected Requests';
      default:
        return 'Pending Approvals';
    }
  };

  const getPageDescription = () => {
    switch (activeTab) {
      case 'all':
        return 'All requests in the system';
      case 'approved':
        return 'Requests that have been fully approved';
      case 'rejected':
        return 'Requests that have been rejected';
      default:
        return 'Requests waiting for your approval';
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect requesters
  if (currentUser.role === 'requester') {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
            {getPageTitle()}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {getPageDescription()}
          </p>
          {currentUser && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Role: <span className="font-medium">{currentUser.role?.replace('_', ' ').toUpperCase()}</span>
            </p>
          )}
        </div>

        <div className="flex gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={() => fetchApprovals(activeTab)}
            className="px-3 sm:px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 shadow-sm transition text-sm sm:text-base active:scale-95"
          >
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">↻</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4 overflow-x-auto">
          <button
            onClick={() => handleTabChange('all')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Requests
          </button>
          <button
            onClick={() => handleTabChange('pending')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition ${
              activeTab === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => handleTabChange('approved')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition ${
              activeTab === 'approved'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => handleTabChange('rejected')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition ${
              activeTab === 'rejected'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Rejected
          </button>
        </nav>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 sm:mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* No Approvals */}
      {requests.length === 0 ? (
        <div className="text-center py-12 sm:py-16 bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-100">
          <svg
            className="mx-auto h-12 w-12 sm:h-14 sm:w-14 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-base sm:text-lg font-semibold text-gray-900">
            No {activeTab === 'all' ? '' : activeTab} requests found
          </h3>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            {activeTab === 'pending' 
              ? "You don't have any requests waiting for your approval at the moment."
              : `No ${activeTab} requests to display.`
            }
          </p>
        </div>
      ) : (
        /* Approvals List */
        <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100">
          {/* Results Summary */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600">
              {requests.length} request{requests.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <ul className="divide-y divide-gray-200">
            {requests.map((request) => (
              <li key={request._id}>
                <div
                  className="hover:bg-gray-50 hover:scale-[1.01] transition cursor-pointer rounded-xl p-3 sm:p-4 active:scale-[0.99]"
                  onClick={() => router.push(`/dashboard/requests/${request._id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-blue-700 truncate">
                        {request.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Requested by: <span className="font-medium">{request.requester.name}</span>
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                        {request.college} • {request.department}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center justify-between sm:justify-end flex-shrink-0">
                      <span className="px-2 sm:px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold whitespace-nowrap">
                        ₹{request.costEstimate.toLocaleString()}
                      </span>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusBadgeClass(request.status)}`}>
                        {getStatusDisplayName(request.status)}
                      </span>
                    </div>
                  </div>

                  {/* Meta info */}
                  <p className="text-xs sm:text-sm text-gray-600 mt-2 line-clamp-2">
                    {request.purpose.substring(0, 120)}
                    {request.purpose.length > 120 && '...'}
                  </p>

                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      Created: {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-blue-600 font-medium">
                      Click to review →
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