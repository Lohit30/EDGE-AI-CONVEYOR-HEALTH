import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ActiveAlert } from '../../types/telemetry';
import './EmergencyBanner.css';

interface EmergencyBannerProps {
  alert: ActiveAlert | null | undefined;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ alert }) => {
  const navigate = useNavigate();

  // Dismissal states
  const [dismissedUntil, setDismissedUntil] = useState<number>(0);
  const [sessionMuted, setSessionMuted] = useState<boolean>(() => {
    return sessionStorage.getItem('cbm_alert_toast_muted') === 'true';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false); // Sound default OFF to prevent disturbing noise

  const isDismissed = sessionMuted || Date.now() < dismissedUntil;

  // Optional Beep synthesizer on new Emergency if operator explicitly enabled sound
  useEffect(() => {
    if (!alert || isDismissed || !soundEnabled) return;
    if (alert.severity === 'EMERGENCY') {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch {
        // Audio policy ignore
      }
    }
  }, [alert?.timestamp, alert?.severity, isDismissed, soundEnabled]);

  const handleDismissTenMin = () => {
    setDismissedUntil(Date.now() + 10 * 60 * 1000); // 10 minutes
  };

  const handleMuteSession = () => {
    sessionStorage.setItem('cbm_alert_toast_muted', 'true');
    setSessionMuted(true);
  };

  if (!alert || alert.severity === 'NORMAL' || isDismissed) {
    return null;
  }

  const isEmergency = alert.severity === 'EMERGENCY';

  return (
    <aside
      className={`emergency-toast-card ${isEmergency ? 'toast--emergency' : 'toast--critical'}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Toast Header */}
      <div className="toast-header">
        <div className="toast-title-group">
          <span className="toast-pulsing-icon">
            {isEmergency ? '🚨' : '⚠️'}
          </span>
          <span className={`toast-severity-badge ${isEmergency ? 'badge--emergency' : 'badge--critical'}`}>
            {isEmergency ? 'EMERGENCY' : 'CRITICAL ALERT'}
          </span>
          <span className="toast-defect-name">{alert.classification}</span>
          <span className="toast-confidence">({(alert.confidence * 100).toFixed(1)}% ML)</span>
        </div>

        <div className="toast-top-controls">
          {/* Sound Toggle */}
          <button
            type="button"
            className={`toast-icon-btn ${soundEnabled ? 'btn--sound-on' : 'btn--sound-off'}`}
            onClick={() => setSoundEnabled(prev => !prev)}
            title={soundEnabled ? 'Alarm Sound: Enabled (Click to Mute)' : 'Alarm Sound: Muted (Click to Enable)'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {soundEnabled ? 'volume_up' : 'volume_off'}
            </span>
          </button>

          {/* Quick Close (Dismiss for 10m) */}
          <button
            type="button"
            className="toast-icon-btn toast-close-btn"
            onClick={handleDismissTenMin}
            title="Dismiss notification (10m)"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      {/* Toast Body Details */}
      <div className="toast-body">
        <div className="toast-component-line">
          <strong>Component:</strong> {alert.failed_component || 'Conveyor Subsystem'}
        </div>
        {alert.failure_cause && (
          <div className="toast-cause-line">
            <strong>Cause:</strong> {alert.failure_cause}
          </div>
        )}
      </div>

      {/* Toast Footer Actions */}
      <div className="toast-footer">
        <div className="toast-status-info">
          <span className="toast-dot" />
          <span>SMS Dispatched</span>
        </div>

        <div className="toast-btn-group">
          <button
            type="button"
            className="toast-secondary-btn"
            onClick={handleMuteSession}
            title="Silence toast popups for the rest of this browser session"
          >
            Mute for Session
          </button>

          <button
            type="button"
            className="toast-primary-btn"
            onClick={() => navigate('/alerts')}
            title="Go to full Alerts page"
          >
            View Alerts &rarr;
          </button>
        </div>
      </div>
    </aside>
  );
};
