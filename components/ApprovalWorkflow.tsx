'use client';

import React from 'react';
import { RequestStatus } from '../lib/types';

interface ApprovalWorkflowProps {
  currentStatus: RequestStatus;
  isRDFlow?: boolean;
}

const getStatusBadgeClass = (status: string, isCurrent: boolean, isCompleted: boolean) => {
  if (isCurrent) {
    return 'bg-blue-500 text-white';
  }
  if (isCompleted) {
    return 'bg-green-500 text-white';
  }
  return 'bg-gray-200 text-gray-600';
};

const getStatusDisplayName = (status: string) => {
  const statusMap: Record<string, string> = {
    'manager_review': 'Manager Review',
    'budget_check': 'Budget Check',
    'institution_verified': 'Manager Approval',
    'vp_research_approval': 'VP Research Approval',
    'vp_academic_approval': 'VP Academic Approval',
    'vp_admin_approval': 'VP Admin Approval',
    'research_director_approval': 'Research Director Approval',
    'hoi_approval': 'HOI Approval',
    'dean_review': 'Admin Dept Review',
    'department_checks': 'Department Checks',
    'dean_verification': 'Admin Dept Verification',
    'chief_director_approval': 'Head of Campus Approval',
    'chairman_approval': 'Chairman Approval',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'query_required': 'Queries Required',
    'department_query': 'Department Queries',
    'research_director_submitted': 'Awaiting Chairman Approval'
  };
  
  return statusMap[status.toLowerCase()] || status;
};

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({ currentStatus, isRDFlow: isRDFlowProp = false }) => {
  // Determine which VP-level step to show based on current status
  const vpStatuses: Record<string, string> = {
    'vp_research_approval': 'VP Research Approval',
    'vp_academic_approval': 'VP Academic Approval',
    'vp_admin_approval': 'VP Admin Approval',
    'research_director_approval': 'Research Director Approval',
  };
  const vpStepId = Object.keys(vpStatuses).includes(currentStatus)
    ? currentStatus
    : 'vp_research_approval';
  const vpStepName = vpStatuses[vpStepId] || 'VP Approval';

  // Simplified 2-step workflow for Research Director direct-to-Chairman flow
  const rdWorkflowSteps = [
    { id: 'research_director_submitted', name: 'Submitted to Chairman' },
    { id: 'approved', name: 'Approved' },
  ];
  const rdCurrentIndex = rdWorkflowSteps.findIndex(step => step.id === currentStatus);
  const isRDFlow = isRDFlowProp || currentStatus === 'research_director_submitted';

  // ── RD Flow: compact inline design ──────────────────────────────────────
  if (isRDFlow) {
    const isApproved = currentStatus === 'approved';
    return (
      <div className="inline-flex flex-col gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm w-fit">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Approval Flow</p>
        <div className="flex items-center gap-3">

          {/* Step 1 */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-600 text-center w-20 leading-tight">Research Director</span>
          </div>

          {/* Connector */}
          <div className={`h-0.5 w-10 rounded-full ${isApproved ? 'bg-green-400' : 'bg-gray-200'}`} />

          {/* Step 2 */}
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-colors ${
              isApproved
                ? 'bg-green-500'
                : 'bg-blue-500 ring-4 ring-blue-100'
            }`}>
              {isApproved ? (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <span className={`text-xs font-medium text-center w-16 leading-tight ${isApproved ? 'text-gray-600' : 'text-blue-600'}`}>Chairman</span>
          </div>

          {/* Connector */}
          <div className={`h-0.5 w-10 rounded-full ${isApproved ? 'bg-green-400' : 'bg-gray-200'}`} />

          {/* Step 3 */}
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${
              isApproved ? 'bg-green-500' : 'bg-gray-100'
            }`}>
              {isApproved ? (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-xs font-semibold text-gray-400">3</span>
              )}
            </div>
            <span className={`text-xs font-medium text-center w-16 leading-tight ${isApproved ? 'text-green-600' : 'text-gray-400'}`}>
              {isApproved ? 'Approved' : 'Pending'}
            </span>
          </div>

        </div>

        {/* Status pill */}
        <div className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${
          isApproved
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-50 text-blue-700'
        }`}>
          {isApproved ? '✓ Approved by Chairman' : 'Awaiting Chairman Approval'}
        </div>
      </div>
    );
  }
  // ────────────────────────────────────────────────────────────────────────

  const workflowSteps = [
      { id: 'manager_review', name: 'Manager Review' },
      { id: 'budget_check', name: 'Budget Check' },
      { id: 'institution_verified', name: 'Manager Approval' },
      { id: vpStepId, name: vpStepName },
      { id: 'hoi_approval', name: 'HOI Approval' },
      { id: 'dean_review', name: 'Admin Dept Review' },
      { id: 'dean_verification', name: 'Admin Dept Verification' },
      { id: 'chief_director_approval', name: 'Head of Campus Approval' },
      { id: 'chairman_approval', name: 'Chairman Approval' },
      { id: 'approved', name: 'Approved' },
    ];

  // Check if current status is a query status
  const isQueryStatus = ['query_required', 'department_checks'].includes(currentStatus);

  // Check if current status is a verification status
  const isParallelStatus = ['budget_check', 'institution_verified'].includes(currentStatus);
  // Find the index of the current status in main workflow
  const currentStatusIndex = workflowSteps.findIndex(step => step.id === currentStatus);

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Approval Workflow</h3>
        <p className="mt-1 text-sm text-gray-500">Current status of this request in the approval process</p>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        {/* Show queries status if applicable */}
        {isQueryStatus && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-medium text-yellow-800">
                  {getStatusDisplayName(currentStatus)}
                </h4>
                <p className="text-sm text-yellow-700">
                  {String(currentStatus) === 'query_required' && 'Waiting for response from Requester'}
                  {String(currentStatus) === 'department_checks' && 'Waiting for department response'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col">{/* Main workflow continues here */}
          {/* Desktop view - horizontal workflow */}
          <div className="hidden md:flex justify-between relative">
            {/* Progress line */}
            <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 z-0">
              <div 
                className="h-full bg-green-500" 
                style={{ width: `${Math.max(0, Math.min(100, (currentStatusIndex / (workflowSteps.length - 1)) * 100))}%` }}
              ></div>
            </div>
            
            {workflowSteps.map((step, index) => {
              const isCompleted = index < currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              const isFuture = index > currentStatusIndex;
              
              return (
                <div key={step.id} className="flex flex-col items-center relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                    getStatusBadgeClass(step.id, isCurrent, isCompleted)
                  }`}>
                    {isCompleted ? (
                      <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="text-xs text-center w-24">
                    <span className={`font-medium ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                      {step.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Mobile view - vertical workflow */}
          <div className="md:hidden space-y-4">
            {workflowSteps.map((step, index) => {
              const isCompleted = index < currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              const isFuture = index > currentStatusIndex;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    getStatusBadgeClass(step.id, isCurrent, isCompleted)
                  }`}>
                    {isCompleted ? (
                      <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="ml-3">
                    <span className={`text-sm font-medium ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                      {step.name}
                    </span>
                    {isCurrent && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Current
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Current status information */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Current Status</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p className="font-semibold">{getStatusDisplayName(currentStatus)} stage</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalWorkflow;