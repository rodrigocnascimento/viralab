import { describe, expect, it, vi } from 'vitest';
import { scheduleObservations, type DueObservation } from './service.js';

const due = (overrides: Partial<DueObservation> = {}): DueObservation => ({
  id: 'schedule-1', entityType: 'channel', entityId: '11111111-1111-4111-8111-111111111111',
  provider: 'youtube', providerEntityId: 'UC1', lifecycleState: 'ACTIVE', samplingIntervalSeconds: 21600,
  ...overrides,
});

describe('scheduleObservations', () => {
  it('does not emit archived work', async () => {
    const enqueue = vi.fn();
    const schedules = {
      listDue: vi.fn().mockResolvedValue([due({ lifecycleState: 'ARCHIVED' })]),
      claim: vi.fn(), advance: vi.fn(), release: vi.fn(),
    };
    const quota = { reserve: vi.fn(), release: vi.fn() };
    const result = await scheduleObservations({
      schedules, quota, enqueue, limits: { channel: 10, video: 10 }, costs: { channel: 1, video: 1 },
      batchSize: 10, leaseSeconds: 900, now: () => new Date('2026-09-24T12:00:00Z'),
      randomUUID: () => '22222222-2222-4222-8222-222222222222',
    });
    expect(result).toEqual({ admitted: 0, deferred: 0, skipped: 1 });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('defers without enqueueing when budget is exhausted', async () => {
    const candidate = due();
    const enqueue = vi.fn();
    const schedules = {
      listDue: vi.fn().mockResolvedValue([candidate]), claim: vi.fn().mockResolvedValue(candidate),
      advance: vi.fn(), release: vi.fn(),
    };
    const quota = { reserve: vi.fn().mockResolvedValue(false), release: vi.fn() };
    const result = await scheduleObservations({
      schedules, quota, enqueue, limits: { channel: 10, video: 10 }, costs: { channel: 1, video: 1 },
      batchSize: 10, leaseSeconds: 900, now: () => new Date('2026-09-24T12:00:00Z'),
      randomUUID: () => '22222222-2222-4222-8222-222222222222',
    });
    expect(result.deferred).toBe(1);
    expect(enqueue).not.toHaveBeenCalled();
    expect(schedules.release).toHaveBeenCalledOnce();
  });

  it('requests only the configured bounded due-work batch', async () => {
    const schedules = {
      listDue: vi.fn().mockResolvedValue([]), claim: vi.fn(), advance: vi.fn(), release: vi.fn(),
    };
    await scheduleObservations({
      schedules, quota: { reserve: vi.fn(), release: vi.fn() }, enqueue: vi.fn(),
      limits: { channel: 10, video: 10 }, costs: { channel: 1, video: 1 },
      batchSize: 37, leaseSeconds: 900, now: () => new Date('2026-09-24T12:00:00Z'),
      randomUUID: () => '22222222-2222-4222-8222-222222222222',
    });
    expect(schedules.listDue).toHaveBeenCalledWith({ now: new Date('2026-09-24T12:00:00Z'), limit: 37 });
  });
});
