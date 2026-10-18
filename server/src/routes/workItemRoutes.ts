import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getUserTeamRole } from '../middleware/rbac';
import {
  createWorkItem,
  updateWorkItemWithOptimisticLock,
  assignWorkItemAtomic,
  transitionWorkItemStatus,
  addWorkItemComment,
  ConflictError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../services/workItemService';
import {
  WORK_ITEM_STATUSES,
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_TYPES,
  WorkItemStatus,
  WorkItemPriority,
  WorkItemType,
} from '../utils/constants';

const router = Router();
router.use(authenticateToken);

// 1. GET /api/work-items - Paginated, filterable, searchable work item list
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const {
      teamId,
      status,
      priority,
      type,
      assigneeId,
      unassigned,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Get all team IDs the current user belongs to (multi-tenancy isolation)
    const userMemberships = await prisma.teamMember.findMany({
      where: { userId: req.user!.id },
      select: { teamId: true },
    });
    const allowedTeamIds = userMemberships.map((m) => m.teamId);

    if (allowedTeamIds.length === 0) {
      res.json({
        items: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
      return;
    }

    // Build Prisma where filter
    const where: any = {
      teamId: teamId ? (teamId as string) : { in: allowedTeamIds },
    };

    // If specific team requested, verify user has access
    if (teamId && !allowedTeamIds.includes(teamId as string)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view items in this team.',
      });
      return;
    }

    if (status && WORK_ITEM_STATUSES.includes(status as any)) {
      where.status = status;
    }

    if (priority && WORK_ITEM_PRIORITIES.includes(priority as any)) {
      where.priority = priority;
    }

    if (type && WORK_ITEM_TYPES.includes(type as any)) {
      where.type = type;
    }

    if (assigneeId) {
      where.assigneeId = assigneeId as string;
    } else if (unassigned === 'true') {
      where.assigneeId = null;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.workItem.count({ where }),
      prisma.workItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          team: { select: { id: true, name: true } },
          _count: { select: { activities: true } },
        },
      }),
    ]);

    res.json({
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List work items error:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to list work items.' });
  }
});

// 2. POST /api/work-items - Create work item
const createWorkItemSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  teamId: z.string().uuid(),
  priority: z.enum(WORK_ITEM_PRIORITIES).default('medium'),
  type: z.enum(WORK_ITEM_TYPES).default('task'),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createWorkItemSchema.parse(req.body);

    // Verify user belongs to the team
    const role = await getUserTeamRole(req.user!.id, data.teamId);
    if (!role) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You cannot create work items in a team you are not a member of.',
      });
      return;
    }

    // Role check: Only manager or admin can create an item directly as 'critical'
    if (data.priority === 'critical' && !['manager', 'admin'].includes(role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only managers or admins can create critical priority work items.',
      });
      return;
    }

    const item = await createWorkItem({
      title: data.title,
      description: data.description,
      priority: data.priority,
      type: data.type,
      teamId: data.teamId,
      creatorId: req.user!.id,
      assigneeId: data.assigneeId,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    });

    res.status(201).json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'ValidationError', details: error.errors });
      return;
    }
    console.error('Create work item error:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to create work item.' });
  }
});

// 3. GET /api/work-items/:id - Get single work item + activity history
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await prisma.workItem.findUnique({
      where: { id: req.params.id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true } },
        activities: {
          include: {
            actor: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!item) {
      res.status(404).json({ error: 'NotFound', message: 'Work item not found.' });
      return;
    }

    // Authorization: User must belong to the item's team
    const role = await getUserTeamRole(req.user!.id, item.teamId);
    if (!role) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to view this work item.',
      });
      return;
    }

    res.json({ item, userRoleInTeam: role });
  } catch (error) {
    console.error('Get work item error:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch work item.' });
  }
});

// 4. PATCH /api/work-items/:id - Update with Optimistic Locking
const updateWorkItemSchema = z.object({
  version: z.number().int().positive({ message: 'Current version number is required for optimistic locking.' }),
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  priority: z.enum(WORK_ITEM_PRIORITIES).optional(),
  type: z.enum(WORK_ITEM_TYPES).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = updateWorkItemSchema.parse(req.body);

    const existing = await prisma.workItem.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'NotFound', message: 'Work item not found.' });
      return;
    }

    const role = await getUserTeamRole(req.user!.id, existing.teamId);
    if (!role) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
      return;
    }

    // Role check: Only manager or admin can set priority to 'critical'
    if (data.priority === 'critical' && existing.priority !== 'critical' && !['manager', 'admin'].includes(role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only managers or admins can escalate work items to critical priority.',
      });
      return;
    }

    const updated = await updateWorkItemWithOptimisticLock({
      id: req.params.id,
      expectedVersion: data.version,
      actorId: req.user!.id,
      updates: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        type: data.type,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
      },
    });

    res.json({ item: updated });
  } catch (error: any) {
    if (error instanceof ConflictError) {
      res.status(409).json({
        error: 'Conflict',
        message: error.message,
        currentData: error.currentData,
      });
      return;
    }
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'ValidationError', details: error.errors });
      return;
    }
    console.error('Update work item error:', error);
    res.status(error.statusCode || 500).json({
      error: error.name || 'InternalServerError',
      message: error.message || 'Failed to update work item.',
    });
  }
});

// 5. POST /api/work-items/:id/claim - Atomic Self-Claim
const claimSchema = z.object({
  version: z.number().int().positive(),
});

router.post('/:id/claim', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { version } = claimSchema.parse(req.body);

    const existing = await prisma.workItem.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'NotFound', message: 'Work item not found.' });
      return;
    }

    const role = await getUserTeamRole(req.user!.id, existing.teamId);
    if (!role) {
      res.status(403).json({ error: 'Forbidden', message: 'You must belong to this team to claim items.' });
      return;
    }

    const updated = await assignWorkItemAtomic({
      id: req.params.id,
      expectedVersion: version,
      actorId: req.user!.id,
      assigneeId: req.user!.id,
      isSelfClaim: true,
    });

    res.json({ item: updated });
  } catch (error: any) {
    if (error instanceof ConflictError) {
      res.status(409).json({
        error: 'Conflict',
        message: error.message,
        currentData: error.currentData,
      });
      return;
    }
    res.status(error.statusCode || 500).json({
      error: error.name || 'InternalServerError',
      message: error.message || 'Failed to claim work item.',
    });
  }
});

// 6. POST /api/work-items/:id/assign - Assign to Team Member (Manager/Admin)
const assignSchema = z.object({
  version: z.number().int().positive(),
  assigneeId: z.string().uuid().nullable(),
});

router.post('/:id/assign', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { version, assigneeId } = assignSchema.parse(req.body);

    const existing = await prisma.workItem.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'NotFound', message: 'Work item not found.' });
      return;
    }

    const role = await getUserTeamRole(req.user!.id, existing.teamId);
    if (!role || !['manager', 'admin'].includes(role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only team managers or admins can assign work items to others.',
      });
      return;
    }

    const updated = await assignWorkItemAtomic({
      id: req.params.id,
      expectedVersion: version,
      actorId: req.user!.id,
      assigneeId,
      isSelfClaim: false,
    });

    res.json({ item: updated });
  } catch (error: any) {
    if (error instanceof ConflictError) {
      res.status(409).json({
        error: 'Conflict',
        message: error.message,
        currentData: error.currentData,
      });
      return;
    }
    res.status(error.statusCode || 500).json({
      error: error.name || 'InternalServerError',
      message: error.message || 'Failed to assign work item.',
    });
  }
});

// 7. POST /api/work-items/:id/transition - Workflow State Machine
const transitionSchema = z.object({
  version: z.number().int().positive(),
  toStatus: z.enum(WORK_ITEM_STATUSES),
  comment: z.string().optional(),
});

router.post('/:id/transition', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { version, toStatus, comment } = transitionSchema.parse(req.body);

    const existing = await prisma.workItem.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'NotFound', message: 'Work item not found.' });
      return;
    }

    const role = await getUserTeamRole(req.user!.id, existing.teamId);
    if (!role) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
      return;
    }

    const updated = await transitionWorkItemStatus({
      id: req.params.id,
      toStatus: toStatus as WorkItemStatus,
      expectedVersion: version,
      actorId: req.user!.id,
      comment,
      actorRoleInTeam: role,
    });

    res.json({ item: updated });
  } catch (error: any) {
    if (error instanceof ConflictError) {
      res.status(409).json({
        error: 'Conflict',
        message: error.message,
        currentData: error.currentData,
      });
      return;
    }
    if (error instanceof ValidationError) {
      res.status(400).json({ error: 'ValidationError', message: error.message });
      return;
    }
    res.status(error.statusCode || 500).json({
      error: error.name || 'InternalServerError',
      message: error.message || 'Failed to transition work item.',
    });
  }
});

// 8. POST /api/work-items/:id/comments - Add Comment
const commentSchema = z.object({
  comment: z.string().min(1).max(2000),
});

router.post('/:id/comments', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { comment } = commentSchema.parse(req.body);

    const existing = await prisma.workItem.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'NotFound', message: 'Work item not found.' });
      return;
    }

    const role = await getUserTeamRole(req.user!.id, existing.teamId);
    if (!role) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied.' });
      return;
    }

    const activity = await addWorkItemComment({
      workItemId: req.params.id,
      actorId: req.user!.id,
      comment,
    });

    res.status(201).json({ activity });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'ValidationError', details: error.errors });
      return;
    }
    res.status(error.statusCode || 500).json({
      error: error.name || 'InternalServerError',
      message: error.message || 'Failed to add comment.',
    });
  }
});

export default router;
