'use client';

import React from 'react';
import { RequestStatus } from '../lib/types';

interface ApprovalWorkflowProps {
  currentStatus: RequestStatus;
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
    'parallel_verification': 'Parallel Verification',
    'sop_verification': 'SOP Verification',
    'budget_check': 'Budget Check',
    'sop_completed': 'SOP Completed',
    'budget_completed': 'Budget Completed',
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
    'clarification_required': 'Queries Required',
    'sop_clarification': 'SOP Queries',
    'budget_clarification': 'Budget Queries',
    'department_clarification': 'Department Queries'
  };
  
  return statusMap[status.toLowerCase()] || status;
};

const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({ currentStatus }) => {
  // Define the main approval workflow steps
  const workflowSteps = [
    { id: 'manager_review', name: 'Manager Review' },
    { id: 'parallel_verification', name: 'Parallel Verification' },
    { id: 'institution_verified', name: 'Institution Verified' },
    { id: 'vp_approval', name: 'VP Approval' },
    { id: 'hoi_approval', name: 'HOI Approval' },
    { id: 'dean_review', name: 'Dean Review' },
    { id: 'dean_verification', name: 'Dean Verification' },
    { id: 'chief_director_approval', name: 'Chief Director Approval' },
    { id: 'chairman_approval', name: 'Chairman Approval' },
    { id: 'approved', name: 'Approved' },
  ];

  // Check if current status is a queries status
  const isClarificationStatus = ['sop_clarification', 'budget_clarification', 'clarification_required', 'department_checks'].includes(currentStatus);
  
  // Check if current status is a parallel verification status
  const isParallelStatus = ['parallel_verification', 'sop_completed', 'budget_completed', 'institution_verified'].includes(currentStatus);
  
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
        {isClarificationStatus && (
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
                  {String(currentStatus) === 'sop_clarification' && 'Waiting for SOP verification queries from Institution Manager'}
                  {String(currentStatus) === 'budget_clarification' && 'Waiting for budget queries from Institution Manager'}
                  {String(currentStatus) === 'clarification_required' && 'Waiting for response from Requester'}
                  {String(currentStatus) === 'department_checks' && 'Waiting for department response'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show parallel verification status if applicable */}
        {isParallelStatus && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-medium text-blue-800">
                  {getStatusDisplayName(currentStatus)}
                </h4>
                <p className="text-sm text-blue-700">
                  {currentStatus === 'parallel_verification' && 'Both SOP Verifier and Accountant are working on verification simultaneously'}
                  {currentStatus === 'sop_completed' && 'SOP verification complete. Waiting for budget verification to finish.'}
                  {currentStatus === 'budget_completed' && 'Budget verification complete. Waiting for SOP verification to finish.'}
                  {currentStatus === 'institution_verified' && 'Both SOP and Budget verifications complete. Waiting for Institution Manager final approval.'}
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