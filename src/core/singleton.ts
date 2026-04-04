import type { VantmetryTracker } from './tracker';

let instance: VantmetryTracker | null = null;

export function setInstance(tracker: VantmetryTracker): void {
  instance = tracker;
}

export function getInstance(): VantmetryTracker {
  if (!instance) {
    throw new Error('[Vantmetry] Not initialized. Call init() before using logger.');
  }
  return instance;
}

export function isInitialized(): boolean {
  return instance !== null;
}
