# vantmetry

Lightweight browser error tracking. Captures JavaScript errors, console errors, and unhandled promise rejections with zero blocking of the main thread.

## Install

```bash
npm i vantmetry
```

Or use the CDN script tag — see [vantmetry.com/docs](https://vantmetry.com/docs).

## Quick start

```ts
import { init } from 'vantmetry';

init({ publicKey: 'vpk_your_key' });
```

That's it. Errors are auto-captured from that point on. See [vantmetry.com/docs](https://vantmetry.com/docs) for full configuration, React/Next.js integrations, manual logging, and PII masking details.

## Source

The full TypeScript source is in the `src/` directory of this package and on [GitHub](https://github.com/vantmetry/tracker).
