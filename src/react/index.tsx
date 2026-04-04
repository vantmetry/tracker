import React, { createContext, useContext, useEffect, Component, type ReactNode } from 'react';
import { init, logger, type VantmetryConfig, type VantmetryInstance } from '../index';

const VantmetryContext = createContext<VantmetryInstance | null>(null);

interface VantmetryProviderProps extends VantmetryConfig {
  children: ReactNode;
}

/**
 * Initializes Vantmetry and makes the logger available via {@link useLogger}.
 */
export function VantmetryProvider({ publicKey, ingestorUrl, children }: VantmetryProviderProps) {
  useEffect(() => {
    init({ publicKey, ingestorUrl });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <VantmetryContext.Provider value={logger}>{children}</VantmetryContext.Provider>;
}

/**
 * Returns the Vantmetry logger. Must be called inside a {@link VantmetryProvider}.
 */
export function useLogger(): VantmetryInstance {
  const context = useContext(VantmetryContext);
  if (context === null) {
    throw new Error(
      'useLogger() was called outside of VantmetryProvider. Wrap your app with <VantmetryProvider publicKey="..." /> to use this hook.',
    );
  }
  return context;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered when a render error is caught. Defaults to null (renders nothing). */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches React render errors, logs them via Vantmetry, and renders the fallback.
 * Place around any subtree you want to protect.
 */
export class VantmetryErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error(error, { componentStack: info.componentStack ?? undefined });
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
