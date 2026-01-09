import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Request from '../../../../../models/Request';
import { getCurrentUser } from '../../../../../lib/auth';
import { RequestStatus, ActionType, UserRole } from '../../../../../lib/types';
import { approvalEngine } from '../../../../../lib/approval-engine';
import { queryEngine } from '../../../../../lib/query-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let user: any = null;
  let action: string = '';
  
  try {
    await connectDB();
    user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[DEBUG] Approval request started:', {
      requestId: params.id,
      userRole: user.role,
      userEmail: user.email
    });

    const {
      action: requestAction,
      notes,
      budgetAvailable,
      forwardedMessage,
      attachments,
      target,
      sopReference,
    } = await request.json();
    
    action = requestAction;

    console.log('[DEBUG] Request body parsed:', {
      action,
      notes: notes ? 'provided' : 'empty',
      target,
      userRole: user.role
    });

    // Validate action - add new actions for budget routing and query workflow
    if (!['approve', 'reject', 'clarify', 'forward', 'send_to_dean', 'send_to_vp', 'reject_with_query', 'query_and_reapprove', 'dean_send_to_requester'].includes(action)) {
      console.log('[DEBUG] Invalid action:', action);
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const requestRecord = await Request.findById(params.id);

    if (!requestRecord) {
      console.log('[DEBUG] Request not found:', params.id);
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    console.log('[DEBUG] Request found:', {
      requestId: params.id,
      currentStatus: requestRecord.status,
      historyLength: requestRecord.history?.length || 0
    });

    // Role check
    const requiredApprovers = approvalEngine.getRequiredApprover(
      requestRecord.status
    );

    // Clarification responder bypass: allow the role currently responsible for responding
    const isQueryResponder = (
      action === 'query_and_reapprove' &&
      requestRecord.pendingQuery === true &&
      requestRecord.queryLevel === (user.role as UserRole)
    );

    const isDeanSendToRequester = (
      action === 'dean_send_to_requester' && user.role === UserRole.DEAN
    );

    console.log('[DEBUG] Role authorization check:', {
      currentStatus: requestRecord.status,
      requiredApprovers,
      userRole: user.role,
      pendingQuery: requestRecord.pendingQuery,
      queryLevel: requestRecord.queryLevel,
      isAuthorizedApprover: requiredApprovers.includes(user.role as UserRole),
      isQueryResponder,
      isDeanSendToRequester
    });

    if (
      !requiredApprovers.includes(user.role as UserRole) &&
      !isQueryResponder &&
      !isDeanSendToRequester
    ) {
      console.log('[DEBUG] Authorization failed - role not permitted for this action');
      return NextResponse.json(
        { error: 'Not authorized to approve this request' },
        { status: 403 }
      );
    }

    // Special check for department queries
    if (requestRecord.status === RequestStatus.DEPARTMENT_CHECKS) {
      // Find the latest query request from Dean
      const latestClarification = requestRecord.history
        .filter((h: any) => h.action === ActionType.CLARIFY && h.queryTarget)
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      console.log('[DEBUG] Department query check:', {
        userRole: user.role,
        latestClarification: latestClarification ? {
          queryTarget: latestClarification.queryTarget,
          actor: latestClarification.actor,
          timestamp: latestClarification.timestamp
        } : null,
        requestHistory: requestRecord.history.map((h: any) => ({
          action: h.action,
          queryTarget: h.queryTarget,
          timestamp: h.timestamp
        }))
      });

      if (latestClarification && latestClarification.queryTarget !== user.role.toLowerCase()) {
        console.log('[DEBUG] Authorization failed:', {
          expected: latestClarification.queryTarget,
          actual: user.role.toLowerCase()
        });
        return NextResponse.json(
          { error: `These queries were sent to ${latestClarification.queryTarget.toUpperCase()} department, not ${user.role.toUpperCase()}. Only ${latestClarification.queryTarget.toUpperCase()} users can respond to these queries.` },
          { status: 403 }
        );
      }
    }

    const previousStatus = requestRecord.status;

    let nextStatus = requestRecord.status;
    let actionType = ActionType.APPROVE;
    // Prepare mutable update object early to allow status-specific flags before final assembly
    let updateData: any = {};

    // Handle different actions
    switch (action) {

      case 'approve':
        // Check if this is parallel verification completion
        if (requestRecord.status === RequestStatus.PARALLEL_VERIFICATION) {
          if (user.role === UserRole.SOP_VERIFIER) {
            nextStatus = RequestStatus.SOP_COMPLETED;
          } else if (user.role === UserRole.ACCOUNTANT) {
            // Simplified: accountant just confirms budget availability
            nextStatus = RequestStatus.BUDGET_COMPLETED;
          }
        } else if (requestRecord.status === RequestStatus.SOP_COMPLETED && user.role === UserRole.ACCOUNTANT) {
          // After both verifications complete, go to Institution Manager for final verification
          nextStatus = RequestStatus.INSTITUTION_VERIFIED;
        } else if (requestRecord.status === RequestStatus.BUDGET_COMPLETED && user.role === UserRole.SOP_VERIFIER) {
          // After both verifications complete, go to Institution Manager for final verification
          nextStatus = RequestStatus.INSTITUTION_VERIFIED;
        } else if (requestRecord.status === RequestStatus.BUDGET_CHECK && user.role === UserRole.ACCOUNTANT) {
          // Simplified: accountant just confirms budget availability
          // After accountant approval, always go back to manager for routing decision
          nextStatus = RequestStatus.MANAGER_REVIEW;
        } else {
  // ✅ COST-BASED FINAL APPROVAL LOGIC
  if (
    user.role === UserRole.CHIEF_DIRECTOR &&
    requestRecord.status === RequestStatus.CHIEF_DIRECTOR_APPROVAL
  ) {
    const cost = requestRecord.costEstimate || 0;

    if (cost > 50000) {
      // 🔴 High cost → Chairman required
      nextStatus = RequestStatus.CHAIRMAN_APPROVAL;
    } else {
      // 🟢 Low / No cost → FINAL APPROVAL
      nextStatus = RequestStatus.APPROVED;
    }
  } else {
    nextStatus =
      approvalEngine.getNextStatus(
        requestRecord.status,
        ActionType.APPROVE,
        user.role as UserRole,
        { budgetAvailable,
          costEstimate: requestRecord.costEstimate,
          budgetNotAvailable: requestRecord.budgetNotAvailable,
          sentDirectlyToDean: requestRecord.sentDirectlyToDean
         }
      ) || requestRecord.status;
  }
}

        actionType = ActionType.APPROVE;
        break;

      case 'reject':
        nextStatus = RequestStatus.REJECTED;
        actionType = ActionType.REJECT;
        break;

      case 'clarify':
        if (user.role === UserRole.DEAN && target) {
          nextStatus = RequestStatus.DEPARTMENT_CHECKS;
        } else {
          nextStatus = RequestStatus.CLARIFICATION_REQUIRED;
        }
        actionType = ActionType.CLARIFY;
        break;

      case 'send_to_dean':
        if (user.role === UserRole.INSTITUTION_MANAGER && requestRecord.status === RequestStatus.INSTITUTION_VERIFIED) {
          nextStatus = RequestStatus.DEAN_REVIEW;
          actionType = ActionType.APPROVE;
          // Mark this request as coming from direct send to dean path
          if (!updateData.$set) updateData.$set = {};
          updateData.$set.sentDirectlyToDean = true;
        }
        break;

      case 'send_to_vp':
        if (user.role === UserRole.INSTITUTION_MANAGER && requestRecord.status === RequestStatus.INSTITUTION_VERIFIED) {
          nextStatus = RequestStatus.VP_APPROVAL;
          actionType = ActionType.APPROVE;
          // This follows normal flow through VP → HOI → Dean → Chief Director
        }
        break;

      case 'forward':
        // Handle department responses to Dean queries
        if ([UserRole.MMA, UserRole.HR, UserRole.AUDIT, UserRole.IT].includes(user.role as UserRole) && 
            requestRecord.status === RequestStatus.DEPARTMENT_CHECKS) {
          // Find the latest query to get the target
          const latestClarification = requestRecord.history
            .filter((h: any) => h.action === ActionType.CLARIFY && h.queryTarget)
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
          
          // Use approval engine with proper context
          const context = { queryTarget: latestClarification?.queryTarget };
          console.log('[DEBUG] Department forward context:', {
            userRole: user.role,
            currentStatus: requestRecord.status,
            context,
            latestClarification: latestClarification ? {
              queryTarget: latestClarification.queryTarget,
              timestamp: latestClarification.timestamp
            } : null
          });
          
          nextStatus = approvalEngine.getNextStatus(
            requestRecord.status,
            ActionType.FORWARD,
            user.role as UserRole,
            context
          ) || RequestStatus.DEAN_VERIFICATION; // Changed from DEAN_REVIEW to DEAN_VERIFICATION
        } else {
          nextStatus =
            approvalEngine.getNextStatus(
              requestRecord.status,
              ActionType.FORWARD,
              user.role as UserRole,
              {}
            ) || requestRecord.status;
        }
        actionType = ActionType.FORWARD;
        break;

      case 'reject_with_query':
        // Validate that query request is provided
        if (!notes || notes.trim() === '') {
          return NextResponse.json({ error: 'Queries for the requester are required when raising queries' }, { status: 400 });
        }
        
        // Get the query target based on new workflow
        const queryTarget = queryEngine.getQueryTarget(requestRecord.status, user.role as UserRole);
        if (!queryTarget) {
          return NextResponse.json({ error: 'Cannot send queries - no target found' }, { status: 400 });
        }
        
        console.log('[DEBUG] Reject with query (NEW WORKFLOW):', {
          currentStatus: requestRecord.status,
          currentRole: user.role,
          queryTarget: queryTarget,
          queryRequest: notes,
          isDeanMediated: queryTarget.isDeanMediated
        });
        
        // Set the request to pending query at the target level
        nextStatus = queryTarget.status;
        actionType = ActionType.REJECT_WITH_CLARIFICATION;
        break;

      case 'query_and_reapprove':
        // Validate that query response is provided
        if (!notes || notes.trim() === '') {
          return NextResponse.json({ error: 'Response to queries is required' }, { status: 400 });
        }
        
        // Check if this request is actually pending query for this user
        if (!queryEngine.canProvideClarification(requestRecord, user.role as UserRole, user.id)) {
          return NextResponse.json({ error: 'This request is not pending response from you' }, { status: 400 });
        }
        
        // Handle different query workflows
        if (user.role === UserRole.REQUESTER) {
          // Requester providing query
          if (queryEngine.isDeanMediatedClarification(requestRecord)) {
            // Dean-mediated: Requester → Dean
            nextStatus = RequestStatus.DEAN_REVIEW;
          } else {
            // Direct: Requester → Original Rejector
            const returnStatus = queryEngine.getReturnStatus(requestRecord);
            nextStatus = returnStatus || RequestStatus.MANAGER_REVIEW;
          }
        } else if (user.role === UserRole.DEAN) {
          // Dean reviewing requester's query and re-approving
          const returnStatus = queryEngine.getReturnStatus(requestRecord);
          nextStatus = returnStatus || RequestStatus.MANAGER_REVIEW;
        } else {
          return NextResponse.json({ error: 'Invalid role for query response' }, { status: 400 });
        }
        
        actionType = ActionType.CLARIFY_AND_REAPPROVE;
        
        console.log('[DEBUG] Clarify and reapprove (NEW WORKFLOW):', {
          currentStatus: requestRecord.status,
          targetStatus: nextStatus,
          userRole: user.role,
          queryResponse: notes,
          isDeanMediated: queryEngine.isDeanMediatedClarification(requestRecord)
        });
        break;

      case 'dean_send_to_requester':
        // Dean forwards rejection to requester for query
        if (user.role !== UserRole.DEAN) {
          return NextResponse.json({ error: 'Only Dean can send requests to requester for query' }, { status: 400 });
        }
        
        if (!notes || notes.trim() === '') {
          return NextResponse.json({ error: 'Clarification message is required' }, { status: 400 });
        }
        
        nextStatus = RequestStatus.SUBMITTED;
        actionType = ActionType.REJECT_WITH_CLARIFICATION;
        
        console.log('[DEBUG] Dean sending to requester for query:', {
          currentStatus: requestRecord.status,
          targetStatus: nextStatus,
          queryMessage: notes
        });
        break;
    }

    // 🔹 **SPECIAL FIX — VP → HOI**
    if (
      user.role === UserRole.VP &&
      requestRecord.status === RequestStatus.VP_APPROVAL
    ) {
      nextStatus = RequestStatus.HOI_APPROVAL;
    }

    // 🔹 SOP stores reference number
    if (user.role === UserRole.SOP_VERIFIER && sopReference) {
      requestRecord.sopReference = sopReference;
      await requestRecord.save();
    }

    // BUILD HISTORY ENTRY
    const historyEntry: any = {
      action: actionType,
      actor: user.id,
      previousStatus,
      newStatus: nextStatus,
      timestamp: new Date(),
    };

    if (action === 'forward') {
      historyEntry.forwardedMessage = forwardedMessage || notes || '';
      if (attachments?.length) historyEntry.attachments = attachments;
    } else {
      if (notes) historyEntry.notes = notes;
      if (budgetAvailable !== undefined)
        historyEntry.budgetAvailable = budgetAvailable;
    }

    // Store SOP reference in history
    if (user.role === UserRole.SOP_VERIFIER && sopReference) {
      historyEntry.sopReference = sopReference;
    }

    // Store budget availability for accountant
    if (user.role === UserRole.ACCOUNTANT && budgetAvailable !== undefined) {
      historyEntry.budgetAvailable = budgetAvailable;
    }

    // Store query target for Dean to department flow
    if (action === 'clarify' && user.role === UserRole.DEAN && target) {
      historyEntry.queryTarget = target;
    }

    // Store query type for Institution Manager flow
    if (action === 'clarify' && user.role === UserRole.INSTITUTION_MANAGER && target) {
      historyEntry.queryType = target;
    }

    // Store department response for Dean queries
    if (action === 'forward' && [UserRole.MMA, UserRole.HR, UserRole.AUDIT, UserRole.IT].includes(user.role as UserRole) && 
        requestRecord.status === RequestStatus.DEPARTMENT_CHECKS) {
      historyEntry.departmentResponse = user.role;
    }

    // Handle query workflow fields
    if (action === 'reject_with_query' || action === 'dean_send_to_requester') {
      historyEntry.queryRequest = notes;
      historyEntry.requiresClarification = true;
      if (attachments?.length) historyEntry.attachments = attachments;
      
      // Store original rejector info for Dean-mediated queries
      if (action === 'reject_with_query') {
        const queryTarget = queryEngine.getQueryTarget(requestRecord.status, user.role as UserRole);
        if (queryTarget?.isDeanMediated) {
          historyEntry.originalRejector = user.id;
          historyEntry.isDeanMediated = true;
        }
      }
    }

    if (action === 'query_and_reapprove') {
      historyEntry.queryResponse = notes;
      if (attachments?.length) historyEntry.queryAttachments = attachments;
      
      // Mark if this is a Dean re-approval after reviewing requester's query
      if (user.role === UserRole.DEAN && queryEngine.isDeanMediatedClarification(requestRecord)) {
        historyEntry.isDeanReapproval = true;
      }
    }

    // 🔹 ACCOUNTANT BUDGET AVAILABILITY - already handled above
    // if (user.role === UserRole.ACCOUNTANT && typeof budgetAvailable === 'boolean') {
    //   historyEntry.budgetAvailable = budgetAvailable;
    // }

    // PREPARE UPDATE
    updateData = {
      $push: { history: historyEntry },
    };

    if (nextStatus !== previousStatus) {
      updateData.$set = { status: nextStatus };
    }

    // Handle query workflow updates
    if (action === 'reject_with_query' || action === 'dean_send_to_requester') {
      if (!updateData.$set) updateData.$set = {};
      updateData.$set.pendingQuery = true;
      
      if (action === 'reject_with_query') {
        const queryTarget = queryEngine.getQueryTarget(requestRecord.status, user.role as UserRole);
        updateData.$set.queryLevel = queryTarget?.role;
      } else {
        // dean_send_to_requester
        updateData.$set.queryLevel = UserRole.REQUESTER;
      }
    }

    if (action === 'query_and_reapprove') {
      if (!updateData.$set) updateData.$set = {};
      
      if (user.role === UserRole.REQUESTER) {
        // Requester provided query
        if (queryEngine.isDeanMediatedClarification(requestRecord)) {
          // Dean-mediated: Requester → Dean for review
          updateData.$set.queryLevel = UserRole.DEAN;
          updateData.$set.pendingQuery = true; // Still pending, but now with Dean
        } else {
          // Direct: Requester → Original Rejector
          // Find the original rejector and set them as the query level
          const originalRejector = queryEngine.getOriginalRejector(requestRecord);
          if (originalRejector) {
            updateData.$set.queryLevel = originalRejector.role;
            updateData.$set.pendingQuery = true; // Now pending with original rejector
          } else {
            updateData.$set.pendingQuery = false;
            updateData.$set.queryLevel = null;
          }
        }
      } else {
        // Dean or other reviewer approved after query - workflow complete
        updateData.$set.pendingQuery = false;
        updateData.$set.queryLevel = null;
      }
    }

    // Save accountant budget availability to Request document
    if (user.role === UserRole.ACCOUNTANT && action === 'approve' && typeof budgetAvailable === 'boolean') {
      if (!updateData.$set) updateData.$set = {};
      updateData.$set.budgetAvailable = budgetAvailable;
    }

    // Add attachments (except forward)
    if (action !== 'forward' && attachments?.length) {
      if (!updateData.$set) updateData.$set = {};
      updateData.$set.attachments = [
        ...requestRecord.attachments,
        ...attachments,
      ];
    }

    console.log('[DEBUG] About to update request with:', updateData);
    
    const updatedRequest = await Request.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    )
      .populate('requester', 'name email empId')
      .populate('history.actor', 'name email empId');

    console.log('[DEBUG] Request updated successfully');
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('[ERROR] Approve request error:', error);
    console.error('[ERROR] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestId: params.id,
      userRole: user?.role,
      action: action
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: `Failed to process approval: ${errorMessage}`,
        details: errorMessage,
        debugInfo: {
          requestId: params.id,
          userRole: user?.role,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}
