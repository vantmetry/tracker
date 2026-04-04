// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initGlobalListeners } from './listeners';
import { VantmetryTracker } from './tracker';

describe('Global Error Listeners (init.ts)', () => {
  let mockTracker: Partial<VantmetryTracker>;

  beforeEach(() => {
    mockTracker = {
      captureAutoError: vi.fn(),
      flush: vi.fn().mockResolvedValue(undefined),
    };

    // Silence console.error so tests don't spam output
    vi.spyOn(console, 'error').mockImplementation(() => { /* empty */ });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should capture unhandled exceptions via window.addEventListener("error")', () => {
    initGlobalListeners(mockTracker as VantmetryTracker);

    const errorEvent = new ErrorEvent('error', {
      message: 'Test uncaught error',
      filename: 'script.js',
      lineno: 10,
      colno: 5,
      error: new Error('Test uncaught error stack'),
    });

    window.dispatchEvent(errorEvent);

    expect(mockTracker.captureAutoError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'crash',
        message: 'Test uncaught error',
        loc: 'script.js:10:5',
      })
    );
  });

  it('should capture missing properties errors (TypeError simulated)', () => {
    initGlobalListeners(mockTracker as VantmetryTracker);

    // Simulate typical unhandled TypeError that doesn't provide an Error instance 
    // cleanly in some environments (simulating cross-origin or old browers fallback)
    const errorEvent = new ErrorEvent('error', {
      message: 'Uncaught TypeError: Cannot read properties of undefined (reading \'staticUrl\')',
      filename: 'bootstrap.js',
      lineno: 10,
      colno: 15,
    });

    window.dispatchEvent(errorEvent);

    expect(mockTracker.captureAutoError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'crash',
        message: 'Uncaught TypeError: Cannot read properties of undefined (reading \'staticUrl\')',
        loc: 'bootstrap.js:10:15',
      })
    );
  });

  it('should capture unhandled promise rejections', () => {
    initGlobalListeners(mockTracker as VantmetryTracker);

    // jsdom does not have PromiseRejectionEvent, so we mock it
    const mockPromise = Promise.reject('Test rejection');
    mockPromise.catch(() => { /* empty */ }); // prevent node from crashing on the unhandled mock

    const promiseEvent = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(promiseEvent, 'reason', { value: 'Test promise rejection reason' });
    Object.defineProperty(promiseEvent, 'promise', { value: mockPromise });

    window.dispatchEvent(promiseEvent);

    expect(mockTracker.captureAutoError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'promise',
        message: 'Test promise rejection reason',
      })
    );
  });
});
