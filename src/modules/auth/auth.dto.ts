import { z } from 'zod';

export const UserRoleEnum = z.enum([
  'SUPER_ADMIN',
  'FARM_OWNER',
  'MANAGER',
  'TECHNICIAN',
  'WORKER',
]);

export const MemberTypeEnum = z.enum([
  'standard',
  'employee',
  'admin',
]);

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const RegisterSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  memberType: MemberTypeEnum.optional().default('standard'),
  role: UserRoleEnum.optional().default('WORKER'),
  farmId: z.number().int().positive().optional(),
});

export const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const UpdateProfileSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  avatarBase64: z.string().optional(),
});

// refreshToken optional: web gửi token qua HttpOnly cookie (không có trong body),
// controller đọc cookie ?? body — thiếu cả hai sẽ bị chặn 400 ở controller.
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').optional(),
});

export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
export type LogoutDto = z.infer<typeof LogoutSchema>;
export type UserRoleType = z.infer<typeof UserRoleEnum>;
export type MemberType = z.infer<typeof MemberTypeEnum>;

export const ForgotPasswordSchema = z.object({
  identifier: z.string().min(3, 'Nhập tên đăng nhập hoặc email'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(10, 'Mã đặt lại mật khẩu không hợp lệ'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
