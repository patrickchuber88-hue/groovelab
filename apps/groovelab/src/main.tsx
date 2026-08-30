import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { MasterPricingProvider } from './context/MasterPricingContext'
import './index.css'

// Anti-Clickjacking & Frame-Busting Guard (ASVS Level 3)
if (typeof window !== 'undefined' && window.top !== window.self) {
  try {
    if (window.top) {
      window.top.location.href = window.self.location.href;
    }
  } catch (e) {
    // If top window is cross-origin and blocks modification, clear view
    document.body.innerHTML = '';
  }
}

// Real-Time CSP Violation & Threat Telemetry (ASVS Level 3)
if (typeof document !== 'undefined') {
  let lastCspReportTime = 0;
  document.addEventListener('securitypolicyviolation', (e: SecurityPolicyViolationEvent) => {
    const now = Date.now();
    if (now - lastCspReportTime < 5000) return; // Rate-limit client telemetry to prevent flooding
    lastCspReportTime = now;

    console.warn('[Security Shield] CSP Violation intercepted:', e.blockedURI, e.violatedDirective);
    import('./lib/supabase').then(async ({ supabase }) => {
      try {
        await (supabase.rpc as any)('report_csp_violation', {
          p_document_uri: e.documentURI || window.location.href,
          p_blocked_uri: e.blockedURI || '',
          p_violated_directive: e.violatedDirective || '',
          p_original_policy: (e.originalPolicy || '').substring(0, 1000),
          p_sample: (e.sample || '').substring(0, 500)
        });
      } catch {}
    }).catch(() => {});
  });
}

// Automatically redirect localhost subdomains to the main localhost origin with query parameters to bypass CORS and script import errors.
if (typeof window !== 'undefined' && window.location.hostname.includes('localhost') && window.location.hostname !== 'localhost') {
  const parts = window.location.hostname.split('.');
  if (parts.length === 2 && parts[1] === 'localhost') {
    const subdomain = parts[0];
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('subdomain', subdomain);
    window.location.href = `${window.location.protocol}//localhost:${window.location.port}${window.location.pathname}?${urlParams.toString()}`;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MasterPricingProvider>
        <App />
      </MasterPricingProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
