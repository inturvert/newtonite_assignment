import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// 1. GET /api/dashboard/stats - Overview metrics for user's teams
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userMemberships = await prisma.teamMember.findMany({
      where: { userId: req.user!.id },
      select: { teamId: true },
    });
    const allowedTeamIds = userMemberships.map((m) => m.teamId);

    if (allowedTeamIds.length === 0) {
      res.json({
        total: 0,
        byStatus: {},
        byPriority: {},
        myAssignedCount: 0,
        attentionCount: 0,
      });
      return;
    }

    const now = new Date();

    const [
      total,
      openCount,
      inProgressCount,
      underReviewCount,
      resolvedCount,
      closedCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      myAssignedCount,
      overdueCount,
      unassignedHighOrCriticalCount,
    ] = await Promise.all([
      prisma.workItem.count({ where: { teamId: { in: allowedTeamIds } } }),
      prisma.workItem.count({ where: { teamId: { in: allowedTeamIds }, status: 'open' } }),
      prisma.workItem.count({ where: { teamId: { in: allowedTeamIds }, status: 'in_progress' } }),
      prisma.workItem.count({ where: { teamId: { in: allowedTeamIds }, status: 'under_review' } }),
      prisma.workItem.count({ where: { teamId: { in: allowedTeamIds }, status: 'resolved' } }),
      prisma.workItem.count({ where: { teamId: { in: allowedTeamIds }, status: 'closed' } }),

      prisma.workItem.count({ where: { teamId: { in: allowedTeamIds }, priority: 'critical', status: { not: 'closed' } } }),
      prisma.workItem.count({ where: { teamId: { in: allowedTeamIds }, priority: 'high', status: { not: 'closed' } } }),
      prisma.workItem.count({ where: { teamId: { in: allowedTeamIds }, priority: 'medium', status: { not: 'closed' } } }),
      prisma.workItem.count({ where: { teamId: { in: allowedTeamIds }, priority: 'low', status: { not: 'closed' } } }),

      prisma.workItem.count({ where: { assigneeId: req.user!.id, status: { not: 'closed' } } }),
      prisma.workItem.count({
        where: {
          teamId: { in: allowedTeamIds },
          dueDate: { lt: now },
          status: { notIn: ['resolved', 'closed'] },
        },
      }),
      prisma.workItem.count({
        where: {
          teamId: { in: allowedTeamIds },
          assigneeId: null,
          priority: { in: ['critical', 'high'] },
          status: { not: 'closed' },
        },
      }),
    ]);

    res.json({
      total,
      byStatus: {
        open: openCount,
        in_progress: inProgressCount,
        under_review: underReviewCount,
        resolved: resolvedCount,
        closed: closedCount,
      },
      byPriority: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      myAssignedCount,
      overdueCount,
      attentionCount: overdueCount + unassignedHighOrCriticalCount,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch dashboard stats.' });
  }
});

// 2. GET /api/dashboard/attention - Urgent work items requiring immediate action
router.get('/attention', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userMemberships = await prisma.teamMember.findMany({
      where: { userId: req.user!.id },
      select: { teamId: true },
    });
    const allowedTeamIds = userMemberships.map((m) => m.teamId);

    const now = new Date();

    const items = await prisma.workItem.findMany({
      where: {
        teamId: { in: allowedTeamIds },
        status: { notIn: ['resolved', 'closed'] },
        OR: [
          { dueDate: { lt: now } }, // Overdue
          { priority: 'critical' }, // Critical severity
          { priority: 'high', assigneeId: null }, // Unowned high priority
        ],
      },
      include: {
        team: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: [
        { priority: 'asc' }, // critical/high first
        { dueDate: 'asc' },
      ],
      take: 20,
    });

    res.json({ items });
  } catch (error) {
    console.error('Attention items error:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch attention items.' });
  }
});

// 3. GET /api/dashboard/my-work - Items assigned to current logged in user
router.get('/my-work', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await prisma.workItem.findMany({
      where: {
        assigneeId: req.user!.id,
        status: { notIn: ['closed'] },
      },
      include: {
        team: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: [
        { priority: 'asc' },
        { dueDate: 'asc' },
        { updatedAt: 'desc' },
      ],
    });

    res.json({ items });
  } catch (error) {
    console.error('My work error:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch your work items.' });
  }
});

export default router;
