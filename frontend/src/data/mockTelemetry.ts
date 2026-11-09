// =============================================================================
// MOCK / DEMO TELEMETRY DATA
// Conveyor Belt Monitoring System
// =============================================================================
// ⚠ DEMO DATA — NOT REAL SENSOR MEASUREMENTS
// These values are used only for UI development and visual demonstration.
// Replace this module by connecting useTelemetry hook to the FastAPI/WebSocket
// backend when it is implemented.
// =============================================================================

import type {
  TelemetryFrame,
  TrendPoint,
  EventEntry,
  SystemStatus,
} from '../types/telemetry';

// ---------------------------------------------------------------------------
// Static demo snapshot (the "last known" values shown on first render)
// ---------------------------------------------------------------------------

export const DEMO_FRAME: TelemetryFrame = {
  vibration: {
    rms: 0.95,
    peak: 1.34,
    dominantFreq: 24.5,
    state: 'NORMAL',
    timestamp: new Date().toISOString(),
  },
  load: {
    totalKg: 0.95,
    cell1Kg: 0.48,
    cell2Kg: 0.47,
    state: 'NORMAL',
    timestamp: new Date().toISOString(),
  },
  beltSpeed: {
    speedMs: 0.28,
    motorRpm: 134.4,
    state: 'NORMAL',
    timestamp: new Date().toISOString(),
  },
  electrical: {
    voltageV: 12.2,
    currentA: 1.15,
    powerW: 14.0,
    state: 'NORMAL',
    timestamp: new Date().toISOString(),
  },
  machineState: 'RUNNING',
  timestamp: new Date().toISOString(),
  isMock: true, // ← always true for demo data
};

export const DEMO_SYSTEM_STATUS: SystemStatus = {
  backendConnected: 'DISCONNECTED',
  mqttConnected: 'DISCONNECTED',
  deviceConnected: 'DISCONNECTED',
  lastHeartbeat: null,
};

// ---------------------------------------------------------------------------
// Pre-seeded trend history — 60 data points (approx 60 s of history)
// Values are calibrated for the physical 12V benchtop prototype.
// ---------------------------------------------------------------------------

function makeTrendHistory(
  baseValue: number,
  noise: number,
  count = 60,
): TrendPoint[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const ts = now - (count - 1 - i) * 1000;
    const delta = (Math.random() - 0.5) * noise * 2;
    return {
      t: new Date(ts).toLocaleTimeString('en-GB', { hour12: false }),
      ts,
      value: Math.max(0, parseFloat((baseValue + delta).toFixed(3))),
    };
  });
}

export const DEMO_TREND_VIBRATION = makeTrendHistory(0.95, 0.05);
export const DEMO_TREND_LOAD      = makeTrendHistory(0.95, 0.04);
export const DEMO_TREND_SPEED     = makeTrendHistory(0.28, 0.015);
export const DEMO_TREND_CURRENT   = makeTrendHistory(1.15, 0.04);

// ---------------------------------------------------------------------------
// Demo event log — clearly marked as demo events
// ---------------------------------------------------------------------------

export const DEMO_EVENTS: EventEntry[] = [
  {
    id: 'demo-001',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    severity: 'INFO',
    source: 'SYSTEM',
    message: 'Frontend started — awaiting backend connection',
    isMock: true,
  },
  {
    id: 'demo-002',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    severity: 'WARNING',
    source: 'VIBRATION',
    message: '[DEMO] Vibration RMS briefly exceeded warning threshold (2.1 m/s²)',
    isMock: true,
  },
  {
    id: 'demo-003',
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    severity: 'INFO',
    source: 'MQTT',
    message: '[DEMO] MQTT broker connection established',
    isMock: true,
  },
  {
    id: 'demo-004',
    timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
    severity: 'NORMAL',
    source: 'BELT_SPEED',
    message: '[DEMO] Belt speed returned to normal range',
    isMock: true,
  },
  {
    id: 'demo-005',
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    severity: 'CRITICAL',
    source: 'LOAD',
    message: '[DEMO] Load cell imbalance detected — cell delta > 5 kg',
    isMock: true,
  },
  {
    id: 'demo-006',
    timestamp: new Date(Date.now() - 38 * 60000).toISOString(),
    severity: 'INFO',
    source: 'CAMERA',
    message: '[DEMO] Inspection snapshot saved',
    isMock: true,
  },
  {
    id: 'demo-007',
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    severity: 'INFO',
    source: 'SYSTEM',
    message: '[DEMO] System boot — ESP32 connected via MQTT',
    isMock: true,
  },
];
