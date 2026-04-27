import { Request, Response } from 'express';
import { User } from '../models/User';
import type { UserRole } from '../models/User';
import { hashPassword, comparePassword } from '../utils/hash';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { ApiError } from '../utils/ApiError';

function issueTokens(user: { id: string; role: string }) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role });
  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'Email already registered');
  }

  const userCount = await User.estimatedDocumentCount();
  const role: UserRole = userCount === 0 ? 'admin' : 'member';

  const hashed = await hashPassword(password);
  const user = await User.create({
    email,
    password: hashed,
    name,
    role,
  });

  const tokens = issueTokens({ id: user.id, role: user.role });

  res.status(201).json({
    status: 'success',
    data: {
      user: user.toJSON(),
      ...tokens,
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.password) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const ok = await comparePassword(password, user.password);
  if (!ok) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.status !== 'active') {
    throw new ApiError(403, 'Account is inactive');
  }

  user.lastActiveAt = new Date();
  await user.save();

  const tokens = issueTokens({ id: user.id, role: user.role });

  res.json({
    status: 'success',
    data: {
      user: user.toJSON(),
      ...tokens,
    },
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);
    if (!user || user.status !== 'active') {
      throw new ApiError(401, 'User not found or inactive');
    }
    const tokens = issueTokens({ id: user.id, role: user.role });
    res.json({ status: 'success', data: tokens });
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ status: 'success', data: user.toJSON() });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.json({ status: 'success', message: 'Logged out' });
}
