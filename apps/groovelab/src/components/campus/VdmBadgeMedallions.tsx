import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, Lock, X, Printer, Sparkles } from 'lucide-react';

export type VdmBadgeLevel = 'junior' | 'd1' | 'd2' | 'd3';

export interface VdmBadgeData {
  level: VdmBadgeLevel;
  timestamp: number;
  accuracy: number;
  predicate: string;
  discipline?: string;
  score?: number;
}

/**
 * Ermittelt das offizielle VdM-Prädikat anhand der Trefferquote
 */
export function getVdmPredicate(accuracy: number): string {
  if (accuracy >= 95) return 'Mit Auszeichnung';
  if (accuracy >= 85) return 'Mit gutem Erfolg';
  if (accuracy >= 70) return 'Bestanden';
  return 'In Vorbereitung';
}

/**
 * Gibt den offiziellen Titel des Abzeichens zurück
 */
export function getVdmBadgeTitle(level: VdmBadgeLevel, uiLevel?: 'junior' | 'teen' | 'pro'): string {
  if (uiLevel === 'junior') {
    switch (level) {
      case 'junior': return '🐣 Junior-Klangstern (Vorstufe)';
      case 'd1': return '🥉 Bronze-Stimmgabel (Stufe 1)';
      case 'd2': return '🥈 Silber-Stimmgabel (Stufe 2)';
      case 'd3': return '🥇 Gold-Stimmgabel (Stufe 3)';
    }
  }
  switch (level) {
    case 'junior': return 'Junior-Abzeichen (Musikschul-Vorstufe)';
    case 'd1': return 'Leistungsabzeichen D1 Bronze';
    case 'd2': return 'Leistungsabzeichen D2 Silber';
    case 'd3': return 'Leistungsabzeichen D3 Gold';
  }
}

/**
 * Persistiert ein bestandenes VdM-Abzeichen im LocalStorage und benachrichtigt das System
 */
export function saveVdmBadge(studentId: string, data: VdmBadgeData): void {
  if (!studentId || typeof window === 'undefined') return;
  try {
    const key = `campus_vdm_badge_${studentId}_${data.level}`;
    const existing = localStorage.getItem(key);
    if (existing) {
      const prev: VdmBadgeData = JSON.parse(existing);
      // Nur aktualisieren, wenn das neue Ergebnis gleich gut oder besser ist
      if (prev.accuracy > data.accuracy) return;
    }
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('cg_vdm_badge_awarded', {
      detail: { studentId, ...data }
    }));
  } catch (err) {
    console.warn('[VdmBadge] Could not save badge to localStorage:', err);
  }
}

/**
 * Lädt alle gespeicherten VdM-Abzeichen eines Schülers
 */
export function getVdmBadges(studentId: string): Record<VdmBadgeLevel, VdmBadgeData | null> {
  const result: Record<VdmBadgeLevel, VdmBadgeData | null> = {
    junior: null,
    d1: null,
    d2: null,
    d3: null
  };
  if (!studentId || typeof window === 'undefined') return result;

  (['junior', 'd1', 'd2', 'd3'] as VdmBadgeLevel[]).forEach(lvl => {
    try {
      const raw = localStorage.getItem(`campus_vdm_badge_${studentId}_${lvl}`);
      if (raw) {
        result[lvl] = JSON.parse(raw);
      }
    } catch {
      // Ignoriere Parsing-Fehler geräuschlos
    }
  });

  return result;
}

/**
 * 0,1% Goldstandard Vektor-SVG-Medaillon (0ms Ladezeit, Retina-scharf, CSS-Metallverläufe)
 */
export const VdmMedallionSvg: React.FC<{
  level: VdmBadgeLevel;
  isLocked?: boolean;
  size?: number;
}> = ({ level, isLocked = false, size = 56 }) => {
  const idPrefix = `vdm-grad-${level}-${Math.random().toString(36).substring(2, 7)}`;

  if (isLocked) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        style={{ display: 'block', opacity: 0.32, filter: 'grayscale(1)' }}
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="28" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3" />
        <circle cx="32" cy="32" r="22" fill="#e2e8f0" />
        <g transform="translate(24, 22) scale(0.68)">
          <path
            d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4"
            fill="none"
            stroke="#475569"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    );
  }

  // 1. JUNIOR: Sonnengelber / Pastell-Goldener Notenstern mit Notenschlüssel-Relief
  if (level === 'junior') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }} aria-hidden="true">
        <defs>
          <linearGradient id={`${idPrefix}-sun`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id={`${idPrefix}-rim`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>
          <filter id={`${idPrefix}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#f59e0b" floodOpacity="0.4" />
          </filter>
        </defs>
        {/* Äußerer Rand */}
        <circle cx="32" cy="32" r="29" fill={`url(#${idPrefix}-rim)`} filter={`url(#${idPrefix}-glow)`} />
        <circle cx="32" cy="32" r="26" fill={`url(#${idPrefix}-sun)`} />
        <circle cx="32" cy="32" r="23" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" strokeDasharray="3 2" />
        {/* 5-zackiger Notenstern */}
        <polygon
          points="32,13 36.5,23.5 48,24.5 39.5,32 42,43.5 32,37.5 22,43.5 24.5,32 16,24.5 27.5,23.5"
          fill="#ffffff"
          opacity="0.95"
        />
        {/* Zentrum: Noten-Symbol */}
        <circle cx="30" cy="31" r="2.2" fill="#b45309" />
        <circle cx="35" cy="28.5" r="2.2" fill="#b45309" />
        <path d="M32.2 31 L32.2 23 L37.2 21 L37.2 28.5" stroke="#b45309" strokeWidth="1.2" fill="none" />
      </svg>
    );
  }

  // 2. D1 BRONZE: Warme Bronze-Kupfer-Stimmgabel
  if (level === 'd1') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }} aria-hidden="true">
        <defs>
          <linearGradient id={`${idPrefix}-bronze`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="35%" stopColor="#b45309" />
            <stop offset="70%" stopColor="#92400e" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <linearGradient id={`${idPrefix}-bronze-rim`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#451a03" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <filter id={`${idPrefix}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#78350f" floodOpacity="0.45" />
          </filter>
        </defs>
        <circle cx="32" cy="32" r="29" fill={`url(#${idPrefix}-bronze-rim)`} filter={`url(#${idPrefix}-shadow)`} />
        <circle cx="32" cy="32" r="26" fill={`url(#${idPrefix}-bronze)`} />
        <circle cx="32" cy="32" r="23" fill="none" stroke="#fde68a" strokeWidth="1.2" opacity="0.45" />
        {/* VdM-Stimmgabel in Bronze-Relief */}
        <g stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* U-Zinken */}
          <path d="M26 15 L26 27 C26 31 38 31 38 27 L38 15" />
          {/* Schaft */}
          <line x1="32" y1="31" x2="32" y2="44" />
        </g>
        {/* End-Knauf */}
        <circle cx="32" cy="46" r="3" fill="#ffffff" />
        {/* D1 Aufdruck */}
        <rect x="23" y="22" width="18" height="9" rx="3" fill="#78350f" opacity="0.9" />
        <text x="32" y="28.8" textAnchor="middle" fill="#fde68a" fontSize="6.5" fontWeight="950" fontFamily="sans-serif">
          D1
        </text>
      </svg>
    );
  }

  // 3. D2 SILBER: Sterling-Silber Stimmgabel mit 45°-Lichtreflex
  if (level === 'd2') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }} aria-hidden="true">
        <defs>
          <linearGradient id={`${idPrefix}-silver`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#e2e8f0" />
            <stop offset="70%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id={`${idPrefix}-silver-rim`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <filter id={`${idPrefix}-silver-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#475569" floodOpacity="0.4" />
          </filter>
        </defs>
        <circle cx="32" cy="32" r="29" fill={`url(#${idPrefix}-silver-rim)`} filter={`url(#${idPrefix}-silver-glow)`} />
        <circle cx="32" cy="32" r="26" fill={`url(#${idPrefix}-silver)`} />
        <circle cx="32" cy="32" r="23" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.75" />
        {/* VdM-Stimmgabel in Silber-Relief */}
        <g stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M26 15 L26 27 C26 31 38 31 38 27 L38 15" />
          <line x1="32" y1="31" x2="32" y2="44" />
        </g>
        <circle cx="32" cy="46" r="3" fill="#ffffff" />
        <rect x="23" y="22" width="18" height="9" rx="3" fill="#1e293b" opacity="0.88" />
        <text x="32" y="28.8" textAnchor="middle" fill="#ffffff" fontSize="6.5" fontWeight="950" fontFamily="sans-serif">
          D2
        </text>
      </svg>
    );
  }

  // 4. D3 GOLD: 24k Kaiserliches Gold mit Lorbeerkranz
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }} aria-hidden="true">
      <defs>
        <linearGradient id={`${idPrefix}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="25%" stopColor="#fde047" />
          <stop offset="60%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id={`${idPrefix}-gold-rim`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="50%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#fffbeb" />
        </linearGradient>
        <filter id={`${idPrefix}-gold-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#d97706" floodOpacity="0.5" />
        </filter>
      </defs>
      <circle cx="32" cy="32" r="29" fill={`url(#${idPrefix}-gold-rim)`} filter={`url(#${idPrefix}-gold-glow)`} />
      <circle cx="32" cy="32" r="26" fill={`url(#${idPrefix}-gold)`} />
      <circle cx="32" cy="32" r="23" fill="none" stroke="#fffbeb" strokeWidth="1.2" opacity="0.85" />
      {/* VdM-Stimmgabel in Gold-Relief */}
      <g stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M26 15 L26 27 C26 31 38 31 38 27 L38 15" />
        <line x1="32" y1="31" x2="32" y2="44" />
      </g>
      <circle cx="32" cy="46" r="3" fill="#ffffff" />
      {/* Lorbeer-Kranz Blätter an den Seiten */}
      <path d="M19 25 C17 32 20 40 25 43" stroke="#fffbeb" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d="M45 25 C47 32 44 40 39 43" stroke="#fffbeb" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.75" />
      <rect x="23" y="22" width="18" height="9" rx="3" fill="#78350f" opacity="0.9" />
      <text x="32" y="28.8" textAnchor="middle" fill="#fef08a" fontSize="6.5" fontWeight="950" fontFamily="sans-serif">
        D3
      </text>
    </svg>
  );
};

/**
 * Digitale VdM-Prüfungsurkunde als modales Dialogblatt
 */
export const VdmCertificateModal: React.FC<{
  badge: VdmBadgeData;
  studentName?: string;
  instrument?: string;
  schoolName?: string;
  onClose: () => void;
}> = ({ badge, studentName = 'Schüler:in', instrument = 'Instrument', schoolName = 'Musikschule', onClose }) => {
  const dateStr = new Date(badge.timestamp).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="VdM Prüfungsurkunde"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 11000,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#faf8f2',
          backgroundImage: 'radial-gradient(#e5e0d4 0.75px, transparent 0.75px)',
          backgroundSize: '16px 16px',
          width: '100%',
          maxWidth: '480px',
          borderRadius: '20px',
          border: '2px solid #d4cebe',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%'
          }}
          aria-label="Schließen"
        >
          <X size={20} />
        </button>

        {/* Kopfzeile Urkunde (100% neutral & rechtssicher) */}
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#78350f', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
          Campus Leistungsnachweis • Gehörbildung
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 950, color: '#0f172a', margin: '0 0 4px 0' }}>
          Prüfungs-Zertifikat
        </h2>
        <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 650, marginBottom: '10px' }}>
          Musikschul-D-Stufen • Gehörbildung & Musiklehre
        </div>

        {/* Medaillon im Großformat */}
        <div style={{ margin: '8px 0 16px 0' }}>
          <VdmMedallionSvg level={badge.level} size={88} />
        </div>

        {/* Verleihungstext */}
        <p style={{ fontSize: '0.85rem', color: '#334155', margin: '0 0 8px 0', lineHeight: 1.5 }}>
          Hiermit wird bescheinigt, dass
        </p>
        <div style={{ fontSize: '1.25rem', fontWeight: 950, color: '#0f172a', marginBottom: '4px' }}>
          {studentName}
        </div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginBottom: '14px' }}>
          Fach: {instrument} • {schoolName}
        </div>

        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '12px',
          padding: '10px 16px',
          width: '100%',
          boxSizing: 'border-box',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#0f172a', marginBottom: '2px' }}>
            {getVdmBadgeTitle(badge.level)}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16a34a' }}>
            Prädikat: {badge.predicate} ({badge.accuracy}% Trefferquote)
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Ausgestellt am {dateStr}
          </div>
        </div>

        {/* Fußzeile mit Unterschriftenlinie */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '8px', padding: '0 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '110px', height: '1px', background: '#94a3b8', marginBottom: '4px' }} />
            <span style={{ fontSize: '0.64rem', color: '#64748b' }}>Fachlehrkraft</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '110px', height: '1px', background: '#94a3b8', marginBottom: '4px' }} />
            <span style={{ fontSize: '0.64rem', color: '#64748b' }}>Schulleitung</span>
          </div>
        </div>

        {/* Rechtlicher Transparenz-Hinweis (100% neutral & rechtssicher) */}
        <div style={{ fontSize: '0.60rem', color: '#94a3b8', marginTop: '14px', lineHeight: 1.35, maxWidth: '400px' }}>
          Hinweis: Dieses digitale Zertifikat dient der didaktischen Lernkontrolle und Vorbereitung auf Musikschul-Leistungsprüfungen.
        </div>

        {/* Aktionen */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid #d4cebe',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <Printer size={15} />
            <span>Urkunde drucken</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 0,1% Goldstandard Auszeichnungs-Vitrine für „Meine Meisterwerke“
 * Horizontale 4er-Samt-Vitrine mit haptischen VdM-Medaillons
 */
export const VdmShowcaseVitrine: React.FC<{
  studentId: string;
  studentName?: string;
  instrument?: string;
  schoolName?: string;
  uiLevel?: 'junior' | 'teen' | 'pro';
  isMobile?: boolean;
  layout?: 'row' | 'grid2x2';
}> = ({ studentId, studentName, instrument, schoolName, uiLevel = 'teen', isMobile = false, layout = 'grid2x2' }) => {
  const [badges, setBadges] = useState<Record<VdmBadgeLevel, VdmBadgeData | null>>({
    junior: null,
    d1: null,
    d2: null,
    d3: null
  });
  const [selectedBadgeForCert, setSelectedBadgeForCert] = useState<VdmBadgeData | null>(null);

  const loadBadges = () => {
    if (!studentId) return;
    setBadges(getVdmBadges(studentId));
  };

  useEffect(() => {
    loadBadges();
    const handleBadgeAwarded = (e: any) => {
      if (e.detail?.studentId === studentId) {
        loadBadges();
      }
    };
    window.addEventListener('cg_vdm_badge_awarded', handleBadgeAwarded);
    return () => {
      window.removeEventListener('cg_vdm_badge_awarded', handleBadgeAwarded);
    };
  }, [studentId]);

  const levelConfigs: { key: VdmBadgeLevel; title: string; subtitle: string }[] = [
    { key: 'junior', title: 'Junior', subtitle: 'Vorstufe' },
    { key: 'd1', title: 'D1 Bronze', subtitle: 'Unterstufe' },
    { key: 'd2', title: 'D2 Silber', subtitle: 'Mittelstufe' },
    { key: 'd3', title: 'D3 Gold', subtitle: 'Oberstufe' }
  ];

  const earnedCount = Object.values(badges).filter(Boolean).length;

  return (
    <div style={{
      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      border: '1.5px solid #e2e8f0',
      borderRadius: '18px',
      padding: layout === 'grid2x2' ? '14px 14px' : (isMobile ? '12px 10px' : '16px 20px'),
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
      boxSizing: 'border-box',
      width: '100%',
      marginBottom: layout === 'grid2x2' ? '0' : '16px'
    }}>
      {/* Header der Vitrine */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Award size={16} strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Leistungsabzeichen • Gehörbildung
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Musikschul-D-Stufen (Junior bis D3)
            </div>
          </div>
        </div>

        <div style={{
          padding: '4px 10px',
          borderRadius: '20px',
          background: earnedCount > 0 ? '#ecfdf5' : '#f1f5f9',
          border: `1px solid ${earnedCount > 0 ? '#a7f3d0' : '#e2e8f0'}`,
          fontSize: '0.70rem',
          fontWeight: 800,
          color: earnedCount > 0 ? '#059669' : '#64748b'
        }}>
          {earnedCount} von 4 gemeistert
        </div>
      </div>

      {/* 4er Medaillons Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: layout === 'grid2x2' ? 'repeat(2, 1fr)' : (isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'),
        gap: layout === 'grid2x2' ? '10px' : (isMobile ? '6px' : '12px')
      }}>
        {levelConfigs.map(cfg => {
          const badgeData = badges[cfg.key];
          const isMastered = Boolean(badgeData);

          return (
            <div
              key={cfg.key}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (badgeData) {
                  setSelectedBadgeForCert(badgeData);
                }
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && badgeData) {
                  e.preventDefault();
                  setSelectedBadgeForCert(badgeData);
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: layout === 'grid2x2' ? '12px 6px' : (isMobile ? '8px 4px' : '12px 8px'),
                borderRadius: '14px',
                background: isMastered ? '#ffffff' : '#f8fafc',
                border: isMastered ? '1.5px solid #cbd5e1' : '1px dashed #cbd5e1',
                boxShadow: isMastered ? '0 4px 12px rgba(0, 0, 0, 0.05)' : 'none',
                cursor: isMastered ? 'pointer' : 'default',
                transition: 'all 0.18s ease',
                textAlign: 'center',
                userSelect: 'none',
                position: 'relative'
              }}
              title={badgeData ? `${cfg.title}: ${badgeData.predicate} (${badgeData.accuracy}%) • Klicken für Urkunde` : `${cfg.title}: Noch nicht abgelegt • Im Gehörtraining freischalten`}
            >
              {isMastered && (
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  color: '#16a34a'
                }}>
                  <CheckCircle2 size={14} strokeWidth={2.6} />
                </div>
              )}

              <div style={{ marginBottom: '6px' }}>
                <VdmMedallionSvg level={cfg.key} isLocked={!isMastered} size={layout === 'grid2x2' ? 46 : (isMobile ? 44 : 52)} />
              </div>

              <div style={{ fontSize: isMobile ? '0.70rem' : '0.78rem', fontWeight: 900, color: isMastered ? '#0f172a' : '#64748b' }}>
                {cfg.title}
              </div>
              <div style={{ fontSize: '0.62rem', color: isMastered ? '#16a34a' : '#94a3b8', fontWeight: 700 }}>
                {badgeData ? `${badgeData.accuracy}% • ${badgeData.predicate}` : cfg.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      {/* Neutrale Fußzeile (Rechtssicher) */}
      <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '10px', textAlign: 'center', fontWeight: 650 }}>
        Didaktische D-Leistungsstufen zur Vorbereitung auf Musikschul-Prüfungen (Junior, D1 Bronze, D2 Silber, D3 Gold).
      </div>

      {/* Urkunden-Modal bei Klick */}
      {selectedBadgeForCert && (
        <VdmCertificateModal
          badge={selectedBadgeForCert}
          studentName={studentName}
          instrument={instrument}
          schoolName={schoolName}
          onClose={() => setSelectedBadgeForCert(null)}
        />
      )}
    </div>
  );
};
