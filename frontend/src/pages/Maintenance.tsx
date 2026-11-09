// =============================================================================
// Maintenance Page — Stitch SCADA Work Order & Maintenance Tracking
// + Maintenance Recommendations (live sensor / ML / camera / predictive data)
// =============================================================================

import React, { useState } from 'react';
import {
  useMaintenanceRecommendations,
  type MaintenanceRecommendation,
  type RiskLevel,
  type EvidenceSource,
} from '../hooks/useMaintenanceRecommendations';
import './Maintenance.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskColor(risk: RiskLevel): { text: string; bg: string; border: string } {
  switch (risk) {
    case 'CRITICAL': return { text: '#dc2626', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.4)' };
    case 'HIGH':     return { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)' };
    case 'MEDIUM':   return { text: '#0284c7', bg: 'rgba(2,132,199,0.12)', border: 'rgba(2,132,199,0.4)' };
    default:         return { text: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.4)' };
  }
}

function sourceIcon(src: EvidenceSource): string {
  switch (src) {
    case 'SENSOR':           return 'sensors';
    case 'ML_ENGINE':        return 'neurology';
    case 'CAMERA':           return 'videocam';
    case 'PREDICTIVE_HEALTH':return 'favorite';
    case 'ALERT_HISTORY':    return 'history';
    case 'PM_SCHEDULE':      return 'event';
    default:                 return 'info';
  }
}

function sourceLabel(src: EvidenceSource): string {
  switch (src) {
    case 'SENSOR':           return 'Sensor Data';
    case 'ML_ENGINE':        return 'ML Engine';
    case 'CAMERA':           return 'Camera / Vision';
    case 'PREDICTIVE_HEALTH':return 'Predictive Health';
    case 'ALERT_HISTORY':    return 'Alert History';
    case 'PM_SCHEDULE':      return 'PM Schedule';
    default:                 return 'System';
  }
}

function priorityColor(p: string): string {
  if (p.startsWith('P1')) return '#dc2626';
  if (p.startsWith('P2')) return '#f59e0b';
  if (p.startsWith('P3')) return '#0284c7';
  return '#10b981';
}

function genWoNumber(): string {
  const d = new Date();
  return `WO-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 90 + 10))}`;
}

// ---------------------------------------------------------------------------
// Completion Form Component (inline)
// ---------------------------------------------------------------------------

interface CompletionFormProps {
  recommendation: MaintenanceRecommendation;
  onComplete: (woNumber: string, technician: string, actions: string, parts: string) => void;
  onCancel: () => void;
}

const CompletionForm: React.FC<CompletionFormProps> = ({ recommendation, onComplete, onCancel }) => {
  const [woNumber]    = useState(genWoNumber());
  const [technician,  setTechnician]  = useState('');
  const [actions,     setActions]     = useState('');
  const [parts,       setParts]       = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!technician.trim() || !actions.trim()) return;
    onComplete(woNumber, technician, actions, parts);
  };

  return (
    <div className="maint-rec-complete-form">
      <div className="maint-rec-complete-header">
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#10b981' }}>assignment_turned_in</span>
        <span className="font-label-md text-label-md font-bold text-on-surface">RECORD MAINTENANCE COMPLETION</span>
      </div>
      <div className="font-label-sm text-label-sm text-secondary mb-3">
        Component: <strong className="text-on-surface">{recommendation.component}</strong>
        &nbsp;·&nbsp;Action: <strong className="text-on-surface">{recommendation.action}</strong>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="maint-rec-form-grid">
          <div className="maint-rec-form-field">
            <label className="maint-rec-form-label">WORK ORDER #</label>
            <input
              className="maint-rec-form-input maint-rec-form-input--mono"
              value={woNumber}
              readOnly
            />
          </div>
          <div className="maint-rec-form-field">
            <label className="maint-rec-form-label">TECHNICIAN NAME *</label>
            <input
              className="maint-rec-form-input"
              placeholder="Enter technician name"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="maint-rec-form-field" style={{ marginTop: 8 }}>
          <label className="maint-rec-form-label">ACTIONS TAKEN *</label>
          <textarea
            className="maint-rec-form-textarea"
            placeholder="Describe the maintenance actions performed…"
            value={actions}
            onChange={(e) => setActions(e.target.value)}
            required
          />
        </div>
        <div className="maint-rec-form-field" style={{ marginTop: 8 }}>
          <label className="maint-rec-form-label">PARTS USED (optional)</label>
          <input
            className="maint-rec-form-input"
            placeholder="e.g. 6204-2RS Bearing, NLGI Grade 2 Grease"
            value={parts}
            onChange={(e) => setParts(e.target.value)}
          />
        </div>
        <div className="maint-rec-form-actions">
          <button type="button" className="maint-rec-btn maint-rec-btn--ghost" onClick={onCancel}>
            CANCEL
          </button>
          <button
            type="submit"
            className="maint-rec-btn maint-rec-btn--primary"
            disabled={!technician.trim() || !actions.trim()}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
            LOG TO WORK ORDERS
          </button>
        </div>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Recommendation Card Component
// ---------------------------------------------------------------------------

interface RecCardProps {
  rec: MaintenanceRecommendation;
  onAcknowledge: () => void;
  onStart: () => void;
  onComplete: (woNumber: string, technician: string, actions: string, parts: string) => void;
}

const RecCard: React.FC<RecCardProps> = ({ rec, onAcknowledge, onStart, onComplete }) => {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);

  const rc = riskColor(rec.riskLevel);
  const isCritical = rec.riskLevel === 'CRITICAL';
  const isNominal  = rec.id === 'all-nominal';
  const isCompleted = rec.status === 'COMPLETED';

  return (
    <div
      className={`maint-rec-card${isCritical && !isCompleted ? ' maint-rec-card--critical' : ''}${isNominal ? ' maint-rec-card--nominal' : ''}${isCompleted ? ' maint-rec-card--completed' : ''}`}
    >
      {/* Top row: component + risk badge + status */}
      <div className="maint-rec-card-header">
        <div className="maint-rec-card-left">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: rc.text, flexShrink: 0 }}
          >
            {isNominal ? 'check_circle' : isCritical ? 'emergency' : 'warning'}
          </span>
          <div>
            <div className="font-label-md text-label-md font-bold text-on-surface">{rec.component}</div>
            <div className="font-label-sm text-label-sm text-secondary mt-0.5">{rec.detectedCondition}</div>
          </div>
        </div>
        <div className="maint-rec-card-badges">
          {/* Risk badge */}
          <span
            className="maint-rec-badge"
            style={{ color: rc.text, backgroundColor: rc.bg, border: `1px solid ${rc.border}` }}
          >
            {rec.riskLevel}
          </span>
          {/* Priority badge */}
          <span
            className="maint-rec-badge"
            style={{
              color: priorityColor(rec.priority),
              backgroundColor: `${priorityColor(rec.priority)}15`,
              border: `1px solid ${priorityColor(rec.priority)}40`,
            }}
          >
            {rec.priority}
          </span>
          {/* Status badge */}
          {rec.status !== 'PENDING' && (
            <span className={`maint-rec-badge maint-rec-status-${rec.status.toLowerCase()}`}>
              {rec.status.replace('_', ' ')}
            </span>
          )}
          {/* Demo badge */}
          {rec.isMock && (
            <span className="maint-rec-badge maint-rec-badge--demo">
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>info</span>
              DEMO DATA
            </span>
          )}
        </div>
      </div>

      {/* Recommended action + timing */}
      {!isNominal && (
        <div className="maint-rec-action-row">
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#0284c7' }}>build</span>
          <div className="font-label-md text-label-md text-on-surface">
            <strong>Action:</strong> {rec.action}
          </div>
          <div className="maint-rec-timing">
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
            {rec.timing}
          </div>
        </div>
      )}

        {/* Action buttons — hide when completed */}
      {!isCompleted && (
      <div className="maint-rec-btn-row">
        {/* Evidence toggle */}
        <button
          className="maint-rec-btn maint-rec-btn--ghost"
          onClick={() => { setEvidenceOpen((p) => !p); setCompletionOpen(false); }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
            {evidenceOpen ? 'expand_less' : 'expand_more'}
          </span>
          VIEW EVIDENCE
        </button>

        {!isNominal && (
          <>
            {rec.status === 'PENDING' && (
              <button className="maint-rec-btn maint-rec-btn--secondary" onClick={onAcknowledge}>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>done</span>
                ACKNOWLEDGE
              </button>
            )}
            {(rec.status === 'PENDING' || rec.status === 'ACKNOWLEDGED') && (
              <button
                className="maint-rec-btn maint-rec-btn--primary"
                onClick={() => { onStart(); setCompletionOpen(true); setEvidenceOpen(false); }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>construction</span>
                START MAINTENANCE
              </button>
            )}
            {rec.status === 'IN_PROGRESS' && !completionOpen && (
              <button
                className="maint-rec-btn maint-rec-btn--primary"
                onClick={() => setCompletionOpen((p) => !p)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>assignment_turned_in</span>
                RECORD COMPLETION
              </button>
            )}
          </>
        )}
      </div>
      )}

      {/* Completed summary strip */}
      {isCompleted && (
        <div className="maint-rec-completed-strip">
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#10b981' }}>check_circle</span>
          <span className="font-label-sm text-label-sm" style={{ color: '#10b981' }}>MAINTENANCE COMPLETED — logged to Work Orders</span>
          <button
            className="maint-rec-btn maint-rec-btn--ghost"
            style={{ marginLeft: 'auto' }}
            onClick={() => { setEvidenceOpen((p) => !p); }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
              {evidenceOpen ? 'expand_less' : 'expand_more'}
            </span>
            VIEW EVIDENCE
          </button>
        </div>
      )}

      {/* Evidence Drawer */}
      {evidenceOpen && (
        <div className="maint-rec-evidence">
          <div className="maint-rec-evidence-header">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>fact_check</span>
            <span className="font-label-sm text-label-sm font-bold text-on-surface uppercase">Supporting Evidence</span>
            {rec.isMock && (
              <span className="maint-rec-badge maint-rec-badge--demo ml-auto">
                ⚠ Values are from DEMO / SIMULATED data — backend not connected
              </span>
            )}
          </div>
          <div className="maint-rec-evidence-grid">
            {rec.evidence.map((ev, i) => (
              <div key={i} className="maint-rec-evidence-item">
                <div className="maint-rec-evidence-source">
                  <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{sourceIcon(ev.source)}</span>
                  {sourceLabel(ev.source)}
                </div>
                <div className="maint-rec-evidence-label">{ev.label}</div>
                <div className="maint-rec-evidence-value font-mono">{ev.value}</div>
              </div>
            ))}
          </div>
          <div className="maint-rec-evidence-footer font-label-sm text-label-sm text-secondary">
            Generated at {new Date(rec.generatedAt).toLocaleTimeString('en-GB', { hour12: false })} UTC
            &nbsp;·&nbsp;Sources: Sensor Bus • ML Engine (Random Forest + Isolation Forest) • YOLOv8n-seg Camera • Predictive Health Module
          </div>
        </div>
      )}

      {/* Completion Form — only visible when in-progress */}
      {completionOpen && rec.status === 'IN_PROGRESS' && (
        <CompletionForm
          recommendation={rec}
          onComplete={(wo, tech, acts, parts) => {
            onComplete(wo, tech, acts, parts);
            setCompletionOpen(false);
          }}
          onCancel={() => setCompletionOpen(false)}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Work Order type (for completed records)
// ---------------------------------------------------------------------------

interface WorkOrderRow {
  wo: string;
  type: string;
  comp: string;
  desc: string;
  pri: string;
  priColor: string;
  status: string;
  sColor: string;
  due: string;
}

// ---------------------------------------------------------------------------
// Maintenance Page
// ---------------------------------------------------------------------------

export const Maintenance: React.FC = () => {
  const { recommendations, acknowledge, startMaintenance, completeMaintenance } =
    useMaintenanceRecommendations();

  // Extra work orders added when maintenance is completed via the recommendations panel
  const [extraWorkOrders, setExtraWorkOrders] = useState<WorkOrderRow[]>([]);
  // Whether the "Completed this session" accordion is expanded
  const [completedSectionOpen, setCompletedSectionOpen] = useState(false);

  // Handle recommendation completion — log to Work Orders (card stays visible as COMPLETED)
  const handleComplete = (
    recId: string,
    recComp: string,
    _recAction: string,
    recPriority: string,
    woNumber: string,
    technician: string,
    actions: string,
    parts: string,
  ) => {
    completeMaintenance(recId, { woNumber, technician, actionsTaken: actions, partsUsed: parts });
    const priColor =
      recPriority.startsWith('P1') ? '#ef4444' :
      recPriority.startsWith('P2') ? '#f59e0b' :
      recPriority.startsWith('P3') ? '#0284c7' : '#10b981';
    const today = new Date().toISOString().split('T')[0];
    setExtraWorkOrders((prev) => [
      {
        wo: woNumber,
        type: 'PREDICTIVE',
        comp: recComp,
        desc: actions,
        pri: recPriority.split('–')[0].trim(),
        priColor,
        status: 'COMPLETED',
        sColor: '#10b981',
        due: today,
      },
      ...prev,
    ]);
  };

  // Static work orders (original)
  const baseWorkOrders: WorkOrderRow[] = [
    { wo: 'WO-2025-013', type: 'PREVENTIVE',  comp: 'NDE BEARING',  desc: 'Scheduled lubrication (NLGI Grade 2 grease) — 500hr interval', pri: 'MEDIUM', priColor: '#f59e0b', status: 'OPEN',      sColor: '#f59e0b', due: '2025-03-01' },
    { wo: 'WO-2025-012', type: 'CORRECTIVE',  comp: 'GEARBOX',      desc: 'Coupling alignment verification after GMF harmonic detection',  pri: 'HIGH',   priColor: '#ef4444', status: 'COMPLETED', sColor: '#10b981', due: '2025-02-10' },
    { wo: 'WO-2025-011', type: 'INSPECTION',  comp: 'BELT SURFACE', desc: 'Quarterly visual and dimensional belt inspection',              pri: 'LOW',    priColor: '#0284c7', status: 'COMPLETED', sColor: '#10b981', due: '2025-02-01' },
    { wo: 'WO-2025-010', type: 'CALIBRATION', comp: 'LOAD CELLS',   desc: 'Two-point calibration routine with 10.00 kg certified weight',  pri: 'LOW',    priColor: '#0284c7', status: 'COMPLETED', sColor: '#10b981', due: '2025-02-14' },
  ];

  const allWorkOrders = [...extraWorkOrders, ...baseWorkOrders];

  // KPI: count open work orders
  const openCount = allWorkOrders.filter((w) => w.status === 'OPEN').length;
  const completedCount = allWorkOrders.filter((w) => w.status === 'COMPLETED').length;

  // Split recommendations into active vs completed for the two-zone layout
  const activeRecs    = recommendations.filter((r) => r.status !== 'COMPLETED');
  const completedRecs = recommendations.filter((r) => r.status === 'COMPLETED');

  // Active high-risk recommendations count (for banner)
  const criticalCount = activeRecs.filter((r) => r.riskLevel === 'CRITICAL').length;
  const highCount     = activeRecs.filter((r) => r.riskLevel === 'HIGH').length;

  return (
    <>
      {/* ── PAGE HEADER ─────────────────────────────────────────────────────── */}
      <header className="w-full bg-surface-container-lowest shadow-sm rounded-lg p-space-md flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-lg">
          <div className="bg-primary px-3 py-1.5 rounded text-on-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">build</span>
            <span className="font-headline-sm text-headline-sm tracking-wider">CV-IRON-01 // MAINTENANCE</span>
          </div>
          <span className="font-label-md text-label-md text-secondary">WORK ORDER MANAGEMENT • SPARE PARTS INVENTORY • SERVICE HISTORY</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-label-md text-label-md px-2 py-0.5 bg-secondary-container text-on-secondary-container font-bold rounded">{openCount} OPEN WO</span>
          {criticalCount > 0 && (
            <span className="font-label-md text-label-md px-2 py-0.5 rounded font-bold" style={{ backgroundColor: 'rgba(220,38,38,0.15)', color: '#dc2626' }}>
              {criticalCount} CRITICAL REC
            </span>
          )}
          <span className="font-label-md text-label-md px-2 py-0.5 rounded font-bold" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
            ↺ REFRESHES EVERY 60s
          </span>
        </div>
      </header>

      {/* ── MAINTENANCE RECOMMENDATIONS ──────────────────────────────────────── */}
      <section className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
        {/* Section header */}
        <div className="flex flex-wrap items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-headline-sm text-headline-sm text-on-surface">MAINTENANCE RECOMMENDATIONS</span>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 bg-surface-container-high text-secondary rounded">
              SENSOR DATA
            </span>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}>
              ML ENGINE
            </span>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(2,132,199,0.12)', color: '#0284c7' }}>
              CAMERA INSPECTION
            </span>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#059669' }}>
              PREDICTIVE HEALTH
            </span>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded font-bold animate-pulse"
                style={{ backgroundColor: 'rgba(220,38,38,0.15)', color: '#dc2626' }}>
                ● {criticalCount} CRITICAL
              </span>
            )}
            {highCount > 0 && (
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded font-bold"
                style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                {highCount} HIGH
              </span>
            )}
            <span className="font-label-sm text-label-sm text-secondary">
              {activeRecs.length} active
              {completedRecs.length > 0 && (
                <span style={{ color: '#10b981' }}> · {completedRecs.length} completed</span>
              )}
            </span>
          </div>
        </div>

        {/* Active recommendation cards */}
        <div className="maint-rec-list">
          {activeRecs.length === 0 ? (
            <div className="maint-rec-empty">
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#10b981' }}>check_circle</span>
              <span className="font-label-md text-label-md text-secondary">No active recommendations — all monitored parameters nominal</span>
            </div>
          ) : (
            activeRecs.map((rec) => (
              <RecCard
                key={rec.id}
                rec={rec}
                onAcknowledge={() => acknowledge(rec.id)}
                onStart={() => startMaintenance(rec.id)}
                onComplete={(wo, tech, acts, parts) =>
                  handleComplete(rec.id, rec.component, rec.action, rec.priority, wo, tech, acts, parts)
                }
              />
            ))
          )}
        </div>

        {/* Completed this session — collapsible accordion */}
        {completedRecs.length > 0 && (
          <div className="maint-rec-completed-section">
            <button
              className="maint-rec-completed-toggle"
              onClick={() => setCompletedSectionOpen((p) => !p)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#10b981' }}>check_circle</span>
              <span className="font-label-sm text-label-sm font-bold" style={{ color: '#10b981' }}>
                COMPLETED THIS SESSION
              </span>
              <span
                className="maint-rec-badge"
                style={{ color: '#10b981', backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', marginLeft: 4 }}
              >
                {completedRecs.length}
              </span>
              <span className="maint-rec-completed-chevron font-label-sm text-label-sm text-secondary" style={{ marginLeft: 'auto' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                  {completedSectionOpen ? 'expand_less' : 'expand_more'}
                </span>
                {completedSectionOpen ? 'collapse' : 'show'}
              </span>
            </button>

            {completedSectionOpen && (
              <div className="maint-rec-list" style={{ marginTop: 8 }}>
                {completedRecs.map((rec) => (
                  <RecCard
                    key={rec.id}
                    rec={rec}
                    onAcknowledge={() => acknowledge(rec.id)}
                    onStart={() => startMaintenance(rec.id)}
                    onComplete={(wo, tech, acts, parts) =>
                      handleComplete(rec.id, rec.component, rec.action, rec.priority, wo, tech, acts, parts)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer note */}
        <div className="font-label-sm text-label-sm text-secondary mt-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
          Active recommendations refresh every 60 s from live telemetry. Completing a recommendation logs it to Active Work Orders below and moves it to the session archive above.
        </div>
      </section>

      {/* ── MAINTENANCE KPIs ─────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        {[
          { label: 'TOTAL RUNTIME', value: '1,842.6', unit: 'hrs', icon: 'timer' },
          { label: 'MTBF', value: '612.4', unit: 'hrs', icon: 'trending_up' },
          { label: 'MTTR', value: '2.3', unit: 'hrs', icon: 'build' },
          { label: 'LAST SERVICE', value: '14 Feb', unit: '2025', icon: 'event' },
        ].map((m) => (
          <div key={m.label} className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[18px] text-primary">{m.icon}</span>
              <span className="font-label-md text-label-md text-secondary uppercase">{m.label}</span>
            </div>
            <span className="font-metric-display text-metric-display text-on-surface font-bold">{m.value}<span className="font-label-md text-label-md text-secondary ml-1">{m.unit}</span></span>
          </div>
        ))}
      </section>

      {/* ── ACTIVE WORK ORDERS ───────────────────────────────────────────────── */}
      <section className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
        <div className="flex items-center justify-between pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
          <span className="font-headline-sm text-headline-sm text-on-surface">ACTIVE WORK ORDERS</span>
          <div className="flex items-center gap-2 font-label-md text-label-md">
            <span className="px-1.5 py-0.5 bg-[#f59e0b]/15 text-[#f59e0b] font-bold rounded">{openCount} OPEN</span>
            <span className="px-1.5 py-0.5 bg-[#10b981]/15 text-[#047857] font-bold rounded">{completedCount} COMPLETED</span>
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-secondary font-label-md text-label-md uppercase">
              <th className="py-1.5 px-2 font-bold">WO #</th>
              <th className="py-1.5 px-2 font-bold">TYPE</th>
              <th className="py-1.5 px-2 font-bold">COMPONENT</th>
              <th className="py-1.5 px-2 font-bold">DESCRIPTION</th>
              <th className="py-1.5 px-2 font-bold">PRIORITY</th>
              <th className="py-1.5 px-2 font-bold">STATUS</th>
              <th className="py-1.5 px-2 font-bold">DUE DATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant font-label-md text-label-md">
            {allWorkOrders.map((wo) => (
              <tr key={wo.wo} className="hover:bg-surface-container-low/80">
                <td className="py-1.5 px-2 font-mono font-bold text-primary">{wo.wo}</td>
                <td className="py-1.5 px-2">{wo.type}</td>
                <td className="py-1.5 px-2 font-bold">{wo.comp}</td>
                <td className="py-1.5 px-2">{wo.desc}</td>
                <td className="py-1.5 px-2"><span className="px-1.5 py-0.5 rounded font-bold" style={{ color: wo.priColor, backgroundColor: `${wo.priColor}15` }}>{wo.pri}</span></td>
                <td className="py-1.5 px-2"><span className="px-1.5 py-0.5 rounded font-bold" style={{ color: wo.sColor, backgroundColor: `${wo.sColor}15` }}>{wo.status}</span></td>
                <td className="py-1.5 px-2 font-mono text-secondary">{wo.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── MAINTENANCE SCHEDULE + SPARE PARTS ──────────────────────────────── */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
          <div className="font-headline-sm text-headline-sm text-on-surface mb-3">PREVENTIVE MAINTENANCE SCHEDULE</div>
          {[
            { task: 'BEARING LUBRICATION',    interval: 'Every 500 hrs',  next: '2025-03-01', remaining: '157.4 hrs' },
            { task: 'BELT TENSION CHECK',     interval: 'Every 250 hrs',  next: '2025-02-20', remaining: '42.6 hrs'  },
            { task: 'ENCODER CALIBRATION',    interval: 'Every 1000 hrs', next: '2025-04-15', remaining: '857.4 hrs' },
            { task: 'MOTOR BRUSH INSPECTION', interval: 'Every 2000 hrs', next: '2025-06-01', remaining: '1,657.4 hrs' },
            { task: 'FULL SYSTEM AUDIT',      interval: 'Every 5000 hrs', next: '2026-01-01', remaining: '3,157.4 hrs' },
          ].map((task) => (
            <div key={task.task} className="flex items-center justify-between py-2 border-b border-outline-variant last:border-0">
              <div>
                <span className="font-label-md text-label-md font-bold text-on-surface">{task.task}</span>
                <span className="font-label-md text-label-md text-secondary block">{task.interval} • Next: {task.next}</span>
              </div>
              <span className="font-label-md text-label-md font-bold text-primary">{task.remaining}</span>
            </div>
          ))}
        </div>
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
          <div className="font-headline-sm text-headline-sm text-on-surface mb-3">SPARE PARTS INVENTORY</div>
          <table className="w-full text-left border-collapse font-label-md text-label-md">
            <thead>
              <tr className="bg-surface-container-low text-secondary uppercase">
                <th className="py-1 px-2 font-bold">PART</th>
                <th className="py-1 px-2 font-bold text-center">QTY</th>
                <th className="py-1 px-2 font-bold text-center">MIN</th>
                <th className="py-1 px-2 font-bold">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {[
                { part: '6204-2RS Bearing',    qty: 4, min: 2, ok: true  },
                { part: 'PVC Belt 1000mm',     qty: 1, min: 1, ok: true  },
                { part: 'NLGI Grade 2 Grease', qty: 3, min: 2, ok: true  },
                { part: 'Motor Brushes (pair)',qty: 2, min: 1, ok: true  },
                { part: 'HX711 ADC Module',    qty: 1, min: 1, ok: true  },
                { part: 'ESP32 DevKit V4',     qty: 0, min: 1, ok: false },
              ].map((part) => (
                <tr key={part.part} className="hover:bg-surface-container-low/80">
                  <td className="py-1.5 px-2">{part.part}</td>
                  <td className="py-1.5 px-2 text-center font-bold">{part.qty}</td>
                  <td className="py-1.5 px-2 text-center">{part.min}</td>
                  <td className="py-1.5 px-2">
                    <span className={`px-1.5 py-0.5 rounded font-bold ${part.ok ? 'text-[#047857] bg-[#10b981]/15' : 'text-[#ef4444] bg-[#ef4444]/15'}`}>
                      {part.ok ? 'IN STOCK' : 'ORDER NEEDED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};
