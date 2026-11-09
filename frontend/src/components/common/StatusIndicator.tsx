// =============================================================================
// StatusIndicator — LED-style state dot + label
// =============================================================================

import React from 'react';
import type { EngineState, ConnectionState } from '../../types/telemetry';
import './StatusIndicator.css';

type IndicatorState = EngineState | ConnectionState | 'RUNNING' | 'STOPPED' | 'FAULT';

interface StatusIndicatorProps {
  state: IndicatorState;
  label: string;
  /** Show label inline after dot */
  inline?: boolean;
  /** Pulse animation for active/critical states */
  pulse?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  state,
  label,
  inline = false,
  pulse = false,
}) => {
  const cls = stateClass(state);
  return (
    <div className={`si ${inline ? 'si--inline' : ''}`}>
      <span className={`si__dot si__dot--${cls}${pulse ? ' si__dot--pulse' : ''}`} />
      <span className="si__label">{label}</span>
    </div>
  );
};

function stateClass(state: IndicatorState): string {
  switch (state) {
    case 'NORMAL':
    case 'RUNNING':
    case 'CONNECTED':
      return 'normal';
    case 'WARNING':
    case 'RECONNECTING':
      return 'warning';
    case 'CRITICAL':
    case 'FAULT':
    case 'ERROR':
      return 'critical';
    case 'INFO':
      return 'info';
    case 'STOPPED':
    case 'OFFLINE':
    case 'DISCONNECTED':
    default:
      return 'offline';
  }
}
