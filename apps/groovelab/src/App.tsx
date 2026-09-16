import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { Music, AlertCircle, Play, Pause, ArrowDown, ArrowRight, ArrowLeftRight, Library, Shield, ShieldCheck, FileText, LogOut, Award, Users, User, Monitor, Tablet, X, Camera, Clock, QrCode, Plus, ExternalLink, BarChart, Star, Box, Settings, Lock, Key, Pencil, Trash2, Zap, RotateCcw, Check, CheckCircle, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Search, Mic, Calendar, PlayCircle, Youtube, Megaphone, Mail, School, GraduationCap, Trophy, Compass, MapPin, RefreshCw, Repeat, BookOpen, Info, Disc, Building, ZoomIn } from 'lucide-react';
import { useWindowSize } from 'react-use';
import { useLocation, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { supabase, supabaseUrl, supabaseAnonKey } from './lib/supabase';
import { dbCircuitBreaker } from './utils/circuitBreaker';
import { subscribeUserToPush } from './utils/webPush';
import { StudioAvatar, getInstrumentAvatarUrl, getDefaultMusicianAvatarUrl, renderBandAvatar, resolveStudentInstrumentAsync, getEffectiveInstrument, resolveCampusStudentAvatar } from './components/StudioAvatar';
import { reportClientError, initGlobalErrorListeners } from './lib/errorTelemetry';
import { isDevEnvironment } from './utils/tenantUrlHelper';
import { CampusGroovelabText } from './components/CampusGroovelabBrand';
import { scrubSharedDeviceCache } from './utils/sharedDeviceScrubber';
import { SharedAudioEngine } from './utils/sharedAudioEngine';
import { requestPersistentStorage } from './utils/storagePersistence';

// Initialize global error interception
initGlobalErrorListeners();

// Dynamic lazy imports for top-level dashboards & heavy screens to enable code-splitting & reduce initial bundle size by ~70%
const Startseite2 = lazy(() => import('./components/Startseite2').then(m => ({ default: m.Startseite2 })));
const Startseite = lazy(() => import('./components/Startseite').then(m => ({ default: m.Startseite })));
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const MasterAdminDashboard = lazy(() => import('./components/MasterAdminDashboard').then(m => ({ default: m.MasterAdminDashboard })));
const SecretaryDashboard = lazy(() => import('./components/SecretaryDashboard').then(m => ({ default: m.SecretaryDashboard })));
const StudentAvatarDashboard = lazy(() => import('./components/StudentAvatarDashboard').then(m => ({ default: m.StudentAvatarDashboard })));
const EnsembleDashboard = lazy(() => import('./components/EnsembleDashboard').then(m => ({ default: m.EnsembleDashboard })));
const BandProfileContent = lazy(() => import('./components/BandProfileContent'));
const QRLandingPage = lazy(() => import('./components/QRLandingPage').then(m => ({ default: m.QRLandingPage })));
const LoginScreen = lazy(() => import('./components/LoginScreen').then(m => ({ default: m.LoginScreen })));
const QRCodeModal = lazy(() => import('./components/QRCodeModal').then(m => ({ default: m.QRCodeModal })));
const DeviceSetupScreen = lazy(() => import('./components/DeviceSetupScreen').then(m => ({ default: m.DeviceSetupScreen })));
const ContractEndPrompt = lazy(() => import('./components/ContractEndPrompt').then(m => ({ default: m.ContractEndPrompt })));
const SignupWizard = lazy(() => import('./components/SignupWizard').then(m => ({ default: m.SignupWizard })));
const StudentRadarChart = lazy(() => import('./components/StudentRadarChart'));
const StudentOnboardingPage = lazy(() => import('./components/StudentOnboardingPage').then(m => ({ default: m.StudentOnboardingPage })));
const DeviceOnboardingPage = lazy(() => import('./components/DeviceOnboardingPage').then(m => ({ default: m.DeviceOnboardingPage })));
const SchoolSelfOnboardingModal = lazy(() => import('./components/SchoolSelfOnboardingModal').then(m => ({ default: m.SchoolSelfOnboardingModal })));
const GhostSupportCapsule = lazy(() => import('./components/masterAdmin/GhostSupportCapsule').then(m => ({ default: m.GhostSupportCapsule })));
const SharedAudioBiographyPage = lazy(() => import('./components/campus/SharedAudioBiographyPage').then(m => ({ default: m.SharedAudioBiographyPage })));
import { OnboardingHelpModalsHub } from './components/modals/OnboardingHelpModalsHub';
import { LegalModalsHub } from './components/modals/LegalModalsHub';
import { SecurityAuthModalsHub } from './components/modals/SecurityAuthModalsHub';
import { DetailProfilesModalsHub } from './components/modals/DetailProfilesModalsHub';
import { BandFoundingModalsHub } from './components/modals/BandFoundingModalsHub';
import { ProfileBandModalsHub } from './components/modals/ProfileBandModalsHub';
import { MessagesTabContainer } from './components/messages/MessagesTabContainer';
import { StudentPracticeRepertoireTabs } from './components/groovelab/StudentPracticeRepertoireTabs';
import { StudentBandMatchingSuite } from './components/groovelab/StudentBandMatchingSuite';
import { StudentLibraryTab } from './components/groovelab/StudentLibraryTab';
import { StudentTeamTab } from './components/groovelab/StudentTeamTab';
import { CampusStaffProfileView } from './components/campus/CampusStaffProfileView';
import { GrooveLabProfileView } from './components/groovelab/GrooveLabProfileView';
const MaintenanceLockoutOverlay = lazy(() => import('./components/MaintenanceLockoutOverlay').then(m => ({ default: m.MaintenanceLockoutOverlay })));
const GlobalBroadcastBanner = lazy(() => import('./components/GlobalBroadcastBanner').then(m => ({ default: m.GlobalBroadcastBanner })));
const PwaUpdateToast = lazy(() => import('./components/ui/PwaUpdateToast').then(m => ({ default: m.PwaUpdateToast })));
const DeviceSimulator = isDevEnvironment() 
  ? lazy(() => import('./components/ui/DeviceSimulator').then(m => ({ default: m.DeviceSimulator })))
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

import { LegalConsentGate } from './components/LegalConsentGate';
import { announceA11y } from './components/common/A11yLiveAnnouncer';

import { MobileBottomNav } from './components/ui/MobileBottomNav';
import { CampusDesktopSidebar } from './components/layout/CampusDesktopSidebar';
import { CampusDesktopHeader } from './components/layout/CampusDesktopHeader';
import { CampusMainContentRouter } from './components/layout/CampusMainContentRouter';
import { renderCampusStartupGates } from './components/layout/CampusStartupGates';
import { PwaInstallationModals } from './components/ui/PwaInstallationModals';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { generateRandomBandName } from './utils/bandNameGenerator';
import { APP_INSTRUMENT_ICONS, APP_INSTRUMENT_COLORS, brandColor } from './constants/instruments';
import { normalizeInstrument, renderInstrumentIcon } from './utils/instruments';
import { getDistanceFromLatLonInM } from './utils/geo';
import { flushOfflineSyncQueue } from './services/offlineSyncService';
import { MobileTopHeader } from './components/ui/MobileTopHeader';
import { formatTeacherFullName } from './utils/nameHelper';
import { CampusLevelSwitcher, CampusUiLevel } from './components/campus/CampusLevelSwitcher';
import { useMasterPricing } from './context/MasterPricingContext';
import { OfflineStatusBadge } from './components/ui/OfflineStatusBadge';
import { OfflineSyncIndicator } from './components/ui/OfflineSyncIndicator';
import { PrivacyShieldOverlay } from './components/ui/PrivacyShieldOverlay';
import { usePrivacyShield } from './hooks/usePrivacyShield';
import { useCampusChatActions } from './hooks/useCampusChatActions';
import { useBandRepertoireActions } from './hooks/useBandRepertoireActions';
import { useAuthSessionActions } from './hooks/useAuthSessionActions';
import { useCampusSessionLifecycle } from './hooks/useCampusSessionLifecycle';
import { useCampusMessagingData } from './hooks/useCampusMessagingData';
import { useCampusSecurityGuards } from './hooks/useCampusSecurityGuards';
import { useCampusDashboardMetrics } from './hooks/useCampusDashboardMetrics';
import { useCampusDashboardDataLoader } from './hooks/useCampusDashboardDataLoader';
import { useCampusRealtimeSync } from './hooks/useCampusRealtimeSync';
import { BAND_AVATARS, CAMPUS_AVATARS, STUDENT_AVATARS, TEACHER_AVATARS } from './constants/avatars';
import { initGlobalErrorSanitizer } from './utils/errorSanitizer';
import { initAntiTamperShield } from './utils/antiTamper';
import { runStorageJanitor, runClientStorageJanitor } from './services/storageJanitorService';
import { scrubSensitiveUrlParams, scrubSensitiveUrlPath } from './utils/urlSecurityScrubber';
import { executeSessionZeroize } from './utils/sessionZeroize';
import { initAuthBroadcastListener } from './utils/authBroadcastSync';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import './App.css';

// Initialize FinTech Zero-PII Crash Telemetry Sanitizer & Anti-Tamper Shield
initGlobalErrorSanitizer();
initAntiTamperShield();

// --- GLOBAL CAMERA KILL SWITCH ---
// This guarantees that any third-party scanner library like react-qr-scanner
// cannot keep the camera active after the user has logged in.
if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  if (!(window as any)._cameraPatched) {
    (window as any)._cameraPatched = true;
    (window as any)._activeMediaStreams = [];
    
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await originalGetUserMedia(constraints);
      (window as any)._activeMediaStreams.push(stream);
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          if ((window as any)._activeMediaStreams) {
            (window as any)._activeMediaStreams = (window as any)._activeMediaStreams.filter((s: MediaStream) => s.active && s !== stream);
          }
        }, { once: true });
      });
      return stream;
    };
    
    (window as any).stopAllCameras = () => {
      if ((window as any)._activeMediaStreams) {
        (window as any)._activeMediaStreams.forEach((stream: MediaStream) => {
          stream.getTracks().forEach(track => {
            track.stop();
            stream.removeTrack(track);
          });
        });
        (window as any)._activeMediaStreams = [];
      }
    };

    window.addEventListener('beforeunload', () => {
      (window as any).stopAllCameras();
    });
    window.addEventListener('pagehide', () => {
      (window as any).stopAllCameras();
    });
  }
}

let _lastReplaceStateTime = 0;
let _replaceStateCount = 0;

const safeReplaceState = (data: any, unused: string, url?: string | URL | null) => {
  if (typeof window === 'undefined' || !window.history) return;
  try {
    if (url) {
      const urlStr = typeof url === 'string' ? url : url.toString();
      const currentFull = window.location.pathname + window.location.search + window.location.hash;
      if (currentFull === urlStr) return;
    }
    const now = Date.now();
    if (now - _lastReplaceStateTime > 10000) {
      _lastReplaceStateTime = now;
      _replaceStateCount = 0;
    }
    _replaceStateCount++;
    if (_replaceStateCount > 25) {
      return;
    }
    window.history.replaceState(data, unused, url);
  } catch (e) {
    console.warn('[History] safeReplaceState caught error:', e);
  }
};

const showMissionsFeature = false;
const showEnsemblesFeature = false;


const getRoleColor = (role: string, stationName?: string, stationColor?: string) => {
  const r = role?.toLowerCase();
  if (r === 'teacher' || r === 'admin') {
    if (!stationName) return '#64748b'; // Gray for teachers in Home/no station mode
    return '#34a853'; // Green when checked in at a station
  }
  if (!stationName) return '#64748b'; // Default gray
  
  if (stationColor && stationColor !== '#e5e7eb' && stationColor !== '#e2e8f0' && stationColor !== '#cbd5e1') {
    return stationColor;
  }
  
  const match = stationName.match(/\d+/);
  if (!match) return '#64748b';
  
  const num = parseInt(match[0]);
  if (num === 1 || num === 2) return '#eab308'; // Yellow
  if (num === 3 || num === 4) return '#a855f7'; // Purple
  if (num === 5 || num === 6) return '#3b82f6'; // Blue
  if (num === 7 || num === 8) return '#eab308'; // Yellow
  
  return '#64748b';
};

// --- Types & Interfaces ---
interface UserProfile {
  id: string;
  role: 'student' | 'teacher' | 'admin';
  first_name: string;
  last_name?: string;
  instrument?: string;
  photo_url?: string;
  school_id?: string;
  schools?: { name: string };
  qr_token?: string;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  level?: number;
  media_link?: string;
  tomplay_url?: string;
  instrumentation?: Record<string, number>;
  school_id?: string;
}

interface SongSkill {
  id: string;
  song_id: string;
  user_id?: string;
  title: string;
  artist: string;
  progress: number;
  instrument: string;
  difficulty_level: 'starter' | 'original';
  is_stage_ready: boolean;
  locked: boolean;
  is_pending_approval: boolean;
  media_link?: string;
  tomplay_url?: string;
  verified_by_id?: string;
  verified_by?: { first_name: string, last_name: string };
}

interface BandMember {
  id: string;
  user_id: string | null;
  instrument: string;
  external_name?: string;
  users?: {
    id: string;
    first_name: string;
    photo_url: string;
  };
  profiles?: any;
}

interface Band {
  id: string;
  name: string;
  photo_url?: string;
  genre?: string;
  bio?: string;
  band_members?: BandMember[];
  band_songs?: { songs: Song }[];
  myInstrument?: string;
  myMemberId?: string;
  confetti_seen?: boolean;
  coach_id?: string;
  coach_is_manual?: boolean;
  coach?: { first_name: string, last_name: string, photo_url: string };
}

interface WallFormation {
  id: string;
  members: Array<{
    user_id: string;
    first_name: string;
    photo_url?: string;
    instrument: string;
    created_at: string;
  }>;
  memberMap: Record<string, any>;
  level: string;
  isComplete: boolean;
  isInitial?: boolean;
}

interface WallSong {
  id: string;
  song_id: string;
  artist: string;
  title: string;
  media_link?: string;
  instrumentation: Record<string, number>;
  formations: WallFormation[];
  level: string;
}



if (typeof window !== 'undefined') {
  // Purge legacy shared credentials from localStorage to enforce per-tab isolation
  try {
    localStorage.removeItem('groovelab_user_id');
    localStorage.removeItem('groovelab_cached_user');
    localStorage.removeItem('groovelab_location_mode');
  } catch (e) {}
}

// Auto-setup kiosk mode from URL parameters
const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const isStandalone = typeof window !== 'undefined' && 
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);

// Handle platform override from URL (e.g. from LandingPage search)
const targetPlatform = params.get('platform');
if (targetPlatform && (targetPlatform === 'campus' || targetPlatform === 'groovelab' || targetPlatform === 'ensembles')) {
  sessionStorage.setItem('groovelab_active_platform', targetPlatform);
  if (isStandalone) {
    params.delete('platform');
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
    if (typeof window !== 'undefined' && window.history) {
      safeReplaceState({}, '', newUrl);
    }
  }
}

const kioskTokenParam = params.get('kiosk_token');
if (kioskTokenParam) {
  localStorage.setItem('groovelab_kiosk_token', kioskTokenParam);
  
  // Persist station_id if provided in the redirect URL
  const urlStationId = params.get('station_id') || params.get('kiosk_station_id');
  if (urlStationId) {
    localStorage.setItem('groovelab_station_id', urlStationId);
  } else {
    localStorage.removeItem('groovelab_station_id');
  }

  // Persist kiosk_room_id if provided
  const urlRoomId = params.get('kiosk_room_id');
  if (urlRoomId) {
    localStorage.setItem('groovelab_kiosk_room_id', urlRoomId);
  } else {
    localStorage.removeItem('groovelab_kiosk_room_id');
  }

  sessionStorage.removeItem('groovelab_user_id');
  sessionStorage.removeItem('groovelab_location_mode');
  
  // Strip sensitive tokens from URL history universally across all browsers
  params.delete('kiosk_token');
  params.delete('station_id');
  params.delete('kiosk_station_id');
  params.delete('kiosk_room_id');
  const newSearch = params.toString();
  const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
  safeReplaceState({}, '', newUrl);
}

const kioskStationId = params.get('kiosk_station_id') || params.get('station_id');
if (kioskStationId) {
  localStorage.setItem('groovelab_station_id', kioskStationId);
  sessionStorage.removeItem('groovelab_user_id');
  sessionStorage.removeItem('groovelab_location_mode');
  
  // Strip parameters and redirect to clean up URL ONLY in standalone mode
  if (isStandalone) {
    params.delete('kiosk_station_id');
    params.delete('station_id');
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
    window.location.replace(newUrl);
  }
}

// Persist kiosk_room_id to localStorage so we can restore it on "Beenden"
const kioskRoomIdFromUrl = params.get('kiosk_room_id');
if (kioskRoomIdFromUrl) {
  localStorage.setItem('groovelab_kiosk_room_id', kioskRoomIdFromUrl);
}

if (typeof window !== 'undefined') {
  window.alert = (message: string) => {
    // 1. Remove existing custom alert if any
    const existing = document.getElementById('apple-alert-root');
    if (existing) {
      existing.remove();
    }

    // 2. Create styling tag if not present
    if (!document.getElementById('apple-alert-styles')) {
      const style = document.createElement('style');
      style.id = 'apple-alert-styles';
      style.innerHTML = `
        @keyframes appleAlertFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes appleAlertScaleIn {
          from { transform: scale(0.95) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .apple-alert-close-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.05);
        }
        .apple-alert-close-btn:active {
          transform: translateY(0);
          filter: brightness(0.95);
        }
      `;
      document.head.appendChild(style);
    }

    // 3. Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'apple-alert-root';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '999999';
    overlay.style.background = 'rgba(15, 23, 42, 0.3)';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.setProperty('-webkit-backdrop-filter', 'blur(8px)');
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.25s ease-out';
    overlay.style.fontFamily = 'inherit';

    // Determine type
    const msgLower = String(message).toLowerCase();
    const isError = msgLower.includes('fehler') || msgLower.includes('error') || msgLower.includes('fehlgeschlagen') || msgLower.includes('konnte nicht') || msgLower.includes('deaktiviert') || msgLower.includes('gesperrt');
    const isSuccess = msgLower.includes('erfolg') || msgLower.includes('erfolgreich') || msgLower.includes('glückwunsch') || msgLower.includes('kopiert') || msgLower.includes('bereit') || msgLower.includes('gespeichert') || msgLower.includes('zurückgesetzt') || msgLower.includes('gelöscht') || msgLower.includes('gesendet') || msgLower.includes('eingereicht') || msgLower.includes('akzeptiert') || msgLower.includes('✅') || msgLower.includes('🎉') || msgLower.includes('🤘') || msgLower.includes('🚀');

    let iconHtml = '';
    const activePlat = typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'groovelab';
    let isCampus = activePlat === 'campus';
    if (typeof window !== 'undefined' && !isCampus) {
      if (document.body && (
        document.body.innerText.includes('Campus Räumlichkeiten') ||
        document.body.innerText.includes('Campus Stundenplan') ||
        document.body.innerText.includes('Campus')
      )) {
        isCampus = true;
      }
    }
    let titleText = isCampus ? 'Campus' : (activePlat === 'groovelab' ? 'GrooveLab' : 'Campus-Groovelab');
    let btnBackground = 'linear-gradient(135deg, #34a853, #34a853)';
    let btnShadow = '0 4px 12px rgba(52, 168, 83, 0.2)';
    
    if (isError) {
      titleText = 'Hinweis';
      btnBackground = 'linear-gradient(135deg, #ef4444, #dc2626)';
      btnShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
      iconHtml = `
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(239, 68, 68, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(239, 68, 68, 0.15);">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
      `;
    } else if (isSuccess) {
      iconHtml = `
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(52, 168, 83, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(52, 168, 83, 0.15);">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34a853" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      `;
    } else {
      btnBackground = 'linear-gradient(135deg, #eab308, #ca8a04)';
      btnShadow = '0 4px 12px rgba(234, 179, 8, 0.2)';
      iconHtml = `
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(234, 179, 8, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(234, 179, 8, 0.15);">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </div>
      `;
    }

    // Create alert box
    const alertBox = document.createElement('div');
    alertBox.style.background = 'rgba(255, 255, 255, 0.95)';
    alertBox.style.backdropFilter = 'blur(20px)';
    alertBox.style.setProperty('-webkit-backdrop-filter', 'blur(20px)');
    alertBox.style.borderRadius = '24px';
    alertBox.style.width = '320px';
    alertBox.style.maxWidth = '90%';
    alertBox.style.display = 'flex';
    alertBox.style.flexDirection = 'column';
    alertBox.style.alignItems = 'center';
    alertBox.style.boxShadow = '0 20px 40px rgba(15, 23, 42, 0.15), 0 1px 3px rgba(15, 23, 42, 0.05)';
    alertBox.style.border = '1px solid rgba(226, 232, 240, 0.8)';
    alertBox.style.color = '#0f172a';
    alertBox.style.textAlign = 'center';
    alertBox.style.transform = 'scale(0.95) translateY(10px)';
    alertBox.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out';
    alertBox.style.boxSizing = 'border-box';
    alertBox.style.padding = '28px 24px 24px';

    // Safe innerHTML
    const escapedMessage = String(message)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br />");

    alertBox.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; width: 100%; box-sizing: border-box;">
        ${iconHtml}
        <div style="font-size: 1.25rem; font-weight: 900; color: #0f172a; margin-bottom: 8px;">
          ${titleText}
        </div>
        <div style="font-size: 0.95rem; font-weight: 600; color: #475569; line-height: 1.5; white-space: normal; word-break: break-word; margin-bottom: 24px;">
          ${escapedMessage}
        </div>
        <button class="apple-alert-close-btn" style="
          width: 100%;
          padding: 14px 20px;
          border-radius: 16px;
          background: ${btnBackground};
          border: none;
          color: white;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          outline: none;
          box-shadow: ${btnShadow};
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          font-family: inherit;
        ">OK</button>
      </div>
    `;

    overlay.appendChild(alertBox);
    document.body.appendChild(overlay);

    // Trigger animations in next tick
    setTimeout(() => {
      overlay.style.opacity = '1';
      alertBox.style.transform = 'scale(1) translateY(0)';
    }, 15);

    const closeAlert = () => {
      overlay.style.opacity = '0';
      alertBox.style.transform = 'scale(0.95) translateY(10px)';
      setTimeout(() => {
        overlay.remove();
      }, 250);
    };

    const closeBtn = alertBox.querySelector('.apple-alert-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeAlert);
    }

    // Support ESC and ENTER key to close
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        closeAlert();
        document.removeEventListener('keydown', keyHandler);
      }
    };
    document.addEventListener('keydown', keyHandler);
  };
}

function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/[\s\-.]+/);
  return parts
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
}

const DashboardLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    padding: '40px',
    flexDirection: 'column',
    gap: '16px'
  }}>
    <div className="animate-spin" style={{
      width: '40px',
      height: '40px',
      border: '3px solid rgba(245, 158, 11, 0.1)',
      borderTopColor: '#f59e0b',
      borderRadius: '50%'
    }}></div>
    <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>
      Bereich wird geladen...
    </div>
  </div>
);

function App() {
  const masterPricing = useMasterPricing();

  const [maintenanceBypass, setMaintenanceBypass] = useState<boolean>(() => {
    return typeof window !== 'undefined' && (
      sessionStorage.getItem('cg_maintenance_bypass') === 'true' || 
      localStorage.getItem('cg_maintenance_bypass') === 'true'
    );
  });

  const maintenanceState = useMemo(() => {
    if (masterPricing?.specialOffers) {
      const entry = masterPricing.specialOffers.find((o: any) => o?.id === '__cg_master_maintenance_state__');
      if (entry?.state) return entry.state;
    }
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('cg_master_maintenance_state');
      if (local) {
        try { return JSON.parse(local); } catch (e) {}
      }
    }
    return null;
  }, [masterPricing?.specialOffers]);

  const broadcastAnnouncement = useMemo(() => {
    if (masterPricing?.specialOffers) {
      const entry = masterPricing.specialOffers.find((o: any) => o?.id === '__cg_master_broadcast_announcement__');
      if (entry?.state) return entry.state;
    }
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('cg_master_broadcast_announcement');
      if (local) {
        try { return JSON.parse(local); } catch (e) {}
      }
    }
    return null;
  }, [masterPricing?.specialOffers]);

  // Declarative definition of renderLegalModals to ensure availability across all routes/landing pages via LegalModalsHub
  const renderLegalModals = () => (
    <LegalModalsHub
      showPrivacy={showPrivacy}
      showAgb={showAgb}
      showImpressum={showImpressum}
      showCancellation={showCancellation}
      showAccessibility={showAccessibility}
      onClose={() => {
        setShowPrivacy(false);
        setShowAgb(false);
        setShowImpressum(false);
        setShowCancellation(false);
        setShowAccessibility(false);
      }}
    />
  );

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showStandardLogin, setShowStandardLogin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem('groovelab_local_profiles');
      const list = stored ? JSON.parse(stored) : [];
      return !Array.isArray(list) || list.length === 0;
    } catch {
      return true;
    }
  });

  const isSignup = location.pathname === '/signup';
  const currentView = (location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/master-admin' || location.pathname === '/admin')
    ? 'login'
    : (location.pathname === '/' ? 'landing' : 'dashboard');

  useEffect(() => {
    // Proactive URL token scrubbing to protect user history and referrers
    const timer = setTimeout(() => {
      scrubSensitiveUrlParams();
      // If user is already loaded/logged in on /qr/ or /onboarding/, scrub the path to protect history
      if (sessionStorage.getItem('groovelab_user_id') || sessionStorage.getItem('gl_active_session_lease_id')) {
        scrubSensitiveUrlPath('/');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [location.pathname, searchParams]);

  // Multi-tab logout synchronization (Zero-Trust Session Invalidation)
  useEffect(() => {
    const cleanup = initAuthBroadcastListener();
    return cleanup;
  }, []);

  const [showQuarterlyAccessReportModal, setShowQuarterlyAccessReportModal] = useState(false);


  const qrPathMatch = location.pathname.match(/^\/qr\/([^/?#]+)/);

  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.endsWith('.localhost') ||
    window.location.hostname.endsWith('.local')
  );

  const [loggedInUserId, setLoggedInUserIdRaw] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const isMasterAuth = sessionStorage.getItem('groovelab_is_master_admin') === 'true';
    const ghostAuthToken = sessionStorage.getItem('groovelab_ghost_auth_token') || localStorage.getItem('groovelab_ghost_auth_token');
    const isMasterValid = isMasterAuth || Boolean(ghostAuthToken);

    const urlParams = new URLSearchParams(window.location.search);
    const isGhost = urlParams.get('support_ghost') === 'true' || 
                    urlParams.get('ghost_session') === 'true' || 
                    sessionStorage.getItem('groovelab_support_ghost') === 'true';
    const ghostSchoolId = urlParams.get('school_id') || 
                          urlParams.get('ghost_school_id') || 
                          sessionStorage.getItem('groovelab_ghost_school_id');
    if (isGhost && ghostSchoolId && isMasterValid) {
      return 'master-support-id';
    }
    const storedId = sessionStorage.getItem('groovelab_user_id');
    if (storedId) return storedId;
    try {
      const cached = sessionStorage.getItem('groovelab_cached_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id) return parsed.id;
      }
    } catch (e) {}

    // 📱 PWA Standalone / Kaltstart-Immunisierung:
    // AUSSCHLIESSLICH im installierten PWA-Standalone-Modus (Home-Screen-App ohne Browser-Tabs)
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isPwa) {
      const persistentId = localStorage.getItem('campus_active_student_id') ||
                           localStorage.getItem('groovelab_current_student_id') ||
                           localStorage.getItem('groovelab_user_id');
      if (persistentId) return persistentId;
    }
    return null;
  });

  const setLoggedInUserId = React.useCallback((val: string | null | ((prev: string | null) => string | null)) => {
    setLoggedInUserIdRaw((prev) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      if (typeof window !== 'undefined') {
        const isPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        if (nextVal) {
          sessionStorage.setItem('groovelab_user_id', nextVal);
          if (isPwa) {
            localStorage.setItem('groovelab_user_id', nextVal);
            localStorage.setItem('campus_active_student_id', nextVal);
          }
        } else {
          sessionStorage.removeItem('groovelab_user_id');
          if (isPwa) {
            localStorage.removeItem('groovelab_user_id');
            localStorage.removeItem('campus_active_student_id');
            localStorage.removeItem('groovelab_current_student_id');
          }
        }
      }
      return nextVal;
    });
  }, []);

  const [locationMode, setLocationModeRaw] = useState<'lab' | 'home'>(() => {
    if (typeof window === 'undefined') return 'home';
    return (sessionStorage.getItem('groovelab_location_mode') as 'lab' | 'home') || 'home';
  });

  const setLocationMode = React.useCallback((val: 'lab' | 'home' | ((prev: 'lab' | 'home') => 'lab' | 'home')) => {
    setLocationModeRaw((prev) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      if (prev === nextVal) return prev;
      if (typeof window !== 'undefined') {
        if (nextVal) {
          sessionStorage.setItem('groovelab_location_mode', nextVal);
        } else {
          sessionStorage.removeItem('groovelab_location_mode');
        }
      }
      return nextVal;
    });
  }, []);
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);



  const [showDeletionPrompt, setShowDeletionPrompt] = useState(false);
  const [deletionPromptUserId, setDeletionPromptUserId] = useState<string | null>(null);
  const [deletionPromptIsHome, setDeletionPromptIsHome] = useState<boolean | undefined>(undefined);

  const [showAutoLockWarning, setShowAutoLockWarning] = useState(false);
  const [autoLockCountdown, setAutoLockCountdown] = useState(30);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showPwaUpdateToast, setShowPwaUpdateToast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Reset install banner dismiss state when scanning QR code or following QR links
    const isQR = window.location.pathname.includes('/qr/') || 
                 window.location.search.includes('qr') || 
                 window.location.search.includes('auto_pair') || 
                 window.location.search.includes('token');
    if (isQR) {
      localStorage.removeItem('groovelab_install_prompt_dismissed');
    }

    // In local development, unregister any stale service worker and purge CacheStorage to prevent freezing Vite HMR!
    if (isLocalhost) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        }).catch(() => {});
      }
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        }).catch(() => {});
      }
    } else if ('serviceWorker' in navigator) {
      // Register service worker in production to ensure PWA installability and update checking
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('Service Worker registered successfully on load:', reg.scope);

          // 📱 Tier-1 Storage Persistence Guard (Protects IndexedDB & Offline Vault from iOS ITP 7-day auto-purge)
          requestPersistentStorage().catch(() => {});

          // If there is already a waiting worker, prompt user to update smoothly via floating toast
          if (reg.waiting && navigator.serviceWorker.controller) {
            console.log('[PWA] Waiting service worker found on load.');
            setShowPwaUpdateToast(true);
          }

          // 🚀 Real-time PWA Service Worker update detection
          const handleSwMessage = (e: MessageEvent) => {
            if (e.data?.type === 'PWA_UPDATED') {
              console.log('[PWA] Received PWA_UPDATED notification:', e.data.version);
              setShowPwaUpdateToast(true);
            }
          };
          navigator.serviceWorker.addEventListener('message', handleSwMessage);

          const handleControllerChange = () => {
            console.log('[PWA] Service Worker controller changed.');
            setShowPwaUpdateToast(true);
          };
          navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

          // Fast version checker via /version.json
          const checkServerVersion = async () => {
            try {
              const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
              if (res.ok) {
                const data = await res.json();
                const currentAppVer = sessionStorage.getItem('campus_app_loaded_version');
                if (!currentAppVer) {
                  sessionStorage.setItem('campus_app_loaded_version', data.version);
                } else if (currentAppVer !== data.version) {
                  console.log('[PWA] New server version detected via version.json:', data.version);
                  setShowPwaUpdateToast(true);
                }
              }
            } catch {}
          };
          checkServerVersion();
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              checkServerVersion();
              reg.update().catch(() => {});
            }
          });

          // Register offline sync queue flusher on network restore
          window.addEventListener('online', () => {
            console.log('[OfflineSync] Network restored. Flushing offline queue...');
            flushOfflineSyncQueue();
          });

          // Check for updates on the server periodically (every 5 minutes)
          setInterval(() => {
            if (navigator.onLine) {
              reg.update().catch((err) => {
                console.warn('[PWA] Service Worker update check failed:', err);
              });
              checkServerVersion();
              console.log('[PWA] Checking for updates on the server...');
            }
          }, 1000 * 60 * 5);

          // Handle updates
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[PWA] New content is available; prompt user via toast.');
                    setShowPwaUpdateToast(true);
                  } else {
                    console.log('[PWA] Content is cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch((err) => console.error('Service Worker registration failed on load:', err));
    }

    // Intercept external links inside standalone PWA to prevent flickering and white screen in WebKit in-app browser
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href) {
        try {
          if (!anchor.href.startsWith('http://') && !anchor.href.startsWith('https://')) {
            return; // Allow mailto:, tel:, etc. to bypass URL checking and use default OS handling
          }
          const url = new URL(anchor.href, window.location.origin);
          const isExternal = url.origin !== window.location.origin;
          const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

          if (isStandalone && isExternal) {
            e.preventDefault();
            window.open(anchor.href, '_blank');
          }
        } catch (err) {
          // Ignore malformed URLs
        }
      }
    };
    document.addEventListener('click', handleAnchorClick);

    // Clear native PWA app badge when app is launched or becomes active
    if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(() => {});
    }

    // iOS Web AudioContext auto-unlock on first user interaction via SharedAudioEngine singleton
    SharedAudioEngine.initAutoUnlock();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
      if (isStandalone) return;

      const dismissedTime = localStorage.getItem('groovelab_install_prompt_dismissed');
      const dismissedRecent = dismissedTime && (Date.now() - Number(dismissedTime) < 7 * 24 * 60 * 60 * 1000);
      
      if (!dismissedRecent) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      document.removeEventListener('click', handleAnchorClick);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !loggedInUserId) return;
    const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS && !isStandalone) {
      const dismissedTime = localStorage.getItem('groovelab_install_prompt_dismissed');
      const dismissedRecent = dismissedTime && (Date.now() - Number(dismissedTime) < 7 * 24 * 60 * 60 * 1000);
      if (!dismissedRecent) {
        setShowInstallBanner(true);
      }
    }

    // Auto-subscribe or sync web push notifications in the background if permission is already granted
    if ('Notification' in window && Notification.permission === 'granted') {
      setTimeout(() => {
        subscribeUserToPush(loggedInUserId)
          .then((success) => console.log('PWA Push auto-subscribe sync outcome:', success))
          .catch((err) => console.error('Failed to sync push subscription:', err));
      }, 2000);
    }
  }, [loggedInUserId]);


  // States for Kiosk lookup and legal modals
  const [kioskDetails, setKioskDetails] = useState<any>(null);
  const [loadingKiosk, setLoadingKiosk] = useState<boolean>(() => typeof window !== 'undefined' ? !!localStorage.getItem('groovelab_kiosk_token') : false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAgb, setShowAgb] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  const [showCancellation, setShowCancellation] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [showTrialInfoModal, setShowTrialInfoModal] = useState(false);
  const [stationIdFromStorage, setStationIdFromStorage] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('groovelab_station_id') : null);
  const [isCampusUnlocked, setIsCampusUnlocked] = useState(false);
  const [showCampusPinPrompt, setShowCampusPinPrompt] = useState(false);
  const [isGlobalHelpCenterOpen, setIsGlobalHelpCenterOpen] = useState(false);
  const [simulatedDate, setSimulatedDate] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('groovelab_simulated_date') || null;
    }
    return null;
  });

  const [showDateSimulation, setShowDateSimulation] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !isDevEnvironment()) return false;
    return localStorage.getItem('groovelab_dev_date_sim_visible') === 'true';
  });

  useEffect(() => {
    if (!isDevEnvironment()) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'T' || e.key === 't')) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        setShowDateSimulation(prev => {
          const next = !prev;
          try { localStorage.setItem('groovelab_dev_date_sim_visible', String(next)); } catch {}
          window.dispatchEvent(new CustomEvent('groovelab_date_sim_toggle', { detail: next }));
          return next;
        });
      }
    };
    const handleToggleSync = (e: any) => {
      if (typeof e?.detail === 'boolean') {
        setShowDateSimulation(e.detail);
      } else {
        const saved = localStorage.getItem('groovelab_dev_date_sim_visible') === 'true';
        setShowDateSimulation(saved);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('groovelab_date_sim_toggle', handleToggleSync);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('groovelab_date_sim_toggle', handleToggleSync);
    };
  }, []);

  const [campusStudentUiLevel, setCampusStudentUiLevel] = useState<CampusUiLevel>(() => {
    if (typeof window === 'undefined') return 'junior';
    try {
      const activeId = localStorage.getItem('groovelab_current_user_id') || localStorage.getItem('campus_active_user_id');
      if (activeId) {
        const namespaced = localStorage.getItem(`campus_student_ui_level_${activeId}`);
        if (namespaced === 'junior' || namespaced === 'teen' || namespaced === 'pro') return namespaced as CampusUiLevel;
      }
    } catch {}
    const saved = localStorage.getItem('campus_student_ui_level');
    if (saved === 'junior' || saved === 'teen' || saved === 'pro') return saved as CampusUiLevel;
    return 'junior';
  });

  const [parentUnlocked, setParentUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('groovelab_parent_unlocked_global') === 'true';
  });

  const [, setParentPermissionsVersion] = useState<number>(0);

  useEffect(() => {
    const handleLevelChangeEvt = (e: any) => {
      if (e?.detail) {
        setCampusStudentUiLevel(e.detail);
        try {
          const activeId = localStorage.getItem('groovelab_current_user_id') || localStorage.getItem('campus_active_user_id');
          if (activeId) {
            localStorage.setItem(`campus_student_ui_level_${activeId}`, e.detail);
          }
        } catch {}
        localStorage.setItem('campus_student_ui_level', e.detail);
      }
    };
    const handleParentModeChange = (e: any) => {
      if (typeof e?.detail === 'boolean') setParentUnlocked(e.detail);
    };
    const handlePermissionChange = () => {
      setParentPermissionsVersion(v => v + 1);
    };
    const handleSimDateSync = () => {
      const s = localStorage.getItem('groovelab_simulated_date');
      setSimulatedDate(s || null);
    };
    const handleOpenHelpCenter = () => {
      setIsGlobalHelpCenterOpen(true);
    };
    const handleFamilyStudentSwitched = (e: any) => {
      if (e?.detail && typeof e.detail === 'string') {
        console.log('[App] Family student switch event received:', e.detail);
        setLoggedInUserId(e.detail);
      }
    };
    window.addEventListener('campus_family_student_switched', handleFamilyStudentSwitched);
    window.addEventListener('campus_ui_level_changed', handleLevelChangeEvt);
    window.addEventListener('groovelab_parent_mode_changed', handleParentModeChange);
    window.addEventListener('campus_board_permission_changed', handlePermissionChange);
    window.addEventListener('campus_open_help_center', handleOpenHelpCenter);
    window.addEventListener('storage', handleSimDateSync);
    window.addEventListener('groovelab_simulated_date_changed', handleSimDateSync);
    return () => {
      window.removeEventListener('campus_family_student_switched', handleFamilyStudentSwitched);
      window.removeEventListener('campus_ui_level_changed', handleLevelChangeEvt);
      window.removeEventListener('groovelab_parent_mode_changed', handleParentModeChange);
      window.removeEventListener('campus_board_permission_changed', handlePermissionChange);
      window.removeEventListener('campus_open_help_center', handleOpenHelpCenter);
      window.removeEventListener('storage', handleSimDateSync);
      window.removeEventListener('groovelab_simulated_date_changed', handleSimDateSync);
    };
  }, []);

  // Effect to resolve the kiosk token on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check query params to capture and persist the coupling state on this device
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('kiosk_token');
    const urlStationId = params.get('station_id');
    const urlRoomId = params.get('kiosk_room_id');

    if (urlToken && urlStationId) {
      console.log('[KioskAutoSave] Found coupling parameters in URL, saving to localStorage:', { urlToken, urlStationId, urlRoomId });
      localStorage.setItem('groovelab_kiosk_token', urlToken);
      localStorage.setItem('groovelab_station_id', urlStationId);
      if (urlRoomId) {
        localStorage.setItem('groovelab_kiosk_room_id', urlRoomId);
      }
      localStorage.setItem('groovelab_active_platform', 'groovelab');
      setStationIdFromStorage(urlStationId);

      // Clean up the URL parameters if running in standalone (PWA) mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      if (isStandalone) {
        const cleanUrl = window.location.origin + window.location.pathname;
        safeReplaceState({}, document.title, cleanUrl);
      }
    }
    
    const token = localStorage.getItem('groovelab_kiosk_token');
    if (!token) {
      setLoadingKiosk(false);
      return;
    }
    
    async function loadKiosk() {
      try {
        console.log('[KioskResolver] Resolving kiosk token:', token);
        const { data, error } = await supabase
          .from('kiosks')
          .select('*, stations(*), rooms(*)')
          .eq('secret_token', token)
          .maybeSingle();
          
        if (error) throw error;
        if (data) {
          console.log('[KioskResolver] Resolved Kiosk:', data);
          setKioskDetails(data);
          if (data.station_id) {
            localStorage.setItem('groovelab_station_id', data.station_id);
            setStationIdFromStorage(data.station_id);
          }
          if (data.room_id) {
            localStorage.setItem('groovelab_kiosk_room_id', data.room_id);
          }
        } else {
          console.warn("[KioskResolver] Invalid kiosk token. Clearing kiosk storage.");
          localStorage.removeItem('groovelab_kiosk_token');
          localStorage.removeItem('groovelab_station_id');
          localStorage.removeItem('groovelab_kiosk_room_id');
          setStationIdFromStorage(null);
        }
      } catch (err) {
        console.error("[KioskResolver] Error loading kiosk details:", err);
      } finally {
        setLoadingKiosk(false);
      }
    }
    loadKiosk();
  }, []);


  // Kiosk Room Auto-Bootstrap: when kiosk_room_id is in the URL WITHOUT kiosk_setup=1,
  // automatically resolve a station ID for that room and go directly to the QR-scanner.
  // When kiosk_setup=1 is present (= came from "Beenden" button), show DeviceSetupScreen instead.
  // CRITICAL: Skip auto-bootstrap if pairing params (kiosk_token, station_id) are present.
  const kioskRoomIdParam = searchParams.get('kiosk_room_id');
  const kioskSetupParam = searchParams.get('kiosk_setup');
  const isPairingRedirect = searchParams.has('kiosk_token') && searchParams.has('station_id');

  const [kioskBootstrapping, setKioskBootstrapping] = useState<boolean>(() => {
    // Only auto-bootstrap if kiosk_room_id is present AND kiosk_setup is NOT set AND we are NOT in a pairing redirect
    return !!kioskRoomIdParam && kioskSetupParam !== '1' && !isPairingRedirect;
  });

  useEffect(() => {
    const kioskRoomId = searchParams.get('kiosk_room_id');
    const isSetupMode = searchParams.get('kiosk_setup') === '1';
    // Skip auto-bootstrap when setup mode is requested or we are in a pairing redirect
    if (!kioskRoomId || isSetupMode || isPairingRedirect) return;

    const bootstrap = async () => {
      try {
        console.log('[KioskBootstrap] Auto-resolving station for room:', kioskRoomId);
        // Fetch the first non-teacher station for this room
        const { data: roomStations } = await supabase
          .from('stations')
          .select('id, name')
          .eq('room_id', kioskRoomId)
          .order('name');

        if (roomStations && roomStations.length > 0) {
          // Pick first non-teacher station, or first station as fallback
          const nonTeacher = roomStations.find((s: any) => !s.name?.toLowerCase().includes('lehrer'));
          const chosen = nonTeacher || roomStations[0];
          localStorage.setItem('groovelab_station_id', chosen.id);
          console.log('[KioskBootstrap] Station set to:', chosen.name, chosen.id);
        } else {
          // No stations found – set skip so LoginScreen opens in home mode
          localStorage.setItem('groovelab_station_id', 'skip');
          console.warn('[KioskBootstrap] No stations found for room. Falling back to skip.');
        }
      } catch (err) {
        console.error('[KioskBootstrap] Failed to resolve station:', err);
        localStorage.setItem('groovelab_station_id', 'skip');
      }

      // Remove kiosk_room_id from URL and reload cleanly → LoginScreen will show
      const cleanUrl = window.location.origin + window.location.pathname;
      window.location.replace(cleanUrl);
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Automated Audio Storage Janitor & Client Cache Janitor Background Task
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Always prune stale local client caches on mount to prevent QuotaExceededError
    runClientStorageJanitor().catch(() => {});

    const lastRunStr = localStorage.getItem('groovelab_storage_janitor_last_run');
    const lastRun = lastRunStr ? parseInt(lastRunStr, 10) : 0;
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    if (Date.now() - lastRun > twentyFourHoursMs) {
      console.log('[StorageJanitor] Triggering scheduled 24h background audio storage audit...');
      runStorageJanitor('campus-assets').catch(err => {
        console.warn('[StorageJanitor] Background storage audit error:', err);
      });
    }
  }, []);

  const [loading, setLoading] = useState(() => Boolean(
    typeof window !== 'undefined' && 
    sessionStorage.getItem('groovelab_user_id') && 
    !sessionStorage.getItem('groovelab_cached_user')
  ));
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isSchoolPaused, setIsSchoolPaused] = useState(false);
  const [showSchoolOnboardingModal, setShowSchoolOnboardingModal] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('invite') === 'school_onboarding' || 
           params.get('onboarding') === 'school' || 
           params.has('school_onboarding') ||
           window.location.search.includes('invite=school_onboarding');
  });

  const [showAdminSecuritySuiteModal, setShowAdminSecuritySuiteModal] = useState(false);

  useEffect(() => {
    const handleOpenSecuritySuite = () => setShowAdminSecuritySuiteModal(true);
    window.addEventListener('open_admin_security_suite', handleOpenSecuritySuite);
    return () => window.removeEventListener('open_admin_security_suite', handleOpenSecuritySuite);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('invite') === 'school_onboarding' || params.get('onboarding') === 'school' || params.has('school_onboarding')) {
        setShowSchoolOnboardingModal(true);
      }
    }
  }, [location.search]);

  const [user, setUserRaw] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const isMasterAuth = sessionStorage.getItem('groovelab_is_master_admin') === 'true' || 
                           localStorage.getItem('groovelab_is_master_admin') === 'true';
      const ghostAuthToken = localStorage.getItem('groovelab_ghost_auth_token');
      const isMasterValid = isMasterAuth || Boolean(ghostAuthToken);

      const urlParams = new URLSearchParams(window.location.search);
      const isGhost = urlParams.get('support_ghost') === 'true' || 
                      urlParams.get('ghost_session') === 'true' || 
                      sessionStorage.getItem('groovelab_support_ghost') === 'true';
      const ghostSchoolId = urlParams.get('school_id') || 
                            urlParams.get('ghost_school_id') || 
                            sessionStorage.getItem('groovelab_ghost_school_id');
      const ghostRole = urlParams.get('role') || 
                        sessionStorage.getItem('groovelab_ghost_active_role') || 
                        'admin';

      if (isGhost && ghostSchoolId && isMasterValid) {
        return {
          id: 'master-support-id',
          school_id: ghostSchoolId,
          role: ghostRole,
          first_name: 'Master',
          last_name: 'Support',
          is_master_admin: false,
          is_ghost_mode: true,
          schools: {
            id: ghostSchoolId,
            name: sessionStorage.getItem('groovelab_ghost_school_name') || 'Musikschule'
          }
        };
      }

      const cached = sessionStorage.getItem('groovelab_cached_user');
      if (cached) return JSON.parse(cached);

      // 📱 PWA Standalone Kaltstart-Fallback für initialen Benutzer-Cache (nur wenn Standalone PWA ohne Tabs)
      const isPwa = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
      if (isPwa) {
        const persistentId = localStorage.getItem('campus_active_student_id') ||
                             localStorage.getItem('groovelab_current_student_id') ||
                             localStorage.getItem('groovelab_user_id');
        if (persistentId) {
          const offlineCache = localStorage.getItem(`groovelab_offline_user_cache_${persistentId}`);
          if (offlineCache) {
            try {
              const parsed = JSON.parse(offlineCache);
              if (parsed?.data) return parsed.data;
            } catch (e) {}
          }
        }
      }
      return null;
    } catch (e) {
      console.error('Failed to parse cached user:', e);
      return null;
    }
  });
  const setUser = React.useCallback((val: any) => {
    setUserRaw((prev: any) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;

      // Tier-1 Silent Background Sync: Deep Equality Guard
      if (prev && nextVal && typeof prev === 'object' && typeof nextVal === 'object') {
        try {
          if (JSON.stringify(prev) === JSON.stringify(nextVal)) {
            return prev; // Same object reference -> 0 React re-renders!
          }
        } catch {
          // fallback
        }
      }

      if (typeof window !== 'undefined') {
        const isKiosk = Boolean(localStorage.getItem('groovelab_station_id') && localStorage.getItem('groovelab_station_id') !== 'skip');
        const isPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        if (nextVal) {
          // 🛡️ Zero-Knowledge: Never persist student last_name on shared Kiosk tablets
          const userToCache = (nextVal.role === 'student' && isKiosk) ? { ...nextVal, last_name: null } : nextVal;
          sessionStorage.setItem('groovelab_cached_user', JSON.stringify(userToCache));
          if (nextVal.id) {
            sessionStorage.setItem('groovelab_user_id', nextVal.id);
            if (isPwa && !isKiosk) {
              localStorage.setItem('groovelab_user_id', nextVal.id);
              localStorage.setItem('campus_active_student_id', nextVal.id);
            }
          }
          if (nextVal.token_version !== undefined && nextVal.token_version !== null) {
            sessionStorage.setItem('groovelab_token_version', String(nextVal.token_version));
          }
          if (!sessionStorage.getItem('groovelab_session_started_at')) {
            sessionStorage.setItem('groovelab_session_started_at', String(Date.now()));
          }
        } else {
          sessionStorage.removeItem('groovelab_cached_user');
          sessionStorage.removeItem('groovelab_token_version');
          sessionStorage.removeItem('groovelab_session_started_at');
          if (isPwa) {
            localStorage.removeItem('groovelab_user_id');
            localStorage.removeItem('campus_active_student_id');
          }
        }
      }
      return nextVal;
    });
  }, []);

  // 🛡️ REVISIONSSICHERE DATENBANK-SSOT-SYNCHRONISATION
  // Sobald der autoritative Benutzer aus der Datenbank (Supabase) geladen wird, MUSS sein campus_ui_level sofort übernommen werden.
  useEffect(() => {
    if (user?.campus_ui_level && (user.campus_ui_level === 'junior' || user.campus_ui_level === 'teen' || user.campus_ui_level === 'pro')) {
      setCampusStudentUiLevel(user.campus_ui_level);
      if (user.id) {
        localStorage.setItem(`campus_student_ui_level_${user.id}`, user.campus_ui_level);
      }
      localStorage.setItem('campus_student_ui_level', user.campus_ui_level);
    }
  }, [user?.campus_ui_level, user?.id]);

  // 🛡️ REVISIONSSICHERE ECHTZEIT-SYNCHRONISATION (PWA <-> Localhost <-> Online)
  // Reagiert sofort und ohne Reload auf UI-Level-Änderungen aus dem Elternbereich anderer Clients
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`realtime_student_progress_${user.id}`);
    channel
      .on('broadcast', { event: 'ui-level-changed' }, (payload: any) => {
        const newLevel = payload?.payload?.uiLevel;
        if (newLevel && (newLevel === 'junior' || newLevel === 'teen' || newLevel === 'pro')) {
          console.log('[Realtime-Root] UI-Level update broadcast received:', newLevel);
          setCampusStudentUiLevel(newLevel);
          setUser((prev: any) => prev ? { ...prev, campus_ui_level: newLevel } : prev);
          try {
            localStorage.setItem(`campus_student_ui_level_${user.id}`, newLevel);
            localStorage.setItem('campus_student_ui_level', newLevel);
          } catch {}
          window.dispatchEvent(new CustomEvent('campus_ui_level_changed', { detail: newLevel }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const [isScreenLockedByInactivity, setIsScreenLockedByInactivity] = useState(false);

  // 🔒 Dynamic Inactivity Idle Screen Lock (Enterprise Goldstandard):
  // 45 minutes for Administration/Secretary (high risk), 60 minutes for Teachers (pedagogical continuity)
  const effectiveInactivityTimeoutMs = useMemo(() => {
    const activeRole = (user?.role || '').toLowerCase();
    if (activeRole === 'admin' || activeRole === 'secretary') {
      return 45 * 60 * 1000; // 45 Minuten für Verwaltung
    }
    if (activeRole === 'teacher') {
      return 60 * 60 * 1000; // 60 Minuten für Lehrkräfte
    }
    return 45 * 60 * 1000; // Fallback 45 Minuten
  }, [user?.role]);

  useInactivityTimeout({
    timeoutMs: effectiveInactivityTimeoutMs,
    enabled: Boolean(currentView === 'dashboard' && !isScreenLockedByInactivity),
    onTimeout: () => {
      console.warn(`[Inactivity] Idle timeout reached (${effectiveInactivityTimeoutMs / 60000}m). Activating Privacy Screen Lock...`);
      // Privilege Downgrade: If in admin mode, auto-downgrade to teacher if user has teacher role
      try {
        const storedUserStr = sessionStorage.getItem('groovelab_cached_user');
        if (storedUserStr) {
          const parsed = JSON.parse(storedUserStr);
          if (parsed?.role === 'admin' && Array.isArray(parsed?.roles) && parsed.roles.includes('teacher')) {
            console.log('[Inactivity] Downgrading active role from admin to teacher (Least Privilege)...');
            sessionStorage.setItem('groovelab_active_workspace', 'teacher');
          }
        }
      } catch (e) {}
      setIsScreenLockedByInactivity(true);
    }
  });

  const { isShielded, dismissShield } = usePrivacyShield(false);

  useEffect(() => {
    if (loading) return; // wait until supabase auth/session loading is complete

    const isGhostSessionActive = typeof window !== 'undefined' && (
      new URLSearchParams(window.location.search).get('support_ghost') === 'true' ||
      sessionStorage.getItem('groovelab_support_ghost') === 'true'
    );
    if (isGhostSessionActive) return; // Don't redirect during support ghost sessions
    
    const isPublicRoute = 
      location.pathname === '/' || 
      location.pathname === '/landingpage' || 
      location.pathname === '/landingpage2' || 
      location.pathname === '/startseite' || 
      location.pathname === '/startseite2' || 
      location.pathname === '/starseite2' || 
      location.pathname === '/login' || 
      location.pathname === '/signup' || 
      location.pathname === '/master-admin' || 
      location.pathname === '/admin' || 
      location.pathname.startsWith('/qr/') ||
      location.pathname.startsWith('/onboarding/') ||
      location.pathname.startsWith('/device-onboarding/') ||
      location.pathname.startsWith('/shared-biography/') ||
      location.pathname.startsWith('/shared/');

      
    const isAuth = !!loggedInUserId;
    if (isAuth) {
      const isLandingOrAuthRoute = 
        location.pathname === '/' || 
        location.pathname === '/landingpage' || 
        location.pathname === '/landingpage2' || 
        location.pathname === '/startseite' || 
        location.pathname === '/startseite2' || 
        location.pathname === '/starseite2' ||
        location.pathname === '/login' || 
        location.pathname === '/signup';

      if (isLandingOrAuthRoute) {
        navigate('/dashboard', { replace: true });
      }
    } else {
      // Redirect unauthenticated users trying to access dashboard/protected routes to /
      if (!isPublicRoute) {
        navigate('/', { replace: true });
      }
    }
  }, [loggedInUserId, location.pathname, loading, navigate]);

  // Auto-switch context when support_ghost is active in URL (Placed before any early returns)
  useEffect(() => {
    const ghostUrlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const isGhostParam = ghostUrlParams.get('support_ghost') === 'true' || 
                         ghostUrlParams.get('ghost_session') === 'true' || 
                         sessionStorage.getItem('groovelab_support_ghost') === 'true';
    const ghostSchoolId = ghostUrlParams.get('school_id') || 
                          ghostUrlParams.get('ghost_school_id') || 
                          sessionStorage.getItem('groovelab_ghost_school_id');
    const ghostUserId = ghostUrlParams.get('ghost_user_id') || 
                        sessionStorage.getItem('groovelab_ghost_impersonated_user_id');
    const ghostTicketId = ghostUrlParams.get('ticket_id');
    const ghostRole = ghostUrlParams.get('role') || 
                      sessionStorage.getItem('groovelab_ghost_active_role') || 
                      'admin';
    const ghostLeaseToken = ghostUrlParams.get('ghost_lease_token');
    if (ghostLeaseToken) {
      sessionStorage.setItem('gl_active_session_lease_id', ghostLeaseToken);
      localStorage.setItem('gl_active_session_lease_id', ghostLeaseToken);
    }

    const isMasterAuth = sessionStorage.getItem('groovelab_is_master_admin') === 'true' || 
                         localStorage.getItem('groovelab_is_master_admin') === 'true';
    const ghostAuthToken = localStorage.getItem('groovelab_ghost_auth_token');
    const isMasterValid = isMasterAuth || Boolean(ghostAuthToken);

    if (isGhostParam && (ghostSchoolId || ghostUserId)) {
      if (!isMasterValid) {
        console.warn('[Security] Unauthorized Ghost Mode attempt blocked.');
        sessionStorage.removeItem('groovelab_support_ghost');
        sessionStorage.removeItem('groovelab_ghost_school_id');
        sessionStorage.removeItem('groovelab_ghost_impersonated_user_id');
        sessionStorage.removeItem('groovelab_ghost_active_role');
        const cleanUrl = window.location.pathname;
        safeReplaceState({}, document.title, cleanUrl);
        return;
      }

      // Consume one-time ghost token
      if (ghostAuthToken) {
        localStorage.removeItem('groovelab_ghost_auth_token');
      }

      // 🛡️ Ghost-Support 120-Minute Time-Box Enforcer (Hiscox CyberSafe / OWASP ASVS Level 3)
      const MAX_GHOST_SESSION_MS = 120 * 60 * 1000;
      const ghostStartedAtStr = sessionStorage.getItem('groovelab_ghost_started_at');
      const now = Date.now();
      if (!ghostStartedAtStr) {
        sessionStorage.setItem('groovelab_ghost_started_at', String(now));
      } else {
        const startedAt = parseInt(ghostStartedAtStr, 10);
        if (!isNaN(startedAt) && (now - startedAt > MAX_GHOST_SESSION_MS)) {
          console.warn('[Security] Ghost-Support session TTL expired (>120min). Revoking access.');
          sessionStorage.removeItem('groovelab_support_ghost');
          sessionStorage.removeItem('groovelab_ghost_started_at');
          sessionStorage.removeItem('groovelab_ghost_school_id');
          sessionStorage.removeItem('groovelab_ghost_impersonated_user_id');
          sessionStorage.removeItem('groovelab_ghost_active_role');
          sessionStorage.removeItem('groovelab_ghost_lease_token');
          window.location.href = '/master-admin';
          return;
        }
      }

      sessionStorage.setItem('groovelab_support_ghost', 'true');
      if (ghostSchoolId) sessionStorage.setItem('groovelab_ghost_school_id', ghostSchoolId);
      if (ghostUserId) sessionStorage.setItem('groovelab_ghost_impersonated_user_id', ghostUserId);
      if (ghostRole) sessionStorage.setItem('groovelab_ghost_active_role', ghostRole);
      const ghostLeaseToken = ghostUrlParams.get('ghost_lease_token');
      if (ghostLeaseToken) sessionStorage.setItem('groovelab_ghost_lease_token', ghostLeaseToken);

      // Enterprise Zero-Trace URL Sanitization: Purge sensitive credentials immediately from browser address bar & history
      try {
        safeReplaceState({}, document.title, window.location.pathname);
      } catch (e) {}

      const resolveGhostIdentity = async () => {
        let realUser: any = null;
        let schoolData: any = null;

        // 1. If explicit user ID provided (e.g. from Ticket or Persona switcher)
        if (ghostUserId) {
          const { data: viewUser } = await supabase
            .from('users')
            .select('*, schools(*)')
            .eq('id', ghostUserId)
            .maybeSingle();
          if (viewUser && (!ghostSchoolId || viewUser.school_id === ghostSchoolId)) {
            realUser = viewUser;
          }
        }

        // 2. If no user yet, but school ID present -> resolve primary admin or teacher from this school
        if (!realUser && ghostSchoolId) {
          const { data: viewUser } = await supabase
            .from('users')
            .select('*, schools(*)')
            .eq('school_id', ghostSchoolId)
            .eq('role', ghostRole === 'teacher' ? 'teacher' : 'admin')
            .limit(1)
            .maybeSingle();
          if (viewUser) {
            realUser = viewUser;
          }
        }

        // 3. School metadata
        if (realUser?.schools) {
          schoolData = Array.isArray(realUser.schools) ? realUser.schools[0] : realUser.schools;
        } else if (ghostSchoolId) {
          const { data: sData } = await supabase.rpc('get_public_school_theme', { p_subdomain: ghostSchoolId });
          schoolData = sData;
        }

        if (schoolData?.name) {
          sessionStorage.setItem('groovelab_ghost_school_name', schoolData.name);
        }

        if (realUser) {
          sessionStorage.setItem('groovelab_ghost_impersonated_user_id', realUser.id);
          sessionStorage.setItem('groovelab_ghost_shadowed_teacher_id', realUser.id);
          const targetRole = realUser.role || ghostRole;
          sessionStorage.setItem('groovelab_ghost_active_role', targetRole);

          const impersonatedUserObj = {
            ...realUser,
            is_ghost_mode: true,
            ghost_ticket_id: ghostTicketId,
            schools: schoolData || realUser.schools
          };

          setUserRaw(impersonatedUserObj);
          setLoggedInUserId(realUser.id);

          try {
            const cacheImpersonated = targetRole === 'student' ? { ...impersonatedUserObj, last_name: null } : impersonatedUserObj;
            sessionStorage.setItem('groovelab_cached_user', JSON.stringify(cacheImpersonated));
          } catch (e) {}

          const targetPlatform: 'campus' | 'groovelab' = (realUser.is_groovelab_active && !realUser.is_campus_active) ? 'groovelab' : 'campus';
          const targetWorkspace = targetRole === 'admin' || targetRole === 'secretary' ? 'secretary' : (targetRole === 'teacher' ? 'teacher' : 'student');
          const targetTab = targetRole === 'student' ? 'homework_book' : (targetRole === 'teacher' ? 'briefing' : 'briefing');

          setActivePlatform(targetPlatform);
          setActiveStudentTab(targetTab);
          try {
            sessionStorage.setItem('groovelab_active_workspace', targetWorkspace);
            sessionStorage.setItem('groovelab_active_platform', targetPlatform);
            localStorage.setItem('campus_active_tab', targetTab);
          } catch (e) {}
        } else if (schoolData) {
          // Fallback if zero users in DB for school -> resolve from billing_contact_person
          const contactPerson = (schoolData.billing_contact_person || '').trim();
          let fName = `${schoolData.name} Support`;
          let lName = '';
          if (contactPerson) {
            const parts = contactPerson.split(' ');
            fName = parts[0] || `${schoolData.name} Support`;
            lName = parts.slice(1).join(' ') || '';
          }

          const ghostUser = {
            id: 'master-support-id',
            school_id: schoolData.id,
            role: ghostRole,
            first_name: fName,
            last_name: lName,
            is_master_admin: false,
            is_ghost_mode: true,
            schools: schoolData
          };
          setUserRaw(ghostUser);
          setLoggedInUserId('master-support-id');
          setActivePlatform('campus');
          setActiveStudentTab('briefing');
        }
      };

      resolveGhostIdentity();
    }
  }, []);

  // 🛡️ Ghost-Support 120-Minute Periodic Watchdog (Hiscox CyberSafe / OWASP ASVS Level 3)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isGhostActive = sessionStorage.getItem('groovelab_support_ghost') === 'true';
    if (!isGhostActive) return;

    const interval = setInterval(() => {
      const ghostStartedAtStr = sessionStorage.getItem('groovelab_ghost_started_at');
      if (ghostStartedAtStr) {
        const startedAt = parseInt(ghostStartedAtStr, 10);
        if (!isNaN(startedAt) && (Date.now() - startedAt > 120 * 60 * 1000)) {
          console.warn('[Security] Ghost session exceeded 120 minutes TTL. Auto-terminating session.');
          sessionStorage.removeItem('groovelab_support_ghost');
          sessionStorage.removeItem('groovelab_ghost_started_at');
          sessionStorage.removeItem('groovelab_ghost_school_id');
          sessionStorage.removeItem('groovelab_ghost_impersonated_user_id');
          sessionStorage.removeItem('groovelab_ghost_active_role');
          sessionStorage.removeItem('groovelab_ghost_lease_token');
          alert('Die maximale Dauer der Ghost-Support-Sitzung (120 Minuten) wurde erreicht. Die Sitzung wurde aus Sicherheitsgründen beendet.');
          window.location.href = '/master-admin';
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const [session, setSessionRaw] = useState<any>(null);
  const setSession = React.useCallback((val: any) => {
    setSessionRaw((prev: any) => {
      const nextVal = typeof val === 'function' ? val(prev) : val;
      if (prev && nextVal && typeof prev === 'object' && typeof nextVal === 'object') {
        try {
          if (JSON.stringify(prev) === JSON.stringify(nextVal)) {
            return prev;
          }
        } catch {}
      }
      return nextVal;
    });
  }, []);
  const [totalPresenceMins, setTotalPresenceMins] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !user) return;
    
    const updateData: any = {
      first_name: editingProfile.first_name,
      last_name: editingProfile.last_name,
      photo_url: (user.role === 'admin' || user.role === 'secretary') ? '/campus_login_hero.png' : editingProfile.photo_url
    };

    if (user.role === 'student') {
      updateData.age = editingProfile.age;
    } else {
      updateData.groovelab_instrument = editingProfile.groovelab_instrument;
      updateData.bio = editingProfile.bio;
      updateData.expertise = editingProfile.expertise;
      updateData.bands = editingProfile.bands;
    }

    const { error } = await supabase.from('users').update(updateData).eq('id', user.id);
    
    if (error) alert('Fehler beim Aktualisieren: ' + error.message);
    else {
      const { data: updatedUser, error: userErr } = await supabase.from('users').select('*, schools(*)').eq('id', user.id).single();
      if (userErr || !updatedUser) {
        console.error('[Dashboard] User data fetch error:', userErr);
        return;
      }
      console.log('[Dashboard] User data updated:', updatedUser.first_name, 'School:', updatedUser.school_id);
      if (updatedUser) setUser(updatedUser);
      setShowEditProfile(false);
    }
  };
  const [userSongs, setUserSongs] = useState<any[]>([]);
  const [userBands, setUserBands] = useState<any[]>([]);
  const [allBands, setAllBands] = useState<any[]>([]);
  const [wallSongs, setWallSongs] = useState<any[]>([]);
  const [globalSongs, setGlobalSongs] = useState<any[]>([]);
  const [plannedSlots, setPlannedSlots] = useState<string[]>([]);
  const [globalPlannedSlots, setGlobalPlannedSlots] = useState<any[]>([]);
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [activePlatform, setActivePlatformRaw] = useState<'campus' | 'groovelab' | 'ensembles'>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const platParam = urlParams.get('platform');
      if (platParam === 'campus' || platParam === 'groovelab' || platParam === 'ensembles') {
        return platParam as any;
      }
    }
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_platform') : null;
    if (!showEnsemblesFeature && saved === 'ensembles') {
      return 'campus';
    }
    return (saved as 'campus' | 'groovelab' | 'ensembles') || 'campus';
  });
  const setActivePlatform = React.useCallback((val: any, forceUnlock = false) => {
    const schoolObj = Array.isArray(user?.schools) ? user.schools[0] : user?.schools;
    const schoolHasCampus = Boolean(
      user?.is_campus_active || 
      (schoolObj ? (schoolObj.has_campus_subscription || !schoolObj.is_billing_booked || schoolObj.subscription_bypass) : true)
    );
    const schoolHasGroove = Boolean(
      user?.is_groovelab_active || 
      (schoolObj ? (schoolObj.has_groovelab_subscription || !schoolObj.is_billing_booked || schoolObj.subscription_bypass) : true)
    );

    let targetVal = val;
    if (targetVal === 'campus' && !schoolHasCampus) {
      targetVal = 'groovelab';
    } else if (targetVal === 'groovelab' && !schoolHasGroove) {
      targetVal = 'campus';
    }
    // Instantly stop all active camera and microphone streams when switching modules
    if (typeof (window as any).stopAllCameras === 'function') {
      (window as any).stopAllCameras();
    }

    React.startTransition(() => {
      setActivePlatformRaw(targetVal);
      // Auto-switch the active tab to the saved tab of the target platform atomically within the same transition
      if (targetVal === 'campus') {
        const savedTab = (typeof window !== 'undefined' ? sessionStorage.getItem('campus_active_tab') : null) || 'briefing';
        setActiveStudentTabRaw(savedTab === 'live' ? 'briefing' : savedTab);
      } else if (targetVal === 'ensembles') {
        const savedTab = (typeof window !== 'undefined' ? sessionStorage.getItem('ensembles_active_tab') : null) || 'overview';
        setActiveStudentTabRaw(savedTab);
      } else {
        const savedTab = (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_tab') : null) || 'live';
        setActiveStudentTabRaw(savedTab);
      }
    });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('groovelab_active_platform', targetVal);
    }
  }, [locationMode, user?.role, user?.schools]);

  const [activeWorkspace, setActiveWorkspaceRaw] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace');
    }
    return null;
  });
  const setActiveWorkspace = React.useCallback((ws: string | null) => {
    if (typeof window !== 'undefined') {
      if (ws) {
        sessionStorage.setItem('groovelab_active_workspace', ws);
      } else {
        sessionStorage.removeItem('groovelab_active_workspace');
      }
    }
    setActiveWorkspaceRaw(ws);
  }, []);

  const [activeStudentTab, setActiveStudentTabRaw] = useState<string>(() => {
    const platform = (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_platform') : null) || 'campus';
    if (platform === 'campus') {
      const tab = (typeof window !== 'undefined' ? sessionStorage.getItem('campus_active_tab') : null) || 'briefing';
      return tab === 'live' ? 'briefing' : tab;
    }
    if (platform === 'ensembles') {
      return (typeof window !== 'undefined' ? sessionStorage.getItem('ensembles_active_tab') : null) || 'overview';
    }
    return (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_tab') : null) || 'live';
  });
  const setActiveStudentTab = React.useCallback((val: any) => {
    if (val === 'messages') {
      setSelectedCampusRecipient(null);
    }
    if (val === 'homework_book') {
      window.dispatchEvent(new CustomEvent('campus_reset_homework_board'));
    }
    setActiveStudentTabRaw(val);
    const tabLabels: Record<string, string> = {
      briefing: 'Briefing-Dashboard geöffnet',
      homework_book: 'Hausaufgabenheft geöffnet',
      practice_board: 'Übe-Pfad geöffnet',
      practice: 'Übe-Studio geöffnet',
      mediathek: 'Mediathek geöffnet',
      events: 'Termine geöffnet',
      campus_cup: 'Campus-Cup geöffnet',
      messages: 'Nachrichten geöffnet',
      settings: 'Einstellungen geöffnet',
      overview: 'Übersicht geöffnet',
      live: 'Live-Lab geöffnet',
      library: 'Song-Bibliothek geöffnet',
      repertoire: 'Repertoire geöffnet',
      bands: 'Band-Zentrale geöffnet',
      schedule: 'Stundenplan geöffnet',
      students: 'Schüler-Übersicht geöffnet',
      songs: 'Song-Verwaltung geöffnet',
      rooms: 'Raumplaner geöffnet',
      billing: 'Abrechnung geöffnet'
    };
    if (tabLabels[val]) {
      announceA11y(tabLabels[val]);
    }
    // Persist the tab to the correct sessionStorage keys based on the current active platform
    const platform = (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_active_platform') : null) || 'campus';
    if (typeof window !== 'undefined') {
      if (platform === 'campus') {
        sessionStorage.setItem('campus_active_tab', val);
      } else if (platform === 'ensembles') {
        sessionStorage.setItem('ensembles_active_tab', val);
      } else {
        sessionStorage.setItem('groovelab_active_tab', val);
      }
    }
  }, []);

  // Auto-refresh bands for staff profile and GrooveLab view
  useEffect(() => {
    if (user?.id && (user.role === 'teacher' || user.role === 'admin' || user.role === 'secretary')) {
      const schoolId = user.school_id || (Array.isArray(user.schools) ? user.schools[0]?.id : user.schools?.id);
      if (!schoolId) return;

      supabase
        .from('bands')
        .select('*, songs(id, title, artist, instrumentation), band_members(*, users!user_id(id, first_name, last_name, photo_url, role, teacher_id)), band_songs(*, songs(id, title, artist, instrumentation), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))), coach:users!coach_id(id, first_name, last_name, photo_url)')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })
        .then(({ data: freshBands, error }) => {
          if (!error && freshBands) {
            const realBands = freshBands.filter((b: any) => b.name && b.name !== '__SYSTEM_ANNOUNCEMENTS__' && !b.name.startsWith('__SYSTEM_'));
            setAllBands(realBands);
            
            const teacherCoachedBands = realBands.filter((band: any) => {
              const isCoach = band.coach_id === user.id || (band.coach && band.coach.id === user.id);
              const isMember = (band.band_members || []).some((m: any) => m.user_id === user.id);
              const hasMyStudent = (band.band_members || []).some((m: any) => {
                const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
                return u && u.teacher_id === user.id;
              });
              return isCoach || isMember || hasMyStudent;
            });

            setUserBands(teacherCoachedBands);
          }
        });
    }
  }, [user?.id, activePlatform, activeStudentTab]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);
  const [sidebarNotificationsCount, setSidebarNotificationsCount] = useState<number>(0);

  // 🎼 Notenständer-Modus (Großschrift & Glanceability für 60–90 cm Distanz am Instrument)
  const [isMusicStandMode, setIsMusicStandMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('campus_music_stand_mode') === 'true';
  });

  useEffect(() => {
    const handleSync = () => {
      setIsMusicStandMode(localStorage.getItem('campus_music_stand_mode') === 'true');
    };
    window.addEventListener('campus_music_stand_mode_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('campus_music_stand_mode_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const toggleMusicStandMode = () => {
    setIsMusicStandMode(prev => {
      const next = !prev;
      localStorage.setItem('campus_music_stand_mode', String(next));
      window.dispatchEvent(new Event('campus_music_stand_mode_changed'));
      return next;
    });
  };

  const [selectedMatchingInsts, setSelectedMatchingInsts] = useState<Record<string, string>>({});
  const [activeBandSubTab, setActiveBandSubTab] = useState<'meine' | 'alle'>(() => {
    return (localStorage.getItem('groovelab_active_band_subtab') as 'meine' | 'alle') || 'meine';
  });
  
  const [campusTeacherStats, setCampusTeacherStats] = useState<{ studentCount: number, totalMinutes: number, teachingDays: string[], primaryRoom: string, schedules: any[] } | null>(null);

  useEffect(() => {
    if (activeStudentTab === 'profile' && activePlatform === 'campus' && user && (user.role === 'teacher' || user.role === 'admin')) {
      const fetchStats = async () => {
        try {
          const { data: scheds } = await supabase
            .from('schedules')
            .select('*, rooms(name)')
            .eq('teacher_id', user.id);
          
          if (scheds) {
            const uniqueStudents = new Set(scheds.filter(s => s.student_id).map(s => s.student_id));
            const totalMins = scheds.filter(s => s.student_id).reduce((acc, curr) => acc + (curr.duration || 30), 0);
            
            const DAYS_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
            const uniqueDays = Array.from(new Set(scheds.map(s => s.day_of_week)))
              .sort((a, b) => a - b)
              .map(d => DAYS_DE[d]);

            // Primary room calculation
            const roomCounts: Record<string, number> = {};
            scheds.forEach(s => {
              const rName = s.rooms?.name;
              if (rName) {
                roomCounts[rName] = (roomCounts[rName] || 0) + 1;
              }
            });
            let primary = 'Kein Raum';
            let maxCount = 0;
            Object.entries(roomCounts).forEach(([rName, count]) => {
              if (count > maxCount) {
                maxCount = count;
                primary = rName;
              }
            });

            setCampusTeacherStats({
              studentCount: uniqueStudents.size,
              totalMinutes: totalMins,
              teachingDays: uniqueDays,
              primaryRoom: primary,
              schedules: scheds
            });
          }
        } catch (err) {
          console.error('Error fetching teacher stats:', err);
        }
      };
      fetchStats();
    }
  }, [activeStudentTab, activePlatform, user?.id]);

  const [selectedBandForProfile, setSelectedBandForProfileRaw] = useState<any>(null);
  const setSelectedBandForProfile = React.useCallback((val: any) => {
    React.startTransition(() => {
      setSelectedBandForProfileRaw(val);
    });
  }, []);

  const [selectedBandForGateway, setSelectedBandForGatewayRaw] = useState<any>(null);
  const setSelectedBandForGateway = React.useCallback((val: any) => {
    React.startTransition(() => {
      setSelectedBandForGatewayRaw(val);
    });
  }, []);

  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);

  const [showBandProfile, setShowBandProfileRaw] = useState(() => localStorage.getItem('groovelab_show_band_profile') === 'true');
  const setShowBandProfile = React.useCallback((val: any) => {
    React.startTransition(() => {
      setShowBandProfileRaw(val);
    });
  }, []);

  const [bandProfileView, setBandProfileView] = useState<'public' | 'backstage'>(() => {
    const saved = localStorage.getItem('groovelab_band_profile_view');
    return (saved === 'public' || saved === 'backstage') ? saved : 'public';
  });


  const [bandSearchText, setBandSearchText] = useState('');
  const [bandSearchLetter, setBandSearchLetter] = useState<string | null>(null);
  const [expandedMatchingSong, setExpandedMatchingSong] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [publicPassUser, setPublicPassUser] = useState<any>(null);
  const [loadingPublicPass, setLoadingPublicPass] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [activePdfFolderUrl, setActivePdfFolderUrl] = useState<string | null>(null);
  const [activePdfSong, setActivePdfSong] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState<any>(null);
  const [selectedEqCat, setSelectedEqCat] = useState('E-Gitarre');
  const [practiceSearchQuery, setPracticeSearchQuery] = useState('');
  const [practiceAlphaFilter, setPracticeAlphaFilter] = useState<string | null>(null);
  const [practiceSearchType, setPracticeSearchType] = useState<'title' | 'artist'>('title');
  const [activeStudentsCount, setActiveStudentsCount] = useState(0);
  const [personalRejections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [studentMessages, setStudentMessages] = useState<any[]>([]);
  const [studentMessagesLoading, setStudentMessagesLoading] = useState(false);
  const [selectedStudentMessage, setSelectedStudentMessage] = useState<any>(null);
  const [studentMessagesFilter, setStudentMessagesFilter] = useState<'all' | 'school' | 'band'>('all');
  const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>([]);

  // Campus 1-on-1 Direct Messaging states
  const [campusMessages, setCampusMessages] = useState<any[]>([]);
  const [campusMessagesLoading, setCampusMessagesLoading] = useState(false);
  const [campusUnreadCount, setCampusUnreadCount] = useState(0);
  const [selectedCampusRecipient, setSelectedCampusRecipient] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`groovelab_deleted_messages_${user.id}`);
      if (stored) {
        try {
          setDeletedMessageIds(JSON.parse(stored));
        } catch (e) {
          setDeletedMessageIds([]);
        }
      } else {
        setDeletedMessageIds([]);
      }
    } else {
      setDeletedMessageIds([]);
    }
  }, [user?.id]);

  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);

  const openUserProfile = async (userIdOrUser: any) => {
    if (!userIdOrUser) return;
    
    if (typeof userIdOrUser === 'object') {
      if (userIdOrUser.role === 'teacher' || userIdOrUser.role === 'admin') {
        setSelectedTeacher(userIdOrUser);
      } else {
        setSelectedStudentProfile(userIdOrUser);
      }
      return;
    }
    
    if (typeof userIdOrUser === 'string') {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userIdOrUser)
          .single();
          
        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }
        
        if (data) {
          if (data.role === 'teacher' || data.role === 'admin') {
            setSelectedTeacher(data);
          } else {
            setSelectedStudentProfile(data);
          }
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    }
  };

  useEffect(() => {
    if (selectedTeacher?.id) {
      sessionStorage.setItem('groovelab_selected_teacher_id', selectedTeacher.id);
    } else {
      sessionStorage.removeItem('groovelab_selected_teacher_id');
    }
  }, [selectedTeacher]);

  useEffect(() => {
    if (selectedStudentProfile?.id) {
      sessionStorage.setItem('groovelab_selected_student_id', selectedStudentProfile.id);
    } else {
      sessionStorage.removeItem('groovelab_selected_student_id');
    }
  }, [selectedStudentProfile]);

  useEffect(() => {
    const savedTeacherId = sessionStorage.getItem('groovelab_selected_teacher_id');
    if (savedTeacherId && !selectedTeacher) {
      openUserProfile(savedTeacherId);
    }
    const savedStudentId = sessionStorage.getItem('groovelab_selected_student_id');
    if (savedStudentId && !selectedStudentProfile) {
      openUserProfile(savedStudentId);
    }
  }, []);

  useEffect(() => {
    (window as any).openUserProfile = openUserProfile;
    return () => {
      delete (window as any).openUserProfile;
    };
  }, []);

  const [studentActivity, setStudentActivity] = useState<any[]>([]);
  const [showBandNaming, setShowBandNaming] = useState(false);
  const [namingTarget, setNamingTarget] = useState<{song: any, form: any} | null>(null);
  const [showBandConsent, setShowBandConsent] = useState(false);
  const [consentTarget, setConsentTarget] = useState<{song: any, form: any} | null>(null);
  const [showEditBand, setShowEditBand] = useState(false);
  const [isJoiningVocal, setIsJoiningVocal] = useState<string | null>(null);
  const [isJoiningGuest, setIsJoiningGuest] = useState<string | null>(null);
  const [showTeacherVocalPicker, setShowTeacherVocalPicker] = useState<string | null>(null);
  const [externalVocalists, setExternalVocalists] = useState<any[]>([]);
  const [editingBand, setEditingBand] = useState<any>(null);
  const [restoredBandId] = useState(() => localStorage.getItem('groovelab_selected_band_id'));

  const [suggestingSkill, setSuggestingSkill] = useState<any>(null);
  const [exclusiveProposal, setExclusiveProposal] = useState<boolean>(true);
  const [matchingLevelFilter, setMatchingLevelFilter] = useState<'all' | 'starter' | 'pro'>('all');
  const [pendingFounding, setPendingFounding] = useState<any | null>(null);
  const [showFoundingModal, setShowFoundingModal] = useState(false);
  const [foundingName, setFoundingName] = useState('');
  const [foundingLanguage, setFoundingLanguage] = useState<'de' | 'en'>('de');
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [lastAutoTriggeredFormId, setLastAutoTriggeredFormId] = useState<string | null>(sessionStorage.getItem('groovelab_last_form_id'));
  
  const updateAutoTriggerId = (id: string | null) => {
    setLastAutoTriggeredFormId(id);
    if (id) sessionStorage.setItem('groovelab_last_form_id', id);
    else sessionStorage.removeItem('groovelab_last_form_id');
  };
  
  useEffect(() => {
    if (showFoundingModal && !foundingName) {
      setFoundingName(generateRandomBandName(foundingLanguage));
    } else if (!showFoundingModal) {
      setFoundingName('');
    }
  }, [showFoundingModal, foundingLanguage]);

  const ignoredFoundingIds = useRef<string[]>([]);
  const gatewayJustClosed = useRef<boolean>(false);
  const lastWriteTimeRef = useRef<number>(0);
  
  const [annBandId, setAnnBandId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementTarget, setAnnouncementTarget] = useState<'all' | 'students' | 'teachers' | 'specific'>('all');
  const [selectedTargetUserIds, setSelectedTargetUserIds] = useState<string[]>([]);
  const [recipientSearchText, setRecipientSearchText] = useState('');
  const [activeAnnouncement, setActiveAnnouncement] = useState<any>(null);
  const [schoolUsers, setSchoolUsers] = useState<any[]>([]);
  const [selectedMailMessage, setSelectedMailMessage] = useState<any>(null);
  const [isMailComposing, setIsMailComposing] = useState(false);
  
  // Removed redundant FAILSAFE effect to prevent loop conflicts.
  // The detection logic is now centralized in fetchDashboardData for better control.

  // (Auto-prompt logic now handled centrally in fetchDashboardData)

  const dismissSuggestion = (songSkillId: string) => {
    if (!user?.id) return;
    const storageKey = `groovelab_prompted_${user.id}`;
    const promptedIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!promptedIds.includes(songSkillId)) {
      promptedIds.push(songSkillId);
      localStorage.setItem(storageKey, JSON.stringify(promptedIds));
    }

    // Also mark the specific song as ignored for auto-founding trigger
    if (suggestingSkill?.song_id) {
       const inst = (suggestingSkill.instrument || '').toLowerCase();
       localStorage.setItem(`groovelab_founding_ignored_${user.id}_${suggestingSkill.song_id}_${inst}`, 'true');
    }
    if (suggestingSkill?.songs?.id) {
       const inst = (suggestingSkill.instrument || '').toLowerCase();
       localStorage.setItem(`groovelab_founding_ignored_${user.id}_${suggestingSkill.songs.id}_${inst}`, 'true');
    }

    console.log('[DEBUG-Groovelab] setSuggestingSkill(null) in dismissSuggestion');
    setSuggestingSkill(null);
    setSelectedCoachId('');
  };

  // Load student messages when they view the tab
  useEffect(() => {
    if (activeStudentTab === 'messages' && user?.role?.toLowerCase() === 'student') {
      fetchStudentMessages();
    }
  }, [activeStudentTab, userBands, user?.id]);

  // Auto-trigger Band Founding Modal when formation is complete
  useEffect(() => {
    if (loading || !user || suggestingSkill || selectedBandForGateway || pendingFounding || showBandProfile || gatewayJustClosed.current) return;

    // 1. Auto-trigger: If user is in a band and mastered a new skill, suggest it to their band first
    if (userBands.length > 0) {
      const stageReadySkills = userSongs.filter((s: any) => s.is_stage_ready && s.instrument !== 'Vocals');
      
      for (const skill of stageReadySkills) {
        const inst = (skill.instrument || '').toLowerCase();
        const isIgnored = localStorage.getItem(`groovelab_founding_ignored_${user.id}_${skill.song_id}_${inst}`);
        if (isIgnored) continue;
        
        // Has it already been suggested/added to ANY of their bands?
        const alreadyInBand = userBands.some((b: any) => 
          b.song_id === skill.song_id || 
          (b.band_songs || []).some((bs: any) => bs.song_id === skill.song_id || bs.songs?.id === skill.song_id)
        );
        
        if (!alreadyInBand) {
          console.log('[AutoTrigger] Suggesting skill to band:', skill.title);
          console.log('[DEBUG-Groovelab] setSuggestingSkill (suggest to band) in auto-trigger', skill.title);
          setSuggestingSkill({
            ...skill,
            songs: { id: skill.song_id, title: skill.title }
          });
          return;
        }
      }
    }
  }, [wallSongs, activeStudentTab, user, userBands, userSongs, suggestingSkill, selectedBandForGateway, pendingFounding, showBandProfile, loading]);

  // Safety check: If suggestingSkill is set but userBands loads and indicates
  // that the song is already suggested or active in their band, dismiss the popup immediately.
  // ONLY run this for individual suggestions (!suggestingSkill.formation_group), NOT for band founding!
  useEffect(() => {
    if (suggestingSkill && !suggestingSkill.formation_group && user && userBands.length > 0) {
      const targetSongId = suggestingSkill.song_id || suggestingSkill.songs?.id;
      if (targetSongId) {
        const alreadyInBand = userBands.some((b: any) => 
          b.song_id === targetSongId || 
          (b.band_songs || []).some((bs: any) => bs.song_id === targetSongId || bs.songs?.id === targetSongId)
        );
        if (alreadyInBand) {
          console.log('[AutoTrigger] Automatically dismissing congratulations modal since song is already in band repertoire:', targetSongId);
          console.log('[DEBUG-Groovelab] setSuggestingSkill(null) inside safety check effect!');
          setSuggestingSkill(null);
        }
      }
    }
  }, [userBands, suggestingSkill, user]);

  // Safety check for Band Founding: If suggestingSkill is set for band founding (with formation_group),
  // query Supabase directly to check if a band already exists for this group or if the user is already in a band for this song.
  // This handles the case where someone else already founded the band (e.g. manual widget click)
  // before the background polling runs.
  useEffect(() => {
    if (suggestingSkill && suggestingSkill.formation_group && user) {
      const targetSongId = suggestingSkill.song_id || suggestingSkill.songs?.id;
      const targetGroup = suggestingSkill.formation_group;
      
      const checkDbForExistingBand = async () => {
        try {
          // 1. Check if a band already exists for this formation group in the database
          const { data: existingBands } = await supabase
            .from('bands')
            .select('id, name, status')
            .eq('formation_group', targetGroup)
            .in('status', ['forming', 'active']);
            
          if (existingBands && existingBands.length > 0) {
            console.log('[SafetyCheck] Band already exists in DB for group:', targetGroup);
            setSuggestingSkill(null);
            fetchDashboardData(user.id, false);
            return;
          }
          
          // 2. Check if this student is already in a band for this song
          if (targetSongId) {
            const { data: memberships } = await supabase
              .from('band_members')
              .select('id, bands(id, status, song_id)')
              .eq('user_id', user.id);
              
            const alreadyInBand = (memberships || []).some((m: any) => 
              m.bands && 
              ['forming', 'active'].includes(m.bands.status) && 
              m.bands.song_id === targetSongId
            );
            
            if (alreadyInBand) {
              console.log('[SafetyCheck] Student is already in a band for this song in DB:', targetSongId);
              setSuggestingSkill(null);
              fetchDashboardData(user.id, false);
            }
          }
        } catch (err) {
          console.error('[SafetyCheck] Error checking database for existing band:', err);
        }
      };
      
      checkDbForExistingBand();
    }
  }, [suggestingSkill, user]);

  const [selectedStudentForPreview, setSelectedStudentForPreview] = useState<any>(null);

  // PERSISTENCE LOGIC: Save band profile state
  useEffect(() => {
    localStorage.setItem('groovelab_show_band_profile', showBandProfile.toString());
    localStorage.setItem('groovelab_band_profile_view', bandProfileView);
    if (selectedBandForProfile?.id) {
      localStorage.setItem('groovelab_selected_band_id', selectedBandForProfile.id);
    } else if (!showBandProfile) {
      localStorage.removeItem('groovelab_selected_band_id');
    }
  }, [showBandProfile, bandProfileView, selectedBandForProfile]);
  const [customBandName, setCustomBandName] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [failedAvatarUrls, setFailedAvatarUrls] = useState<string[]>([]);
  const [avatarPickerType, setAvatarPickerType] = useState<'band' | 'student' | 'teacher'>('band');
  const [avatarInstrumentFilter, setAvatarInstrumentFilter] = useState<'Alle' | 'E-Gitarre' | 'E-Piano' | 'E-Drum' | 'E-Bass' | 'Gesang'>('Alle');
  const [bandAvatarSizeFilter, setBandAvatarSizeFilter] = useState<'Alle' | '3' | '4' | '5'>('Alle');

  const [isSharedView, setIsSharedView] = useState(false);

  useEffect(() => {
    const urlBandId = searchParams.get('band');
    const isShared = searchParams.get('view') === 'shared';
    const urlCampusPassToken = searchParams.get('campus_pass');
    
    if (urlBandId) {
      if (isShared) setIsSharedView(true);
      console.log(`[PublicView] Detected band ID in URL: ${urlBandId} (Shared: ${isShared})`);
      const fetchPublicBand = async () => {
        try {
          const { data, error } = await supabase
            .from('bands')
            .select('*, songs(*), band_members(*, users!user_id(*)), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url))), coach:users!bands_coach_id_fkey(first_name, last_name, photo_url)')
            .eq('id', urlBandId)
            .single();
            
          if (error) {
            console.error('[PublicView] Supabase error fetching band:', error);
            return;
          }
          
          if (data) {
            console.log('[PublicView] Band data loaded successfully:', data.name);
            setSelectedBandForProfile(data);
            setShowBandProfile(true);
            document.title = `${data.name} | GrooveLab Profile`;
          }
        } catch (err) {
          console.error('[PublicView] Unexpected crash during fetch:', err);
        }
      };
      fetchPublicBand();
    }

    if (urlCampusPassToken) {
      console.log(`[PublicPassView] Detected campus pass token in URL: ${urlCampusPassToken}`);
      const fetchPublicPass = async () => {
        try {
          // Stage 0: Tier-1 Server-Side Authentication RPC (Fail-Closed)
          let passData: any = null;
          try {
            const { data: authResult, error: rpcErr } = await supabase.rpc('authenticate_by_credential', {
              p_credential: urlCampusPassToken,
              p_school_id: null
            });
            if (!rpcErr && authResult?.success && authResult?.user) {
              passData = authResult.user;
              if (authResult.lease_token) {
                sessionStorage.setItem('gl_active_session_lease_id', authResult.lease_token);
                localStorage.setItem('gl_active_session_lease_id', authResult.lease_token);
              }
            }
          } catch (e) {
            console.warn('[PublicPassView] authenticate_by_credential failed:', e);
          }
          
          if (passData) {
            console.log('[PublicPassView] User pass loaded successfully:', passData.first_name);
            setPublicPassUser(passData);
            document.title = `Campus Pass | ${passData.first_name || ''} ${passData.last_name || ''}`.trim();
          }
        } catch (err) {
          console.error('[PublicPassView] Unexpected crash during fetch:', err);
        } finally {
          setLoadingPublicPass(false);
        }
      };
      fetchPublicPass();
    }
  }, []);

  const { width, height } = useWindowSize();
  const isMobile = width < 768;
  const isKioskMode = (stationIdFromStorage && stationIdFromStorage !== "skip") || (typeof window !== "undefined" ? !!localStorage.getItem("groovelab_kiosk_token") : false);

  const {
    fetchPlanningData,
    toggleSlot,
    checkAnnouncements,
    fetchAnnouncements,
    fetchStudentMessagesBackground,
    fetchStudentMessages,
    fetchCampusMessages,
    debouncedFetchCampusMessages
  } = useCampusMessagingData({
    user,
    loggedInUserId,
    supabase,
    activeStudentTab,
    plannedSlots,
    setPlannedSlots,
    setGlobalPlannedSlots,
    setActiveAnnouncement,
    setAnnouncements,
    annBandId,
    setAnnBandId,
    userBands,
    setStudentMessages,
    setStudentMessagesLoading,
    setCampusMessages,
    setCampusUnreadCount,
    setCampusMessagesLoading
  });

  const {
    handleLogout,
    handleLogin
  } = useAuthSessionActions({
    user,
    setUser,
    setUserRaw,
    session,
    setSession,
    loggedInUserId,
    setLoggedInUserId,
    setLoggedInUserIdRaw,
    supabase,
    activePlatform,
    setActivePlatform,
    setActiveWorkspace,
    setActiveStudentTab,
    stationIdFromStorage,
    setStationIdFromStorage,
    setIsCampusUnlocked,
    setShowDeletionPrompt,
    setDeletionPromptUserId,
    setDeletionPromptIsHome,
    isLocalhost
  });

  const {
    fetchActiveStudentCount,
    fetchSession
  } = useCampusSessionLifecycle({
    user,
    session,
    setSession,
    loggedInUserId,
    activePlatform,
    setActivePlatform,
    setActivePlatformRaw,
    activeStudentTab,
    setActiveStudentTab,
    setActiveStudentTabRaw,
    locationMode,
    showAutoLockWarning,
    setShowAutoLockWarning,
    setAutoLockCountdown,
    setActiveStudentsCount,
    handleLogout,
    supabase
  });

  const {
    fetchDashboardData,
    handleLeaveBand
  } = useCampusDashboardDataLoader({
    user,
    setUser,
    setLoading,
    supabase,
    isLocalhost,
    setIsOfflineMode,
    locationMode,
    setLocationMode,
    activePlatform,
    setActivePlatform,
    isKioskMode,
    handleLogout,
    setActiveWorkspace,
    setActiveStudentTab,
    setIsSchoolPaused,
    setSession,
    fetchActiveStudentCount,
    setTeachers,
    setSchoolUsers,
    setActiveStudentsCount,
    setGlobalSongs,
    setTotalPresenceMins,
    setUserSongs,
    lastWriteTimeRef,
    setWallSongs,
    setUserBands,
    setAllBands,
    setStudentActivity,
    selectedBandForProfile,
    setSelectedBandForProfile,
    restoredBandId,
    showBandProfile,
    setShowConfetti,
    fetchPlanningData,
    checkAnnouncements,
    fetchAnnouncements,
    fetchStudentMessagesBackground,
    fetchCampusMessages
  });

  const { liveSessionMins } = useCampusRealtimeSync({
    user,
    setUser,
    session,
    setSession,
    loggedInUserId,
    setLoggedInUserId,
    supabase,
    activePlatform,
    setActivePlatform,
    activeStudentTab,
    setActiveStudentTab,
    isKioskMode,
    handleLogout,
    fetchDashboardData,
    fetchCampusMessages,
    setLoading
  });

  const {
    handleSendCampusMessage,
    handleMarkCampusMessagesAsRead,
    handleMarkCampusGroupAsRead,
    handleMarkCampusChannelAsRead,
    handleAcknowledgeStudentMessage,
    handleDeleteMessageForSelf,
    handleAcknowledgeAnnouncement,
    handlePostAnnouncement,
    handleDeleteAnnouncement,
    handleHelpRequest
  } = useCampusChatActions({
    user,
    session,
    loggedInUserId,
    supabase,
    setCampusMessages,
    setCampusUnreadCount,
    fetchCampusMessages,
    debouncedFetchCampusMessages,
    studentMessages,
    setStudentMessages,
    announcements,
    setAnnouncements,
    selectedStudentMessage,
    setSelectedStudentMessage,
    deletedMessageIds,
    setDeletedMessageIds,
    studentMessagesFilter,
    setActiveAnnouncement,
    announcementTitle,
    setAnnouncementTitle,
    announcementMessage,
    setAnnouncementMessage,
    announcementTarget,
    setAnnouncementTarget,
    selectedTargetUserIds,
    setSelectedTargetUserIds,
    setRecipientSearchText,
    annBandId,
    setAnnBandId,
    fetchAnnouncements,
    setLoading,
    setToastMessage
  });

  const {
    updateProgress,
    handleFinalizeBandName,
    handleFoundBand,
    handleAcceptBand,
    handleCloseAnnouncement,
    handleRejectFounding,
    handleFinalizeFounding,
    handleDeleteSong,
    handleAddSongToRepertoire,
    handleSubmitForApproval,
    handleSuggestToBand,
    clearConfetti
  } = useBandRepertoireActions({
    user,
    loggedInUserId,
    supabase,
    globalSongs,
    userSongs,
    setUserSongs,
    pendingFounding,
    setPendingFounding,
    foundingName,
    setFoundingName,
    loading,
    setLoading,
    selectedCoachId,
    setSelectedCoachId,
    selectedBandForGateway,
    setSelectedBandForGateway,
    fetchDashboardData,
    setActiveStudentTab,
    setShowFoundingModal,
    setSuggestingSkill,
    ignoredFoundingIds,
    lastWriteTimeRef,
    exclusiveProposal,
    dismissSuggestion,
    showConfetti,
    setShowConfetti
  });




  const {
    isGhostParam,
    ghostSchoolId,
    isMasterAdminSession,
    isMaintenanceLockoutActive,
    handleSwitchActiveRole
  } = useCampusSecurityGuards({
    user,
    setUser,
    activePlatform,
    setActivePlatform,
    setActiveWorkspace,
    setActiveStudentTab,
    maintenanceState,
    maintenanceBypass,
    isLocalhost,
    supabase
  });

  const startupGate = renderCampusStartupGates({
    location,
    searchParams,
    selectedBandForProfile,
    showBandProfile,
    user,
    bandProfileView,
    setBandProfileView,
    brandColor,
    width,
    APP_INSTRUMENT_COLORS,
    APP_INSTRUMENT_ICONS,
    setShowBandProfile,
    setEditingBand,
    setShowEditBand,
    setShowAvatarPicker,
    setAvatarPickerType,
    isSharedView,
    publicPassUser,
    loadingKiosk,
    kioskRoomIdParam,
    kioskSetupParam,
    kioskBootstrapping,
    qrPathMatch,
    navigate,
    handleLogin,
    loggedInUserId,
    isKioskMode,
    stationIdFromStorage,
    setShowPrivacy,
    setShowAgb,
    setShowImpressum,
    setShowAccessibility,
    renderLegalModals,
    showSchoolOnboardingModal,
    setShowSchoolOnboardingModal,
    showDeletionPrompt,
    deletionPromptUserId,
    deletionPromptIsHome,
    setShowDeletionPrompt,
    setDeletionPromptUserId,
    isMasterAdminSession,
    handleLogout,
    loading,
    supabase,
    setLoggedInUserId,
    setUser,
    setLoading,
    activeWorkspace,
    isGhostParam,
    handleSwitchActiveRole,
    activePlatform,
    isSchoolPaused,
  });

  if (startupGate) {
    return startupGate;
  }

  // 3. MAIN DASHBOARD LOGIC (Resumes here after Auth/Loading checks)
  const {
    calculateSkillXP,
    studentRadarData,
    totalPracticeMins,
    practiceSongs,
    repertoireSongs,
    groupedPracticeSongs,
    groupedRepertoireSongs,
    getTeacherTheme,
    getTeacherColorStyle,
    getTeacherPresenceList,
    school,
    trialDaysLeft,
    handleInstallPWA,
    handleDismissInstall
  } = useCampusDashboardMetrics({
    user,
    loggedInUserId,
    userSongs,
    wallSongs,
    userBands,
    totalPresenceMins,
    liveSessionMins,
    practiceSearchQuery,
    practiceSearchType,
    practiceAlphaFilter,
    globalPlannedSlots,
    deferredPrompt,
    setDeferredPrompt,
    setShowInstallBanner
  });

  return (
    <LegalConsentGate user={user}>
      <Suspense fallback={null}>
        <DeviceSimulator>
        {isGhostParam && (
          <GhostSupportCapsule 
            schoolName={user?.schools?.name || (Array.isArray(user?.schools) ? user.schools[0]?.name : undefined)} 
            currentRole={user?.role}
            onRoleChange={handleSwitchActiveRole}
          />
        )}
        {isMaintenanceLockoutActive && maintenanceState && (
          <Suspense fallback={null}>
            <MaintenanceLockoutOverlay 
              maintenanceState={maintenanceState} 
              onBypassUnlocked={() => setMaintenanceBypass(true)} 
              currentRole={user?.role}
              currentSchoolId={school?.id}
              activePlatform={activePlatform}
            />
          </Suspense>
        )}
        {broadcastAnnouncement && (
          <Suspense fallback={null}>
            <GlobalBroadcastBanner 
              announcement={broadcastAnnouncement} 
              currentRole={user?.role} 
              activePlatform={activePlatform}
              currentSchoolId={school?.id}
            />
          </Suspense>
        )}
        <OfflineSyncIndicator />
        <PrivacyShieldOverlay 
          isActive={isShielded} 
          onUnlock={dismissShield} 
          schoolName={user?.schools?.name || (Array.isArray(user?.schools) ? user.schools[0]?.name : undefined)} 
        />
        {/* Soft Trial Pre-Expiry Warning Banner for Admin/Secretary (Days 27-30) */}
        {(user?.role === 'admin' || user?.role === 'secretary') && school?.is_trial && !school?.subscription_bypass && trialDaysLeft !== null && trialDaysLeft <= 3 && trialDaysLeft > 0 && (
          <div style={{
            background: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)',
            borderBottom: '1px solid #fde68a',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            zIndex: 999
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={16} color="#b45309" />
              <span style={{ fontSize: '0.84rem', fontWeight: 650, color: '#92400e' }}>
                Hinweis: Die 30-tägige Probezeit Ihrer Musikschule endet in <strong>{trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tagen'}</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowTrialInfoModal(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                background: '#b45309',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(180, 83, 9, 0.2)'
              }}
            >
              Jetzt ansehen &amp; freischalten
            </button>
          </div>
        )}
        {showPwaUpdateToast && (
          <Suspense fallback={null}>
            <PwaUpdateToast 
              onUpdate={async () => {
                try {
                  if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map(k => caches.delete(k)));
                  }
                  if ('serviceWorker' in navigator) {
                    const reg = await navigator.serviceWorker.getRegistration();
                    if (reg && reg.waiting) {
                      reg.waiting.postMessage({ action: 'skipWaiting' });
                    }
                  }
                } catch {}
                window.location.replace('/?v=' + Date.now());
              }}
              onDismiss={() => setShowPwaUpdateToast(false)}
            />
          </Suspense>
        )}
      <OfflineStatusBadge />
      <div className="app-layout">
      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: toastMessage.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(30, 41, 59, 0.95)',
            backdropFilter: 'blur(16px)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 700,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            pointerEvents: 'auto',
            animation: 'slideDownFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={() => setToastMessage(null)}
        >
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} color="#34a853" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <PwaInstallationModals
        showInstallBanner={showInstallBanner}
        setShowInstallBanner={setShowInstallBanner}
        showInstallGuide={showInstallGuide}
        setShowInstallGuide={setShowInstallGuide}
        activePlatform={activePlatform}
        deferredPrompt={deferredPrompt}
        handleInstallPWA={handleInstallPWA}
        handleDismissInstall={handleDismissInstall}
      />

      <style>{`
        .sidebar-nav .hover-scale { transition: all 0.2s ease !important; }
        .sidebar-nav .hover-scale:hover { 
          transform: translateX(4px); 
          background: rgba(255,255,255,0.03) !important;
          border-color: rgba(255,255,255,0.05) !important;
        }
        @keyframes slideUpFade {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
      {/* Sidebar Navigation (iPad/Desktop) */}
      <CampusDesktopSidebar
        user={user}
        school={school}
        activePlatform={activePlatform}
        activeStudentTab={activeStudentTab}
        setActiveStudentTab={setActiveStudentTab}
        activeWorkspace={activeWorkspace}
        teachers={teachers}
        session={session}
        windowWidth={windowWidth}
        campusStudentUiLevel={campusStudentUiLevel}
        parentUnlocked={parentUnlocked}
        campusUnreadCount={campusUnreadCount}
        studentMessages={studentMessages}
        showMissionsFeature={showMissionsFeature}
        isMusicStandMode={isMusicStandMode}
        toggleMusicStandMode={toggleMusicStandMode}
        onShowQr={() => setShowQR(true)}
        onLogout={handleLogout}
        onOpenPrivacy={() => setShowPrivacy(true)}
        onOpenAgb={() => setShowAgb(true)}
        onOpenImpressum={() => setShowImpressum(true)}
        onOpenAccessibility={() => setShowAccessibility(true)}
        supabase={supabase}
        setParentPermissionsVersion={setParentPermissionsVersion}
      />

      <div className={`main-wrapper ${activeStudentTab === 'live' ? 'live-tab-active' : ''}`} style={{ paddingTop: '0' }}>
        {(() => {
          const hasCampusSub = Boolean(school && (school.has_campus_subscription || !school.is_billing_booked || school.subscription_bypass));
          const hasGrooveLabSub = Boolean(school && (school.has_groovelab_subscription || !school.is_billing_booked || school.subscription_bypass));
          const isStaff = user?.role === 'admin' || user?.role === 'secretary';
          const hasCampusActive = Boolean((isStaff || user?.is_campus_active) && hasCampusSub);
          const hasGrooveLabActive = Boolean((isStaff || user?.is_groovelab_active) && hasGrooveLabSub);

          return (
            <MobileTopHeader
              user={user}
              school={school}
              activePlatform={activePlatform as 'campus' | 'groovelab' | 'admin'}
              setActivePlatform={(p) => {
                if (p === 'campus') {
                  const isStudent = user?.role === 'student';
                  if (isStudent && locationMode === 'lab' && isKioskMode && !isCampusUnlocked) {
                    setShowCampusPinPrompt(true);
                    return;
                  }
                  if (user?.role === 'teacher') {
                    sessionStorage.setItem('groovelab_active_workspace', 'teacher');
                  }
                  setActivePlatform('campus');
                  const rawCampusTab = sessionStorage.getItem('campus_active_tab');
                  const startTab = (rawCampusTab && rawCampusTab !== 'live') ? rawCampusTab : 'briefing';
                  setActiveStudentTab(startTab);
                  sessionStorage.setItem('campus_active_tab', startTab);
                } else if (p === 'groovelab') {
                  if (user?.role === 'teacher') {
                    sessionStorage.setItem('groovelab_active_workspace', 'teacher');
                  }
                  setActivePlatform('groovelab');
                  if (isStaff || user?.role === 'teacher') {
                    setLocationMode('lab');
                    sessionStorage.setItem('groovelab_location_mode', 'lab');
                  }
                  setActiveStudentTab('live');
                  sessionStorage.setItem('groovelab_active_tab', 'live');
                  localStorage.setItem('groovelab_active_tab', 'live');
                } else {
                  setActivePlatform(p);
                }
              }}
              hasCampusActive={hasCampusActive}
              hasGrooveLabActive={hasGrooveLabActive}
              unreadCount={campusUnreadCount}
            />
          );
        })()}
        {/* BFSG 2025 / WCAG 2.4.1 Skip-to-Content Navigation Link */}
        <a href="#main-content" className="skip-to-content">
          Zum Hauptinhalt springen
        </a>
        <CampusDesktopHeader
          user={user}
          school={school}
          activePlatform={activePlatform}
          setActivePlatform={setActivePlatform}
          activeStudentTab={activeStudentTab}
          setActiveStudentTab={setActiveStudentTab}
          windowWidth={windowWidth}
          locationMode={locationMode}
          setLocationMode={setLocationMode}
          isKioskMode={isKioskMode}
          isCampusUnlocked={isCampusUnlocked}
          setShowCampusPinPrompt={setShowCampusPinPrompt}
          showEnsemblesFeature={showEnsemblesFeature}
          setShowMobileInfo={setShowMobileInfo}
          isOfflineMode={isOfflineMode}
          trialDaysLeft={trialDaysLeft}
          setShowTrialInfoModal={setShowTrialInfoModal}
          teachers={teachers}
          session={session}
          activeStudentsCount={activeStudentsCount}
          showDateSimulation={showDateSimulation}
          simulatedDate={simulatedDate}
          setSimulatedDate={setSimulatedDate}
          handleSwitchActiveRole={handleSwitchActiveRole}
          handleLogout={handleLogout}
        />


      <CampusMainContentRouter
        windowWidth={windowWidth}
        activeStudentTab={activeStudentTab}
        parentUnlocked={parentUnlocked}
        setParentUnlocked={setParentUnlocked}
        user={user}
        setUser={setUser}
        school={school}
        activePlatform={activePlatform}
        setActivePlatform={setActivePlatform}
        setActiveStudentTab={setActiveStudentTab}
        campusStudentUiLevel={campusStudentUiLevel}
        setParentPermissionsVersion={setParentPermissionsVersion}
        supabase={supabase}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        setSidebarNotificationsCount={setSidebarNotificationsCount}
        session={session}
        setSession={setSession}
        locationMode={locationMode}
        setLocationMode={setLocationMode}
        setSuggestingSkill={setSuggestingSkill}
        foundingName={foundingName}
        setFoundingName={setFoundingName}
        foundingLanguage={foundingLanguage}
        teachers={teachers}
        campusTeacherStats={campusTeacherStats}
        activeWorkspace={activeWorkspace}
        setShowQR={setShowQR}
        setShowPrivacy={setShowPrivacy}
        setShowAgb={setShowAgb}
        setShowCancellation={setShowCancellation}
        setShowImpressum={setShowImpressum}
        setShowAccessibility={setShowAccessibility}
        userSongs={userSongs}
        userBands={userBands}
        allBands={allBands}
        brandColor={brandColor}
        fetchPlanningData={fetchPlanningData}
        setAvatarPickerType={setAvatarPickerType}
        setShowAvatarPicker={setShowAvatarPicker}
        setSelectedBandForProfile={setSelectedBandForProfile}
        setShowBandProfile={setShowBandProfile}
        globalPlannedSlots={globalPlannedSlots}
        plannedSlots={plannedSlots}
        toggleSlot={toggleSlot}
        loggedInUserId={loggedInUserId}
        handleLogout={handleLogout}
        showMissionsFeature={showMissionsFeature}
        schoolUsers={schoolUsers}
        campusMessages={campusMessages}
        announcements={announcements}
        studentMessages={studentMessages}
        selectedCampusRecipient={selectedCampusRecipient}
        setSelectedCampusRecipient={setSelectedCampusRecipient}
        handleSendCampusMessage={handleSendCampusMessage}
        handleMarkCampusMessagesAsRead={handleMarkCampusMessagesAsRead}
        handleMarkCampusGroupAsRead={handleMarkCampusGroupAsRead}
        handleMarkCampusChannelAsRead={handleMarkCampusChannelAsRead}
        setAnnouncementTitle={setAnnouncementTitle}
        setAnnouncementMessage={setAnnouncementMessage}
        setAnnouncementTarget={setAnnouncementTarget}
        setSelectedTargetUserIds={setSelectedTargetUserIds}
        handlePostAnnouncement={handlePostAnnouncement}
        handleDeleteAnnouncement={handleDeleteAnnouncement}
        handleAcknowledgeStudentMessage={handleAcknowledgeStudentMessage}
        practiceSongs={practiceSongs}
        groupedPracticeSongs={groupedPracticeSongs}
        groupedRepertoireSongs={groupedRepertoireSongs}
        practiceSearchQuery={practiceSearchQuery}
        setPracticeSearchQuery={setPracticeSearchQuery}
        practiceSearchType={practiceSearchType}
        setPracticeSearchType={setPracticeSearchType}
        practiceAlphaFilter={practiceAlphaFilter}
        setPracticeAlphaFilter={setPracticeAlphaFilter}
        expandedSongId={expandedSongId}
        setExpandedSongId={setExpandedSongId}
        updateProgress={updateProgress}
        handleSubmitForApproval={handleSubmitForApproval}
        handleDeleteSong={handleDeleteSong}
        setActivePdfSong={setActivePdfSong}
        setActivePdfFolderUrl={setActivePdfFolderUrl}
        isMobile={isMobile}
        wallSongs={wallSongs}
        matchingLevelFilter={matchingLevelFilter}
        setMatchingLevelFilter={setMatchingLevelFilter}
        activeBandSubTab={activeBandSubTab}
        setActiveBandSubTab={setActiveBandSubTab}
        bandSearchText={bandSearchText}
        setBandSearchText={setBandSearchText}
        bandSearchLetter={bandSearchLetter}
        setBandSearchLetter={setBandSearchLetter}
        setSelectedStudentForPreview={setSelectedStudentForPreview}
        fetchDashboardData={fetchDashboardData}
        width={width}
        globalSongs={globalSongs}
        handleAddSongToRepertoire={handleAddSongToRepertoire}
        setSelectedTeacher={setSelectedTeacher}
      />

      {/* Mobile Native Bottom Navigation Bar (Controlled via CSS for Mobile & Simulator) */}
      {user && (() => {
        const hasCampusSub = Boolean(school && (school.has_campus_subscription || !school.is_billing_booked || school.subscription_bypass));
        const hasGrooveLabSub = Boolean(school && (school.has_groovelab_subscription || !school.is_billing_booked || school.subscription_bypass));
        const isStaff = user?.role === 'admin' || user?.role === 'secretary';
        const hasCampusActive = Boolean((isStaff || user?.is_campus_active) && hasCampusSub);
        const hasGrooveLabActive = Boolean((isStaff || user?.is_groovelab_active) && hasGrooveLabSub);

        return (
          <MobileBottomNav
            activeTab={activeStudentTab}
            setActiveTab={setActiveStudentTab}
            activePlatform={activePlatform as 'campus' | 'groovelab' | 'admin'}
            setActivePlatform={(p) => setActivePlatform(p)}
            userRole={user?.role?.toLowerCase() || 'student'}
            hasCampusActive={hasCampusActive}
            hasGrooveLabActive={hasGrooveLabActive}
            unreadCount={campusUnreadCount}
          />
        );
      })()}






      {/* Help FAB (Only for logged-in students in Lab Mode with active station on the Groovelab platform) */}
      {user && activePlatform === 'groovelab' && user.role === 'student' && locationMode === 'lab' && session?.station_id && (
        <div className="fab-container">
          <button 
            className="fab-button" 
            onClick={handleHelpRequest}
            title="Hilfe rufen"
          >
            <AlertCircle size={28} />
          </button>
        </div>
      )}
      {/* 🎸 Band Founding & Skill Suggestion Hub */}
      <BandFoundingModalsHub
        user={user}
        brandColor={brandColor}
        suggestingSkill={suggestingSkill}
        setSuggestingSkill={setSuggestingSkill}
        foundingName={foundingName}
        setFoundingName={setFoundingName}
        foundingLanguage={foundingLanguage}
        setFoundingLanguage={setFoundingLanguage}
        teachers={teachers}
        selectedCoachId={selectedCoachId}
        setSelectedCoachId={setSelectedCoachId}
        handleFoundBand={handleFoundBand}
        dismissSuggestion={dismissSuggestion}
        userBands={userBands}
        globalSongs={globalSongs}
        handleSuggestToBand={handleSuggestToBand}
        supabase={supabase}
        fetchDashboardData={fetchDashboardData}
        setActiveStudentTab={setActiveStudentTab}
      />

      {/* 🧭 Onboarding, Guidance & Help Modals Hub */}
      <OnboardingHelpModalsHub
        user={user}
        school={school}
        activePlatform={activePlatform}
        showQR={showQR}
        onCloseQR={() => setShowQR(false)}
        isHelpCenterOpen={isGlobalHelpCenterOpen}
        onCloseHelpCenter={() => setIsGlobalHelpCenterOpen(false)}
        showTrialInfo={showTrialInfoModal}
        onCloseTrialInfo={() => setShowTrialInfoModal(false)}
        trialDaysLeft={trialDaysLeft}
        onNavigateToBilling={() => {
          setShowTrialInfoModal(false);
          if (user?.role === 'admin' || user?.role === 'secretary') {
            sessionStorage.setItem('groovelab_active_workspace', 'secretary');
            handleSwitchActiveRole('admin');
          }
        }}
        showMobileInfo={showMobileInfo}
        onCloseMobileInfo={() => setShowMobileInfo(false)}
        locationMode={locationMode}
        stationName={session?.stations?.name}
        showSchoolOnboardingModal={showSchoolOnboardingModal}
        onCloseSchoolOnboarding={() => setShowSchoolOnboardingModal(false)}
        onSchoolOnboardingSuccess={(schoolData, userData) => {
          setShowSchoolOnboardingModal(false);
          if (typeof window !== 'undefined' && window.history) {
            safeReplaceState({}, document.title, window.location.pathname);
          }
          window.location.reload();
        }}
      />

      {/* Render Legal Modals Helper Call */}
      {renderLegalModals()}

      {/* 📇 Detail Profiles & Reward Modals Hub */}
      <DetailProfilesModalsHub
        user={user}
        activePlatform={activePlatform}
        activeWorkspace={activeWorkspace}
        selectedTeacher={selectedTeacher}
        onCloseTeacher={() => setSelectedTeacher(null)}
        selectedStudentProfile={selectedStudentProfile}
        onCloseStudentProfile={() => setSelectedStudentProfile(null)}
        onOpenBandProfile={(band) => {
          setSelectedBandForProfile(band);
          setBandProfileView('public');
          setShowBandProfile(true);
          setSelectedStudentProfile(null);
        }}
        onOpenTageskompass={(student) => {
          if ((window as any).openTageskompass) {
            (window as any).openTageskompass(student);
          }
          setSelectedStudentProfile(null);
        }}
        onSwitchPlatform={(newPlatform) => {
          setActivePlatform(newPlatform);
        }}
        showConfetti={showConfetti}
        confettiWidth={width}
        confettiHeight={height}
        confettiBrandColor={brandColor}
        onClearConfetti={clearConfetti}
      />


      {/* 👤 Profile, Band, Avatar & Gateway Modals Hub */}
      <ProfileBandModalsHub
        user={user}
        setUser={setUser}
        brandColor={brandColor}
        width={width}
        activePlatform={activePlatform}
        supabase={supabase}
        fetchDashboardData={fetchDashboardData}
        APP_INSTRUMENT_ICONS={APP_INSTRUMENT_ICONS}
        APP_INSTRUMENT_COLORS={APP_INSTRUMENT_COLORS}
        activeAnnouncement={activeAnnouncement}
        handleAcknowledgeAnnouncement={handleAcknowledgeAnnouncement}
        showEditProfile={showEditProfile}
        setShowEditProfile={setShowEditProfile}
        editingProfile={editingProfile}
        setEditingProfile={setEditingProfile}
        handleUpdateProfile={handleUpdateProfile}
        selectedStudentForPreview={selectedStudentForPreview}
        setSelectedStudentForPreview={setSelectedStudentForPreview}
        showBandProfile={showBandProfile}
        setShowBandProfile={setShowBandProfile}
        selectedBandForProfile={selectedBandForProfile}
        setSelectedBandForProfile={setSelectedBandForProfile}
        bandProfileView={bandProfileView}
        setBandProfileView={setBandProfileView}
        isSharedView={isSharedView}
        showEditBand={showEditBand}
        setShowEditBand={setShowEditBand}
        editingBand={editingBand}
        setEditingBand={setEditingBand}
        teachers={teachers}
        showAvatarPicker={showAvatarPicker}
        setShowAvatarPicker={setShowAvatarPicker}
        avatarPickerType={avatarPickerType}
        setAvatarPickerType={setAvatarPickerType}
        bandAvatarSizeFilter={bandAvatarSizeFilter}
        setBandAvatarSizeFilter={setBandAvatarSizeFilter}
        avatarInstrumentFilter={avatarInstrumentFilter}
        setAvatarInstrumentFilter={setAvatarInstrumentFilter}
        BAND_AVATARS={BAND_AVATARS}
        STUDENT_AVATARS={STUDENT_AVATARS}
        TEACHER_AVATARS={TEACHER_AVATARS}
        CAMPUS_AVATARS={CAMPUS_AVATARS}
        failedAvatarUrls={failedAvatarUrls}
        selectedBandForGateway={selectedBandForGateway}
        setSelectedBandForGateway={setSelectedBandForGateway}
        pendingFounding={pendingFounding}
        setPendingFounding={setPendingFounding}
        gatewayJustClosed={gatewayJustClosed}
        clearConfetti={clearConfetti}
      />

      {/* 🛡️ Universal Security & Auth Modals Hub (OWASP ASVS Level 3) */}
      <SecurityAuthModalsHub
        user={user}
        school={school}
        schoolUsers={schoolUsers}
        supabase={supabase}
        activePlatform={activePlatform}
        showAdminSecuritySuiteModal={showAdminSecuritySuiteModal}
        onCloseAdminSecuritySuite={() => setShowAdminSecuritySuiteModal(false)}
        showQuarterlyAccessReportModal={showQuarterlyAccessReportModal}
        onOpenQuarterlyAccessReport={() => setShowQuarterlyAccessReportModal(true)}
        onCloseQuarterlyAccessReport={() => setShowQuarterlyAccessReportModal(false)}
        isScreenLockedByInactivity={isScreenLockedByInactivity}
        onUnlockSession={() => {
          setIsScreenLockedByInactivity(false);
          setIsCampusUnlocked(true);
        }}
        onLogoutSession={() => {
          handleLogout(true, false);
        }}
        showAutoLockWarning={showAutoLockWarning}
        autoLockCountdown={autoLockCountdown}
        onContinueSession={() => setShowAutoLockWarning(false)}
        onLogoutWarning={() => {
          setShowAutoLockWarning(false);
          handleLogout(true, false);
        }}
        showCampusPinPrompt={showCampusPinPrompt}
        onCloseCampusPinPrompt={() => {
          setShowCampusPinPrompt(false);
        }}
        onUnlockCampusPin={() => {
          setIsCampusUnlocked(true);
          setShowCampusPinPrompt(false);
          const wasScreenLocked = isScreenLockedByInactivity;
          setIsScreenLockedByInactivity(false);
          if (!wasScreenLocked) {
            setActivePlatform('campus');
            const isStaff = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'secretary';
            const startTab = isStaff ? 'live' : 'briefing';
            setActiveStudentTab(startTab);
            localStorage.setItem('campus_active_tab', startTab);
          }
        }}
      />



    </div>
  </div>
</DeviceSimulator>
</Suspense>
</LegalConsentGate>
);
}

export default App;
