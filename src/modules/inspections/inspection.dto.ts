import { z } from 'zod';

export const CleanAndCheckSchema = z.object({
  warehouseId: z.string().min(1, 'warehouseId is required'),
  productIdTarget: z.string().optional(),
  shapeId: z.number().int().optional(),
  feedId: z.number().int().optional(),
  softShellQuantity: z.string().optional().default('0'),
  deadQuantity: z.string().optional().default('0'),
  boxs: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.string().optional(),
        isDead: z.boolean().optional(),
        isSoftShell: z.boolean().optional(),
      })
    )
    .optional(),
});

export const ConvertCrabSchema = z.object({
  warehouseId: z.string().min(1),
  productId: z.string().min(1),
  productIdNew: z.string().min(1),
  boxs: z.array(
    z.object({
      id: z.string(),
    })
  ),
});

export type CleanAndCheckDto = z.infer<typeof CleanAndCheckSchema>;
export type ConvertCrabDto = z.infer<typeof ConvertCrabSchema>;
