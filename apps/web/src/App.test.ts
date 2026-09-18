import { describe, expect, it } from 'vitest';
import { messages } from './i18n';

describe('Viralab landing positioning', () => {
  it('names YouTube, baseline and a truthful early-access CTA in the hero', () => {
    expect(messages.en.hero.eyebrow).toBe('YOUTUBE OPPORTUNITY INTELLIGENCE');
    expect(messages.en.hero.title).toContain('YouTube');
    expect(messages.en.hero.title).toContain('baseline');
    expect(messages.en.hero.primary).toBe('Get early access');
    expect(messages.en.hero.secondary).toBe('See a live sample signal');
  });
  it('turns signal taxonomy into operator actions', () => {
    expect(messages.en.opportunities.breakoutAction).toContain('partnering');
    expect(messages.en.opportunities.outlierAction).toContain('pattern');
    expect(messages.en.opportunities.nicheAction).toContain('market');
  });
  it('keeps development status out of the hero', () => {
    expect(messages.en.hero).not.toHaveProperty('launchNote');
    expect(messages.en.footer.development).toContain('active development');
  });
});
