import React, { useState, useMemo } from 'react';
import { 
  Clock, Download, Printer, Search, RefreshCw, UserCheck, ShieldCheck, 
  FileText, Activity, Lock, Trash2, AlertTriangle, ShieldAlert, CheckCircle2, 
  XCircle, Calendar, Info, Check
} from 'lucide-react';
import type { GdprDeletionRequest } from './hooks/useSecretaryAudit';

export interface AuditLogItem {
  id: string;
  created_at: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  table_name: string;
  record_id: string;
  users?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: string;
  } | null;
  new_data?: Record<string, any> | null;
  old_data?: Record<string, any> | null;
}

export interface SecretaryAuditViewProps {
  auditLogs: AuditLogItem[];
  auditLoading: boolean;
  auditSearchQuery: string;
  setAuditSearchQuery: (query: string) => void;
  auditActionFilter: string;
  setAuditActionFilter: (action: string) => void;
  auditLimit: number;
  setAuditLimit: React.Dispatch<React.SetStateAction<number>>;
  userMap: Record<string, string>;
  exportAuditLogsToCsv: () => void;
  translateKey: (key: string) => string;
  translateValue: (key: string, val: any) => string;
  gdprRequests?: GdprDeletionRequest[];
  gdprLoading?: boolean;
  completeGdprRequest?: (requestId: string, studentId: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
  rejectGdprRequest?: (requestId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
}

export const SecretaryAuditView: React.FC<SecretaryAuditViewProps> = ({
  auditLogs,
  auditLoading,
  auditSearchQuery,
  setAuditSearchQuery,
  auditActionFilter,
  setAuditActionFilter,
  auditLimit,
  setAuditLimit,
  userMap,
  exportAuditLogsToCsv,
  translateKey,
  translateValue,
  gdprRequests = [],
  gdprLoading = false,
  completeGdprRequest,
  rejectGdprRequest,
}) => {
  const [auditSubSection, setAuditSubSection] = useState<'audit_trail' | 'gdpr_inbox'>('audit_trail');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [gdprFilter, setGdprFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');

  const pendingGdprCount = useMemo(() => {
    return (gdprRequests || []).filter(r => r.status === 'pending').length;
  }, [gdprRequests]);

  const filteredGdprRequests = useMemo(() => {
    return (gdprRequests || []).filter(r => {
      if (gdprFilter === 'all') return true;
      return r.status === gdprFilter;
    });
  }, [gdprRequests, gdprFilter]);

  const handleExecuteGdprDeletion = async (req: GdprDeletionRequest) => {
    const sName = req.student_name || userMap[req.student_id] || 'den Schüler';
    const confirmed = window.confirm(
      `Möchtest du ${sName} jetzt unwiderruflich nach Art. 17 DSGVO ("Recht auf Vergessenwerden") löschen?\n\nAlle Mediendateien, Chatverläufe und Profilstammdaten werden dauerhaft gelöscht.`
    );
    if (!confirmed) return;

    setProcessingId(req.id);
    try {
      if (completeGdprRequest) {
        const res = await completeGdprRequest(req.id, req.student_id);
        if (!res.success) {
          alert(res.error || 'Fehler beim Ausführen der Löschung.');
        }
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectGdpr = async (req: GdprDeletionRequest) => {
    const reason = window.prompt(
      'Begründung für die Ablehnung des Löschantrags eingeben (z. B. gesetzliche Aufbewahrungspflichten nach § 257 HGB / § 147 AO):',
      'Gesetzliche Aufbewahrungsfrist für steuerlich relevante Vertragsdaten'
    );
    if (!reason || !reason.trim()) return;

    setProcessingId(req.id);
    try {
      if (rejectGdprRequest) {
        const res = await rejectGdprRequest(req.id, reason.trim());
        if (!res.success) {
          alert(res.error || 'Fehler beim Ablehnen des Antrags.');
        }
      }
    } finally {
      setProcessingId(null);
    }
  };
  const renderDiffContent = (log: AuditLogItem) => {
    try {
      const ignoredKeys = [
        'id', 'created_at', 'school_id', 'password', 'password_hash', 
        'personal_pin', 'parent_pin', 'teacher_qr_token', 'campus_login_token', 
        'groovelab_kiosk_token', 'secret_token', 'joker_used_at', 'weekly_jokers_used',
        'lesson_duration', 'preferred_room_ids', 'planned_boards', 'ausfall_until',
        'age', 'bio', 'gear', 'listening', 'projects', 'bands', 'expertise', 'phone', 'group_id', 'nickname'
      ];
      
      if (log.action === 'INSERT') {
        if (!log.new_data) return <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Neuanlage initialisiert</span>;
        
        const validEntries = Object.entries(log.new_data)
          .filter(([key]) => !ignoredKeys.includes(key))
          .map(([key, val]) => ({ key, label: translateKey(key), valStr: translateValue(key, val) }))
          .filter(entry => entry.valStr && entry.valStr.trim() !== '' && entry.valStr !== 'nicht gesetzt' && entry.valStr !== 'keine');

        if (validEntries.length === 0) {
          return <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Datensatz mit Standardwerten initialisiert</span>;
        }

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            {validEntries.map(({ key, label, valStr }) => (
              <div 
                key={key} 
                style={{ 
                  fontSize: '0.72rem', 
                  color: '#1e293b', 
                  background: '#f8fafc', 
                  border: '1px solid #e2e8f0', 
                  padding: '3px 8px', 
                  borderRadius: '6px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}
              >
                <span style={{ fontWeight: 700, color: '#64748b' }}>{label}:</span>
                <span style={{ color: '#166534', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  {valStr}
                </span>
              </div>
            ))}
          </div>
        );
      }

      if (log.action === 'DELETE') {
        if (!log.old_data) return <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>Datensatz gelöscht</span>;
        const validEntries = Object.entries(log.old_data)
          .filter(([key]) => !ignoredKeys.includes(key))
          .map(([key, val]) => ({ key, label: translateKey(key), valStr: translateValue(key, val) }))
          .filter(entry => entry.valStr && entry.valStr.trim() !== '' && entry.valStr !== 'nicht gesetzt' && entry.valStr !== 'keine');

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            <span style={{ color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
              Gelöschte Stammdaten:
            </span>
            {validEntries.map(({ key, label, valStr }) => (
              <div key={key} style={{ fontSize: '0.72rem', color: '#64748b', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 6px', borderRadius: '6px', display: 'inline-flex', gap: '4px' }}>
                <span>{label}:</span>
                <span style={{ textDecoration: 'line-through' }}>{valStr}</span>
              </div>
            ))}
          </div>
        );
      }

      if (log.action === 'UPDATE') {
        if (!log.new_data || !log.old_data) return <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Keine Änderungen</span>;
        
        const diffEntries = Object.entries(log.new_data)
          .filter(([key]) => !ignoredKeys.includes(key))
          .map(([key, newVal]: [string, any]) => {
            const oldVal = log.old_data ? log.old_data[key] : undefined;
            const oldValStr = translateValue(key, oldVal);
            const newValStr = translateValue(key, newVal);
            if (oldValStr === newValStr) return null;
            return {
              key,
              label: translateKey(key),
              oldValStr: oldValStr || '(leer)',
              newValStr: newValStr || '(gelöscht)'
            };
          })
          .filter(Boolean) as Array<{ key: string; label: string; oldValStr: string; newValStr: string }>;

        if (diffEntries.length === 0) {
          return <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontStyle: 'italic' }}>System-Aktualisierung (keine sichtbaren Feldänderungen)</span>;
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            {diffEntries.map(({ key, label, oldValStr, newValStr }) => (
              <div key={key} style={{ fontSize: '0.72rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#475569', minWidth: '110px' }}>{label}:</span>
                <span style={{ textDecoration: 'line-through', color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                  {oldValStr}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>➔</span>
                <span style={{ color: '#166534', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '0.7rem' }}>
                  {newValStr}
                </span>
              </div>
            ))}
          </div>
        );
      }

      return null;
    } catch {
      return <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Diff konnte nicht formatiert werden</span>;
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const changer = log.users ? `${log.users.first_name} ${log.users.last_name}`.toLowerCase() : 'system';
    const targetName = log.table_name === 'users' ? (userMap[log.record_id] || '').toLowerCase() : (log.table_name || '').toLowerCase();
    const query = auditSearchQuery.toLowerCase().trim();
    const matchesSearch = !auditSearchQuery.trim() || 
      changer.includes(query) || 
      (log.record_id || '').toLowerCase().includes(query) ||
      targetName.includes(query);
    
    const matchesAction = auditActionFilter === 'All' || log.action === auditActionFilter;
    
    return matchesSearch && matchesAction;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; }
          .google-card, table { box-shadow: none !important; border: none !important; }
          th, td { border-bottom: 1px solid #ddd !important; padding: 8px !important; }
          tr { page-break-inside: avoid !important; }
        }
        .search-input-wrapper:focus-within {
          border-color: #ea4335 !important;
          box-shadow: 0 0 0 2px rgba(234, 67, 53, 0.15) !important;
        }
        .google-btn-secondary:hover {
          border-color: #ea4335 !important;
          background: #fce8e6 !important;
          color: #ea4335 !important;
        }
        .google-btn-primary:hover {
          background: #d63022 !important;
        }
        .audit-row {
          transition: background 0.15s;
        }
        .audit-row:hover {
          background: #f8fafc !important;
        }
        .audit-row:nth-child(even) {
          background: #fafbfd;
        }
        .audit-row:nth-child(even):hover {
          background: #f8fafc !important;
        }
      `}</style>

      {/* Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '12px' }} className="no-print">
        <button
          type="button"
          onClick={() => setAuditSubSection('audit_trail')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            border: auditSubSection === 'audit_trail' ? 'none' : '1px solid #cbd5e1',
            background: auditSubSection === 'audit_trail' ? '#ea4335' : '#ffffff',
            color: auditSubSection === 'audit_trail' ? '#ffffff' : '#475569',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: auditSubSection === 'audit_trail' ? '0 4px 12px rgba(234, 67, 53, 0.25)' : 'none'
          }}
          className="hover-scale"
        >
          <Clock size={16} />
          <span>Änderungsprotokoll (Audit Trail)</span>
        </button>

        <button
          type="button"
          onClick={() => setAuditSubSection('gdpr_inbox')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            border: auditSubSection === 'gdpr_inbox' ? 'none' : '1px solid #cbd5e1',
            background: auditSubSection === 'gdpr_inbox' ? '#ea4335' : '#ffffff',
            color: auditSubSection === 'gdpr_inbox' ? '#ffffff' : '#475569',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: auditSubSection === 'gdpr_inbox' ? '0 4px 12px rgba(234, 67, 53, 0.25)' : 'none'
          }}
          className="hover-scale"
        >
          <ShieldAlert size={16} />
          <span>Art. 17 DSGVO Löschanträge</span>
          {pendingGdprCount > 0 && (
            <span style={{
              background: auditSubSection === 'gdpr_inbox' ? '#ffffff' : '#ef4444',
              color: auditSubSection === 'gdpr_inbox' ? '#ea4335' : '#ffffff',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 900
            }}>
              {pendingGdprCount}
            </span>
          )}
        </button>
      </div>

      {auditSubSection === 'audit_trail' && (
        <>
          {/* Header */}
          <div style={{ background: 'white', borderRadius: '24px', padding: '20px 24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#ea4335" /> Änderungsprotokoll (Audit Trail)
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 550 }}>
                Protokolliert alle administrativen und systemischen Änderungen an den Benutzerprofilen dieser Musikschule (GoBD & DSGVO-konform).
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={exportAuditLogsToCsv}
                className="google-btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '8px 14px', borderRadius: '10px', background: 'white', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 750 }}
                disabled={auditLogs.length === 0}
              >
                <Download size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Excel/CSV Export
              </button>
              <button
                onClick={() => window.print()}
                className="google-btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '8px 14px', borderRadius: '10px', background: '#ea4335', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 750 }}
                disabled={auditLogs.length === 0}
              >
                <Printer size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> PDF / Drucken
              </button>
            </div>
          </div>

          {/* Filter-Bar */}
          <div style={{ background: 'white', borderRadius: '20px', padding: '16px 20px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '12px', alignItems: 'center' }} className="no-print">
            <div style={{ flex: 1, display: 'flex', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} className="search-input-wrapper">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                value={auditSearchQuery}
                onChange={e => setAuditSearchQuery(e.target.value)}
                placeholder="Nach Name oder ID filtern..."
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Aktion:</span>
              <select
                value={auditActionFilter}
                onChange={e => setAuditActionFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', outline: 'none' }}
              >
                <option value="All">Alle Aktionen</option>
                <option value="INSERT">Neuanlagen (INSERT)</option>
                <option value="UPDATE">Änderungen (UPDATE)</option>
                <option value="DELETE">Löschungen (DELETE)</option>
              </select>
            </div>
          </div>

          {/* Table Card */}
          <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
            {auditLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <RefreshCw size={24} className="spin-animation" color="#ea4335" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Protokolldaten werden geladen...</span>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 20px', color: '#475569', fontWeight: 800, width: '140px' }}>Zeitpunkt</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800, width: '110px' }}>Aktion</th>
                    <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 800, width: '220px' }}>Datensatz</th>
                    <th style={{ padding: '12px 20px', color: '#475569', fontWeight: 800 }}>Protokollierte Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => {
                    const changerName = log.users ? `${log.users.first_name || ''} ${log.users.last_name || ''}`.trim() : 'System';
                    let targetName = log.table_name === 'users' ? (userMap[log.record_id] || '') : log.table_name;
                    if (!targetName && log.new_data) {
                      const fn = log.new_data.first_name || '';
                      const ln = log.new_data.last_name || '';
                      if (fn || ln) targetName = `${fn} ${ln}`.trim();
                    }
                    if (!targetName) targetName = 'Datensatz';

                    return (
                      <tr key={log.id} className="audit-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 20px', verticalAlign: 'top', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 600, fontSize: '0.74rem' }}>
                          {new Date(log.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                            von: <strong style={{ color: '#475569' }}>{changerName}</strong>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: log.action === 'INSERT' ? '#dcfce7' : log.action === 'UPDATE' ? '#e0f2fe' : '#fee2e2',
                            color: log.action === 'INSERT' ? '#166534' : log.action === 'UPDATE' ? '#0369a1' : '#dc2626'
                          }}>
                            {log.action === 'INSERT' && 'NEU'}
                            {log.action === 'UPDATE' && 'UPDATE'}
                            {log.action === 'DELETE' && 'LÖSCHUNG'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{targetName}</div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '1px' }}>
                            {log.table_name} · {log.record_id ? `${log.record_id.substring(0, 8)}...` : '-'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px', verticalAlign: 'top' }}>
                          {renderDiffContent(log)}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}>
                        Keine Protokolleinträge gefunden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Load More Button */}
          {!auditLoading && auditLogs.length >= auditLimit && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }} className="no-print">
              <button
                onClick={() => setAuditLimit(prev => prev + 200)}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '10px 24px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s'
                }}
                className="google-btn-secondary hover-scale"
              >
                <RefreshCw size={14} /> Ältere Protokolleinträge laden
              </button>
            </div>
          )}
        </>
      )}

      {/* 🌟 TAB 2: ART. 17 DSGVO LÖSCHANTRÄGE INBOX */}
      {auditSubSection === 'gdpr_inbox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Card */}
          <div style={{ background: 'white', borderRadius: '24px', padding: '20px 24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }} className="no-print">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} color="#ea4335" /> Art. 17 DSGVO Löschanträge (Recht auf Vergessenwerden)
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 550 }}>
                Eingegangene Anträge von Eltern &amp; Schülern. Nach Art. 12 Abs. 3 DSGVO gilt eine gesetzliche Erledigungsfrist von einem Monat (30 Tage).
              </p>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['all', 'pending', 'completed', 'rejected'] as const).map(fKey => {
                const isActive = gdprFilter === fKey;
                const label = fKey === 'all' 
                  ? `Alle (${gdprRequests.length})` 
                  : fKey === 'pending' 
                  ? `Offen (${pendingGdprCount})` 
                  : fKey === 'completed' 
                  ? 'Erledigt' 
                  : 'Abgelehnt';
                return (
                  <button
                    key={fKey}
                    type="button"
                    onClick={() => setGdprFilter(fKey)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: isActive ? '#0f172a' : '#f1f5f9',
                      color: isActive ? '#ffffff' : '#64748b',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List Card */}
          <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(15,23,42,0.03)', padding: '20px' }}>
            {gdprLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <RefreshCw size={24} className="spin-animation" color="#ea4335" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Lade DSGVO-Löschanträge...</span>
              </div>
            ) : filteredGdprRequests.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={32} color="#15803d" />
                </div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 850, color: '#0f172a' }}>
                  Keine offenen Löschanträge nach Art. 17 DSGVO
                </h4>
                <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748b', maxWidth: '440px', lineHeight: 1.5 }}>
                  Alle Betroffenenrechte und gesetzlichen Fristen nach Art. 12 Abs. 3 DSGVO sind vollständig gewahrt.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredGdprRequests.map(req => {
                  const sName = req.student_name || userMap[req.student_id] || 'Schülerprofil';
                  const createdTime = new Date(req.created_at).getTime();
                  const deadline = createdTime + 30 * 24 * 60 * 60 * 1000;
                  const daysLeft = Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
                  const isBusy = processingId === req.id;

                  return (
                    <div
                      key={req.id}
                      style={{
                        borderRadius: '16px',
                        border: req.status === 'pending'
                          ? (daysLeft <= 3 ? '1.5px solid #fca5a5' : daysLeft <= 14 ? '1.5px solid #fde68a' : '1.5px solid #e2e8f0')
                          : '1px solid #f1f5f9',
                        background: req.status === 'pending'
                          ? (daysLeft <= 3 ? '#fff5f5' : daysLeft <= 14 ? '#fffbeb' : '#ffffff')
                          : '#fafafa',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0f172a' }}>
                              {sName}
                            </span>
                            <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                              ID: {req.student_id ? `${req.student_id.substring(0, 8)}...` : '-'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 550, marginTop: '2px' }}>
                            Antrag eingereicht am: {new Date(req.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Statutory Countdown / Status Badge */}
                        <div>
                          {req.status === 'completed' && (
                            <div style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '4px 10px', borderRadius: '10px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <CheckCircle2 size={13} /> Erledigt am {new Date(req.completed_at || req.created_at).toLocaleDateString('de-DE')}
                            </div>
                          )}
                          {req.status === 'rejected' && (
                            <div style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '10px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <XCircle size={13} /> Abgelehnt
                            </div>
                          )}
                          {req.status === 'pending' && (
                            daysLeft > 14 ? (
                              <div style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '5px 12px', borderRadius: '10px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} /> Noch {daysLeft} Tage Frist (Fristgerecht)
                              </div>
                            ) : daysLeft >= 4 ? (
                              <div style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '5px 12px', borderRadius: '10px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={14} /> Noch {daysLeft} Tage Frist (Dringend)
                              </div>
                            ) : (
                              <div style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '5px 12px', borderRadius: '10px', fontSize: '0.74rem', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={14} /> {daysLeft <= 0 ? 'Frist abgelaufen (Art. 12 Abs. 3 DSGVO)' : `Noch ${daysLeft} Tage Frist (Kritisch!)`}
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Scope & Notes */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontWeight: 800, color: '#475569' }}>Umfang:</span>
                        <span>{req.scope === 'media_only' ? 'Fotos & Videos widerrufen' : 'Vollständige Datenlöschung (Art. 17 DSGVO Profil, Mediendaten & Historie)'}</span>
                        {req.notes && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
                            Notiz: {req.notes}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons for pending */}
                      {req.status === 'pending' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleRejectGdpr(req)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#64748b',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              cursor: isBusy ? 'not-allowed' : 'pointer'
                            }}
                            className="hover-scale"
                          >
                            Ablehnen (z. B. § 257 HGB)
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleExecuteGdprDeletion(req)}
                            style={{
                              background: '#ea4335',
                              border: 'none',
                              color: '#ffffff',
                              padding: '8px 16px',
                              borderRadius: '10px',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              cursor: isBusy ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 6px rgba(234, 67, 53, 0.25)'
                            }}
                            className="hover-scale"
                          >
                            <Trash2 size={13} />
                            <span>{isBusy ? 'Lösche Datensatz...' : 'Löschung ausführen (Art. 17 DSGVO)'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
