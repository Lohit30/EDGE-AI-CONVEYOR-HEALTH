// =============================================================================
// QuickInfoPanel — Key prototype info matching reference image
// =============================================================================

import React from 'react';
import './QuickInfoPanel.css';

export const QuickInfoPanel: React.FC = () => {
  const infoItems = [
    { label: 'Conveyor ID', val: 'CV-01' },
    { label: 'Location', val: 'Plant A - Line 1' },
    { label: 'Uptime (Today)', val: '6 h 24 min' },
    { label: 'Total Runtime', val: '432 h' },
    { label: 'Last Inspection', val: 'Apr 22, 2024 10:15' },
    { label: 'Next Maintenance', val: 'In 27 days' },
  ];

  return (
    <div className="scada-info-panel">
      <div className="scada-info-header">
        <span className="scada-info-title">QUICK INFO</span>
      </div>

      <div className="scada-info-list">
        {infoItems.map((it) => (
          <div key={it.label} className="scada-info-row">
            <span className="scada-info-label">{it.label}</span>
            <span className="scada-info-val">{it.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
