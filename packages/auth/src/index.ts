export type AuthContext = { userId: string; email: string | null; provider: string | null };

export type SupabaseUser = {
  id: string;
  email?: string | null;
  app_metadata?: { provider?: string };
};

export type VerifyAuthOptions = {
  supabaseUrl: string;
  publishableKey: string;
  fetch?: typeof globalThis.fetch;
};

const bearerToken = (request: Request): string | null => {
  const value = request.headers.get('authorization');
  if (!value) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(value);
  return match?.[1] ?? null;
};

export const verifyOptionalSupabaseAuth = async (
  request: Request,
  options: VerifyAuthOptions,
): Promise<AuthContext | null> => {
  const token = bearerToken(request);
  if (!token) return null;

  const fetcher = options.fetch ?? globalThis.fetch;
  const response = await fetcher(`${options.supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: options.publishableKey,
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error('invalid_access_token');
  const user = await response.json() as SupabaseUser;
  if (!user.id) throw new Error('invalid_access_token');

  return {
    userId: user.id,
    email: user.email ?? null,
    provider: user.app_metadata?.provider ?? null,
  };
};

export const requireAuth = (auth: AuthContext | null): AuthContext => {
  if (!auth) throw new Error('authentication_required');
  return auth;
};
