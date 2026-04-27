import { z } from 'zod';

export const startEntrySchema = z.object({
  description: z.string().max(500).optional(),
  projectId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  taggedUsers: z.array(z.string()).optional(),
  clickupTaskId: z.string().optional(),
  clickupTaskTitle: z.string().optional(),
});

export const stopEntrySchema = z.object({
  done: z.boolean(),
});

export const createEntrySchema = z.object({
  userId: z.string(),
  projectId: z.string().nullable().optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
  taggedUsers: z.array(z.string()).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  clickupTaskId: z.string().optional(),
  clickupTaskTitle: z.string().optional(),
});

export const adminUpdateEntrySchema = z.object({
  projectId: z.string().nullable().optional(),
  description: z.string().max(500).optional(),
  billable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  taggedUsers: z.array(z.string()).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  duration: z.number().int().min(0).max(24 * 3600).optional(),
  userId: z.string().optional(),
  source: z.enum(['tracker', 'timesheet']).optional(),
  status: z.enum(['running', 'finished']).optional(),
});

export const memberUpdateEntrySchema = z.object({
  projectId: z.string().nullable(),
});
