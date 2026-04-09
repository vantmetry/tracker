import type { VantmetryConfig } from './types';

const DEFAULT_INGESTOR_URL = 'https://ingestor.vantmetry.com:4433';

export class TransportManager {
  private wtSession: WebTransport | null = null;
  private wtInitPromise: Promise<void> | null = null;
  private readonly endpoint: string;
  private readonly wtEndpoint: string;
  private readonly debug: boolean;

  constructor(config: VantmetryConfig) {
    const base = (config.ingestorUrl ?? DEFAULT_INGESTOR_URL).replace(/\/$/, '');
    this.endpoint = `${base}/api/ingestor/push/tcp?public_key=${config.publicKey}`;
    this.wtEndpoint = `${base}/api/ingestor/push/udp?public_key=${config.publicKey}`;

    try {
      this.debug = typeof window !== 'undefined' && !!window.localStorage?.getItem('vantmetry_debug');
    } catch {
      this.debug = false;
    }
  }

  private initWT(): Promise<void> {
    if (this.wtInitPromise) {
      return this.wtInitPromise;
    }
    this.wtInitPromise = this.connectWT();
    return this.wtInitPromise;
  }

  private async connectWT(): Promise<void> {
    if (!('WebTransport' in window)) {
      return;
    }

    // Give browser a short moment to process Alt-Svc from previous visits
    await new Promise((r) => setTimeout(r, 200));

    // Now attempt WebTransport - browser should know to use HTTP/3
    try {
      this.wtSession = new WebTransport(this.wtEndpoint);
      await this.wtSession.ready;
      if (this.debug) {
        console.log('WT: Connected');
      }
    } catch (err) {
      if (this.debug) {
        console.warn('WT: Failed, falling back to beacon', err);
      }
      this.wtSession = null;
    }
  }

  public async send(payload: string): Promise<void> {
    await this.initWT();

    if (this.wtSession) {
      try {
        const stream = await this.wtSession.createUnidirectionalStream();
        const writer = stream.getWriter();
        await writer.write(new TextEncoder().encode(payload));
        await writer.close();
        return;
      } catch (err) {
        if (this.debug) {
          console.warn('WT: Failed, falling back to beacon', err);
        }
        this.wtSession = null;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(this.endpoint, blob)) {
        return;
      }
    }

    fetch(this.endpoint, {
      method: 'POST',
      body: payload,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    }).catch((error) => {
      if (this.debug) {
        console.error('Vantmetry send failed', error);
      }
    });
  }

  public close() {
    if (this.wtSession) {
      this.wtSession.close();
      this.wtSession = null;
    }
  }
}
