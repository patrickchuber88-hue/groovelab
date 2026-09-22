import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { BookOpen, Clock, EyeOff, Lock, Share2, Trophy, X, Zap } from "lucide-react";
import { CampusGroovelabText } from "../../CampusGroovelabBrand";

export interface CampusWrappedStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  wrappedData: any;
  avatar: any;
  currentLevel: number;
  studentId: string;
  levelTitle?: string;
}

export const CampusWrappedStoryModal: React.FC<CampusWrappedStoryModalProps> = ({
  isOpen,
  onClose,
  wrappedData,
  avatar,
  currentLevel,
  studentId,
  levelTitle,
}) => {
  const resolvedLevelTitle = levelTitle || ("Level " + (currentLevel || 1));
  const [storySlide, setStorySlide] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStorySlide(0);
    }
  }, [isOpen]);

  if (!isOpen || !wrappedData) return null;

  return (

        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#09090b',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Outfit", sans-serif'
        }}>
          {/* 9:16 Aspect Ratio Container */}
          <div role="dialog" aria-modal="true" style={{
            position: 'relative',
            width: '100%',
            maxWidth: '430px',
            height: '100%',
            maxHeight: '860px',
            background: '#000000',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #18181b',
            boxSizing: 'border-box'
          }}>
            {/* Top Indicator Bars */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              right: '16px',
              zIndex: 10000,
              display: 'flex',
              gap: '4px'
            }}>
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} style={{
                  flex: 1,
                  height: '4px',
                  background: idx < storySlide ? '#eab308' : idx === storySlide ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                  borderRadius: '100px',
                  overflow: 'hidden'
                }}>
                  {idx === storySlide && (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: '#eab308',
                      animation: 'storyProgress 5s linear forwards'
                    }} />
                  )}
                </div>
              ))}
            </div>

            {/* Header: Title and Close button */}
            <div style={{
              position: 'absolute',
              top: '32px',
              left: '16px',
              right: '16px',
              zIndex: 10000,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CampusGroovelabText campusColor="#ffffff" groovelabColor="#fde047" /> Wrapped
              </span>
              <button 
                onClick={() => onClose()}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* STORY SLIDES */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px', boxSizing: 'border-box', color: 'white' }}>
              
              {/* SLIDE 0: INTRO */}
              {storySlide === 0 && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                  <div style={{ fontSize: '6rem', animation: 'bounce 2s infinite' }}>🎬</div>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                    Dein musikalischer Flashback!
                  </h2>
                  <p style={{ color: '#a1a1aa', fontSize: '1rem', fontWeight: 500 }}>
                    Schauen wir uns an, was du diesen Monat im Campus-Groovelab geleistet hast! Bist du bereit für deine Story?
                  </p>
                </div>
              )}

              {/* SLIDE 1: STATISTICS (Censored for Free, Uncensored for Premium) */}
              {storySlide === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ background: '#eab308', color: '#09090b', fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fokus &amp; Übung</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '12px' }}>Deine Meilensteine</h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Focus Minutes Card */}
                    <div style={{ background: '#09090b', border: '1px solid #27272a', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <Clock size={36} color="#eab308" />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800 }}>Fokus-Zeit</div>
                        <div 
                          className={!wrappedData.isPremium ? 'blur-md text-2xl font-black text-white select-none' : 'text-2xl font-black text-white'}
                        >
                          {wrappedData.isPremium ? `${wrappedData.monthlyFlashback.focusMinutes} Minuten` : '9999 Minuten'}
                        </div>
                      </div>
                    </div>

                    {/* Mastered Songs Card */}
                    <div style={{ background: '#09090b', border: '1px solid #27272a', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <BookOpen size={36} color="#34a853" />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800 }}>Gemeisterte Songs</div>
                        <div 
                          className={!wrappedData.isPremium ? 'blur-md text-2xl font-black text-white select-none' : 'text-2xl font-black text-white'}
                        >
                          {wrappedData.isPremium ? `${wrappedData.monthlyFlashback.masteredSongsCount} Songs` : '88 Songs'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!wrappedData.isPremium && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px', borderRadius: '16px', color: '#ef4444', fontSize: '0.78rem' }}>
                      <EyeOff size={16} />
                      <span>Statistiken ausgeblendet. Upgrade auf Premium erforderlich!</span>
                    </div>
                  )}
                </div>
              )}

              {/* SLIDE 2: AVATAR SHOWCASE (Grayscale for Free, 3D/Color for Premium) */}
              {storySlide === 2 && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                  <div>
                    <span style={{ background: '#34a853', color: 'white', fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Übe-Stufe &amp; Status</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '12px' }}>Dein Avatar-Status</h2>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <div 
                      className={!wrappedData.isPremium ? 'grayscale w-40 h-40 rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center overflow-hidden' : 'w-40 h-40 rounded-full bg-indigo-950/40 border-4 border-indigo-500 flex items-center justify-center overflow-hidden animate-pulse'}
                    >
                      <span style={{ fontSize: '5.5rem' }}>
                        {avatar.instrument_type === 'guitarist' ? '🎸' : avatar.instrument_type === 'drummer' ? '🥁' : avatar.instrument_type === 'keyboardist' ? '🎹' : '🎤'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                      {wrappedData.isPremium ? resolvedLevelTitle.split(' (')[0] : 'Analoger Schüler (Silhouette)'}
                    </h3>
                    <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '6px' }}>
                      {wrappedData.isPremium 
                        ? `Übe-Stufe ${currentLevel} erreicht!`
                        : 'Kostenlose Profile bleiben eingeschränkt. Aktiviere dein Profil für den vollen Funktionsumfang!'
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* SLIDE 3: BADGES & VIRAL QR SHARE */}
              {storySlide === 3 && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>
                      {wrappedData.isPremium ? 'Sammle dein Badge!' : 'Hol dir die Vollversion'}
                    </h2>
                    <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '6px' }}>
                      {wrappedData.isPremium ? 'Hier ist dein exklusives Monats-Badge:' : 'Upgrade für nur 0,49 € / Monat!'}
                    </p>
                  </div>

                  {wrappedData.isPremium ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                      <div style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)' }}>
                        <Trophy size={36} color="white" />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fbbf24' }}>
                        {wrappedData.monthlyFlashback.badgeName}
                      </span>

                      {/* Viral QR Code Generator */}
                      <div style={{ background: 'white', padding: '10px', borderRadius: '16px', marginTop: '8px', boxShadow: '0 10px 30px rgba(255,255,255,0.05)' }}>
                        <QRCode value={`https://groovelab.app/join?ref=${studentId}`} size={100} />
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#71717a' }}>Virale Partner-ID: ref={studentId}</span>

                      {/* One click Family / Link Share */}
                      <button 
                        type="button"
                        onClick={async () => {
                          const shareText = `Schau mal! Mein GrooveLab Rückblick diesen Monat: Ich war ${wrappedData.monthlyFlashback.focusMinutes} Minuten fokussiert und habe mein ${wrappedData.monthlyFlashback.badgeName} freigeschaltet! Musik machen ist genial!`;
                          const shareUrl = `https://groovelab.app/join?ref=${studentId}`;
                          if (navigator.share) {
                            try {
                              await navigator.share({ title: 'GrooveLab Rückblick', text: shareText, url: shareUrl });
                              return;
                            } catch (e) {}
                          }
                          try {
                            await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                            alert('Erfolg in Zwischenablage kopiert! Bereit zum Teilen mit der Familie.');
                          } catch (e) {}
                        }}
                        style={{ background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', padding: '14px 28px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)' }}
                      >
                        <Share2 size={16} /> Erfolg mit Familie teilen
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#27272a', border: '2px dashed #3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={32} color="#71717a" />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#a1a1aa' }}>Badge gesperrt</span>

                      {/* Upgrade request trigger */}
                      <button 
                        type="button"
                        onClick={() => {
                          alert('Möchtest du dein Konto erweitern? Bitte wende dich einfach an das Sekretariat oder die Schulleitung deiner Musikschule.');
                        }}
                        style={{ background: '#fbbf24', color: '#09090b', border: 'none', cursor: 'pointer', padding: '14px 28px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}
                      >
                        <Zap size={16} /> Upgrade bei Musikschule anfragen
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Story Navigation Tabs Bottom */}
            <div style={{
              display: 'flex',
              padding: '16px',
              borderTop: '1px solid #18181b',
              background: '#09090b',
              gap: '8px'
            }}>
              <button 
                onClick={() => setStorySlide(prev => Math.max(0, prev - 1))}
                disabled={storySlide === 0}
                style={{ flex: 1, background: '#18181b', border: '1px solid #27272a', color: 'white', padding: '12px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: storySlide === 0 ? 0.5 : 1 }}
              >
                Zurück
              </button>
              
              <button 
                onClick={() => {
                  if (storySlide === 3) {
                    onClose();
                  } else {
                    setStorySlide(prev => Math.min(3, prev + 1));
                  }
                }}
                style={{ flex: 2, background: '#eab308', border: 'none', color: '#09090b', padding: '12px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 900, cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {storySlide === 3 ? 'Schließen' : 'Weiter'}
              </button>
            </div>
          </div>
        </div>
      
  );
};
