/**
 * AppError — Operational error có thể xử lý được (validation, not found, unauthorized...).
 * Phân biệt với lỗi lập trình (TypeError, ReferenceError...) để Global Handler xử lý đúng.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  /** true = lỗi nghiệp vụ bình thường, false = lỗi code / server cần log chi tiết */
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 400, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    // Giữ đúng prototype chain khi extend Error trong TypeScript
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string) {
    return new AppError(message, 400);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }

  static notFound(message: string) {
    return new AppError(message, 404);
  }

  static conflict(message: string) {
    return new AppError(message, 409);
  }

  static unprocessable(message: string) {
    return new AppError(message, 422);
  }

  static internal(message = 'Internal Server Error') {
    return new AppError(message, 500, false);
  }
}
