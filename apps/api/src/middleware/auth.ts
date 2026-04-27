import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { User } from '../models/User';
import type { UserRole } from '../models/User';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        email: string;
      };
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApiError(401, 'Missing or invalid Authorization header');
    }

    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new ApiError(401, 'User not found or inactive');
    }

    req.user = { id: user.id, role: user.role, email: user.email };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, 'Invalid or expired token'));
  }
}
