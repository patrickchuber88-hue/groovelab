import QRCode from 'react-qr-code';
import { X, Download } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface QRCodeModalProps {
  user: {
    first_name: string;
    last_name: string;
    role: string;
    qr_token: string;
    photo_url?: string;
    instrument?: string;
    school_id?: string;
    id?: string;
  };
  activePlatform?: string;
  onClose: () => void;
}

const getInstrumentAvatarUrl = (instrument: string | null | undefined): string => {
  if (!instrument) return '/avatars/gitarre_avatar_new.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('e-gitarre')) return '/avatars/egitarre_avatar.png';
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/gitarre_avatar_new.png';
  if (inst.includes('e-bass')) return '/avatars/ebass_avatar.png';
  if (inst.includes('kontrabass') || inst.includes('double bass')) return '/avatars/kontrabass_avatar.png';
  if (inst.includes('bass')) return '/avatars/bass_avatar.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/schlagzeug_avatar.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/klavier_avatar_new.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/gesang_avatar.png';
  if (inst.includes('trompete') || inst.includes('trumpet')) return '/avatars/trompete_avatar_new.png';
  if (inst.includes('posaune') || inst.includes('trombone')) return '/avatars/posaune_avatar.png';
  if (inst.includes('horn')) return '/avatars/horn_avatar_new.png';
  if (inst.includes('cello')) return '/avatars/cello_avatar_new.png';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return '/avatars/violine_avatar_new.png';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return '/avatars/klarinette_avatar_new.png';
  if (inst.includes('querflöte') || inst.includes('flute')) return '/avatars/querfloete_avatar.png';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return '/avatars/saxophon_avatar_new.png';
  if (inst.includes('blockflöte') || inst.includes('recorder') || inst.includes('blockfloete')) return '/avatars/blockfloete_avatar.png';
  if (inst.includes('bariton') || inst.includes('baritone')) return '/avatars/bariton_avatar.png';
  if (inst.includes('oboe')) return '/avatars/oboe_avatar.png';
  return '/avatars/gitarre_avatar_new.png';
};

const getDefaultMusicianAvatarUrl = (instrument: string | null | undefined, role: string | null | undefined): string => {
  const isTeacher = (role || '').toLowerCase() === 'teacher' || (role || '').toLowerCase() === 'admin';
  if (isTeacher) return '/avatar_teacher_male.jpg';
  
  if (!instrument) return '/avatars/student_eguitar_1.png';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('guitar') || inst.includes('gitarre')) return '/avatars/student_boy_black_guitar.png';
  if (inst.includes('bass')) return '/avatars/student_boy_black_bass.png';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return '/avatars/student_boy_black_drums.png';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return '/avatars/student_boy_black_piano.png';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return '/avatars/student_boy_red_vocals.png';
  return '/avatars/student_eguitar_1.png';
};

export function QRCodeModal({ user, activePlatform, onClose }: QRCodeModalProps) {
  const brandColor = 'var(--primary-color)';
  const cardRef = useRef<HTMLDivElement>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [schoolNameAndCity, setSchoolNameAndCity] = useState<string>('Campus Musikschule');

  useEffect(() => {
    const fetchSchool = async () => {
      let resolvedSchoolId = user.school_id || (user as any).schoolId || (user as any).schools?.id || (Array.isArray((user as any).schools) ? (user as any).schools[0]?.id : null);
      
      if (!resolvedSchoolId && user.id) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('school_id')
            .eq('id', user.id)
            .single();
          if (data && data.school_id) {
            resolvedSchoolId = data.school_id;
          }
        } catch (err) {
          console.error('Error fetching user school_id:', err);
        }
      }

      if (resolvedSchoolId) {
        try {
          const { data, error } = await supabase
            .from('schools')
            .select('name')
            .eq('id', resolvedSchoolId)
            .single();
          if (data) {
            setSchoolNameAndCity(data.name || 'Campus Musikschule');
          }
        } catch (err) {
          console.error('Error fetching school details:', err);
        }
      } else {
        setSchoolNameAndCity('Campus Musikschule');
      }
    };

    fetchSchool();
  }, [user.id, user.school_id, (user as any).schools]);

  useEffect(() => {
    let active = true;
    
    let originalUrl = user.photo_url || '/avatar_ghost.jpg';
    if (activePlatform === 'campus') {
      originalUrl = getInstrumentAvatarUrl(user.instrument);
    } else {
      const isInstrumentAvatar = user.photo_url && (
        user.photo_url.includes('avatar.png') || 
        user.photo_url.includes('guitar_avatar') || 
        user.photo_url.includes('gitarre_avatar_new') || 
        user.photo_url.includes('ebass_avatar') || 
        user.photo_url.includes('egitarre_avatar') || 
        user.photo_url.includes('kontrabass_avatar') || 
        user.photo_url.includes('bass_avatar') || 
        user.photo_url.includes('drums_avatar') || 
        user.photo_url.includes('schlagzeug_avatar') || 
        user.photo_url.includes('piano_avatar') || 
        user.photo_url.includes('klavier_avatar_new') || 
        user.photo_url.includes('vocals_avatar') || 
        user.photo_url.includes('gesang_avatar') || 
        user.photo_url.includes('trumpet_avatar') || 
        user.photo_url.includes('trompete_avatar_new') || 
        user.photo_url.includes('trombone_avatar') || 
        user.photo_url.includes('posaune_avatar') || 
        user.photo_url.includes('horn_avatar') || 
        user.photo_url.includes('horn_avatar_new') || 
        user.photo_url.includes('cello_avatar') || 
        user.photo_url.includes('cello_avatar_new') || 
        user.photo_url.includes('violin_avatar') || 
        user.photo_url.includes('violine_avatar_new') || 
        user.photo_url.includes('clarinet_avatar') || 
        user.photo_url.includes('klarinette_avatar_new') || 
        user.photo_url.includes('flute_avatar') || 
        user.photo_url.includes('querfloete_avatar') || 
        user.photo_url.includes('saxophone_avatar') || 
        user.photo_url.includes('saxophon_avatar_new') || 
        user.photo_url.includes('blockfloete_avatar') || 
        user.photo_url.includes('bariton_avatar') || 
        user.photo_url.includes('oboe_avatar')
      );
      if (!user.photo_url || isInstrumentAvatar || user.photo_url === '/avatar_ghost.jpg') {
        originalUrl = getDefaultMusicianAvatarUrl(user.instrument, user.role);
      }
    }
    
    if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
      setAvatarDataUrl(originalUrl);
      return;
    }

    const loadAndConvert = async () => {
      try {
        let url = new URL(originalUrl, window.location.origin).href;
        
        if (originalUrl !== '/avatar_ghost.jpg') {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}cb=${Date.now()}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        
        const reader = new FileReader();
        reader.onloadend = () => {
          if (active) {
            setAvatarDataUrl(reader.result as string);
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn('Could not convert image to base64, using fallback URL:', err);
        if (active) {
          setAvatarDataUrl(originalUrl);
        }
      }
    };

    loadAndConvert();
    return () => {
      active = false;
    };
  }, [user.photo_url]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src.startsWith('data:')) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 120;
      canvas.height = img.naturalHeight || img.height || 120;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setAvatarDataUrl(dataUrl);
      }
    } catch (err) {
      console.warn('OnLoad canvas conversion failed:', err);
    }
  };

  const downloadImage = async () => {
    if (cardRef.current === null) return;
    try {
      const { toJpeg } = await import('html-to-image');
      const dataUrl = await toJpeg(cardRef.current, { 
        quality: 0.95,
        backgroundColor: activePlatform === 'campus' ? '#064e3b' : '#ffffff',
        cacheBust: true,
        pixelRatio: 2
      });
      const link = document.createElement('a');
      link.download = activePlatform === 'campus' ? `Campus_Pass_${user.first_name}.jpg` : `Groovelab_ID_${user.first_name}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Fehler beim JPEG-Download:', err);
    }
  };
  
  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '400px', width: '100%', position: 'relative' }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-60px',
            right: '0',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'white',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>

        {/* Card Design */}
        {activePlatform === 'campus' ? (
          <div 
            ref={cardRef} 
            style={{
              background: 'linear-gradient(135deg, #137333 0%, #064e3b 100%)', 
              borderRadius: '32px', 
              padding: '28px', 
              color: 'white',
              boxShadow: '0 25px 50px -12px rgba(2, 44, 34, 0.5), 0 0 30px rgba(4, 120, 87, 0.2)',
              border: '1.5px solid rgba(251, 191, 36, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              height: '480px',
              minHeight: '480px',
              boxSizing: 'border-box',
              gap: '20px'
            }}
          >
            {/* Sheen effect */}
            <div style={{
              position: 'absolute',
              top: '-50%', left: '-50%', right: '-50%', bottom: '-50%',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 50%, rgba(251, 191, 36, 0.03) 100%)',
              pointerEvents: 'none'
            }} />

             {/* CAMPUS PASS Header */}
             <span style={{ 
               fontSize: '0.68rem', 
               fontWeight: 900, 
               color: '#fbbf24', 
               textTransform: 'uppercase', 
               letterSpacing: '0.2em',
               zIndex: 1,
               marginBottom: '-4px'
             }}>
               CAMPUS PASS
             </span>

             {/* Top Info Section: Details left, Avatar right */}
             <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', zIndex: 1, flexDirection: 'row-reverse', width: '100%' }}>
               {/* Right Side: Avatar Photo */}
               <img 
                 src={avatarDataUrl || '/avatar_ghost.jpg'} 
                 alt="Avatar" 
                 crossOrigin={avatarDataUrl?.startsWith('data:') ? undefined : 'anonymous'}
                 style={{ 
                   width: '92px', 
                   height: '92px', 
                   borderRadius: '22px', 
                   objectFit: 'cover',
                   border: '3px solid #fbbf24',
                   boxShadow: '0 8px 24px rgba(251, 191, 36, 0.25)',
                   flexShrink: 0,
                   marginTop: '2px'
                 }} 
               />
               
               {/* Left Side: Identity Details */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                 <div>
                   <span style={{ fontSize: '0.52rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Name</span>
                   <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', marginTop: '1px', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                     {user.first_name} {user.last_name}
                   </div>
                 </div>
 
                 <div>
                   <span style={{ fontSize: '0.52rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Musikschule</span>
                   <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', opacity: 0.95, marginTop: '1px', lineHeight: '1.2' }}>
                     {schoolNameAndCity}
                   </div>
                 </div>
               </div>
             </div>

            {/* Dashed divider line */}
            <div style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.3) 50%, transparent 100%)', height: '1px', width: '100%', margin: '8px 0', zIndex: 1 }} />

            {/* QR Code Scan area */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', zIndex: 1, gap: '16px' }}>
              <div style={{ 
                background: '#ffffff', 
                padding: '16px', 
                borderRadius: '24px', 
                boxShadow: '0 20px 40px rgba(0,0,0,0.35)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1.5px solid rgba(251, 191, 36, 0.3)'
              }}>
                <QRCode value={user.qr_token || ''} size={135} />
              </div>
            </div>
          </div>
        ) : (
          <div 
            ref={cardRef} 
            style={{
              background: 'white',
              borderRadius: '32px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
              overflow: 'hidden',
              width: '100%'
            }}
          >
            {/* Lanyard Hole Mockup */}
            <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
              <div style={{ width: '36px', height: '8px', borderRadius: '4px', background: '#0f172a' }}></div>
            </div>

            {/* Status Header */}
            <div style={{ 
              background: user.role === 'student' ? brandColor : '#f59e0b', 
              padding: '10px', 
              textAlign: 'center',
              textTransform: 'uppercase'
            }}>
              <div style={{ color: 'white', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.2em' }}>
                {user.role === 'student' ? 'Member Access' : 'Staff / Coach'}
              </div>
            </div>

            {/* Content Area */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px 36px 24px', gap: '20px' }}>
              {/* Portrait */}
              <div style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: '50%', 
                border: `4px solid ${user.role === 'student' ? brandColor : '#f59e0b'}`,
                padding: '4px',
                background: 'white',
                boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <img 
                  src={avatarDataUrl || '/avatar_ghost.jpg'} 
                  alt="Profile"
                  crossOrigin={avatarDataUrl?.startsWith('data:') ? undefined : 'anonymous'}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    borderRadius: '50%'
                  }} 
                />
              </div>

              {/* Identity */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{user.first_name}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b', marginTop: '4px' }}>{user.last_name || 'Member'}</div>
              </div>

              {/* QR Code Container */}
              <div style={{ 
                background: 'white', 
                padding: '16px', 
                borderRadius: '20px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <QRCode value={user.qr_token || ''} size={150} />
              </div>

              <p style={{ 
                fontSize: '0.75rem', 
                color: '#94a3b8', 
                textAlign: 'center', 
                margin: '0', 
                fontWeight: 600, 
                lineHeight: 1.4,
                maxWidth: '220px'
              }}>
                Halte diesen Code vor die Kamera des iPads,<br/>um dich automatisch am Platz anzumelden.
              </p>
            </div>

            {/* Bottom Brand Stripe */}
            <div style={{ 
              height: '12px', 
              background: `linear-gradient(90deg, ${user.role === 'student' ? brandColor : '#f59e0b'}, #1e293b, ${user.role === 'student' ? brandColor : '#f59e0b'})` 
            }}></div>
          </div>
        )}

        {/* Action Button */}
        <button 
          onClick={downloadImage}
          style={{
            width: '100%',
            background: activePlatform === 'campus' ? '#137333' : brandColor,
            color: 'white',
            border: 'none',
            borderRadius: '24px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontWeight: 900,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: `0 15px 35px ${activePlatform === 'campus' ? '#137333' : brandColor}50`,
            transition: 'all 0.2s',
            marginTop: '24px'
          }}
        >
          <Download size={24} /> Ausweis als JPEG speichern
        </button>
      </div>
    </div>
  );
}
