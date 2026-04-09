import type { LogItem, LogPayload, VantmetryInstance, LogDetails, VantmetryConfig } from './types';
import { LogLevel } from './types';
import { TransportManager } from './transport';
import { maskPII, maskObjectPII } from './privacy';

const BATCH_LIMIT = 50;
const FLUSH_INTERVAL = 2000;

export class VantmetryTracker implements VantmetryInstance {
  private buffer: Array<LogItem> = [];
  private flushTimer: number | null = null;
  private transport: TransportManager;
  public isReady = true;

  // Deduplication & Circuit Breaker
  private sentErrors = new Map<string, number>();
  private eventsThisSecond = 0;
  private lastResetTime = Date.now();
  private readonly TTL_MS = 60000;
  private readonly MAX_EVENTS_PER_SEC = 100;

  constructor(config: VantmetryConfig) {
    this.transport = new TransportManager(config);
  }

  // --- Public API ---

  public error(message: string | unknown, details?: LogDetails) {
    this.addToBuffer({ severity: LogLevel.ERROR, type: 'manual', message, details });
  }

  public warn(message: string, details?: LogDetails) {
    this.addToBuffer({ severity: LogLevel.WARN, type: 'manual', message, details });
  }

  public info(message: string, details?: LogDetails) {
    this.addToBuffer({ severity: LogLevel.INFO, type: 'manual', message, details });
  }

  public debug(message: string, details?: LogDetails) {
    this.addToBuffer({ severity: LogLevel.DEBUG, type: 'manual', message, details });
  }

  public async flush() {
    if (this.buffer.length === 0) {
      if (this.flushTimer) {
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
      }
      return;
    }

    const now = Date.now();
    for (const item of this.buffer) {
      this.sentErrors.set(this.getSignature(item), now);
    }

    // Clean up expired TTLs
    for (const [key, timestamp] of this.sentErrors.entries()) {
      if (now - timestamp >= this.TTL_MS) {
        this.sentErrors.delete(key);
      }
    }

    const dataPayload = JSON.stringify(this.buffer);
    this.buffer = []; // Clear immediately

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    await this.transport.send(dataPayload);
  }

  public async destroy() {
    this.transport.close();
    await this.flush();
  }

  // --- Internal Logic ---

  private addToBuffer(payload: LogPayload) {
    if (!this.isReady) {
      return;
    }

    const now = Date.now();

    // Emergency Circuit Breaker (Infinite Loop Protection)
    if (now - this.lastResetTime > 1000) {
      this.eventsThisSecond = 0;
      this.lastResetTime = now;
    }
    this.eventsThisSecond++;

    if (this.eventsThisSecond > this.MAX_EVENTS_PER_SEC) {
      this.isReady = false;
      console.error('[Vantmetry] Logging disabled to save browser CPU due to infinite loop detection.');
      return;
    }

    const signature = this.getSignature(payload);

    // Cross-flush Suppression
    const lastSent = this.sentErrors.get(signature);
    if (lastSent && now - lastSent < this.TTL_MS) {
      return; // Silently drop exact duplicates within TTL
    }

    // Intra-buffer Deduplication
    const existing = this.buffer.find((item) => this.getSignature(item) === signature);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      return;
    }

    let { message, stack } = payload;
    const { details } = payload;

    if (message instanceof Error) {
      stack = stack ?? message.stack;
      message = message.message || String(message);
    }

    const maskedMessage = typeof message === 'string' ? maskPII(message) : message;
    const maskedDetails = typeof details === 'object' ? maskObjectPII(details) : details;
    const maskedStack = typeof stack === 'string' ? maskPII(stack) : stack;

    this.buffer.push({
      ...payload,
      message: maskedMessage,
      details: maskedDetails,
      stack: maskedStack,
      count: 1,
      ts: Date.now(),
      url: window.location.href,
      ua: navigator.userAgent,
    });

    if (this.buffer.length >= BATCH_LIMIT) {
      void this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => void this.flush(), FLUSH_INTERVAL) as unknown as number;
    }
  }

  public captureAutoError(payload: LogPayload) {
    this.addToBuffer(payload);
  }

  private getSignature(item: { type?: string; severity: string; message: unknown }): string {
    return `${item.type}:${item.severity}:${item.message}`;
  }
}
