'use client';

import { ClipboardDocumentListIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => res.json());

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  inProgressRequests: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { data: stats, error } = useSWR<DashboardStats>('/api/dashboard/stats', fetcher);
  const { data: recentRequests, isLoading: isLoadingRequests } = useSWR('/api/requests?limit=5', fetcher);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const handleStatsCardClick = (cardName: string) => {
    // Route based on user role
    const isRequester = currentUser?.role === 'requester';
    
    console.log('[DEBUG] Stats card clicked:', {
      cardName,
      userRole: currentUser?.role,
      isRequester
    });
    
    switch (cardName) {
      case 'Total Requests':
        if (isRequester) {
          router.push('/dashboard/requests');
        } else {
          router.push('/dashboard/approvals?status=all');
        }
        break;
        
      case 'Pending':
        if (isRequester) {
          router.push('/dashboard/requests?status=pending');
        } else {
          router.push('/dashboard/approvals?status=pending');
        }
        break;
        
      case 'Approved':
        if (isRequester) {
          router.push('/dashboard/requests?status=approved');
        } else {
          router.push('/dashboard/approvals?status=approved');
        }
        break;
        
      case 'Rejected':
        if (isRequester) {
          router.push('/dashboard/requests?status=rejected');
        } else {
          router.push('/dashboard/approvals?status=rejected');
        }
        break;
        
      case 'In Progress':
      case 'My Involvement':
        router.push('/dashboard/in-progress');
        break;
        
      default:
        if (isRequester) {
          router.push('/dashboard/requests');
        } else {
          router.push('/dashboard/approvals');
        }
    }
  };

  // Create stats cards based on user role
  const baseStatsCards = [
    {
      name: 'Total Requests',
      stat: stats?.totalRequests || 0,
      icon: ClipboardDocumentListIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: currentUser?.role === 'requester' ? 'View all my requests' : 'View all system requests',
    },
    {
      name: 'Pending',
      stat: stats?.pendingRequests || 0,
      icon: ClockIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: currentUser?.role === 'requester' ? 'View my pending requests' : 'View pending approvals',
    },
    {
      name: 'Approved',
      stat: stats?.approvedRequests || 0,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: currentUser?.role === 'requester' ? 'View my fully approved requests' : 'View fully approved requests (Chairman approved)',
    },
    {
      name: 'Rejected',
      stat: stats?.rejectedRequests || 0,
      icon: ExclamationTriangleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: currentUser?.role === 'requester' ? 'View my rejected requests' : 'View rejected requests',
    },
  ];

  // Add "In Progress" card for non-requesters
  const statsCards = currentUser?.role === 'requester' 
    ? baseStatsCards 
    : [
        ...baseStatsCards.slice(0, 2), // Total and Pending
        ...baseStatsCards.slice(2) // Approved and Rejected
      ];

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">Error loading dashboard data</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* PAGE HEADER */}
      <div className="mb-6 sm:mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm sm:text-base text-gray-500">Overview of your requests and activity</p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statsCards.map((item) => (
          <div
            key={item.name}
            className="group bg-white/80 backdrop-blur-md shadow-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 transition transform hover:scale-[1.02] hover:shadow-xl cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 active:scale-[0.98]"
            onClick={() => handleStatsCardClick(item.name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStatsCardClick(item.name);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`${item.description} - ${item.stat} requests`}
          >
            <div className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-lg sm:rounded-xl ${item.bgColor} group-hover:scale-110 transition-transform`}>
              <item.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${item.color}`} />
            </div>

            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600 font-medium group-hover:text-gray-800 transition-colors">{item.name}</p>

            <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 mt-1 sm:mt-2 group-hover:scale-105 transition">
              {item.stat}
            </p>

            <p className="text-xs text-gray-500 mt-2 group-hover:text-gray-600 transition-colors">
              {item.description}
            </p>

            {/* Click indicator */}
            <div className="mt-3 flex items-center text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
              <span>Click to view</span>
              <svg className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* RECENT REQUESTS */}
      <div className="mt-8 sm:mt-10 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
            {currentUser?.role === 'requester' ? 'My Recent Requests' : 'Recent System Requests'}
          </h3>
          {recentRequests?.requests?.length > 0 && (
            <p className="text-xs sm:text-sm text-gray-500">Click on any request to view details</p>
          )}
        </div>

        {isLoadingRequests ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-500">Loading recent requests...</span>
          </div>
        ) : recentRequests?.requests?.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {recentRequests.requests
              .filter((request: any) => request && request._id) // Filter out invalid requests
              .map((request: any) => {
              // Debug log to see request structure
              if (!request.status) {
                console.log('Request without status:', request);
              }
              return (
              <li 
                key={request._id} 
                className="py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 hover:scale-[1.01] transition-all cursor-pointer rounded-lg px-3 sm:px-4 -mx-3 sm:-mx-4 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 active:scale-[0.99] gap-3 sm:gap-0"
                onClick={() => router.push(`/dashboard/requests/${request._id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/dashboard/requests/${request._id}`);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`View request: ${request.title || 'Untitled Request'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-base sm:text-lg font-semibold text-blue-700 hover:text-blue-800 transition-colors truncate">
                    {request.title || 'Untitled Request'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                    {request.college || 'Unknown'} • {request.department || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    ₹{request.costEstimate?.toLocaleString() || '0'} • {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'Unknown date'}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3 flex-shrink-0">
                  <span className={`px-2 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold ${getStatusClass(request.status || 'unknown')} whitespace-nowrap`}>
                    {request.status ? request.status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                  </span>
                  <svg 
                    className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </li>
            );
            })}
          </ul>
        ) : (
          <p className="text-center text-gray-500 py-6">
            {currentUser?.role === 'requester' 
              ? 'No recent requests found. Create your first request to get started!' 
              : 'No recent requests in the system yet.'
            }
          </p>
        )}

        {/* View All Requests Link */}
        {recentRequests?.requests?.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                const targetPath = currentUser?.role === 'requester' ? '/dashboard/requests' : '/dashboard/approvals';
                router.push(targetPath);
              }}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              {currentUser?.role === 'requester' ? 'View All My Requests' : 'View All Pending Approvals'} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* STATUS COLORS */
function getStatusClass(status: string | undefined | null) {
  if (!status) return 'bg-gray-100 text-gray-700';
  
  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    case 'draft':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-yellow-100 text-yellow-700';
  }
}