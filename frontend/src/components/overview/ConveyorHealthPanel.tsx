// =============================================================================
// ConveyorHealthPanel — Circular health gauge matching reference image
// =============================================================================

import React from 'react';
import './ConveyorHealthPanel.css';

export const ConveyorHealthPanel: React.FC = () => {
  const score = 87;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  
  // Percentages: Good 70%, Caution 20%, Critical 10%
  const goodLen = circumference * 0.70;
  const warnLen = circumference * 0.20;
  const critLen = circumference * 0.10;

  return (
    <div className="scada-health-panel">
      <div className="scada-health-header">
        <span className="scada-health-title">CONVEYOR HEALTH</span>
      </div>

      <div className="scada-health-body">
        {/* Circular Ring Graphic */}
        <div className="scada-health-ring-wrap">
          <svg viewBox="0 0 100 100" className="scada-health-svg">
            {/* Background ring */}
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#16202c" strokeWidth="9" />
            
            {/* Good segment (green) */}
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke="#22c55e"
              strokeWidth="9"
              strokeDasharray={`${goodLen} ${circumference}`}
              strokeDashoffset={circumference * 0.25}
              strokeLinecap="round"
            />
            {/* Caution segment (yellow) */}
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="9"
              strokeDasharray={`${warnLen} ${circumference}`}
              strokeDashoffset={circumference * 0.25 - goodLen}
              strokeLinecap="round"
            />
            {/* Critical segment (red) */}
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke="#ef4444"
              strokeWidth="9"
              strokeDasharray={`${critLen} ${circumference}`}
              strokeDashoffset={circumference * 0.25 - goodLen - warnLen}
              strokeLinecap="round"
            />

            {/* Score in center */}
            <text x="50" y="48" fill="#ffffff" fontSize="22" fontFamily="var(--font-mono)" fontWeight="700" textAnchor="middle">
              {score}
            </text>
            <text x="50" y="63" fill="#718298" fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle">
              / 100
            </text>
          </svg>
        </div>

        {/* Legend on right */}
        <div className="scada-health-legend">
          <div className="scada-health-leg-row">
            <div className="scada-health-leg-key">
              <span className="scada-health-dot scada-health-dot--good" />
              <span>Good</span>
            </div>
            <span className="scada-health-leg-val">70%</span>
          </div>
          <div className="scada-health-leg-row">
            <div className="scada-health-leg-key">
              <span className="scada-health-dot scada-health-dot--warn" />
              <span>Caution</span>
            </div>
            <span className="scada-health-leg-val">20%</span>
          </div>
          <div className="scada-health-leg-row">
            <div className="scada-health-leg-key">
              <span className="scada-health-dot scada-health-dot--crit" />
              <span>Critical</span>
            </div>
            <span className="scada-health-leg-val">10%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
