import React from 'react';
import { 
  Clock, Download, Printer, Search, RefreshCw, UserCheck, ShieldCheck, 
  FileText, Activity, Lock 
} from 'lucide-react';

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
}) => {
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
            style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', fontSize: '0.8rem', fontWeight: 700, outline: 'none', color: '#1e293b' }}
          >
            <option value="All">Alle Aktionen</option>
            <option value="INSERT">Erstellung (INSERT)</option>
            <option value="UPDATE">Aktualisierung (UPDATE)</option>
            <option value="DELETE">Löschung (DELETE)</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
        {auditLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: 650, fontSize: '0.85rem' }}>
            Lade Änderungsprotokoll...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ padding: '14px 20px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#64748b', width: '140px' }}>Zeitpunkt</th>
                <th style={{ padding: '14px 20px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#64748b', width: '130px' }}>Ereignis</th>
                <th style={{ padding: '14px 20px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#64748b', width: '180px' }}>Geändert von</th>
                <th style={{ padding: '14px 20px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>Protokollierte Änderung / Delta</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const dateObj = new Date(log.created_at);
                const dateFormatted = dateObj.toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });
                const timeFormatted = dateObj.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                const isInsert = log.action === 'INSERT';
                const isDelete = log.action === 'DELETE';
                const badgeBg = isInsert ? '#dcfce7' : isDelete ? '#fee2e2' : '#fef3c7';
                const badgeColor = isInsert ? '#166534' : isDelete ? '#b91c1c' : '#92400e';
                const actionLabel = isInsert ? '+ Neuanlage' : isDelete ? '✕ Löschung' : '✎ Aktualisierung';

                const entityCategory = log.table_name === 'users' ? 'Benutzer' : log.table_name === 'schools' ? 'Musikschule' : log.table_name === 'rooms' ? 'Räume' : log.table_name;
                
                // Extract human-readable target name
                let targetDisplayName = log.table_name === 'users' ? (userMap[log.record_id] || '') : log.table_name;
                if (!targetDisplayName && log.new_data) {
                  const fn = log.new_data.first_name || '';
                  const ln = log.new_data.last_name || '';
                  if (fn || ln) targetDisplayName = `${fn} ${ln}`.trim();
                }
                if (!targetDisplayName) targetDisplayName = 'Datensatz';

                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="audit-row">
                    <td style={{ padding: '14px 20px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>{dateFormatted}</span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, fontFamily: 'monospace' }}>
                          {timeFormatted} Uhr
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          background: badgeBg,
                          color: badgeColor,
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em'
                        }}>
                          {actionLabel}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {entityCategory}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#fce8e6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <UserCheck size={14} color="#ea4335" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: '0.78rem', color: '#0f172a' }}>
                            {log.users ? `${log.users.first_name} ${log.users.last_name}` : 'System (Automatik)'}
                          </strong>
                          <span style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 600 }}>
                            {log.users ? 'Administrator' : 'Hintergrundprozess'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '0.76rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{targetDisplayName}</span>
                          <span style={{ fontSize: '0.62rem', background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600 }}>
                            ID: #{log.record_id ? log.record_id.substring(0, 8) : ''}
                          </span>
                        </div>
                        {renderDiffContent(log)}
                      </div>
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
    </div>
  );
};
