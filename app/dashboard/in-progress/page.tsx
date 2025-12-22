'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  _visibility?: {
    category: string;
    reason: string;
    userAction?: string;
  };
}

export default function InProgressPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchInProgressRequests();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const userData = await response.json();
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

  const fetchInProgressRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/in-progress', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch in-progress requests');
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error fetching in-progress requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load in-progress requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'manager_review':
        return 'bg-blue-100 text-blue-700';
      case 'parallel_verification':
        return 'bg-yellow-100 text-yellow-700';
      case 'sop_verification':
        return 'bg-teal-100 text-teal-700';
      case 'budget_check':
        return 'bg-purple-100 text-purple-700';
      case 'sop_completed':
        return 'bg-emerald-100 text-emerald-700';
      case 'budget_completed':
        return 'bg-violet-100 text-violet-700';
      case 'institution_verified':
        return 'bg-green-100 text-green-700';
      case 'vp_approval':
        return 'bg-purple-100 text-purple-700';
      case 'hoi_approval':
        return 'bg-pink-100 text-pink-700';
      case 'dean_review':
        return 'bg-indigo-100 text-indigo-700';
      case 'department_checks':
        return 'bg-orange-100 text-orange-700';
      case 'dean_verification':
        return 'bg-cyan-100 text-cyan-700';
      case 'chief_director_approval':
        return 'bg-amber-100 text-amber-700';
      case 'chairman_approval':
        return 'bg-emerald-100 text-emerald-700';
      case 'sop_clarification':
      case 'budget_clarification':
      case 'department_clarification':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusDisplayName = (status: string) => {
    const statusMap: Record<string, string> = {
      'manager_review': 'Manager Review',
      'parallel_verification': 'Parallel Verification (SOP & Budget)',
      'sop_verification': 'SOP Verification',
      'budget_check': 'Budget Check',
      'sop_completed': 'SOP Completed (Waiting for Budget)',
      'budget_completed': 'Budget Completed (Waiting for SOP)',
      'institution_verified': 'Institution Verified',
      'vp_approval': 'VP Approval',
      'hoi_approval': 'Head of Institution Approval',
      'dean_review': 'Dean Review',
      'department_checks': 'Department Queries',
      'dean_verification': 'Dean Verification',
      'chief_director_approval': 'Chief Director Approval',
      'chairman_approval': 'Chairman Approval',
      'sop_clarification': 'SOP Queries Required',
      'budget_clarification': 'Budget Queries Required',
      'department_clarification': 'Department Queries Required',
      'approved': 'Fully Approved',
      'rejected': 'Rejected'
    };
    
    return statusMap[status.toLowerCase()] || status.replace(/_/g, ' ').toUpperCase();
  };

  const getCurrentStageDescription = (status: string) => {
    const stageMap: Record<string, string> = {
      'manager_review': 'Awaiting manager review and routing decision',
      'parallel_verification': 'Being verified by SOP and Budget teams simultaneously',
      'sop_verification': 'Awaiting SOP reference number verification',
      'budget_check': 'Awaiting budget availability verification',
      'sop_completed': 'SOP verification complete, awaiting budget verification',
      'budget_completed': 'Budget verification complete, awaiting SOP verification',
      'institution_verified': 'Institution verification complete, awaiting routing',
      'vp_approval': 'Awaiting Vice President approval',
      'hoi_approval': 'Awaiting Head of Institution approval',
      'dean_review': 'Awaiting Dean review and decision',
      'department_checks': 'Awaiting department response',
      'dean_verification': 'Awaiting Dean verification',
      'chief_director_approval': 'Awaiting Chief Director approval',
      'chairman_approval': 'Awaiting Chairman final approval',
      'sop_clarification': 'SOP queries required from manager',
      'budget_clarification': 'Budget queries required from manager',
      'department_clarification': 'Department queries required',
      'approved': 'Request has been fully approved by Chairman'
    };
    
    return stageMap[status.toLowerCase()] || 'Processing...';
  };

  const getWorkflowProgress = (status: string) => {
    const progressMap: Record<string, { step: number; total: number; label: string }> = {
      'manager_review': { step: 1, total: 8, label: 'Step 1 of 8' },
      'parallel_verification': { step: 2, total: 8, label: 'Step 2 of 8' },
      'sop_verification': { step: 2, total: 8, label: 'Step 2 of 8' },
      'budget_check': { step: 2, total: 8, label: 'Step 2 of 8' },
      'sop_completed': { step: 2, total: 8, label: 'Step 2 of 8' },
      'budget_completed': { step: 2, total: 8, label: 'Step 2 of 8' },
      'institution_verified': { step: 3, total: 8, label: 'Step 3 of 8' },
      'vp_approval': { step: 4, total: 8, label: 'Step 4 of 8' },
      'hoi_approval': { step: 5, total: 8, label: 'Step 5 of 8' },
      'dean_review': { step: 6, total: 8, label: 'Step 6 of 8' },
      'department_checks': { step: 6, total: 8, label: 'Step 6 of 8' },
      'dean_verification': { step: 6, total: 8, label: 'Step 6 of 8' },
      'chief_director_approval': { step: 7, total: 8, label: 'Step 7 of 8' },
      'chairman_approval': { step: 8, total: 8, label: 'Final Step' },
      'approved': { step: 8, total: 8, label: 'Completed' }
    };
    
    return progressMap[status.toLowerCase()] || { step: 1, total: 8, label: 'In Progress' };
  };

  const getUserActionBadge = (userAction?: string) => {
    switch (userAction) {
      case 'approve':
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium whitespace-nowrap">
            ✓ You Approved
          </span>
        );
      case 'clarify':
        return (
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium whitespace-nowrap">
            ❓ You Clarified
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium whitespace-nowrap">
            👁️ Involved
          </span>
        );
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show access denied for requesters
  if (currentUser.role === 'requester') {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-blue-800 mb-2">Access Restricted</h3>
          <p className="text-blue-700 mb-4">This page is only accessible to approvers. You can view your requests on the requests page.</p>
          <button
            onClick={() => router.push('/dashboard/requests')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to My Requests
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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
            My Involvement History
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Requests you have approved - both in progress and completed
          </p>
          {currentUser && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Role: <span className="font-medium">{currentUser.role?.replace('_', ' ').toUpperCase()}</span>
            </p>
          )}
        </div>

        <div className="flex gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={fetchInProgressRequests}
            className="px-3 sm:px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 shadow-sm transition text-sm sm:text-base active:scale-95"
          >
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">↻</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 sm:mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* No In Progress Requests */}
      {requests.length === 0 ? (
        <div className="text-center py-12 sm:py-16 bg-white rounded-xl sm:rounded-2xl shadow-md border border-gray-100">
          <svg
            className="mx-auto h-12 w-12 sm:h-14 sm:w-14 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <h3 className="mt-4 text-base sm:text-lg font-semibold text-gray-900">
            No involvement history
          </h3>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            You haven't approved any requests yet.
          </p>
        </div>
      ) : (
        /* In Progress Requests List */
        <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100">
          {/* Results Summary */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <p className="text-xs sm:text-sm text-gray-600">
              {requests.length} request{requests.length !== 1 ? 's' : ''} you've been involved in approving
            </p>
          </div>

          <ul className="divide-y divide-gray-200">
            {requests.map((request) => (
              <li key={request._id}>
                <div
                  className="hover:bg-gray-50 hover:scale-[1.01] transition cursor-pointer rounded-xl p-3 sm:p-4 active:scale-[0.99]"
                  onClick={() => router.push(`/dashboard/requests/${request._id}`)}
                >
                  <div className="flex flex-col gap-3">
                    {/* Header with title and user action */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
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

                      <div className="flex gap-2 items-center flex-shrink-0">
                        {/* User's action badge */}
                        {getUserActionBadge(request._visibility?.userAction)}
                        
                        <span className="px-2 sm:px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold whitespace-nowrap">
                          ₹{request.costEstimate.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Current Stage - Prominent Display */}
                    <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
                      <div className="flex flex-col gap-3">
                        {/* Stage Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs sm:text-sm font-medium text-gray-700">Current Stage:</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusBadgeClass(request.status)}`}>
                              {getStatusDisplayName(request.status)}
                            </span>
                            <span className="text-xs text-gray-600 italic">
                              {getCurrentStageDescription(request.status)}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {getWorkflowProgress(request.status).label}
                          </span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${(getWorkflowProgress(request.status).step / getWorkflowProgress(request.status).total) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {Math.round((getWorkflowProgress(request.status).step / getWorkflowProgress(request.status).total) * 100)}%
                          </span>
                        </div>
                      </div>
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
                      Click to view details →
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