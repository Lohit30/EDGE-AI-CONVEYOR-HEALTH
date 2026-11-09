// =============================================================================
// AnalogGauge — Pixel-perfect match to master SCADA gauge reference
// Clean dark gradient dial, 270° color arc, spacious scale labels,
// tapered needle, centered digital readout with zero overlap, status badge.
// =============================================================================

import React, { useMemo } from 'react';
import './AnalogGauge.css';

interface AnalogGaugeProps {
  label:     string;
  unit:      string;
  value:     number;
  min:       number;
  max:       number;
  warnAt:    number;
  critAt:    number;
  ticks?:    number;
  decimals?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  if (Math.abs(endAngle - startAngle) < 0.1) return '';
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const arcSweep = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${arcSweep} 1 ${end.x} ${end.y}`;
}

const START_ANGLE = -130; // 7:40 position
const END_ANGLE   =  130; // 4:20 position
const TOTAL_SWEEP = END_ANGLE - START_ANGLE; // 260 degrees

function valueToAngle(val: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, val));
  const pct = (clamped - min) / (max - min);
  return START_ANGLE + pct * TOTAL_SWEEP;
}

export const AnalogGauge: React.FC<AnalogGaugeProps> = ({
  label,
  unit,
  value,
  min,
  max,
  warnAt,
  critAt,
  ticks = 5,
  decimals = 2,
}) => {
  const size = 160;
  const cx = 80;
  const cy = 76;
  const r = 60;
  const strokeW = 7.5;

  const warnAngle = valueToAngle(warnAt, min, max);
  const critAngle = valueToAngle(critAt, min, max);
  const needleAngle = valueToAngle(value, min, max);

  const isCrit = value >= critAt;
  const isWarn = !isCrit && value >= warnAt;
  const stateStr = isCrit ? 'CRITICAL' : isWarn ? 'WARNING' : 'NORMAL';
  const stateClass = isCrit ? 'crit' : isWarn ? 'warn' : 'norm';

  const tickItems = useMemo(() => {
    const items = [];
    for (let i = 0; i <= ticks; i++) {
      const val = min + (i / ticks) * (max - min);
      const angle = START_ANGLE + (i / ticks) * TOTAL_SWEEP;
      
      const outer = polarToCartesian(cx, cy, r + strokeW / 2 + 1, angle);
      const inner = polarToCartesian(cx, cy, r - strokeW / 2 - 2, angle);
      const labelPos = polarToCartesian(cx, cy, r - 15, angle);
      const displayVal =
        val >= 1000
          ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`
          : val >= 100
          ? val.toFixed(0)
          : val % 1 === 0
          ? val.toFixed(0)
          : val.toFixed(1);

      items.push({ val: displayVal, outer, inner, labelPos });
    }
    return items;
  }, [min, max, ticks, cx, cy, r, strokeW]);

  const needleLength = r - 8;
  const needleTip = polarToCartesian(cx, cy, needleLength, needleAngle);
  const needleBase1 = polarToCartesian(cx, cy, 3, needleAngle + 90);
  const needleBase2 = polarToCartesian(cx, cy, 3, needleAngle - 90);
  const needleTail  = polarToCartesian(cx, cy, 6, needleAngle + 180);

  return (
    <div className="scada-gauge-card">
      <div className="scada-gauge-header">
        <span className="scada-gauge-title">{label}</span>
        <span className="scada-gauge-unit">({unit})</span>
      </div>

      <div className="scada-gauge-dial-wrap">
        <svg viewBox={`0 0 ${size} 132`} className="scada-gauge-svg">
          <defs>
            <radialGradient id={`dialGrad-${label.replace(/\s+/g, '')}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#151b26" />
              <stop offset="85%" stopColor="#0d1219" />
              <stop offset="100%" stopColor="#080c12" />
            </radialGradient>
          </defs>

          {/* Dial Face Background Disc */}
          <circle
            cx={cx}
            cy={cy}
            r={r + strokeW / 2 + 4}
            fill={`url(#dialGrad-${label.replace(/\s+/g, '')})`}
            stroke="#1c2533"
            strokeWidth="1.2"
          />

          {/* Background Track Arc */}
          <path
            d={describeArc(cx, cy, r, START_ANGLE, END_ANGLE)}
            fill="none"
            stroke="#192333"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />

          {/* Green Zone Arc */}
          <path
            d={describeArc(cx, cy, r, START_ANGLE, warnAngle)}
            fill="none"
            stroke="#22c55e"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />

          {/* Yellow/Orange Zone Arc */}
          <path
            d={describeArc(cx, cy, r, warnAngle, critAngle)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />

          {/* Red Zone Arc */}
          <path
            d={describeArc(cx, cy, r, critAngle, END_ANGLE)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />

          {/* Tick marks & Scale numbers */}
          {tickItems.map((t, idx) => (
            <g key={idx}>
              <line
                x1={t.inner.x}
                y1={t.inner.y}
                x2={t.outer.x}
                y2={t.outer.y}
                stroke="#090d13"
                strokeWidth="1.5"
              />
              <text
                x={t.labelPos.x}
                y={t.labelPos.y + 3}
                fill="#8da0b5"
                fontSize="8"
                fontFamily="var(--font-mono)"
                fontWeight="500"
                textAnchor="middle"
              >
                {t.val}
              </text>
            </g>
          ))}

          {/* Needle (tapered pointer) */}
          <polygon
            points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleTail.x},${needleTail.y} ${needleBase2.x},${needleBase2.y}`}
            fill="#f8fafc"
            stroke="#0b0f15"
            strokeWidth="0.5"
          />

          {/* Center Hub */}
          <circle cx={cx} cy={cy} r="6" fill="#141c28" stroke="#334155" strokeWidth="1" />
          <circle cx={cx} cy={cy} r="2.2" fill="#64748b" />

          {/* Digital Readout */}
          <text
            x={cx}
            y={cy + 36}
            fill="#ffffff"
            fontSize="17"
            fontFamily="var(--font-mono)"
            fontWeight="700"
            textAnchor="middle"
          >
            {decimals === 0 ? Math.round(value).toLocaleString() : value.toFixed(decimals)}
          </text>
        </svg>
      </div>

      {/* State Badge Pill */}
      <div className={`scada-gauge-badge scada-gauge-badge--${stateClass}`}>
        {stateStr}
      </div>
    </div>
  );
};
