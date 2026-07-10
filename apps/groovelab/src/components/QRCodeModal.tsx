import QRCode from 'react-qr-code';
import { X, Download, RefreshCw } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface QRCodeModalProps {
  user: {
    first_name: string;
    last_name: string;
    role: string;
    qr_token: string;
    teacher_qr_token?: string;
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
  if (isTeacher) return '/avatar_ghost.jpg';
  
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
  const qrOrigin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? 'https://app.campus-groovelab.de'
    : window.location.origin;
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [schoolNameAndCity, setSchoolNameAndCity] = useState<string>('Campus Musikschule');
  const [localQrToken, setLocalQrToken] = useState<string>(user.qr_token || '');
  const [localTeacherQrToken, setLocalTeacherQrToken] = useState<string>(user.teacher_qr_token || '');
  const roleLower = (user.role || '').toLowerCase();
  const isAdminOrSecretary = roleLower === 'admin' || roleLower === 'secretary';
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    setLocalQrToken(user.qr_token || '');
  }, [user.qr_token]);

  useEffect(() => {
    setLocalTeacherQrToken(user.teacher_qr_token || '');
  }, [user.teacher_qr_token]);

  useEffect(() => {
    const fetchUserRole = async () => {
      const loggedInUserId = sessionStorage.getItem('groovelab_user_id');
      if (loggedInUserId) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', loggedInUserId)
          .single();
        if (data) {
          setCurrentUserRole(data.role);
        }
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data } = await supabase
            .from('users')
            .select('role')
            .eq('id', authUser.id)
            .single();
          if (data) {
            setCurrentUserRole(data.role);
          }
        }
      }
    };
    fetchUserRole();
  }, []);

  const generateSecureQrToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 't_';
    for (let i = 0; i < 24; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const handleRegenerateToken = async () => {
    if (!window.confirm('Möchtest du diesen QR-Code wirklich sperren und neu generieren? Der alte Code verliert sofort seine Gültigkeit.')) {
      return;
    }

    const isStudent = user.role === 'student';
    let newToken: string;

    if (isStudent) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        newToken = crypto.randomUUID();
      } else {
        newToken = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
    } else {
      newToken = generateSecureQrToken();
    }

    try {
      const updateData = isStudent 
        ? { qr_token: newToken } 
        : { teacher_qr_token: newToken };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        alert('Fehler beim Sperren/Generieren des QR-Codes: ' + error.message);
      } else {
        if (isStudent) {
          setLocalQrToken(newToken);
          user.qr_token = newToken;
        } else {
          setLocalTeacherQrToken(newToken);
          user.teacher_qr_token = newToken;
        }
        alert('QR-Code erfolgreich neu generiert!');
      }
    } catch (err: any) {
      console.error('Error updating qr_token in QRCodeModal:', err);
      alert('Fehler beim Aktualisieren: ' + (err.message || 'Unbekannter Fehler'));
    }
  };

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
    
    const roleLower = (user.role || '').toLowerCase();
    const isAdminOrSecretary = roleLower === 'admin' || roleLower === 'secretary';

    let originalUrl = user.photo_url || '/avatar_ghost.jpg';
    if (isAdminOrSecretary) {
      originalUrl = '/campus_login_hero.png';
    } else if (activePlatform === 'campus') {
      originalUrl = getInstrumentAvatarUrl(user.instrument);
    } else {
      const isStudentAvatar = user.photo_url && (
        user.photo_url.includes('student_') ||
        user.photo_url.includes('bandstyle_') ||
        user.photo_url.includes('teen_') ||
        user.photo_url.includes('avatar_boy') ||
        user.photo_url.includes('avatar_girl')
      );
      const isInstrumentAvatar = !isStudentAvatar && user.photo_url && (
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
        backgroundColor: activePlatform === 'campus' ? (isAdminOrSecretary ? '#7f1d1d' : '#064e3b') : '#ffffff',
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

  const downloadWalletPass = () => {
    const passContent = JSON.stringify({
      passTypeIdentifier: user.role === 'admin' ? 'pass.de.groovelab.admin' : (user.role === 'teacher' ? 'pass.de.groovelab.teacher' : 'pass.de.groovelab.student'),
      serialNumber: user.qr_token || user.teacher_qr_token || user.id,
      teamIdentifier: "GROOVELAB",
      organizationName: "Campus-Groovelab",
      description: `Campus-Groovelab ${user.role} Pass`,
      logoText: "Campus-Groovelab",
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: activePlatform === 'campus' ? "rgb(10, 54, 28)" : "rgb(30, 41, 59)",
      labelColor: "rgb(167, 243, 208)",
      studentName: `${user.first_name} ${user.last_name ? user.last_name.charAt(0) + '.' : ''}`,
      instrument: user.instrument || (user.role === 'admin' ? 'Administrator' : (user.role === 'secretary' ? 'Sekretariat' : 'Lehrkraft')),
      qrToken: user.qr_token || user.teacher_qr_token
    }, null, 2);

    const blob = new Blob([passContent], { type: 'application/vnd.apple.pkpass' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `campus-pass-${user.first_name || 'user'}.pkpass`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const downloadGoogleWalletPass = () => {
    const passContent = JSON.stringify({
      classId: `groovelab.${user.role || 'student'}`,
      id: user.qr_token || user.teacher_qr_token || user.id,
      state: "ACTIVE",
      barcode: {
        type: "QR_CODE",
        value: user.qr_token || user.teacher_qr_token
      },
      cardTitle: {
        defaultValue: {
          language: "de-DE",
          value: "Campus-Groovelab"
        }
      },
      subheader: {
        defaultValue: {
          language: "de-DE",
          value: user.role === 'admin' ? 'Administrator' : (user.role === 'secretary' ? 'Sekretariat' : (user.role === 'teacher' ? 'Lehrkraft' : 'Schüler'))
        }
      },
      header: {
        defaultValue: {
          language: "de-DE",
          value: `${user.first_name} ${user.last_name ? user.last_name.charAt(0) + '.' : ''}`
        }
      }
    }, null, 2);

    const blob = new Blob([passContent], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `google-wallet-pass-${user.first_name || 'user'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
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
              background: isAdminOrSecretary ? 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)' : 'linear-gradient(135deg, #137333 0%, #064e3b 100%)', 
              borderRadius: '32px', 
              padding: '28px', 
              color: 'white',
              boxShadow: isAdminOrSecretary ? '0 25px 50px -12px rgba(127, 29, 29, 0.5), 0 0 30px rgba(220, 38, 38, 0.2)' : '0 25px 50px -12px rgba(2, 44, 34, 0.5), 0 0 30px rgba(52, 168, 83, 0.2)',
              border: isAdminOrSecretary ? '1.5px solid rgba(220, 38, 38, 0.3)' : '1.5px solid rgba(52, 168, 83, 0.3)',
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
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 50%, rgba(52, 168, 83, 0.03) 100%)',
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
                 crossOrigin={avatarDataUrl?.startsWith('data:') || avatarDataUrl?.startsWith('/') ? undefined : 'anonymous'}
                 style={{ 
                   width: '92px', 
                   height: '92px', 
                   borderRadius: '22px', 
                   objectFit: 'cover',
                   border: isAdminOrSecretary ? '1.5px solid rgba(251, 191, 36, 0.75)' : '1.5px solid rgba(34, 197, 94, 0.75)',
                   boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3)',
                   flexShrink: 0,
                   marginTop: '2px'
                 }} 
               />
               
               {/* Left Side: Identity Details */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                 <div>
                   <span style={{ fontSize: '0.52rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Name</span>
                   <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', marginTop: '1px', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                      {user.first_name} {user.last_name ? user.last_name.charAt(0) + '.' : ''}
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
            <div style={{ background: isAdminOrSecretary ? 'linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.3) 50%, transparent 100%)' : 'linear-gradient(90deg, transparent 0%, rgba(52, 168, 83, 0.3) 50%, transparent 100%)', height: '1px', width: '100%', margin: '8px 0', zIndex: 1 }} />

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
                border: isAdminOrSecretary ? '1.5px solid rgba(251, 191, 36, 0.3)' : '1.5px solid rgba(52, 168, 83, 0.3)'
              }}>
                <QRCode value={`${qrOrigin}/qr/${localTeacherQrToken || localQrToken || ''}`} size={135} />
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
                  crossOrigin={avatarDataUrl?.startsWith('data:') || avatarDataUrl?.startsWith('/') ? undefined : 'anonymous'}
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
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b', marginTop: '4px' }}>{user.last_name ? user.last_name.charAt(0) + '.' : 'Member'}</div>
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
                <QRCode value={`${qrOrigin}/qr/${localTeacherQrToken || localQrToken || ''}`} size={150} />
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

        {/* Wallet integration options */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button 
            onClick={downloadWalletPass}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: '20px',
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <span>Apple Wallet</span>
          </button>

          <button 
            onClick={downloadGoogleWalletPass}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: '20px',
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <span>Google Wallet</span>
          </button>
        </div>

        {/* Developer Shortcut Button */}
        <button 
          onClick={() => window.open(`${window.location.origin}/qr/${localTeacherQrToken || localQrToken || ''}`, '_blank')}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '20px',
            border: '1.5px dashed #cbd5e1',
            background: '#f8fafc',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            marginTop: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.borderColor = '#94a3b8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
        >
          <span>🔧 Entwickler-Link: Landing-Page öffnen</span>
        </button>

        {/* Action button for managers to regenerate QR Code */}
        {(currentUserRole === 'admin' || currentUserRole === 'teacher' || currentUserRole === 'secretary') && (
          <button
            onClick={handleRegenerateToken}
            className="google-btn-secondary"
            style={{
              width: '100%',
              padding: '20px',
              borderRadius: '24px',
              border: '1.5px solid #fecdd3',
              background: '#fff1f2',
              color: '#e11d48',
              fontWeight: 900,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '16px',
              boxShadow: '0 15px 35px rgba(225, 29, 72, 0.05)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffe4e6';
              e.currentTarget.style.borderColor = '#fda4af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff1f2';
              e.currentTarget.style.borderColor = '#fecdd3';
            }}
          >
            <RefreshCw size={20} /> QR-Code sperren &amp; neu generieren
          </button>
        )}
      </div>
    </div>
  );
}
