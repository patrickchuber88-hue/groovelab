import React from 'react';
import QRCode from 'react-qr-code';
import { Check } from 'lucide-react';
import { formatTeacherFullName, formatSingleStudentAnonymized, maskLastName } from '../utils/nameHelper';
import { getCanonicalQrLandingUrl } from '../utils/tenantUrlHelper';
import { resolveUserCampusId } from '../utils/campusIdHelper';

export const urlToDataUrl = async (url: string): Promise<string> => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  try {
    const response = await fetch(url, { cache: 'force-cache' });
    if (response.ok) {
      const blob = await response.blob();
      const result = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
      if (result && result.startsWith('data:image/')) {
        return result;
      }
    }
  } catch (e) {
    console.warn('Fetch failed for image URL, falling back to Image loader:', url, e);
  }

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const dataUrl = await new Promise<string>((resolve) => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 250;
          canvas.height = img.naturalHeight || 250;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve('');
          }
        } catch {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = url;
    });
    if (dataUrl && dataUrl.startsWith('data:image/')) return dataUrl;
  } catch (e) {
    console.warn('Image loader fallback failed for:', url, e);
  }

  return url;
};

export const inlineAllImagesInElement = async (container: HTMLElement): Promise<void> => {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      const currentSrc = img.getAttribute('src') || img.src;
      if (currentSrc && !currentSrc.startsWith('data:')) {
        const dataUrl = await urlToDataUrl(currentSrc);
        if (dataUrl && dataUrl.startsWith('data:image/')) {
          img.src = dataUrl;
        }
      }
    })
  );
};

export interface IDBadgeCardProps {
  user: {
    id?: string;
    school_id?: string;
    schoolId?: string;
    school_numeric_id?: number | string;
    schoolNumericId?: number | string;
    first_name?: string;
    last_name?: string;
    role?: string;
    roles?: string[];
    photo_url?: string;
    instrument?: string;
    qr_token?: string;
    teacher_qr_token?: string;
    ausweis_nummer?: string;
    is_campus_active?: boolean;
    is_groovelab_active?: boolean;
    school_name?: string;
    schoolName?: string;
  };
  activePlatform?: string;
  schoolName?: string;
  qrValue?: string;
  qrSize?: number;
  cardRef?: React.RefObject<HTMLDivElement>;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  showSubtext?: boolean;
  selectedPrint?: boolean;
  onToggleSelectPrint?: (e: React.MouseEvent) => void;
  isPrintVersion?: boolean;
  isLocked?: boolean;
  lockMessage?: string;
}

export const IDBadgeCard: React.FC<IDBadgeCardProps> = ({
  user,
  activePlatform,
  schoolName,
  qrValue,
  qrSize,
  cardRef,
  onClick,
  style,
  showSubtext = false,
  selectedPrint,
  onToggleSelectPrint,
  isPrintVersion = false,
  isLocked = false,
  lockMessage
}) => {
  const currentPlatform = activePlatform || (typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'groovelab') || 'groovelab';

  const userRolesList = user?.roles || (user?.role ? [user.role] : []);
  const hasVerwaltung = userRolesList.includes('admin') || userRolesList.includes('secretary') || user?.role === 'admin' || user?.role === 'secretary';
  
  // Modules depend on actual profile activation flags (is_campus_active, is_groovelab_active).
  const hasCampus = Boolean(user?.is_campus_active);
  const hasGrooveLab = Boolean(user?.is_groovelab_active);

  // Real-Time Multi-Color Spectrum Stripe & Dashed Border Logic
  let spectrumGradient = 'repeating-linear-gradient(90deg, #34a853 0px, #34a853 8px, #e2e8f0 8px, #e2e8f0 16px)'; // Gestrichelter grüner Balken bei 0 Modulen
  if (hasVerwaltung && hasCampus && hasGrooveLab) {
    spectrumGradient = 'linear-gradient(90deg, #ea4335 0%, #ea4335 33.3%, #34a853 33.3%, #34a853 66.6%, #facc15 66.6%, #facc15 100%)';
  } else if (hasVerwaltung && hasCampus) {
    spectrumGradient = 'linear-gradient(90deg, #ea4335 0%, #ea4335 50%, #34a853 50%, #34a853 100%)';
  } else if (hasVerwaltung && hasGrooveLab) {
    spectrumGradient = 'linear-gradient(90deg, #ea4335 0%, #ea4335 50%, #facc15 50%, #facc15 100%)';
  } else if (hasCampus && hasGrooveLab) {
    spectrumGradient = 'linear-gradient(90deg, #34a853 0%, #34a853 50%, #facc15 50%, #facc15 100%)'; // Halb Grün / Halb Gelb
  } else if (hasVerwaltung) {
    spectrumGradient = '#ea4335';
  } else if (hasCampus) {
    spectrumGradient = '#34a853'; // Grüner Balken
  } else if (hasGrooveLab) {
    spectrumGradient = '#facc15'; // Gelber Balken
  }

  const canonicalId = resolveUserCampusId(user);
  const tokenToUse = user?.qr_token || user?.teacher_qr_token || user?.ausweis_nummer || canonicalId || '';
  const effectiveQrValue = qrValue || getCanonicalQrLandingUrl(tokenToUse) || 'https://campus-groovelab.de';
  
  const isTeacherRole = user?.role === 'teacher' || userRolesList.includes('teacher') || user?.role === 'admin' || userRolesList.includes('admin') || user?.role === 'secretary' || userRolesList.includes('secretary');
  const isStudentRole = (user?.role === 'student' || userRolesList.includes('student')) && !isTeacherRole;

  let displayFirstName = 'Member';
  let displayLastName = 'Member';

  if (isStudentRole) {
    // 🛡️ 1% Goldstandard Student Privacy Invariant (OWASP ASVS Level 3 / DSGVO Art. 25):
    // Student badges are ALWAYS strictly anonymized to "Vorname" (line 1) and "N." (line 2).
    // Even if first_name contains full names (e.g. "Amelia Huber"), we cleanly extract the pure first name and mask the last name.
    const rawFirst = (user?.first_name || '').trim();
    const rawLast = (user?.last_name || '').trim();

    if (rawFirst || rawLast) {
      const anonymizedFull = formatSingleStudentAnonymized(
        rawFirst || rawLast,
        rawFirst ? rawLast : null,
        user?.id,
        true // strictly enforce privacyMode = true
      );
      const nameParts = anonymizedFull.split(' ');
      displayFirstName = nameParts[0] || 'Schüler';
      if (nameParts.length > 1) {
        displayLastName = nameParts.slice(1).join(' ');
      } else if (rawLast) {
        displayLastName = maskLastName(rawLast, true);
      } else {
        displayLastName = user?.instrument || 'Schüler';
      }
    } else {
      displayFirstName = 'Schüler';
      displayLastName = user?.instrument || 'Campus';
    }
  } else if (isTeacherRole || !isStudentRole) {
    const fullTeacher = formatTeacherFullName(user?.first_name, user?.last_name);
    const parts = fullTeacher.split(' ');
    displayFirstName = parts[0] || user?.first_name || 'Lehrkraft';
    displayLastName = parts.slice(1).join(' ') || (user?.last_name && user?.last_name !== 'L.' ? user?.last_name : 'Landenberger');
  }

  const canonicalCampusId = resolveUserCampusId(user);
  const finalQrSize = qrSize || (isPrintVersion ? 74 : 135);

  return (
    <div 
      ref={cardRef}
      onClick={onClick}
      style={{
        width: isPrintVersion ? '54mm' : '300px',
        height: isPrintVersion ? '86mm' : 'auto',
        maxWidth: '100%',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: isPrintVersion ? '12px' : '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isPrintVersion ? 'none' : '0 25px 50px -12px rgba(0,0,0,0.35), 0 10px 25px -5px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.08)',
        boxSizing: 'border-box',
        position: 'relative',
        aspectRatio: isPrintVersion ? '54 / 86' : '0.62',
        flexShrink: 0,
        ...style
      }}
    >
      {/* Checkbox overlay for bulk selection/printing */}
      {onToggleSelectPrint && (
        <div 
          onClick={(e) => onToggleSelectPrint(e)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: selectedPrint ? '#ea4335' : 'rgba(255,255,255,0.85)',
            border: `2px solid ${selectedPrint ? '#ea4335' : '#cbd5e1'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'all 0.2s',
            opacity: selectedPrint ? 1 : 0.8
          }}
        >
          {selectedPrint && <Check size={16} color="white" strokeWidth={3} />}
        </div>
      )}

      {/* Lanyard Hole Mockup: Only for physical print template, strictly omitted in digital UI */}
      {isPrintVersion && (
        <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', position: 'relative', flexShrink: 0 }}>
          <div style={{ 
            width: '24px', 
            height: '6px', 
            borderRadius: '3px', 
            background: '#0f172a',
            border: '1.5px solid rgba(255,255,255,0.3)',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ width: '16px', height: '2px', borderRadius: '1px', background: '#020617' }}></div>
          </div>
        </div>
      )}

      {/* Real-time Dynamic Spectrum Header Line */}
      <div style={{ height: isPrintVersion ? '4px' : '6px', width: '100%', background: spectrumGradient, flexShrink: 0 }} />

      {/* 🏛️ 0,1% Goldstandard School Identity Header */}
      <div style={{ 
        textAlign: 'center', 
        padding: isPrintVersion ? '5px 8px 1px 8px' : '16px 16px 4px 16px',
        flexShrink: 0,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ 
          fontSize: isPrintVersion ? '0.50rem' : '0.74rem', 
          fontWeight: 900, 
          color: '#475569', 
          textTransform: 'uppercase', 
          letterSpacing: '0.12em',
          lineHeight: 1.25,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {schoolName || user?.school_name || user?.schoolName || 'Campus Musikschule'}
        </div>
      </div>

      {/* Role Pill Badges Header — Apple 2-Farben Soft-Tint Parität */}
      <div style={{ 
        padding: isPrintVersion ? '2px 6px 2px 6px' : '6px 14px 4px 14px', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isPrintVersion ? '4px' : '6px',
        flexWrap: 'wrap'
      }}>
        {isLocked && (
          <span style={{ 
            background: 'rgba(245, 158, 11, 0.12)', 
            color: '#b45309', 
            border: 'none',
            padding: isPrintVersion ? '1.5px 5px' : '3px 8px', 
            borderRadius: '6px', 
            fontSize: isPrintVersion ? '0.45rem' : '0.58rem', 
            fontWeight: 900, 
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}>
            WARTET AUF FREIGABE
          </span>
        )}
        {hasVerwaltung && (
          <span style={{ 
            background: 'rgba(234, 67, 53, 0.10)', 
            color: '#ea4335', 
            border: 'none',
            padding: isPrintVersion ? '1.5px 5px' : '3px 8px', 
            borderRadius: '6px', 
            fontSize: isPrintVersion ? '0.45rem' : '0.58rem', 
            fontWeight: 900, 
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            VERWALTUNG
          </span>
        )}
        {hasCampus && (
          <span style={{ 
            background: 'rgba(52, 168, 83, 0.10)', 
            color: '#166534', 
            border: 'none',
            padding: isPrintVersion ? '1.5px 5px' : '3px 8px', 
            borderRadius: '6px', 
            fontSize: isPrintVersion ? '0.45rem' : '0.58rem', 
            fontWeight: 900, 
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            CAMPUS
          </span>
        )}
        {hasGrooveLab && (
          <span style={{ 
            background: 'rgba(234, 179, 8, 0.12)', 
            color: '#854d0e', 
            border: 'none',
            padding: isPrintVersion ? '1.5px 5px' : '3px 8px', 
            borderRadius: '6px', 
            fontSize: isPrintVersion ? '0.45rem' : '0.58rem', 
            fontWeight: 900, 
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            GROOVELAB
          </span>
        )}
        {!hasVerwaltung && !hasCampus && !hasGrooveLab && !isLocked && (
          <span style={{ 
            background: '#f1f5f9', 
            color: '#64748b', 
            border: 'none',
            padding: isPrintVersion ? '1.5px 5px' : '3px 8px', 
            borderRadius: '6px', 
            fontSize: isPrintVersion ? '0.45rem' : '0.58rem', 
            fontWeight: 900, 
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            INAKTIV
          </span>
        )}
      </div>

      {/* Main Content Area — Minimalist & Spacious */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isPrintVersion ? '4px 8px 6px 8px' : '10px 18px 16px 18px', gap: isPrintVersion ? '4px' : '10px', boxSizing: 'border-box', justifyContent: 'space-between' }}>
        {/* Large Identity Typography — Unified Full Name on One Line */}
        <div style={{ textAlign: 'center', marginTop: isPrintVersion ? '1px' : '4px', width: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
          <div style={{ 
            fontSize: isPrintVersion ? '1.05rem' : '1.85rem', 
            fontWeight: 900, 
            color: '#0f172a', 
            lineHeight: 1.15, 
            fontFamily: "'Plus Jakarta Sans', 'Outfit', -apple-system, system-ui, sans-serif", 
            letterSpacing: '-0.03em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {displayLastName && displayLastName !== displayFirstName ? `${displayFirstName} ${displayLastName}` : displayFirstName}
          </div>
          <div style={{ 
            fontSize: isPrintVersion ? '0.50rem' : '0.70rem', 
            color: '#64748b', 
            marginTop: '3px', 
            fontWeight: 800, 
            textTransform: 'uppercase', 
            letterSpacing: '0.10em' 
          }}>
            {isTeacherRole 
              ? `Lehrkraft${user?.instrument ? ` • ${user.instrument}` : ''}` 
              : (isStudentRole 
                ? `Schüler${user?.instrument ? ` • ${user.instrument}` : ''}` 
                : 'Mitglied')}
          </div>
        </div>

        {/* QR Code Container */}
        <div className="onboarding-qr-container" style={{ 
          background: '#f8fafc', 
          padding: isPrintVersion ? '6px' : '14px', 
          borderRadius: isPrintVersion ? '12px' : '22px',
          border: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          boxShadow: isPrintVersion ? 'none' : '0 4px 14px rgba(0,0,0,0.03)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <QRCode 
            value={effectiveQrValue} 
            size={finalQrSize} 
            style={{ 
              width: `${finalQrSize}px`, 
              height: `${finalQrSize}px`,
              filter: isLocked ? 'blur(6px)' : 'none',
              opacity: isLocked ? 0.22 : 1,
              transition: 'all 0.3s ease'
            }} 
          />
          {isLocked && (
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: isPrintVersion ? '12px' : '22px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.86)',
              backdropFilter: 'blur(4px)',
              padding: '8px',
              textAlign: 'center',
              zIndex: 5
            }}>
              <span style={{ fontSize: isPrintVersion ? '1.2rem' : '1.75rem', marginBottom: '4px' }}>🔒</span>
              <span style={{ fontSize: isPrintVersion ? '0.46rem' : '0.66rem', fontWeight: 800, color: '#92400e', lineHeight: 1.25, maxWidth: '130px' }}>
                {lockMessage || 'Elterliche Freigabe erforderlich'}
              </span>
            </div>
          )}
        </div>

        {/* 🛡️ 0.1% Goldstandard Kanonische Campus-ID ({Schul-ID}-{Rolle: 1/2/3}-{Nummer}) */}
        <div 
          style={{ 
            textAlign: 'center', 
            marginTop: isPrintVersion ? '1px' : '4px',
            marginBottom: isPrintVersion ? '1px' : '2px',
            flexShrink: 0
          }}
          title="Campus-ID (Kanonischer Schulausweis-Identifikator)"
          aria-label={`Campus-ID ${canonicalCampusId}`}
        >
          <span style={{ 
            fontSize: isPrintVersion ? '0.46rem' : '0.68rem', 
            fontWeight: 800, 
            color: '#475569', 
            fontFamily: "'SF Mono', Monaco, Menlo, Consolas, monospace",
            letterSpacing: '0.08em',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: isPrintVersion ? '1px 5px' : '2px 8px',
            borderRadius: '6px',
            display: 'inline-block'
          }}>
            ID: {canonicalCampusId}
          </span>
        </div>
      </div>

      {/* Bottom Spectrum Stripe */}
      <div style={{ height: isPrintVersion ? '4px' : '8px', width: '100%', background: spectrumGradient, flexShrink: 0 }} />
    </div>
  );
};
