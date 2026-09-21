import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, CheckCircle2, AlertTriangle, X, 
  DoorOpen, Plus, ArrowRight, ShieldCheck, Ticket, RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface MakeupTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'redeem' | 'cancel';
  occurrence?: any; // For create mode
  token?: any; // For redeem / cancel mode
  rooms: any[];
  teacherId: string;
  onSuccess: () => Promise<void> | void;
}

export const TeacherMakeupTokenModal: React.FC<MakeupTokenModalProps> = ({
  isOpen,
  onClose,
  mode: initialMode,
  occurrence,
  token: initialToken,
  rooms = [],
  teacherId,
  onSuccess
}) => {
  const [currentMode, setCurrentMode] = useState<'create' | 'redeem' | 'cancel'>(initialMode);
  const [redeemPath, setRedeemPath] = useState<'new_lesson' | 'extend_lesson'>('new_lesson');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states for Mode: Create
  const [createNotes, setCreateNotes] = useState('');

  // Form states for Mode: Redeem - Path A (Neuer Ersatztermin)
  const [pathADate, setPathADate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [pathAStartTime, setPathAStartTime] = useState('14:00');
  const [pathADuration, setPathADuration] = useState<number>(30);
  const [pathARoomId, setPathARoomId] = useState<string>('');

  // Form states for Mode: Redeem - Path B (Folgestunde verlängern)
  const [futureOccurrences, setFutureOccurrences] = useState<any[]>([]);
  const [loadingFutureOccs, setLoadingFutureOccs] = useState(false);
  const [selectedFutureOccId, setSelectedFutureOccId] = useState<string>('');
  const [extensionMinutes, setExtensionMinutes] = useState<number>(15);

  // Form states for Mode: Cancel
  const [cancelReason, setCancelReason] = useState('Einvernehmlich erlassen');

  // Token resolution
  const activeToken = initialToken;
  const studentName = activeToken?.student_first_name 
    ? `${activeToken.student_first_name} ${activeToken.student_last_name || ''}`.trim()
    : (occurrence?.student?.first_name 
        ? `${occurrence.student.first_name} ${occurrence.student.last_name || ''}`.trim()
        : 'Schüler');

  const studentInstrument = activeToken?.student_instrument || occurrence?.instrument || 'Musikunterricht';
  const remainingMins = activeToken?.remaining_minutes ?? occurrence?.duration ?? 30;

  useEffect(() => {
    setCurrentMode(initialMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (rooms.length > 0 && !pathARoomId) {
      setPathARoomId(rooms[0].id);
    }
  }, [initialMode, isOpen, rooms]);

  // Load future lessons for Path B (Extend lesson)
  const fetchFutureLessons = useCallback(async () => {
    const targetStudentId = activeToken?.student_id || occurrence?.student_id || occurrence?.student?.id;
    if (!targetStudentId || !teacherId) return;

    setLoadingFutureOccs(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('schedule_occurrences')
        .select(`
          id,
          date,
          start_time,
          duration,
          status,
          makeup_extension_minutes,
          room_id,
          rooms (id, name),
          schedules (duration, instrument)
        `)
        .eq('teacher_id', teacherId)
        .eq('student_id', targetStudentId)
        .gte('date', todayStr)
        .neq('status', 'cancelled')
        .order('date', { ascending: true })
        .limit(10);

      if (!error && data) {
        setFutureOccurrences(data);
        if (data.length > 0) {
          setSelectedFutureOccId(data[0].id);
        }
      }
    } catch (err) {
      console.warn('Error fetching future lessons:', err);
    } finally {
      setLoadingFutureOccs(false);
    }
  }, [activeToken, occurrence, teacherId]);

  useEffect(() => {
    if (isOpen && currentMode === 'redeem' && redeemPath === 'extend_lesson') {
      fetchFutureLessons();
    }
  }, [isOpen, currentMode, redeemPath, fetchFutureLessons]);

  // Accessibility: Escape Key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Token Creation
  const handleCreateToken = async () => {
    if (!occurrence?.id) {
      setErrorMessage('Kein Termin ausgewählt');
      return;
    }
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.rpc('create_lesson_makeup_token', {
        p_occurrence_id: occurrence.id,
        p_notes: createNotes.trim() || null
      });

      if (error) {
        setErrorMessage(error.message || 'Fehler beim Erstellen des Nachhol-Kontingents');
        return;
      }

      if (data && !data.success) {
        setErrorMessage(data.error || 'Fehler beim Erstellen');
        return;
      }

      setSuccessMessage('Nachhol-Kontingent erfolgreich erstellt!');
      setTimeout(async () => {
        await onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unerwarteter Fehler');
    } finally {
      setLoading(false);
    }
  };

  // Handle Token Redemption - Path A (Neuer Ersatztermin)
  const handleRedeemPathA = async () => {
    if (!activeToken?.id && !activeToken?.token_id) {
      setErrorMessage('Kein aktives Nachhol-Kontingent gefunden');
      return;
    }
    const tokenId = activeToken.id || activeToken.token_id;

    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.rpc('redeem_makeup_token_as_new_lesson', {
        p_token_id: tokenId,
        p_date: pathADate,
        p_start_time: pathAStartTime,
        p_room_id: pathARoomId || null,
        p_duration: Math.min(pathADuration, remainingMins)
      });

      if (error) {
        setErrorMessage(error.message || 'Fehler beim Buchen des Nachholtermins');
        return;
      }

      if (data && !data.success) {
        setErrorMessage(data.error || 'Fehler beim Einlösen');
        return;
      }

      setSuccessMessage('Nachholtermin verbindlich gebucht & Schüler benachrichtigt!');
      setTimeout(async () => {
        await onSuccess();
        onClose();
      }, 1300);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unerwarteter Fehler');
    } finally {
      setLoading(false);
    }
  };

  // Handle Token Redemption - Path B (Folgestunde verlängern)
  const handleRedeemPathB = async () => {
    if (!activeToken?.id && !activeToken?.token_id) {
      setErrorMessage('Kein aktives Nachhol-Kontingent gefunden');
      return;
    }
    if (!selectedFutureOccId) {
      setErrorMessage('Bitte wähle eine Folgestunde zur Verlängerung aus');
      return;
    }
    const tokenId = activeToken.id || activeToken.token_id;

    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.rpc('extend_lesson_with_makeup_token', {
        p_token_id: tokenId,
        p_occurrence_id: selectedFutureOccId,
        p_extension_minutes: extensionMinutes
      });

      if (error) {
        setErrorMessage(error.message || 'Fehler beim Verlängern der Folgestunde');
        return;
      }

      if (data && !data.success) {
        setErrorMessage(data.error || 'Fehler beim Verlängern');
        return;
      }

      setSuccessMessage(`Unterrichtsstunde erfolgreich um +${extensionMinutes} Min. verlängert!`);
      setTimeout(async () => {
        await onSuccess();
        onClose();
      }, 1300);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unerwarteter Fehler');
    } finally {
      setLoading(false);
    }
  };

  // Handle Token Cancellation (Teacher Sovereignty)
  const handleCancelToken = async () => {
    if (!activeToken?.id && !activeToken?.token_id) {
      setErrorMessage('Kein Nachhol-Kontingent ausgewählt');
      return;
    }
    const tokenId = activeToken.id || activeToken.token_id;

    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.rpc('cancel_lesson_makeup_token', {
        p_token_id: tokenId,
        p_reason: cancelReason.trim() || 'Einvernehmlich erlassen'
      });

      if (error) {
        setErrorMessage(error.message || 'Fehler beim Stornieren');
        return;
      }

      if (data && !data.success) {
        setErrorMessage(data.error || 'Fehler beim Stornieren');
        return;
      }

      setSuccessMessage('Nachhol-Kontingent wurde einvernehmlich storniert.');
      setTimeout(async () => {
        await onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unerwarteter Fehler');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="makeup-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '32px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Header Bar */}
        <div style={{
          padding: '24px 28px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#e8f0fe',
              color: '#0b57d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Ticket size={24} />
            </div>
            <div>
              <h2 
                id="makeup-modal-title"
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 950,
                  color: '#0f172a',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  margin: 0
                }}
              >
                {currentMode === 'create' && 'Nachhol-Kontingent anlegen'}
                {currentMode === 'redeem' && 'Nachhol-Kontingent einlösen'}
                {currentMode === 'cancel' && 'Nachhol-Kontingent stornieren'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: 600 }}>
                {studentName} • {studentInstrument}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Modal schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              flexShrink: 0,
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Status Banners */}
          {errorMessage && (
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              borderRadius: '16px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#991b1b',
              fontSize: '0.84rem',
              fontWeight: 700
            }}>
              <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: '16px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#166534',
              fontSize: '0.84rem',
              fontWeight: 700
            }}>
              <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* MODE: CREATE TOKEN */}
          {/* ══════════════════════════════════════════════════════════ */}
          {currentMode === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    Ausgefallener Unterricht
                  </span>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 850,
                    background: '#fee2e2',
                    color: '#dc2626',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    Ausfall
                  </span>
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                  {occurrence?.duration || 30} Minuten Zeitguthaben
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={13} />
                  <span>Datum: {occurrence?.date || 'Heute'}</span>
                  <span>•</span>
                  <Clock size={13} />
                  <span>Beginn: {occurrence?.timeSlot || occurrence?.start_time || '–'} Uhr</span>
                </div>
              </div>

              {/* Revisionssicherer Transparenz-Kasten */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '16px',
                padding: '14px 16px',
                fontSize: '0.78rem',
                color: '#1e40af',
                lineHeight: 1.45,
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}>
                <ShieldCheck size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>100% Lehrkraft-Souveränität &amp; Revisionssicherheit:</strong>
                  <br />
                  Der historische Ausfall bleibt im Logbuch unverändert dokumentiert. Du erhältst ein minutengenaues Nachhol-Kontingent, das du flexibel als Ersatztermin oder als Verlängerung von Folgestunden einlösen kannst.
                </div>
              </div>

              {/* Optional Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.80rem', fontWeight: 800, color: '#475569' }}>
                  Interne Notiz (optional)
                </label>
                <input
                  type="text"
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="z. B. Wird nach den Ferien nachgeholt..."
                  style={{
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1.5px solid #e2e8f0',
                    background: '#ffffff',
                    fontWeight: 800,
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleCreateToken}
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#0b57d0',
                    color: '#ffffff',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(11, 87, 208, 0.25)',
                    opacity: loading ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Ticket size={16} />
                  <span>{loading ? 'Erstelle Kontingent...' : '🎟️ Nachhol-Kontingent anlegen'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* MODE: REDEEM TOKEN (PATH A vs PATH B) */}
          {/* ══════════════════════════════════════════════════════════ */}
          {currentMode === 'redeem' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Kontingent Summary Bar */}
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: '1.5px solid #e2e8f0',
                borderRadius: '20px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    Verfügbares Nachhol-Guthaben
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 950, color: '#0f172a', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span>{remainingMins} Min.</span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                      (von {activeToken?.total_minutes || 30} Min.)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentMode('cancel')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '6px 12px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Kontingent stornieren
                </button>
              </div>

              {/* Path Selection Tabs (WAI-ARIA Trias) */}
              <div 
                role="tablist"
                aria-label="Einlöse-Methode"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  background: '#f1f5f9',
                  padding: '4px',
                  borderRadius: '14px'
                }}
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-redeem-path-a"
                  aria-selected={redeemPath === 'new_lesson'}
                  aria-controls="panel-redeem-path-a"
                  tabIndex={0}
                  onClick={() => setRedeemPath('new_lesson')}
                  style={{
                    border: 'none',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: redeemPath === 'new_lesson' ? '#ffffff' : 'transparent',
                    color: redeemPath === 'new_lesson' ? '#0f172a' : '#64748b',
                    fontWeight: redeemPath === 'new_lesson' ? 900 : 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: redeemPath === 'new_lesson' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Calendar size={15} color={redeemPath === 'new_lesson' ? '#0b57d0' : '#64748b'} />
                  <span>Neuer Ersatztermin</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  id="tab-redeem-path-b"
                  aria-selected={redeemPath === 'extend_lesson'}
                  aria-controls="panel-redeem-path-b"
                  tabIndex={0}
                  onClick={() => setRedeemPath('extend_lesson')}
                  style={{
                    border: 'none',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: redeemPath === 'extend_lesson' ? '#ffffff' : 'transparent',
                    color: redeemPath === 'extend_lesson' ? '#0f172a' : '#64748b',
                    fontWeight: redeemPath === 'extend_lesson' ? 900 : 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: redeemPath === 'extend_lesson' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Clock size={15} color={redeemPath === 'extend_lesson' ? '#0b57d0' : '#64748b'} />
                  <span>Folgestunde verlängern</span>
                </button>
              </div>

              {/* ── PATH A: NEUER ERSATZTERMIN ── */}
              {redeemPath === 'new_lesson' && (
                <div 
                  role="tabpanel"
                  id="panel-redeem-path-a"
                  aria-labelledby="tab-redeem-path-a"
                  tabIndex={0}
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                        Datum *
                      </label>
                      <input
                        type="date"
                        value={pathADate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setPathADate(e.target.value)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.86rem',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                        Uhrzeit *
                      </label>
                      <input
                        type="time"
                        value={pathAStartTime}
                        onChange={(e) => setPathAStartTime(e.target.value)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.86rem',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                        Dauer (Minuten)
                      </label>
                      <select
                        value={pathADuration}
                        onChange={(e) => setPathADuration(Number(e.target.value))}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.86rem',
                          fontFamily: 'inherit'
                        }}
                      >
                        <option value={remainingMins}>{remainingMins} Minuten (Gesamtes Kontingent)</option>
                        {remainingMins >= 45 && <option value={45}>45 Minuten</option>}
                        {remainingMins >= 30 && remainingMins !== 30 && <option value={30}>30 Minuten</option>}
                        {remainingMins >= 15 && remainingMins !== 15 && <option value={15}>15 Minuten</option>}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                        Raum
                      </label>
                      <select
                        value={pathARoomId}
                        onChange={(e) => setPathARoomId(e.target.value)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.86rem',
                          fontFamily: 'inherit'
                        }}
                      >
                        <option value="">Kein Raum / Beliebig</option>
                        {rooms.map((r: any) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRedeemPathA}
                    disabled={loading}
                    style={{
                      marginTop: '8px',
                      padding: '15px',
                      borderRadius: '16px',
                      border: 'none',
                      background: '#0b57d0',
                      color: '#ffffff',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(11, 87, 208, 0.25)',
                      opacity: loading ? 0.7 : 1
                    }}
                  >
                    <Calendar size={17} />
                    <span>{loading ? 'Prüfe & Buche...' : '📅 Nachholtermin verbindlich ansetzen'}</span>
                  </button>
                </div>
              )}

              {/* ── PATH B: FOLGESTUNDE VERLÄNGERN ── */}
              {redeemPath === 'extend_lesson' && (
                <div 
                  role="tabpanel"
                  id="panel-redeem-path-b"
                  aria-labelledby="tab-redeem-path-b"
                  tabIndex={0}
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.4 }}>
                    Verlängere eine reguläre Folgestunde dieses Schülers um 15 oder 30 Minuten. Die Raumverfügbarkeit wird für das erweiterte Zeitfenster automatisch geprüft.
                  </div>

                  {loadingFutureOccs ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                      Lade Folgetermine des Schülers...
                    </div>
                  ) : futureOccurrences.length === 0 ? (
                    <div style={{
                      padding: '24px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      borderRadius: '16px',
                      border: '1px dashed #cbd5e1',
                      color: '#64748b',
                      fontSize: '0.85rem'
                    }}>
                      Keine zukünftigen Termine für diesen Schüler gefunden. Bitte nutze Pfad A (Neuer Ersatztermin).
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                          Folgestunde auswählen *
                        </label>
                        <select
                          value={selectedFutureOccId}
                          onChange={(e) => setSelectedFutureOccId(e.target.value)}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '0.86rem',
                            fontFamily: 'inherit'
                          }}
                        >
                          {futureOccurrences.map((occ: any) => {
                            const dateFormatted = new Date(occ.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
                            const roomStr = occ.rooms?.name || 'Raum';
                            const dur = occ.duration || 30;
                            return (
                              <option key={occ.id} value={occ.id}>
                                {dateFormatted} um {occ.start_time?.substring(0, 5)} Uhr ({dur} Min., {roomStr})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Extension Minutes Picker */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                          Verlängerung wählen
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => setExtensionMinutes(15)}
                            disabled={remainingMins < 15}
                            style={{
                              padding: '12px',
                              borderRadius: '12px',
                              border: extensionMinutes === 15 ? '2px solid #0b57d0' : '1.5px solid #cbd5e1',
                              background: extensionMinutes === 15 ? '#eff6ff' : '#ffffff',
                              color: extensionMinutes === 15 ? '#1d4ed8' : '#334155',
                              fontWeight: 900,
                              fontSize: '0.88rem',
                              cursor: remainingMins >= 15 ? 'pointer' : 'not-allowed',
                              opacity: remainingMins < 15 ? 0.4 : 1
                            }}
                          >
                            +15 Minuten
                          </button>

                          <button
                            type="button"
                            onClick={() => setExtensionMinutes(30)}
                            disabled={remainingMins < 30}
                            style={{
                              padding: '12px',
                              borderRadius: '12px',
                              border: extensionMinutes === 30 ? '2px solid #0b57d0' : '1.5px solid #cbd5e1',
                              background: extensionMinutes === 30 ? '#eff6ff' : '#ffffff',
                              color: extensionMinutes === 30 ? '#1d4ed8' : '#334155',
                              fontWeight: 900,
                              fontSize: '0.88rem',
                              cursor: remainingMins >= 30 ? 'pointer' : 'not-allowed',
                              opacity: remainingMins < 30 ? 0.4 : 1
                            }}
                          >
                            +30 Minuten
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRedeemPathB}
                        disabled={loading}
                        style={{
                          marginTop: '8px',
                          padding: '15px',
                          borderRadius: '16px',
                          border: 'none',
                          background: '#16a34a',
                          color: '#ffffff',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)',
                          opacity: loading ? 0.7 : 1
                        }}
                      >
                        <Clock size={17} />
                        <span>{loading ? 'Prüfe Raumkollision...' : `⏱️ Stunde um +${extensionMinutes} Min. verlängern`}</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* MODE: CANCEL TOKEN (TEACHER SOVEREIGNTY) */}
          {/* ══════════════════════════════════════════════════════════ */}
          {currentMode === 'cancel' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '20px',
                padding: '18px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.45 }}>
                  <strong>Nachhol-Kontingent stornieren</strong>
                  <br />
                  Du hast als Lehrkraft die volle Souveränität, dieses Kontingent zu schließen (z. B. wenn der Termin einvernehmlich erlassen wurde oder auf anderem Weg kompensiert wurde).
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                  Grund der Stornierung
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.86rem',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="Einvernehmlich erlassen">Einvernehmlich erlassen</option>
                  <option value="Schüler hat auf Nachholung verzichtet">Schüler hat auf Nachholung verzichtet</option>
                  <option value="Anderweitig kompensiert">Anderweitig kompensiert</option>
                  <option value="Organisatorisch obsolet">Organisatorisch obsolet</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentMode('redeem')}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1.5px solid #e2e8f0',
                    background: '#ffffff',
                    fontWeight: 800,
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Zurück
                </button>
                <button
                  type="button"
                  onClick={handleCancelToken}
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '16px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.25)',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Storniere...' : 'Kontingent endgültig stornieren'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
