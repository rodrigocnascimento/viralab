import { utcQuotaWindow, type QuotaDecision } from '@viralab/rate-limit';

type DurableObjectStateLike = {
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put(entries: Record<string, unknown>): Promise<void>;
  };
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
};

type QuotaResult = QuotaDecision & { exhaustedBy?: 'browser' | 'ip' };

export class AnonymousQuota {
  constructor(private readonly state: DurableObjectStateLike) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
    const input = await request.json() as { browserKey?: unknown; browserLimit?: unknown; ipLimit?: unknown; now?: unknown };
    if (
      typeof input.browserKey !== 'string' || input.browserKey.length !== 64 ||
      !Number.isInteger(input.browserLimit) || Number(input.browserLimit) < 1 ||
      !Number.isInteger(input.ipLimit) || Number(input.ipLimit) < 1
    ) return Response.json({ error: 'invalid_quota_request' }, { status: 400 });

    const now = typeof input.now === 'string' ? new Date(input.now) : new Date();
    if (Number.isNaN(now.getTime())) return Response.json({ error: 'invalid_time' }, { status: 400 });
    const browserLimit = Number(input.browserLimit);
    const ipLimit = Number(input.ipLimit);
    const window = utcQuotaWindow(now);

    const decision = await this.state.blockConcurrencyWhile(async (): Promise<QuotaResult> => {
      const browserStorageKey = `browser:${input.browserKey}:${window.day}`;
      const ipStorageKey = `ip:${window.day}`;
      const browserCount = (await this.state.storage.get<number>(browserStorageKey)) ?? 0;
      const ipCount = (await this.state.storage.get<number>(ipStorageKey)) ?? 0;

      if (browserCount >= browserLimit) return { allowed: false, limit: browserLimit, remaining: 0, resetsAt: window.resetsAt, exhaustedBy: 'browser' };
      if (ipCount >= ipLimit) return { allowed: false, limit: browserLimit, remaining: 0, resetsAt: window.resetsAt, exhaustedBy: 'ip' };

      const nextBrowser = browserCount + 1;
      await this.state.storage.put({ [browserStorageKey]: nextBrowser, [ipStorageKey]: ipCount + 1 });
      return { allowed: true, limit: browserLimit, remaining: browserLimit - nextBrowser, resetsAt: window.resetsAt };
    });
    return Response.json(decision);
  }
}
