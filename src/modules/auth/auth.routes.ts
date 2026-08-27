import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async.handler';
import { validate } from '../../common/middlewares/validate.middleware';
import { authGuard } from '../../common/guards/auth.guard';
import { roleGuard } from '../../common/guards/role.guard';
import { authRateLimiter } from '../../common/middlewares/rate-limit.middleware';
import { authController } from './auth.controller';
import { LoginSchema, RegisterSchema, ChangePasswordSchema, UpdateProfileSchema } from './auth.dto';

const router = Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập hệ thống
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Đăng nhập thành công — trả về access token & refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Sai tài khoản hoặc mật khẩu
 *       429:
 *         description: Đăng nhập sai quá số lần quy định
 */
router.post('/api/v1/auth/login', authRateLimiter, validate(LoginSchema), asyncHandler((req, res) => authController.login(req, res)));

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng ký tài khoản mới
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Tạo tài khoản thành công
 *       409:
 *         description: Tên đăng nhập đã tồn tại
 *       429:
 *         description: Thử đăng ký quá nhiều lần
 */
router.post('/api/v1/auth/register', authRateLimiter, validate(RegisterSchema), asyncHandler((req, res) => authController.register(req, res)));

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng xuất
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
router.post('/api/v1/auth/logout', asyncHandler((req, res) => authController.logout(req, res)));

/**
 * @openapi
 * /api/v1/auth/events:
 *   get:
 *     tags: [Auth]
 *     summary: SSE Event stream theo thời gian thực (nhận thông báo vô hiệu hóa, cập nhật tài khoản)
 *     responses:
 *       200:
 *         description: SSE stream opened
 */
router.get('/api/v1/auth/events', asyncHandler((req, res) => authController.events(req, res)));

/**
 * @openapi
 * /api/v1/users/me:
 *   get:
 *     tags: [Auth]
 *     summary: Lấy thông tin profile người dùng hiện tại
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin user
 *       401:
 *         description: Unauthorized
 *   put:
 *     tags: [Auth]
 *     summary: Cập nhật thông tin profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               avatarBase64: { type: string }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.get('/api/v1/users/me', authGuard, asyncHandler((req, res) => authController.getProfile(req, res)));
router.put('/api/v1/users/me', authGuard, validate(UpdateProfileSchema), asyncHandler((req, res) => authController.updateProfile(req, res)));

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags: [Auth]
 *     summary: Danh sách người dùng hệ thống
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách users
 */
router.get('/api/v1/users', authGuard, asyncHandler((req, res) => authController.listUsers(req, res)));

/**
 * @openapi
 * /api/v1/users/{id}/status:
 *   patch:
 *     tags: [Auth]
 *     summary: Khóa hoặc mở khóa tài khoản người dùng
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 */
router.patch(
  '/api/v1/users/:id/status',
  authGuard,
  roleGuard('SUPER_ADMIN', 'FARM_OWNER', 'MANAGER'),
  asyncHandler((req, res) => authController.updateUserStatus(req, res))
);

/**
 * @openapi
 * /api/v1/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Đổi mật khẩu
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu cũ không đúng
 *       429:
 *         description: Thử quá nhiều lần
 */
router.post('/api/v1/auth/change-password', authGuard, authRateLimiter, validate(ChangePasswordSchema), asyncHandler((req, res) => authController.changePassword(req, res)));

export default router;
