import { describe, expect, it } from 'vitest';
import { resolveLocale } from './i18n';

describe('resolveLocale', () => {
  it('maps Brazilian Portuguese to pt-BR', () => {
    expect(resolveLocale(['pt-BR', 'pt', 'en-US'])).toBe('pt-BR');
  });

  it('maps generic Portuguese and other Portuguese regions to pt-BR', () => {
    expect(resolveLocale(['pt'])).toBe('pt-BR');
    expect(resolveLocale(['pt-PT'])).toBe('pt-BR');
  });

  it('respects browser language preference order', () => {
    expect(resolveLocale(['en-US', 'pt-BR'])).toBe('en');
    expect(resolveLocale(['pt-BR', 'en-US'])).toBe('pt-BR');
  });

  it('maps English variants to en', () => {
    expect(resolveLocale(['en-US'])).toBe('en');
    expect(resolveLocale(['en-GB'])).toBe('en');
  });

  it('falls back to English for unsupported or missing locales', () => {
    expect(resolveLocale(['es-ES'])).toBe('en');
    expect(resolveLocale([])).toBe('en');
  });
});
