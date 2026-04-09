import { VantmetryTracker } from './tracker';
import { LogLevel } from './types';

export function initGlobalListeners(tracker: VantmetryTracker) {
  const originalConsoleError = console.error;
  console.error = function (...args: unknown[]) {
    originalConsoleError.apply(console, args);

    if ((tracker as unknown as Record<string, unknown>)['_isCapturingConsoleError']) return;
    (tracker as unknown as Record<string, unknown>)['_isCapturingConsoleError'] = true;

    try {
      let message: string;
      let stack: string | undefined;

      const errorIndex = args.findIndex((arg) => arg instanceof Error);
      const errorObj = args[errorIndex] as Error | undefined;
      if (errorObj) {
        const prefix = args
          .slice(0, errorIndex)
          .filter((a) => typeof a === 'string')
          .join(' ');
        message = prefix ? `${prefix}: ${errorObj.message || String(errorObj)}` : errorObj.message || String(errorObj);
        stack = errorObj.stack;
      } else {
        message = args
          .map((arg) => {
            if (typeof arg === 'string') return arg;
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          })
          .join(' ');
      }

      tracker.captureAutoError({
        type: 'console.error',
        message: message || 'Unknown console.error',
        stack: stack,
        severity: LogLevel.ERROR,
      });
    } finally {
      (tracker as unknown as Record<string, unknown>)['_isCapturingConsoleError'] = false;
    }
  };

  window.addEventListener('error', function (event: ErrorEvent) {
    tracker.captureAutoError({
      type: 'crash',
      message: event.message || 'Script error.',
      stack: event.error?.stack,
      loc: `${event.filename}:${event.lineno}:${event.colno}`,
      severity: LogLevel.ERROR,
    });
  }, { capture: true });

  window.addEventListener('unhandledrejection', function (event: PromiseRejectionEvent) {
    const reason = event.reason;
    const isError = reason instanceof Error;
    tracker.captureAutoError({
      type: 'promise',
      message: isError ? reason.message : String(reason),
      stack: isError ? reason.stack : new Error(`Unhandled rejection: ${String(reason)}`).stack,
      severity: LogLevel.ERROR,
    });
  }, { capture: true });

  // Flush on page unload or visibility change
  window.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      void tracker.flush();
    }
  });

  // Enable bfcache restoration by closing transport on navigate away
  window.addEventListener('pagehide', () => {
    void tracker.destroy();
  });
}
