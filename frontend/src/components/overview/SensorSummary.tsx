// =============================================================================
// SensorSummary — compact live sensor readings grid
// =============================================================================

import React from 'react';
import type { TelemetryFrame } from '../../types/telemetry';
import { SensorValue } from '../common/SensorValue';
import './SensorSummary.css';

interface SensorSummaryProps {
  frame: TelemetryFrame;
}

export const SensorSummary: React.FC<SensorSummaryProps> = ({ frame }) => {
  return (
    <div className="ss">
      <SensorValue
        label="Vibration RMS"
        value={frame.vibration.rms}
        unit="m/s²"
        state={frame.vibration.state}
        decimals={2}
        subtext={`Peak: ${frame.vibration.peak.toFixed(2)}`}
      />
      <SensorValue
        label="Load (Total)"
        value={frame.load.totalKg}
        unit="kg"
        state={frame.load.state}
        decimals={1}
        subtext={`LC1: ${frame.load.cell1Kg.toFixed(1)}  LC2: ${frame.load.cell2Kg.toFixed(1)}`}
      />
      <SensorValue
        label="Belt Speed"
        value={frame.beltSpeed.speedMs}
        unit="m/s"
        state={frame.beltSpeed.state}
        decimals={2}
        subtext={`Motor: ${frame.beltSpeed.motorRpm} RPM`}
      />
      <SensorValue
        label="Voltage"
        value={frame.electrical.voltageV}
        unit="V"
        state={frame.electrical.state}
        decimals={1}
      />
      <SensorValue
        label="Current"
        value={frame.electrical.currentA}
        unit="A"
        state={frame.electrical.state}
        decimals={2}
      />
      <SensorValue
        label="Power"
        value={frame.electrical.powerW}
        unit="W"
        state={frame.electrical.state}
        decimals={1}
      />
    </div>
  );
};
