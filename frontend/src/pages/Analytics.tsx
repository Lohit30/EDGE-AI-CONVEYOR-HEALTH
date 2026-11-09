// =============================================================================
// Analytics Page — Stitch SCADA Historical Analytics Dashboard
// =============================================================================

import React from 'react';

export const Analytics: React.FC = () => {
  return (
    <>
      <header className="w-full bg-surface-container-lowest shadow-sm rounded-lg p-space-md flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-lg">
          <div className="bg-primary px-3 py-1.5 rounded text-on-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">analytics</span>
            <span className="font-headline-sm text-headline-sm tracking-wider">CV-IRON-01 // ANALYTICS</span>
          </div>
          <span className="font-label-md text-label-md text-secondary">HISTORICAL TREND ANALYSIS • CORRELATION ENGINE • STATISTICAL REPORTING</span>
        </div>
        <div className="flex items-center gap-2">
          {['1H', '6H', '24H', '7D', '30D'].map((range) => (
            <button key={range} className={`font-label-md text-label-md font-bold px-2 py-1 rounded transition-colors ${range === '24H' ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-secondary hover:bg-surface-container'}`}>{range}</button>
          ))}
          <button className="font-label-md text-label-md text-on-primary bg-primary px-2 py-1 rounded hover:bg-primary/90 flex items-center gap-1 ml-2">
            <span className="material-symbols-outlined text-[14px]">download</span>EXPORT
          </button>
        </div>
      </header>

      {/* KPI Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-space-md">
        {[
          { label: 'AVAILABILITY', value: '98.7', unit: '%', trend: '+0.3%', tColor: '#10b981' },
          { label: 'THROUGHPUT (24H)', value: '342.8', unit: 't', trend: '+5.2%', tColor: '#10b981' },
          { label: 'AVG BELT SPEED', value: '1.82', unit: 'm/s', trend: '-0.01', tColor: '#f59e0b' },
          { label: 'ENERGY CONSUMED', value: '118.4', unit: 'Wh', trend: '+2.1%', tColor: '#f59e0b' },
          { label: 'ALERT COUNT', value: '3', unit: 'events', trend: '-2', tColor: '#10b981' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
            <div className="font-label-md text-label-md text-secondary uppercase mb-1">{kpi.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="font-metric-display text-metric-display text-on-surface font-bold">{kpi.value}</span>
              <span className="font-label-md text-label-md text-secondary">{kpi.unit}</span>
            </div>
            <div className="font-label-md text-label-md font-bold mt-1" style={{ color: kpi.tColor }}>{kpi.trend} vs prev. period</div>
          </div>
        ))}
      </section>

      {/* Trend Charts Grid */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-space-md">
        {[
          { title: 'VIBRATION TREND (24H)', subtitle: 'RMS Velocity [mm/s] — All Axes', color: '#f59e0b' },
          { title: 'LOAD PROFILE (24H)', subtitle: 'Aggregate Mass [kg] — LC-01 + LC-02', color: '#0284c7' },
          { title: 'BELT SPEED STABILITY', subtitle: 'Linear Velocity [m/s] vs Setpoint', color: '#10b981' },
          { title: 'ELECTRICAL POWER DRAW', subtitle: 'Active Power [W] — INA219', color: '#1e40af' },
        ].map((chart) => (
          <div key={chart.title} className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
            <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
              <div>
                <span className="font-headline-sm text-headline-sm text-on-surface block">{chart.title}</span>
                <span className="font-label-md text-label-md text-secondary">{chart.subtitle}</span>
              </div>
            </div>
            <div className="w-full h-44 bg-surface-container-low rounded flex items-center justify-center">
              <svg className="w-full h-full select-none" viewBox="0 0 600 180">
                <rect width="600" height="180" fill="#f8fafc" rx="4" />
                <g transform="translate(40, 10)">
                  <rect width="540" height="140" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                  <path d={`M 0 80 Q 30 ${60 + Math.random() * 40} 60 ${70 + Math.random() * 20} T 120 ${65 + Math.random() * 30} T 180 ${70 + Math.random() * 20} T 240 ${60 + Math.random() * 30} T 300 ${75 + Math.random() * 15} T 360 ${65 + Math.random() * 25} T 420 ${70 + Math.random() * 20} T 480 ${60 + Math.random() * 30} T 540 ${70 + Math.random() * 20}`} fill="none" stroke={chart.color} strokeWidth="2" />
                  <g fontFamily="IBM Plex Mono" fontSize="8" fill="#94a3b8" textAnchor="middle">
                    <text x="0" y="160">00:00</text>
                    <text x="135" y="160">06:00</text>
                    <text x="270" y="160">12:00</text>
                    <text x="405" y="160">18:00</text>
                    <text x="540" y="160">NOW</text>
                  </g>
                </g>
              </svg>
            </div>
          </div>
        ))}
      </section>

      {/* Correlation Matrix */}
      <section className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
        <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
          <span className="font-headline-sm text-headline-sm text-on-surface">PARAMETER CORRELATION MATRIX</span>
          <span className="font-label-md text-label-md text-secondary">PEARSON ρ COEFFICIENT • 24H WINDOW</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse font-label-md text-label-md">
            <thead>
              <tr className="bg-surface-container-low text-secondary uppercase">
                <th className="py-1.5 px-2 font-bold text-left">PARAMETER</th>
                <th className="py-1.5 px-2 font-bold">VIB RMS</th>
                <th className="py-1.5 px-2 font-bold">LOAD</th>
                <th className="py-1.5 px-2 font-bold">SPEED</th>
                <th className="py-1.5 px-2 font-bold">CURRENT</th>
                <th className="py-1.5 px-2 font-bold">POWER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {[
                { param: 'VIB RMS', vals: ['1.00', '0.72', '0.34', '0.81', '0.78'] },
                { param: 'LOAD', vals: ['0.72', '1.00', '0.15', '0.88', '0.91'] },
                { param: 'SPEED', vals: ['0.34', '0.15', '1.00', '0.42', '0.45'] },
                { param: 'CURRENT', vals: ['0.81', '0.88', '0.42', '1.00', '0.97'] },
                { param: 'POWER', vals: ['0.78', '0.91', '0.45', '0.97', '1.00'] },
              ].map((row) => (
                <tr key={row.param} className="hover:bg-surface-container-low/80">
                  <td className="py-1.5 px-2 font-bold text-left text-on-surface">{row.param}</td>
                  {row.vals.map((v, i) => {
                    const val = parseFloat(v);
                    const color = val >= 0.8 ? '#10b981' : val >= 0.5 ? '#f59e0b' : '#94a3b8';
                    const bg = val === 1 ? '#0284c7' : `${color}15`;
                    return (
                      <td key={i} className="py-1.5 px-2 font-mono font-bold" style={{ color: val === 1 ? '#ffffff' : color, backgroundColor: bg }}>{v}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};
