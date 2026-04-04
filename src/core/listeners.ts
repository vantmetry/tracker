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

      const errorObj = args.find((arg) => arg instanceof Error) as Error | undefined;
      if (errorObj) {
        message = errorObj.message || String(errorObj);
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
    tracker.captureAutoError({
      type: 'promise',
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      severity: LogLevel.ERROR,
    });
  }, { capture: true });

  // Flush on page unload
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      void tracker.flush();
    }
  });
}
