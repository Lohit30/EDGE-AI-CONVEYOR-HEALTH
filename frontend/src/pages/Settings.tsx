// =============================================================================
// Settings Page — SCADA System Configuration & SMS Notification Manager
// =============================================================================

import React, { useState, useEffect } from 'react';

interface SMSTemplateResponse {
  template: string;
  preview: string;
  contacts: Array<{ number: string; role: string; name: string }>;
  sms_configured: boolean;
  placeholders: string[];
}

export const Settings: React.FC = () => {
  const [smsData, setSmsData] = useState<SMSTemplateResponse | null>(null);
  const [templateText, setTemplateText] = useState<string>('');
  const [previewText, setPreviewText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const host = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
  const backendUrl = `http://${host}:8000`;

  // Fetch current template on load
  useEffect(() => {
    fetch(`${backendUrl}/api/alerts/template`)
      .then((res) => res.json())
      .then((data: SMSTemplateResponse) => {
        setSmsData(data);
        setTemplateText(data.template);
        setPreviewText(data.preview);
      })
      .catch((err) => console.warn('Could not load SMS template:', err));
  }, [backendUrl]);

  // Save updated template
  const handleSaveTemplate = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${backendUrl}/api/alerts/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateText }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewText(data.preview);
        setStatusMsg({ type: 'success', text: 'SMS template saved and active for all emergency alerts!' });
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to update template on backend.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error connecting to backend.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger test SMS
  const handleSendTestSms = async () => {
    setIsSendingTest(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${backendUrl}/api/alerts/test_sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sms_configured) {
          setStatusMsg({
            type: 'success',
            text: `Test SMS dispatched via Twilio to ${data.sent_count} contact(s)!`,
          });
        } else {
          setStatusMsg({
            type: 'success',
            text: 'Test alert generated and logged to backend logs (Twilio credentials not configured in .env).',
          });
        }
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Error triggering test SMS.' });
    } finally {
      setIsSendingTest(false);
    }
  };

  const insertPlaceholder = (ph: string) => {
    setTemplateText((prev) => `${prev} ${ph}`);
  };

  return (
    <div className="flex flex-col gap-space-md w-full">
      <header className="w-full bg-surface-container-lowest shadow-sm rounded-lg p-space-md flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        <div className="flex flex-wrap items-center gap-space-lg">
          <div className="bg-primary px-3 py-1.5 rounded text-on-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span className="font-headline-sm text-headline-sm tracking-wider">SYSTEM SETTINGS</span>
          </div>
          <span className="font-label-sm text-label-sm text-secondary">
            CONFIGURATION • EMERGENCY SMS TEMPLATES • ALARM THRESHOLDS • CONNECTIVITY
          </span>
        </div>
        <button
          onClick={handleSaveTemplate}
          disabled={isSaving}
          className="font-label-sm text-label-sm text-on-primary bg-primary px-4 py-2 rounded hover:bg-primary/90 flex items-center gap-1.5 shadow transition-all disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">save</span>
          {isSaving ? 'SAVING...' : 'SAVE ALL CHANGES'}
        </button>
      </header>

      {statusMsg && (
        <div
          className={`p-3 rounded-lg text-xs font-bold flex items-center justify-between shadow ${
            statusMsg.type === 'success' ? 'bg-[#10b981]/20 text-[#047857] border border-[#10b981]' : 'bg-red-600/20 text-red-600 border border-red-500'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-sm font-bold">×</button>
        </div>
      )}

      {/* ── SMS EMERGENCY NOTIFICATION & TEMPLATE EDITOR SECTION ── */}
      <section className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm border border-outline-variant flex flex-col gap-space-md">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">sms</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">
              EMERGENCY &amp; CRITICAL SMS ALERT TEMPLATE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                smsData?.sms_configured
                  ? 'bg-[#10b981]/20 text-[#047857]'
                  : 'bg-amber-500/20 text-amber-700'
              }`}
            >
              {smsData?.sms_configured ? 'TWILIO ACTIVE' : 'LOG SIMULATION MODE'}
            </span>
            <button
              onClick={handleSendTestSms}
              disabled={isSendingTest}
              className="px-3 py-1 bg-surface-container hover:bg-surface-container-high text-xs font-bold rounded flex items-center gap-1 text-on-surface transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px]">send</span>
              {isSendingTest ? 'Sending...' : 'Send Test SMS'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
          {/* Left Column: Editable Template & Placeholders (7 cols) */}
          <div className="xl:col-span-7 flex flex-col gap-3">
            <div>
              <label className="text-xs font-bold text-on-surface block mb-1">
                SMS Message Body Template:
              </label>
              <textarea
                rows={9}
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                className="w-full p-3 bg-surface-container-low border border-outline-variant rounded font-mono text-xs text-on-surface focus:outline-none focus:border-primary"
                placeholder="Enter custom SMS template..."
              />
            </div>

            {/* Placeholder Pills */}
            <div>
              <span className="text-[11px] text-secondary font-semibold block mb-1.5">
                Click to insert dynamic sensor variables:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '{prefix}',
                  '{conveyor_id}',
                  '{failed_component}',
                  '{classification}',
                  '{confidence}',
                  '{failure_cause}',
                  '{time}',
                  '{vib_l}',
                  '{vib_r}',
                  '{load_l}',
                  '{load_r}',
                  '{current}',
                  '{motor_state}',
                ].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insertPlaceholder(ph)}
                    className="px-2 py-0.5 bg-surface-container hover:bg-primary/20 text-primary font-mono text-[11px] rounded border border-outline-variant transition-all"
                  >
                    {ph}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-secondary">
                Character count: <span className="font-mono font-bold text-on-surface">{templateText.length}</span> (Standard SMS is 160 chars)
              </span>
              <button
                onClick={handleSaveTemplate}
                disabled={isSaving}
                className="px-4 py-1.5 bg-primary text-on-primary text-xs font-bold rounded hover:bg-primary/90 shadow transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Apply Template'}
              </button>
            </div>
          </div>

          {/* Right Column: Live SMS Preview & Recipients (5 cols) */}
          <div className="xl:col-span-5 flex flex-col gap-3">
            <div>
              <span className="text-xs font-bold text-on-surface block mb-1">
                Recipient Preview (As Sent to Admin / Maintenance Phone):
              </span>
              <div className="p-3 bg-[#0a101d] text-emerald-300 rounded-lg border border-slate-700 font-mono text-xs whitespace-pre-wrap shadow-inner leading-relaxed min-h-[160px]">
                {previewText || 'No preview generated.'}
              </div>
            </div>

            {/* Alert Contacts */}
            <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant flex flex-col gap-1.5">
              <span className="text-xs font-bold text-on-surface block">
                Configured Escalation Numbers:
              </span>
              {smsData?.contacts && smsData.contacts.length > 0 ? (
                smsData.contacts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-outline-variant last:border-0">
                    <span className="font-semibold text-on-surface uppercase">{c.role} ({c.name})</span>
                    <span className="font-mono text-primary font-bold">{c.number}</span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-secondary italic">
                  Set ALERT_ADMIN_PHONES and ALERT_MAINTENANCE_PHONES in backend/.env
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── SENSOR THRESHOLDS & CONNECTIVITY SETTINGS ── */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-space-md">
        {/* Sensor Alarm Thresholds */}
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm border border-outline-variant">
          <div className="font-headline-sm text-headline-sm text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">sensors</span>
            SENSOR ALARM THRESHOLDS
          </div>
          {[
            {
              group: 'VIBRATION (ISO 10816)',
              params: [
                { label: 'Warning Limit (Zone C)', value: '2.20', unit: 'g' },
                { label: 'Trip Limit (Zone D)', value: '2.80', unit: 'g' },
                { label: 'Debounce Cycles', value: '2', unit: 'cycles' },
              ],
            },
            {
              group: 'LOAD CELLS',
              params: [
                { label: 'Imbalance Trip Limit', value: '1.20', unit: 'kg' },
                { label: 'High Load Alarm', value: '10.00', unit: 'kg' },
                { label: 'Severe Jam Cutout', value: '12.00', unit: 'kg' },
              ],
            },
            {
              group: 'MOTOR DRIVE CURRENT',
              params: [
                { label: 'Nominal Current', value: '2.20', unit: 'A' },
                { label: 'Warning Current', value: '2.50', unit: 'A' },
                { label: 'Critical Overcurrent Trip', value: '2.80', unit: 'A' },
              ],
            },
          ].map((group) => (
            <div key={group.group} className="mb-4 last:mb-0">
              <div className="font-label-md text-label-md font-bold text-primary uppercase mb-2">
                {group.group}
              </div>
              {group.params.map((p) => (
                <div
                  key={p.label}
                  className="flex items-center justify-between py-1.5 border-b border-outline-variant last:border-0"
                >
                  <span className="font-label-sm text-label-sm text-on-surface">{p.label}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      defaultValue={p.value}
                      className="w-20 px-2 py-0.5 bg-surface-container-low border border-outline-variant rounded font-label-md text-label-md font-bold text-on-surface text-right focus:outline-none focus:border-primary font-mono"
                    />
                    <span className="font-label-sm text-label-sm text-secondary w-12">{p.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Connectivity & Access */}
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm border border-outline-variant flex flex-col justify-between">
          <div>
            <div className="font-headline-sm text-headline-sm text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">wifi</span>
              CONNECTIVITY &amp; BACKEND
            </div>
            {[
              { label: 'MQTT Broker Host', value: 'mqtt / localhost' },
              { label: 'MQTT Port', value: '1883' },
              { label: 'MQTT Topic Prefix', value: 'conveyor/cv-iron-01' },
              { label: 'FastAPI Backend URL', value: 'http://localhost:8000' },
              { label: 'WebSocket Stream', value: 'ws://localhost:8000/ws' },
              { label: 'Inference Engine', value: 'ONNX YOLOv8n-seg + Scikit-Learn' },
            ].map((field) => (
              <div
                key={field.label}
                className="flex items-center justify-between py-1.5 border-b border-outline-variant last:border-0 text-xs"
              >
                <span className="text-secondary">{field.label}</span>
                <span className="font-mono font-bold text-on-surface">{field.value}</span>
              </div>
            ))}

            <div className="font-headline-sm text-headline-sm text-on-surface mt-5 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">person</span>
              USER &amp; ACCESS
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <span className="text-secondary">Current User:</span>
              <span className="font-bold text-on-surface">PLANT ENGINEER</span>
              <span className="text-secondary">Role:</span>
              <span className="font-bold text-primary">ADMINISTRATOR</span>
              <span className="text-secondary">Session:</span>
              <span className="font-bold text-[#10b981]">ONLINE &amp; ACTIVE</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
