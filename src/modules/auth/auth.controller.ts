import { Request, Response } from 'express';
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
}

export const authController = new AuthController();
