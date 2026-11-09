// =============================================================================
// Alerts Page — Stitch SCADA Alarm Annunciator Panel
// =============================================================================

import React from 'react';

export const Alerts: React.FC = () => {
  return (
    <>
      <header className="w-full bg-surface-container-lowest shadow-sm rounded-lg p-space-md flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-lg">
          <div className="bg-primary px-3 py-1.5 rounded text-on-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            <span className="font-headline-sm text-headline-sm tracking-wider">CV-IRON-01 // ALARM PANEL</span>
          </div>
          <span className="font-label-md text-label-md text-secondary">ISA-18.2 ALARM MANAGEMENT • SHELVING • ACKNOWLEDGMENT WORKFLOW</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-label-md text-label-md px-2 py-0.5 bg-error-container text-on-error-container font-bold rounded">0 CRITICAL</span>
          <span className="font-label-md text-label-md px-2 py-0.5 bg-[#f59e0b]/15 text-[#f59e0b] font-bold rounded">2 WARNINGS</span>
          <span className="font-label-md text-label-md px-2 py-0.5 bg-primary-fixed text-primary font-bold rounded">1 INFO</span>
          <button className="font-label-md text-label-md text-secondary border border-outline-variant px-2 py-1 rounded hover:bg-surface-container-low flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>ACK ALL
          </button>
        </div>
      </header>

      {/* Alarm Status Summary */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        {[
          { label: 'CRITICAL (P1)', count: 0, color: '#ef4444', bg: '#ef4444' },
          { label: 'WARNING (P2)', count: 2, color: '#f59e0b', bg: '#f59e0b' },
          { label: 'ADVISORY (P3)', count: 1, color: '#0284c7', bg: '#0284c7' },
          { label: 'TOTAL ACTIVE', count: 3, color: '#0f172a', bg: '#64748b' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.bg}15` }}>
              <span className="font-metric-display text-metric-display font-bold" style={{ color: s.color }}>{s.count}</span>
            </div>
            <div>
              <div className="font-label-md text-label-md text-secondary uppercase">{s.label}</div>
              <div className="font-label-md text-label-md font-bold text-on-surface">{s.count === 0 ? 'ALL CLEAR' : `${s.count} ACTIVE`}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Active Alarms */}
      <section className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
        <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
          <span className="font-headline-sm text-headline-sm text-on-surface">ACTIVE ALARM ANNUNCIATOR</span>
          <div className="flex items-center gap-2">
            <button className="font-label-md text-label-md text-secondary border border-outline-variant px-2 py-1 rounded hover:bg-surface-container-low">FILTER</button>
            <button className="font-label-md text-label-md text-on-primary bg-primary px-2 py-1 rounded hover:bg-primary/90 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">download</span>EXPORT LOG
            </button>
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-secondary font-label-md text-label-md uppercase">
              <th className="py-1.5 px-2 font-bold">TIMESTAMP</th>
              <th className="py-1.5 px-2 font-bold">PRIORITY</th>
              <th className="py-1.5 px-2 font-bold">SUBSYSTEM</th>
              <th className="py-1.5 px-2 font-bold">ALARM DESCRIPTION</th>
              <th className="py-1.5 px-2 font-bold">TRIGGER VALUE</th>
              <th className="py-1.5 px-2 font-bold">THRESHOLD</th>
              <th className="py-1.5 px-2 font-bold">STATE</th>
              <th className="py-1.5 px-2 font-bold">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant font-label-md text-label-md">
            {[
              { ts: '14:18:42', pri: 'P2', priColor: '#f59e0b', sys: 'LOAD CELLS', desc: 'Momentary material surge exceeded high-mass advisory threshold', trigger: '62.4 kg', thresh: '60.00 kg', state: 'ACTIVE', stColor: '#f59e0b' },
              { ts: '14:02:11', pri: 'P2', priColor: '#f59e0b', sys: 'VIBRATION', desc: 'Z-axis transient impact kurtosis spike (chute ore drop)', trigger: '4.85 mm/s', thresh: '4.50 mm/s', state: 'ACTIVE', stColor: '#f59e0b' },
              { ts: '13:58:30', pri: 'P3', priColor: '#0284c7', sys: 'SYSTEM', desc: 'MQTT broker reconnection after brief network interruption', trigger: '3.2s gap', thresh: '5.0s max', state: 'ACK', stColor: '#10b981' },
            ].map((alarm, i) => (
              <tr key={i} className="hover:bg-surface-container-low/80">
                <td className="py-1.5 px-2 font-mono text-secondary">{alarm.ts}</td>
                <td className="py-1.5 px-2"><span className="px-1.5 py-0.5 rounded font-bold" style={{ color: alarm.priColor, backgroundColor: `${alarm.priColor}15` }}>{alarm.pri}</span></td>
                <td className="py-1.5 px-2 font-bold">{alarm.sys}</td>
                <td className="py-1.5 px-2">{alarm.desc}</td>
                <td className="py-1.5 px-2 font-mono font-bold text-[#ef4444]">{alarm.trigger}</td>
                <td className="py-1.5 px-2 font-mono text-secondary">{alarm.thresh}</td>
                <td className="py-1.5 px-2"><span className="px-1.5 py-0.5 rounded font-bold" style={{ color: alarm.stColor, backgroundColor: `${alarm.stColor}15` }}>{alarm.state}</span></td>
                <td className="py-1.5 px-2">
                  <button className="font-label-md text-label-md text-primary hover:underline font-bold">{alarm.state === 'ACK' ? 'CLEAR' : 'ACK'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Alarm History */}
      <section className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
        <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
          <span className="font-headline-sm text-headline-sm text-on-surface">ALARM HISTORY (LAST 24H)</span>
          <span className="font-label-md text-label-md text-secondary">SHOWING 8 OF 128 EVENTS</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-secondary font-label-md text-label-md uppercase">
              <th className="py-1 px-2 font-bold">TIME</th>
              <th className="py-1 px-2 font-bold">PRI</th>
              <th className="py-1 px-2 font-bold">SUBSYSTEM</th>
              <th className="py-1 px-2 font-bold">EVENT</th>
              <th className="py-1 px-2 font-bold">RESOLUTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant font-label-md text-label-md">
            {[
              { ts: '13:45:00', pri: 'P3', sys: 'ENCODER', event: 'Speed deviation exceeded 5% for 2 seconds', res: 'Auto-corrected by VFD' },
              { ts: '12:30:15', pri: 'P2', sys: 'VIBRATION', event: 'X-axis lateral vibration advisory', res: 'Self-resolved after belt tracking adjustment' },
              { ts: '11:22:40', pri: 'P3', sys: 'ELECTRICAL', event: 'Current spike during motor start ramp', res: 'Normal startup transient — logged' },
              { ts: '09:15:00', pri: 'P3', sys: 'LOAD', event: 'Empty belt material runout timer warning', res: 'Material feed resumed at 09:16:30' },
              { ts: '08:00:00', pri: 'P3', sys: 'SYSTEM', event: 'Daily baseline calibration sync', res: 'All sensors calibrated — nominal' },
            ].map((ev, i) => (
              <tr key={i} className="hover:bg-surface-container-low/80">
                <td className="py-1 px-2 font-mono text-secondary">{ev.ts}</td>
                <td className="py-1 px-2"><span className={`px-1 py-0.5 rounded font-bold ${ev.pri === 'P2' ? 'text-[#f59e0b] bg-[#f59e0b]/15' : 'text-[#0284c7] bg-[#0284c7]/15'}`}>{ev.pri}</span></td>
                <td className="py-1 px-2 font-bold">{ev.sys}</td>
                <td className="py-1 px-2">{ev.event}</td>
                <td className="py-1 px-2 text-[#047857]">{ev.res}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
};
