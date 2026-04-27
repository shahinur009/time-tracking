import { z } from 'zod';

const isoDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'day must be YYYY-MM-DD');

export const upsertCellSchema = z.object({
  projectId: z.string().min(1).nullable(),
  day: isoDay,
  durationSec: z.number().int().min(0).max(24 * 3600),
  description: z.string().max(500).optional(),
  billable: z.boolean().optional(),
  tz: z.string().optional(),
});

export const deleteRowSchema = z.object({
  projectId: z.string().nullable(),
  weekStart: isoDay,
  weekEnd: isoDay,
  tz: z.string().optional(),
});

export const copyWeekSchema = z.object({
  fromWeekStart: isoDay,
  toWeekStart: isoDay,
  tz: z.string().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Template name is required').max(120),
  weekStart: isoDay,
  includeTime: z.boolean().optional(),
  tz: z.string().optional(),
});

export const applyTemplateSchema = z.object({
  weekStart: isoDay,
  tz: z.string().optional(),
});
