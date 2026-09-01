import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { MasterPricingProvider } from './context/MasterPricingContext'
import { initGlobalErrorSanitizer } from './utils/errorSanitizer'
import './index.css'

// Initialize Zero-PII Error & Crash Telemetry Sanitizer (ASVS Level 3)
initGlobalErrorSanitizer();

// Anti-Clickjacking & Frame-Busting Guard (ASVS Level 3 - Production only)
if (typeof window !== 'undefined') {
  const isLocalDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     import.meta.env.DEV;

  if (!isLocalDev && window.top !== window.self) {
    try {
      if (window.top) {
        window.top.location.href = window.self.location.href;
      }
    } catch (e) {
      // Cross-origin framing in production is blocked by CSP frame-ancestors
    }
  }
}

// Global Robust Error Boundary to prevent white screens on transient client runtime errors
class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[GlobalErrorBoundary] Unhandled client render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('groovelab_user_id');
      localStorage.removeItem('groovelab_cached_user');
      localStorage.removeItem('cg_master_maintenance_state');
      localStorage.removeItem('groovelab_transient_error');
    } catch (_) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#09090b',
          color: '#ffffff',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '32px 28px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(234, 179, 8, 0.3)'
            }}>
              <span style={{ fontSize: '28px' }}>🎸</span>
            </div>
            
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
              Campus-Groovelab
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#a1a1aa', lineHeight: '1.5' }}>
              Die Ansicht wird kurz aktualisiert, um die neueste Version geladen zu halten.
            </p>

            {this.state.error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.75rem',
                color: '#fca5a5',
                textAlign: 'left',
                fontFamily: 'monospace',
                maxWidth: '100%',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.error?.message || String(this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '8px' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  background: '#eab308',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(234, 179, 8, 0.35)',
                  transition: 'all 0.15s ease'
                }}
              >
                🔄 Seite neu laden
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🧹 Lokalen Cache &amp; Session zurücksetzen
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
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
    <GlobalErrorBoundary>
      <BrowserRouter>
        <MasterPricingProvider>
          <App />
        </MasterPricingProvider>
      </BrowserRouter>
    </GlobalErrorBoundary>
  </React.StrictMode>,
)
