import { Response } from 'express';

export interface SseEvent {
  type: string;
  userId?: number;
  message?: string;
  data?: any;
}

export class SseService {
  private userClients: Map<number, Set<Response>> = new Map();

  addClient(userId: number, res: Response): void {
    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set());
    }
    this.userClients.get(userId)!.add(res);
  }

  removeClient(userId: number, res: Response): void {
    const clients = this.userClients.get(userId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        this.userClients.delete(userId);
      }
    }
  }

  emitToUser(userId: number, event: SseEvent): void {
    const clients = this.userClients.get(userId);
    if (!clients || clients.size === 0) return;

    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of clients) {
      try {
        client.write(payload);
      } catch (err) {
        console.error(`Failed to send SSE to user ${userId}:`, err);
      }
    }
  }

  broadcast(event: SseEvent): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const clients of this.userClients.values()) {
      for (const client of clients) {
        try {
          client.write(payload);
        } catch (err) {
          console.error('Failed to broadcast SSE:', err);
        }
      }
    }
  }
}

export const sseService = new SseService();
