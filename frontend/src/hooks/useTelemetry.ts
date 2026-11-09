// =============================================================================
// useTelemetry — sensor data hook
// Conveyor Belt Monitoring System
// =============================================================================
// Currently returns demo/mock data and simulates gentle drift using setInterval.
// When the FastAPI WebSocket endpoint is available, replace the mock section
// with a real WebSocket connection — the returned shape stays identical.
//
// ⚠ All data returned while isMock === true is DEMO DATA, not real sensor data.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import type { TelemetryFrame, TrendPoint } from '../types/telemetry';
import {
  DEMO_FRAME,
  DEMO_TREND_VIBRATION,
  DEMO_TREND_LOAD,
  DEMO_TREND_SPEED,
  DEMO_TREND_CURRENT,
} from '../data/mockTelemetry';

export interface TelemetryState {
  frame: TelemetryFrame;
  trendVibration: TrendPoint[];
  trendLoad: TrendPoint[];
  trendSpeed: TrendPoint[];
  trendCurrent: TrendPoint[];
  isMock: boolean;
}

const MAX_TREND_POINTS = 60;

function nudge(value: number, noise: number, min: number, max: number): number {
  const next = value + (Math.random() - 0.5) * noise * 2;
  return Math.min(max, Math.max(min, parseFloat(next.toFixed(3))));
}

function appendTrendPoint(
  history: TrendPoint[],
  value: number,
): TrendPoint[] {
  const now = Date.now();
  const point: TrendPoint = {
    t: new Date(now).toLocaleTimeString('en-GB', { hour12: false }),
    ts: now,
    value,
  };
  const updated = [...history, point];
  return updated.length > MAX_TREND_POINTS
    ? updated.slice(updated.length - MAX_TREND_POINTS)
    : updated;
}

export function useTelemetry(): TelemetryState {
  const [frame, setFrame] = useState<TelemetryFrame>(DEMO_FRAME);
  const [trendVibration, setTrendVibration] = useState<TrendPoint[]>(DEMO_TREND_VIBRATION);
  const [trendLoad, setTrendLoad] = useState<TrendPoint[]>(DEMO_TREND_LOAD);
  const [trendSpeed, setTrendSpeed] = useState<TrendPoint[]>(DEMO_TREND_SPEED);
  const [trendCurrent, setTrendCurrent] = useState<TrendPoint[]>(DEMO_TREND_CURRENT);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Fallback simulator tick when WebSocket is offline (benchtop prototype ranges)
  const tick = useCallback(() => {
    setFrame(prev => {
      const vib = nudge(prev.vibration.rms, 0.015, 0.85, 1.15);
      const load = nudge(prev.load.totalKg, 0.012, 0.88, 1.05);
      const speed = nudge(prev.beltSpeed.speedMs, 0.005, 0.26, 0.30);
      const current = nudge(prev.electrical.currentA, 0.02, 1.08, 1.25);
      const voltage = nudge(prev.electrical.voltageV, 0.03, 12.05, 12.30);
      const power = parseFloat((voltage * current).toFixed(1));

      const next: TelemetryFrame = {
        ...prev,
        vibration: { ...prev.vibration, rms: vib, timestamp: new Date().toISOString() },
        load: {
          ...prev.load,
          totalKg: load,
          cell1Kg: parseFloat((load * 0.505).toFixed(2)),
          cell2Kg: parseFloat((load * 0.495).toFixed(2)),
          timestamp: new Date().toISOString(),
        },
        beltSpeed: {
          ...prev.beltSpeed,
          speedMs: speed,
          motorRpm: parseFloat((speed * 480).toFixed(1)),
          timestamp: new Date().toISOString(),
        },
        electrical: {
          ...prev.electrical,
          voltageV: voltage,
          currentA: current,
          powerW: power,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        isMock: true,
      };

      setTrendVibration(h => appendTrendPoint(h, vib));
      setTrendLoad(h => appendTrendPoint(h, load));
      setTrendSpeed(h => appendTrendPoint(h, speed));
      setTrendCurrent(h => appendTrendPoint(h, current));

      return next;
    });
  }, []);

  // Dynamic WebSocket URL resolver for web and local deployment
  function getWebSocketUrl(): string {
    const envWsUrl = import.meta.env.VITE_WS_URL;
    if (envWsUrl) return envWsUrl;

    const envBackendUrl = import.meta.env.VITE_BACKEND_URL;
    if (envBackendUrl) {
      try {
        const url = new URL(envBackendUrl);
        const proto = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${proto}//${url.host}/ws`;
      } catch {
        // fallback
      }
    }

    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const proto = isHttps ? 'wss:' : 'ws:';
    const host = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
    const port = (typeof window !== 'undefined' && window.location.port) || '';

    // If running in local Vite development mode (5173/3000), connect to default backend port 8000
    if (port === '5173' || port === '3000' || port === '4173') {
      return `${proto}//${host}:8000/ws`;
    }

    // When hosted on web (production / reverse proxy on port 80 or 443), connect to /ws on current host
    const portSuffix = port ? `:${port}` : '';
    return `${proto}//${host}${portSuffix}/ws`;
  }

  // WebSocket Live Connection
  useEffect(() => {
    const wsUrl = getWebSocketUrl();
    let ws: WebSocket | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (unmounted) return;
          setIsLiveConnected(true);
          if (fallbackInterval) clearInterval(fallbackInterval);
        };

        ws.onmessage = (event) => {
          if (unmounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'telemetry' && data.sensors) {
              const s = data.sensors;
              const ml = data.ml;
              const alert = data.alert;
              const vision = data.vision;

              const vibRms = s.vibration_left_mps2 || (Math.max(s.vibration_left_g || 0.12, s.vibration_right_g || 0.11) * 9.80665);
              const totalLoad = s.total_load_kg !== undefined ? s.total_load_kg : ((s.load_left_kg || 0.48) + (s.load_right_kg || 0.47));
              const currentA = s.current_A !== undefined ? s.current_A : 1.15;
              const voltageV = s.voltage_V !== undefined ? s.voltage_V : 12.18;
              const powerW = s.power_W !== undefined ? s.power_W : parseFloat((voltageV * currentA).toFixed(1));
              const speedMs = s.belt_speed_ms !== undefined ? s.belt_speed_ms : (s.motor_state === 'STOPPED' || s.estop_active ? 0.0 : 0.28);
              const motorRpm = s.motor_rpm !== undefined ? s.motor_rpm : (speedMs > 0 ? parseFloat((speedMs * 480).toFixed(1)) : 0);

              let machineState: 'RUNNING' | 'STOPPED' | 'WARNING' | 'CRITICAL' | 'FAULT' = 'RUNNING';
              if (s.estop_active) machineState = 'STOPPED';
              else if (ml?.severity === 'EMERGENCY' || alert?.severity === 'EMERGENCY' || vision?.is_emergency) machineState = 'FAULT';
              else if (ml?.severity === 'CRITICAL' || alert?.severity === 'CRITICAL') machineState = 'CRITICAL';
              else if (ml?.severity === 'WARNING' || alert?.severity === 'WARNING') machineState = 'WARNING';

              // Filter out transient or low confidence fluctuations to prevent annoying alert popups
              const activeAlert = alert || (ml && ml.severity !== 'NORMAL' && ml.confidence >= 0.88 ? {
                severity: ml.severity,
                classification: ml.classification,
                failed_component: ml.failed_component,
                failure_cause: ml.failure_cause,
                confidence: ml.confidence,
                sms_sent: alert?.sms_sent || false,
                timestamp: data.timestamp,
              } : null);

              setFrame({
                vibration: {
                  rms: parseFloat(vibRms.toFixed(2)),
                  peak: parseFloat((vibRms * 1.414).toFixed(2)),
                  dominantFreq: 24.5,
                  state: ml?.severity === 'EMERGENCY' || ml?.severity === 'CRITICAL' ? 'CRITICAL' : (ml?.severity === 'WARNING' ? 'WARNING' : 'NORMAL'),
                  timestamp: data.timestamp,
                },
                load: {
                  totalKg: parseFloat(totalLoad.toFixed(2)),
                  cell1Kg: parseFloat((s.load_left_kg ?? totalLoad / 2).toFixed(2)),
                  cell2Kg: parseFloat((s.load_right_kg ?? totalLoad / 2).toFixed(2)),
                  state: Math.abs((s.load_left_kg || 0) - (s.load_right_kg || 0)) > 0.5 ? 'CRITICAL' : 'NORMAL',
                  timestamp: data.timestamp,
                },
                beltSpeed: {
                  speedMs: parseFloat(speedMs.toFixed(2)),
                  motorRpm: parseFloat(motorRpm.toFixed(1)),
                  state: speedMs === 0 ? 'WARNING' : 'NORMAL',
                  timestamp: data.timestamp,
                },
                electrical: {
                  voltageV: parseFloat(voltageV.toFixed(1)),
                  currentA: parseFloat(currentA.toFixed(2)),
                  powerW: parseFloat(powerW.toFixed(1)),
                  state: currentA > 2.4 ? 'CRITICAL' : (currentA > 2.0 ? 'WARNING' : 'NORMAL'),
                  timestamp: data.timestamp,
                },
                machineState,
                timestamp: data.timestamp,
                isMock: false,
                ml,
                alert: activeAlert,
                vision: vision || null,
              });

              setTrendVibration(h => appendTrendPoint(h, vibRms));
              setTrendLoad(h => appendTrendPoint(h, totalLoad));
              setTrendSpeed(h => appendTrendPoint(h, speedMs));
              setTrendCurrent(h => appendTrendPoint(h, currentA));
            }
          } catch (err) {
            console.error('Error parsing WS frame:', err);
          }
        };

        ws.onclose = () => {
          if (unmounted) return;
          setIsLiveConnected(false);
          // Fallback to local simulation when backend WS drops
          if (!fallbackInterval) fallbackInterval = setInterval(tick, 1000);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws?.close();
        };

      } catch (e) {
        setIsLiveConnected(false);
        if (!fallbackInterval) fallbackInterval = setInterval(tick, 1000);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      unmounted = true;
      if (ws) ws.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [tick]);

  return {
    frame,
    trendVibration,
    trendLoad,
    trendSpeed,
    trendCurrent,
    isMock: !isLiveConnected,
  };
}
