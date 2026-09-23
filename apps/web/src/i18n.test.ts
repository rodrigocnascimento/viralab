import { describe, expect, it } from 'vitest';
import { createI18n } from 'vue-i18n';
import { messages, resolveLocale } from './i18n';

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

describe('translation messages', () => {
  it('compiles literal email placeholders for both supported locales', () => {
    const instance = createI18n({
      legacy: false,
      locale: 'en',
      fallbackLocale: 'en',
      messages,
    });

    expect(instance.global.t('access.emailPlaceholder')).toBe('you@company.com');

    instance.global.locale.value = 'pt-BR';
    expect(instance.global.t('access.emailPlaceholder')).toBe('voce@empresa.com');
  });
});
