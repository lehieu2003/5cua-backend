import prisma from '../../database/prisma.service';
import { BoxStatus } from '@prisma/client';

export class PondRepository {
  async findByFarmId(farmId: number, keyword?: string) {
    return prisma.pond.findMany({
      where: {
        farmId,
        ...(keyword && {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { code: { contains: keyword, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        farm: { select: { id: true, name: true } },
        blocks: {
          include: {
            boxes: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.pond.findUnique({
      where: { id },
      include: {
        farm: { select: { id: true, name: true } },
        blocks: {
          include: {
            boxes: {
              include: {
                product: true,
                batch: true,
              },
            },
          },
        },
        feedingLogs: { take: 5, orderBy: { recordedAt: 'desc' } },
        waterChecks: { take: 5, orderBy: { checkDate: 'desc' } },
      },
    });
  }

  async createPondWithGrid(data: {
    farmId: number;
    code: string;
    name: string;
    pondType: string;
    numBlock: number;
    numRow: number;
    numColumn: number;
    volume?: number;
    area?: number;
  }) {
    const totalBox = data.numBlock * data.numRow * data.numColumn;

    return prisma.$transaction(async (tx) => {
      const pond = await tx.pond.create({
        data: {
          farmId: data.farmId,
          code: data.code,
          name: data.name,
          pondType: data.pondType,
          numBlock: data.numBlock,
          numRow: data.numRow,
          numColumn: data.numColumn,
          totalBox,
          volume: data.volume || 0,
          area: data.area || 0,
        },
      });

      // Tự động sinh hàng nghìn Box theo lưới tọa độ Block -> Row -> Column
      for (let b = 1; b <= data.numBlock; b++) {
        const block = await tx.block.create({
          data: {
            pondId: pond.id,
            posZ: b,
            name: `Dãy ${b}`,
          },
        });

        const boxesData: { blockId: number; code: string; row: number; column: number; status: BoxStatus }[] = [];
        for (let r = 1; r <= data.numRow; r++) {
          for (let c = 1; c <= data.numColumn; c++) {
            boxesData.push({
              blockId: block.id,
              code: `${pond.code}-B${b}-R${r}-C${c}`,
              row: r,
              column: c,
              status: BoxStatus.EMPTY,
            });
          }
        }

        await tx.box.createMany({ data: boxesData });
      }

      return pond;
    });
  }

  async filterBoxes(params: {
    pondId: number;
    blockId?: string;
    row?: number;
    column?: number;
    status?: 'occupied' | 'empty';
    productId?: number;
    feedId?: number;
    shapeId?: number;
  }) {
    const dbStatus = params.status
      ? params.status.toLowerCase() === 'occupied'
        ? BoxStatus.OCCUPIED
        : BoxStatus.EMPTY
      : undefined;

    return prisma.box.findMany({
      where: {
        block: {
          pondId: params.pondId,
          ...(params.blockId && { id: parseInt(params.blockId, 10) }),
        },
        ...(params.row && { row: params.row }),
        ...(params.column && { column: params.column }),
        ...(dbStatus && { status: dbStatus }),
        ...(params.productId && { productId: params.productId }),
        ...(params.feedId && { feedStatusId: params.feedId }),
        ...(params.shapeId && { shapeStatusId: params.shapeId }),
      },
      include: {
        product: true,
        block: true,
      },
      orderBy: [{ block: { posZ: 'asc' } }, { row: 'asc' }, { column: 'asc' }],
    });
  }

  async updatePond(id: number, data: { name?: string; code?: string; volume?: number; area?: number; status?: string }) {
    return prisma.pond.update({
      where: { id },
      data,
    });
  }
}

export const pondRepository = new PondRepository();
