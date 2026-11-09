// =============================================================================
// MqttStatusPanel — Matches reference image MQTT connection card
// =============================================================================

import React from 'react';
import type { ConnectionState } from '../../types/telemetry';
import './MqttStatusPanel.css';

interface MqttStatusPanelProps {
  backendStatus: ConnectionState;
  mqttStatus?: 'Connected' | 'Disconnected' | 'Reconnecting';
  brokerIp?: string;
  port?: number;
  clientId?: string;
  topic?: string;
  qos?: number;
}

export const MqttStatusPanel: React.FC<MqttStatusPanelProps> = ({
  mqttStatus = 'Connected',
  brokerIp = '192.168.1.50',
  port = 1883,
  clientId = 'conveyor_dash',
  topic = 'conveyor/data',
  qos = 0,
}) => {
  const isConnected = mqttStatus === 'Connected';

  return (
    <div className="scada-mqtt-panel">
      <div className="scada-mqtt-header">
        <span className="scada-mqtt-title">MQTT CONNECTION</span>
        <div className="scada-mqtt-status-pill">
          <span className={`scada-mqtt-dot ${isConnected ? 'scada-mqtt-dot--on' : 'scada-mqtt-dot--off'}`} />
          <span className={`scada-mqtt-text ${isConnected ? 'scada-mqtt-text--on' : 'scada-mqtt-text--off'}`}>
            {mqttStatus}
          </span>
        </div>
      </div>

      <div className="scada-mqtt-list">
        <div className="scada-mqtt-row">
          <span className="scada-mqtt-label">Broker IP</span>
          <span className="scada-mqtt-val">{brokerIp}</span>
        </div>
        <div className="scada-mqtt-row">
          <span className="scada-mqtt-label">Port</span>
          <span className="scada-mqtt-val">{port}</span>
        </div>
        <div className="scada-mqtt-row">
          <span className="scada-mqtt-label">Client ID</span>
          <span className="scada-mqtt-val">{clientId}</span>
        </div>
        <div className="scada-mqtt-row">
          <span className="scada-mqtt-label">Topic (In)</span>
          <span className="scada-mqtt-val">{topic}</span>
        </div>
        <div className="scada-mqtt-row">
          <span className="scada-mqtt-label">QoS</span>
          <span className="scada-mqtt-val">{qos}</span>
        </div>
      </div>

      <button className="scada-mqtt-btn scada-mqtt-btn--disconnect">
        <span className="scada-mqtt-btn-icon">🔗</span> Disconnect
      </button>
    </div>
  );
};
