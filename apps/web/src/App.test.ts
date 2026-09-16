import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./App.vue', import.meta.url), 'utf8');

describe('Viralab landing page', () => {
  it('communicates the product positioning', () => {
    expect(app).toContain('YOUTUBE OPPORTUNITY INTELLIGENCE');
    expect(app).toContain('Find the next viral');
  });

  it('presents the three initial opportunity signals', () => {
    expect(app).toContain('Breakout Channels');
    expect(app).toContain('Video Outliers');
    expect(app).toContain('Niche Opportunities');
  });

  it('explains the historical-data advantage', () => {
    expect(app).toContain("We're building the history");
    expect(app).toContain('Opportunity Engine');
  });
});
