import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../utils/prisma';
import { TeamRole } from '../utils/constants';

// Helper to get user's role in a team
export async function getUserTeamRole(
  userId: string,
  teamId: string
): Promise<TeamRole | null> {
  const member = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: { userId, teamId },
    },
  });
  return (member?.role as TeamRole) || null;
}

// Middleware: ensure user belongs to the specified team
export const requireTeamMembership = (teamIdSource: 'body' | 'params' | 'query' = 'params', key: string = 'teamId') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const teamId = req[teamIdSource][key];
    if (!teamId) {
      res.status(400).json({ error: 'BadRequest', message: `Missing required team identifier: ${key}` });
      return;
    }

    const role = await getUserTeamRole(req.user.id, teamId);
    if (!role) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You are not a member of this team and cannot access its resources.',
      });
      return;
    }

    next();
  };
};

// Middleware: ensure user has at least one of the required roles in the team
export const requireTeamRole = (
  allowedRoles: TeamRole[],
  teamIdSource: 'body' | 'params' | 'query' = 'params',
  key: string = 'teamId'
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const teamId = req[teamIdSource][key];
    if (!teamId) {
      res.status(400).json({ error: 'BadRequest', message: `Missing required team identifier: ${key}` });
      return;
    }

    const role = await getUserTeamRole(req.user.id, teamId);
    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Action requires one of the following roles: [${allowedRoles.join(', ')}]. Your role is: ${role || 'none'}.`,
      });
      return;
    }

    next();
  };
};
