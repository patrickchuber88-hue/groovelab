import React from 'react';
import {
  X,
  HelpCircle,
  Mic,
  Calendar,
  CalendarX,
  AlertTriangle,
  MessageSquare,
  RotateCcw,
  Headphones,
  BookOpen,
  Sparkles,
  Check,
  RefreshCw
} from 'lucide-react';
import { StudioRecordingPlayer } from './StudioRecordingPlayer';
import { formatTeacherFullName } from '../../../../utils/nameHelper';

export interface StudentBriefingModalsHubProps {
  // 1. Question Modal
  showQuestionModal: boolean;
  setShowQuestionModal: (show: boolean) => void;
  questionInput: string;
  setQuestionInput: React.Dispatch<React.SetStateAction<string>>;
  handleQuestionInputChange?: (newVal: string) => void;
  isSavingQuestion: boolean;
  handleSaveQuestion: (text: string) => Promise<void>;
  questionToast: string | null;
  isListeningSpeech: boolean;
  toggleSpeechRecognition: () => void;

  // 2. Appointment Modal
  selectedAppointmentForDetail: any | null;
  setSelectedAppointmentForDetail: (appt: any | null) => void;
  showCancelConfirmStep: boolean;
  setShowCancelConfirmStep: (show: boolean) => void;
  handleTriggerCancelOccurrence: (appt: any) => void;
  handleTriggerUndoCancelOccurrence?: (appt: any) => void;
  studentUser: any;
  briefingData: any;
  studentInstrumentName: string;
  setAppointmentChatData: (data: any) => void;
  setShowAppointmentChat: React.Dispatch<React.SetStateAction<boolean>>;

  // 3. Recordings Modal
  showRecordingsModal: boolean;
  setShowRecordingsModal: (show: boolean) => void;
  recordingsModalTracks: any[];
  activeRecordingTrack: any | null;
  setActiveRecordingTrack: (track: any | null) => void;
  getJuniorWeeklyHomeworkSummary?: () => any;
  handleOpenHomeworkBookWithView?: (tab: string, subView: string) => void;
  handleTabChangeLocal: (tab: string) => void;
  studentUiLevel?: string;
}

export function StudentBriefingModalsHub({
  showQuestionModal,
  setShowQuestionModal,
  questionInput,
  setQuestionInput,
  handleQuestionInputChange,
  isSavingQuestion,
  handleSaveQuestion,
  questionToast,
  isListeningSpeech,
  toggleSpeechRecognition,

  selectedAppointmentForDetail,
  setSelectedAppointmentForDetail,
  showCancelConfirmStep,
  setShowCancelConfirmStep,
  handleTriggerCancelOccurrence,
  handleTriggerUndoCancelOccurrence,
  studentUser,
  briefingData,
  studentInstrumentName,
  setAppointmentChatData,
  setShowAppointmentChat,

  showRecordingsModal,
  setShowRecordingsModal,
  recordingsModalTracks,
  activeRecordingTrack,
  setActiveRecordingTrack,
  getJuniorWeeklyHomeworkSummary,
  handleOpenHomeworkBookWithView,
  handleTabChangeLocal,
  studentUiLevel
}: StudentBriefingModalsHubProps) {
  const formatQuickieDuration = (secs?: number | null) => {
    if (secs === null || secs === undefined || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* Question Toast */}
      {questionToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000,
          background: '#0f172a',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '100px',
          fontSize: '0.84rem',
          fontWeight: 800,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <Sparkles size={15} color="#facc15" />
          <span>{questionToast}</span>
        </div>
      )}

      {/* ❓ SCHÜLERFRAGE-MODAL (SIMPLE, SCHLICHT & KOMPAKT MIT DIKTIERFUNKTION) */}
      {showQuestionModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-question-title"
          onClick={() => setShowQuestionModal(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowQuestionModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '26px',
              width: '100%',
              maxWidth: (!studentUiLevel || studentUiLevel === 'junior') ? '470px' : '430px',
              padding: (!studentUiLevel || studentUiLevel === 'junior') ? '24px 22px' : '24px',
              border: '1.5px solid rgba(250, 204, 21, 0.40)',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(250, 204, 21, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: (!studentUiLevel || studentUiLevel === 'junior') ? '16px' : '16px',
              position: 'relative'
            }}
          >
            {/* Header */}
            {(() => {
              const isJunior = !studentUiLevel || studentUiLevel === 'junior';
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isJunior ? '12px' : '10px' }}>
                      <div style={{
                        width: isJunior ? '46px' : '38px',
                        height: isJunior ? '46px' : '38px',
                        borderRadius: isJunior ? '14px' : '12px',
                        background: 'rgba(250, 204, 21, 0.22)',
                        border: '1.5px solid rgba(234, 179, 8, 0.45)',
                        color: '#854d0e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(250, 204, 21, 0.20)',
                        flexShrink: 0
                      }}>
                        <HelpCircle size={isJunior ? 24 : 20} strokeWidth={2.4} />
                      </div>
                      <div>
                        <h3 id="student-question-title" style={{ margin: 0, fontSize: isJunior ? '1.20rem' : '1.02rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
                          {isJunior ? 'Frag deine Lehrkraft! 🎤' : 'Frage für den Unterricht'}
                        </h3>
                        <span style={{ fontSize: isJunior ? '0.84rem' : '0.74rem', color: '#64748b', fontWeight: 650, lineHeight: 1.3 }}>
                          {isJunior ? 'Sprich oder tippe deine Frage für die nächste Stunde' : 'Deine Lehrkraft sieht die Frage vor Beginn der Stunde'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="button"
                      tabIndex={0}
                      onClick={() => setShowQuestionModal(false)}
                      aria-label="Schließen"
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '50%',
                        width: isJunior ? '36px' : '32px',
                        height: isJunior ? '36px' : '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#64748b',
                        flexShrink: 0
                      }}
                      className="hover-scale-mini"
                    >
                      <X size={isJunior ? 18 : 16} />
                    </button>
                  </div>

                  {/* Textarea with integrated dictation mic */}
                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={questionInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (handleQuestionInputChange) {
                          handleQuestionInputChange(val);
                        } else {
                          setQuestionInput(val);
                        }
                      }}
                      placeholder={isJunior ? "Was möchtest du fragen? (z.B. Takt 5 klemmt...)" : "Was möchtest du deinen Lehrer fragen? z. B. Takt 12 Rhythmus unklar, Fingersatz klemmt..."}
                      rows={isJunior ? 3 : 3}
                      style={{
                        width: '100%',
                        padding: isJunior ? '14px 16px' : '12px 14px',
                        paddingRight: isJunior ? '56px' : '46px',
                        borderRadius: isJunior ? '16px' : '14px',
                        border: isListeningSpeech ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                        background: isListeningSpeech ? '#fff5f5' : '#f8fafc',
                        fontSize: isJunior ? '1.10rem' : '0.90rem',
                        color: '#0f172a',
                        fontFamily: 'inherit',
                        resize: 'none',
                        boxSizing: 'border-box',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        lineHeight: 1.5,
                        minHeight: isJunior ? '96px' : '80px'
                      }}
                    />

                    {/* Dictation Mic Button (Ergonomischer 0,1% Child-First Touch-Target) */}
                    <button
                      type="button"
                      role="button"
                      tabIndex={0}
                      onClick={toggleSpeechRecognition}
                      title={isListeningSpeech ? "Aufnahme stoppen" : "Frage per Sprache einsprechen"}
                      aria-label={isListeningSpeech ? "Aufnahme stoppen" : "Frage per Sprache einsprechen"}
                      style={{
                        position: 'absolute',
                        right: isJunior ? '10px' : '10px',
                        top: isJunior ? '10px' : '10px',
                        width: isJunior ? '44px' : '32px',
                        height: isJunior ? '44px' : '32px',
                        borderRadius: '50%',
                        background: isListeningSpeech ? '#ef4444' : '#ffffff',
                        color: isListeningSpeech ? '#ffffff' : '#854d0e',
                        border: isListeningSpeech ? 'none' : '2px solid #fde047',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: isListeningSpeech ? '0 0 16px rgba(239, 68, 68, 0.6)' : '0 2px 8px rgba(250, 204, 21, 0.25)',
                        transition: 'all 0.2s ease',
                        touchAction: 'manipulation'
                      }}
                      className="hover-scale"
                    >
                      <Mic size={isJunior ? 22 : 16} />
                    </button>
                  </div>

                  {/* Live speech feedback if active */}
                  {isListeningSpeech && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: '#fee2e2',
                      borderRadius: '12px',
                      padding: isJunior ? '10px 14px' : '6px 12px',
                      fontSize: isJunior ? '0.88rem' : '0.76rem',
                      fontWeight: 800,
                      color: '#b91c1c'
                    }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626' }} className="animate-pulse" />
                      <span>Hört zu... Sprich jetzt deine Frage ein 🎙️</span>
                    </div>
                  )}

                  {/* Schnell-Chips (Visuell & Groß für Junior 6-10 Jahre) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: isJunior ? '0.78rem' : '0.70rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {isJunior ? 'Schnell-Auswahl:' : 'Schnell-Bausteine:'}
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: isJunior ? '8px' : '6px' }}>
                      {(isJunior ? [
                        { label: 'Zu schnell', emoji: '⚡' },
                        { label: 'Fingersatz', emoji: '🖐️' },
                        { label: 'Takt unklar', emoji: '🎵' },
                        { label: 'Nochmal hören', emoji: '👂' }
                      ] : [
                        { label: 'Takt unklar', emoji: '' },
                        { label: 'Tempo zu schnell', emoji: '' },
                        { label: 'Fingersatz klemmt', emoji: '' },
                        { label: 'Aufnahme vorspielen', emoji: '' }
                      ]).map((chipObj, idx) => {
                        const chipText = chipObj.emoji ? `${chipObj.emoji} ${chipObj.label}` : chipObj.label;
                        return (
                          <button
                            key={idx}
                            type="button"
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              const trimmed = (questionInput || '').trim();
                              const insertText = chipObj.label;
                              const nextVal = trimmed ? `${trimmed}, ${insertText}` : insertText;
                              if (handleQuestionInputChange) {
                                handleQuestionInputChange(nextVal);
                              } else {
                                setQuestionInput(nextVal);
                              }
                            }}
                            style={{
                              background: '#f8fafc',
                              border: '1.5px solid #e2e8f0',
                              borderRadius: isJunior ? '12px' : '8px',
                              padding: isJunior ? '7px 13px' : '4px 10px',
                              fontSize: isJunior ? '0.88rem' : '0.74rem',
                              fontWeight: 800,
                              color: '#1e293b',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                              touchAction: 'manipulation'
                            }}
                            className="hover-scale-mini"
                          >
                            <span>+ {chipText}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                    {questionInput.trim() ? (
                      <button
                        type="button"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSaveQuestion('')}
                        disabled={isSavingQuestion}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          fontSize: isJunior ? '0.86rem' : '0.80rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          padding: '8px 10px',
                          minHeight: isJunior ? '44px' : 'auto'
                        }}
                      >
                        Frage löschen
                      </button>
                    ) : <div />}
                    <div style={{ display: 'flex', alignItems: 'center', gap: isJunior ? '10px' : '8px' }}>
                      <button
                        type="button"
                        role="button"
                        tabIndex={0}
                        onClick={() => setShowQuestionModal(false)}
                        style={{
                          background: '#f1f5f9',
                          border: 'none',
                          borderRadius: isJunior ? '14px' : '12px',
                          padding: isJunior ? '10px 18px' : '8px 16px',
                          fontSize: isJunior ? '0.90rem' : '0.84rem',
                          fontWeight: 800,
                          color: '#475569',
                          cursor: 'pointer',
                          minHeight: isJunior ? '44px' : 'auto'
                        }}
                        className="hover-scale-mini"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSaveQuestion(questionInput)}
                        disabled={isSavingQuestion || !questionInput.trim()}
                        style={{
                          background: !questionInput.trim() ? '#e2e8f0' : '#facc15',
                          border: 'none',
                          borderRadius: isJunior ? '14px' : '12px',
                          padding: isJunior ? '10px 22px' : '8px 18px',
                          fontSize: isJunior ? '0.94rem' : '0.84rem',
                          fontWeight: 950,
                          color: !questionInput.trim() ? '#94a3b8' : '#0f172a',
                          cursor: (!questionInput.trim() || isSavingQuestion) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          minHeight: isJunior ? '44px' : 'auto',
                          boxShadow: !questionInput.trim() ? 'none' : '0 3px 10px rgba(250, 204, 21, 0.40)'
                        }}
                        className="hover-scale"
                      >
                        {isSavingQuestion ? <RefreshCw size={15} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                        <span>Frage abschicken</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 📅 1% GOLDSTANDARD: TERMIN-AKTIONS & DETAIL-MODAL (SICHERE ABSAGE & SHOUTBOX) */}
      {selectedAppointmentForDetail && (() => {
        const appt = selectedAppointmentForDetail;
        const isCanceled = appt.status === 'canceled_by_student' || appt.status === 'cancelled' || appt.status === 'teacher_ausfall' || appt.status === 'canceled_by_teacher_ausfall';
        const rawTeacher = appt.teacher || appt.teacher_name || studentUser?.teacher_name || studentUser?.teacher || briefingData?.todayLesson?.teacher_name || briefingData?.todayLesson?.teacher || briefingData?.nextLesson?.teacher_name;
        const formattedTeacher = formatTeacherFullName(rawTeacher);
        const effectiveTeacherName = (formattedTeacher && formattedTeacher !== 'Lehrkraft') ? formattedTeacher : 'deine Lehrkraft';
        const teacherId = appt.teacher_id || (typeof appt.teacher === 'object' && appt.teacher?.id) || studentUser?.teacher_id || briefingData?.todayLesson?.teacher_id || '';
        const dateFormatted = appt.date ? new Date(appt.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Demnächst';
        const timeFormatted = appt.start_time ? appt.start_time.substring(0, 5) + ' Uhr' : 'Termin';
        const durationText = appt.duration ? `${appt.duration} Min.` : '45 Min.';
        const roomText = appt.room_name || appt.room?.name || appt.schedules?.room?.name || (typeof appt.room === 'string' && appt.room !== 'Unterrichtsraum' ? appt.room : '') || appt.location || briefingData?.todayLesson?.room_name || 'Vor Ort';
        const subjectText = (appt.subject && appt.subject !== 'Instrument' ? appt.subject : '') ||
          (appt.label && appt.label !== 'Instrument' ? appt.label : '') ||
          (appt.instrument && appt.instrument !== 'Instrument' ? appt.instrument : '') ||
          (appt.schedules?.instrument && appt.schedules.instrument !== 'Instrument' ? appt.schedules.instrument : '') ||
          (studentInstrumentName && studentInstrumentName !== 'Instrument' ? studentInstrumentName : '') ||
          'Musikunterricht';

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Musikstunde Details"
            onClick={() => { setSelectedAppointmentForDetail(null); setShowCancelConfirmStep(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSelectedAppointmentForDetail(null);
                setShowCancelConfirmStep(false);
              }
            }}
            tabIndex={-1}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '480px',
                padding: '24px',
                boxShadow: '0 20px 48px -10px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                position: 'relative'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    background: isCanceled ? 'rgba(239, 68, 68, 0.12)' : 'rgba(52, 168, 83, 0.12)',
                    color: isCanceled ? '#dc2626' : '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isCanceled ? <CalendarX size={22} /> : <Calendar size={22} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: isCanceled ? '#dc2626' : '#15803d' }}>
                      {isCanceled ? 'Unterricht abgesagt' : 'Geplante Musikstunde'}
                    </div>
                    <h3 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {subjectText}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedAppointmentForDetail(null); setShowCancelConfirmStep(false); }}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                  title="Schließen"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Details Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Datum & Uhrzeit</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', marginTop: '3px' }}>{dateFormatted}</div>
                  <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>{timeFormatted} ({durationText})</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Lehrkraft & Raum</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', marginTop: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {effectiveTeacherName}
                  </div>
                  <div style={{ fontSize: '0.80rem', fontWeight: 750, color: '#64748b', marginTop: '2px' }}>{roomText}</div>
                </div>
              </div>

              {/* Two-Step Cancellation Confirmation */}
              {showCancelConfirmStep ? (
                <div style={{
                  background: '#fef2f2',
                  border: '1.5px solid #fecaca',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.90rem', fontWeight: 900, color: '#991b1b' }}>
                        Musikstunde wirklich absagen?
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#7f1d1d', marginTop: '3px', lineHeight: 1.4 }}>
                        Deine Lehrkraft erhält eine automatische Benachrichtigung. Falls Eltern-PIN aktiviert ist, wird diese abgefragt.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirmStep(false)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleTriggerCancelOccurrence(appt);
                        setSelectedAppointmentForDetail(null);
                        setShowCancelConfirmStep(false);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        background: '#dc2626',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.82rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
                      }}
                    >
                      Ja, Stunde absagen
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Action Buttons */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Shoutbox Direktchat */}
                  {teacherId && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppointmentChatData({
                          teacherId,
                          date: appt.date,
                          start_time: appt.start_time?.substring(0, 5) || '15:00',
                          label: subjectText,
                          occurrenceId: appt.id,
                          status: appt.status || (isCanceled ? 'cancelled' : 'scheduled'),
                          isCancelled: isCanceled
                        });
                        setShowAppointmentChat(true);
                        setSelectedAppointmentForDetail(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '14px',
                        padding: '12px',
                        color: '#0f172a',
                        fontSize: '0.88rem',
                        fontWeight: 850,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      <MessageSquare size={16} color="#0f172a" />
                      <span>Nachricht an {effectiveTeacherName} (Shoutbox)</span>
                    </button>
                  )}

                  {/* Cancel or Re-activate Button */}
                  {isCanceled ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (handleTriggerUndoCancelOccurrence) {
                          handleTriggerUndoCancelOccurrence(appt);
                        }
                        setSelectedAppointmentForDetail(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '12px',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                      }}
                      className="hover-scale"
                    >
                      <RotateCcw size={16} />
                      <span>Absage zurücknehmen (Stunde aktivieren)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirmStep(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: '#fff1f2',
                        border: '1.5px solid #fecdd3',
                        borderRadius: '14px',
                        padding: '12px',
                        color: '#dc2626',
                        fontSize: '0.88rem',
                        fontWeight: 900,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      className="hover-scale"
                    >
                      <CalendarX size={16} />
                      <span>Diese Musikstunde absagen</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 🎧 1% GOLDSTANDARD: AUFNAHMEN-MODAL (STUDIO AUDIO-PLAYER) */}
      {showRecordingsModal && (() => {
        const homeworkSummary = getJuniorWeeklyHomeworkSummary ? getJuniorWeeklyHomeworkSummary() : null;
        const tracksList: any[] = (recordingsModalTracks && recordingsModalTracks.length > 0)
          ? recordingsModalTracks
          : (homeworkSummary?.audioTracks && homeworkSummary.audioTracks.length > 0
              ? homeworkSummary.audioTracks
              : (activeRecordingTrack ? [activeRecordingTrack] : []));
        
        // Prioritize actual teacher recordings or recordings with real duration > 1s
        const defaultTrack = tracksList.find((t: any) => t.author !== 'student' && t.author !== 'Schüler' && (t.duration || 0) > 1)
          || tracksList.find((t: any) => (t.duration || 0) > 1)
          || tracksList[0];
        const currentTrack = activeRecordingTrack || defaultTrack;

        const isStudentAuthor = currentTrack?.author === 'student' || currentTrack?.author === 'Schüler';
        const effectiveAuthorName = isStudentAuthor
          ? `${studentUser?.display_name || studentUser?.name || studentUser?.first_name || 'Eigene'} (Aufnahme)`
          : formatTeacherFullName(
              (currentTrack?.author && currentTrack.author !== 'teacher' && currentTrack.author !== 'student')
                ? currentTrack.author
                : (studentUser?.teacher_name || briefingData?.todayLesson?.teacher_name || briefingData?.nextLesson?.teacher_name || 'Deine Lehrkraft')
            );
        const subjectText = (currentTrack?.topic && currentTrack.topic !== 'Instrument' ? currentTrack.topic : '') ||
          (studentInstrumentName && studentInstrumentName !== 'Instrument' ? studentInstrumentName : '') ||
          'Musikunterricht';

        const openHomeworkBook = () => {
          setShowRecordingsModal(false);
          if (handleOpenHomeworkBookWithView) {
            handleOpenHomeworkBookWithView('document', 'recordings');
          } else {
            handleTabChangeLocal('homework_book');
          }
        };

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Unterrichtsaufnahmen"
            onClick={() => setShowRecordingsModal(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowRecordingsModal(false);
            }}
            tabIndex={-1}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '480px',
                padding: '24px',
                boxShadow: '0 20px 48px -10px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                position: 'relative'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'rgba(22, 163, 74, 0.12)',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Headphones size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 950, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Unterrichtsaufnahmen
                    </h3>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                      Vorspiel & Feedback deiner Lehrkraft
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecordingsModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                  title="Schließen"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Active High-Fidelity Studio Player */}
              {currentTrack ? (
                <StudioRecordingPlayer
                  track={currentTrack}
                  effectiveAuthorName={effectiveAuthorName}
                  subjectText={subjectText}
                  isStudentAuthor={isStudentAuthor}
                  onOpenInHomeworkBook={openHomeworkBook}
                  uiLevel={(studentUiLevel as any) || 'junior'}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '0.86rem' }}>
                  Keine Audio-Aufnahmen vorhanden.
                </div>
              )}

              {/* Track Selection List if multiple */}
              {tracksList.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.70rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Weitere Aufnahmen ({tracksList.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                    {tracksList.map((t, idx) => {
                      const isSelected = (currentTrack?.url === t.url) || (!currentTrack && idx === 0);
                      const isTrackStudent = t.author === 'student' || t.author === 'Schüler';
                      const trackLabel = t.label && t.label !== 'Aufnahme'
                        ? t.label
                        : (isTrackStudent ? `Eigene Aufnahme #${idx + 1}` : `Vorspiel #${idx + 1}`);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveRecordingTrack(t)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: isSelected ? '#f0fdf4' : '#ffffff',
                            border: isSelected ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                            color: isSelected ? '#15803d' : '#334155',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Headphones size={15} color={isSelected ? '#16a34a' : '#64748b'} />
                            <span>{trackLabel}</span>
                          </div>
                          {t.duration && (
                            <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 700 }}>
                              {formatQuickieDuration(t.duration)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2-Button Action Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setShowRecordingsModal(false)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Schließen
                </button>

                <button
                  type="button"
                  onClick={openHomeworkBook}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 20px',
                    fontSize: '0.86rem',
                    fontWeight: 900,
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  <BookOpen size={15} color="currentColor" />
                  <span>Im Aufgabenheft öffnen →</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
