// =============================================================================
// App — root component with routing (Stitch SCADA Layout)
// =============================================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { TopStatusBar } from './components/layout/TopStatusBar';
import { Overview } from './pages/Overview';
import { Vibration } from './pages/Vibration';
import { Load } from './pages/Load';
import { BeltSpeed } from './pages/BeltSpeed';
import { Electrical } from './pages/Electrical';
import { CameraInspection } from './pages/CameraInspection';
import { PredictiveHealth } from './pages/PredictiveHealth';
import { Analytics } from './pages/Analytics';
import { Maintenance } from './pages/Maintenance';
import { Alerts } from './pages/Alerts';
import { Settings } from './pages/Settings';
import { EmergencyBanner } from './components/common/EmergencyBanner';
import { useTelemetry } from './hooks/useTelemetry';

const AppInner: React.FC = () => {
  const { frame } = useTelemetry();

  return (
    <div className="min-h-screen bg-background">
      <TopStatusBar machineState={frame.machineState} alert={frame.alert} />
      <Sidebar />
      <div className="pl-64">
        <main className="relative pt-16 bg-surface-container-lowest min-h-screen p-space-md border-l border-outline-variant">
          <div className="flex flex-col w-full gap-space-md font-body-md text-on-surface">
            <Routes>
              <Route path="/"              element={<Overview />} />
              <Route path="/vibration"     element={<Vibration />} />
              <Route path="/load"          element={<Load />} />
              <Route path="/belt-speed"    element={<BeltSpeed />} />
              <Route path="/electrical"    element={<Electrical />} />
              <Route path="/camera"        element={<CameraInspection />} />
              <Route path="/predictive"    element={<PredictiveHealth />} />
              <Route path="/analytics"     element={<Analytics />} />
              <Route path="/maintenance"   element={<Maintenance />} />
              <Route path="/alerts"        element={<Alerts />} />
              <Route path="/settings"      element={<Settings />} />
              <Route path="*"              element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Floating Toast Notification — Fixed position, zero effect on page flow */}
      <EmergencyBanner alert={frame.alert} />
    </div>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppInner />
  </BrowserRouter>
);

export default App;
