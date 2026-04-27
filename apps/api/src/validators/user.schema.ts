import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(128),
  role: z.enum(['admin', 'member']).default('member'),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(8).max(128).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});
