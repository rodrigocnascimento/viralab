import { utcQuotaWindow, type QuotaDecision } from '@viralab/rate-limit';

type DurableObjectStateLike = {
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put(key: string, value: unknown): Promise<void>;
  };
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
};

export class AnonymousQuota {
  constructor(private readonly state: DurableObjectStateLike) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
    const input = await request.json() as { limit?: unknown; now?: unknown };
    if (!Number.isInteger(input.limit) || Number(input.limit) < 1 || Number(input.limit) > 1000) {
      return Response.json({ error: 'invalid_limit' }, { status: 400 });
    }
    const now = typeof input.now === 'string' ? new Date(input.now) : new Date();
    if (Number.isNaN(now.getTime())) return Response.json({ error: 'invalid_time' }, { status: 400 });
    const limit = Number(input.limit);
    const window = utcQuotaWindow(now);

    const decision = await this.state.blockConcurrencyWhile(async (): Promise<QuotaDecision> => {
      const key = `count:${window.day}`;
      const count = (await this.state.storage.get<number>(key)) ?? 0;
      if (count >= limit) return { allowed: false, limit, remaining: 0, resetsAt: window.resetsAt };
      const next = count + 1;
      await this.state.storage.put(key, next);
      return { allowed: true, limit, remaining: Math.max(0, limit - next), resetsAt: window.resetsAt };
    });

    return Response.json(decision);
  }
}
