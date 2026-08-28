import React from 'react';
import QRCode from 'react-qr-code';
import { Check } from 'lucide-react';
import { formatTeacherFullName } from '../utils/nameHelper';

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
    first_name?: string;
    last_name?: string;
    role?: string;
    roles?: string[];
    photo_url?: string;
    instrument?: string;
    qr_token?: string;
    is_campus_active?: boolean;
    is_groovelab_active?: boolean;
  };
  activePlatform?: string;
  qrValue?: string;
  qrSize?: number;
  cardRef?: React.RefObject<HTMLDivElement>;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  showSubtext?: boolean;
  selectedPrint?: boolean;
  onToggleSelectPrint?: (e: React.MouseEvent) => void;
  isPrintVersion?: boolean;
}

export const IDBadgeCard: React.FC<IDBadgeCardProps> = ({
  user,
  activePlatform,
  qrValue,
  qrSize,
  cardRef,
  onClick,
  style,
  showSubtext = false,
  selectedPrint,
  onToggleSelectPrint,
  isPrintVersion = false
}) => {
  const currentPlatform = activePlatform || (typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'groovelab') || 'groovelab';

  const userRolesList = user.roles || (user.role ? [user.role] : []);
  const hasVerwaltung = userRolesList.includes('admin') || userRolesList.includes('secretary') || user.role === 'admin' || user.role === 'secretary';
  
  // Modules depend on actual profile activation flags (is_campus_active, is_groovelab_active).
  const hasCampus = Boolean(user.is_campus_active);
  const hasGrooveLab = Boolean(user.is_groovelab_active);

  // Real-Time Multi-Color Spectrum Stripe & Dashed Border Logic
  let spectrumGradient = 'repeating-linear-gradient(90deg, #34a853 0px, #34a853 8px, #e2e8f0 8px, #e2e8f0 16px)'; // Gestrichelter grüner Balken bei 0 Modulen
  if (hasVerwaltung && hasCampus && hasGrooveLab) {
    spectrumGradient = 'linear-gradient(90deg, #ea4335 0%, #ea4335 33.3%, #34a853 33.3%, #34a853 66.6%, #eab308 66.6%, #eab308 100%)';
  } else if (hasVerwaltung && hasCampus) {
    spectrumGradient = 'linear-gradient(90deg, #ea4335 0%, #ea4335 50%, #34a853 50%, #34a853 100%)';
  } else if (hasVerwaltung && hasGrooveLab) {
    spectrumGradient = 'linear-gradient(90deg, #ea4335 0%, #ea4335 50%, #eab308 50%, #eab308 100%)';
  } else if (hasCampus && hasGrooveLab) {
    spectrumGradient = 'linear-gradient(90deg, #34a853 0%, #34a853 50%, #eab308 50%, #eab308 100%)'; // Halb Grün / Halb Gelb
  } else if (hasVerwaltung) {
    spectrumGradient = '#ea4335';
  } else if (hasCampus) {
    spectrumGradient = '#34a853'; // Grüner Balken
  } else if (hasGrooveLab) {
    spectrumGradient = '#eab308'; // Gelber Balken
  }

  const effectiveQrValue = qrValue || (typeof window !== 'undefined' ? `${window.location.origin}/qr/${user.qr_token || user.id || ''}` : '');
  
  const isTeacherRole = user.role === 'teacher' || userRolesList.includes('teacher') || user.role === 'admin' || userRolesList.includes('admin') || user.role === 'secretary' || userRolesList.includes('secretary');
  const isStudentRole = (user.role === 'student' || userRolesList.includes('student')) && !isTeacherRole;

  let displayFirstName = user.first_name || 'Member';
  let displayLastName = user.last_name || user.instrument || 'Member';

  if (isStudentRole && user.last_name) {
    const raw = user.last_name.trim();
    if (raw.length > 0) {
      if (raw.length === 2 && raw.endsWith('.')) {
        displayLastName = raw;
      } else {
        displayLastName = raw.charAt(0).toUpperCase() + '.';
      }
    }
  } else if (isTeacherRole || !isStudentRole) {
    const fullTeacher = formatTeacherFullName(user.first_name, user.last_name);
    const parts = fullTeacher.split(' ');
    displayFirstName = parts[0] || user.first_name || 'Lehrkraft';
    displayLastName = parts.slice(1).join(' ') || (user.last_name && user.last_name !== 'L.' ? user.last_name : 'Landenberger');
  }

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

      {/* Lanyard Hole Mockup (Centered for straight hanging) */}
      <div style={{ height: isPrintVersion ? '20px' : '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', position: 'relative', flexShrink: 0 }}>
        {/* Centered Lanyard Slot with Metallic Ring */}
        <div style={{ 
          width: isPrintVersion ? '24px' : '42px', 
          height: isPrintVersion ? '6px' : '10px', 
          borderRadius: isPrintVersion ? '3px' : '5px', 
          background: '#0f172a',
          border: '1.5px solid rgba(255,255,255,0.3)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ width: isPrintVersion ? '16px' : '28px', height: '2px', borderRadius: '1px', background: '#020617' }}></div>
        </div>
      </div>

      {/* Real-time Dynamic Spectrum Header Line */}
      <div style={{ height: isPrintVersion ? '4px' : '8px', width: '100%', background: spectrumGradient, flexShrink: 0 }} />

      {/* Role Pill Badges Header */}
      <div style={{ 
        padding: isPrintVersion ? '4px 6px 2px 6px' : '10px 14px 4px 14px', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isPrintVersion ? '4px' : '6px',
        flexWrap: 'wrap'
      }}>
        {hasVerwaltung && (
          <span style={{ 
            background: '#fce8e6', 
            color: '#ea4335', 
            border: '1px solid #fad2cf',
            padding: isPrintVersion ? '1.5px 5px' : '3px 8px', 
            borderRadius: '5px', 
            fontSize: isPrintVersion ? '0.45rem' : '0.58rem', 
            fontWeight: 1000, 
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            VERWALTUNG
          </span>
        )}
        {hasCampus && (
          <span style={{ 
            background: '#e6f4ea', 
            color: '#34a853', 
            border: '1px solid #ceebd6',
            padding: isPrintVersion ? '1.5px 5px' : '3px 8px', 
            borderRadius: '5px', 
            fontSize: isPrintVersion ? '0.45rem' : '0.58rem', 
            fontWeight: 1000, 
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            CAMPUS
          </span>
        )}
        {hasGrooveLab && (
          <span style={{ 
            background: '#fefce8', 
            color: '#ca8a04', 
            border: '1px solid #fef08a',
            padding: isPrintVersion ? '1.5px 5px' : '3px 8px', 
            borderRadius: '5px', 
            fontSize: isPrintVersion ? '0.45rem' : '0.58rem', 
            fontWeight: 1000, 
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            GROOVELAB
          </span>
        )}
        {!hasVerwaltung && !hasCampus && !hasGrooveLab && (
          <span style={{ 
            background: '#f1f5f9', 
            color: '#64748b', 
            border: '1px dashed #cbd5e1',
            padding: isPrintVersion ? '1.5px 5px' : '3px 8px', 
            borderRadius: '5px', 
            fontSize: isPrintVersion ? '0.45rem' : '0.58rem', 
            fontWeight: 1000, 
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            INAKTIV
          </span>
        )}
      </div>

      {/* Main Content Area — Minimalist & Spacious */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isPrintVersion ? '6px 8px 8px 8px' : '16px 20px 20px 20px', gap: isPrintVersion ? '6px' : '14px', boxSizing: 'border-box', justifyContent: 'space-between' }}>
        {/* Large Identity Typography */}
        <div style={{ textAlign: 'center', marginTop: isPrintVersion ? '2px' : '6px' }}>
          <div style={{ fontSize: isPrintVersion ? '1.15rem' : '2.1rem', fontWeight: 1000, color: '#0f172a', lineHeight: 1.05, fontFamily: "'Urbanist', 'Outfit', sans-serif", letterSpacing: '-0.03em' }}>
            {displayFirstName}
          </div>
          <div style={{ fontSize: isPrintVersion ? '0.75rem' : '1.05rem', color: '#64748b', marginTop: isPrintVersion ? '2px' : '4px', fontWeight: 800 }}>
            {displayLastName}
          </div>
          <div style={{ fontSize: isPrintVersion ? '0.52rem' : '0.72rem', color: '#94a3b8', marginTop: isPrintVersion ? '3px' : '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {isTeacherRole ? 'Lehrkraft' : (isStudentRole ? 'Schüler' : 'Mitglied')}
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
          boxShadow: isPrintVersion ? 'none' : '0 4px 14px rgba(0,0,0,0.03)'
        }}>
          <QRCode value={effectiveQrValue} size={finalQrSize} style={{ width: `${finalQrSize}px`, height: `${finalQrSize}px` }} />
        </div>
      </div>

      {/* Bottom Spectrum Stripe */}
      <div style={{ height: isPrintVersion ? '4px' : '8px', width: '100%', background: spectrumGradient, flexShrink: 0 }} />
    </div>
  );
};
