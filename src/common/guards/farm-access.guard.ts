import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from './auth.guard';
import { AppError } from '../errors/app.error';
import { env } from '../config/env';
import prisma from '../../database/prisma.service';

/**
 * farmAccessGuard — chặn đọc/ghi chéo trại (IDOR).
 * Mọi user thường chỉ được thao tác dữ liệu của các trại mình là thành viên
 * (farmMembers); SUPER_ADMIN / memberType admin toàn quyền.
 *
 * farmId được suy theo thứ tự: query → body → params (farmId) → pattern URL:
 *   /farms/:id*, /analytics/farms/:id, /analytics/batches/:id,
 *   /batches/:id, /exports/:id, /ponds/:id*, /moves/:id
 * với record-id thì resolve ngược về farmId qua DB.
 *
 * Endpoint master-data toàn cục (không gắn farm) nằm trong SKIP_PREFIXES
 * và được phép đi qua khi request không chứa farmId; các path khác thiếu
 * farmId sẽ bị 400 để không rơi vào default farmId phía controller.
 */

const SKIP_PREFIXES = [
  '/api/v1/feeding/products',
  '/api/v1/feeding/categories',
  '/api/v1/feeding/status',
  '/api/v1/feeding/shapes',
  '/api/v1/water/parameters',
  '/api/v1/users',
  '/api/v1/notifications',
];

function parseId(raw: any): number | null {
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Resolve farmId từ record id trên URL (nếu có), trả null khi không khớp pattern. */
async function resolveFarmIdFromPath(path: string): Promise<number | null> {
  let m = path.match(/^\/api\/v1\/farms\/(\d+)/);
  if (m) return parseInt(m[1], 10);

  m = path.match(/^\/api\/v1\/analytics\/farms\/(\d+)/);
  if (m) return parseInt(m[1], 10);

  m = path.match(/^\/api\/v1\/batches\/(\d+)/);
  if (m) {
    const batch = await prisma.stockImportBatch.findUnique({
      where: { id: parseInt(m[1], 10) },
      select: { farmId: true },
    });
    return batch?.farmId ?? null;
  }

  m = path.match(/^\/api\/v1\/analytics\/batches\/(\d+)/);
  if (m) {
    const batch = await prisma.stockImportBatch.findUnique({
      where: { id: parseInt(m[1], 10) },
      select: { farmId: true },
    });
    return batch?.farmId ?? null;
  }

  m = path.match(/^\/api\/v1\/exports\/(\d+)/);
  if (m) {
    const exp = await prisma.exportHistory.findUnique({
      where: { id: parseInt(m[1], 10) },
      select: { farmId: true },
    });
    return exp?.farmId ?? null;
  }

  m = path.match(/^\/api\/v1\/ponds\/(\d+)/);
  if (m) {
    const pond = await prisma.pond.findUnique({
      where: { id: parseInt(m[1], 10) },
      select: { farmId: true },
    });
    return pond?.farmId ?? null;
  }

  m = path.match(/^\/api\/v1\/moves\/(\d+)/);
  if (m) {
    const move = await prisma.stockPickingMove.findUnique({
      where: { id: parseInt(m[1], 10) },
      select: { sourceBox: { select: { block: { select: { pond: { select: { farmId: true } } } } } } },
    });
    return move?.sourceBox.block.pond.farmId ?? null;
  }

  return null;
}

export const farmAccessGuard = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let user = req.user;

    // Guard này chạy TRƯỚC authGuard ở tầng route nên req.user có thể chưa được
    // gán — tự giải mã Bearer token (nếu có) để biết danh tính. Token rác/hết hạn
    // thì coi như ẩn danh và đi tiếp: authGuard ở route sẽ 401 cho endpoint cần auth.
    if (!user) {
      const header = req.headers.authorization;
      if (header && header.startsWith('Bearer ')) {
        try {
          const decoded = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as any;
          if (decoded && decoded.userId) {
            const u = await prisma.user.findUnique({
              where: { id: decoded.userId },
              select: { id: true, username: true, isActive: true, memberType: true },
            });
            if (u && u.isActive) {
              user = {
                userId: u.id,
                username: u.username,
                role: decoded.role,
                memberType: u.memberType ?? undefined,
              };
              req.user = user;
            }
          }
        } catch {
          // token không hợp lệ — để route-level authGuard xử lý 401
        }
      }
    }

    if (!user) return next();

    const isSuper =
      user.role === 'SUPER_ADMIN' || String(user.memberType).toLowerCase() === 'admin';
    if (isSuper) return next();

    // 1) farmId khai báo trực tiếp trên request
    let farmId =
      parseId(req.query.farmId) ??
      parseId((req.query as any).farm_id) ??
      parseId(req.body?.farmId) ??
      parseId(req.body?.farm_id) ??
      parseId(req.params?.farmId);

    // 1b) pondId trên query (VD: GET /water/checks?pondId=) → resolve về farm
    if (!farmId) {
      const pondQ = parseId(req.query.pondId) ?? parseId((req.query as any).pond_id);
      if (pondQ) {
        const pond = await prisma.pond.findUnique({
          where: { id: pondQ },
          select: { farmId: true },
        });
        farmId = pond?.farmId ?? null;
      }
    }

    // 2) farmId gián tiếp qua record id trên URL
    if (!farmId) {
      farmId = await resolveFarmIdFromPath(req.originalUrl.split('?')[0]);
    }

    // 3) Không có farmId: /farms (danh sách — repo đã tự lọc membership) và
    // master-data toàn cục thì qua, còn lại yêu cầu khai báo farmId
    if (!farmId) {
      const path = req.originalUrl.split('?')[0];
      if (path === '/api/v1/farms' || SKIP_PREFIXES.some((p) => path.startsWith(p))) {
        return next();
      }
      throw AppError.badRequest('Vui lòng cung cấp farmId');
    }

    // 4) Kiểm tra membership
    const membership = await prisma.farmMember.findFirst({
      where: { farmId, userId: user.userId },
      select: { id: true },
    });
    if (!membership) {
      throw AppError.forbidden('Bạn không có quyền truy cập dữ liệu của trang trại này');
    }

    return next();
  } catch (err) {
    next(err);
  }
};
