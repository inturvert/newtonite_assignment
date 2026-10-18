import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'newtonite-dev-secret-change-in-production-abc123xyz';

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Conflict', message: 'User with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'ValidationError', details: error.errors });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to register user.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        teamMemberships: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({ error: 'InvalidCredentials', message: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'InvalidCredentials', message: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        teams: user.teamMemberships.map((tm) => ({
          teamId: tm.teamId,
          teamName: tm.team.name,
          role: tm.role,
        })),
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'ValidationError', details: error.errors });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        teamMemberships: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'NotFound', message: 'User not found.' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        teams: user.teamMemberships.map((tm) => ({
          teamId: tm.teamId,
          teamName: tm.team.name,
          role: tm.role,
        })),
      },
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to retrieve profile.' });
  }
});

export default router;
