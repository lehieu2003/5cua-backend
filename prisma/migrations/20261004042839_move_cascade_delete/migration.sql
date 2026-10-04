-- DropForeignKey
ALTER TABLE "stock_picking_moves" DROP CONSTRAINT "stock_picking_moves_dest_box_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_picking_moves" DROP CONSTRAINT "stock_picking_moves_source_box_id_fkey";

-- AddForeignKey
ALTER TABLE "stock_picking_moves" ADD CONSTRAINT "stock_picking_moves_source_box_id_fkey" FOREIGN KEY ("source_box_id") REFERENCES "boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_picking_moves" ADD CONSTRAINT "stock_picking_moves_dest_box_id_fkey" FOREIGN KEY ("dest_box_id") REFERENCES "boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
