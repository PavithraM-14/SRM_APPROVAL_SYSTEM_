'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FlagIcon } from '@heroicons/react/24/outline';

interface EscalationInfo {
  flagged: boolean;
  flaggedAt: string | null;
  stalledRole: string | null;
  reminderSent: boolean;
  actedByHigherRole: string | null;
  actedByHigherRoleAt: string | null;
}

interface FlaggedRequest {
  _id: string;
  requestId: string;
  title: string;
  college: string;
  department: string;
  requester: { name: string; email: string };
  status: string;
  escalation: EscalationInfo;
  timeSinceFlagged: number;
}

function formatElapsed(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FlaggedRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<FlaggedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        setCurrentUser(await res.json());
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    }
  }, [router]);

  const fetchFlagged = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/requests/flagged', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load flagged requests');
        return;
      }
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {
      setError('Failed to load flagged requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (currentUser) fetchFlagged();
  }, [currentUser, fetchFlagged]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-20 text-red-600">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FlagIcon className="h-6 w-6 text-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">Flagged Requests</h1>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <FlagIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No flagged requests</p>
          <p className="text-sm mt-1">All requests are being processed on time.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gray-50">
              <tr>
                {['Request', 'Stalled Role', 'Time Since Flagged', 'Requester', 'College / Dept'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((req) => {
                const stalledRole = req.escalation.stalledRole;
                const alreadyActed = !!req.escalation.actedByHigherRole;

                return (
                  <tr key={req._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/requests/${req._id}`}
                        className="text-blue-600 hover:underline font-medium text-sm"
                      >
                        {req.title}
                      </Link>
                      {req.requestId && (
                        <p className="text-xs text-gray-400 mt-0.5">{req.requestId}</p>
                      )}
                      {alreadyActed && (
                        <p className="text-xs text-orange-500 mt-0.5 italic">
                          Escalated by {formatRole(req.escalation.actedByHigherRole!)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {stalledRole ? formatRole(stalledRole) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatElapsed(req.timeSinceFlagged)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {req.requester?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span>{req.college}</span>
                      {req.department && (
                        <span className="text-gray-400"> / {req.department}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
