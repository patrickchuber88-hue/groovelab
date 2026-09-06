import React from 'react';
import { Award, Trophy } from 'lucide-react';
import { TourStartButton } from '../../PremiumOnboardingTour';
import { getAvatarLevelFrameStyle } from '../../StudioAvatar';

export interface StudentHeroTabProps {
  activeTab: string;
  avatar: any;
  effectiveLevel: number;
  xpActive: boolean;
  levelTitle: string;
  hasMasteryCrown: boolean;
  currentLevel: number;
  currentXp: number;
  nextThreshold: number;
  xpPercentage: number;
  showMissionsFeature: boolean;
  studentMissionProgress: any;
  progressItems: any[];
  studentUser: any;
  pinInput: string;
  setPinInput: React.Dispatch<React.SetStateAction<string>>;
  setCustomAvatarFile: React.Dispatch<React.SetStateAction<File | null>>;
  handleUploadAvatarWithPin: (e: React.FormEvent) => void | Promise<void>;
  isUploadingCustomAvatar: boolean;
  startTour: () => void;
}

export function StudentHeroTab({
  activeTab,
  avatar,
  effectiveLevel,
  xpActive,
  levelTitle,
  hasMasteryCrown,
  currentLevel,
  currentXp,
  nextThreshold,
  xpPercentage,
  showMissionsFeature,
  studentMissionProgress,
  progressItems,
  studentUser,
  pinInput,
  setPinInput,
  setCustomAvatarFile,
  handleUploadAvatarWithPin,
  isUploadingCustomAvatar,
  startTour
}: StudentHeroTabProps) {
  if (activeTab !== 'hero') return null;

  return (
    <div style={{ display: 'block' }}>
      <div id="tour-student-hero" style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Evolution Badge Top Right */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#e0f2fe',
          border: '1px solid #bae6fd',
          color: '#0369a1',
          fontWeight: 800,
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          padding: '4px 12px',
          borderRadius: '100px'
        }}>
          <Trophy size={11} /> {avatar?.instrument_type}
        </div>
        
        <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
          <TourStartButton onClick={startTour} platformTheme="campus" />
        </div>

        {/* Avatar Showcase */}
        <div style={{ textAlign: 'center', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}>
            {/* Avatar frame */}
            {(() => {
              const frameStyle = getAvatarLevelFrameStyle(effectiveLevel);
              return (
                <>
                  <div style={{
                    width: '160px',
                    height: '160px',
                    borderRadius: '50%',
                    background: '#f8fafc',
                    border: frameStyle.border,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    boxShadow: frameStyle.boxShadow,
                    transition: 'all 0.4s ease'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '5rem' }}>
                        {avatar?.instrument_type === 'guitarist' ? '🎸' : avatar?.instrument_type === 'drummer' ? '🥁' : avatar?.instrument_type === 'keyboardist' ? '🎹' : '🎤'}
                      </span>
                    </div>
                  </div>
                  
                  {xpActive && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-8px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: frameStyle.borderColor,
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '0.68rem',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      padding: '4px 14px',
                      borderRadius: '100px',
                      boxShadow: frameStyle.boxShadow,
                      border: '2px solid #ffffff',
                      whiteSpace: 'nowrap'
                    }}>
                      Stufe {effectiveLevel}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Info Block */}
          <div style={{ marginTop: '8px' }}>
            <h3 style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b', margin: 0 }}>
              Mein Avatar
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              {xpActive && (
                <span style={{ color: '#0b57d0', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={13} /> {levelTitle}
                </span>
              )}
              {hasMasteryCrown && (
                <span style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '1px solid #f59e0b',
                  color: '#92400e',
                  fontWeight: 900,
                  fontSize: '0.74rem',
                  padding: '2px 10px',
                  borderRadius: '100px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)'
                }}>
                  <span>👑</span>
                  <span>Meister-Abschluss (10/10)</span>
                </span>
              )}
            </div>
          </div>

          {/* XP Progress Bar */}
          {xpActive && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                <span>Erfahrungspunkte (XP)</span>
                <span style={{ color: '#0b57d0', fontFamily: 'monospace', fontWeight: 900 }}>
                  {currentLevel === 3 ? `${currentXp} XP (MAX)` : `${currentXp} / ${nextThreshold} XP`}
                </span>
              </div>

              <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                <div
                  style={{ width: `${xpPercentage}%`, height: '100%', borderRadius: '100px', background: '#0b57d0', transition: 'all 1s' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                {currentLevel === 3 ? (
                  <span>Glückwunsch! Höchste Stufe erreicht!</span>
                ) : (
                  <>
                    <span>Noch {nextThreshold - currentXp} XP bis Stufe {currentLevel + 1}</span>
                    <span>{Math.round(xpPercentage)}%</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Missions Board / Adventure Map */}
        {showMissionsFeature && (
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginTop: '20px'
          }}>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🗺️ Mein Abenteuer-Pfad (Schuljahr)
            </h3>
            
            {/* Visual curved/horizontal node path */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', padding: '24px 10px', overflowX: 'auto', gap: '24px' }}>
              <div style={{ position: 'absolute', left: '40px', right: '40px', top: '50%', height: '4px', background: '#cbd5e1', zIndex: 1, transform: 'translateY(-50%)' }} />
              <div style={{
                position: 'absolute',
                left: '40px',
                width: `${Math.min(100, Math.max(0, (((studentMissionProgress?.current_level || 1) - 1) / 5) * 100))}%`,
                top: '50%',
                height: '4px',
                background: '#34a853',
                zIndex: 2,
                transform: 'translateY(-50%)',
                transition: 'width 0.5s ease'
              }} />
              
              {[1, 2, 3, 4, 5, 6].map(lvl => {
                const sLvl = studentMissionProgress?.current_level || 1;
                const isCompleted = sLvl > lvl;
                const isCurrent = sLvl === lvl;
                
                return (
                  <div key={lvl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 3, position: 'relative', minWidth: '70px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: isCompleted ? '#34a853' : isCurrent ? '#ffffff' : '#cbd5e1',
                      border: isCurrent ? '4px solid #34a853' : '4px solid transparent',
                      color: isCompleted ? '#ffffff' : isCurrent ? '#34a853' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1rem',
                      boxShadow: isCurrent ? '0 0 15px rgba(52, 168, 83, 0.3)' : 'none',
                      transition: 'all 0.3s'
                    }}>
                      {lvl}
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isCurrent ? '#34a853' : '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {lvl === 1 ? 'Start 1 Song' : lvl === 2 ? 'Upload PIN' : lvl === 3 ? '3 Songs' : `Level ${lvl}`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current Level Requirement details */}
            <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                Aktuelles Ziel: Stufe {studentMissionProgress?.current_level || 1}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                {(studentMissionProgress?.current_level || 1) === 1 && (
                  <div>
                    🎯 <strong>Ziel:</strong> Schließe deinen ersten Song erfolgreich ab (1 Song).<br />
                    Erledigt: {progressItems.filter((i: any) => i.is_stage_ready).length >= 1 ? '✅ Ja' : '❌ Noch kein Song abgeschlossen.'}
                  </div>
                )}
                {(studentMissionProgress?.current_level || 1) === 2 && (
                  <div>
                    🎯 <strong>Ziel:</strong> Erreiche eine 7-Tage-Übestreak (große Flamme) + 15 Minuten Fokus-Üben am Stück.<br />
                    Dein aktueller Streak: {avatar?.streak_flame || 0} von 7 Tagen.
                  </div>
                )}
                {(studentMissionProgress?.current_level || 1) === 3 && (
                  <div>
                    🎯 <strong>Ziel:</strong> Schließe mindestens 3 Songs erfolgreich ab.<br />
                    Erledigt: {progressItems.filter((i: any) => i.is_stage_ready).length} von 3 Songs.
                  </div>
                )}
                {(studentMissionProgress?.current_level || 1) > 3 && (
                  <div>
                    🎯 <strong>Ziel:</strong> Folge deinem Lehrplan und schließe fortlaufend neue Songs ab!
                  </div>
                )}
              </div>
            </div>

            {/* PIN Code Verification Card (Level 2 specific upload unlock) */}
            {(studentMissionProgress?.current_level || 1) >= 2 && (
              <div style={{ border: '2px dashed #e6f4ea', background: '#e6f4ea', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontWeight: 900, color: '#34a853', fontSize: '1rem' }}>
                    🔓 Custom Avatar / Instrument Upload freigeschaltet!
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#34a853', lineHeight: 1.4 }}>
                    Trage deine einmalige PIN ein, die du von deinem Lehrer erhalten hast, um dein eigenes Profilbild/Instrumenten-Foto hochzuladen.
                  </p>
                </div>

                {/* AI Prompt Assistant helper */}
                <div style={{ background: '#ffffff', border: '1px solid #e6f4ea', padding: '12px', borderRadius: '12px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34a853', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    💡 Prompt-Assistent für KI-Generatoren (z.B. Midjourney, DALL-E)
                  </span>
                  <div style={{ fontSize: '0.75rem', color: '#1e293b', fontStyle: 'italic', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <span id="promptText">"Ein cooler Musik-Hero im Comic-Stil mit einem {studentUser?.instrument || 'Gitarre'}, leuchtende Farben, Profilbild, quadratisch"</span>
                    <button
                      type="button"
                      onClick={() => {
                        const txt = document.getElementById('promptText')?.innerText || '';
                        navigator.clipboard.writeText(txt);
                        alert('Prompt kopiert!');
                      }}
                      style={{ background: '#e2e8f0', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Kopieren
                    </button>
                  </div>
                </div>

                <form onSubmit={handleUploadAvatarWithPin} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '160px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#34a853' }}>6-stellige Einmal-PIN</label>
                    <input
                      type="text"
                      placeholder="z.B. 123456"
                      value={pinInput}
                      onChange={e => setPinInput(e.target.value)}
                      maxLength={8}
                      style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid #e6f4ea', fontWeight: 700 }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1.5, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#34a853' }}>Foto auswählen</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setCustomAvatarFile(e.target.files?.[0] || null)}
                      style={{ fontSize: '0.75rem', color: '#475569' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUploadingCustomAvatar}
                    style={{
                      background: '#34a853',
                      color: 'white',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(52, 168, 83, 0.2)'
                    }}
                  >
                    {isUploadingCustomAvatar ? 'Wird hochgeladen...' : 'Bild hochladen'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
