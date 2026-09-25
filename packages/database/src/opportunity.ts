export type VideoOutlierInput = {
  videoViews: bigint;
  channelViews: bigint;
  channelVideos: bigint;
};

export type VideoOutlierScore = {
  baselineViews: bigint;
  multiplier: number;
  score: number;
  confidence: number;
};

export const scoreVideoOutlier = (input: VideoOutlierInput): VideoOutlierScore | null => {
  if (input.videoViews <= 0n || input.channelViews <= 0n || input.channelVideos <= 0n) return null;

  // MVP baseline: lifetime channel views / published videos. It remains the production
  // model until a separately approved historical algorithm explicitly supersedes it.
  const baselineViews = input.channelViews / input.channelVideos;
  if (baselineViews <= 0n) return null;

  const multiplier = Number(input.videoViews) / Number(baselineViews);
  if (!Number.isFinite(multiplier) || multiplier < 1.5) return null;

  const signal = Math.log2(multiplier / 1.5 + 1);
  const score = Math.max(1, Math.min(100, Math.round(signal * 35)));
  const sampleConfidence = Math.min(1, Math.log10(Number(input.channelVideos) + 1) / 3);
  const confidence = Math.max(20, Math.min(95, Math.round(35 + sampleConfidence * 60)));

  return { baselineViews, multiplier, score, confidence };
};
