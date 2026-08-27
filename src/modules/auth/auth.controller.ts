import jwt from 'jsonwebtoken';
import { env } from '../../common/config/env';
import { sseService } from '../../common/services/sse.service';
import { authService, AuthService } from './auth.service';
import { ResponseUtil } from '../../common/utils/response.util';
import { AuthenticatedRequest } from '../../common/guards/auth.guard';
import { MESSAGES } from '../../common/constants/messages.constant';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  /**
   * RESTful Login: POST /api/v1/auth/login
   */
  async login(req: Request, res: Response) {
    try {
      const result = await this.service.login(req.body);
      return ResponseUtil.success(res, result, MESSAGES.AUTH.LOGIN_SUCCESS);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, error.statusCode || 400);
    }
  }

  /**
   * RESTful Register: POST /api/v1/auth/register
   */
  async register(req: Request, res: Response) {
    try {
      const result = await this.service.register(req.body);
      return ResponseUtil.success(res, result, MESSAGES.AUTH.REGISTER_SUCCESS, 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, error.statusCode || 400);
    }
  }

  /**
   * RESTful Logout: POST /api/v1/auth/logout
   */
  async logout(_req: Request, res: Response) {
    return ResponseUtil.success(res, null, MESSAGES.AUTH.LOGOUT_SUCCESS);
  }

  /**
   * RESTful Profile: GET /api/v1/users/me
   */
  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.error(res, MESSAGES.SYSTEM.UNAUTHORIZED, 401);

      const profile = await this.service.getProfile(userId);
      return ResponseUtil.success(res, profile);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, error.statusCode || 400);
    }
  }

  /**
   * RESTful Update Profile: PUT /api/v1/users/me
   */
  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.error(res, MESSAGES.SYSTEM.UNAUTHORIZED, 401);

      const updated = await this.service.updateProfile(userId, req.body);
      return ResponseUtil.success(res, updated, MESSAGES.AUTH.UPDATE_PROFILE_SUCCESS);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, error.statusCode || 400);
    }
  }

  /**
   * RESTful Change Password: POST /api/v1/auth/change-password
   */
  async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) return ResponseUtil.error(res, MESSAGES.SYSTEM.UNAUTHORIZED, 401);

      await this.service.changePassword(userId, req.body);
      return ResponseUtil.success(res, null, MESSAGES.AUTH.CHANGE_PASSWORD_SUCCESS);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, error.statusCode || 400);
    }
  }

  /**
   * RESTful List Users: GET /api/v1/users
   */
  async listUsers(req: Request, res: Response) {
    try {
      const farmId = req.query.farmId ? parseInt(req.query.farmId as string, 10) : undefined;
      const users = await this.service.listUsers(farmId);
      return ResponseUtil.success(res, users);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, error.statusCode || 400);
    }
  }

  /**
   * RESTful Update User Status: PATCH /api/v1/users/:id/status
   */
  async updateUserStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const currentAdminId = req.user?.userId;
      if (!currentAdminId) return ResponseUtil.error(res, MESSAGES.SYSTEM.UNAUTHORIZED, 401);

      const targetUserId = parseInt(req.params.id, 10);
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return ResponseUtil.error(res, 'Trường isActive phải là boolean (true/false)', 400);
      }

      const result = await this.service.updateUserStatus(currentAdminId, targetUserId, isActive);
      const msg = isActive ? 'Mở khóa tài khoản thành công' : 'Khóa tài khoản thành công';
      return ResponseUtil.success(res, result, msg);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, error.statusCode || 400);
    }
  }

  /**
   * SSE Events Stream: GET /api/v1/auth/events
   */
  async events(req: Request, res: Response) {
    let token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      return ResponseUtil.error(res, MESSAGES.SYSTEM.INVALID_AUTH_HEADER, 401);
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
      if (!decoded || !decoded.userId) {
        return ResponseUtil.error(res, MESSAGES.SYSTEM.TOKEN_INVALID, 401);
      }

      const userId = decoded.userId;

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', userId })}\n\n`);

      sseService.addClient(userId, res);

      req.on('close', () => {
        sseService.removeClient(userId, res);
      });
    } catch (err) {
      return ResponseUtil.error(res, MESSAGES.SYSTEM.TOKEN_INVALID, 401);
    }
  }
}

export const authController = new AuthController();

