import React, { Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { MeisterOhrSticker } from "../../MeisterOhrSticker";

const Confetti = lazy(() => import("react-confetti"));

export interface StudentMatchCelebrationModalProps {
  data: {
    songTitle: string;
    matchedAt?: string;
    teacherPercent?: number;
    studentPercent?: number;
    xpAmount?: number;
  } | null;
  onClose: () => void;
}

export const StudentMatchCelebrationModal: React.FC<StudentMatchCelebrationModalProps> = ({
  data,
  onClose,
}) => {
  if (!data || typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10006,
        background: 'rgba(9, 9, 11, 0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        color: '#ffffff',
        fontFamily: '"Plus Jakarta Sans", -apple-system, system-ui, sans-serif',
        animation: 'fadeIn 0.25s ease'
      }}
    >
      <Suspense fallback={null}>
        <Confetti width={typeof window !== 'undefined' ? window.innerWidth : 400} height={typeof window !== 'undefined' ? window.innerHeight : 800} recycle={false} numberOfPieces={280} gravity={0.22} />
      </Suspense>
      <div role="dialog" aria-modal="true"
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)',
          border: '2px solid rgba(52, 168, 83, 0.45)',
          borderRadius: '28px',
          padding: '32px 24px',
          textAlign: 'center',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 50px rgba(52, 168, 83, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          position: 'relative'
        }}
      >
        <div style={{
          fontSize: '0.72rem',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#86efac',
          background: 'rgba(34, 197, 94, 0.15)',
          padding: '4px 14px',
          borderRadius: '99px',
          border: '1px solid rgba(34, 197, 94, 0.3)'
        }}>
          ✨ Live aus deinem Unterricht
        </div>

        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 950, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Song-Match geprüft! 🎯
          </h3>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#a1a1aa', lineHeight: 1.4 }}>
            Deine Lehrkraft hat dein Können für <strong style={{ color: '#ffffff' }}>{data.songTitle}</strong> gematcht!
          </p>
        </div>

        {/* Holographic 3-Tier Sticker Card */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <MeisterOhrSticker
            matchedAt={data.matchedAt}
            teacherPercent={data.teacherPercent}
            studentPercent={data.studentPercent}
            xpAmount={data.xpAmount}
            isCompact={false}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            border: 'none',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            color: '#ffffff',
            padding: '14px',
            borderRadius: '16px',
            fontSize: '0.94rem',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(22, 163, 74, 0.45)',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          className="hover-scale"
        >
          <Sparkles size={18} />
          <span>🚀 Weiter rocken!</span>
        </button>
      </div>
    </div>,
    document.body
  );
};
