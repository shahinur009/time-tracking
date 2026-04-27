import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import type { UserRole } from '../models/User';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, 'Unauthenticated'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden — insufficient role'));
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');
