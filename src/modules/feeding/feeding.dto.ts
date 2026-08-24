import { z } from 'zod';

export const CreateFeedingSchema = z.object({
  actionType: z.enum(['feeding', 'probiotic']).default('feeding'),
  pondId: z.number().int().positive(),
  srcId: z.number().optional().default(1),
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      qty: z.number().positive(),
    })
  ),
  note: z.string().optional(),
});

export type CreateFeedingDto = z.infer<typeof CreateFeedingSchema>;
