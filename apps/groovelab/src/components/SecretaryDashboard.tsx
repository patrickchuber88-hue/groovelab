import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { supabase, deleteUserStorageAssets } from '../lib/supabase';
import { useRealNamesVisibility, maskLastName, sanitizeBirthDateToDayOnly, formatTeacherFullName } from '../utils/nameHelper';
import { validateMediaBlob } from '../utils/mediaSecurityValidator';
import { useMasterPricing } from '../context/MasterPricingContext';
import { StorageTier, DEFAULT_STORAGE_TIERS, getStorageTierByGb, isSchoolBypassActive } from '../domain/pricingEngine';
import { 
  ShieldAlert, CheckCircle, CheckCircle2, Users, Settings, ShieldCheck, FileText,
  UserCheck, RefreshCw, Key, ChevronRight, UserX, LogOut,
  Copy, Check, Link as LinkIcon, Monitor, Sliders,
  Coffee, Sparkles, Clock, ClipboardList, Upload, Plus,
  Trash2, Shield, Calendar, CalendarX, CalendarCheck, BookOpen, Music, CheckSquare, XSquare, Check as CheckIcon, Edit2,
  LayoutDashboard, Award, UserPlus, GraduationCap, ZoomIn, ZoomOut, ChevronLeft, X, AlertCircle, MoreVertical, ArrowUp, ArrowDown, ArrowLeftRight,
  School, User, DoorOpen, Tag, Wrench, BarChart2, Edit3, Search, Ruler, Eye, EyeOff, Lock, GripVertical, Mail, QrCode, CreditCard, TrendingDown, Info, Lightbulb, Download, Printer, Palette, Zap, Database, Activity, HeartHandshake,
  HardDrive, Cloud, Crown, Rocket, Cpu, Fingerprint, Smartphone, KeyRound, RotateCw, LayoutGrid, Mic, Smile, Radio, Archive,
  Disc3, Menu, ScrollText
} from 'lucide-react';
import { isWebAuthnSupported, registerUserBiometrics, authenticateUserBiometrics, getStoredBiometricProfiles, removeBiometricProfile, BiometricVaultProfile } from '../utils/webauthn';
import { usePremiumOnboardingTour, TourStep } from './PremiumOnboardingTour';
import { CampusGroovelabBrand, CampusGroovelabText, CampusGroovelabLogo } from './CampusGroovelabBrand';
import QRCode from 'react-qr-code';
import { getInstrumentAvatarUrl } from './StudioAvatar';
import { UpdateAnnouncementHero } from './common/UpdateAnnouncementHero';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { StudentToDelete } from './ConfirmDeleteStudentModal';
import { deleteStudentFully } from '../utils/studentDeletionService';
import { scrubSharedDeviceCache } from '../utils/sharedDeviceScrubber';
import { getParentOnboardingUrl, isDevEnvironment } from '../utils/tenantUrlHelper';
import { isUUID } from '../utils/uuidValidator';
import { getAlphabeticalHue, getAlphabeticalUniColor } from '../utils/adminColorHelpers';
import { formatCurrency, formatGermanDate } from '../utils/formatters';

// Modular Bounded Context components, navigation hubs and tabs
import { SecretarySidebar } from './secretary/SecretarySidebar';
import { SecretaryHeader } from './secretary/SecretaryHeader';
const SecretaryBillingModalsHub = lazy(() => import('./secretary/SecretaryBillingModalsHub').then(m => ({ default: m.SecretaryBillingModalsHub })));
const SecretaryGeneralModalsHub = lazy(() => import('./secretary/SecretaryGeneralModalsHub').then(m => ({ default: m.SecretaryGeneralModalsHub })));
const SecretaryOperationsModalsHub = lazy(() => import('./secretary/SecretaryOperationsModalsHub').then(m => ({ default: m.SecretaryOperationsModalsHub })));
const SecretaryFacilityLogModal = lazy(() => import('./secretary/SecretaryFacilityLogModal').then(m => ({ default: m.SecretaryFacilityLogModal })));
const SecretaryMobileNavigation = lazy(() => import('./secretary/SecretaryMobileNavigation').then(m => ({ default: m.SecretaryMobileNavigation })));
const SecretaryGroovelabTab = lazy(() => import('./secretary/tabs/SecretaryGroovelabTab').then(m => ({ default: m.SecretaryGroovelabTab })));
const SecretaryCampusTab = lazy(() => import('./secretary/tabs/SecretaryCampusTab').then(m => ({ default: m.SecretaryCampusTab })));
const SecretaryVerwaltungTab = lazy(() => import('./secretary/tabs/SecretaryVerwaltungTab').then(m => ({ default: m.SecretaryVerwaltungTab })));
import { AppleStyleTokenField } from './common/AppleStyleTokenField';
const SecretaryUserDetailModalsHub = lazy(() => import('./secretary/SecretaryUserDetailModalsHub').then(m => ({ default: m.SecretaryUserDetailModalsHub })));
import { useSecretarySchedules } from './secretary/hooks/useSecretarySchedules';
import { calculateSchoolYearDirectBilling, calculateTransitionEffectiveDate } from '../utils/epcGiroCode';
import { generateTariffReceiptPDF } from '../utils/tariffReceiptPdfGenerator';
import { computeSchoolDunningStatus, SchoolDunningStatus, getDunningVisualConfig } from '../domain/schoolDunningEngine';
import { 
  fetchSchoolRoster, 
  getTeacherRoster, 
  getTeacherStudentCount, 
  normalizeStudentKey, 
  isTestOrGenericStudent, 
  deduplicateRoster 
} from '../services/studentRosterService';
import { notesService, UserNote } from '../services/notesService';
import { formatCleanNoteContent } from './notes/notesConstants';
import { DEFAULT_FOKUS_LEVELS } from '../utils/studentProgressEngine';
import { generateStarterPin, generateSecureQrToken } from './secretary/utils/secretaryAuthUtils';
import { useSecretaryStaff } from './secretary/hooks/useSecretaryStaff';
import { useSecretaryStudents } from './secretary/hooks/useSecretaryStudents';

function checkTimeOverlap(t1Start: string, t1End: string, t2Start: string, t2End: string): boolean {
  if (!t1Start || !t1End || !t2Start || !t2End) return false;
  return t1Start < t2End && t2Start < t1End;
}
function formatInstrumentName(name: string): string {
  if (!name) return '';
  const mapping: Record<string, string> = {
    akustisches_klavier: 'Akustisches Klavier',
    ensemble_geeignet: 'Ensembles/Bands',
    ensembles_geeignet: 'Ensembles/Bands',
    e_piano: 'E-Piano',
    e_gitarre: 'E-Gitarre',
    akustische_gitarre: 'Akustische Gitarre',
    schlagzeug: 'Schlagzeug',
    piano: 'Piano',
    gitarre: 'Gitarre',
    gesang: 'Gesang',
    geige: 'Geige',
    querfloete: 'Querflöte',
    blockfloete: 'Blockflöte',
    saxophon: 'Saxophon',
    bass: 'Bass',
    keyboard: 'Keyboard',
    trompete: 'Trompete',
    blaeser: 'Bläser',
    tasteninstrumente: 'Tasteninstrumente',
    saiteninstrumente: 'Saiteninstrumente',
    blasinstrumente: 'Blasinstrumente',
    percussion: 'Percussion'
  };

  const key = name.toLowerCase().trim();
  if (mapping[key]) return mapping[key];

  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}



interface SystemAlert {
  id: string;
  schoolId: string;
  teacherId: string;
  type: string;
  message: string;
  createdAt: string;
  resolved: boolean;
  teacherName?: string;
}

interface BypassTeacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  instrument: string;
  maxStudents: number;
  ausweisNummer: string;
  teacherQrToken: string;
  studentCount?: number;
  contractEndsAt?: string | null;
  isCampusActive?: boolean;
  isGroovelabActive?: boolean;
  isActive?: boolean;
  role?: string;
  roles?: string[];
  isPinActivated?: boolean;
  ausfall_until?: string | null;
  preferred_room_ids?: string[];
}

interface GrooveLabCoach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  roles?: string[];
  instrument: string;
  isActive: boolean;
  isCampusActive?: boolean;
  isGroovelabActive?: boolean;
  ausweisNummer?: string;
  teacherQrToken?: string;
  isPinActivated?: boolean;
  studentCount?: number;
  contractEndsAt?: string | null;
  ausfall_until?: string | null;
  preferred_room_ids?: string[];
}

interface SecretaryBriefingData {
  openCapacityAlerts: number;
  inactiveTeachers: number;
  schedules: {
    draft: number;
    readyForReview: number;
    approved: number;
  };
  alerts: Array<{
    id: string;
    type: string;
    message: string;
    created_at: string;
  }>;
}

interface PendingSchedule {
  id: string;
  teacher_id: string;
  student_id: string;
  day_of_week: number;
  time_slot: string;
  status: string;
  room_id: string | null;
  teacher_name?: string;
  student_name?: string;
  room_name?: string;
}

// [EXTRACTED] Helpers (AvatarImage, getStationColor, StationNode, CoachesNode) moved to SecretaryGroovelabTab

function TeacherCard({ 
  teacher, 
  onEdit, 
  copiedTeacherId, 
  onCopyLink,
  isDark = false
}: { 
  teacher: any; 
  onEdit: (t: any) => void; 
  copiedTeacherId?: string | null;
  onCopyLink?: (t: any) => void;
  isDark?: boolean;
}) {
  const [hovered, setHovered] = React.useState(false);

  const name = formatTeacherFullName(teacher);
  const email = teacher.email || '';
  const instrument = teacher.instrument || 'Nicht festgelegt';
  const pin = teacher.ausweisNummer || teacher.ausweis_nummer || '';
  const isCampus = teacher.isCampusActive || teacher.is_campus_active;
  const isGroovelab = teacher.isGroovelabActive || teacher.is_groovelab_active;
  const isActive = teacher.isActive ?? teacher.is_active;
  const contractEndsAt = teacher.contractEndsAt || teacher.contract_ends_at || '';

  const isCopied = copiedTeacherId === teacher.id;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onEdit(teacher)}
      style={{
        padding: '24px',
        borderRadius: '24px',
        border: isDark 
          ? '1px solid #27272a' 
          : '1px solid #e2e8f0',
        background: isDark 
          ? (hovered ? '#27272a' : '#18181b') 
          : (hovered ? '#f1f5f9' : '#f8fafc'),
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered 
          ? (isDark ? '0 12px 24px -10px rgba(0, 0, 0, 0.5)' : '0 12px 24px -10px rgba(15, 23, 42, 0.08)') 
          : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      {/* Brand & Copy link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h4 style={{
            margin: 0,
            fontFamily: 'Urbanist, sans-serif',
            fontSize: '18px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: isDark ? '#ffffff' : '#0f172a'
          }}>
            {name}
          </h4>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: 400,
            color: isDark ? '#a1a1aa' : '#64748b',
            wordBreak: 'break-all'
          }}>
            {email}
          </span>
        </div>
        
        {onCopyLink && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyLink(teacher);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '12px',
              background: isDark ? '#27272a' : '#ffffff',
              border: isDark ? '1px solid #3f3f46' : '1px solid #e2e8f0',
              color: isDark ? '#f4f4f5' : '#0f172a',
              cursor: 'pointer',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 650,
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <Copy size={12} /> {isCopied ? 'Kopiert!' : 'Link kopieren'}
          </button>
        )}
      </div>

      {/* Details */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        borderTop: isDark ? '1px solid #27272a' : '1px solid #e2e8f0',
        paddingTop: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: isDark ? '#71717a' : '#64748b' }}>Fach/Instrument</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#ffffff' : '#0f172a' }}>{instrument}</span>
        </div>
        
        {pin && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: isDark ? '#71717a' : '#64748b' }}>Support-PIN</span>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#b45309' }}>{pin}</span>
          </div>
        )}
      </div>

      {/* Module Badges */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {isCampus && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#34a853',
            background: 'rgba(52, 168, 83, 0.08)',
            padding: '4px 10px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <GraduationCap size={12} style={{ color: '#34a853' }} />
            Campus
          </span>
        )}
        {isGroovelab && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#f59e0b',
            background: 'rgba(245, 158, 11, 0.08)',
            padding: '4px 10px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Music size={12} style={{ color: '#f59e0b' }} />
            Groovelab
          </span>
        )}
        {!isActive && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748b',
            background: 'rgba(100, 116, 139, 0.08)',
            padding: '4px 10px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Clock size={12} style={{ color: '#64748b' }} />
            Basis
          </span>
        )}
        {contractEndsAt && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#ef4444',
            background: 'rgba(239, 68, 68, 0.08)',
            padding: '4px 10px',
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Calendar size={12} style={{ color: '#ef4444' }} />
            Bis {new Date(contractEndsAt).toLocaleDateString('de-DE')}
          </span>
        )}
      </div>
    </div>
  );
}

interface SecretaryDashboardProps {
  schoolId: string;
  userId?: string;
  userRole?: string;
  userRoles?: string[];
  onLogout?: () => void;
  onRoleSwitched?: (newRole: string) => void;
  activePlatform?: string;
}

const getAlphabeticalColor = (name: string) => {
  const trimmed = (name || '').trim();
  if (trimmed.toLowerCase() === 'ohne zuweisung') {
    return {
      avatarBg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      avatarColor: '#475569'
    };
  }
  const hue = getAlphabeticalHue(trimmed);
  const avatarBg = `linear-gradient(135deg, hsl(${hue}, 85%, 94%) 0%, hsl(${hue}, 80%, 84%) 100%)`;
  const avatarColor = `hsl(${hue}, 90%, 25%)`;
  return { avatarBg, avatarColor };
};

const getFloorColor = (name: string) => {
  const trimmed = (name || '').trim();
  const normalized = trimmed.toLowerCase();
  
  // Check if it has a number or is EG/UG
  const hasNumber = /\d+/.test(normalized);
  const isEg = normalized.includes('eg') || normalized.includes('erdgeschoss');
  const isUg = normalized.includes('ug') || normalized.includes('untergeschoss') || normalized.includes('keller') || normalized.includes('-');
  
  if (hasNumber || isEg || isUg) {
    // Parse floor number N
    let N = 0;
    if (isEg) {
      N = 0;
    } else {
      const isNegative = isUg;
      const match = normalized.match(/\d+/);
      if (match) {
        const val = parseInt(match[0]);
        N = isNegative ? -val : val;
      } else {
        N = isNegative ? -1 : 0;
      }
    }
    
    // Clamp N to [-3, 8]
    const clampedN = Math.max(-3, Math.min(8, N));
    // Map [-3, 8] to index [0, 11]
    const mappedIndex = clampedN + 3;
    // Map [0, 11] to [65, 90] (A-Z)
    const clampedCode = 65 + Math.round((mappedIndex / 11) * 25);
    const hue = Math.round(((clampedCode - 65) / 25) * 360);
    const avatarBg = `linear-gradient(135deg, hsl(${hue}, 85%, 94%) 0%, hsl(${hue}, 80%, 84%) 100%)`;
    const avatarColor = `hsl(${hue}, 90%, 25%)`;
    return { avatarBg, avatarColor };
  }
  
  return getAlphabeticalColor(name);
};

// [EXTRACTED] AppleStyleTokenField moved to ./common/AppleStyleTokenField

const parseRoomName = (name: string) => {
  const trimmed = name.trim();
  const match = trimmed.match(/^(.*?)\s*(\d+)$/);
  if (match) {
    return {
      prefix: match[1].trim(),
      number: parseInt(match[2], 10)
    };
  }
  return {
    prefix: trimmed,
    number: null
  };
};

export function SecretaryDashboard({ schoolId, userId, userRole, userRoles, onLogout, onRoleSwitched, activePlatform }: SecretaryDashboardProps) {
  const { visible: showRealNames, toggleVisibility: toggleRealNames } = useRealNamesVisibility();

  const tourSteps: TourStep[] = useMemo(() => {
    return [
      {
        selector: 'tour-secretary-briefing',
        title: 'Willkommen in der Verwaltung',
        description: 'Dies ist die zentrale Übersicht für das Sekretariat. Hier laufen alle wichtigen Informationen aus dem Campus zusammen.'
      },
      {
        selector: 'tour-secretary-kpis',
        title: 'Tägliche KPIs',
        description: 'Auf einen Blick siehst du die aktuelle Raumauslastung, wie viele Schüler ihre Accounts aktiviert haben, ob es Terminkonflikte gibt und wie viele Lehrkräfte abwesend gemeldet sind.'
      },
      {
        selector: 'tour-secretary-bookings',
        title: 'Raumbuchungen Bestätigen',
        description: 'Lehrkräfte können vorläufige Raumbuchungen vornehmen. Diese landen hier in deiner Warteschlange (Queue) zur finalen Prüfung und Freigabe durch die Verwaltung.'
      }
    ];
  }, []);

  const { TourComponent, startTour } = usePremiumOnboardingTour({
    tourKey: `campus_secretary_tour_${userId}`,
    steps: tourSteps,
    platformTheme: 'admin'
  });
  const getSchoolNumericId = (id?: string | null): number => {
    if (!id || typeof id !== 'string') return 1;
    if (id === '74713df2-6176-4a41-a8cd-9fbebe34e9b8') return 1;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 98) + 2;
  };
  const schoolNumericId = getSchoolNumericId(schoolId);

  const [showAgb, setShowAgb] = useState<boolean>(false);
  const [showPrivacy, setShowPrivacy] = useState<boolean>(false);
  const [showDpoIdCardModal, setShowDpoIdCardModal] = useState<boolean>(false);
  const [showDpoPortalModal, setShowDpoPortalModal] = useState<boolean>(false);

  // Master pricing context for live platform-wide price updates
  const masterPricing = useMasterPricing();

  // Operator Billing Info States (Loaded from MasterAdmin Settings)
  const [operatorCompany, setOperatorCompany] = useState('Patrick Huber (Einzelunternehmer)');
  const [operatorContact, setOperatorContact] = useState('Patrick Huber');
  const [operatorStreet, setOperatorStreet] = useState('Karl-Fürstenberg-Str. 59');
  const [operatorZip, setOperatorZip] = useState('79618');
  const [operatorCity, setOperatorCity] = useState('Rheinfelden');
  const [operatorIban, setOperatorIban] = useState('DE89 3704 0044 0532 9482 11');
  const [operatorBic, setOperatorBic] = useState('WELADED1XYZ');
  const [currentSchoolProfile, setCurrentSchoolProfile] = useState<any>(null);
  const effectiveSchoolRates = masterPricing.getSchoolRates(currentSchoolProfile);
  const [masterRates, setMasterRates] = useState({
    campus: masterPricing.priceCampus,
    groovelab: masterPricing.priceGroovelab,
    kombi: masterPricing.priceKombi,
    teacher: masterPricing.priceTeacher,
    student: masterPricing.priceStudent
  });

  useEffect(() => {
    setMasterRates({
      campus: masterPricing.priceCampus,
      groovelab: masterPricing.priceGroovelab,
      kombi: masterPricing.priceKombi,
      teacher: masterPricing.priceTeacher,
      student: masterPricing.priceStudent
    });
  }, [masterPricing.priceCampus, masterPricing.priceGroovelab, masterPricing.priceKombi, masterPricing.priceTeacher, masterPricing.priceStudent]);

  useEffect(() => {
    const fetchOperatorBillingSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('master_billing_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        if (data) {
          if (data.company_name) setOperatorCompany(data.company_name);
          if (data.contact_person) setOperatorContact(data.contact_person);
          if (data.street) setOperatorStreet(data.street);
          if (data.zip_code) setOperatorZip(data.zip_code);
          if (data.city) setOperatorCity(data.city);
          if (data.iban) setOperatorIban(data.iban);
          if (data.bic) setOperatorBic(data.bic);
        }
      } catch (err) {
        console.error("Error fetching operator billing settings:", err);
      }
    };
    fetchOperatorBillingSettings();
  }, []);

  // Navigation
  const [activeTab, setActiveTab] = useState<'secretary' | 'campus' | 'groovelab'>(() => {
    const saved = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_active_workspace') || localStorage.getItem('groovelab_active_workspace')) : null;
    if (saved === 'campus' || saved === 'groovelab' || saved === 'secretary') return saved as any;
    return 'secretary';
  });
  const [secretarySubTab, setSecretarySubTab] = useState<'briefing' | 'employees' | 'licenses' | 'setup' | 'rooms' | 'equipment' | 'crisis' | 'audit' | 'duties' | 'announcements'>(() => {
    const saved = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_secretary_subtab') || localStorage.getItem('groovelab_secretary_subtab')) : null;
    const valid = ['briefing', 'employees', 'licenses', 'setup', 'rooms', 'equipment', 'crisis', 'audit', 'duties', 'announcements'];
    if (saved && valid.includes(saved)) return (saved === 'duties' ? 'announcements' : saved) as any;
    return 'briefing';
  });

  // 🛡️ Zero Data Remanence & Forensic Purge beim Sekretariats-Logout (DSGVO Art. 17 / Art. 32)
  const handleSecretaryLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('groovelab_secretary_subtab');
        sessionStorage.removeItem('groovelab_active_workspace');
        localStorage.removeItem('groovelab_secretary_subtab');
        localStorage.removeItem('groovelab_active_workspace');
        localStorage.removeItem('groovelab_school_overrides');
        localStorage.removeItem('campus_school_overrides');
        localStorage.removeItem('groovelab_school_profile');
      }
      await scrubSharedDeviceCache();
    } catch (e) {
      console.warn('[SecretaryDashboard] Logout scrubber note:', e);
    }
    if (onLogout) {
      onLogout();
    }
  };

  // 🎙️ Dynamic Multi-Layer Audio-Vault Calculator (Local-First + Cloud Reconciliation)
  const getEffectiveStorageUsedBytes = (profile: any): number => {
    let bytes = Number(profile?.storage_used_bytes || 0);

    try {
      if (typeof window !== 'undefined') {
        let localBytes = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;

          // 1. Homework audio notes: campus_homework_notes_${studentId}
          if (key.startsWith('campus_homework_notes_')) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const notes = JSON.parse(val);
                if (Array.isArray(notes)) {
                  notes.forEach((note: string) => {
                    if (typeof note === 'string' && (note.startsWith('AUDIO:') || note.startsWith('LOOP:'))) {
                      const parts = note.split('|');
                      const durSec = Number(parts[1] || 10);
                      localBytes += Math.max(120000, durSec * 32000);
                    }
                  });
                }
              }
            } catch {}
          }

          // 2. Junior student recordings: campus_junior_recordings_${studentId}
          if (key.startsWith('campus_junior_recordings_')) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const recs = JSON.parse(val);
                if (Array.isArray(recs)) {
                  recs.forEach((rec: any) => {
                    const dur = Number(rec?.duration || 10);
                    localBytes += Math.max(120000, dur * 32000);
                  });
                }
              }
            } catch {}
          }

          // 3. Audio biography takes: campus_audio_biography_${studentId}
          if (key.startsWith('campus_audio_biography_')) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const bio = JSON.parse(val);
                if (Array.isArray(bio)) {
                  bio.forEach((track: any) => {
                    const dur = Number(track?.duration || 30);
                    localBytes += Math.max(250000, dur * 32000);
                  });
                }
              }
            } catch {}
          }

          // 4. Raw loop tracks: groovelab_loop_tracks_
          if (key.startsWith('groovelab_loop_tracks_')) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const loops = JSON.parse(val);
                if (Array.isArray(loops)) {
                  loops.forEach((lp: any) => {
                    const dur = Number(lp?.duration || 15);
                    localBytes += Math.max(180000, dur * 32000);
                  });
                }
              }
            } catch {}
          }
        }
        bytes = Math.max(bytes, localBytes);
      }
    } catch {}

    return bytes;
  };

  // 🎙️ Live Audio-Tresor Storage & Quota Auto-Refresh (Strictly Multi-Tenant School-Scoped)
  useEffect(() => {
    if (currentSchoolProfile?.id) {
      const refreshStorageQuota = async () => {
        try {
          const schoolId = String(currentSchoolProfile.id);
          
          let usedBytes = 0;
          try {
            const { data: schData } = await supabase
              .from('schools')
              .select('id, name')
              .eq('id', schoolId)
              .maybeSingle();
          } catch (e) {}

          // 🎙️ MULTI-TENANT ISOLATED STORAGE SCANNER: Multi-layer aggregation (Cloud Bucket + Audio Notes + Local Caches)
          try {
            // 1. Fetch all user IDs (students, teachers, admins) belonging to this school
            const schoolUserIds = new Set<string>();
            try {
              const { data: schoolUsers } = await supabase
                .from('users')
                .select('id')
                .eq('school_id', schoolId);
              if (schoolUsers && schoolUsers.length > 0) {
                schoolUsers.forEach((u: any) => {
                  if (u?.id) schoolUserIds.add(String(u.id));
                });
              }
            } catch (uErr) {
              console.warn('[Storage Scan] Error fetching school users for storage scan:', uErr);
            }

            let schoolAggregatedBytes = 0;
            const subFolders = ['recordings', 'loops', 'audio_biography', 'audio'];

            // 2. Scan school-prefixed folders: schools/${schoolId}/${subFolder}
            for (const subFolder of subFolders) {
              try {
                const { data: files } = await supabase.storage
                  .from('campus-assets')
                  .list(`schools/${schoolId}/${subFolder}`, { limit: 1000 });
                if (files && files.length > 0) {
                  for (const file of files) {
                    const fileSize = Number(file.metadata?.size || 0);
                    if (fileSize > 0) {
                      schoolAggregatedBytes += fileSize;
                    }
                  }
                }
              } catch (folderErr) {}
            }

            // 3. Scan root folders in campus-assets: recordings, audio_biography, audio, loops
            // Matches files where filename contains any student/teacher ID of this school or schoolId
            for (const rootFolder of subFolders) {
              try {
                const { data: rootFiles } = await supabase.storage
                  .from('campus-assets')
                  .list(rootFolder, { limit: 1000 });
                if (rootFiles && rootFiles.length > 0) {
                  for (const file of rootFiles) {
                    const fileSize = Number(file.metadata?.size || 0);
                    if (fileSize <= 0) continue;

                    const fileName = file.name || '';
                    let belongsToSchool = false;
                    if (fileName.includes(schoolId)) {
                      belongsToSchool = true;
                    } else if (schoolUserIds.size > 0) {
                      for (const uid of schoolUserIds) {
                        if (fileName.includes(uid)) {
                          belongsToSchool = true;
                          break;
                        }
                      }
                    } else {
                      // Fallback if user list query was restricted: treat root audio as active tenant audio
                      belongsToSchool = true;
                    }

                    if (belongsToSchool) {
                      schoolAggregatedBytes += fileSize;
                    }
                  }
                }
              } catch (rootErr) {}
            }

            // 4. Scan student audio recordings from localStorage
            let studentAudioBytes = 0;
            try {
              if (typeof window !== 'undefined') {
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (!key) continue;

                  // 1. Homework audio notes: campus_homework_notes_${studentId}
                  if (key.startsWith('campus_homework_notes_')) {
                    try {
                      const val = localStorage.getItem(key);
                      if (val) {
                        const notes = JSON.parse(val);
                        if (Array.isArray(notes)) {
                          notes.forEach((note: string) => {
                            if (typeof note === 'string' && (note.startsWith('AUDIO:') || note.startsWith('LOOP:'))) {
                              const parts = note.split('|');
                              const durSec = Number(parts[1] || 10);
                              const estimatedTakeBytes = Math.max(120000, durSec * 32000);
                              studentAudioBytes += estimatedTakeBytes;
                            }
                          });
                        }
                      }
                    } catch (e) {}
                  }

                  // 2. Junior student recordings: campus_junior_recordings_${studentId}
                  if (key.startsWith('campus_junior_recordings_')) {
                    try {
                      const val = localStorage.getItem(key);
                      if (val) {
                        const recs = JSON.parse(val);
                        if (Array.isArray(recs)) {
                          recs.forEach((rec: any) => {
                            const dur = Number(rec?.duration || 10);
                            studentAudioBytes += Math.max(120000, dur * 32000);
                          });
                        }
                      }
                    } catch (e) {}
                  }

                  // 3. Audio biography takes: campus_audio_biography_${studentId}
                  if (key.startsWith('campus_audio_biography_')) {
                    try {
                      const val = localStorage.getItem(key);
                      if (val) {
                        const bio = JSON.parse(val);
                        if (Array.isArray(bio)) {
                          bio.forEach((track: any) => {
                            const dur = Number(track?.duration || 30);
                            studentAudioBytes += Math.max(250000, dur * 32000);
                          });
                        }
                      }
                    } catch (e) {}
                  }
                }
              }
            } catch (scanLocalErr) {
              console.warn('[Storage Scan] Local audio aggregator note:', scanLocalErr);
            }

            const maxDiscoveredBytes = Math.max(schoolAggregatedBytes, studentAudioBytes);
            if (maxDiscoveredBytes > 0) {
              usedBytes = maxDiscoveredBytes;
            }

            // Sync local overrides cache cleanly
            try {
              const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
              const overrides = JSON.parse(overridesStr);
              if (!overrides[schoolId]) overrides[schoolId] = {};
              overrides[schoolId].storage_used_bytes = usedBytes;
              localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
              localStorage.setItem(`groovelab_storage_used_bytes_${schoolId}`, String(usedBytes));
              localStorage.setItem('groovelab_storage_used_bytes', String(usedBytes));
            } catch (e) {}

            // Safe update attempt to Supabase
            try {
              await supabase
                .from('schools')
                .update({ storage_used_bytes: usedBytes })
                .eq('id', schoolId);
            } catch (upErr) {}
          } catch (scanErr) {
            console.warn('[Storage Scan] School quota sync note:', scanErr);
          }

          setCurrentSchoolProfile((prev: any) => prev ? ({ ...prev, storage_used_bytes: usedBytes }) : prev);
        } catch (err) {
          console.warn('[Storage] Auto-refresh quota note:', err);
        }
      };
      refreshStorageQuota();
    }
  }, [currentSchoolProfile?.id]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('All');
  const [campusSubTab, setCampusSubTab] = useState<'briefing' | 'subjects' | 'onboarding' | 'students' | 'events' | 'schedules' | 'status' | 'rooms'>(() => {
    const saved = typeof window !== 'undefined' ? (sessionStorage.getItem('groovelab_campus_subtab') || localStorage.getItem('groovelab_campus_subtab')) : null;
    const valid = ['briefing', 'subjects', 'onboarding', 'students', 'events', 'schedules', 'status', 'rooms'];
    if (saved && valid.includes(saved)) return saved as any;
    return 'briefing';
  });
  // Administrative Mitteilungen & Informationen
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState<boolean>(false);
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementDescription, setNewAnnouncementDescription] = useState('');
  const [newAnnouncementType, setNewAnnouncementType] = useState<'todo' | 'questionnaire'>('todo');
  const [newAnnouncementQuestions, setNewAnnouncementQuestions] = useState<any[]>([]);
  const [newAnnouncementQuestionType, setNewAnnouncementQuestionType] = useState<'text' | 'choice' | 'boolean'>('text');
  const [newAnnouncementQuestionOptions, setNewAnnouncementQuestionOptions] = useState<string>('Ja, Nein, Vielleicht');
  const [newAnnouncementPriority, setNewAnnouncementPriority] = useState<'standard' | 'critical'>('standard');
  const [newAnnouncementIsAnonymous, setNewAnnouncementIsAnonymous] = useState<boolean>(false);
  const [newAnnouncementTargetType, setNewAnnouncementTargetType] = useState<'all' | 'group' | 'individual'>('all');
  const [newAnnouncementTargetGroup, setNewAnnouncementTargetGroup] = useState('guitar');
  const [newAnnouncementTargetTeacherId, setNewAnnouncementTargetTeacherId] = useState('');
  const [newAnnouncementDueDate, setNewAnnouncementDueDate] = useState('');
  const [newAnnouncementRecurrence, setNewAnnouncementRecurrence] = useState<'none' | 'monthly' | 'half_yearly'>('none');
  const [newAnnouncementAttachmentUrl, setNewAnnouncementAttachmentUrl] = useState('');
  const [isUploadingAnnouncementAttachment, setIsUploadingAnnouncementAttachment] = useState(false);
  const [selectedAnnouncementForStats, setSelectedAnnouncementForStats] = useState<any>(null);
  const [statsSearchQuery, setStatsSearchQuery] = useState('');
  const [statsStatusFilter, setStatsStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [statsModalTab, setStatsModalTab] = useState<'status' | 'qa'>('status');
  const [announcementResponsesList, setAnnouncementResponsesList] = useState<any[]>([]);
  const [newAnnouncementQuestionInput, setNewAnnouncementQuestionInput] = useState('');
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [expandedResponseIds, setExpandedResponseIds] = useState<Record<string, boolean>>({});

  const [enabledCampusSubjects, setEnabledCampusSubjects] = useState<boolean>(true);
  const [enabledCampusRooms, setEnabledCampusRooms] = useState<boolean>(true);
  const [enabledCampusEvents, setEnabledCampusEvents] = useState<boolean>(true);
  const [enabledCampusSchedules, setEnabledCampusSchedules] = useState<boolean>(true);
  const [enabledCalendarWidget, setEnabledCalendarWidget] = useState<boolean>(true);
  const [enabledQrLogin, setEnabledQrLogin] = useState<boolean>(true);

  const handleToggleSetting = async (key: string, value: boolean, setter: (val: boolean) => void) => {
    setter(value);
    try {
      const currentOp = openingHours || {};
      const updatedOp = { ...currentOp, [key]: value };
      setOpeningHours(updatedOp);
      if (schoolId) {
        await supabase.from('schools').update({ opening_hours: updatedOp }).eq('id', schoolId);
      }
    } catch (err) {
      console.error('Error saving setting:', err);
    }
  };

  const handleSaveSettingValue = async (key: string, value: any, setter?: (val: any) => void) => {
    if (setter) setter(value);
    try {
      const currentOp = openingHours || {};
      const updatedOp = { ...currentOp, [key]: value };
      setOpeningHours(updatedOp);
      if (schoolId) {
        await supabase.from('schools').update({ opening_hours: updatedOp }).eq('id', schoolId);
      }
    } catch (err) {
      console.error('Error saving setting value:', err);
    }
  };

  const handleToggleAutoClean = async (nextVal: boolean) => {
    setAutoDeleteExpiredUsers(nextVal);
    setInitialSettings((prev: any) => prev ? ({ ...prev, autoDeleteExpiredUsers: nextVal }) : prev);
    try {
      const currentOp = openingHours || {};
      const updatedOp = { ...currentOp, auto_delete_expired_users: nextVal };
      setOpeningHours(updatedOp);
      
      try {
        const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
        const overrides = JSON.parse(overridesStr);
        if (schoolId) {
          overrides[schoolId] = {
            ...(overrides[schoolId] || {}),
            auto_delete_expired_users: nextVal,
            opening_hours: updatedOp
          };
          localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
        }
      } catch (e) {}

      if (schoolId) {
        const { error } = await supabase
          .from('schools')
          .update({
            auto_delete_expired_users: nextVal,
            opening_hours: updatedOp
          })
          .eq('id', schoolId);
        
        if (error) {
          await supabase
            .from('schools')
            .update({
              opening_hours: updatedOp
            })
            .eq('id', schoolId);
        }
      }
    } catch (err) {
      console.error('[SecretarySettings] Error toggling auto-clean:', err);
    }
  };

  const handleUpdateSchoolYear = async (newMonth: number, newDay: number) => {
    setSchoolYearStartMonth(newMonth);
    setSchoolYearStartDay(newDay);
    setInitialSettings((prev: any) => prev ? ({ ...prev, schoolYearStartMonth: newMonth, schoolYearStartDay: newDay }) : prev);

    try {
      const currentOp = openingHours || {};
      const updatedOp = {
        ...currentOp,
        school_year_start_month: newMonth,
        school_year_start_day: newDay,
        auto_delete_expired_users: autoDeleteExpiredUsers
      };
      setOpeningHours(updatedOp);

      try {
        const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
        const overrides = JSON.parse(overridesStr);
        if (schoolId) {
          overrides[schoolId] = {
            ...(overrides[schoolId] || {}),
            school_year_start_month: newMonth,
            school_year_start_day: newDay,
            opening_hours: updatedOp
          };
          localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
        }
      } catch (e) {}

      if (schoolId) {
        const { error } = await supabase
          .from('schools')
          .update({
            school_year_start_month: newMonth,
            school_year_start_day: newDay,
            opening_hours: updatedOp
          })
          .eq('id', schoolId);

        if (error) {
          await supabase
            .from('schools')
            .update({
              opening_hours: updatedOp
            })
            .eq('id', schoolId);
        }
      }
    } catch (err) {
      console.error('[SecretarySettings] Error updating school year start:', err);
    }
  };
  const [schedulesRoomsViewMode, setSchedulesRoomsViewMode] = useState<'designer' | 'live'>('designer');
  const [roomsSubView, setRoomsSubView] = useState<'overview' | 'plan' | 'settings'>('overview');
  const [liveViewDay, setLiveViewDay] = useState<number>(1);
  const [showAdHocBooking, setShowAdHocBooking] = useState<boolean>(false);
  const [adHocRoomId, setAdHocRoomId] = useState<string | null>(null);
  const [adHocTeacherId, setAdHocTeacherId] = useState<string>('');
  const [adHocStudentName, setAdHocStudentName] = useState<string>('');
  const [adHocStartTime, setAdHocStartTime] = useState<string>('14:00');
  const [adHocDuration, setAdHocDuration] = useState<number>(45);
  const [groovelabSubTab, setGroovelabSubTab] = useState<'live' | 'students' | 'coaches' | 'kiosk' | 'settings'>('live');
  const [teachersManageStudents, setTeachersManageStudents] = useState<boolean>(false);
  const [teachersManageTeachers, setTeachersManageTeachers] = useState<boolean>(false);
  const [campusTeachersManageStudents, setCampusTeachersManageStudents] = useState<boolean>(false);
  const [campusTeachersManageTeachers, setCampusTeachersManageTeachers] = useState<boolean>(false);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [realtimeToast, setRealtimeToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [liveSearchQuery, setLiveSearchQuery] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const isGhost = userId === 'master-support-id' || sessionStorage.getItem('groovelab_support_ghost') === 'true';
      if (isGhost) {
        const ghostSchoolName = sessionStorage.getItem('groovelab_ghost_school_name') || 'Musikschule';
        return {
          id: 'master-support-id',
          first_name: `${ghostSchoolName} Support`,
          last_name: '',
          role: 'admin',
          photo_url: '/campus_login_hero.png',
          is_ghost_mode: true
        };
      }
    }
    return null;
  });

  // Biometrics & Passkeys Settings States
  const [biometricsStatus, setBiometricsStatus] = useState<'idle' | 'registering' | 'verifying' | 'success' | 'error'>('idle');
  const [biometricsMessage, setBiometricsMessage] = useState<string>('');
  const [localPasskeyProfiles, setLocalPasskeyProfiles] = useState<BiometricVaultProfile[]>(() => getStoredBiometricProfiles());
  const [copiedSettingsPin, setCopiedSettingsPin] = useState(false);
  const [copiedSettingsLink, setCopiedSettingsLink] = useState(false);

  const isCurrentDevicePasskeyActive = useMemo(() => {
    if (!currentUserProfile?.id) return false;
    return localPasskeyProfiles.some(p => p.userId === currentUserProfile.id);
  }, [localPasskeyProfiles, currentUserProfile?.id]);

  const handleEnrollBiometrics = async () => {
    if (!currentUserProfile) return;
    setBiometricsStatus('registering');
    setBiometricsMessage('');
    try {
      if (!isWebAuthnSupported()) {
        throw new Error('Biometrisches Anmelden (Touch ID / Face ID) wird von diesem Browser/Gerät nicht unterstützt.');
      }
      const email = currentUserProfile.email || `${currentUserProfile.id}@campus-groovelab.de`;
      const profile = await registerUserBiometrics(
        email,
        currentUserProfile.id,
        currentUserProfile.first_name,
        currentUserProfile.last_name || '',
        currentUserProfile.role || 'admin',
        currentUserProfile.id,
        null,
        '/campus_login_hero.png',
        schoolName || 'Musikschule'
      );

      await supabase.from('user_credentials').insert({
        user_id: currentUserProfile.id,
        credential_id: profile.credentialId,
        public_key: JSON.stringify({ registered: true, device: navigator.userAgent }),
        device_name: navigator.userAgent.includes('Mac') ? 'Mac Touch ID' : 'WebAuthn Device'
      });

      setLocalPasskeyProfiles(getStoredBiometricProfiles());
      setBiometricsStatus('success');
      setBiometricsMessage('Touch ID / Face ID wurde erfolgreich für dieses Gerät eingerichtet!');
      setTimeout(() => setBiometricsStatus('idle'), 4000);
    } catch (err: any) {
      console.error('Biometrics enrollment failed:', err);
      setBiometricsStatus('error');
      setBiometricsMessage(err.message || 'Die Einrichtung wurde abgebrochen oder ist fehlgeschlagen.');
    }
  };

  const handleTestBiometrics = async () => {
    if (!currentUserProfile) return;
    setBiometricsStatus('verifying');
    setBiometricsMessage('');
    try {
      await authenticateUserBiometrics(currentUserProfile.id);
      setBiometricsStatus('success');
      setBiometricsMessage('✓ Authentifizierung erfolgreich! Touch ID / Face ID funktioniert einwandfrei.');
      setTimeout(() => setBiometricsStatus('idle'), 4000);
    } catch (err: any) {
      console.error('Biometrics verification failed:', err);
      setBiometricsStatus('error');
      setBiometricsMessage(err.message || 'Die Verifikation ist fehlgeschlagen oder wurde abgebrochen.');
    }
  };

  const handleRemoveBiometrics = () => {
    if (!currentUserProfile?.id) return;
    const confirm = window.confirm('Möchtest du den Touch ID / Face ID Passkey von diesem Gerät entfernen?');
    if (!confirm) return;
    removeBiometricProfile(currentUserProfile.id);
    setLocalPasskeyProfiles(getStoredBiometricProfiles());
    setBiometricsStatus('success');
    setBiometricsMessage('Passkey wurde von diesem Gerät entfernt.');
    setTimeout(() => setBiometricsStatus('idle'), 3000);
  };

  const [tickets, setTickets] = useState<any[]>([]);
  const [roomIssues, setRoomIssues] = useState<UserNote[]>([]);
  const [schoolEvents, setSchoolEvents] = useState<any[]>([]);
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);
  const [showLogbookModal, setShowLogbookModal] = useState<boolean>(false);
  const [showFacilityLogModal, setShowFacilityLogModal] = useState<boolean>(false);

  const handleResolveRoomIssue = async (issueId: string) => {
    await notesService.resolveRoomIssue(issueId, 'secretary', schoolId);
    setRoomIssues(prev => prev.map(n => n.id === issueId ? { ...n, is_completed: true, is_acknowledged: true, acknowledged_at: new Date().toISOString(), resolved_by: 'secretary' } : n));
  };

  const handleReopenRoomIssue = async (issueId: string) => {
    await notesService.reopenRoomIssue(issueId, schoolId);
    setRoomIssues(prev => prev.map(n => n.id === issueId ? { ...n, is_completed: false, is_acknowledged: false, acknowledged_at: null, resolved_by: null } : n));
  };
  const [logbookBookings, setLogbookBookings] = useState<any[]>([]);
  const [editingLogbookBookingId, setEditingLogbookBookingId] = useState<string | null>(null);
  const [editBookingDate, setEditBookingDate] = useState<string>('');
  const [editBookingStartTime, setEditBookingStartTime] = useState<string>('');
  const [editBookingEndTime, setEditBookingEndTime] = useState<string>('');
  const [editBookingTitle, setEditBookingTitle] = useState<string>('');
  const [editBookingRoomId, setEditBookingRoomId] = useState<string>('');
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventDesc, setNewEventDesc] = useState<string>('');
  const [newEventTarget, setNewEventTarget] = useState<'all' | 'students' | 'teachers'>('all');
  const [newEventCategory, setNewEventCategory] = useState<'general' | 'announcement' | 'event' | 'holidays'>('general');
  const [newEventIsEmergency, setNewEventIsEmergency] = useState<boolean>(false);
  const [newEventPublishedAt, setNewEventPublishedAt] = useState<string>('');
  const [newEventExpiresAt, setNewEventExpiresAt] = useState<string>('');
  const [newEventAttachmentUrl, setNewEventAttachmentUrl] = useState<string>('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);
  const [isAddingCustomEq, setIsAddingCustomEq] = useState<boolean>(false);
  const [customEqInput, setCustomEqInput] = useState<string>('');
  const [selectedCrisisTeacherId, setSelectedCrisisTeacherId] = useState<string | null>(null);
  const [crisisTabMode, setCrisisTabMode] = useState<'live' | 'history'>('live');
  const [selectedArchiveLog, setSelectedArchiveLog] = useState<any | null>(null);
  const [expandedLiveDayStr, setExpandedLiveDayStr] = useState<string | null>(null);
  const [activeContextMenu, setActiveContextMenu] = useState<{ student: any; top: number; right: number } | null>(null);
  const [copiedSchoolLink, setCopiedSchoolLink] = useState<boolean>(false);
  const [copiedKioskLink, setCopiedKioskLink] = useState<boolean>(false);
  const [showOwnQrModal, setShowOwnQrModal] = useState<boolean>(false);
  const [qrModalUser, setQrModalUser] = useState<any | null>(null);
  const [copiedQrLink, setCopiedQrLink] = useState<boolean>(false);

  // Live Real-Time Sync for Room Issues & Facility Defects across tabs and devices
  useEffect(() => {
    if (!schoolId) return;
    const handleSync = async () => {
      try {
        const fetchedIssues = await notesService.fetchSchoolRoomIssues(schoolId);
        setRoomIssues(fetchedIssues);
      } catch (err) {
        console.warn('Real-time room issues sync notice:', err);
      }
    };

    const unsubscribe = notesService.onSync(handleSync);
    const unsubscribeRealtime = notesService.subscribeSchoolRealtime(schoolId, handleSync);

    return () => {
      unsubscribe();
      unsubscribeRealtime();
    };
  }, [schoolId]);


  // Visual Live Lab states & refs
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [selectedCoachProfile, setSelectedCoachProfile] = useState<any>(null);
  const [containerWidth, setContainerWidth] = useState(1000);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const [mobileSecretaryDrawerOpen, setMobileSecretaryDrawerOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.addEventListener('groovelab_orientation_changed', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('groovelab_orientation_changed', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!activeContextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.student-context-menu')) {
        setActiveContextMenu(null);
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [activeContextMenu]);

  // Sofortiges Laden des eigenen Profils – unabhängig vom langen fetchDashboardData
  useEffect(() => {
    if (!userId) return;
    const loadOwnProfile = async () => {
      if (userId === 'master-support-id' || (typeof window !== 'undefined' && sessionStorage.getItem('groovelab_support_ghost') === 'true')) {
        const ghostSchoolName = sessionStorage.getItem('groovelab_ghost_school_name') || 'Musikschule';
        setCurrentUserProfile({
          id: 'master-support-id',
          first_name: `${ghostSchoolName} Support`,
          last_name: '',
          role: 'admin',
          photo_url: '/campus_login_hero.png',
          is_ghost_mode: true
        });
        return;
      }
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, nickname, photo_url, role, roles, email, instrument, qr_token, teacher_qr_token')
        .eq('id', userId)
        .single();
      if (data) setCurrentUserProfile(data);
    };
    loadOwnProfile();
  }, [userId]);

  // Persist navigation tabs and subtabs on change
  useEffect(() => {
    sessionStorage.setItem('groovelab_active_workspace', activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem('groovelab_secretary_subtab', secretarySubTab);
    localStorage.setItem('groovelab_secretary_subtab', secretarySubTab);
  }, [secretarySubTab]);

  useEffect(() => {
    sessionStorage.setItem('groovelab_campus_subtab', campusSubTab);
    localStorage.setItem('groovelab_campus_subtab', campusSubTab);
  }, [campusSubTab]);

  useEffect(() => {
    const migrateLocalStorageToSupabase = async () => {
      try {
        const migratedKey = `groovelab_db_migration_done_${schoolId}`;
        if (localStorage.getItem(migratedKey)) return;
        
        const { data: dbRooms } = await supabase.from('rooms').select('*').eq('school_id', schoolId);
        if (!dbRooms || dbRooms.length === 0) return;
        
        const floorMap = JSON.parse(localStorage.getItem(`groovelab_room_floor_mappings_${schoolId}`) || '{}');
        const instrumentsMap = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
        const unsuitableMap = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
        const sonstigesMap = JSON.parse(localStorage.getItem(`groovelab_room_sonstiges_mappings_${schoolId}`) || '{}');
        
        let migrationCount = 0;
        for (const rm of dbRooms) {
          const localFloor = floorMap[rm.id];
          const localInstruments = instrumentsMap[rm.id];
          const localUnsuitable = unsuitableMap[rm.id];
          const localSonstiges = sonstigesMap[rm.id];
          
          if (localFloor || localInstruments || localUnsuitable || localSonstiges) {
            const updatePayload: any = {};
            if (localFloor) updatePayload.floor = localFloor;
            if (localInstruments && localInstruments.length > 0) updatePayload.room_instruments = localInstruments;
            if (localUnsuitable && localUnsuitable.length > 0) updatePayload.unsuitable_instruments = localUnsuitable;
            if (localSonstiges) updatePayload.sonstiges = localSonstiges;
            
            if (Object.keys(updatePayload).length > 0) {
              const { error } = await supabase.from('rooms').update(updatePayload).eq('id', rm.id);
              if (!error) migrationCount++;
            }
          }
        }
        
        if (migrationCount > 0) {
          console.log(`Successfully migrated ${migrationCount} rooms from localStorage to Supabase.`);
        }
        localStorage.setItem(migratedKey, 'true');
      } catch (err) {
        console.error("Local storage to Supabase migration error:", err);
      }
    };
    
    if (schoolId) {
      migrateLocalStorageToSupabase();
    }
  }, [schoolId]);

  const observerRef = React.useRef<ResizeObserver | null>(null);
  const containerRef = React.useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width || 1000);
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  const handleResetTeacherPin = async (teacherId: string) => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    if (!confirm(`Soll der PIN für diese Lehrkraft wirklich neu generiert werden? (Neuer PIN: ${newPin})`)) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          ausweis_nummer: newPin,
          is_pin_activated: false,
          personal_pin: null
        })
        .eq('id', teacherId);

      if (error) throw error;
      alert(`PIN wurde erfolgreich auf ${newPin} geändert.`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleUpdateTeacher = async (updatedData: any) => {
    try {
      const teacherPayload = {
        first_name: updatedData.firstName,
        last_name: updatedData.lastName,
        email: (updatedData.email && updatedData.email.trim()) ? updatedData.email.trim() : null,
        instrument: updatedData.instrument,
        required_equipment: updatedData.requiredEquipment || [],
        ausweis_nummer: updatedData.ausweisNummer,
        is_campus_active: updatedData.isCampusActive,
        is_groovelab_active: updatedData.isGroovelabActive,
        is_active: updatedData.isActive,
        role: updatedData.role,
        contract_ends_at: updatedData.contractEndsAt || null
      };

      const { error: rawErr } = await supabase
        .from('users')
        .update(teacherPayload)
        .eq('id', updatedData.id);

      try {
        await supabase.from('users').update(teacherPayload).eq('id', updatedData.id);
      } catch (e) {}

      if (rawErr) throw rawErr;
      setManageTeacher(null);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Aktualisieren: ' + err.message);
    }
  };

  const [holidayXpActive, setHolidayXpActive] = useState<boolean>(() => {
    return localStorage.getItem(`groovelab_holiday_xp_active_${schoolId}`) === 'true';
  });
  const [bulkTxtInput, setBulkTxtInput] = useState<string>('');
  const [selectedTeacherForOverride, setSelectedTeacherForOverride] = useState<any>(null);
  const [newPasswordOverride, setNewPasswordOverride] = useState<string>('');
  const [newRoleOverride, setNewRoleOverride] = useState<string>('');
  const [overrideFavRoom1, setOverrideFavRoom1] = useState<string>('');
  const [overrideFavRoom2, setOverrideFavRoom2] = useState<string>('');

  // Rooms and Stations States for Live Lab
  const [rooms, setRooms] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [zoomFactor, setZoomFactor] = useState<number>(1.0);

  // Zoom logic matching TeacherDashboard
  useEffect(() => {
    if (selectedRoomId && userId) {
      const savedZoom = localStorage.getItem(`groovelab_room_zoom_${userId}_${selectedRoomId}`);
      if (savedZoom) {
        const parsed = parseFloat(savedZoom);
        if (!isNaN(parsed)) {
          setZoomFactor(parsed);
          return;
        }
      }
    }
    setZoomFactor(1.0);
  }, [selectedRoomId, userId]);

  const handleZoomChange = (value: number) => {
    setZoomFactor(value);
    if (selectedRoomId && userId) {
      localStorage.setItem(`groovelab_room_zoom_${userId}_${selectedRoomId}`, value.toString());
    }
  };

  // Trial & Linking States
  const [bands, setBands] = useState<any[]>([]);
  const [showTrialLogModal, setShowTrialLogModal] = useState(false);
  const [trialLogs, setTrialLogs] = useState<any[]>([]);
  const [trialLogsLoading, setTrialLogsLoading] = useState(false);
  const [selectedCampusStudentId, setSelectedCampusStudentId] = useState<string>('');
  const [selectedGroovelabStudentId, setSelectedGroovelabStudentId] = useState<string>('');
  const [linkingInProgress, setLinkingInProgress] = useState<boolean>(false);

  // Overhauled Room Board States
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [buildings, setBuildings] = useState<any[]>([]);

  // Guidance Modals
  const [showGuidanceModal, setShowGuidanceModal] = useState<boolean>(false);
  const [showParentInfoSheetModal, setShowParentInfoSheetModal] = useState<boolean>(false);
  const [guidanceInitialTab, setGuidanceInitialTab] = useState<'teacher' | 'parent'>('teacher');

  const [userQuota, setUserQuota] = useState<number>(150);
  const [activeUserQuota, setActiveUserQuota] = useState<number>(150);
  const [pendingUserQuota, setPendingUserQuota] = useState<number | null>(null);
  const [showDualRoleNotice, setShowDualRoleNotice] = useState<boolean>(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('groovelab_dual_role_switched_notice') === 'true';
  });

  // School Data & Subscription
  const [isAvvSigned, setIsAvvSigned] = useState<boolean>(true);
  const [showAvvModal, setShowAvvModal] = useState<boolean>(false);
  const [schoolName, setSchoolName] = useState<string>('');
  const [schoolYearStartMonth, setSchoolYearStartMonth] = useState<number>(9);
  const [schoolYearStartDay, setSchoolYearStartDay] = useState<number>(1);
  const [autoDeleteExpiredUsers, setAutoDeleteExpiredUsers] = useState<boolean>(false);
  const [schoolSubdomain, setSchoolSubdomain] = useState<string>('');
  const [openingHours, setOpeningHours] = useState<any>(null);
  const [schoolZipCode, setSchoolZipCode] = useState<string>('');
  const [schoolCity, setSchoolCity] = useState<string>('');
  const [schoolStreet, setSchoolStreet] = useState<string>('');
  const [schoolHouseNumber, setSchoolHouseNumber] = useState<string>('');
  const [schoolPhoneNumber, setSchoolPhoneNumber] = useState<string>('');
  const [schoolEmail, setSchoolEmail] = useState<string>('');
  const [absenceEmail, setAbsenceEmail] = useState<string>('');
  const [editColor, setEditColor] = useState<string>('#1a73e8'); // Google Blue
  const [hasCampusSub, setHasCampusSub] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(`hasCampusSub_${schoolId}`);
    if (stored !== null) return stored === 'true';
    const booked = localStorage.getItem(`isBillingBooked_${schoolId}`) === 'true';
    return booked ? true : false;
  });
  const [hasGroovelabSub, setHasGroovelabSub] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(`hasGroovelabSub_${schoolId}`);
    if (stored !== null) return stored === 'true';
    const booked = localStorage.getItem(`isBillingBooked_${schoolId}`) === 'true';
    return booked ? true : false;
  });
  const [campusActivatedThisMonth, setCampusActivatedThisMonth] = useState<boolean>(false);
  const [groovelabActivatedThisMonth, setGroovelabActivatedThisMonth] = useState<boolean>(false);
  const [studentBillingOption, setStudentBillingOption] = useState<string>('option2');
  const [isBillingBooked, setIsBillingBooked] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem(`isBillingBooked_${schoolId}`) === 'true';
  });
  const [bookedExtraUsers, setBookedExtraUsers] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const val = localStorage.getItem(`bookedExtraUsers_${schoolId}`);
    let baseVal = val ? parseInt(val, 10) : 0;
    const hasUnbooked = localStorage.getItem(`unbooked_52_temp_${schoolId}`);
    if (!hasUnbooked) {
      baseVal = Math.max(0, baseVal - 52);
      localStorage.setItem(`bookedExtraUsers_${schoolId}`, baseVal.toString());
      localStorage.setItem(`unbooked_52_temp_${schoolId}`, 'true');
    }
    return baseVal;
  });
  const [extraUsersSliderVal, setExtraUsersSliderVal] = useState<number>(0);
  const [extraBillingOption, setExtraBillingOption] = useState<string>('option1');
  const [nextBillingOption, setNextBillingOption] = useState<string>(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem(`nextBillingOption_${schoolId}`) || '') : '';
  });
  const [nextBillingOptionEffectiveAt, setNextBillingOptionEffectiveAt] = useState<string>(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem(`nextBillingOptionEffectiveAt_${schoolId}`) || '') : '';
  });
  const [showChangeTariffModal, setShowChangeTariffModal] = useState<boolean>(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [checkoutStep, setCheckoutStep] = useState<number>(1);
  const [billingPayer, setBillingPayer] = useState<'school' | 'student'>('school');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [customUmlageAmount, setCustomUmlageAmount] = useState<number>(0.49);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [couponCode, setCouponCode] = useState<string>('');
  const [isCouponApplied, setIsCouponApplied] = useState<boolean>(false);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [showCouponInput, setShowCouponInput] = useState<boolean>(false);
  const [hasCustomBillingAddress, setHasCustomBillingAddress] = useState<boolean>(false);
  const [customBillingName, setCustomBillingName] = useState<string>('');
  const [customBillingStreet, setCustomBillingStreet] = useState<string>('');
  const [customBillingZip, setCustomBillingZip] = useState<string>('');
  const [customBillingCity, setCustomBillingCity] = useState<string>('');
  const [customBillingEmail, setCustomBillingEmail] = useState<string>('');
  const [customBillingLeitwegId, setCustomBillingLeitwegId] = useState<string>(() => currentSchoolProfile?.leitweg_id || '');
  const [hasCustomActivationBillingAddress, setHasCustomActivationBillingAddress] = useState<boolean>(false);
  const [customActivationBillingName, setCustomActivationBillingName] = useState<string>('');
  const [customActivationBillingStreet, setCustomActivationBillingStreet] = useState<string>('');
  const [customActivationBillingZip, setCustomActivationBillingZip] = useState<string>('');
  const [customActivationBillingCity, setCustomActivationBillingCity] = useState<string>('');
  const [customActivationBillingEmail, setCustomActivationBillingEmail] = useState<string>('');
  const [selectedStorageAddonGb, setSelectedStorageAddonGb] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem(`groovelab_storage_addon_gb_${schoolId}`) || localStorage.getItem('groovelab_storage_addon_gb') || 0);
  });
  const [selectedStorageAddonFee, setSelectedStorageAddonFee] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const gb = Number(localStorage.getItem(`groovelab_storage_addon_gb_${schoolId}`) || localStorage.getItem('groovelab_storage_addon_gb') || 0);
    return gb === 5 ? 1.49 : gb === 10 ? 1.99 : gb === 20 ? 3.99 : gb === 25 ? 3.99 : gb === 50 ? 6.99 : gb === 100 ? 11.99 : gb === 250 ? 24.99 : 0;
  });
  const [showStorageManagerModal, setShowStorageManagerModal] = useState<boolean>(false);
  const [isSubmittingStorage, setIsSubmittingStorage] = useState<boolean>(false);
  const [storageBookingSuccessModal, setStorageBookingSuccessModal] = useState<{
    isOpen: boolean;
    receiptNumber: string;
    newGb: number;
    newFee: number;
    isDowngrade: boolean;
    effectiveDate?: string;
  } | null>(null);
  const [showSwitchBillingModelModal, setShowSwitchBillingModelModal] = useState<boolean>(false);
  const [selectedSwitchTargetPayer, setSelectedSwitchTargetPayer] = useState<'school' | 'student'>('student');
  const [isSwitchingPayer, setIsSwitchingPayer] = useState<boolean>(false);
  const [showStorageTerminationModal, setShowStorageTerminationModal] = useState<boolean>(false);
  const [storageTerminationDays, setStorageTerminationDays] = useState<number>(30);
  const [agreedToSepa, setAgreedToSepa] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showConfirmExtra, setShowConfirmExtra] = useState<boolean>(false);
  const [isSchoolTrial, setIsSchoolTrial] = useState<boolean>(false);
  const [schoolTrialEndsAt, setSchoolTrialEndsAt] = useState<string | null>(null);
  const [schoolStatus, setSchoolStatus] = useState<string>('active');
  const [subscriptionBypass, setSubscriptionBypass] = useState<boolean>(false);

  const [contractStartDate, setContractStartDate] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem(`contractStartDate_${schoolId}`) || localStorage.getItem(`simulatedContractStartDate_${schoolId}`)) : null;
  });
  const [simulatedToday, setSimulatedToday] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('groovelab_simulated_date') || (schoolId ? localStorage.getItem(`simulatedToday_${schoolId}`) : '') || '';
    }
    return '';
  });

  // Real-time synchronization of simulated date with TeacherDashboard and all other views
  useEffect(() => {
    const handleSimDateSync = () => {
      const sim = localStorage.getItem('groovelab_simulated_date') || (schoolId ? localStorage.getItem(`simulatedToday_${schoolId}`) : '') || '';
      setSimulatedToday(sim);
    };
    window.addEventListener('storage', handleSimDateSync);
    window.addEventListener('groovelab_simulated_date_changed', handleSimDateSync);
    return () => {
      window.removeEventListener('storage', handleSimDateSync);
      window.removeEventListener('groovelab_simulated_date_changed', handleSimDateSync);
    };
  }, [schoolId]);

  // ─── ENTERPRISE B2B DELINQUENCY & GRACE PERIOD ARCHITECTURE ───
  const [schoolInvoices, setSchoolInvoices] = useState<any[]>([]);
  const [showDunningPayModal, setShowDunningPayModal] = useState<boolean>(false);

  const [trustRefreshToken, setTrustRefreshToken] = useState<number>(0);

  const dunningStatus = useMemo<SchoolDunningStatus>(() => {
    const oldest = Array.isArray(schoolInvoices) 
      ? schoolInvoices.find((i: any) => i && i.due_date && String(i.status || '').toLowerCase() !== 'paid' && String(i.status || '').toLowerCase() !== 'bezahlt') 
      : null;
    const localTrustUntil = oldest ? localStorage.getItem(`groovelab_trust_token_${oldest.id}`) : null;

    const effectiveSchool = {
      ...(currentSchoolProfile || {
        id: schoolId,
        is_trial: isSchoolTrial,
        trial_ends_at: schoolTrialEndsAt,
        subscription_bypass: subscriptionBypass
      }),
      dunning_trust_extension_until: currentSchoolProfile?.dunning_trust_extension_until || localTrustUntil || undefined
    };
    return computeSchoolDunningStatus(effectiveSchool, schoolInvoices, simulatedToday || undefined);
  }, [currentSchoolProfile, schoolId, isSchoolTrial, schoolTrialEndsAt, subscriptionBypass, schoolInvoices, simulatedToday, trustRefreshToken]);

  useEffect(() => {
    if (schoolId) {
      if (dunningStatus.isAudioTresorReadOnly) {
        localStorage.setItem(`groovelab_audio_tresor_readonly_${schoolId}`, 'true');
      } else {
        localStorage.removeItem(`groovelab_audio_tresor_readonly_${schoolId}`);
      }
      if (dunningStatus.isTeacherReadOnly) {
        localStorage.setItem(`groovelab_teacher_readonly_${schoolId}`, 'true');
      } else {
        localStorage.removeItem(`groovelab_teacher_readonly_${schoolId}`);
      }
      localStorage.setItem(`groovelab_dunning_level_${schoolId}`, dunningStatus.level);
    }
  }, [schoolId, dunningStatus.isAudioTresorReadOnly, dunningStatus.isTeacherReadOnly, dunningStatus.level]);

  const assertSecretaryWriteAccess = (actionLabel?: string): boolean => {
    if (dunningStatus.isSecretaryReadOnly) {
      alert(`Administrativer Schreibschutz aktiv: Da die B2B-Infrastrukturrechnung seit über 30 Tagen aussteht, ist diese Aktion (${actionLabel || 'Bearbeiten/Erstellen'}) vorübergehend gesperrt. Bitte begleiche den Betrag über den angezeigten EPC-QR GiroCode.`);
      return false;
    }
    return true;
  };

  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({ '2026': true, '2025': true });
  const [isCancelled, setIsCancelled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem(`isCancelled_${schoolId}`) === 'true';
  });
  const [schoolContractEndsAt, setSchoolContractEndsAt] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [lastCancellationId, setLastCancellationId] = useState<string>('');
  const [showModuleUpgradeModal, setShowModuleUpgradeModal] = useState<boolean>(false);
  const [upgradeTargetModule, setUpgradeTargetModule] = useState<'campus' | 'groovelab'>('campus');
  const [upgradeProcessing, setUpgradeProcessing] = useState<boolean>(false);

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
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [selectedModalOption, setSelectedModalOption] = useState<string>('option1');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [limitsEnabled, setLimitsEnabled] = useState<boolean>(false);
  const [selectedDashboardMonth, setSelectedDashboardMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDashboardYear, setSelectedDashboardYear] = useState<number>(() => new Date().getFullYear());
  const [activeBillingSubTab, setActiveBillingSubTab] = useState<'overview' | 'matching' | 'history' | 'ledger'>('overview');
  const [tariffBookings, setTariffBookings] = useState<any[]>([]);
  const [loadingTariffBookings, setLoadingTariffBookings] = useState<boolean>(false);
  const [activeStudentsModalList, setActiveStudentsModalList] = useState<{ list: any[], month: string, amount?: number, campusCount?: number, groovelabCount?: number, passiveCount?: number } | null>(null);
  const [activationSearchQuery, setActivationSearchQuery] = useState<string>('');
  const [modalStudentSearchQuery, setModalStudentSearchQuery] = useState<string>('');
  const [auditLimit, setAuditLimit] = useState<number>(200);

  // Dynamic School Year End Calculation (German/Austrian Standard: Sept 1 to Aug 31)
  const getSchoolYearEndInfo = (simDate?: string | Date | null, existingEndIso?: string | null) => {
    if (existingEndIso) {
      const d = new Date(existingEndIso);
      const day = d.getDate();
      const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
      const monthName = monthNames[d.getMonth()] || 'August';
      const year = d.getFullYear();
      return {
        endDate: d,
        endDateIso: existingEndIso,
        formattedDate: `${day}. ${monthName} ${year}`,
        schoolYearLabel: `${year - 1}/${year}`
      };
    }
    const now = simDate 
      ? (typeof simDate === 'string' && !simDate.includes('T') ? new Date(simDate + 'T14:00:00') : new Date(simDate)) 
      : new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    // Standard Schuljahr: 01.09. bis 31.08.
    // Frist 1 Monat zum 31.08. (d.h. 31.07.)
    // Bei Kündigung ab August (Monat 8) oder später gilt Kündigung zum 31.08. des Folgejahres
    const targetEndYear = currentMonth >= 8 ? currentYear + 1 : currentYear;
    const schoolYearStartYear = targetEndYear - 1;
    const endDate = new Date(Date.UTC(targetEndYear, 7, 31, 21, 59, 59, 999));
    return {
      endDate,
      endDateIso: endDate.toISOString(),
      formattedDate: `31. August ${targetEndYear}`,
      schoolYearLabel: `${schoolYearStartYear}/${targetEndYear}`
    };
  };

  const downloadCancellationReceiptPdf = async (cancellationInfo: {
    cancellationId?: string;
    cancelledAt?: string | Date;
    effectiveEndDateFormatted: string;
    schoolName?: string;
  }) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const sName = cancellationInfo.schoolName || schoolName || currentSchoolProfile?.name || 'Musikschule';
      const cId = cancellationInfo.cancellationId || `KD-${schoolNumericId}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`;

      // Header Brand
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('Campus-Groovelab', 16, 16);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Rechtssichere Kündigungsbestätigung gem. § 312k Abs. 4 BGB', 16, 23);
      doc.text(`Aktenzeichen: ${cId}`, 16, 29);

      // Status Badge
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(135, 10, 60, 14, 3, 3, 'F');
      doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('KÜNDIGUNG BESTÄTIGT', 138, 19);

      // Main Card Box
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(16, 44, 178, 100, 4, 4, 'S');

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('Kündigung des Cloud-Infrastruktur-Abonnements', 22, 54);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Vertragspartner: ${sName}`, 22, 63);
      doc.text(`Kundennummer / Schul-ID: #${schoolNumericId}`, 22, 70);

      const cAt = cancellationInfo.cancelledAt ? new Date(cancellationInfo.cancelledAt) : new Date();
      const cAtStr = cAt.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      doc.text(`Eingangszeitpunkt der Kündigung: ${cAtStr} Uhr`, 22, 77);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Wirksamkeitsdatum der Beendigung: ${cancellationInfo.effectiveEndDateFormatted}, 23:59:59 Uhr`, 22, 88);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Status bis Vertragsende: Vollzugriff aktiv (keine Leistungseinschränkungen)', 22, 96);
      doc.text('Abrechnung: Es erfolgen nach dem Wirksamkeitsdatum keine weiteren Abbuchungen.', 22, 103);
      doc.text('Aufbewahrungsfristen: Rechnungsbelege bleiben 10 Jahre gem. § 147 AO abrufbar.', 22, 110);
      doc.text('Reaktivierung: Der Vertrag kann vor dem Wirksamkeitsdatum jederzeit reaktiviert werden.', 22, 117);

      // Legal compliance footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Dieses Dokument wurde elektronisch erstellt und ist gem. § 312k Abs. 4 BGB i.V.m. § 126b BGB rechtsverbindlich.', 16, 156);
      doc.text('Campus-Groovelab Cloud Services • Hosting & School Management Infrastructure', 16, 161);

      doc.save(`Kuendigungsbestaetigung_Campus_Groovelab_${sName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (e) {
      console.error("Error generating cancellation PDF:", e);
      alert("Kündigungsbeleg konnte nicht als PDF erstellt werden.");
    }
  };

  const downloadUpgradeConfirmationPdf = async (upgradeInfo: {
    upgradeId: string;
    targetModule: 'campus' | 'groovelab';
    schoolName?: string;
    effectiveEndDateFormatted: string;
  }) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const sName = upgradeInfo.schoolName || schoolName || currentSchoolProfile?.name || 'Musikschule';
      const modName = upgradeInfo.targetModule === 'campus' ? 'Campus Modul' : 'GrooveLab Modul';

      // Header Brand
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('Campus-Groovelab', 16, 16);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Vertragsänderungsbestätigung gem. § 311 Abs. 1 i.V.m. § 312i BGB', 16, 23);
      doc.text(`Aktenzeichen: ${upgradeInfo.upgradeId}`, 16, 29);

      // Status Badge
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(130, 10, 65, 14, 3, 3, 'F');
      doc.setTextColor(22, 101, 52);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('UPGRADE BESTÄTIGT', 133, 19);

      // Main Card Box
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(16, 44, 178, 105, 4, 4, 'S');

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`Modul-Upgrade: Hinzubuchung von ${modName} (Kombi-Vorteil)`, 22, 54);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Vertragspartner: ${sName}`, 22, 63);
      doc.text(`Kundennummer / Schul-ID: #${schoolNumericId}`, 22, 70);

      const nowStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      doc.text(`Abschlusszeitpunkt: ${nowStr} Uhr`, 22, 77);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Neuer Infrastruktur-Hosting-Tarif: 19,90 € / Mo. (Kombi-Paket Campus + GrooveLab)', 22, 88);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Kombi-Vorteilsrabatt: -4,90 € / Mo. dauerhaft auf das Infrastruktur-Bündel.', 22, 96);
      doc.text(`Laufzeit-Synchronisation: Co-Terminus bis Schuljahresende (${upgradeInfo.effectiveEndDateFormatted}).`, 22, 103);
      doc.text('Datenschutz (Art. 28 DSGVO): AVV automatisch um neue Modul-Verarbeitungskategorien erweitert.', 22, 110);
      doc.text('Sofortige Freischaltung: Alle Funktionen ab sofort für Lehrkräfte & Schüler aktiv.', 22, 117);

      // Legal compliance footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Dieses Dokument wurde elektronisch erstellt und ist gem. § 311 Abs. 1 BGB i.V.m. § 126b BGB rechtsverbindlich.', 16, 160);
      doc.text('Campus-Groovelab Cloud Services • Hosting & School Management Infrastructure', 16, 165);

      doc.save(`Vertragsaenderung_Kombi_Paket_${sName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (e) {
      console.error("Error generating upgrade PDF:", e);
    }
  };

  const getDynamicAnnualPrice = (startDateStr: string | null | undefined, discountPercentOrCoFinancing: number | boolean = 0): number => {
    const contractDateObj = startDateStr ? new Date(startDateStr) : new Date('2026-06-12T19:30:38+02:00');
    const month = contractDateObj.getMonth() + 1; // 1-indexed

    const monthsMap: Record<number, number> = {
      9: 12,  // September
      10: 11, // October
      11: 10, // November
      12: 9,  // December
      1: 8,   // January
      2: 7,   // February
      3: 6,   // March
      4: 5,   // April
      5: 4,   // May
      6: 3,   // June
      7: 2,   // July
      8: 1    // August
    };

    const monthsRemaining = monthsMap[month] !== undefined ? monthsMap[month] : 12;
    // Proportional calculation based on standard full-year prices
    const basePrice = effectiveSchoolRates.priceStudent * (masterPricing.billingMonthsPerYear || 11);
    const fullPrice = (monthsRemaining / 12) * basePrice;
    
    let discountPercent = 0;
    if (typeof discountPercentOrCoFinancing === 'boolean') {
      discountPercent = discountPercentOrCoFinancing ? 10 : 0;
    } else {
      discountPercent = discountPercentOrCoFinancing;
    }
    
    const finalPrice = fullPrice * (1 - discountPercent / 100);
    return parseFloat(finalPrice.toFixed(2));
  };

  const handleDeveloperReset = async () => {
    const simulated = typeof window !== 'undefined' ? localStorage.getItem(`simulatedContractStartDate_${schoolId}`) : null;
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          is_billing_booked: false,
          has_campus_subscription: false,
          has_groovelab_subscription: false,
          campus_activated_this_month: false,
          groovelab_activated_this_month: false,
          contract_start_date: simulated || null,
          contract_ends_at: null,
          student_billing_option: 'option2',
          extra_billing_option: 'option1',
          user_quota: 150,
          pending_user_quota: null
        })
        .eq('id', schoolId);
      if (error) throw error;

      // Reset pilot agreement signature
      try {
        await supabase
          .from('pilot_agreements')
          .delete()
          .eq('school_id', schoolId);
      } catch (err) {
        console.error("Error resetting pilot agreement signature:", err);
      }
    } catch (err: any) {
      console.error("Developer reset database error:", err);
    }

    setIsAvvSigned(false);
    setIsBillingBooked(false);
    setBookedExtraUsers(0);
    setExtraUsersSliderVal(0);
    setStudentBillingOption('option2');
    setBillingPayer('school');
    setExtraBillingOption('option1');
    setNextBillingOption('');
    setNextBillingOptionEffectiveAt('');
    setContractStartDate(simulated || null);
    setIsCancelled(false);
    setHasCampusSub(false);
    setHasGroovelabSub(false);
    setSelectedStorageAddonGb(0);
    setSelectedStorageAddonFee(0);
    setCampusActivatedThisMonth(false);
    setGroovelabActivatedThisMonth(false);
    setCheckoutStep(1);
    setAgreedToSepa(false);
    setAgreedToTerms(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem(`isBillingBooked_${schoolId}`, 'false');
      localStorage.setItem(`bookedExtraUsers_${schoolId}`, '0');
      localStorage.removeItem(`nextBillingOption_${schoolId}`);
      localStorage.removeItem(`nextBillingOptionEffectiveAt_${schoolId}`);
      if (simulated) {
        localStorage.setItem(`contractStartDate_${schoolId}`, simulated);
      } else {
        localStorage.removeItem(`contractStartDate_${schoolId}`);
      }
      localStorage.setItem(`isCancelled_${schoolId}`, 'false');
      localStorage.removeItem(`unbooked_52_temp_${schoolId}`);
    }
  };
  
  // Apple-style settings panel states
  const [settingsTab, setSettingsTab] = useState<'general' | 'sync' | 'security_privacy' | 'backup'>('general');
  const [activeSecretarySettingsModal, setActiveSecretarySettingsModal] = useState<'general' | 'links' | 'sync' | 'security_privacy' | 'backup' | 'school_year' | 'danger_zone' | null>(null);
  const [activeCampusSettingsModal, setActiveCampusSettingsModal] = useState<'boards' | 'homework' | 'timer' | 'schedule' | 'parent' | 'kiosk' | 'permissions' | 'feedback' | null>(null);
  const [activeGroovelabSettingsModal, setActiveGroovelabSettingsModal] = useState<'bands' | 'songs' | 'live' | 'radar' | 'avatars' | 'rooms' | 'permissions' | 'feedback' | null>(null);

  // Campus Extended Settings States
  const [campusHomeworkNotesSync, setCampusHomeworkNotesSync] = useState<boolean>(true);
  const [campusMeisterwerkEnabled, setCampusMeisterwerkEnabled] = useState<boolean>(true);
  const [campusFocusTimerDefaultMin, setCampusFocusTimerDefaultMin] = useState<number>(25);
  const [campusFocusTimerXpFactor, setCampusFocusTimerXpFactor] = useState<number>(1);
  const [campusLoopstationBarsPause, setCampusLoopstationBarsPause] = useState<number>(4);
  const [campusAudioMaxSessionMinutes, setCampusAudioMaxSessionMinutes] = useState<number>(10);
  const [campusScheduleSlotMinutes, setCampusScheduleSlotMinutes] = useState<number>(45);
  const [campusScheduleConflictWarning, setCampusScheduleConflictWarning] = useState<boolean>(true);
  const [campusParentAbsenceNotify, setCampusParentAbsenceNotify] = useState<boolean>(true);
  const [campusParentChatEnabled, setCampusParentChatEnabled] = useState<boolean>(true);
  const [campusParentStatsEnabled, setCampusParentStatsEnabled] = useState<boolean>(true);
  const [campusKioskPinLength, setCampusKioskPinLength] = useState<number>(4);
  const [campusKioskAutoLogoutMinutes, setCampusKioskAutoLogoutMinutes] = useState<number>(5);

  // GrooveLab Extended Settings States
  const [glMaxBandMembers, setGlMaxBandMembers] = useState<number>(8);
  const [glAllowStudentBandCreation, setGlAllowStudentBandCreation] = useState<boolean>(true);
  const [glSongLevelStarterEnabled, setGlSongLevelStarterEnabled] = useState<boolean>(true);
  const [glSongLevelProEnabled, setGlSongLevelProEnabled] = useState<boolean>(true);
  const [glSongLevelMasterEnabled, setGlSongLevelMasterEnabled] = useState<boolean>(true);
  const [glSongProposalWorkflow, setGlSongProposalWorkflow] = useState<boolean>(true);
  const [glLiveDefaultBpm, setGlLiveDefaultBpm] = useState<number>(120);
  const [glLiveCountInBars, setGlLiveCountInBars] = useState<number>(1);
  const [glLiveStageDisplayEnabled, setGlLiveStageDisplayEnabled] = useState<boolean>(true);
  const [glSkillRadarTiming, setGlSkillRadarTiming] = useState<boolean>(true);
  const [glSkillRadarTechnique, setGlSkillRadarTechnique] = useState<boolean>(true);
  const [glSkillRadarSound, setGlSkillRadarSound] = useState<boolean>(true);
  const [glSkillRadarRepertoire, setGlSkillRadarRepertoire] = useState<boolean>(true);
  const [glSkillRadarTeamplay, setGlSkillRadarTeamplay] = useState<boolean>(true);
  const [glMusicianAvatarsEnabled, setGlMusicianAvatarsEnabled] = useState<boolean>(true);
  const [glBandCoatOfArmsEnabled, setGlBandCoatOfArmsEnabled] = useState<boolean>(true);
  const [glBandChatEnabled, setGlBandChatEnabled] = useState<boolean>(true);
  const [glCoachModerationRequired, setGlCoachModerationRequired] = useState<boolean>(false);
  const [glJamRecordingCompression, setGlJamRecordingCompression] = useState<boolean>(true);

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [initialSettings, setInitialSettings] = useState<any>(null);
  const [kioskPinLength, setKioskPinLength] = useState<number>(4);
  const [kioskAutoLogout, setKioskAutoLogout] = useState<number>(5);
  const [bypassPin, setBypassPin] = useState<string>('1234');
  const [notificationAbsence, setNotificationAbsence] = useState<boolean>(true);
  const [notificationConflict, setNotificationConflict] = useState<boolean>(true);
  const [notificationHomework, setNotificationHomework] = useState<boolean>(false);
  const [logRetention, setLogRetention] = useState<string>('90');
  const [syncInterval, setSyncInterval] = useState<string>('daily');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [calendarUrl, setCalendarUrl] = useState<string>('');
  const [calendarUrls, setCalendarUrls] = useState<string[]>([]);
  const [newCalendarUrlInput, setNewCalendarUrlInput] = useState<string>('');
  
  // Danger Zone / School Reset States
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetConfirmText, setResetConfirmText] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const handleResetSchool = async () => {
    if (resetConfirmText !== schoolName) {
      alert(`Fehler: Bitte geben Sie genau den Namen der Musikschule („${schoolName}“) zur Bestätigung ein.`);
      return;
    }
    
    setIsResetting(true);
    try {
      const { error } = await supabase.rpc('reset_school_data', {
        p_school_id: schoolId,
        p_admin_id: userId
      });
      if (error) throw error;
      
      alert('Erfolg: Die Musikschule wurde erfolgreich auf Werkseinstellungen zurückgesetzt! Alle Schüler- und Lehrerdaten wurden gelöscht. Ihr Administrator-Profil ist weiterhin aktiv.');
      setShowResetModal(false);
      setResetConfirmText('');
      
      fetchDashboardData();
      window.location.reload();
    } catch (err: any) {
      console.error('Error resetting school:', err);
      alert('Fehler beim Zurücksetzen der Musikschule: ' + (err.message || err));
    } finally {
      setIsResetting(false);
    }
  };

  // Backup & Restore States & Functions
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`groovelab_last_backup_${schoolId}`);
  });

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const [
        schoolRes,
        usersRes,
        roomsRes,
        schedulesRes,
        bandsRes,
        studentsRes,
        stationsRes
      ] = await Promise.all([
        supabase.from('schools').select('*').eq('id', schoolId).single(),
        supabase.from('users').select('*').eq('school_id', schoolId),
        supabase.from('rooms').select('*').eq('school_id', schoolId),
        supabase.from('schedules').select('*').eq('school_id', schoolId),
        supabase.from('bands').select('*').eq('school_id', schoolId),
        supabase.from('students').select('*').eq('school_id', schoolId),
        supabase.from('stations').select('*, rooms!inner(school_id)').eq('rooms.school_id', schoolId)
      ]);

      if (schoolRes.error) throw schoolRes.error;
      if (usersRes.error) throw usersRes.error;
      if (roomsRes.error) throw roomsRes.error;
      if (schedulesRes.error) throw schedulesRes.error;
      if (bandsRes.error) throw bandsRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (stationsRes.error) throw stationsRes.error;

      const bandIds = (bandsRes.data || []).map((b: any) => b.id);
      const studentIds = (studentsRes.data || []).map((s: any) => s.id);

      const [
        bandMembersRes,
        studentFirstNamesRes,
        studentLastNamesRes,
        emailPrefixesRes,
        emailSuffixesRes,
        activationDaysRes
      ] = await Promise.all([
        bandIds.length > 0
          ? supabase.from('band_members').select('*').in('band_id', bandIds)
          : Promise.resolve({ data: [], error: null }),
        studentIds.length > 0
          ? supabase.from('student_first_names').select('*').in('student_id', studentIds)
          : Promise.resolve({ data: [], error: null }),
        studentIds.length > 0
          ? supabase.from('student_last_names').select('*').in('student_id', studentIds)
          : Promise.resolve({ data: [], error: null }),
        studentIds.length > 0
          ? supabase.from('email_prefixes').select('*').in('student_id', studentIds)
          : Promise.resolve({ data: [], error: null }),
        studentIds.length > 0
          ? supabase.from('email_suffixes').select('*').in('student_id', studentIds)
          : Promise.resolve({ data: [], error: null }),
        studentIds.length > 0
          ? supabase.from('activation_days').select('*').in('student_id', studentIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (bandMembersRes.error) throw bandMembersRes.error;
      if (studentFirstNamesRes.error) throw studentFirstNamesRes.error;
      if (studentLastNamesRes.error) throw studentLastNamesRes.error;
      if (emailPrefixesRes.error) throw emailPrefixesRes.error;
      if (emailSuffixesRes.error) throw emailSuffixesRes.error;
      if (activationDaysRes.error) throw activationDaysRes.error;

      const backupData = {
        schoolId,
        version: '1.0',
        exportDate: new Date().toISOString(),
        school: schoolRes.data,
        users: usersRes.data || [],
        rooms: roomsRes.data || [],
        stations: (stationsRes.data || []).map(({ rooms, ...s }: any) => s),
        schedules: schedulesRes.data || [],
        bands: bandsRes.data || [],
        bandMembers: bandMembersRes.data || [],
        students: studentsRes.data || [],
        studentFirstNames: studentFirstNamesRes.data || [],
        studentLastNames: studentLastNamesRes.data || [],
        emailPrefixes: emailPrefixesRes.data || [],
        emailSuffixes: emailSuffixesRes.data || [],
        activationDays: activationDaysRes.data || []
      };

      const jsonBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(jsonBlob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", downloadUrl);
      downloadAnchor.setAttribute("download", `Backup_Campus_Groovelab_${schoolName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(downloadUrl);

      const nowStr = new Date().toISOString();
      localStorage.setItem(`groovelab_last_backup_${schoolId}`, nowStr);
      setLastBackupDate(nowStr);
    } catch (err) {
      console.error('[Backup] Export failed:', err);
      alert('Backup-Export fehlgeschlagen: ' + (err as any).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreBackup = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target?.result as string);
        
        if (backupData.schoolId !== schoolId) {
          alert('Fehler: Dieses Backup gehört zu einer anderen Musikschule und kann hier nicht eingespielt werden.');
          return;
        }
        if (!backupData.users || !backupData.rooms || !backupData.schedules || !backupData.students) {
          alert('Fehler: Ungültiges Backup-Format.');
          return;
        }

        const confirmWord = prompt('WARNUNG: Dies wird ALLE aktuellen Daten dieser Musikschule (Stundenpläne, Räume, Benutzer, Schülerkartei) unwiderruflich überschreiben! Tippen Sie zur Bestätigung das Wort "RESTORE" ein:');
        if (confirmWord !== 'RESTORE') {
          alert('Wiederherstellung abgebrochen.');
          return;
        }

        setIsRestoring(true);

        try {
          const [
            uRes, rRes, sRes, bRes, stRes, stationsRes
          ] = await Promise.all([
            supabase.from('users').select('*').eq('school_id', schoolId),
            supabase.from('rooms').select('*').eq('school_id', schoolId),
            supabase.from('schedules').select('*').eq('school_id', schoolId),
            supabase.from('bands').select('*').eq('school_id', schoolId),
            supabase.from('students').select('*').eq('school_id', schoolId),
            supabase.from('stations').select('*, rooms!inner(school_id)').eq('rooms.school_id', schoolId)
          ]);
          const currentData = {
            schoolId,
            exportDate: new Date().toISOString(),
            users: uRes.data || [],
            rooms: rRes.data || [],
            stations: (stationsRes.data || []).map(({ rooms, ...s }: any) => s),
            schedules: sRes.data || [],
            bands: bRes.data || [],
            students: stRes.data || []
          };
          localStorage.setItem(`groovelab_rollback_backup_${schoolId}`, JSON.stringify(currentData));
        } catch (rollBackErr) {
          console.warn('Rollback backup failed, proceeding anyway:', rollBackErr);
        }

        // Delete all current stations explicitly first, then delete rooms
        await supabase.from('stations').delete().in('room_id', (await supabase.from('rooms').select('id').eq('school_id', schoolId)).data?.map((r: any) => r.id) || []);
        await supabase.from('band_members').delete().in('band_id', (await supabase.from('bands').select('id').eq('school_id', schoolId)).data?.map((b: any) => b.id) || []);
        await supabase.from('bands').delete().eq('school_id', schoolId);
        await supabase.from('schedules').delete().eq('school_id', schoolId);
        const restoreStudentIds = (await supabase.from('students').select('id').eq('school_id', schoolId)).data?.map((s: any) => s.id) || [];
        await supabase.from('student_first_names').delete().in('student_id', restoreStudentIds);
        await supabase.from('student_last_names').delete().in('student_id', restoreStudentIds);
        await supabase.from('email_prefixes').delete().in('student_id', restoreStudentIds);
        await supabase.from('email_suffixes').delete().in('student_id', restoreStudentIds);
        await supabase.from('activation_days').delete().in('student_id', restoreStudentIds);
        await supabase.from('students').delete().eq('school_id', schoolId);
        await supabase.from('rooms').delete().eq('school_id', schoolId);
        await supabase.from('users').delete().eq('school_id', schoolId).neq('id', userId);

        if (backupData.school) {
          const { id, created_at, ...schoolSettings } = backupData.school;
          await supabase.from('schools').update(schoolSettings).eq('id', schoolId);
        }

        if (backupData.users.length > 0) {
          const usersToInsert = backupData.users.filter((u: any) => u.id !== userId);
          if (usersToInsert.length > 0) {
            const { error } = await supabase.from('users').insert(usersToInsert);
            if (error) throw error;
          }
          // Update the current logged-in user with their backup data (excluding primary key/email conflicts)
          const currentUserBackup = backupData.users.find((u: any) => u.id === userId);
          if (currentUserBackup) {
            const { id, created_at, email, ...updatableFields } = currentUserBackup;
            await supabase.from('users').update(updatableFields).eq('id', userId);
          }
        }
        if (backupData.rooms.length > 0) {
          const { error } = await supabase.from('rooms').insert(backupData.rooms);
          if (error) throw error;
        }
        if (backupData.stations && backupData.stations.length > 0) {
          const { error } = await supabase.from('stations').insert(backupData.stations);
          if (error) throw error;
        }
        if (backupData.students.length > 0) {
          const { error } = await supabase.from('students').insert(backupData.students);
          if (error) throw error;
        }
        if (backupData.studentFirstNames && backupData.studentFirstNames.length > 0) {
          const { error } = await supabase.from('student_first_names').insert(backupData.studentFirstNames);
          if (error) throw error;
        }
        if (backupData.studentLastNames && backupData.studentLastNames.length > 0) {
          const { error } = await supabase.from('student_last_names').insert(backupData.studentLastNames);
          if (error) throw error;
        }
        if (backupData.studentNames && backupData.studentNames.length > 0) {
          const firstNamesToInsert = backupData.studentNames.map((sn: any) => ({
            student_id: sn.student_id,
            first_name: sn.first_name
          }));
          const lastNamesToInsert = backupData.studentNames.map((sn: any) => ({
            student_id: sn.student_id,
            last_name: sn.last_name
          }));
          const { error: fErr } = await supabase.from('student_first_names').insert(firstNamesToInsert);
          if (fErr) throw fErr;
          const { error: lErr } = await supabase.from('student_last_names').insert(lastNamesToInsert);
          if (lErr) throw lErr;
        }
        if (backupData.emailPrefixes && backupData.emailPrefixes.length > 0) {
          const { error } = await supabase.from('email_prefixes').insert(backupData.emailPrefixes);
          if (error) throw error;
        }
        if (backupData.emailSuffixes && backupData.emailSuffixes.length > 0) {
          const { error } = await supabase.from('email_suffixes').insert(backupData.emailSuffixes);
          if (error) throw error;
        }
        if (backupData.activationDays && backupData.activationDays.length > 0) {
          const { error } = await supabase.from('activation_days').insert(backupData.activationDays);
          if (error) throw error;
        }
        if (backupData.schedules.length > 0) {
          const { error } = await supabase.from('schedules').insert(backupData.schedules);
          if (error) throw error;
        }
        if (backupData.bands && backupData.bands.length > 0) {
          const { error } = await supabase.from('bands').insert(backupData.bands);
          if (error) throw error;
        }
        if (backupData.bandMembers && backupData.bandMembers.length > 0) {
          const { error } = await supabase.from('band_members').insert(backupData.bandMembers);
          if (error) throw error;
        }

        alert('Daten erfolgreich wiederhergestellt! Das Dashboard wird neu geladen.');
        window.location.reload();
      } catch (err) {
        console.error('[Backup] Restore failed:', err);
        alert('Wiederherstellung fehlgeschlagen: ' + (err as any).message);
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  // Tokens & Settings
  const [kioskToken, setKioskToken] = useState<string>('');
  const [campusToken, setCampusToken] = useState<string>('');
  const [allowMessagesGlobal, setAllowMessagesGlobal] = useState<boolean>(true);
  
  // Lists
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [bypassTeachers, setBypassTeachers] = useState<BypassTeacher[]>([]);
  const [coaches, setCoaches] = useState<GrooveLabCoach[]>([]);
  const [campusTeachers, setCampusTeachers] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const allTeachersRef = useRef<any[]>([]);

  const INSTRUMENT_TAGS = ['Schlagzeug', 'Piano', 'Gitarre', 'Gesang', 'Geige', 'Querflöte', 'Saxophon', 'Bass', 'Keyboard', 'Trompete'];

  // Subjects (Unterrichtsfächer) states
  const [subjects, setSubjects] = useState<any[]>([]);
  const activeSubjectsList = useMemo(() => {
    const placeholders = new Set([
      'ohne zuweisung', 'ohnezuweisung', 'allgemein', 
      'nicht festgelegt', 'nichtfestgelegt', 'nicht zugeordnet', 
      'nichtzugeordnet', 'none', 'null', ''
    ]);
    const activeSubs = Array.from(new Set(
      subjects
        .filter((s: any) => s.is_active && s.name)
        .map((s: any) => s.name.trim())
    )).filter(name => !placeholders.has(name.toLowerCase()));
    
    return activeSubs.length > 0 ? activeSubs : INSTRUMENT_TAGS;
  }, [subjects]);

  const {
    employees,
    setEmployees,
    revealedPins,
    setRevealedPins,
    isCurrentUserTeacher,
    employeeFirstName,
    setEmployeeFirstName,
    employeeLastName,
    setEmployeeLastName,
    employeeNickname,
    setEmployeeNickname,
    employeeEmail,
    setEmployeeEmail,
    employeeSearchQuery,
    setEmployeeSearchQuery,
    employeeStatusTab,
    setEmployeeStatusTab,
    employeeFilterRole,
    setEmployeeFilterRole,
    isEmployeeCsvExpanded,
    setIsEmployeeCsvExpanded,
    employeeCsvText,
    setEmployeeCsvText,
    employeeImportStatus,
    setEmployeeImportStatus,
    showAddEmployeeModal,
    setShowAddEmployeeModal,
    dragHoveredEmployeeRole,
    setDragHoveredEmployeeRole,
    employeeFilterRoleFocused,
    setEmployeeFilterRoleFocused,
    employeeStatusTabFocused,
    setEmployeeStatusTabFocused,
    employeeSearchFocused,
    setEmployeeSearchFocused,
    handleCreateEmployee,
    handleImportEmployees,
    handleUpdateEmployeeRole,
    handleToggleRole,
    teacherSearchQuery,
    setTeacherSearchQuery,
    teacherFilterInstrument,
    setTeacherFilterInstrument,
    teacherStatusTab,
    setTeacherStatusTab,
    newTeacherFirstName,
    setNewTeacherFirstName,
    newTeacherLastName,
    setNewTeacherLastName,
    newTeacherEmail,
    setNewTeacherEmail,
    newTeacherInstrument,
    setNewTeacherInstrument,
    newTeacherLimit,
    setNewTeacherLimit,
    newTeacherContractEndsAt,
    setNewTeacherContractEndsAt,
    showAddTeacherModal,
    setShowAddTeacherModal,
    showAddCoachModal,
    setShowAddCoachModal,
    coachFirstName,
    setCoachFirstName,
    coachLastName,
    setCoachLastName,
    coachEmail,
    setCoachEmail,
    coachInstrument,
    setCoachInstrument,
    coachRole,
    setCoachRole,
    manageTeacher,
    setManageTeacher,
    isCsvExpanded,
    setIsCsvExpanded,
    csvText,
    setCsvText,
    importStatus,
    setImportStatus,
    handleCreateTeacher,
    handleCreateCoachForGroovelab,
    handleCreateCoach,
    handleImportTeachers,
    handleToggleTeacherModule,
    handleUpdateTeacherInstrument,
    handleGenerateInviteToken,
    handleDeleteUser
  } = useSecretaryStaff({
    schoolId,
    userId: userId || '',
    schoolName,
    currentSchoolProfile,
    currentUserProfile,
    setCurrentUserProfile,
    userRoles,
    isAvvSigned,
    setShowAvvModal,
    activeSubjectsList,
    fetchDashboardData: () => fetchDashboardData(),
    assertSecretaryWriteAccess
  });

  const {
    students,
    setStudents,
    frozenStudents,
    setFrozenStudents,
    studentSearchQuery,
    setStudentSearchQuery,
    studentFilterInstrument,
    setStudentFilterInstrument,
    studentFilterTeacher,
    setStudentFilterTeacher,
    studentFilterStatus,
    setStudentFilterStatus,
    filteredStudents,
    studentCurrentPage,
    setStudentCurrentPage,
    studentPageSize,
    setStudentPageSize,
    selectedStudentIds,
    setSelectedStudentIds,
    selectedStudentForDetail,
    setSelectedStudentForDetail,
    deleteStudentModalData,
    setDeleteStudentModalData,
    copiedStudentId,
    setCopiedStudentId,
    showAddStudentModal,
    setShowAddStudentModal,
    showAddGroovelabStudentModal,
    setShowAddGroovelabStudentModal,
    showBulkImportModal,
    setShowBulkImportModal,
    showBulkDeleteModal,
    setShowBulkDeleteModal,
    bulkDeletePin,
    setBulkDeletePin,
    bulkDeleteStep,
    setBulkDeleteStep,
    isBulkDeleting,
    setIsBulkDeleting,
    isStudentCsvExpanded,
    setIsStudentCsvExpanded,
    studentCsvText,
    setStudentCsvText,
    bulkImportDuration,
    setBulkImportDuration,
    isAnonymizedImport,
    setIsAnonymizedImport,
    isImportingStudentsBatch,
    setIsImportingStudentsBatch,
    newStudentFirstName,
    setNewStudentFirstName,
    newStudentLastName,
    setNewStudentLastName,
    newStudentBirthDate,
    setNewStudentBirthDate,
    newStudentNickname,
    setNewStudentNickname,
    newStudentInstrument,
    setNewStudentInstrument,
    newStudentDuration,
    setNewStudentDuration,
    newStudentTeacherId,
    setNewStudentTeacherId,
    newStudentIsAppUser,
    setNewStudentIsAppUser,
    newStudentIsCampusActive,
    setNewStudentIsCampusActive,
    newStudentIsGroovelabActive,
    setNewStudentIsGroovelabActive,
    handleCreateStudentCampus,
    handleCreateStudentGroovelab,
    handleDeleteStudentCampus,
    handleBulkStudentImport,
    handleBatchImportStudents,
    handleToggleStudentModule,
    handleUpdateStudentTeacher,
    handleDeleteExpiredStudents
  } = useSecretaryStudents({
    schoolId,
    allTeachers,
    campusTeachers,
    bypassTeachers,
    coaches,
    hasCampusSub,
    hasGroovelabSub,
    isBillingBooked,
    studentBillingOption,
    billingPayer,
    fetchDashboardData: () => fetchDashboardData(),
    assertSecretaryWriteAccess
  });

  const studentsRef = useRef<any[]>([]);

  useEffect(() => {
    allTeachersRef.current = allTeachers;
  }, [allTeachers]);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);
  const [dismissedInvoiceAlert, setDismissedInvoiceAlert] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem(`dismissedInvoiceAlert_${schoolId}`) === 'true';
  });

  // Global pricing calculations for use in briefing & invoice lists
  const billedCampus_global = isBillingBooked ? (hasCampusSub || campusActivatedThisMonth) : hasCampusSub;
  const billedGroovelab_global = isBillingBooked ? (hasGroovelabSub || groovelabActivatedThisMonth) : hasGroovelabSub;
  const activeModulesCount_global = (billedCampus_global ? 1 : 0) + (billedGroovelab_global ? 1 : 0);
  const moduleCost_global = (billedCampus_global && billedGroovelab_global) ? effectiveSchoolRates.priceKombi : ((billedCampus_global ? effectiveSchoolRates.priceCampus : 0) + (billedGroovelab_global ? effectiveSchoolRates.priceGroovelab : 0));
  const activeStudentsCount_global = students.filter((s: any) => s.isCampusActive || s.is_campus_active).length;
  const activeGroovelabStudentsCount_global = students.filter((s: any) => s.isGroovelabActive || s.is_groovelab_active).length;
  const maxActiveStudentsCount_global = Math.max(activeStudentsCount_global, activeGroovelabStudentsCount_global);
  const passiveStudentsCount_global = Math.max(0, students.length - maxActiveStudentsCount_global);
  const allUniqueTeacherProfiles = [...campusTeachers, ...bypassTeachers, ...coaches, ...allTeachers].reduce((acc: any[], t: any) => {
    if (t && t.id && !acc.some(existing => existing.id === t.id)) {
      acc.push(t);
    }
    return acc;
  }, []).sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

  // Anti-Abuse Rule: Pure Management is unlimited 100% free.
  // Double-Roles (Management + Teacher): Max 2 profiles are free; 3rd and subsequent double-roles are billed (0,49 € / Mo.).
  let freeDoubleRoleCount = 0;
  const billableTeachersCount = allUniqueTeacherProfiles.filter((t: any) => {
    const isManagement = t.role === 'admin' || t.role === 'secretary' || (Array.isArray(t.roles) && (t.roles.includes('admin') || t.roles.includes('secretary')));
    const isTeacher = t.role === 'teacher' || (Array.isArray(t.roles) && t.roles.includes('teacher')) || (t.studentCount && t.studentCount > 0);
    
    if (isManagement && isTeacher) {
      if (freeDoubleRoleCount < 2) {
        freeDoubleRoleCount++;
        return false; // Free double-role exemption
      }
      return true; // Exceeded 2 free double-roles -> Billed at 0,49 € / Mo.
    }
    if (isManagement && !isTeacher) {
      return false; // Pure Management -> Always 100% Free
    }
    return true; // Pure Teacher -> Billed
  }).length;

  const isSammelzahler = billingPayer === 'school' || studentBillingOption === 'option2' || studentBillingOption === 'option1';
  const campusActivationFeeTotal_global = isSammelzahler ? activeStudentsCount_global * effectiveSchoolRates.priceStudent : 0;
  const groovelabActivationFeeTotal_global = activeGroovelabStudentsCount_global * effectiveSchoolRates.priceStudent;
  const passiveStudentFeeTotal_global = passiveStudentsCount_global * 0.09;
  const teacherServiceFeeTotal_global = billableTeachersCount * effectiveSchoolRates.priceTeacher;
  const storageAddonFee_global = selectedStorageAddonGb > 0 ? (selectedStorageAddonFee || Number(currentSchoolProfile?.storage_addon_monthly_fee || 0)) : 0;

  const baseB2B_global = subscriptionBypass
    ? 0
    : (moduleCost_global + teacherServiceFeeTotal_global + passiveStudentFeeTotal_global + groovelabActivationFeeTotal_global + campusActivationFeeTotal_global + storageAddonFee_global);
  const studentLevyMonthly_global = campusActivationFeeTotal_global;
  const extraLevyMonthly_global = extraBillingOption === 'option2' ? bookedExtraUsers * effectiveSchoolRates.priceTeacher : 0;
  const studentSharePreview_global = 0;
  const schoolShareBookedExtra_global = 0;
  const currentTotalB2B_global = baseB2B_global;
  const mixedTotal_global = currentTotalB2B_global;

  const daysSinceLastBackup = useMemo(() => {
    if (!lastBackupDate) return null;
    const lastDate = new Date(lastBackupDate);
    const diffTime = Math.abs(new Date().getTime() - lastDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [lastBackupDate]);

  const showBackupAlert = useMemo(() => {
    return !lastBackupDate || (daysSinceLastBackup !== null && daysSinceLastBackup > 14);
  }, [lastBackupDate, daysSinceLastBackup]);

  const isSettingsDirty = useMemo(() => {
    if (!initialSettings) return false;
    return (
      schoolName !== initialSettings.schoolName ||
      schoolSubdomain !== initialSettings.schoolSubdomain ||
      schoolZipCode !== initialSettings.schoolZipCode ||
      schoolCity !== initialSettings.schoolCity ||
      schoolStreet !== initialSettings.schoolStreet ||
      schoolHouseNumber !== initialSettings.schoolHouseNumber ||
      schoolPhoneNumber !== initialSettings.schoolPhoneNumber ||
      schoolEmail !== initialSettings.schoolEmail ||
      absenceEmail !== initialSettings.absenceEmail ||
      logoUrl !== initialSettings.logoUrl ||
      JSON.stringify(calendarUrls) !== JSON.stringify(initialSettings.calendarUrls) ||
      kioskPinLength !== initialSettings.kioskPinLength ||
      bypassPin !== initialSettings.bypassPin ||
      logRetention !== initialSettings.logRetention ||
      syncInterval !== initialSettings.syncInterval ||
      schoolYearStartMonth !== initialSettings.schoolYearStartMonth ||
      schoolYearStartDay !== initialSettings.schoolYearStartDay ||
      autoDeleteExpiredUsers !== initialSettings.autoDeleteExpiredUsers
    );
  }, [
    initialSettings,
    schoolName, schoolSubdomain, schoolZipCode, schoolCity, schoolStreet, schoolHouseNumber, schoolPhoneNumber, schoolEmail, absenceEmail,
    logoUrl, calendarUrls, kioskPinLength, bypassPin, logRetention, syncInterval,
    schoolYearStartMonth, schoolYearStartDay, autoDeleteExpiredUsers
  ]);

  const {
    pendingSchedules,
    setPendingSchedules,
    matrixAllocations,
    setMatrixAllocations,
    unsubmittedTeachers,
    setUnsubmittedTeachers,
    selectedDayPlan,
    setSelectedDayPlan,
    draggedPlanId,
    setDraggedPlanId,
    draggedPlanDay,
    setDraggedPlanDay,
    dragOverCell,
    setDragOverCell,
    isSavingApproval,
    setIsSavingApproval,
    approvalToast,
    setApprovalToast,
    showUnassignedWarning,
    setShowUnassignedWarning,
    approvalDebounceRef,
    isApprovingAllSchedules,
    setIsApprovingAllSchedules,
    showOnlyPendingReviews,
    setShowOnlyPendingReviews,
    hoveredUnassignedDayNum,
    setHoveredUnassignedDayNum,
    clickedUnassignedDayNum,
    setClickedUnassignedDayNum,
    schedulesSidebarTab,
    setSchedulesSidebarTab,
    sidebarTeacherSearch,
    setSidebarTeacherSearch,
    expandedSidebarTeacherId,
    setExpandedSidebarTeacherId,
    selectedFilterTeacherId,
    setSelectedFilterTeacherId,
    handleApproveAllPendingSchedules,
    isGroovelabPlan,
    isGroovelabRoom,
    runAutoRoomAllocation,
    handleSaveAndApproveAll,
    handleRejectTeacherDayPlan,
    getSplitPoints,
    handleSplitPlan,
    handleMergePlans,
    getPlanDisplayName,
    handleApproveSingleSchedule,
    handleRejectSingleSchedule,
    handleDragStartMatrix,
    handleDropOnMatrix,
    handleDownloadTeacherSchedule
  } = useSecretarySchedules({
    schoolId,
    rooms,
    setRooms,
    openingHours,
    campusTeachers,
    bypassTeachers,
    coaches,
    fetchDashboardData: () => fetchDashboardData()
  });

  // Equipment State
  const [schoolEquipment, setSchoolEquipment] = useState<any[]>([]);
  const [equipmentFormName, setEquipmentFormName] = useState('');
  const [equipmentFormQty, setEquipmentFormQty] = useState<number>(1);
  const [editingEquipment, setEditingEquipment] = useState<any | null>(null);
  const [equipmentSaving, setEquipmentSaving] = useState(false);
  const [selectedEquipmentRoomId, setSelectedEquipmentRoomId] = useState<string>('All');
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState<string>('');
  const [equipmentSortFreeFirst, setEquipmentSortFreeFirst] = useState<boolean>(false);
  const equipmentNameInputRef = useRef<HTMLInputElement>(null);
  const equipmentQtyInputRef = useRef<HTMLInputElement>(null);
  const [editingRoomInstrument, setEditingRoomInstrument] = useState<{ roomId: string, index: number, name: string, model: string } | null>(null);
  const [editRoomInstFormName, setEditRoomInstFormName] = useState<string>('');
  const [editRoomInstFormModel, setEditRoomInstFormModel] = useState<string>('');
  const [editingEquipmentGroup, setEditingEquipmentGroup] = useState<any | null>(null);
  const [editGroupName, setEditGroupName] = useState<string>('');
  const [editGroupModel, setEditGroupModel] = useState<string>('');
  const [editGroupLink, setEditGroupLink] = useState<string>('');
  const [editGroupCoupled, setEditGroupCoupled] = useState<boolean>(true);
  const [editGroupQty, setEditGroupQty] = useState<number>(1);
  const [editGroupInstancesData, setEditGroupInstancesData] = useState<any[]>([]);
  const [hoveredCloseId, setHoveredCloseId] = useState<string | null>(null);
  // Helpers
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [roomMap, setRoomMap] = useState<Record<string, string>>({});
  // Copy States
  const [copyingKiosk, setCopyingKiosk] = useState(false);
  const [copyingCampus, setCopyingCampus] = useState(false);
  const [copiedTeacherId, setCopiedTeacherId] = useState<string | null>(null);
  const [regeneratingTokens, setRegeneratingTokens] = useState(false);
  
  const [coachSearchQuery, setCoachSearchQuery] = useState<string>('');
  const [coachFilterInstrument, setCoachFilterInstrument] = useState<string>('All');
  
  const [groovelabStudentSearchQuery, setGroovelabStudentSearchQuery] = useState<string>('');
  const [groovelabStudentFilterInstrument, setGroovelabStudentFilterInstrument] = useState<string>('All');
  
  // Manual Modal Sub-states
  const [coachModalSearchQuery, setCoachModalSearchQuery] = useState<string>('');
  const [showManualCreateCoach, setShowManualCreateCoach] = useState<boolean>(false);
  const [groovelabStudentModalSearchQuery, setGroovelabStudentModalSearchQuery] = useState<string>('');
  const [showManualCreateGroovelabStudent, setShowManualCreateGroovelabStudent] = useState<boolean>(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState<boolean>(false);
  const [isHandoutsDropdownOpen, setIsHandoutsDropdownOpen] = useState<boolean>(false);

  // Cleanup any legacy rental instruments local storage keys
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('groovelab_rental_instruments');
      if (schoolId) {
        localStorage.removeItem(`groovelab_rental_instruments_${schoolId}`);
      }
    } catch (e) {}
  }, [schoolId]);

  // Drag and drop hovered states
  const [dragHoveredInstrument, setDragHoveredInstrument] = useState<string | null>(null);
  const [dragHoveredTeacher, setDragHoveredTeacher] = useState<string | null>(null);

  // UI states
  const [loading, setLoading] = useState(true);
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);
  const [updatingTeacherId, setUpdatingTeacherId] = useState<string | null>(null);
  const [briefingData, setBriefingData] = useState<SecretaryBriefingData | null>(null);
  const [crisisNotifications, setCrisisNotifications] = useState<any[]>([]);

  // Realtime subscription for crisis updates, system alerts, and user profiles with 500ms settling debounce
  useEffect(() => {
    if (!schoolId) return;
    
    fetchCrisisNotifications();
    fetchPendingBookings();

    const handleRefresh = () => {
      fetchPendingBookings();
    };
    window.addEventListener('refresh-bookings', handleRefresh);

    let crisisTimeout: any = null;
    let dashboardTimeout: any = null;

    const debouncedFetchCrisisNotifications = () => {
      if (crisisTimeout) clearTimeout(crisisTimeout);
      crisisTimeout = setTimeout(() => {
        fetchCrisisNotifications();
      }, 500);
    };

    const debouncedFetchDashboardData = () => {
      if (dashboardTimeout) clearTimeout(dashboardTimeout);
      dashboardTimeout = setTimeout(() => {
        fetchDashboardData();
      }, 500);
    };

    const channel = supabase
      .channel(`realtime_secretary_crisis_${schoolId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crisis_notifications', filter: `school_id=eq.${schoolId}` }, (payload) => {
        const updatedRow = payload.new as any;
        if (updatedRow) {
          setCrisisNotifications(prev =>
            prev.map(n => n.id === updatedRow.id ? { ...n, status: updatedRow.status, notified_at: updatedRow.notified_at } : n)
          );
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crisis_notifications', filter: `school_id=eq.${schoolId}` }, () => {
        debouncedFetchCrisisNotifications();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'crisis_notifications', filter: `school_id=eq.${schoolId}` }, () => {
        debouncedFetchCrisisNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_alerts' }, () => {
        debouncedFetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `school_id=eq.${schoolId}` }, () => {
        debouncedFetchDashboardData();
        debouncedFetchCrisisNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_bookings' }, (payload: any) => {
        fetchPendingBookings();
        if (payload.eventType === 'INSERT' && payload.new && payload.new.status === 'pending') {
          showRealtimeNotification('Neue vorläufige Raumbuchung erhalten!');
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchLiveStatusData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_requests' }, () => {
        fetchLiveStatusData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notes' }, async () => {
        try {
          const updated = await notesService.fetchSchoolRoomIssues(schoolId);
          setRoomIssues(updated);
        } catch (e) {}
      })
      .subscribe();

    return () => {
      if (crisisTimeout) clearTimeout(crisisTimeout);
      if (dashboardTimeout) clearTimeout(dashboardTimeout);
      supabase.removeChannel(channel);
      window.removeEventListener('refresh-bookings', handleRefresh);
    };
  }, [schoolId]);

  const fetchCrisisNotifications = async () => {
    try {
      let query = supabase
        .from('crisis_notifications')
        .select(`
          id,
          teacher_id,
          student_id,
          slot_start_datetime,
          status,
          notified_at,
          handling_owner,
          student:users!crisis_notifications_student_id_fkey (first_name, last_name, instrument),
          teacher:users!crisis_notifications_teacher_id_fkey (id, first_name, last_name, ausfall_until)
        `)
        .order('slot_start_datetime', { ascending: true });

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;

      if (data) {
        setCrisisNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching crisis notifications:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchLiveStatusData();

    // Visibility-aware heartbeat: real-time websockets handle instant events, heartbeat provides 60s backup
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLiveStatusData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLiveStatusData();
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [schoolId]);

  const fetchAuditLogs = async (limitVal: number = 200) => {
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          changed_by,
          table_name,
          action,
          record_id,
          old_data,
          new_data,
          created_at,
          users (
            first_name,
            last_name
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(limitVal);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'secretary' && secretarySubTab === 'audit') {
      fetchAuditLogs(auditLimit);
    }
  }, [activeTab, secretarySubTab, auditLimit]);

  useEffect(() => {
    if (schoolId && matrixAllocations.length > 0) {
      const draftMap: Record<string, string | null> = {};
      matrixAllocations.forEach(p => {
        draftMap[p.id] = p.roomId;
      });
      localStorage.setItem(`groovelab_matrix_allocations_draft_${schoolId}`, JSON.stringify(draftMap));
    }
  }, [matrixAllocations, schoolId]);

  // Click-away listener to close iPad unassigned popovers when tapping outside
  useEffect(() => {
    const handleDocumentClick = () => {
      setClickedUnassignedDayNum(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const exportAuditLogsToCsv = () => {
    if (auditLogs.length === 0) return;
    const headers = ['Zeitpunkt', 'Aktion', 'Kategorie', 'Betroffener Datensatz', 'Record-ID', 'Geändert von', 'Protokollierte Details'];
    const ignoredKeys = [
      'id', 'created_at', 'school_id', 'password', 'password_hash', 
      'personal_pin', 'parent_pin', 'teacher_qr_token', 'campus_login_token', 
      'groovelab_kiosk_token', 'secret_token', 'joker_used_at', 'weekly_jokers_used',
      'lesson_duration', 'preferred_room_ids', 'planned_boards', 'ausfall_until',
      'age', 'bio', 'gear', 'listening', 'projects', 'bands', 'expertise', 'phone', 'group_id', 'nickname'
    ];

    const rows = auditLogs.map(log => {
      const changer = log.users ? `${log.users.first_name} ${log.users.last_name}` : 'System (Automatik)';
      let targetName = log.table_name === 'users' ? (userMap[log.record_id] || '') : log.table_name;
      if (!targetName && log.new_data) {
        const fn = log.new_data.first_name || '';
        const ln = log.new_data.last_name || '';
        if (fn || ln) targetName = `${fn} ${ln}`.trim();
      }
      if (!targetName) targetName = 'Datensatz';

      let details = '';
      if (log.action === 'UPDATE') {
        details = Object.entries(log.new_data || {})
          .filter(([k]) => !ignoredKeys.includes(k))
          .map(([k, v]) => {
            const oldV = translateValue(k, log.old_data?.[k]);
            const newV = translateValue(k, v);
            if (oldV === newV) return null;
            return `${translateKey(k)}: ${oldV || '(leer)'} -> ${newV || '(gelöscht)'}`;
          })
          .filter(Boolean)
          .join(' | ');
      } else if (log.action === 'INSERT') {
        details = Object.entries(log.new_data || {})
          .filter(([k]) => !ignoredKeys.includes(k))
          .map(([k, v]) => {
            const valStr = translateValue(k, v);
            if (!valStr) return null;
            return `${translateKey(k)}: ${valStr}`;
          })
          .filter(Boolean)
          .join(' | ');
      } else {
        details = Object.entries(log.old_data || {})
          .filter(([k]) => !ignoredKeys.includes(k))
          .map(([k, v]) => {
            const valStr = translateValue(k, v);
            if (!valStr) return null;
            return `${translateKey(k)}: ${valStr}`;
          })
          .filter(Boolean)
          .join(' | ');
      }

      return [
        new Date(log.created_at).toLocaleString('de-DE'),
        log.action === 'INSERT' ? 'Neuanlage' : log.action === 'UPDATE' ? 'Aktualisierung' : 'Löschung',
        log.table_name === 'users' ? 'Benutzer' : log.table_name === 'schools' ? 'Musikschule' : log.table_name,
        targetName,
        log.record_id,
        changer,
        details || 'Keine relevanten Feldänderungen'
      ];
    });
    const sanitizeCsvCell = (val: any) => {
      let s = String(val ?? '');
      if (/^[=+\-@\t\r]/.test(s)) {
        s = "'" + s;
      }
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csvContent = "\uFEFF" + [headers.map(sanitizeCsvCell).join(';'), ...rows.map(e => e.map(sanitizeCsvCell).join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Aenderungsprotokoll_Campus_Groovelab_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const translateKey = (key: string): string => {
    const keyMap: Record<string, string> = {
      role: 'Hauptrolle',
      roles: 'Rollen',
      first_name: 'Vorname',
      last_name: 'Nachname',
      email: 'E-Mail',
      is_active: 'Konto-Status',
      is_campus_active: 'Campus Modul',
      is_groovelab_active: 'GrooveLab Modul',
      is_trial: 'Probezeit-Status',
      trial_ends_at: 'Probezeit-Ende',
      activated_at: 'Aktivierungsdatum',
      ausweis_nummer: 'Mitarbeiter-PIN',
      ausweis_id: 'Ausweis-ID',
      is_app_user: 'App-Nutzung',
      is_premium_user: 'Premium-Status',
      contract_start_date: 'Vertragsstart',
      status: 'Status',
      storage_addon_gb: 'Zusatzspeicher',
      has_campus_subscription: 'Abo Campus',
      has_groovelab_subscription: 'Abo GrooveLab',
      student_billing_option: 'Abrechnungsmodell'
    };
    return keyMap[key] || key;
  };

  const translateValue = (key: string, val: any): string => {
    if (val === null || val === undefined || val === '') return '';
    if (typeof val === 'object' && !Array.isArray(val)) {
      return JSON.stringify(val);
    }
    if (typeof val === 'boolean') {
      if (key.startsWith('is_') && key.endsWith('_active')) {
        return val ? 'Freigeschaltet' : 'Gesperrt';
      }
      if (key === 'is_campus_active' || key === 'is_groovelab_active') {
        return val ? 'Aktiv' : 'Basis';
      }
      if (key === 'has_campus_subscription' || key === 'has_groovelab_subscription') {
        return val ? 'Aktiv' : 'Inaktiv';
      }
      return val ? 'Aktiv' : 'Inaktiv';
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return '';
      return val.map(v => translateValue(key, v)).filter(Boolean).join(', ');
    }
    const valueMap: Record<string, string> = {
      admin: 'Schulleitung (Admin)',
      secretary: 'Schulsekretariat',
      teacher: 'Lehrkraft',
      student: 'Schüler',
      active: 'Aktiv',
      trial: 'Testphase'
    };
    if (typeof val === 'string' && valueMap[val]) {
      return valueMap[val];
    }
    if (typeof val === 'string' && (key === 'photo_url' || key === 'avatar_url')) {
      if (val.includes('campus_login_hero')) return 'Schul-Tafel (Standard)';
      return 'Profilbild hinterlegt';
    }
    if (typeof val === 'string' && key === 'qr_token') {
      return `Generiert (${val.substring(0, 6)}...${val.substring(val.length - 4)})`;
    }
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch (e) {}
    }
    return String(val);
  };

  const renderDiffContent = (log: any) => {
    try {
      const ignoredKeys = [
        'id', 'created_at', 'school_id', 'password', 'password_hash', 
        'personal_pin', 'parent_pin', 'teacher_qr_token', 'campus_login_token', 
        'groovelab_kiosk_token', 'secret_token', 'joker_used_at', 'weekly_jokers_used',
        'lesson_duration', 'preferred_room_ids', 'planned_boards', 'ausfall_until',
        'age', 'bio', 'gear', 'listening', 'projects', 'bands', 'expertise', 'phone', 'group_id', 'nickname'
      ];
      
      if (log.action === 'INSERT') {
        if (!log.new_data) return <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Neuanlage initialisiert</span>;
        
        const validEntries = Object.entries(log.new_data)
          .filter(([key]) => !ignoredKeys.includes(key))
          .map(([key, val]) => ({ key, label: translateKey(key), valStr: translateValue(key, val) }))
          .filter(entry => entry.valStr && entry.valStr.trim() !== '' && entry.valStr !== 'nicht gesetzt' && entry.valStr !== 'keine');

        if (validEntries.length === 0) {
          return <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Datensatz mit Standardwerten initialisiert</span>;
        }

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            {validEntries.map(({ key, label, valStr }) => (
              <div 
                key={key} 
                style={{ 
                  fontSize: '0.72rem', 
                  color: '#1e293b', 
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '3px 8px', 
                  borderRadius: '6px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}
              >
                <span style={{ fontWeight: 700, color: '#64748b' }}>{label}:</span>
                <span style={{ color: '#166534', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  {valStr}
                </span>
              </div>
            ))}
          </div>
        );
      }

      if (log.action === 'DELETE') {
        if (!log.old_data) return <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>Datensatz gelöscht</span>;
        const validEntries = Object.entries(log.old_data)
          .filter(([key]) => !ignoredKeys.includes(key))
          .map(([key, val]) => ({ key, label: translateKey(key), valStr: translateValue(key, val) }))
          .filter(entry => entry.valStr && entry.valStr.trim() !== '' && entry.valStr !== 'nicht gesetzt' && entry.valStr !== 'keine');

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            <span style={{ color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
              Gelöschte Stammdaten:
            </span>
            {validEntries.map(({ key, label, valStr }) => (
              <div key={key} style={{ fontSize: '0.72rem', color: '#64748b', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 6px', borderRadius: '6px', display: 'inline-flex', gap: '4px' }}>
                <span>{label}:</span>
                <span style={{ textDecoration: 'line-through' }}>{valStr}</span>
              </div>
            ))}
          </div>
        );
      }

      if (log.action === 'UPDATE') {
        if (!log.new_data || !log.old_data) return <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Keine Änderungen</span>;
        
        const diffEntries = Object.entries(log.new_data)
          .filter(([key]) => !ignoredKeys.includes(key))
          .map(([key, newVal]: [string, any]) => {
            const oldVal = log.old_data[key];
            const oldValStr = translateValue(key, oldVal);
            const newValStr = translateValue(key, newVal);
            if (oldValStr === newValStr) return null;
            return {
              key,
              label: translateKey(key),
              oldValStr: oldValStr || '(leer)',
              newValStr: newValStr || '(gelöscht)'
            };
          })
          .filter(Boolean) as Array<{ key: string; label: string; oldValStr: string; newValStr: string }>;

        if (diffEntries.length === 0) {
          return <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontStyle: 'italic' }}>System-Aktualisierung (keine sichtbaren Feldänderungen)</span>;
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            {diffEntries.map(({ key, label, oldValStr, newValStr }) => (
              <div key={key} style={{ fontSize: '0.72rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#475569', minWidth: '110px' }}>{label}:</span>
                <span style={{ textDecoration: 'line-through', color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                  {oldValStr}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>➔</span>
                <span style={{ color: '#166534', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '0.7rem' }}>
                  {newValStr}
                </span>
              </div>
            ))}
          </div>
        );
      }
      return '-';
    } catch (err) {
      console.error('Error rendering diff content:', err);
      return <span style={{ color: '#ea4335', fontSize: '0.7rem', fontWeight: 700 }}>Fehler beim Laden der Details</span>;
    }
  };

  const fetchLiveStatusData = async () => {
    try {
      // Fetch active sessions for Live Lab
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select('id, user_id, station_id, check_in_time, check_out_time, users!inner(id, first_name, last_name, instrument, avatar_url, photo_url, school_id), stations(id, name, school_id)')
        .is('check_out_time', null)
        .eq('users.school_id', schoolId);

      if (!sessErr && sessData) {
        const schoolSess = sessData
          .filter((s: any) => {
            const u = Array.isArray(s.users) ? s.users[0] : s.users;
            return u?.school_id === schoolId;
          })
          .map((s: any) => ({
            ...s,
            users: Array.isArray(s.users) ? s.users[0] : s.users,
            stations: Array.isArray(s.stations) ? s.stations[0] : s.stations
          }));
        setActiveSessions(schoolSess);
      }

      // Fetch help requests
      const { data: helpData } = await supabase
        .from('help_requests')
        .select('id, user_id, station_id, message, status, created_at, school_id, users(id, first_name, last_name, instrument)')
        .eq('school_id', schoolId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setHelpRequests(helpData || []);

      // Fetch groovelab tickets
      const { data: ticketsData } = await supabase
        .from('groovelab_tickets')
        .select('id, school_id, title, status, priority, created_at')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (ticketsData) setTickets(ticketsData);

    } catch (err) {
      console.error("Error fetching live status data:", err);
    }
  };

  const handleLogoutStudent = React.useCallback(async (sessionId: string) => {
    if (!window.confirm('Ausloggen?')) return;
    await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', sessionId);
    fetchLiveStatusData();
  }, [schoolId]);

  const showRealtimeNotification = (message: string) => {
    setRealtimeToast({ message, visible: true });
    
    setTimeout(() => {
      setRealtimeToast(prev => ({ ...prev, visible: false }));
    }, 5000);

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Campus Musäk', {
          body: message,
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Campus Musäk', {
              body: message,
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  };

  const fetchPendingBookings = async () => {
    if (!schoolId) return;
    try {
      const { data, error } = await supabase
        .from('room_bookings')
        .select(`
          id,
          room_id,
          date,
          start_time,
          end_time,
          title,
          booked_by,
          rooms:room_id (
            name
          ),
          profiles:users!booked_by (
            first_name,
            last_name
          )
        `)
        .eq('school_id', schoolId)
        .eq('status', 'pending')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setPendingBookings(data || []);
    } catch (err) {
      console.error('Error fetching pending room bookings:', err);
    }
  };

  const handleConfirmBooking = async (id: string) => {
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;
      
      setPendingBookings(prev => prev.filter(b => b.id !== id));
      window.dispatchEvent(new CustomEvent('refresh-bookings'));
      alert('Raumbuchung erfolgreich bestätigt.');
    } catch (err: any) {
      alert('Fehler beim Bestätigen: ' + err.message);
    }
  };

  const handleRejectBooking = async (id: string) => {
    if (!window.confirm('Möchtest du diese vorläufige Raumbuchung wirklich ablehnen und löschen?')) return;
    try {
      const { error } = await supabase
        .from('room_bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setPendingBookings(prev => prev.filter(b => b.id !== id));
      window.dispatchEvent(new CustomEvent('refresh-bookings'));
      alert('Raumbuchung abgelehnt und gelöscht.');
    } catch (err: any) {
      alert('Fehler beim Ablehnen: ' + err.message);
    }
  };

  const fetchLogbookBookings = async () => {
    if (!schoolId) return;
    try {
      const { data, error } = await supabase
        .from('room_bookings')
        .select(`
          id,
          room_id,
          date,
          start_time,
          end_time,
          title,
          booked_by,
          status,
          rooms:room_id (
            id,
            name
          ),
          profiles:booked_by (
            first_name,
            last_name,
            role
          )
        `)
        .eq('school_id', schoolId)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;
      setLogbookBookings(data || []);
    } catch (err: any) {
      console.error('Error fetching logbook bookings:', err);
    }
  };

  const handleUpdateLogbookBooking = async (id: string) => {
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({
          date: editBookingDate,
          start_time: editBookingStartTime.length === 5 ? `${editBookingStartTime}:00` : editBookingStartTime,
          end_time: editBookingEndTime.length === 5 ? `${editBookingEndTime}:00` : editBookingEndTime,
          title: editBookingTitle,
          room_id: editBookingRoomId
        })
        .eq('id', id);

      if (error) throw error;

      alert('Raumbuchung erfolgreich aktualisiert.');
      setEditingLogbookBookingId(null);
      fetchLogbookBookings();
      fetchPendingBookings();
      window.dispatchEvent(new CustomEvent('refresh-bookings'));
    } catch (err: any) {
      alert('Fehler beim Aktualisieren: ' + err.message);
    }
  };

  const handleDeleteLogbookBooking = async (id: string) => {
    if (!window.confirm('Möchtest du diese Raumbuchung wirklich löschen?')) return;
    try {
      const { error } = await supabase
        .from('room_bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Raumbuchung erfolgreich gelöscht.');
      fetchLogbookBookings();
      fetchPendingBookings();
      window.dispatchEvent(new CustomEvent('refresh-bookings'));
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  const handleConfirmLogbookBooking = async (id: string) => {
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) throw error;

      alert('Raumbuchung erfolgreich bestätigt.');
      fetchLogbookBookings();
      fetchPendingBookings();
      window.dispatchEvent(new CustomEvent('refresh-bookings'));
    } catch (err: any) {
      alert('Fehler beim Bestätigen: ' + err.message);
    }
  };

  const fetchTariffBookings = async (overrideSchoolData?: any) => {
    if (!schoolId) return;
    setLoadingTariffBookings(true);
    try {
      const { data, error } = await supabase
        .from('school_tariff_bookings')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setTariffBookings(data);
      } else {
        // Authoritative Baseline Guarantee: If the school has an active contract (is_billing_booked = true),
        // but no booking row exists yet in school_tariff_bookings (e.g. booked prior to migration 346),
        // synthesize the verified initial contract receipt directly from authoritative school records!
        const schoolObj = overrideSchoolData || currentSchoolProfile;
        const booked = schoolObj?.is_billing_booked ?? isBillingBooked;
        if (booked) {
          let sCampus = schoolObj?.has_campus_subscription ?? hasCampusSub;
          let sGroove = schoolObj?.has_groovelab_subscription ?? hasGroovelabSub;
          if (!sCampus && !sGroove) {
            sCampus = true;
            sGroove = true;
          }
          const sBillingOpt = schoolObj?.student_billing_option || studentBillingOption || 'option1';
          const sStorageGb = Number(schoolObj?.storage_addon_gb ?? selectedStorageAddonGb ?? 0);
          const sStorageFee = Number(schoolObj?.storage_addon_monthly_fee ?? selectedStorageAddonFee ?? 0);
          const sStorageStatus = schoolObj?.storage_addon_status || (sStorageGb > 0 ? 'active' : 'none');
          const sDowngradeGb = schoolObj?.storage_pending_downgrade_gb ?? null;
          const sDowngradeDate = schoolObj?.storage_pending_effective_date ?? null;
          const sContractStart = schoolObj?.contract_start_date || '2026-09-01';

          const baseRate = (sCampus && sGroove) ? 19.90 : sCampus ? 14.90 : sGroove ? 9.90 : 19.90;
          const totalNet = baseRate + sStorageFee;
          const schoolHex = (schoolId || '000000').replace(/-/g, '').slice(0, 6).toUpperCase();

          const initialBaselineReceipt = {
            id: `baseline-${schoolId}`,
            school_id: schoolId,
            receipt_number: `TB-${schoolHex}-260901-INIT`,
            booking_type: 'SUBSCRIPTION_BOOKING',
            has_campus_subscription: sCampus,
            has_groovelab_subscription: sGroove,
            student_billing_option: sBillingOpt,
            storage_addon_gb: sStorageGb,
            storage_addon_monthly_fee: sStorageFee,
            storage_addon_status: sStorageStatus,
            storage_pending_downgrade_gb: sDowngradeGb,
            storage_pending_effective_date: sDowngradeDate,
            total_monthly_rate_net: totalNet,
            currency: 'EUR',
            effective_date: sContractStart,
            notes: 'Initialer Schuljahres-Vertragsabschluss 2026/2027 (Campus-Groovelab)',
            booked_by_name: schoolObj?.avv_signee_name || 'Schulleitung',
            created_at: sContractStart ? `${sContractStart}T09:00:00Z` : new Date().toISOString()
          };

          setTariffBookings([initialBaselineReceipt]);

          // Attempt async persistence if table exists
          try {
            await supabase.from('school_tariff_bookings').insert([initialBaselineReceipt]);
          } catch (e) {}
        } else {
          setTariffBookings([]);
        }
      }
    } catch (err) {
      console.error('Error fetching tariff bookings:', err);
    } finally {
      setLoadingTariffBookings(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      fetchPendingBookings();
      fetchTariffBookings();

      // Check B2B AVV legal consent status (Single Source of Truth)
      let hasB2bAvvConsent = false;
      try {
        const { data: consentData, error: consentError } = await supabase
          .from('legal_consents')
          .select('id')
          .eq('school_id', schoolId)
          .eq('consent_type', 'terms_b2b_avv')
          .eq('is_revoked', false)
          .maybeSingle();

        if (!consentError && consentData) {
          hasB2bAvvConsent = true;
        }
      } catch (err) {
        console.error('[Dashboard] Error in B2B AVV legal consent check:', err);
      }

      // Parallelized fetch of school settings, users, student contract statuses, pending students, activation days, and schedules
      const [
        schoolResult,
        usersResult,
        studentsDbResult,
        pendingStudentsResult,
        actDaysResult,
        allSchedsResult
      ] = await Promise.all([
        supabase
          .from('schools')
          .select('id, subdomain, name, logo_url, primary_color, calendar_url, groovelab_kiosk_token, campus_login_token, allow_messages_global, has_campus_subscription, has_groovelab_subscription, is_paused, limits_enabled, user_quota, pending_user_quota, campus_activated_this_month, groovelab_activated_this_month, student_billing_option, zip_code, city, street, house_number, phone_number, email, contract_ends_at, created_at, is_billing_booked, contract_start_date, extra_billing_option, opening_hours, is_trial, trial_ends_at, status, subscription_bypass, school_year_start_month, school_year_start_day, auto_delete_expired_users, custom_price_campus, custom_price_groovelab, custom_price_kombi, custom_price_teacher, custom_price_student, grandfathered_campus_price, grandfathered_groovelab_price, grandfathered_kombi_price, grandfathered_teacher_price, grandfathered_student_price, price_grandfathered_at, avv_signed_at, avv_signee_name, storage_addon_gb, storage_addon_monthly_fee, storage_addon_status, storage_pending_downgrade_gb, storage_pending_effective_date, storage_used_bytes')
          .eq('id', schoolId)
          .single(),
        supabase
          .from('users')
          .select('id, first_name, last_name, role, roles, email, instrument, is_active, ausweis_nummer, teacher_qr_token, is_campus_active, is_groovelab_active, nickname, is_premium_user, contract_ends_at, teacher_id, lesson_duration, qr_token, is_pin_activated, ausfall_until, personal_pin, created_at, preferred_room_ids, planned_boards, student_billing_payment_method, activated_at, student_billing_cash_paid, is_trial, trial_ends_at, exempt_from_direct_billing')
          .eq('school_id', schoolId),
        supabase
          .from('students')
          .select('id, status, onboarding_frozen, onboarding_pin, timetable_assigned_at')
          .eq('school_id', schoolId),
        supabase
          .from('pending_students_decrypted')
          .select('id, school_id, teacher_id, instrument, status, created_at, first_name, last_name, day_of_birth')
          .eq('school_id', schoolId),
        supabase
          .from('activation_days')
          .select('student_id, day_of_birth')
          .eq('school_id', schoolId),
        supabase
          .from('schedules')
          .select('status, teacher_id, student_id')
          .eq('school_id', schoolId)
      ]);

      let rawSchoolData: any = schoolResult.data;
      if (schoolResult.error) {
        console.warn('[SecretaryDashboard] schoolResult query warning, trying fallback select:', schoolResult.error);
        const fallbackRes = await supabase
          .from('schools')
          .select('*')
          .eq('id', schoolId)
          .maybeSingle();
        if (fallbackRes.data) {
          rawSchoolData = fallbackRes.data;
        }
      }
      if (!rawSchoolData) {
        console.warn('[SecretaryDashboard] School record empty, initializing baseline profile for', schoolId);
        rawSchoolData = { id: schoolId, name: 'Meine Musikschule' };
      }
      let schoolData: any = rawSchoolData;
      if (schoolData) {
        const localSignedTimestamp = typeof window !== 'undefined' 
          ? (localStorage.getItem(`groovelab_avv_signed_${schoolId}`) || localStorage.getItem(`groovelab_avv_signed_${schoolData.id}`)) 
          : null;
        if (localSignedTimestamp && !schoolData.avv_signed_at) {
          schoolData.avv_signed_at = localSignedTimestamp;
        }

        let storageAddonGbFromSource = Number(schoolData.storage_addon_gb || schoolData.extra_storage_gb || 0);

        schoolData.storage_addon_gb = storageAddonGbFromSource;
        if (storageAddonGbFromSource > 0) {
          schoolData.storage_addon_status = 'active';
        }

        const storageUsedBytesFromSource = getEffectiveStorageUsedBytes(schoolData);
        schoolData.storage_used_bytes = storageUsedBytesFromSource;

        setCurrentSchoolProfile(schoolData);
        fetchTariffBookings(schoolData);
        setIsAvvSigned(Boolean(schoolData.avv_signed_at || hasB2bAvvConsent || localSignedTimestamp));
        if (storageAddonGbFromSource > 0 && schoolData.storage_addon_status !== 'cancelled') {
          localStorage.setItem('groovelab_storage_addon_active', 'true');
          localStorage.setItem('campus_storage_addon_active', 'true');
          localStorage.setItem('groovelab_storage_addon_gb', String(storageAddonGbFromSource));
          localStorage.setItem('campus_storage_addon_gb', String(storageAddonGbFromSource));
          localStorage.setItem(`groovelab_storage_addon_gb_${schoolId}`, String(storageAddonGbFromSource));
          localStorage.setItem(`campus_storage_addon_gb_${schoolId}`, String(storageAddonGbFromSource));
        }
        setSchoolName(schoolData.name || 'Musäk Bad Säckingen');
        setSchoolStreet(schoolData.street || 'Karl-Fürstenberg-Str.');
        setSchoolHouseNumber(schoolData.house_number || '59');
        setSchoolZipCode(schoolData.zip_code || '79618');
        setSchoolCity(schoolData.city || 'Rheinfelden');
        setSchoolPhoneNumber(schoolData.phone || '');
        setSchoolEmail(schoolData.email || schoolData.contact_email || '');
        setAbsenceEmail(schoolData.absence_email || '');
        setSchoolSubdomain(schoolData.subdomain || '');
        setOpeningHours(schoolData.opening_hours);
        const op = schoolData.opening_hours || {};
        setEnabledCampusSubjects(op.gl_setting_subjects !== false);
        setEnabledCampusRooms(op.gl_setting_rooms !== false);
        setEnabledCampusEvents(op.gl_setting_events !== false);
        setEnabledCampusSchedules(op.gl_setting_schedules !== false);
        setEnabledCalendarWidget(op.gl_setting_calendar_widget !== false);
        setEnabledQrLogin(op.gl_setting_qr_login !== false);
        setTeachersManageStudents(op.gl_setting_groovelab_teachers_manage_students === true);
        setTeachersManageTeachers(op.gl_setting_groovelab_teachers_manage_teachers === true);
        setCampusTeachersManageStudents(op.gl_setting_campus_teachers_manage_students === true);
        setCampusTeachersManageTeachers(op.gl_setting_campus_teachers_manage_teachers === true);

        // Extended Campus Settings
        setCampusHomeworkNotesSync(op.gl_campus_homework_notes_sync !== false);
        setCampusMeisterwerkEnabled(op.gl_campus_meisterwerk_enabled !== false);
        setCampusFocusTimerDefaultMin(Number(op.gl_campus_focus_timer_min || 25));
        setCampusFocusTimerXpFactor(Number(op.gl_campus_focus_timer_xp || 1));
        setCampusLoopstationBarsPause(Number(op.gl_campus_loopstation_bars_pause || 4));
        setCampusAudioMaxSessionMinutes(Number(op.gl_campus_audio_max_min || 10));
        setCampusScheduleSlotMinutes(Number(op.gl_campus_schedule_slot_min || 45));
        setCampusScheduleConflictWarning(op.gl_campus_schedule_conflict_warning !== false);
        setCampusParentAbsenceNotify(op.gl_campus_parent_absence_notify !== false);
        setCampusParentChatEnabled(op.gl_campus_parent_chat_enabled !== false);
        setCampusParentStatsEnabled(op.gl_campus_parent_stats_enabled !== false);
        setCampusKioskPinLength(Number(op.gl_campus_kiosk_pin_length || 4));
        setCampusKioskAutoLogoutMinutes(Number(op.gl_campus_kiosk_auto_logout_min || 5));

        // Extended GrooveLab Settings
        setGlMaxBandMembers(Number(op.gl_max_band_members || 8));
        setGlAllowStudentBandCreation(op.gl_allow_student_band_creation !== false);
        setGlSongLevelStarterEnabled(op.gl_song_level_starter !== false);
        setGlSongLevelProEnabled(op.gl_song_level_pro !== false);
        setGlSongLevelMasterEnabled(op.gl_song_level_master !== false);
        setGlSongProposalWorkflow(op.gl_song_proposal_workflow !== false);
        setGlLiveDefaultBpm(Number(op.gl_live_default_bpm || 120));
        setGlLiveCountInBars(Number(op.gl_live_count_in_bars || 1));
        setGlLiveStageDisplayEnabled(op.gl_live_stage_display_enabled !== false);
        setGlSkillRadarTiming(op.gl_skill_radar_timing !== false);
        setGlSkillRadarTechnique(op.gl_skill_radar_technique !== false);
        setGlSkillRadarSound(op.gl_skill_radar_sound !== false);
        setGlSkillRadarRepertoire(op.gl_skill_radar_repertoire !== false);
        setGlSkillRadarTeamplay(op.gl_skill_radar_teamplay !== false);
        setGlMusicianAvatarsEnabled(op.gl_musician_avatars_enabled !== false);
        setGlBandCoatOfArmsEnabled(op.gl_band_coat_of_arms_enabled !== false);
        setGlBandChatEnabled(op.gl_band_chat_enabled !== false);
        setGlCoachModerationRequired(op.gl_coach_moderation_required === true);
        setGlJamRecordingCompression(op.gl_jam_recording_compression !== false);

        setSchoolEmail(schoolData.email || '');
        setEditColor(schoolData.primary_color || '#1a73e8');
        const dbIsBooked = schoolData.is_billing_booked === true;
        const storedIsBookedStr = typeof window !== 'undefined' ? localStorage.getItem(`isBillingBooked_${schoolId}`) : null;
        const isExplicitlyReset = storedIsBookedStr === 'false';
        const isBooked = !isExplicitlyReset && (dbIsBooked || storedIsBookedStr === 'true');

        setIsSchoolTrial(isBooked ? false : (schoolData.is_trial ?? false));
        setSchoolTrialEndsAt(schoolData.trial_ends_at || null);
        setSchoolStatus(isBooked ? 'active' : (schoolData.status || 'active'));
        setSubscriptionBypass(isSchoolBypassActive(schoolData));

        const storageGbFromDb = Number(schoolData.storage_addon_gb ?? schoolData.extra_storage_gb ?? 0);
        const storageFeeFromDb = Number(schoolData.storage_addon_monthly_fee || 0);
        const storageFeeDefault = (storageGbFromDb === 5 ? 1.49 : storageGbFromDb === 10 ? 1.99 : storageGbFromDb === 20 ? 3.99 : storageGbFromDb === 25 ? 3.99 : storageGbFromDb === 50 ? 6.99 : storageGbFromDb === 100 ? 11.99 : storageGbFromDb === 250 ? 24.99 : 0);
        const effectiveStorageFee = storageFeeFromDb > 0 ? storageFeeFromDb : (storageGbFromDb > 0 ? storageFeeDefault : 0);

        setSelectedStorageAddonGb(storageGbFromDb);
        setSelectedStorageAddonFee(effectiveStorageFee);
        setLogoUrl(schoolData.logo_url || '');
        const rawUrl = schoolData.calendar_url || '';
        setCalendarUrl(rawUrl);
        let parsedUrls: string[] = [];
        try {
          if (rawUrl.startsWith('[')) {
            parsedUrls = JSON.parse(rawUrl);
          } else if (rawUrl) {
            parsedUrls = [rawUrl];
          }
        } catch (e) {
          if (rawUrl) parsedUrls = [rawUrl];
        }
        setCalendarUrls(parsedUrls);
        const loadedKioskPinLength = op.kiosk_pin_length || 4;
        const loadedBypassPin = op.bypass_pin || '1234';
        const loadedLogRetention = op.log_retention || '90';
        const loadedSyncInterval = op.sync_interval || 'daily';
        
        setKioskPinLength(loadedKioskPinLength);
        setBypassPin(loadedBypassPin);
        setLogRetention(loadedLogRetention);
        setSyncInterval(loadedSyncInterval);

        const loadedStartMonth = Number(schoolData.school_year_start_month || op.school_year_start_month || 9);
        const loadedStartDay = Number(schoolData.school_year_start_day || op.school_year_start_day || 1);
        const loadedAutoDelete = Boolean(schoolData.auto_delete_expired_users === true || op.auto_delete_expired_users === true || op.auto_delete_expired_users === 'true');

        setSchoolYearStartMonth(loadedStartMonth);
        setSchoolYearStartDay(loadedStartDay);
        setAutoDeleteExpiredUsers(loadedAutoDelete);

        setInitialSettings({
          schoolName: schoolData.name || '',
          schoolSubdomain: schoolData.subdomain || '',
          schoolZipCode: schoolData.zip_code || '',
          schoolCity: schoolData.city || '',
          schoolStreet: schoolData.street || '',
          schoolHouseNumber: schoolData.house_number || '',
          schoolPhoneNumber: schoolData.phone_number || '',
          schoolEmail: schoolData.email || '',
          absenceEmail: schoolData.absence_email || '',
          logoUrl: schoolData.logo_url || '',
          calendarUrls: parsedUrls,
          kioskPinLength: loadedKioskPinLength,
          bypassPin: loadedBypassPin,
          logRetention: loadedLogRetention,
          syncInterval: loadedSyncInterval,
          schoolYearStartMonth: loadedStartMonth,
          schoolYearStartDay: loadedStartDay,
          autoDeleteExpiredUsers: loadedAutoDelete
        });
        setKioskToken(schoolData.groovelab_kiosk_token || '');
        setCampusToken(schoolData.campus_login_token || '');
        setAllowMessagesGlobal(schoolData.allow_messages_global ?? true);
        const dbCampus = schoolData.has_campus_subscription;
        const dbGroove = schoolData.has_groovelab_subscription;
        let effectiveCampus: boolean;
        let effectiveGroove: boolean;

        if (isBooked) {
          if (dbCampus === true || dbGroove === true) {
            effectiveCampus = Boolean(dbCampus);
            effectiveGroove = Boolean(dbGroove);
          } else {
            const storedCampus = typeof window !== 'undefined' ? localStorage.getItem(`hasCampusSub_${schoolId}`) : null;
            const storedGroove = typeof window !== 'undefined' ? localStorage.getItem(`hasGroovelabSub_${schoolId}`) : null;
            if (storedCampus !== null || storedGroove !== null) {
              effectiveCampus = storedCampus === 'true';
              effectiveGroove = storedGroove === 'true';
            } else {
              // Standard baseline in Campus-Groovelab for booked schools: Kombi-Paket (both active)
              effectiveCampus = true;
              effectiveGroove = true;
            }
          }
        } else {
          effectiveCampus = Boolean(dbCampus);
          effectiveGroove = Boolean(dbGroove);
        }

        setHasCampusSub(effectiveCampus);
        setHasGroovelabSub(effectiveGroove);
        schoolData.has_campus_subscription = effectiveCampus;
        schoolData.has_groovelab_subscription = effectiveGroove;
        if (typeof window !== 'undefined') {
          localStorage.setItem(`hasCampusSub_${schoolId}`, String(effectiveCampus));
          localStorage.setItem(`hasGroovelabSub_${schoolId}`, String(effectiveGroove));
        }

        if (isBooked && (dbCampus === null || dbCampus === undefined || (!dbCampus && !dbGroove))) {
          supabase
            .from('schools')
            .update({
              has_campus_subscription: effectiveCampus,
              has_groovelab_subscription: effectiveGroove
            })
            .eq('id', schoolId)
            .then();
        }

        setCampusActivatedThisMonth(schoolData.campus_activated_this_month ?? false);
        setGroovelabActivatedThisMonth(schoolData.groovelab_activated_this_month ?? false);
        
        const uq = schoolData.user_quota || 150;
        setUserQuota(uq);
        setActiveUserQuota(uq);
        
        // Load cloud-persisted GoBD invoices into local cache (v3)
        if (schoolId) {
          try {
            // Clean legacy unversioned & v3 caches
            Object.keys(localStorage).forEach(k => {
              if (k.startsWith(`campus_gobd_${schoolId}_`) || k.startsWith(`campus_gobd_v3_${schoolId}_`)) {
                localStorage.removeItem(k);
              }
              if (k.startsWith(`campus_gobd_v4_${schoolId}_`)) {
                try {
                  const item = JSON.parse(localStorage.getItem(k) || '{}');
                  if (!item || item.amount === undefined || item.amount === null || item.amount === 0 || isNaN(item.amount)) {
                    localStorage.removeItem(k);
                  }
                } catch (e) {
                  localStorage.removeItem(k);
                }
              }
            });
          } catch (e) {}

          supabase
            .from('invoices')
            .select('id, type, amount, status, billing_date, due_date, items')
            .eq('school_id', schoolId)
            .then(({ data, error }) => {
              if (data && !error) {
                setSchoolInvoices(data);
                if (typeof window !== 'undefined') {
                  data.forEach((inv: any) => {
                  if (inv.items && inv.items.gobd_version === 4) {
                    const snapKey = `campus_gobd_v4_${schoolId}_${inv.id}`;
                    const validAmount = (inv.amount && Number(inv.amount) > 0) ? Number(inv.amount) : (inv.items.amount || undefined);
                    if (validAmount) {
                      const merged = { ...inv.items, amount: validAmount, id: inv.id, status: (inv.status === 'paid' || inv.status === 'Bezahlt') ? 'Bezahlt' : (inv.status || 'Bezahlt') };
                      localStorage.setItem(snapKey, JSON.stringify(merged));
                    }
                  }
                });
              }
            }
          });
        }

        // Calculate bookedExtraUsers from user_quota (anything above 150 is extra)
        const extraFromDb = Math.max(0, uq - 150);
        setBookedExtraUsers(extraFromDb);
        localStorage.setItem(`bookedExtraUsers_${schoolId}`, extraFromDb.toString());

        // Restore contractStartDate from DB contract_start_date or created_at
        if (schoolData.contract_start_date) {
          setContractStartDate(schoolData.contract_start_date);
          localStorage.setItem(`contractStartDate_${schoolId}`, schoolData.contract_start_date);
        } else {
          const simulated = localStorage.getItem(`simulatedContractStartDate_${schoolId}`);
          if (simulated) {
            setContractStartDate(simulated);
            localStorage.setItem(`contractStartDate_${schoolId}`, simulated);
          } else if (schoolData.created_at) {
            setContractStartDate(schoolData.created_at);
            localStorage.setItem(`contractStartDate_${schoolId}`, schoolData.created_at);
          }
        }

        // Restore extraBillingOption
        if (schoolData.extra_billing_option) {
          setExtraBillingOption(schoolData.extra_billing_option);
        }

        // Restore isCancelled and schoolContractEndsAt from DB contract_ends_at
        const dbIsCancelled = !!schoolData.contract_ends_at;
        setSchoolContractEndsAt(schoolData.contract_ends_at || null);
        if (dbIsCancelled) {
          setIsCancelled(true);
          if (typeof window !== 'undefined') localStorage.setItem(`isCancelled_${schoolId}`, 'true');
        } else {
          setIsCancelled(false);
          if (typeof window !== 'undefined') localStorage.removeItem(`isCancelled_${schoolId}`);
        }
        
        if (isBooked) {
          setIsBillingBooked(true);
          setIsSchoolTrial(false);
          setSchoolStatus('active');
          if (typeof window !== 'undefined') {
            localStorage.setItem(`isBillingBooked_${schoolId}`, 'true');
          }
          setHasCampusSub(effectiveCampus);
          setHasGroovelabSub(effectiveGroove);
          const billingOpt = schoolData.student_billing_option || 'option2';
          setStudentBillingOption(billingOpt);
          setBillingPayer((billingOpt === 'option2' || billingOpt === 'option3_2' || billingOpt === 'option3_3') ? 'school' : 'student');
        } else {
          setIsBillingBooked(false);
          if (typeof window !== 'undefined' && storedIsBookedStr !== 'false') {
            localStorage.removeItem(`isBillingBooked_${schoolId}`);
          }
          setHasCampusSub(false);
          setHasGroovelabSub(false);
        }
        
        setPendingUserQuota(schoolData.pending_user_quota);
      }

      let allUsers: any[] = usersResult.data || [];
      if (usersResult.error) {
        console.warn('[SecretaryDashboard] usersResult warning, trying resilient fallback:', usersResult.error);
        try {
          const fallbackUsersRes = await supabase
            .from('users')
            .select('*')
            .eq('school_id', schoolId);
          if (fallbackUsersRes.data && fallbackUsersRes.data.length > 0) {
            allUsers = fallbackUsersRes.data;
          }
        } catch (e) {}
      }

      // Fetch contract statuses for all students
      const { data: studentsDb } = studentsDbResult;

      const statusMap: Record<string, string> = {};
      studentsDb?.forEach(st => {
        statusMap[st.id] = st.status;
      });

      // Fetch pending students (only in anonymized tables)
      const { data: pendingStudents } = pendingStudentsResult;

      // Extrahiere eingefrorene Profile
      const frozenList: any[] = [];
      studentsDb?.forEach(st => {
        if (st.onboarding_frozen) {
          const pending = pendingStudents?.find(p => p.id === st.id);
          const activeUser = allUsers?.find(u => u.id === st.id);
          const first_name = pending?.first_name || activeUser?.first_name || 'Unbekannt';
          const last_name = pending?.last_name || activeUser?.last_name || 'Schüler';
          const instrument = pending?.instrument || activeUser?.instrument || 'Instrument';
          frozenList.push({
            id: st.id,
            first_name,
            last_name,
            instrument,
            timetable_assigned_at: st.timetable_assigned_at
          });
        }
      });
      setFrozenStudents(frozenList);

      // Fetch activation days for student onboarding verification
      const { data: actDays } = actDaysResult;

      const activationDaysMap: Record<string, number> = {};
      if (actDays) {
        actDays.forEach(ad => {
          if (ad.student_id) {
            activationDaysMap[ad.student_id] = ad.day_of_birth;
          }
        });
      }

      // Fetch all schedules for dynamic student counting
      const { data: allScheds } = allSchedsResult;

      const teacherStudentMap: Record<string, Set<string>> = {};
      if (allScheds) {
        allScheds.forEach(s => {
          if (s.status === 'approved' && s.teacher_id && s.student_id) {
            if (!teacherStudentMap[s.teacher_id]) {
              teacherStudentMap[s.teacher_id] = new Set();
            }
            teacherStudentMap[s.teacher_id].add(s.student_id);
          }
        });
      }

      const map: Record<string, string> = {};
      const userInstrumentMap: Record<string, string> = {};
      const coachesList: GrooveLabCoach[] = [];
      const campusTeachersList: any[] = [];
      const bypassList: BypassTeacher[] = [];
      const employeesList: any[] = [];
      const studentsList: any[] = [];
      const teacherInstrumentMap: Record<string, string> = {};

      allUsers?.forEach(u => {
        if (u.role === 'teacher' || (u.roles && u.roles.includes('teacher'))) {
          if (u.instrument) {
            teacherInstrumentMap[u.id] = u.instrument;
          }
        }
      });

      allUsers?.forEach(u => {
        const fullName = `${u.first_name} ${u.last_name}`;
        map[u.id] = fullName;
        userInstrumentMap[u.id] = u.instrument || '';

        const isEmployee = u.role === 'admin' || u.role === 'secretary' ||
          (u.roles && (u.roles.includes('admin') || u.roles.includes('secretary')));
        if (isEmployee) {
          employeesList.push(u);
        }

        if (u.role === 'student') {
          const pendingMatch = pendingStudents?.find(p => p.id === u.id || (p.first_name && u.first_name && p.first_name.toLowerCase().trim() === u.first_name.toLowerCase().trim()));
          const resolvedDay = activationDaysMap[u.id] || (u as any).day_of_birth || pendingMatch?.day_of_birth || (pendingMatch ? activationDaysMap[pendingMatch.id] : null) || 1;
          const hasCreatedPin = Boolean(activationDaysMap[u.id] || (pendingMatch && activationDaysMap[pendingMatch.id]) || (u as any).onboarding_pin || (u as any).pin);
          const isGrooveActive = Boolean(u.is_groovelab_active);
          const resolvedStatus = (hasCreatedPin || isGrooveActive) ? 'aktiv' : (u.status || 'offen');
          const isPending = !hasCreatedPin && !isGrooveActive;

          let resolvedInstrument = u.instrument;
          if (!u.teacher_id) {
            resolvedInstrument = 'Musiker';
          } else if (!resolvedInstrument || resolvedInstrument === 'Musiker' || resolvedInstrument === 'Nicht festgelegt' || resolvedInstrument === 'Instrument') {
            resolvedInstrument = teacherInstrumentMap[u.teacher_id] || 'Musiker';
          }

          studentsList.push({
            ...u,
            instrument: resolvedInstrument,
            isPendingOnboarding: isPending,
            day_of_birth: resolvedDay,
            status: resolvedStatus,
            is_active: isGrooveActive ? true : (u.is_active ?? false),
            is_app_user: isGrooveActive ? true : (u.is_app_user ?? false)
          });
        }
      });

      // Helper for normalized key matching
      const normKey = (f: string, l: string) => `${(f || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '')}_${(l || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '')}`;
      const isTestName = (f: string, l: string) => {
        const fn = (f || '').toLowerCase().trim();
        const full = `${f || ''} ${l || ''}`.toLowerCase().trim();
        return !fn || fn.startsWith('test') || fn.includes('testvorname') || full.includes('ausstehend') || full.includes('onboarding') || full.includes('unbekannt') || full === 'schüler' || full === 'musiker';
      };

      // Merge pending students into student list (avoid duplicates and orphan stubs)
      if (pendingStudents) {
        pendingStudents.forEach(ps => {
          if (!ps) return;
          const rawFName = (ps.first_name || '').trim();
          const rawLName = (ps.last_name || '').trim();
          if (isTestName(rawFName, rawLName)) return;

          const psNormKey = normKey(rawFName, rawLName);
          const userMatch = allUsers?.find(u => u.id === ps.id || (psNormKey !== '_' && normKey(u.first_name, u.last_name) === psNormKey));
          const exists = studentsList.some(s => s.id === ps.id || (psNormKey !== '_' && normKey(s.first_name, s.last_name) === psNormKey));
          if (!exists) {
            const fName = rawFName;
            const lName = rawLName;
            const fullName = `${fName} ${lName}`.trim();
            
            map[ps.id] = fullName;
            userInstrumentMap[ps.id] = ps.instrument || '';

            const isCampusAct = userMatch ? !!userMatch.is_campus_active : ((ps as any).is_campus_active === true);
            const isGrooveAct = userMatch ? !!userMatch.is_groovelab_active : ((ps as any).is_groovelab_active === true);

            const effectiveTeacherId = ps.teacher_id || (userMatch ? userMatch.teacher_id : null);
            let resolvedInstrument = ps.instrument || (userMatch ? userMatch.instrument : null);
            if (!effectiveTeacherId) {
              resolvedInstrument = 'Musiker';
            } else if (!resolvedInstrument || resolvedInstrument === 'Musiker' || resolvedInstrument === 'Nicht festgelegt' || resolvedInstrument === 'Instrument') {
              resolvedInstrument = teacherInstrumentMap[effectiveTeacherId] || 'Musiker';
            }

            studentsList.push({
              id: ps.id,
              school_id: ps.school_id,
              teacher_id: effectiveTeacherId,
              role: 'student',
              first_name: fName,
              last_name: lName,
              email: '',
              instrument: resolvedInstrument,
              is_active: isGrooveAct ? true : false,
              is_app_user: isGrooveAct ? true : false,
              is_campus_active: isCampusAct,
              is_groovelab_active: isGrooveAct,
              status: isGrooveAct ? 'aktiv' : 'inactive',
              isPendingOnboarding: isGrooveAct ? false : true,
              day_of_birth: ps.day_of_birth || null,
              ausweis_nummer: isGrooveAct ? 'GrooveLab Aktiv' : 'Ausstehend (Onboarding)',
              created_at: ps.created_at || new Date().toISOString()
            });
          }
        });
      }

      allUsers?.forEach(u => {
        const isTeacher = u.role === 'teacher' || (Array.isArray(u.roles) && u.roles.includes('teacher'));
        if (isTeacher) {
          const currentStudentCount = studentsList.filter(s => s.teacher_id === u.id).length;
          if (!u.is_active) {
            bypassList.push({
              id: u.id,
              firstName: u.first_name,
              lastName: u.last_name,
              email: u.email || '',
              instrument: u.instrument || '',
              maxStudents: 10,
              ausweisNummer: u.ausweis_nummer || '',
              teacherQrToken: u.teacher_qr_token || '',
              studentCount: currentStudentCount,
              contractEndsAt: u.contract_ends_at || null,
              isCampusActive: u.is_campus_active,
              isGroovelabActive: u.is_groovelab_active,
              isActive: u.is_active ?? false,
              role: u.role,
              roles: u.roles,
              isPinActivated: u.is_pin_activated,
              ausfall_until: u.ausfall_until,
              preferred_room_ids: u.preferred_room_ids || []
            });
          } else {
            if (u.is_groovelab_active) {
              coachesList.push({
                id: u.id,
                firstName: u.first_name,
                lastName: u.last_name,
                email: u.email || '',
                role: u.role,
                roles: u.roles,
                instrument: u.instrument || '',
                isActive: u.is_active ?? true,
                isCampusActive: u.is_campus_active,
                isGroovelabActive: u.is_groovelab_active,
                ausweisNummer: u.ausweis_nummer || '',
                teacherQrToken: u.teacher_qr_token || '',
                studentCount: currentStudentCount,
                contractEndsAt: u.contract_ends_at || null,
                ausfall_until: u.ausfall_until,
                preferred_room_ids: u.preferred_room_ids || [],
                isPinActivated: u.is_pin_activated
              });
            }
            if (u.is_campus_active !== false) {
              campusTeachersList.push({
                id: u.id,
                firstName: u.first_name,
                lastName: u.last_name,
                email: u.email || '',
                role: u.role,
                roles: u.roles,
                instrument: u.instrument || '',
                isCampusActive: u.is_campus_active,
                isGroovelabActive: u.is_groovelab_active,
                isActive: u.is_active ?? true,
                ausweisNummer: u.ausweis_nummer || '',
                teacherQrToken: u.teacher_qr_token || '',
                studentCount: currentStudentCount,
                contractEndsAt: u.contract_ends_at || null,
                ausfall_until: u.ausfall_until,
                preferred_room_ids: u.preferred_room_ids || [],
                isPinActivated: u.is_pin_activated
              });
            }
          }
        }
      });

      setUserMap(map);
      setCoaches(coachesList);
      setCampusTeachers(campusTeachersList);
      setAllTeachers(allUsers?.filter(u => u.role === 'teacher' || (u.roles && u.roles.includes('teacher'))).map(u => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email || '',
        role: u.role,
        roles: u.roles,
        instrument: u.instrument || '',
        isActive: u.is_active ?? true,
        isCampusActive: u.is_campus_active,
        isGroovelabActive: u.is_groovelab_active,
        isPinActivated: u.is_pin_activated
      })) || []);
      setBypassTeachers(bypassList);
      setEmployees(employeesList);
      const deduplicateStudents = (students: any[]): any[] => {
        if (!Array.isArray(students)) return [];
        const seenIds = new Set<string>();
        const studentMap = new Map<string, any>();

        for (const student of students) {
          if (!student) continue;
          if (student.id && seenIds.has(student.id)) continue;

          const fn = (student.first_name || '').trim().toLowerCase();
          const ln = (student.last_name || '').trim().toLowerCase();
          const nameKey = `${fn}_${ln}`;

          if (nameKey !== '_') {
            if (studentMap.has(nameKey)) {
              const existing = studentMap.get(nameKey);
              if (existing.isPendingOnboarding && !student.isPendingOnboarding) {
                if (existing.id) seenIds.delete(existing.id);
                studentMap.set(nameKey, student);
                if (student.id) seenIds.add(student.id);
              }
              continue;
            }
            studentMap.set(nameKey, student);
          } else {
            const fallbackKey = student.id || `anon_${Math.random()}`;
            studentMap.set(fallbackKey, student);
          }

          if (student.id) seenIds.add(student.id);
        }

        return Array.from(studentMap.values());
      };

      const isTestUser = (s: any): boolean => {
        if (!s) return false;
        const fn = (s.first_name || s.firstName || '').trim().toLowerCase();
        const ln = (s.last_name || s.lastName || '').trim().toLowerCase();
        const email = (s.email || '').trim().toLowerCase();
        return (
          fn.startsWith('test') ||
          fn.startsWith('jane') ||
          fn.startsWith('bob') ||
          ln === 't.' ||
          ln === 'test' ||
          email.includes('test')
        );
      };

      const testUsersToPurge = (allUsers || []).filter((u: any) => isTestUser(u));
      if (testUsersToPurge.length > 0) {
        const purgeIds = testUsersToPurge.map((u: any) => u.id).filter(Boolean);
        if (purgeIds.length > 0) {
          Promise.all([
            supabase.from('schedule_occurrences').delete().in('student_id', purgeIds),
            supabase.from('schedules').delete().in('student_id', purgeIds),
            supabase.from('students').delete().in('id', purgeIds),
            supabase.from('users').delete().in('id', purgeIds)
          ]).catch(e => console.error('Error purging test users from DB:', e));
        }
      }

      const cleanStudentsList = studentsList.filter(s => !isTestUser(s));
      setStudents(deduplicateStudents(cleanStudentsList));

      // Fetch logged in user profile details strictly isolated by school_id
      let resolvedProfile: any = null;
      if (userId && userId !== 'master-support-id') {
        const { data: currUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .eq('school_id', schoolId)
          .maybeSingle();
        if (currUser) {
          resolvedProfile = currUser;
          setCurrentUserProfile(currUser);
          const isCurrInEmployees = employeesList.some(e => e.id === currUser.id);
          if (!isCurrInEmployees && (currUser.role === 'admin' || currUser.role === 'secretary' || userRole === 'admin' || userRole === 'secretary' || (currUser.roles && (currUser.roles.includes('admin') || currUser.roles.includes('secretary'))))) {
            employeesList.unshift(currUser);
            setEmployees([...employeesList]);
          }
        }
      }

      // If user profile is not resolved (e.g. ghost mode, first load or orphaned school)
      if (!resolvedProfile) {
        if (employeesList.length > 0) {
          resolvedProfile = employeesList[0];
          setCurrentUserProfile(employeesList[0]);
        } else if (schoolData?.billing_contact_person || schoolData?.name) {
          // Automatic Self-Healing: Provision missing headmaster/admin user from school metadata
          const contactPerson = (schoolData.billing_contact_person || '').trim();
          let fName = 'Schulleitung';
          let lName = '';
          if (contactPerson) {
            const parts = contactPerson.split(' ');
            fName = parts[0] || 'Schulleitung';
            lName = parts.slice(1).join(' ') || '';
          }
          const defaultAdminPin = Math.floor(100000 + Math.random() * 900000).toString();
          const healedAdmin = {
            id: crypto.randomUUID(),
            school_id: schoolId,
            role: 'admin',
            roles: ['admin'],
            first_name: fName,
            last_name: lName,
            email: schoolData.billing_email || schoolData.email || `${fName.toLowerCase()}@campus-groovelab.de`,
            password_hash: defaultAdminPin,
            ausweis_nummer: defaultAdminPin,
            qr_token: crypto.randomUUID(),
            photo_url: '/campus_login_hero.png',
            avatar_url: '/campus_login_hero.png',
            is_campus_active: true,
            is_groovelab_active: true,
            is_active: true,
            is_pin_activated: true,
            created_at: new Date().toISOString()
          };

          // Save to users_raw asynchronously so it is permanently in Supabase
          try {
            await supabase.from('users').insert(healedAdmin);
          } catch (err: any) {
            console.warn('[SecretaryDashboard] Orphaned school auto-heal notice:', err);
          }

          resolvedProfile = healedAdmin;
          setCurrentUserProfile(healedAdmin);
          employeesList.push(healedAdmin);
          setEmployees([...employeesList]);
        }
      }

      // Fetch rooms
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('*')
        .eq('school_id', schoolId);

      // Fetch buildings
      const { data: buildingsData } = await supabase
        .from('buildings')
        .select('*')
        .eq('school_id', schoolId);
      if (buildingsData) setBuildings(buildingsData);

      const mappedRooms = (roomsData || []).map(r => {
        const localBuildingId = (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_building_mappings_${schoolId}`) || '{}');
            return map[r.id] || null;
          } catch { return null; }
        })();
        const localUnsuitable = (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
            return map[r.id] || [];
          } catch { return []; }
        })();
        const localInstruments = (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
            return map[r.id] || [];
          } catch { return []; }
        })();
        const localSonstiges = (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_sonstiges_mappings_${schoolId}`) || '{}');
            return map[r.id] || '';
          } catch { return ''; }
        })();

        return {
          ...r,
          building_id: r.building_id || localBuildingId,
          equipment: r.allowed_instruments || [],
          unsuitable_instruments: r.unsuitable_instruments || localUnsuitable,
          room_instruments: r.room_instruments || localInstruments,
          sonstiges: r.sonstiges || localSonstiges
        };
      });
      mappedRooms.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de-DE', { numeric: true, sensitivity: 'base' }));
      setRooms(mappedRooms);
      if (mappedRooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(mappedRooms[0].id);
      }

      const rMap: Record<string, string> = {};
      mappedRooms.forEach(r => {
        rMap[r.id] = r.name;
      });
      setRoomMap(rMap);

      // Fetch school equipment
      const { data: equipmentData } = await supabase
        .from('school_equipment')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      setSchoolEquipment(equipmentData || []);

      // Fetch stations
      const { data: stationsData } = await supabase
        .from('stations')
        .select('*, rooms!inner(*)')
        .eq('rooms.school_id', schoolId);
      setStations(stationsData || []);

      // Fetch bands for GrooveLab module
      try {
        const { data: bandsData } = await supabase
          .from('bands')
          .select('*')
          .eq('school_id', schoolId);
        setBands(bandsData || []);
      } catch (err) {
        console.warn('Error fetching bands in SecretaryDashboard:', err);
      }

      // Fetch system alerts
      const { data: alertsData, error: alertsErr } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (alertsErr) throw alertsErr;

      const mappedAlerts: SystemAlert[] = (alertsData || []).map(alert => ({
        id: alert.id,
        schoolId: alert.school_id,
        teacherId: alert.teacher_id,
        type: alert.type,
        message: alert.message,
        createdAt: alert.created_at,
        resolved: alert.resolved || false,
        teacherName: map[alert.teacher_id] || 'Unbekannte Lehrkraft'
      }));
      setAlerts(mappedAlerts);

      // Fetch all schedules for this school to build the Room Planner Matrix
      let allSchedulesData: any[] = [];
      try {
        const { data, error: schedErr } = await supabase
          .from('schedules')
          .select('*')
          .eq('school_id', schoolId);
        if (schedErr) throw schedErr;
        allSchedulesData = data || [];
        localStorage.setItem(`groovelab_schedules_cache_${schoolId}`, JSON.stringify(allSchedulesData));
      } catch (err) {
        console.warn('Supabase schedules fetch failed, falling back to local cache:', err);
        const cached = localStorage.getItem(`groovelab_schedules_cache_${schoolId}`);
        if (cached) {
          allSchedulesData = JSON.parse(cached);
        }
      }

      const mappedSchedules = (allSchedulesData || [])
        .filter(s => s.status === 'ready_for_admin_review')
        .map(s => ({
          ...s,
          teacher_name: map[s.teacher_id] || 'Unbekannte Lehrkraft',
          student_name: map[s.student_id] || 'Unbekannter Schüler',
          room_name: s.room_id ? rMap[s.room_id] || 'Unbekannter Raum' : 'Kein Raum'
        }));
      setPendingSchedules(mappedSchedules);

      // Group schedules by teacher_id and day_of_week to build matrixAllocations
      const teacherDays: Record<string, any[]> = {};
      const unsubmittedTeachersMap: Record<string, boolean> = {};

      (allSchedulesData || []).forEach(s => {
        if (s.status === 'rejected') return;
        const key = `${s.teacher_id}_${s.day_of_week}`;
        if (!teacherDays[key]) teacherDays[key] = [];
        teacherDays[key].push(s);
      });

      // Dual-Source Failsafe: Fallback to u.planned_boards / campus_räume / groovelab_räume if schedules table has no entries for teacher
      (allUsers || []).forEach(u => {
        const isTeacher = u.role === 'teacher' || (Array.isArray(u.roles) && u.roles.includes('teacher'));
        if (isTeacher) {
          const rawPlanned = u.planned_boards || (u as any).campus_räume || (u as any).groovelab_räume;
          let loadedDrafts: any[] = [];
          let loadedSubmittedDraftId = '';
          if (rawPlanned && typeof rawPlanned === 'object' && !Array.isArray(rawPlanned) && (rawPlanned as any).drafts) {
            loadedDrafts = (rawPlanned as any).drafts;
            loadedSubmittedDraftId = (rawPlanned as any).submittedDraftId || '';
          } else if (Array.isArray(rawPlanned) && rawPlanned.length > 0) {
            loadedDrafts = [{ id: 'default', name: 'Standard-Entwurf', boards: rawPlanned }];
          } else if (rawPlanned && typeof rawPlanned === 'object' && Array.isArray((rawPlanned as any).boards)) {
            loadedDrafts = [{ id: 'default', name: 'Standard-Entwurf', boards: (rawPlanned as any).boards }];
          }
          
          const hasSchedulesInDb = (allSchedulesData || []).some(s => s.teacher_id === u.id && s.status !== 'rejected');
          const isSubmitted = loadedSubmittedDraftId !== '' || hasSchedulesInDb || (loadedDrafts.length > 0);
          
          if (!isSubmitted) {
            unsubmittedTeachersMap[u.id] = true;
          }

          // Extract boards from planned_boards: if a teacher has a submitted or approved draft, it is authoritative
          if (loadedDrafts.length > 0) {
            const targetDraft = (loadedSubmittedDraftId && loadedDrafts.find(d => d.id === loadedSubmittedDraftId)) || loadedDrafts[0];
            const hasValidBoards = targetDraft && Array.isArray(targetDraft.boards) && targetDraft.boards.some((b: any) => b.students && b.students.length > 0);

            if (hasValidBoards) {
              // Clear any stale database slots for this teacher so the designer draft governs
              for (let d = 1; d <= 7; d++) {
                delete teacherDays[`${u.id}_${d}`];
              }

              targetDraft.boards.forEach((b: any) => {
                if (b.dayOfWeek && b.students && b.students.length > 0) {
                  const key = `${u.id}_${b.dayOfWeek}`;
                  teacherDays[key] = b.students.map((st: any) => ({
                    id: `fallback_${u.id}_${st.id}`,
                    school_id: schoolId,
                    teacher_id: u.id,
                    student_id: st.isBreak ? null : st.id,
                    day_of_week: b.dayOfWeek,
                    time_slot: st.assignedTime || b.startAnchor || '14:00',
                    room_id: b.roomId || null,
                    duration: st.duration || 30,
                    status: (targetDraft as any)?.status || 'ready_for_admin_review',
                    instrument: st.instrument || 'Musiker',
                    student_name: st.isBreak ? 'Pause' : `${st.first_name || ''} ${st.last_name || ''}`.trim() || 'Schüler',
                    isGroup: !!st.isGroup,
                    groupStudents: st.groupStudents || []
                  }));
                }
              });
            }
          }
        }
      });
      setUnsubmittedTeachers(unsubmittedTeachersMap);

      const draftMap = (() => {
        try {
          return JSON.parse(localStorage.getItem(`groovelab_matrix_allocations_draft_${schoolId}`) || '{}');
        } catch { return {}; }
      })();

      const initialAllocations = Object.entries(teacherDays)
        .map(([key, slots]) => {
          const [teacherId, dayOfWeekStr] = key.split('_');
          const dayOfWeek = parseInt(dayOfWeekStr);

          const sortedSlots = [...slots]
            .map(s => ({
              ...s,
              student_name: s.student_name || (s.student_id ? map[s.student_id] || 'Unbekannter Schüler' : 'Pause'),
              student_instrument: s.student_id ? userInstrumentMap[s.student_id] || s.instrument || '' : ''
            }))
            .sort((a, b) => (a.time_slot || '').localeCompare(b.time_slot || ''));
          const startTime = sortedSlots[0]?.time_slot || '14:00';
          
          const addMins = (t: string, m: number) => {
            const [hStr, mStr] = t.split(':');
            let h = parseInt(hStr) || 0;
            let mVal = parseInt(mStr) || 0;
            mVal += m;
            h += Math.floor(mVal / 60);
            mVal = mVal % 60;
            h = h % 24;
            return `${String(h).padStart(2, '0')}:${String(mVal).padStart(2, '0')}`;
          };

          const lastSlot = sortedSlots[sortedSlots.length - 1];
          const endTime = lastSlot ? addMins(lastSlot.time_slot, lastSlot.duration || 45) : '15:00';

          const isPending = sortedSlots.some(s => s.status === 'ready_for_admin_review');
          const dbRoomId = sortedSlots.find(s => s.room_id)?.room_id || null;
          const roomId = draftMap[key] !== undefined ? draftMap[key] : dbRoomId;

          const teacherProfile = campusTeachersList.find(t => t.id === teacherId);
          const teacherName = map[teacherId] || (teacherProfile ? `${teacherProfile.firstName} ${teacherProfile.lastName}` : 'Unbekannte Lehrkraft');
          const instrument = userInstrumentMap[teacherId] || teacherProfile?.instrument || 'Gitarre';

          return {
            id: key,
            teacherId,
            teacherName,
            instrument,
            dayOfWeek,
            startTime,
            endTime,
            roomId: roomId || null,
            status: isPending ? 'pending' : 'approved',
            slots: sortedSlots
          };
        });

      // Generate GrooveLab opening hours blocks as virtual plans for the groovelab teacher
      const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const groovelabBlocks: any[] = [];
      const opHours = schoolData?.opening_hours || {};
      const glRooms = mappedRooms.filter(r => r.is_groovelab_active);
      
      for (let d = 1; d <= 7; d++) {
        const dayKey = dayKeys[d];
        const dayHours = opHours[dayKey];
        if (dayHours && dayHours.active === true) {
          const key = `groovelab_${d}`;
          
          if (glRooms.length > 0) {
            glRooms.forEach(glRoom => {
              const rKey = `${key}_${glRoom.id}`;
              const roomId = draftMap[rKey] !== undefined ? draftMap[rKey] : glRoom.id;
              groovelabBlocks.push({
                id: rKey,
                teacherId: 'groovelab',
                teacherName: 'GrooveLab',
                instrument: 'Plattform',
                dayOfWeek: d,
                startTime: dayHours.start || '14:00',
                endTime: dayHours.end || '18:00',
                roomId,
                status: 'approved',
                slots: []
              });
            });
          } else {
            const roomId = draftMap[key] !== undefined ? draftMap[key] : (dayHours.roomId || null);
            groovelabBlocks.push({
              id: key,
              teacherId: 'groovelab',
              teacherName: 'GrooveLab',
              instrument: 'Plattform',
              dayOfWeek: d,
              startTime: dayHours.start || '14:00',
              endTime: dayHours.end || '18:00',
              roomId,
              status: 'approved',
              slots: []
            });
          }
        }
      }

      setMatrixAllocations([...initialAllocations, ...groovelabBlocks]);

      // Calculate stats
      const activeAlertsCount = mappedAlerts.filter(a => !a.resolved && a.type === 'capacity_overrun').length;
      const inactiveTeachersCount = bypassList.length;


      let draft = 0;
      const readyForReview = mappedSchedules.length;
      let approved = 0;
      if (allScheds) {
        allScheds.forEach(s => {
          if (s.status === 'draft') draft++;
          else if (s.status === 'approved') approved++;
        });
      }

      setBriefingData({
        openCapacityAlerts: activeAlertsCount,
        inactiveTeachers: inactiveTeachersCount,
        schedules: { draft, readyForReview, approved },
        alerts: mappedAlerts.filter(a => !a.resolved).map(a => ({
          id: a.id,
          type: a.type,
          message: schoolData?.allow_messages_global ? a.message : '[SYSTEM: Nachrichten global stummgeschaltet]',
          created_at: a.createdAt
        }))
      });

      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select('*, users!inner(*), stations(*)')
        .is('check_out_time', null)
        .eq('users.school_id', schoolId);

      if (!sessErr && sessData) {
        const schoolSess = sessData
          .filter((s: any) => {
            const u = Array.isArray(s.users) ? s.users[0] : s.users;
            return u?.school_id === schoolId;
          })
          .map((s: any) => ({
            ...s,
            users: Array.isArray(s.users) ? s.users[0] : s.users,
            stations: Array.isArray(s.stations) ? s.stations[0] : s.stations
          }));
        setActiveSessions(schoolSess);
      }

      // Fetch help requests
      const { data: helpData } = await supabase
        .from('help_requests')
        .select('*, users(*)')
        .eq('school_id', schoolId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setHelpRequests(helpData || []);

      // Fetch groovelab tickets
      const { data: ticketsData, error: ticketsErr } = await supabase
        .from('groovelab_tickets')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (!ticketsErr && ticketsData) {
        setTickets(ticketsData);
      }

      // Fetch school room issues & facility defects
      try {
        const fetchedIssues = await notesService.fetchSchoolRoomIssues(schoolId);
        setRoomIssues(fetchedIssues);
      } catch (err) {
        console.warn('Could not fetch room issues:', err);
      }

      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .order('name');
      
      let list = subjectsData || [];
      
      // Deduplicate by name case-insensitively
      const uniqueList: any[] = [];
      const seenNames = new Set();
      for (const sub of list) {
        const nameKey = (sub.name || '').trim().toLowerCase();
        if (!seenNames.has(nameKey)) {
          seenNames.add(nameKey);
          uniqueList.push(sub);
        }
      }
      list = uniqueList;

      const DEFAULT_STANDARD_SUBJECTS = [
        { name: 'Schlagzeug', description: 'Schlagzeug & Percussion', category: 'Allgemein' },
        { name: 'Piano', description: 'Klavier & Tasteninstrumente', category: 'Allgemein' },
        { name: 'Gitarre', description: 'Gitarre & Ukulele', category: 'Allgemein' },
        { name: 'Gesang', description: 'Gesang & Stimmbildung', category: 'Allgemein' },
        { name: 'Geige', description: 'Geige & Streichinstrumente', category: 'Allgemein' },
        { name: 'Querflöte', description: 'Querflöte & Holzbläser', category: 'Allgemein' },
        { name: 'Saxophon', description: 'Saxophon & Blasinstrumente', category: 'Allgemein' },
        { name: 'Bass', description: 'E-Bass & Kontrabass', category: 'Allgemein' },
        { name: 'Keyboard', description: 'Keyboard & Synthesizer', category: 'Allgemein' },
        { name: 'Trompete', description: 'Trompete & Blechbläser', category: 'Allgemein' }
      ];

      const hasInstrumentSubjects = list.some(s => {
        const n = (s.name || '').toLowerCase();
        return n !== 'ohne zuweisung' && n !== 'allgemein' && n !== 'groovelab';
      });

      if (!hasInstrumentSubjects && schoolId) {
        try {
          const toInsert = DEFAULT_STANDARD_SUBJECTS.map(sub => ({
            school_id: schoolId,
            name: sub.name,
            description: sub.description,
            category: sub.category,
            is_active: true
          }));
          const { data: newSubs } = await supabase.from('subjects').insert(toInsert).select();
          if (newSubs && newSubs.length > 0) {
            list.push(...newSubs);
          }
        } catch (e) {
          console.error("Error auto-seeding default subjects:", e);
        }
      }

      const hasOhneZuweisung = list.some(s => (s.name || '').toLowerCase() === 'ohne zuweisung');
      if (!hasOhneZuweisung && schoolId) {
        try {
          const { data: newSub, error: insertErr } = await supabase
            .from('subjects')
            .insert({
              school_id: schoolId,
              name: 'ohne Zuweisung',
              category: 'Allgemein'
            })
            .select('*')
            .single();
          if (!insertErr && newSub) {
            list.push(newSub);
          }
        } catch (e) {
          console.error("Error auto-creating subject:", e);
        }
      }

      const sortedSubjects = list.sort((a, b) => {
        if ((a.name || '').toLowerCase() === 'ohne zuweisung') return -1;
        if ((b.name || '').toLowerCase() === 'ohne zuweisung') return 1;
        return (a.name || '').localeCompare(b.name || '', 'de');
      });
      setSubjects(sortedSubjects);

      // Fetch campus announcements (school events)
      const { data: annData, error: annErr } = await supabase
        .from('campus_announcements')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (!annErr && annData) {
        setSchoolEvents(annData);
      } else {
        setSchoolEvents([]);
      }

      // Auto-delete expired users if enabled
      if (schoolData.auto_delete_expired_users) {
        const expired = studentsList.filter((s: any) => s.contractEndsAt && new Date(s.contractEndsAt).getTime() < Date.now());
        if (expired.length > 0) {
          handleDeleteExpiredStudents(true, studentsList);
        }
      }

      await fetchAnnouncements();
    } catch (err: any) {
      console.error('Error fetching secretary dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setAnnouncementsLoading(true);
      const { data, error } = await supabase
        .from('campus_feedback_requests')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAnnouncementsList(data || []);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const handleUploadAnnouncementAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingAnnouncementAttachment(true);

      // 🛡️ Enterprise Media Security & Anti-Malware Ingestion Validation
      const validation = await validateMediaBlob(file, 'any');
      if (!validation.isValid) {
        alert(validation.reason || 'Sicherheitswarnung: Das Dateiformat ist unzulässig oder enthält bedenkliche Binärstrukturen.');
        setIsUploadingAnnouncementAttachment(false);
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `announcement_${Date.now()}.${fileExt}`;
      const filePath = `feed-attachments/${fileName}`;
      const { error: uploadErr } = await supabase.storage
        .from('campus-assets')
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;
      
      const { data: urlData } = supabase.storage
        .from('campus-assets')
        .getPublicUrl(filePath);
      setNewAnnouncementAttachmentUrl(urlData.publicUrl);
    } catch (err: any) {
      alert('Upload fehlgeschlagen: ' + err.message);
    } finally {
      setIsUploadingAnnouncementAttachment(false);
    }
  };

  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    const nextQuestions = [...newAnnouncementQuestions];
    if (direction === 'up' && idx > 0) {
      const temp = nextQuestions[idx - 1];
      nextQuestions[idx - 1] = nextQuestions[idx];
      nextQuestions[idx] = temp;
    } else if (direction === 'down' && idx < nextQuestions.length - 1) {
      const temp = nextQuestions[idx + 1];
      nextQuestions[idx + 1] = nextQuestions[idx];
      nextQuestions[idx] = temp;
    }
    setNewAnnouncementQuestions(nextQuestions);
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncementTitle.trim()) {
      setApprovalToast({ message: '⚠️ Bitte einen Titel für die Mitteilung eingeben.', type: 'error' });
      setTimeout(() => setApprovalToast(null), 3500);
      return;
    }
    try {
      const currentUserName = currentUserProfile ? `${currentUserProfile.first_name} ${currentUserProfile.last_name}` : 'Verwaltung';
      const currentUserRole = currentUserProfile?.role === 'admin' ? 'Administration' : 'Sekretariat';

      const payload: any = {
        title: newAnnouncementTitle.trim(),
        description: newAnnouncementDescription.trim(),
        questions: newAnnouncementType === 'questionnaire' ? newAnnouncementQuestions : null,
        due_date: newAnnouncementDueDate ? newAnnouncementDueDate + (newAnnouncementDueDate.includes('T') ? '' : 'T23:59:59Z') : null,
        priority: newAnnouncementPriority,
        target_type: newAnnouncementTargetType,
        target_group: newAnnouncementTargetType === 'group' ? newAnnouncementTargetGroup : null,
        target_teacher_id: newAnnouncementTargetType === 'individual' ? newAnnouncementTargetTeacherId : null,
        recurrence: newAnnouncementRecurrence,
        attachment_url: newAnnouncementAttachmentUrl || null,
        is_anonymous: newAnnouncementType === 'questionnaire' ? newAnnouncementIsAnonymous : false
      };

      if (editingAnnouncementId) {
        let { error } = await supabase
          .from('campus_feedback_requests')
          .update(payload)
          .eq('id', editingAnnouncementId);

        if (error && error.message?.includes('is_anonymous')) {
          delete payload.is_anonymous;
          const retry = await supabase
            .from('campus_feedback_requests')
            .update(payload)
            .eq('id', editingAnnouncementId);
          error = retry.error;
        }

        if (error) throw error;
        setApprovalToast({ message: '✅ Mitteilung erfolgreich aktualisiert!', type: 'success' });
        setTimeout(() => setApprovalToast(null), 4000);
        setEditingAnnouncementId(null);
      } else {
        payload.school_id = schoolId;
        payload.created_by_name = currentUserName;
        payload.created_by_role = currentUserRole;

        let { error } = await supabase
          .from('campus_feedback_requests')
          .insert(payload);

        if (error && error.message?.includes('is_anonymous')) {
          delete payload.is_anonymous;
          const retry = await supabase
            .from('campus_feedback_requests')
            .insert(payload);
          error = retry.error;
        }

        if (error) throw error;
        setApprovalToast({ message: '✅ Mitteilung erfolgreich am Infobrett veröffentlicht!', type: 'success' });
        setTimeout(() => setApprovalToast(null), 4000);
      }

      setNewAnnouncementTitle('');
      setNewAnnouncementDescription('');
      setNewAnnouncementType('todo');
      setNewAnnouncementQuestions([]);
      setNewAnnouncementPriority('standard');
      setNewAnnouncementIsAnonymous(false);
      setNewAnnouncementTargetType('all');
      setNewAnnouncementDueDate('');
      setNewAnnouncementRecurrence('none');
      setNewAnnouncementAttachmentUrl('');
      
      fetchAnnouncements();
    } catch (err: any) {
      setApprovalToast({ message: '❌ Speichern fehlgeschlagen: ' + err.message, type: 'error' });
      setTimeout(() => setApprovalToast(null), 5000);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Möchtest du diese Mitteilung wirklich entfernen? Alle Rückmeldungen von Lehrkräften werden ebenfalls gelöscht.')) return;
    try {
      const { error } = await supabase
        .from('campus_feedback_requests')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setApprovalToast({ message: 'Mitteilung gelöscht.', type: 'success' });
      setTimeout(() => setApprovalToast(null), 3000);
      fetchAnnouncements();
    } catch (err: any) {
      alert('Löschen fehlgeschlagen: ' + err.message);
    }
  };

  const fetchAnnouncementStats = async (announcement: any) => {
    try {
      setSelectedAnnouncementForStats(announcement);
      setStatsSearchQuery('');
      setStatsStatusFilter('all');
      setStatsModalTab('status');
      const { data, error } = await supabase
        .from('campus_feedback_responses')
        .select('*')
        .eq('request_id', announcement.id);
      if (error) throw error;
      setAnnouncementResponsesList(data || []);
    } catch (err: any) {
      console.error('Error fetching announcement stats:', err);
    }
  };

  const getAnnouncementTargetedTeachers = (announcement: any) => {
    const allUniqueTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].reduce((acc: any[], t: any) => {
      if (!acc.some(existing => existing.id === t.id)) {
        acc.push(t);
      }
      return acc;
    }, []);

    if (announcement.target_type === 'all') return allUniqueTeachers;
    if (announcement.target_type === 'individual') {
      const found = allUniqueTeachers.find(t => t.id === announcement.target_teacher_id);
      return found ? [found] : [];
    }
    if (announcement.target_type === 'group') {
      return allUniqueTeachers.filter(t => {
        const inst = (t.instrument || '').toLowerCase();
        const targetGrp = (announcement.target_group || '').toLowerCase();
        if (targetGrp === 'guitar') return inst.includes('gitarre') || inst.includes('guitar') || inst.includes('bass');
        if (targetGrp === 'piano') return inst.includes('klavier') || inst.includes('piano') || inst.includes('keyboard') || inst.includes('keys');
        if (targetGrp === 'vocals') return inst.includes('gesang') || inst.includes('vocal') || inst.includes('sing');
        if (targetGrp === 'drums') return inst.includes('schlagzeug') || inst.includes('drum');
        return inst.includes(targetGrp);
      });
    }
    return [];
  };

  const handleSendReminder = async (announcement: any) => {
    if (!announcement) return;
    const targeted = getAnnouncementTargetedTeachers(announcement);
    const pendingTeachers = targeted.filter((t: any) => !announcementResponsesList.some((res: any) => res.teacher_id === t.id));
    
    if (pendingTeachers.length === 0) {
      alert('Alle Lehrkräfte haben diese Mitteilung bereits zur Kenntnis genommen bzw. beantwortet!');
      return;
    }
    
    const confirmSend = confirm(`Möchtest du eine Erinnerung an ${pendingTeachers.length} ausstehende Lehrkräfte senden?`);
    if (!confirmSend) return;
    
    let successCount = 0;
    for (const teacher of pendingTeachers) {
      try {
        const title = 'Mitteilung der Musikschulleitung 📋';
        const message = `Bitte beachten bzw. Rückmeldung geben: "${announcement.title}"`;
        const metadata = { type: 'announcement_reminder', request_id: announcement.id };

        const { data: notification, error: notifErr } = await supabase
          .from('notifications')
          .insert({
            user_id: teacher.id,
            title,
            message,
            metadata
          })
          .select('id')
          .single();

        if (!notifErr && notification) {
          await supabase.functions.invoke('send-push', {
            body: {
              userId: teacher.id,
              title,
              body: message,
              url: '/',
              notificationId: notification.id
            }
          });
        }
        successCount++;
      } catch (err) {
        console.error('Failed to send reminder to', teacher.id, err);
      }
    }
    
    alert(`Erinnerungen erfolgreich an ${successCount} Lehrkräfte gesendet!`);
  };

  const handleExportCSV = (announcement: any) => {
    if (!announcement) return;
    const targeted = getAnnouncementTargetedTeachers(announcement);
    
    let csvContent = '\uFEFF'; // Add BOM for excel support
    const isAnonymous = !!announcement.is_anonymous;
    
    if (announcement.questions && announcement.questions.length > 0) {
      const headers = ['Lehrkraft', 'Status', 'Abgabe-Datum', ...announcement.questions.map((q: any) => typeof q === 'string' ? q : q.text)];
      csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
      
      targeted.forEach((t: any, idx: number) => {
        const response = announcementResponsesList.find(res => res.teacher_id === t.id);
        const hasCompleted = !!response;
        
        let answersObj: Record<string, string> = {};
        if (hasCompleted && response.response_text) {
          try {
            if (response.response_text.startsWith('{')) {
              answersObj = JSON.parse(response.response_text);
            }
          } catch (e) {}
        }
        
        const row = [
          isAnonymous ? `Anonyme Lehrkraft #${idx + 1}` : formatTeacherFullName(t),
          hasCompleted ? 'Bestätigt' : 'Ausstehend',
          hasCompleted ? new Date(response.created_at).toLocaleDateString('de-DE') : '-',
          ...announcement.questions.map((q: any) => {
            const qKey = typeof q === 'string' ? q : q.text;
            if (!hasCompleted) return '-';
            const ans = answersObj[qKey] !== undefined ? answersObj[qKey] : (response.response_text || '');
            return ans;
          })
        ];
        
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
      });
    } else {
      const headers = ['Lehrkraft', 'Status', 'Abgabe-Datum', 'Antwort'];
      csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
      
      targeted.forEach((t: any, idx: number) => {
        const response = announcementResponsesList.find(res => res.teacher_id === t.id);
        const hasCompleted = !!response;
        
        const row = [
          isAnonymous ? `Anonyme Lehrkraft #${idx + 1}` : formatTeacherFullName(t),
          hasCompleted ? 'Bestätigt' : 'Ausstehend',
          hasCompleted ? new Date(response.created_at).toLocaleDateString('de-DE') : '-',
          hasCompleted ? (response.response_text || 'Bestätigt') : '-'
        ];
        
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Mitteilung_${announcement.title.replace(/[^a-zA-Z0-9]/g, '_')}_Auswertung.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      const response = await fetch('/api/groovelab/tickets/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ticketId })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve ticket');
      }
      alert('Schaden erfolgreich behoben.');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Beheben des Schadens: ' + err.message);
    }
  };

  const handleMarkAsNotified = async (notificationId: string) => {
    // Optimistic UI update
    setCrisisNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, status: 'READ', notified_at: new Date().toISOString() } : n)
    );
    try {
      await supabase
        .from('crisis_notifications')
        .update({ status: 'READ' })
        .eq('id', notificationId);
    } catch (err: any) {
      console.error('Error marking notification as notified:', err);
    }
  };

  const handleArchiveCrisisTicket = async (notificationId: string) => {
    // Optimistic UI update
    setCrisisNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, status: 'ARCHIVED' } : n)
    );
    try {
      await supabase
        .from('crisis_notifications')
        .update({ status: 'ARCHIVED' })
        .eq('id', notificationId);
    } catch (err: any) {
      console.error('Error archiving crisis ticket:', err);
    }
  };

  const handleArchiveAllResolvedTickets = async (ticketIds: string[]) => {
    // Optimistic UI update
    setCrisisNotifications(prev =>
      prev.map(n => ticketIds.includes(n.id) ? { ...n, status: 'ARCHIVED' } : n)
    );
    try {
      await supabase
        .from('crisis_notifications')
        .update({ status: 'ARCHIVED' })
        .in('id', ticketIds);
    } catch (err: any) {
      console.error('Error archiving crisis tickets:', err);
    }
  };

  const handleClaimTicket = async (ticketId: string) => {
    // Optimistic UI update
    setCrisisNotifications(prev =>
      prev.map(n => n.id === ticketId ? { ...n, handling_owner: 'secretariat' } : n)
    );
    try {
      const { error } = await supabase.rpc('claim_crisis_ticket_by_secretariat', {
        p_ticket_id: ticketId
      });
      if (error) {
        // Fallback falls RPC nicht deployt
        await supabase
          .from('crisis_notifications')
          .update({ handling_owner: 'secretariat' })
          .eq('id', ticketId);
      }
    } catch (err: any) {
      console.error('Error claiming crisis ticket:', err);
    }
  };


  const handleEndAbsenceOnBehalf = async (teacherId: string, teacherName: string) => {
    try {
      const confirmOk = window.confirm(`Möchten Sie ${teacherName} wirklich als wieder im Dienst verfügbar melden? Alle betroffenen zukünftigen Stunden werden reaktiviert.`);
      if (!confirmOk) return;

      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', teacherId)
        .single();

      if (profileErr || !profile) {
        throw new Error('Lehrerprofil nicht gefunden.');
      }

      // 1. Clear user absence columns (Neutral: Ausfall)
      const { error: userErr } = await supabase
        .from('users')
        .update({ 
          ausfall_until: null,
          ausfall_start: null
        })
        .eq('id', teacherId);

      if (userErr) throw userErr;

      // 2. Fetch weekly schedules
      const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('*')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherId);

      if (schedError) throw schedError;

      // 3. Fetch occurrences
      const { data: occurrences } = await supabase
        .from('schedule_occurrences')
        .select('*')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherId);

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const maxDate = new Date(now);
      maxDate.setDate(maxDate.getDate() + 30); // 30 days window

      const currentDate = new Date(todayStart);
      const scheduleIdsToRestore = new Set<string>();
      const datesToDeleteNotifs: string[] = [];

      while (currentDate <= maxDate) {
        const rawDay = currentDate.getDay();
        const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;
        const daySchedules = (schedules || []).filter(s => s.day_of_week === currentDayOfWeek);

        daySchedules.forEach(sched => {
          const [hours, minutes] = (sched.time_slot || '00:00').split(':').map(Number);
          const startDateTime = new Date(currentDate);
          startDateTime.setHours(hours, minutes, 0, 0);

          if (startDateTime >= now) {
            scheduleIdsToRestore.add(sched.id);
            datesToDeleteNotifs.push(startDateTime.toISOString());
          }
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      const occurrenceIdsToRestore = new Set<string>();
      (occurrences || []).forEach(occ => {
        const startDateTime = new Date(`${occ.date}T${occ.start_time}`);
        if (startDateTime >= now) {
          occurrenceIdsToRestore.add(occ.id);
          datesToDeleteNotifs.push(startDateTime.toISOString());
        }
      });

      // Restore schedules
      if (scheduleIdsToRestore.size > 0) {
        await supabase
          .from('schedules')
          .update({ status: 'approved' })
          .in('id', Array.from(scheduleIdsToRestore))
          .in('status', ['canceled_by_teacher_ausfall', 'teacher_ausfall']);
      }

      // Restore occurrences
      if (occurrenceIdsToRestore.size > 0) {
        await supabase
          .from('schedule_occurrences')
          .update({ status: 'rescheduled_confirmed' })
          .in('id', Array.from(occurrenceIdsToRestore))
          .eq('status', 'cancelled');
      }

      // Re-enable and mark future notifications as reinstated for students instead of deleting them (nur wenn nicht bereits als stattfindend quittiert)
      if (datesToDeleteNotifs.length > 0) {
        await supabase
          .from('crisis_notifications')
          .update({ is_reinstated: true, status: 'UNREAD' })
          .eq('teacher_id', teacherId)
          .in('slot_start_datetime', datesToDeleteNotifs)
          .or('is_reinstated.eq.false,status.neq.READ');
      }

      // Add healthy alert
      const alertMessage = `🟢 WIEDER IM DIENST: Lehrkraft ${teacherName} wurde durch die Disposition wieder als verfügbar gemeldet.`;
      await supabase
        .from('system_alerts')
        .insert({
          school_id: profile.school_id,
          teacher_id: teacherId,
          type: 'Teacher Return Alert',
          message: alertMessage,
          resolved: false
        });

      alert('Erfolgreich als verfügbar gemeldet! Zukünftige Stundenplandaten wurden wieder aktiviert.');
      fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      alert('Fehler bei der Statusaktualisierung: ' + err.message);
    }
  };

  const handleBulkTeacherImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkTxtInput.trim()) {
      alert('Bitte geben Sie Lehrerdaten ein.');
      return;
    }
    
    const lines = bulkTxtInput.split('\n');
    let successCount = 0;
    let failCount = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const parts = trimmed.split(',');
      if (parts.length < 2) {
        failCount++;
        continue;
      }
      
      const namePart = parts[0].trim();
      const email = parts[1].trim();
      const instrument = parts[2]?.trim() || 'Nicht festgelegt';
      const roleText = parts[3]?.trim()?.toLowerCase() || 'teacher';
      
      const nameParts = namePart.split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      if (!firstName || !email) {
        failCount++;
        continue;
      }
      
      try {
        const pin = generateStarterPin(roleText === 'admin' ? 'admin' : 'teacher', true, true);
        const qrToken = generateSecureQrToken();
        const { error } = await supabase
          .from('users')
          .insert({
            school_id: schoolId,
            first_name: firstName,
            last_name: lastName,
            email,
            instrument,
            role: roleText === 'admin' ? 'admin' : 'teacher',
            is_active: true,
            is_groovelab_active: true,
            is_campus_active: true,
            ausweis_nummer: pin,
            teacher_qr_token: qrToken
          });
          
        if (error) throw error;
        successCount++;
      } catch (err) {
        console.error('Bulk import error for line: ' + trimmed, err);
        failCount++;
      }
    }
    
    alert(`Import abgeschlossen. Erfolgreich: ${successCount}, Fehlerhaft: ${failCount}`);
    setBulkTxtInput('');
    fetchDashboardData();
  };

  const handleAdminOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForOverride) return;
    
    try {
      const newFavs: string[] = [];
      if (overrideFavRoom1) newFavs.push(overrideFavRoom1);
      if (overrideFavRoom2) newFavs.push(overrideFavRoom2);

      const updates: any = {
        preferred_room_ids: newFavs
      };
      if (newRoleOverride) {
        updates.role = newRoleOverride;
      }
      if (newPasswordOverride) {
        updates.personal_pin = newPasswordOverride;
      }
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', selectedTeacherForOverride.id);
        
      if (error) throw error;
      
      alert('Lehrkraft-Details und Favoriten-Räume erfolgreich überschrieben.');
      setSelectedTeacherForOverride(null);
      setNewPasswordOverride('');
      setNewRoleOverride('');
      setOverrideFavRoom1('');
      setOverrideFavRoom2('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Überschreiben: ' + err.message);
    }
  };

  const handleToggleHolidayXp = (newValue: boolean) => {
    setHolidayXpActive(newValue);
    localStorage.setItem(`groovelab_holiday_xp_active_${schoolId}`, newValue ? 'true' : 'false');
    alert(`Ferien Bonus XP erfolgreich ${newValue ? 'aktiviert' : 'deaktiviert'}.`);
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      setUpdatingAlertId(alertId);
      const { error } = await supabase
        .from('system_alerts')
        .update({ resolved: true })
        .eq('id', alertId);

      if (error) throw error;
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Aktualisieren: ' + err.message);
    } finally {
      setUpdatingAlertId(null);
    }
  };

  const handleIncreaseLimit = async (teacherId: string, alertId?: string) => {
    try {
      setUpdatingTeacherId(teacherId);
      const { data: userData } = await supabase
        .from('users')
        .select('max_students')
        .eq('id', teacherId)
        .single();

      const currentLimit = userData?.max_students || 10;
      const newLimit = currentLimit + 5;

      const { error: userErr } = await supabase
        .from('users')
        .update({ max_students: newLimit })
        .eq('id', teacherId);

      if (userErr) throw userErr;
      if (alertId) await handleResolveAlert(alertId);

      alert(`Kapazität erfolgreich erweitert. Neues Schüler-Limit: ${newLimit}`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setUpdatingTeacherId(null);
    }
  };

  const handleRegenerateTokens = async () => {
    try {
      setRegeneratingTokens(true);
      const newKioskToken = 'kiosk_' + Math.random().toString(36).substring(2, 15);
      const newCampusToken = 'campus_' + Math.random().toString(36).substring(2, 15);

      const { error } = await supabase
        .from('schools')
        .update({
          groovelab_kiosk_token: newKioskToken,
          campus_login_token: newCampusToken
        })
        .eq('id', schoolId);

      if (error) throw error;
      setKioskToken(newKioskToken);
      setCampusToken(newCampusToken);
      alert('Tokens wurden neu ausgestellt.');
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setRegeneratingTokens(false);
    }
  };

  const handleToggleMessagesGlobal = async (newValue: boolean) => {
    try {
      setAllowMessagesGlobal(newValue);
      const { error } = await supabase
        .from('schools')
        .update({ allow_messages_global: newValue })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      setAllowMessagesGlobal(!newValue);
    }
  };

  const handleToggleCampusSub = async (newValue: boolean) => {
    if (isBillingBooked && !newValue) {
      alert("Dieses Modul ist Teil deiner aktiven Buchung für das Schuljahr 2026/2027 und kann nicht deaktiviert werden.");
      return;
    }
    setHasCampusSub(newValue);
    if (newValue) {
      setCampusActivatedThisMonth(true);
    }
    if (isBillingBooked) {
      try {
        const updateData: any = { has_campus_subscription: newValue };
        if (newValue) updateData.campus_activated_this_month = true;
        await supabase
          .from('schools')
          .update(updateData)
          .eq('id', schoolId);
      } catch (err: any) {
        console.warn("Could not update campus sub:", err);
      }
    }
  };

  const handleToggleGroovelabSub = async (newValue: boolean) => {
    if (isBillingBooked && !newValue) {
      alert("Dieses Modul ist Teil deiner aktiven Buchung für das Schuljahr 2026/2027 und kann nicht deaktiviert werden.");
      return;
    }
    setHasGroovelabSub(newValue);
    if (newValue) {
      setGroovelabActivatedThisMonth(true);
    }
    if (isBillingBooked) {
      try {
        const updateData: any = { has_groovelab_subscription: newValue };
        if (newValue) updateData.groovelab_activated_this_month = true;
        await supabase
          .from('schools')
          .update(updateData)
          .eq('id', schoolId);
      } catch (err: any) {
        console.warn("Could not update groovelab sub:", err);
      }
    }
    if (newValue) {
      // Auto-seed GrooveLab subject if it doesn't exist yet
      const grooveLabExists = subjects.some(s => s.name.toLowerCase() === 'groovelab');
      if (!grooveLabExists) {
        const { error: insertErr } = await supabase
          .from('subjects')
          .insert({
            school_id: schoolId,
            name: 'GrooveLab',
            category: 'Allgemein',
            description: 'Automatisch angelegtes Fach für GrooveLab-Unterricht'
          });
        if (insertErr) {
          console.error('Error seeding GrooveLab subject:', insertErr);
        }
      }
    }
  };

  useEffect(() => {
    const handleSchoolUpdated = (e?: Event) => {
      if (e && 'key' in e) {
        const se = e as StorageEvent;
        // Ignore internal dashboard caches to prevent infinite inter-tab ping-pong loop
        if (!se.key || !['groovelab_school_overrides', 'groovelab_school_settings_sync'].includes(se.key)) {
          return;
        }
      }
      fetchDashboardData();
    };
    window.addEventListener('groovelab_school_updated', handleSchoolUpdated);
    window.addEventListener('storage', handleSchoolUpdated);
    return () => {
      window.removeEventListener('groovelab_school_updated', handleSchoolUpdated);
      window.removeEventListener('storage', handleSchoolUpdated);
    };
  }, [schoolId]);

  const handleUpdateStudentBillingOption = async (option: string) => {
    try {
      setStudentBillingOption(option);
      const { error } = await supabase
        .from('schools')
        .update({ student_billing_option: option })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating student billing option:', err);
    }
  };

  const handleUpdateExtraBillingOption = async (option: string) => {
    try {
      setExtraBillingOption(option);
      const { error } = await supabase
        .from('schools')
        .update({ extra_billing_option: option })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating extra billing option:', err);
    }
  };

  const handleToggleIsPaused = async (newValue: boolean) => {
    try {
      setIsPaused(newValue);
      const { error } = await supabase
        .from('schools')
        .update({ is_paused: newValue })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      setIsPaused(!newValue);
    }
  };

  const handleToggleLimitsEnabled = async (newValue: boolean) => {
    try {
      setLimitsEnabled(newValue);
      const { error } = await supabase
        .from('schools')
        .update({ limits_enabled: newValue })
        .eq('id', schoolId);
      if (error) throw error;
    } catch (err: any) {
      setLimitsEnabled(!newValue);
    }
  };

  const handleSaveQuota = async () => {
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          pending_user_quota: userQuota,
          quota_updated_at: new Date().toISOString()
        })
        .eq('id', schoolId);

      if (error) throw error;
      setPendingUserQuota(userQuota);
      alert(`Erfolgreich! Dein gewünschtes Kontingent von ${userQuota} Usern wurde für den nächsten Monat vorgemerkt und kann bis zum Monatsende geändert werden.`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    }
  };

  const handleAddCalendarUrl = () => {
    if (!newCalendarUrlInput.trim()) return;
    if (!newCalendarUrlInput.startsWith('http://') && !newCalendarUrlInput.startsWith('https://')) {
      alert('Bitte eine gültige URL (beginnend mit http:// oder https://) eingeben.');
      return;
    }
    if (calendarUrls.includes(newCalendarUrlInput.trim())) {
      alert('Dieser Kalender-Feed ist bereits hinzugefügt.');
      return;
    }
    setCalendarUrls([...calendarUrls, newCalendarUrlInput.trim()]);
    setNewCalendarUrlInput('');
  };

  const handleRemoveCalendarUrl = (indexToRemove: number) => {
    setCalendarUrls(calendarUrls.filter((_, idx) => idx !== indexToRemove));
  };

  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleSaveAllSettings = async (customOverrides?: Partial<{ autoDeleteExpiredUsers: boolean; schoolYearStartMonth: number; schoolYearStartDay: number; kioskPinLength: number; bypassPin: string; logRetention: string; syncInterval: string }> | any) => {
    if (!schoolName.trim()) {
      alert('Bitte einen Musikschulnamen eingeben.');
      return;
    }
    setIsSavingSettings(true);
    try {
      const overrides = (customOverrides && typeof customOverrides === 'object' && !('nativeEvent' in customOverrides)) ? customOverrides : undefined;
      const effAutoDelete = overrides?.autoDeleteExpiredUsers !== undefined ? overrides.autoDeleteExpiredUsers : autoDeleteExpiredUsers;
      const effMonth = overrides?.schoolYearStartMonth !== undefined ? overrides.schoolYearStartMonth : schoolYearStartMonth;
      const effDay = overrides?.schoolYearStartDay !== undefined ? overrides.schoolYearStartDay : schoolYearStartDay;
      const effKioskPinLength = overrides?.kioskPinLength !== undefined ? overrides.kioskPinLength : kioskPinLength;
      const effBypassPin = overrides?.bypassPin !== undefined ? overrides.bypassPin : bypassPin;
      const effLogRetention = overrides?.logRetention !== undefined ? overrides.logRetention : logRetention;
      const effSyncInterval = overrides?.syncInterval !== undefined ? overrides.syncInterval : syncInterval;

      const updatedOp = {
        ...(openingHours || {}),
        kiosk_pin_length: effKioskPinLength,
        bypass_pin: effBypassPin,
        log_retention: effLogRetention,
        sync_interval: effSyncInterval,
        school_year_start_month: effMonth,
        school_year_start_day: effDay,
        auto_delete_expired_users: effAutoDelete
      };

      const serializedUrls = JSON.stringify(calendarUrls);

      const updatePayload: any = {
        name: schoolName,
        subdomain: schoolSubdomain || null,
        street: schoolStreet || null,
        house_number: schoolHouseNumber || null,
        zip_code: schoolZipCode || null,
        city: schoolCity || null,
        phone_number: schoolPhoneNumber || null,
        email: schoolEmail || null,
        absence_email: absenceEmail || null,
        logo_url: logoUrl || null,
        calendar_url: serializedUrls || null,
        opening_hours: updatedOp,
        school_year_start_month: effMonth,
        school_year_start_day: effDay,
        auto_delete_expired_users: effAutoDelete
      };

      let { error } = await supabase
        .from('schools')
        .update(updatePayload)
        .eq('id', schoolId);

      if (error) {
        console.warn('[SecretarySettings] Retrying update with opening_hours JSON fallback due to column error:', error);
        const { error: fallbackError } = await supabase
          .from('schools')
          .update({
            name: schoolName,
            subdomain: schoolSubdomain || null,
            street: schoolStreet || null,
            house_number: schoolHouseNumber || null,
            zip_code: schoolZipCode || null,
            city: schoolCity || null,
            phone_number: schoolPhoneNumber || null,
            email: schoolEmail || null,
            absence_email: absenceEmail || null,
            logo_url: logoUrl || null,
            calendar_url: serializedUrls || null,
            opening_hours: updatedOp
          })
          .eq('id', schoolId);
        if (fallbackError) throw fallbackError;
      }

      setOpeningHours(updatedOp);
      setSchoolYearStartMonth(effMonth);
      setSchoolYearStartDay(effDay);
      setAutoDeleteExpiredUsers(effAutoDelete);
      setKioskPinLength(effKioskPinLength);
      setBypassPin(effBypassPin);
      setLogRetention(effLogRetention);
      setSyncInterval(effSyncInterval);

      setInitialSettings({
        schoolName: schoolName || '',
        schoolSubdomain: schoolSubdomain || '',
        schoolZipCode: schoolZipCode || '',
        schoolCity: schoolCity || '',
        schoolStreet: schoolStreet || '',
        schoolHouseNumber: schoolHouseNumber || '',
        schoolPhoneNumber: schoolPhoneNumber || '',
        schoolEmail: schoolEmail || '',
        absenceEmail: absenceEmail || '',
        logoUrl: logoUrl || '',
        calendarUrls: calendarUrls,
        kioskPinLength: effKioskPinLength,
        bypassPin: effBypassPin,
        logRetention: effLogRetention,
        syncInterval: effSyncInterval,
        schoolYearStartMonth: effMonth,
        schoolYearStartDay: effDay,
        autoDeleteExpiredUsers: effAutoDelete
      });

      // Update local storage school profile & groovelab_school_overrides
      try {
        const storedProfile = localStorage.getItem('groovelab_school_profile');
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          parsed.auto_delete_expired_users = effAutoDelete;
          parsed.school_year_start_month = effMonth;
          parsed.school_year_start_day = effDay;
          parsed.opening_hours = updatedOp;
          localStorage.setItem('groovelab_school_profile', JSON.stringify(parsed));
        }
        const overridesStr = localStorage.getItem('groovelab_school_overrides') || '{}';
        const overrides = JSON.parse(overridesStr);
        if (schoolId) {
          overrides[schoolId] = {
            ...(overrides[schoolId] || {}),
            auto_delete_expired_users: effAutoDelete,
            school_year_start_month: effMonth,
            school_year_start_day: effDay,
            opening_hours: updatedOp
          };
          localStorage.setItem('groovelab_school_overrides', JSON.stringify(overrides));
        }
      } catch (e) {
        // ignore
      }

      alert('Einstellungen erfolgreich in der Datenbank gespeichert! 🏢');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const getRemainingMonthsAndPrice = () => {
    const now = new Date();
    const startMonth = Number(schoolYearStartMonth || 9);
    const startDay = Number(schoolYearStartDay || 1);
    const isChf = masterPricing.currency === 'CHF';
    const activeCurrency = isChf ? 'CHF' : 'EUR';
    const rate = studentBillingOption === 'student_full' 
      ? (effectiveSchoolRates.priceStudent || (isChf ? 1.00 : 0.49))
      : (isChf ? 0.80 : 0.40);
    
    const calc = calculateSchoolYearDirectBilling(now, activeCurrency, rate, startMonth, startDay);
    return { 
      monthsCount: calc.remainingPaidMonths, 
      pricePerMonth: calc.monthlyRate, 
      totalPrice: calc.totalAmount,
      periodDescription: calc.periodDescription,
      endMonthName: calc.paidEndMonthName
    };
  };

  const fetchTrialLogs = async () => {
    setTrialLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('school_id', schoolId)
        .eq('table_name', 'users')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const filtered = (data || []).filter((log: any) => {
        if (!log.new_data) return false;
        const isTrialStart = log.new_data.is_trial === true && (!log.old_data || log.old_data.is_trial !== true);
        const isPermanentActivation = log.old_data?.is_trial === true && log.new_data.is_trial === false && log.new_data.is_campus_active !== false;
        
        // Only show student self-initiated trial starts, and staff-initiated permanent activations
        const isStudentTrialStart = isTrialStart && (!log.changed_by || log.changed_by === log.record_id);
        const isStaffActivation = isPermanentActivation && log.changed_by && log.changed_by !== log.record_id;
        
        return isStudentTrialStart || isStaffActivation;
      });
      
      setTrialLogs(filtered);
    } catch (err) {
      console.error('Error fetching trial logs:', err);
    } finally {
      setTrialLogsLoading(false);
    }
  };

  const generateMailtoLink = (student: any) => {
    const { monthsCount, pricePerMonth, totalPrice, periodDescription } = getRemainingMonthsAndPrice();
    const employeeName = currentUserProfile ? `${currentUserProfile.first_name} ${currentUserProfile.last_name || ''}`.trim() : 'Ihre Musikschule';
    const isChf = masterPricing.currency === 'CHF';
    const defaultTemplate = `Liebe Eltern,\n\nihr Kind {student_name} hat die Campus-App der Musikschule aktiviert und nutzt aktuell die 30-tägige kostenlose Probezeit.\n\nUm den Zugang dauerhaft freizuschalten, antworten Sie bitte einfach kurz auf diese E-Mail.\n\nDie Kosten belaufen sich für das restliche Schuljahr auf {months_count} Monate zu je {price_per_month} ${isChf ? 'CHF' : 'EUR'}, insgesamt also {total_price} (Laufzeit: {period_description}, ohne automatische Verlängerung).\n\nHerzliche Grüße\n{employee_name}\n{school_name}`;
    
    let template = openingHours?.campus_settings?.mailto_template || defaultTemplate;
    
    const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
    template = template.replace(/{student_name}/g, studentName);
    template = template.replace(/{months_count}/g, monthsCount.toString());
    template = template.replace(/{price_per_month}/g, isChf ? pricePerMonth.toFixed(2) : pricePerMonth.toFixed(2).replace('.', ','));
    template = template.replace(/{total_price}/g, isChf ? `CHF ${totalPrice.toFixed(2)}` : `${totalPrice.toFixed(2).replace('.', ',')} €`);
    template = template.replace(/{period_description}/g, periodDescription || '');
    template = template.replace(/{employee_name}/g, employeeName);
    template = template.replace(/{school_name}/g, schoolName || 'Ihre Musikschule');
    
    const subject = `Campus-Freischaltung für ${studentName}`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(template)}`;
  };

  const handleConfirmStudentTrial = async (studentId: string) => {
    if (!window.confirm("Möchtest du diesen Schüler dauerhaft für den Campus freischalten (Probezeit beenden)?")) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_trial: false,
          trial_ends_at: null,
          is_campus_active: true
        })
        .eq('id', studentId);
      if (error) throw error;
      alert("Schüler wurde erfolgreich dauerhaft aktiviert!");
      fetchDashboardData();
    } catch (err: any) {
      alert("Fehler bei der Aktivierung: " + err.message);
    }
  };

  const handleDeactivateStudentTrial = async (studentId: string) => {
    if (!window.confirm("Möchtest du die Probezeit dieses Schülers sofort beenden und das Profil auf Basis umstellen?")) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_campus_active: false,
          is_trial: false,
          trial_ends_at: null
        })
        .eq('id', studentId);
      if (error) throw error;
      alert("Probezeit beendet. Schülerprofil ist nun im Basis-Status.");
      fetchDashboardData();
    } catch (err: any) {
      alert("Fehler beim Umstellen auf Basis: " + err.message);
    }
  };
  // [EXTRACTED to SecretaryVerwaltungTab: renderAnnouncementsBoard]


// [EXTRACTED to SecretaryStudentsView]

    const handleLinkProfiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampusStudentId || !selectedGroovelabStudentId) {
      alert('Bitte wähle beide Profile aus.');
      return;
    }
    if (selectedCampusStudentId === selectedGroovelabStudentId) {
      alert('Du kannst nicht dasselbe Profil mit sich selbst verknüpfen.');
      return;
    }

    try {
      setLinkingInProgress(true);

      // 1. Update target Campus profile: set is_groovelab_active to true
      const { error: updateTargetErr } = await supabase
        .from('users')
        .update({ is_groovelab_active: true })
        .eq('id', selectedCampusStudentId);
      if (updateTargetErr) throw updateTargetErr;

      // 2. Re-link sessions
      await supabase
        .from('sessions')
        .update({ user_id: selectedCampusStudentId })
        .eq('user_id', selectedGroovelabStudentId);

      // 3. Re-link band members (if not already member)
      const { data: existingMembers } = await supabase
        .from('band_members')
        .select('band_id')
        .eq('user_id', selectedCampusStudentId);
      const targetBands = new Set(existingMembers?.map(m => m.band_id) || []);

      const { data: oldMemberships } = await supabase
        .from('band_members')
        .select('*')
        .eq('user_id', selectedGroovelabStudentId);

      if (oldMemberships) {
        for (const membership of oldMemberships) {
          if (!targetBands.has(membership.band_id)) {
            // Re-link
            await supabase
              .from('band_members')
              .update({ user_id: selectedCampusStudentId })
              .eq('id', membership.id);
          } else {
            // Already member, delete old membership to avoid duplicates
            await supabase
              .from('band_members')
              .delete()
              .eq('id', membership.id);
          }
        }
      }

      // 4. Re-link band song slots
      await supabase
        .from('band_song_slots')
        .update({ user_id: selectedCampusStudentId })
        .eq('user_id', selectedGroovelabStudentId);

      // 5. Re-link user song skills
      await supabase
        .from('user_song_skills')
        .update({ user_id: selectedCampusStudentId })
        .eq('user_id', selectedGroovelabStudentId);

      // 6. Delete old GrooveLab profile
      const { error: deleteOldErr } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedGroovelabStudentId);
      if (deleteOldErr) throw deleteOldErr;

      // Physically purge assets from Supabase Storage
      await deleteUserStorageAssets([selectedGroovelabStudentId]);

      alert('Die Profile wurden erfolgreich verknüpft! Die GrooveLab-Daten wurden auf das Campus-Profil übertragen.');
      setSelectedCampusStudentId('');
      setSelectedGroovelabStudentId('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler bei der Verknüpfung: ' + err.message);
    } finally {
      setLinkingInProgress(false);
    }
  };

  const handleToggleTeacherGroovelab = async (teacherId: string, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_groovelab_active: !currentVal })
        .eq('id', teacherId);

      if (error) throw error;
      alert(`GrooveLab-Zugang erfolgreich ${!currentVal ? 'aktiviert' : 'deaktiviert'}.`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleScheduleDecision = async (id: string, approve: boolean) => {
    try {
      const nextStatus = approve ? 'approved' : 'draft';
      const { error } = await supabase
        .from('schedules')
        .update({ status: nextStatus })
        .eq('id', id);

      if (error) throw error;
      fetchDashboardData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };


  // ── Equipment State & Handlers ──
  const handleSaveEquipment = async () => {
    if (!equipmentFormName.trim() || !schoolId) return;
    setEquipmentSaving(true);
    try {
      if (editingEquipment) {
        const { error } = await supabase.from('school_equipment').update({
          name: equipmentFormName.trim()
        }).eq('id', editingEquipment.id);
        if (error) throw error;
        setSchoolEquipment(prev => prev.map(e => e.id === editingEquipment.id ? { ...e, name: equipmentFormName.trim() } : e));
      } else {
        const qty = Math.max(1, Math.min(50, equipmentFormQty));
        const inserts = [];
        if (qty === 1) {
          inserts.push({ school_id: schoolId, name: equipmentFormName.trim() });
        } else {
          for (let i = 1; i <= qty; i++) {
            inserts.push({ school_id: schoolId, name: `${equipmentFormName.trim()} #${i}` });
          }
        }

        const { data, error } = await supabase.from('school_equipment').insert(inserts).select();
        if (error) throw error;
        if (data) setSchoolEquipment(prev => [...prev, ...data]);
      }
      setEditingEquipment(null);
      setEquipmentFormName('');
      setEquipmentFormQty(1);
      setTimeout(() => equipmentNameInputRef.current?.focus(), 50);
    } catch (e: any) {
      console.error('Equipment save error:', e);
      alert('Fehler beim Speichern der Ausstattung: ' + e.message);
    } finally {
      setEquipmentSaving(false);
    }
  };

  const handleQtyChange = (newQty: number) => {
    if (newQty < 1) return;
    setEditGroupQty(newQty);
    
    // Adjust editGroupInstancesData
    setEditGroupInstancesData(prev => {
      if (newQty > prev.length) {
        const added = [];
        const base = editGroupName.trim() || 'Instrument';
        const model = editGroupModel.trim() || 'Standard';
        for (let i = prev.length; i < newQty; i++) {
          added.push({
            id: `temp_${Date.now()}_${i}`,
            fullName: `${base} #${i + 1}`,
            baseName: base,
            model,
            linkUrl: editGroupLink.trim(),
            roomId: null,
            roomName: null,
            roomInstIdx: -1
          });
        }
        return [...prev, ...added];
      } else if (newQty < prev.length) {
        return prev.slice(0, newQty);
      }
      return prev;
    });
  };

  const handleSaveEquipmentGroup = async () => {
    if (!schoolId) return;
    setEquipmentSaving(true);
    try {
      // Load global model mapping
      let localModelMap: Record<string, string> = {};
      let localLinkMap: Record<string, string> = {};
      try {
        localModelMap = JSON.parse(localStorage.getItem(`groovelab_instrument_models_${schoolId}`) || '{}');
      } catch {}
      try {
        localLinkMap = JSON.parse(localStorage.getItem(`groovelab_instrument_links_${schoolId}`) || '{}');
      } catch {}

      // 1. Determine deletions
      const originalIds = editingEquipmentGroup.instances.map((i: any) => i.id);
      let idsToDelete: string[] = [];
      if (editGroupCoupled) {
        idsToDelete = originalIds.slice(editGroupQty);
      } else {
        const idsToKeep = editGroupInstancesData.filter(i => !i.id.startsWith('temp_')).map(i => i.id);
        idsToDelete = originalIds.filter((id: string) => !idsToKeep.includes(id));
      }

      // Perform Deletions from DB & State/Rooms
      if (idsToDelete.length > 0) {
        await supabase.from('school_equipment').delete().in('id', idsToDelete);
        for (const delId of idsToDelete) {
          const inst = editingEquipmentGroup.instances.find((i: any) => i.id === delId);
          if (inst && inst.roomId) {
            const targetRoom = rooms.find(r => r.id === inst.roomId);
            if (targetRoom && Array.isArray(targetRoom.room_instruments)) {
              const updatedRoomInsts = targetRoom.room_instruments.filter((_: any, idx: number) => idx !== inst.roomInstIdx);
              setRooms(prev => prev.map(r => r.id === inst.roomId ? { ...r, room_instruments: updatedRoomInsts } : r));
              await supabase.from('rooms').update({ room_instruments: updatedRoomInsts }).eq('id', inst.roomId);
            }
          }
        }
      }

      if (editGroupCoupled) {
        // SCENARIO A: Coupled (all exemplars have the same name and model)
        const newBaseName = editGroupName.trim();
        const newModel = editGroupModel.trim();
        const newLink = editGroupLink.trim();

        for (let idx = 0; idx < editGroupQty; idx++) {
          const newName = editGroupQty > 1 ? `${newBaseName} #${idx + 1}` : newBaseName;

          if (idx < originalIds.length) {
            // Update existing row
            const originalId = originalIds[idx];
            await supabase.from('school_equipment').update({ name: newName }).eq('id', originalId);
            localModelMap[newName] = newModel;
            if (newLink) {
              localLinkMap[newName] = newLink;
            } else {
              delete localLinkMap[newName];
            }

            // Sync with assigned room
            const inst = editingEquipmentGroup.instances.find((i: any) => i.id === originalId);
            if (inst && inst.roomId) {
              const targetRoom = rooms.find(r => r.id === inst.roomId);
              if (targetRoom && Array.isArray(targetRoom.room_instruments)) {
                const updatedRoomInsts = [...targetRoom.room_instruments];
                if (updatedRoomInsts[inst.roomInstIdx]) {
                  updatedRoomInsts[inst.roomInstIdx] = {
                    name: newName,
                    model: newModel
                  };
                }
                setRooms(prev => prev.map(r => r.id === inst.roomId ? { ...r, room_instruments: updatedRoomInsts } : r));
                await supabase.from('rooms').update({ room_instruments: updatedRoomInsts }).eq('id', inst.roomId);
              }
            }
          } else {
            // Insert new row
            await supabase.from('school_equipment').insert({
              school_id: schoolId,
              name: newName
            });
            localModelMap[newName] = newModel;
            if (newLink) {
              localLinkMap[newName] = newLink;
            } else {
              delete localLinkMap[newName];
            }
          }
        }
      } else {
        // SCENARIO B: Decoupled (each exemplar can have a custom name and model)
        for (let idx = 0; idx < editGroupInstancesData.length; idx++) {
          const inst = editGroupInstancesData[idx];
          const name = inst.fullName.trim();
          const model = inst.model.trim();
          const link = inst.linkUrl?.trim() || '';

          if (inst.id.startsWith('temp_')) {
            // Insert new row
            await supabase.from('school_equipment').insert({
              school_id: schoolId,
              name: name
            });
            localModelMap[name] = model;
            if (link) {
              localLinkMap[name] = link;
            } else {
              delete localLinkMap[name];
            }
          } else {
            // Update existing row
            await supabase.from('school_equipment').update({ name: name }).eq('id', inst.id);
            localModelMap[name] = model;
            if (link) {
              localLinkMap[name] = link;
            } else {
              delete localLinkMap[name];
            }

            // Sync with assigned room
            const originalInst = editingEquipmentGroup.instances.find((i: any) => i.id === inst.id);
            if (originalInst && originalInst.roomId) {
              const targetRoom = rooms.find(r => r.id === originalInst.roomId);
              if (targetRoom && Array.isArray(targetRoom.room_instruments)) {
                const updatedRoomInsts = [...targetRoom.room_instruments];
                if (updatedRoomInsts[originalInst.roomInstIdx]) {
                  updatedRoomInsts[originalInst.roomInstIdx] = {
                    name: name,
                    model: model
                  };
                }
                setRooms(prev => prev.map(r => r.id === originalInst.roomId ? { ...r, room_instruments: updatedRoomInsts } : r));
                await supabase.from('rooms').update({ room_instruments: updatedRoomInsts }).eq('id', originalInst.roomId);
              }
            }
          }
        }
      }

      // Save model mapping and links to localStorage
      localStorage.setItem(`groovelab_instrument_models_${schoolId}`, JSON.stringify(localModelMap));
      localStorage.setItem(`groovelab_instrument_links_${schoolId}`, JSON.stringify(localLinkMap));

      // Reload list from Supabase
      const { data: eqData } = await supabase.from('school_equipment').select('*').eq('school_id', schoolId);
      if (eqData) {
        setSchoolEquipment(eqData);
      }

      setEditingEquipmentGroup(null);
    } catch (e: any) {
      console.error('Equipment group save error:', e);
      alert('Fehler beim Speichern der Ausstattung: ' + e.message);
    } finally {
      setEquipmentSaving(false);
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!window.confirm('Ausstattung wirklich löschen? Dieser Eintrag wird auch aus Räumen entfernt, in denen er verwendet wird.')) return;
    try {
      const { error } = await supabase.from('school_equipment').delete().eq('id', id);
      if (error) throw error;
      setSchoolEquipment(prev => prev.filter(e => e.id !== id));
      const { data: roomsData } = await supabase.from('rooms').select('*').eq('school_id', schoolId);
      const localMap = (() => {
        try { return JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}'); }
        catch { return {}; }
      })();
      setRooms((roomsData || []).map(r => ({ 
        ...r, 
        equipment: r.allowed_instruments || [],
        room_instruments: r.room_instruments || localMap[r.id] || []
      })));
    } catch (err: any) {
      console.error('Error deleting equipment:', err);
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  const openEquipmentEditor = (eq?: any) => {
    if (eq) {
      setEditingEquipment(eq);
      setEquipmentFormName(eq.name);
    } else {
      setEditingEquipment(null);
      setEquipmentFormName('');
    }
  };

  const handleDropInstrumentOnRoom = async (instrumentName: string, roomId: string) => {
    const targetRoom = rooms.find(r => r.id === roomId);
    if (!targetRoom) return;

    const currentInsts = Array.isArray(targetRoom.room_instruments) 
      ? targetRoom.room_instruments 
      : (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
            return map[roomId] || [];
          } catch { return []; }
        })();

    const updatedInsts = [...currentInsts, { name: instrumentName, model: 'Standard' }];

    // Update LocalStorage first
    try {
      const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
      map[roomId] = updatedInsts;
      localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(map));
    } catch (err) {
      console.error(err);
    }

    // Update state
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, room_instruments: updatedInsts } : r));

    // Update Supabase
    try {
      const { error } = await supabase.from('rooms').update({
        room_instruments: updatedInsts
      }).eq('id', roomId);

      if (error && error.message.includes("room_instruments")) {
        console.warn("Supabase room_instruments column missing, using local storage fallback.");
      } else if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error("Error saving room instruments:", err);
    }
  };

  const handleRemoveRoomInstrument = async (roomId: string, idxToRemove: number) => {
    const targetRoom = rooms.find(r => r.id === roomId);
    if (!targetRoom) return;

    const currentInsts = Array.isArray(targetRoom.room_instruments) 
      ? targetRoom.room_instruments 
      : (() => {
          try {
            const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
            return map[roomId] || [];
          } catch { return []; }
        })();

    const updatedInsts = currentInsts.filter((_: any, idx: number) => idx !== idxToRemove);

    // Update LocalStorage first
    try {
      const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
      map[roomId] = updatedInsts;
      localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(map));
    } catch (err) {
      console.error(err);
    }

    // Update state
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, room_instruments: updatedInsts } : r));

    // Update Supabase
    try {
      const { error } = await supabase.from('rooms').update({
        room_instruments: updatedInsts
      }).eq('id', roomId);

      if (error && error.message.includes("room_instruments")) {
        console.warn("Supabase room_instruments column missing, using local storage fallback.");
      } else if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error("Error removing room instrument:", err);
    }
  };

  const handleSaveRoomInstrumentEdit = async (name: string, model: string) => {
    if (!editingRoomInstrument) return;
    const { roomId, index } = editingRoomInstrument;

    const targetRoom = rooms.find(r => r.id === roomId);
    if (!targetRoom) return;

    const currentInsts = Array.isArray(targetRoom.room_instruments) 
      ? [...targetRoom.room_instruments]
      : [];

    if (currentInsts[index]) {
      currentInsts[index] = { name: name.trim(), model: model.trim() };
    }

    // Update LocalStorage first
    try {
      const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
      map[roomId] = currentInsts;
      localStorage.setItem(`groovelab_room_instruments_mappings_${schoolId}`, JSON.stringify(map));
    } catch (err) {
      console.error(err);
    }

    // Update state
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, room_instruments: currentInsts } : r));

    // Update Supabase
    try {
      const { error } = await supabase.from('rooms').update({
        room_instruments: currentInsts
      }).eq('id', roomId);

      if (error && error.message.includes("room_instruments")) {
        console.warn("Supabase room_instruments column missing, using local storage fallback.");
      } else if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error("Error saving room instrument edit:", err);
    }

    setEditingRoomInstrument(null);
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'secretary':
        switch (secretarySubTab) {
          case 'briefing': return '📊 Tägliches Briefing & Status';
          case 'crisis': return '🛡️ Operations-Cockpit: Ausfall-Management';
          case 'equipment': return '🎸 Instrumente & Ausstattung';
          case 'employees': return '👥 Mitarbeiterverwaltung';
          case 'licenses': return '💳 Abrechnung & Infrastruktur';
          case 'setup': return '⚙️ Setup & Systemeinstellungen';
          default: return '💼 Verwaltung';
        }
      case 'campus':
        switch (campusSubTab) {
          case 'briefing': return '🎓 Campus-Zentrale';
          case 'onboarding': return 'Lehrer-Onboarding';
          case 'schedules': return 'Stundenpläne';
          case 'status': return 'Einstellungen';
          default: return '🎓 Campus Verwaltung';
        }
      case 'groovelab':
        switch (groovelabSubTab as any) {
          case 'live': return 'Live Lab';
          case 'coaches': return 'Lehrer';
          case 'students': return 'Schüler';
          case 'kiosk': return 'Einstellungen';
          default: return '🎸 GrooveLab Verwaltung';
        }
      default: return '';
    }
  };



  const getTrialDaysRemaining = () => {
    if (!isSchoolTrial || !schoolTrialEndsAt) return 0;
    const diff = new Date(schoolTrialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };
  const trialDaysRemaining = getTrialDaysRemaining();

  const isTrialExpired = !subscriptionBypass && (
    schoolStatus === 'expired' || 
    (isSchoolTrial && schoolTrialEndsAt && new Date(schoolTrialEndsAt).getTime() < Date.now())
  );

  const showBlockedOverlay = isTrialExpired && !(activeTab === 'secretary' && secretarySubTab === 'licenses');

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#1d1d1f',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif',
      overflow: 'hidden'
    }}>
      {showBlockedOverlay && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif"
        }}>
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="blocked-overlay-title"
            style={{
            background: '#ffffff',
            borderRadius: '32px',
            padding: '40px',
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              fontSize: '2rem'
            }}>
              🎸
            </div>
            <div>
              <h2 id="blocked-overlay-title" style={{ margin: '0 0 10px 0', fontSize: '1.5rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: 'Outfit' }}>
                Testphase abgelaufen!
              </h2>
              <p style={{ margin: 0, fontSize: '0.92rem', color: '#475569', lineHeight: 1.5 }}>
                Die 30-tägige Testphase für deine Musikschule <strong>{schoolName}</strong> ist abgelaufen. Um alle Funktionen, Stundenpläne und Schüler-Dashboards weiterhin zu nutzen, schließe bitte den offiziellen Bestellprozess ab.
              </p>
            </div>

            <button
              onClick={() => {
                setActiveTab('secretary');
                setSecretarySubTab('licenses');
              }}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #34a853 0%, #34a853 100%)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 10px 20px rgba(52, 168, 83, 0.18)',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              Jetzt Vertrag abschließen (Bestellprozess)
            </button>
          </div>
        </div>
      )}
      {/* Global CSS injections matching the screenshot design */}
      <style dangerouslySetInnerHTML={{__html: `
        .google-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.40) 100%) !important;
          backdrop-filter: blur(24px) saturate(1.8) !important;
          -webkit-backdrop-filter: blur(24px) saturate(1.8) !important;
          border: 1px solid rgba(255, 255, 255, 0.5) !important;
          border-radius: var(--radius-md);
          padding: 24px;
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          position: relative;
        }
        .google-card:hover {
          transform: translateY(-2px) scale(1.01) !important;
          box-shadow: 0 16px 48px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
        }
        .student-name-hover:hover .student-title-text {
          color: #34a853 !important;
          text-decoration: underline;
        }
        .google-btn-primary {
          background: #d81e05; /* Swiss Red */
          color: #ffffff;
          border: none;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 10px 24px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Plus Jakarta Sans', sans-serif;
          letter-spacing: -0.01em;
        }
        .google-btn-primary:hover {
          background: #b71904;
          box-shadow: 0 4px 12px rgba(216, 30, 5, 0.25);
        }
        .google-btn-secondary {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: var(--glass-blur);
          color: #12141a;
          border: 1px solid rgba(0, 0, 0, 0.1);
          font-weight: 700;
          font-size: 0.85rem;
          padding: 10px 24px;
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .google-btn-secondary:hover {
          background: #ffffff;
          border-color: rgba(0, 0, 0, 0.2);
        }
        .google-sidebar-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 20px;
          border-radius: 9999px;
          border: none;
          font-size: 0.88rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: var(--text-secondary);
          text-align: left;
          box-sizing: border-box;
          margin-bottom: 4px;
          position: relative;
        }
        .google-sidebar-item:hover {
          background: rgba(0, 0, 0, 0.04);
        }
        /* Active states for each tab theme */
        .google-sidebar-item.active.briefing {
          background: rgba(234, 67, 53, 0.08) !important;
          color: #ea4335 !important;
          font-weight: 700;
        }
        .google-sidebar-item.active.briefing .sidebar-icon-circle {
          background: #ea4335 !important;
          color: #ffffff;
        }
        .google-sidebar-item.active.campus {
          background: rgba(52, 168, 83, 0.08) !important;
          color: #34a853 !important;
          font-weight: 700;
        }
        .google-sidebar-item.active.campus .sidebar-icon-circle {
          background: #34a853 !important;
          color: #ffffff;
        }
        .google-sidebar-item.active.groovelab {
          background: rgba(251, 188, 5, 0.12) !important;
          color: #fbbc05 !important;
          font-weight: 700;
        }
        .google-sidebar-item.active.groovelab .sidebar-icon-circle {
          background: #fbbc05 !important;
          color: #ffffff;
        }
        .google-sidebar-item.groovelab-dark {
          color: #a1a1aa !important;
        }
        .google-sidebar-item.groovelab-dark:hover {
          background: rgba(251, 188, 5, 0.08) !important;
          color: #fbbc05 !important;
        }
        .google-sidebar-item.groovelab-dark.active {
          background: rgba(251, 188, 5, 0.15) !important;
          color: #fbbc05 !important;
        }
        .google-sidebar-item.groovelab-dark.active .sidebar-icon-circle {
          background: #fbbc05 !important;
          color: #09090b !important;
        }

        /* Inactive badge style */
        .sidebar-icon-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
          background: transparent;
          color: var(--text-secondary);
        }
        .google-sidebar-item:hover .sidebar-icon-circle {
          background: rgba(0, 0, 0, 0.05);
          color: var(--text-main);
        }

        .ticket-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid var(--border-light);
          transition: background 0.2s;
        }
        @keyframes slideInToast {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .slide-in-toast {
          animation: slideInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* Real-time pending booking push toast notification */}
      {realtimeToast.visible && (
        <div 
          role="status"
          aria-live="polite"
          className="slide-in-toast"
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 99999,
            background: '#ffffff',
            border: '1px solid #fed7aa',
            borderRadius: '16px',
            padding: '16px 20px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '380px'
          }}
        >
          <div style={{ background: '#fff7ed', color: '#ea580c', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DoorOpen size={18} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
              Neue Raumbuchung erhalten
            </span>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              {realtimeToast.message}
            </span>
          </div>
          <button
            type="button"
            aria-label="Benachrichtigung schließen"
            onClick={() => setRealtimeToast(prev => ({ ...prev, visible: false }))}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '1.1rem',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            ✕
          </button>
        </div>
      )}



      {/* LEFT SIDEBAR PANEL - GLASS WITH BLUR */}
      <SecretarySidebar
        activeTab={activeTab}
        secretarySubTab={secretarySubTab}
        setSecretarySubTab={setSecretarySubTab}
        campusSubTab={campusSubTab}
        setCampusSubTab={setCampusSubTab}
        groovelabSubTab={groovelabSubTab}
        setGroovelabSubTab={setGroovelabSubTab}
        hasCampusSub={hasCampusSub}
        enabledCampusSubjects={enabledCampusSubjects}
        enabledCampusRooms={enabledCampusRooms}
        enabledCampusEvents={enabledCampusEvents}
        enabledCampusSchedules={enabledCampusSchedules}
        crisisNotifications={crisisNotifications}
        pendingSchedules={pendingSchedules}
        startTour={startTour}
        currentUserProfile={currentUserProfile}
        setShowOwnQrModal={setShowOwnQrModal}
        onLogout={onLogout}
        handleSecretaryLogout={handleSecretaryLogout}
      />

      {/* RIGHT CONTENT PANE */}
      <div style={{
        flex: 1,
        height: '100vh',
        boxSizing: 'border-box',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        color: '#1d1d1f',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        paddingBottom: windowWidth < 1024 ? '90px' : '0px'
      }}>
        
        {/* Top Header & Banners */}
        <SecretaryHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isBillingBooked={isBillingBooked}
          hasCampusSub={hasCampusSub}
          hasGroovelabSub={hasGroovelabSub}
          schoolName={schoolName}
          schoolId={schoolId}
          currentUserProfile={currentUserProfile}
          windowWidth={windowWidth}
          showDateSimulation={showDateSimulation}
          simulatedToday={simulatedToday}
          setSimulatedToday={setSimulatedToday}
          isCurrentUserTeacher={isCurrentUserTeacher}
          onRoleSwitched={onRoleSwitched}
          showDualRoleNotice={showDualRoleNotice}
          setShowDualRoleNotice={setShowDualRoleNotice}
          isSchoolTrial={isSchoolTrial}
          schoolTrialEndsAt={schoolTrialEndsAt}
          schoolStatus={schoolStatus}
          trialDaysRemaining={trialDaysRemaining}
          subscriptionBypass={subscriptionBypass}
          dunningStatus={dunningStatus}
          setShowDunningPayModal={setShowDunningPayModal}
          secretarySubTab={secretarySubTab}
          setSecretarySubTab={setSecretarySubTab}
        />

        {/* Main scrollable body content */}
        <div id="secretary-main-scroll-container" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'scroll', scrollbarGutter: 'stable' }}>

          {/* Active Tab Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {activeTab !== 'groovelab' && !((activeTab as any) === 'campus') && !((activeTab as any) === 'campus' && (campusSubTab === 'onboarding' || campusSubTab === 'schedules')) && !(activeTab === 'secretary' && (secretarySubTab === 'crisis' || secretarySubTab === 'rooms' || secretarySubTab === 'briefing' || secretarySubTab === 'duties' || secretarySubTab === 'announcements' || secretarySubTab === 'audit' || secretarySubTab === 'equipment' || secretarySubTab === 'employees' || secretarySubTab === 'licenses' || secretarySubTab === 'setup')) && (
                <>
                  <h2 className="swiss-h1" style={{ margin: 0, color: (activeTab as any) === 'campus' ? '#34a853' : '#f59e0b' }}>
                    {getTabTitle()}
                  </h2>
                  <p style={{ color: (activeTab as any) === 'campus' ? '#64748b' : '#a1a1aa', fontWeight: 500, fontSize: '0.85rem', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {currentUserProfile 
                      ? `${currentUserProfile.first_name} ${currentUserProfile.last_name || ''} • Schulsekretariat` 
                      : 'Schulsekretariat'
                    }
                  </p>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            </div>
          </div>

        {/* TAB 1: SECRETARY - VERWALTUNG & GOVERNANCE (EXTRACTED TO SecretaryVerwaltungTab) */}
        {activeTab === 'secretary' && (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Verwaltung...</div>}>
            <SecretaryVerwaltungTab
              secretarySubTab={secretarySubTab}
              setSecretarySubTab={setSecretarySubTab}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              campusSubTab={campusSubTab}
              setCampusSubTab={setCampusSubTab}
              schoolId={schoolId}
              schoolNumericId={schoolNumericId}
              schoolName={schoolName}
              schoolStreet={schoolStreet}
              setSchoolStreet={setSchoolStreet}
              schoolHouseNumber={schoolHouseNumber}
              setSchoolHouseNumber={setSchoolHouseNumber}
              schoolZipCode={schoolZipCode}
              setSchoolZipCode={setSchoolZipCode}
              schoolCity={schoolCity}
              setSchoolCity={setSchoolCity}
              schoolSubdomain={schoolSubdomain}
              setSchoolSubdomain={setSchoolSubdomain}
              schoolPhoneNumber={schoolPhoneNumber}
              setSchoolPhoneNumber={setSchoolPhoneNumber}
              schoolEmail={schoolEmail}
              setSchoolEmail={setSchoolEmail}
              absenceEmail={absenceEmail}
              setAbsenceEmail={setAbsenceEmail}
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              setSchoolName={setSchoolName}
              currentSchoolProfile={currentSchoolProfile}
              setCurrentSchoolProfile={setCurrentSchoolProfile}
              currentUserProfile={currentUserProfile}
              userId={userId}
              supabase={supabase}
              windowWidth={windowWidth}
              fetchDashboardData={fetchDashboardData}
              rooms={rooms}
              setRooms={setRooms}
              buildings={buildings}
              setBuildings={setBuildings}
              matrixAllocations={matrixAllocations}
              roomSearchQuery={roomSearchQuery}
              setRoomSearchQuery={setRoomSearchQuery}
              selectedDayPlan={selectedDayPlan}
              setSelectedDayPlan={setSelectedDayPlan}
              roomsSubView={roomsSubView}
              setRoomsSubView={setRoomsSubView}
              schedulesRoomsViewMode={schedulesRoomsViewMode}
              setSchedulesRoomsViewMode={setSchedulesRoomsViewMode}
              roomIssues={roomIssues}
              setRoomIssues={setRoomIssues}
              onOpenFacilityLogModal={() => setShowFacilityLogModal(true)}
              pendingBookings={pendingBookings}
              setPendingBookings={setPendingBookings}
              pendingSchedules={pendingSchedules}
              handleConfirmBooking={handleConfirmBooking}
              handleRejectBooking={handleRejectBooking}
              parseRoomName={parseRoomName}
              getFloorColor={getFloorColor}
              getAlphabeticalColor={getAlphabeticalColor}
              formatInstrumentName={formatInstrumentName}
              getAlphabeticalUniColor={getAlphabeticalUniColor}
              checkTimeOverlap={checkTimeOverlap}
              getPlanDisplayName={getPlanDisplayName}
              campusTeachers={campusTeachers}
              bypassTeachers={bypassTeachers}
              coaches={coaches}
              allTeachers={allTeachers}
              employees={employees}
              setEmployees={setEmployees}
              revealedPins={revealedPins}
              setRevealedPins={setRevealedPins}
              employeeFirstName={employeeFirstName}
              setEmployeeFirstName={setEmployeeFirstName}
              employeeLastName={employeeLastName}
              setEmployeeLastName={setEmployeeLastName}
              employeeSearchQuery={employeeSearchQuery}
              setEmployeeSearchQuery={setEmployeeSearchQuery}
              employeeStatusTab={employeeStatusTab}
              setEmployeeStatusTab={setEmployeeStatusTab}
              employeeFilterRole={employeeFilterRole}
              setEmployeeFilterRole={setEmployeeFilterRole}
              isEmployeeCsvExpanded={isEmployeeCsvExpanded}
              setIsEmployeeCsvExpanded={setIsEmployeeCsvExpanded}
              employeeCsvText={employeeCsvText}
              setEmployeeCsvText={setEmployeeCsvText}
              showAddEmployeeModal={showAddEmployeeModal}
              setShowAddEmployeeModal={setShowAddEmployeeModal}
              dragHoveredEmployeeRole={dragHoveredEmployeeRole}
              setDragHoveredEmployeeRole={setDragHoveredEmployeeRole}
              employeeFilterRoleFocused={employeeFilterRoleFocused}
              setEmployeeFilterRoleFocused={setEmployeeFilterRoleFocused}
              employeeStatusTabFocused={employeeStatusTabFocused}
              setEmployeeStatusTabFocused={setEmployeeStatusTabFocused}
              employeeSearchFocused={employeeSearchFocused}
              setEmployeeSearchFocused={setEmployeeSearchFocused}
              handleCreateEmployee={handleCreateEmployee}
              handleDeleteUser={handleDeleteUser}
              handleImportEmployees={handleImportEmployees}
              handleToggleRole={handleToggleRole}
              handleUpdateEmployeeRole={handleUpdateEmployeeRole}
              expandedSidebarTeacherId={expandedSidebarTeacherId}
              setExpandedSidebarTeacherId={setExpandedSidebarTeacherId}
              selectedFilterTeacherId={selectedFilterTeacherId}
              setSelectedFilterTeacherId={setSelectedFilterTeacherId}
              students={students}
              userMap={userMap}
              roomMap={roomMap}
              isAvvSigned={isAvvSigned}
              setShowAvvModal={setShowAvvModal}
              showLogbookModal={showLogbookModal}
              setShowLogbookModal={setShowLogbookModal}
              showStorageManagerModal={showStorageManagerModal}
              setShowStorageManagerModal={setShowStorageManagerModal}
              dismissedInvoiceAlert={dismissedInvoiceAlert}
              setDismissedInvoiceAlert={setDismissedInvoiceAlert}
              selectedInvoice={selectedInvoice}
              setSelectedInvoice={setSelectedInvoice}
              contractStartDate={contractStartDate}
              simulatedToday={simulatedToday}
              studentLevyMonthly_global={studentLevyMonthly_global}
              extraLevyMonthly_global={extraLevyMonthly_global}
              studentSharePreview_global={studentSharePreview_global}
              schoolShareBookedExtra_global={schoolShareBookedExtra_global}
              currentTotalB2B_global={currentTotalB2B_global}
              mixedTotal_global={mixedTotal_global}
              fetchLogbookBookings={fetchLogbookBookings}
              getEffectiveStorageUsedBytes={getEffectiveStorageUsedBytes}
              crisisNotifications={crisisNotifications}
              crisisTabMode={crisisTabMode}
              setCrisisTabMode={setCrisisTabMode}
              selectedCrisisTeacherId={selectedCrisisTeacherId}
              setSelectedCrisisTeacherId={setSelectedCrisisTeacherId}
              handleMarkAsNotified={handleMarkAsNotified}
              handleClaimTicket={handleClaimTicket}
              handleArchiveCrisisTicket={handleArchiveCrisisTicket}
              handleArchiveAllResolvedTickets={handleArchiveAllResolvedTickets}
              handleEndAbsenceOnBehalf={handleEndAbsenceOnBehalf}
              expandedLiveDayStr={expandedLiveDayStr}
              setExpandedLiveDayStr={setExpandedLiveDayStr}
              selectedArchiveLog={selectedArchiveLog}
              setSelectedArchiveLog={setSelectedArchiveLog}
              activeStudentsCount_global={activeStudentsCount_global}
              activeGroovelabStudentsCount_global={activeGroovelabStudentsCount_global}
              passiveStudentsCount_global={passiveStudentsCount_global}
              billableTeachersCount={billableTeachersCount}
              teacherServiceFeeTotal_global={teacherServiceFeeTotal_global}
              moduleCost_global={moduleCost_global}
              storageAddonFee_global={storageAddonFee_global}
              baseB2B_global={baseB2B_global}
              masterRates={masterRates}
              effectiveSchoolRates={effectiveSchoolRates}
              masterPricing={masterPricing}
              isSammelzahler={isSammelzahler}
              fetchTariffBookings={fetchTariffBookings}
              hasCampusSub={hasCampusSub}
              setHasCampusSub={setHasCampusSub}
              hasGroovelabSub={hasGroovelabSub}
              setHasGroovelabSub={setHasGroovelabSub}
              campusActivatedThisMonth={campusActivatedThisMonth}
              setCampusActivatedThisMonth={setCampusActivatedThisMonth}
              groovelabActivatedThisMonth={groovelabActivatedThisMonth}
              setGroovelabActivatedThisMonth={setGroovelabActivatedThisMonth}
              handleToggleCampusSub={handleToggleCampusSub}
              handleToggleGroovelabSub={handleToggleGroovelabSub}
              studentBillingOption={studentBillingOption}
              setStudentBillingOption={setStudentBillingOption}
              isBillingBooked={isBillingBooked}
              setIsBillingBooked={setIsBillingBooked}
              bookedExtraUsers={bookedExtraUsers}
              setBookedExtraUsers={setBookedExtraUsers}
              extraUsersSliderVal={extraUsersSliderVal}
              setExtraUsersSliderVal={setExtraUsersSliderVal}
              extraBillingOption={extraBillingOption}
              setExtraBillingOption={setExtraBillingOption}
              nextBillingOption={nextBillingOption}
              setNextBillingOption={setNextBillingOption}
              nextBillingOptionEffectiveAt={nextBillingOptionEffectiveAt}
              setNextBillingOptionEffectiveAt={setNextBillingOptionEffectiveAt}
              showChangeTariffModal={showChangeTariffModal}
              setShowChangeTariffModal={setShowChangeTariffModal}
              showCheckoutModal={showCheckoutModal}
              setShowCheckoutModal={setShowCheckoutModal}
              checkoutStep={checkoutStep}
              setCheckoutStep={setCheckoutStep}
              billingPayer={billingPayer}
              setBillingPayer={setBillingPayer}
              showSuccessModal={showSuccessModal}
              setShowSuccessModal={setShowSuccessModal}
              customUmlageAmount={customUmlageAmount}
              setCustomUmlageAmount={setCustomUmlageAmount}
              agreedToTerms={agreedToTerms}
              setAgreedToTerms={setAgreedToTerms}
              couponCode={couponCode}
              setCouponCode={setCouponCode}
              isCouponApplied={isCouponApplied}
              setIsCouponApplied={setIsCouponApplied}
              couponDiscount={couponDiscount}
              setCouponDiscount={setCouponDiscount}
              showCouponInput={showCouponInput}
              setShowCouponInput={setShowCouponInput}
              hasCustomBillingAddress={hasCustomBillingAddress}
              setHasCustomBillingAddress={setHasCustomBillingAddress}
              customBillingName={customBillingName}
              setCustomBillingName={setCustomBillingName}
              customBillingStreet={customBillingStreet}
              setCustomBillingStreet={setCustomBillingStreet}
              customBillingZip={customBillingZip}
              setCustomBillingZip={setCustomBillingZip}
              customBillingCity={customBillingCity}
              setCustomBillingCity={setCustomBillingCity}
              customBillingEmail={customBillingEmail}
              setCustomBillingEmail={setCustomBillingEmail}
              customBillingLeitwegId={customBillingLeitwegId}
              setCustomBillingLeitwegId={setCustomBillingLeitwegId}
              hasCustomActivationBillingAddress={hasCustomActivationBillingAddress}
              setHasCustomActivationBillingAddress={setHasCustomActivationBillingAddress}
              customActivationBillingName={customActivationBillingName}
              setCustomActivationBillingName={setCustomActivationBillingName}
              customActivationBillingStreet={customActivationBillingStreet}
              setCustomActivationBillingStreet={setCustomActivationBillingStreet}
              customActivationBillingZip={customActivationBillingZip}
              setCustomActivationBillingZip={setCustomActivationBillingZip}
              customActivationBillingCity={customActivationBillingCity}
              setCustomActivationBillingCity={setCustomActivationBillingCity}
              customActivationBillingEmail={customActivationBillingEmail}
              setCustomActivationBillingEmail={setCustomActivationBillingEmail}
              selectedStorageAddonGb={selectedStorageAddonGb}
              setSelectedStorageAddonGb={setSelectedStorageAddonGb}
              selectedStorageAddonFee={selectedStorageAddonFee}
              setSelectedStorageAddonFee={setSelectedStorageAddonFee}
              showSwitchBillingModelModal={showSwitchBillingModelModal}
              setShowSwitchBillingModelModal={setShowSwitchBillingModelModal}
              selectedSwitchTargetPayer={selectedSwitchTargetPayer}
              setSelectedSwitchTargetPayer={setSelectedSwitchTargetPayer}
              showStorageTerminationModal={showStorageTerminationModal}
              setShowStorageTerminationModal={setShowStorageTerminationModal}
              agreedToSepa={agreedToSepa}
              setAgreedToSepa={setAgreedToSepa}
              showConfirmExtra={showConfirmExtra}
              setShowConfirmExtra={setShowConfirmExtra}
              isSchoolTrial={isSchoolTrial}
              setIsSchoolTrial={setIsSchoolTrial}
              schoolTrialEndsAt={schoolTrialEndsAt}
              setSchoolTrialEndsAt={setSchoolTrialEndsAt}
              schoolStatus={schoolStatus}
              setSchoolStatus={setSchoolStatus}
              subscriptionBypass={subscriptionBypass}
              setContractStartDate={setContractStartDate}
              setSimulatedToday={setSimulatedToday}
              expandedYears={expandedYears}
              setExpandedYears={setExpandedYears}
              isCancelled={isCancelled}
              setIsCancelled={setIsCancelled}
              schoolContractEndsAt={schoolContractEndsAt}
              setSchoolContractEndsAt={setSchoolContractEndsAt}
              showModuleUpgradeModal={showModuleUpgradeModal}
              setShowModuleUpgradeModal={setShowModuleUpgradeModal}
              setUpgradeTargetModule={setUpgradeTargetModule}
              setShowCancelModal={setShowCancelModal}
              tariffBookings={tariffBookings}
              loadingTariffBookings={loadingTariffBookings}
              activeStudentsModalList={activeStudentsModalList}
              setActiveStudentsModalList={setActiveStudentsModalList}
              dunningStatus={dunningStatus}
              setShowDunningPayModal={setShowDunningPayModal}
              schoolEquipment={schoolEquipment}
              selectedEquipmentRoomId={selectedEquipmentRoomId}
              setSelectedEquipmentRoomId={setSelectedEquipmentRoomId}
              equipmentFormName={equipmentFormName}
              setEquipmentFormName={setEquipmentFormName}
              equipmentFormQty={equipmentFormQty}
              setEquipmentFormQty={setEquipmentFormQty}
              equipmentSaving={equipmentSaving}
              handleSaveEquipment={handleSaveEquipment}
              equipmentSearchQuery={equipmentSearchQuery}
              setEquipmentSearchQuery={setEquipmentSearchQuery}
              equipmentSortFreeFirst={equipmentSortFreeFirst}
              setEquipmentSortFreeFirst={setEquipmentSortFreeFirst}
              dragOverRoomId={dragOverRoomId}
              setDragOverRoomId={setDragOverRoomId}
              handleDropInstrumentOnRoom={handleDropInstrumentOnRoom}
              editingEquipmentGroup={editingEquipmentGroup}
              setEditingEquipmentGroup={setEditingEquipmentGroup}
              editGroupName={editGroupName}
              setEditGroupName={setEditGroupName}
              editGroupModel={editGroupModel}
              setEditGroupModel={setEditGroupModel}
              editGroupLink={editGroupLink}
              setEditGroupLink={setEditGroupLink}
              editGroupCoupled={editGroupCoupled}
              setEditGroupCoupled={setEditGroupCoupled}
              editGroupQty={editGroupQty}
              setEditGroupQty={setEditGroupQty}
              editGroupInstancesData={editGroupInstancesData}
              setEditGroupInstancesData={setEditGroupInstancesData}
              handleSaveEquipmentGroup={handleSaveEquipmentGroup}
              handleDeleteEquipment={handleDeleteEquipment}
              equipmentNameInputRef={equipmentNameInputRef}
              equipmentQtyInputRef={equipmentQtyInputRef}
              kioskPinLength={kioskPinLength}
              setKioskPinLength={setKioskPinLength}
              bypassPin={bypassPin}
              setBypassPin={setBypassPin}
              logRetention={logRetention}
              setLogRetention={setLogRetention}
              syncInterval={syncInterval}
              setSyncInterval={setSyncInterval}
              calendarUrls={calendarUrls}
              newCalendarUrlInput={newCalendarUrlInput}
              setNewCalendarUrlInput={setNewCalendarUrlInput}
              lastBackupDate={lastBackupDate}
              schoolYearStartDay={schoolYearStartDay}
              schoolYearStartMonth={schoolYearStartMonth}
              autoDeleteExpiredUsers={autoDeleteExpiredUsers}
              isCurrentDevicePasskeyActive={isCurrentDevicePasskeyActive}
              isSavingSettings={isSavingSettings}
              isSettingsDirty={isSettingsDirty}
              activeSecretarySettingsModal={activeSecretarySettingsModal}
              setActiveSecretarySettingsModal={setActiveSecretarySettingsModal}
              settingsTab={settingsTab}
              setSettingsTab={setSettingsTab}
              showResetModal={showResetModal}
              setShowResetModal={setShowResetModal}
              resetConfirmText={resetConfirmText}
              setResetConfirmText={setResetConfirmText}
              showOwnQrModal={showOwnQrModal}
              setShowOwnQrModal={setShowOwnQrModal}
              copiedSettingsLink={copiedSettingsLink}
              setCopiedSettingsLink={setCopiedSettingsLink}
              copiedSettingsPin={copiedSettingsPin}
              setCopiedSettingsPin={setCopiedSettingsPin}
              copiedKioskLink={copiedKioskLink}
              setCopiedKioskLink={setCopiedKioskLink}
              copiedSchoolLink={copiedSchoolLink}
              setCopiedSchoolLink={setCopiedSchoolLink}
              setIsFeedbackModalOpen={setIsFeedbackModalOpen}
              setShowDpoIdCardModal={setShowDpoIdCardModal}
              setShowDpoPortalModal={setShowDpoPortalModal}
              setQrModalUser={setQrModalUser}
              handleSaveAllSettings={handleSaveAllSettings}
              handleAddCalendarUrl={handleAddCalendarUrl}
              handleRemoveCalendarUrl={handleRemoveCalendarUrl}
              handleExportBackup={handleExportBackup}
              handleRestoreBackup={handleRestoreBackup}
              handleEnrollBiometrics={handleEnrollBiometrics}
              handleRemoveBiometrics={handleRemoveBiometrics}
              handleTestBiometrics={handleTestBiometrics}
              handleDeleteExpiredStudents={handleDeleteExpiredStudents}
              handleToggleAutoClean={handleToggleAutoClean}
              handleUpdateSchoolYear={handleUpdateSchoolYear}
              biometricsStatus={biometricsStatus}
              biometricsMessage={biometricsMessage}
              kioskToken={kioskToken}
              isExporting={isExporting}
              isRestoring={isRestoring}
              announcementsList={announcementsList}
              announcementsLoading={announcementsLoading}
              editingAnnouncementId={editingAnnouncementId}
              setEditingAnnouncementId={setEditingAnnouncementId}
              newAnnouncementTitle={newAnnouncementTitle}
              setNewAnnouncementTitle={setNewAnnouncementTitle}
              newAnnouncementDescription={newAnnouncementDescription}
              setNewAnnouncementDescription={setNewAnnouncementDescription}
              newAnnouncementType={newAnnouncementType}
              setNewAnnouncementType={setNewAnnouncementType}
              newAnnouncementPriority={newAnnouncementPriority}
              setNewAnnouncementPriority={setNewAnnouncementPriority}
              newAnnouncementIsAnonymous={newAnnouncementIsAnonymous}
              setNewAnnouncementIsAnonymous={setNewAnnouncementIsAnonymous}
              newAnnouncementTargetType={newAnnouncementTargetType}
              setNewAnnouncementTargetType={setNewAnnouncementTargetType}
              newAnnouncementTargetGroup={newAnnouncementTargetGroup}
              setNewAnnouncementTargetGroup={setNewAnnouncementTargetGroup}
              newAnnouncementTargetTeacherId={newAnnouncementTargetTeacherId}
              setNewAnnouncementTargetTeacherId={setNewAnnouncementTargetTeacherId}
              newAnnouncementDueDate={newAnnouncementDueDate}
              setNewAnnouncementDueDate={setNewAnnouncementDueDate}
              newAnnouncementRecurrence={newAnnouncementRecurrence}
              setNewAnnouncementRecurrence={setNewAnnouncementRecurrence}
              newAnnouncementAttachmentUrl={newAnnouncementAttachmentUrl}
              setNewAnnouncementAttachmentUrl={setNewAnnouncementAttachmentUrl}
              newAnnouncementQuestions={newAnnouncementQuestions}
              setNewAnnouncementQuestions={setNewAnnouncementQuestions}
              isUploadingAnnouncementAttachment={isUploadingAnnouncementAttachment}
              handleUploadAnnouncementAttachment={handleUploadAnnouncementAttachment}
              handleSaveAnnouncement={handleCreateAnnouncement}
              handleDeleteAnnouncement={handleDeleteAnnouncement}
              selectedAnnouncementForStats={selectedAnnouncementForStats}
              setSelectedAnnouncementForStats={setSelectedAnnouncementForStats}
              announcementResponsesList={announcementResponsesList}
              fetchAnnouncementStats={fetchAnnouncementStats}
              statsModalTab={statsModalTab}
              setStatsModalTab={setStatsModalTab}
              statsStatusFilter={statsStatusFilter}
              setStatsStatusFilter={setStatsStatusFilter}
              statsSearchQuery={statsSearchQuery}
              setStatsSearchQuery={setStatsSearchQuery}
              expandedResponseIds={expandedResponseIds}
              setExpandedResponseIds={setExpandedResponseIds}
              handleExportCSV={handleExportCSV}
              auditLogs={auditLogs}
              auditLoading={auditLoading}
              auditSearchQuery={auditSearchQuery}
              setAuditSearchQuery={setAuditSearchQuery}
              auditActionFilter={auditActionFilter}
              setAuditActionFilter={setAuditActionFilter}
              auditLimit={auditLimit}
              setAuditLimit={setAuditLimit}
              exportAuditLogsToCsv={exportAuditLogsToCsv}
              translateKey={translateKey}
              translateValue={translateValue}
            />
          </Suspense>
        )}





        {/* TAB 2: CAMPUS (EXTRACTED TO SecretaryCampusTab) */}
        {activeTab === 'campus' && (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Campus...</div>}>
            <SecretaryCampusTab
              campusSubTab={campusSubTab}
              setCampusSubTab={setCampusSubTab}
              setSecretarySubTab={setSecretarySubTab}
              activePlatform={activePlatform}
              schoolId={schoolId}
              userId={userId}
              userRole={userRole}
              userRoles={userRoles}
              showRealNames={showRealNames}
              windowWidth={windowWidth}
              onLogout={onLogout}
              schoolName={schoolName}
              currentSchoolProfile={currentSchoolProfile}
              fetchDashboardData={fetchDashboardData}
              showAddTeacherModal={showAddTeacherModal}
              setShowAddTeacherModal={setShowAddTeacherModal}
              showAddStudentModal={showAddStudentModal}
              setShowAddStudentModal={setShowAddStudentModal}
              showBulkImportModal={showBulkImportModal}
              setShowBulkImportModal={setShowBulkImportModal}
              showBulkDeleteModal={showBulkDeleteModal}
              setShowBulkDeleteModal={setShowBulkDeleteModal}
              showGuidanceModal={showGuidanceModal}
              setShowGuidanceModal={setShowGuidanceModal}
              guidanceInitialTab={guidanceInitialTab}
              setGuidanceInitialTab={setGuidanceInitialTab}
              showParentInfoSheetModal={showParentInfoSheetModal}
              setShowParentInfoSheetModal={setShowParentInfoSheetModal}
              setIsFeedbackModalOpen={setIsFeedbackModalOpen}
              manageTeacher={manageTeacher}
              setManageTeacher={setManageTeacher}
              selectedStudentForDetail={selectedStudentForDetail}
              setSelectedStudentForDetail={setSelectedStudentForDetail}
              setSettingsTab={setSettingsTab}
              setApprovalToast={setApprovalToast}
              enabledCampusSubjects={enabledCampusSubjects}
              setEnabledCampusSubjects={setEnabledCampusSubjects}
              enabledCampusRooms={enabledCampusRooms}
              setEnabledCampusRooms={setEnabledCampusRooms}
              enabledCampusEvents={enabledCampusEvents}
              setEnabledCampusEvents={setEnabledCampusEvents}
              enabledCampusSchedules={enabledCampusSchedules}
              setEnabledCampusSchedules={setEnabledCampusSchedules}
              enabledCalendarWidget={enabledCalendarWidget}
              setEnabledCalendarWidget={setEnabledCalendarWidget}
              enabledQrLogin={enabledQrLogin}
              setEnabledQrLogin={setEnabledQrLogin}
              campusTeachersManageStudents={campusTeachersManageStudents}
              setCampusTeachersManageStudents={setCampusTeachersManageStudents}
              campusTeachersManageTeachers={campusTeachersManageTeachers}
              setCampusTeachersManageTeachers={setCampusTeachersManageTeachers}
              teachersManageTeachers={teachersManageTeachers}
              setTeachersManageTeachers={setTeachersManageTeachers}
              campusTeachers={campusTeachers}
              allTeachers={allTeachers}
              coaches={coaches}
              bypassTeachers={bypassTeachers}
              unsubmittedTeachers={unsubmittedTeachers}
              teacherSearchQuery={teacherSearchQuery}
              setTeacherSearchQuery={setTeacherSearchQuery}
              teacherFilterInstrument={teacherFilterInstrument}
              setTeacherFilterInstrument={setTeacherFilterInstrument}
              teacherStatusTab={teacherStatusTab}
              setTeacherStatusTab={setTeacherStatusTab}
              newTeacherFirstName={newTeacherFirstName}
              setNewTeacherFirstName={setNewTeacherFirstName}
              newTeacherLastName={newTeacherLastName}
              setNewTeacherLastName={setNewTeacherLastName}
              newTeacherEmail={newTeacherEmail}
              setNewTeacherEmail={setNewTeacherEmail}
              newTeacherInstrument={newTeacherInstrument}
              setNewTeacherInstrument={setNewTeacherInstrument}
              newTeacherContractEndsAt={newTeacherContractEndsAt}
              setNewTeacherContractEndsAt={setNewTeacherContractEndsAt}
              handleCreateTeacher={handleCreateTeacher}
              handleImportTeachers={handleImportTeachers}
              handleToggleTeacherModule={handleToggleTeacherModule}
              handleUpdateTeacherInstrument={handleUpdateTeacherInstrument}
              handleGenerateInviteToken={handleGenerateInviteToken}
              handleDownloadTeacherSchedule={handleDownloadTeacherSchedule}
              handleDeleteUser={handleDeleteUser}
              isCsvExpanded={isCsvExpanded}
              setIsCsvExpanded={setIsCsvExpanded}
              csvText={csvText}
              setCsvText={setCsvText}
              expandedSidebarTeacherId={expandedSidebarTeacherId}
              setExpandedSidebarTeacherId={setExpandedSidebarTeacherId}
              students={students}
              filteredStudents={filteredStudents}
              frozenStudents={frozenStudents}
              studentSearchQuery={studentSearchQuery}
              setStudentSearchQuery={setStudentSearchQuery}
              studentFilterTeacher={studentFilterTeacher}
              setStudentFilterTeacher={setStudentFilterTeacher}
              studentFilterInstrument={studentFilterInstrument}
              setStudentFilterInstrument={setStudentFilterInstrument}
              studentFilterStatus={studentFilterStatus}
              setStudentFilterStatus={setStudentFilterStatus}
              studentCurrentPage={studentCurrentPage}
              setStudentCurrentPage={setStudentCurrentPage}
              studentPageSize={studentPageSize}
              setStudentPageSize={setStudentPageSize}
              selectedStudentIds={selectedStudentIds}
              setSelectedStudentIds={setSelectedStudentIds}
              copiedStudentId={copiedStudentId}
              setCopiedStudentId={setCopiedStudentId}
              newStudentFirstName={newStudentFirstName}
              setNewStudentFirstName={setNewStudentFirstName}
              newStudentLastName={newStudentLastName}
              setNewStudentLastName={setNewStudentLastName}
              newStudentNickname={newStudentNickname}
              setNewStudentNickname={setNewStudentNickname}
              newStudentInstrument={newStudentInstrument}
              setNewStudentInstrument={setNewStudentInstrument}
              newStudentTeacherId={newStudentTeacherId}
              setNewStudentTeacherId={setNewStudentTeacherId}
              newStudentDuration={newStudentDuration}
              setNewStudentDuration={setNewStudentDuration}
              newStudentIsAppUser={newStudentIsAppUser}
              setNewStudentIsAppUser={setNewStudentIsAppUser}
              newStudentIsCampusActive={newStudentIsCampusActive}
              setNewStudentIsCampusActive={setNewStudentIsCampusActive}
              newStudentIsGroovelabActive={newStudentIsGroovelabActive}
              setNewStudentIsGroovelabActive={setNewStudentIsGroovelabActive}
              handleCreateStudentCampus={handleCreateStudentCampus}
              handleDeleteStudentCampus={handleDeleteStudentCampus}
              handleToggleStudentModule={handleToggleStudentModule}
              handleUpdateStudentTeacher={handleUpdateStudentTeacher}
              handleBatchImportStudents={handleBatchImportStudents}
              isStudentCsvExpanded={isStudentCsvExpanded}
              setIsStudentCsvExpanded={setIsStudentCsvExpanded}
              studentCsvText={studentCsvText}
              setStudentCsvText={setStudentCsvText}
              isImportingStudentsBatch={isImportingStudentsBatch}
              setIsImportingStudentsBatch={setIsImportingStudentsBatch}
              bulkDeleteStep={bulkDeleteStep}
              setBulkDeleteStep={setBulkDeleteStep}
              bulkDeletePin={bulkDeletePin}
              setBulkDeletePin={setBulkDeletePin}
              pendingSchedules={pendingSchedules}
              rooms={rooms}
              matrixAllocations={matrixAllocations}
              setMatrixAllocations={setMatrixAllocations}
              selectedFilterTeacherId={selectedFilterTeacherId}
              setSelectedFilterTeacherId={setSelectedFilterTeacherId}
              selectedDayPlan={selectedDayPlan}
              setSelectedDayPlan={setSelectedDayPlan}
              showOnlyPendingReviews={showOnlyPendingReviews}
              setShowOnlyPendingReviews={setShowOnlyPendingReviews}
              isSavingApproval={isSavingApproval}
              isApprovingAllSchedules={isApprovingAllSchedules}
              draggedPlanId={draggedPlanId}
              setDraggedPlanId={setDraggedPlanId}
              draggedPlanDay={draggedPlanDay}
              setDraggedPlanDay={setDraggedPlanDay}
              dragOverCell={dragOverCell}
              setDragOverCell={setDragOverCell}
              dragHoveredTeacher={dragHoveredTeacher}
              setDragHoveredTeacher={setDragHoveredTeacher}
              dragHoveredInstrument={dragHoveredInstrument}
              setDragHoveredInstrument={setDragHoveredInstrument}
              activeContextMenu={activeContextMenu}
              setActiveContextMenu={setActiveContextMenu}
              schedulesSidebarTab={schedulesSidebarTab}
              setSchedulesSidebarTab={setSchedulesSidebarTab}
              sidebarTeacherSearch={sidebarTeacherSearch}
              setSidebarTeacherSearch={setSidebarTeacherSearch}
              handleDragStartMatrix={handleDragStartMatrix}
              handleDropOnMatrix={handleDropOnMatrix}
              handleApproveAllPendingSchedules={handleApproveAllPendingSchedules}
              handleRejectTeacherDayPlan={handleRejectTeacherDayPlan}
              handleSaveAndApproveAll={handleSaveAndApproveAll}
              handleMergePlans={handleMergePlans}
              handleSplitPlan={handleSplitPlan}
              runAutoRoomAllocation={runAutoRoomAllocation}
              getPlanDisplayName={getPlanDisplayName}
              getSplitPoints={getSplitPoints}
              schedulesRoomsViewMode={schedulesRoomsViewMode}
              setSchedulesRoomsViewMode={setSchedulesRoomsViewMode}
              liveViewDay={liveViewDay}
              setLiveViewDay={setLiveViewDay}
              showAdHocBooking={showAdHocBooking}
              setShowAdHocBooking={setShowAdHocBooking}
              adHocRoomId={adHocRoomId}
              setAdHocRoomId={setAdHocRoomId}
              adHocStartTime={adHocStartTime}
              setAdHocStartTime={setAdHocStartTime}
              adHocDuration={adHocDuration}
              setAdHocDuration={setAdHocDuration}
              adHocTeacherId={adHocTeacherId}
              setAdHocTeacherId={setAdHocTeacherId}
              adHocStudentName={adHocStudentName}
              setAdHocStudentName={setAdHocStudentName}
              subjects={subjects}
              activeSubjectsList={activeSubjectsList}
              schoolEvents={schoolEvents}
              activeCampusSettingsModal={activeCampusSettingsModal}
              setActiveCampusSettingsModal={setActiveCampusSettingsModal}
              campusScheduleSlotMinutes={campusScheduleSlotMinutes}
              setCampusScheduleSlotMinutes={setCampusScheduleSlotMinutes}
              campusScheduleConflictWarning={campusScheduleConflictWarning}
              setCampusScheduleConflictWarning={setCampusScheduleConflictWarning}
              campusHomeworkNotesSync={campusHomeworkNotesSync}
              setCampusHomeworkNotesSync={setCampusHomeworkNotesSync}
              campusParentChatEnabled={campusParentChatEnabled}
              setCampusParentChatEnabled={setCampusParentChatEnabled}
              campusParentAbsenceNotify={campusParentAbsenceNotify}
              setCampusParentAbsenceNotify={setCampusParentAbsenceNotify}
              campusMeisterwerkEnabled={campusMeisterwerkEnabled}
              setCampusMeisterwerkEnabled={setCampusMeisterwerkEnabled}
              campusAudioMaxSessionMinutes={campusAudioMaxSessionMinutes}
              setCampusAudioMaxSessionMinutes={setCampusAudioMaxSessionMinutes}
              campusLoopstationBarsPause={campusLoopstationBarsPause}
              setCampusLoopstationBarsPause={setCampusLoopstationBarsPause}
              campusFocusTimerDefaultMin={campusFocusTimerDefaultMin}
              campusKioskPinLength={campusKioskPinLength}
              openingHours={openingHours}
              simulatedToday={simulatedToday}
              billingPayer={billingPayer}
              studentBillingOption={studentBillingOption}
              hasCampusSub={hasCampusSub}
              hasGroovelabSub={hasGroovelabSub}
              isBillingBooked={isBillingBooked}
              lastBackupDate={lastBackupDate}
              daysSinceLastBackup={daysSinceLastBackup}
              showBackupAlert={showBackupAlert}
              handleSaveSettingValue={handleSaveSettingValue}
              handleToggleSetting={handleToggleSetting}
            />
          </Suspense>
        )}

        {/* TAB 3: GROOVELAB (EXTRACTED TO SecretaryGroovelabTab) */}
        {activeTab === 'groovelab' && (
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade GrooveLab...</div>}>
            <SecretaryGroovelabTab
              groovelabSubTab={groovelabSubTab}
              activePlatform={activePlatform}
              schoolId={schoolId}
              userId={userId}
              showRealNames={showRealNames}
              windowWidth={windowWidth}
              windowHeight={windowHeight}
              containerWidth={containerWidth}
              containerRef={containerRef}
              zoomFactor={zoomFactor}
              handleZoomChange={handleZoomChange}
              rooms={rooms}
              stations={stations}
              selectedRoomId={selectedRoomId}
              setSelectedRoomId={setSelectedRoomId}
              activeSessions={activeSessions}
              helpRequests={helpRequests}
              holidayXpActive={holidayXpActive}
              handleToggleHolidayXp={handleToggleHolidayXp}
              handleLogoutStudent={handleLogoutStudent}
              students={students}
              bands={bands}
              teachersManageStudents={teachersManageStudents}
              setTeachersManageStudents={setTeachersManageStudents}
              groovelabStudentSearchQuery={groovelabStudentSearchQuery}
              setGroovelabStudentSearchQuery={setGroovelabStudentSearchQuery}
              groovelabStudentFilterInstrument={groovelabStudentFilterInstrument}
              setGroovelabStudentFilterInstrument={setGroovelabStudentFilterInstrument}
              handleToggleStudentModule={handleToggleStudentModule}
              setSelectedStudentForDetail={setSelectedStudentForDetail}
              setShowAddStudentModal={setShowAddStudentModal}
              setNewStudentIsGroovelabActive={setNewStudentIsGroovelabActive}
              showAddGroovelabStudentModal={showAddGroovelabStudentModal}
              setShowAddGroovelabStudentModal={setShowAddGroovelabStudentModal}
              groovelabStudentModalSearchQuery={groovelabStudentModalSearchQuery}
              setGroovelabStudentModalSearchQuery={setGroovelabStudentModalSearchQuery}
              showManualCreateGroovelabStudent={showManualCreateGroovelabStudent}
              setShowManualCreateGroovelabStudent={setShowManualCreateGroovelabStudent}
              newStudentFirstName={newStudentFirstName}
              setNewStudentFirstName={setNewStudentFirstName}
              newStudentLastName={newStudentLastName}
              setNewStudentLastName={setNewStudentLastName}
              handleCreateStudentGroovelab={handleCreateStudentGroovelab}
              coaches={coaches}
              campusTeachers={campusTeachers}
              allTeachers={allTeachers}
              bypassTeachers={bypassTeachers}
              teachersManageTeachers={teachersManageTeachers}
              setTeachersManageTeachers={setTeachersManageTeachers}
              coachSearchQuery={coachSearchQuery}
              setCoachSearchQuery={setCoachSearchQuery}
              coachFilterInstrument={coachFilterInstrument}
              setCoachFilterInstrument={setCoachFilterInstrument}
              handleToggleTeacherModule={handleToggleTeacherModule}
              setManageTeacher={setManageTeacher}
              setSelectedCoachProfile={setSelectedCoachProfile}
              showAddCoachModal={showAddCoachModal}
              setShowAddCoachModal={setShowAddCoachModal}
              coachModalSearchQuery={coachModalSearchQuery}
              setCoachModalSearchQuery={setCoachModalSearchQuery}
              showManualCreateCoach={showManualCreateCoach}
              setShowManualCreateCoach={setShowManualCreateCoach}
              setShowAddTeacherModal={setShowAddTeacherModal}
              newTeacherFirstName={newTeacherFirstName}
              setNewTeacherFirstName={setNewTeacherFirstName}
              newTeacherLastName={newTeacherLastName}
              setNewTeacherLastName={setNewTeacherLastName}
              newTeacherEmail={newTeacherEmail}
              setNewTeacherEmail={setNewTeacherEmail}
              newTeacherInstrument={newTeacherInstrument}
              setNewTeacherInstrument={setNewTeacherInstrument}
              newTeacherContractEndsAt={newTeacherContractEndsAt}
              setNewTeacherContractEndsAt={setNewTeacherContractEndsAt}
              handleCreateCoachForGroovelab={handleCreateCoachForGroovelab}
              activeSubjectsList={activeSubjectsList}
              activeGroovelabSettingsModal={activeGroovelabSettingsModal}
              setActiveGroovelabSettingsModal={setActiveGroovelabSettingsModal}
              glMaxBandMembers={glMaxBandMembers}
              setGlMaxBandMembers={setGlMaxBandMembers}
              glAllowStudentBandCreation={glAllowStudentBandCreation}
              setGlAllowStudentBandCreation={setGlAllowStudentBandCreation}
              glSongLevelStarterEnabled={glSongLevelStarterEnabled}
              setGlSongLevelStarterEnabled={setGlSongLevelStarterEnabled}
              glSongLevelProEnabled={glSongLevelProEnabled}
              setGlSongLevelProEnabled={setGlSongLevelProEnabled}
              glSongLevelMasterEnabled={glSongLevelMasterEnabled}
              setGlSongLevelMasterEnabled={setGlSongLevelMasterEnabled}
              glSongProposalWorkflow={glSongProposalWorkflow}
              setGlSongProposalWorkflow={setGlSongProposalWorkflow}
              glLiveDefaultBpm={glLiveDefaultBpm}
              setGlLiveDefaultBpm={setGlLiveDefaultBpm}
              glLiveCountInBars={glLiveCountInBars}
              setGlLiveCountInBars={setGlLiveCountInBars}
              glLiveStageDisplayEnabled={glLiveStageDisplayEnabled}
              setGlLiveStageDisplayEnabled={setGlLiveStageDisplayEnabled}
              glSkillRadarTiming={glSkillRadarTiming}
              setGlSkillRadarTiming={setGlSkillRadarTiming}
              glSkillRadarTechnique={glSkillRadarTechnique}
              setGlSkillRadarTechnique={setGlSkillRadarTechnique}
              glSkillRadarSound={glSkillRadarSound}
              setGlSkillRadarSound={setGlSkillRadarSound}
              glSkillRadarRepertoire={glSkillRadarRepertoire}
              setGlSkillRadarRepertoire={setGlSkillRadarRepertoire}
              glSkillRadarTeamplay={glSkillRadarTeamplay}
              setGlSkillRadarTeamplay={setGlSkillRadarTeamplay}
              glMusicianAvatarsEnabled={glMusicianAvatarsEnabled}
              setGlMusicianAvatarsEnabled={setGlMusicianAvatarsEnabled}
              glBandCoatOfArmsEnabled={glBandCoatOfArmsEnabled}
              setGlBandCoatOfArmsEnabled={setGlBandCoatOfArmsEnabled}
              glBandChatEnabled={glBandChatEnabled}
              setGlBandChatEnabled={setGlBandChatEnabled}
              glJamRecordingCompression={glJamRecordingCompression}
              setGlJamRecordingCompression={setGlJamRecordingCompression}
              allowMessagesGlobal={allowMessagesGlobal}
              handleToggleMessagesGlobal={handleToggleMessagesGlobal}
              handleSaveSettingValue={handleSaveSettingValue}
              handleToggleSetting={handleToggleSetting}
              handleRegenerateTokens={handleRegenerateTokens}
              setIsFeedbackModalOpen={setIsFeedbackModalOpen}
            />
          </Suspense>
        )}



      </div>
      <Suspense fallback={null}>
        <SecretaryOperationsModalsHub
          showLogbookModal={showLogbookModal}
          setShowLogbookModal={setShowLogbookModal}
          logbookBookings={logbookBookings}
          editingLogbookBookingId={editingLogbookBookingId}
          setEditingLogbookBookingId={setEditingLogbookBookingId}
          editBookingTitle={editBookingTitle}
          setEditBookingTitle={setEditBookingTitle}
          editBookingRoomId={editBookingRoomId}
          setEditBookingRoomId={setEditBookingRoomId}
          editBookingDate={editBookingDate}
          setEditBookingDate={setEditBookingDate}
          editBookingStartTime={editBookingStartTime}
          setEditBookingStartTime={setEditBookingStartTime}
          editBookingEndTime={editBookingEndTime}
          setEditBookingEndTime={setEditBookingEndTime}
          rooms={rooms}
          handleConfirmLogbookBooking={handleConfirmLogbookBooking}
          handleUpdateLogbookBooking={handleUpdateLogbookBooking}
          handleDeleteLogbookBooking={handleDeleteLogbookBooking}
          showTrialLogModal={showTrialLogModal}
          setShowTrialLogModal={setShowTrialLogModal}
          trialLogsLoading={trialLogsLoading}
          trialLogs={trialLogs}
          userMap={userMap}
          showResetModal={showResetModal}
          setShowResetModal={setShowResetModal}
          resetConfirmText={resetConfirmText}
          setResetConfirmText={setResetConfirmText}
          schoolName={schoolName}
          handleResetSchool={handleResetSchool}
          isResetting={isResetting}
          showBulkDeleteModal={showBulkDeleteModal}
          setShowBulkDeleteModal={setShowBulkDeleteModal}
          bulkDeleteStep={bulkDeleteStep}
          setBulkDeleteStep={setBulkDeleteStep}
          bulkDeletePin={bulkDeletePin}
          setBulkDeletePin={setBulkDeletePin}
          selectedStudentIds={selectedStudentIds}
          setSelectedStudentIds={setSelectedStudentIds}
          students={students}
          setStudents={setStudents}
          showRealNames={showRealNames}
          activeTab={activeTab}
          fetchDashboardData={fetchDashboardData}
        />
        {showFacilityLogModal && (
          <SecretaryFacilityLogModal
            isOpen={showFacilityLogModal}
            onClose={() => setShowFacilityLogModal(false)}
            roomIssues={roomIssues}
            rooms={rooms}
            schoolId={schoolId}
            onResolveIssue={handleResolveRoomIssue}
            onReopenIssue={handleReopenRoomIssue}
          />
        )}
      </Suspense>
      {/* 👤 Bounded Context: User Detail, Management & Context Menu Modals Hub */}
      <Suspense fallback={null}>
        <SecretaryUserDetailModalsHub
          selectedStudentForDetail={selectedStudentForDetail}
          setSelectedStudentForDetail={setSelectedStudentForDetail}
          deleteStudentModalData={deleteStudentModalData}
          setDeleteStudentModalData={setDeleteStudentModalData}
          setStudents={setStudents}
          selectedCoachProfile={selectedCoachProfile}
          setSelectedCoachProfile={setSelectedCoachProfile}
          manageTeacher={manageTeacher}
          setManageTeacher={setManageTeacher}
          schoolName={schoolName}
          schoolId={schoolId}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setCampusSubTab={setCampusSubTab}
          setGroovelabSubTab={setGroovelabSubTab}
          students={students}
          bands={bands}
          activeSubjectsList={activeSubjectsList}
          handleUpdateTeacher={handleUpdateTeacher}
          handleDeleteUser={handleDeleteUser}
          setQrModalUser={setQrModalUser}
          generateStarterPin={generateStarterPin}
          showUnassignedWarning={showUnassignedWarning}
          setShowUnassignedWarning={setShowUnassignedWarning}
          matrixAllocations={matrixAllocations}
          handleSaveAndApproveAll={handleSaveAndApproveAll}
          activeContextMenu={activeContextMenu}
          setActiveContextMenu={setActiveContextMenu}
          handleDeleteStudentCampus={handleDeleteStudentCampus}
          fetchDashboardData={fetchDashboardData}
        />
      </Suspense>

      {/* 💳 Bounded Context: Billing, Licenses & Infrastructure Modals Hub */}
      <Suspense fallback={null}>
        <SecretaryBillingModalsHub
          schoolId={schoolId}
          schoolNumericId={schoolNumericId}
          schoolName={schoolName}
          schoolStreet={schoolStreet}
          schoolHouseNumber={schoolHouseNumber}
          schoolZipCode={schoolZipCode}
          schoolCity={schoolCity}
          supabase={supabase}
          currentSchoolProfile={currentSchoolProfile}
          setCurrentSchoolProfile={setCurrentSchoolProfile}
          fetchDashboardData={fetchDashboardData}
          fetchTariffBookings={fetchTariffBookings}
          masterPricing={masterPricing}
          students={students}

          showChangeTariffModal={showChangeTariffModal}
          setShowChangeTariffModal={setShowChangeTariffModal}
          selectedModalOption={selectedModalOption}
          setSelectedModalOption={setSelectedModalOption}
          studentBillingOption={studentBillingOption}
          setNextBillingOption={setNextBillingOption}
          setNextBillingOptionEffectiveAt={setNextBillingOptionEffectiveAt}

          activeStudentsModalList={activeStudentsModalList}
          setActiveStudentsModalList={setActiveStudentsModalList}
          modalStudentSearchQuery={modalStudentSearchQuery}
          setModalStudentSearchQuery={setModalStudentSearchQuery}

          showSwitchBillingModelModal={showSwitchBillingModelModal}
          setShowSwitchBillingModelModal={setShowSwitchBillingModelModal}
          selectedSwitchTargetPayer={selectedSwitchTargetPayer}
          setSelectedSwitchTargetPayer={setSelectedSwitchTargetPayer}
          billingPayer={billingPayer}
          setBillingPayer={setBillingPayer}
          setStudentBillingOption={setStudentBillingOption}
          isSwitchingPayer={isSwitchingPayer}
          setIsSwitchingPayer={setIsSwitchingPayer}

          showStorageManagerModal={showStorageManagerModal}
          setShowStorageManagerModal={setShowStorageManagerModal}
          selectedStorageAddonGb={selectedStorageAddonGb}
          setSelectedStorageAddonGb={setSelectedStorageAddonGb}
          selectedStorageAddonFee={selectedStorageAddonFee}
          setSelectedStorageAddonFee={setSelectedStorageAddonFee}
          hasCampusSub={hasCampusSub}
          hasGroovelabSub={hasGroovelabSub}
          isSubmittingStorage={isSubmittingStorage}
          setIsSubmittingStorage={setIsSubmittingStorage}
          setStorageBookingSuccessModal={setStorageBookingSuccessModal}
          getEffectiveStorageUsedBytes={getEffectiveStorageUsedBytes}

          storageBookingSuccessModal={storageBookingSuccessModal}

          showStorageTerminationModal={showStorageTerminationModal}
          setShowStorageTerminationModal={setShowStorageTerminationModal}
          storageTerminationDays={storageTerminationDays}
          setStorageTerminationDays={setStorageTerminationDays}

          selectedInvoice={selectedInvoice}
          setSelectedInvoice={setSelectedInvoice}
          campusActivatedThisMonth={campusActivatedThisMonth}
          groovelabActivatedThisMonth={groovelabActivatedThisMonth}
          billableTeachersCount={billableTeachersCount}
          activeStudentsCount_global={activeStudentsCount_global}
          activeGroovelabStudentsCount_global={activeGroovelabStudentsCount_global}
          passiveStudentsCount_global={passiveStudentsCount_global}
          isSammelzahler={isSammelzahler}
          operatorCompany={operatorCompany}
          operatorContact={operatorContact}
          operatorStreet={operatorStreet}
          operatorZip={operatorZip}
          operatorCity={operatorCity}
          operatorIban={operatorIban}
          operatorBic={operatorBic}

          showCancelModal={showCancelModal}
          setShowCancelModal={setShowCancelModal}
          simulatedToday={simulatedToday}
          schoolContractEndsAt={schoolContractEndsAt}
          setSchoolContractEndsAt={setSchoolContractEndsAt}
          setIsCancelled={setIsCancelled}
          cancellationReason={cancellationReason}
          setCancellationReason={setCancellationReason}
          setLastCancellationId={setLastCancellationId}
          getSchoolYearEndInfo={getSchoolYearEndInfo}
          downloadCancellationReceiptPdf={downloadCancellationReceiptPdf}

          showModuleUpgradeModal={showModuleUpgradeModal}
          setShowModuleUpgradeModal={setShowModuleUpgradeModal}
          upgradeTargetModule={upgradeTargetModule}
          upgradeProcessing={upgradeProcessing}
          setUpgradeProcessing={setUpgradeProcessing}
          setHasCampusSub={setHasCampusSub}
          setHasGroovelabSub={setHasGroovelabSub}
          downloadUpgradeConfirmationPdf={downloadUpgradeConfirmationPdf}
        />
      </Suspense>

      {/* General Compliance, Support, Import & Onboarding Modals Hub */}
      <Suspense fallback={null}>
        <SecretaryGeneralModalsHub
          schoolId={schoolId}
          schoolName={schoolName || currentSchoolProfile?.name || 'Stadtmusikschule'}
          userId={userId}
          currentUserProfile={currentUserProfile}
          currentSchoolProfile={currentSchoolProfile}
          setCurrentSchoolProfile={setCurrentSchoolProfile}
          fetchDashboardData={fetchDashboardData}
          activeTab={activeTab}
          activePlatform={activePlatform as any}

          showAgb={showAgb}
          setShowAgb={setShowAgb}
          showPrivacy={showPrivacy}
          setShowPrivacy={setShowPrivacy}

          showDunningPayModal={showDunningPayModal}
          setShowDunningPayModal={setShowDunningPayModal}
          dunningStatus={dunningStatus}
          operatorCompany={operatorCompany}
          operatorIban={operatorIban}
          operatorBic={operatorBic}
          setActiveTab={setActiveTab}
          setSecretarySubTab={setSecretarySubTab}
          setTrustRefreshToken={setTrustRefreshToken}

          showOwnQrModal={showOwnQrModal}
          setShowOwnQrModal={setShowOwnQrModal}
          qrModalUser={qrModalUser}
          setQrModalUser={setQrModalUser}

          showAvvModal={showAvvModal}
          setShowAvvModal={setShowAvvModal}
          setIsAvvSigned={setIsAvvSigned}

          showDpoIdCardModal={showDpoIdCardModal}
          setShowDpoIdCardModal={setShowDpoIdCardModal}

          showDpoPortalModal={showDpoPortalModal}
          setShowDpoPortalModal={setShowDpoPortalModal}

          showBulkImportModal={showBulkImportModal}
          setShowBulkImportModal={setShowBulkImportModal}
          allUniqueTeacherProfiles={allUniqueTeacherProfiles}

          showParentInfoSheetModal={showParentInfoSheetModal}
          setShowParentInfoSheetModal={setShowParentInfoSheetModal}

          showGuidanceModal={showGuidanceModal}
          setShowGuidanceModal={setShowGuidanceModal}
          guidanceInitialTab={guidanceInitialTab}

          isFeedbackModalOpen={isFeedbackModalOpen}
          setIsFeedbackModalOpen={setIsFeedbackModalOpen}
        />
      </Suspense>

      {/* Floating Developer Reset Button (Dev Mode Only) */}
      {isDevEnvironment() && typeof window !== 'undefined' && localStorage.getItem('show_dev_reset_button') === 'true' && activeTab === 'secretary' && secretarySubTab === 'licenses' && (
        <button
          onClick={handleDeveloperReset}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '30px',
            padding: '12px 20px',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(124, 58, 237, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease-in-out',
            fontFamily: 'Urbanist, sans-serif'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 12px 30px rgba(124, 58, 237, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.3)';
          }}
        >
          <RefreshCw size={14} style={{ animation: 'spin 4s linear infinite' }} />
          Entwickler-Reset (Bestellvorgang zurücksetzen)
        </button>
      )}



      {/* ─── Apple Glass Mobile Bottom Navigation for Administration & Secretariat ─── */}
      <Suspense fallback={null}>
        <SecretaryMobileNavigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          secretarySubTab={secretarySubTab}
          setSecretarySubTab={setSecretarySubTab}
          campusSubTab={campusSubTab}
          setCampusSubTab={setCampusSubTab}
          groovelabSubTab={groovelabSubTab}
          setGroovelabSubTab={setGroovelabSubTab}
          hasCampusSub={hasCampusSub}
          crisisNotifications={crisisNotifications}
          enabledCampusSubjects={enabledCampusSubjects}
          enabledCampusRooms={enabledCampusRooms}
          enabledCampusEvents={enabledCampusEvents}
          enabledCampusSchedules={enabledCampusSchedules}
          pendingSchedules={pendingSchedules}
          mobileSecretaryDrawerOpen={mobileSecretaryDrawerOpen}
          setMobileSecretaryDrawerOpen={setMobileSecretaryDrawerOpen}
          setShowOwnQrModal={setShowOwnQrModal}
          setIsFeedbackModalOpen={setIsFeedbackModalOpen}
          onLogout={onLogout}
          handleSecretaryLogout={handleSecretaryLogout}
        />
      </Suspense>

      {/* ─── Approval Toast Notification ─── */}
      {approvalToast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: approvalToast.type === 'success' ? 'linear-gradient(135deg, #34a853, #22c55e)' : 'linear-gradient(135deg, #ea4335, #ef4444)', color: 'white', borderRadius: '16px', padding: '14px 24px', fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10, maxWidth: '90vw', whiteSpace: 'nowrap', animation: 'slideInUp 0.3s ease' }}>
          {approvalToast.message}
        </div>
      )}

      <TourComponent />
    </div>
  </div>
);
}
