// origin.guard.ts — chặn CSRF cho endpoint dùng cookie: nếu request có header Origin
// mà origin không thuộc allowlist thì từ chối (403). Request không Origin (mobile/curl,
// same-origin fetch một số trình duyệt) được cho qua — Bearer/body path không đổi.
import type { Request, Response, NextFunction } from 'express';

export function originGuard(allowList: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin as string | undefined;
    if (origin && !allowList.includes(origin)) {
      return res.status(403).json({
        success: false,
        status: 'error',
        code: 403,
        message: 'Origin không được phép truy cập endpoint này',
      });
    }
    next();
  };
}
