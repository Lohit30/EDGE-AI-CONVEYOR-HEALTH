// =============================================================================
// Sidebar — Stitch SCADA industrial navigation (light theme, M3 tokens)
// =============================================================================

import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../config/navigation';

const badgeClasses: Record<string, string> = {
  error: 'bg-error-container text-on-error-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-fixed text-on-tertiary-fixed',
  live: 'bg-[#ef4444] text-white',
};

export const Sidebar: React.FC = () => {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-surface-container-lowest border-r border-outline-variant z-40 flex flex-col justify-between overflow-y-auto">
      <div className="p-space-sm">
        <div className="px-space-sm py-1.5 text-secondary font-label-sm text-label-sm font-bold tracking-widest uppercase border-b border-outline-variant mb-1">
          MAIN NAVIGATION
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-space-sm py-1.5 rounded transition-colors ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-bold border border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`
              }
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`px-1 py-0.5 font-label-sm text-label-sm font-bold rounded ${
                    badgeClasses[item.badgeStyle || 'secondary']
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer: Firmware / PLC / Safety */}
      <div className="p-space-sm border-t border-outline-variant bg-surface-container-low font-label-sm text-label-sm flex flex-col gap-1 text-secondary">
        <div className="flex items-center justify-between">
          <span className="font-mono">FIRMWARE</span>
          <span className="font-mono font-bold text-on-surface">v2.4.1-rc3</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono">PLC LINK</span>
          <span className="font-mono font-bold text-on-surface">ISO/CEMA STD</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono">SAFETY</span>
          <span className="font-mono font-bold text-[#10b981]">E-STOP READY</span>
        </div>
      </div>
    </aside>
  );
};
