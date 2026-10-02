import React, { Suspense, lazy } from 'react';
import { isDevEnvironment } from './utils/tenantUrlHelper';
import { initGlobalErrorListeners } from './lib/errorTelemetry';
import { initGlobalErrorSanitizer } from './utils/errorSanitizer';
import { initAntiTamperShield } from './utils/antiTamper';
import { initGlobalCameraKillSwitch } from './utils/cameraKillSwitch';
import { initAppleAlert } from './utils/appleAlert';
import { initKioskUrlBootstrap } from './utils/kioskBootstrap';

import { LegalConsentGate } from './components/LegalConsentGate';
import { SecurityHoneyTrap } from './components/ui/SecurityHoneyTrap';
import { ErrorBoundary, DashboardLoader } from './components/ui/ErrorBoundary';
import { CampusSystemBannersOverlay } from './components/layout/CampusSystemBannersOverlay';
import { CampusAppLayout } from './components/layout/CampusAppLayout';
import { useCampusAppOrchestrator } from './hooks/useCampusAppOrchestrator';
import { lazyWithRetry } from './utils/lazyWithRetry';

const CampusAppModalsHub = lazyWithRetry(() => import('./components/layout/CampusAppModalsHub'), 'CampusAppModalsHub');

import './App.css';

// Initialize FinTech Zero-PII Crash Telemetry Sanitizer & Anti-Tamper Shield
initGlobalErrorListeners();
initGlobalErrorSanitizer();
initAntiTamperShield();
initGlobalCameraKillSwitch();
initAppleAlert();
initKioskUrlBootstrap();

const DeviceSimulator = isDevEnvironment() 
  ? lazy(() => import('./components/ui/DeviceSimulator').then(m => ({ default: m.DeviceSimulator })))
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

const DateSimulationDevWidget = lazy(() => 
  import('./components/ui/DateSimulationDevWidget').then(m => ({ default: m.DateSimulationDevWidget }))
);

function App() {
  const orchestrator = useCampusAppOrchestrator();

  const appBody = orchestrator.startupGate ? (
    orchestrator.startupGate
  ) : (
    <LegalConsentGate user={orchestrator.user}>
      <Suspense fallback={<DashboardLoader />}>
        <SecurityHoneyTrap />
        <DeviceSimulator>
          <CampusSystemBannersOverlay {...orchestrator.bannersOverlayProps} />
          <CampusAppLayout {...orchestrator.layoutProps} />
          <ErrorBoundary fallback={null}>
            <CampusAppModalsHub {...orchestrator.modalsHubProps} />
          </ErrorBoundary>
        </DeviceSimulator>
      </Suspense>
    </LegalConsentGate>
  );

  return (
    <>
      {appBody}
      {(isDevEnvironment() || (typeof window !== 'undefined' && localStorage.getItem('groovelab_dev_date_sim_visible') === 'true')) && (
        <Suspense fallback={null}>
          <DateSimulationDevWidget />
        </Suspense>
      )}
    </>
  );
}

export default App;
