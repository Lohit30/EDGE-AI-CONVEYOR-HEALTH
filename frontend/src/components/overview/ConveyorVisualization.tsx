// =============================================================================
// ConveyorVisualization — High-Fidelity 3D-Styled SVG Industrial Conveyor
// Pure SVG + CSS animations with real-time dynamic telemetry overlays.
// No static images. Fully reactive to live sensor measurements and machine states.
// =============================================================================

import React from 'react';
import type { MachineState } from '../../types/telemetry';
import './ConveyorVisualization.css';

interface ConveyorVisualizationProps {
  machineState?: MachineState;
  beltSpeedMs?: number;
  vibrationRms?: number;
  load1Kg?: number;
  load2Kg?: number;
}

export const ConveyorVisualization: React.FC<ConveyorVisualizationProps> = ({
  machineState = 'RUNNING',
  beltSpeedMs = 0.43,
  vibrationRms = 2.31,
  load1Kg = 0.86,
  load2Kg = 0.86,
}) => {
  const isRunning = machineState === 'RUNNING' || machineState === 'WARNING';
  const isVibWarn = vibrationRms >= 6.0;
  const isSpeedWarn = beltSpeedMs > 0.6 || beltSpeedMs < 0.2;

  // Animation duration inversely proportional to speed
  const animDuration = beltSpeedMs > 0 ? Math.max(0.4, (0.8 / beltSpeedMs)) : 9999;

  return (
    <div className="scada-conveyor-panel">
      <div className="scada-conveyor-header">
        <span className="scada-conveyor-title">CONVEYOR SYSTEM (LIVE)</span>
        <div className="scada-conveyor-tags">
          <span className={`scada-conveyor-state-tag scada-conveyor-state-tag--${machineState.toLowerCase()}`}>
            {machineState}
          </span>
        </div>
      </div>

      <div className="scada-conveyor-stage">
        <svg
          viewBox="0 0 880 230"
          className={`scada-conveyor-svg ${isRunning ? 'is-running' : ''}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* ── Gradients ─────────────────────────────────────────────── */}
            {/* Steel Frame I-Beam Gradient */}
            <linearGradient id="frame-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="85%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Cylindrical Roller Metallic Gradient */}
            <linearGradient id="roller-cyl" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="20%" stopColor="#64748b" />
              <stop offset="45%" stopColor="#cbd5e1" />
              <stop offset="65%" stopColor="#475569" />
              <stop offset="90%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Roller Face Ellipse Radial */}
            <radialGradient id="roller-face" cx="45%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="45%" stopColor="#334155" />
              <stop offset="85%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>

            {/* Vulcanized Rubber Belt Gradient */}
            <linearGradient id="belt-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="25%" stopColor="#1e293b" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Motor Blue Metallic */}
            <linearGradient id="motor-casing" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="30%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#1d4ed8" />
              <stop offset="90%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Motor Fin Shading */}
            <linearGradient id="motor-fin-shade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#172554" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>

            {/* Load Cell Aluminum Billet */}
            <linearGradient id="loadcell-mat" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="40%" stopColor="#cbd5e1" />
              <stop offset="80%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Glowing Shadow Filters */}
            <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#22c55e" floodOpacity="0.8" />
            </filter>
            <filter id="glow-warn" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.8" />
            </filter>
            <filter id="glow-crit" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 1: STRUCTURAL BASE & PEDESTALS (SHADOW & FEET)
              ══════════════════════════════════════════════════════════════════ */}
          {/* Ground drop shadow */}
          <ellipse cx="430" cy="208" rx="410" ry="10" fill="#030712" opacity="0.6" />

          {/* Pedestal Feet (Left to Right: 4 Heavy Anchor Stands) */}
          {[60, 270, 520, 700].map((x) => (
            <g key={x} className="conveyor-stand">
              {/* Floor Baseplate */}
              <rect x={x - 18} y="196" width="36" height="6" rx="1" fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <rect x={x - 14} y="190" width="28" height="6" fill="#334155" stroke="#475569" strokeWidth="0.8" />
              {/* Anchor Bolt Heads */}
              <circle cx={x - 12} cy="198" r="1.5" fill="#94a3b8" />
              <circle cx={x + 12} cy="198" r="1.5" fill="#94a3b8" />
              {/* Vertical Upright Column */}
              <rect x={x - 8} y="140" width="16" height="50" fill="url(#frame-grad)" stroke="#475569" strokeWidth="1" />
              {/* Center Channel Web Line */}
              <line x1={x} y1="140" x2={x} y2="190" stroke="#1e293b" strokeWidth="1.5" />
              {/* Top Gusset Plate */}
              <polygon points={`${x - 12},140 ${x + 12},140 ${x + 7},148 ${x - 7},148`} fill="#334155" />
            </g>
          ))}

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 2: MAIN HORIZONTAL I-BEAM FRAME (CHASSIS)
              ══════════════════════════════════════════════════════════════════ */}
          {/* Lower Longitudinal Frame Rail */}
          <rect x="50" y="152" width="670" height="8" rx="1" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          
          {/* Main Top Horizontal I-Beam Channel */}
          {/* Top Flange */}
          <rect x="42" y="132" width="686" height="4" rx="0.5" fill="#64748b" stroke="#334155" strokeWidth="0.8" />
          {/* Web (Center) */}
          <rect x="42" y="136" width="686" height="14" fill="url(#frame-grad)" stroke="#334155" strokeWidth="1" />
          {/* Rivet / Bolt Details along Chassis */}
          {[80, 160, 240, 320, 400, 480, 560, 640, 710].map((bx) => (
            <circle key={bx} cx={bx} cy="143" r="1.6" fill="#94a3b8" />
          ))}
          {/* Bottom Flange */}
          <rect x="42" y="150" width="686" height="3" rx="0.5" fill="#334155" />

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 3: INTERMEDIATE IDLER ROLLERS (BELT SUPPORTS)
              ══════════════════════════════════════════════════════════════════ */}
          {/* Idler Roller 1 (under Vibration sensor) */}
          <g transform="translate(290, 120)">
            {/* Mounting bracket */}
            <rect x="-4" y="6" width="8" height="12" fill="#334155" stroke="#475569" strokeWidth="0.8" />
            {/* Small idler roller cylinder */}
            <rect x="-10" y="-8" width="20" height="16" rx="2" fill="url(#roller-cyl)" stroke="#475569" strokeWidth="1" />
            <circle cx="0" cy="0" r="3" fill="#1e293b" />
          </g>

          {/* Idler Roller 2 (under Speed sensor) */}
          <g transform="translate(525, 120)">
            <rect x="-4" y="6" width="8" height="12" fill="#334155" stroke="#475569" strokeWidth="0.8" />
            <rect x="-10" y="-8" width="20" height="16" rx="2" fill="url(#roller-cyl)" stroke="#475569" strokeWidth="1" />
            <circle cx="0" cy="0" r="3" fill="#1e293b" />
          </g>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 4: BOTTOM BELT RETURN RUN
              ══════════════════════════════════════════════════════════════════ */}
          <rect x="68" y="148" width="630" height="5" rx="1" fill="#090d16" stroke="#1e293b" strokeWidth="0.8" />

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 5: MAIN HEAD & TAIL PULLEYS (CYLINDRICAL 3D ROLLERS)
              ══════════════════════════════════════════════════════════════════ */}
          {/* ── Left Head Pulley (Idler End) ── */}
          <g className="head-pulley-group">
            {/* Pulley Pillow Block Bearing Housing */}
            <rect x="42" y="138" width="16" height="16" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <circle cx="50" cy="146" r="3.5" fill="#64748b" />
            {/* Main Pulley Cylinder */}
            <rect x="36" y="104" width="30" height="42" rx="15" fill="url(#roller-cyl)" stroke="#334155" strokeWidth="1.2" />
            {/* Pulley Front Face Ellipse */}
            <ellipse cx="44" cy="125" rx="9" ry="20" fill="url(#roller-face)" stroke="#475569" strokeWidth="1.2" />
            {/* Center Shaft Hub */}
            <ellipse cx="44" cy="125" rx="3.5" ry="6" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
          </g>

          {/* ── Right Tail Pulley (Drive End) ── */}
          <g className="tail-pulley-group">
            {/* Pulley Pillow Block Bearing Housing */}
            <rect x="710" y="138" width="16" height="16" rx="1" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <circle cx="718" cy="146" r="3.5" fill="#64748b" />
            {/* Main Pulley Cylinder */}
            <rect x="702" y="104" width="32" height="42" rx="15" fill="url(#roller-cyl)" stroke="#334155" strokeWidth="1.2" />
            {/* Pulley Front Face Ellipse */}
            <ellipse cx="732" cy="125" rx="9" ry="20" fill="url(#roller-face)" stroke="#475569" strokeWidth="1.2" />
            {/* Center Shaft Hub */}
            <ellipse cx="732" cy="125" rx="3.5" ry="6" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
            {/* Drive Shaft Coupling Extending to Motor */}
            <rect x="739" y="121" width="18" height="8" rx="1" fill="#475569" stroke="#64748b" strokeWidth="0.8" />
          </g>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 6: TOP BELT CARRYING RUN (WITH MOTION TEXTURE)
              ══════════════════════════════════════════════════════════════════ */}
          {/* Conveyor Belt Top Thickness */}
          <rect x="42" y="102" width="692" height="7" rx="1" fill="url(#belt-grad)" stroke="#1e293b" strokeWidth="1" />
          {/* Top Surface Specular Highlight */}
          <line x1="44" y1="103" x2="732" y2="103" stroke="#475569" strokeWidth="1" opacity="0.7" />

          {/* Dynamic Belt Texture Movement Animation */}
          <g className="belt-moving-marks">
            <line
              x1="48" y1="105.5" x2="728" y2="105.5"
              stroke="#64748b"
              strokeWidth="2.5"
              strokeDasharray="8 20"
              style={{ animationDuration: `${animDuration}s` }}
              className="animated-belt-stripes"
            />
          </g>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 7: 12V DC INDUSTRIAL GEARED MOTOR (AT DRIVE END)
              ══════════════════════════════════════════════════════════════════ */}
          <g className="motor-assembly" transform="translate(754, 86)">
            {/* Motor Bedplate Stand */}
            <rect x="0" y="78" width="68" height="18" rx="1" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <rect x="-4" y="94" width="76" height="5" rx="1" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
            
            {/* Gearbox Housing (Left side connecting to shaft) */}
            <rect x="0" y="32" width="16" height="48" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <circle cx="8" cy="56" r="3.5" fill="#64748b" />

            {/* Main Motor Cylindrical Casing (Deep Blue SCADA Finish) */}
            <rect x="15" y="24" width="48" height="56" rx="4" fill="url(#motor-casing)" stroke="#1e3a8a" strokeWidth="1.2" />
            
            {/* Motor Cooling Fins (3D Ribs) */}
            {[29, 36, 43, 50, 57, 64, 71].map((fy) => (
              <line key={fy} x1="16" y1={fy} x2="61" y2={fy} stroke="#0f172a" strokeWidth="1.8" />
            ))}
            {[29, 36, 43, 50, 57, 64, 71].map((fy) => (
              <line key={fy} x1="16" y1={fy - 0.7} x2="61" y2={fy - 0.7} stroke="#60a5fa" strokeWidth="0.8" opacity="0.6" />
            ))}

            {/* Motor Terminal Box on Top */}
            <rect x="25" y="16" width="22" height="10" rx="1" fill="#1e293b" stroke="#3b82f6" strokeWidth="1" />
            {/* Rear End Fan Shroud */}
            <path d="M 63 28 Q 70 52 63 76 Z" fill="#0f172a" stroke="#1e3a8a" strokeWidth="1" />
          </g>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 8: LOAD CELLS 1 & 2 (UNDERNEATH BELT)
              ══════════════════════════════════════════════════════════════════ */}
          {/* ── Load Cell 1 (Left Quarter) ── */}
          <g transform="translate(320, 154)">
            {/* Vertical Support Rod from Frame */}
            <line x1="0" y1="-4" x2="0" y2="10" stroke="#94a3b8" strokeWidth="1.8" />
            {/* Machined Aluminum Strain Gauge Billet Block */}
            <rect x="-12" y="10" width="24" height="13" rx="1.5" fill="url(#loadcell-mat)" stroke="#334155" strokeWidth="1" />
            {/* Strain Gauge Central Transducer Notch */}
            <circle cx="0" cy="16.5" r="2.2" fill="#0f172a" />
          </g>

          {/* ── Load Cell 2 (Right Quarter) ── */}
          <g transform="translate(545, 154)">
            <line x1="0" y1="-4" x2="0" y2="10" stroke="#94a3b8" strokeWidth="1.8" />
            <rect x="-12" y="10" width="24" height="13" rx="1.5" fill="url(#loadcell-mat)" stroke="#334155" strokeWidth="1" />
            <circle cx="0" cy="16.5" r="2.2" fill="#0f172a" />
          </g>

          {/* ══════════════════════════════════════════════════════════════════
              LAYER 9: REAL-TIME TELEMETRY OVERLAY CALLOUTS & SENSOR NODES
              ══════════════════════════════════════════════════════════════════ */}
          {/* ── 1. Head Pulley Marker ── */}
          <g className="scada-node-callout" transform="translate(50, 78)">
            <text x="0" y="-12" fill="#cbd5e1" fontSize="10.5" fontFamily="var(--font-sans)" fontWeight="500" textAnchor="middle">
              Head Pulley
            </text>
            <line x1="0" y1="-6" x2="0" y2="24" stroke="#22c55e" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
            <circle cx="0" cy="0" r="5" fill="#22c55e" filter="url(#glow-green)" />
            <circle cx="0" cy="0" r="2" fill="#ffffff" />
          </g>

          {/* ── 2. Vibration Sensor Callout (MPU-6050) ── */}
          <g className="scada-node-callout" transform="translate(290, 52)">
            <text x="0" y="-16" fill="#cbd5e1" fontSize="10" fontFamily="var(--font-sans)" fontWeight="500" textAnchor="middle">
              Vibration
            </text>
            <text
              x="0"
              y="-3"
              fill={isVibWarn ? '#f59e0b' : '#ffffff'}
              fontSize="12.5"
              fontFamily="var(--font-mono)"
              fontWeight="700"
              textAnchor="middle"
            >
              {vibrationRms.toFixed(2)} mm/s
            </text>
            <line x1="0" y1="4" x2="0" y2="52" stroke={isVibWarn ? '#f59e0b' : '#22c55e'} strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
            <circle
              cx="0"
              cy="16"
              r="5"
              fill={isVibWarn ? '#f59e0b' : '#22c55e'}
              filter={isVibWarn ? 'url(#glow-warn)' : 'url(#glow-green)'}
              className="pulse-node"
            />
            <circle cx="0" cy="16" r="2" fill="#ffffff" />
          </g>

          {/* ── 3. Belt Speed Sensor Callout (Encoder) ── */}
          <g className="scada-node-callout" transform="translate(525, 52)">
            <text x="0" y="-16" fill="#cbd5e1" fontSize="10" fontFamily="var(--font-sans)" fontWeight="500" textAnchor="middle">
              Belt Speed
            </text>
            <text
              x="0"
              y="-3"
              fill={isSpeedWarn ? '#f59e0b' : '#ffffff'}
              fontSize="12.5"
              fontFamily="var(--font-mono)"
              fontWeight="700"
              textAnchor="middle"
            >
              {beltSpeedMs.toFixed(2)} m/s
            </text>
            <line x1="0" y1="4" x2="0" y2="52" stroke={isSpeedWarn ? '#f59e0b' : '#22c55e'} strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
            <circle
              cx="0"
              cy="16"
              r="5"
              fill={isSpeedWarn ? '#f59e0b' : '#22c55e'}
              filter={isSpeedWarn ? 'url(#glow-warn)' : 'url(#glow-green)'}
              className="pulse-node"
            />
            <circle cx="0" cy="16" r="2" fill="#ffffff" />
          </g>

          {/* ── 4. Tail Pulley Marker ── */}
          <g className="scada-node-callout" transform="translate(718, 78)">
            <text x="0" y="-12" fill="#cbd5e1" fontSize="10.5" fontFamily="var(--font-sans)" fontWeight="500" textAnchor="middle">
              Tail Pulley
            </text>
            <line x1="0" y1="-6" x2="0" y2="24" stroke="#22c55e" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
            <circle cx="0" cy="0" r="5" fill="#22c55e" filter="url(#glow-green)" />
            <circle cx="0" cy="0" r="2" fill="#ffffff" />
          </g>

          {/* ── 5. Motor Status Marker ── */}
          <g className="scada-node-callout" transform="translate(790, 64)">
            <text x="0" y="-12" fill="#cbd5e1" fontSize="10.5" fontFamily="var(--font-sans)" fontWeight="500" textAnchor="middle">
              Motor
            </text>
            <line x1="0" y1="-6" x2="0" y2="20" stroke="#22c55e" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
            <circle cx="0" cy="0" r="5" fill={isRunning ? '#22c55e' : '#64748b'} filter="url(#glow-green)" />
            <circle cx="0" cy="0" r="2" fill="#ffffff" />
          </g>

          {/* ── 6. Load Cell 1 Callout (Underneath) ── */}
          <g className="scada-node-callout" transform="translate(320, 182)">
            <circle cx="0" cy="0" r="5" fill="#22c55e" filter="url(#glow-green)" className="pulse-node" />
            <circle cx="0" cy="0" r="2" fill="#ffffff" />
            <text x="0" y="14" fill="#cbd5e1" fontSize="10" fontFamily="var(--font-sans)" fontWeight="500" textAnchor="middle">
              Load Cell 1
            </text>
            <text x="0" y="27" fill="#ffffff" fontSize="11.5" fontFamily="var(--font-mono)" fontWeight="700" textAnchor="middle">
              {load1Kg.toFixed(2)} kg
            </text>
          </g>

          {/* ── 7. Load Cell 2 Callout (Underneath) ── */}
          <g className="scada-node-callout" transform="translate(545, 182)">
            <circle cx="0" cy="0" r="5" fill="#22c55e" filter="url(#glow-green)" className="pulse-node" />
            <circle cx="0" cy="0" r="2" fill="#ffffff" />
            <text x="0" y="14" fill="#cbd5e1" fontSize="10" fontFamily="var(--font-sans)" fontWeight="500" textAnchor="middle">
              Load Cell 2
            </text>
            <text x="0" y="27" fill="#ffffff" fontSize="11.5" fontFamily="var(--font-mono)" fontWeight="700" textAnchor="middle">
              {load2Kg.toFixed(2)} kg
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};
