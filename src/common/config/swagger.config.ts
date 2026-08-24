import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../config/env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '🦀 5Cua Smart Farm REST API',
      version: '1.0.0',
      description: `
## Hệ thống Quản lý Trang Trại Nuôi Cua Thông Minh 5Cua

RESTful API chuẩn v1 cho hệ thống quản lý nuôi cua tuần hoàn RAS.

### Hệ thống Phân Quyền (RBAC):
- **Roles**: \`SUPER_ADMIN\`, \`FARM_OWNER\`, \`MANAGER\`, \`TECHNICIAN\`, \`WORKER\`
- **Member Types**: \`standard\` (Chủ/Quản lý), \`employee\` (Nhân viên/Công nhân)

### Xác thực:
Sử dụng **Bearer Token** (JWT) trong header \`Authorization\`.

\`\`\`
Authorization: Bearer <access_token>
\`\`\`
      `,
      contact: {
        name: '5Cua Dev Team',
        email: 'dev@5cua.vn',
      },
    },
    servers: [
      {
        url: env.baseUrl,
        description: env.isDev ? 'Local Development Server' : 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ── Common ─────────────────────────────────────────────
        SuccessResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            code: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'Success' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            code: { type: 'integer', example: 400 },
            message: { type: 'string', example: 'Validation Error' },
            details: { type: 'object', nullable: true },
          },
        },

        // ── Auth ───────────────────────────────────────────────
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'admin' },
            password: { type: 'string', example: 'Password@123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            userId: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'admin' },
            name: { type: 'string', example: 'Quản Trị Viên' },
            role: { type: 'string', enum: ['SUPER_ADMIN', 'FARM_OWNER', 'MANAGER', 'TECHNICIAN', 'WORKER'], example: 'SUPER_ADMIN' },
            memberType: { type: 'string', enum: ['standard', 'employee', 'admin'], example: 'standard' },
            member_type: { type: 'string', example: 'standard' },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            farms: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  farmId: { type: 'integer', example: 1 },
                  farmName: { type: 'string', example: 'Trang Trại Bạc Liêu' },
                  farmCode: { type: 'string', example: 'FARM-BL-01' },
                  role: { type: 'string', example: 'FARM_OWNER' },
                },
              },
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'password', 'fullName'],
          properties: {
            username: { type: 'string', example: 'nguyen_van_a' },
            password: { type: 'string', minLength: 6, example: 'Password@123' },
            fullName: { type: 'string', example: 'Nguyễn Văn A' },
            email: { type: 'string', format: 'email', example: 'a@5cua.vn' },
            phone: { type: 'string', example: '0901234567' },
            memberType: { type: 'string', enum: ['standard', 'employee'], default: 'standard', example: 'standard' },
            role: { type: 'string', enum: ['SUPER_ADMIN', 'FARM_OWNER', 'MANAGER', 'TECHNICIAN', 'WORKER'], default: 'WORKER', example: 'WORKER' },
            farmId: { type: 'integer', example: 1 },
          },
        },

        // ── Farm ───────────────────────────────────────────────
        FarmOverview: {
          type: 'object',
          properties: {
            farm_id: { type: 'integer' },
            farm_name: { type: 'string' },
            total_ponds: { type: 'integer' },
            total_boxes: { type: 'integer' },
            occupied_boxes: { type: 'integer' },
            empty_boxes: { type: 'integer' },
            active_batches: { type: 'integer' },
            occupancy_rate: { type: 'number' },
          },
        },

        // ── Pond ───────────────────────────────────────────────
        CreatePondRequest: {
          type: 'object',
          required: ['farmId', 'code', 'name', 'numBlock', 'numRow', 'numColumn'],
          properties: {
            farmId: { type: 'integer', example: 1 },
            code: { type: 'string', example: 'AO-B2' },
            name: { type: 'string', example: 'Nhà Màng B2' },
            pondType: { type: 'string', example: 'box_grid' },
            numBlock: { type: 'integer', example: 2 },
            numRow: { type: 'integer', example: 3 },
            numColumn: { type: 'integer', example: 5 },
            volume: { type: 'number', example: 50.0 },
            area: { type: 'number', example: 120.0 },
          },
        },

        // ── Batch ──────────────────────────────────────────────
        CreateBatchRequest: {
          type: 'object',
          required: ['name', 'product_id', 'import_date', 'initial_quantity', 'initial_weight'],
          properties: {
            farm_id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'BATCH-20260823' },
            product_id: { type: 'integer', example: 72 },
            import_date: { type: 'string', format: 'date', example: '2026-08-23' },
            expected_harvest_date: { type: 'string', format: 'date', example: '2026-10-23' },
            initial_quantity: { type: 'integer', example: 200 },
            initial_weight: { type: 'number', example: 60.5 },
            cost: { type: 'number', example: 15000000 },
            expected_revenue: { type: 'number', example: 25000000 },
            warehouses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  blocks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        locations: {
                          type: 'array',
                          items: { type: 'object', properties: { id: { type: 'string' } } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },

        // ── Feeding ────────────────────────────────────
        CreateFeedingRequest: {
          type: 'object',
          required: ['pond_id', 'action_type', 'items'],
          properties: {
            pond_id: { type: 'integer', example: 1 },
            action_type: { type: 'string', enum: ['feeding', 'probiotic'], example: 'feeding' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'integer', example: 5 },
                  qty: { type: 'number', example: 2.5 },
                },
              },
            },
            note: { type: 'string', example: 'Cua đang ăn tốt' },
          },
        },

        // ── Water ──────────────────────────────────────────────
        AddWaterCheckRequest: {
          type: 'object',
          required: ['warehouseId', 'waterChecks'],
          properties: {
            warehouseId: { type: 'string', example: '1' },
            waterChecks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  parameterId: { type: 'integer', example: 1 },
                  value: { type: 'number', example: 7.8 },
                },
              },
            },
            note: { type: 'string', example: 'Đo buổi sáng' },
          },
        },

        // ── Move ───────────────────────────────────────────────
        MoveBoxRequest: {
          type: 'object',
          required: ['source_box_id', 'dest_box_id'],
          properties: {
            source_box_id: { type: 'integer', example: 5 },
            dest_box_id: { type: 'integer', example: 12 },
            reason: { type: 'string', example: 'Cua lột vỏ, cần chuyển ao riêng' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.controller.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
