import { z } from 'zod';

export const MoveBoxSchema = z.object({
  sourceBoxId: z.number().int().positive(),
  destBoxId: z.number().int().positive(),
  reason: z.string().optional(),
});

export type MoveBoxDto = z.infer<typeof MoveBoxSchema>;
