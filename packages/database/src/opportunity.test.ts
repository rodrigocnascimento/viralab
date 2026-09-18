import { describe, expect, it } from 'vitest';
import { scoreVideoOutlier } from './opportunity.js';

describe('scoreVideoOutlier', () => {
  it('scores relative performance with explainable baseline', () => {
    const result = scoreVideoOutlier({ videoViews: 5000n, channelViews: 100000n, channelVideos: 100n });
    expect(result?.baselineViews).toBe(1000n);
    expect(result?.multiplier).toBe(5);
    expect(result?.score).toBeGreaterThan(50);
    expect(result?.confidence).toBeGreaterThan(70);
  });
  it('rejects weak movement and unusable baselines', () => {
    expect(scoreVideoOutlier({ videoViews: 1200n, channelViews: 100000n, channelVideos: 100n })).toBeNull();
    expect(scoreVideoOutlier({ videoViews: 1200n, channelViews: 0n, channelVideos: 0n })).toBeNull();
  });
});
