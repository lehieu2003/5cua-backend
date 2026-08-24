import { z } from 'zod';

export const CreateFarmSchema = z.object({
  code: z.string().min(1, 'Farm code is required'),
  name: z.string().min(1, 'Farm name is required'),
  address: z.string().optional(),
  description: z.string().optional(),
});

export type CreateFarmDto = z.infer<typeof CreateFarmSchema>;
