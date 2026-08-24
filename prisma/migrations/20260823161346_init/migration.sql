-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'FARM_OWNER', 'MANAGER', 'TECHNICIAN', 'WORKER');

-- CreateEnum
CREATE TYPE "BoxStatus" AS ENUM ('EMPTY', 'OCCUPIED', 'MAINTENANCE', 'CLEANING');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('FEEDING', 'PROBIOTIC');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MoveStatus" AS ENUM ('DRAFT', 'PROCESSING', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "member_type" TEXT DEFAULT 'STANDARD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farms" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_members" (
    "id" SERIAL NOT NULL,
    "farm_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'WORKER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ponds" (
    "id" SERIAL NOT NULL,
    "farm_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pond_type" TEXT NOT NULL DEFAULT 'box_grid',
    "num_block" INTEGER NOT NULL DEFAULT 1,
    "num_row" INTEGER NOT NULL DEFAULT 1,
    "num_column" INTEGER NOT NULL DEFAULT 1,
    "total_box" INTEGER NOT NULL DEFAULT 0,
    "volume" DOUBLE PRECISION DEFAULT 0,
    "area" DOUBLE PRECISION DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ponds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" SERIAL NOT NULL,
    "pond_id" INTEGER NOT NULL,
    "pos_z" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boxes" (
    "id" SERIAL NOT NULL,
    "block_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "row" INTEGER NOT NULL,
    "column" INTEGER NOT NULL,
    "status" "BoxStatus" NOT NULL DEFAULT 'EMPTY',
    "batch_id" INTEGER,
    "product_id" INTEGER,
    "feed_status_id" INTEGER,
    "shape_status_id" INTEGER,
    "occupied_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_templates" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uom" TEXT NOT NULL DEFAULT 'kg',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeding_status_master" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "feed_num" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feeding_status_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shape_status_master" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shape_status_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_import_batches" (
    "id" SERIAL NOT NULL,
    "farm_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "partner_id" INTEGER,
    "origin_text" TEXT,
    "import_date" TIMESTAMP(3) NOT NULL,
    "expected_harvest_date" TIMESTAMP(3),
    "initial_quantity" INTEGER NOT NULL,
    "initial_weight" DOUBLE PRECISION NOT NULL,
    "current_quantity" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expected_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expected_success_rate" DOUBLE PRECISION NOT NULL DEFAULT 90.0,
    "dead_quantity" INTEGER NOT NULL DEFAULT 0,
    "dead_weight" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "BatchStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_images" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeding_records" (
    "id" SERIAL NOT NULL,
    "pond_id" INTEGER NOT NULL,
    "action_type" "ActionType" NOT NULL DEFAULT 'FEEDING',
    "crab_quantity_at_time" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feeding_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeding_items" (
    "id" SERIAL NOT NULL,
    "record_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "feeding_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_cleaning_records" (
    "id" SERIAL NOT NULL,
    "pond_id" INTEGER NOT NULL,
    "soft_shell_quantity" INTEGER NOT NULL DEFAULT 0,
    "dead_quantity" INTEGER NOT NULL DEFAULT 0,
    "feed_status_id" INTEGER,
    "shape_status_id" INTEGER,
    "check_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_cleaning_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_cleaning_boxes" (
    "id" SERIAL NOT NULL,
    "record_id" INTEGER NOT NULL,
    "box_id" INTEGER NOT NULL,
    "is_soft_shell" BOOLEAN NOT NULL DEFAULT false,
    "is_dead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "inspection_cleaning_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_parameters" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "min_normal" DOUBLE PRECISION NOT NULL,
    "max_normal" DOUBLE PRECISION NOT NULL,
    "min_critical" DOUBLE PRECISION NOT NULL,
    "max_critical" DOUBLE PRECISION NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 1,
    "is_show" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "water_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_check_histories" (
    "id" SERIAL NOT NULL,
    "pond_id" INTEGER NOT NULL,
    "check_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "has_warning" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,

    CONSTRAINT "water_check_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_check_items" (
    "id" SERIAL NOT NULL,
    "history_id" INTEGER NOT NULL,
    "parameter_id" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "is_warning" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "water_check_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_warnings" (
    "id" SERIAL NOT NULL,
    "farm_id" INTEGER NOT NULL,
    "pond_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_picking_moves" (
    "id" SERIAL NOT NULL,
    "source_box_id" INTEGER NOT NULL,
    "dest_box_id" INTEGER NOT NULL,
    "status" "MoveStatus" NOT NULL DEFAULT 'DONE',
    "reason" TEXT,
    "moved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_picking_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_histories" (
    "id" SERIAL NOT NULL,
    "farm_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "export_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partner_name" TEXT,
    "total_qty" INTEGER NOT NULL DEFAULT 0,
    "total_weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ExportStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_boxes" (
    "id" SERIAL NOT NULL,
    "export_id" INTEGER NOT NULL,
    "box_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "export_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "name" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "message" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "farm_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "farms_code_key" ON "farms"("code");

-- CreateIndex
CREATE UNIQUE INDEX "farm_members_farm_id_user_id_key" ON "farm_members"("farm_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ponds_farm_id_code_key" ON "ponds"("farm_id", "code");

-- CreateIndex
CREATE INDEX "boxes_status_idx" ON "boxes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "boxes_block_id_row_column_key" ON "boxes"("block_id", "row", "column");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_code_key" ON "product_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_templates_code_key" ON "product_templates"("code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_import_batches_code_key" ON "stock_import_batches"("code");

-- CreateIndex
CREATE INDEX "stock_import_batches_farm_id_status_idx" ON "stock_import_batches"("farm_id", "status");

-- CreateIndex
CREATE INDEX "feeding_records_pond_id_action_type_recorded_at_idx" ON "feeding_records"("pond_id", "action_type", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "water_parameters_code_key" ON "water_parameters"("code");

-- CreateIndex
CREATE INDEX "water_check_histories_pond_id_check_date_idx" ON "water_check_histories"("pond_id", "check_date");

-- CreateIndex
CREATE UNIQUE INDEX "export_histories_code_key" ON "export_histories"("code");

-- CreateIndex
CREATE INDEX "operation_logs_farm_id_created_at_idx" ON "operation_logs"("farm_id", "created_at");

-- AddForeignKey
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ponds" ADD CONSTRAINT "ponds_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_pond_id_fkey" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boxes" ADD CONSTRAINT "boxes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_templates" ADD CONSTRAINT "product_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_import_batches" ADD CONSTRAINT "stock_import_batches_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_import_batches" ADD CONSTRAINT "stock_import_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_images" ADD CONSTRAINT "batch_images_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "stock_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeding_records" ADD CONSTRAINT "feeding_records_pond_id_fkey" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeding_items" ADD CONSTRAINT "feeding_items_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "feeding_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feeding_items" ADD CONSTRAINT "feeding_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_cleaning_records" ADD CONSTRAINT "inspection_cleaning_records_pond_id_fkey" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_cleaning_boxes" ADD CONSTRAINT "inspection_cleaning_boxes_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "inspection_cleaning_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_check_histories" ADD CONSTRAINT "water_check_histories_pond_id_fkey" FOREIGN KEY ("pond_id") REFERENCES "ponds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_check_items" ADD CONSTRAINT "water_check_items_history_id_fkey" FOREIGN KEY ("history_id") REFERENCES "water_check_histories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_check_items" ADD CONSTRAINT "water_check_items_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "water_parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_warnings" ADD CONSTRAINT "water_warnings_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_picking_moves" ADD CONSTRAINT "stock_picking_moves_source_box_id_fkey" FOREIGN KEY ("source_box_id") REFERENCES "boxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_picking_moves" ADD CONSTRAINT "stock_picking_moves_dest_box_id_fkey" FOREIGN KEY ("dest_box_id") REFERENCES "boxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_histories" ADD CONSTRAINT "export_histories_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_boxes" ADD CONSTRAINT "export_boxes_export_id_fkey" FOREIGN KEY ("export_id") REFERENCES "export_histories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
