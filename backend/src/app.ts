import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { AppConfig } from './config/env.js';
import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.js';

export function createApp(config: Pick<AppConfig, 'frontendOrigin'>): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (origin === undefined) {
          callback(null, false);
          return;
        }
        if (origin === config.frontendOrigin) {
          callback(null, true);
          return;
        }
        callback(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'This request origin is not allowed.'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Idempotency-Key', 'X-CSRF-Token'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '1mb', strict: true }));

  // Keep the existing liveness route and response contract intact.
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use((_request, _response, next) => {
    next(new AppError(404, 'NOT_FOUND', 'The requested resource was not found.'));
  });
  app.use(errorHandler);

  return app;
}
