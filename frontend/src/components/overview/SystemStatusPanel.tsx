// =============================================================================
// SystemStatusPanel — Matches reference image SYSTEM STATUS card
// =============================================================================

import React from 'react';
import './SystemStatusPanel.css';

interface SystemStatusPanelProps {
  conveyorStatus?: string;
  motorStatus?: string;
  sensorsStatus?: string;
  commStatus?: string;
}

export const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({
  conveyorStatus = 'Normal',
  motorStatus = 'Normal',
  sensorsStatus = 'Normal',
  commStatus = 'Normal',
}) => {
  const items = [
    { label: 'Conveyor', status: conveyorStatus },
    { label: 'Motor', status: motorStatus },
    { label: 'Sensors', status: sensorsStatus },
    { label: 'Communication', status: commStatus },
  ];

  return (
    <div className="scada-sys-panel">
      <div className="scada-sys-header">
        <span className="scada-sys-title">SYSTEM STATUS</span>
      </div>

      <div className="scada-sys-list">
        {items.map((it) => (
          <div key={it.label} className="scada-sys-row">
            <span className="scada-sys-label">{it.label}</span>
            <div className="scada-sys-val-wrap">
              <span className="scada-sys-dot" />
              <span className="scada-sys-val">{it.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
