// =============================================================================
// Vibration Page — Stitch SCADA Vibration Diagnostics
// =============================================================================

import React from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import { IndustrialGauge } from '../components/gauges/IndustrialGauge';

const generateVibrationWave = (freq1: number, amp1: number, freq2: number, amp2: number, baseline: number, phase: number = 0) => {
  const width = 540;
  const numPoints = 100;
  const points: string[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const x = (i / numPoints) * width;
    const y = baseline + 
      amp1 * Math.sin(x * freq1 + phase) + 
      amp2 * Math.cos(x * freq2 + phase * 0.7);
    const clampedY = Math.max(15, Math.min(150, y));
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${clampedY.toFixed(1)}`);
  }
  return points.join(' ');
};

export const Vibration: React.FC = () => {
  const { frame } = useTelemetry();
  const v = frame.vibration;

  const zWavePath = React.useMemo(() => generateVibrationWave(0.08, 16, 0.18, 5, 95), []);
  const xWavePath = React.useMemo(() => generateVibrationWave(0.05, 9, 0.12, 3, 95, 1.2), []);

  return (
    <>
      {/* Header Banner */}
      <header className="w-full bg-surface-container-lowest shadow-sm rounded-lg p-space-md">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
          <div className="flex flex-wrap items-center gap-space-lg">
            <div className="bg-primary px-3 py-1.5 rounded text-on-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
              <span className="font-headline-sm text-headline-sm tracking-wider">CV-IRON-01</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface">DRIVE-END BEARING VIBRATION DIAGNOSTICS</span>
                <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold uppercase">POS: X=1180mm</span>
              </div>
              <div className="font-label-sm text-label-sm text-secondary flex items-center gap-3 mt-0.5">
                <span>TRANSDUCER: MPU-6050 (6-AXIS IMU @ I2C 0x68)</span>
                <span>•</span>
                <span>NODE: ESP32-WROOM-32D (100Hz MQTT)</span>
                <span>•</span>
                <span>FIFO: 1024-PT RECORD / HANNING WINDOW</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-space-md">
            <div className="bg-surface-container-low px-3 py-1.5 rounded flex items-center gap-3">
              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase">OVERALL RMS (v-rms)</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-metric-display text-metric-display text-primary font-bold">{v.rms.toFixed(2)}</span>
                  <span className="font-label-md text-label-md text-secondary">mm/s</span>
                </div>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
            </div>
            <div className="bg-surface-container-low px-3 py-1.5 rounded flex flex-col justify-center">
              <div className="font-label-sm text-label-sm text-secondary uppercase">ISO 10816-3 CL. I/II</div>
              <div className="font-label-md text-label-md font-bold text-[#0284c7] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                ACCEPTABLE (&lt;4.50 mm/s)
              </div>
            </div>
            <div className="bg-surface-container-low px-3 py-1.5 rounded flex flex-col justify-center">
              <div className="font-label-sm text-label-sm text-secondary uppercase">SYS OPERATING STATE</div>
              <div className="font-label-md text-label-md font-bold text-[#10b981] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                NOMINAL UNRESTRICTED
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Gauge + Axis Metrics + Stats */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Gauge (4 cols) */}
        <div className="lg:col-span-4 bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-space-sm bg-surface-container-low px-3 py-1.5 rounded mb-2">
            <span className="font-headline-sm text-headline-sm text-on-surface">ISO V-RMS DIAL MONITOR</span>
            <span className="font-label-sm text-label-sm font-bold text-secondary tracking-widest">DIN 43700 / 0-5.0 mm/s</span>
          </div>
          <div className="flex items-center justify-center py-4">
            <IndustrialGauge
              label="VIB RMS" value={v.rms} unit="mm/s"
              scaleMin={0} scaleMax={5}
              scaleLabels={['0','1','2','3','4','5']}
              dialLabel="VELOCITY RMS" dialSublabel="mm/s ISO 10816"
              status={v.state as any}
            />
          </div>
          {/* ISO zones bar */}
          <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
            <span className="font-label-sm text-label-sm text-secondary">OPERATING DYNAMIC RANGE</span>
            <span className="font-label-sm text-label-sm font-bold text-on-surface">{((v.rms / 5) * 100).toFixed(1)}% OF FULL SCALE</span>
          </div>
          <div className="w-full h-3 rounded-full bg-surface-container-low flex mt-1.5 overflow-hidden">
            <div className="h-full bg-[#10b981]" style={{ width: '30%' }} />
            <div className="h-full bg-[#f59e0b]" style={{ width: '18%' }} />
            <div className="h-full bg-[#ef4444]" style={{ width: '52%' }} />
          </div>
          <div className="flex items-center justify-between font-label-sm text-label-sm text-secondary mt-1">
            <span>0 (REST)</span>
            <span className="text-[#f59e0b]">4.5 (WARN)</span>
            <span className="text-[#ef4444]">7.1 (TRIP)</span>
            <span>15.0</span>
          </div>
        </div>

        {/* Axis Metrics (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-md">
          {[
            { axis: 'X-AXIS (TRANSVERSE / RADIAL)', label: 'GOOD', color: '#10b981', rmsVel: '1.15', crest: '2.10', peak: '18.4', peakUnit: 'μm' },
            { axis: 'Y-AXIS (AXIAL / THRUST)', label: 'MINIMAL', color: '#0284c7', rmsVel: '0.88', crest: '1.90', peak: '12.1', peakUnit: 'μm' },
            { axis: 'Z-AXIS (VERTICAL / RADIAL LOAD)', label: 'DOMINANT', color: '#f59e0b', rmsVel: '3.02', crest: '4.85', peak: '3.12', peakUnit: '' },
          ].map((ax) => (
            <div key={ax.axis}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: ax.color }} />
                <span className="font-headline-sm text-headline-sm text-on-surface">{ax.axis}</span>
                <span className="font-label-sm text-label-sm font-bold px-1.5 py-0.5 rounded" style={{ color: ax.color, backgroundColor: `${ax.color}20` }}>{ax.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-surface-container-low p-2 rounded">
                  <div className="font-label-sm text-label-sm text-secondary uppercase">RMS VELOCITY</div>
                  <div className="font-metric-display text-metric-display text-on-surface font-bold">{ax.rmsVel}<span className="font-label-sm text-label-sm text-secondary ml-0.5">mm/s</span></div>
                  <div className="h-1 w-full rounded mt-1" style={{ backgroundColor: ax.color }} />
                </div>
                <div className="bg-surface-container-low p-2 rounded">
                  <div className="font-label-sm text-label-sm text-secondary uppercase">CREST FACTOR</div>
                  <div className="font-metric-display text-metric-display text-on-surface font-bold">{ax.crest}</div>
                </div>
                <div className="bg-surface-container-low p-2 rounded">
                  <div className="font-label-sm text-label-sm text-secondary uppercase">PEAK DISPL.</div>
                  <div className="font-metric-display text-metric-display text-on-surface font-bold">{ax.peak}<span className="font-label-sm text-label-sm text-secondary ml-0.5">{ax.peakUnit || 'mm/s'}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Statistical Bearing Matrix (3 cols) */}
        <div className="lg:col-span-3 bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center justify-between pb-space-sm bg-surface-container-low px-3 py-1.5 rounded">
            <span className="font-headline-sm text-headline-sm text-on-surface">STATISTICAL BEARING MATRIX</span>
            <span className="font-label-sm text-label-sm font-bold text-primary">1024 PTS</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-label-sm text-label-sm text-secondary uppercase">PEAK-TO-PEAK (Pk-Pk)</div>
              <div className="font-metric-display text-metric-display text-on-surface font-bold">7.24<span className="font-label-sm text-label-sm text-secondary ml-1">mm/s</span></div>
              <div className="font-body-sm text-body-sm text-secondary mt-1">Full-cycle amplitude excursion</div>
            </div>
            <div>
              <div className="font-label-sm text-label-sm text-secondary uppercase">CREST FACTOR (CF)</div>
              <div className="font-metric-display text-metric-display text-on-surface font-bold">2.41</div>
              <div className="font-body-sm text-body-sm text-[#10b981] mt-1">Nominal &lt; 3.00 (No spikes)</div>
            </div>
            <div>
              <div className="font-label-sm text-label-sm text-secondary uppercase">SIGNAL KURTOSIS (β2)</div>
              <div className="font-metric-display text-metric-display text-on-surface font-bold">3.12</div>
              <div className="font-body-sm text-body-sm text-secondary mt-1">Gaussian Reference (~3.0)</div>
            </div>
            <div>
              <div className="font-label-sm text-label-sm text-secondary uppercase">DISTRIBUTION SKEWNESS</div>
              <div className="font-metric-display text-metric-display text-on-surface font-bold">+0.08</div>
              <div className="font-body-sm text-body-sm text-secondary mt-1">Symmetric loading cycle</div>
            </div>
          </div>
          <div className="border-t border-outline-variant pt-2">
            <div className="font-label-sm text-label-sm text-secondary uppercase mb-1">IMU HEALTH &amp; REGISTRATION</div>
            <div className="grid grid-cols-2 gap-1 font-label-sm text-label-sm">
              <span className="text-secondary">CHIP TEMP:</span><span className="font-bold text-on-surface">38.6 °C</span>
              <span className="text-secondary">I2C ACK:</span><span className="font-bold text-[#10b981]">0x68 VALID</span>
              <span className="text-secondary">ACCEL:</span><span className="font-bold text-on-surface">±2g (16384)</span>
              <span className="text-secondary">DLPF FILTER:</span><span className="font-bold text-on-surface">44 Hz BW</span>
              <span className="text-secondary">RNG:</span><span className="font-bold text-on-surface">LSB/g</span>
            </div>
          </div>
        </div>
      </section>

      {/* Waveform + FFT Charts */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
          <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
            <div>
              <span className="font-headline-sm text-headline-sm text-on-surface block">TIME-DOMAIN ACCELERATION WAVEFORM</span>
              <span className="font-label-sm text-label-sm text-secondary">Z-Axis vs X-Axis Velocity Trajectory (Window: 10.0s @ 100Hz)</span>
            </div>
            <div className="flex items-center gap-3 font-label-sm text-label-sm">
              <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#1e40af]" />Z-Axis</div>
              <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#f59e0b]" />X-Axis</div>
            </div>
          </div>
          <div className="w-full h-48 bg-surface-container-low rounded flex items-center justify-center">
            <svg className="w-full h-full select-none" viewBox="0 0 600 200">
              <defs>
                <clipPath id="accelWaveClip">
                  <rect width="540" height="160" rx="2" />
                </clipPath>
              </defs>
              <rect width="600" height="200" fill="#f8fafc" rx="4" />
              <g transform="translate(40, 10)">
                <rect width="540" height="160" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                {/* Trip limit */}
                <line x1="0" y1="20" x2="540" y2="20" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 3" />
                <text x="5" y="17" fill="#ef4444" fontFamily="IBM Plex Mono" fontSize="7" fontWeight="bold">TRIP LIMIT +7.10 mm/s</text>
                {/* Warn limit */}
                <line x1="0" y1="50" x2="540" y2="50" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 3" />
                <text x="5" y="47" fill="#f59e0b" fontFamily="IBM Plex Mono" fontSize="7" fontWeight="bold">WARN LIMIT +4.50 mm/s</text>

                {/* Bounded Waveforms with Clipping (No Out-of-Bounds Spilling) */}
                <g clipPath="url(#accelWaveClip)">
                  {/* Waveform Z */}
                  <path d={zWavePath} fill="none" stroke="#1e40af" strokeWidth="1.5" />
                  {/* Waveform X */}
                  <path d={xWavePath} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                </g>

                {/* X labels */}
                <g fontFamily="IBM Plex Mono" fontSize="8" fill="#94a3b8" textAnchor="middle">
                  <text x="0" y="180">T -10.0 SEC</text>
                  <text x="135" y="180">T -7.5 SEC</text>
                  <text x="270" y="180">T -5.0 SEC</text>
                  <text x="405" y="180">T -2.5 SEC</text>
                  <text x="540" y="180">T 0.0 (NOW)</text>
                </g>
              </g>
            </svg>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
          <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
            <div>
              <span className="font-headline-sm text-headline-sm text-on-surface block">SPECTRAL ANALYSIS (FFT SPECTRUM)</span>
              <span className="font-label-sm text-label-sm text-secondary">Discrete Hanning Window • F-Span: 0 Hz to 500 Hz • 0.488 Hz Bin</span>
            </div>
            <div className="flex items-center gap-2 font-label-sm text-label-sm">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-secondary">1X / 2X / GMF PEAKS</span>
            </div>
          </div>
          <div className="w-full h-48 bg-surface-container-low rounded flex items-center justify-center">
            <svg className="w-full h-full select-none" viewBox="0 0 600 200">
              <rect width="600" height="200" fill="#f8fafc" rx="4" />
              <g transform="translate(40, 10)">
                <rect width="540" height="160" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                {/* FFT bars */}
                <rect x="45" y="100" width="6" height="60" fill="#1e40af" opacity="0.8" rx="1" />
                <text x="48" y="95" fill="#1e40af" fontFamily="IBM Plex Mono" fontSize="6" fontWeight="bold" textAnchor="middle">2X</text>
                <rect x="90" y="40" width="6" height="120" fill="#0284c7" opacity="0.8" rx="1" />
                <text x="93" y="35" fill="#0284c7" fontFamily="IBM Plex Mono" fontSize="6" fontWeight="bold" textAnchor="middle">1X MOTOR</text>
                <rect x="200" y="80" width="6" height="80" fill="#10b981" opacity="0.8" rx="1" />
                <text x="210" y="75" fill="#10b981" fontFamily="IBM Plex Mono" fontSize="6" fontWeight="bold" textAnchor="middle">GMF</text>
                <rect x="340" y="115" width="6" height="45" fill="#f59e0b" opacity="0.6" rx="1" />
                <text x="343" y="110" fill="#f59e0b" fontFamily="IBM Plex Mono" fontSize="6" fontWeight="bold" textAnchor="middle">2X GMF</text>
                {/* Noise floor */}
                <path d="M 0 150 Q 20 148 40 152 T 80 149 T 120 155 T 160 148 T 200 152 T 240 149 T 280 154 T 320 148 T 360 153 T 400 149 T 440 152 T 480 148 T 540 151" fill="none" stroke="#cbd5e1" strokeWidth="1" />
                {/* X labels */}
                <g fontFamily="IBM Plex Mono" fontSize="8" fill="#94a3b8" textAnchor="middle">
                  <text x="0" y="180">0 Hz (DC)</text>
                  <text x="108" y="180">100 Hz</text>
                  <text x="216" y="180">200 Hz</text>
                  <text x="324" y="180">300 Hz</text>
                  <text x="432" y="180">400 Hz</text>
                  <text x="530" y="180">500 Hz (NYQUIST)</text>
                </g>
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* ISO Limit Zones */}
      <section className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-[20px] text-primary">verified</span>
          <span className="font-headline-sm text-headline-sm text-on-surface">ISO 10816-3 MECHANICAL RIGIDITY LIMIT ENVELOPE (GROUP 1 &amp; 2)</span>
        </div>
        <div className="font-label-sm text-label-sm text-secondary mb-3">E-STOP INTERLOCK LOGIC: ARMED • DEBOUNCE: 5 CONSECUTIVE CYCLES</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { zone: 'ZONE A: GOOD / NEW', limit: '< 1.80 mm/s', desc: 'Unrestricted continuous operation. Baseline condition for freshly commissioned bearings.', active: false, color: '#10b981' },
            { zone: 'ZONE B: ACCEPTABLE', limit: '1.80 - 4.50 mm/s', desc: 'Standard operating conditions for bulk mining conveyors under fluctuating raw ore tonnage.', active: true, color: '#0284c7' },
            { zone: 'ZONE C: ALERT / ACTION', limit: '> 4.50 mm/s', desc: 'Permissible for short intervals. Requires lubrication replenishment or belt idler realign.', active: false, color: '#f59e0b' },
            { zone: 'ZONE D: CRITICAL TRIP', limit: '> 7.10 mm/s', desc: 'Damage imminent. Trips drive PLC interlock to prevent catastrophic cage failure.', active: false, color: '#ef4444' },
          ].map((z) => (
            <div key={z.zone} className={`p-3 rounded-lg border-2 ${z.active ? 'border-[#0284c7] bg-[#0284c7]/5 shadow-sm' : 'border-outline-variant bg-surface-container-low'}`}>
              <div className="font-label-md text-label-md font-bold text-on-surface mb-1">{z.zone}</div>
              <div className="font-label-sm text-label-sm font-bold mb-2 px-2 py-0.5 rounded inline-block" style={{ color: z.color, backgroundColor: `${z.color}20` }}>{z.limit}</div>
              <div className="font-body-sm text-body-sm text-secondary">{z.desc}</div>
              {z.active && (
                <div className="font-label-sm text-label-sm font-bold text-[#0284c7] mt-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7]" />
                  ACTIVE: RUNNING AT {v.rms.toFixed(2)} mm/s
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Vibration Event Log */}
      <section className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
        <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
          <div>
            <span className="font-headline-sm text-headline-sm text-on-surface block">VIBRATION EVENT BUFFER &amp; TELEMETRY AUDIT</span>
            <span className="font-label-sm text-label-sm text-secondary">Dynamic transient anomalies and automated IMU threshold notifications</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="font-label-sm text-label-sm text-secondary border border-outline-variant px-2 py-1 rounded hover:bg-surface-container-low flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">refresh</span>RECALIBRATE MPU6050 ZERO-OFFSET
            </button>
            <button className="font-label-sm text-label-sm text-on-primary bg-primary px-2 py-1 rounded hover:bg-primary/90 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">download</span>EXPORT SPECTRAL CSV
            </button>
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-secondary font-label-sm text-label-sm uppercase">
              <th className="py-1 px-2 font-bold">TIMESTAMP (UTC)</th>
              <th className="py-1 px-2 font-bold">VECTOR AXIS</th>
              <th className="py-1 px-2 font-bold">EVENT CLASSIFICATION / DIAGNOSIS</th>
              <th className="py-1 px-2 text-right font-bold">PEAK AMPLITUDE</th>
              <th className="py-1 px-2 text-right font-bold">KURTOSIS</th>
              <th className="py-1 px-2 text-right font-bold">DURATION</th>
              <th className="py-1 px-2 text-right font-bold">SAFETY STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant font-label-sm text-label-sm">
            {[
              { ts: '14:22:18.04', axis: 'Z-AXIS (RADIAL)', axColor: '#1e40af', event: 'Transient Chute impact shockwave absorbed (Bulk Ore Surge)', amp: '4.85 mm/s', kurt: '3.44', dur: '240 ms', status: 'DAMPED', sColor: '#f59e0b' },
              { ts: '14:19:42.88', axis: 'MULTI-AXIS', axColor: '#0284c7', event: 'Harmonic 2X minor oscillation within envelope limits', amp: '3.88 mm/s', kurt: '2.98', dur: '1.42 s', status: 'RESOLVED', sColor: '#10b981' },
              { ts: '14:14:05.12', axis: 'X-AXIS (TRANSVERSE)', axColor: '#10b981', event: 'Belt tracking lateral shift oscillation detected at tail transition', amp: '2.12 mm/s', kurt: '3.05', dur: '850 ms', status: 'NOMINAL', sColor: '#0284c7' },
              { ts: '14:02:51.30', axis: 'Y-AXIS (AXIAL)', axColor: '#64748b', event: 'Motor soft-start ramp stabilization baseline lock', amp: '1.45 mm/s', kurt: '2.82', dur: '4.20 s', status: 'CALIBRATED', sColor: '#10b981' },
            ].map((ev, i) => (
              <tr key={i} className="hover:bg-surface-container-low/80">
                <td className="py-1 px-2 font-mono text-secondary">{ev.ts}</td>
                <td className="py-1 px-2 font-bold" style={{ color: ev.axColor }}>{ev.axis}</td>
                <td className="py-1 px-2">{ev.event}</td>
                <td className="py-1 px-2 text-right font-mono font-bold">{ev.amp}</td>
                <td className="py-1 px-2 text-right font-mono">{ev.kurt}</td>
                <td className="py-1 px-2 text-right font-mono">{ev.dur}</td>
                <td className="py-1 px-2 text-right">
                  <span className="px-1.5 py-0.5 rounded font-bold" style={{ color: ev.sColor, backgroundColor: `${ev.sColor}20` }}>{ev.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant text-secondary font-label-sm text-label-sm mt-2">
          <span>● FIFO HARDWARE INTERRUPT: PIN GPIO19 ACTIVE (LOW LATENCY STREAM)</span>
          <span>DISPLAY REFRESH: 1000ms • PACKET LOSS: 0.00% • ESP32 I2C CLK: 400kHz FAST-MODE</span>
        </div>
      </section>
    </>
  );
};
