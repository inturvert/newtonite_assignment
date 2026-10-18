import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'newtonite-dev-secret-change-in-production-abc123xyz';

export interface UserPayload {
  id: string;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    res.status(401).json({
      error: 'AuthenticationRequired',
      message: 'Access token missing or invalid.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      error: 'InvalidToken',
      message: 'Access token has expired or is invalid.',
    });
    return;
  }
};
