// =============================================================================
// RecentEvents — Clean industrial event log matching reference image
// =============================================================================

import React from 'react';
import './RecentEvents.css';

export interface EventItem {
  id: string;
  time: string;
  type: 'INFO' | 'WARN' | 'CRIT';
  event: string;
  details: string;
}

const DEFAULT_EVENTS: EventItem[] = [
  { id: '1', time: '14:31:52', type: 'INFO', event: 'System normal', details: 'All parameters within normal range' },
  { id: '2', time: '14:28:17', type: 'INFO', event: 'Inspection completed', details: 'AI inspection cycle finished' },
  { id: '3', time: '14:25:03', type: 'WARN', event: 'Load change', details: 'Load increased to 1.72 kg' },
  { id: '4', time: '14:20:11', type: 'INFO', event: 'Motor started', details: 'Conveyor started' },
  { id: '5', time: '14:15:37', type: 'INFO', event: 'System initialized', details: 'All sensors online' },
];

export const RecentEvents: React.FC<{ events?: EventItem[] }> = ({ events = DEFAULT_EVENTS }) => {
  return (
    <div className="scada-events-panel">
      <div className="scada-events-header">
        <span className="scada-events-title">RECENT EVENTS</span>
      </div>

      <div className="scada-events-table-wrap">
        <table className="scada-events-table">
          <thead>
            <tr>
              <th style={{ width: '70px' }}>Time</th>
              <th style={{ width: '60px' }}>Type</th>
              <th style={{ width: '130px' }}>Event</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td className="scada-events-time">{ev.time}</td>
                <td>
                  <span className={`scada-events-pill scada-events-pill--${ev.type.toLowerCase()}`}>
                    {ev.type}
                  </span>
                </td>
                <td className="scada-events-name">{ev.event}</td>
                <td className="scada-events-details">{ev.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
