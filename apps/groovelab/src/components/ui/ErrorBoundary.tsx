import React from 'react';
import { reportClientError } from '../../lib/errorTelemetry';

export const DashboardLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    padding: '40px',
    flexDirection: 'column',
    gap: '16px'
  }}>
    <div className="animate-spin" style={{
      width: '40px',
      height: '40px',
      border: '3px solid rgba(245, 158, 11, 0.1)',
      borderTopColor: '#f59e0b',
      borderRadius: '50%'
    }}></div>
    <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>
      Bereich wird geladen...
    </div>
  </div>
);

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Dashboard ErrorBoundary caught an error:", error, errorInfo);
    
    // Report silently to centralized telemetry
    reportClientError(error, {
      componentStack: errorInfo?.componentStack,
      severity: 'CRITICAL',
      context: 'ErrorBoundary.componentDidCatch'
    });
    
    // Auto-recover from dynamic module script/chunk loading errors
    const errorMessage = String(error?.message || error || "");
    const isChunkError = 
      errorMessage.includes("Importing a module script failed") ||
      errorMessage.includes("Failed to fetch dynamically imported module") ||
      errorMessage.includes("chunk") ||
      errorMessage.includes("loading-error") ||
      errorMessage.includes("dynamically imported");

    if (isChunkError) {
      const isLocalhost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.endsWith('.local')
      );
      if (isLocalhost) {
        console.warn('[ErrorBoundary] Chunk loading error in development mode. Auto-reload skipped to prevent refresh loop.');
        return;
      }

      const lastReload = sessionStorage.getItem("last_chunk_error_reload");
      const now = Date.now();
      
      // Auto-reload to load the fresh code bundle if we haven't reloaded in the last 60 seconds
      if (!lastReload || now - parseInt(lastReload) > 60000) {
        sessionStorage.setItem("last_chunk_error_reload", String(now));
        console.warn("Dynamic chunk loading failure detected. Triggering automatic hard reload to fetch the latest application bundle...");
        
        // Append a cache-busting parameter and reload
        const url = new URL(window.location.href);
        url.searchParams.set("reload_cb", String(now));
        window.location.href = url.toString();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = String(this.state.error?.message || this.state.error || "");
      const isChunkError = 
        errorMessage.includes("Importing a module script failed") ||
        errorMessage.includes("Failed to fetch dynamically imported module") ||
        errorMessage.includes("chunk") ||
        errorMessage.includes("loading-error") ||
        errorMessage.includes("dynamically imported");

      if (isChunkError) {
        return <DashboardLoader />;
      }

      return this.props.fallback || (
        <div className="glass-panel animation-slide-up" style={{ 
          padding: '60px 40px', 
          textAlign: 'center', 
          margin: '40px auto', 
          maxWidth: '600px',
          background: 'white',
          borderRadius: '32px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🎸</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', marginBottom: '12px' }}>Hoppla! Ein kleiner "Saitenriss"...</h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '20px' }}>
            Beim Laden dieses Bereichs ist ein Fehler aufgetreten. Keine Sorge, deine Daten sind sicher!
          </p>
          {this.state.error && (
            <pre style={{
              background: '#f8fafc',
              color: '#ef4444',
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'left',
              fontSize: '0.8rem',
              overflowX: 'auto',
              marginBottom: '24px',
              fontFamily: 'monospace',
              border: '1px solid #cbd5e1'
            }}>
              {this.state.error.message || String(this.state.error)}
              {this.state.error.stack && `\n\n${this.state.error.stack.split('\n').slice(0, 4).join('\n')}`}
            </pre>
          )}
          <button 
            onClick={() => {
              // Perform a hard cache-busting reload
              const url = new URL(window.location.href);
              url.searchParams.set("reload_manual", String(Date.now()));
              window.location.href = url.toString();
            }}
            style={{ 
              padding: '16px 32px', 
              background: 'var(--primary-color)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '16px', 
              fontWeight: 800, 
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(245, 158, 11, 0.2)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Dashboard neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
