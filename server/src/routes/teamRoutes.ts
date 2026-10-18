import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireTeamMembership, requireTeamRole, getUserTeamRole } from '../middleware/rbac';

const router = Router();

// Apply auth to all team routes
router.use(authenticateToken);

// 1. GET /api/teams - List all teams current user belongs to (or all if admin)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: { userId: req.user!.id },
        },
      },
      include: {
        members: {
          where: { userId: req.user!.id },
          select: { role: true },
        },
        _count: {
          select: {
            members: true,
            workItems: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      myRole: t.members[0]?.role || 'member',
      memberCount: t._count.members,
      workItemCount: t._count.workItems,
    }));

    res.json({ teams: formatted });
  } catch (error) {
    console.error('List teams error:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to list teams.' });
  }
});

// 2. GET /api/teams/:teamId - Get single team details
router.get(
  '/:teamId',
  requireTeamMembership('params', 'teamId'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const team = await prisma.team.findUnique({
        where: { id: req.params.teamId },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (!team) {
        res.status(404).json({ error: 'NotFound', message: 'Team not found.' });
        return;
      }

      res.json({ team });
    } catch (error) {
      console.error('Get team error:', error);
      res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch team.' });
    }
  }
);

// 3. POST /api/teams - Create a new team (creator automatically becomes admin)
const createTeamSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = createTeamSchema.parse(req.body);

    const existing = await prisma.team.findUnique({ where: { name } });
    if (existing) {
      res.status(409).json({ error: 'Conflict', message: 'A team with this name already exists.' });
      return;
    }

    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: { name, description },
      });

      // Creator is team admin
      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: req.user!.id,
          role: 'admin',
        },
      });

      return newTeam;
    });

    res.status(201).json({ team });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'ValidationError', details: error.errors });
      return;
    }
    console.error('Create team error:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to create team.' });
  }
});

// 4. POST /api/teams/:teamId/members - Add member to team (requires manager or admin)
const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'member']).default('member'),
});

router.post(
  '/:teamId/members',
  requireTeamRole(['admin', 'manager'], 'params', 'teamId'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, role } = addMemberSchema.parse(req.body);
      const teamId = req.params.teamId;

      const targetUser = await prisma.user.findUnique({ where: { email } });
      if (!targetUser) {
        res.status(404).json({ error: 'NotFound', message: `User with email '${email}' not found.` });
        return;
      }

      const existingMember = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: targetUser.id, teamId } },
      });

      if (existingMember) {
        res.status(409).json({ error: 'Conflict', message: 'User is already a member of this team.' });
        return;
      }

      const member = await prisma.teamMember.create({
        data: {
          teamId,
          userId: targetUser.id,
          role,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      res.status(201).json({ member });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'ValidationError', details: error.errors });
        return;
      }
      console.error('Add member error:', error);
      res.status(500).json({ error: 'InternalServerError', message: 'Failed to add team member.' });
    }
  }
);

export default router;
