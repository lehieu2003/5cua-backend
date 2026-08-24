import { z } from 'zod';

export const AddWaterCheckSchema = z.object({
  warehouseId: z.string().min(1, 'warehouseId is required'),
  waterChecks: z.array(
    z.object({
      parameterId: z.number().int().positive(),
      value: z.number(),
    })
  ),
  note: z.string().optional(),
});

export type AddWaterCheckDto = z.infer<typeof AddWaterCheckSchema>;
