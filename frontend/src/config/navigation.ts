// =============================================================================
// NAVIGATION CONFIGURATION — single source of truth
// Conveyor Belt Monitoring System — Stitch Design System
// =============================================================================
// Uses Material Symbols Outlined icon names (not SVG paths).
// =============================================================================

export interface NavItem {
  id: string;
  label: string;
  path: string;
  segment: string;
  /** Material Symbols Outlined icon name */
  icon: string;
  /** Optional badge text shown next to the nav label */
  badge?: string;
  /** Badge color style: 'error' | 'secondary' | 'tertiary' | 'live' */
  badgeStyle?: 'error' | 'secondary' | 'tertiary' | 'live';
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    path: '/',
    segment: '',
    icon: 'view_quilt',
  },
  {
    id: 'vibration',
    label: 'Vibration',
    path: '/vibration',
    segment: 'vibration',
    icon: 'vibration',
  },
  {
    id: 'load',
    label: 'Load',
    path: '/load',
    segment: 'load',
    icon: 'weight',
  },
  {
    id: 'belt-speed',
    label: 'Belt Speed',
    path: '/belt-speed',
    segment: 'belt-speed',
    icon: 'speed',
  },
  {
    id: 'electrical',
    label: 'Electrical / Voltage',
    path: '/electrical',
    segment: 'electrical',
    icon: 'bolt',
  },
  {
    id: 'camera',
    label: 'Camera Inspection',
    path: '/camera',
    segment: 'camera',
    icon: 'videocam',
    badge: 'LIVE',
    badgeStyle: 'live',
  },

  {
    id: 'predictive',
    label: 'Predictive Health',
    path: '/predictive',
    segment: 'predictive',
    icon: 'neurology',
    badge: 'ML',
    badgeStyle: 'tertiary',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    segment: 'analytics',
    icon: 'analytics',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    path: '/maintenance',
    segment: 'maintenance',
    icon: 'build',
    badge: '1 OPEN',
    badgeStyle: 'secondary',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    path: '/alerts',
    segment: 'alerts',
    icon: 'warning',
    badge: '3 ACTIVE',
    badgeStyle: 'error',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    segment: 'settings',
    icon: 'tune',
  },
];
