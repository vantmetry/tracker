// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VantmetryTracker } from './tracker';

describe('VantmetryTracker Deduplication & Protections', () => {
  let tracker: VantmetryTracker;

  beforeEach(() => {
    tracker = new VantmetryTracker({
      publicKey: 'test-key',
      ingestorUrl: 'http://localhost:4002',
    });
    // Mock the transport to prevent actual network calls
    vi.spyOn(tracker['transport'], 'send').mockResolvedValue();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should deduplicate multiple identical events in the same buffer', () => {
    // Fire 10 identical errors
    for (let i = 0; i < 10; i++) {
      tracker.error('Identical intra-buffer error');
    }

    // Buffer should only have 1 item with count 10
    expect(tracker['buffer']).toHaveLength(1);
    expect(tracker['buffer'][0].count).toBe(10);
  });

  it('should suppress identical errors across flushes within TTL', async () => {
    tracker.error('Cross flush TTL error');
    await tracker.flush();

    expect(tracker['buffer']).toHaveLength(0);

    // Fire the same error again immediately
    tracker.error('Cross flush TTL error');

    // Because it's within TTL, it should be dropped silently
    expect(tracker['buffer']).toHaveLength(0);

    // Advance time past the 60,000ms TTL
    vi.advanceTimersByTime(60001);

    tracker.error('Cross flush TTL error');
    // Now it should be accepted again
    expect(tracker['buffer']).toHaveLength(1);
  });

  it('should trip emergency circuit breaker on 100+ events per second', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* empty */ });

    // Blast 100 distinct errors (which hits the limit threshold but doesn't pass it)
    for (let i = 0; i < 100; i++) {
      tracker.error(`Distinct error ${i}`);
    }

    expect(tracker.isReady).toBe(true);

    // The 101st error within the same second trips the breaker
    tracker.error('The straw that breaks the circuit');

    expect(tracker.isReady).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[Vantmetry] Logging disabled to save browser CPU due to infinite loop detection.'));

    // Any further errors are ignored immediately
    tracker.error('Should be ignored entirely');

    // Since BATCH_LIMIT is 50, flush triggers twice for the first 100.
    // The buffer should simply not grow after the circuit breaks.
  });
});
