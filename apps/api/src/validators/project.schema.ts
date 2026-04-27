import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  color: z.string().regex(/^#([A-Fa-f0-9]{6})$/).optional(),
  description: z.string().max(500).optional(),
  members: z.array(z.string()).optional(),
  clientId: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  archived: z.boolean().optional(),
});

export const taskSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(['active', 'done']).optional(),
});
