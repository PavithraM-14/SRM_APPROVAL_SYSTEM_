'use client';

import React from 'react';
import { ApprovalHistory as ApprovalHistoryType, RequestStatus } from '../lib/types';

interface ApprovalHistoryProps {
  history: ApprovalHistoryType[];
  currentStatus: RequestStatus;
}

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'manager_review':
      return 'bg-yellow-100 text-yellow-800';
    case 'sop_verification':
      return 'bg-teal-100 text-teal-800';
    case 'budget_check':
      return 'bg-purple-100 text-purple-800';
    case 'institution_verified':
      return 'bg-green-100 text-green-800';
    case 'vp_approval':
      return 'bg-indigo-100 text-indigo-800';
    case 'hoi_approval':
      return 'bg-pink-100 text-pink-800';
    case 'dean_review':
      return 'bg-orange-100 text-orange-800';
    case 'department_checks':
      return 'bg-teal-100 text-teal-800';
    case 'dean_verification':
      return 'bg-cyan-100 text-cyan-800';
    case 'chief_director_approval':
      return 'bg-amber-100 text-amber-800';
    case 'chairman_approval':
      return 'bg-emerald-100 text-emerald-800';
    case 'query_required':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

const getActionBadgeClass = (action: string) => {
  switch (action.toLowerCase()) {
    case 'approve':
      return 'bg-green-100 text-green-800';
    case 'reject':
      return 'bg-red-100 text-red-800';
    case 'clarify':
      return 'bg-yellow-100 text-yellow-800';
    case 'forward':
      return 'bg-purple-100 text-purple-800';
    case 'create':
      return 'bg-blue-100 text-blue-800';
    case 'submit':
      return 'bg-indigo-100 text-indigo-800';
    case 'budget_check':
      return 'bg-purple-100 text-purple-800';
    case 'sop_check':
      return 'bg-teal-100 text-teal-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusDisplayName = (status: string) => {
  const statusMap: Record<string, string> = {
    'manager_review': 'Manager Review',
    'sop_verification': 'SOP Verification',
    'budget_check': 'Budget Check',
    'institution_verified': 'Institution Verified',
    'vp_approval': 'VP Approval',
    'hoi_approval': 'HOI Approval',
    'dean_review': 'Dean Review',
    'department_checks': 'Department Checks',
    'dean_verification': 'Dean Verification',
    'chief_director_approval': 'Chief Director Approval',
    'chairman_approval': 'Chairman Approval',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'query_required': 'Query Required',
    'sop_query': 'SOP Query',
    'budget_query': 'Budget Query',
    'department_query': 'Department Query'
  };
  
  return statusMap[status.toLowerCase()] || status;
};

const getActionDisplayName = (action: string) => {
  const actionMap: Record<string, string> = {
    'create': 'Created',
    'submit': 'Submitted',
    'approve': 'Approved',
    'reject': 'Rejected',
    'clarify': 'Requested Query',
    'budget_check': 'Budget Check',
    'sop_check': 'SOP Check',
    'forward': 'Forwarded'
  };
  
  return actionMap[action.toLowerCase()] || action;
};

// Function to extract filename from URL
const getFileNameFromUrl = (url: string) => {
  if (!url) return 'Document';
  const parts = url.split('/');
  return parts[parts.length - 1] || 'Document';
};

const ApprovalHistory: React.FC<ApprovalHistoryProps> = ({ history, currentStatus }) => {
  if (!history || history.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Approval History</h3>
          <p className="mt-1 text-sm text-gray-500">Detailed timeline of all actions taken on this request</p>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-4 sm:px-6">
            <p className="text-sm text-gray-500">No approval history yet</p>
          </div>
        </div>
      </div>
    );
  }

  // Sort history by timestamp
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Approval History</h3>
        <p className="mt-1 text-sm text-gray-500">Detailed timeline of all actions taken on this request</p>
      </div>
      <div className="border-t border-gray-200">
        <div className="flow-root">
          <ul className="divide-y divide-gray-200">
            {sortedHistory.map((historyItem) => (
              <li key={historyItem._id} className="px-4 py-6 sm:px-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActionBadgeClass(historyItem.action)}`}>
                      <span className="text-xs font-bold">
                        {historyItem.action.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    {/* Action and Actor in single line */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionBadgeClass(historyItem.action)} self-start xs:self-auto`}>
                          {getActionDisplayName(historyItem.action)}
                        </span>
                        <span className="text-sm text-gray-600">by</span>
                        <span className="text-sm font-medium text-gray-900">
                          {historyItem.actor.name}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        {new Date(historyItem.timestamp).toLocaleString('en-GB')}
                      </div>
                    </div>
                    
                    {/* Status Change Information - Inline format */}
                    {historyItem.previousStatus && historyItem.newStatus && historyItem.previousStatus !== historyItem.newStatus && historyItem.previousStatus.toLowerCase() !== 'draft' ? (
                      <div className="mt-1 text-sm">
                        <span className="font-medium text-gray-700">Status: </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(historyItem.previousStatus)}`}>
                          {getStatusDisplayName(historyItem.previousStatus)}
                        </span>
                        <span className="text-gray-500"> → </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(historyItem.newStatus)}`}>
                          {getStatusDisplayName(historyItem.newStatus)}
                        </span>
                      </div>
                    ) : historyItem.action === 'create' && historyItem.newStatus && historyItem.newStatus.toLowerCase() === 'manager_review' ? (
                      <div className="mt-1 text-sm">
                        <span className="font-medium text-gray-700">Status: </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(historyItem.newStatus)}`}>
                          {getStatusDisplayName(historyItem.newStatus)}
                        </span>
                      </div>
                    ) : null}
                    
                    {/* Notes - Inline format */}
                    {historyItem.notes && (
                      <div className="mt-1 text-sm">
                        <span className="font-medium text-gray-700">Notes: </span>
                        <span className="text-gray-600">{historyItem.notes}</span>
                      </div>
                    )}
                    
                    {/* Forward Message - Inline format */}
                    {historyItem.forwardedMessage && (
                      <div className="mt-1 text-sm">
                        <span className="font-medium text-gray-700">Forward Message: </span>
                        <span className="text-gray-600">{historyItem.forwardedMessage}</span>
                      </div>
                    )}

                    {/* Query Request - Inline format */}
                    {(historyItem as any).queryRequest && (
                      <div className="mt-1 text-sm">
                        <span className="font-medium text-gray-700">Query Request: </span>
                        <span className="text-yellow-800">{(historyItem as any).queryRequest}</span>
                      </div>
                    )}

                    {/* Query Response - Inline format */}
                    {(historyItem as any).queryResponse && (
                      <div className="mt-1 text-sm">
                        <span className="font-medium text-gray-700">Query Response: </span>
                        <span className="text-blue-800">{(historyItem as any).queryResponse}</span>
                      </div>
                    )}
                    
                    {/* Budget Information - Inline format */}
                    {historyItem.budgetAvailable !== undefined && (
                      <div className="mt-1 text-sm">
                        <span className="font-medium text-gray-700">Budget Available: </span>
                        <span className={`font-medium ${historyItem.budgetAvailable ? 'text-green-600' : 'text-red-600'}`}>
                          {historyItem.budgetAvailable ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}

                    {/* SOP Reference - Inline format */}
                    {(historyItem as any).sopReference && (
                      <div className="mt-1 text-sm">
                        <span className="font-medium text-gray-700">SOP Reference: </span>
                        <span className="text-blue-600 font-mono font-medium">
                          {(historyItem as any).sopReference}
                        </span>
                      </div>
                    )}
                    
                    {/* Attachments */}
                    {historyItem.attachments && historyItem.attachments.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                        <div className="space-y-2">
                          {historyItem.attachments.map((attachment, index) => (
                            <div key={index} className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 p-2 border border-gray-200 rounded-md">
                              <div className="flex items-center min-w-0 flex-1">
                                <svg className="flex-shrink-0 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                </svg>
                                <span className="ml-2 text-sm text-gray-600 truncate">{getFileNameFromUrl(attachment)}</span>
                              </div>
                              <a 
                                href={`/api/download?file=${encodeURIComponent(attachment)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 self-start xs:self-auto whitespace-nowrap"
                              >
                                View File
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Query Attachments */}
                    {(historyItem as any).queryAttachments && (historyItem as any).queryAttachments.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Query Attachments:</p>
                        <div className="space-y-2">
                          {(historyItem as any).queryAttachments.map((attachment: string, index: number) => (
                            <div key={index} className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 p-2 border border-blue-200 rounded-md bg-blue-50">
                              <div className="flex items-center min-w-0 flex-1">
                                <svg className="flex-shrink-0 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                                </svg>
                                <span className="ml-2 text-sm text-blue-700 truncate">{getFileNameFromUrl(attachment)}</span>
                                <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Query</span>
                              </div>
                              <a 
                                href={`/api/download?file=${encodeURIComponent(attachment)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 self-start xs:self-auto whitespace-nowrap"
                              >
                                Download
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
            
            {/* Current Status */}
            <li className="px-4 py-6 sm:px-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100">
                    <svg className="w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(currentStatus)}`}>
                        Current Status
                      </span>
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        System
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Now
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      This request is currently in the{' '}
                      <span className={`font-medium ${getStatusBadgeClass(currentStatus)}`}>
                        {getStatusDisplayName(currentStatus)}
                      </span>{' '}
                      status.
                    </p>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ApprovalHistory;