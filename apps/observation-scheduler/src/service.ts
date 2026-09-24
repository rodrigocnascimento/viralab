import type { ObservationQueueMessage } from '@viralab/shared';

export interface DueObservation {
  id: string;
  entityType: string;
  entityId: string;
  provider: string;
  providerEntityId: string;
  lifecycleState: string;
  samplingIntervalSeconds: number | null;
}

export interface ObservationSchedulePersistence {
  listDue(input: { now: Date; limit: number }): Promise<DueObservation[]>;
  claim(input: { id: string; now: Date; leaseOwner: string; leaseExpiresAt: Date }): Promise<DueObservation | null>;
  advance(input: { id: string; leaseOwner: string; nextObservationAt: Date; now: Date }): Promise<void>;
  release(input: { id: string; leaseOwner: string; now: Date }): Promise<void>;
}

export interface QuotaPersistence {
  reserve(input: { provider: string; quotaDate: string; workloadClass: string; units: number; limit: number; now: Date }): Promise<boolean>;
  release(input: { provider: string; quotaDate: string; workloadClass: string; units: number; now: Date }): Promise<void>;
}

export const scheduleObservations = async (deps: {
  schedules: ObservationSchedulePersistence;
  quota: QuotaPersistence;
  enqueue: (message: ObservationQueueMessage) => Promise<void>;
  limits: { channel: number; video: number };
  costs: { channel: number; video: number };
  batchSize: number;
  leaseSeconds: number;
  now?: () => Date;
  randomUUID?: () => string;
}): Promise<{ admitted: number; deferred: number; skipped: number }> => {
  const now = deps.now?.() ?? new Date();
  const quotaDate = now.toISOString().slice(0, 10);
  const uuid = deps.randomUUID ?? crypto.randomUUID.bind(crypto);
  const leaseOwner = uuid();
  const due = await deps.schedules.listDue({ now, limit: deps.batchSize });
  let admitted = 0, deferred = 0, skipped = 0;

  for (const candidate of due) {
    if ((candidate.lifecycleState !== 'ACTIVE' && candidate.lifecycleState !== 'COLD') ||
        !candidate.samplingIntervalSeconds || candidate.samplingIntervalSeconds <= 0 ||
        (candidate.entityType !== 'channel' && candidate.entityType !== 'video') ||
        candidate.provider !== 'youtube') {
      skipped += 1;
      continue;
    }
    const claimed = await deps.schedules.claim({
      id: candidate.id, now, leaseOwner,
      leaseExpiresAt: new Date(now.getTime() + deps.leaseSeconds * 1000),
    });
    if (!claimed) { skipped += 1; continue; }

    const workloadClass = candidate.entityType === 'channel' ? 'channel_observation' : 'video_observation';
    const units = candidate.entityType === 'channel' ? deps.costs.channel : deps.costs.video;
    const limit = candidate.entityType === 'channel' ? deps.limits.channel : deps.limits.video;
    const reserved = await deps.quota.reserve({
      provider: candidate.provider, quotaDate, workloadClass, units, limit, now,
    });
    if (!reserved) {
      deferred += 1;
      await deps.schedules.release({ id: candidate.id, leaseOwner, now });
      continue;
    }

    const jobId = uuid();
    try {
      await deps.enqueue({
        version: 1, type: 'content.observation.requested', provider: 'youtube',
        entityType: candidate.entityType, entityId: candidate.entityId, providerEntityId: candidate.providerEntityId,
        jobId, correlationId: jobId, requestedAt: now.toISOString(), source: 'scheduler',
        quota: { date: quotaDate, workloadClass, units },
      });
      await deps.schedules.advance({
        id: candidate.id, leaseOwner,
        nextObservationAt: new Date(now.getTime() + candidate.samplingIntervalSeconds * 1000), now,
      });
      admitted += 1;
    } catch (error) {
      await deps.quota.release({ provider: candidate.provider, quotaDate, workloadClass, units, now });
      await deps.schedules.release({ id: candidate.id, leaseOwner, now });
      throw error;
    }
  }
  return { admitted, deferred, skipped };
};
