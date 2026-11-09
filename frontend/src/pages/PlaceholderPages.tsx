// =============================================================================
// PLACEHOLDER PAGES — routing stubs
// These pages are navigation placeholders only.
// No fake charts, fake sensor readings, fake ML predictions, or fake data.
// Full implementation will be done in later phases.
// =============================================================================

import React from 'react';
import './PlaceholderPage.css';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => (
  <div className="ph">
    <div className="ph__panel">
      <div className="ph__icon">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
        </svg>
      </div>
      <div className="ph__title">{title}</div>
      <div className="ph__status">NOT YET IMPLEMENTED</div>
      <div className="ph__desc">{description}</div>
    </div>
  </div>
);

export const Vibration: React.FC = () => (
  <PlaceholderPage
    title="VIBRATION ANALYSIS"
    description="Detailed MPU6050 vibration data, FFT frequency spectrum, and axis-resolved acceleration. Will be implemented when backend sensor routes are ready."
  />
);

export const Load: React.FC = () => (
  <PlaceholderPage
    title="LOAD MONITORING"
    description="Individual load cell readings (LC1 / LC2), load distribution, and belt load history. Will be implemented when backend sensor routes are ready."
  />
);

export const BeltSpeed: React.FC = () => (
  <PlaceholderPage
    title="BELT SPEED"
    description="Belt surface speed, motor RPM, encoder pulses, and speed history charts. Will be implemented when backend sensor routes are ready."
  />
);

export const Electrical: React.FC = () => (
  <PlaceholderPage
    title="ELECTRICAL / VOLTAGE"
    description="Motor voltage, current draw, power consumption, and electrical fault detection. Will be implemented when backend sensor routes are ready."
  />
);

export const DigitalTwin: React.FC = () => (
  <PlaceholderPage
    title="DIGITAL TWIN"
    description="Full 3D/detailed digital representation of the conveyor prototype with real-time sensor overlay. Will be implemented in a later phase."
  />
);

export const PredictiveHealth: React.FC = () => (
  <PlaceholderPage
    title="PREDICTIVE HEALTH"
    description="ML-based health scoring, failure probability, and remaining useful life (RUL). The predictive model has not yet been trained. This page will be implemented after sufficient sensor history is collected and the ML model is developed."
  />
);

export const Analytics: React.FC = () => (
  <PlaceholderPage
    title="ANALYTICS"
    description="Historical data analysis, operational statistics, and long-term trend reporting. Will be implemented when the data logging backend is ready."
  />
);

export const Maintenance: React.FC = () => (
  <PlaceholderPage
    title="MAINTENANCE"
    description="Maintenance log, scheduled tasks, and component service records. Will be implemented in a later phase."
  />
);

export const Alerts: React.FC = () => (
  <PlaceholderPage
    title="ALERTS"
    description="Active and historical alert management, threshold configuration, and notification settings. Will be implemented when the alert engine is developed."
  />
);

export const Settings: React.FC = () => (
  <PlaceholderPage
    title="SETTINGS"
    description="System configuration, sensor thresholds, MQTT connection settings, and user preferences. Will be implemented in a later phase."
  />
);
