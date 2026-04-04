import { VantmetryTracker } from './tracker';
import { initGlobalListeners } from './listeners';
import { setInstance, isInitialized } from './singleton';
import type { VantmetryConfig } from './types';

export function init(config: VantmetryConfig): void {
  if (isInitialized()) {
    return;
  }
  const tracker = new VantmetryTracker(config);
  setInstance(tracker);
  initGlobalListeners(tracker);
}
