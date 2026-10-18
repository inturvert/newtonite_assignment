import { prisma } from '../utils/prisma';
import {
  WorkItemStatus,
  WorkItemPriority,
  WorkItemType,
  ALLOWED_TRANSITIONS,
} from '../utils/constants';

export class ConflictError extends Error {
  statusCode = 409;
  currentData: unknown;

  constructor(message: string, currentData?: unknown) {
    super(message);
    this.name = 'ConflictError';
    this.currentData = currentData;
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

// 1. Create a Work Item
export async function createWorkItem(params: {
  title: string;
  description?: string;
  priority?: WorkItemPriority;
  type?: WorkItemType;
  teamId: string;
  creatorId: string;
  assigneeId?: string;
  dueDate?: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.workItem.create({
      data: {
        title: params.title,
        description: params.description,
        priority: params.priority || 'medium',
        type: params.type || 'task',
        teamId: params.teamId,
        creatorId: params.creatorId,
        assigneeId: params.assigneeId,
        dueDate: params.dueDate,
        version: 1,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    // Create initial activity log entry
    await tx.activityLog.create({
      data: {
        workItemId: item.id,
        actorId: params.creatorId,
        action: 'created',
        newValue: item.title,
      },
    });

    if (item.assigneeId) {
      await tx.activityLog.create({
        data: {
          workItemId: item.id,
          actorId: params.creatorId,
          action: 'assigned',
          newValue: item.assignee?.name || item.assigneeId,
        },
      });
    }

    return item;
  });
}

// 2. Update Work Item with Optimistic Locking
export async function updateWorkItemWithOptimisticLock(params: {
  id: string;
  expectedVersion: number;
  actorId: string;
  updates: {
    title?: string;
    description?: string;
    priority?: WorkItemPriority;
    type?: WorkItemType;
    dueDate?: Date | null;
  };
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.workItem.findUnique({
      where: { id: params.id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError(`Work item ${params.id} not found.`);
    }

    // CRITICAL BEHAVIOR: Detect concurrent modification via version mismatch
    if (existing.version !== params.expectedVersion) {
      throw new ConflictError(
        `Version conflict: This work item has been modified by another user (server version: ${existing.version}, your version: ${params.expectedVersion}). Please refresh to see the latest changes.`,
        existing
      );
    }

    // Record activity logs for each changed field
    const logsToCreate: { action: string; oldValue?: string; newValue?: string }[] = [];

    if (params.updates.title && params.updates.title !== existing.title) {
      logsToCreate.push({
        action: 'edited',
        oldValue: existing.title,
        newValue: params.updates.title,
      });
    }

    if (params.updates.priority && params.updates.priority !== existing.priority) {
      logsToCreate.push({
        action: 'priority_changed',
        oldValue: existing.priority,
        newValue: params.updates.priority,
      });
    }

    if (params.updates.type && params.updates.type !== existing.type) {
      logsToCreate.push({
        action: 'type_changed',
        oldValue: existing.type,
        newValue: params.updates.type,
      });
    }

    if (params.updates.dueDate !== undefined) {
      const oldDue = existing.dueDate?.toISOString() || 'None';
      const newDue = params.updates.dueDate ? params.updates.dueDate.toISOString() : 'None';
      if (oldDue !== newDue) {
        logsToCreate.push({
          action: 'due_date_changed',
          oldValue: oldDue,
          newValue: newDue,
        });
      }
    }

    // Perform atomic update: update fields AND increment version by 1
    const updated = await tx.workItem.update({
      where: {
        id: params.id,
        version: params.expectedVersion, // Double check version constraint
      },
      data: {
        ...params.updates,
        version: { increment: 1 },
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    for (const log of logsToCreate) {
      await tx.activityLog.create({
        data: {
          workItemId: updated.id,
          actorId: params.actorId,
          action: log.action,
          oldValue: log.oldValue,
          newValue: log.newValue,
        },
      });
    }

    return updated;
  });
}

// 3. Atomic Assignment (Claiming / Reassigning)
export async function assignWorkItemAtomic(params: {
  id: string;
  expectedVersion: number;
  actorId: string;
  assigneeId: string | null; // null to unassign
  isSelfClaim?: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.workItem.findUnique({
      where: { id: params.id },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError(`Work item ${params.id} not found.`);
    }

    // Check version
    if (existing.version !== params.expectedVersion) {
      throw new ConflictError(
        `Assignment conflict: Item has been modified by another user. Current version: ${existing.version}.`,
        existing
      );
    }

    // If it's a self-claim, verify item is not already assigned to someone else
    if (params.isSelfClaim && existing.assigneeId) {
      throw new ConflictError(
        `Race condition prevented: This item was already claimed by ${existing.assignee?.name || existing.assigneeId}.`,
        existing
      );
    }

    let newAssigneeName: string | null = null;
    if (params.assigneeId) {
      const targetUser = await tx.user.findUnique({ where: { id: params.assigneeId } });
      if (!targetUser) throw new NotFoundError('Target user not found.');
      newAssigneeName = targetUser.name;
    }

    const updated = await tx.workItem.update({
      where: {
        id: params.id,
        version: params.expectedVersion,
      },
      data: {
        assigneeId: params.assigneeId,
        version: { increment: 1 },
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    // Write audit log
    await tx.activityLog.create({
      data: {
        workItemId: updated.id,
        actorId: params.actorId,
        action: params.assigneeId ? 'assigned' : 'unassigned',
        oldValue: existing.assignee?.name || 'Unassigned',
        newValue: newAssigneeName || 'Unassigned',
      },
    });

    return updated;
  });
}

// 4. Workflow State Transition with Validation
export async function transitionWorkItemStatus(params: {
  id: string;
  toStatus: WorkItemStatus;
  expectedVersion: number;
  actorId: string;
  comment?: string;
  actorRoleInTeam: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.workItem.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      throw new NotFoundError(`Work item ${params.id} not found.`);
    }

    // Check version
    if (existing.version !== params.expectedVersion) {
      throw new ConflictError(
        `Transition conflict: Item was modified by another user. Current version: ${existing.version}.`,
        existing
      );
    }

    const currentStatus = existing.status as WorkItemStatus;
    if (currentStatus === params.toStatus) {
      return existing; // No-op
    }

    // Enforce workflow graph rules
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(params.toStatus)) {
      throw new ValidationError(
        `Invalid status transition from '${currentStatus}' to '${params.toStatus}'. Allowed transitions from '${currentStatus}' are: [${allowedNext.join(', ')}].`
      );
    }

    // Role check: Only managers or admins can reopen a closed item
    if (currentStatus === 'closed' && params.toStatus === 'open') {
      if (!['manager', 'admin'].includes(params.actorRoleInTeam)) {
        throw new ForbiddenError('Only team managers or admins can reopen closed work items.');
      }
    }

    // Update status and increment version
    const updated = await tx.workItem.update({
      where: {
        id: params.id,
        version: params.expectedVersion,
      },
      data: {
        status: params.toStatus,
        version: { increment: 1 },
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
      },
    });

    // Log the transition
    await tx.activityLog.create({
      data: {
        workItemId: updated.id,
        actorId: params.actorId,
        action: 'status_changed',
        oldValue: currentStatus,
        newValue: params.toStatus,
        comment: params.comment,
      },
    });

    return updated;
  });
}

// 5. Add Comment to Work Item (Audit Log)
export async function addWorkItemComment(params: {
  workItemId: string;
  actorId: string;
  comment: string;
}) {
  if (!params.comment.trim()) {
    throw new ValidationError('Comment cannot be empty.');
  }

  const item = await prisma.workItem.findUnique({
    where: { id: params.workItemId },
  });

  if (!item) {
    throw new NotFoundError(`Work item ${params.workItemId} not found.`);
  }

  return prisma.activityLog.create({
    data: {
      workItemId: params.workItemId,
      actorId: params.actorId,
      action: 'commented',
      comment: params.comment.trim(),
    },
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });
}
