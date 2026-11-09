// =============================================================================
// TopStatusBar (Header) — Stitch SCADA light theme header
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { ActiveAlert } from '../../types/telemetry';

interface TopStatusBarProps {
  machineState?: string;
  alert?: ActiveAlert | null;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({ machineState = 'RUNNING', alert }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString('en-GB', { hour12: false }) + ' UTC';

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest border-b border-outline-variant z-50 px-4 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      {/* Left: Logo + Title + Status (Static footprint to prevent any header shift) */}
      <div className="flex items-center gap-space-md shrink-0">
        <div className="h-8 w-8 bg-primary rounded flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-on-primary text-[18px]">precision_manufacturing</span>
        </div>
        <div className="h-8 w-[1px] bg-outline-variant" />
        <div>
          <div className="font-headline-sm text-headline-sm text-primary flex items-center gap-space-xs leading-none tracking-tight">
            CONVEYOR MONITORING SYSTEM
          </div>
          <div className="font-label-sm text-label-sm text-secondary tracking-widest leading-none mt-1">
            PROTOTYPE CV-01 • SMART • SAFE • RELIABLE
          </div>
        </div>
        <div className="ml-space-xs flex items-center gap-1.5 px-2 py-0.5 bg-surface-container-low border border-outline-variant rounded">
          <span className={`w-2 h-2 rounded-full ${machineState === 'RUNNING' ? 'bg-[#10b981] animate-pulse' : machineState === 'STOPPED' ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'}`} />
          <span className="font-label-sm text-label-sm font-bold text-on-surface tracking-wider">
            {machineState}
          </span>
        </div>
      </div>

      {/* Center: Connection Indicators */}
      <div className="hidden xl:flex items-center gap-space-sm bg-surface-container-low px-space-md py-1 border border-outline-variant rounded shrink-0">
        {[
          { label: 'BACKEND', status: 'OK' },
          { label: 'MQTT', status: 'CONN' },
          { label: 'ESP32', status: 'ONLINE' },
          { label: 'RPI4 EDGE', status: '42°C' },
        ].map((item, i) => (
          <div key={item.label} className={`flex items-center gap-1.5 ${i < 3 ? 'border-r border-outline-variant pr-2.5' : ''}`}>
            <span className="font-label-sm text-label-sm text-secondary">{item.label}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span className="font-label-sm text-label-sm font-bold text-on-surface">{item.status}</span>
          </div>
        ))}
      </div>

      {/* Right: Alert Annunciator + Time + User */}
      <div className="flex items-center gap-space-md shrink-0">
        {/* Alert Annunciator Pill — Consistent footprint, never alters layout */}
        <Link
          to="/alerts"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-label-sm text-label-sm font-bold tracking-wider transition-colors shrink-0 ${
            alert && alert.severity !== 'NORMAL'
              ? alert.severity === 'EMERGENCY'
                ? 'bg-[#fee2e2] border-[#fca5a5] text-[#b91c1c] animate-pulse hover:bg-[#fecaca]'
                : 'bg-[#ffedd5] border-[#fdba74] text-[#c2410c] hover:bg-[#fed7aa]'
              : 'bg-surface-container-low border-outline-variant text-secondary hover:text-on-surface hover:bg-surface-container'
          }`}
          title={alert && alert.severity !== 'NORMAL' ? `${alert.severity}: ${alert.classification} (Click for Alerts)` : 'System Nominal — No Active Alerts'}
        >
          <span className="material-symbols-outlined text-[16px]">
            {alert && alert.severity !== 'NORMAL' ? (alert.severity === 'EMERGENCY' ? 'error' : 'warning') : 'notifications'}
          </span>
          <span className="uppercase text-[11px] font-bold">
            {alert && alert.severity !== 'NORMAL' ? alert.severity : 'NOMINAL'}
          </span>
          {alert && alert.severity !== 'NORMAL' && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping ml-0.5" />
          )}
        </Link>
        <div className="text-right">
          <div className="font-label-md text-label-md text-on-surface font-semibold tracking-wider">
            {timeStr}
          </div>
          <div className="font-label-sm text-label-sm text-tertiary-container font-bold uppercase tracking-wider">
            [SIMULATION / DEV]
          </div>
        </div>
        <div className="h-8 w-[1px] bg-outline-variant" />
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
          <div className="hidden md:block text-left">
            <div className="font-label-sm text-label-sm text-on-surface font-bold leading-tight">
              ENG. K. VANCE
            </div>
            <div className="font-label-sm text-label-sm text-secondary leading-tight">
              ROLE: [ADMIN]
            </div>
          </div>
          <button
            className="p-1 text-secondary hover:text-error hover:bg-error-container/20 rounded transition-colors ml-1"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
