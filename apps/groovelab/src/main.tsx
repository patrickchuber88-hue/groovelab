import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { MasterPricingProvider } from './context/MasterPricingContext'
import { A11yProvider } from './components/common/A11yLiveAnnouncer'
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
class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode }, 
  { hasError: boolean; error: any; showDetails: boolean; copied: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false, copied: false };
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

  handleCopyDiagnostics = () => {
    const errorDetails = `Campus-Groovelab Diagnostic Report\nTimestamp: ${new Date().toISOString()}\nError: ${this.state.error?.message || String(this.state.error)}\nStack: ${this.state.error?.stack || 'N/A'}\nUserAgent: ${navigator.userAgent}`;
    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
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
          background: '#f8fafc',
          color: '#0f172a',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Plus Jakarta Sans', system-ui, sans-serif",
          padding: '24px',
          textAlign: 'center'
        }}>
          {/* Apple High Goldstandard Elevated Stage Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            borderRadius: '24px',
            padding: '40px 36px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            position: 'relative'
          }}>
            {/* Apple Squircle Monochrome Icon Container (Zero Emojis) */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </div>
            
            {/* Apple Microcopy Hierarchy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.35rem', 
                fontWeight: 750, 
                letterSpacing: '-0.025em',
                color: '#0f172a' 
              }}>
                Ansicht aktualisieren
              </h2>
              <p style={{ 
                margin: 0, 
                fontSize: '0.88rem', 
                color: '#64748b', 
                lineHeight: '1.55',
                letterSpacing: '-0.01em'
              }}>
                Campus-Groovelab hat eine Aktualisierung festgestellt. Deine Unterrichtsnotizen, Übe-Fortschritte und Meisterwerke sind serverseitig sicher geschützt.
              </p>
            </div>

            {/* Tactile Apple Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '6px' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '13px 24px',
                  fontSize: '0.92rem',
                  fontWeight: 650,
                  letterSpacing: '-0.01em',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Erneut laden
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: 'transparent',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '11px 20px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => { 
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseOut={(e) => { 
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                Sitzung zurücksetzen
              </button>
            </div>

            {/* Apple Collapsible Diagnostics Accordion (Hidden from End-Users by Default) */}
            <div style={{ width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px'
                }}
              >
                <span style={{ 
                  transform: this.state.showDetails ? 'rotate(90deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.15s ease',
                  fontSize: '0.65rem'
                }}>
                  ▶
                </span>
                <span>Technische Diagnosedetails</span>
              </button>

              {this.state.showDetails && (
                <div style={{
                  marginTop: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  fontSize: '0.72rem',
                  color: '#475569',
                  textAlign: 'left',
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  maxWidth: '100%',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>Fehlerprotokoll</span>
                    <button
                      type="button"
                      onClick={this.handleCopyDiagnostics}
                      style={{
                        background: this.state.copied ? '#dcfce7' : '#ffffff',
                        border: `1px solid ${this.state.copied ? '#86efac' : '#cbd5e1'}`,
                        color: this.state.copied ? '#15803d' : '#0f172a',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {this.state.copied ? '✓ Kopiert' : 'Bericht kopieren'}
                    </button>
                  </div>
                  <div>
                    {this.state.error?.message || String(this.state.error || 'Kein Fehlertext verfügbar')}
                  </div>
                </div>
              )}
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
          <A11yProvider>
            <App />
          </A11yProvider>
        </MasterPricingProvider>
      </BrowserRouter>
    </GlobalErrorBoundary>
  </React.StrictMode>,
)
