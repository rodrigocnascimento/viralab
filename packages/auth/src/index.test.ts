import { describe, expect, it, vi } from 'vitest';
import { requireAuth, verifyOptionalSupabaseAuth } from './index.js';

describe('auth', () => {
  it('returns null when no bearer token is supplied', async () => {
    await expect(verifyOptionalSupabaseAuth(new Request('https://api.example.com'), {
      supabaseUrl: 'https://project.supabase.co', publishableKey: 'publishable',
    })).resolves.toBeNull();
  });

  it('verifies bearer tokens with Supabase and maps provider-neutral context', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({
      id: '11111111-1111-4111-8111-111111111111', email: 'user@example.com', app_metadata: { provider: 'google' },
    }), { status: 200 }));
    const auth = await verifyOptionalSupabaseAuth(new Request('https://api.example.com', {
      headers: { authorization: 'Bearer token' },
    }), { supabaseUrl: 'https://project.supabase.co/', publishableKey: 'publishable', fetch });
    expect(auth).toEqual({ userId: '11111111-1111-4111-8111-111111111111', email: 'user@example.com', provider: 'google' });
    expect(fetch).toHaveBeenCalledWith('https://project.supabase.co/auth/v1/user', expect.objectContaining({
      headers: { apikey: 'publishable', authorization: 'Bearer token' },
    }));
  });

  it('rejects invalid tokens and missing required auth', async () => {
    await expect(verifyOptionalSupabaseAuth(new Request('https://api.example.com', { headers: { authorization: 'Bearer bad' } }), {
      supabaseUrl: 'https://project.supabase.co', publishableKey: 'publishable', fetch: async () => new Response(null, { status: 401 }),
    })).rejects.toThrow('invalid_access_token');
    expect(() => requireAuth(null)).toThrow('authentication_required');
  });
});
