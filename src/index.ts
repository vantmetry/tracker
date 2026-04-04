import { getInstance } from './core/singleton';
import type { VantmetryInstance } from './core/types';

export { init } from './core/init';
export { VantmetryTracker } from './core/tracker';
export { initGlobalListeners } from './core/listeners';
export type { VantmetryConfig, LogDetails, VantmetryInstance, VantmetryLogLevel } from './core/types';

export const logger: VantmetryInstance = {
  get isReady() {
    return getInstance().isReady;
  },
  error(message, details) {
    getInstance().error(message, details);
  },
  warn(message, details) {
    getInstance().warn(message, details);
  },
  info(message, details) {
    getInstance().info(message, details);
  },
  debug(message, details) {
    getInstance().debug(message, details);
  },
  flush() {
    return getInstance().flush();
  },
};
