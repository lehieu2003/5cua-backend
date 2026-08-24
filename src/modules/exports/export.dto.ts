import { z } from 'zod';

export const CreateExportSchema = z.object({
  farmId: z.number().int().positive(),
  partnerName: z.string().optional(),
  note: z.string().optional(),
  boxes: z.array(
    z.object({
      boxId: z.number().int().positive(),
      productId: z.number().int().positive(),
      weight: z.number().positive(),
      price: z.number().positive(),
    })
  ),
});

export type CreateExportDto = z.infer<typeof CreateExportSchema>;
