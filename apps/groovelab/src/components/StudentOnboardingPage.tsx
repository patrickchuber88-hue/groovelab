import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Download, Sliders, Smartphone, Copy, Check, ArrowRight, X, Calendar, Clock, 
  CheckCircle2, AlertCircle, Edit3, Eye, EyeOff, Shield, ShieldCheck, BookOpen, 
  MessageSquare, Mic, Lock, ChevronRight, ChevronLeft, User, Users,
  Headphones, Zap, Volume2, RotateCcw, Fingerprint, Sparkles
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { getInstrumentAvatarUrl, getDefaultMusicianAvatarUrl, resolveCampusStudentAvatar } from './StudioAvatar';
import { StudentMobileScheduleWizard } from './StudentMobileScheduleWizard';
import { IDBadgeCard } from './IDBadgeCard';
import { downloadAppleWalletPass } from '../utils/walletPassGenerator';
import { isWebAuthnSupported, registerBiometrics } from '../utils/webauthn';
import { SmartAppInstallPrompt } from './ui/SmartAppInstallPrompt';
import { LegalTextModal } from './LegalTextModal';
import { logSecurityEvent } from '../services/auditLogService';
import Confetti from 'react-confetti';

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
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleCompleted, setScheduleCompleted] = useState(false);
  const [campusUsageMode, setCampusUsageMode] = useState<'selbstnutzer' | 'eltern_geführt'>('selbstnutzer');
  const [parentPin6, setParentPin6] = useState('');
  const [showParentPin, setShowParentPin] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [parentalConsent, setParentalConsent] = useState(false);
  const [consentSaved, setConsentSaved] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'impressum' | 'privacy' | 'terms' | 'cancellation' | 'accessibility' | null>(null);
  const [showConsentConfetti, setShowConsentConfetti] = useState(false);
  const [isAlreadyActivated, setIsAlreadyActivated] = useState(false);

  // Apple HIG Onboarding Wizard State (1: Modus, 2: PIN & Kinderschutz, 3: Freigabe)
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);

  // 📱 Smart OS & Hardware Biometrics Detection
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isWebAuthnAvailable, setIsWebAuthnAvailable] = useState(false);
  const [registeringBiometrics, setRegisteringBiometrics] = useState(false);
  const [biometricsRegistered, setBiometricsRegistered] = useState(false);
  const [biometricsError, setBiometricsError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
      const isAndroidDevice = /android/.test(ua);
      setIsIOS(isIOSDevice);
      setIsAndroid(isAndroidDevice);

      if (window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          .then(res => setIsWebAuthnAvailable(Boolean(res)))
          .catch(() => setIsWebAuthnAvailable(false));
      }
    }
  }, []);

  // 🛡️ Granulare Kinderschutz-Freigaben (100% Privacy by Default / Opt-In gem. Art. 25 Abs. 2 DSGVO)
  // CLUSTER 1: Pädagogik & Unterricht (Didaktik)
  const [parentAllowTeacherAudio, setParentAllowTeacherAudio] = useState(false); // Didaktik im Unterricht (§ 201 StGB)
  const [parentAllowTimer, setParentAllowTimer] = useState(false); // Übe-Timer & Lern-Meilensteine
  const [parentAllowTts, setParentAllowTts] = useState(false); // Audio-Vorleseassistent für Leseanfänger

  // CLUSTER 2: Kommunikation & Medien (Kinderschutz)
  const [parentAllowChat, setParentAllowChat] = useState(false); // Direkt-Chat gem. § 8a SGB VIII
  const [parentAllowAudio, setParentAllowAudio] = useState(false); // Eigene Mikrofonaufnahmen gem. Art. 8 DSGVO

  // CLUSTER 3: Termine & Vertragsschutz (§§ 106, 615 BGB)
  const [parentAllowAbsences, setParentAllowAbsences] = useState(false); // Kind darf Termine selbstständig absagen
  const [parentAllowReschedule, setParentAllowReschedule] = useState(false); // Kind darf Ausweichtermine annehmen

  const handleSaveParentalConsent = async () => {
    setConsentError(null);
    if (!/^\d{6}$/.test(parentPin6.trim())) {
      setConsentError('Bitte vergib eine genau 6-stellige Eltern-PIN (z. B. 839201).');
      return;
    }
    if (!parentalConsent || !student?.id) {
      setConsentError('Bitte bestätige die elterliche Freigabe zur Aktivierung.');
      return;
    }

    try {
      setSavingConsent(true);
      const targetToken = student.qr_token || student.id || token;
      const permissionsPayload = {
        allow_chat: parentAllowChat,
        allow_timer: campusUsageMode === 'selbstnutzer' || parentAllowTimer,
        allow_leaderboard: campusUsageMode === 'selbstnutzer',
        allow_student_audio: parentAllowAudio,
        allow_teacher_audio: parentAllowTeacherAudio,
        allow_absences: parentAllowAbsences,
        allow_reschedule_confirm: parentAllowReschedule,
        allow_tts: parentAllowTts,
        allow_groups: true,
        allow_proposals: true
      };

      let completedViaRpc = false;

      // 1. Try authoritative complete_student_onboarding_v2 RPC
      try {
        const { data, error: rpcErr } = await supabase.rpc('complete_student_onboarding_v2', {
          p_token: targetToken,
          p_parent_pin_6: parentPin6.trim(),
          p_student_pin_4: null,
          p_campus_usage_mode: campusUsageMode,
          p_parent_permissions: permissionsPayload,
          p_parent_name: null
        });

        if (!rpcErr && data?.success) {
          completedViaRpc = true;
        } else if (rpcErr) {
          const isMissing = 
            rpcErr.code === 'PGRST202' || 
            rpcErr.code === '42883' || 
            (rpcErr.message && (
              rpcErr.message.includes('schema cache') || 
              rpcErr.message.includes('Could not find the function')
            ));
          if (!isMissing) {
            throw rpcErr;
          }
        }
      } catch (rpcEx: any) {
        const isMissing = 
          rpcEx?.code === 'PGRST202' || 
          rpcEx?.code === '42883' || 
          (rpcEx?.message && (
            rpcEx.message.includes('schema cache') || 
            rpcEx.message.includes('Could not find the function')
          ));
        if (!isMissing) {
          throw rpcEx;
        }
      }

      // 2. Resilient live fallback (uses active production RPCs & atomic DML)
      if (!completedViaRpc) {
        // Set parent PIN via live set_parent_pin RPC
        try {
          await supabase.rpc('set_parent_pin', {
            p_student_id: student.id,
            p_new_pin: parentPin6.trim()
          });
        } catch (pinErr) {
          console.warn('[Onboarding] set_parent_pin note:', pinErr);
        }

        // Save granular parent controls via live save_parent_controls RPC
        try {
          await supabase.rpc('save_parent_controls', {
            p_student_id: student.id,
            p_settings: {
              campus_ui_level: (campusUsageMode === 'eltern_geführt' ? 'junior' : (student?.campus_ui_level || 'standard')),
              parent_allow_absences: parentAllowAbsences,
              parent_allow_chat: parentAllowChat,
              parent_allow_timer: campusUsageMode === 'selbstnutzer' || parentAllowTimer,
              parent_allow_leaderboard: campusUsageMode === 'selbstnutzer',
              parent_allow_groups: true,
              parent_allow_proposals: true,
              parent_allow_audio: parentAllowAudio,
              parent_permissions: permissionsPayload
            }
          });
        } catch (ctrlErr) {
          console.warn('[Onboarding] save_parent_controls note:', ctrlErr);
        }

        // Atomically update user state in users view
        const timestamp = new Date().toISOString();
        const updateData: Record<string, any> = {
          parental_consent_given_at: timestamp,
          consent_version: 'v2.0',
          campus_usage_mode: campusUsageMode,
          is_active: true,
          is_pin_activated: true,
          is_campus_active: student.is_campus_active ?? false,
          parent_allow_chat: parentAllowChat,
          parent_allow_timer: campusUsageMode === 'selbstnutzer' || parentAllowTimer,
          parent_allow_leaderboard: campusUsageMode === 'selbstnutzer',
          parent_allow_groups: true,
          parent_allow_proposals: true,
          parent_allow_absences: parentAllowAbsences,
          parent_allow_reschedule_confirm: parentAllowReschedule,
          parent_allow_audio: parentAllowAudio,
          parent_permissions: permissionsPayload
        };

        const { error: userUpdateErr } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', student.id);

        if (userUpdateErr) {
          await supabase
            .from('students')
            .update(updateData)
            .eq('id', student.id);
        }

        // Revisionssicheres Audit-Logging
        try {
          await logSecurityEvent({
            action: 'PARENTAL_CONSENT_COMPLETED_V2',
            schoolId: student.school_id ? String(student.school_id) : undefined,
            targetId: String(student.id),
            metadata: {
              consent_type: 'parental_onboarding_activation',
              consent_version: 'v2.0',
              campus_usage_mode: campusUsageMode,
              permissions: permissionsPayload,
              timestamp
            }
          });
        } catch (auditErr) {
          console.warn('[Onboarding] Audit event note:', auditErr);
        }
      }

      setConsentSaved(true);
      setShowConsentConfetti(true);
      setTimeout(() => setShowConsentConfetti(false), 4500);
      setStudent((prev: any) => ({
        ...prev,
        parental_consent_given_at: new Date().toISOString(),
        consent_version: 'v2.0',
        campus_usage_mode: campusUsageMode,
        is_active: true,
        is_pin_activated: true,
        is_campus_active: prev?.is_campus_active ?? false
      }));
    } catch (e: any) {
      console.error('Error saving parental consent v2:', e);
      setConsentError(e.message || 'Fehler beim Speichern der elterlichen Freigabe.');
    } finally {
      setSavingConsent(false);
    }
  };

  const handleDownloadAnonymousSticker = () => {
    if (!consentSaved) return;
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
        // 1. Authoritative RPC: get_student_onboarding_preview (Zero-Trust & Zero Direct View Lookups)
        const { data: previewRes, error: rpcErr } = await supabase.rpc('get_student_onboarding_preview', {
          p_token: token
        });

        // 2. Bereits aktiviertes Profil (Eltern-PIN bereits vergeben): Zur Login-Weiterleitung führen
        if (!rpcErr && previewRes?.is_already_activated) {
          setIsAlreadyActivated(true);
          const s = previewRes.student;
          if (s) {
            setStudent({
              id: s.id,
              school_id: s.school_id,
              first_name: s.first_name,
              last_name: s.last_initial,
              instrument: s.instrument,
              photo_url: s.photo_url,
              role: 'student',
              schools: {
                id: s.school_id,
                name: s.school_name,
                branding_logo_url: s.school_logo,
                subdomain: s.school_subdomain
              }
            });
            if (s.school_id || s.school_name) {
              setSchool({
                id: s.school_id,
                name: s.school_name,
                branding_logo_url: s.school_logo,
                subdomain: s.school_subdomain,
                primary_color: s.school_color
              });
            }
          }
          setLoading(false);
          return;
        }

        if (!rpcErr && previewRes?.success && previewRes.student) {
          const s = previewRes.student;
          const userObj = {
            id: s.id,
            school_id: s.school_id,
            first_name: s.first_name,
            last_name: s.last_initial,
            instrument: s.instrument,
            campus_ui_level: s.campus_ui_level,
            is_pin_activated: s.is_pin_activated,
            is_campus_active: s.is_campus_active,
            campus_usage_mode: s.campus_usage_mode,
            photo_url: s.photo_url,
            role: 'student',
            schools: {
              id: s.school_id,
              name: s.school_name,
              branding_logo_url: s.school_logo,
              hero_image_url: s.school_hero,
              subdomain: s.school_subdomain
            }
          };
          if (s.school_id || s.school_name) {
            setSchool({
              id: s.school_id,
              name: s.school_name,
              branding_logo_url: s.school_logo,
              hero_image_url: s.school_hero,
              subdomain: s.school_subdomain,
              primary_color: s.school_color
            });
          }
          if (s.campus_usage_mode) setCampusUsageMode(s.campus_usage_mode);
          setStudent(userObj as any);
          setLoading(false);
          return;
        }

        // Fail-Closed: RPC meldet Fehler → sprechende Fehlermeldung ausgeben
        const errorMsg = previewRes?.error || rpcErr?.message || 'Ungültiger oder abgelaufener Einladungs-Link.';
        throw new Error(errorMsg);

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
      // Double banner eliminated: Floating notification is suppressed in post-activation
      // as the dedicated install card is already prominently displayed
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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

  const handleAppleWalletPassDownload = () => {
    if (!student || !consentSaved) return;
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const platformParam = urlParams.get('platform');
    const isCampusMode = platformParam === 'campus' || (platformParam !== 'groovelab' && student.is_campus_active && !student.is_groovelab_active);
    
    downloadAppleWalletPass({
      schoolName: school?.name || 'Campus-Groovelab',
      userName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Schüler',
      userRole: 'Schüler',
      instrument: student.instrument || 'Instrument',
      qrToken: student.qr_token || student.id,
      isCampus: Boolean(isCampusMode)
    });
  };


  const handleRegisterParentBiometrics = async () => {
    if (!student?.id) return;
    if (parentPin6.length !== 6) {
      setBiometricsError('Bitte gib zuerst deine 6-stellige Eltern-PIN ein.');
      return;
    }
    setRegisteringBiometrics(true);
    setBiometricsError(null);
    try {
      // 1. Authoritative challenge from server
      const { data: chalData, error: chalErr } = await supabase.rpc('generate_webauthn_challenge', {
        p_user_id: student.id,
        p_type: 'register'
      });

      if (chalErr || !chalData?.challenge) {
        throw new Error('Sicherheits-Challenge konnte nicht bezogen werden.');
      }

      const safeFirstName = (student.first_name || 'schueler')
        .toLowerCase()
        .replace(/[äöüß]/g, (m: string) => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[m] || m))
        .replace(/[^a-z0-9]/g, '');
      const email = `eltern.${safeFirstName || 'kind'}@campus-groovelab.local`;
      const passkeyResult = await registerBiometrics(
        email,
        student.id,
        chalData.challenge,
        `Eltern-Gerät • ${student.first_name || 'Kind'}`
      );

      // 2. Authoritative server binding
      const { data: regResult, error: regErr } = await supabase.rpc('register_webauthn_credential', {
        p_user_id: student.id,
        p_credential_id: passkeyResult.id,
        p_public_key: JSON.stringify(passkeyResult.response),
        p_device_name: isIOS ? 'Apple Face/Touch ID' : isAndroid ? 'Android Fingerprint/Passkey' : 'Eltern-Passkey',
        p_challenge: chalData.challenge
      });

      if (regErr || !regResult?.success) {
        throw new Error(regErr?.message || regResult?.error || 'Passkey-Registrierung fehlgeschlagen.');
      }

      setBiometricsRegistered(true);
    } catch (err: any) {
      console.warn('[Onboarding] Biometrics registration note:', err);
      // User cancellation should not break onboarding
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        setBiometricsError('Einrichtung abgebrochen.');
      } else {
        setBiometricsError(err.message || 'Passkey konnte nicht eingerichtet werden.');
      }
    } finally {
      setRegisteringBiometrics(false);
    }
  };

  const handleDownloadJPEG = () => {
    if (!student || !consentSaved) return;

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const platformParam = urlParams.get('platform');
    const isCampus = platformParam === 'campus' || (platformParam !== 'groovelab' && student.is_campus_active && !student.is_groovelab_active);
    const themeColor = isCampus ? '#34a853' : '#eab308';
    const displayAvatar = isCampus 
      ? resolveCampusStudentAvatar(student)
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
💳 2. Digitalen Schülerausweis (Apple Wallet & Fotogalerie) speichern
🏷️ 3. Anonymen QR-Sticker für dein Notenheft herunterladen & am Kiosk einchecken
📚 4. Hausaufgabenheft & Übe-Timer direkt nutzen`
      : `Hallo ${student.first_name}! 🎶

Hier ist dein persönlicher GrooveLab Zugang:
${link}

Deine Vorteile auf einen Blick:
💳 1. Digitalen Pass (Apple Wallet & Fotogalerie) speichern
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

  if (isAlreadyActivated && student) {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const platformParam = urlParams.get('platform') || 'campus';
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const schoolSub = school?.subdomain;
    const baseHost = typeof window !== 'undefined' ? window.location.hostname.replace(/^[^.]+\./, '').replace('www.', '') : 'campus-groovelab.de';
    const targetLoginUrl = !isLocalhost && schoolSub && !window.location.hostname.startsWith(schoolSub)
      ? `${window.location.protocol}//${schoolSub}.${baseHost}/?school_id=${student.school_id}&platform=${platformParam}`
      : `/?school_id=${student.school_id}&platform=${platformParam}`;

    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '32px',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.07)',
          padding: '36px 28px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          {/* Schullogo */}
          {school?.branding_logo_url ? (
            <img 
              src={school.branding_logo_url} 
              alt={school.name || 'Musikschule'} 
              style={{ maxHeight: '56px', maxWidth: '180px', objectFit: 'contain', marginBottom: '4px' }} 
            />
          ) : (
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              background: '#e6f4ea',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={32} />
            </div>
          )}

          {/* Status-Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#dcfce7',
            color: '#15803d',
            fontSize: '0.78rem',
            fontWeight: 800,
            padding: '4px 12px',
            borderRadius: '100px',
            letterSpacing: '0.02em'
          }}>
            <ShieldCheck size={15} />
            Bereits freigeschaltet
          </div>

          <div>
            <h2 style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              margin: '0 0 8px 0'
            }}>
              Hallo {student.first_name || 'Musikschüler'}!
            </h2>
            <p style={{
              fontSize: '0.88rem',
              color: '#64748b',
              fontWeight: 600,
              lineHeight: 1.5,
              margin: 0
            }}>
              Dein Schülerprofil bei <strong>{school?.name || 'deiner Musikschule'}</strong> ist bereits vollständig aktiviert.
              Du kannst dich direkt mit deinem Ausweis-QR-Code oder deiner PIN anmelden.
            </p>
          </div>

          {/* Primärer Action-Button: Direkt zum Login */}
          <button
            onClick={() => {
              window.location.href = targetLoginUrl;
            }}
            style={{
              width: '100%',
              minHeight: '52px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '18px',
              fontSize: '0.96rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
              transition: 'transform 0.15s ease'
            }}
          >
            <span>Direkt zum Login</span>
            <ArrowRight size={18} />
          </button>
        </div>
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
    ? resolveCampusStudentAvatar(student)
    : (student.photo_url || getDefaultMusicianAvatarUrl(student.instrument, student.role));

  const pageTitle = isCampus ? 'Willkommen bei Campus' : 'Willkommen bei GrooveLab';
  const cardHeaderText = isCampus ? 'CAMPUS AUSWEIS' : (student.role === 'student' ? 'MEMBER ACCESS' : 'STAFF / COACH');
  const cardSaveTitle = isCampus ? 'Campus Ausweis sichern' : 'Member Pass sichern';

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8fafc', 
      color: '#1e293b', 
      padding: '32px 16px 64px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'flex-start',
      fontFamily: 'system-ui, -apple-system, sans-serif', 
      boxSizing: 'border-box' 
    }}>
      {showConsentConfetti && (
        <Confetti
          numberOfPieces={160}
          recycle={false}
          colors={['#15803d', '#22c55e', '#eab308', '#facc15', '#ffffff']}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, pointerEvents: 'none' }}
        />
      )}
      
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
        isLocked={!consentSaved}
        lockMessage="Elterliche Freigabe erforderlich"
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

        {/* 0. Tier-1 SaaS Parental Onboarding Card (Apple Family Standard) */}
        <div style={{
          background: consentSaved ? '#f0fdf4' : 'transparent',
          border: consentSaved ? '1.5px solid #bbf7d0' : 'none',
          borderRadius: consentSaved ? '24px' : '0',
          padding: consentSaved ? '20px' : '0',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: consentSaved ? '0 4px 20px rgba(34, 197, 94, 0.08)' : 'none'
        }}>
          {/* Card Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                background: consentSaved ? '#dcfce7' : '#f0fdf4',
                color: consentSaved ? '#166534' : '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Shield size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {consentSaved ? 'Zugang erfolgreich freigeschaltet' : `Zugang für ${student.first_name || 'dein Kind'} freischalten`}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                  {consentSaved 
                    ? 'Alle Funktionen und Ausweise sind ab sofort aktiv.' 
                    : `Schritt ${onboardingStep} von 3: ${onboardingStep === 1 ? 'Nutzungsmodus' : onboardingStep === 2 ? 'PIN & Kinderschutz' : 'Freigabe & Terminschutz'}`
                  }
                </div>
              </div>
            </div>

            {/* Step Progress Indicator (Apple Style) */}
            {!consentSaved && (
              <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: '2px' }}>
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    style={{
                      height: '4px',
                      flex: 1,
                      borderRadius: '2px',
                      background: s <= onboardingStep ? '#15803d' : '#e2e8f0',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {!consentSaved ? (
            <>
              {/* SCHRITT 1: NUTZUNGSMODUS */}
              {onboardingStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                      Wer nutzt die App auf diesem Gerät?
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Wähle das passende Profil für den Alltag. Du kannst dies im Elternbereich jederzeit anpassen.
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setCampusUsageMode('selbstnutzer')}
                      style={{
                        padding: '16px 12px',
                        borderRadius: '16px',
                        border: `2px solid ${campusUsageMode === 'selbstnutzer' ? '#15803d' : '#e2e8f0'}`,
                        background: campusUsageMode === 'selbstnutzer' ? '#f0fdf4' : '#ffffff',
                        color: campusUsageMode === 'selbstnutzer' ? '#14532d' : '#475569',
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: campusUsageMode === 'selbstnutzer' ? '0 4px 14px rgba(21, 128, 61, 0.12)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        background: campusUsageMode === 'selbstnutzer' ? '#dcfce7' : '#f1f5f9',
                        color: campusUsageMode === 'selbstnutzer' ? '#15803d' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Smartphone size={20} strokeWidth={2.2} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 900 }}>Selbstnutzer</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 600, color: campusUsageMode === 'selbstnutzer' ? '#166534' : '#64748b', marginTop: '2px' }}>
                          Eigenständig am Smartphone
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCampusUsageMode('eltern_geführt')}
                      style={{
                        padding: '16px 12px',
                        borderRadius: '16px',
                        border: `2px solid ${campusUsageMode === 'eltern_geführt' ? '#15803d' : '#e2e8f0'}`,
                        background: campusUsageMode === 'eltern_geführt' ? '#f0fdf4' : '#ffffff',
                        color: campusUsageMode === 'eltern_geführt' ? '#14532d' : '#475569',
                        cursor: 'pointer',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: campusUsageMode === 'eltern_geführt' ? '0 4px 14px rgba(21, 128, 61, 0.12)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    >
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        background: campusUsageMode === 'eltern_geführt' ? '#dcfce7' : '#f1f5f9',
                        color: campusUsageMode === 'eltern_geführt' ? '#15803d' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ShieldCheck size={20} strokeWidth={2.2} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 900 }}>Mit Eltern</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 600, color: campusUsageMode === 'eltern_geführt' ? '#166534' : '#64748b', marginTop: '2px' }}>
                          Für Grundschulkinder
                        </div>
                      </div>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOnboardingStep(2)}
                    style={{
                      width: '100%',
                      background: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '13px',
                      fontSize: '0.86rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(21, 128, 61, 0.2)',
                      marginTop: '4px'
                    }}
                    className="hover-scale"
                  >
                    <span>Weiter: PIN &amp; Kinderschutz</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* SCHRITT 2: FOKUSSIERTE ELTERN-SICHERHEIT (PIN & PASSKEY) */}
              {onboardingStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Master PIN Input Card */}
                  <div style={{
                    background: '#ffffff',
                    padding: '20px 16px',
                    borderRadius: '20px',
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.90rem', fontWeight: 900, color: '#0f172a' }}>
                        6-stellige Eltern-PIN festlegen
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', maxWidth: '300px' }}>
                        Schützt deinen Elternbereich (Verträge, Kündigung, Lehrer-Chat). Dein Kind nutzt später seine eigene 4-stellige PIN.
                      </div>
                    </div>

                    {/* Apple Passcode Indicator Dots */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '6px 0' }}>
                      {[0, 1, 2, 3, 4, 5].map((i) => {
                        const isFilled = parentPin6.length > i;
                        return (
                          <div
                            key={i}
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              border: `2px solid ${isFilled ? '#15803d' : '#cbd5e1'}`,
                              background: isFilled ? '#15803d' : '#ffffff',
                              transform: isFilled ? 'scale(1.1)' : 'scale(1)',
                              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                          />
                        );
                      })}
                    </div>

                    <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                      <input
                        id="parent-pin-input"
                        type={showParentPin ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={parentPin6}
                        autoFocus
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 6) setParentPin6(val);
                        }}
                        placeholder="••••••"
                        style={{
                          width: '100%',
                          padding: '12px 44px 12px 14px',
                          borderRadius: '14px',
                          border: `2px solid ${parentPin6.length === 6 ? '#15803d' : '#cbd5e1'}`,
                          fontSize: '1.2rem',
                          fontWeight: 900,
                          letterSpacing: '0.3em',
                          textAlign: 'center',
                          boxSizing: 'border-box',
                          background: '#f8fafc',
                          color: '#0f172a',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        className="focus-ring"
                      />
                      <button
                        type="button"
                        onClick={() => setShowParentPin(!showParentPin)}
                        aria-label={showParentPin ? 'PIN verbergen' : 'PIN anzeigen'}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          cursor: 'pointer',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {showParentPin ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: parentPin6.length === 6 ? '#15803d' : '#94a3b8' }}>
                      {parentPin6.length === 6 ? '✓ 6 Ziffern vollständig' : `${parentPin6.length} von 6 Ziffern eingegeben`}
                    </div>
                  </div>

                  {/* Optionaler Eltern-Passkey (Face ID / Fingerabdruck) */}
                  {parentPin6.length === 6 && (
                    <div style={{
                      background: biometricsRegistered ? '#f0fdf4' : '#f8fafc',
                      border: `1.5px solid ${biometricsRegistered ? '#bbf7d0' : '#e2e8f0'}`,
                      borderRadius: '18px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      animation: 'fadeIn 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: biometricsRegistered ? '#dcfce7' : '#ffffff',
                          color: biometricsRegistered ? '#15803d' : '#475569',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Fingerprint size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.80rem', fontWeight: 850, color: '#0f172a' }}>
                            {isIOS ? 'Face ID / Touch ID für Elternbereich' : isAndroid ? 'Fingerabdruck für Elternbereich' : 'Biometrischer Passkey (Optional)'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.35, marginTop: '1px' }}>
                            {biometricsRegistered 
                              ? 'Passkey auf diesem Eltern-Gerät aktiv. Elternbereich öffnet ohne PIN-Eingabe.' 
                              : 'Künftig ohne PIN-Tippen direkt mit 1 Blick/Finger in den Elternbereich.'}
                          </div>
                        </div>
                      </div>

                      {!biometricsRegistered ? (
                        <button
                          type="button"
                          onClick={handleRegisterParentBiometrics}
                          disabled={registeringBiometrics}
                          style={{
                            width: '100%',
                            background: '#0f172a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: registeringBiometrics ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.15s'
                          }}
                        >
                          <Fingerprint size={16} />
                          <span>{registeringBiometrics ? 'Wird gekoppelt...' : (isIOS ? 'Face ID / Touch ID aktivieren' : 'Fingerabdruck aktivieren')}</span>
                        </button>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: '#166534'
                        }}>
                          <CheckCircle2 size={16} color="#16a34a" />
                          <span>Dieses Gerät ist als vertrauenswürdiges Eltern-Gerät gekoppelt</span>
                        </div>
                      )}

                      {biometricsError && (
                        <div style={{ fontSize: '0.68rem', color: '#b91c1c', fontWeight: 700 }}>
                          {biometricsError}
                        </div>
                      )}

                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', lineHeight: 1.3 }}>
                        🔒 <strong>Schutzgrenze:</strong> Dein Kind nutzt auf seinem Gerät seine eigene 4-stellige PIN und hat keinen Zugriff auf den Elternbereich.
                      </div>
                    </div>
                  )}

                  {/* Kinderschutz & Autonomie (Rechtevergabe durch Eltern) */}
                  <div style={{
                    background: '#ffffff',
                    padding: '16px',
                    borderRadius: '20px',
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#f0fdf4',
                          color: '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Shield size={16} strokeWidth={2.4} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a' }}>
                            Rechte &amp; Kinderschutz
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '1px' }}>
                            Bestimme die Autonomie für {student?.first_name || 'dein Kind'}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: '#166534',
                        background: '#dcfce7',
                        padding: '3px 8px',
                        borderRadius: '100px'
                      }}>
                        Privacy by Default
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Toggle 1: Terminabsagen */}
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '14px',
                        background: parentAllowAbsences ? '#f0fdf4' : '#f8fafc',
                        border: `1.5px solid ${parentAllowAbsences ? '#86efac' : '#f1f5f9'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ marginTop: '2px', color: parentAllowAbsences ? '#15803d' : '#64748b' }}>
                            <Calendar size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                              Termine selbstständig absagen
                            </div>
                            <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '1px', lineHeight: 1.3 }}>
                              {parentAllowAbsences
                                ? `${student?.first_name || 'Kind'} darf Musikstunden eigenständig absagen.`
                                : `Standard: Nur Erziehungsberechtigte mit Eltern-PIN (§ 106 BGB).`}
                            </div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={parentAllowAbsences}
                          onChange={(e) => setParentAllowAbsences(e.target.checked)}
                          style={{ accentColor: '#15803d', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                        />
                      </label>

                      {/* Toggle 2: Ausweichtermine annehmen */}
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '14px',
                        background: parentAllowReschedule ? '#f0fdf4' : '#f8fafc',
                        border: `1.5px solid ${parentAllowReschedule ? '#86efac' : '#f1f5f9'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ marginTop: '2px', color: parentAllowReschedule ? '#15803d' : '#64748b' }}>
                            <RotateCcw size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                              Ausweichtermine eigenständig annehmen
                            </div>
                            <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '1px', lineHeight: 1.3 }}>
                              {parentAllowReschedule
                                ? `Ersatztermine der Lehrkraft können direkt gebucht werden.`
                                : `Standard: Ausweichtermine erfordern elterliche Freigabe (§ 615 BGB).`}
                            </div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={parentAllowReschedule}
                          onChange={(e) => setParentAllowReschedule(e.target.checked)}
                          style={{ accentColor: '#15803d', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                        />
                      </label>

                      {/* Toggle 3: Direkt-Chat mit Lehrkraft */}
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '14px',
                        background: parentAllowChat ? '#f0fdf4' : '#f8fafc',
                        border: `1.5px solid ${parentAllowChat ? '#86efac' : '#f1f5f9'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ marginTop: '2px', color: parentAllowChat ? '#15803d' : '#64748b' }}>
                            <MessageSquare size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                              1:1 Direkt-Chat mit der Lehrkraft
                            </div>
                            <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '1px', lineHeight: 1.3 }}>
                              {parentAllowChat
                                ? `Fachlicher Austausch zu Hausaufgaben & Noten freigegeben.`
                                : `Deaktiviert: Kommunikation läuft ausschließlich über Eltern.`}
                            </div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={parentAllowChat}
                          onChange={(e) => setParentAllowChat(e.target.checked)}
                          style={{ accentColor: '#15803d', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                        />
                      </label>
                    </div>

                    <div style={{
                      fontSize: '0.66rem',
                      color: '#64748b',
                      background: '#f8fafc',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      lineHeight: 1.35
                    }}>
                      💡 <strong>Elterliche Kontrolle:</strong> Du kannst jede dieser Freigaben später im geschützten Elternbereich mit einem Klick anpassen oder widerrufen.
                    </div>
                  </div>

                  {/* Back & Next Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setOnboardingStep(1)}
                      style={{
                        flex: 1,
                        background: '#ffffff',
                        color: '#475569',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '13px',
                        fontSize: '0.84rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <ChevronLeft size={16} />
                      <span>Zurück</span>
                    </button>

                    <button
                      type="button"
                      disabled={parentPin6.length !== 6}
                      onClick={() => {
                        if (parentPin6.length === 6) setOnboardingStep(3);
                      }}
                      style={{
                        flex: 2,
                        background: parentPin6.length === 6 ? '#15803d' : '#94a3b8',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '13px',
                        fontSize: '0.86rem',
                        fontWeight: 900,
                        cursor: parentPin6.length === 6 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: parentPin6.length === 6 ? '0 4px 14px rgba(21, 128, 61, 0.2)' : 'none'
                      }}
                      className={parentPin6.length === 6 ? 'hover-scale' : undefined}
                    >
                      <span>Weiter: Freigabe</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* SCHRITT 3: RECHTLICHE FREIGABE & AKTIVIERUNG */}
              {onboardingStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Apple Settings Grouped Inset Card */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {/* Section 1: Basis-Setup */}
                    <div>
                      <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Profil &amp; Sicherheit
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>Nutzungsmodus:</span>
                          <span style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', fontSize: '0.70rem' }}>
                            {campusUsageMode === 'selbstnutzer' ? 'Selbstnutzer' : 'Mit Eltern'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>Eltern-Master-PIN:</span>
                          <span style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', fontSize: '0.70rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={11} strokeWidth={3} /> 6 Ziffern hinterlegt
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ height: '1px', background: '#e2e8f0' }} />

                    {/* Section 2: Inklusivleistungen (Kostenlose Basis) */}
                    <div>
                      <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Inklusivleistungen (Kostenlos)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>Hausaufgabenheft &amp; Notizen:</span>
                          <span style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', fontSize: '0.70rem' }}>● Inklusive</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>Alle Schuljahrestermine:</span>
                          <span style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', fontSize: '0.70rem' }}>● Inklusive</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>1:1 Eltern-Lehrer-Chat:</span>
                          <span style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', fontSize: '0.70rem' }}>● Aktiviert</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ height: '1px', background: '#e2e8f0' }} />

                    {/* Section 3: Terminschutz & Autonomie */}
                    <div>
                      <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Terminschutz &amp; Autonomie
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>Terminabsagen durch Kind:</span>
                          {parentAllowAbsences ? (
                            <span style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', fontSize: '0.70rem' }}>✦ Selbstständig</span>
                          ) : (
                            <span style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', fontSize: '0.70rem' }}>🔒 Eltern-PIN nötig</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>Ausweichtermine annehmen:</span>
                          {parentAllowReschedule ? (
                            <span style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', fontSize: '0.70rem' }}>✦ Selbstständig</span>
                          ) : (
                            <span style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', fontSize: '0.70rem' }}>🔒 Eltern-PIN nötig</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#475569', fontWeight: 600 }}>Direkt-Chat Kind &amp; Lehrer:</span>
                          {parentAllowChat ? (
                            <span style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', fontSize: '0.70rem' }}>✦ Freigegeben</span>
                          ) : (
                            <span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', fontSize: '0.70rem' }}>🔒 Nur über Eltern</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rechtskonforme 1-Klick Bestätigung */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    cursor: 'pointer',
                    background: '#f0fdf4',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1.5px solid #bbf7d0',
                    transition: 'border-color 0.2s ease'
                  }}>
                    <input
                      type="checkbox"
                      checked={parentalConsent}
                      onChange={(e) => setParentalConsent(e.target.checked)}
                      style={{
                        marginTop: '3px',
                        cursor: 'pointer',
                        accentColor: '#15803d',
                        width: '18px',
                        height: '18px',
                        flexShrink: 0
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 850, color: '#0f172a' }}>
                        Rechtssichere elterliche Freigabe (Art. 8 DSGVO / BGB)
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600, lineHeight: 1.45 }}>
                        Ich bin für {student.first_name || 'mein Kind'} sorgeberechtigt und schalte den Zugang hiermit frei. Diese Freigabe ist jederzeit mit einem Klick im Elternbereich oder per Nachricht an {school?.name || 'die Musikschule'} widerruflich.
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLegalModalTab('privacy');
                        }}
                        style={{
                          alignSelf: 'flex-start',
                          background: 'none',
                          border: 'none',
                          padding: '2px 0',
                          color: '#15803d',
                          fontWeight: 800,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontSize: '0.70rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '2px'
                        }}
                      >
                        <span>Datenschutzerklärung einsehen</span>
                        <ArrowRight size={11} />
                      </button>
                    </div>
                  </label>

                  {/* Error Alert Display */}
                  {consentError && (
                    <div style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                      <span>{consentError}</span>
                    </div>
                  )}

                  {/* Activation & Back Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setOnboardingStep(2)}
                      style={{
                        flex: 1,
                        background: '#ffffff',
                        color: '#475569',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '18px',
                        padding: '14px',
                        fontSize: '0.84rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <ChevronLeft size={16} />
                      <span>Zurück</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveParentalConsent}
                      disabled={!parentalConsent || savingConsent || parentPin6.length !== 6}
                      aria-label="Zugang jetzt freischalten"
                      style={{
                        flex: 2,
                        minHeight: '52px',
                        background: parentalConsent && parentPin6.length === 6 ? '#15803d' : '#94a3b8',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '18px',
                        padding: '14px 18px',
                        fontSize: '0.90rem',
                        fontWeight: 900,
                        cursor: parentalConsent && parentPin6.length === 6 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: parentalConsent && parentPin6.length === 6 ? '0 8px 24px -4px rgba(21, 128, 61, 0.35)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      className={parentalConsent && parentPin6.length === 6 ? 'focus-ring hover-scale' : undefined}
                    >
                      <ShieldCheck size={18} strokeWidth={2.5} />
                      <span>{savingConsent ? 'Wird freigeschaltet...' : `Zugang für ${student.first_name || 'Kind'} freischalten`}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{
              fontSize: '0.82rem',
              color: '#15803d',
              fontWeight: 700,
              lineHeight: 1.5,
              textAlign: 'center',
              background: '#f0fdf4',
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid #bbf7d0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={24} color="#15803d" />
              <div>
                <strong>Zugang erfolgreich freigeschaltet!</strong><br />
                <span style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 600 }}>
                  Der Schülerausweis und alle App-Zugänge sind ab sofort aktiv. Deine 6-stellige Eltern-PIN ist sicher hinterlegt.
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Post-Activation Stage: Unlocks smoothly only when consentSaved is true */}
        {!consentSaved ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px 16px',
            borderRadius: '16px',
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
            fontSize: '0.74rem',
            fontWeight: 700,
            textAlign: 'center',
            margin: '4px 0'
          }}>
            <Lock size={15} color="#64748b" style={{ flexShrink: 0 }} />
            <span>Schülerausweis, Stundenplan-Wunschzeiten und Wallet-Pässe stehen sofort nach der elterlichen Freigabe bereit.</span>
          </div>
        ) : (
          <>
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

            {/* 2. Export Grid */}
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
                <Download size={14} color={activeColor} /> Noten-Sticker
              </button>
            </div>

            {/* 3. Smarte geräte-adaptive Wallet & Ausweis-Optionen */}
            {isAndroid ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  onClick={handleDownloadJPEG}
                  style={{ 
                    width: '100%', 
                    background: '#0f172a', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '14px', 
                    padding: '11px 14px', 
                    fontSize: '0.80rem', 
                    fontWeight: 800, 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
                  }}
                  className="hover-scale"
                >
                  <Download size={16} />
                  <span>Schülerausweis in Fotogalerie sichern (JPEG)</span>
                </button>
              </div>
            ) : isIOS ? (
              <button 
                onClick={handleAppleWalletPassDownload}
                style={{ 
                  width: '100%', 
                  background: '#000000', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '14px', 
                  padding: '11px 14px', 
                  fontSize: '0.80rem', 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
                className="hover-scale"
              >
                <Download size={15} />
                <span>Zu Apple Wallet hinzufügen (.pkpass)</span>
              </button>
            ) : (
              /* Desktop / Allgemein: Beide Optionen mit klarer Kennzeichnung */
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={handleAppleWalletPassDownload}
                  style={{ 
                    flex: 1, 
                    background: '#000000', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '12px', 
                    padding: '9px 12px', 
                    fontSize: '0.74rem', 
                    fontWeight: 800, 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px'
                  }}
                >
                  <Download size={13} /> <span>Apple Wallet</span>
                </button>

                <button 
                  onClick={handleDownloadJPEG}
                  style={{ 
                    flex: 1, 
                    background: '#0f172a', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '12px', 
                    padding: '9px 12px', 
                    fontSize: '0.74rem', 
                    fontWeight: 800, 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px'
                  }}
                >
                  <Download size={13} /> <span>Ausweis (JPEG)</span>
                </button>
              </div>
            )}

            {/* 4. Smart App Install Prompt (PWA / Home Screen Guide) */}
            <div style={{ marginTop: '2px', width: '100%' }}>
              <SmartAppInstallPrompt 
                appName={isCampus ? 'Campus-Groovelab' : 'GrooveLab'} 
                isCampus={isCampus} 
              />
            </div>

            {/* 5. Einladung kopieren & teilen */}
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
              {copied ? 'Zugangs-Einladung kopiert!' : 'Zugangs-Link kopieren'}
            </button>

            {/* 6. Login Button */}
            <button 
              onClick={() => {
                window.location.replace(`/login?platform=${isCampus ? 'campus' : 'groovelab'}`);
              }}
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
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              Direkt zur App / Login <ArrowRight size={16} />
            </button>
          </>
        )}

        {/* Legal Compliance Footer (BFSG 2025 / § 5 DDG / DSGVO) */}
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>
          <span
            role="button"
            tabIndex={0}
            onClick={() => setLegalModalTab('impressum')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLegalModalTab('impressum'); } }}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            Impressum
          </span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span
            role="button"
            tabIndex={0}
            onClick={() => setLegalModalTab('privacy')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLegalModalTab('privacy'); } }}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            Datenschutz
          </span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span
            role="button"
            tabIndex={0}
            onClick={() => setLegalModalTab('terms')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLegalModalTab('terms'); } }}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            AGB
          </span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span
            role="button"
            tabIndex={0}
            onClick={() => setLegalModalTab('accessibility')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLegalModalTab('accessibility'); } }}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            Barrierefreiheit
          </span>
        </div>

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

      {/* Canonical Legal Text Modal */}
      <LegalTextModal
        isOpen={!!legalModalTab}
        onClose={() => setLegalModalTab(null)}
        initialTab={legalModalTab || 'privacy'}
      />

    </div>
  );
};

