import React from "react";
import { createPortal } from "react-dom";
import { BookOpen, Check, Compass, Headphones, Lightbulb, Music, Rocket, Star, X } from "lucide-react";
import { PreFlightAudioPlayerSection } from "../../campus/ZenPlayAlongDock";

export interface StudentJuniorPreFlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionInfo: {
    books?: any[];
    songs?: any[];
    audioTracks?: any[];
    teacherNote?: string;
  };
  targetMins: number;
  juniorSelectedTrackIndex: number;
  onSelectTrackIndex: (index: number) => void;
  onStartMission: () => void;
}

export const StudentJuniorPreFlightModal: React.FC<StudentJuniorPreFlightModalProps> = ({
  isOpen,
  onClose,
  missionInfo,
  targetMins,
  juniorSelectedTrackIndex,
  onSelectTrackIndex,
  onStartMission,
}) => {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(16px)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '32px',
        maxWidth: 'min(94vw, 480px)',
        width: '100%',
        maxHeight: '92dvh',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 20px',
        boxShadow: '0 35px 80px rgba(0, 0, 0, 0.35)',
        position: 'relative',
        boxSizing: 'border-box',
        overflowY: 'auto',
        animation: 'scaleIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '22px',
            right: '22px',
            background: '#f1f5f9',
            border: 'none',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b'
          }}
          className="hover-scale"
          aria-label="Schließen"
        >
          <X size={20} />
        </button>

        {/* HEADER BADGE & TITLE */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{
            background: '#ede9fe',
            color: '#6d28d9',
            fontSize: '0.80rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '6px 16px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Rocket size={14} fill="currentColor" />
            Übe-Raketen Startcheck
          </span>
          <h2 style={{
            fontSize: '1.55rem',
            fontWeight: 950,
            color: '#0f172a',
            margin: '12px 0 4px 0',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '-0.02em'
          }}>
            Deine Mission für heute 🚀
          </h2>
          <p style={{ fontSize: '0.94rem', color: '#64748b', fontWeight: 650, margin: 0 }}>
            Fliege los und meistere deine Musik-Aufgabe!
          </p>
        </div>

        {/* MISSION CARD WITH EDITORIAL FLOW */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: '26px',
          padding: '20px',
          border: '1.5px solid #e2e8f0',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Top Bar: Mission Header & Time Target */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{
              fontSize: '0.80rem',
              fontWeight: 900,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <Compass size={14} color="#6366f1" />
              Dein Wochen-Fahrplan
            </span>
            <span style={{
              background: '#fef3c7',
              color: '#b45309',
              fontSize: '0.84rem',
              fontWeight: 900,
              padding: '6px 12px',
              borderRadius: '100px',
              border: '1px solid #fde68a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <Star size={13} fill="currentColor" /> {targetMins} Min. bis zum Stern
            </span>
          </div>

          {/* 1. All Books Assigned */}
          {missionInfo.books && missionInfo.books.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {missionInfo.books.map((b: any, bIdx: number) => (
                <div key={`pre-b-${bIdx}`} style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '10px 14px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                      flexShrink: 0
                    }}>
                      <BookOpen size={15} strokeWidth={2.4} />
                    </div>
                    <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
                    {b.pageNums.map((pNum: number) => (
                      <span key={`p-pill-${pNum}`} style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: '7px',
                        border: '1px solid #bbf7d0'
                      }}>
                        S. {pNum}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. All Songs Assigned */}
          {missionInfo.songs && missionInfo.songs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {missionInfo.songs.map((s: any, sIdx: number) => {
                const cleanT = (s.topic_name || s.title || '').replace(/\s*\([^)]*\)\s*$/, '');
                return (
                  <div key={`pre-s-${sIdx}`} style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: '#ede9fe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#7c3aed',
                      flexShrink: 0
                    }}>
                      <Music size={15} strokeWidth={2.4} />
                    </div>
                    <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cleanT}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Fallback when neither books nor songs exist */}
          {(!missionInfo.books || missionInfo.books.length === 0) && (!missionInfo.songs || missionInfo.songs.length === 0) && (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: '#ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed',
                flexShrink: 0
              }}>
                <Music size={15} strokeWidth={2.4} />
              </div>
              <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0f172a' }}>
                Freies Üben &amp; Melodien entdecken
              </span>
            </div>
          )}

          {/* 4. Unterrichtsaufnahmen Audio Preview Pill & Station Tray */}
          {missionInfo.audioTracks && missionInfo.audioTracks.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              borderRadius: '20px',
              padding: '12px 14px',
              border: '1.5px solid #86efac',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: '#16a34a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                  }}>
                    <Headphones size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#14532d' }}>
                      {missionInfo.audioTracks.length === 1
                        ? '1 Unterrichtsaufnahme bereit'
                        : `${missionInfo.audioTracks.length} Unterrichtsaufnahmen bereit`}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 650 }}>
                      {missionInfo.audioTracks.length === 1
                        ? 'Im Übe-Timer als Play-Along abspielbar'
                        : 'Wähle deine Startspur für das Üben:'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Audio Player mit vertikalen Station-Pads & Spulbalken */}
              <PreFlightAudioPlayerSection
                tracks={missionInfo.audioTracks}
                selectedIndex={juniorSelectedTrackIndex}
                onSelectIndex={onSelectTrackIndex}
              />
            </div>
          )}

          {/* Teacher Hint / Homework Note */}
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '14px 16px',
            border: '1.5px solid #fef08a',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: '#fef9c3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '1px'
            }}>
              <Lightbulb size={18} color="#ca8a04" />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                Tipp deiner Lehrkraft
              </div>
              <div style={{ fontSize: '0.92rem', color: '#1e293b', fontWeight: 700, lineHeight: 1.4 }}>
                {missionInfo.teacherNote}
              </div>
            </div>
          </div>

          {/* Readiness Checks */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '4px 4px 0 4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 750, color: '#475569' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
                <Check size={13} strokeWidth={3} />
              </div>
              <span>Noten aufgeschlagen &amp; Notenständer bereit</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 750, color: '#475569' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
                <Check size={13} strokeWidth={3} />
              </div>
              <span>Instrument zur Hand &amp; startklar</span>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={onStartMission}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '20px',
              padding: '18px 24px',
              fontWeight: 950,
              fontSize: '1.15rem',
              cursor: 'pointer',
              boxShadow: '0 10px 28px rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'transform 0.15s ease'
            }}
            className="hover-scale"
          >
            <Rocket size={22} fill="currentColor" />
            <span>Rakete starten &amp; Üben! 🚀</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '0.94rem',
              fontWeight: 800,
              padding: '10px',
              cursor: 'pointer',
              borderRadius: '12px'
            }}
          >
            Später üben
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
