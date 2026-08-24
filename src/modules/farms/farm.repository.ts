import prisma from '../../database/prisma.service';

export class FarmRepository {
  async findAll() {
    return prisma.farm.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        description: true,
        createdAt: true,
      },
    });
  }

  async findById(id: number) {
    return prisma.farm.findUnique({
      where: { id },
      include: {
        ponds: {
          select: {
            id: true,
            code: true,
            name: true,
            pondType: true,
            totalBox: true,
            status: true,
          },
        },
      },
    });
  }

  async getOverviewStats(farmId: number) {
    const ponds = await prisma.pond.findMany({
      where: { farmId },
      include: {
        blocks: {
          include: {
            boxes: true,
          },
        },
      },
    });

    let totalBoxes = 0;
    let occupiedBoxes = 0;
    let softShellCount = 0;
    let deadCount = 0;

    for (const pond of ponds) {
      for (const block of pond.blocks) {
        for (const box of block.boxes) {
          totalBoxes++;
          if (box.status === 'OCCUPIED') {
            occupiedBoxes++;
          }
        }
      }
    }

    const warnings = await prisma.waterWarning.count({
      where: { farmId, isResolved: false },
    });

    return {
      farm_id: farmId,
      total_pond: ponds.length,
      total_box: totalBoxes,
      occupied_box: occupiedBoxes,
      total_crab: occupiedBoxes,
      soft_shell_quantity: softShellCount,
      dead_quantity: deadCount,
      warning_water_count: warnings,
    };
  }

  async createFarm(data: { code: string; name: string; address?: string; description?: string }) {
    return prisma.farm.create({ data });
  }
}

export const farmRepository = new FarmRepository();
