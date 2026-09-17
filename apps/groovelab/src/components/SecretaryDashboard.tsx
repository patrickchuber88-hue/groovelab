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
import { useSecretarySettings } from './secretary/hooks/useSecretarySettings';
import { useSecretaryLicenses, computeB2BPricingMetrics } from './secretary/hooks/useSecretaryLicenses';
import { useSecretaryBookings } from './secretary/hooks/useSecretaryBookings';
import { useSecretaryLiveLab } from './secretary/hooks/useSecretaryLiveLab';
import { useSecretaryNavigation } from './secretary/hooks/useSecretaryNavigation';
import { usePremiumOnboardingTour, TourStep } from './PremiumOnboardingTour';
import { CampusGroovelabBrand, CampusGroovelabText, CampusGroovelabLogo } from './CampusGroovelabBrand';
import QRCode from 'react-qr-code';
import { getInstrumentAvatarUrl } from './StudioAvatar';
import { UpdateAnnouncementHero } from './common/UpdateAnnouncementHero';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { StudentToDelete } from './ConfirmDeleteStudentModal';
import { deleteStudentFully } from '../utils/studentDeletionService';
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
import { formatCleanNoteContent } from './notes/notesConstants';
import { DEFAULT_FOKUS_LEVELS } from '../utils/studentProgressEngine';
import { generateStarterPin } from './secretary/utils/secretaryAuthUtils';
import { useSecretaryStaff } from './secretary/hooks/useSecretaryStaff';
import { useSecretaryStudents } from './secretary/hooks/useSecretaryStudents';
import { useSecretaryCrisis } from './secretary/hooks/useSecretaryCrisis';
import { useSecretaryAnnouncements } from './secretary/hooks/useSecretaryAnnouncements';
import { useSecretaryEquipment } from './secretary/hooks/useSecretaryEquipment';
import { useSecretaryAudit } from './secretary/hooks/useSecretaryAudit';

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

  // 🧭 Step 3.20: Modular Secretary Navigation, Responsive Viewport & Shell Engine
  const {
    activeTab,
    setActiveTab,
    secretarySubTab,
    setSecretarySubTab,
    campusSubTab,
    setCampusSubTab,
    groovelabSubTab,
    setGroovelabSubTab,
    mobileSecretaryDrawerOpen,
    setMobileSecretaryDrawerOpen,
    windowWidth,
    windowHeight,
    containerWidth,
    setContainerWidth,
    containerRef,
    getTabTitle,
    handleSecretaryLogout
  } = useSecretaryNavigation({
    onLogout
  });

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
  // [EXTRACTED to useSecretaryNavigation: campusSubTab]
  const [enabledCampusSubjects, setEnabledCampusSubjects] = useState<boolean>(true);
  const [enabledCampusRooms, setEnabledCampusRooms] = useState<boolean>(true);
  const [enabledCampusEvents, setEnabledCampusEvents] = useState<boolean>(true);
  const [enabledCampusSchedules, setEnabledCampusSchedules] = useState<boolean>(true);
  const [enabledCalendarWidget, setEnabledCalendarWidget] = useState<boolean>(true);
  // [EXTRACTED to useSecretarySettings: handleToggleSetting, handleSaveSettingValue, handleToggleAutoClean, handleUpdateSchoolYear]
  const [schedulesRoomsViewMode, setSchedulesRoomsViewMode] = useState<'designer' | 'live'>('designer');
  const [roomsSubView, setRoomsSubView] = useState<'overview' | 'plan' | 'settings'>('overview');
  const [liveViewDay, setLiveViewDay] = useState<number>(1);
  const [showAdHocBooking, setShowAdHocBooking] = useState<boolean>(false);
  const [adHocRoomId, setAdHocRoomId] = useState<string | null>(null);
  const [adHocTeacherId, setAdHocTeacherId] = useState<string>('');
  const [adHocStudentName, setAdHocStudentName] = useState<string>('');
  const [adHocStartTime, setAdHocStartTime] = useState<string>('14:00');
  const [adHocDuration, setAdHocDuration] = useState<number>(45);
  // [EXTRACTED to useSecretaryNavigation: groovelabSubTab]
  const [teachersManageStudents, setTeachersManageStudents] = useState<boolean>(false);
  const [teachersManageTeachers, setTeachersManageTeachers] = useState<boolean>(false);
  const [campusTeachersManageStudents, setCampusTeachersManageStudents] = useState<boolean>(false);
  const [campusTeachersManageTeachers, setCampusTeachersManageTeachers] = useState<boolean>(false);
  // [EXTRACTED to useSecretaryBookings: pendingBookings]
  // [EXTRACTED to useSecretaryLiveLab: realtimeToast, activeSessions, liveSearchQuery]
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

  // Secretary Settings, Master Data, Biometrics & Disaster Recovery Engine
  const {
    schoolName,
    setSchoolName,
    schoolSubdomain,
    setSchoolSubdomain,
    schoolZipCode,
    setSchoolZipCode,
    schoolCity,
    setSchoolCity,
    schoolStreet,
    setSchoolStreet,
    schoolHouseNumber,
    setSchoolHouseNumber,
    schoolPhoneNumber,
    setSchoolPhoneNumber,
    schoolEmail,
    setSchoolEmail,
    absenceEmail,
    setAbsenceEmail,
    logoUrl,
    setLogoUrl,
    openingHours,
    setOpeningHours,
    kioskPinLength,
    setKioskPinLength,
    bypassPin,
    setBypassPin,
    logRetention,
    setLogRetention,
    syncInterval,
    setSyncInterval,
    calendarUrls,
    setCalendarUrls,
    newCalendarUrlInput,
    setNewCalendarUrlInput,
    schoolYearStartMonth,
    setSchoolYearStartMonth,
    schoolYearStartDay,
    setSchoolYearStartDay,
    autoDeleteExpiredUsers,
    setAutoDeleteExpiredUsers,
    initialSettings,
    setInitialSettings,
    isSavingSettings,
    isSettingsDirty,
    initSettingsFromSchool,
    handleSaveAllSettings,
    handleToggleSetting,
    handleSaveSettingValue,
    handleToggleAutoClean,
    handleUpdateSchoolYear,
    handleAddCalendarUrl,
    handleRemoveCalendarUrl,
    activeSecretarySettingsModal,
    setActiveSecretarySettingsModal,
    settingsTab,
    setSettingsTab,
    showResetModal,
    setShowResetModal,
    resetConfirmText,
    setResetConfirmText,
    isResetting,
    copiedSettingsPin,
    setCopiedSettingsPin,
    copiedSettingsLink,
    setCopiedSettingsLink,
    copiedKioskLink,
    setCopiedKioskLink,
    copiedSchoolLink,
    setCopiedSchoolLink,
    biometricsStatus,
    setBiometricsStatus,
    biometricsMessage,
    setBiometricsMessage,
    isCurrentDevicePasskeyActive,
    handleEnrollBiometrics,
    handleTestBiometrics,
    handleRemoveBiometrics,
    isExporting,
    isRestoring,
    lastBackupDate,
    setLastBackupDate,
    daysSinceLastBackup,
    showBackupAlert,
    handleExportBackup,
    handleRestoreBackup,
    handleResetSchool
  } = useSecretarySettings({
    schoolId: schoolId || '',
    userId: userId || '',
    currentUserProfile,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    fetchDashboardData: () => fetchDashboardData()
  });

  const [schoolEvents, setSchoolEvents] = useState<any[]>([]);
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);

  // 🏢 Step 3.18: Modular Secretary Room Bookings, Logbook & Facility Issues Engine
  const {
    pendingBookings,
    setPendingBookings,
    logbookBookings,
    setLogbookBookings,
    editingLogbookBookingId,
    setEditingLogbookBookingId,
    editBookingDate,
    setEditBookingDate,
    editBookingStartTime,
    setEditBookingStartTime,
    editBookingEndTime,
    setEditBookingEndTime,
    editBookingTitle,
    setEditBookingTitle,
    editBookingRoomId,
    setEditBookingRoomId,
    roomIssues,
    setRoomIssues,
    showLogbookModal,
    setShowLogbookModal,
    showFacilityLogModal,
    setShowFacilityLogModal,
    fetchPendingBookings,
    fetchLogbookBookings,
    fetchRoomIssues,
    handleConfirmBooking,
    handleRejectBooking,
    handleUpdateLogbookBooking,
    handleDeleteLogbookBooking,
    handleConfirmLogbookBooking,
    handleResolveRoomIssue,
    handleReopenRoomIssue
  } = useSecretaryBookings({
    schoolId: schoolId || '',
    supabase
  });

  const [activeContextMenu, setActiveContextMenu] = useState<{ student: any; top: number; right: number } | null>(null);
  // [EXTRACTED to useSecretarySettings: copiedSchoolLink, copiedKioskLink]
  const [showOwnQrModal, setShowOwnQrModal] = useState<boolean>(false);
  const [qrModalUser, setQrModalUser] = useState<any | null>(null);
  // 🎸 Step 3.19: Modular GrooveLab Live Lab, Sessions & Realtime Notifications Engine
  const {
    activeSessions,
    setActiveSessions,
    helpRequests,
    setHelpRequests,
    tickets,
    setTickets,
    liveSearchQuery,
    setLiveSearchQuery,
    realtimeToast,
    setRealtimeToast,
    holidayXpActive,
    setHolidayXpActive,
    selectedRoomId,
    setSelectedRoomId,
    zoomFactor,
    setZoomFactor,
    handleZoomChange,
    handleToggleHolidayXp,
    fetchLiveStatusData,
    handleLogoutStudent,
    showRealtimeNotification
  } = useSecretaryLiveLab({
    schoolId: schoolId || '',
    userId,
    supabase
  });

  // Visual Live Lab states & refs
  const [selectedCoachProfile, setSelectedCoachProfile] = useState<any>(null);
  // [EXTRACTED to useSecretaryNavigation: containerWidth, windowWidth, windowHeight, mobileSecretaryDrawerOpen, handleResize]

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

  // [EXTRACTED to useSecretaryNavigation: observerRef, containerRef]

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

  // Rooms and Stations States for Live Lab
  const [rooms, setRooms] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);

  // Trial & Linking States
  const [bands, setBands] = useState<any[]>([]);
  const [showTrialLogModal, setShowTrialLogModal] = useState(false);
  // [EXTRACTED to useSecretaryLicenses: trialLogs, trialLogsLoading]

  // Overhauled Room Board States
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [buildings, setBuildings] = useState<any[]>([]);

  // Guidance Modals
  const [showGuidanceModal, setShowGuidanceModal] = useState<boolean>(false);
  const [showParentInfoSheetModal, setShowParentInfoSheetModal] = useState<boolean>(false);
  const [guidanceInitialTab, setGuidanceInitialTab] = useState<'teacher' | 'parent'>('teacher');

  // [EXTRACTED to useSecretaryLicenses: userQuota, activeUserQuota, pendingUserQuota]
  const [showDualRoleNotice, setShowDualRoleNotice] = useState<boolean>(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('groovelab_dual_role_switched_notice') === 'true';
  });

  // School Data & Subscription
  const [isAvvSigned, setIsAvvSigned] = useState<boolean>(true);
  const [showAvvModal, setShowAvvModal] = useState<boolean>(false);
  const [enabledQrLogin, setEnabledQrLogin] = useState<boolean>(true);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);

  const INSTRUMENT_TAGS = ['Schlagzeug', 'Piano', 'Gitarre', 'Gesang', 'Geige', 'Querflöte', 'Saxophon', 'Bass', 'Keyboard', 'Trompete'];
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

  // [EXTRACTED to useSecretarySettings: schoolName, schoolSubdomain, schoolAddress, openingHours, schoolYearStart]
  const [editColor, setEditColor] = useState<string>('#1a73e8'); // Google Blue

  // 💳 Bounded Context: Licenses, Subscriptions, User Quota & B2B Billing Hook
  const {
    hasCampusSub,
    setHasCampusSub,
    hasGroovelabSub,
    setHasGroovelabSub,
    campusActivatedThisMonth,
    setCampusActivatedThisMonth,
    groovelabActivatedThisMonth,
    setGroovelabActivatedThisMonth,
    studentBillingOption,
    setStudentBillingOption,
    isBillingBooked,
    setIsBillingBooked,
    bookedExtraUsers,
    setBookedExtraUsers,
    extraUsersSliderVal,
    setExtraUsersSliderVal,
    extraBillingOption,
    setExtraBillingOption,
    nextBillingOption,
    setNextBillingOption,
    nextBillingOptionEffectiveAt,
    setNextBillingOptionEffectiveAt,
    showChangeTariffModal,
    setShowChangeTariffModal,
    showCheckoutModal,
    setShowCheckoutModal,
    checkoutStep,
    setCheckoutStep,
    billingPayer,
    setBillingPayer,
    showSuccessModal,
    setShowSuccessModal,
    customUmlageAmount,
    setCustomUmlageAmount,
    agreedToTerms,
    setAgreedToTerms,
    couponCode,
    setCouponCode,
    isCouponApplied,
    setIsCouponApplied,
    couponDiscount,
    setCouponDiscount,
    showCouponInput,
    setShowCouponInput,
    hasCustomBillingAddress,
    setHasCustomBillingAddress,
    customBillingName,
    setCustomBillingName,
    customBillingStreet,
    setCustomBillingStreet,
    customBillingZip,
    setCustomBillingZip,
    customBillingCity,
    setCustomBillingCity,
    customBillingEmail,
    setCustomBillingEmail,
    customBillingLeitwegId,
    setCustomBillingLeitwegId,
    hasCustomActivationBillingAddress,
    setHasCustomActivationBillingAddress,
    customActivationBillingName,
    setCustomActivationBillingName,
    customActivationBillingStreet,
    setCustomActivationBillingStreet,
    customActivationBillingZip,
    setCustomActivationBillingZip,
    customActivationBillingCity,
    setCustomActivationBillingCity,
    customActivationBillingEmail,
    setCustomActivationBillingEmail,
    selectedStorageAddonGb,
    setSelectedStorageAddonGb,
    selectedStorageAddonFee,
    setSelectedStorageAddonFee,
    showStorageManagerModal,
    setShowStorageManagerModal,
    isSubmittingStorage,
    setIsSubmittingStorage,
    storageBookingSuccessModal,
    setStorageBookingSuccessModal,
    showSwitchBillingModelModal,
    setShowSwitchBillingModelModal,
    selectedSwitchTargetPayer,
    setSelectedSwitchTargetPayer,
    isSwitchingPayer,
    setIsSwitchingPayer,
    showStorageTerminationModal,
    setShowStorageTerminationModal,
    storageTerminationDays,
    setStorageTerminationDays,
    agreedToSepa,
    setAgreedToSepa,
    selectedInvoice,
    setSelectedInvoice,
    showConfirmExtra,
    setShowConfirmExtra,
    isSchoolTrial,
    setIsSchoolTrial,
    schoolTrialEndsAt,
    setSchoolTrialEndsAt,
    schoolStatus,
    setSchoolStatus,
    subscriptionBypass,
    setSubscriptionBypass,
    contractStartDate,
    setContractStartDate,
    isCancelled,
    setIsCancelled,
    schoolContractEndsAt,
    setSchoolContractEndsAt,
    cancellationReason,
    setCancellationReason,
    lastCancellationId,
    setLastCancellationId,
    showCancelModal,
    setShowCancelModal,
    showModuleUpgradeModal,
    setShowModuleUpgradeModal,
    upgradeTargetModule,
    setUpgradeTargetModule,
    upgradeProcessing,
    setUpgradeProcessing,
    userQuota,
    setUserQuota,
    activeUserQuota,
    setActiveUserQuota,
    pendingUserQuota,
    setPendingUserQuota,
    handleSaveQuota,
    tariffBookings,
    setTariffBookings,
    loadingTariffBookings,
    setLoadingTariffBookings,
    fetchTariffBookings,
    trialLogs,
    setTrialLogs,
    trialLogsLoading,
    setTrialLogsLoading,
    fetchTrialLogs,
    generateMailtoLink,
    handleConfirmStudentTrial,
    handleDeactivateStudentTrial,
    trialDaysRemaining,
    isTrialExpired,
    getTrialDaysRemaining,
    getSchoolYearEndInfo,
    getRemainingMonthsAndPrice,
    getDynamicAnnualPrice,
    downloadCancellationReceiptPdf,
    downloadUpgradeConfirmationPdf,
    handleDeveloperReset,
    handleToggleCampusSub,
    handleToggleGroovelabSub,
    handleUpdateStudentBillingOption,
    handleUpdateExtraBillingOption,
    initBillingFromSchool
  } = useSecretaryLicenses({
    schoolId: schoolId || '',
    schoolNumericId: schoolNumericId || '',
    schoolName,
    currentSchoolProfile,
    setCurrentSchoolProfile,
    currentUserProfile,
    supabase,
    fetchDashboardData: () => fetchDashboardData(),
    masterPricing,
    effectiveSchoolRates,
    subjects,
    openingHours,
    schoolYearStartMonth,
    schoolYearStartDay
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
  // [EXTRACTED to useSecretaryLicenses: isCancelled, schoolContractEndsAt, cancellationReason, lastCancellationId, showModuleUpgradeModal, upgradeTargetModule, upgradeProcessing]

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
  // [EXTRACTED to useSecretaryLicenses: showCancelModal]
  const [selectedModalOption, setSelectedModalOption] = useState<string>('option1');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [limitsEnabled, setLimitsEnabled] = useState<boolean>(false);
  const [selectedDashboardMonth, setSelectedDashboardMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDashboardYear, setSelectedDashboardYear] = useState<number>(() => new Date().getFullYear());
  const [activeBillingSubTab, setActiveBillingSubTab] = useState<'overview' | 'matching' | 'history' | 'ledger'>('overview');
  // [EXTRACTED to useSecretaryLicenses: tariffBookings, loadingTariffBookings]
  const [activeStudentsModalList, setActiveStudentsModalList] = useState<{ list: any[], month: string, amount?: number, campusCount?: number, groovelabCount?: number, passiveCount?: number } | null>(null);
  const [activationSearchQuery, setActivationSearchQuery] = useState<string>('');
  const [modalStudentSearchQuery, setModalStudentSearchQuery] = useState<string>('');

  // [EXTRACTED to useSecretaryLicenses: getSchoolYearEndInfo, downloadCancellationReceiptPdf, downloadUpgradeConfirmationPdf, getDynamicAnnualPrice, handleDeveloperReset]
  
  // Apple-style settings panel states
  // [EXTRACTED to useSecretarySettings: settingsTab, activeSecretarySettingsModal]
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

  // [EXTRACTED to useSecretarySettings: initialSettings, kioskPinLength, bypassPin, logRetention, syncInterval, logoUrl, calendarUrls, showResetModal, handleResetSchool, handleExportBackup, handleRestoreBackup]
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

  // Unified teacher profiles list for bulk operations & modals
  const allUniqueTeacherProfiles = useMemo(() => {
    return [...(campusTeachers || []), ...(bypassTeachers || []), ...(coaches || []), ...(allTeachers || [])].reduce((acc: any[], t: any) => {
      if (t?.id && !acc.some((x: any) => x.id === t.id)) {
        acc.push(t);
      }
      return acc;
    }, []);
  }, [campusTeachers, bypassTeachers, coaches, allTeachers]);

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

  // Global pricing calculations for use in briefing & invoice lists (EXTRACTED to computeB2BPricingMetrics)
  const {
    billedCampus_global,
    billedGroovelab_global,
    activeModulesCount_global,
    moduleCost_global,
    activeStudentsCount_global,
    activeGroovelabStudentsCount_global,
    passiveStudentsCount_global,
    billableTeachersCount,
    isSammelzahler,
    campusActivationFeeTotal_global,
    groovelabActivationFeeTotal_global,
    passiveStudentFeeTotal_global,
    teacherServiceFeeTotal_global,
    storageAddonFee_global,
    baseB2B_global,
    studentLevyMonthly_global,
    extraLevyMonthly_global,
    studentSharePreview_global,
    schoolShareBookedExtra_global,
    currentTotalB2B_global,
    mixedTotal_global
  } = useMemo(() => computeB2BPricingMetrics({
    isBillingBooked,
    hasCampusSub,
    campusActivatedThisMonth,
    hasGroovelabSub,
    groovelabActivatedThisMonth,
    effectiveSchoolRates,
    students,
    campusTeachers,
    bypassTeachers,
    coaches,
    allTeachers,
    billingPayer,
    studentBillingOption,
    selectedStorageAddonGb,
    selectedStorageAddonFee,
    currentSchoolProfile,
    subscriptionBypass,
    extraBillingOption,
    bookedExtraUsers
  }), [
    isBillingBooked,
    hasCampusSub,
    campusActivatedThisMonth,
    hasGroovelabSub,
    groovelabActivatedThisMonth,
    effectiveSchoolRates,
    students,
    campusTeachers,
    bypassTeachers,
    coaches,
    allTeachers,
    billingPayer,
    studentBillingOption,
    selectedStorageAddonGb,
    selectedStorageAddonFee,
    currentSchoolProfile,
    subscriptionBypass,
    extraBillingOption,
    bookedExtraUsers
  ]);
  // [EXTRACTED to useSecretarySettings: daysSinceLastBackup, showBackupAlert, isSettingsDirty]

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

  const {
    schoolEquipment,
    setSchoolEquipment,
    equipmentFormName,
    setEquipmentFormName,
    equipmentFormQty,
    setEquipmentFormQty,
    editingEquipment,
    setEditingEquipment,
    equipmentSaving,
    setEquipmentSaving,
    selectedEquipmentRoomId,
    setSelectedEquipmentRoomId,
    dragOverRoomId,
    setDragOverRoomId,
    equipmentSearchQuery,
    setEquipmentSearchQuery,
    equipmentSortFreeFirst,
    setEquipmentSortFreeFirst,
    equipmentNameInputRef,
    equipmentQtyInputRef,
    editingRoomInstrument,
    setEditingRoomInstrument,
    editRoomInstFormName,
    setEditRoomInstFormName,
    editRoomInstFormModel,
    setEditRoomInstFormModel,
    editingEquipmentGroup,
    setEditingEquipmentGroup,
    editGroupName,
    setEditGroupName,
    editGroupModel,
    setEditGroupModel,
    editGroupLink,
    setEditGroupLink,
    editGroupCoupled,
    setEditGroupCoupled,
    editGroupQty,
    setEditGroupQty,
    editGroupInstancesData,
    setEditGroupInstancesData,
    fetchSchoolEquipment,
    handleSaveEquipment,
    handleQtyChange,
    handleSaveEquipmentGroup,
    handleDeleteEquipment,
    openEquipmentEditor,
    handleDropInstrumentOnRoom,
    handleRemoveRoomInstrument,
    handleSaveRoomInstrumentEdit
  } = useSecretaryEquipment({
    schoolId,
    rooms,
    setRooms
  });

  // Helpers
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [roomMap, setRoomMap] = useState<Record<string, string>>({});

  // 🛡️ Step 3.15: Modular Audit Log Governance Hook
  const {
    auditLogs,
    auditLoading,
    auditSearchQuery,
    setAuditSearchQuery,
    auditActionFilter,
    setAuditActionFilter,
    auditLimit,
    setAuditLimit,
    exportAuditLogsToCsv,
    translateKey,
    translateValue
  } = useSecretaryAudit({
    schoolId,
    activeTab,
    secretarySubTab,
    userMap
  });
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
  const [briefingData, setBriefingData] = useState<SecretaryBriefingData | null>(null);
  const {
    crisisNotifications,
    setCrisisNotifications,
    crisisTabMode,
    setCrisisTabMode,
    selectedCrisisTeacherId,
    setSelectedCrisisTeacherId,
    selectedArchiveLog,
    setSelectedArchiveLog,
    expandedLiveDayStr,
    setExpandedLiveDayStr,
    fetchCrisisNotifications,
    handleMarkAsNotified,
    handleArchiveCrisisTicket,
    handleArchiveAllResolvedTickets,
    handleClaimTicket,
    handleEndAbsenceOnBehalf
  } = useSecretaryCrisis({
    schoolId,
    onRefreshDashboard: () => fetchDashboardData()
  });

  const {
    announcementsList,
    setAnnouncementsList,
    announcementsLoading,
    setAnnouncementsLoading,
    newAnnouncementTitle,
    setNewAnnouncementTitle,
    newAnnouncementDescription,
    setNewAnnouncementDescription,
    newAnnouncementType,
    setNewAnnouncementType,
    newAnnouncementQuestions,
    setNewAnnouncementQuestions,
    newAnnouncementQuestionType,
    setNewAnnouncementQuestionType,
    newAnnouncementQuestionOptions,
    setNewAnnouncementQuestionOptions,
    newAnnouncementPriority,
    setNewAnnouncementPriority,
    newAnnouncementIsAnonymous,
    setNewAnnouncementIsAnonymous,
    newAnnouncementTargetType,
    setNewAnnouncementTargetType,
    newAnnouncementTargetGroup,
    setNewAnnouncementTargetGroup,
    newAnnouncementTargetTeacherId,
    setNewAnnouncementTargetTeacherId,
    newAnnouncementDueDate,
    setNewAnnouncementDueDate,
    newAnnouncementRecurrence,
    setNewAnnouncementRecurrence,
    newAnnouncementAttachmentUrl,
    setNewAnnouncementAttachmentUrl,
    isUploadingAnnouncementAttachment,
    setIsUploadingAnnouncementAttachment,
    selectedAnnouncementForStats,
    setSelectedAnnouncementForStats,
    statsSearchQuery,
    setStatsSearchQuery,
    statsStatusFilter,
    setStatsStatusFilter,
    statsModalTab,
    setStatsModalTab,
    announcementResponsesList,
    setAnnouncementResponsesList,
    newAnnouncementQuestionInput,
    setNewAnnouncementQuestionInput,
    editingAnnouncementId,
    setEditingAnnouncementId,
    expandedResponseIds,
    setExpandedResponseIds,
    fetchAnnouncements,
    handleUploadAnnouncementAttachment,
    handleMoveQuestion,
    handleCreateAnnouncement,
    handleDeleteAnnouncement,
    fetchAnnouncementStats,
    getAnnouncementTargetedTeachers,
    handleSendReminder,
    handleExportCSV
  } = useSecretaryAnnouncements({
    schoolId,
    currentUserProfile,
    campusTeachers,
    bypassTeachers,
    coaches,
    setApprovalToast
  });

  // Realtime subscription for system alerts, bookings, and user profiles with 500ms settling debounce
  useEffect(() => {
    if (!schoolId) return;
    
    fetchPendingBookings();

    const handleRefresh = () => {
      fetchPendingBookings();
    };
    window.addEventListener('refresh-bookings', handleRefresh);

    let dashboardTimeout: any = null;

    const debouncedFetchDashboardData = () => {
      if (dashboardTimeout) clearTimeout(dashboardTimeout);
      dashboardTimeout = setTimeout(() => {
        fetchDashboardData();
      }, 500);
    };

    const channel = supabase
      .channel(`realtime_secretary_dashboard_${schoolId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_alerts' }, () => {
        debouncedFetchDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `school_id=eq.${schoolId}` }, () => {
        debouncedFetchDashboardData();
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
          fetchRoomIssues();
        } catch (e) {}
      })
      .subscribe();

    return () => {
      if (dashboardTimeout) clearTimeout(dashboardTimeout);
      supabase.removeChannel(channel);
      window.removeEventListener('refresh-bookings', handleRefresh);
    };
  }, [schoolId]);

  useEffect(() => {
    fetchDashboardData();
  }, [schoolId]);

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

  // [EXTRACTED to useSecretaryLiveLab: fetchLiveStatusData, handleLogoutStudent, showRealtimeNotification]

  // [EXTRACTED to useSecretaryBookings: fetchPendingBookings, handleConfirmBooking, handleRejectBooking, fetchLogbookBookings, handleUpdateLogbookBooking, handleDeleteLogbookBooking, handleConfirmLogbookBooking]

  // [EXTRACTED to useSecretaryLicenses: fetchTariffBookings]


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
        initSettingsFromSchool(schoolData);
        setKioskToken(schoolData.groovelab_kiosk_token || '');
        setCampusToken(schoolData.campus_login_token || '');
        setAllowMessagesGlobal(schoolData.allow_messages_global ?? true);
        // Hydrate all billing, license, subscription and quota settings (EXTRACTED to useSecretaryLicenses)
        initBillingFromSchool(schoolData);
        
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

      // Fetch school room issues & facility defects (EXTRACTED to useSecretaryBookings)
      try {
        await fetchRoomIssues();
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
  // [EXTRACTED to useSecretaryLiveLab: handleToggleHolidayXp]
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

  // [EXTRACTED to useSecretaryLicenses: handleToggleCampusSub, handleToggleGroovelabSub]


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

  // [EXTRACTED to useSecretaryLicenses: handleUpdateStudentBillingOption, handleUpdateExtraBillingOption]


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

  // [EXTRACTED to useSecretaryLicenses: handleSaveQuota, getRemainingMonthsAndPrice, fetchTrialLogs, generateMailtoLink, handleConfirmStudentTrial, handleDeactivateStudentTrial]

  // [EXTRACTED to SecretaryVerwaltungTab: renderAnnouncementsBoard]


// [EXTRACTED to SecretaryStudentsView & useSecretarySchedules: handleLinkProfiles, handleToggleTeacherGroovelab, handleScheduleDecision]


  // [EXTRACTED to useSecretaryNavigation: getTabTitle]
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
