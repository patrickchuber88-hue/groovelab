import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Sliders, Smartphone, Copy, Check, ArrowRight, X, Calendar, Clock, CheckCircle2, AlertCircle, Edit3 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { getInstrumentAvatarUrl, getDefaultMusicianAvatarUrl } from './StudioAvatar';
import { StudentMobileScheduleWizard } from './StudentMobileScheduleWizard';
import { IDBadgeCard } from './IDBadgeCard';

interface StudentOnboardingPageProps {
  token: string;
}

export const StudentOnboardingPage: React.FC<StudentOnboardingPageProps> = ({ token }) => {
  const [student, setStudent] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);
  const passCardRef = useRef<HTMLDivElement>(null);
  // State for Wallet guide (Apple / Google Wallet modal toggle)
  const [walletGuide, setWalletGuide] = useState<'apple' | 'google' | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleCompleted, setScheduleCompleted] = useState(false);
  const [campusUsageMode, setCampusUsageMode] = useState<'selbstnutzer' | 'eltern_geführt'>('selbstnutzer');
  const [parentPin, setParentPin] = useState('');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [parentalConsent, setParentalConsent] = useState(false);
  const [consentSaved, setConsentSaved] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);

  // Granular DSGVO Art. 8 Parent Rights (Recommended Pre-selection)
  const [parentAllowChat, setParentAllowChat] = useState(true);
  const [parentAllowTimer, setParentAllowTimer] = useState(true);
  const [parentAllowLeaderboard, setParentAllowLeaderboard] = useState(true);
  const [parentAllowGroups, setParentAllowGroups] = useState(true);
  const [parentAllowProposals, setParentAllowProposals] = useState(true);
  const [parentAllowAudio, setParentAllowAudio] = useState(true);

  const handleSaveParentalConsent = async () => {
    if (!parentalConsent || !student?.id) return;
    try {
      setSavingConsent(true);
      const timestamp = new Date().toISOString();
      await supabase
        .from('users')
        .update({ 
          parental_consent_given_at: timestamp, 
          consent_version: 'v1.0',
          campus_usage_mode: campusUsageMode,
          parent_allow_chat: parentAllowChat,
          parent_allow_timer: parentAllowTimer,
          parent_allow_leaderboard: parentAllowLeaderboard,
          parent_allow_groups: parentAllowGroups,
          parent_allow_proposals: parentAllowProposals,
          parent_allow_audio: parentAllowAudio
        })
        .eq('id', student.id);
      setConsentSaved(true);
    } catch (e) {
      console.error('Error saving parental consent:', e);
    } finally {
      setSavingConsent(false);
    }
  };

  const handleDownloadAnonymousSticker = () => {
    try {
      const qrContainer = document.querySelector('.onboarding-qr-container svg');
      if (!qrContainer) return;
      const svgData = new XMLSerializer().serializeToString(qrContainer);
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

        // 100% Anonymous Footer (Zero PII for privacy & child safety)
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
    } catch (err) {
      console.error('Error downloading anonymous QR sticker:', err);
    }
  };

  const checkScheduleStatus = async (studentId: string) => {
    try {
      const { data: stRow } = await supabase
        .from('students')
        .select('timetable_assigned_at')
        .eq('id', studentId)
        .maybeSingle();

      const { data: prefData } = await supabase
        .from('student_schedule_preferences')
        .select('id')
        .eq('student_id', studentId)
        .limit(1);

      const isDone = Boolean(stRow?.timetable_assigned_at || (prefData && prefData.length > 0));
      setScheduleCompleted(isDone);
    } catch (e) {
      console.error('Error checking schedule status:', e);
    }
  };

  useEffect(() => {
    document.title = 'Campus-Groovelab';
    try {
      const favLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (favLink) {
        favLink.href = '/pwa-icon.png';
      }
    } catch (e) {
      // ignore
    }

    const fetchOnboardingDetails = async () => {
      try {
        setLoading(true);
        // Find user by qr_token first, then try id as fallback
        let { data: userData, error: userErr } = await supabase
          .from('users')
          .select('*, schools(*)')
          .eq('qr_token', token)
          .maybeSingle();

        if (!userData && !userErr && token && token.length === 36) {
          const { data: fallbackData, error: fallbackErr } = await supabase
            .from('users')
            .select('*, schools(*)')
            .eq('id', token)
            .maybeSingle();
          if (fallbackData) {
            userData = fallbackData;
            userErr = null;
          } else if (fallbackErr) {
            userErr = fallbackErr;
          }
        }

        if (userErr) throw userErr;

        // Fallback for pending students (stored in pending_students_decrypted view)
        if (!userData && token) {
          try {
            const { data: pendingData } = await supabase
              .from('pending_students_decrypted')
              .select('*')
              .eq('id', token)
              .maybeSingle();

            if (pendingData) {
              userData = {
                ...pendingData,
                role: 'student',
                isPendingOnboarding: true,
                qr_token: pendingData.id
              };
              userErr = null;
            }
          } catch (pe) {
            console.warn('[Onboarding] Fallback pending_students_decrypted query warning:', pe);
          }
        }

        if (!userData) {
          throw new Error('Ungültiger Onboarding-Link oder Code nicht gefunden.');
        }

        let schoolObj = Array.isArray(userData.schools) ? userData.schools[0] : userData.schools;
        if (!schoolObj && userData.school_id) {
          const { data: sData } = await supabase
            .from('schools')
            .select('*')
            .eq('id', userData.school_id)
            .maybeSingle();
          if (sData) {
            schoolObj = sData;
            userData.schools = sData;
          }
        }

        setStudent(userData);
        setSchool(schoolObj);
        if (userData.parental_consent_given_at) {
          setConsentSaved(true);
          setParentalConsent(true);
          if (userData.campus_usage_mode) setCampusUsageMode(userData.campus_usage_mode);
          if (userData.parent_pin) setParentPin(userData.parent_pin);
        }

        // Fetch schedule preference status
        checkScheduleStatus(userData.id);

        // Check if action parameter specifies schedule onboarding
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'schedule') {
          setShowScheduleModal(true);
        }

        // Auto-save this profile to local profiles registry
        if (typeof window !== 'undefined') {
          const registry = JSON.parse(localStorage.getItem('groovelab_local_profiles') || '[]');
          if (!registry.some((p: any) => p.id === userData.id)) {
            registry.push({
              id: userData.id,
              first_name: userData.first_name,
              last_name: userData.last_name,
              photo_url: userData.photo_url,
              role: userData.role,
              school_id: userData.school_id,
              qr_token: userData.qr_token
            });
            localStorage.setItem('groovelab_local_profiles', JSON.stringify(registry));
            console.log('[Onboarding] Profile registered locally:', userData.first_name);
          }
        }
      } catch (err: any) {
        console.error('[Onboarding] Error:', err);
        setError(err.message || 'Verbindungsfehler beim Laden des Profils.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchOnboardingDetails();
    }
  }, [token]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowNotification(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    
    let timer: any;
    if (!isStandalone) {
      timer = setTimeout(() => {
        setShowNotification(true);
      }, 3500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install: ${outcome}`);
      setDeferredPrompt(null);
      setShowNotification(false);
    } else {
      const guideSection = document.getElementById('pwa-install-section');
      if (guideSection) {
        guideSection.scrollIntoView({ behavior: 'smooth' });
        guideSection.style.transform = 'scale(1.02)';
        setTimeout(() => {
          guideSection.style.transform = 'scale(1)';
        }, 300);
      }
      setShowNotification(false);
    }
  };

  const handleDownloadJPEG = () => {
    if (!student) return;

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const platformParam = urlParams.get('platform');
    const isCampus = platformParam === 'campus' || (platformParam !== 'groovelab' && student.is_campus_active && !student.is_groovelab_active);
    const themeColor = isCampus ? '#34a853' : '#eab308';
    const displayAvatar = isCampus 
      ? getInstrumentAvatarUrl(student.instrument)
      : (student.photo_url || getDefaultMusicianAvatarUrl(student.instrument, student.role));

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const avatarImg = new Image();
    avatarImg.crossOrigin = 'anonymous';
    
    const qrImage = new Image();
    
    let avatarLoaded = false;
    let qrLoaded = false;
    
    const tryRender = () => {
      if (avatarLoaded && qrLoaded) {
        // Draw card background (White, like the ID Gallery)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 600);

        // Draw Lanyard hole
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 400, 40);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(170, 12, 60, 16, 8);
        ctx.fill();

        // Draw Status Header
        ctx.fillStyle = themeColor;
        ctx.fillRect(0, 40, 400, 25);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isCampus ? 'CAMPUS AUSWEIS' : (student.role === 'student' ? 'MEMBER ACCESS' : 'STAFF / COACH'), 200, 57);

        // Draw Portrait circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(200, 185, 65, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        try {
          ctx.drawImage(avatarImg, 135, 120, 130, 130);
        } catch (e) {
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(135, 120, 130, 130);
        }
        ctx.restore();

        // Draw border around portrait
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(200, 185, 65, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Identity Names
        ctx.fillStyle = '#1e293b';
        ctx.font = '900 28px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(student.first_name, 200, 295);

        ctx.fillStyle = '#64748b';
        ctx.font = '700 16px system-ui, -apple-system, sans-serif';
        ctx.fillText(student.last_name || 'Member', 200, 320);

        // Draw QR Container
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(140, 360, 120, 120, 16);
        ctx.fill();
        ctx.stroke();

        // Draw QR Code image
        ctx.drawImage(qrImage, 145, 365, 110, 110);

        // Draw Bottom Brand Stripe
        const grad = ctx.createLinearGradient(0, 0, 400, 0);
        grad.addColorStop(0, themeColor);
        grad.addColorStop(0.5, '#1e293b');
        grad.addColorStop(1, themeColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 590, 400, 10);

        // Trigger Download
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.download = `${isCampus ? 'CampusAusweis' : 'MemberPass'}_${student.first_name}.jpg`;
        link.href = dataUrl;
        link.click();
      }
    };

    avatarImg.onload = () => {
      avatarLoaded = true;
      tryRender();
    };
    avatarImg.onerror = () => {
      avatarLoaded = true;
      tryRender();
    };

    qrImage.onload = () => {
      qrLoaded = true;
      tryRender();
    };
    qrImage.onerror = () => {
      qrLoaded = true;
      tryRender();
    };

    // Load sources
    avatarImg.src = displayAvatar;
    
    const qrSvgElement = document.querySelector('.onboarding-qr-container svg');
    if (qrSvgElement) {
      const svgString = new XMLSerializer().serializeToString(qrSvgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      qrImage.src = URL.createObjectURL(svgBlob);
    } else {
      qrLoaded = true;
      tryRender();
    }
  };

  const handleCopyLink = () => {
    if (!student) return;
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const platformParam = urlParams.get('platform') || (student.is_campus_active && !student.is_groovelab_active ? 'campus' : 'groovelab');
    const link = `${window.location.origin}/onboarding/${student.qr_token || student.id}?platform=${platformParam}`;

    const isCampusLink = platformParam === 'campus' || (platformParam !== 'groovelab' && student.is_campus_active && !student.is_groovelab_active);

    const formattedText = isCampusLink 
      ? `Hallo ${student.first_name}! 🎶

Hier ist dein persönlicher Campus-Groovelab Zugang:
${link}

Deine Vorteile auf einen Blick:
📅 1. Stundenplan-Wunschzeiten in 2 Min. übermitteln
💳 2. Digitalen Schülerausweis (Apple & Google Wallet) speichern
🏷️ 3. Anonymen QR-Sticker für dein Notenheft herunterladen & am Kiosk einchecken
📚 4. Hausaufgabenheft & Übe-Timer direkt nutzen`
      : `Hallo ${student.first_name}! 🎶

Hier ist dein persönlicher GrooveLab Zugang:
${link}

Deine Vorteile auf einen Blick:
💳 1. Digitalen Pass (Apple & Google Wallet) speichern
🏷️ 2. Anonymen QR-Sticker für dein Instrument/Notenheft herunterladen & am Kiosk einchecken
🎸 3. Band-Repertoire, Songs & Skills in GrooveLab freischalten`;

    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#09090b', color: '#64748b', fontFamily: 'system-ui' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#eab308', borderRadius: '50%', marginBottom: '16px' }}></div>
        <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Dein Ausweis wird generiert...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#09090b', color: '#ef4444', padding: '24px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '50%', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '8px', color: '#fca5a5' }}>Fehler beim Laden</h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '320px', marginBottom: '24px', lineHeight: 1.5 }}>{error || 'Profil konnte nicht gefunden werden.'}</p>
        <button onClick={() => window.location.replace('/')} style={{ background: '#1e293b', border: 'none', color: '#ffffff', padding: '12px 24px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}>Zur Startseite</button>
      </div>
    );
  }

  const urlParams = new URLSearchParams(window.location.search);
  const platformParam = urlParams.get('platform');
  const isCampus = platformParam === 'campus' || (platformParam !== 'groovelab' && student.is_campus_active && !student.is_groovelab_active);
  const activeColor = isCampus ? '#34a853' : '#eab308';
  
  const displayAvatar = isCampus 
    ? getInstrumentAvatarUrl(student.instrument)
    : (student.photo_url || getDefaultMusicianAvatarUrl(student.instrument, student.role));

  const pageTitle = isCampus ? 'Willkommen bei Campus' : 'Willkommen bei GrooveLab';
  const cardHeaderText = isCampus ? 'CAMPUS AUSWEIS' : (student.role === 'student' ? 'MEMBER ACCESS' : 'STAFF / COACH');
  const cardSaveTitle = isCampus ? 'Campus Ausweis sichern' : 'Member Pass sichern';

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8fafc', 
      color: '#1e293b', 
      padding: '24px 16px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif', 
      boxSizing: 'border-box' 
    }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '4px', color: '#0f172a' }}>{pageTitle}</h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, margin: 0 }}>Dein persönlicher Onboarding-Assistent</p>
      </div>

      {/* Standalone Reusable Ausweis Card */}
      <IDBadgeCard 
        user={student} 
        activePlatform={isCampus ? 'campus' : 'groovelab'} 
        qrValue={`${window.location.origin}/qr/${student.qr_token || student.id}`} 
        cardRef={passCardRef} 
        style={{ marginBottom: '24px' }} 
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

        {/* 0. Legal Parental Consent Box (Art. 8 DSGVO & § 31 UrhG) */}
        <div style={{
          background: consentSaved ? '#f0fdf4' : '#fefce8',
          border: `1.5px solid ${consentSaved ? '#bbf7d0' : '#fef08a'}`,
          borderRadius: '18px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>{consentSaved ? '✅' : '📜'}</span>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: consentSaved ? '#166534' : '#854d0e' }}>
              {consentSaved ? 'Eltern-Einwilligung erteilt & datiert' : 'Einwilligung der Erziehungsberechtigten (Art. 8 DSGVO / § 31 UrhG)'}
            </div>
          </div>

          {!consentSaved ? (
            <>
              <p style={{ fontSize: '0.74rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                Verpflichtend für Erziehungsberechtigte: Richten Sie das Profil Ihres Kindes ein und wählen Sie den gewünschten Campus-Nutzungsmodus.
              </p>
              
              {/* Campus-Nutzungsmodus Auswahl */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b' }}>
                  Campus-Nutzungsmodus wählen:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCampusUsageMode('selbstnutzer');
                      setParentAllowChat(true);
                      setParentAllowTimer(true);
                      setParentAllowLeaderboard(true);
                      setParentAllowAudio(true);
                    }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '14px',
                      border: `2px solid ${campusUsageMode === 'selbstnutzer' ? '#34a853' : '#cbd5e1'}`,
                      background: campusUsageMode === 'selbstnutzer' ? '#f0fdf4' : '#ffffff',
                      color: campusUsageMode === 'selbstnutzer' ? '#166534' : '#475569',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: campusUsageMode === 'selbstnutzer' ? '0 4px 12px rgba(52, 168, 83, 0.15)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    👦 Selbstnutzer
                    <div style={{ fontSize: '0.64rem', fontWeight: 600, color: campusUsageMode === 'selbstnutzer' ? '#15803d' : '#64748b', marginTop: '2px' }}>Eigenständiges Üben</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCampusUsageMode('eltern_geführt');
                      setParentAllowChat(true);
                      setParentAllowTimer(false);
                      setParentAllowLeaderboard(false);
                      setParentAllowAudio(true);
                    }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '14px',
                      border: `2px solid ${campusUsageMode === 'eltern_geführt' ? '#34a853' : '#cbd5e1'}`,
                      background: campusUsageMode === 'eltern_geführt' ? '#f0fdf4' : '#ffffff',
                      color: campusUsageMode === 'eltern_geführt' ? '#166534' : '#475569',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: campusUsageMode === 'eltern_geführt' ? '0 4px 12px rgba(52, 168, 83, 0.15)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    👨‍👩‍👧 Von Eltern geführt
                    <div style={{ fontSize: '0.64rem', fontWeight: 600, color: campusUsageMode === 'eltern_geführt' ? '#15803d' : '#64748b', marginTop: '2px' }}>Mit elterlicher Begleitung</div>
                  </button>
                </div>

                {/* Dynamische Erklär-Card für den gewählten Modus */}
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                  {campusUsageMode === 'selbstnutzer' ? (
                    <div style={{ fontSize: '0.7rem', color: '#334155', lineHeight: 1.45 }}>
                      💡 <strong>Modus Selbstnutzer:</strong> Ideal für Schüler ab ca. 10–12 Jahren mit eigenem Smartphone/Tablet. Dein Kind nutzt die App eigenständig für Hausaufgaben, Fokus-Timer &amp; Bestenlisten.
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.7rem', color: '#334155', lineHeight: 1.45 }}>
                      💡 <strong>Modus Von Eltern geführt:</strong> Ideal für Grundschulkinder &amp; Familien-Tablets. Bestenlisten sind zum Schutz deines Kindes standardmäßig deaktiviert. Übezeit wird per 1-Klick von Eltern verbucht.
                    </div>
                  )}
                </div>
              </div>

              {/* Granular Parent Permission Controls (DSGVO Art. 8 - Campus Modul) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#ffffff', padding: '14px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b' }}>
                    🔒 Inkludierte Leistungen &amp; Datenschutz-Option (DSGVO Art. 8):
                  </span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>
                    {campusUsageMode === 'eltern_geführt' ? 'Geschützt' : 'Vollständig'}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {/* Core feature 1: Lehrer Chat */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.74rem', color: '#166534', fontWeight: 700, background: '#f0fdf4', padding: '8px 12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <span>💬</span>
                    <span>Direktnachrichten &amp; Lehrer-Chat <strong>(Inklusive)</strong></span>
                  </div>

                  {/* Core feature 2: Hausaufgabenheft */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.74rem', color: '#166534', fontWeight: 700, background: '#f0fdf4', padding: '8px 12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <span>📚</span>
                    <span>Digitales Hausaufgabenheft &amp; Übe-Protokoll <strong>(Inklusive)</strong></span>
                  </div>

                  {/* Optional parental privacy setting 1: Leaderboard */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '0.74rem', color: '#334155', fontWeight: 650, cursor: 'pointer', background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="checkbox" checked={parentAllowLeaderboard} onChange={e => setParentAllowLeaderboard(e.target.checked)} style={{ accentColor: '#34a853', width: '16px', height: '16px', flexShrink: 0 }} />
                      <span>🏆 Teilnahme an Schul-Übe-Bestenlisten</span>
                    </div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '2px 6px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                      Empfohlen
                    </span>
                  </label>

                  {/* Optional parental privacy setting 2: Loopstation Audio Recording */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '0.74rem', color: '#334155', fontWeight: 650, cursor: 'pointer', background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="checkbox" checked={parentAllowAudio} onChange={e => setParentAllowAudio(e.target.checked)} style={{ accentColor: '#34a853', width: '16px', height: '16px', flexShrink: 0 }} />
                      <span>🎙️ Audio-Feedback &amp; Loopstation im Unterricht</span>
                    </div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '2px 6px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                      Empfohlen
                    </span>
                  </label>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginTop: '4px', background: '#f0fdf4', padding: '12px 14px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <input
                  type="checkbox"
                  checked={parentalConsent}
                  onChange={(e) => setParentalConsent(e.target.checked)}
                  style={{ marginTop: '2px', cursor: 'pointer', accentColor: '#34a853', width: '18px', height: '18px', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.72rem', color: '#14532d', fontWeight: 650, lineHeight: 1.45 }}>
                  Ich willige als Erziehungsberechtigte(r) in die datenschutzkonforme Profilverarbeitung meines Kindes gemäß Datenschutzerklärung ein und erteile die Zustimmung zur Speicherung & unterrichtlichen Nutzung der erstellten Audio-Loops in der Loopstation (§ 31 UrhG).
                </span>
              </label>

              <button
                type="button"
                onClick={handleSaveParentalConsent}
                disabled={!parentalConsent || savingConsent}
                aria-label="Datenschutz- und Audio-Einwilligung speichern"
                style={{
                  width: '100%',
                  background: parentalConsent ? '#15803d' : '#94a3b8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  cursor: parentalConsent ? 'pointer' : 'not-allowed',
                  boxShadow: parentalConsent ? '0 4px 15px rgba(21, 128, 61, 0.25)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                className="focus-ring hover-scale"
              >
                {savingConsent ? 'Wird gespeichert...' : 'Profil-Einrichtung & Einwilligung bestätigen'}
              </button>
            </>
          ) : (
            <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, lineHeight: 1.4, textAlign: 'center', background: '#f0fdf4', padding: '14px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              Vielen Dank! Das Profil wurde als <strong>{campusUsageMode === 'eltern_geführt' ? 'Von Eltern geführt' : 'Selbstnutzer'}</strong> eingerichtet. Die rechtssichere Einwilligung ist hinterlegt. Der Profil-PIN wird beim ersten App-Login deines Kindes festgelegt.
            </div>
          )}
        </div>
        
        {/* 1. Hero Action: Stundenplan Wunschzeiten (Nur für Campus-Modul) */}
        {isCampus && (
          <button 
            onClick={() => setShowScheduleModal(true)} 
            style={{ 
              width: '100%', 
              background: scheduleCompleted ? '#ffffff' : activeColor, 
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
              boxShadow: scheduleCompleted ? '0 2px 6px rgba(0,0,0,0.03)' : `0 6px 20px ${activeColor}45`,
              transition: 'all 0.15s' 
            }} 
            className="hover-scale"
          >
            {scheduleCompleted ? <CheckCircle2 size={18} color="#22c55e" /> : <Calendar size={18} />}
            {scheduleCompleted ? 'Stundenplan-Zeiten übermittelt (bearbeiten)' : 'Wunschzeiten für Stundenplan eintragen'}
          </button>
        )}


        {/* 3. Export Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button 
            onClick={handleDownloadJPEG} 
            style={{ 
              background: '#ffffff', 
              color: '#0f172a', 
              border: '1px solid #cbd5e1', 
              borderRadius: '14px', 
              padding: '10px 8px', 
              fontSize: '0.75rem', 
              fontWeight: 800, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px' 
            }}
          >
            <Download size={14} color={activeColor} /> Ausweis (JPEG)
          </button>

          <button 
            onClick={handleDownloadAnonymousSticker} 
            style={{ 
              background: '#ffffff', 
              color: '#0f172a', 
              border: '1px solid #cbd5e1', 
              borderRadius: '14px', 
              padding: '10px 8px', 
              fontSize: '0.75rem', 
              fontWeight: 800, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px' 
            }}
          >
            🏷️ Noten-Sticker
          </button>
        </div>

        {/* 4. Wallet Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setWalletGuide(walletGuide === 'apple' ? null : 'apple')}
            style={{ 
              flex: 1, 
              background: '#000000', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '12px', 
              padding: '8px', 
              fontSize: '0.72rem', 
              fontWeight: 800, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '4px'
            }}
          >
            <span></span> Apple Wallet
          </button>

          <button 
            onClick={() => setWalletGuide(walletGuide === 'google' ? null : 'google')}
            style={{ 
              flex: 1, 
              background: '#0f172a', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '12px', 
              padding: '8px', 
              fontSize: '0.72rem', 
              fontWeight: 800, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '4px'
            }}
          >
            <span>Google Wallet</span>
          </button>
        </div>

        {/* 5. WhatsApp/E-Mail Teilen */}
        <button 
          onClick={handleCopyLink} 
          style={{ 
            width: '100%', 
            background: '#f8fafc', 
            color: '#334155', 
            border: '1px solid #e2e8f0', 
            borderRadius: '14px', 
            padding: '10px', 
            fontSize: '0.76rem', 
            fontWeight: 800, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '6px' 
          }}
        >
          {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
          {copied ? 'WhatsApp/E-Mail Einladung kopiert!' : 'Zugangs-Link kopieren'}
        </button>

        {/* 6. Login Button */}
        <button 
          onClick={() => window.location.replace(`/login?platform=${isCampus ? 'campus' : 'groovelab'}`)}
          style={{ 
            width: '100%', 
            background: '#0f172a', 
            color: '#ffffff', 
            border: 'none', 
            borderRadius: '14px', 
            padding: '12px', 
            fontSize: '0.82rem', 
            fontWeight: 900, 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '6px' 
          }}
        >
          Direkt zur App / Login <ArrowRight size={16} />
        </button>

      </div>

      {/* Apple-style Push Notification for PWA Installation */}
      {showNotification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '400px',
          background: 'rgba(21, 21, 28, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '22px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          zIndex: 9999,
          animation: 'slideDownNotification 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <style>{`
            @keyframes slideDownNotification {
              0% { transform: translate(-50%, -100px); opacity: 0; }
              100% { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
          
          {/* App Icon */}
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '11px',
            background: activeColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            flexShrink: 0
          }}>
            <Smartphone size={20} style={{ color: isCampus ? '#ffffff' : '#0f172a' }} />
          </div>
          
          {/* Text Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{isCampus ? 'Campus' : 'GrooveLab'}</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>JETZT</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: 1.3, fontWeight: 500 }}>
              App auf dem Home-Bildschirm speichern für schnellen QR-Login!
            </div>
          </div>
          
          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={handleInstallClick}
              style={{
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '0.7rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Laden
            </button>
            <button
              onClick={() => setShowNotification(false)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#94a3b8',
                border: 'none',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Später
            </button>
          </div>
        </div>
      )}

      {showScheduleModal && student && (
        <StudentMobileScheduleWizard
          student={student}
          onClose={() => setShowScheduleModal(false)}
          activePlatform={platformParam || (isCampus ? 'campus' : 'groovelab')}
          onPreferencesSaved={() => {
            checkScheduleStatus(student.id);
          }}
        />
      )}

    </div>
  );
};

