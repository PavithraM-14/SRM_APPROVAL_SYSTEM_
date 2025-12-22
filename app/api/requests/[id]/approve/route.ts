import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Request from '../../../../../models/Request';
import { getCurrentUser } from '../../../../../lib/auth';
import { RequestStatus, ActionType, UserRole } from '../../../../../lib/types';
import { approvalEngine } from '../../../../../lib/approval-engine';
import { clarificationEngine } from '../../../../../lib/clarification-engine';

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

    // Validate action - add new actions for budget routing and clarification workflow
    if (!['approve', 'reject', 'clarify', 'forward', 'budget_available', 'budget_not_available', 'reject_with_clarification', 'clarify_and_reapprove', 'dean_send_to_requester'].includes(action)) {
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

    console.log('[DEBUG] Role authorization check:', {
      currentStatus: requestRecord.status,
      requiredApprovers,
      userRole: user.role,
      isAuthorized: requiredApprovers.includes(user.role as UserRole)
    });

    if (!requiredApprovers.includes(user.role as UserRole)) {
      console.log('[DEBUG] Authorization failed - user not in required approvers');
      return NextResponse.json(
        { error: 'Not authorized to approve this request' },
        { status: 403 }
      );
    }

    // Special check for department clarifications
    if (requestRecord.status === RequestStatus.DEPARTMENT_CHECKS) {
      // Find the latest clarification request from Dean
      const latestClarification = requestRecord.history
        .filter((h: any) => h.action === ActionType.CLARIFY && h.clarificationTarget)
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      console.log('[DEBUG] Department clarification check:', {
        userRole: user.role,
        latestClarification: latestClarification ? {
          clarificationTarget: latestClarification.clarificationTarget,
          actor: latestClarification.actor,
          timestamp: latestClarification.timestamp
        } : null,
        requestHistory: requestRecord.history.map((h: any) => ({
          action: h.action,
          clarificationTarget: h.clarificationTarget,
          timestamp: h.timestamp
        }))
      });

      if (latestClarification && latestClarification.clarificationTarget !== user.role) {
        console.log('[DEBUG] Authorization failed:', {
          expected: latestClarification.clarificationTarget,
          actual: user.role
        });
        return NextResponse.json(
          { error: `These queries were sent to ${latestClarification.clarificationTarget.toUpperCase()} department, not ${user.role.toUpperCase()}. Only ${latestClarification.clarificationTarget.toUpperCase()} users can respond to these queries.` },
          { status: 403 }
        );
      }
    }

    const previousStatus = requestRecord.status;

    let nextStatus = requestRecord.status;
    let actionType = ActionType.APPROVE;

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
        } else if (requestRecord.status === RequestStatus.INSTITUTION_VERIFIED && user.role === UserRole.INSTITUTION_MANAGER) {
          // Institution Manager approves after both SOP and Accountant verification
          nextStatus = RequestStatus.VP_APPROVAL;
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
          budgetNotAvailable: requestRecord.budgetNotAvailable
         }
      ) || requestRecord.status;
  }
}

        actionType = ActionType.APPROVE;
        break;

      case 'budget_available':
        if (user.role === UserRole.INSTITUTION_MANAGER && requestRecord.status === RequestStatus.MANAGER_REVIEW) {
          nextStatus = RequestStatus.VP_APPROVAL;
          actionType = ActionType.FORWARD;
        }
        break;

      case 'budget_not_available':
        if (user.role === UserRole.INSTITUTION_MANAGER && requestRecord.status === RequestStatus.MANAGER_REVIEW) {
          nextStatus = RequestStatus.DEAN_REVIEW;
          actionType = ActionType.FORWARD;
          // Mark this request as coming from budget not available path
          if (!updateData.$set) updateData.$set = {};
          updateData.$set.budgetNotAvailable = true;
        }
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

      case 'forward':
        // Handle department responses to Dean clarifications
        if ([UserRole.MMA, UserRole.HR, UserRole.AUDIT, UserRole.IT].includes(user.role as UserRole) && 
            requestRecord.status === RequestStatus.DEPARTMENT_CHECKS) {
          // Find the latest clarification to get the target
          const latestClarification = requestRecord.history
            .filter((h: any) => h.action === ActionType.CLARIFY && h.clarificationTarget)
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
          
          // Use approval engine with proper context
          const context = { clarificationTarget: latestClarification?.clarificationTarget };
          console.log('[DEBUG] Department forward context:', {
            userRole: user.role,
            currentStatus: requestRecord.status,
            context,
            latestClarification: latestClarification ? {
              clarificationTarget: latestClarification.clarificationTarget,
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

      case 'reject_with_clarification':
        // Validate that clarification request is provided
        if (!notes || notes.trim() === '') {
          return NextResponse.json({ error: 'Queries for the requester are required when raising queries' }, { status: 400 });
        }
        
        // Get the clarification target based on new workflow
        const clarificationTarget = clarificationEngine.getClarificationTarget(requestRecord.status, user.role as UserRole);
        if (!clarificationTarget) {
          return NextResponse.json({ error: 'Cannot send queries - no target found' }, { status: 400 });
        }
        
        console.log('[DEBUG] Reject with clarification (NEW WORKFLOW):', {
          currentStatus: requestRecord.status,
          currentRole: user.role,
          clarificationTarget: clarificationTarget,
          clarificationRequest: notes,
          isDeanMediated: clarificationTarget.isDeanMediated
        });
        
        // Set the request to pending clarification at the target level
        nextStatus = clarificationTarget.status;
        actionType = ActionType.REJECT_WITH_CLARIFICATION;
        break;

      case 'clarify_and_reapprove':
        // Validate that clarification response is provided
        if (!notes || notes.trim() === '') {
          return NextResponse.json({ error: 'Response to queries is required' }, { status: 400 });
        }
        
        // Check if this request is actually pending clarification for this user
        if (!clarificationEngine.canProvideClarification(requestRecord, user.role as UserRole, user.id)) {
          return NextResponse.json({ error: 'This request is not pending response from you' }, { status: 400 });
        }
        
        // Handle different clarification workflows
        if (user.role === UserRole.REQUESTER) {
          // Requester providing clarification
          if (clarificationEngine.isDeanMediatedClarification(requestRecord)) {
            // Dean-mediated: Requester → Dean
            nextStatus = RequestStatus.DEAN_REVIEW;
          } else {
            // Direct: Requester → Original Rejector
            const returnStatus = clarificationEngine.getReturnStatus(requestRecord);
            if (!returnStatus) {
              return NextResponse.json({ error: 'Cannot determine return status for clarification' }, { status: 400 });
            }
            nextStatus = returnStatus;
          }
        } else if (user.role === UserRole.DEAN) {
          // Dean reviewing requester's clarification and re-approving
          const returnStatus = clarificationEngine.getReturnStatus(requestRecord);
          if (!returnStatus) {
            return NextResponse.json({ error: 'Cannot determine return status for Dean re-approval' }, { status: 400 });
          }
          nextStatus = returnStatus;
        } else {
          return NextResponse.json({ error: 'Invalid role for clarification response' }, { status: 400 });
        }
        
        actionType = ActionType.CLARIFY_AND_REAPPROVE;
        
        console.log('[DEBUG] Clarify and reapprove (NEW WORKFLOW):', {
          currentStatus: requestRecord.status,
          targetStatus: nextStatus,
          userRole: user.role,
          clarificationResponse: notes,
          isDeanMediated: clarificationEngine.isDeanMediatedClarification(requestRecord)
        });
        break;

      case 'dean_send_to_requester':
        // Dean forwards rejection to requester for clarification
        if (user.role !== UserRole.DEAN) {
          return NextResponse.json({ error: 'Only Dean can send requests to requester for clarification' }, { status: 400 });
        }
        
        if (!notes || notes.trim() === '') {
          return NextResponse.json({ error: 'Clarification message is required' }, { status: 400 });
        }
        
        nextStatus = RequestStatus.SUBMITTED;
        actionType = ActionType.REJECT_WITH_CLARIFICATION;
        
        console.log('[DEBUG] Dean sending to requester for clarification:', {
          currentStatus: requestRecord.status,
          targetStatus: nextStatus,
          clarificationMessage: notes
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

    // Store clarification target for Dean to department flow
    if (action === 'clarify' && user.role === UserRole.DEAN && target) {
      historyEntry.clarificationTarget = target;
    }

    // Store clarification type for Institution Manager flow
    if (action === 'clarify' && user.role === UserRole.INSTITUTION_MANAGER && target) {
      historyEntry.clarificationType = target;
    }

    // Store department response for Dean clarifications
    if (action === 'forward' && [UserRole.MMA, UserRole.HR, UserRole.AUDIT, UserRole.IT].includes(user.role as UserRole) && 
        requestRecord.status === RequestStatus.DEPARTMENT_CHECKS) {
      historyEntry.departmentResponse = user.role;
    }

    // Handle clarification workflow fields
    if (action === 'reject_with_clarification' || action === 'dean_send_to_requester') {
      historyEntry.clarificationRequest = notes;
      historyEntry.requiresClarification = true;
      if (attachments?.length) historyEntry.attachments = attachments;
      
      // Store original rejector info for Dean-mediated clarifications
      if (action === 'reject_with_clarification') {
        const clarificationTarget = clarificationEngine.getClarificationTarget(requestRecord.status, user.role as UserRole);
        if (clarificationTarget?.isDeanMediated) {
          historyEntry.originalRejector = user.id;
          historyEntry.isDeanMediated = true;
        }
      }
    }

    if (action === 'clarify_and_reapprove') {
      historyEntry.clarificationResponse = notes;
      if (attachments?.length) historyEntry.clarificationAttachments = attachments;
      
      // Mark if this is a Dean re-approval after reviewing requester's clarification
      if (user.role === UserRole.DEAN && clarificationEngine.isDeanMediatedClarification(requestRecord)) {
        historyEntry.isDeanReapproval = true;
      }
    }

    // 🔹 ACCOUNTANT BUDGET AVAILABILITY - already handled above
    // if (user.role === UserRole.ACCOUNTANT && typeof budgetAvailable === 'boolean') {
    //   historyEntry.budgetAvailable = budgetAvailable;
    // }

    // PREPARE UPDATE
    const updateData: any = {
      $push: { history: historyEntry },
    };

    if (nextStatus !== previousStatus) {
      updateData.$set = { status: nextStatus };
    }

    // Handle clarification workflow updates
    if (action === 'reject_with_clarification' || action === 'dean_send_to_requester') {
      if (!updateData.$set) updateData.$set = {};
      updateData.$set.pendingClarification = true;
      
      if (action === 'reject_with_clarification') {
        const clarificationTarget = clarificationEngine.getClarificationTarget(requestRecord.status, user.role as UserRole);
        updateData.$set.clarificationLevel = clarificationTarget?.role;
      } else {
        // dean_send_to_requester
        updateData.$set.clarificationLevel = UserRole.REQUESTER;
      }
    }

    if (action === 'clarify_and_reapprove') {
      if (!updateData.$set) updateData.$set = {};
      
      if (user.role === UserRole.REQUESTER) {
        // Requester provided clarification
        if (clarificationEngine.isDeanMediatedClarification(requestRecord)) {
          // Dean-mediated: Requester → Dean for review
          updateData.$set.clarificationLevel = UserRole.DEAN;
          updateData.$set.pendingClarification = true; // Still pending, but now with Dean
        } else {
          // Direct: Requester → Original Rejector
          // Find the original rejector and set them as the clarification level
          const originalRejector = clarificationEngine.getOriginalRejector(requestRecord);
          if (originalRejector) {
            updateData.$set.clarificationLevel = originalRejector.role;
            updateData.$set.pendingClarification = true; // Now pending with original rejector
          } else {
            updateData.$set.pendingClarification = false;
            updateData.$set.clarificationLevel = null;
          }
        }
      } else {
        // Dean or other reviewer approved after clarification - workflow complete
        updateData.$set.pendingClarification = false;
        updateData.$set.clarificationLevel = null;
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
