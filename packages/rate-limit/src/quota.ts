export type QuotaDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetsAt: string;
};

export const utcQuotaWindow = (now: Date): { day: string; resetsAt: string } => {
  const day = now.toISOString().slice(0, 10);
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return { day, resetsAt: reset.toISOString() };
};

export const validAnonymousId = (value: string | null): value is string =>
  value !== null && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
