// =============================================================================
// IndustrialGauge — High-precision SVG analog gauge (Stitch design)
// =============================================================================

import React from 'react';

interface GaugeConfig {
  /** Display label above the gauge */
  label: string;
  /** Current value */
  value: number;
  /** Unit string (mm/s, kg, m/s, A, V, W) */
  unit: string;
  /** Scale min/max values */
  scaleMin: number;
  scaleMax: number;
  /** Scale labels at 6 major graduation positions */
  scaleLabels: string[];
  /** Dial sub-text line 1 */
  dialLabel: string;
  /** Dial sub-text line 2 */
  dialSublabel: string;
  /** Gauge status: 'NORMAL' | 'WARNING' | 'CRITICAL' */
  status?: 'NORMAL' | 'WARNING' | 'CRITICAL';
  /** Optional setpoint to show */
  setpoint?: number;
  /** Green/yellow/red arc breakpoints as fraction of total range [greenEnd, yellowEnd] */
  arcBreaks?: [number, number];
}

export const IndustrialGauge: React.FC<GaugeConfig> = ({
  label,
  value,
  unit,
  scaleMin,
  scaleMax,
  scaleLabels,
  dialLabel,
  dialSublabel,
  status = 'NORMAL',
  setpoint,
}) => {
  const id = label.replace(/\s+/g, '').toLowerCase();
  // Needle rotation: -135° (min) to +135° (max) = 270° sweep
  const fraction = Math.max(0, Math.min(1, (value - scaleMin) / (scaleMax - scaleMin)));
  const needleAngle = -135 + fraction * 270;

  const statusColor = status === 'NORMAL' ? '#10b981' : status === 'WARNING' ? '#f59e0b' : '#ef4444';
  const statusTextColor = status === 'NORMAL' ? '#047857' : status === 'WARNING' ? '#92400e' : '#991b1b';

  return (
    <div className="bg-surface-container-lowest p-space-sm rounded-lg shadow-sm border border-outline-variant flex flex-col items-center justify-between">
      <div className="w-full flex items-center justify-between px-1 mb-1">
        <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase tracking-wider">{label}</span>
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border font-bold font-label-sm text-label-sm`}
          style={{ backgroundColor: `${statusColor}15`, color: statusTextColor, borderColor: `${statusColor}30` }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
          <span>{status}</span>
        </div>
      </div>
      <div className="relative w-36 h-36 my-0.5">
        <svg className="w-full h-full select-none drop-shadow" viewBox="0 0 160 160">
          <defs>
            <radialGradient id={`lightGaugeGrad_${id}`} cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="75%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </radialGradient>
            <linearGradient id={`bezelOuter_${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="30%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="70%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <linearGradient id={`needleGrad_${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          {/* Bezel */}
          <circle cx="80" cy="80" r="78" fill={`url(#bezelOuter_${id})`} stroke="#94a3b8" strokeWidth="1" />
          <circle cx="80" cy="80" r="74" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.75" />
          <circle cx="80" cy="80" r="71" fill={`url(#lightGaugeGrad_${id})`} stroke="#cbd5e1" strokeWidth="1" />
          {/* Corner screws */}
          {[[16,16],[144,16],[16,144],[144,144]].map(([cx,cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r={2.5} fill="#cbd5e1" stroke="#64748b" strokeWidth="0.5" />
              <line x1={cx-1.5} y1={cy} x2={cx+1.5} y2={cy} stroke="#475569" strokeWidth="0.6" />
            </g>
          ))}
          {/* Color arcs (green/yellow/red) */}
          <path d="M 38.3 121.7 A 59 59 0 0 1 66.2 22.6" fill="none" stroke="#10b981" strokeWidth="3.5" />
          <path d="M 66.2 22.6 A 59 59 0 0 1 129.3 47.7" fill="none" stroke="#f59e0b" strokeWidth="3.5" />
          <path d="M 129.3 47.7 A 59 59 0 0 1 121.7 121.7" fill="none" stroke="#ef4444" strokeWidth="3.5" />
          {/* Major graduations */}
          <g stroke="#1e293b" strokeLinecap="round">
            <line x1="41.1" y1="118.9" x2="47.5" y2="112.5" strokeWidth="1.8" />
            <line x1="27.3" y1="80.0" x2="36.3" y2="80.0" strokeWidth="1.8" />
            <line x1="41.1" y1="41.1" x2="47.5" y2="47.5" strokeWidth="1.8" />
            <line x1="80.0" y1="25.0" x2="80.0" y2="34.0" strokeWidth="1.8" />
            <line x1="118.9" y1="41.1" x2="112.5" y2="47.5" strokeWidth="1.8" />
            <line x1="121.7" y1="121.7" x2="115.3" y2="115.3" strokeWidth="1.8" />
          </g>
          {/* Minor graduations */}
          <g stroke="#64748b" strokeLinecap="round" strokeWidth="1">
            <line x1="32.1" y1="100.8" x2="37.7" y2="98.5" />
            <line x1="32.1" y1="59.2" x2="37.7" y2="61.5" />
            <line x1="59.2" y1="32.1" x2="61.5" y2="37.7" />
            <line x1="100.8" y1="32.1" x2="98.5" y2="37.7" />
            <line x1="127.9" y1="59.2" x2="122.3" y2="61.5" />
            <line x1="132.7" y1="80.0" x2="123.7" y2="80.0" />
            <line x1="127.9" y1="100.8" x2="122.3" y2="98.5" />
          </g>
          {/* Scale labels */}
          <text x="53" y="111" fill="#0f172a" fontFamily="IBM Plex Mono" fontSize="7" fontWeight="600" textAnchor="middle">{scaleLabels[0]}</text>
          <text x="42" y="82" fill="#0f172a" fontFamily="IBM Plex Mono" fontSize="7" fontWeight="600" textAnchor="middle">{scaleLabels[1]}</text>
          <text x="53" y="55" fill="#0f172a" fontFamily="IBM Plex Mono" fontSize="7" fontWeight="600" textAnchor="middle">{scaleLabels[2]}</text>
          <text x="80" y="45" fill="#0f172a" fontFamily="IBM Plex Mono" fontSize="7" fontWeight="600" textAnchor="middle">{scaleLabels[3]}</text>
          <text x="108" y="55" fill="#0f172a" fontFamily="IBM Plex Mono" fontSize="7" fontWeight="600" textAnchor="middle">{scaleLabels[4]}</text>
          <text x="107" y="111" fill="#0f172a" fontFamily="IBM Plex Mono" fontSize="7" fontWeight="600" textAnchor="middle">{scaleLabels[5]}</text>
          {/* Dial label */}
          <text x="80" y="102" fill="#334155" fontFamily="IBM Plex Mono" fontSize="6.5" fontWeight="600" textAnchor="middle">{dialLabel}</text>
          <text x="80" y="112" fill="#64748b" fontFamily="IBM Plex Mono" fontSize="5.5" textAnchor="middle">{dialSublabel}</text>
          {/* Needle */}
          <g transform={`rotate(${needleAngle} 80 80)`}>
            <polygon points="78.2,80 80,95 81.8,80" fill="#64748b" />
            <circle cx="80" cy="88" r="3" fill="#475569" />
            <polygon points="78.5,80 79.5,26 80.5,26 81.5,80" fill={`url(#needleGrad_${id})`} />
            <line x1="80" y1="26" x2="80" y2="45" stroke="#dc2626" strokeWidth="0.8" strokeLinecap="round" />
            <circle cx="80" cy="80" r="7.5" fill="#334155" stroke="#cbd5e1" strokeWidth="1.5" />
            <circle cx="80" cy="80" r="4" fill="#e2e8f0" />
            <circle cx="80" cy="80" r="1.8" fill="#0f172a" />
          </g>
        </svg>
      </div>
      <div className="bg-surface-container-low px-2 py-1 rounded flex items-baseline justify-center gap-1 w-full border border-outline-variant/40 mt-1">
        {setpoint !== undefined && (
          <span className="font-label-sm text-label-sm text-secondary font-mono mr-auto">SET:{setpoint.toFixed(2)}</span>
        )}
        <span className="font-metric-display text-metric-display text-on-surface font-bold">{value.toFixed(value < 10 ? 2 : 1)}</span>
        <span className="font-label-sm text-label-sm text-secondary font-mono">{unit}</span>
      </div>
    </div>
  );
};
