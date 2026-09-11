import React, { Suspense, lazy, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, BookOpen, Music, Loader2 } from "lucide-react";
import { getSchoolYearString } from "../studentDateUtils";

const Confetti = lazy(() => import("react-confetti"));

export interface StudentStickerAwardCelebrationModalProps {
  sticker: any;
  actualStudentName?: string;
  studentInstrument?: string | null;
  schoolName?: string;
  selectedSchoolYear?: string;
  topicName?: string;
  onDownloadJpg: (sticker: any, topicOverride?: string) => void;
  onStickInAlbum: () => void;
}

export const StudentStickerAwardCelebrationModal: React.FC<StudentStickerAwardCelebrationModalProps> = ({
  sticker,
  actualStudentName = 'Musiker',
  studentInstrument = 'Instrumentalausbildung',
  schoolName,
  selectedSchoolYear,
  topicName,
  onDownloadJpg,
  onStickInAlbum,
}) => {
  const [tilt, setTilt] = useState<{ rx: number; ry: number; active: boolean }>({ rx: 0, ry: 0, active: false });
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Keyboard accessibility: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onStickInAlbum();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStickInAlbum]);

  if (!sticker || typeof document === "undefined") return null;

  const isLegendary = sticker.rarity === 'legendary';
  const isEpic = sticker.rarity === 'epic';
  const isRare = sticker.rarity === 'rare';
  const isSchuljahr = sticker.category === 'schuljahr';

  // Compute school year
  const syStr = getSchoolYearString();
  const yearNumber = parseInt(sticker.id?.replace('schuljahr-', '') || '1', 10) || 1;
  const syDisplay = selectedSchoolYear || syStr;

  const rarityLabel = sticker.rarityLabel || (isLegendary ? 'Legendär' : isEpic ? 'Episch' : isRare ? 'Selten' : 'Standard');
  const rarityHeader = isSchuljahr
    ? `⭐ ${rarityLabel.toUpperCase()} • AUSBILDUNGSSTUFE #${yearNumber}`
    : `⭐ ${rarityLabel.toUpperCase()} • SCHULJAHR ${syDisplay}`;

  // Slanted Ribbon
  const ribbonText = isSchuljahr ? 'ABSOLVIERT!' : 'GEMEISTERT!';
  const ribbonBg = isLegendary || isSchuljahr
    ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'
    : isEpic
      ? 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)'
      : 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)';

  // Border & Glow Accents
  const borderColor = isLegendary || isSchuljahr
    ? 'rgba(250, 204, 21, 0.85)'
    : isEpic
      ? 'rgba(192, 132, 252, 0.85)'
      : 'rgba(52, 168, 83, 0.85)';

  const cardGlow = isLegendary || isSchuljahr
    ? 'rgba(250, 204, 21, 0.28)'
    : isEpic
      ? 'rgba(168, 85, 247, 0.22)'
      : 'rgba(52, 168, 83, 0.25)';

  const sunburstRayColor = isLegendary || isSchuljahr
    ? 'rgba(250, 204, 21, 0.24)'
    : isEpic
      ? 'rgba(192, 132, 252, 0.22)'
      : 'rgba(52, 168, 83, 0.25)';

  // School name resolution
  const resolvedSchool = schoolName || (typeof window !== 'undefined'
    ? (localStorage.getItem('groovelab_school_name') || localStorage.getItem('campus_school_name') || 'CAMPUS-GROOVELAB AKADEMIE')
    : 'CAMPUS-GROOVELAB AKADEMIE');

  const cleanStickerId = String(sticker.id || 'STICKER').toUpperCase().replace(/[^A-Z0-9]/g, '');

  // 3D Pointer Move Handler
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = (x / rect.width - 0.5) * 2; // -1 to 1
    const py = (y / rect.height - 0.5) * 2; // -1 to 1
    setTilt({ rx: -py * 14, ry: px * 14, active: true });
  };

  const handlePointerLeave = () => {
    setTilt({ rx: 0, ry: 0, active: false });
  };

  const cleanTopicName = (topicName && topicName !== 'Simulation' && topicName !== 'Allgemein') ? topicName : undefined;
  const isSongSticker = sticker.category === 'songs' || sticker.id === 'song-master' || Boolean(cleanTopicName);
  const displayTopic = cleanTopicName || (isSongSticker ? 'Song gemeistert' : null);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      if (cardRef.current) {
        const cardEl = cardRef.current;
        const origTransform = cardEl.style.transform;
        const origTransition = cardEl.style.transition;
        const origAnimation = cardEl.style.animation;

        // Temporarily reset 3D tilt & motion for a clean flat high-res snapshot
        cardEl.style.transform = 'none';
        cardEl.style.transition = 'none';
        cardEl.style.animation = 'none';

        // Measure un-tilted bounding rects
        const cardRect = cardEl.getBoundingClientRect();
        const imgEl = cardEl.querySelector('.sticker-spinning-asset img') as HTMLImageElement | null;
        const imgRect = imgEl ? imgEl.getBoundingClientRect() : null;

        // Temporarily hide moving glint overlay
        const glint = cardEl.querySelector('.holo-glint') as HTMLElement | null;
        const origGlintDisplay = glint ? glint.style.display : '';
        if (glint) glint.style.display = 'none';

        const { toCanvas } = await import('html-to-image');
        const canvas = await toCanvas(cardEl, {
          quality: 0.98,
          pixelRatio: 3,
          backgroundColor: '#080d18'
        });

        // Restore styles immediately
        cardEl.style.transform = origTransform;
        cardEl.style.transition = origTransition;
        cardEl.style.animation = origAnimation;
        if (glint) glint.style.display = origGlintDisplay;

        // Direct 2D Canvas compositing for the sticker image:
        // Overcomes WebKit/Safari SVG foreignObject <img> omission bug!
        const ctx = canvas.getContext('2d');
        if (ctx && imgEl && imgRect && cardRect.width > 0) {
          const scale = canvas.width / cardRect.width;
          const drawX = (imgRect.left - cardRect.left) * scale;
          const drawY = (imgRect.top - cardRect.top) * scale;
          const drawW = imgRect.width * scale;
          const drawH = imgRect.height * scale;
          const radius = 24 * scale;

          // 1. Soft backing shadow
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
          ctx.shadowBlur = 24 * scale;
          ctx.shadowOffsetY = 12 * scale;
          ctx.fillStyle = '#080d18';
          ctx.beginPath();
          if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(drawX, drawY, drawW, drawH, radius);
          } else {
            ctx.rect(drawX, drawY, drawW, drawH);
          }
          ctx.fill();
          ctx.restore();

          // 2. Clipped rounded sticker image
          ctx.save();
          ctx.beginPath();
          if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(drawX, drawY, drawW, drawH, radius);
          } else {
            ctx.rect(drawX, drawY, drawW, drawH);
          }
          ctx.clip();

          if (imgEl.complete && imgEl.naturalWidth > 0) {
            ctx.drawImage(imgEl, drawX, drawY, drawW, drawH);
          } else {
            const fallbackImg = new Image();
            await new Promise<void>((resolve) => {
              fallbackImg.onload = () => {
                ctx.drawImage(fallbackImg, drawX, drawY, drawW, drawH);
                resolve();
              };
              fallbackImg.onerror = () => resolve();
              fallbackImg.src = imgEl.src;
            });
          }
          ctx.restore();
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
        const cleanFilename = (cleanTopicName || sticker.title || 'sticker')
          .toLowerCase()
          .replace(/[^a-z0-9]/gi, '_');
        const link = document.createElement('a');
        link.download = `campus_sticker_${cleanFilename}.jpg`;
        link.href = dataUrl;
        link.click();
        return;
      }
    } catch (err) {
      console.warn('[StudentStickerAwardCelebrationModal] Direct canvas capture error, using canvas fallback:', err);
    } finally {
      setIsDownloading(false);
    }

    // Fallback if cardRef not ready or toCanvas threw an error
    onDownloadJpg(sticker, cleanTopicName);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sticker freigeschaltet"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at 50% 45%, rgba(15, 23, 42, 0.92) 0%, rgba(3, 5, 9, 0.96) 100%)',
        backdropFilter: 'blur(20px)',
        zIndex: 100000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        overflowY: 'auto',
        animation: 'fadeInOverlay 0.3s ease-out'
      }}
    >
      <Suspense fallback={null}>
        <Confetti recycle={false} numberOfPieces={350} gravity={0.22} />
      </Suspense>

      {/* 🌟 KREISENDE SONNENSTRAHLEN-AURA (GOD RAYS / SUNBURST) */}
      <div
        className="sunburst-aura"
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: '750px',
          height: '750px',
          borderRadius: '50%',
          background: `conic-gradient(from 0deg, 
            transparent 0deg, ${sunburstRayColor} 12deg, transparent 24deg, 
            transparent 36deg, ${sunburstRayColor} 48deg, transparent 60deg,
            transparent 72deg, ${sunburstRayColor} 84deg, transparent 96deg,
            transparent 108deg, ${sunburstRayColor} 120deg, transparent 132deg,
            transparent 144deg, ${sunburstRayColor} 156deg, transparent 168deg,
            transparent 180deg, ${sunburstRayColor} 192deg, transparent 204deg,
            transparent 216deg, ${sunburstRayColor} 228deg, transparent 240deg,
            transparent 252deg, ${sunburstRayColor} 264deg, transparent 276deg,
            transparent 288deg, ${sunburstRayColor} 300deg, transparent 312deg,
            transparent 324deg, ${sunburstRayColor} 336deg, transparent 348deg, transparent 360deg)`,
          WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,0.85) 20%, transparent 68%)',
          maskImage: 'radial-gradient(circle, rgba(0,0,0,0.85) 20%, transparent 68%)',
          opacity: 0.65,
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'rotateSunburst 26s linear infinite'
        }}
      />

      {/* 3D PERSPECTIVE STAGE */}
      <div
        style={{
          perspective: '1200px',
          zIndex: 1,
          width: '100%',
          maxWidth: '430px',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        {/* 🏆 DIE ECHTE SAMMLER-KARTE (HERO 3D COLLECTOR PLAQUE) */}
        <div
          ref={cardRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="sticker-animated-card"
          style={{
            position: 'relative',
            width: '100%',
            borderRadius: '34px',
            background: 'linear-gradient(180deg, #131c2e 0%, #0f1728 45%, #080d18 100%)',
            border: `3px solid ${borderColor}`,
            boxShadow: `0 25px 65px -10px rgba(0, 0, 0, 0.9), 0 0 35px ${cardGlow}`,
            padding: '28px 22px 24px 22px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            overflow: 'hidden',
            cursor: 'grab',
            userSelect: 'none',
            transform: tilt.active
              ? `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(1.02)`
              : 'perspective(1200px) rotateX(0deg) rotateY(0deg)',
            transition: tilt.active ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transformStyle: 'preserve-3d'
          }}
        >
          {/* HOLOGRAPHIC FOIL SHINE OVERLAY */}
          <div
            className="holo-glint"
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '-100%',
              background: 'linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.18) 50%, transparent 60%)',
              pointerEvents: 'none',
              zIndex: 10,
              animation: 'holoGlint 4.2s ease-in-out infinite'
            }}
          />

          {/* INNER HAIRLINE FRAME */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '10px',
              borderRadius: '26px',
              border: '1px solid rgba(255, 255, 255, 0.11)',
              pointerEvents: 'none'
            }}
          />

          {/* 4 PRECISION ARTISAN CORNER BRACKETS */}
          <div aria-hidden="true" style={{ position: 'absolute', top: '16px', left: '16px', width: '16px', height: '16px', borderTop: `2.5px solid ${borderColor}`, borderLeft: `2.5px solid ${borderColor}`, pointerEvents: 'none' }} />
          <div aria-hidden="true" style={{ position: 'absolute', top: '16px', right: '16px', width: '16px', height: '16px', borderTop: `2.5px solid ${borderColor}`, borderRight: `2.5px solid ${borderColor}`, pointerEvents: 'none' }} />
          <div aria-hidden="true" style={{ position: 'absolute', bottom: '16px', left: '16px', width: '16px', height: '16px', borderBottom: `2.5px solid ${borderColor}`, borderLeft: `2.5px solid ${borderColor}`, pointerEvents: 'none' }} />
          <div aria-hidden="true" style={{ position: 'absolute', bottom: '16px', right: '16px', width: '16px', height: '16px', borderBottom: `2.5px solid ${borderColor}`, borderRight: `2.5px solid ${borderColor}`, pointerEvents: 'none' }} />

          {/* 1. MICRO EDITION HEADER */}
          <div style={{ fontSize: '0.66rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
            ✦ OFFIZIELLES SAMMLER-ZERTIFIKAT • CAMPUS-GROOVELAB ✦
          </div>

          {/* 2. RARITY & SCHULJAHR STAMP */}
          <div style={{ fontSize: '0.82rem', fontWeight: 900, color: borderColor, letterSpacing: '0.04em', marginBottom: '14px' }}>
            {rarityHeader}
          </div>

          {/* 3. SLANTED 3D RIBBON "GEMEISTERT!" */}
          <div
            style={{
              background: ribbonBg,
              color: '#ffffff',
              padding: '7px 28px',
              borderRadius: '100px',
              fontWeight: 950,
              fontSize: '1.08rem',
              letterSpacing: '0.04em',
              transform: 'rotate(-2deg)',
              boxShadow: '0 8px 18px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
              border: '1.5px solid rgba(255, 255, 255, 0.35)',
              marginBottom: '18px',
              zIndex: 2
            }}
          >
            {ribbonText}
          </div>

          {/* 4. DIE-CUT VINYL STICKER PRESENTATION (ZENTRALE TROPHÄE) */}
          <div
            style={{
              position: 'relative',
              width: '180px',
              height: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
              zIndex: 2
            }}
          >
            {/* Backlight Pedestal Glow */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${cardGlow} 0%, rgba(0,0,0,0) 70%)`,
                filter: 'blur(8px)',
                zIndex: 0
              }}
            />

            {/* Die-Cut Floating Sticker Asset */}
            <div
              className="sticker-spinning-asset"
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
                filter: 'drop-shadow(0 16px 28px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.15))'
              }}
            >
              <img
                src={`/stickers/${sticker.id}.png?v=1`}
                alt={sticker.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '24px'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const span = document.createElement('span');
                    span.style.fontSize = '5.5rem';
                    span.innerText = sticker.emoji || '🏆';
                    parent.appendChild(span);
                  }
                }}
              />
            </div>
          </div>

          {/* 5. STUDENT DETAILS TYPOGRAPHY */}
          <div style={{ zIndex: 2, width: '100%' }}>
            <h2
              style={{
                fontSize: '1.72rem',
                fontWeight: 950,
                color: '#ffffff',
                margin: '0 0 3px 0',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '-0.02em',
                textShadow: '0 4px 12px rgba(0, 0, 0, 0.6)'
              }}
            >
              {actualStudentName}
            </h2>

            {studentInstrument && (
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  color: '#94a3b8',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '10px'
                }}
              >
                ✦ {studentInstrument.toUpperCase()} • INSTRUMENTALAUSBILDUNG ✦
              </div>
            )}

            <div
              style={{
                fontSize: '1.38rem',
                fontStyle: 'italic',
                fontWeight: 950,
                color: borderColor,
                letterSpacing: '-0.01em',
                marginBottom: '4px'
              }}
            >
              {sticker.title.toUpperCase()}
            </div>

            {displayTopic ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(254, 240, 138, 0.12)',
                  border: '1px solid rgba(254, 240, 138, 0.25)',
                  padding: '4px 14px',
                  borderRadius: '100px',
                  color: '#fef08a',
                  fontWeight: 850,
                  fontSize: '0.88rem',
                  margin: '4px 0 14px 0'
                }}
              >
                <Music size={13} /> {displayTopic}
              </div>
            ) : (
              <p
                style={{
                  fontSize: '0.84rem',
                  color: '#cbd5e1',
                  fontWeight: 650,
                  margin: '2px 0 14px 0',
                  lineHeight: 1.35,
                  maxWidth: '340px'
                }}
              >
                {sticker.desc}
              </p>
            )}
          </div>

          {/* 6. AUTHORITATIVE MUSIC SCHOOL CERTIFICATION SEAL */}
          <div
            style={{
              width: '100%',
              maxWidth: '340px',
              padding: '8px 12px',
              borderRadius: '14px',
              background: 'rgba(234, 179, 8, 0.08)',
              border: '1.5px dashed rgba(234, 179, 8, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              marginBottom: '12px',
              zIndex: 2
            }}
          >
            <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#ca8a04', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              ✦ OFFIZIELL ZERTIFIZIERT DURCH ✦
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 950, color: '#fef08a', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              {resolvedSchool}
            </span>
          </div>

          {/* 7. DUAL-BRAND LOGO & MICRO HALLMARK */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.98rem', fontWeight: 950, marginBottom: '4px', zIndex: 2 }}>
            <span style={{ color: '#34a853' }}>Campus</span>
            <span style={{ color: '#94a3b8' }}>-</span>
            <span style={{ color: '#facc15' }}>Groovelab</span>
            <span style={{ color: '#64748b', fontSize: '0.86rem' }}>.de</span>
          </div>

          <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', zIndex: 2 }}>
            ✦ VERIFIZIERTE SAMMLER-EDITION • SCHULJAHR {syDisplay} • ID: CG-{cleanStickerId} ✦
          </div>
        </div>
      </div>

      {/* 🚀 ACTION BUTTONS (DIRECTLY BELOW THE 3D TROPHY PLAQUE) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
          maxWidth: '420px',
          marginTop: '20px',
          zIndex: 2
        }}
      >
        <button
          type="button"
          disabled={isDownloading}
          onClick={handleDownload}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleDownload();
            }
          }}
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '20px',
            padding: '14px 24px',
            fontWeight: 950,
            fontSize: '0.98rem',
            cursor: isDownloading ? 'wait' : 'pointer',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            opacity: isDownloading ? 0.85 : 1,
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
          className="hover-scale"
        >
          {isDownloading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Wird als Bild gerendert...</span>
            </>
          ) : (
            <>
              <Download size={20} />
              <span>Sticker als JPG herunterladen</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onStickInAlbum}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onStickInAlbum();
            }
          }}
          style={{
            background: 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '20px',
            padding: '13px 24px',
            fontWeight: 950,
            fontSize: '0.98rem',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(52, 168, 83, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
          className="hover-scale"
        >
          <BookOpen size={20} />
          <span>In mein Album kleben</span>
        </button>
      </div>

      {/* KEYFRAME ANIMATIONS & ACCESSIBILITY GUARD */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes rotateSunburst {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes holoGlint {
          0% { transform: translateX(-150%) rotate(35deg); }
          30%, 100% { transform: translateX(250%) rotate(35deg); }
        }

        .sticker-animated-card {
          animation: cardHeroEntrance 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, cardAmbientFloat 4s ease-in-out 0.85s infinite alternate;
        }

        @keyframes cardHeroEntrance {
          0% {
            opacity: 0;
            transform: perspective(1200px) scale(0.25) rotateY(540deg) translateY(40px);
          }
          65% {
            opacity: 1;
            transform: perspective(1200px) scale(1.05) rotateY(-6deg) translateY(-8px);
          }
          85% {
            transform: perspective(1200px) scale(0.98) rotateY(3deg) translateY(2px);
          }
          100% {
            opacity: 1;
            transform: perspective(1200px) scale(1) rotateY(0deg) translateY(0);
          }
        }

        @keyframes cardAmbientFloat {
          0% {
            transform: perspective(1200px) translateY(0px) rotateY(-2deg) rotateX(1.5deg);
          }
          100% {
            transform: perspective(1200px) translateY(-8px) rotateY(2deg) rotateX(-1.5deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sunburst-aura,
          .holo-glint,
          .sticker-animated-card,
          .sticker-spinning-asset {
            animation: none !important;
            transform: none !important;
          }
        }
      `}} />
    </div>,
    document.body
  );
};
