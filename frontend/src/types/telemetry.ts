// =============================================================================
// TELEMETRY TYPES
// Conveyor Belt Monitoring System
// =============================================================================
// These interfaces define the shape of real sensor data that will be delivered
// by the FastAPI/MQTT backend. All mock data must conform to these types.
// =============================================================================

/** Engineering state for a sensor reading */
export type EngineState = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE' | 'INFO';

/** Overall machine operating state */
export type MachineState = 'RUNNING' | 'STOPPED' | 'WARNING' | 'CRITICAL' | 'FAULT';

/** Backend/MQTT connection status */
export type ConnectionState = 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';

// -----------------------------------------------------------------------------
// Individual sensor readings
// -----------------------------------------------------------------------------

export interface VibrationReading {
  /** RMS acceleration in m/s² */
  rms: number;
  /** Peak acceleration in m/s² */
  peak: number;
  /** Dominant frequency in Hz (from FFT) */
  dominantFreq: number;
  state: EngineState;
  timestamp: string; // ISO 8601
}

export interface LoadReading {
  /** Combined load from both load cells in kg */
  totalKg: number;
  /** Individual load cell 1 in kg */
  cell1Kg: number;
  /** Individual load cell 2 in kg */
  cell2Kg: number;
  state: EngineState;
  timestamp: string;
}

export interface BeltSpeedReading {
  /** Belt surface speed in m/s */
  speedMs: number;
  /** Motor encoder RPM */
  motorRpm: number;
  state: EngineState;
  timestamp: string;
}

export interface ElectricalReading {
  /** Motor supply voltage in V */
  voltageV: number;
  /** Motor current draw in A */
  currentA: number;
  /** Calculated power in W */
  powerW: number;
  state: EngineState;
  timestamp: string;
}

// -----------------------------------------------------------------------------
// Aggregated telemetry frame — what the frontend state holds at one instant
// -----------------------------------------------------------------------------

export interface MLPrediction {
  classification: string;
  confidence: number;
  anomaly_score: number;
  is_anomaly: boolean;
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  failed_component: string;
  failure_cause: string;
}

export interface ActiveAlert {
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  classification: string;
  failed_component: string;
  failure_cause: string;
  confidence: number;
  sms_sent: boolean;
  timestamp: string;
}

export interface VisionInspection {
  defect_detected: boolean;
  defect_type?: string;
  confidence?: number;
  is_emergency?: boolean;
  details?: string;
  source?: string;
  timestamp?: string;
}

export interface TelemetryFrame {
  vibration: VibrationReading;
  load: LoadReading;
  beltSpeed: BeltSpeedReading;
  electrical: ElectricalReading;
  machineState: MachineState;
  /** UTC timestamp of this frame */
  timestamp: string;
  /** True when this frame is mock/demo data, not from the backend */
  isMock: boolean;
  /** Real-time ML prediction */
  ml?: MLPrediction;
  /** Active alert with component failure details */
  alert?: ActiveAlert | null;
  /** Edge optical inspection from Raspberry Pi webcam */
  vision?: VisionInspection | null;
}

// -----------------------------------------------------------------------------
// System / connection status
// -----------------------------------------------------------------------------

export interface SystemStatus {
  backendConnected: ConnectionState;
  mqttConnected: ConnectionState;
  deviceConnected: ConnectionState;
  lastHeartbeat: string | null;
}

// -----------------------------------------------------------------------------
// Event log entry
// -----------------------------------------------------------------------------

export type EventSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'NORMAL';

export interface EventEntry {
  id: string;
  timestamp: string;
  severity: EventSeverity;
  source: string;
  message: string;
  /** True when this event is mock/demo, not from the backend */
  isMock: boolean;
}

// -----------------------------------------------------------------------------
// Trend data point (for charts)
// -----------------------------------------------------------------------------

export interface TrendPoint {
  /** Relative time label, e.g. "-30s" or HH:MM:SS */
  t: string;
  /** Epoch ms — used as chart X key */
  ts: number;
  value: number;
}
