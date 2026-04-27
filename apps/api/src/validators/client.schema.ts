import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1).max(120),
});

export const updateClientSchema = createClientSchema.partial().extend({
  archived: z.boolean().optional(),
});
