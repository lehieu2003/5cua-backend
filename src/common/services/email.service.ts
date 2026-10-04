/**
 * Email service — gửi mail hệ thống (reset password, thông báo...).
 * HIỆN TẠI: transport console (in ra log) — production cần cấu hình SMTP
 * (nodemailer/resend...) trước khi go-live; xem DEPLOY.md mục 5.
 */
export class EmailService {
  async sendPasswordResetEmail(to: string | null, username: string, resetToken: string): Promise<void> {
    const lines = [
      '',
      '═══════════════════════════════════════════════════════',
      '📧 [EMAIL:console-transport] YÊU CẦU ĐẶT LẠI MẬT KHẨU',
      `   To: ${to || `(không có email — user ${username})`}`,
      `   User: ${username}`,
      `   Mã đặt lại mật khẩu (hiệu lực 15 phút):`,
      `   ${resetToken}`,
      '   Người dùng nhập mã này ở trang đăng nhập để đặt mật khẩu mới.',
      '═══════════════════════════════════════════════════════',
    ];
    console.log(lines.join('\n'));
    // TODO(production): tích hợp SMTP/nodemailer và gửi thật thay vì console.
  }
}

export const emailService = new EmailService();
