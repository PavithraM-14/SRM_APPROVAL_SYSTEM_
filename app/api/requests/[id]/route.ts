import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Request from '../../../../models/Request';
import { getCurrentUser } from '../../../../lib/auth';
import { UserRole } from '../../../../lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestRecord = await Request.findById(params.id)
      .populate('requester', 'name email empId _id role')
      .populate('history.actor', 'name email empId role');

    if (!requestRecord) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Allowed roles to view request
    const allowedRoles = [
      UserRole.REQUESTER,
      UserRole.INSTITUTION_MANAGER,
      UserRole.ACCOUNTANT,
      UserRole.VP,
      UserRole.HEAD_OF_INSTITUTION,
      UserRole.DEAN,
      UserRole.MMA,
      UserRole.HR,
      UserRole.AUDIT,
      UserRole.IT,
      UserRole.CHIEF_DIRECTOR,
      UserRole.CHAIRMAN
    ];

    const canViewByRole = allowedRoles.includes(user.role);
    const isOwnRequest = requestRecord.requester._id.toString() === user.id;

    if (!canViewByRole && !isOwnRequest) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Institutional isolation check
    const institutionalRoles = [
      UserRole.REQUESTER,
      UserRole.INSTITUTION_MANAGER,
      UserRole.ACCOUNTANT,
      UserRole.VP,
      UserRole.HEAD_OF_INSTITUTION
    ];

    if (institutionalRoles.includes(user.role)) {
      // If it's an institutional role, they can only see requests from their college
      if (user.college && requestRecord.college && user.college !== requestRecord.college) {
        // Special case: Requester can see their own requests even if college mismatch 
        // (though college should theoretically match)
        if (!(user.role === UserRole.REQUESTER && isOwnRequest)) {
          return NextResponse.json({
            error: `Access Denied: This request belongs to ${requestRecord.college}, but you are assigned to ${user.college}.`
          }, { status: 403 });
        }
      }
    }

    return NextResponse.json(requestRecord);
  } catch (error) {
    console.error('Get request error:', error);
    return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // --------------------------------------------
    // ✅ Only accountants can update budget fields
    // --------------------------------------------
    if (user.role === UserRole.ACCOUNTANT) {
      const updateFields: any = {};

      if (typeof body.budgetAllocated === "number") {
        updateFields.budgetAllocated = body.budgetAllocated;
      }

      if (typeof body.budgetSpent === "number") {
        updateFields.budgetSpent = body.budgetSpent;
      }

      // Auto-calc balance
      if (updateFields.budgetAllocated !== undefined || updateFields.budgetSpent !== undefined) {
        const allocated = updateFields.budgetAllocated ?? body.budgetAllocated;
        const spent = updateFields.budgetSpent ?? body.budgetSpent;
        updateFields.budgetBalance = allocated - spent;
      }

      const updatedRequest = await Request.findByIdAndUpdate(
        params.id,
        { $set: updateFields },
        { new: true }
      ).populate('requester', 'name email');

      if (!updatedRequest) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      return NextResponse.json(updatedRequest);
    }

    // -------------------------------------------------
    // ❗ All other roles can update ONLY non-budget data
    // -------------------------------------------------
    const disallowedKeys = ["budgetAllocated", "budgetSpent", "budgetBalance"];
    disallowedKeys.forEach((key) => delete body[key]);

    const updatedRequest = await Request.findByIdAndUpdate(
      params.id,
      { ...body },
      { new: true }
    ).populate('requester', 'name email');

    if (!updatedRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json(updatedRequest);

  } catch (error) {
    console.error('Update request error:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deletedRequest = await Request.findByIdAndDelete(params.id);

    if (!deletedRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Delete request error:', error);
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 });
  }
}
