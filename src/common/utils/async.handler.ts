import { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * asyncHandler — Wrapper loại bỏ hoàn toàn việc viết try/catch lặp đi lặp lại.
 * Bất kỳ lỗi nào throw ra (AppError hoặc Error thường) đều được forward đến
 * Global Error Handler trong app.ts thông qua next(error).
 *
 * @example
 * router.get('/ponds', asyncHandler(async (req, res) => {
 *   const data = await pondService.getAll();
 *   res.json(data);
 * }));
 */
export const asyncHandler =
  (fn: AsyncRequestHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
