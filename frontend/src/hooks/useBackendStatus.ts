// =============================================================================
// useBackendStatus — backend health-check hook
// Conveyor Belt Monitoring System
// =============================================================================
// Polls the FastAPI /health endpoint to determine connection state.
// Falls back to DISCONNECTED immediately if the backend is not reachable
// (e.g., during pure frontend development).
// =============================================================================

import { useState, useEffect } from 'react';
import type { ConnectionState } from '../types/telemetry';

function getBackendUrl(): string {
  if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    if (port === '5173' || port === '3000' || port === '4173') {
      return `http://${window.location.hostname}:8000`;
    }
    return '';
  }
  return 'http://localhost:8000';
}

const BACKEND_URL = getBackendUrl();
const POLL_INTERVAL_MS = 5000;

export interface BackendStatus {
  backend: ConnectionState;
  lastChecked: string | null;
}

export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>({
    backend: 'DISCONNECTED',
    lastChecked: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(2000) });
        if (!cancelled) {
          setStatus({
            backend: res.ok ? 'CONNECTED' : 'ERROR',
            lastChecked: new Date().toISOString(),
          });
        }
      } catch {
        if (!cancelled) {
          setStatus({
            backend: 'DISCONNECTED',
            lastChecked: new Date().toISOString(),
          });
        }
      }
    }

    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return status;
}
