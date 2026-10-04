import { z } from 'zod';

// Mobile gửi key `boxes`, web gửi `boxs` — chấp nhận cả hai tên
const BoxFlagSchema = z.object({
  id: z.string(),
  quantity: z.string().optional(),
  isDead: z.boolean().optional(),
  isSoftShell: z.boolean().optional(),
});

export const CleanAndCheckSchema = z.object({
  warehouseId: z.string().min(1, 'warehouseId is required'),
  productIdTarget: z.string().optional(),
  shapeId: z.number().int().optional(),
  feedId: z.number().int().optional(),
  softShellQuantity: z.string().optional().default('0'),
  deadQuantity: z.string().optional().default('0'),
  boxs: z.array(BoxFlagSchema).optional(),
  boxes: z.array(BoxFlagSchema).optional(),
});

export const ConvertCrabSchema = z.object({
  warehouseId: z.string().min(1),
  productId: z.string().min(1),
  productIdNew: z.string().min(1),
  boxs: z.array(z.object({ id: z.string() })).optional(),
  boxes: z.array(z.object({ id: z.string() })).optional(),
});

export type CleanAndCheckDto = z.infer<typeof CleanAndCheckSchema>;
export type ConvertCrabDto = z.infer<typeof ConvertCrabSchema>;
