// [E2E] File thử nghiệm cho AI code review bot (branch bot-e2e-test) — sẽ xoá sau khi test xong.
// Chứa 2 lỗi CỐ Ý để kiểm tra bot phát hiện:
//   1. SQL injection qua nối chuỗi trong raw query
//   2. Gọi async không await (floating promise)

interface ProbeDb {
  $queryRawUnsafe: (query: string) => Promise<unknown[]>;
  auditLog: { create: (args: unknown) => Promise<unknown> };
}

export class AiReviewProbeService {
  constructor(private readonly db: ProbeDb) {}

  async listAuditRows(tableName: string): Promise<unknown[]> {
    // BUG 1: nối chuỗi input vào raw query → SQL injection
    return this.db.$queryRawUnsafe('SELECT * FROM "' + tableName + '"');
  }

  async bootstrap(): Promise<boolean> {
    // BUG 2: logEvent là async nhưng không await → floating promise, lỗi bị nuốt
    this.logEvent('bootstrap');
    return true;
  }

  private async logEvent(event: string): Promise<void> {
    await this.db.auditLog.create({ data: { event } });
  }
}
