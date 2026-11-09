// =============================================================================
// Overview Page — Stitch SCADA Industrial HMI Overview
// =============================================================================

import React from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import { IndustrialGauge } from '../components/gauges/IndustrialGauge';
import { ConveyorSchematic } from '../components/overview/ConveyorSchematic';

export const Overview: React.FC = () => {
  const { frame } = useTelemetry();
  const v = frame.vibration;
  const l = frame.load;
  const s = frame.beltSpeed;
  const e = frame.electrical;

  return (
    <>
      {/* ── SECTION 1: TOP METADATA & TELEMETRY QUICK STRIP ── */}
      <section className="w-full bg-surface-container-lowest p-space-md shadow-sm rounded-lg flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-x-space-lg gap-y-1">
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm text-secondary tracking-widest uppercase">CONVEYOR UNIT</span>
            <span className="font-headline-sm text-headline-sm text-primary">CV-IRON-01</span>
          </div>
          <div className="h-4 w-px bg-outline-variant hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
            <span className="font-label-md text-label-md text-on-surface font-semibold">Bulk Handling Berth 4B</span>
          </div>
          <div className="h-4 w-px bg-outline-variant hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-secondary">timer</span>
            <span className="font-label-sm text-label-sm text-secondary">HOURS:</span>
            <span className="font-label-md text-label-md font-bold text-on-surface">1,842.6 hrs</span>
          </div>
          <div className="h-4 w-px bg-outline-variant hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-secondary">conveyor_belt</span>
            <span className="font-label-sm text-label-sm text-secondary">MASS FLOW:</span>
            <span className="font-label-md text-label-md font-bold text-on-surface">12.5 kg/h</span>
          </div>
        </div>
        {/* Quick Telemetry Chips */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 shrink-0">
          {[
            { label: 'VIB RMS', value: v.rms.toFixed(2), unit: 'mm/s' },
            { label: 'TOTAL LOAD', value: l.totalKg.toFixed(2), unit: 'kg' },
            { label: 'SPEED', value: s.speedMs.toFixed(2), unit: 'm/s' },
            { label: 'CURRENT', value: e.currentA.toFixed(2), unit: 'A' },
            { label: 'VOLTAGE', value: e.voltageV.toFixed(1), unit: 'V' },
            { label: 'POWER', value: e.powerW.toFixed(1), unit: 'W' },
          ].map((chip) => (
            <div key={chip.label} className="bg-surface-container-low px-2 py-1 rounded text-center">
              <div className="font-label-sm text-label-sm text-secondary uppercase">{chip.label}</div>
              <div className="font-headline-sm text-headline-sm text-primary">
                {chip.value}<span className="font-label-sm text-label-sm text-secondary ml-0.5">{chip.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 2: 6 ANALOG GAUGES (SCALED FOR 12V BENCHTOP PROTOTYPE) ── */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-space-md">
        <IndustrialGauge
          label="VIBRATION" value={v.rms} unit="mm/s"
          scaleMin={0} scaleMax={5}
          scaleLabels={['0','1','2','3','4','5']}
          dialLabel="mm/s RMS" dialSublabel="ISO 10816"
          status={v.state as any}
        />
        <IndustrialGauge
          label="LOAD" value={l.totalKg} unit="kg"
          scaleMin={0} scaleMax={5}
          scaleLabels={['0','1','2','3','4','5']}
          dialLabel="KG TOTAL" dialSublabel="HX711 DUAL"
          status={l.state as any}
        />
        <IndustrialGauge
          label="BELT SPEED" value={s.speedMs} unit="m/s"
          scaleMin={0} scaleMax={1.0}
          scaleLabels={['0.0','0.2','0.4','0.6','0.8','1.0']}
          dialLabel="m/s ENCODER" dialSublabel="100 PPR SYNC"
          status={s.state as any}
          setpoint={0.28}
        />
        <IndustrialGauge
          label="CURRENT" value={e.currentA} unit="A"
          scaleMin={0} scaleMax={3}
          scaleLabels={['0','1','2','3']}
          dialLabel="AMPERES DC" dialSublabel="INA219 SHUNT"
          status={e.state as any}
        />
        <IndustrialGauge
          label="VOLTAGE" value={e.voltageV} unit="V"
          scaleMin={0} scaleMax={15}
          scaleLabels={['0','3','6','9','12','15']}
          dialLabel="VOLTS DC" dialSublabel="INA219 BUS ADC"
          status={e.state as any}
        />
        <IndustrialGauge
          label="POWER" value={e.powerW} unit="W"
          scaleMin={0} scaleMax={30}
          scaleLabels={['0','6','12','18','24','30']}
          dialLabel="WATTS (P=VI)" dialSublabel="ACTIVE LOAD"
          status={e.state as any}
        />
      </section>

      {/* ── SECTION 3 & 4: SCHEMATIC + INTERLOCK PANEL ── */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
        {/* Schematic (8 cols) */}
        <div className="xl:col-span-8 bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">precision_manufacturing</span>
              <span className="font-headline-sm text-headline-sm text-primary">PHYSICAL BENCHTOP TESTBENCH SCHEMATIC</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-label-sm text-label-sm text-secondary uppercase font-bold">12V DC PROTOTYPE RIG</span>
              <span className="font-label-sm text-label-sm px-2 py-0.5 bg-primary/10 text-primary font-bold rounded">CALIBRATED</span>
            </div>
          </div>
          <ConveyorSchematic
            loadLeftKg={l.cell1Kg}
            loadRightKg={l.cell2Kg}
            totalLoadKg={l.totalKg}
            speedMs={s.speedMs}
            motorRpm={s.motorRpm}
            currentA={e.currentA}
            voltageV={e.voltageV}
            powerW={e.powerW}
            vibRms={v.rms}
            isRunning={frame.machineState === 'RUNNING'}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-space-sm text-center">
            {[
              { label: 'CARRIER BED TENSION', value: '24.5 N' },
              {
                label: 'LC DIFFERENTIAL (Δ)',
                value: `${Math.abs(l.cell1Kg - l.cell2Kg).toFixed(2)} kg (${Math.abs(l.cell1Kg - l.cell2Kg) < 0.25 ? 'BALANCED' : 'IMBALANCE'})`,
                color: Math.abs(l.cell1Kg - l.cell2Kg) < 0.25 ? 'text-[#047857]' : 'text-[#dc2626]',
              },
              { label: 'ENCODER TICK FREQ', value: `${(s.speedMs * 490).toFixed(1)} Hz` },
              { label: 'MOTOR TORQUE EFF', value: '91.4 %' },
            ].map((item) => (
              <div key={item.label} className="bg-surface-container-low p-1.5 rounded">
                <span className="font-label-sm text-label-sm text-secondary block">{item.label}</span>
                <span className={`font-label-md text-label-md font-bold ${item.color || 'text-on-surface'}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          {/* ML Real-Time Diagnosis Card */}
          <div className={`p-space-md rounded-lg shadow-sm border transition-all ${
            frame.alert?.severity === 'EMERGENCY' || frame.ml?.severity === 'EMERGENCY'
              ? 'bg-[#fef2f2] border-[#dc2626] animate-pulse'
              : frame.alert?.severity === 'CRITICAL' || frame.ml?.severity === 'CRITICAL'
                ? 'bg-[#fff7ed] border-[#ea580c]'
                : frame.alert?.severity === 'WARNING' || frame.ml?.severity === 'WARNING'
                  ? 'bg-[#fffbeb] border-[#f59e0b]'
                  : 'bg-surface-container-lowest border-transparent'
          }`}>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[20px] ${
                  frame.alert?.severity === 'EMERGENCY' || frame.ml?.severity === 'EMERGENCY'
                    ? 'text-[#dc2626]'
                    : frame.alert?.severity === 'CRITICAL' || frame.ml?.severity === 'CRITICAL'
                      ? 'text-[#ea580c]'
                      : 'text-primary'
                }`}>neurology</span>
                <span className="font-headline-sm text-headline-sm text-primary uppercase">ML PART DIAGNOSIS</span>
              </div>
              <span className={`font-label-sm text-label-sm font-bold px-2 py-0.5 rounded ${
                frame.alert?.severity === 'EMERGENCY' || frame.ml?.severity === 'EMERGENCY'
                  ? 'bg-[#dc2626] text-white animate-bounce'
                  : frame.alert?.severity === 'CRITICAL' || frame.ml?.severity === 'CRITICAL'
                    ? 'bg-[#ea580c] text-white'
                    : frame.alert?.severity === 'WARNING' || frame.ml?.severity === 'WARNING'
                      ? 'bg-[#f59e0b] text-white'
                      : 'bg-[#10b981]/20 text-[#047857]'
              }`}>
                {frame.alert?.severity || frame.ml?.severity || 'NORMAL'}
              </span>
            </div>

            {/* Diagnostic Details */}
            <div className="space-y-2">
              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase">Calculated Failing Part:</div>
                <div className={`font-headline-sm text-headline-sm font-bold ${
                  (frame.alert?.failed_component || frame.ml?.failed_component) &&
                  (frame.alert?.failed_component !== 'ALL SYSTEMS OPERATIONAL' && frame.ml?.failed_component !== 'ALL SYSTEMS OPERATIONAL')
                    ? 'text-[#dc2626]'
                    : 'text-on-surface'
                }`}>
                  {frame.alert?.failed_component || frame.ml?.failed_component || 'ALL SYSTEMS NOMINAL'}
                </div>
              </div>

              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase">ML Defect Classification:</div>
                <div className="font-label-md text-label-md font-semibold text-on-surface flex items-center justify-between">
                  <span>{frame.alert?.classification || frame.ml?.classification || 'NORMAL'}</span>
                  {frame.ml && (
                    <span className="font-mono text-xs text-secondary">
                      Conf: {(frame.ml.confidence * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>

              {(frame.alert?.failure_cause || frame.ml?.failure_cause) && (
                <div className="bg-surface-container-low p-2 rounded text-xs">
                  <span className="font-bold text-secondary">Sensor Triggers: </span>
                  <span className="text-on-surface">{frame.alert?.failure_cause || frame.ml?.failure_cause}</span>
                </div>
              )}

              {/* SMS Notification Banner */}
              {(frame.alert?.severity === 'EMERGENCY' || frame.alert?.severity === 'CRITICAL') && (
                <div className="bg-[#dc2626]/10 border border-[#dc2626]/30 p-2 rounded flex items-center gap-2 text-xs text-[#b91c1c] font-semibold">
                  <span className="material-symbols-outlined text-[16px]">sms</span>
                  <span>SMS alert dispatched to Admin & Maint (+917305198655)</span>
                </div>
              )}
            </div>
          </div>

          {/* Subsystem Status */}
          <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 mb-2 bg-surface-container-low px-2 py-1.5 rounded">
              <span className="font-headline-sm text-headline-sm text-primary uppercase">SUBSYSTEM STATUS</span>
              <span className="font-label-sm text-label-sm text-secondary uppercase font-bold">
                {frame.alert?.severity === 'EMERGENCY' ? 'TRIP RISK' : 'HEALTH MONITOR'}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {(() => {
                const failed = (frame.alert?.failed_component || frame.ml?.failed_component || '').toUpperCase();
                const isEmergency = frame.alert?.severity === 'EMERGENCY' || frame.ml?.severity === 'EMERGENCY';
                const isMotorFault = failed.includes('MOTOR');
                const isBeltFault = failed.includes('LOAD') || failed.includes('TRACKING') || failed.includes('BELT');
                const isBearingFault = failed.includes('BEARING');
                const isEstop = failed.includes('ESTOP') || failed.includes('EMERGENCY STOP');

                const items = [
                  {
                    name: 'CONVEYOR MECHANICAL',
                    status: isEstop ? 'E-STOP TRIPPED' : 'RUNNING',
                    style: isEstop ? 'danger' : 'normal',
                    pulse: isEstop,
                  },
                  {
                    name: '12V DC MOTOR DRIVE',
                    status: isMotorFault ? (isEmergency ? 'JAM / EMERGENCY' : 'OVERCURRENT') : 'ACTIVE',
                    style: isMotorFault ? 'danger' : 'normal',
                    pulse: isMotorFault,
                  },
                  {
                    name: 'LOAD CELLS (HX711 DUAL)',
                    status: isBeltFault ? (isEmergency ? 'RUNOFF / EMERGENCY' : 'IMBALANCE') : 'OK',
                    style: isBeltFault ? 'danger' : 'normal',
                    pulse: isBeltFault,
                  },
                  {
                    name: 'MPU6050 I2C BUS',
                    status: isBearingFault ? 'BEARING VIB HIGH' : 'COMM OK',
                    style: isBearingFault ? 'danger' : 'normal',
                    pulse: isBearingFault,
                  },
                  { name: 'SPEED OPTICAL ENCODER', status: 'PULSE SYNC', style: 'normal' },
                  { name: 'EDGE GATEWAY (ESP32 → RPI)', status: 'ACTIVE', style: 'neutral' },
                  { name: 'MQTT BROKER (TCP:1883)', status: 'CONNECTED', style: 'normal' },
                  {
                    name: 'AI / ML INFERENCE',
                    status: isEmergency ? 'ALARM TRIGGERED' : 'ACTIVE',
                    style: isEmergency ? 'danger' : 'info',
                  },
                  {
                    name: 'RPI WEBCAM VISION (YOLOv8)',
                    status: frame.vision?.defect_detected
                      ? `${frame.vision.defect_type?.toUpperCase() || 'DEFECT'} DETECTED`
                      : 'MONITORING (RPI)',
                    style: frame.vision?.defect_detected ? 'danger' : 'normal',
                    pulse: frame.vision?.defect_detected,
                  },
                ];

                return items.map((item) => (
                  <div key={item.name} className="flex items-center justify-between px-2 py-1 bg-surface-container-low rounded">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        item.style === 'danger'
                          ? 'bg-[#dc2626]'
                          : item.style === 'info'
                            ? 'bg-[#3b82f6]'
                            : item.style === 'neutral'
                              ? 'bg-[#94a3b8]'
                              : 'bg-[#10b981]'
                      } ${item.pulse ? 'animate-pulse' : ''}`} />
                      <span className="font-label-sm text-label-sm font-semibold text-on-surface">{item.name}</span>
                    </div>
                    <span className={`font-label-sm text-label-sm font-bold px-1.5 py-0.5 rounded ${
                      item.style === 'danger'
                        ? 'text-white bg-[#dc2626]'
                        : item.style === 'neutral'
                          ? 'text-on-surface bg-surface-container-highest'
                          : item.style === 'info'
                            ? 'text-primary bg-primary-fixed'
                            : 'text-[#047857] bg-[#10b981]/20'
                    }`}>{item.status}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Actuator Interface */}
          <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between pb-1 bg-surface-container-low px-2 py-1 rounded">
              <span className="font-headline-sm text-headline-sm text-primary uppercase">ACTUATOR INTERFACE</span>
              <span className="font-label-sm text-label-sm text-secondary uppercase">OPERATOR LEVEL 2</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="col-span-2 bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white p-2.5 rounded flex items-center justify-center gap-2 font-headline-sm text-headline-sm font-bold tracking-wider uppercase transition-all shadow-sm">
                <span className="material-symbols-outlined text-[24px]">emergency_home</span>
                EMERGENCY STOP (E-STOP)
              </button>
              {[
                { icon: 'speed', label: 'RAMP SPEED (+)' },
                { icon: 'slow_motion_video', label: 'RAMP SPEED (-)' },
                { icon: 'scale', label: 'ZERO LOAD CELLS' },
                { icon: 'restart_alt', label: 'RESET PEAKS' },
              ].map((btn) => (
                <button key={btn.label} className="bg-surface-container-low hover:bg-surface-container text-on-surface p-2 rounded flex items-center justify-center gap-1.5 font-label-md text-label-md font-bold transition-all">
                  <span className="material-symbols-outlined text-[18px]">{btn.icon}</span>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: TREND CHART + EVENT LOG ── */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
        {/* Left: Telemetry Strip Chart (7 cols) */}
        <div className="xl:col-span-7 bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">show_chart</span>
              <span className="font-headline-sm text-headline-sm text-primary uppercase">TELEMETRY STRIP RECORDER (60s BUFFER)</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              {[
                { color: '#f59e0b', label: 'VIB RMS [mm/s]' },
                { color: '#0284c7', label: 'SPEED [m/s]' },
                { color: '#1e40af', label: 'LOAD [kg]' },
              ].map((legend) => (
                <div key={legend.label} className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded" style={{ backgroundColor: legend.color }} />
                  <span className="font-label-sm text-label-sm text-secondary">{legend.label}</span>
                </div>
              ))}
            </div>
          </div>
          <TelemetryChart vib={v.rms} speed={s.speedMs} load={l.totalKg} />
          <div className="flex items-center justify-between text-secondary pt-2">
            <span className="font-label-sm text-label-sm font-mono">SAMPLING RATE: 100 Hz • BUFFER DEPTH: 6000 PTS</span>
            <span className="font-label-sm text-label-sm font-mono">FFT WINDOW: 1024 Hanning</span>
          </div>
        </div>

        {/* Right: Event Log (5 cols) */}
        <div className="xl:col-span-5 bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">warning</span>
              <span className="font-headline-sm text-headline-sm text-primary uppercase">ANNUNCIATOR ALARM LOG</span>
            </div>
            <span className="font-label-sm text-label-sm px-2 py-0.5 bg-error-container text-on-error-container font-bold rounded">0 CRITICAL</span>
          </div>
          <EventLogTable />
          <div className="flex items-center justify-between pt-2 border-t border-outline-variant text-secondary">
            <span className="font-label-sm text-label-sm">SHOWING 5 OF 128 EVENTS</span>
            <button className="font-label-sm text-label-sm text-primary hover:underline font-bold">EXPORT CSV AUDIT</button>
          </div>
        </div>
      </section>
    </>
  );
};

const generateStripPath = (baseY: number, amp: number, freq1: number, freq2: number, phase: number = 0) => {
  const width = 610;
  const numPoints = 120;
  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const x = (i / numPoints) * width;
    const y = baseY + 
      amp * Math.sin(x * freq1 + phase) + 
      (amp * 0.35) * Math.cos(x * freq2 + phase * 0.5);
    const clampedY = Math.max(20, Math.min(165, y));
    points.push([x, clampedY]);
  }
  const linePath = points.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L 610 175 L 0 175 Z`;
  return { linePath, areaPath, lastY: points[points.length - 1][1] };
};

const TelemetryChart: React.FC<{ vib: number; speed: number; load: number }> = ({ vib, speed, load }) => {
  const speedTrace = React.useMemo(() => generateStripPath(62, 5, 0.02, 0.05, 0.5), []);
  const loadTrace = React.useMemo(() => generateStripPath(92, 7, 0.018, 0.04, 1.2), []);
  const vibTrace = React.useMemo(() => generateStripPath(132, 9, 0.035, 0.08, 2.0), []);

  return (
    <div className="w-full bg-surface-container-low rounded p-2 relative">
      <svg className="w-full h-full select-none" viewBox="0 0 680 230">
        <defs>
          <pattern id="telemetryGrid" width="40" height="30" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#cbd5e1" strokeWidth="0.6" strokeOpacity="0.6" />
          </pattern>
          <linearGradient id="vibFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="speedFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="loadFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e40af" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
          </linearGradient>
          <clipPath id="stripClip">
            <rect width="610" height="175" rx="2" />
          </clipPath>
        </defs>
        <rect width="680" height="230" fill="#ffffff" rx="4" />
        <g transform="translate(50, 15)">
          <rect width="610" height="175" fill="#f8fafc" rx="2" stroke="#e2e8f0" strokeWidth="1" />
          <rect width="610" height="175" fill="url(#telemetryGrid)" />
          {/* Y-axis labels */}
          <g fontFamily="IBM Plex Mono" fontSize="8.5" fill="#94a3b8" textAnchor="end">
            <text x="-8" y="12">100%</text>
            <text x="-8" y="55">75%</text>
            <text x="-8" y="98">50%</text>
            <text x="-8" y="140">25%</text>
            <text x="-8" y="178">0%</text>
          </g>
          {/* X-axis labels */}
          <g fontFamily="IBM Plex Mono" fontSize="8.5" fill="#94a3b8" textAnchor="middle">
            <text x="10" y="192">-60s</text>
            <text x="110" y="192">-50s</text>
            <text x="210" y="192">-40s</text>
            <text x="310" y="192">-30s</text>
            <text x="410" y="192">-20s</text>
            <text x="510" y="192">-10s</text>
            <text x="605" y="192">0s (NOW)</text>
          </g>

          {/* Bounded Traces with Clip Guard */}
          <g clipPath="url(#stripClip)">
            {/* Load trace */}
            <path d={loadTrace.areaPath} fill="url(#loadFill)" />
            <path d={loadTrace.linePath} fill="none" stroke="#1e40af" strokeWidth="2" />
            {/* Speed trace */}
            <path d={speedTrace.areaPath} fill="url(#speedFill)" />
            <path d={speedTrace.linePath} fill="none" stroke="#0284c7" strokeWidth="2" />
            {/* Vibration trace (Bounded within nominal 20-30% range) */}
            <path d={vibTrace.areaPath} fill="url(#vibFill)" />
            <path d={vibTrace.linePath} fill="none" stroke="#f59e0b" strokeWidth="2" />
          </g>

          {/* NOW line */}
          <line x1="610" y1="0" x2="610" y2="175" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="3 2" />
          {/* Current value dots */}
          <circle cx="610" cy={loadTrace.lastY} r="4" fill="#1e40af" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="610" cy={speedTrace.lastY} r="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="610" cy={vibTrace.lastY} r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
          {/* Value tooltip */}
          <g transform="translate(530, 18)">
            <rect width="72" height="42" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" rx="2" opacity="0.95" />
            <text x="6" y="12" fill="#f59e0b" fontFamily="IBM Plex Mono" fontSize="7.5" fontWeight="bold">VIB: {vib.toFixed(2)}</text>
            <text x="6" y="24" fill="#0284c7" fontFamily="IBM Plex Mono" fontSize="7.5" fontWeight="bold">SPD: {speed.toFixed(2)}</text>
            <text x="6" y="36" fill="#1e40af" fontFamily="IBM Plex Mono" fontSize="7.5" fontWeight="bold">LOD: {load.toFixed(1)}</text>
          </g>
        </g>
      </svg>
    </div>
  );
};

const DEMO_EVENTS = [
  { time: '14:22:18', sev: 'INFO', sevClass: 'bg-primary-fixed text-primary', comp: 'MOTOR', desc: 'Current ramp stable at 2.15 A', reading: '2.15 A', readingClass: 'text-[#047857]' },
  { time: '14:18:42', sev: 'WARN', sevClass: 'bg-amber-100 text-amber-800', comp: 'LC-02', desc: 'Momentary material transient spike', reading: '26.8 kg', readingClass: 'text-amber-700' },
  { time: '14:15:00', sev: 'INFO', sevClass: 'bg-primary-fixed text-primary', comp: 'ENCODER', desc: 'Phase pulse calibration sync OK', reading: '1.85 m/s', readingClass: 'text-[#047857]' },
  { time: '14:02:11', sev: 'INFO', sevClass: 'bg-primary-fixed text-primary', comp: 'MPU6050', desc: 'Bearing Z-axis RMS within nominal bounds', reading: '3.42 mm/s', readingClass: 'text-[#047857]' },
  { time: '13:58:30', sev: 'INFO', sevClass: 'bg-primary-fixed text-primary', comp: 'SYS', desc: 'Routine baseline telemetry sync', reading: 'ACK', readingClass: 'text-secondary' },
];

const EventLogTable: React.FC = () => (
  <div className="overflow-x-auto w-full">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-surface-container-low text-secondary font-label-sm text-label-sm uppercase">
          <th className="py-1 px-2 font-bold">TIME</th>
          <th className="py-1 px-1.5 font-bold">SEV</th>
          <th className="py-1 px-2 font-bold">COMP</th>
          <th className="py-1 px-2 font-bold">EVENT DESCRIPTION</th>
          <th className="py-1 px-2 text-right font-bold">READING</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant font-label-sm text-label-sm">
        {DEMO_EVENTS.map((ev, i) => (
          <tr key={i} className="hover:bg-surface-container-low/80">
            <td className="py-1 px-2 font-mono text-secondary">{ev.time}</td>
            <td className="py-1 px-1.5">
              <span className={`px-1 py-0.5 font-bold rounded ${ev.sevClass}`}>{ev.sev}</span>
            </td>
            <td className="py-1 px-2 font-mono font-semibold">{ev.comp}</td>
            <td className="py-1 px-2">{ev.desc}</td>
            <td className={`py-1 px-2 text-right font-mono ${ev.readingClass}`}>{ev.reading}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
