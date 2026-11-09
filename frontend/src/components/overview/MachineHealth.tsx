// =============================================================================
// MachineHealth — condition status section
// =============================================================================
// Shows overall machine state and condition indicators.
// Does NOT include any ML/predictive health score — that will be implemented
// when the predictive ML model is trained and integrated.
// =============================================================================

import React from 'react';
import type { TelemetryFrame } from '../../types/telemetry';
import './MachineHealth.css';

interface MachineHealthProps {
  frame: TelemetryFrame;
}

interface ConditionRow {
  label: string;
  state: string;
  value: string;
}

export const MachineHealth: React.FC<MachineHealthProps> = ({ frame }) => {
  const conditions: ConditionRow[] = [
    {
      label: 'Vibration',
      state: frame.vibration.state,
      value: `${frame.vibration.rms.toFixed(2)} m/s²`,
    },
    {
      label: 'Load',
      state: frame.load.state,
      value: `${frame.load.totalKg.toFixed(1)} kg`,
    },
    {
      label: 'Belt Speed',
      state: frame.beltSpeed.state,
      value: `${frame.beltSpeed.speedMs.toFixed(2)} m/s`,
    },
    {
      label: 'Electrical',
      state: frame.electrical.state,
      value: `${frame.electrical.voltageV.toFixed(1)} V`,
    },
  ];

  const overallState = frame.machineState;
  const stateLabelCls = machineStateBadgeCls(overallState);

  return (
    <div className="mh">
      {/* Overall state */}
      <div className="mh__overall">
        <div className="mh__overall-label">MACHINE STATE</div>
        <div className={`mh__overall-state ${stateLabelCls}`}>
          <span className="mh__state-dot" />
          {overallState}
        </div>
        {frame.isMock && (
          <div className="mh__mock-note">⚠ DEMO — not connected to backend</div>
        )}
      </div>

      <hr className="divider" />

      {/* Condition indicators */}
      <div className="mh__rows">
        {conditions.map(c => (
          <div key={c.label} className="mh__row">
            <span className={`mh__row-dot mh__row-dot--${c.state.toLowerCase()}`} />
            <span className="mh__row-label">{c.label}</span>
            <span className={`mh__row-state mh__row-state--${c.state.toLowerCase()}`}>{c.state}</span>
            <span className="mh__row-value">{c.value}</span>
          </div>
        ))}
      </div>

      <hr className="divider" />

      {/* Predictive health placeholder */}
      <div className="mh__predictive">
        <div className="mh__predictive-label">PREDICTIVE HEALTH</div>
        <div className="mh__predictive-pending">
          ML model not yet trained — predictive health will be available after
          sufficient sensor history is collected.
        </div>
      </div>
    </div>
  );
};

function machineStateBadgeCls(state: string): string {
  switch (state) {
    case 'RUNNING':  return 'mh__overall-state--running';
    case 'WARNING':  return 'mh__overall-state--warning';
    case 'CRITICAL':
    case 'FAULT':    return 'mh__overall-state--critical';
    default:         return 'mh__overall-state--stopped';
  }
}
