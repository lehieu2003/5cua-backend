import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './common/config/swagger.config';

// Module Routers
import authRoutes from './modules/auth/auth.routes';
import farmRoutes from './modules/farms/farm.routes';
import pondRoutes from './modules/ponds/pond.routes';
import batchRoutes from './modules/batches/batch.routes';
import feedingRoutes from './modules/feeding/feeding.routes';
import inspectionRoutes from './modules/inspections/inspection.routes';
import waterRoutes from './modules/water/water.routes';
import moveRoutes from './modules/moves/move.routes';
import exportRoutes from './modules/exports/export.routes';
import notificationRoutes from './modules/notifications/notification.routes';

// Global Error Handler
import { globalErrorHandler } from './common/middlewares/error.handler';
import { env } from './common/config/env';

const app = express();

// ── Middlewares ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan(env.isDev ? 'dev' : 'combined'));

// ── Health Check ─────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: '5Cua Smart Farm Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Swagger UI ────────────────────────────────────────────────────
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: '🦀 5Cua Farm API Docs',
    customCss: `
      .swagger-ui .topbar { background-color: #1a1a2e; }
      .swagger-ui .topbar-wrapper img { content: url(''); }
      .swagger-ui .topbar-wrapper::before {
        content: '🦀 5Cua Smart Farm API';
        color: #e94560;
        font-size: 20px;
        font-weight: bold;
      }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  })
);

// Trả về raw JSON spec (để import vào Postman, Insomnia...)
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── Module Routers ───────────────────────────────────────────────
// Mỗi module tự quản lý routes của mình qua *.routes.ts
app.use(authRoutes);
app.use(farmRoutes);
app.use(pondRoutes);
app.use(batchRoutes);
app.use(feedingRoutes);
app.use(inspectionRoutes);
app.use(waterRoutes);
app.use(moveRoutes);
app.use(exportRoutes);
app.use(notificationRoutes);

// ── 404 Handler ──────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    code: 404,
    message: `Route [${req.method}] ${req.path} không tồn tại`,
  });
});

// ── Global Error Handler (PHẢI ở cuối cùng) ──────────────────────
app.use(globalErrorHandler);

export default app;
