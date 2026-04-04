export const LogLevel = {
  ERROR: 'ERROR',
  INFO: 'INFO',
  WARN: 'WARN',
  DEBUG: 'DEBUG',
} as const;

export type VantmetryLogLevel = (typeof LogLevel)[keyof typeof LogLevel];
export type LogDetails = Record<string, unknown>;

export interface VantmetryInstance {
  isReady: boolean;
  error: (message: string | unknown, details?: LogDetails) => void;
  warn: (message: string, details?: LogDetails) => void;
  info: (message: string, details?: LogDetails) => void;
  debug: (message: string, details?: LogDetails) => void;
  flush: () => Promise<void>;
}

declare global {
  interface Window {
    Vantmetry?: VantmetryInstance;
    onVantmetryReady?: (instance: VantmetryInstance) => void;
  }
}

export interface LogPayload {
  message: string | Event | unknown;
  severity: VantmetryLogLevel;
  type?: string;
  stack?: string;
  loc?: string;
  trace_id?: string;
  details?: LogDetails;
}

export interface LogItem extends LogPayload {
  count: number;
  ts: number;
  url: string;
  ua: string;
}

export interface VantmetryConfig {
  publicKey: string;
  ingestorUrl?: string;
}
