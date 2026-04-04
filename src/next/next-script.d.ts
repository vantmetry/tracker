declare module 'next/script' {
  import type { FC } from 'react';

  interface ScriptProps {
    id?: string;
    src?: string;
    strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload' | 'worker';
    onLoad?: () => void;
    onReady?: () => void;
    onError?: (error: Error) => void;
    [key: string]: unknown;
  }

  const Script: FC<ScriptProps>;
  export default Script;
}
