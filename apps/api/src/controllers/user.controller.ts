import { Request, Response } from 'express';
import { User } from '../models/User';
import { hashPassword } from '../utils/hash';
import { ApiError } from '../utils/ApiError';
import { AuditLog } from '../models/AuditLog';

export async function listUsers(_req: Request, res: Response): Promise<void> {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ status: 'success', data: users });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ status: 'success', data: user });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const { email, password, name, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already in use');

  const user = await User.create({
    email,
    password: await hashPassword(password),
    name,
    role,
  });

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'user.create',
    targetType: 'User',
    targetId: user.id,
    changes: { email, name, role },
  });

  res.status(201).json({ status: 'success', data: user });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const patch: Record<string, unknown> = { ...req.body };
  if (patch.password) {
    patch.password = await hashPassword(String(patch.password));
  }

  Object.assign(user, patch);
  await user.save();

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'user.update',
    targetType: 'User',
    targetId: user.id,
    changes: patch,
  });

  res.json({ status: 'success', data: user });
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  if (user.id === req.user!.id && req.body.role !== 'admin') {
    throw new ApiError(400, 'Cannot demote yourself');
  }

  user.role = req.body.role;
  await user.save();

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'user.role-change',
    targetType: 'User',
    targetId: user.id,
    changes: { role: req.body.role },
  });

  res.json({ status: 'success', data: user });
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  if (req.params.id === req.user!.id) {
    throw new ApiError(400, 'Cannot delete yourself');
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  await AuditLog.create({
    actorId: req.user!.id,
    action: 'user.delete',
    targetType: 'User',
    targetId: req.params.id,
  });

  res.json({ status: 'success', message: 'User deleted' });
}
