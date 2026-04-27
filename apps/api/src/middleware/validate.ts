import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ApiError(400, 'Validation failed', parsed.error.flatten()));
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(new ApiError(400, 'Validation failed', parsed.error.flatten()));
    }
    (req as Request & { validatedQuery: T }).validatedQuery = parsed.data;
    next();
  };
}
