export interface RateLimitBinding { limit(input: { key: string }): Promise<{ success: boolean }> }
export type RateLimitDecision = { allowed: boolean; retryAfterSeconds: number };

const encoder = new TextEncoder();
const toHex = (bytes: ArrayBuffer): string => Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');

export const sha256Key = async (namespace: string, value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${namespace}:\0${value}`));
  return toHex(digest);
};

export const consumeRateLimit = async (binding: RateLimitBinding, key: string, retryAfterSeconds: number): Promise<RateLimitDecision> => {
  const result = await binding.limit({ key });
  return { allowed: result.success, retryAfterSeconds };
};
