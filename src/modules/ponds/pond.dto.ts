import { z } from 'zod';

export const CreatePondSchema = z.object({
  farmId: z.number().int().positive('farmId is required'),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  pondType: z.string().default('box_grid'),
  numBlock: z.number().int().positive().default(1),
  numRow: z.number().int().positive().default(1),
  numColumn: z.number().int().positive().default(1),
  volume: z.number().optional(),
  area: z.number().optional(),
});

export const FilterBoxSchema = z.object({
  pondId: z.number().int().positive('pondId is required'),
  blockId: z.string().optional(),
  row: z.number().optional(),
  column: z.number().optional(),
  status: z.enum(['occupied', 'empty']).optional(),
  productId: z.number().optional(),
  feedId: z.number().optional(),
  shapeId: z.number().optional(),
});

export type CreatePondDto = z.infer<typeof CreatePondSchema>;
export type FilterBoxDto = z.infer<typeof FilterBoxSchema>;
