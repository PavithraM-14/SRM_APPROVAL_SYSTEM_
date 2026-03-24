'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRole } from '../../../lib/types';

interface Request {
  _id: string;
  requestId?: string;
  title: string;
  purpose: string;
  college: string;
  department: string;
  costEstimate: number;
  status: string;
  createdAt: string;
  requester: { name: string; email: string };
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  research_director_submitted: { label: 'Awaiting Chairman', cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
};

function badge(status: string) {
  const s = STATUS_LABELS[status] ?? { label: status.replace(/_/g, ' ').toUpperCase(), cls: 'bg-gray-100 text-gray-700' };
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

export default function RDRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/requests', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch requests');
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return router.push('/login');
      const user = await res.json();
      if (user.role !== UserRole.RESEARCH_DIRECTOR) return router.push('/dashboard');
      fetchRequests();
    };
    checkAuth();
  }, [router, fetchRequests]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Requests you submitted for Chairman approval</p>
        </div>
        <Link
          href="/dashboard/rd-requests/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          + New Request
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow border border-gray-100">
          <p className="text-gray-500">No requests yet.</p>
          <Link href="/dashboard/rd-requests/create" className="mt-3 inline-block text-blue-600 text-sm hover:underline">
            Create your first request
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-gray-100 divide-y divide-gray-100">
          {requests.map(req => (
            <Link
              key={req._id}
              href={`/dashboard/requests/${req._id}`}
              className="block p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-blue-700 truncate">{req.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">ID: {req.requestId || req._id.slice(-6)}</p>
                  <p className="text-xs text-gray-500 mt-1">{req.college} • {req.department}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {badge(req.status)}
                  {req.costEstimate > 0 && (
                    <span className="text-xs text-green-600 font-medium">₹{req.costEstimate.toLocaleString()}</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(req.createdAt).toLocaleDateString('en-GB')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
