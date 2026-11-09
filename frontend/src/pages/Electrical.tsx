// =============================================================================
// Electrical / Voltage Page — Stitch SCADA Electrical Monitoring
// =============================================================================

import React from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import { IndustrialGauge } from '../components/gauges/IndustrialGauge';

export const Electrical: React.FC = () => {
  const { frame } = useTelemetry();
  const e = frame.electrical;

  return (
    <>
      <header className="w-full bg-surface-container-lowest shadow-sm rounded-lg p-space-md flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-lg">
          <div className="bg-primary px-3 py-1.5 rounded text-on-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span className="font-headline-sm text-headline-sm tracking-wider">CV-IRON-01 // ELECTRICAL SYSTEM</span>
          </div>
          <span className="font-label-sm text-label-sm text-secondary">INA219 HIGH-SIDE BIDIRECTIONAL I2C POWER MONITOR • 12-BIT ADC</span>
        </div>
        <div className="flex items-center gap-3">
          {[
            { label: 'BUS VOLTAGE', value: e.voltageV.toFixed(1), unit: 'V' },
            { label: 'CURRENT DRAW', value: e.currentA.toFixed(2), unit: 'A' },
            { label: 'ACTIVE POWER', value: e.powerW.toFixed(1), unit: 'W' },
          ].map((m) => (
            <div key={m.label} className="bg-surface-container-low px-3 py-1.5 rounded">
              <div className="font-label-sm text-label-sm text-secondary uppercase">{m.label}</div>
              <div className="font-metric-display text-metric-display text-primary font-bold">{m.value}<span className="font-label-md text-label-md text-secondary ml-1">{m.unit}</span></div>
            </div>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col items-center">
          <div className="font-headline-sm text-headline-sm text-on-surface mb-2">VOLTAGE GAUGE</div>
          <IndustrialGauge label="VOLTAGE" value={e.voltageV} unit="V" scaleMin={0} scaleMax={15} scaleLabels={['0','3','6','9','12','15']} dialLabel="VOLTS DC" dialSublabel="INA219 BUS ADC" status={e.state as any} />
        </div>
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col items-center">
          <div className="font-headline-sm text-headline-sm text-on-surface mb-2">CURRENT GAUGE</div>
          <IndustrialGauge label="CURRENT" value={e.currentA} unit="A" scaleMin={0} scaleMax={5} scaleLabels={['0','1','2','3','4','5']} dialLabel="AMPERES DC" dialSublabel="INA219 SHUNT" status={e.state as any} />
        </div>
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col items-center">
          <div className="font-headline-sm text-headline-sm text-on-surface mb-2">POWER GAUGE</div>
          <IndustrialGauge label="POWER" value={e.powerW} unit="W" scaleMin={0} scaleMax={50} scaleLabels={['0','10','20','30','40','50']} dialLabel="WATTS (P=VI)" dialSublabel="ACTIVE LOAD" status={e.state as any} />
        </div>
      </section>

      <section className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
        <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
          <span className="font-headline-sm text-headline-sm text-on-surface">ELECTRICAL TELEMETRY STRIP CHART (60s BUFFER)</span>
          <div className="flex items-center gap-4 font-label-sm text-label-sm">
            <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#f59e0b]" />VOLTAGE [V]</div>
            <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#0284c7]" />CURRENT [A]</div>
            <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#1e40af]" />POWER [W]</div>
          </div>
        </div>
        <div className="w-full h-56 bg-surface-container-low rounded flex items-center justify-center">
          <svg className="w-full h-full select-none" viewBox="0 0 700 230">
            <rect width="700" height="230" fill="#f8fafc" rx="4" />
            <g transform="translate(50, 15)">
              <rect width="630" height="185" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
              <path d="M 0 30 Q 40 32 80 28 T 160 31 T 240 29 T 320 32 T 400 28 T 480 31 T 560 29 T 630 30" fill="none" stroke="#f59e0b" strokeWidth="2" />
              <path d="M 0 90 Q 40 88 80 93 T 160 87 T 240 92 T 320 86 T 400 91 T 480 88 T 560 90 T 630 89" fill="none" stroke="#0284c7" strokeWidth="2" />
              <path d="M 0 60 Q 40 58 80 63 T 160 57 T 240 62 T 320 56 T 400 61 T 480 58 T 560 60 T 630 59" fill="none" stroke="#1e40af" strokeWidth="2" />
              <g fontFamily="IBM Plex Mono" fontSize="9" fill="#94a3b8" textAnchor="middle">
                <text x="10" y="200">-60s</text><text x="315" y="200">-30s</text><text x="625" y="200">NOW</text>
              </g>
            </g>
          </svg>
        </div>
        <div className="flex items-center justify-between text-secondary pt-2 font-label-sm text-label-sm">
          <span>INA219 CONTINUOUS MODE • SAMPLE RATE: 100Hz • I2C ADDRESS: 0x40</span>
          <span>SHUNT RESISTOR: 0.1Ω • BUS RANGE: 16V FSR • PGA GAIN: /1</span>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        {[
          { label: 'EFFICIENCY (η)', value: '88.4', unit: '%' },
          { label: 'POWER FACTOR', value: '0.98', unit: 'PF' },
          { label: 'ENERGY TODAY', value: '4.82', unit: 'Wh' },
          { label: 'MOTOR TEMP (EST)', value: '42.3', unit: '°C' },
        ].map((m) => (
          <div key={m.label} className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
            <div className="font-label-sm text-label-sm text-secondary uppercase mb-1">{m.label}</div>
            <div className="font-metric-display text-metric-display text-on-surface font-bold">{m.value}<span className="font-label-sm text-label-sm text-secondary ml-1">{m.unit}</span></div>
          </div>
        ))}
      </section>
    </>
  );
};
