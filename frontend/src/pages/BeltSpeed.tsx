// =============================================================================
// Belt Speed Page — Stitch SCADA Encoder Speed Monitoring
// =============================================================================

import React from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import { IndustrialGauge } from '../components/gauges/IndustrialGauge';

export const BeltSpeed: React.FC = () => {
  const { frame } = useTelemetry();
  const s = frame.beltSpeed;

  return (
    <>
      <header className="w-full bg-surface-container-lowest shadow-sm rounded-lg p-space-md flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-lg">
          <div className="bg-primary px-3 py-1.5 rounded text-on-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">speed</span>
            <span className="font-headline-sm text-headline-sm tracking-wider">CV-IRON-01 // BELT SPEED</span>
          </div>
          <span className="font-label-sm text-label-sm text-secondary">OPTICAL ENCODER 100 PPR • IDLER ROLLER Ø=64mm • ESP32 PCNT PERIPHERAL</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-surface-container-low px-3 py-1.5 rounded">
            <div className="font-label-sm text-label-sm text-secondary uppercase">LINEAR BELT VELOCITY</div>
            <div className="font-metric-display text-metric-display text-primary font-bold">{s.speedMs.toFixed(2)}<span className="font-label-md text-label-md text-secondary ml-1">m/s</span></div>
          </div>
          <div className="bg-surface-container-low px-3 py-1.5 rounded">
            <div className="font-label-sm text-label-sm text-secondary uppercase">MOTOR RPM (DERIVED)</div>
            <div className="font-metric-display text-metric-display text-primary font-bold">{s.motorRpm.toFixed(1)}<span className="font-label-md text-label-md text-secondary ml-1">RPM</span></div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#10b981]/15 text-[#047857] rounded font-label-sm text-label-sm font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />SYNC LOCKED
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        <div className="lg:col-span-4 bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col items-center">
          <div className="flex items-center justify-between w-full pb-space-sm bg-surface-container-low px-3 py-1.5 rounded mb-2">
            <span className="font-headline-sm text-headline-sm text-on-surface">SPEEDOMETER GAUGE</span>
            <span className="font-label-sm text-label-sm font-bold text-secondary">0-1.0 m/s</span>
          </div>
          <IndustrialGauge label="BELT SPEED" value={s.speedMs} unit="m/s" scaleMin={0} scaleMax={1.0} scaleLabels={['0.0','0.2','0.4','0.6','0.8','1.0']} dialLabel="m/s ENCODER" dialSublabel="100 PPR SYNC" status={s.state as any} setpoint={0.28} />
        </div>
        <div className="lg:col-span-8 bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
          <div className="flex items-center justify-between pb-space-sm bg-surface-container-low px-3 py-1.5 rounded mb-3">
            <span className="font-headline-sm text-headline-sm text-on-surface">SPEED TELEMETRY RECORDER (60s)</span>
            <div className="flex items-center gap-3 font-label-sm text-label-sm">
              <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#0284c7]" />SPEED</div>
              <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#10b981] opacity-50" style={{ borderTop: '1px dashed' }} />SETPOINT</div>
            </div>
          </div>
          <div className="w-full h-56 bg-surface-container-low rounded flex items-center justify-center">
            <svg className="w-full h-full select-none" viewBox="0 0 700 230">
              <rect width="700" height="230" fill="#f8fafc" rx="4" />
              <g transform="translate(50, 15)">
                <rect width="630" height="185" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                <line x1="0" y1="65" x2="630" y2="65" stroke="#10b981" strokeWidth="1" strokeDasharray="4 3" />
                <text x="580" y="62" fill="#10b981" fontFamily="IBM Plex Mono" fontSize="8" fontWeight="bold">SET: 0.28 m/s</text>
                <path d="M 0 68 Q 40 70 80 66 T 160 69 T 240 65 T 320 70 T 400 66 T 480 68 T 560 64 T 630 67" fill="none" stroke="#0284c7" strokeWidth="2" />
                <circle cx="630" cy="67" r="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                <g fontFamily="IBM Plex Mono" fontSize="9" fill="#94a3b8" textAnchor="end">
                  <text x="-8" y="15">1.0</text><text x="-8" y="55">0.7</text><text x="-8" y="100">0.3</text><text x="-8" y="185">0.0</text>
                </g>
                <g fontFamily="IBM Plex Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">
                  <text x="10" y="200">-60s</text><text x="315" y="200">-30s</text><text x="625" y="200">NOW</text>
                </g>
              </g>
            </svg>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        {[
          { label: 'ENCODER PULSES/REV', value: '100', unit: 'PPR', icon: 'sensors' },
          { label: 'TICK FREQUENCY', value: `${(s.speedMs * 490).toFixed(1)}`, unit: 'Hz', icon: 'timer' },
          { label: 'ROLLER CIRCUMFERENCE', value: '201.1', unit: 'mm', icon: 'straighten' },
          { label: 'SPEED REGULATION', value: '±0.5', unit: '%', icon: 'tune' },
        ].map((m) => (
          <div key={m.label} className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[18px] text-primary">{m.icon}</span>
              <span className="font-label-sm text-label-sm text-secondary uppercase">{m.label}</span>
            </div>
            <span className="font-metric-display text-metric-display text-on-surface font-bold">{m.value}<span className="font-label-sm text-label-sm text-secondary ml-1">{m.unit}</span></span>
          </div>
        ))}
      </section>
    </>
  );
};
