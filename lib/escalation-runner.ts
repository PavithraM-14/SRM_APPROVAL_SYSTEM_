import connectDB from './mongodb';
import Request from '../models/Request';
import User from '../models/User';
import { ActionType, RequestStatus, UserRole } from './types';
import {
  ESCALATABLE_STATUSES,
  STATUS_TO_ROLE,
  getEscalationReferenceTime,
} from './escalation-hierarchy';
import { sendEscalationReminderEmail } from './email';

const REMINDER_THRESHOLD_MS = 8 * 60 * 60 * 1000;
const FLAGGING_THRESHOLD_MS = 10 * 60 * 60 * 1000;

const INSTITUTIONAL_ROLES = new Set<UserRole>([
  UserRole.INSTITUTION_MANAGER,
  UserRole.VP_RESEARCH,
  UserRole.VP_ACADEMIC,
  UserRole.VP_ADMIN,
  UserRole.RESEARCH_DIRECTOR,
  UserRole.HEAD_OF_INSTITUTION,
  UserRole.DEAN,
]);

export interface EscalationRunResult {
  processed: number;
  reminded: number;
  flagged: number;
  errors: string[];
}

export async function runEscalation(): Promise<EscalationRunResult> {
  await connectDB();

  let processed = 0;
  let reminded = 0;
  let flagged = 0;
  const errors: string[] = [];

  const requests = await Request.find({
    status: { $in: ESCALATABLE_STATUSES },
  }).lean();

  processed = requests.length;

  for (const req of requests) {
    try {
      const referenceTime = getEscalationReferenceTime(req);
      if (!referenceTime) continue;

      const elapsedMs = Date.now() - referenceTime.getTime();
      const elapsedHours = Math.floor(elapsedMs / (60 * 60 * 1000));
      const stalledRole = STATUS_TO_ROLE[req.status as RequestStatus];

      // Reminder at 8h
      if (elapsedMs >= REMINDER_THRESHOLD_MS && !req.escalation?.reminderSent) {
        try {
          const userQuery: Record<string, unknown> = { role: stalledRole };
          if (INSTITUTIONAL_ROLES.has(stalledRole)) userQuery.college = req.college;
          const approver = await User.findOne(userQuery).lean() as { email: string; name: string } | null;

          if (!approver) {
            console.warn(`[escalation] No user for role=${stalledRole} college=${req.college} req=${req.requestId}`);
          } else {
            const emailSent = await sendEscalationReminderEmail(
              approver.email, approver.name, req.title, req.requestId, elapsedHours, stalledRole
            );
            if (emailSent) {
              await Request.updateOne(
                { _id: req._id },
                { $set: { 'escalation.reminderSent': true, 'escalation.reminderSentAt': new Date() } }
              );
              reminded++;
            } else {
              errors.push(`Reminder email failed for requestId=${req.requestId}`);
            }
          }
        } catch (err) {
          errors.push(`Reminder error for ${req.requestId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Flag at 10h
      if (elapsedMs >= FLAGGING_THRESHOLD_MS && !req.escalation?.flagged) {
        try {
          await Request.updateOne(
            { _id: req._id },
            {
              $set: {
                'escalation.flagged': true,
                'escalation.flaggedAt': new Date(),
                'escalation.stalledRole': stalledRole,
              },
              $push: {
                history: {
                  action: ActionType.ESCALATION_FLAGGED,
                  actor: null,
                  notes: 'Auto-flagged due to timeout',
                  previousStatus: req.status,
                  newStatus: req.status,
                  timestamp: new Date(),
                },
              },
            }
          );
          flagged++;
        } catch (err) {
          errors.push(`Flagging error for ${req.requestId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      errors.push(`Error processing ${req.requestId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { processed, reminded, flagged, errors };
}
