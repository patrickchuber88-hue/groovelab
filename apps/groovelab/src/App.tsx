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
import { ErrorBoundary } from './components/ui/ErrorBoundary';
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

function App() {
  const orchestrator = useCampusAppOrchestrator();

  if (orchestrator.startupGate) {
    return orchestrator.startupGate;
  }

  return (
    <LegalConsentGate user={orchestrator.user}>
      <Suspense fallback={null}>
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
}

export default App;
