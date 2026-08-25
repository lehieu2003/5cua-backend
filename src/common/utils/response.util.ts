import { Response } from 'express';

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
}
