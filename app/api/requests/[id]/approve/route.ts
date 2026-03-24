import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Request from '../../../../../models/Request';
import { getCurrentUser } from '../../../../../lib/auth';
import { RequestStatus, ActionType, UserRole } from '../../../../../lib/types';
import { approvalEngine } from '../../../../../lib/approval-engine';
import { queryEngine } from '../../../../../lib/query-engine';
import { isHigherRole, getActionsForHigherRole } from '../../../../../lib/escalation-hierarchy';

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
      budgetData,
      forwardedMessage,
      attachments,
      target,
      sopReference,
      subAction,
      targetRole,
    } = await request.json();

    action = requestAction;

    console.log('[DEBUG] Request body parsed:', {
      action,
      notes: notes ? 'provided' : 'empty',
      target,
      userRole: user.role
    });

    // Validate action - add new actions for budget routing and query workflow
    if (!['approve', 'reject', 'clarify', 'forward', 'send_to_dean', 'send_to_vp_research', 'send_to_vp_academic', 'send_to_vp_admin', 'send_to_research_director', 'send_to_chairman', 'reject_with_clarification', 'clarify_and_reapprove', 'query_and_reapprove', 'dean_send_to_requester', 'escalation_action'].includes(action)) {
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

    // ── Flagged-request escalation branch ──────────────────────────────────
    if (requestRecord.escalation?.flagged === true && action === 'escalation_action') {
      const actingRole = user.role as UserRole;
      const stalledRole = requestRecord.escalation.stalledRole as UserRole;

      if (actingRole !== stalledRole && !isHigherRole(actingRole, stalledRole)) {
        return NextResponse.json(
          { error: 'Not authorized to act on this flagged request' },
          { status: 403 }
        );
      }

      const permittedActions = getActionsForHigherRole(actingRole, stalledRole);
      const chosenAction = subAction || 'approve';

      if (!permittedActions.includes(chosenAction)) {
        return NextResponse.json(
          { error: 'Action not permitted for your role on this flagged request' },
          { status: 400 }
        );
      }

      const actionTypeMap: Record<string, ActionType> = {
        approve: ActionType.APPROVE,
        reject: ActionType.REJECT,
        forward: ActionType.FORWARD,
      };
      const mappedActionType = actionTypeMap[chosenAction] ?? ActionType.APPROVE;

      const nextStatus =
        approvalEngine.getNextStatus(
          requestRecord.status,
          mappedActionType,
          actingRole,
          { costEstimate: requestRecord.costEstimate }
        ) || requestRecord.status;

      const escalationHistoryEntry: any = {
        action: ActionType.ESCALATION_ACTION,
        actor: user.id,
        previousStatus: requestRecord.status,
        newStatus: nextStatus,
        skippedRole: stalledRole,
        notes: notes || `Escalation action by ${actingRole}`,
        timestamp: new Date(),
      };

      const escalationUpdate: any = {
        $set: {
          status: nextStatus,
          'escalation.actedByHigherRole': actingRole,
          'escalation.actedByHigherRoleAt': new Date(),
        },
        $push: { history: escalationHistoryEntry },
      };

      const updatedRequest = await Request.findByIdAndUpdate(params.id, escalationUpdate, { new: true })
        .populate('requester', 'name email empId role')
        .populate('history.actor', 'name email empId role');

      return NextResponse.json(updatedRequest);
    }
    // ── End flagged-request branch ─────────────────────────────────────────

    const isDeanMediatedFlow = queryEngine.isDeanMediatedClarification(requestRecord);

    // Institutional isolation check
    const institutionalRoles = [
      UserRole.REQUESTER,
      UserRole.INSTITUTION_MANAGER,
      UserRole.ACCOUNTANT,
      UserRole.HEAD_OF_INSTITUTION
    ];

    if (institutionalRoles.includes(user.role as UserRole)) {
      if (user.college && requestRecord.college && user.college !== requestRecord.college) {
        console.log('[DEBUG] Institutional isolation violation:', {
          userCollege: user.college,
          requestCollege: requestRecord.college
        });
        return NextResponse.json({
          error: `Access Denied: This request belongs to ${requestRecord.college}, but you are assigned to ${user.college}.`
        }, { status: 403 });
      }
    }

    // Role check
    const requiredApprovers = approvalEngine.getRequiredApprover(
      requestRecord.status
    );

    // Clarification responder bypass: allow the role currently responsible for responding
    const isPendingQueryForUser = (
      requestRecord.pendingQuery === true &&
      requestRecord.queryLevel === (user.role as UserRole)
    );

    const isQueryResponder = action === 'query_and_reapprove' && isPendingQueryForUser;
    const isQueryRejector = action === 'reject' && isPendingQueryForUser;

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

    // Higher role acting on behalf of stalled role when request is flagged
    const isFlaggedHigherRole = (() => {
      if (!requestRecord.escalation?.flagged) return false;
      const stalledRole = requestRecord.escalation.stalledRole as UserRole | undefined;
      if (!stalledRole) return false;
      return isHigherRole(user.role as UserRole, stalledRole);
    })();

    if (
      !requiredApprovers.includes(user.role as UserRole) &&
      !isQueryResponder &&
      !isDeanSendToRequester &&
      !isQueryRejector &&
      !isFlaggedHigherRole
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

    // When a higher role acts on a flagged request on behalf of the stalled role,
    // use the stalled role for all workflow logic so transitions resolve correctly.
    const effectiveRole = isFlaggedHigherRole
      ? (requestRecord.escalation.stalledRole as UserRole)
      : (user.role as UserRole);

    console.log('[DEBUG] Processing approval request:', {
      requestId: params.id,
      action,
      userRole: user.role,
      currentStatus: requestRecord.status,
      previousStatus
    });

    // Handle different actions
    switch (action) {

      case 'approve':
        // Check if this is budget verification completion
        if (requestRecord.status === RequestStatus.BUDGET_CHECK && effectiveRole === UserRole.ACCOUNTANT) {
          nextStatus = RequestStatus.INSTITUTION_VERIFIED;
        } else {
          // ✅ COST-BASED FINAL APPROVAL LOGIC
          if (
            effectiveRole === UserRole.CHIEF_DIRECTOR &&
            requestRecord.status === RequestStatus.CHIEF_DIRECTOR_APPROVAL
          ) {
            const cost = requestRecord.costEstimate || 0;
            if (cost > 50000) {
              nextStatus = RequestStatus.CHAIRMAN_APPROVAL;
            } else {
              nextStatus = RequestStatus.APPROVED;
            }
          } else {
            nextStatus =
              approvalEngine.getNextStatus(
                requestRecord.status,
                ActionType.APPROVE,
                effectiveRole,
                {
                  budgetAvailable,
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
        if (effectiveRole === UserRole.DEAN && target) {
          nextStatus = RequestStatus.DEPARTMENT_CHECKS;
        } else {
          nextStatus = RequestStatus.CLARIFICATION_REQUIRED;
        }
        actionType = ActionType.CLARIFY;
        break;

      case 'send_to_dean':
        if (effectiveRole === UserRole.INSTITUTION_MANAGER && (requestRecord.status === RequestStatus.INSTITUTION_VERIFIED || requestRecord.status === RequestStatus.MANAGER_REVIEW)) {
          nextStatus = RequestStatus.DEAN_REVIEW;
          actionType = ActionType.APPROVE;
          if (!updateData.$set) updateData.$set = {};
          updateData.$set.sentDirectlyToDean = true;
        }
        break;

      case 'send_to_vp_research':
        if (user.role === UserRole.INSTITUTION_MANAGER && (requestRecord.status === RequestStatus.INSTITUTION_VERIFIED || requestRecord.status === RequestStatus.MANAGER_REVIEW)) {
          nextStatus = RequestStatus.VP_RESEARCH_APPROVAL;
          actionType = ActionType.APPROVE;
        }
        break;

      case 'send_to_vp_academic':
        if (user.role === UserRole.INSTITUTION_MANAGER && (requestRecord.status === RequestStatus.INSTITUTION_VERIFIED || requestRecord.status === RequestStatus.MANAGER_REVIEW)) {
          nextStatus = RequestStatus.VP_ACADEMIC_APPROVAL;
          actionType = ActionType.APPROVE;
        }
        break;

      case 'send_to_vp_admin':
        if (user.role === UserRole.INSTITUTION_MANAGER && (requestRecord.status === RequestStatus.INSTITUTION_VERIFIED || requestRecord.status === RequestStatus.MANAGER_REVIEW)) {
          nextStatus = RequestStatus.VP_ADMIN_APPROVAL;
          actionType = ActionType.APPROVE;
        }
        break;

      case 'send_to_research_director':
        if (user.role === UserRole.INSTITUTION_MANAGER && (requestRecord.status === RequestStatus.INSTITUTION_VERIFIED || requestRecord.status === RequestStatus.MANAGER_REVIEW)) {
          nextStatus = RequestStatus.RESEARCH_DIRECTOR_APPROVAL;
          actionType = ActionType.APPROVE;
        }
        break;

      case 'send_to_chairman':
        if (effectiveRole === UserRole.DEAN && (requestRecord.status === RequestStatus.DEAN_REVIEW || requestRecord.status === RequestStatus.DEAN_VERIFICATION)) {
          nextStatus = RequestStatus.CHAIRMAN_APPROVAL;
          actionType = ActionType.APPROVE;
        }
        break;

      case 'forward':
        // Handle department responses to Dean queries
        if ([UserRole.MMA, UserRole.HR, UserRole.AUDIT, UserRole.IT].includes(effectiveRole) &&
          requestRecord.status === RequestStatus.DEPARTMENT_CHECKS) {
          const latestClarification = requestRecord.history
            .filter((h: any) => h.action === ActionType.CLARIFY && h.queryTarget)
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

          const context = { queryTarget: latestClarification?.queryTarget };
          nextStatus = approvalEngine.getNextStatus(
            requestRecord.status,
            ActionType.FORWARD,
            effectiveRole,
            context
          ) || RequestStatus.DEAN_VERIFICATION;
        } else {
          nextStatus =
            approvalEngine.getNextStatus(
              requestRecord.status,
              ActionType.FORWARD,
              effectiveRole,
              {}
            ) || requestRecord.status;
        }
        actionType = ActionType.FORWARD;
        break;

      case 'reject_with_clarification':
        if (!notes || notes.trim() === '') {
          return NextResponse.json({ error: 'Queries for the recipient are required when raising queries' }, { status: 400 });
        }

        if (!targetRole) {
          return NextResponse.json({ error: 'Target role is required when raising queries' }, { status: 400 });
        }

        // Explicitly prevent queries to Chairman - he's the final authority
        if (targetRole === UserRole.CHAIRMAN) {
          return NextResponse.json({ error: 'Cannot send queries to Chairman - he is the final authority' }, { status: 400 });
        }

        // Validate that the current user can send queries to the target role (must be below their level)
        const { canSendQueryTo } = await import('../../../../../lib/query-hierarchy');
        if (!canSendQueryTo(user.role as UserRole, targetRole as UserRole)) {
          return NextResponse.json({ error: 'You can only send queries to roles below your level' }, { status: 400 });
        }

        // Determine the status based on target role (Chairman excluded)
        const targetStatusMap: Partial<Record<UserRole, RequestStatus>> = {
          [UserRole.REQUESTER]: RequestStatus.SUBMITTED,
          [UserRole.INSTITUTION_MANAGER]: RequestStatus.MANAGER_REVIEW,
          [UserRole.ACCOUNTANT]: RequestStatus.BUDGET_CHECK,
          [UserRole.VP_RESEARCH]: RequestStatus.VP_RESEARCH_APPROVAL,
          [UserRole.VP_ACADEMIC]: RequestStatus.VP_ACADEMIC_APPROVAL,
          [UserRole.VP_ADMIN]: RequestStatus.VP_ADMIN_APPROVAL,
          [UserRole.RESEARCH_DIRECTOR]: RequestStatus.RESEARCH_DIRECTOR_APPROVAL,
          [UserRole.HEAD_OF_INSTITUTION]: RequestStatus.HOI_APPROVAL,
          [UserRole.DEAN]: RequestStatus.DEAN_REVIEW,
          [UserRole.MMA]: RequestStatus.DEPARTMENT_CHECKS,
          [UserRole.HR]: RequestStatus.DEPARTMENT_CHECKS,
          [UserRole.AUDIT]: RequestStatus.DEPARTMENT_CHECKS,
          [UserRole.IT]: RequestStatus.DEPARTMENT_CHECKS,
          [UserRole.CHIEF_DIRECTOR]: RequestStatus.CHIEF_DIRECTOR_APPROVAL,
          // Note: Chairman excluded - no queries allowed to Chairman
        };

        nextStatus = targetStatusMap[targetRole as UserRole];
        if (!nextStatus) {
          return NextResponse.json({ error: 'Invalid target role for queries' }, { status: 400 });
        }
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

        // Handle requester providing query response
        if (user.role === UserRole.REQUESTER) {
          // Always send back to the original rejector (no Dean mediation)
          const returnStatus = queryEngine.getReturnStatus(requestRecord);
          nextStatus = returnStatus || RequestStatus.MANAGER_REVIEW;
        } else if (user.role === UserRole.DEAN) {
          // Dean reviewing requester's query and re-approving (legacy support)
          const returnStatus = queryEngine.getReturnStatus(requestRecord);
          nextStatus = returnStatus || RequestStatus.MANAGER_REVIEW;
        } else {
          return NextResponse.json({ error: 'Invalid role for query response' }, { status: 400 });
        }

        actionType = ActionType.CLARIFY_AND_REAPPROVE;

        console.log('[DEBUG] Clarify and reapprove:', {
          currentStatus: requestRecord.status,
          targetStatus: nextStatus,
          userRole: user.role,
          queryResponse: notes
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

    // 🔹 Institution Manager stores SOP reference when forwarding to budget check
    if (effectiveRole === UserRole.INSTITUTION_MANAGER && action === 'forward' && sopReference) {
      requestRecord.sopReference = sopReference;
      await requestRecord.save();
    }

    console.log('[DEBUG] After switch statement:', {
      action,
      previousStatus,
      nextStatus,
      actionType,
      statusChanged: nextStatus !== previousStatus
    });

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

    // Store SOP reference in history (set by Institution Manager when forwarding)
    if (effectiveRole === UserRole.INSTITUTION_MANAGER && action === 'forward' && sopReference) {
      historyEntry.sopReference = sopReference;
    }

    // Store budget availability for accountant
    if (effectiveRole === UserRole.ACCOUNTANT && budgetAvailable !== undefined) {
      historyEntry.budgetAvailable = budgetAvailable;
      if (budgetData) {
        historyEntry.budgetAllocated = budgetData.allocated;
        historyEntry.budgetSpent = budgetData.spent;
        historyEntry.budgetBalance = budgetData.balance;
      }
    }

    // Store query target for Dean to department flow
    if (action === 'clarify' && effectiveRole === UserRole.DEAN && target) {
      historyEntry.queryTarget = target;
    }

    // Store query type for Institution Manager flow
    if (action === 'clarify' && effectiveRole === UserRole.INSTITUTION_MANAGER && target) {
      historyEntry.queryType = target;
    }

    // Store department response for Dean queries
    if (action === 'forward' && [UserRole.MMA, UserRole.HR, UserRole.AUDIT, UserRole.IT].includes(effectiveRole) &&
      requestRecord.status === RequestStatus.DEPARTMENT_CHECKS) {
      historyEntry.departmentResponse = effectiveRole;
    }

    // Handle query workflow fields
    if (action === 'reject_with_clarification' || action === 'dean_send_to_requester') {
      historyEntry.queryRequest = notes;
      historyEntry.requiresClarification = true;
      if (attachments?.length) historyEntry.attachments = attachments;

      // Store original rejector info for tracking
      if (action === 'reject_with_clarification') {
        historyEntry.originalRejector = user.id;
      }

      if (action === 'dean_send_to_requester') {
        // Legacy support for dean_send_to_requester action
      }
    }

    if (action === 'query_and_reapprove') {
      historyEntry.queryResponse = notes;
      if (attachments?.length) historyEntry.queryAttachments = attachments;
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
    if (action === 'reject_with_clarification' || action === 'dean_send_to_requester') {
      if (!updateData.$set) updateData.$set = {};
      updateData.$set.pendingQuery = true;

      if (action === 'reject_with_clarification') {
        // Use the targetRole if provided, otherwise fall back to default behavior
        updateData.$set.queryLevel = targetRole || queryEngine.getQueryTarget(requestRecord.status, effectiveRole)?.role;
      } else {
        // dean_send_to_requester
        updateData.$set.queryLevel = UserRole.REQUESTER;
      }
    }

    if (action === 'query_and_reapprove') {
      if (!updateData.$set) updateData.$set = {};

      if (user.role === UserRole.REQUESTER) {
        // Requester provided query - send back to original rejector
        const originalRejector = queryEngine.getOriginalRejector(requestRecord);
        if (originalRejector) {
          updateData.$set.queryLevel = originalRejector.role;
          updateData.$set.pendingQuery = true; // Now pending with original rejector
        } else {
          updateData.$set.pendingQuery = false;
          updateData.$set.queryLevel = null;
        }
      } else {
        // Dean or other reviewer approved after query - workflow complete
        updateData.$set.pendingQuery = false;
        updateData.$set.queryLevel = null;
      }
    }

    if (action === 'reject' && isPendingQueryForUser) {
      if (!updateData.$set) updateData.$set = {};
      updateData.$set.pendingQuery = false;
      updateData.$set.queryLevel = null;
    }

    // Save accountant budget availability to Request document
    if (effectiveRole === UserRole.ACCOUNTANT && action === 'approve' && typeof budgetAvailable === 'boolean') {
      if (!updateData.$set) updateData.$set = {};
      updateData.$set.budgetAvailable = budgetAvailable;
      if (budgetData) {
        updateData.$set.budgetAllocated = budgetData.allocated;
        updateData.$set.budgetSpent = budgetData.spent;
        updateData.$set.budgetBalance = budgetData.balance;
      }
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
      .populate('requester', 'name email empId role')
      .populate('history.actor', 'name email empId role');

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
