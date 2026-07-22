import QRCode from 'react-qr-code';
import { X, Download, RefreshCw, Calendar, CheckCircle2, Check, Copy } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StudioAvatar } from './StudioAvatar';
import { StudentMobileScheduleWizard } from './StudentMobileScheduleWizard';
import { IDBadgeCard, inlineAllImagesInElement } from './IDBadgeCard';

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
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [usageMode, setUsageMode] = useState<'student' | 'hybrid'>('student');
  const [copied, setCopied] = useState<boolean>(false);
  const [scheduleCompleted, setScheduleCompleted] = useState<boolean>(false);

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
    if (isAdminOrSecretary && activePlatform === 'campus') {
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
      const isTeacherAvatar = user.photo_url && (
        user.photo_url.includes('teacher_') ||
        user.photo_url.includes('avatar_teacher')
      );
      if (user.role === 'teacher' || user.role === 'admin' || user.role === 'secretary') {
        originalUrl = (isTeacherAvatar && user.photo_url) ? user.photo_url : '/avatar_ghost.jpg';
      } else if (!user.photo_url || isInstrumentAvatar || user.photo_url === '/avatar_ghost.jpg') {
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
      await inlineAllImagesInElement(cardRef.current);
      const { toJpeg } = await import('html-to-image');
      const dataUrl = await toJpeg(cardRef.current, { 
        quality: 0.98,
        backgroundColor: '#ffffff',
        cacheBust: false,
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
      labelColor: "rgb(230, 244, 234)",
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
        style={{ maxWidth: '440px', width: '100%', position: 'relative' }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-50px',
            right: '0',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <X size={22} />
        </button>
        {/* Unified Modern Standalone Card Design */}
        {(() => {
          const isStudentUser = (user.role || '').toLowerCase() === 'student';
          const isCampus = activePlatform === 'campus';

          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '20px' }}>
              {/* Standalone Reusable Ausweis Card */}
              <IDBadgeCard 
                user={user} 
                activePlatform={activePlatform} 
                qrValue={`${qrOrigin}/qr/${localTeacherQrToken || localQrToken || ''}`} 
                cardRef={cardRef} 
              />

              {/* Single Action Panel Below (Max 440px Centered) */}
              <div style={{
                maxWidth: '440px',
                width: '100%',
                background: '#ffffff',
                borderRadius: '28px',
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxSizing: 'border-box'
              }}>
                {/* 1. Hero Action: Stundenplan Wunschzeiten (Students only) */}
                {isStudentUser && (
                  <button 
                    onClick={() => setShowScheduleModal(true)} 
                    style={{ 
                      width: '100%', 
                      background: scheduleCompleted ? '#ffffff' : (isCampus ? '#34a853' : '#eab308'), 
                      color: scheduleCompleted ? '#0f172a' : '#ffffff', 
                      border: scheduleCompleted ? '1.5px solid #cbd5e1' : 'none', 
                      borderRadius: '16px', 
                      padding: '14px', 
                      fontSize: '0.88rem', 
                      fontWeight: 900, 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '10px', 
                      boxShadow: scheduleCompleted ? '0 2px 6px rgba(0,0,0,0.03)' : `0 6px 20px ${isCampus ? 'rgba(52, 168, 83, 0.27)' : 'rgba(234, 179, 8, 0.27)'}`,
                      transition: 'all 0.15s' 
                    }} 
                    className="hover-scale"
                  >
                    {scheduleCompleted ? <CheckCircle2 size={18} color="#22c55e" /> : <Calendar size={18} />}
                    {scheduleCompleted ? 'Stundenplan-Zeiten übermittelt (bearbeiten)' : 'Wunschzeiten für Stundenplan eintragen'}
                  </button>
                )}

                {/* 2. Wer nutzt diesen Zugang? (Segmented Control - Students only) */}
                {isStudentUser && (
                  <div style={{ 
                    background: '#f8fafc', 
                    borderRadius: '16px', 
                    padding: '4px', 
                    border: '1px solid #e2e8f0', 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '4px' 
                  }}>
                    <button 
                      onClick={() => setUsageMode('student')} 
                      style={{ 
                        padding: '10px', 
                        borderRadius: '12px', 
                        border: 'none', 
                        background: usageMode === 'student' ? '#ffffff' : 'transparent', 
                        color: usageMode === 'student' ? '#0f172a' : '#64748b', 
                        fontWeight: usageMode === 'student' ? 900 : 700, 
                        fontSize: '0.78rem', 
                        cursor: 'pointer', 
                        boxShadow: usageMode === 'student' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px' 
                      }}
                    >
                      🎓 Schüler
                    </button>
                    <button 
                      onClick={() => setUsageMode('hybrid')} 
                      style={{ 
                        padding: '10px', 
                        borderRadius: '12px', 
                        border: 'none', 
                        background: usageMode === 'hybrid' ? '#ffffff' : 'transparent', 
                        color: usageMode === 'hybrid' ? '#0f172a' : '#64748b', 
                        fontWeight: usageMode === 'hybrid' ? 900 : 700, 
                        fontSize: '0.78rem', 
                        cursor: 'pointer', 
                        boxShadow: usageMode === 'hybrid' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px' 
                      }}
                    >
                      👨‍👩‍👧‍👦 Eltern (Hybrid)
                    </button>
                  </div>
                )}

                {/* 3. Export Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isStudentUser ? '1fr 1fr' : '1fr', gap: '10px' }}>
                  <button 
                    onClick={downloadImage}
                    style={{ 
                      padding: '12px', 
                      borderRadius: '14px', 
                      border: '1.5px solid #e2e8f0', 
                      background: '#ffffff', 
                      color: '#0f172a', 
                      fontWeight: 800, 
                      fontSize: '0.78rem', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)' 
                    }}
                  >
                    <Download size={15} /> Ausweis (JPEG)
                  </button>

                  {isStudentUser && (
                    <button 
                      onClick={() => {
                        const svgElement = cardRef.current?.querySelector('svg');
                        if (!svgElement) return;
                        const svgData = new XMLSerializer().serializeToString(svgElement);
                        const canvas = document.createElement('canvas');
                        canvas.width = 400;
                        canvas.height = 440;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;

                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, 400, 440);
                        ctx.strokeStyle = '#e2e8f0';
                        ctx.lineWidth = 4;
                        ctx.strokeRect(8, 8, 384, 424);

                        const img = new Image();
                        img.onload = () => {
                          ctx.drawImage(img, 60, 40, 280, 280);

                          ctx.fillStyle = '#0f172a';
                          ctx.font = 'bold 16px Inter, system-ui, sans-serif';
                          ctx.textAlign = 'center';
                          ctx.fillText('Campus-Groovelab Check-in Code', 200, 365);

                          ctx.fillStyle = '#64748b';
                          ctx.font = '500 12px Inter, system-ui, sans-serif';
                          ctx.fillText('Anonymer QR-Sticker für Notenheft & Koffer', 200, 392);

                          const link = document.createElement('a');
                          link.download = `QR_Sticker_Notenheft_Anonym.png`;
                          link.href = canvas.toDataURL('image/png');
                          link.click();
                        };
                        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                      }}
                      style={{ 
                        padding: '12px', 
                        borderRadius: '14px', 
                        border: '1.5px solid #e2e8f0', 
                        background: '#ffffff', 
                        color: '#0f172a', 
                        fontWeight: 800, 
                        fontSize: '0.78rem', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)' 
                      }}
                    >
                      🏷️ Noten-Sticker
                    </button>
                  )}
                </div>

                {/* 4. Wallet Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button 
                    onClick={downloadWalletPass} 
                    style={{ 
                      padding: '12px', 
                      borderRadius: '14px', 
                      background: '#0f172a', 
                      color: '#ffffff', 
                      border: 'none', 
                      fontWeight: 800, 
                      fontSize: '0.78rem', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(15,23,42,0.15)' 
                    }}
                  >
                     Apple Wallet
                  </button>
                  <button 
                    onClick={downloadGoogleWalletPass} 
                    style={{ 
                      padding: '12px', 
                      borderRadius: '14px', 
                      background: '#0f172a', 
                      color: '#ffffff', 
                      border: 'none', 
                      fontWeight: 800, 
                      fontSize: '0.78rem', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(15,23,42,0.15)' 
                    }}
                  >
                    Google Wallet
                  </button>
                </div>

                {/* 5. Share Button */}
                <button 
                  onClick={() => {
                    const link = `${window.location.origin}/onboarding/${localTeacherQrToken || localQrToken || user.id}?platform=${isCampus ? 'campus' : 'groovelab'}`;
                    const formattedText = `Hallo ${user.first_name}! 🎶

Hier ist dein persönlicher Campus-Groovelab Zugang:
${link}`;

                    navigator.clipboard.writeText(formattedText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  }} 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    borderRadius: '14px', 
                    border: '1px solid #e2e8f0', 
                    background: '#f8fafc', 
                    color: '#475569', 
                    fontWeight: 700, 
                    fontSize: '0.78rem', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px' 
                  }} 
                >
                  {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                  {copied ? 'Zugangs-Link in Zwischenablage kopiert!' : 'Zugangs-Link kopieren'}
                </button>

                {/* 6. Navigation: Direkt zur App / Login */}
                <button 
                  onClick={onClose} 
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '16px', 
                    background: '#0f172a', 
                    color: '#ffffff', 
                    border: 'none', 
                    fontWeight: 900, 
                    fontSize: '0.86rem', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    boxShadow: '0 6px 20px rgba(15,23,42,0.2)' 
                  }} 
                >
                  Direkt zur App / Login ➔
                </button>
              </div>
            </div>
          );
        })()}

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
          >
            <RefreshCw size={20} /> QR-Code sperren &amp; neu generieren
          </button>
        )}
      </div>

      {/* Schedule Wizard Modal */}
      {showScheduleModal && (
        <StudentMobileScheduleWizard 
          student={user} 
          onClose={() => setShowScheduleModal(false)}
          onPreferencesSaved={() => {
            setScheduleCompleted(true);
            setShowScheduleModal(false);
          }}
          activePlatform={activePlatform}
        />
      )}
    </div>
  );
}
