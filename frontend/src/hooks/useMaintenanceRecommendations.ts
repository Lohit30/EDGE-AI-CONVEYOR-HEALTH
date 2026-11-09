// =============================================================================
// useMaintenanceRecommendations — Derives actionable maintenance recommendations
// from live telemetry, ML engine output, vision detections, and alert history.
//
// Rules mirror the thresholds defined in backend/ml_engine.py and
// backend/alert_manager.py so that frontend logic stays consistent with the
// Python side. No backend changes required — all logic is pure frontend.
//
// Refresh cadence: recommendations are re-evaluated every 60 seconds.
// Completed recommendations stay visible with a COMPLETED badge.
// =============================================================================

import { useState, useEffect, useRef } from 'react';
import { useTelemetry } from './useTelemetry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type RecPriority = 'P1 – Immediate' | 'P2 – Today' | 'P3 – This Week' | 'P4 – Monitor';
export type RecStatus = 'PENDING' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED';
export type EvidenceSource =
  | 'SENSOR'
  | 'ML_ENGINE'
  | 'CAMERA'
  | 'PREDICTIVE_HEALTH'
  | 'ALERT_HISTORY'
  | 'PM_SCHEDULE';

export interface EvidenceItem {
  source: EvidenceSource;
  label: string;
  value: string;
  /** True when this value is from mock/simulated data */
  isMock: boolean;
}

export interface MaintenanceRecommendation {
  id: string;
  component: string;
  /** Short sentence describing what was detected */
  detectedCondition: string;
  riskLevel: RiskLevel;
  /** Human-readable action: "Inspect component", "Replace belt section", etc. */
  action: string;
  priority: RecPriority;
  /** When to do it: "Immediately", "Within 4 hours", "Within 48 hours", etc. */
  timing: string;
  evidence: EvidenceItem[];
  status: RecStatus;
  generatedAt: string; // ISO timestamp
  /** True when ALL evidence came from mock/demo data */
  isMock: boolean;
}

export interface CompletionRecord {
  recommendationId: string;
  woNumber: string;
  technician: string;
  actionsTaken: string;
  partsUsed: string;
  completedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function iso(): string {
  return new Date().toISOString();
}

function riskToTiming(risk: RiskLevel): string {
  switch (risk) {
    case 'CRITICAL': return 'Immediately';
    case 'HIGH':     return 'Within 4 hours';
    case 'MEDIUM':   return 'Within 48 hours';
    default:         return 'Next scheduled window';
  }
}

function riskToPriority(risk: RiskLevel): RecPriority {
  switch (risk) {
    case 'CRITICAL': return 'P1 – Immediate';
    case 'HIGH':     return 'P2 – Today';
    case 'MEDIUM':   return 'P3 – This Week';
    default:         return 'P4 – Monitor';
  }
}

const REFRESH_INTERVAL_MS = 60_000; // re-derive every 60 seconds

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------

export function useMaintenanceRecommendations() {
  const { frame, isMock } = useTelemetry();

  // Keep the latest frame available to the interval without re-registering it
  const frameRef = useRef(frame);
  const isMockRef = useRef(isMock);
  useEffect(() => { frameRef.current = frame; }, [frame]);
  useEffect(() => { isMockRef.current = isMock; }, [isMock]);

  const [recommendations, setRecommendations] = useState<MaintenanceRecommendation[]>([]);
  // Map of id → status (so user actions — including COMPLETED — survive re-derives)
  const statusMap = useRef<Map<string, RecStatus>>(new Map());
  // Completed records to inject into Work Orders
  const [completionRecords, setCompletionRecords] = useState<CompletionRecord[]>([]);

  // Core derive function — reads latest frame from ref so the 60-s interval
  // always uses the most recent telemetry without needing to re-register.
  const derive = () => {
    const frame = frameRef.current;
    const isMock = isMockRef.current;
    const v   = frame.vibration;
    const l   = frame.load;
    const e   = frame.electrical;
    const ml  = frame.ml;
    const al  = frame.alert;
    const vis = frame.vision;

    const vibL  = v.rms; // approximate — useTelemetry exposes max(left, right) as rms
    const vibR  = v.rms; // both sides reflect the same sensor value in frontend model
    const load1 = l.cell1Kg;
    const load2 = l.cell2Kg;
    const loadImbalance = Math.abs(load1 - load2);
    const totalLoad = l.totalKg;
    const current = e.currentA;

    const mlSeverity = ml?.severity ?? al?.severity ?? 'NORMAL';
    const mlClass    = ml?.classification ?? al?.classification ?? '';
    const mlConf     = ml?.confidence ?? al?.confidence ?? 0;
    const mlComp     = ml?.failed_component ?? al?.failed_component ?? '';
    const mlCause    = ml?.failure_cause ?? al?.failure_cause ?? '';
    const isAnomaly  = ml?.is_anomaly ?? false;
    const anomScore  = ml?.anomaly_score ?? 0;

    const visDefect  = vis?.defect_detected ?? false;
    const visType    = vis?.defect_type ?? '';
    const visConf    = vis?.confidence ?? 0;
    const visEmerg   = vis?.is_emergency ?? false;

    const recs: Omit<MaintenanceRecommendation, 'status' | 'generatedAt'>[] = [];

    // ── 1. EMERGENCY STOP — highest priority always ─────────────────────────
    if (frame.machineState === 'STOPPED') {
      recs.push({
        id: 'estop-active',
        component: 'EMERGENCY STOP (E-STOP)',
        detectedCondition: 'Emergency stop circuit active — motor halted',
        riskLevel: 'CRITICAL',
        action: 'Inspect E-Stop cause before restart',
        priority: 'P1 – Immediate',
        timing: 'Before any restart',
        isMock,
        evidence: [
          { source: 'SENSOR', label: 'Machine State', value: 'STOPPED / E-STOP ACTIVE', isMock },
          { source: 'ML_ENGINE', label: 'ML Severity', value: mlSeverity, isMock },
        ],
      });
    }

    // ── 2. Vision / Camera — emergency defects ──────────────────────────────
    if (visDefect && visType) {
      const isEmerg = visEmerg || ['tear', 'human'].includes(visType.toLowerCase());
      const risk: RiskLevel = isEmerg ? 'CRITICAL' : 'HIGH';
      recs.push({
        id: `camera-${visType.toLowerCase().replace(/\s/g, '-')}`,
        component: 'CONVEYOR BELT SURFACE',
        detectedCondition: `YOLOv8n-seg detected ${visType} (conf: ${(visConf * 100).toFixed(1)}%)`,
        riskLevel: risk,
        action: isEmerg
          ? 'Halt belt and inspect belt section immediately — possible tear or safety hazard'
          : `Inspect belt section — ${visType} defect detected`,
        priority: riskToPriority(risk),
        timing: riskToTiming(risk),
        isMock,
        evidence: [
          { source: 'CAMERA', label: 'Defect Type', value: visType, isMock },
          { source: 'CAMERA', label: 'Confidence', value: `${(visConf * 100).toFixed(1)}%`, isMock },
          { source: 'CAMERA', label: 'Emergency Flag', value: String(isEmerg), isMock },
          { source: 'CAMERA', label: 'Detection Source', value: vis?.source ?? 'LAPTOP_WEBCAM', isMock },
        ],
      });
    }

    // ── 3. ML Engine — OBJECT/JAM ───────────────────────────────────────────
    if (
      (mlClass === 'OBJECT/JAM DETECTED' || (al?.classification ?? '').includes('JAM')) &&
      mlSeverity !== 'NORMAL'
    ) {
      const risk: RiskLevel = mlSeverity === 'EMERGENCY' ? 'CRITICAL' : 'HIGH';
      recs.push({
        id: 'ml-jam-detected',
        component: 'DRIVE MOTOR & GEARBOX',
        detectedCondition: `ML model: ${mlClass} — ${mlCause || mlComp}`,
        riskLevel: risk,
        action: risk === 'CRITICAL'
          ? 'Halt belt immediately and inspect for material jam / motor overcurrent'
          : 'Inspect conveyor for obstruction — potential jam condition',
        priority: riskToPriority(risk),
        timing: riskToTiming(risk),
        isMock,
        evidence: [
          { source: 'ML_ENGINE', label: 'Classification', value: mlClass, isMock },
          { source: 'ML_ENGINE', label: 'Confidence', value: `${(mlConf * 100).toFixed(1)}%`, isMock },
          { source: 'ML_ENGINE', label: 'Severity', value: mlSeverity, isMock },
          { source: 'ML_ENGINE', label: 'Root Cause', value: mlCause || 'Overcurrent / jam', isMock },
          { source: 'SENSOR', label: 'Motor Current', value: `${current.toFixed(2)} A`, isMock },
          { source: 'SENSOR', label: 'Total Load', value: `${totalLoad.toFixed(2)} kg`, isMock },
        ],
      });
    }

    // ── 4. Belt Misalignment (ML) ────────────────────────────────────────────
    if (
      (mlClass === 'BELT MISALIGNMENT' || (al?.classification ?? '').includes('MISALIGN')) &&
      mlSeverity !== 'NORMAL'
    ) {
      const risk: RiskLevel = mlSeverity === 'EMERGENCY' ? 'CRITICAL' : mlSeverity === 'CRITICAL' ? 'HIGH' : 'MEDIUM';
      recs.push({
        id: 'ml-belt-misalignment',
        component: 'CONVEYOR BELT TRACKING & LOAD CELLS',
        detectedCondition: `Belt misalignment — load delta ${loadImbalance.toFixed(2)} kg`,
        riskLevel: risk,
        action: risk === 'CRITICAL'
          ? 'Stop belt and realign — severe runoff detected, tear risk'
          : 'Inspect belt tracking and idler alignment — correct load imbalance',
        priority: riskToPriority(risk),
        timing: riskToTiming(risk),
        isMock,
        evidence: [
          { source: 'ML_ENGINE', label: 'Classification', value: mlClass, isMock },
          { source: 'ML_ENGINE', label: 'Confidence', value: `${(mlConf * 100).toFixed(1)}%`, isMock },
          { source: 'SENSOR', label: 'Load Cell 1', value: `${load1.toFixed(2)} kg`, isMock },
          { source: 'SENSOR', label: 'Load Cell 2', value: `${load2.toFixed(2)} kg`, isMock },
          { source: 'SENSOR', label: 'Load Imbalance', value: `${loadImbalance.toFixed(2)} kg delta`, isMock },
          { source: 'ML_ENGINE', label: 'Root Cause', value: mlCause || 'Belt drift on idlers', isMock },
        ],
      });
    }

    // ── 5. Bearing — Vibration thresholds (sensor-level) ────────────────────
    if (vibL >= 2.8 || vibR >= 2.8) {
      const maxVib = Math.max(vibL, vibR);
      recs.push({
        id: 'vib-critical',
        component: 'PULLEY BEARINGS (DRIVE-END)',
        detectedCondition: `Critical vibration level: ${maxVib.toFixed(2)} g — bearing seizure risk`,
        riskLevel: 'CRITICAL',
        action: 'Halt belt and replace/inspect bearing immediately — seizure imminent',
        priority: 'P1 – Immediate',
        timing: 'Immediately',
        isMock,
        evidence: [
          { source: 'SENSOR', label: 'Vibration RMS', value: `${maxVib.toFixed(3)} g`, isMock },
          { source: 'SENSOR', label: 'ISO 10816 Threshold', value: '2.80 g (EMERGENCY)', isMock },
          { source: 'ML_ENGINE', label: 'ML Severity', value: mlSeverity, isMock },
          { source: 'PREDICTIVE_HEALTH', label: 'Component Health', value: 'CRITICAL — BEARING DEGRADATION', isMock },
        ],
      });
    } else if (vibL >= 2.2 || vibR >= 2.2) {
      const maxVib = Math.max(vibL, vibR);
      recs.push({
        id: 'vib-high',
        component: 'PULLEY BEARINGS',
        detectedCondition: `Elevated vibration: ${maxVib.toFixed(2)} g — lubrication or spindle defect`,
        riskLevel: 'HIGH',
        action: 'Inspect bearing condition and schedule lubrication — possible spindle defect',
        priority: 'P2 – Today',
        timing: 'Within 4 hours',
        isMock,
        evidence: [
          { source: 'SENSOR', label: 'Vibration RMS', value: `${maxVib.toFixed(3)} g`, isMock },
          { source: 'SENSOR', label: 'ISO 10816 Warning', value: '2.20 g (CRITICAL)', isMock },
          { source: 'PREDICTIVE_HEALTH', label: 'Trend', value: 'ELEVATED — MONITOR CLOSELY', isMock },
        ],
      });
    } else if (vibL >= 1.95 || vibR >= 1.95) {
      const maxVib = Math.max(vibL, vibR);
      recs.push({
        id: 'vib-medium',
        component: 'BEARINGS',
        detectedCondition: `Slightly elevated vibration: ${maxVib.toFixed(2)} g — above nominal baseline`,
        riskLevel: 'MEDIUM',
        action: 'Schedule bearing inspection at next maintenance window',
        priority: 'P3 – This Week',
        timing: 'Within 48 hours',
        isMock,
        evidence: [
          { source: 'SENSOR', label: 'Vibration RMS', value: `${maxVib.toFixed(3)} g`, isMock },
          { source: 'SENSOR', label: 'Nominal Baseline', value: '< 1.90 g', isMock },
        ],
      });
    }

    // ── 6. Load imbalance (sensor-level, non-ML) ─────────────────────────────
    if (
      loadImbalance >= 2.0 &&
      !recs.some((r) => r.id === 'ml-belt-misalignment')
    ) {
      recs.push({
        id: 'load-imbalance-critical',
        component: 'BELT TRACKING & LOAD CELLS',
        detectedCondition: `Severe load imbalance: ${loadImbalance.toFixed(2)} kg between cells`,
        riskLevel: 'CRITICAL',
        action: 'Stop belt and realign — severe imbalance, tear risk',
        priority: 'P1 – Immediate',
        timing: 'Immediately',
        isMock,
        evidence: [
          { source: 'SENSOR', label: 'Cell 1', value: `${load1.toFixed(2)} kg`, isMock },
          { source: 'SENSOR', label: 'Cell 2', value: `${load2.toFixed(2)} kg`, isMock },
          { source: 'SENSOR', label: 'Delta', value: `${loadImbalance.toFixed(2)} kg (threshold: 2.0 kg)`, isMock },
        ],
      });
    } else if (
      loadImbalance >= 1.0 &&
      !recs.some((r) => r.id === 'ml-belt-misalignment') &&
      !recs.some((r) => r.id === 'load-imbalance-critical')
    ) {
      recs.push({
        id: 'load-imbalance-high',
        component: 'BELT TRACKING',
        detectedCondition: `Load imbalance detected: ${loadImbalance.toFixed(2)} kg`,
        riskLevel: 'HIGH',
        action: 'Inspect belt alignment and idler condition — correct load distribution',
        priority: 'P2 – Today',
        timing: 'Within 4 hours',
        isMock,
        evidence: [
          { source: 'SENSOR', label: 'Cell 1', value: `${load1.toFixed(2)} kg`, isMock },
          { source: 'SENSOR', label: 'Cell 2', value: `${load2.toFixed(2)} kg`, isMock },
          { source: 'SENSOR', label: 'Delta', value: `${loadImbalance.toFixed(2)} kg (threshold: 1.0 kg)`, isMock },
        ],
      });
    }

    // ── 7. Electrical — current thresholds ───────────────────────────────────
    if (current >= 2.8 && !recs.some((r) => r.id === 'ml-jam-detected')) {
      recs.push({
        id: 'current-critical',
        component: 'DRIVE MOTOR & GEARBOX',
        detectedCondition: `Overcurrent: ${current.toFixed(2)} A — motor burnout risk`,
        riskLevel: 'CRITICAL',
        action: 'Halt belt — inspect for jam or motor fault immediately',
        priority: 'P1 – Immediate',
        timing: 'Immediately',
        isMock,
        evidence: [
          { source: 'SENSOR', label: 'Current Draw', value: `${current.toFixed(2)} A`, isMock },
          { source: 'SENSOR', label: 'Emergency Threshold', value: '2.80 A', isMock },
          { source: 'ML_ENGINE', label: 'ML Severity', value: mlSeverity, isMock },
        ],
      });
    } else if (current >= 2.5 && !recs.some((r) => r.id === 'ml-jam-detected') && !recs.some((r) => r.id === 'current-critical')) {
      recs.push({
        id: 'current-high',
        component: 'DRIVE MOTOR',
        detectedCondition: `Elevated current: ${current.toFixed(2)} A — possible partial obstruction`,
        riskLevel: 'HIGH',
        action: 'Inspect belt and motor for partial jam or overload',
        priority: 'P2 – Today',
        timing: 'Within 4 hours',
        isMock,
        evidence: [
          { source: 'SENSOR', label: 'Current Draw', value: `${current.toFixed(2)} A`, isMock },
          { source: 'SENSOR', label: 'Warning Threshold', value: '2.50 A', isMock },
        ],
      });
    }

    // ── 8. Isolation Forest anomaly (non-classified) ─────────────────────────
    if (isAnomaly && anomScore < -0.15 && mlSeverity === 'WARNING' && recs.length === 0) {
      recs.push({
        id: 'ml-anomaly',
        component: 'CONVEYOR DYNAMICS',
        detectedCondition: `Unsupervised ML flagged anomalous sensor profile (score: ${anomScore.toFixed(3)})`,
        riskLevel: 'MEDIUM',
        action: 'Review sensor trends and schedule inspection at next opportunity',
        priority: 'P3 – This Week',
        timing: 'Within 48 hours',
        isMock,
        evidence: [
          { source: 'ML_ENGINE', label: 'Isolation Forest Score', value: anomScore.toFixed(4), isMock },
          { source: 'ML_ENGINE', label: 'Is Anomaly', value: 'TRUE', isMock },
          { source: 'ML_ENGINE', label: 'Classification', value: mlClass || 'OUT-OF-DISTRIBUTION', isMock },
        ],
      });
    }

    // ── 9. Generic ML WARNING (if nothing more specific matched) ─────────────
    if (
      mlSeverity === 'WARNING' &&
      recs.length === 0 &&
      mlClass &&
      mlClass !== 'NORMAL'
    ) {
      recs.push({
        id: 'ml-generic-warning',
        component: mlComp || 'CONVEYOR SUBSYSTEM',
        detectedCondition: `ML warning: ${mlClass} — ${mlCause}`,
        riskLevel: 'MEDIUM',
        action: 'Monitor closely and schedule inspection this week',
        priority: 'P3 – This Week',
        timing: 'Within 48 hours',
        isMock,
        evidence: [
          { source: 'ML_ENGINE', label: 'Classification', value: mlClass, isMock },
          { source: 'ML_ENGINE', label: 'Confidence', value: `${(mlConf * 100).toFixed(1)}%`, isMock },
          { source: 'ML_ENGINE', label: 'Failed Component', value: mlComp, isMock },
          { source: 'ML_ENGINE', label: 'Cause', value: mlCause, isMock },
        ],
      });
    }

    // ── 10. All nominal ───────────────────────────────────────────────────────
    if (recs.length === 0) {
      recs.push({
        id: 'all-nominal',
        component: 'ALL SYSTEMS',
        detectedCondition: 'All monitored parameters within normal operating bounds',
        riskLevel: 'LOW',
        action: 'Continue monitoring — no immediate action required',
        priority: 'P4 – Monitor',
        timing: 'Next scheduled window',
        isMock,
        evidence: [
          { source: 'SENSOR',           label: 'Vibration RMS',   value: `${v.rms.toFixed(3)} g (nominal)`,     isMock },
          { source: 'SENSOR',           label: 'Load Imbalance',  value: `${loadImbalance.toFixed(2)} kg (normal)`, isMock },
          { source: 'SENSOR',           label: 'Motor Current',   value: `${current.toFixed(2)} A (normal)`,    isMock },
          { source: 'ML_ENGINE',        label: 'ML Severity',     value: 'NORMAL',                              isMock },
          { source: 'CAMERA',           label: 'Vision',          value: visDefect ? `Detected: ${visType}` : 'No defects detected', isMock },
          { source: 'PREDICTIVE_HEALTH',label: 'Overall Health',  value: 'NOMINAL',                             isMock },
        ],
      });
    }

    // Merge statuses: user-set statuses (ACK, IN_PROGRESS, COMPLETED) persist
    setRecommendations(
      recs.map((r) => ({
        ...r,
        status: statusMap.current.get(r.id) ?? 'PENDING',
        generatedAt: iso(),
      }))
    );
  };

  // Run once on mount, then every 60 seconds
  useEffect(() => {
    derive(); // immediate first run
    const interval = setInterval(derive, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── User-action handlers ───────────────────────────────────────────────────

  const acknowledge = (id: string) => {
    statusMap.current.set(id, 'ACKNOWLEDGED');
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'ACKNOWLEDGED' } : r))
    );
  };

  const startMaintenance = (id: string) => {
    statusMap.current.set(id, 'IN_PROGRESS');
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'IN_PROGRESS' } : r))
    );
  };

  const completeMaintenance = (
    id: string,
    record: Omit<CompletionRecord, 'recommendationId' | 'completedAt'>
  ) => {
    statusMap.current.set(id, 'COMPLETED');
    // Keep the card in the list — mark it COMPLETED so the operator sees history
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'COMPLETED' } : r))
    );
    setCompletionRecords((prev) => [
      ...prev,
      { ...record, recommendationId: id, completedAt: iso() },
    ]);
  };

  return {
    recommendations,
    completionRecords,
    acknowledge,
    startMaintenance,
    completeMaintenance,
  };
}
