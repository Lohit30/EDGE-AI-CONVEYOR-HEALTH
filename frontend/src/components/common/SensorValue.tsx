// =============================================================================
// SensorValue — compact digital value + unit + engineering state
// =============================================================================

import React from 'react';
import type { EngineState } from '../../types/telemetry';
import './SensorValue.css';

interface SensorValueProps {
  label: string;
  value: number | string;
  unit?: string;
  state?: EngineState;
  /** Decimal places for numeric values */
  decimals?: number;
  /** Optional subtext (e.g. secondary measurement) */
  subtext?: string;
}

export const SensorValue: React.FC<SensorValueProps> = ({
  label,
  value,
  unit,
  state = 'NORMAL',
  decimals = 2,
  subtext,
}) => {
  const displayValue =
    typeof value === 'number' ? value.toFixed(decimals) : value;

  return (
    <div className={`sv sv--${state.toLowerCase()}`}>
      <div className="sv__label">{label}</div>
      <div className="sv__value-row">
        <span className="sv__value">{displayValue}</span>
        {unit && <span className="sv__unit">{unit}</span>}
      </div>
      {subtext && <div className="sv__subtext">{subtext}</div>}
      <div className={`sv__state-bar sv__state-bar--${state.toLowerCase()}`} />
    </div>
  );
};
