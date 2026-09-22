import React from "react";
import { Play, Volume2, X } from "lucide-react";
import { getSongColor } from "../studentDateUtils";
import { renderSongVinylCover } from "../CampusVinylCoverArt";

export interface StudentSongDetailModalProps {
  song: any | null;
  onClose: () => void;
  studentId: string;
  progressItems: any[];
  handleTabChangeLocal: (tab: string, skipResetHwTab?: boolean) => void;
  setSelectedTopic: (topic: string) => void;
}

export const StudentSongDetailModal: React.FC<StudentSongDetailModalProps> = ({
  song,
  onClose,
  studentId,
  progressItems,
  handleTabChangeLocal,
  setSelectedTopic,
}) => {
  if (!song) return null;


        const lwColor = getSongColor(song.title || '');
        const progressItem = progressItems.find(item => 
          item.topic_name.toLowerCase() === song.title.toLowerCase() ||
          item.topic_name.toLowerCase().includes(song.title.toLowerCase())
        );
        const isMastered = song.status === 'MASTERED' || progressItem?.status === 'MASTERED' || (song.progress_percent || 0) === 100;
        const isCurrentMission = Boolean(song.is_current_homework || progressItem?.is_current_homework);
        const progressPercent = isMastered ? 100 : (song.progress_percent || progressItem?.progress_percent || 0);

        // Extract verified teacher homework notes / roadmap
        const rawNotes = song.homework_notes || progressItem?.homework_notes || localStorage.getItem(`song_note_${studentId}_${song.id}`) || '';
        let cleanNotes = '';
        if (typeof rawNotes === 'string' && rawNotes.trim()) {
          try {
            const parsed = JSON.parse(rawNotes);
            if (Array.isArray(parsed)) {
              cleanNotes = parsed.filter((n: string) => typeof n === 'string' && !n.startsWith('AUDIO:') && !n.startsWith('STICKER:') && !n.toLowerCase().startsWith('latency:') && !n.startsWith('LOOP:') && !n.startsWith('SYSTEM:') && !n.startsWith('STUDENT_NOTE_PUBLIC:') && !n.startsWith('STUDENT_NOTE_PRIVATE:')).join(' ');
            } else if (typeof parsed === 'string') {
              cleanNotes = parsed;
            }
          } catch {
            cleanNotes = rawNotes;
          }
        }
        cleanNotes = cleanNotes
          .replace(/\["AUDIO:[^"]*"\]/g, '')
          .replace(/AUDIO:[^\s,|]+/g, '')
          .replace(/LATENCY:[^\s,|]+/gi, '')
          .replace(/LATENCY_CALIBRATION:[^\s,|]+/gi, '')
          .replace(/.*(STUDENT_NOTE_PUBLIC|STUDENT_NOTE_PRIVATE):[^|]*\|/, '')
          .replace(/^❓\s*Frage für den Unterricht:\s*/i, '')
          .trim();

        
return (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            background: 'rgba(9, 9, 11, 0.65)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: '"Plus Jakarta Sans", sans-serif'
          }}>
            <div role="dialog" aria-modal="true" style={{
              background: '#ffffff',
              borderRadius: '32px',
              width: '100%',
              maxWidth: '580px',
              maxHeight: '90vh',
              boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              position: 'relative'
            }} className="animation-slide-up">
              
              {/* Header Hero */}
              <div style={{
                padding: '24px 28px',
                background: `linear-gradient(135deg, ${lwColor.from}15 0%, ${lwColor.to}25 100%)`,
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {renderSongVinylCover(lwColor, 'md')}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 850,
                        color: isMastered ? '#15803d' : (isCurrentMission ? '#0369a1' : '#475569'),
                        background: isMastered ? '#dcfce7' : (isCurrentMission ? '#e0f2fe' : '#f1f5f9'),
                        padding: '2px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {isMastered ? 'Meisterwerk 🏆' : (isCurrentMission ? 'Aktuelle Hausaufgabe 🚀' : 'Song im Repertoire 🎵')}
                      </span>
                      {song.genre && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748b' }}>
                          • {song.genre}
                        </span>
                      )}
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                      {song.title}
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748b', fontWeight: 700 }}>
                      von {song.artist}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onClose()}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                    flexShrink: 0
                  }}
                  className="hover-scale"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Real Progress Card */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 850, color: '#1e293b' }}>
                      Lernfortschritt
                    </span>
                    <span style={{
                      background: isMastered ? '#dcfce7' : '#e6f4ea',
                      color: isMastered ? '#15803d' : '#16a34a',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 900
                    }}>
                      {progressPercent}%
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, Math.max(progressPercent, isMastered ? 100 : 5))}%`,
                      height: '100%',
                      background: isMastered ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 650 }}>
                    {isMastered 
                      ? '🏆 Dieser Song wurde erfolgreich als Meisterwerk abgeschlossen!'
                      : (isCurrentMission 
                        ? '🚀 Dieser Song ist aktuell Teil deiner Hausaufgaben.'
                        : '🎵 Dieser Song ist in deinem aktiven Repertoire.')}
                  </span>
                </div>

                {/* Verified Teacher Homework Notes / Roadmap */}
                {cleanNotes && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '18px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 850, color: '#166534', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📌 Fahrplan & Übe-Tipp der Lehrkraft:
                    </div>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#14532d', fontWeight: 650, lineHeight: 1.45 }}>
                      {cleanNotes}
                    </p>
                  </div>
                )}

                {/* Song Meta Information (BPM, Tempo, Instrumentation) */}
                {(song.tempo_bpm || song.genre || song.instrumentation) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    {song.tempo_bpm && (
                      <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#334155', padding: '4px 10px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 750 }}>
                        ⚡ {song.tempo_bpm} BPM
                      </span>
                    )}
                    {song.genre && (
                      <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#334155', padding: '4px 10px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 750 }}>
                        🎼 Genre: {song.genre}
                      </span>
                    )}
                    {song.instrumentation && (
                      <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#334155', padding: '4px 10px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 750 }}>
                        🎵 {song.instrumentation}
                      </span>
                    )}
                  </div>
                )}

                {/* Audio Play-Along Trigger if audio_url */}
                {song.audio_url && (
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Volume2 size={14} color="#34a853" /> Play-Along Audio:
                    </span>
                    <audio controls src={song.audio_url} preload="metadata" playsInline style={{ width: '100%', height: '36px', borderRadius: '8px' }} />
                  </div>
                )}

                {/* Action CTA Button */}
                <button
                  onClick={() => {
                    setSelectedTopic(song.title);
                    onClose();
                    handleTabChangeLocal('practice');
                  }}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '16px 20px',
                    borderRadius: '18px',
                    fontWeight: 950,
                    fontSize: '0.96rem',
                    cursor: 'pointer',
                    boxShadow: '0 8px 22px rgba(34, 197, 94, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    marginTop: '4px'
                  }}
                  className="hover-scale"
                >
                  <Play size={18} fill="white" color="white" />
                  <span>An diesem Song üben (Timer starten)</span>
                </button>
              </div>
            </div>
          </div>
        );
      
};
