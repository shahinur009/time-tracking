import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { isProd } from '../config/env';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const status = err instanceof ApiError ? err.status : 500;
  const payload: Record<string, unknown> = {
    status: 'error',
    message: err.message || 'Internal Server Error',
  };

  if (err instanceof ApiError && err.details) {
    payload.details = err.details;
  }

  if (!isProd && status === 500) {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
}
