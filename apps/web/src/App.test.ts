import { describe, expect, it } from 'vitest';
import { messages, resolveBrowserLocale } from './i18n';

describe('Viralab landing page i18n', () => {
  it('communicates the product positioning in English', () => {
    expect(messages.en.hero.eyebrow).toBe('YOUTUBE OPPORTUNITY INTELLIGENCE');
    expect(messages.en.hero.title).toContain('Spot breakout opportunities');
    expect(messages.en.hero.emphasis).toContain('before the market catches up');
  });

  it('ships the initial opportunity signals in both locales', () => {
    expect(messages.en.opportunities.breakoutTitle).toBe('Breakout Channels');
    expect(messages.en.opportunities.outlierTitle).toBe('Video Outliers');
    expect(messages['pt-BR'].opportunities.nicheTitle).toBe('Momento de Nicho');
  });

  it('resolves Brazilian Portuguese and falls back to English', () => {
    expect(resolveBrowserLocale(['pt-BR', 'en-US'])).toBe('pt-BR');
    expect(resolveBrowserLocale(['en-US'])).toBe('en');
    expect(resolveBrowserLocale(['es-ES'])).toBe('en');
  });
});
