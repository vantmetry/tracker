import React from 'react';
import Script from 'next/script';
import { init, type VantmetryConfig } from '../index';

/**
 * Drop this into your Next.js layout or _document to load the tracker via CDN.
 * Uses next/script so Next.js controls placement and loading strategy.
 */
export function VantmetryScript({ publicKey, ingestorUrl }: VantmetryConfig) {
  return (
    <Script
      strategy="afterInteractive"
      data-vantmetry-key={publicKey}
      data-vantmetry-url={ingestorUrl}
      src="https://cdn.vantmetry.com/tracker.js"
    />
  );
}

/**
 * SSR-safe wrapper around init(). Use this in _app.tsx, app/layout.tsx client
 * components, or anywhere module-level code may run on the server.
 */
export function initVantmetry(config: VantmetryConfig): void {
  if (typeof window === 'undefined') {
    return;
  }
  init(config);
}
