import React, { useState } from 'react';
import { 
  ClipboardList, 
  DoorOpen, 
  ShieldAlert, 
  CheckCircle, 
  Trash2, 
  X, 
  AlertCircle, 
  ChevronRight 
} from 'lucide-react';
import { deleteStudentFully } from '../../utils/studentDeletionService';
import { maskLastName } from '../../utils/nameHelper';

export interface LogbookBooking {
  id: string;
  title?: string;
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  room_id?: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    [key: string]: unknown;
  };
  rooms?: {
    name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TrialLogEntry {
  id: string;
  record_id: string;
  created_at: string;
  action: string;
  changed_by?: string;
  new_data?: {
    is_trial?: boolean;
    is_campus_active?: boolean;
    trial_ends_at?: string;
    [key: string]: unknown;
  };
  old_data?: {
    is_trial?: boolean;
    is_campus_active?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SecretaryOperationsModalsHubProps {
  // Room Bookings Logbook
  showLogbookModal: boolean;
  setShowLogbookModal: (show: boolean) => void;
  logbookBookings: LogbookBooking[];
  editingLogbookBookingId: string | null;
  setEditingLogbookBookingId: (id: string | null) => void;
  editBookingTitle: string;
  setEditBookingTitle: (t: string) => void;
  editBookingRoomId: string;
  setEditBookingRoomId: (r: string) => void;
  editBookingDate: string;
  setEditBookingDate: (d: string) => void;
  editBookingStartTime: string;
  setEditBookingStartTime: (s: string) => void;
  editBookingEndTime: string;
  setEditBookingEndTime: (e: string) => void;
  rooms: Array<{ id: string; name: string; [key: string]: unknown }>;
  handleConfirmLogbookBooking: (id: string) => void;
  handleUpdateLogbookBooking: (id: string) => void;
  handleDeleteLogbookBooking: (id: string) => void;

  // Trial Students Logbook
  showTrialLogModal: boolean;
  setShowTrialLogModal: (show: boolean) => void;
  trialLogsLoading: boolean;
  trialLogs: TrialLogEntry[];
  userMap: Record<string, string>;

  // Factory Reset Modal
  showResetModal: boolean;
  setShowResetModal: (show: boolean) => void;
  resetConfirmText: string;
  setResetConfirmText: (text: string) => void;
  schoolName: string;
  handleResetSchool: () => void;
  isResetting: boolean;

  // Bulk Delete Students Modal
  showBulkDeleteModal: boolean;
  setShowBulkDeleteModal: (show: boolean) => void;
  bulkDeleteStep: number;
  setBulkDeleteStep: (step: any) => void;
  bulkDeletePin: string;
  setBulkDeletePin: (pin: string) => void;
  selectedStudentIds: string[];
  setSelectedStudentIds: (ids: string[]) => void;
  students: any[];
  setStudents: React.Dispatch<React.SetStateAction<any[]>>;
  showRealNames: boolean;
  activeTab: 'secretary' | 'campus' | 'groovelab';
  fetchDashboardData: () => Promise<void> | void;
}

export const SecretaryOperationsModalsHub: React.FC<SecretaryOperationsModalsHubProps> = ({
  showLogbookModal,
  setShowLogbookModal,
  logbookBookings,
  editingLogbookBookingId,
  setEditingLogbookBookingId,
  editBookingTitle,
  setEditBookingTitle,
  editBookingRoomId,
  setEditBookingRoomId,
  editBookingDate,
  setEditBookingDate,
  editBookingStartTime,
  setEditBookingStartTime,
  editBookingEndTime,
  setEditBookingEndTime,
  rooms,
  handleConfirmLogbookBooking,
  handleUpdateLogbookBooking,
  handleDeleteLogbookBooking,

  showTrialLogModal,
  setShowTrialLogModal,
  trialLogsLoading,
  trialLogs,
  userMap,

  showResetModal,
  setShowResetModal,
  resetConfirmText,
  setResetConfirmText,
  schoolName,
  handleResetSchool,
  isResetting,

  showBulkDeleteModal,
  setShowBulkDeleteModal,
  bulkDeleteStep,
  setBulkDeleteStep,
  bulkDeletePin,
  setBulkDeletePin,
  selectedStudentIds,
  setSelectedStudentIds,
  students,
  setStudents,
  showRealNames,
  activeTab,
  fetchDashboardData
}) => {
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  return (
    <>
      {/* ─── 1. ROOM BOOKINGS LOGBOOK MODAL ─── */}
      {showLogbookModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="logbook-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLogbookModal(false);
              setEditingLogbookBookingId(null);
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.3)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '960px',
            maxHeight: '85vh',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(0, 0, 0, 0.05)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 32px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div>
                <h2 id="logbook-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  📖 Raumbuchungen Logbuch
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  Verwalte und bearbeite alle Raumbuchungen deiner Schule nachträglich.
                </p>
              </div>
              <button
                type="button"
                aria-label="Logbuch schließen"
                onClick={() => {
                  setShowLogbookModal(false);
                  setEditingLogbookBookingId(null);
                }}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              padding: '32px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              {logbookBookings.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '48px 24px',
                  color: '#64748b'
                }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Keine Buchungen vorhanden</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.8 }}>Es wurden noch keine Raumbuchungen vorgenommen.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {logbookBookings.map((b) => {
                    const isEditing = editingLogbookBookingId === b.id;
                    const teacherName = b.profiles 
                      ? `${b.profiles.first_name || ''} ${b.profiles.last_name || ''}`.trim()
                      : 'Unbekannt';
                    const roomName = b.rooms?.name || 'Unbekannt';
                    const dateFormatted = new Date(b.date).toLocaleDateString('de-DE', {
                      weekday: 'short',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    });

                    return (
                      <div 
                        key={b.id}
                        style={{
                          background: isEditing ? '#f8fafc' : '#ffffff',
                          border: isEditing ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          boxShadow: isEditing ? '0 4px 12px rgba(59, 130, 246, 0.04)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isEditing ? (
                          /* EDITING FORM */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Titel / Zweck</label>
                                <input
                                  type="text"
                                  value={editBookingTitle}
                                  onChange={(e) => setEditBookingTitle(e.target.value)}
                                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Raum</label>
                                <select
                                  value={editBookingRoomId}
                                  onChange={(e) => setEditBookingRoomId(e.target.value)}
                                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box', background: '#ffffff' }}
                                >
                                  {rooms.map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Datum</label>
                                <input
                                  type="date"
                                  value={editBookingDate}
                                  onChange={(e) => setEditBookingDate(e.target.value)}
                                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Startzeit</label>
                                <input
                                  type="time"
                                  value={editBookingStartTime}
                                  onChange={(e) => setEditBookingStartTime(e.target.value)}
                                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Endzeit</label>
                                <input
                                  type="time"
                                  value={editBookingEndTime}
                                  onChange={(e) => setEditBookingEndTime(e.target.value)}
                                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                />
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                              <button
                                onClick={() => setEditingLogbookBookingId(null)}
                                style={{
                                  background: '#e2e8f0',
                                  border: 'none',
                                  color: '#334155',
                                  padding: '8px 16px',
                                  borderRadius: '10px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  transition: 'background 0.15s'
                                }}
                              >
                                Abbrechen
                              </button>
                              <button
                                onClick={() => handleUpdateLogbookBooking(b.id)}
                                style={{
                                  background: '#3b82f6',
                                  border: 'none',
                                  color: '#ffffff',
                                  padding: '8px 16px',
                                  borderRadius: '10px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  transition: 'background 0.15s'
                                }}
                              >
                                Speichern
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* VIEWING MODE */
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px', flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>{b.title || 'Eigennutzung'}</span>
                                <span style={{
                                  background: b.status === 'pending' ? '#fff7ed' : '#e6f4ea',
                                  color: b.status === 'pending' ? '#c2410c' : '#34a853',
                                  border: b.status === 'pending' ? '1px solid #fed7aa' : '1px solid #e6f4ea',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '0.64rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase'
                                }}>
                                  {b.status === 'pending' ? '⏳ Vorläufig' : '✓ Bestätigt'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                                <span style={{ marginRight: '12px' }}>📍 Raum: <strong>{roomName}</strong></span>
                                <span style={{ marginRight: '12px' }}>👤 Gebucht von: <strong>{teacherName}</strong></span>
                                <span>📅 {dateFormatted} ({b.start_time.substring(0, 5)} - {b.end_time.substring(0, 5)})</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {b.status === 'pending' && (
                                <button
                                  onClick={() => handleConfirmLogbookBooking(b.id)}
                                  style={{
                                    background: '#34a853',
                                    border: 'none',
                                    color: '#ffffff',
                                    padding: '8px 14px',
                                    borderRadius: '10px',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#34a853'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = '#34a853'}
                                >
                                  Bestätigen
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditingLogbookBookingId(b.id);
                                  setEditBookingTitle(b.title || '');
                                  setEditBookingRoomId(b.room_id || '');
                                  setEditBookingDate(b.date || '');
                                  setEditBookingStartTime(b.start_time.substring(0, 5));
                                  setEditBookingEndTime(b.end_time.substring(0, 5));
                                }}
                                style={{
                                  background: '#f1f5f9',
                                  border: 'none',
                                  color: '#475569',
                                  padding: '8px 14px',
                                  borderRadius: '10px',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                              >
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => handleDeleteLogbookBooking(b.id)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  border: 'none',
                                  color: '#ef4444',
                                  padding: '8px 14px',
                                  borderRadius: '10px',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                              >
                                Löschen
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. TRIAL LOGBOOK MODAL ─── */}
      {showTrialLogModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="trial-log-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTrialLogModal(false);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.3)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '80vh',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1.5px solid #cbd5e1'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '24px', borderBottom: '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ClipboardList size={22} color="#34a853" />
                <h3 id="trial-log-modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>Probezeit- & Freischaltungs-Logbuch</h3>
              </div>
              <button
                type="button"
                aria-label="Logbuch schließen"
                onClick={() => setShowTrialLogModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '1rem',
                  fontWeight: 900,
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trialLogsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <div className="google-spinner" />
                </div>
              ) : trialLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.88rem', fontWeight: 600 }}>
                  Keine Logbucheinträge vorhanden.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {trialLogs.map((log: any) => {
                    const studentName = userMap[log.record_id] || `Schüler (ID: ${log.record_id.substring(0, 8)})`;
                    const dateStr = new Date(log.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    
                    // Parse log changes to render a descriptive message
                    let detailMsg = '';
                    let actionIcon = '📝';
                    let actionColor = '#f8fafc';
                    let actionBorder = '#e2e8f0';

                    if (log.action === 'INSERT') {
                      detailMsg = 'Nutzerprofil wurde neu angelegt.';
                      actionIcon = '👤';
                      actionColor = '#eff6ff';
                      actionBorder = '#bfdbfe';
                    } else if (log.action === 'UPDATE' && log.new_data) {
                      const oldT = log.old_data?.is_trial;
                      const newT = log.new_data?.is_trial;
                      const oldC = log.old_data?.is_campus_active;
                      const newC = log.new_data?.is_campus_active;

                      if (newT === true && oldT !== true) {
                        detailMsg = `Probezeit (30 Tage) wurde gestartet (gültig bis ${log.new_data.trial_ends_at ? new Date(log.new_data.trial_ends_at).toLocaleDateString('de-DE') : ''}).`;
                        actionIcon = '⏳';
                        actionColor = '#fffbeb';
                        actionBorder = '#fde68a';
                      } else if (oldT === true && newT === false && newC !== false) {
                        detailMsg = 'Probezeit beendet und Account dauerhaft freigeschaltet.';
                        actionIcon = '✅';
                        actionColor = '#e6f4ea';
                        actionBorder = '#e6f4ea';
                      } else if (newC === false && oldC === true) {
                        detailMsg = 'Campus-Zugang wurde deaktiviert.';
                        actionIcon = '🚫';
                        actionColor = '#fef2f2';
                        actionBorder = '#fca5a5';
                      } else if (newC === true && oldC !== true) {
                        detailMsg = 'Campus-Zugang wurde aktiviert.';
                        actionIcon = '⚡';
                        actionColor = '#e6f4ea';
                        actionBorder = '#e6f4ea';
                      } else {
                        detailMsg = 'Profil-Informationen wurden aktualisiert.';
                      }
                    }

                    // Who performed the action?
                    const changerName = log.changed_by ? (userMap[log.changed_by] || `Mitarbeiter (${log.changed_by.substring(0, 8)})`) : 'Schüler (Selbst-Aktivierung)';

                    return (
                      <div key={log.id} style={{ display: 'flex', gap: '14px', padding: '16px', borderRadius: '16px', background: actionColor, border: `1px solid ${actionBorder}` }}>
                        <span style={{ fontSize: '1.4rem', marginTop: '2px' }}>{actionIcon}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1f2937' }}>
                            {studentName}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: '#4b5563', fontWeight: 600 }}>
                            {detailMsg}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: 600, marginTop: '2px' }}>
                            📅 {dateStr} • Durchgeführt von: <strong>{changerName}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div style={{ padding: '18px 24px', borderTop: '1.5px solid #cbd5e1', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setShowTrialLogModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: '#64748b',
                  color: 'white',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. FACTORY RESET MODAL ─── */}
      {showResetModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="school-reset-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowResetModal(false);
              setResetConfirmText('');
            }
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '540px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #fee2e2', background: '#fff5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 id="school-reset-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#c53030', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} /> Werkseinstellungen zurücksetzen
              </h3>
              <button 
                type="button"
                aria-label="Dialog schließen"
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText('');
                }}
                style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#742a2a', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#fff5f5', border: '1.5px solid #feb2b2', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <ShieldAlert size={24} style={{ color: '#e53e3e', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.8rem', color: '#742a2a', lineHeight: '1.45' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', fontSize: '0.84rem' }}>Achtung: Dies ist eine destruktive Aktion!</strong>
                  Durch diesen Vorgang werden alle Schülerprofile, Lehrerprofile, Ausweise, Wochenpläne, Stunden, Bands, Chathistorien und zugehörigen Übungsdaten <strong>unwiderruflich gelöscht</strong>. Nur Ihr Administrator-Konto bleibt aktiv.
                </div>
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '0.76rem',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                lineHeight: '1.45'
              }}>
                <CheckCircle size={18} color="#34a853" style={{ flexShrink: 0 }} />
                <span>
                  <strong style={{ color: '#1e293b' }}>Abonnement-Schutz:</strong> Ihr gebuchter Vertrag und das Cloud-Hosting bleiben unverändert aktiv. Variable Schülergebühren stoppen automatisch, bis Sie neue Schülerprofile anlegen.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.4' }}>
                  Bitte bestätigen Sie diesen Vorgang, indem Sie den genauen Namen Ihrer Musikschule eingeben:
                </span>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', userSelect: 'none' }}>
                  {schoolName}
                </div>
                <input
                  type="text"
                  placeholder="Namen der Musikschule hier eingeben..."
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  style={{ 
                    padding: '12px 14px', 
                    borderRadius: '10px', 
                    border: '1.5px solid',
                    borderColor: resetConfirmText === schoolName ? '#34a853' : '#cbd5e1', 
                    fontSize: '0.84rem', 
                    outline: 'none', 
                    width: '100%',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    transition: 'all 0.15s'
                  }}
                />
              </div>
            </div>

            {/* Footer / Action Buttons */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmText('');
                }}
                style={{ 
                  padding: '10px 18px', 
                  fontSize: '0.78rem', 
                  fontWeight: 700, 
                  borderRadius: '10px', 
                  border: '1px solid #cbd5e1', 
                  background: '#ffffff', 
                  color: '#475569', 
                  cursor: 'pointer' 
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleResetSchool}
                disabled={resetConfirmText !== schoolName || isResetting}
                style={{ 
                  padding: '10px 20px', 
                  fontSize: '0.78rem', 
                  fontWeight: 800, 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: resetConfirmText === schoolName ? '#e53e3e' : '#cbd5e1', 
                  color: '#ffffff', 
                  cursor: resetConfirmText === schoolName ? 'pointer' : 'not-allowed',
                  opacity: resetConfirmText === schoolName ? 1 : 0.6,
                  transition: 'all 0.15s'
                }}
              >
                {isResetting ? 'Wird zurückgesetzt...' : 'Ja, alle Daten unwiderruflich löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. BULK DELETE STUDENTS MODAL ─── */}
      {showBulkDeleteModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-title"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
          }}
        >
          <div style={{
            background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', border: '1px solid #e2e8f0'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white',
              padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '10px', borderRadius: '12px' }}>
                  <Trash2 size={22} color="white" />
                </div>
                <div>
                  <h3 id="bulk-delete-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, fontFamily: 'Urbanist' }}>
                    Mehrere Schüler löschen ({selectedStudentIds.length})
                  </h3>
                  <span style={{ fontSize: '0.78rem', opacity: 0.9 }}>Sicherheitsabfrage für Sammellöschung</span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dialog schließen"
                onClick={() => {
                  setShowBulkDeleteModal(false);
                  setBulkDeleteStep(1);
                  setBulkDeletePin('');
                }}
                style={{ background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {bulkDeleteStep === 1 ? (
                <>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.84rem', color: '#991b1b', lineHeight: 1.5 }}>
                      Du bist dabei, <strong>{selectedStudentIds.length} Schüler</strong> gleichzeitig zu entfernen.
                      <br /><br />
                      - Schüler, die <strong>nur auf dem aktuellen Modul</strong> aktiv sind, werden <strong>unwiderruflich gelöscht</strong>.
                      <br />
                      - Schüler, die auch auf dem <strong>anderen Modul</strong> aktiv sind, bleiben dort erhalten und werden hier nur deaktiviert.
                    </div>
                  </div>

                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px', background: '#f8fafc' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Ausgewählte Schüler ({selectedStudentIds.length}):
                    </span>
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '18px', fontSize: '0.84rem', color: '#1e293b', lineHeight: 1.6 }}>
                      {students.filter((s: any) => selectedStudentIds.includes(s.id)).map((s: any) => (
                        <li key={s.id}>
                          <strong>{s.first_name} {maskLastName(s.last_name, showRealNames)}</strong> {s.instrument ? `(${s.instrument})` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setShowBulkDeleteModal(false)}
                      style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkDeleteStep(2)}
                      style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#dc2626', color: '#ffffff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      Weiter zur Sicherheits-PIN <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 900, color: '#991b1b', fontSize: '0.95rem', marginBottom: '6px' }}>
                      Zweite Sicherheitsstufe: PIN-Bestätigung
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#7f1d1d' }}>
                      Gib den 3-stelligen Sicherheitscode <strong>489</strong> ein, um das Löschen der {selectedStudentIds.length} Schüler zu bestätigen.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Sicherheits-PIN (489)
                    </label>
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="489"
                      value={bulkDeletePin}
                      onChange={(e) => setBulkDeletePin(e.target.value)}
                      style={{
                        width: '120px', textAlign: 'center', fontSize: '1.8rem', fontWeight: 900,
                        letterSpacing: '0.2em', padding: '8px', borderRadius: '12px', border: '2px solid #ef4444', outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setBulkDeleteStep(1)}
                      style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Zurück
                    </button>
                    <button
                      type="button"
                      disabled={bulkDeletePin !== '489' || isBulkDeleting}
                      onClick={async () => {
                        setIsBulkDeleting(true);
                        try {
                          const currentPlatform = activeTab === 'campus' ? 'campus' : activeTab === 'groovelab' ? 'groovelab' : 'all';
                          for (const studentId of selectedStudentIds) {
                            const studentObj = students.find((s: any) => s.id === studentId);
                            await deleteStudentFully(studentId, {
                              activePlatform: currentPlatform,
                              isCampusActive: studentObj?.is_campus_active,
                              isGroovelabActive: studentObj?.is_groovelab_active
                            });
                          }
                          const deletedIds = [...selectedStudentIds];
                          setSelectedStudentIds([]);
                          setShowBulkDeleteModal(false);
                          setBulkDeleteStep(1);
                          setBulkDeletePin('');
                          setStudents((prev: any[]) => prev.filter((s: any) => !deletedIds.includes(s.id)));
                          await fetchDashboardData();
                        } catch (err: any) {
                          alert('Fehler beim Löschen: ' + err.message);
                        } finally {
                          setIsBulkDeleting(false);
                        }
                      }}
                      style={{
                        padding: '10px 20px', borderRadius: '12px', border: 'none',
                        background: bulkDeletePin === '489' && !isBulkDeleting ? '#dc2626' : '#cbd5e1',
                        color: '#ffffff', fontWeight: 900, cursor: bulkDeletePin === '489' && !isBulkDeleting ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      {isBulkDeleting ? 'Lösche...' : `Unwiderruflich ${selectedStudentIds.length} Schüler löschen`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
