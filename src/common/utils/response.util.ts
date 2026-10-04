import { Response } from 'express';
import { AppError } from '../errors/app.error';
import { env } from '../config/env';

export class ResponseUtil {
  /**
   * Phản hồi thành công chuẩn RESTful
   */
  static success(res: Response, data: any, message = 'Success', code = 200) {
    return res.status(code).json({
      success: true,
      status: 'success',
      code,
      message,
      data,
    });
  }

  /**
   * Phản hồi lỗi chuẩn RESTful
   */
  static error(res: Response, message = 'Error', code = 400, details: any = null) {
    return res.status(code).json({
      success: false,
      status: 'error',
      code,
      message,
      details,
    });
  }

  /**
   * Phản hồi danh sách có phân trang chuẩn RESTful
   */
  static paginated(
    res: Response,
    data: any[],
    pagination: { total: number; page?: number; limit?: number; offset?: number },
    message = 'Success'
  ) {
    return res.status(200).json({
      success: true,
      status: 'success',
      code: 200,
      message,
      data,
      pagination,
    });
  }

  /**
   * Map lỗi trong controller → response an toàn:
   * - AppError: giữ nguyên statusCode + message nghiệp vụ.
   * - Prisma known error: map 409/404.
   * - Lỗi khác (Prisma raw, TypeError...): KHÔNG BAO GIỜ leak message nội bộ ra client
   *   (chỉ hiện chi tiết ở dev), luôn log server-side. Tránh việc từng controller
   *   catch-all trả error.message thô kể cả trên production.
   */
  static fromError(res: Response, error: any, _fallbackCode = 400) {
    if (error instanceof AppError) {
      return ResponseUtil.error(res, error.message, error.statusCode);
    }
    if (error?.code === 'P2002') {
      return ResponseUtil.error(res, 'Dữ liệu đã tồn tại (vi phạm ràng buộc duy nhất)', 409);
    }
    if (error?.code === 'P2025') {
      return ResponseUtil.error(res, 'Không tìm thấy bản ghi', 404);
    }
    console.error('[Controller Error]', error);
    return ResponseUtil.error(
      res,
      env.isDev ? String(error?.message || 'Lỗi hệ thống') : 'Lỗi hệ thống, vui lòng thử lại sau',
      500
    );
  }
}
