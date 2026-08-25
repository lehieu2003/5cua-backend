/**
 * messages.constant.ts
 * Quản lý toàn bộ thông điệp phản hồi (Success / Error / Warning) của hệ thống.
 * Chỉnh sửa nội dung text thông báo tại đây một cách tập trung.
 */

export const MESSAGES = {
  // ── Hệ thống chung ──────────────────────────────────────────────
  SYSTEM: {
    SUCCESS: 'Thành công',
    ERROR: 'Đã có lỗi xảy ra',
    NOT_FOUND: 'Không tìm thấy dữ liệu',
    UNAUTHORIZED: 'Không có quyền truy cập',
    FORBIDDEN: 'Bị từ chối truy cập',
    INTERNAL_ERROR: 'Lỗi máy chủ nội bộ',
    UNIQUE_VIOLATION: 'Dữ liệu đã tồn tại trong hệ thống',
    RECORD_NOT_FOUND: 'Không tìm thấy bản ghi',
    INVALID_AUTH_HEADER: 'Thiếu hoặc sai định dạng Authorization header',
    TOKEN_INVALID: 'Token không hợp lệ',
    TOKEN_EXPIRED: 'Token đã hết hạn',
  },

  // ── Xác thực & Tài khoản ────────────────────────────────────────
  AUTH: {
    LOGIN_SUCCESS: 'Đăng nhập thành công',
    REGISTER_SUCCESS: 'Đăng ký tài khoản thành công',
    LOGOUT_SUCCESS: 'Đăng xuất thành công',
    INVALID_CREDENTIALS: 'Tài khoản hoặc mật khẩu không chính xác',
    USERNAME_EXISTS: 'Tên đăng nhập đã tồn tại trong hệ thống',
    PHONE_EXISTS: 'Số điện thoại đã được đăng ký',
    EMAIL_EXISTS: 'Email đã được đăng ký',
    USER_NOT_FOUND: 'Không tìm thấy thông tin người dùng',
    INVALID_OLD_PASSWORD: 'Mật khẩu cũ không chính xác',
    CHANGE_PASSWORD_SUCCESS: 'Đổi mật khẩu thành công',
    UPDATE_PROFILE_SUCCESS: 'Cập nhật thông tin thành công',
    REQUIRED_CREDENTIALS: 'Vui lòng cung cấp đầy đủ tên đăng nhập và mật khẩu',
  },

  // ── Ao & Hộp nuôi ───────────────────────────────────────────────
  POND: {
    CREATE_SUCCESS: 'Tạo ao thành công',
    UPDATE_SUCCESS: 'Cập nhật thông tin ao thành công',
    DELETE_SUCCESS: 'Xóa ao thành công',
    NOT_FOUND: 'Không tìm thấy thông tin ao',
    BOX_NOT_FOUND: 'Không tìm thấy thông tin hộp nuôi',
  },

  // ── Đợt nhập giống ──────────────────────────────────────────────
  BATCH: {
    CREATE_SUCCESS: 'Tạo đợt nhập thành công',
    UPDATE_SUCCESS: 'Cập nhật đợt nhập thành công',
    NOT_FOUND: 'Không tìm thấy thông tin đợt nhập',
    CODE_EXISTS: 'Mã đợt nhập đã tồn tại trong hệ thống, vui lòng chọn mã khác',
    PRODUCT_NOT_FOUND: 'Loại sản phẩm/cua được chọn không tồn tại',
    FARM_NOT_FOUND: 'Không tìm thấy thông tin trang trại',
    INVALID_BOXES: 'Danh sách hộp phân bổ không hợp lệ',
    BOX_ALREADY_OCCUPIED: 'Một số hộp nuôi đã có cua (đang sử dụng), vui lòng chọn hộp trống khác',
    QUANTITY_REQUIRED: 'Số lượng ban đầu phải lớn hơn 0',
    WEIGHT_REQUIRED: 'Khối lượng ban đầu phải lớn hơn 0',
  },

  // ── Cho ăn & Vi sinh ────────────────────────────────────────────
  FEEDING: {
    CREATE_SUCCESS: 'Ghi nhận cho ăn thành công',
    PROBIOTIC_SUCCESS: 'Ghi nhận bổ sung vi sinh thành công',
    NOT_FOUND: 'Không tìm thấy nhật ký cho ăn',
  },

  // ── Kiểm tra vệ sinh & Chuyển loại cua ───────────────────────────
  INSPECTION: {
    CLEAN_CHECK_SUCCESS: 'Ghi nhận kiểm tra vệ sinh thành công',
    CONVERT_CRAB_SUCCESS: 'Chuyển đổi giống cua thành công',
    NOT_FOUND: 'Không tìm thấy bản ghi kiểm tra',
  },

  // ── Di chuyển hộp ───────────────────────────────────────────────
  MOVE: {
    MOVE_SUCCESS: 'Di chuyển hộp thành công',
    SOURCE_EMPTY: 'Hộp nguồn đang trống, không thể chuyển',
    DEST_OCCUPIED: 'Hộp đích đã có cua, không thể chuyển',
    SAME_BOX: 'Hộp nguồn và hộp đích không được trùng nhau',
  },

  // ── Xuất bán ────────────────────────────────────────────────────
  EXPORT: {
    CREATE_SUCCESS: 'Tạo phiếu xuất thành công',
    NOT_FOUND: 'Không tìm thấy phiếu xuất',
  },

  // ── Thông báo ───────────────────────────────────────────────────
  NOTIFICATION: {
    MARK_ALL_READ_SUCCESS: 'Đã đánh dấu tất cả thông báo là đã đọc',
    DELETE_SUCCESS: 'Xoá thông báo thành công',
    NOT_FOUND: 'Không tìm thấy thông báo',
  },

  // ── Đo thông số nước ────────────────────────────────────────────
  WATER: {
    ADD_CHECK_SUCCESS: 'Ghi nhận đo nước thành công',
    NOT_FOUND: 'Không tìm thấy dữ liệu đo nước',
    WARNING_DETECTED: 'Phát hiện chỉ số nước vượt ngưỡng an toàn',
  },
} as const;
