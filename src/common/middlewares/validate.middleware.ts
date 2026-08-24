import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../errors/app.error';

/**
 * validate — Middleware tập trung xử lý Zod parse cho request body.
 * Nếu validation thất bại → throw AppError 422 với message từ Zod.
 * Nếu thành công → gán req.body = parsed data (đã coerce & typed).
 *
 * @example
 * router.post('/ponds', validate(CreatePondSchema), asyncHandler(pondController.restCreate));
 */
export const validate =
  (schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = (result.error as ZodError).errors
        .map((e) => `[${e.path.join('.')}] ${e.message}`)
        .join('; ');

      return next(AppError.unprocessable(`Validation Error: ${errors}`));
    }

    // Gán lại body với giá trị đã được parse & coerce (đúng type)
    req[target] = result.data as any;
    next();
  };
