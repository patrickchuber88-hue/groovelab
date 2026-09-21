// ==============================================================================
// 🏛️ COURT-PROOF FORENSIC DOSSIER EXPORT MODAL
// Campus-Groovelab Platform (OWASP ASVS Level 3 / Forensic Non-Repudiation)
// BFSG 2025 & WCAG 2.2 AA Parität / Universal Button Goldstandard
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, Download, CheckCircle2, AlertTriangle, X, Copy, Check, FileText } from 'lucide-react';

interface CourtProofExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
}

interface ExportResult {
  success: boolean;
  manifest: {
    school_id: string;
    export_timestamp_utc: string;
    exported_by_user_id: string;
    caller_role: string;
    digest_algorithm: string;
    payload_sha256: string;
    legal_basis: string;
    certified_by: string;
  };
  data: {
    school: any;
    rooms: any[];
    students: any[];
    teachers: any[];
    summary: {
      room_count: number;
      student_count: number;
      teacher_count: number;
      schedule_occurrences_count: number;
    };
  };
  sha256: string;
}

export const CourtProofExportModal: React.FC<CourtProofExportModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  schoolName
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // WAI-ARIA Escape Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGenerateAndDownload = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('export_school_forensic_dossier', {
        p_school_id: schoolId
      });

      if (rpcError) throw rpcError;
      if (!data || !data.sha256) throw new Error('Ungültige Antwort von der forensischen Export-Engine erhalten.');

      const result = data as ExportResult;
      setExportResult(result);

      // Automatischer Dateidownload
      const fileName = `Campus-Groovelab_Forensic_Dossier_${schoolName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
      const jsonContent = JSON.stringify(result, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('[ForensicExport] Error generating dossier:', err);
      setError(err?.message || 'Fehler beim Generieren des forensischen Dossiers.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHash = () => {
    if (!exportResult?.sha256) return;
    navigator.clipboard.writeText(exportResult.sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Beweissicherer Mandanten-Export"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Shield size={22} aria-hidden="true" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Beweissicherer Mandanten-Export
              </h2>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Revisionssicherer Export (Non-Repudiation)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Modal schließen"
            title="Schließen"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              touchAction: 'manipulation'
            }}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '14px 16px',
              fontSize: '13px',
              color: '#166534',
              lineHeight: '1.5'
            }}
          >
            <strong>🏛️ IT-Forensik Standard:</strong> Dieser Export erzeugt ein atomares Dossier aller 
            Schüler-, Raum- und Unterrichtsmetadaten Ihrer Musikschule. Der Datensatz wird auf dem Server 
            mit einem unverfälschbaren <strong>SHA-256 Hash</strong> signiert und im Revisions-Audit-Log versiegelt.
          </div>

          <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.5' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Ziel-Schule:</strong> {schoolName}
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Aus Sicherheits- und Datenschutzgründen (Zero-Secret-Leakage) sind persönliche PINs, 
              Passwort-Hashes und biometrische Rohdaten vom Export ausgeschlossen.
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '12px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {exportResult && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: '600', fontSize: '14px' }}>
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>Export erfolgreich generiert & heruntergeladen</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px', color: '#475569' }}>
                <div>Schüler erfasst: <strong>{exportResult.data.summary.student_count}</strong></div>
                <div>Lehrkräfte erfasst: <strong>{exportResult.data.summary.teacher_count}</strong></div>
                <div>Räume erfasst: <strong>{exportResult.data.summary.room_count}</strong></div>
                <div>Unterrichtseinheiten: <strong>{exportResult.data.summary.schedule_occurrences_count}</strong></div>
              </div>

              <div style={{ marginTop: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  Kryptografischer SHA-256 Prüfsummen-Fingerabdruck
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#0f172a',
                    color: '#38bdf8',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}
                >
                  <span>{exportResult.sha256}</span>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    aria-label="SHA-256 Prüfsumme in Zwischenablage kopieren"
                    title="Prüfsumme kopieren"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedHash ? '#4ade80' : '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px',
                      marginLeft: '8px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {copiedHash ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              minHeight: '44px',
              touchAction: 'manipulation'
            }}
          >
            Schließen
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleGenerateAndDownload}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: loading ? '#94a3b8' : '#2563eb',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minHeight: '44px',
              touchAction: 'manipulation',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          >
            {loading ? (
              <span>Wird signiert & generiert...</span>
            ) : (
              <>
                <Download size={16} aria-hidden="true" />
                <span>{exportResult ? 'Erneut herunterladen' : 'Dossier signieren & herunterladen'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
