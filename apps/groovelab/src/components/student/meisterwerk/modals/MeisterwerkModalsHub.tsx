import React, { Suspense } from 'react';
import {
  X,
  BookOpen,
  Check,
  Clock,
  Flame,
  Mic,
  Headphones,
  Award,
  Star,
  ChevronRight,
  Sparkles,
  Mail
} from 'lucide-react';
import { HomeworkTransferModal } from '../../../campus/HomeworkTransferModal';

const MeisterwerkCertificateModal = React.lazy(() =>
  import('../../../ui/MeisterwerkCertificateModal').then((m) => ({
    default: m.MeisterwerkCertificateModal
  }))
);

export interface MeisterwerkModalsHubProps {
  // Certificate Modal
  certModalSong: {
    studentName: string;
    songTitle: string;
    instrument?: string;
    schoolName?: string;
    teacherName?: string;
    masteredDate?: string;
    certificateId?: string;
  } | null;
  onCloseCert: () => void;

  // Homework Transfer Modal
  isTransferModalOpen: boolean;
  onCloseTransfer: () => void;
  targetWeekNum: string;
  targetWeekIso: string;
  targetDateSpan: string;
  sourceWeekNum: string;
  sourceLehrwerke: any[];
  sourceSongs: any[];
  sourceAudios: any[];
  onExecuteTransfer: (decisions: any) => Promise<void>;

  // Age UI Info Modal
  showAgeUiInfoModal: boolean;
  onCloseAgeUiInfoModal: () => void;
  isTeacherSandbox: boolean;
  isTeacherTools: boolean;
  isTeacherSelf: boolean;
  isTeacherMode: boolean;
  uiLevel: 'junior' | 'teen' | 'pro';
  studentFirstName: string;
  recSuccess: boolean;
  recTargetLevel: string;
  setRecTargetLevel: (val: any) => void;
  recNote: string;
  setRecNote: (val: string) => void;
  isSavingRec: boolean;
  handleSendTeacherRecommendation: () => Promise<void>;

  // Onboarding
  showProtokollOnboarding: boolean;
  onCloseProtokollOnboarding: () => void;
  onboardingStep: number;
  setOnboardingStep: React.Dispatch<React.SetStateAction<number>>;

  // Floating Toasts
  recordingSavedToast: string | null;
  studentNotesSavedToast: boolean;
}

export const MeisterwerkModalsHub: React.FC<MeisterwerkModalsHubProps> = ({
  certModalSong,
  onCloseCert,
  isTransferModalOpen,
  onCloseTransfer,
  targetWeekNum,
  targetWeekIso,
  targetDateSpan,
  sourceWeekNum,
  sourceLehrwerke,
  sourceSongs,
  sourceAudios,
  onExecuteTransfer,
  showAgeUiInfoModal,
  onCloseAgeUiInfoModal,
  isTeacherSandbox,
  isTeacherTools,
  isTeacherSelf,
  isTeacherMode,
  uiLevel,
  studentFirstName,
  recSuccess,
  recTargetLevel,
  setRecTargetLevel,
  recNote,
  setRecNote,
  isSavingRec,
  handleSendTeacherRecommendation,
  showProtokollOnboarding,
  onCloseProtokollOnboarding,
  onboardingStep,
  setOnboardingStep,
  recordingSavedToast,
  studentNotesSavedToast
}) => {
  return (
    <>
      {/* 📜 Meisterwerk Certificate Modal */}
      {certModalSong && (
        <Suspense fallback={null}>
          <MeisterwerkCertificateModal
            studentName={certModalSong.studentName}
            songTitle={certModalSong.songTitle}
            instrument={certModalSong.instrument}
            schoolName={certModalSong.schoolName}
            teacherName={certModalSong.teacherName}
            masteredDate={certModalSong.masteredDate}
            certificateId={certModalSong.certificateId}
            onClose={onCloseCert}
          />
        </Suspense>
      )}

      {/* 📦 Batch Homework Transfer Modal */}
      {isTransferModalOpen && (
        <HomeworkTransferModal
          isOpen={isTransferModalOpen}
          onClose={onCloseTransfer}
          targetWeekNum={targetWeekNum}
          targetWeekIso={targetWeekIso}
          targetDateSpan={targetDateSpan}
          sourceWeekNum={sourceWeekNum}
          sourceLehrwerke={sourceLehrwerke}
          sourceSongs={sourceSongs}
          sourceAudios={sourceAudios}
          onExecuteTransfer={onExecuteTransfer}
        />
      )}

      {/* ℹ️ Altersstufen & Berechtigungen Info Modal */}
      {showAgeUiInfoModal && !isTeacherSandbox && !isTeacherTools && !isTeacherSelf && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Altersstufe & Berechtigungen"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
          onClick={onCloseAgeUiInfoModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeIn 0.18s ease-out'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px 16px 24px',
                background:
                  uiLevel === 'junior'
                    ? 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)'
                    : uiLevel === 'teen'
                    ? 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)'
                    : 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    fontSize: '1.2rem'
                  }}
                >
                  {uiLevel === 'junior' ? '🧒' : uiLevel === 'teen' ? '⚡' : '🎓'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                    {uiLevel === 'junior'
                      ? 'Junior-Stufe (6–10 Jahre)'
                      : uiLevel === 'teen'
                      ? 'Teen-Stufe (11–15 Jahre)'
                      : 'Pro-Stufe (ab 16 Jahre)'}
                  </h3>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>
                    Schüler-Profil von {studentFirstName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseAgeUiInfoModal}
                aria-label="Schließen"
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                className="hover-scale"
              >
                <X size={16} color="#475569" />
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                maxHeight: '70vh',
                overflowY: 'auto'
              }}
            >
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '14px 16px'
                }}
              >
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    marginBottom: '6px'
                  }}
                >
                  Funktionsumfang dieser Altersstufe:
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '18px',
                    fontSize: '0.78rem',
                    color: '#475569',
                    lineHeight: 1.6
                  }}
                >
                  {uiLevel === 'junior' ? (
                    <>
                      <li>
                        <strong>5 aktive Module:</strong> Übe-Begleiter, Aufnahmen, Groove-Trainer,
                        Stimmgerät, Klang-Detektiv, Musik-Stern ⭐ & Protokoll.
                      </li>
                      <li>
                        <strong>Kindgerechte Begriffe:</strong> Klang-Detektiv statt EarLab,
                        Sticker-Album statt Meilensteine.
                      </li>
                      <li>
                        <strong>Rechte-Schutz:</strong> Loopstation & Archiv regulär inaktiv (können
                        von Eltern über PIN freigeschaltet werden).
                      </li>
                      <li>
                        <strong>Kinderschutz:</strong> Nachtruhe-Schutz aktiv, kein
                        Schüler-Direktchat ohne Eltern.
                      </li>
                    </>
                  ) : uiLevel === 'teen' ? (
                    <>
                      <li>
                        <strong>7 aktive Module:</strong> Inklusive Loopstation, Skill-Radar, Chat
                        und Mitteilungen.
                      </li>
                      <li>
                        <strong>Eigenverantwortung:</strong> Stundenplan-Vorschläge & Übe-Timer
                        freigeschaltet.
                      </li>
                      <li>
                        <strong>Archiv:</strong> Regulär inaktiv (über Eltern-Freigabe aktivierbar).
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <strong>Volles Studio:</strong> Alle Module inklusive Unterrichts-Archiv
                        voll aktiv.
                      </li>
                      <li>
                        <strong>Autonomie:</strong> Alle Schüler-Werkzeuge ohne Einschränkungen
                        verfügbar.
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {isTeacherMode ? (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="#2563eb" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#1e3a8a' }}>
                      Didaktische Empfehlung an die Eltern
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#475569', lineHeight: 1.45 }}>
                    Die dauerhafte Rechte- und Stufenverwaltung obliegt den Eltern. Du kannst hier eine
                    fachliche Empfehlung hinterlegen, die den Eltern im Elternbereich angezeigt wird.
                  </p>

                  {recSuccess ? (
                    <div
                      style={{
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        borderRadius: '12px',
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: '0.82rem',
                        fontWeight: 850,
                        color: '#15803d'
                      }}
                    >
                      ✓ Empfehlung erfolgreich an {studentFirstName}s Eltern übermittelt!
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>
                          Empfohlene Freigabe:
                        </label>
                        <select
                          value={recTargetLevel}
                          onChange={(e) => setRecTargetLevel(e.target.value as any)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            fontSize: '0.80rem',
                            fontWeight: 700,
                            color: '#0f172a'
                          }}
                        >
                          <option value="teen">
                            ⚡ Wechsel zur Teen-Stufe (11–15 J. / inkl. Loopstation)
                          </option>
                          <option value="loopstation">
                            🎛️ Loopstation freischalten (im Junior-Profil)
                          </option>
                          <option value="pro">🎓 Wechsel zur Pro-Stufe (ab 16 J.)</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#334155' }}>
                          Hinweis / Begründung für die Eltern:
                        </label>
                        <textarea
                          value={recNote}
                          onChange={(e) => setRecNote(e.target.value)}
                          placeholder={`z. B. ${studentFirstName} macht tolle Fortschritte und wir möchten im Unterricht nun die Loopstation einsetzen...`}
                          rows={3}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            fontSize: '0.78rem',
                            color: '#0f172a',
                            resize: 'none',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isSavingRec}
                        onClick={handleSendTeacherRecommendation}
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 16px',
                          fontSize: '0.82rem',
                          fontWeight: 900,
                          cursor: isSavingRec ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                        }}
                        className="hover-scale"
                      >
                        <Mail size={15} />
                        <span>{isSavingRec ? 'Wird gespeichert...' : 'Empfehlung an Eltern senden'}</span>
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '16px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.80rem', color: '#64748b', marginBottom: '12px' }}>
                    Eltern können die Altersstufe oder einzelne Module (z. B. Loopstation) jederzeit
                    im Elternbereich über den Eltern-PIN anpassen.
                  </div>
                  <button
                    type="button"
                    onClick={onCloseAgeUiInfoModal}
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '8px 16px',
                      fontSize: '0.80rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    className="hover-scale"
                  >
                    Verstanden
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🚀 Schritt-für-Schritt Onboarding Modal Overlay */}
      {showProtokollOnboarding && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '28px',
              width: '100%',
              maxWidth: '640px',
              padding: '36px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              border: '1.5px solid rgba(255, 255, 255, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Top Progress Bar & Step Dots */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {[0, 1, 2, 3].map((stepIdx) => (
                  <div
                    key={stepIdx}
                    style={{
                      width: stepIdx === onboardingStep ? '28px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      background:
                        stepIdx === onboardingStep
                          ? '#34a853'
                          : stepIdx < onboardingStep
                          ? '#a7f3d0'
                          : '#e2e8f0',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  />
                ))}
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#64748b',
                    marginLeft: '6px'
                  }}
                >
                  Schritt {onboardingStep + 1} von 4
                </span>
              </div>

              <button
                type="button"
                onClick={onCloseProtokollOnboarding}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Überspringen
              </button>
            </div>

            {/* Step Content */}
            {onboardingStep === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      background: '#e6f4ea',
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <BookOpen size={28} color="#34a853" />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: '1.2rem',
                        fontWeight: 950,
                        color: '#0f172a',
                        margin: 0
                      }}
                    >
                      Dein zentrales Wochen-Protokoll
                    </h3>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        color: '#34a853',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      Wochenaufgaben & Lehrer-Notizen
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                  Im <strong>Schüler-Protokoll</strong> findest du alle wöchentlichen Hausaufgaben,
                  Lehrwerkseiten und Notizen deines Lehrers. Es bildet das Herzstück deines
                  Musikunterrichts bei <strong>Campus-Groovelab</strong>.
                </p>
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '18px',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Check size={16} color="#34a853" />
                    <span>Transparenter Wochenfortschritt für Schüler & Eltern</span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Check size={16} color="#34a853" />
                    <span>Historie aller vergangenen Unterrichtsstunden nachschlagen</span>
                  </div>
                </div>
              </div>
            )}

            {onboardingStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      background: '#fef3c7',
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Clock size={28} color="#d97706" />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: '1.2rem',
                        fontWeight: 950,
                        color: '#0f172a',
                        margin: 0
                      }}
                    >
                      Fokus-Timer, XP & Streaks
                    </h3>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        color: '#d97706',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      Selbstständiges Üben belohnen
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                  Starte beim Üben zu Hause den <strong>Fokus-Timer</strong>. Erreiche mindestens 3
                  Minuten Fokuszeit, um deinen Tages-Bonus freizuschalten, XP-Punkte zu sammeln und
                  deine Übe-Streak-Flamme am Brennen zu halten!
                </p>
                <div
                  style={{
                    background: '#fffbeb',
                    borderRadius: '18px',
                    padding: '16px',
                    border: '1px dashed #fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <Flame size={24} color="#f97316" />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#b45309' }}>
                      1 Min. Übezeit = 1 XP | Tages-Ziel = +10 XP Bonus
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#d97706' }}>
                      Disziplin zahlt sich aus: Halte deine Streak über 7, 14 & 30 Tage!
                    </span>
                  </div>
                </div>
              </div>
            )}

            {onboardingStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      background: '#e0e7ff',
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Mic size={28} color="#4f46e5" />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: '1.2rem',
                        fontWeight: 950,
                        color: '#0f172a',
                        margin: 0
                      }}
                    >
                      Audio-Aufnahme & Loopstation Studio
                    </h3>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        color: '#4f46e5',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      Interaktives Recording & Band-Labor
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                  Nimm deine Übe-Fortschritte direkt als Sprach-/Instrumenten-Memo im Protokoll auf
                  oder nutze die <strong>Web-Audio Loopstation</strong> zum Einspielen eigener
                  Mehrspur-Beats & Songs!
                </p>
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '18px',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <Headphones size={24} color="#4f46e5" />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                      Sample-Accurate Recording & Dynamic Waveforms
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      Höre deine Aufnahmen jederzeit im Hausaufgabenheft an.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {onboardingStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      background: '#fef9c3',
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Award size={28} color="#ca8a04" />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: '1.2rem',
                        fontWeight: 950,
                        color: '#0f172a',
                        margin: 0
                      }}
                    >
                      Meisterwerke & Campus-Sammelsticker
                    </h3>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        color: '#ca8a04',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      Glänzende Auszeichnungen sammeln
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                  Für gemeisterte Songs und Meilensteine erhältst du glänzende{' '}
                  <strong>Campus-Sammelsticker</strong> für dein virtuelles Sammelalbum. Sammle
                  seltene, epische & legendäre Sticker und teile deine Urkunden!
                </p>
                <div
                  style={{
                    background: '#fefce8',
                    borderRadius: '18px',
                    padding: '16px',
                    border: '1px dashed #fef08a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <Star size={24} color="#eab308" />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#854d0e' }}>
                      Dein persönliches Sticker-Sammelalbum
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#a16207' }}>
                      Erfolge bleiben dein ganzes Schuljahr über sichtbar!
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '8px'
              }}
            >
              <button
                type="button"
                disabled={onboardingStep === 0}
                onClick={() => setOnboardingStep((prev) => Math.max(0, prev - 1))}
                style={{
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  color: onboardingStep === 0 ? '#cbd5e1' : '#475569',
                  borderRadius: '12px',
                  padding: '10px 18px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: onboardingStep === 0 ? 'default' : 'pointer'
                }}
              >
                Zurück
              </button>

              {onboardingStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setOnboardingStep((prev) => Math.min(3, prev + 1))}
                  style={{
                    background: '#34a853',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 24px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(52, 168, 83, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Weiter</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onCloseProtokollOnboarding}
                  style={{
                    background: 'linear-gradient(135deg, #34a853 0%, #16a34a 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 24px',
                    fontSize: '0.86rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(52, 168, 83, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>Protokoll erkunden 🚀</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Recording Saved Celebration Banner */}
      {recordingSavedToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999999,
            background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '100px',
            boxShadow: '0 12px 36px rgba(22, 163, 74, 0.4), 0 4px 12px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.94rem',
            fontWeight: 900,
            letterSpacing: '-0.01em',
            pointerEvents: 'none',
            animation: 'fade-in 0.25s ease-out'
          }}
        >
          <span>{recordingSavedToast}</span>
        </div>
      )}

      {/* Floating Student Notes Saved Toast */}
      {studentNotesSavedToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999999,
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '100px',
            boxShadow: '0 8px 24px rgba(2, 132, 199, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.88rem',
            fontWeight: 850,
            pointerEvents: 'none',
            animation: 'fade-in 0.2s ease-out'
          }}
        >
          <span>✓ Notizen gespeichert</span>
        </div>
      )}
    </>
  );
};
