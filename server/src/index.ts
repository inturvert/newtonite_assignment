import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import teamRoutes from './routes/teamRoutes';
import workItemRoutes from './routes/workItemRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import { handleIdempotency } from './middleware/idempotency';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 3001;

// Global Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Idempotency Middleware for all mutating requests
app.use(handleIdempotency);

// Friendly Root Route (API information & Frontend redirect)
app.get('/', (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Newtonite API Server</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center; }
          .card { max-width: 500px; margin: 40px auto; background: #1e293b; padding: 30px; border-radius: 16px; border: 1px solid #334155; }
          a { display: inline-block; margin-top: 15px; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
          a:hover { background: #4f46e5; }
          code { background: #0f172a; padding: 3px 8px; border-radius: 4px; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>🚀 Newtonite API Server is Running!</h2>
          <p>This port (<code>3001</code>) serves the backend JSON API.</p>
          <p>To view and use the visual application, open the frontend:</p>
          <a href="http://localhost:5174">👉 Open Newtonite Frontend (http://localhost:5174)</a>
        </div>
      </body>
    </html>
  `);
});

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Newtonite Operational Coordination Engine',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/work-items', workItemRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred.',
  });
});

// Start listening if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Newtonite Server running on http://localhost:${PORT}`);
  });
}
