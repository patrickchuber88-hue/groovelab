import React, { useState, useRef, useEffect } from 'react';
import { maskLastName } from '../../utils/nameHelper';
import { formatHarmonizedAudioTitle } from '../../utils/audioNamingHelper';
import { getDailyQuote } from '@groovelab/shared';
import { supabase } from '../../lib/supabase';

import {
  Activity, BookOpen, Calendar, Check, Clock, Edit3, Flame,
  Mic, Music, Sparkles, Sun, User, Users, Zap, Send, Loader2, Play, Pause, Volume2,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { isTeacherCurrentlyAbsent } from '../../utils/teacherAbsenceHelper';
import { SimpleVoiceRecorder } from '../campus/SimpleVoiceRecorder';
import { 
  parseHomeworkNotesPayload, 
  buildHomeworkNotesPayload, 
  formatPageRangeString, 
  cleanHomeworkTitle,
  isPureDidacticNote,
  sanitizeDidacticText
} from '../../utils/homeworkSnapshotHelper';

export interface TeacherHausaufgabenWidgetProps {
  teacher: any;
  activeStudent: any;
  activeGroupStudents: any[];
  selectedGroupStudentId: string | null;
  setSelectedGroupStudentId: (id: string | null) => void;
  allStudents: any[];
  bypassAbsenceView?: boolean;
  bypassSickView?: boolean;
  bypassAusfallView?: boolean;
  selectedStudentProfile: any;
  setSelectedStudentProfile: (s: any) => void;
  docStudent: any;
  setDocStudent: (s: any) => void;
  dynamicPrepMirror: any;
  setDynamicPrepMirror: React.Dispatch<React.SetStateAction<any>>;
  loadingPrepMirror: boolean;
  setLoadingPrepMirror: React.Dispatch<React.SetStateAction<boolean>>;
  briefingData: any;
  isFreeDay: boolean;
  isWeekend: boolean;
  isTourDemoScheduleActive: boolean;
  firstSlotStartStr: string;
  getSimulatedNow: () => Date;
  showRealNames: boolean;
  widgetState: any;
  onOpenStudio?: () => void;
}

export const TeacherHausaufgabenWidget: React.FC<TeacherHausaufgabenWidgetProps> = ({
  teacher,
  activeStudent,
  activeGroupStudents,
  selectedGroupStudentId,
  setSelectedGroupStudentId,
  allStudents,
  bypassAbsenceView,
  bypassSickView,
  bypassAusfallView,
  selectedStudentProfile,
  setSelectedStudentProfile,
  docStudent,
  setDocStudent,
  dynamicPrepMirror,
  setDynamicPrepMirror,
  loadingPrepMirror,
  setLoadingPrepMirror,
  briefingData,
  isFreeDay,
  isWeekend,
  isTourDemoScheduleActive,
  firstSlotStartStr,
  getSimulatedNow,
  showRealNames,
  widgetState,
  onOpenStudio,
}) => {
  const [isCopyingPrevWeek, setIsCopyingPrevWeek] = useState(false);
  const [quickHomeworkText, setQuickHomeworkText] = useState('');
  const [isSavingQuickHw, setIsSavingQuickHw] = useState(false);
  const [showQuickAudioRecorder, setShowQuickAudioRecorder] = useState(false);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [showMondayPreview, setShowMondayPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTogglePlayAudio = (url: string) => {
    if (!url) return;
    if (playingAudioUrl === url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingAudioUrl(null);
      audio.onerror = () => setPlayingAudioUrl(null);
      audio.play().catch(e => {
        console.warn('[TagesKompass] Audio playback error:', e);
        setPlayingAudioUrl(null);
      });
      setPlayingAudioUrl(url);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleSaveQuickHomework = async (currentPrep: any, customNote?: string) => {
    const textToSave = sanitizeDidacticText(customNote || quickHomeworkText);
    if (!textToSave || !currentPrep?.studentId) return;
    setIsSavingQuickHw(true);
    try {
      const curWkNum = currentPrep.currentWeekNum;
      if (!curWkNum) return;

      const activeTId = teacher?.id;

      // 1. Fetch existing row to preserve snapshots if present
      const { data: existingRows, error: fetchErr } = await supabase
        .from('progress_matrix')
        .select('id, homework_notes')
        .eq('student_id', currentPrep.studentId)
        .eq('topic_name', `Hausaufgabe KW ${curWkNum}`)
        .limit(1);

      if (fetchErr) console.warn('[quickHw] fetch warning:', fetchErr);

      const existingPayload = existingRows?.[0]?.homework_notes
        ? parseHomeworkNotesPayload(existingRows[0].homework_notes)
        : null;

      const currentNotes = Array.isArray(currentPrep.currentWeekNotes)
        ? [...currentPrep.currentWeekNotes]
        : [];

      const newDidacticNotes = existingPayload && existingPayload.didacticNotes.length > 0
        ? [...existingPayload.didacticNotes, textToSave]
        : [...currentNotes.filter(isPureDidacticNote), textToSave];

      // Build canonical payload preserving snapshots and audios
      const notesJson = buildHomeworkNotesPayload({
        didacticNotes: newDidacticNotes,
        rawSnapshotLwToken: existingPayload?.rawSnapshotLwToken || currentPrep.currentRawSnapshotLwToken || currentPrep.rawSnapshotLwToken,
        rawSnapshotSongsToken: existingPayload?.rawSnapshotSongsToken || currentPrep.currentRawSnapshotSongsToken || currentPrep.rawSnapshotSongsToken,
        audioTokens: existingPayload?.audioItems.map(a => a.rawToken) || currentNotes.filter((n: string) => typeof n === 'string' && n.startsWith('AUDIO:')),
        loopTokens: existingPayload?.loopItems.map(l => l.rawToken) || currentNotes.filter((n: string) => typeof n === 'string' && n.startsWith('LOOP:'))
      });

      if (existingRows && existingRows.length > 0) {
        const { error: updErr } = await supabase
          .from('progress_matrix')
          .update({
            homework_notes: notesJson,
            is_current_homework: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRows[0].id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from('progress_matrix')
          .insert({
            student_id: currentPrep.studentId,
            teacher_id: activeTId,
            topic_name: `Hausaufgabe KW ${curWkNum}`,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            homework_notes: notesJson,
            teacher_notes: '',
            updated_at: new Date().toISOString()
          });
        if (insErr) throw insErr;
      }

      setDynamicPrepMirror((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentWeekNotes: [...(prev.currentWeekNotes || []), textToSave]
        };
      });

      setQuickHomeworkText('');
      setShowQuickAudioRecorder(false);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: currentPrep.studentId } }));
      }
    } catch (err: any) {
      console.error('[quickHw] Error saving quick homework:', err);
      alert('Fehler beim Speichern der Schnell-Hausaufgabe: ' + (err?.message || err));
    } finally {
      setIsSavingQuickHw(false);
    }
  };

  const handleCopyPrevWeekToCurrent = async (currentPrep: any) => {
    if (!currentPrep?.studentId) return;
    setIsCopyingPrevWeek(true);
    try {
      const curWkNum = currentPrep.currentWeekNum;
      if (!curWkNum) return;

      const activeTId = teacher?.id;

      // Clone snapshots and didactic notes from prevWeek
      const cleanPrevNotes = Array.isArray(currentPrep.prevWeekNotes)
        ? currentPrep.prevWeekNotes.filter(isPureDidacticNote)
        : [];
      const audioTokens = Array.isArray(currentPrep.prevWeekNotes)
        ? currentPrep.prevWeekNotes.filter((n: string) => typeof n === 'string' && n.startsWith('AUDIO:'))
        : [];
      const loopTokens = Array.isArray(currentPrep.prevWeekNotes)
        ? currentPrep.prevWeekNotes.filter((n: string) => typeof n === 'string' && n.startsWith('LOOP:'))
        : [];

      const notesJson = buildHomeworkNotesPayload({
        didacticNotes: cleanPrevNotes,
        rawSnapshotLwToken: currentPrep.rawSnapshotLwToken,
        rawSnapshotSongsToken: currentPrep.rawSnapshotSongsToken,
        lehrwerke: currentPrep.parsedPrevLehrwerke,
        songs: currentPrep.parsedPrevSongs,
        audioTokens,
        loopTokens
      });

      // Check if current week row exists in progress_matrix
      const { data: existingRows, error: fetchErr } = await supabase
        .from('progress_matrix')
        .select('id')
        .eq('student_id', currentPrep.studentId)
        .eq('topic_name', `Hausaufgabe KW ${curWkNum}`)
        .limit(1);

      if (fetchErr) console.warn('[copyPrevWeek] fetch warning:', fetchErr);

      if (existingRows && existingRows.length > 0) {
        const { error: updErr } = await supabase
          .from('progress_matrix')
          .update({
            homework_notes: notesJson,
            is_current_homework: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRows[0].id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from('progress_matrix')
          .insert({
            student_id: currentPrep.studentId,
            teacher_id: activeTId,
            topic_name: `Hausaufgabe KW ${curWkNum}`,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            homework_notes: notesJson,
            teacher_notes: '',
            updated_at: new Date().toISOString()
          });
        if (insErr) throw insErr;
      }

      // Re-activate prevWeekItems (books, songs) as current homework if present
      if (currentPrep.prevWeekItems && currentPrep.prevWeekItems.length > 0) {
        for (const it of currentPrep.prevWeekItems) {
          if (it.title && !it.isBook) {
            await supabase
              .from('progress_matrix')
              .update({ is_current_homework: true, updated_at: new Date().toISOString() })
              .eq('student_id', currentPrep.studentId)
              .eq('topic_name', it.title);
          }
        }
      }

      // Update dynamicPrepMirror state immediately with cloned items & tokens
      setDynamicPrepMirror((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentWeekNotes: currentPrep.prevWeekNotes,
          currentWeekItems: currentPrep.prevWeekItems && currentPrep.prevWeekItems.length > 0 ? currentPrep.prevWeekItems : (prev.currentWeekItems || []),
          currentRawSnapshotLwToken: currentPrep.rawSnapshotLwToken,
          currentRawSnapshotSongsToken: currentPrep.rawSnapshotSongsToken,
          parsedCurrentLehrwerke: currentPrep.parsedPrevLehrwerke,
          parsedCurrentSongs: currentPrep.parsedPrevSongs
        };
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campus_homework_updated', { detail: { studentId: currentPrep.studentId } }));
      }
    } catch (err: any) {
      console.error('[copyPrevWeek] Error copying homework:', err);
      alert('Fehler beim Übertragen der Hausaufgaben: ' + (err?.message || err));
    } finally {
      setIsCopyingPrevWeek(false);
    }
  };

  return (
    <div className="google-card" style={{ 
      width: '100%', 
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      borderRadius: '24px',
      border: '1px solid #f1f5f9',
      boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
      padding: (typeof window !== 'undefined' && window.innerWidth < 768) ? '16px 14px' : '20px',
      opacity: 1,
      boxSizing: 'border-box' 
    }}>
      {(() => {
        if (isTourDemoScheduleActive) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Header: Student Info & Profile Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'nowrap', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 850,
                      fontSize: '1.05rem',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)',
                      flexShrink: 0
                    }}>
                      J
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                        Justus G.
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#f0fdf4',
                          border: '1px solid #dcfce7',
                          color: '#15803d',
                          borderRadius: '100px',
                          padding: '1px 7px',
                          fontSize: '0.68rem',
                          fontWeight: 750
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                          Aktueller Schüler
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '0 11px',
                      height: '32px',
                      minHeight: '32px',
                      fontSize: '0.74rem',
                      fontWeight: 750,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <User size={13} color="#475569" />
                    <span>Profil</span>
                  </button>
                </div>

                {/* Homework / Notes Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#fafafa', borderRadius: '16px', padding: '16px 18px' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      LETZTE WOCHE (VORWOCHE)
                    </span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                      Keine Hausaufgaben erfasst.
                    </p>
                  </div>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      DIESE WOCHE (HEUTE)
                    </span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                      Noch keine Hausaufgaben erfasst.
                    </p>
                  </div>
                </div>

                {/* Action CTA Button */}
                <button
                  type="button"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    border: '1px solid rgba(22, 163, 74, 0.2)',
                    borderRadius: '14px',
                    height: '44px',
                    padding: '0 18px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.22)'
                  }}
                >
                  <Edit3 size={15} color="#ffffff" />
                  <span>Hausaufgabe / Notiz erfassen</span>
                </button>
              </div>
            );
          }

          if (isTeacherCurrentlyAbsent(teacher) && !(bypassAbsenceView || bypassSickView || bypassAusfallView)) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '16px 8px' }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.06) 100%)', 
                  color: '#dc2626', 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)'
                }}>
                  <Calendar size={20} color="#dc2626" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#991b1b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Abwesenheits-Modus aktiv
                  </h4>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#b91c1c', fontWeight: 600, lineHeight: 1.4 }}>
                    Du bist gegenwärtig abwesend gemeldet. Deine heutigen Termine wurden pausiert. Erhole dich gut!
                  </p>
                </div>
              </div>
            );
          }

          if (widgetState === 'VORBEREITUNG') {
            const activeLessonsCount = briefingData?.timeline 
              ? briefingData.timeline.filter((s: any) => s.student && s.status !== 'canceled_by_student' && s.status !== 'canceled_by_teacher' && s.status !== 'cancelled' && s.status !== 'rescheduled_away').length 
              : 0;
            const dailyChanges = briefingData?.timeline 
              ? briefingData.timeline.filter((s: any) => s.student && (
                  s.status === 'canceled_by_student' || 
                  s.status === 'canceled_by_teacher' || 
                  s.status === 'cancelled' || 
                  s.status === 'rescheduled_away'
                )) 
              : [];

            const otherReschedules = briefingData?.rescheduledReminders?.filter((rem: any) => 
              !dailyChanges.some((dc: any) => dc.student?.name === rem.studentName)
            ) || [];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "'Inter', sans-serif", flex: 1, minHeight: 0 }}>
                {/* Title Section: borderless, simple, calm */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={16} color="#475569" style={{ opacity: 0.8 }} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                        Vorbereitung
                      </h4>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>Fahrplan &amp; Änderungen</div>
                    </div>
                  </div>
                  {onOpenStudio && (
                    <button
                      type="button"
                      onClick={onOpenStudio}
                      style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '6px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                      }}
                      className="hover-scale"
                      title="Eigenes Aufgaben-Studio öffnen"
                    >
                      <Sparkles size={13} />
                      <span>Aufgaben-Studio</span>
                    </button>
                  )}
                </div>

                {/* Unified Compact Info Container */}
                <div style={{
                  background: '#fafafa',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto'
                }}>
                  {/* 1. Key Facts: Lessons count & Start Time */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: '#334155' }}>
                      <Activity size={15} color="#64748b" style={{ flexShrink: 0 }} />
                      <span>
                        Heute stehen <strong style={{ color: '#0f172a' }}>{activeLessonsCount} Termine</strong> auf dem Fahrplan.
                      </span>
                    </div>

                    {firstSlotStartStr && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: '#334155' }}>
                        <Clock size={15} color="#64748b" style={{ flexShrink: 0 }} />
                        <span>
                          Erster Unterricht beginnt um <strong style={{ color: '#0f172a' }}>{firstSlotStartStr} Uhr</strong>.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 2. Daily Changes (Nur dynamisch anzeigen, wenn wirklich ein Ausfall oder eine Verschiebung vorliegt) */}
                  {dailyChanges.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Änderungen &amp; Ausfälle heute
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {dailyChanges.map((slot: any, idx: number) => {
                          const isCanceled = slot.status !== 'rescheduled_away';
                          const labelColor = isCanceled ? '#ef4444' : '#f59e0b';
                          const labelText = isCanceled ? 'Ausfall' : 'Verschoben';
                          const matchRem = !isCanceled 
                            ? briefingData.rescheduledReminders?.find((r: any) => r.studentName === slot.student?.name)
                            : null;
                          
                          return (
                            <div key={idx} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.82rem',
                              color: '#475569'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                                <span style={{ fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {slot.student?.name}
                                </span>
                                <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                                  ({slot.timeSlot || slot.start_time?.substring(0, 5)} Uhr)
                                </span>
                                {!isCanceled && matchRem && (
                                  <span style={{ 
                                    color: '#f59e0b', 
                                    fontSize: '0.74rem', 
                                    fontWeight: 700, 
                                    marginLeft: '4px'
                                  }}>
                                    ➔ {matchRem.weekdayShort}. {matchRem.dateStr}.
                                  </span>
                                )}
                              </div>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: labelColor,
                                background: isCanceled ? '#fef2f2' : '#fffbeb',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: `1px solid ${isCanceled ? '#fecaca' : '#fde68a'}`
                              }}>
                                {labelText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Other weekly rescheduled appointments (Nur dynamisch anzeigen, wenn vorhanden) */}
                  {otherReschedules.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Weitere Änderungen diese Woche
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {otherReschedules.map((rem: any) => (
                          <div key={rem.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.82rem',
                            color: '#475569'
                          }}>
                            <span style={{ fontWeight: 700, color: '#334155' }}>
                              {rem.studentName}
                            </span>
                            <span style={{ 
                              fontSize: '0.74rem', 
                              fontWeight: 700, 
                              color: '#64748b'
                            }}>
                              {rem.weekdayShort}. {rem.dateStr}., {rem.time.replace(':', '.')} Uhr
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (widgetState === 'ACTIVE') {
            if (!dynamicPrepMirror && !briefingData?.prepMirror) {
              if (loadingPrepMirror) {
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', gap: '10px', color: '#64748b' }}>
                    <Sparkles size={18} className="animate-spin" color="#34a853" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>Unterrichtsdaten werden geladen...</span>
                  </div>
                );
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '24px 16px', textAlign: 'center' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto'
                  }}>
                    <Clock size={18} color="#64748b" />
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#1e293b' }}>Unterrichtspause</h5>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                      Gegenwärtig findet kein aktiver Unterricht statt. Wähle im Tagesplan einen Schüler aus oder nutze die Toolbox.
                    </p>
                  </div>
                </div>
              );
            }
            const prep = dynamicPrepMirror || briefingData.prepMirror;

            const cleanTitle = (t: string) => t.replace(/\s*\((gitarre|guitar|e-gitarre|bass|e-bass|drums|schlagzeug|klavier|piano|keys|keyboard|vocals|gesang|stimme|allgemein)\)/i, '');

            const groupAndFormatItems = (rawItems: any[]) => {
              const groupedLehrwerke: Record<string, { pages: number[]; statuses: string[]; bookColor?: any; notes?: string[] }> = {};
              const otherItems: any[] = [];

              (rawItems || []).forEach(item => {
                if (!item) return;

                // A. Already hydrated Lehrwerk from Snapshot
                if (item.isBook) {
                  const bTitle = item.bookTitle || cleanTitle(item.title || '');
                  if (!groupedLehrwerke[bTitle]) {
                    groupedLehrwerke[bTitle] = {
                      pages: Array.isArray(item.pages) ? [...item.pages] : [],
                      statuses: [item.status || 'IN_PROGRESS'],
                      bookColor: item.bookColor,
                      notes: item.notes
                    };
                  } else {
                    if (Array.isArray(item.pages)) {
                      item.pages.forEach((p: number) => {
                        if (!groupedLehrwerke[bTitle].pages.includes(p)) groupedLehrwerke[bTitle].pages.push(p);
                      });
                    }
                    if (item.status) groupedLehrwerke[bTitle].statuses.push(item.status);
                    if (item.bookColor && !groupedLehrwerke[bTitle].bookColor) groupedLehrwerke[bTitle].bookColor = item.bookColor;
                  }
                  return;
                }

                // B. Legacy progress_matrix row: "BookName - Seite 4"
                const title = item.title || item.topic_name || '';
                if (title.includes(' - Seite ')) {
                  const parts = title.split(' - Seite ');
                  const bookTitle = cleanTitle(parts[0].trim());
                  const pageNum = parseInt(parts[1], 10);
                  
                  if (!groupedLehrwerke[bookTitle]) {
                    groupedLehrwerke[bookTitle] = { pages: [], statuses: [] };
                  }
                  if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].pages.includes(pageNum)) {
                    groupedLehrwerke[bookTitle].pages.push(pageNum);
                    groupedLehrwerke[bookTitle].statuses.push(item.status);
                  }
                } else {
                  otherItems.push(item);
                }
              });

              const groupedItems = Object.entries(groupedLehrwerke).map(([bookTitle, info]) => {
                const formattedPages = formatPageRangeString(info.pages);
                const allDone = info.statuses.every(status => status === 'MASTERED' || status === 'THEORY_DONE');
                return {
                  bookTitle,
                  formattedPages,
                  title: formattedPages ? `${bookTitle}: ${formattedPages}` : bookTitle,
                  status: allDone ? 'MASTERED' : 'IN_PROGRESS',
                  bookColor: info.bookColor,
                  notes: info.notes,
                  isBook: true
                };
              });

              return [
                ...groupedItems,
                ...otherItems.map(item => ({
                  title: cleanTitle(item.title || item.topic_name || ''),
                  topic_name: item.topic_name || item.title || '',
                  status: item.status,
                  recording_url: item.recording_url,
                  isSong: item.isSong || (!item.isBook && !item.title?.includes(' - Seite ')),
                  isBook: false
                }))
              ];
            };

            const formattedPrevWeekItems = groupAndFormatItems(prep.prevWeekItems);
            const formattedCurrentWeekItems = groupAndFormatItems(prep.currentWeekItems);

            const renderItemCard = (item: any, idx: number, isPrev: boolean) => {
              const isBook = item.isBook;
              const coverGradient = item.bookColor
                ? `linear-gradient(135deg, ${item.bookColor.from} 0%, ${item.bookColor.to} 100%)`
                : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';
              const borderColor = item.bookColor ? item.bookColor.border : '#e2e8f0';
              const accentColor = item.bookColor ? item.bookColor.accent : '#15803d';

              return (
                <div
                  key={`${isPrev ? 'prev' : 'curr'}-item-${idx}`}
                  style={{
                    background: isBook ? coverGradient : '#ffffff',
                    border: `1px solid ${borderColor}`,
                    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.03)',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  className="hover-scale-mini"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      {isBook ? (
                        <div style={{
                          width: '28px',
                          height: '34px',
                          borderRadius: '8px',
                          background: item.bookColor ? item.bookColor.badgeBg : '#ffffff',
                          border: `1px solid ${item.bookColor ? item.bookColor.border : '#cbd5e1'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                          <BookOpen size={14} color={item.bookColor ? item.bookColor.badgeText : '#475569'} />
                        </div>
                      ) : (
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#e0e7ff',
                          border: '1px solid #c7d2fe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Music size={14} color="#4338ca" />
                        </div>
                      )}
                      <span style={{
                        fontWeight: 850,
                        color: '#0f172a',
                        fontSize: '0.88rem',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        fontFamily: "'Plus Jakarta Sans', sans-serif"
                      }}>
                        {item.bookTitle || item.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {item.formattedPages && (
                        <span style={{
                          fontSize: '0.76rem',
                          fontWeight: 850,
                          color: item.bookColor ? '#ffffff' : '#15803d',
                          background: item.bookColor ? accentColor : '#dcfce7',
                          border: `1px solid ${item.bookColor ? accentColor : '#bbf7d0'}`,
                          padding: '2px 8px',
                          borderRadius: '8px',
                          boxShadow: item.bookColor ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}>
                          {item.formattedPages}
                        </span>
                      )}
                      {(item.status === 'MASTERED' || item.status === 'THEORY_DONE') ? (
                        <span style={{
                          background: 'rgba(52, 168, 83, 0.12)',
                          color: '#15803d',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          borderRadius: '100px',
                          padding: '2px 8px',
                          textTransform: 'uppercase',
                          border: '1px solid rgba(52, 168, 83, 0.25)'
                        }}>
                          Erledigt
                        </span>
                      ) : (
                        !isBook && (
                          <span style={{
                            background: '#f1f5f9',
                            color: '#64748b',
                            fontSize: '0.66rem',
                            fontWeight: 750,
                            borderRadius: '100px',
                            padding: '2px 8px'
                          }}>
                            In Arbeit
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  {Array.isArray(item.notes) && item.notes.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px', paddingLeft: '38px' }}>
                      {item.notes.map((bn: string, bIdx: number) => (
                        <span key={`bn-${bIdx}`} style={{
                          fontSize: '0.70rem',
                          color: '#475569',
                          background: 'rgba(255,255,255,0.7)',
                          border: '1px solid rgba(0,0,0,0.06)',
                          borderRadius: '6px',
                          padding: '1px 6px',
                          fontWeight: 600
                        }}>
                          • {bn}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            };

            const renderNoteOrAudio = (note: string, idx: number, isPrev: boolean) => {
              const isLoop = typeof note === 'string' && note.startsWith("LOOP:");
              const isAudio = typeof note === 'string' && note.startsWith("AUDIO:");

              if (isLoop) {
                const parts = note.substring(5).split('|');
                const label = parts[3] || 'Loop-Mix';
                const duration = parts[1] || '8';
                const creatorRole = parts[4] || 'student';
                const visibility = parts[5] || (creatorRole === 'teacher' ? 'shared_with_teacher' : 'private');
                if (creatorRole === 'student' && visibility === 'private') return null;
                return (
                  <div key={`${isPrev ? 'prev' : 'curr'}-loop-${idx}`}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#fefce8',
                      border: '1px solid rgba(234, 179, 8, 0.25)',
                      padding: '5px 10px',
                      borderRadius: '10px',
                      fontSize: '0.74rem',
                      color: '#854d0e',
                      fontWeight: 700
                    }}>
                      <Music size={12} color="#854d0e" />
                      <span>{creatorRole === 'teacher' ? 'Lehrer-Loop' : 'Schüler-Loop'}: "{label}" ({duration}s)</span>
                    </span>
                  </div>
                );
              }

              if (isAudio) {
                const parts = note.substring(6).split('|');
                const audioUrl = parts[0];
                const duration = parts[1] || '60';
                const role = parts[4] || 'teacher';
                const isPlaying = playingAudioUrl === audioUrl;
                const label = formatHarmonizedAudioTitle({
                  label: parts[3],
                  date: parts[2],
                  author: role,
                  songTag: parts[7]
                }, undefined, role === 'teacher');

                return (
                  <div key={`${isPrev ? 'prev' : 'curr'}-audio-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleTogglePlayAudio(audioUrl)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        background: isPlaying ? '#dcfce7' : (role === 'teacher' ? '#f0fdf4' : '#eff6ff'),
                        border: `1.5px solid ${isPlaying ? '#22c55e' : (role === 'teacher' ? 'rgba(52, 168, 83, 0.3)' : 'rgba(59, 130, 246, 0.3)')}`,
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '0.76rem',
                        color: role === 'teacher' ? '#166534' : '#1e40af',
                        fontWeight: 750,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isPlaying ? '0 2px 8px rgba(34, 197, 94, 0.25)' : '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                      className="hover-scale-mini"
                      title={isPlaying ? 'Wiedergabe pausieren' : 'Aufnahme direkt vorhören'}
                      aria-label={isPlaying ? 'Audio pausieren' : 'Audio abspielen'}
                    >
                      {isPlaying ? (
                        <Pause size={13} color={role === 'teacher' ? '#166534' : '#1e40af'} />
                      ) : (
                        <Play size={13} color={role === 'teacher' ? '#166534' : '#1e40af'} fill={role === 'teacher' ? '#166534' : '#1e40af'} />
                      )}
                      <Mic size={12} color={role === 'teacher' ? '#166534' : '#1e40af'} />
                      <span>{role === 'teacher' ? 'Lehrer-Aufnahme' : 'Schüler-Aufnahme'}: "{label}" ({duration}s)</span>
                    </button>
                  </div>
                );
              }

              // Clean didactic note
              const cleanNote = sanitizeDidacticText(note);
              if (!cleanNote) return null;

              return (
                <div key={`${isPrev ? 'prev' : 'curr'}-note-${idx}`} style={{ 
                  background: isPrev ? '#f8fafc' : '#ffffff',
                  border: `1px solid ${isPrev ? '#f1f5f9' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  padding: '11px 14px',
                  boxShadow: isPrev ? 'none' : '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Edit3 size={11} color="#15803d" />
                  </div>
                  <span style={{
                    fontSize: '0.86rem',
                    color: isPrev ? '#475569' : '#1e293b',
                    fontWeight: 650,
                    lineHeight: 1.45,
                    flex: 1
                  }}>
                    {cleanNote}
                  </span>
                </div>
              );
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Multi-Student Group Switcher */}
                {activeGroupStudents.length > 1 && (
                  <div style={{
                    display: 'flex',
                    background: '#f1f5f9',
                    padding: '4px',
                    borderRadius: '14px',
                    gap: '4px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    {activeGroupStudents.map((stud: any) => {
                      const isSelected = (!selectedGroupStudentId && activeGroupStudents[0]?.id === stud.id) || selectedGroupStudentId === stud.id;
                      const fName = stud.first_name || (stud.name ? stud.name.split(' ')[0] : 'Schüler');
                      const lName = stud.last_name || (stud.name ? stud.name.split(' ').slice(1).join(' ') : '');
                      return (
                        <button
                          key={stud.id}
                          type="button"
                          onClick={() => setSelectedGroupStudentId(stud.id)}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: isSelected ? '1px solid #cbd5e1' : 'none',
                            background: isSelected ? '#ffffff' : 'transparent',
                            color: isSelected ? '#0f172a' : '#475569',
                            fontWeight: isSelected ? 850 : 600,
                            fontSize: '0.80rem',
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <User size={13} color={isSelected ? '#34a853' : '#64748b'} />
                          <span>{fName} {maskLastName(lName, showRealNames)}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSelectedGroupStudentId('both')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: selectedGroupStudentId === 'both' ? '1px solid #cbd5e1' : 'none',
                        background: selectedGroupStudentId === 'both' ? '#ffffff' : 'transparent',
                        color: selectedGroupStudentId === 'both' ? '#0f172a' : '#475569',
                        fontWeight: selectedGroupStudentId === 'both' ? 850 : 600,
                        fontSize: '0.80rem',
                        cursor: 'pointer',
                        boxShadow: selectedGroupStudentId === 'both' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <Users size={13} color={selectedGroupStudentId === 'both' ? '#34a853' : '#64748b'} />
                      <span>Beide (Gruppe)</span>
                    </button>
                  </div>
                )}

                {/* Header: Student Info & Profil Button (Anti-Overlap) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'nowrap', width: '100%' }}>
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', minWidth: 0, flex: 1 }}
                    onClick={() => {
                      const foundStud = allStudents.find(s => s.id === prep.studentId);
                      const sName = prep.studentName || 'Schüler';
                      setDocStudent({
                        ...(foundStud || {}),
                        id: prep.studentId,
                        first_name: sName.split(' ')[0],
                        last_name: sName.split(' ').slice(1).join(' '),
                        photo_url: '/avatar_ghost.jpg',
                        is_campus_active: foundStud ? foundStud.is_campus_active : false,
                        school_id: foundStud?.school_id || teacher?.school_id,
                        schoolId: foundStud?.school_id || teacher?.school_id,
                        schools: foundStud?.schools || (teacher as any)?.schools,
                        school_name: foundStud?.schools?.name || foundStud?.school_name
                      });
                    }}
                  >
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.05rem',
                      fontWeight: 850,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)',
                      flexShrink: 0
                    }}>
                      {(prep.studentName || 'S').charAt(0)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.02rem', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', letterSpacing: '-0.01em' }}>
                        {prep.studentName || 'Schüler'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        {activeStudent?.id === prep.studentId ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#f0fdf4',
                            border: '1px solid #dcfce7',
                            color: '#15803d',
                            borderRadius: '100px',
                            padding: '1px 7px',
                            fontSize: '0.68rem',
                            fontWeight: 750,
                            letterSpacing: '0.01em'
                          }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                            Aktueller Schüler
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#64748b',
                            borderRadius: '100px',
                            padding: '1px 7px',
                            fontSize: '0.68rem',
                            fontWeight: 700
                          }}>
                            Nächster Schüler
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profil Action Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const sName = prep.studentName || 'Schüler';
                        setSelectedStudentProfile({
                          id: prep.studentId,
                          first_name: sName.split(' ')[0],
                          last_name: sName.split(' ').slice(1).join(' '),
                          photo_url: '/avatar_ghost.jpg'
                        });
                      }}
                      style={{
                        background: '#f8fafc',
                        color: '#334155',
                        border: '1px solid #e2e8f0',
                        padding: '0 11px',
                        borderRadius: '10px',
                        fontSize: '0.74rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        minHeight: '32px',
                        height: '32px',
                        flexShrink: 0,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                      title="Schüler-Profil öffnen"
                    >
                      <User size={13} color="#475569" />
                      <span>Profil</span>
                    </button>
                  </div>
                </div>

                {prep.streakCount > 0 && (
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: 'rgba(245, 158, 11, 0.08)', 
                    border: '1px solid rgba(245, 158, 11, 0.15)', 
                    padding: '4px 12px', 
                    borderRadius: '100px', 
                    color: '#b45309', 
                    fontSize: '0.76rem', 
                    fontWeight: 750,
                    alignSelf: 'flex-start'
                  }}>
                    <Flame size={14} fill="#f59e0b" color="#f59e0b" />
                    <span>Flammen-Streak: {prep.streakCount} Tage!</span>
                  </div>
                )}

                {/* Vorwoche */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Letzte Woche (Vorwoche)</span>
                    {prep.prevWeekNum && (
                      <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#94a3b8', textTransform: 'none' }}>
                        · KW {prep.prevWeekNum}
                      </span>
                    )}
                  </div>
                  {((formattedPrevWeekItems && formattedPrevWeekItems.length > 0) || (prep.prevWeekNotes && prep.prevWeekNotes.length > 0)) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {formattedPrevWeekItems && formattedPrevWeekItems.map((item: any, idx: number) => renderItemCard(item, idx, true))}
                      {prep.prevWeekNotes && prep.prevWeekNotes
                        .filter((note: string) => typeof note === 'string' && (note.startsWith("LOOP:") || note.startsWith("AUDIO:") || isPureDidacticNote(note)))
                        .map((note: string, idx: number) => renderNoteOrAudio(note, idx, true))}
                    </div>
                  ) : (
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #f1f5f9',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      fontSize: '0.78rem',
                      color: '#94a3b8',
                      fontStyle: 'normal',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>Keine Hausaufgaben erfasst.</span>
                    </div>
                  )}
                </div>

                {/* Diese Woche */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Diese Woche (Heute)</span>
                    {prep.currentWeekNum && (
                      <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#94a3b8', textTransform: 'none' }}>
                        · KW {prep.currentWeekNum}
                      </span>
                    )}
                  </div>
                  {((formattedCurrentWeekItems && formattedCurrentWeekItems.length > 0) || (prep.currentWeekNotes && prep.currentWeekNotes.length > 0)) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {formattedCurrentWeekItems && formattedCurrentWeekItems.map((item: any, idx: number) => renderItemCard(item, idx, false))}
                      {prep.currentWeekNotes && prep.currentWeekNotes
                        .filter((note: string) => typeof note === 'string' && (note.startsWith("LOOP:") || note.startsWith("AUDIO:") || isPureDidacticNote(note)))
                        .map((note: string, idx: number) => renderNoteOrAudio(note, idx, false))}
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      background: '#f8fafc',
                      border: '1px solid #f1f5f9',
                      borderRadius: '12px',
                      padding: '10px 14px'
                    }}>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
                        Noch keine Hausaufgaben erfasst.
                      </div>
                      {((prep.prevWeekNotes && prep.prevWeekNotes.length > 0) || (formattedPrevWeekItems && formattedPrevWeekItems.length > 0)) && (
                        <button
                          type="button"
                          onClick={() => handleCopyPrevWeekToCurrent(prep)}
                          disabled={isCopyingPrevWeek}
                          style={{
                            background: '#f0fdf4',
                            border: '1.5px solid #86efac',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            color: '#15803d',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '7px',
                            cursor: isCopyingPrevWeek ? 'not-allowed' : 'pointer',
                            opacity: isCopyingPrevWeek ? 0.7 : 1,
                            transition: 'all 0.15s ease',
                            minHeight: '38px',
                            touchAction: 'manipulation',
                            userSelect: 'none',
                            boxShadow: '0 1px 3px rgba(34, 197, 94, 0.08)'
                          }}
                          className="hover-scale"
                          title={`Aufgaben und Notizen aus KW ${prep.prevWeekNum} direkt für heute übernehmen`}
                          aria-label={`Aufgaben und Notizen aus KW ${prep.prevWeekNum} direkt für diese Woche übernehmen`}
                        >
                          <Zap size={13} color="#16a34a" />
                          <span>
                            {isCopyingPrevWeek ? 'Wird übernommen...' : `Aufgaben & Notizen aus KW ${prep.prevWeekNum} übernehmen`}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ⚡ 60-Sekunden-Blitz-Workflow für Lehrkräfte */}
                <div style={{
                  marginTop: '6px',
                  padding: '14px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 850, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <Zap size={14} color="#f59e0b" fill="#f59e0b" />
                      <span>Schnell-Hausaufgabe (60s-Blitz)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuickAudioRecorder(prev => !prev)}
                      style={{
                        border: '1px solid #e2e8f0',
                        background: showQuickAudioRecorder ? '#fee2e2' : '#ffffff',
                        color: showQuickAudioRecorder ? '#dc2626' : '#15803d',
                        padding: '0 10px',
                        height: '28px',
                        borderRadius: '100px',
                        fontSize: '0.72rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                      title="Audio-Vorspielbeispiel direkt aufnehmen"
                      aria-label="Audio-Vorspielbeispiel direkt aufnehmen"
                    >
                      <Mic size={12} color={showQuickAudioRecorder ? '#dc2626' : '#16a34a'} />
                      <span>{showQuickAudioRecorder ? 'Audio schließen' : 'Audio-Memo 🎙️'}</span>
                    </button>
                  </div>

                  {showQuickAudioRecorder && (
                    <div style={{ padding: '8px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <SimpleVoiceRecorder
                        studentId={prep.studentId}
                        colorTheme="#16a34a"
                        buttonLabel="Takt kurz vorspielen"
                        topicName={`KW ${prep.currentWeekNum} Vorspiel-Memo`}
                        onAudioSaved={(url) => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          const audioTag = `AUDIO:${url}|30|${todayStr}|Vorspiel-Beispiel|teacher`;
                          handleSaveQuickHomework(prep, audioTag);
                        }}
                      />
                    </div>
                  )}

                  {/* Input & Zuweisen */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={quickHomeworkText}
                      onChange={(e) => setQuickHomeworkText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveQuickHomework(prep);
                        }
                      }}
                      placeholder="Aufgabe eingeben (z. B. Takt 1–8 Tempo 80)..."
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        color: '#0f172a',
                        fontWeight: 600,
                        outline: 'none',
                        background: '#ffffff',
                        transition: 'border-color 0.15s ease'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveQuickHomework(prep)}
                      disabled={isSavingQuickHw || !quickHomeworkText.trim()}
                      style={{
                        height: '38px',
                        padding: '0 14px',
                        background: !quickHomeworkText.trim() ? '#e2e8f0' : '#15803d',
                        color: !quickHomeworkText.trim() ? '#94a3b8' : '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: (!quickHomeworkText.trim() || isSavingQuickHw) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0,
                        boxShadow: quickHomeworkText.trim() ? '0 2px 8px rgba(21, 128, 61, 0.25)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      className={quickHomeworkText.trim() ? 'hover-scale' : ''}
                    >
                      {isSavingQuickHw ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                      <span>Zuweisen</span>
                    </button>
                  </div>

                  {/* Quick-Tags Chip-Track */}
                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                    paddingBottom: '2px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    {[
                      'Takt 1–8 mit Metronom bpm 80',
                      'Akkordwechsel G-C-D flüssig',
                      'Blattlese-Übung S. 14',
                      'Dynamik & Phrasierung beachten'
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setQuickHomeworkText(prev => prev ? `${prev}, ${tag}` : tag)}
                        style={{
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          color: '#475569',
                          padding: '5px 11px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 650,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale-mini"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Action */}
                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => {
                      const foundStud = allStudents.find(s => s.id === prep.studentId);
                      setDocStudent({
                        ...(foundStud || {}),
                        id: prep.studentId,
                        first_name: prep.studentName.split(' ')[0],
                        last_name: prep.studentName.split(' ').slice(1).join(' '),
                        photo_url: '/avatar_ghost.jpg',
                        is_campus_active: foundStud ? foundStud.is_campus_active : false,
                        school_id: foundStud?.school_id || teacher?.school_id,
                        schoolId: foundStud?.school_id || teacher?.school_id,
                        schools: foundStud?.schools || (teacher as any)?.schools,
                        school_name: foundStud?.schools?.name || foundStud?.school_name
                      });
                    }}
                    style={{
                      width: '100%',
                      height: '44px',
                      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                      color: '#ffffff',
                      border: '1px solid rgba(22, 163, 74, 0.2)',
                      padding: '0 16px',
                      borderRadius: '14px',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.22)',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    className="hover-scale"
                  >
                    <Edit3 size={15} color="#ffffff" />
                    <span>Hausaufgabe / Notiz erfassen</span>
                  </button>
                </div>
              </div>
            );
          }

          // WEEKEND or FEIERABEND / FREIER TAG (fallback)
          const wishes = [
            "Du hast heute Großartiges geleistet. Entspanne dich, tanke neue Energie und lass den Tag gemütlich ausklingen!",
            "Der produktive Teil des Tages ist geschafft! Mach es dir bequem, leg die Füße hoch und genieße deinen wohlverdienten Abend.",
            "Zeit, die Instrumente ruhen zu lassen. Wir wünschen dir einen entspannten Feierabend voller Ruhe und Gelassenheit!",
            "Ein erfolgreicher Unterrichtstag geht zu Ende. Geh raus, atme durch und genieße deine freie Zeit in vollen Zügen!",
            "Musik im Kopf und Entspannung im Herzen. Hab einen wundervollen, erholsamen Feierabend!",
            "Die Notenblätter sind sortiert, die Tasten ruhen. Jetzt ist Zeit für dich! Schönen Feierabend!",
            "Kopf aus, Entspannung an! Genieße die wohlverdiente Ruhe nach einem fantastischen Unterrichtstag.",
            "Ein toller Tag voller Rhythmus und Melodie liegt hinter dir. Lass den Abend nun ganz in deinem eigenen Tempo ausklingen.",
            "Feierabend! Lass den Alltagsstress hinter dir und mach heute Abend genau das, was dir am meisten Freude bringt.",
            "Schönen Feierabend! Zeit für frische Luft, gutes Essen und eine wohlverdiente Auszeit vom Schulalltag."
          ];

          const freeDayWishes = [
            "Heute hast du unterrichtsfrei! Nutze den Tag für dich, neue kreative Ideen oder pure Entspannung.",
            "Kein Unterricht heute! Zeit, die Seele baumeln zu lassen und frische Energie zu tanken.",
            "Dein freier Tag! Genieße die Pause vom Lehralltag und mach genau das, was dir am meisten Freude bringt.",
            "Ein Tag für Inspiration, eigene Musikprojekte oder einfach eine wohlverdiente Auszeit.",
            "Heute ruht der Stundenplan! Wir wünschen dir einen erholsamen und inspirierenden freien Tag."
          ];

          const today = getSimulatedNow();
          const dateSeed = today.getDate() + today.getMonth() * 31 + today.getFullYear();
          const dailyWishIndex = isFreeDay ? (dateSeed % freeDayWishes.length) : (dateSeed % wishes.length);
          const dailyWish = isFreeDay ? freeDayWishes[dailyWishIndex] : wishes[dailyWishIndex];
          const dailyItem = getDailyQuote(dateSeed, 'teacher');

          if (widgetState === 'WEEKEND') {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.1) 100%)', 
                    color: '#16a34a', 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)'
                  }}>
                    <Check size={18} color="#16a34a" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1d1d1f', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                      Wochenend-Kompass
                    </h4>
                    <div style={{ fontSize: '0.72rem', color: '#86868b', fontWeight: 500, marginTop: '1px' }}>Alles erledigt • Schreibtisch frei</div>
                  </div>
                </div>

                {/* Harmonized Weekend Status Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.4) 0%, rgba(255, 255, 255, 0.7) 100%)',
                  border: '1px solid rgba(34, 197, 94, 0.22)',
                  borderRadius: '20px',
                  padding: '22px 20px',
                  color: '#1e293b',
                  boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Decorative ambient background glow */}
                  <div style={{
                    position: 'absolute',
                    top: '-50%',
                    left: '-50%',
                    width: '200%',
                    height: '200%',
                    background: 'radial-gradient(circle, rgba(34, 197, 94, 0.08) 0%, transparent 60%)',
                    pointerEvents: 'none',
                    zIndex: 0
                  }} />

                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ 
                      fontSize: '0.98rem', 
                      fontWeight: 900, 
                      letterSpacing: '-0.01em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#0f172a',
                      fontFamily: "'Plus Jakarta Sans', sans-serif"
                    }}>
                      <Sparkles size={16} color="#16a34a" />
                      <span>Dein Unterrichtsbereich ist vorbereitet</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                        <span>Keine offenen Schüleranfragen oder Aufgaben</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                          <span>Nächste Unterrichtsstunden starten ab Montag</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowMondayPreview(prev => !prev)}
                          style={{
                            background: showMondayPreview ? '#dcfce7' : '#ffffff',
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#15803d',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                            flexShrink: 0,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                          }}
                          title={showMondayPreview ? 'Montags-Vorschau einklappen' : 'Montags-Vorschau aufklappen'}
                          aria-expanded={showMondayPreview}
                        >
                          <Calendar size={11} color="#16a34a" />
                          <span>{showMondayPreview ? 'Schließen' : 'Vorschau'}</span>
                          {showMondayPreview ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                      </div>

                      {/* Expandable Monday Quick-Peek */}
                      {showMondayPreview && (
                        <div style={{
                          background: '#ffffff',
                          border: '1px solid #bbf7d0',
                          borderRadius: '14px',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          marginTop: '2px',
                          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.06)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Montag, 21. September
                            </span>
                            <span style={{ fontSize: '0.70rem', color: '#166534', fontWeight: 800, background: '#f0fdf4', padding: '1px 6px', borderRadius: '6px' }}>
                              4 Termine geplant
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.76rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#334155' }}>
                              <span><strong style={{ fontFamily: 'monospace', color: '#166534' }}>14:00 Uhr</strong> • Justus G.</span>
                              <span style={{ color: '#64748b', fontSize: '0.70rem', fontWeight: 600 }}>Raum 4 • Gitarre</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#334155' }}>
                              <span><strong style={{ fontFamily: 'monospace', color: '#166534' }}>14:30 Uhr</strong> • Celina S.</span>
                              <span style={{ color: '#64748b', fontSize: '0.70rem', fontWeight: 600 }}>Raum 4 • Gitarre</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#334155' }}>
                              <span><strong style={{ fontFamily: 'monospace', color: '#166534' }}>15:00 Uhr</strong> • Marlene F.</span>
                              <span style={{ color: '#64748b', fontSize: '0.70rem', fontWeight: 600 }}>Raum 4 • Gitarre</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#334155' }}>
                              <span><strong style={{ fontFamily: 'monospace', color: '#166534' }}>15:30 Uhr</strong> • Felix M.</span>
                              <span style={{ color: '#64748b', fontSize: '0.70rem', fontWeight: 600 }}>Raum 4 • Gitarre</span>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontStyle: 'italic', textAlign: 'right', borderTop: '1px solid #f8fafc', paddingTop: '4px' }}>
                            Erster Start um 14:00 Uhr • Raum 4
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                        <span>Dienst-Ruhe aktiv bis zum Wochenstart</span>
                      </div>
                    </div>

                    <div style={{ 
                      marginTop: '4px',
                      padding: '8px 12px', 
                      background: 'rgba(240, 253, 244, 0.85)', 
                      border: '1px solid #bbf7d0', 
                      borderRadius: '12px', 
                      fontSize: '0.76rem', 
                      color: '#166534', 
                      fontWeight: 750, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px' 
                    }}>
                      <Check size={14} color="#16a34a" />
                      <span>Alle Systeme ruhig. Zeit zum Abschalten.</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (isFreeDay) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.1) 100%)', 
                    color: '#16a34a', 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)'
                  }}>
                    <Check size={18} color="#16a34a" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1d1d1f', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                      Tages-Kompass
                    </h4>
                    <div style={{ fontSize: '0.72rem', color: '#86868b', fontWeight: 500, marginTop: '1px' }}>
                      Schreibtisch frei • Vorbereitung &amp; Notizen
                    </div>
                  </div>
                </div>

                {/* Harmonized Zen Surface Card */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '20px',
                  color: '#1e293b',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                      Keine anstehenden Aufgaben oder offene Schüleranfragen
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                      Dienst-Ruhe aktiv bis zum nächsten planmäßigen Unterricht
                    </span>
                  </div>

                  {/* Quick Action Links & Sync Badge */}
                  <div style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    {onOpenStudio ? (
                      <button
                        type="button"
                        onClick={onOpenStudio}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '7px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 750,
                          color: '#334155',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale"
                      >
                        <Music size={13} color="#64748b" />
                        <span>GrooveLab Studio</span>
                      </button>
                    ) : <div />}

                    <div style={{
                      fontSize: '0.70rem',
                      color: '#166534',
                      fontWeight: 750,
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Check size={11} color="#16a34a" />
                      <span>Alle Systeme synchron</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)', 
                  color: '#f59e0b', 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
                }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1d1d1f', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                    Feierabend
                  </h4>
                  <div style={{ fontSize: '0.72rem', color: '#86868b', fontWeight: 500, marginTop: '1px' }}>
                    Entspannung &amp; Inspiration
                  </div>
                </div>
              </div>

              {/* Premium Feierabend Wishing Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.2) 0%, rgba(253, 230, 138, 0.05) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '20px',
                padding: '24px 20px',
                color: '#78350f',
                textAlign: 'center',
                boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative ambient background glow */}
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'radial-gradient(circle, rgba(253, 224, 71, 0.15) 0%, transparent 60%)',
                  pointerEvents: 'none',
                  zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ 
                    fontSize: '1.35rem', 
                    fontWeight: 950, 
                    marginBottom: '10px',
                    letterSpacing: '-0.02em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#d97706',
                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                  }}>
                    <Sparkles size={20} color="#d97706" />
                    <span>Schönen Feierabend!</span>
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#4b5563', lineHeight: '1.5' }}>
                    {dailyWish}
                  </div>
                </div>
              </div>

              {/* 1% Goldstandard: Zitat-Box nur bei Feierabend anzeigen, da Tagesplan an freien Tagen bereits das didaktische Zitat führt */}
              {!isFreeDay && (
                <div style={{ 
                  borderTop: '1px solid #f1f5f9', 
                  paddingTop: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    position: 'relative',
                    textAlign: 'center'
                  }}>
                    <span style={{ 
                      fontSize: '2rem', 
                      color: 'rgba(203, 213, 225, 0.5)', 
                      position: 'absolute', 
                      top: '6px', 
                      left: '12px',
                      fontFamily: 'Georgia, serif',
                      lineHeight: 1
                    }}>“</span>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.85rem', 
                      color: '#334155', 
                      fontStyle: 'italic', 
                      lineHeight: '1.5',
                      fontWeight: 500,
                      padding: '0 10px'
                    }}>
                      {dailyItem.text}
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '6px', 
                      marginTop: '12px',
                      fontSize: '0.74rem',
                      color: '#64748b',
                      fontWeight: 700
                    }}>
                      <span style={{ 
                        background: dailyItem.type === 'joke' 
                          ? 'rgba(239, 68, 68, 0.08)' 
                          : dailyItem.type === 'fact'
                            ? 'rgba(52, 168, 83, 0.08)'
                            : 'rgba(99, 102, 241, 0.08)',
                        color: dailyItem.type === 'joke' 
                          ? '#ef4444' 
                          : dailyItem.type === 'fact'
                            ? '#34a853'
                            : '#4f46e5',
                        padding: '2px 8px',
                        borderRadius: '100px',
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {dailyItem.type === 'joke' ? 'Witz' : dailyItem.type === 'fact' ? 'Fakt' : 'Zitat'}
                      </span>
                      <span>— {dailyItem.author}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
  );
};
