import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../utils/prisma';

export const handleIdempotency = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Only apply to mutating methods (POST, PUT, PATCH, DELETE)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = (
    req.headers['x-idempotency-key'] || req.headers['idempotency-key']
  ) as string | undefined;

  // If no idempotency key provided, proceed normally
  if (!idempotencyKey) {
    return next();
  }

  try {
    // Check if key already exists in database
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
    });

    if (existing) {
      // Check if expired
      if (new Date() > existing.expiresAt) {
        // Expired, delete and proceed as fresh
        await prisma.idempotencyKey.delete({ where: { key: idempotencyKey } });
      } else {
        // Cache HIT: Return previously computed response
        res.setHeader('X-Idempotency-Hit', 'true');
        const parsed = JSON.parse(existing.response);
        res.status(existing.statusCode).json(parsed);
        return;
      }
    }

    // Cache MISS: Intercept res.json to store the response
    const originalJson = res.json.bind(res);

    res.json = (body: unknown): Response => {
      // Restore original res.json first to avoid recursion
      res.json = originalJson;

      // Asynchronously store the response in idempotency_keys
      // 24 hour expiry
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Only cache successful or client error responses (2xx, 4xx), skip transient 5xx
      if (res.statusCode < 500) {
        prisma.idempotencyKey
          .upsert({
            where: { key: idempotencyKey },
            create: {
              key: idempotencyKey,
              response: JSON.stringify(body),
              statusCode: res.statusCode,
              expiresAt,
            },
            update: {
              response: JSON.stringify(body),
              statusCode: res.statusCode,
              expiresAt,
            },
          })
          .catch((err) => {
            console.error('Failed to save idempotency key:', err);
          });
      }

      return originalJson(body);
    };

    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    next();
  }
};
