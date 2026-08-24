import { z } from 'zod';

export const CreateBatchSchema = z.object({
  farmId: z.number().int().positive(),
  name: z.string().min(1, 'Batch code/name is required'),
  productId: z.number().int().positive('productId is required'),
  partnerId: z.number().optional(),
  originText: z.string().optional(),
  importDate: z.string(),
  expectedHarvestDate: z.string().optional(),
  initialQuantity: z.number().int().positive(),
  initialWeight: z.number().positive(),
  cost: z.number().optional().default(0),
  expectedRevenue: z.number().optional().default(0),
  expectedSuccessRate: z.number().optional().default(90),
  note: z.string().optional(),
  warehouses: z.array(
    z.object({
      id: z.string(),
      product_uom_qty: z.string(),
      blocks: z
        .array(
          z.object({
            id: z.string(),
            name: z.string().optional(),
            locations: z.array(
              z.object({
                id: z.string(),
                quantity: z.string().optional(),
              })
            ),
          })
        )
        .optional(),
    })
  ),
  images: z
    .array(
      z.object({
        name: z.string(),
        image: z.string(),
      })
    )
    .optional(),
});

export type CreateBatchDto = z.infer<typeof CreateBatchSchema>;
