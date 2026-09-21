import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';

export interface HomeworkBookErrorBoundaryProps {
  children: React.ReactNode;
  onRetry: () => void;
}

export interface HomeworkBookErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class HomeworkBookErrorBoundary extends React.Component<HomeworkBookErrorBoundaryProps, HomeworkBookErrorBoundaryState> {
  constructor(props: HomeworkBookErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: any): HomeworkBookErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || String(error) };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[HomeworkBookErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onRetry();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '48px 24px',
          maxWidth: '540px',
          margin: '40px auto',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
          border: '1px solid #fecaca',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <BookOpen size={42} color="#15803d" strokeWidth={2} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>
            Hausaufgabenheft konnte nicht geladen werden
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
            Die Verbindung zur Cloud wurde kurzzeitig unterbrochen oder die Komponente wird gerade aktualisiert.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              background: '#34a853',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(52,168,83,0.3)'
            }}
          >
            Erneut versuchen
          </button>
          {this.state.errorMessage && (
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              background: '#fff1f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              fontSize: '0.74rem',
              color: '#991b1b',
              textAlign: 'left',
              fontFamily: 'monospace',
              overflowX: 'auto',
              wordBreak: 'break-all'
            }}>
              Fehler: {this.state.errorMessage}
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export const HomeworkBookLoadingFallback: React.FC<{ onReload?: () => void }> = ({ onReload }) => (
  <div style={{
    padding: '48px 24px',
    maxWidth: '480px',
    margin: '40px auto',
    background: '#ffffff',
    borderRadius: '24px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    textAlign: 'center'
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      margin: '0 auto 16px',
      border: '3px solid #e2e8f0',
      borderTopColor: '#34a853',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
      Lade Hausaufgabenheft...
    </h3>
    <p style={{ fontSize: '0.86rem', color: '#64748b', lineHeight: 1.4, margin: 0 }}>
      Synchronisiere aktuelle Aufgaben und Übepfade
    </p>
  </div>
);
