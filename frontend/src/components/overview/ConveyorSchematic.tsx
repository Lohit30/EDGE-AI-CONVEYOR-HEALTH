// =============================================================================
// ConveyorSchematic — 2D Engineering Diagram with Clean Live Prototype Telemetry
// Conveyor Belt Monitoring System
// =============================================================================

import React from 'react';

export interface ConveyorSchematicProps {
  loadLeftKg?: number;
  loadRightKg?: number;
  totalLoadKg?: number;
  speedMs?: number;
  motorRpm?: number;
  currentA?: number;
  voltageV?: number;
  powerW?: number;
  vibRms?: number;
  isRunning?: boolean;
}

export const ConveyorSchematic: React.FC<ConveyorSchematicProps> = ({
  loadLeftKg = 0.48,
  loadRightKg = 0.47,
  totalLoadKg = 0.95,
  speedMs = 0.28,
  motorRpm = 134.4,
  currentA = 1.15,
  voltageV = 12.18,
  powerW = 14.0,
  vibRms = 0.95,
  isRunning = true,
}) => {
  const isBalanced = Math.abs(loadLeftKg - loadRightKg) < 0.20;

  return (
    <div className="w-full relative bg-surface-container-low rounded-lg p-3 overflow-hidden flex items-center justify-center min-h-[300px]">
      <svg
        className="w-full h-full select-none"
        viewBox="0 0 760 270"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle engineering grid */}
          <pattern id="schematicGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#cbd5e1" strokeWidth="0.5" strokeOpacity="0.5" />
          </pattern>

          {/* Roller gradients */}
          <linearGradient id="rollerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="40%" stopColor="#cbd5e1" />
            <stop offset="80%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          {/* Motor Body Gradient */}
          <linearGradient id="motorBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>

          {/* Payload Gradient */}
          <linearGradient id="payloadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        {/* ── BACKGROUND ── */}
        <rect width="760" height="270" fill="#f8fafc" rx="4" />
        <rect width="760" height="270" fill="url(#schematicGrid)" rx="4" />

        {/* ── TOP HUD CALLOUT CARDS (EVENLY DISTRIBUTED & CLEANLY SPACED) ── */}
        <g fontFamily="IBM Plex Mono">
          {/* 1. OPTICAL ENCODER CARD */}
          <g transform="translate(24, 12)">
            <rect width="160" height="42" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" rx="4" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.04))" />
            <circle cx="12" cy="14" r="3" fill="#0284c7" />
            <text x="20" y="17" fill="#64748b" fontSize="7.5" fontWeight="bold" letterSpacing="0.5">OPTICAL ENCODER</text>
            <text x="12" y="33" fill="#0f172a" fontSize="10.5" fontWeight="bold">
              {speedMs.toFixed(2)} m/s
            </text>
            <text x="86" y="33" fill="#64748b" fontSize="8" fontWeight="bold">
              {motorRpm.toFixed(0)} RPM
            </text>
          </g>

          {/* 2. DUAL HX711 WEIGH-BED CARD */}
          <g transform="translate(196, 12)">
            <rect width="210" height="42" fill="#ffffff" stroke="#0284c7" strokeWidth="1.2" rx="4" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.05))" />
            <circle cx="12" cy="14" r="3" fill={isBalanced ? '#10b981' : '#f59e0b'} />
            <text x="20" y="17" fill="#0369a1" fontSize="7.5" fontWeight="bold" letterSpacing="0.5">
              HX711 DUAL WEIGH-BED
            </text>
            <text x="145" y="17" fill={isBalanced ? '#047857' : '#b45309'} fontSize="7" fontWeight="bold">
              {isBalanced ? '✓ BALANCED' : '⚠️ IMBALANCE'}
            </text>
            <text x="12" y="33" fill="#0369a1" fontSize="11" fontWeight="bold">
              {totalLoadKg.toFixed(2)} kg
            </text>
            <text x="82" y="33" fill="#64748b" fontSize="8" fontWeight="semibold">
              LC1:{loadLeftKg.toFixed(2)} | LC2:{loadRightKg.toFixed(2)}
            </text>
          </g>

          {/* 3. MPU-6050 BEARING CARD */}
          <g transform="translate(418, 12)">
            <rect width="165" height="42" fill="#ffffff" stroke="#10b981" strokeWidth="1.2" rx="4" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.04))" />
            <circle cx="12" cy="14" r="3" fill="#10b981" />
            <text x="20" y="17" fill="#065f46" fontSize="7.5" fontWeight="bold" letterSpacing="0.5">MPU-6050 VIBRATION</text>
            <text x="12" y="33" fill="#065f46" fontSize="10.5" fontWeight="bold">
              {vibRms.toFixed(2)} mm/s
            </text>
            <text x="96" y="33" fill="#10b981" fontSize="8" fontWeight="bold">
              ISO NOMINAL
            </text>
          </g>

          {/* 4. 12V DC MOTOR DRIVE CARD */}
          <g transform="translate(595, 12)">
            <rect width="148" height="42" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" rx="4" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.04))" />
            <circle cx="12" cy="14" r="3" fill="#0284c7" />
            <text x="20" y="17" fill="#64748b" fontSize="7.5" fontWeight="bold" letterSpacing="0.5">12V DC DRIVE</text>
            <text x="12" y="33" fill="#0f172a" fontSize="9.5" fontWeight="bold">
              {voltageV.toFixed(1)}V • {currentA.toFixed(2)}A
            </text>
          </g>
        </g>

        {/* ── CRISP VERTICAL LEADER LINES (NO CROSSINGS, DIRECT ANCHORS) ── */}
        <g stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3">
          {/* Encoder leader line */}
          <line x1="104" y1="54" x2="104" y2="82" />
          <line x1="104" y1="82" x2="140" y2="82" />
          <line x1="140" y1="82" x2="140" y2="120" />
          <circle cx="140" cy="120" r="2.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />

          {/* LC1 leader line */}
          <line x1="265" y1="54" x2="265" y2="125" />
          <circle cx="265" cy="125" r="2.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />

          {/* LC2 leader line */}
          <line x1="375" y1="54" x2="375" y2="125" />
          <circle cx="375" cy="125" r="2.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />

          {/* MPU-6050 leader line */}
          <line x1="500" y1="54" x2="500" y2="96" />
          <circle cx="500" cy="96" r="2.5" fill="#10b981" stroke="#ffffff" strokeWidth="1" />

          {/* Motor leader line */}
          <line x1="660" y1="54" x2="660" y2="128" />
          <circle cx="660" cy="128" r="2.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
        </g>

        {/* ── MECHANICAL SUPPORT STRUCTURE ── */}
        {/* Support Frame Beam */}
        <rect x="50" y="210" width="660" height="8" fill="#94a3b8" rx="2" />
        {/* Support Legs */}
        {[80, 230, 440, 630].map((x) => (
          <g key={x}>
            <line x1={x} y1="218" x2={x} y2="248" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            <line x1={x - 16} y1="248" x2={x + 16} y2="248" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
          </g>
        ))}

        {/* ── BELT LOOP ASSEMBLY ── */}
        {/* Heavy Belt Outer Loop */}
        <path
          d="M 140 120 L 500 120 A 35 35 0 0 1 500 190 L 140 190 A 35 35 0 0 1 140 120 Z"
          fill="none"
          stroke="#0f172a"
          strokeWidth="7"
          strokeLinejoin="round"
        />

        {/* Belt Core Motion Guide */}
        <path
          d="M 140 120 L 500 120"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeDasharray="10 6"
          className={isRunning && speedMs > 0 ? 'animate-pulse' : ''}
        />

        {/* Return Belt Motion Guide */}
        <path
          d="M 500 190 L 140 190"
          fill="none"
          stroke="#64748b"
          strokeWidth="1.5"
          strokeDasharray="8 6"
          opacity="0.6"
        />

        {/* ── PAYLOAD MATERIAL ON TOP BELT (CLEAN, NO ARROW COLLISIONS) ── */}
        <g>
          {/* Material bed */}
          <rect
            x="200"
            y="108"
            width="240"
            height="11"
            fill="url(#payloadGrad)"
            rx="3"
            stroke="#1e40af"
            strokeWidth="1"
          />
          {/* Material mass tag centered cleanly with high-contrast text */}
          <g transform="translate(320, 102)">
            <rect x="-48" y="-12" width="96" height="15" fill="#1e3a8a" rx="3" stroke="#3b82f6" strokeWidth="1" />
            <text
              x="0"
              y="-1"
              fill="#ffffff"
              fontFamily="IBM Plex Mono"
              fontSize="7.5"
              fontWeight="bold"
              textAnchor="middle"
            >
              PAYLOAD: {totalLoadKg.toFixed(2)} kg
            </text>
          </g>
        </g>

        {/* ── DIRECTION ARROWS (PLACED WITH AMPLE CLEARANCE) ── */}
        {isRunning && (
          <g opacity="0.85">
            {/* Top advance arrows — on clear belt sections before and after material */}
            <polygon points="166,114 178,110 166,106" fill="#0284c7" />
            <polygon points="460,114 472,110 460,106" fill="#0284c7" />

            {/* Bottom return arrows */}
            <polygon points="340,196 328,200 340,204" fill="#64748b" />
          </g>
        )}

        {/* ── ROLLERS ── */}
        {/* Idler Roller (Left) */}
        <circle cx="140" cy="155" r="31" fill="url(#rollerGrad)" stroke="#475569" strokeWidth="2" />
        <circle cx="140" cy="155" r="10" fill="#475569" stroke="#1e293b" strokeWidth="1.5" />
        <circle cx="140" cy="155" r="4" fill="#e2e8f0" />
        <line x1="140" y1="124" x2="140" y2="186" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

        {/* Drive Roller (Right) */}
        <circle cx="500" cy="155" r="31" fill="url(#rollerGrad)" stroke="#475569" strokeWidth="2" />
        <circle cx="500" cy="155" r="10" fill="#475569" stroke="#1e293b" strokeWidth="1.5" />
        <circle cx="500" cy="155" r="4" fill="#e2e8f0" />
        <line x1="500" y1="124" x2="500" y2="186" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

        {/* Center Snub / Return Roller */}
        <circle cx="320" cy="198" r="11" fill="url(#rollerGrad)" stroke="#475569" strokeWidth="1.5" />
        <circle cx="320" cy="198" r="3" fill="#ffffff" />

        {/* ── LOAD CELLS (LC1 & LC2) UNDER BED ── */}
        {/* Load Cell 1 (Hopper Zone) */}
        <g transform="translate(265, 126)">
          <rect x="-22" y="0" width="44" height="34" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" rx="3" />
          <circle cx="0" cy="12" r="4" fill="#38bdf8" />
          <rect x="-8" y="34" width="16" height="24" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
          <rect x="-14" y="58" width="28" height="6" fill="#64748b" rx="1" />
          {/* Crisp, non-overlapping label */}
          <text x="0" y="10" fill="#0369a1" fontFamily="IBM Plex Mono" fontSize="6.5" fontWeight="bold" textAnchor="middle">
            LC-01
          </text>
          <text x="0" y="27" fill="#0f172a" fontFamily="IBM Plex Mono" fontSize="8" fontWeight="bold" textAnchor="middle">
            {loadLeftKg.toFixed(2)}k
          </text>
        </g>

        {/* Load Cell 2 (Discharge Zone) */}
        <g transform="translate(375, 126)">
          <rect x="-22" y="0" width="44" height="34" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" rx="3" />
          <circle cx="0" cy="12" r="4" fill="#38bdf8" />
          <rect x="-8" y="34" width="16" height="24" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
          <rect x="-14" y="58" width="28" height="6" fill="#64748b" rx="1" />
          {/* Crisp, non-overlapping label */}
          <text x="0" y="10" fill="#0369a1" fontFamily="IBM Plex Mono" fontSize="6.5" fontWeight="bold" textAnchor="middle">
            LC-02
          </text>
          <text x="0" y="27" fill="#0f172a" fontFamily="IBM Plex Mono" fontSize="8" fontWeight="bold" textAnchor="middle">
            {loadRightKg.toFixed(2)}k
          </text>
        </g>

        {/* ── MPU-6050 SENSOR MOUNTED ON DRIVE BEARING BLOCK ── */}
        <g transform="translate(500, 96)">
          {/* Bearing mounting pillow block */}
          <rect x="-15" y="0" width="30" height="22" fill="#065f46" stroke="#10b981" strokeWidth="1.5" rx="2" />
          <circle cx="0" cy="11" r="3.5" fill="#34d399" />
          <text x="0" y="8" fill="#ffffff" fontFamily="IBM Plex Mono" fontSize="5.5" fontWeight="bold" textAnchor="middle">
            MPU
          </text>
          <text x="0" y="18" fill="#a7f3d0" fontFamily="IBM Plex Mono" fontSize="5.5" fontWeight="bold" textAnchor="middle">
            I2C
          </text>
        </g>

        {/* ── OPTICAL ENCODER ON IDLER SHAFT ── */}
        <g transform="translate(140, 155)">
          <circle cx="0" cy="0" r="23" fill="none" stroke="#1e293b" strokeWidth="3" strokeDasharray="4 3" />
          {/* Optical Pickup Sensor */}
          <rect x="-4" y="-36" width="22" height="14" fill="#0284c7" stroke="#0369a1" strokeWidth="1" rx="2" />
          <circle cx="7" cy="-29" r="2.5" fill="#ef4444" />
          <text x="7" y="-25" fill="#ffffff" fontFamily="IBM Plex Mono" fontSize="4.5" fontWeight="bold" textAnchor="middle">
            IR
          </text>
        </g>

        {/* ── DRIVE SHAFT COUPLING ── */}
        <rect x="531" y="148" width="16" height="14" fill="#64748b" stroke="#334155" strokeWidth="1" rx="1" />
        <line x1="535" y1="148" x2="535" y2="162" stroke="#475569" strokeWidth="1" />
        <line x1="543" y1="148" x2="543" y2="162" stroke="#475569" strokeWidth="1" />

        {/* ── 12V DC GEARED MOTOR ── */}
        <g transform="translate(547, 134)">
          {/* Motor Body */}
          <rect x="0" y="0" width="112" height="42" fill="url(#motorBodyGrad)" stroke="#0369a1" strokeWidth="2" rx="4" />
          {/* End Cap */}
          <rect x="112" y="7" width="14" height="28" fill="#0369a1" stroke="#075985" strokeWidth="1.5" rx="2" />
          {/* Cooling Fins */}
          {[14, 28, 42, 56, 70, 84, 98].map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2="42" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.5" />
          ))}
          {/* Motor Labels */}
          <text x="56" y="18" fill="#ffffff" fontFamily="IBM Plex Mono" fontSize="8" fontWeight="bold" textAnchor="middle">
            12V DC MOTOR
          </text>
          <text x="56" y="32" fill="#e0f2fe" fontFamily="IBM Plex Mono" fontSize="7.5" fontWeight="bold" textAnchor="middle">
            {currentA.toFixed(2)}A • {powerW.toFixed(1)}W
          </text>
        </g>
      </svg>
    </div>
  );
};
