import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, CheckCircle2, RefreshCw, Trash2, 
  Search, Smartphone, Monitor, Tablet, Copy, Check, 
  X, Terminal, ShieldAlert, Activity
} from 'lucide-react';
import { 
  ClientErrorLog, fetchErrorLogs, markErrorResolved, 
  clearAllErrorLogs
} from '../../../lib/errorTelemetry';

export const ClientErrorTelemetryPanel: React.FC = () => {
  const [logs, setLogs] = useState<ClientErrorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNRESOLVED' | 'RESOLVED'>('ALL');
  const [selectedLog, setSelectedLog] = useState<ClientErrorLog | null>(null);
  const [copiedStack, setCopiedStack] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchErrorLogs();
      setLogs(data);
    } catch (e) {
      console.error('Error fetching telemetry logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();

    // Listen for live client errors dispatched in current window/tabs
    const handleLiveEvent = (e: any) => {
      if (e.detail) {
        setLogs(prev => [e.detail, ...prev.filter(l => l.id !== e.detail.id)]);
      }
    };

    window.addEventListener('campus_groovelab_telemetry_event', handleLiveEvent);
    return () => window.removeEventListener('campus_groovelab_telemetry_event', handleLiveEvent);
  }, []);

  const handleResolve = async (id: string) => {
    await markErrorResolved(id);
    setLogs(prev => prev.map(l => l.id === id ? { ...l, resolved: true, resolvedAt: new Date().toISOString() } : l));
    if (selectedLog?.id === id) {
      setSelectedLog(prev => prev ? { ...prev, resolved: true } : null);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Möchtest du wirklich alle aufgezeichneten Telemetrie-Fehlerlogs leeren?')) {
      await clearAllErrorLogs();
      setLogs([]);
      setSelectedLog(null);
    }
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStack(true);
    setTimeout(() => setCopiedStack(false), 2000);
  };

  // Metrics Calculation
  const unresolvedLogs = logs.filter(l => !l.resolved).length;

  // Filtered Logs
  const filteredLogs = logs.filter(log => {
    if (severityFilter !== 'ALL' && log.severity !== severityFilter) return false;
    if (statusFilter === 'UNRESOLVED' && log.resolved) return false;
    if (statusFilter === 'RESOLVED' && !log.resolved) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchRoute = log.route.toLowerCase().includes(q);
      const matchBrowser = (log.browserName + ' ' + log.osName).toLowerCase().includes(q);
      return matchMsg || matchRoute || matchBrowser;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      {/* If 0 errors: Clean, peaceful status banner */}
      {logs.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          border: '1.5px solid #86efac',
          borderRadius: '20px',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 16px rgba(34, 197, 94, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#dcfce7',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)'
            }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#14532d', fontFamily: '"Outfit", sans-serif' }}>
                  Client Incident Monitor: 100% Fehlerfrei
                </h4>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: '#bbf7d0', color: '#166534' }}>
                  Zero-PII &amp; DSGVO
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', color: '#166534', fontWeight: 550 }}>
                Keine unhandled Exceptions, Audio-Abbrüche oder Timeouts in den letzten 24 Stunden erfasst. Alle Benutzer-Clients laufen stabil.
              </p>
            </div>
          </div>

          <button
            onClick={loadLogs}
            disabled={loading}
            style={{
              background: '#ffffff',
              border: '1.5px solid #86efac',
              color: '#166534',
              padding: '9px 16px',
              borderRadius: '12px',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)'
            }}
            className="hover-scale-mini"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Logs prüfen
          </button>
        </div>
      ) : (
        /* ─── MAIN INCIDENT COCKPIT CARD (ONLY WHEN ERRORS EXIST) ─── */
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* Cockpit Top Bar */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldAlert size={16} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: '"Outfit", sans-serif' }}>
                  Client Error-Stream &amp; Incident Monitor
                </h3>
                <span style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  fontSize: '0.68rem',
                  fontWeight: 800
                }}>
                  {unresolvedLogs} OFFENE VORFÄLLE
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.80rem', color: '#64748b', fontWeight: 500 }}>
                Aufgefangene Exceptions und Netzwerk-Timeouts aus Benutzer-Browsern.
              </p>
            </div>

            {/* Action Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={loadLogs}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span>Aktualisieren</span>
              </button>

              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '7px 14px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#dc2626',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} />
                  <span>Alle löschen</span>
                </button>
              )}
            </div>
          </div>

        {/* Filter Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          padding: '16px 28px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          {/* Search Input */}
          <div style={{
            position: 'relative',
            flex: '1 1 240px',
            minWidth: '200px'
          }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Log durchsuchen (Fehler, URL, OS)..."
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '0.78rem',
                outline: 'none',
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Severity & Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '3px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Schweregrad:</span>
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value as any)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer' }}
              >
                <option value="ALL">Alle Schweregrade</option>
                <option value="CRITICAL">Critical</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '3px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer' }}
              >
                <option value="ALL">Alle Status</option>
                <option value="UNRESOLVED">Nur Offen</option>
                <option value="RESOLVED">Behoben</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── 3. ERROR LOGS TABLE ─── */}
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Keine aktiven Fehlereinträge vorhanden
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Alle Systeme laufen stabil im optimalen Bereich. Du kannst oben einen Test-Fehler simulieren.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#64748b', fontWeight: 800, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '14px 24px' }}>SCHWEREGRAD &amp; ZEITSTEMPEL</th>
                  <th style={{ padding: '14px 24px' }}>FEHLERMELDUNG &amp; ROUTE</th>
                  <th style={{ padding: '14px 24px' }}>CLIENT-UMGEBUNG</th>
                  <th style={{ padding: '14px 24px' }}>STATUS</th>
                  <th style={{ padding: '14px 24px', textAlign: 'right' }}>AKTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr 
                    key={log.id} 
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      background: log.resolved ? '#ffffff' : (log.severity === 'CRITICAL' ? '#fffbfc' : '#ffffff'),
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = log.resolved ? '#ffffff' : (log.severity === 'CRITICAL' ? '#fffbfc' : '#ffffff')}
                  >
                    {/* Column 1: Severity & Time */}
                    <td style={{ padding: '16px 24px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '100px',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          width: 'fit-content',
                          background: log.severity === 'CRITICAL' ? '#fee2e2' : log.severity === 'WARNING' ? '#fef3c7' : '#eff6ff',
                          color: log.severity === 'CRITICAL' ? '#dc2626' : log.severity === 'WARNING' ? '#d97706' : '#2563eb',
                          border: `1px solid ${log.severity === 'CRITICAL' ? '#fca5a5' : log.severity === 'WARNING' ? '#fde68a' : '#bfdbfe'}`
                        }}>
                          {log.severity}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          {new Date(log.timestamp).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} MESZ
                        </span>
                      </div>
                    </td>

                    {/* Column 2: Message & Route */}
                    <td style={{ padding: '16px 24px', verticalAlign: 'top', maxWidth: '420px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.4, wordBreak: 'break-word' }}>
                          {log.message}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.70rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '6px', color: '#475569' }}>
                            {log.route || '/'}
                          </span>
                          {log.userRole && (
                            <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600 }}>
                              Rolle: {log.userRole}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Column 3: Client Environment */}
                    <td style={{ padding: '16px 24px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {log.deviceType === 'Mobile' ? <Smartphone size={16} color="#64748b" /> : log.deviceType === 'Tablet' ? <Tablet size={16} color="#64748b" /> : <Monitor size={16} color="#64748b" />}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 750, color: '#334155', fontSize: '0.78rem' }}>
                            {log.osName} • {log.browserName}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            {log.deviceType}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 4: Status Badge */}
                    <td style={{ padding: '16px 24px', verticalAlign: 'top' }}>
                      {log.resolved ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', background: '#ecfdf5', padding: '4px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800 }}>
                          <CheckCircle2 size={13} /> Behoben
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', background: '#fef2f2', padding: '4px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800 }}>
                          <AlertTriangle size={13} /> Offen
                        </span>
                      )}
                    </td>

                    {/* Column 5: Actions */}
                    <td style={{ padding: '16px 24px', verticalAlign: 'top', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          className="hover-scale-mini"
                        >
                          <Terminal size={12} /> Stack Trace
                        </button>

                        {!log.resolved && (
                          <button
                            onClick={() => handleResolve(log.id)}
                            style={{
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              padding: '6px 10px',
                              borderRadius: '10px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                            className="hover-scale-mini"
                            title="Als behoben markieren"
                          >
                            <Check size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* ─── 4. DETAIL STACK TRACE MODAL ─── */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }} className="animate-scale-up">
            
            {/* Modal Header */}
            <div style={{
              padding: '20px 28px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fafbfc'
            }}>
              <div>
                <span style={{ fontSize: '0.70rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
                  Incident-ID: {selectedLog.id}
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                  Fehlerbericht &amp; Diagnostik
                </h3>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Message Banner */}
              <div style={{
                background: selectedLog.severity === 'CRITICAL' ? '#fff1f2' : '#fffbeb',
                border: `1px solid ${selectedLog.severity === 'CRITICAL' ? '#fecdd3' : '#fde68a'}`,
                borderRadius: '16px',
                padding: '16px 20px',
                color: selectedLog.severity === 'CRITICAL' ? '#9f1239' : '#92400e',
                fontSize: '0.88rem',
                fontWeight: 800,
                lineHeight: 1.4
              }}>
                {selectedLog.message}
              </div>

              {/* Meta Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.80rem' }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Zeitpunkt:</span><br />
                  <strong>{new Date(selectedLog.timestamp).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} MESZ</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Route / Screen:</span><br />
                  <strong>{selectedLog.route || '/'}</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Umgebung:</span><br />
                  <strong>{selectedLog.osName} • {selectedLog.browserName} ({selectedLog.deviceType})</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Schweregrad &amp; Status:</span><br />
                  <strong>{selectedLog.severity} • {selectedLog.resolved ? 'Behoben' : 'Offen'}</strong>
                </div>
              </div>

              {/* Call Stack Code Block */}
              {selectedLog.stack && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>
                      JavaScript Call Stack:
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedLog.stack || '')}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {copiedStack ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                      {copiedStack ? 'Kopiert!' : 'Stack kopieren'}
                    </button>
                  </div>
                  <pre style={{
                    margin: 0,
                    padding: '16px',
                    background: '#0f172a',
                    color: '#f8fafc',
                    borderRadius: '14px',
                    fontSize: '0.72rem',
                    lineHeight: 1.5,
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    maxHeight: '220px'
                  }}>
                    {selectedLog.stack}
                  </pre>
                </div>
              )}

              {/* Component Stack */}
              {selectedLog.componentStack && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>
                    React Component Tree:
                  </span>
                  <pre style={{
                    margin: 0,
                    padding: '14px',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    fontSize: '0.72rem',
                    lineHeight: 1.5,
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    maxHeight: '140px'
                  }}>
                    {selectedLog.componentStack}
                  </pre>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 28px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fafbfc'
            }}>
              {!selectedLog.resolved ? (
                <button
                  onClick={() => handleResolve(selectedLog.id)}
                  style={{
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  className="hover-scale-mini"
                >
                  <CheckCircle2 size={15} />
                  <span>Als behoben markieren</span>
                </button>
              ) : (
                <span style={{ color: '#059669', fontSize: '0.82rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} /> Incident wurde als behoben markiert
                </span>
              )}

              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Schließen
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
