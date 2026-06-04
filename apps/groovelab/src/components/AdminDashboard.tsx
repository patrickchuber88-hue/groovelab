import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Calendar, AlertCircle, Library, Shield, LogOut, Users, User, Monitor, QrCode, Plus, Pencil, Trash2, Box, BarChart as LucideBarChart, Clock, Star, PieChart as LucidePieChart, TrendingUp, Tablet, ExternalLink, Settings, Search, Bell, MapPin, X, Printer, Award, Download, Mic, Check, ChevronLeft, ChevronRight, GripVertical, BookOpen, Maximize2, ArrowLeft, GraduationCap, Lock } from 'lucide-react';
import { 
  ResponsiveContainer,
  BarChart as RechartsBarChart, Bar, XAxis, Tooltip, Cell,
  PieChart as RechartsPieChart, Pie,
  Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';
import { renderInstrumentIcon } from '../utils/instruments';
import { StudentDetailModal } from './StudentDetailModal';
import { ScheduleBoard } from './ScheduleBoard';
import { MeisterwerkDocumentationModal } from './MeisterwerkDocumentationModal';

const cleanRoomName = (name: string | null | undefined): string => {
  if (!name) return 'Unbenannter Raum';
  return name.replace(/^#\d+\s*[-:]*\s*/, '').trim();
};

const DEFAULT_IMPRESSUM = `Angaben gemäß § 5 TMG
Manuel Wagner
Friedrichstr. 33
79713 Bad Säckingen

Kontakt
Mo-Fr: 08-15 Uhr
Telefon: 07761 – 2416
E-Mail: info@musaek.de

EU-Streitschlichtung
Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr/.
Unsere E-Mail-Adresse finden Sie oben im Impressum.

Verbraucherstreitbeilegung / Universalschlichtungsstelle
Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.`;

const INSTRUMENT_COLORS: Record<string, string> = {
  "Guitar": "#ef4444", "E-Gitarre": "#ef4444",
  "Bass": "#eab308", "E-Bass": "#eab308", 
  "Drums": "#3b82f6", "E-Drums": "#3b82f6", 
  "Vocals": "#22c55e", 
  "Piano": "#a855f7", "E-Piano": "#a855f7", "Keys": "#a855f7" 
};
const ADMIN_INSTRUMENT_ICONS: Record<string, any> = { 
  "Gitarre": renderInstrumentIcon("Gitarre"), 
  "Guitar": renderInstrumentIcon("Guitar"), 
  "E-Gitarre": renderInstrumentIcon("E-Gitarre"),
  "Bass": renderInstrumentIcon("Bass"), 
  "E-Bass": renderInstrumentIcon("E-Bass"), 
  "Drums": renderInstrumentIcon("Drums"), 
  "E-Drums": renderInstrumentIcon("E-Drums"), 
  "Vocals": renderInstrumentIcon("Vocals"), 
  "Gesang": renderInstrumentIcon("Gesang"),
  "Piano / Keys": renderInstrumentIcon("Keys"), 
  "Piano": renderInstrumentIcon("Piano"), 
  "E-Piano": renderInstrumentIcon("E-Piano"), 
  "Keys": renderInstrumentIcon("Keys")
};
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

const resolveCampusAvatar = (u: any): string => {
  if (!u) return '/avatar_ghost.jpg';
  const role = (u.role || '').toLowerCase();
  
  if (role === 'student') {
    const studentInstrument = u.instrument || 'Allgemein';
    const inst = studentInstrument.toLowerCase().trim();
    if (inst.includes('guitar') || inst.includes('gitarre')) {
      if (u.photo_url && (u.photo_url.includes('egitarre_avatar') || u.photo_url.includes('gitarre_avatar_new'))) {
        return u.photo_url;
      }
      return '/avatars/gitarre_avatar_new.png';
    }
    return getInstrumentAvatarUrl(studentInstrument);
  } else {
    // Teachers / Admins
    return getInstrumentAvatarUrl(u.instrument);
  }
};

const getInstrumentTypeKey = (instrument: string | null | undefined): string => {
  if (!instrument) return 'guitarist';
  const inst = instrument.toLowerCase().trim();
  if (inst.includes('guitar') || inst.includes('gitarre')) return 'guitarist';
  if (inst.includes('bass')) return 'bassist';
  if (inst.includes('drum') || inst.includes('schlagzeug')) return 'drummer';
  if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier') || inst.includes('keyboard')) return 'keyboardist';
  if (inst.includes('vocal') || inst.includes('gesang') || inst.includes('stimme') || inst.includes('singer')) return 'vocalist';
  if (inst.includes('trompete') || inst.includes('trumpet')) return 'trumpetist';
  if (inst.includes('posaune') || inst.includes('trombone')) return 'trombonist';
  if (inst.includes('horn')) return 'hornist';
  if (inst.includes('cello')) return 'cellist';
  if (inst.includes('geige') || inst.includes('violin') || inst.includes('violine')) return 'violinist';
  if (inst.includes('klarinette') || inst.includes('clarinet')) return 'clarinetist';
  if (inst.includes('querflöte') || inst.includes('flute')) return 'flutist';
  if (inst.includes('saxofon') || inst.includes('saxophone') || inst.includes('sax')) return 'saxophonist';
  return 'guitarist';
};
const brandColor = "#16a34a";
import { TeacherDashboard } from './TeacherDashboard';
import { ElegantBirthdayPicker } from './ElegantBirthdayPicker';
import QRCode from 'react-qr-code';


const TEACHER_AVATARS = [
  { id: 't_male', url: '/avatar_teacher_male.jpg', label: 'Academy Coach M' },
  { id: 't_female', url: '/avatar_teacher_female.jpg', label: 'Academy Coach F' },
  { id: 't_expert', url: '/avatar_teacher_expert.jpg', label: 'Expert Coach' },
  { id: 't_clean', url: '/avatar_teacher_clean.jpg', label: 'Classic Coach' },
  { id: 't_drummer', url: '/avatar_teacher_drummer.jpg', label: 'Beat Coach' },
  { id: 't_drums', url: '/avatar_teacher_drums.jpg', label: 'Percussion Expert' },
  { id: 't_gold', url: '/avatar_teacher_gold_glasses.jpg', label: 'Session Pro' },
  { id: 't_senior', url: '/avatar_teacher_senior.jpg', label: 'Senior Mentor' }
];

const STUDENT_AVATARS = [
  { id: 'avatar_blockfloete', url: '/avatars/blockfloete_avatar.png', label: 'Blockflöte' },
  { id: 'avatar_bariton', url: '/avatars/bariton_avatar.png', label: 'Bariton' },
  { id: 'avatar_cello', url: '/avatars/cello_avatar_new.png', label: 'Cello' },
  { id: 'avatar_ebass', url: '/avatars/ebass_avatar.png', label: 'E-Bass' },
  { id: 'avatar_egitarre', url: '/avatars/egitarre_avatar.png', label: 'E-Gitarre' },
  { id: 'avatar_guitar', url: '/avatars/gitarre_avatar_new.png', label: 'Gitarre' },
  { id: 'avatar_horn', url: '/avatars/horn_avatar_new.png', label: 'Horn' },
  { id: 'avatar_clarinet', url: '/avatars/klarinette_avatar_new.png', label: 'Klarinette' },
  { id: 'avatar_piano', url: '/avatars/klavier_avatar_new.png', label: 'Piano / Keys' },
  { id: 'avatar_kontrabass', url: '/avatars/kontrabass_avatar.png', label: 'Kontrabass' },
  { id: 'avatar_oboe', url: '/avatars/oboe_avatar.png', label: 'Oboe' },
  { id: 'avatar_trombone', url: '/avatars/posaune_avatar.png', label: 'Posaune' },
  { id: 'avatar_flute', url: '/avatars/querfloete_avatar.png', label: 'Querflöte' },
  { id: 'avatar_saxophone', url: '/avatars/saxophon_avatar_new.png', label: 'Saxofon' },
  { id: 'avatar_drums', url: '/avatars/schlagzeug_avatar.png', label: 'Drums' },
  { id: 'avatar_trumpet', url: '/avatars/trompete_avatar_new.png', label: 'Trompete' },
  { id: 'avatar_violin', url: '/avatars/violine_avatar_new.png', label: 'Geige' },
  { id: 'avatar_vocals', url: '/avatars/gesang_avatar.png', label: 'Vocals' }
];

const getStationColor = (name: string | null | undefined) => {
  if (!name) return '#64748b';
  if (name.toLowerCase().includes('lehrer')) return '#22c55e'; // Green
  const match = name.match(/\d+/);
  if (!match) return '#64748b';
  const num = parseInt(match[0]);
  if (num === 1 || num === 2) return '#ef4444'; // Red
  if (num === 3 || num === 4) return '#a855f7'; // Purple
  if (num === 5 || num === 6) return '#3b82f6'; // Blue
  if (num === 7 || num === 8) return '#eab308'; // Yellow
  return '#64748b';
};

interface AdminDashboardProps {
  userId: string;
  onLogout: () => void;
  forceTab?: string;
  onTabChange?: (tab: string) => void;
  onOpenBandProfile?: (band: any) => void;
  activePlatform?: 'campus' | 'groovelab';
}

export function AdminDashboard({ userId, onLogout, forceTab, onTabChange, onOpenBandProfile, activePlatform = 'groovelab' }: AdminDashboardProps) {
  const [admin, setAdmin] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [allBands, setAllBands] = useState<any[]>([]);
  const [galleryStudents, setGalleryStudents] = useState<any[]>([]);
  const [setupRooms, setSetupRooms] = useState<any[]>([]);
  const [setupStations, setSetupStations] = useState<any[]>([]);
  const [kiosks, setKiosks] = useState<any[] | null>(null);
  const tabStorageKey = activePlatform === 'campus' ? 'campus_active_tab' : 'groovelab_active_tab';
  const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem(activePlatform === 'campus' ? 'campus_active_tab' : 'groovelab_active_tab') || forceTab || 'live');
  const [mediathekTab, setMediathekTab] = useState<'songs' | 'lehrwerke'>('songs');
  const [lehrwerke, setLehrwerke] = useState<any[]>([]);
  const [showAddLehrwerk, setShowAddLehrwerk] = useState(false);
  const [newLehrwerk, setNewLehrwerk] = useState({ title: '', author: '', totalPages: 50 });
  const [editingLehrwerk, setEditingLehrwerk] = useState<any | null>(null);
  const [bulkModeLehrwerke, setBulkModeLehrwerke] = useState(false);
  const [bulkTextLehrwerke, setBulkTextLehrwerke] = useState('');
  const [selectedLehrwerkForDetail, setSelectedLehrwerkForDetail] = useState<any | null>(null);
  const [selectedStudentForProgress, setSelectedStudentForProgress] = useState<any | null>(null);
  const [selectedBrush, setSelectedBrush] = useState<'unbearbeitet' | 'in_progress' | 'mastered' | 'theory_done'>('in_progress');
  const [weeklyHomeworkNotesList, setWeeklyHomeworkNotesList] = useState<string[]>([]);
  const [newHomeworkNoteText, setNewHomeworkNoteText] = useState('');
  const [lessonDayForProgress, setLessonDayForProgress] = useState<number>(1);
  const [selectedSongForDetail, setSelectedSongForDetail] = useState<any | null>(null);
  const [assignedSongSkills, setAssignedSongSkills] = useState<any[]>([]);
  const [isEditingSongHeader, setIsEditingSongHeader] = useState(false);
  const [editSongTitle, setEditSongTitle] = useState('');
  const [editSongArtist, setEditSongArtist] = useState('');
  const [editSongInstrumentation, setEditSongInstrumentation] = useState<Record<string, number>>({});
  const [assignSongStudentInstrument, setAssignSongStudentInstrument] = useState<string>('E-Gitarre');
  const [selectedSongSkill, setSelectedSongSkill] = useState<any | null>(null);
  const [songRhythmVal, setSongRhythmVal] = useState<number>(25);
  const [songFingerVal, setSongFingerVal] = useState<number>(25);
  const [songDynamicsVal, setSongDynamicsVal] = useState<number>(25);
  const [songTotalProgressVal, setSongTotalProgressVal] = useState<number>(25);
  const [songInternalNotes, setSongInternalNotes] = useState<string>('');
  const [songLessonNotes, setSongLessonNotes] = useState<string>('');
  const [songLessonNotesList, setSongLessonNotesList] = useState<string[]>([]);
  const [songStatus, setSongStatus] = useState<'unbearbeitet' | 'in_progress' | 'mastered'>('unbearbeitet');
  const [showSongProgressDetails, setShowSongProgressDetails] = useState<boolean>(true);

  // Campus Bookings states
  const [selectedCampusRoomId, setSelectedCampusRoomId] = useState<string>(() => rooms[0]?.id || '');
  const [favoriteRoomId, setFavoriteRoomId] = useState<string | null>(() => localStorage.getItem(`groovelab_favorite_room_id_${userId}`));
  const consolidateBookings = (bookings: any[]) => {
    const timeToMins = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const minsToTime = (mins: number) => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    // Group bookings by room, date, teacher, and whether it's a schedule
    const groups: { [key: string]: any[] } = {};
    bookings.forEach(b => {
      if (b.isSchedule) return;
      const key = `${b.roomId}_${b.date}_${b.teacherId}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });

    const processedIds = new Set<string>();
    const consolidated: any[] = [];

    // Add all weekly schedules as is
    bookings.filter(b => b.isSchedule).forEach(b => consolidated.push(b));

    // Process groups
    Object.keys(groups).forEach(key => {
      const list = groups[key];
      if (list.length === 0) return;

      // Sort by start time
      const sorted = [...list].sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));
      
      let current = sorted[0];
      processedIds.add(current.id);

      for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        const currentEnd = timeToMins(current.endTime);
        const nextStart = timeToMins(next.startTime);

        if (currentEnd >= nextStart) {
          // Merge next into current
          const nextEnd = timeToMins(next.endTime);
          const maxEnd = Math.max(currentEnd, nextEnd);
          current = {
            ...current,
            endTime: minsToTime(maxEnd),
            purpose: current.purpose === next.purpose 
              ? current.purpose 
              : `${current.purpose} / ${next.purpose}`
          };
          processedIds.add(next.id);
        } else {
          consolidated.push(current);
          current = next;
          processedIds.add(current.id);
        }
      }
      consolidated.push(current);
    });

    // Add any manual bookings that were not processed (just in case)
    bookings.forEach(b => {
      if (!b.isSchedule && !processedIds.has(b.id)) {
        consolidated.push(b);
      }
    });

    return consolidated;
  };

  const [campusBookings, setCampusBookingsRaw] = useState<any[]>(() => {
    const stored = localStorage.getItem('groovelab_campus_bookings');
    const initial = stored ? JSON.parse(stored) : [];
    return consolidateBookings(initial);
  });

  const setCampusBookings = (val: any[] | ((prev: any[]) => any[])) => {
    setCampusBookingsRaw(prev => {
      const updated = typeof val === 'function' ? val(prev) : val;
      return consolidateBookings(updated);
    });
  };

  const [hasInitializedRoom, setHasInitializedRoom] = useState(false);

  const myRooms = React.useMemo(() => {
    const roomIds = new Set<string>();
    
    // 1. Check weekly schedules
    if (schedules && schedules.length > 0) {
      schedules.forEach((s: any) => {
        const isOwn = s.teacher_id === userId || (admin && s.teacher?.first_name && `${s.teacher.first_name} ${s.teacher.last_name}`.trim().toLowerCase() === `${admin.first_name || ''} ${admin.last_name || ''}`.trim().toLowerCase());
        if (isOwn && s.room_id) {
          roomIds.add(s.room_id);
        }
      });
    }

    // 2. Check manual bookings
    if (campusBookings && campusBookings.length > 0) {
      campusBookings.forEach((b: any) => {
        const isOwn = b.teacherId === userId || (admin && b.teacherName && b.teacherName.trim().toLowerCase() === `${admin.first_name || ''} ${admin.last_name || ''}`.trim().toLowerCase());
        if (isOwn && b.roomId) {
          roomIds.add(b.roomId);
        }
      });
    }

    return rooms.filter((r: any) => roomIds.has(r.id));
  }, [rooms, schedules, campusBookings, userId, admin]);

  // Pre-select the room where the teacher teaches today
  useEffect(() => {
    if (hasInitializedRoom) return;
    if (!userId || !myRooms || myRooms.length === 0) return;
    
    const today = new Date();
    const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDayName = DAYS_MAP[today.getDay()];
    const todayDayIndex = today.getDay();
    const todayDateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    // 1. Look for a room with a schedule today
    const todaySchedule = schedules.find((s: any) => {
      const isOwn = s.teacher_id === userId || (admin && s.teacher?.first_name && `${s.teacher.first_name} ${s.teacher.last_name}`.trim().toLowerCase() === `${admin.first_name || ''} ${admin.last_name || ''}`.trim().toLowerCase());
      const matchesDay = s.day_of_week === todayDayName || String(s.day_of_week) === String(todayDayIndex);
      return isOwn && matchesDay && s.room_id;
    });

    if (todaySchedule && todaySchedule.room_id) {
      setSelectedCampusRoomId(todaySchedule.room_id);
      setHasInitializedRoom(true);
      return;
    }

    // 2. Look for a room with a manual booking today
    const todayBooking = campusBookings.find((b: any) => {
      const isOwn = b.teacherId === userId || (admin && b.teacherName && b.teacherName.trim().toLowerCase() === `${admin.first_name || ''} ${admin.last_name || ''}`.trim().toLowerCase());
      return isOwn && b.date === todayDateStr && b.roomId;
    });

    if (todayBooking && todayBooking.roomId) {
      setSelectedCampusRoomId(todayBooking.roomId);
      setHasInitializedRoom(true);
      return;
    }

    // 3. Fallback: select the first of the teacher's rooms if selectedCampusRoomId is empty or not in myRooms
    const currentIsValid = myRooms.some((r: any) => r.id === selectedCampusRoomId);
    if (!selectedCampusRoomId || !currentIsValid) {
      setSelectedCampusRoomId(myRooms[0].id);
    }
    setHasInitializedRoom(true);
  }, [myRooms, schedules, campusBookings, userId, admin, hasInitializedRoom, selectedCampusRoomId]);


  const [bookingDate, setBookingDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [bookingStartTime, setBookingStartTime] = useState<string>('08:00');
  const [bookingEndTime, setBookingEndTime] = useState<string>('09:00');
  const [bookingPurpose, setBookingPurpose] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [showPreviewField, setShowPreviewField] = useState<boolean>(false);
  const [recurringInterval, setRecurringInterval] = useState<number>(1);
  const [bookingType, setBookingType] = useState<'solo' | 'lesson'>('solo');
  const [bookingStudentId, setBookingStudentId] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [successAnimationRoomId, setSuccessAnimationRoomId] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>('Alle');
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [isRoomSearchDropdownOpen, setIsRoomSearchDropdownOpen] = useState<boolean>(false);
  const [showMyBookingsOnly, setShowMyBookingsOnly] = useState<boolean>(false);
  const [isDateFilterActive, setIsDateFilterActive] = useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [draftBooking, setDraftBooking] = useState<{
    dayIdx: number;
    hour: string;
    date: string;
    startTime: string;
    endTime: string;
    rect: { top: number; left: number; width: number; height: number } | null;
  } | null>(null);
  const [draftPurpose, setDraftPurpose] = useState<string>('');
  const [dragOverCell, setDragOverCell] = useState<{ dayIdx: number; hour: string } | null>(null);


  // Textbausteine states
  const [textbausteine, setTextbausteine] = useState<any[]>(() => {
    const stored = localStorage.getItem('groovelab_textbausteine');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const containsOldWording = parsed.some((x: any) => 
          x.text.includes('Fingersätze') || 
          x.text.includes('Tasten/Saiten') || 
          x.text.includes('Fingern') || 
          x.text.includes('Griffwechsel')
        );
        if (parsed.length > 0 && parsed.some((x: any) => x.category) && !containsOldWording) {
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing textbausteine:", e);
      }
    }
    return [
      // Rhythmus & Timing
      { id: 'r1', label: '🥁 Puls-Master', text: 'Klatsche zuerst den Rhythmus und zähle laut mit, bevor du auf dem Instrument startest. Der Rhythmus ist das Herz der Musik!', type: 'both', category: 'rhythm', active: true },
      { id: 'r2', label: '⏱️ Metronom-Buddy', text: 'Übe diese Passage mit dem Metronom bei langsamem Tempo. Steigere die Geschwindigkeit erst, wenn es 3-mal perfekt im Takt war.', type: 'both', category: 'rhythm', active: true },
      { id: 'r3', label: '🐌 Schnecken-Tempo', text: 'Übe die schwierige Passage ganz langsam wie eine Schnecke. Erst wenn du den Ablauf im Schlaf beherrschst, schalten wir den Turbo an!', type: 'both', category: 'rhythm', active: true },
      { id: 'r4', label: '🧩 Puzzle-Taktik', text: 'Teile das Stück in kleine Häppchen auf. Nimm dir einen einzelnen Takt vor und setze ihn als perfektes Puzzleteil zusammen!', type: 'both', category: 'rhythm', active: true },
      { id: 'r5', label: '🚶‍♂️ Klatsch-Gehen', text: 'Gehe gleichmäßig im Puls des Stücks durch den Raum und klatsche den Rhythmus der Melodie dazu.', type: 'both', category: 'rhythm', active: false },
      { id: 'r6', label: '⏳ Dehnungs-Übung', text: 'Wiederhole den Ablauf extrem gedehnt und langsam, um die genauen Abstände und Übergänge bewusst zu spüren.', type: 'both', category: 'rhythm', active: false },

      // Finger & Technik
      { id: 't1', label: '🔂 Ritter-Dreierspiel', text: 'Wiederhole den kniffligen Übergang dreimal hintereinander fehlerfrei. Schaffst du das, hast du die Stelle gemeistert!', type: 'both', category: 'technique', active: true },
      { id: 't2', label: '👁️ Blind-Flug', text: 'Schließe beim Üben mal die Augen. Vertraue auf dein Gefühl und meistere die Stelle ganz blind auswendig!', type: 'both', category: 'technique', active: true },
      { id: 't3', label: '🏋️‍♂️ Fokus-Gym', text: 'Trainiere die schwierige Stelle ganz fokussiert in Zeitlupe, um maximale Kontrolle und Präzision aufzubauen.', type: 'both', category: 'technique', active: true },
      { id: 't4', label: '🕵️‍♂️ Detail-Detektiv', text: 'Lies den Text oder die Noten laut mit und achte genau auf jedes Detail. Sei wie ein Detektiv, dem kein Fehler entgeht!', type: 'lehrwerke', category: 'technique', active: true },
      { id: 't5', label: '🚀 Hürden-Sprung', text: 'Konzentriere dich auf die Bewegung direkt vor und nach dem schwierigen Wechsel. Wiederhole diesen Sprung gezielt mehrmals.', type: 'both', category: 'technique', active: false },
      { id: 't6', label: '🕸️ Relax-Übung', text: 'Achte darauf, dass alle Muskeln entspannt bleiben, die gerade Pause haben – so sparst du Energie und spielst flüssiger.', type: 'both', category: 'technique', active: false },

      // Ausdruck & Performance
      { id: 'p1', label: '🎵 Laut-Leise Zauber', text: 'Lass das Stück lebendig klingen! Mache deutliche Unterschiede zwischen Flüsterlautstärke (piano) und Löwenbrüllen (forte).', type: 'both', category: 'performance', active: true },
      { id: 'p2', label: '🌟 Eigener Remix', text: 'Du beherrschst das Stück super! Überlege dir bis zum nächsten Mal eine eigene coole Rhythmus-Variante oder Verzierung für diesen Teil.', type: 'songs', category: 'performance', active: true },
      { id: 'p3', label: '🎭 Storyteller', text: 'Welche Geschichte erzählt dieses Stück? Gestalte den Klang so, als würdest du ein trauriges, spannendes oder fröhliches Abenteuer vertonen.', type: 'both', category: 'performance', active: true },
      { id: 'p4', label: '🌊 Atem-Fluss', text: 'Gestalte die Phrasen wie einen langen Atemzug. Verbinde die Töne weich und lasse die Musik atmen.', type: 'both', category: 'performance', active: true },
      { id: 'p5', label: '🎤 Echo-Spiel', text: 'Stelle dir vor, die zweite Hälfte der Phrase ist das leise Echo aus den Bergen. Gestalte sie deutlich leiser.', type: 'both', category: 'performance', active: false },
      { id: 'p6', label: '🎬 Scheinwerfer-An', text: 'Spiele das Stück einmal komplett durch, ohne bei Fehlern anzuhalten - genau so, als stündest du live auf einer großen Bühne!', type: 'both', category: 'performance', active: false }
    ];
  });

  const [editingTextbaustein, setEditingTextbaustein] = useState<any | null>(null);
  const [tbLabel, setTbLabel] = useState('');
  const [tbText, setTbText] = useState('');
  const [tbType, setTbType] = useState<'songs' | 'lehrwerke' | 'both'>('both');
  const [tbCategory, setTbCategory] = useState<'rhythm' | 'technique' | 'performance'>('rhythm');
  const [tbSearch, setTbSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'rhythm' | 'technique' | 'performance'>('all');
  const [showTextbausteinModal, setShowTextbausteinModal] = useState<boolean>(false);
  const [selectedIcon, setSelectedIcon] = useState('🎵');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedTbId, setCopiedTbId] = useState<string | null>(null);

  const AVAILABLE_ICONS = [
    '🐌', '🚀', '🕵️‍♂️', '🧩', '🥁', '🎹', '🎸', '🎷', '🎧', '🎤', '🎼', '🏆', 
    '🎖️', '🌟', '🎯', '⚡', '💡', '🔍', '🦖', '🦁', '🦊', '🦉', '🦄', '🔥', 
    '👑', '🌈', '🎨', '🎬', '⏱️', '🎵', '🎺', '🎻', '🔔', '📢', '🏰', '🎈', 
    '👽', '🍿', '🧊', '🦾', '🧠', '✨', '🍀', '🍕', '🐱', '🐶', '🧁', '💿', 
    '📻', '🎙️', '🎛️', '🎚️', '🎶', '🦾', '🦸‍♂️', '🧙‍♂️', '🏃‍♂️', '🧗‍♂️', '🏄‍♂️', '🧘‍♂️', 
    '👾', '🛸', '💎', '🔑', '🧭', '🗺️', '🎪', '🎢', '🎳', '🎮', '🧪', '🧬', 
    '⚙️', '🛠️', '🧱', '🎉', '🎊', '🔇', '🔈', '🗯️', '💭', '✏️', '📝', '📂', 
    '📈', '📬', '🏷️', '❤️', '🍀', '🌈'
  ];

  useEffect(() => {
    if (editingTextbaustein) {
      const parts = editingTextbaustein.label.split(' ');
      const hasEmoji = parts[0] && /\p{Emoji}/u.test(parts[0]);
      if (hasEmoji) {
        setSelectedIcon(parts[0]);
        setTbLabel(parts.slice(1).join(' '));
      } else {
        setSelectedIcon('🎵');
        setTbLabel(editingTextbaustein.label);
      }
      setTbCategory(editingTextbaustein.category || 'rhythm');
    } else {
      const used = textbausteine.map(tb => tb.label.split(' ')[0]);
      const firstAvail = AVAILABLE_ICONS.find(icon => !used.includes(icon)) || '🎵';
      setSelectedIcon(firstAvail);
      setTbLabel('');
      setTbCategory('rhythm');
    }
  }, [editingTextbaustein, textbausteine]);

  useEffect(() => {
    const [sh, sm] = bookingStartTime.split(':').map(Number);
    const [eh, em] = bookingEndTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (endMins <= startMins) {
      const targetEndMins = startMins + 30;
      const th = String(Math.floor(targetEndMins / 60)).padStart(2, '0');
      const tm = String(targetEndMins % 60).padStart(2, '0');
      setBookingEndTime(`${th}:${tm}`);
    }
  }, [bookingStartTime, bookingEndTime]);

  // LocalStorage synchronization for campus bookings

  useEffect(() => {
    localStorage.setItem('groovelab_campus_bookings', JSON.stringify(campusBookings));
  }, [campusBookings]);

  const handleDeleteTextbaustein = (id: string) => {
    setTextbausteine(prev => prev.filter(tb => tb.id !== id));
    if (editingTextbaustein?.id === id) {
      setEditingTextbaustein(null);
      setTbLabel('');
      setTbText('');
      setTbType('both');
      setTbCategory('rhythm');
    }
  };

  useEffect(() => {
    localStorage.setItem('groovelab_textbausteine', JSON.stringify(textbausteine));
  }, [textbausteine]);

  const handleSaveTextbaustein = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tbLabel.trim() || !tbText.trim()) return;

    const fullLabel = `${selectedIcon} ${tbLabel.trim()}`;

    if (editingTextbaustein) {
      setTextbausteine(prev => prev.map(tb => tb.id === editingTextbaustein.id ? { ...tb, label: fullLabel, text: tbText.trim(), type: tbType, category: tbCategory } : tb));
      setEditingTextbaustein(null);
    } else {
      const newTb = {
        id: String(Date.now()),
        label: fullLabel,
        text: tbText.trim(),
        type: tbType,
        category: tbCategory,
        active: true
      };
      setTextbausteine(prev => [...prev, newTb]);
    }
    setTbLabel('');
    setTbText('');
    setTbType('both');
    setTbCategory('rhythm');
  };

  const handleToggleTextbausteinActive = (id: string) => {
    setTextbausteine(prev => prev.map(tb => tb.id === id ? { ...tb, active: !tb.active } : tb));
  };
  
  const getISOWeekNum = (dateInput?: string | Date, lessonDay: number = 1): string => {
    let date: Date;
    if (!dateInput) {
      date = new Date();
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      const match = String(dateInput).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // 0-indexed
        const day = parseInt(match[3], 10);
        date = new Date(year, month, day);
      } else {
        date = new Date(dateInput);
      }
    }
    
    if (isNaN(date.getTime())) {
      date = new Date();
    }

    // Adjust the date back to the most recent lesson day
    const currentDay = date.getDay(); // 0 (Sun) to 6 (Sat)
    let diff = currentDay - lessonDay;
    if (diff < 0) {
      diff += 7;
    }
    
    const lessonStart = new Date(date);
    lessonStart.setDate(date.getDate() - diff);

    const d = new Date(Date.UTC(lessonStart.getFullYear(), lessonStart.getMonth(), lessonStart.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return String(weekNo).padStart(2, '0');
  };

  const fetchSongAssignments = async (songId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_song_skills')
        .select('*, student:users!user_song_skills_user_id_fkey(*)')
        .eq('song_id', songId);
      if (error) throw error;
      if (data) {
        setAssignedSongSkills(data);
      }
    } catch (e) {
      console.error('Error fetching song assignments:', e);
    }
  };

  const handleAssignStudentToSong = async (studentId: string, instrument: string = 'Allgemein') => {
    if (!selectedSongForDetail) return;
    try {
      if (assignedSongSkills.some(s => s.user_id === studentId)) {
        alert('Dieser Schüler ist bereits zugeteilt.');
        return;
      }

      const { data: newSkill, error } = await supabase
        .from('user_song_skills')
        .insert({
          user_id: studentId,
          song_id: selectedSongForDetail.id,
          instrument: instrument,
          progress_percent: 0,
          is_stage_ready: false
        })
        .select('*, student:users!user_song_skills_user_id_fkey(*)')
        .single();

      if (error) throw error;
      if (newSkill) {
        setAssignedSongSkills(prev => [...prev, newSkill]);
      }
    } catch (e: any) {
      console.error('Error assigning student to song:', e);
      alert('Fehler beim Zuweisen: ' + e.message);
    }
  };

  const handleUnassignStudentFromSong = async (skillId: string, studentId: string, songTitle: string, instrument: string) => {
    if (!window.confirm('Bist du sicher, dass du die Zuweisung und somit den Fortschritt für dieses Instrument löschen möchtest?')) return;
    try {
      const { error: skillErr } = await supabase
        .from('user_song_skills')
        .delete()
        .eq('id', skillId);
      if (skillErr) throw skillErr;

      const topicName = `${selectedSongForDetail.artist} - ${songTitle} (${instrument})`;
      await supabase
        .from('progress_matrix')
        .delete()
        .eq('student_id', studentId)
        .eq('topic_name', topicName);

      localStorage.removeItem(`song_skills_detail_${studentId}_${skillId}`);

      setAssignedSongSkills(prev => prev.filter(s => s.id !== skillId));
      if (selectedStudentForProgress?.id === studentId) {
        setSelectedStudentForProgress(null);
      }
    } catch (e: any) {
      console.error('Error unassigning student from song:', e);
      alert('Fehler beim Entfernen: ' + e.message);
    }
  };

  const handleUpdateSongStudentProgress = async (
    skillId: string,
    studentId: string,
    instrument: string,
    rhythm: number,
    finger: number,
    expression: number,
    progress: number,
    isStageReady: boolean, // Kept for signature compatibility
    internalNotes: string,
    lessonNotes: string[]
  ) => {
    try {
      localStorage.setItem(`song_skills_detail_${studentId}_${skillId}`, JSON.stringify({
        rhythm,
        finger,
        expression
      }));

      const isMastered = songStatus === 'mastered';
      const { error: skillErr } = await supabase
        .from('user_song_skills')
        .update({
          progress_percent: progress,
          is_stage_ready: isMastered
        })
        .eq('id', skillId);

      if (skillErr) throw skillErr;

      setAssignedSongSkills(prev => prev.map(s => s.id === skillId ? { ...s, progress_percent: progress, is_stage_ready: isMastered } : s));

      const topicName = `${selectedSongForDetail.artist} - ${selectedSongForDetail.title} (${instrument})`;
      
      let dbStatus = 'IN_PROGRESS';
      if (songStatus === 'mastered') dbStatus = 'MASTERED';
      else if (songStatus === 'unbearbeitet') dbStatus = 'NOT_STARTED';
      
      const { error: matrixErr } = await supabase
        .from('progress_matrix')
        .upsert({
          student_id: studentId,
          topic_name: topicName,
          status: dbStatus,
          is_current_homework: songStatus === 'in_progress',
          teacher_notes: internalNotes,
          homework_notes: JSON.stringify(lessonNotes),
          updated_at: new Date().toISOString()
        });

      if (matrixErr) throw matrixErr;
    } catch (e: any) {
      console.error('Error saving song student progress:', e);
    }
  };

  const triggerAutoSaveSongProgress = async (activeSkill = selectedSongSkill, activeStudent = selectedStudentForProgress) => {
    if (!activeSkill || !activeStudent || !selectedSongForDetail) return;
    await handleUpdateSongStudentProgress(
      activeSkill.id,
      activeStudent.id,
      activeSkill.instrument,
      songRhythmVal,
      songFingerVal,
      songDynamicsVal,
      songTotalProgressVal,
      songStatus === 'mastered',
      songInternalNotes,
      songLessonNotesList
    );
  };

  const handleUpdateSongHeader = async () => {
    if (!selectedSongForDetail) return;
    try {
      const { error } = await supabase
        .from('songs')
        .update({
          title: editSongTitle,
          artist: editSongArtist,
          instrumentation: editSongInstrumentation
        })
        .eq('id', selectedSongForDetail.id);

      if (error) throw error;

      setSongs(prev => prev.map(s => s.id === selectedSongForDetail.id ? { ...s, title: editSongTitle, artist: editSongArtist, instrumentation: editSongInstrumentation } : s));
      setSelectedSongForDetail((prev: any) => ({ ...prev, title: editSongTitle, artist: editSongArtist, instrumentation: editSongInstrumentation }));
      setIsEditingSongHeader(false);
      alert('Song-Details erfolgreich aktualisiert! ✅');
    } catch (e: any) {
      console.error('Error updating song details:', e);
      alert('Fehler beim Speichern: ' + e.message);
    }
  };

  const selectSongSkillForProgress = async (skill: any) => {
    setSelectedStudentForProgress(skill.student);
    setSelectedSongSkill(skill);
    
    const savedValsStr = localStorage.getItem(`song_skills_detail_${skill.user_id}_${skill.id}`);
    let r = skill.progress_percent || 0;
    let f = skill.progress_percent || 0;
    let e = skill.progress_percent || 0;
    if (savedValsStr) {
      try {
        const parsed = JSON.parse(savedValsStr);
        if (typeof parsed.rhythm === 'number') r = parsed.rhythm;
        if (typeof parsed.finger === 'number') f = parsed.finger;
        if (typeof parsed.expression === 'number') e = parsed.expression;
      } catch (err) {
        console.error(err);
      }
    }
    setSongRhythmVal(r);
    setSongFingerVal(f);
    setSongDynamicsVal(e);
    setSongTotalProgressVal(skill.progress_percent || 0);

    const topicName = `${selectedSongForDetail.artist} - ${selectedSongForDetail.title} (${skill.instrument})`;
    try {
      const { data, error } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', skill.user_id)
        .eq('topic_name', topicName)
        .maybeSingle();

      if (data) {
        setSongInternalNotes(data.teacher_notes || '');
        if (data.status === 'MASTERED' || skill.is_stage_ready || skill.progress_percent === 100) {
          setSongStatus('mastered');
        } else if (data.status === 'IN_PROGRESS' || (skill.progress_percent || 0) > 0) {
          setSongStatus('in_progress');
        } else {
          setSongStatus('unbearbeitet');
        }
        if (data.homework_notes) {
          try {
            const parsed = JSON.parse(data.homework_notes);
            if (Array.isArray(parsed)) {
               setSongLessonNotesList(parsed);
            } else {
               setSongLessonNotesList([data.homework_notes]);
            }
          } catch {
            setSongLessonNotesList([data.homework_notes]);
          }
        } else {
          setSongLessonNotesList([]);
        }
      } else {
        setSongInternalNotes('');
        setSongLessonNotesList([]);
        if (skill.is_stage_ready || skill.progress_percent === 100) {
          setSongStatus('mastered');
        } else if ((skill.progress_percent || 0) > 0) {
          setSongStatus('in_progress');
        } else {
          setSongStatus('unbearbeitet');
        }
      }
    } catch (err) {
      console.error('Error fetching progress notes:', err);
    }
    setSongLessonNotes('');
  };

  const fetchWeeklyHomeworkNotes = async (studentId: string, currentLessonDay: number) => {
    try {
      const currentWeekNum = getISOWeekNum(undefined, currentLessonDay);
      const topicName = `Hausaufgabe KW ${currentWeekNum}`;
      
      const { data, error } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', studentId)
        .eq('topic_name', topicName)
        .maybeSingle();
        
      if (data && data.homework_notes) {
        try {
          const raw = data.homework_notes;
          if (raw.startsWith('[') && raw.endsWith(']')) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setWeeklyHomeworkNotesList(parsed);
              return;
            }
          }
          const lines = raw.split('\n').map((l: string) => l.trim()).filter(Boolean);
          setWeeklyHomeworkNotesList(lines);
        } catch (e) {
          setWeeklyHomeworkNotesList([data.homework_notes]);
        }
      } else {
        setWeeklyHomeworkNotesList([]);
      }
    } catch (err) {
      console.error('Error fetching weekly homework notes:', err);
    }
  };

  useEffect(() => {
    if (selectedStudentForProgress) {
      const loadLessonDayAndFetch = async () => {
        let activeLessonDay = 1;
        try {
          const { data } = await supabase
            .from('schedules')
            .select('day_of_week')
            .eq('student_id', selectedStudentForProgress.id)
            .limit(1);
          if (data && data.length > 0 && data[0].day_of_week !== undefined) {
            activeLessonDay = data[0].day_of_week;
          }
        } catch (e) {
          console.error('Error loading lesson day:', e);
        }
        setLessonDayForProgress(activeLessonDay);
        fetchWeeklyHomeworkNotes(selectedStudentForProgress.id, activeLessonDay);
      };
      loadLessonDayAndFetch();
    } else {
      setWeeklyHomeworkNotesList([]);
      setLessonDayForProgress(1);
    }
  }, [selectedStudentForProgress]);

  const handleAddWeeklyHomeworkNote = async () => {
    if (!newHomeworkNoteText.trim() || !selectedStudentForProgress) return;
    
    const updatedNotes = [...weeklyHomeworkNotesList, newHomeworkNoteText.trim()];
    setWeeklyHomeworkNotesList(updatedNotes);
    setNewHomeworkNoteText('');
    
    try {
      const currentWeekNum = getISOWeekNum(undefined, lessonDayForProgress);
      const topicName = `Hausaufgabe KW ${currentWeekNum}`;
      const activeTId = userId || '';
      
      const { data: existing } = await supabase
        .from('progress_matrix')
        .select('id')
        .eq('student_id', selectedStudentForProgress.id)
        .eq('topic_name', topicName)
        .maybeSingle();
        
      if (existing) {
        await supabase
          .from('progress_matrix')
          .update({
            homework_notes: JSON.stringify(updatedNotes),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('progress_matrix')
          .insert({
            student_id: selectedStudentForProgress.id,
            teacher_id: activeTId,
            topic_name: topicName,
            status: 'IN_PROGRESS',
            is_current_homework: true,
            teacher_notes: '',
            homework_notes: JSON.stringify(updatedNotes),
            updated_at: new Date().toISOString()
          });
      }
    } catch (err) {
      console.error('Error saving weekly homework note:', err);
    }
  };

  const handleDeleteWeeklyHomeworkNote = async (idxToDelete: number) => {
    if (!selectedStudentForProgress) return;
    
    const updatedNotes = weeklyHomeworkNotesList.filter((_, idx) => idx !== idxToDelete);
    setWeeklyHomeworkNotesList(updatedNotes);
    
    try {
      const currentWeekNum = getISOWeekNum(undefined, lessonDayForProgress);
      const topicName = `Hausaufgabe KW ${currentWeekNum}`;
      
      const { data: existing } = await supabase
        .from('progress_matrix')
        .select('id')
        .eq('student_id', selectedStudentForProgress.id)
        .eq('topic_name', topicName)
        .maybeSingle();
        
      if (existing) {
        await supabase
          .from('progress_matrix')
          .update({
            homework_notes: JSON.stringify(updatedNotes),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      }
    } catch (err) {
      console.error('Error deleting weekly homework note:', err);
    }
  };

  const [quickAddPageNum, setQuickAddPageNum] = useState<string>('');
  const [localProgress, setLocalProgress] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('student_lehrwerke_progress');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [studentDetailSearch, setStudentDetailSearch] = useState('');
  const [assignStudentSearch, setAssignStudentSearch] = useState('');
  const [isAssignSearchFocused, setIsAssignSearchFocused] = useState(false);
  const [isEditingBookHeader, setIsEditingBookHeader] = useState(false);
  const [editBookTitle, setEditBookTitle] = useState('');
  const [editBookAuthor, setEditBookAuthor] = useState('');
  const [editBookTotalPages, setEditBookTotalPages] = useState(50);
  const [showTageskompassModal, setShowTageskompassModal] = useState(false);
  const [selectedStudentForTageskompass, setSelectedStudentForTageskompass] = useState<any>(null);
  const [initialLehrwerkIdForTageskompass, setInitialLehrwerkIdForTageskompass] = useState<string | null>(null);
  const [assignedStudentsSearchQuery, setAssignedStudentsSearchQuery] = useState('');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [draggedStationId, setDraggedStationId] = useState<string | null>(null);
  
  const [showQuickAddStudent, setShowQuickAddStudent] = useState(false);
  const [quickFirstName, setQuickFirstName] = useState('');
  const [quickLastName, setQuickLastName] = useState('');
  const [quickInstrument, setQuickInstrument] = useState('Gitarre');

  const getLehrwerkColor = (title: string) => {
    const trimmed = (title || '').trim();
    const sorted = [...lehrwerke].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    const index = sorted.findIndex(b => (b.title || '').trim() === trimmed);
    
    if (index !== -1 && sorted.length > 0) {
      const position = index % 26;
      const hue = Math.round((position / 25) * 360);
      return {
        from: `hsl(${hue}, 85%, 94%)`,
        to: `hsl(${hue}, 80%, 84%)`,
        text: `hsl(${hue}, 90%, 25%)`,
        shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
        shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
      };
    }

    const firstChar = trimmed.charAt(0).toUpperCase();
    const charCode = firstChar.charCodeAt(0) || 65;
    const clampedCode = Math.max(65, Math.min(90, charCode));
    const hue = Math.round(((clampedCode - 65) / 25) * 360);
    return {
      from: `hsl(${hue}, 85%, 94%)`,
      to: `hsl(${hue}, 80%, 84%)`,
      text: `hsl(${hue}, 90%, 25%)`,
      shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
      shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
    };
  };

  const getSongColor = (title: string) => {
    const trimmed = (title || '').trim();
    const firstChar = trimmed.charAt(0).toUpperCase();
    const charCode = firstChar.charCodeAt(0) || 65;
    const clampedCode = Math.max(65, Math.min(90, charCode));
    const hue = Math.round(((clampedCode - 65) / 25) * 360);
    return {
      from: `hsl(${hue}, 85%, 94%)`,
      to: `hsl(${hue}, 80%, 84%)`,
      text: `hsl(${hue}, 90%, 25%)`,
      shadowFrom: `hsla(${hue}, 85%, 50%, 0.2)`,
      shadowTo: `hsla(${hue}, 80%, 40%, 0.15)`
    };
  };
  const [dragOverStationId, setDragOverStationId] = useState<string | null>(null);

  const handleStationDragStart = (e: React.DragEvent, id: string) => {
    setDraggedStationId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStationDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedStationId !== id) {
      setDragOverStationId(id);
    }
  };

  const handleStationDrop = async (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    if (!draggedStationId || !dragOverStationId) {
      setDraggedStationId(null);
      setDragOverStationId(null);
      return;
    }

    // Get the current room's stations
    const roomStations = stations.filter(s => s.room_id === targetRoomId);
    
    // Find indexes
    const dragIdx = roomStations.findIndex(s => s.id === draggedStationId);
    const hoverIdx = roomStations.findIndex(s => s.id === dragOverStationId);

    if (dragIdx === -1 || hoverIdx === -1) {
      setDraggedStationId(null);
      setDragOverStationId(null);
      return;
    }

    // Reorder array
    const updatedRoomStations = [...roomStations];
    const [draggedItem] = updatedRoomStations.splice(dragIdx, 1);
    updatedRoomStations.splice(hoverIdx, 0, draggedItem);

    // Optimistically update the state for stations
    const remainingStations = stations.filter(s => s.room_id !== targetRoomId);
    
    // Assign new sort_order fields
    const updatedAll = [
      ...remainingStations,
      ...updatedRoomStations.map((s, idx) => ({ ...s, sort_order: idx }))
    ];
    
    // Sort updatedAll by sort_order ascending, then by name
    updatedAll.sort((a, b) => {
      if (a.room_id === b.room_id) {
        if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        }
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    setStations(updatedAll);

    // Also update setupStations if active tab is setup
    setSetupStations(prev => {
      const other = prev.filter(s => s.room_id !== targetRoomId);
      const updatedSetup = [
        ...other,
        ...updatedRoomStations.map((s, idx) => ({ ...s, sort_order: idx }))
      ];
      updatedSetup.sort((a, b) => {
        if (a.room_id === b.room_id) {
          if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
            return (a.sort_order ?? 0) - (b.sort_order ?? 0);
          }
          return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
      });
      return updatedSetup;
    });

    setDraggedStationId(null);
    setDragOverStationId(null);

    // Update in Supabase
    try {
      const promises = updatedRoomStations.map((s, idx) => {
        return supabase
          .from('stations')
          .update({ sort_order: idx })
          .eq('id', s.id);
      });
      await Promise.all(promises);
    } catch (err) {
      console.error('Failed to update stations sort order:', err);
    }
  };

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1200;
    }
    return false;
  });
  
  const [bandSearch, setBandSearch] = useState('');
  const [bandLetter, setBandLetter] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('all');
  const [editingBand, setEditingBand] = useState<any>(null);
  const [showAddMember, setShowAddMember] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalInstrument, setExternalInstrument] = useState('Vocals');
  
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showBulkAddStudents, setShowBulkAddStudents] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [parsedStudents, setParsedStudents] = useState<{ firstName: string; lastName: string; instrument: string }[]>([]);
  const [defaultInstrumentForBulk, setDefaultInstrumentForBulk] = useState('Gitarre');
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', birthDate: '', photoUrl: '/avatar_ghost.jpg', isExternalVocalist: false, instrument: 'Gitarre' });
  const [vocalistOnlyMode, setVocalistOnlyMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [studentsXP, setStudentsXP] = useState<Record<string, number>>({});
  
  const [showAddBand, setShowAddBand] = useState(false);
  const [newBand, setNewBand] = useState({ name: '', song_id: '', coach_id: userId, photo_url: '' });
  const [selectedMembers, setSelectedMembers] = useState<{user_id: string, instrument: string}[]>([]);
  const [memberToSearch, setMemberToSearch] = useState('');
  
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ firstName: '', lastName: '', isAdmin: false, instrument: '', photoUrl: '' });

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomLocation, setNewRoomLocation] = useState<{lat: number, lng: number} | null>(null);
  const [newRoomStationCount, setNewRoomStationCount] = useState(5);
  const [draggedRoomId, setDraggedRoomId] = useState<string | null>(null);
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null);
  const draggedRoomIdRef = React.useRef<string | null>(null);
  
  const [showAddStationForRoom, setShowAddStationForRoom] = useState<string | null>(null);
  const [newStationName, setNewStationName] = useState('');
  const [newStationColor, setNewStationColor] = useState('#64748b');
  const [activeColorMenuStationId, setActiveColorMenuStationId] = useState<string | null>(null);
  
  // Layout Customizer states
  const [customizingRoom, setCustomizingRoom] = useState<any | null>(null);
  const [roomWidth, setRoomWidth] = useState<number>(10.0);
  const [roomHeight, setRoomHeight] = useState<number>(8.0);
  const [activeEditStationId, setActiveEditStationId] = useState<string | null>(null);
  const [editingStationName, setEditingStationName] = useState<string>('');
  const [editingStationInstrument, setEditingStationInstrument] = useState<string>('');
  const [editingStationColor, setEditingStationColor] = useState<string>('#e5e7eb');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const calendarScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (customizingRoom) {
      setRoomWidth(customizingRoom.room_width || 10.0);
      setRoomHeight(customizingRoom.room_height || 8.0);
      setActiveEditStationId(null);

      // Check if Lehrer iPad exists for this room
      const roomStations = stations.filter(s => s.room_id === customizingRoom.id);
      const hasLehrer = roomStations.some(s => {
        const name = (s.name || '').toLowerCase();
        return name.includes('lehrer') || name.includes('teacher');
      });

      if (!hasLehrer) {
        const createMissingLehrer = async () => {
          const { data, error } = await supabase.from('stations').insert({
            room_id: customizingRoom.id,
            name: 'Lehrer iPad',
            color: '#22c55e',
            instrument: 'Tablet',
            pos_x: 50,
            pos_y: 50
          }).select().single();
          
          if (!error && data) {
            setStations(prev => {
              if (prev.some(s => s.id === data.id)) return prev;
              return [...prev, data];
            });
          }
        };
        createMissingLehrer();
      }
    }
  }, [customizingRoom?.id, stations]);

  useEffect(() => {
    if (activeEditStationId) {
      const station = stations.find(s => s.id === activeEditStationId);
      if (station) {
        setEditingStationName(station.name || '');
        setEditingStationInstrument(station.instrument || '');
        setEditingStationColor(station.color || '#e5e7eb');
      }
    } else {
      setEditingStationName('');
      setEditingStationInstrument('');
      setEditingStationColor('#e5e7eb');
    }
  }, [activeEditStationId, stations]);
  
  const [showAddSong, setShowAddSong] = useState(false);
  const [bulkModeSongs, setBulkModeSongs] = useState(false);
  const [bulkTextSongs, setBulkTextSongs] = useState('');
  const [newSong, setNewSong] = useState({ artist: '', title: '', level: 1, media_link: '', tomplay_url: '', pdf_folder_url: '', guitar_pro_url: '', pdf_drums_url: '', pdf_guitar_url: '', pdf_bass_url: '', pdf_vocals_url: '', pdf_keys_url: '', playalong_url: '', bypass_wlan_check: false, instrumentation: { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 } as Record<string, number> });
  
  const [songSearch, setSongSearch] = useState('');
  const [songSearchType, setSongSearchType] = useState<'title' | 'artist'>('title');
  const [songAlphaFilter, setSongAlphaFilter] = useState<string | null>(null);
  
  const [selectedQRUser, setSelectedQRUser] = useState<any>(null);
  const [qrAvatarDataUrl, setQrAvatarDataUrl] = useState<string | null>(null);
  const [qrSchoolName, setQrSchoolName] = useState<string>('Campus Musikschule');

  useEffect(() => {
    if (!selectedQRUser) {
      setQrSchoolName('Campus Musikschule');
      return;
    }
    const fetchSchool = async () => {
      let resolvedSchoolId = selectedQRUser.school_id || selectedQRUser.schoolId || (selectedQRUser.schools?.id) || (Array.isArray(selectedQRUser.schools) ? selectedQRUser.schools[0]?.id : null);
      
      if (!resolvedSchoolId && selectedQRUser.id) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('school_id')
            .eq('id', selectedQRUser.id)
            .single();
          if (data && data.school_id) {
            resolvedSchoolId = data.school_id;
          }
        } catch (err) {
          console.error('Error fetching student school_id:', err);
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
            setQrSchoolName(data.name || 'Campus Musikschule');
          }
        } catch (err) {
          console.error('Error fetching school details:', err);
        }
      } else {
        setQrSchoolName('Campus Musikschule');
      }
    };

    fetchSchool();
  }, [selectedQRUser]);

  useEffect(() => {
    if (!selectedQRUser) {
      setQrAvatarDataUrl(null);
      return;
    }
    
    let active = true;
    let originalUrl = selectedQRUser.photo_url || '/avatar_ghost.jpg';
    if (selectedQRUser.role === 'student') {
      originalUrl = getInstrumentAvatarUrl(selectedQRUser.instrument);
    }
    
    if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
      setQrAvatarDataUrl(originalUrl);
      return;
    }

    const loadAndConvert = async () => {
      try {
        let url = new URL(originalUrl, window.location.origin).href;
        
        if (originalUrl !== '/avatar_ghost.jpg') {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}cb=${Date.now()}`;
        }
        
        const response = await fetch(url, { mode: 'cors', cache: 'no-cache' });
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        
        const reader = new FileReader();
        reader.onloadend = () => {
          if (active) {
            setQrAvatarDataUrl(reader.result as string);
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn('Could not convert image to base64, using fallback URL:', err);
        if (active) {
          setQrAvatarDataUrl(originalUrl);
        }
      }
    };

    loadAndConvert();
    return () => {
      active = false;
    };
  }, [selectedQRUser]);

  const handleQRImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
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
        setQrAvatarDataUrl(dataUrl);
      }
    } catch (err) {
      console.warn('QR OnLoad canvas conversion failed:', err);
    }
  };

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [studentLabMins, setStudentLabMins] = useState(0);
  const [studentHomeMins, setStudentHomeMins] = useState(0);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [listType, setListType] = useState<'active' | 'archive'>('active');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('all');
  const [studentSessions, setStudentSessions] = useState<any[]>([]);
  const [studentPlanning, setStudentPlanning] = useState<any[]>([]);
  const [studentRejections, setStudentRejections] = useState<any[]>([]);
  const qrCardRef = React.useRef<HTMLDivElement>(null);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [editingSong, setEditingSong] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [manualCoords, setManualCoords] = useState<Record<string, string>>({});
  const [showManualInput, setShowManualInput] = useState<string | null>(null);
  const [showBatchiPadModal, setShowBatchiPadModal] = useState<{ roomId: string } | null>(null);
  const [batchiPadCount, setBatchiPadCount] = useState<number>(1);

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');

  const brandColor = admin?.schools?.brand_color || '#16a34a';

  const getStatusColor = (studentId: string, lastSeen: string | null, createdAt?: string | null) => {
    const hasLiveSession = activeSessions.some(se => se.user_id === studentId);
    
    let isOnline = false;
    if (lastSeen) {
      const lastSeenTime = new Date(lastSeen).getTime();
      const createdTime = createdAt ? new Date(createdAt).getTime() : 0;
      
      // If last_seen is identical to created_at (or within 1 second), they have never logged in
      const hasNeverLoggedIn = Math.abs(lastSeenTime - createdTime) < 1000;
      
      if (!hasNeverLoggedIn) {
        isOnline = lastSeenTime > Date.now() - 5 * 60 * 1000;
      }
    }
    
    if (hasLiveSession) return '#10b981'; // Green
    if (isOnline) return '#fbbf24'; // Yellow (Home)
    return '#ef4444'; // Red
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogoutStudent = async (sessionId: string) => {
    if (!window.confirm('Schüler wirklich ausloggen?')) return;
    await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', sessionId);
    fetchData();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Mitglied aus der Band entfernen?')) return;
    try {
      const { error } = await supabase.from('band_members').delete().eq('id', memberId);
      if (error) throw error;
      
      // Recalculate coach if not manual
      const { data: member } = await supabase.from('band_members').select('band_id').eq('id', memberId).single();
      if (member) await updateBandCoach(member.band_id);
      
      fetchData();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleAddMember = async (bandId: string, userId: string | null, instrument: string, extName?: string) => {
    try {
      const insertData: any = {
        band_id: bandId,
        user_id: userId,
        instrument: instrument,
        confetti_seen: true
      };
      if (extName) {
        insertData.external_name = extName;
      }

      let { error } = await supabase.from('band_members').insert(insertData);
      if (error && error.message.includes('external_name')) {
        if (!userId) {
          throw new Error("Der Server unterstützt keine externen Mitglieder. Bitte führen Sie die SQL-Migration aus.");
        }
        const fallbackData = { ...insertData };
        delete fallbackData.external_name;
        const { error: retryErr } = await supabase.from('band_members').insert(fallbackData);
        if (retryErr) throw retryErr;
      } else if (error) {
        throw error;
      }
      
      const { data: bandSongs } = await supabase.from('band_songs').select('id').eq('band_id', bandId);
      if (bandSongs && bandSongs.length > 0) {
         // Fetch existing slots to dynamically calculate non-conflicting part_number
         const songIds = bandSongs.map((bs: any) => bs.id);
         const { data: existingSlots } = await supabase
            .from('band_song_slots')
            .select('band_song_id, instrument, part_number')
            .in('band_song_id', songIds);

         const slotsToInsert = bandSongs.map((bs: any) => {
            const matchingSlots = (existingSlots || []).filter(
               (s: any) => s.band_song_id === bs.id && s.instrument === instrument
            );
            const maxPart = matchingSlots.reduce((max: number, s: any) => Math.max(max, s.part_number || 1), 0);
            const nextPart = maxPart + 1;

            const slotObj: any = {
               band_song_id: bs.id,
               user_id: userId,
               instrument: instrument,
               part_number: nextPart,
               status: 'joined'
            };
            if (extName) {
               slotObj.external_name = extName;
            }
            return slotObj;
         });

         let { error: slotErr } = await supabase.from('band_song_slots').insert(slotsToInsert);
         if (slotErr && slotErr.message.includes('external_name')) {
            if (!userId) {
               console.error("Failed to insert slots for external member:", slotErr);
            } else {
               const cleanedSlots = slotsToInsert.map((s: any) => {
                  const copy = { ...s };
                  delete copy.external_name;
                  return copy;
               });
               const { error: retrySlotErr } = await supabase.from('band_song_slots').insert(cleanedSlots);
               if (retrySlotErr) throw retrySlotErr;
            }
         } else if (slotErr) {
            throw slotErr;
         }
      }
      
      // Recalculate coach if not manual
      await updateBandCoach(bandId);
      
      setShowAddMember(null);
      setMemberSearch('');
      setExternalName('');
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Hinzufügen: ' + err.message);
    }
  };

  const updateBandCoach = async (bandId: string) => {
    try {
      const { data: band } = await supabase.from('bands').select('coach_is_manual, song_id').eq('id', bandId).single();
      if (!band || band.coach_is_manual) return;

      const { data: members } = await supabase
        .from('band_members')
        .select(`
          user_id,
          users!inner(user_song_skills:user_song_skills!user_song_skills_user_id_fkey(*))
        `)
        .eq('band_id', bandId);

      if (!members) return;

      const counts: Record<string, number> = {};
      members.forEach((m: any) => {
        const verifierId = m.users?.user_song_skills?.find((s: any) => s.song_id === band.song_id && s.is_stage_ready)?.verified_by_id;
        if (verifierId) counts[verifierId] = (counts[verifierId] || 0) + 1;
      });

      let topTid = null;
      let max = 0;
      for (const [tid, c] of Object.entries(counts)) {
        if (c > max) {
          max = c;
          topTid = tid;
        }
      }

      if (topTid) {
        await supabase.from('bands').update({ coach_id: topTid }).eq('id', bandId);
      }
    } catch (err) {
      console.error('Coach update failed:', err);
    }
  };

  const handleSaveBandEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('bands').update({
        name: editingBand.name,
        bio: editingBand.bio,
        genre: editingBand.genre,
        coach_id: editingBand.coach_id,
        coach_is_manual: editingBand.coach_is_manual
      }).eq('id', editingBand.id);
      if (error) throw error;
      setEditingBand(null);
      fetchData();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  useEffect(() => {
    if (forceTab) {
      setActiveTab(forceTab);
    }
  }, [forceTab]);

  useEffect(() => {
    fetchData();
  }, [activeTab, activePlatform, bookingDate]);

  useEffect(() => {
    if (activeTab === 'rooms') {
      const savedDate = localStorage.getItem('groovelab_selected_booking_date');
      const savedRoomId = localStorage.getItem('groovelab_selected_booking_room_id');
      const savedStartTime = localStorage.getItem('groovelab_selected_booking_start_time');
      const savedEndTime = localStorage.getItem('groovelab_selected_booking_end_time');

      if (savedDate) {
        setBookingDate(savedDate);
        localStorage.removeItem('groovelab_selected_booking_date');
      }
      if (savedRoomId) {
        setSelectedCampusRoomId(savedRoomId);
        localStorage.removeItem('groovelab_selected_booking_room_id');
      }
      if (savedStartTime) {
        setBookingStartTime(savedStartTime);
        localStorage.removeItem('groovelab_selected_booking_start_time');
      }
      if (savedEndTime) {
        setBookingEndTime(savedEndTime);
        localStorage.removeItem('groovelab_selected_booking_end_time');
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'rooms') {
      setTimeout(() => {
        if (calendarScrollRef.current) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMin = now.getMinutes();
          if (currentHour >= 8 && currentHour <= 22) {
            const rowHeight = 56;
            const hoursSinceStart = currentHour - 8;
            const yPos = (hoursSinceStart * rowHeight) + ((currentMin / 60) * rowHeight);
            const containerHeight = 420;
            const targetScrollTop = yPos - (containerHeight / 2);
            calendarScrollRef.current.scrollTop = Math.max(0, targetScrollTop);
          }
        }
      }, 150);
    }
  }, [activeTab, selectedCampusRoomId, bookingDate]);

  const fetchData = async () => {
    let currentAdmin = admin;
    if (!currentAdmin) {
      const { data: adminData } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', userId)
        .single();
      if (adminData) {
        setAdmin(adminData);
        currentAdmin = adminData;
      }
    }

    if (currentAdmin?.school_id) {
      // Fetch kiosks for the school only if not loaded yet
      if (!kiosks || kiosks.length === 0) {
        const { data: kiosksData } = await supabase
          .from('kiosks')
          .select('*')
          .eq('school_id', currentAdmin.school_id);
        setKiosks(kiosksData || []);
      }
      const adminData = currentAdmin;

      if (activeTab === 'live') {
        const { data: sData } = await supabase
          .from('sessions')
          .select('*, profiles:users!inner(*), stations(*)')
          .eq('profiles.school_id', adminData.school_id)
          .is('check_out_time', null)
          .order('check_in_time', { ascending: false });
        setActiveSessions(sData || []);
      } else if (activeTab === 'students') {
        let sq = supabase.from('users').select('*').eq('school_id', adminData.school_id).eq('role', 'student');
        if (activePlatform === 'campus') sq = sq.eq('is_campus_active', true);
        else sq = sq.eq('is_groovelab_active', true);
        if (adminData.role === 'teacher') sq = sq.eq('teacher_id', adminData.id);
        const { data: studentsData } = await sq.order('first_name');
        if (studentsData) {
          // --- AUTO-CLEANUP DELETED/ARCHIVED STUDENTS ---
          const expiredStudents = studentsData.filter((s: any) => s.contract_ends_at && new Date(s.contract_ends_at).getTime() < Date.now());
          const expiredIds = expiredStudents.map((s: any) => s.id);
          
          let activeStudentsForState = studentsData;

          if (expiredIds.length > 0) {
            // Remove all expired users from bands to free the spot
            await supabase.from('band_members').delete().in('user_id', expiredIds);
            
            // Hard delete users who requested deletion
            const toDelete = expiredStudents.filter((s: any) => s.delete_after_contract === true).map((s: any) => s.id);
            if (toDelete.length > 0) {
              await supabase.from('user_song_skills').delete().in('user_id', toDelete);
              await supabase.from('sessions').delete().in('user_id', toDelete);
              await supabase.from('band_songs').update({ suggested_by: null }).in('suggested_by', toDelete);
              await supabase.from('lab_planning').delete().in('user_id', toDelete);
              await supabase.from('band_shoutbox').delete().in('user_id', toDelete);
              await supabase.from('band_song_slots').delete().in('user_id', toDelete);
              await supabase.from('help_requests').delete().in('user_id', toDelete);
              await supabase.from('avatars').delete().in('user_id', toDelete);
              await supabase.from('users').delete().in('id', toDelete);
              
              activeStudentsForState = studentsData.filter((s: any) => !toDelete.includes(s.id));
            }
          }

          setStudents(activeStudentsForState);
          const studentIds = activeStudentsForState.map((s: any) => s.id);
          
          // Fetch active sessions for school's students
          const { data: sData } = await supabase
            .from('sessions')
            .select('*, profiles:users!inner(*), stations(*)')
            .eq('profiles.school_id', adminData.school_id)
            .is('check_out_time', null);
          setActiveSessions(sData || []);

          if (studentIds.length > 0) {
            // Fetch skills for XP calculation
            const { data: skillsData } = await supabase
              .from('user_song_skills')
              .select('user_id, instrument, is_stage_ready')
              .in('user_id', studentIds);

            // Fetch band song slots for Vocals XP
            const { data: slotsData } = await supabase
              .from('band_song_slots')
              .select('user_id, instrument, status')
              .in('user_id', studentIds);

            const xpMap: Record<string, number> = {};
            studentsData.forEach(student => {
              const studentSkills = (skillsData || []).filter(sk => sk.user_id === student.id);
              const studentSlots = (slotsData || []).filter(sl => sl.user_id === student.id);

              const stageReadyCount = studentSkills.filter(sk => {
                const isVocal = (sk.instrument || '').toLowerCase().includes('vocal') || (sk.instrument || '').toLowerCase().includes('gesang');
                return sk.is_stage_ready && !isVocal;
              }).length;

              const vocalsCount = studentSlots.filter(sl => {
                const isVocal = (sl.instrument || '').toLowerCase().includes('vocal') || (sl.instrument || '').toLowerCase().includes('gesang');
                return isVocal && sl.status !== 'declined';
              }).length;

              xpMap[student.id] = (stageReadyCount + vocalsCount) * 100;
            });
            setStudentsXP(xpMap);
          } else {
            setStudentsXP({});
          }
        }
      } else if (activeTab === 'team') {
        let tsq = supabase
          .from('users')
          .select('*')
          .eq('school_id', adminData.school_id)
          .in('role', ['teacher', 'admin']);
        if (activePlatform === 'campus') tsq = tsq.eq('is_campus_active', true);
        else tsq = tsq.eq('is_groovelab_active', true);
        const { data: teachersData } = await tsq.order('first_name');
        if (teachersData) setTeachers(teachersData);
      } else if (activeTab === 'rooms') {
        let roomsQuery = supabase
          .from('rooms')
          .select('*')
          .eq('school_id', adminData.school_id);
        
        if (activePlatform === 'campus') {
          roomsQuery = roomsQuery.eq('is_campus_active', true);
        } else {
          roomsQuery = roomsQuery.eq('is_groovelab_active', true);
        }
        
        const { data: roomsData } = await roomsQuery.order('sort_order', { ascending: true });
        if (roomsData) {
          setRooms(roomsData);
          const favKey = `groovelab_favorite_room_id_${userId}`;
          const favoriteRoomId = localStorage.getItem(favKey);
          if (favoriteRoomId) {
            const favRoom = roomsData.find(r => r.id === favoriteRoomId);
            if (favRoom) {
              setSelectedCampusRoomId(favRoom.id);
            }
          }
        }

        const { data: schedulesData } = await supabase
          .from('schedules')
          .select('*, teacher:users!schedules_teacher_id_fkey(first_name, last_name)')
          .eq('school_id', adminData.school_id);
        setSchedules(schedulesData || []);

        const d = new Date(bookingDate);
        const day = d.getDay();
        const diff = d.getDate() - (day === 0 ? 6 : day - 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0,0,0,0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23,59,59,999);

        const startDateStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        const endDateStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

        const { data: occursData } = await supabase
          .from('schedule_occurrences')
          .select('*, student:users!schedule_occurrences_student_id_fkey(*), teacher:users!schedule_occurrences_teacher_id_fkey(*), schedules!schedule_occurrences_schedule_id_fkey(*)')
          .or(`and(date.gte.${startDateStr},date.lte.${endDateStr}),and(original_date.gte.${startDateStr},date.lte.${endDateStr})`);

        setScheduleOccurrences(occursData || []);

        let { data: stationsData } = await supabase
          .from('stations')
          .select('*, rooms!inner(school_id)')
          .eq('rooms.school_id', adminData.school_id)
          .order('sort_order', { ascending: true })
          .order('name');

        if (roomsData && stationsData) {
          const missingLehrerInserts = [];
          for (const room of roomsData) {
            const hasLehrer = stationsData.some(s => s.room_id === room.id && s.name.toLowerCase() === 'lehrer ipad');
            if (!hasLehrer) {
              missingLehrerInserts.push({
                room_id: room.id,
                name: 'Lehrer iPad',
                color: '#eab308'
              });
            }
          }
          if (missingLehrerInserts.length > 0) {
            const { data: newStations } = await supabase.from('stations').insert(missingLehrerInserts).select();
            if (newStations) {
              stationsData = [...stationsData, ...newStations];
            }
          }
        }
        if (stationsData) setStations(stationsData);
      } else if (activeTab === 'songs') {
        let sq = supabase
          .from('songs')
          .select('*')
          .eq('school_id', adminData.school_id);
        if (activePlatform === 'campus') sq = sq.eq('is_campus_active', true);
        else sq = sq.eq('is_groovelab_active', true);
        // REGEL: Lehrer sehen nur ihre eigenen Songs (teacher_id-Filter)
        if (adminData.role === 'teacher') sq = sq.eq('teacher_id', adminData.id);
        const { data: songsData } = await sq.order('artist');
        if (songsData) setSongs(songsData);

        // REGEL: Lehrer sehen nur ihre eigenen Lehrwerke (teacher_id-Filter)
        let lwSq = supabase
          .from('lehrwerke')
          .select('*')
          .eq('school_id', adminData.school_id);
        if (adminData.role === 'teacher') lwSq = lwSq.eq('teacher_id', adminData.id);
        const { data: lehrwerkeData } = await lwSq.order('title');
        if (lehrwerkeData) {
          const mappedLw = lehrwerkeData.map((item: any) => ({
            ...item,
            totalPages: item.total_pages || 50
          }));
          setLehrwerke(mappedLw);
        }

        // Fetch students for assignments in songs/lehrwerke detail modal
        let studSq = supabase.from('users').select('*').eq('school_id', adminData.school_id).eq('role', 'student');
        if (activePlatform === 'campus') studSq = studSq.eq('is_campus_active', true);
        else studSq = studSq.eq('is_groovelab_active', true);
        if (adminData.role === 'teacher') studSq = studSq.eq('teacher_id', adminData.id);
        const { data: studentsData } = await studSq.order('first_name');
        if (studentsData) setStudents(studentsData);
      } else if (activeTab === 'bands') {
        const { data: bandsData } = await supabase
          .from('bands')
          .select('*, songs(title, artist, instrumentation), band_members(*, users(*)), coach:users!coach_id(id, first_name, last_name, photo_url), band_songs(*, songs(*), band_song_slots(*, profiles:users!user_id(id, first_name, photo_url, user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id, song_id, instrument, progress_percent, is_pending_approval, is_stage_ready))))')
          .eq('school_id', adminData.school_id)
          .order('name');
        if (bandsData) {
          const filteredBands = bandsData.filter((b: any) => b.name !== '__SYSTEM_ANNOUNCEMENTS__');
          setAllBands(filteredBands); 
          if (editingBand) {
            const updated = bandsData.find((b: any) => b.id === editingBand.id);
            if (updated) {
              setEditingBand((prev: any) => {
                if (!prev) return null;
                return {
                  ...updated,
                  name: prev.name,
                  bio: prev.bio,
                  genre: prev.genre,
                  coach_id: prev.coach_id,
                  coach_is_manual: prev.coach_is_manual
                };
              });
            }
          }
        }
        // Also fetch students for the search function in band edit
        let bsq = supabase.from('users').select('*').eq('school_id', adminData.school_id).eq('role', 'student');
        if (activePlatform === 'campus') bsq = bsq.eq('is_campus_active', true);
        else bsq = bsq.eq('is_groovelab_active', true);
        const { data: studentsData } = await bsq.order('first_name');
        if (studentsData) setStudents(studentsData);
        
        // Also fetch teachers for coach selection
        let coachTsq = supabase
          .from('users')
          .select('*')
          .eq('school_id', adminData.school_id)
          .in('role', ['teacher', 'admin']);
        if (activePlatform === 'campus') coachTsq = coachTsq.eq('is_campus_active', true);
        else coachTsq = coachTsq.eq('is_groovelab_active', true);
        const { data: teachersData } = await coachTsq.order('first_name');
        if (teachersData) setTeachers(teachersData);
      } else if (activeTab === 'stats') {
        fetchStats(adminData.school_id);
        let statsTsq = supabase
          .from('users')
          .select('*')
          .eq('school_id', adminData.school_id)
          .in('role', ['teacher', 'admin']);
        if (activePlatform === 'campus') statsTsq = statsTsq.eq('is_campus_active', true);
        else statsTsq = statsTsq.eq('is_groovelab_active', true);
        const { data: teachersData } = await statsTsq.order('first_name');
        if (teachersData) setTeachers(teachersData);
      } else if (activeTab === 'gallery') {
        let usq = supabase.from('users').select('*').eq('school_id', adminData.school_id);
        if (activePlatform === 'campus') usq = usq.eq('is_campus_active', true);
        else usq = usq.eq('is_groovelab_active', true);
        const { data: allUsers } = await usq.order('first_name');
        if (allUsers) {
          setStudents(allUsers.filter(u => u.role === 'student'));
          setTeachers(allUsers.filter(u => u.role === 'teacher' || u.role === 'admin'));
        }
      } else if (activeTab === 'setup') {
        const { data: rData } = await supabase.from('rooms').select('*').eq('school_id', adminData.school_id).eq('is_groovelab_active', true).order('sort_order', { ascending: true });
        setSetupRooms(rData || []);
        const { data: sData } = await supabase.from('stations').select('*, rooms!inner(school_id)').eq('rooms.school_id', adminData.school_id).order('sort_order', { ascending: true }).order('name');
        setSetupStations(sData || []);
        
        // Fetch active sessions
        const { data: activeSessionsData } = await supabase
          .from('sessions')
          .select('*, profiles:users!inner(*), stations(*)')
          .eq('profiles.school_id', adminData.school_id)
          .is('check_out_time', null)
          .order('check_in_time', { ascending: false });
        setActiveSessions(activeSessionsData || []);
        
        // Fetch students roster for manual check-in
        let ssq = supabase.from('users').select('*').eq('school_id', adminData.school_id).eq('role', 'student');
        if (activePlatform === 'campus') ssq = ssq.eq('is_campus_active', true);
        else ssq = ssq.eq('is_groovelab_active', true);
        const { data: studentsData } = await ssq.order('first_name');
        if (studentsData) setStudents(studentsData);
      }
    }
  };

  useEffect(() => {
    if (!admin?.school_id) return;
    
    const channel = supabase
      .channel('admin_lab_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchData();
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [admin?.school_id]);

  useEffect(() => {
    if (!admin?.school_id || kiosks === null) return;

    const activeRooms = rooms.length > 0 ? rooms : setupRooms;
    const activeStations = stations.length > 0 ? stations : setupStations;

    if (activeRooms.length === 0) return;

    const missingKiosks: any[] = [];

    activeRooms.forEach(r => {
      const exists = kiosks.some(k => k.room_id === r.id && !k.station_id);
      if (!exists) {
        missingKiosks.push({
          school_id: admin.school_id,
          name: r.name || 'Raum Kiosk',
          room_id: r.id,
          station_id: null
        });
      }
    });

    activeStations.forEach(s => {
      const exists = kiosks.some(k => k.station_id === s.id);
      if (!exists) {
        missingKiosks.push({
          school_id: admin.school_id,
          name: s.name || 'iPad Kiosk',
          room_id: s.room_id,
          station_id: s.id
        });
      }
    });

    if (missingKiosks.length > 0) {
      const insertKiosks = async () => {
        const { error } = await supabase.from('kiosks').insert(missingKiosks);
        if (!error) {
          const { data: kiosksData } = await supabase
            .from('kiosks')
            .select('*')
            .eq('school_id', admin.school_id);
          setKiosks(kiosksData || []);
        } else {
          console.error('Error auto-creating kiosks:', error);
        }
      };
      insertKiosks();
    }
  }, [admin?.school_id, rooms, setupRooms, stations, setupStations, kiosks]);

  const fetchStats = async (schoolId: string) => {
    let studentSq = supabase.from('users').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'student');
    if (activePlatform === 'campus') studentSq = studentSq.eq('is_campus_active', true);
    else studentSq = studentSq.eq('is_groovelab_active', true);
    const { count: studentCount } = await studentSq;

    let songSq = supabase.from('songs').select('*', { count: 'exact', head: true }).eq('school_id', schoolId);
    if (activePlatform === 'campus') songSq = songSq.eq('is_campus_active', true);
    else songSq = songSq.eq('is_groovelab_active', true);
    const { count: songCount } = await songSq;
    
    // Fetch sessions filtered by active students
    let sessionsSq = supabase
      .from('sessions')
      .select('check_in_time, check_out_time, station_id, users!inner(school_id, is_campus_active, is_groovelab_active)')
      .eq('users.school_id', schoolId)
      .not('check_out_time', 'is', null);
    if (activePlatform === 'campus') sessionsSq = sessionsSq.eq('users.is_campus_active', true);
    else sessionsSq = sessionsSq.eq('users.is_groovelab_active', true);
    const { data: sessions } = await sessionsSq;

    // Fetch skills filtered by active students and active songs
    let skillsSq = supabase
      .from('user_song_skills')
      .select('user_id, progress_percent, instrument, is_stage_ready, student:users!user_song_skills_user_id_fkey!inner(school_id, is_campus_active, is_groovelab_active), songs!inner(title, artist, is_campus_active, is_groovelab_active)')
      .eq('student.school_id', schoolId);
    if (activePlatform === 'campus') {
      skillsSq = skillsSq.eq('student.is_campus_active', true).eq('songs.is_campus_active', true);
    } else {
      skillsSq = skillsSq.eq('student.is_groovelab_active', true).eq('songs.is_groovelab_active', true);
    }
    const { data: skills } = await skillsSq;

    // Get school opening hours & reset stats timestamp
    const openingHours = admin?.schools?.opening_hours;
    const resetDateStr = openingHours?.stats_reset_at;
    const resetDate = resetDateStr ? new Date(resetDateStr) : null;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    let totalMins = 0;
    let labMins = 0;
    let homeMins = 0;
    
    const filteredSessions = (sessions || []).filter((s: any) => {
      const checkInDate = new Date(s.check_in_time);
      
      // 1. Filter by stats reset date
      if (resetDate && checkInDate < resetDate) return false;
      
      // 2. Check if within opening hours (enforce active day and custom hours if at station)
      if (s.station_id && openingHours) {
        const dayConfig = openingHours[dayNames[checkInDate.getDay()]];
        if (!dayConfig || !dayConfig.active) return false;
        
        const startStr = dayConfig.start || "08:00";
        const endStr = dayConfig.end || "20:00";
        const [startH, startM] = startStr.split(':').map(Number);
        const [endH, endM] = endStr.split(':').map(Number);
        
        const sessionH = checkInDate.getHours();
        const sessionM = checkInDate.getMinutes();
        
        const sessionTime = sessionH * 60 + sessionM;
        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;
        
        if (sessionTime < startTime || sessionTime > endTime) return false;
      }
      return true;
    });

    filteredSessions.forEach((s: any) => {
      const start = new Date(s.check_in_time);
      const end = new Date(s.check_out_time!);
      const mins = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
      totalMins += mins;
      if (s.station_id) labMins += mins;
      else homeMins += mins;
    });

    // Mastered challenges count per instrument
    const stageReadyPerInst = { guitar: 0, keys: 0, drums: 0, bass: 0, vocals: 0 };
    skills?.forEach((s: any) => {
      if (s.is_stage_ready) {
        const inst = (s.instrument || '').toLowerCase().trim();
        if (inst === 'guitar' || inst === 'e-gitarre' || inst === 'gitarre') stageReadyPerInst.guitar++;
        else if (inst === 'keys' || inst === 'piano' || inst === 'e-piano' || inst === 'piano / keys') stageReadyPerInst.keys++;
        else if (inst === 'drums' || inst === 'e-drums' || inst === 'schlagzeug') stageReadyPerInst.drums++;
        else if (inst === 'bass' || inst === 'e-bass') stageReadyPerInst.bass++;
        else if (inst === 'vocals' || inst === 'gesang' || inst.includes('vocal')) stageReadyPerInst.vocals++;
      }
    });

    // Top Songs: count unique students practicing each song
    const songUniqueUsers: Record<string, Set<string>> = {};
    skills?.forEach((s: any) => {
      const title = s.songs?.title;
      const artist = s.songs?.artist;
      const userId = s.user_id;
      if (title && userId) {
        const key = `${title} - ${artist}`;
        if (!songUniqueUsers[key]) {
          songUniqueUsers[key] = new Set();
        }
        songUniqueUsers[key].add(userId);
      }
    });
    const topSongs = Object.entries(songUniqueUsers)
      .map(([name, userSet]) => ({ name, count: userSet.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Leaderboard
    let leaderboardSq = supabase
      .from('users')
      .select('*, skills:user_song_skills!user_song_skills_user_id_fkey(progress_percent, is_stage_ready, songs(is_campus_active, is_groovelab_active))')
      .eq('school_id', schoolId)
      .eq('role', 'student');
    if (activePlatform === 'campus') leaderboardSq = leaderboardSq.eq('is_campus_active', true);
    else leaderboardSq = leaderboardSq.eq('is_groovelab_active', true);
    const { data: studentsWithSkills } = await leaderboardSq;

    const leaderboard = (studentsWithSkills || []).map((student: any) => {
      const xp = (student.skills || [])
        .filter((s: any) => {
          const song = s.songs ? (Array.isArray(s.songs) ? s.songs[0] : s.songs) : null;
          if (!song) return false;
          const matchesSong = activePlatform === 'campus' ? song.is_campus_active : song.is_groovelab_active;
          return matchesSong && (s.progress_percent === 100 || s.is_stage_ready);
        })
        .length * 100;
      return {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        photo_url: student.photo_url,
        xp
      };
    })
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 5);

    const levelDist = { level1: 0, level2: 0, level3: 0 };
    let statsSongsSq = supabase.from('songs').select('level').eq('school_id', schoolId);
    if (activePlatform === 'campus') statsSongsSq = statsSongsSq.eq('is_campus_active', true);
    else statsSongsSq = statsSongsSq.eq('is_groovelab_active', true);
    const { data: songsData } = await statsSongsSq;
    songsData?.forEach(s => {
      if (s.level === 1) levelDist.level1++;
      if (s.level === 2) levelDist.level2++;
      if (s.level === 3) levelDist.level3++;
    });

    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const weekdayData = days.map((day, idx) => {
      const mins = filteredSessions.filter((s: any) => new Date(s.check_in_time).getDay() === idx)
        .reduce((acc: number, s: any) => {
          const start = new Date(s.check_in_time);
          const end = new Date(s.check_out_time!);
          return acc + Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
        }, 0);
      return { day, mins: Math.round(mins / 60) };
    });

    setStats({
      studentCount,
      songCount,
      totalMins,
      labMins,
      homeMins,
      levelDist,
      weekdayData,
      stageReadyPerInst,
      topSongs,
      leaderboard,
      resetDateStr
    });
  };;

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id) return;
    
    // Check limits - BYPASSED (Limits strictly removed)
    
    const qrToken = crypto.randomUUID();
    const studentInstrument = newStudent.isExternalVocalist ? 'Vocals' : (newStudent.instrument || 'Gitarre');
    const studentAvatarUrl = getInstrumentAvatarUrl(studentInstrument);
    
    const { data, error } = await supabase.from('users').insert({
      school_id: admin.school_id, 
      role: 'student', 
      first_name: newStudent.firstName, 
      last_name: newStudent.lastName.length > 1 ? newStudent.lastName.charAt(0) + '.' : newStudent.lastName, 
      birth_date: null,
      photo_url: newStudent.photoUrl || '/avatar_ghost.jpg',
      avatar_url: studentAvatarUrl,
      qr_token: qrToken,
      is_external_vocalist: newStudent.isExternalVocalist,
      instrument: studentInstrument,
      is_campus_active: activePlatform === 'campus',
      is_groovelab_active: activePlatform === 'groovelab'
    }).select().single();
    
    if (error) alert('Fehler: ' + error.message);
    else if (data) { 
      // Also automatically create/sync their avatars record
      await supabase.from('avatars').upsert({
        user_id: data.id,
        avatar_style: 'Premium_Hero',
        instrument_type: getInstrumentTypeKey(studentInstrument),
        evolution_level: 1,
        xp: 0,
        asset_path: studentAvatarUrl,
        streak_flame: 0
      });

      setStudents([...students, data]); 
      setShowAddStudent(false); 
      setNewStudent({ firstName: '', lastName: '', birthDate: '', photoUrl: '/avatar_ghost.jpg', isExternalVocalist: false, instrument: 'Gitarre' }); 
    }
  };

  const parseBulkInput = (text: string, currentInstrument: string) => {
    if (!text.trim()) {
      setParsedStudents([]);
      return;
    }
    const lines = text.split('\n');
    const studentsList = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';
        return {
          firstName,
          lastName,
          instrument: currentInstrument
        };
      });
    setParsedStudents(studentsList);
  };

  const handleBulkAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id || parsedStudents.length === 0) return;
    setIsBulkSaving(true);

    // Check limits - BYPASSED (Limits strictly removed)

    const studentsToInsert = parsedStudents.map(student => {
      const qrToken = crypto.randomUUID();
      const isVocalist = student.instrument === 'Gesang';
      const studentInstrument = isVocalist ? 'Vocals' : student.instrument;
      const studentAvatarUrl = getInstrumentAvatarUrl(studentInstrument);
      
      return {
        school_id: admin.school_id, 
        role: 'student', 
        first_name: student.firstName, 
        last_name: student.lastName.length > 1 ? student.lastName.charAt(0) + '.' : student.lastName, 
        birth_date: null,
        photo_url: '/avatar_ghost.jpg',
        avatar_url: studentAvatarUrl,
        qr_token: qrToken,
        is_external_vocalist: isVocalist,
        instrument: studentInstrument,
        is_campus_active: activePlatform === 'campus',
        is_groovelab_active: activePlatform === 'groovelab'
      };
    });

    try {
      const { data, error } = await supabase.from('users').insert(studentsToInsert).select();
      
      if (error) {
        alert('Fehler beim Anlegen: ' + error.message);
      } else if (data && data.length > 0) {
        const avatarsToInsert = data.map(dbStudent => {
          const studentInstrument = dbStudent.instrument || 'Gitarre';
          const studentAvatarUrl = getInstrumentAvatarUrl(studentInstrument);
          return {
            user_id: dbStudent.id,
            avatar_style: 'Premium_Hero',
            instrument_type: getInstrumentTypeKey(studentInstrument),
            evolution_level: 1,
            xp: 0,
            asset_path: studentAvatarUrl,
            streak_flame: 0
          };
        });
        
        await supabase.from('avatars').upsert(avatarsToInsert);
        
        setStudents([...students, ...data]);
        setShowBulkAddStudents(false);
        setBulkInput('');
        setParsedStudents([]);
      }
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const studentInstrument = editingStudent.instrument || 'Gitarre';
    const studentAvatarUrl = getInstrumentAvatarUrl(studentInstrument);

    const { error } = await supabase.from('users').update({
      first_name: editingStudent.first_name,
      last_name: editingStudent.last_name,
      birth_date: editingStudent.birth_date,
      status: editingStudent.status || 'active',
      is_trial: editingStudent.is_trial || false,
      trial_ends_at: editingStudent.trial_ends_at || null,
      contract_ends_at: editingStudent.contract_ends_at || null,
      instrument: studentInstrument,
      avatar_url: studentAvatarUrl
    }).eq('id', editingStudent.id);
    
    if (error) alert('Fehler: ' + error.message);
    else {
      // Keep their avatars record in sync too
      await supabase.from('avatars').upsert({
        user_id: editingStudent.id,
        avatar_style: 'Premium_Hero',
        instrument_type: getInstrumentTypeKey(studentInstrument),
        evolution_level: 1,
        asset_path: studentAvatarUrl
      });

      setStudents(students.map(s => s.id === editingStudent.id ? {
        ...editingStudent,
        avatar_url: studentAvatarUrl
      } : s));
      setEditingStudent(null);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    const studentToDelete = students.find(s => s.id === id);
    if (!studentToDelete) return;

    const actionText = activePlatform === 'campus'
      ? 'Möchtest du diesen Schüler wirklich vom Campus entfernen?'
      : 'Möchtest du diesen Schüler wirklich von GrooveLab entfernen?';

    if (window.confirm(actionText)) {
      try {
        const isCampus = activePlatform === 'campus';
        const otherActive = isCampus ? studentToDelete.is_groovelab_active : studentToDelete.is_campus_active;

        if (otherActive) {
          // Soft delete: only remove from this platform, keep the user for the other
          const updatePayload = isCampus
            ? { is_campus_active: false }
            : { is_groovelab_active: false };
          const { error } = await supabase.from('users').update(updatePayload).eq('id', id);
          if (error) throw error;
        } else {
          // Hard delete: student is only on this platform, remove completely
          await supabase.from('user_song_skills').delete().eq('user_id', id);
          await supabase.from('band_members').delete().eq('user_id', id);
          await supabase.from('sessions').delete().eq('user_id', id);
          await supabase.from('band_songs').update({ suggested_by: null }).eq('suggested_by', id);
          await supabase.from('lab_planning').delete().eq('user_id', id);
          await supabase.from('band_shoutbox').delete().eq('user_id', id);
          await supabase.from('band_song_slots').delete().eq('user_id', id);
          await supabase.from('help_requests').delete().eq('user_id', id);
          const { error } = await supabase.from('users').delete().eq('id', id);
          if (error) throw error;
        }
        
        setStudents(students.filter(s => s.id !== id));
      } catch (err: any) {
        alert('Fehler beim Entfernen: ' + err.message);
      }
    }
  };

  const handleCleanupPlanning = async () => {
    if (!window.confirm('Möchtest du verwaiste Einträge im Wochenplan bereinigen? (Einträge von gelöschten Schülern werden entfernt)')) return;
    
    try {
      // 1. Hole alle Planungs-Einträge
      const { data: planning } = await supabase.from('lab_planning').select('id, user_id').eq('school_id', admin.school_id);
      // 2. Hole alle aktuellen Schüler/Lehrer
      const { data: currentUsers } = await supabase.from('users').select('id').eq('school_id', admin.school_id);
      
      if (!planning || !currentUsers) return;
      
      const userIds = new Set(currentUsers.map(u => u.id));
      const orphaned = planning.filter(p => !userIds.has(p.user_id));
      
      if (orphaned.length === 0) {
        alert('Keine verwaisten Einträge gefunden. Deine Datenbank ist sauber! ✨');
        return;
      }
      
      const { error } = await supabase.from('lab_planning').delete().in('id', orphaned.map(o => o.id));
      if (error) throw error;
      
      alert(`${orphaned.length} verwaiste Einträge erfolgreich entfernt! ✅`);
      fetchData();
    } catch (err: any) {
      alert('Fehler bei der Bereinigung: ' + err.message);
    }
  };

  const handleResetAllPlanning = async () => {
    if (!admin?.school_id) return;
    if (!window.confirm("Bist du sicher? Dies löscht alle aktuellen Planungen für die gesamte Akademie!")) return;
    const { error } = await supabase.from('lab_planning').delete().eq('school_id', admin.school_id);
    if (error) alert("Fehler beim Zurücksetzen: " + error.message);
    else fetchData();
  };

  const handleCreateBandManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBand.name || !admin?.school_id) return;

    // 1. Create Band
    const { data: band, error: bErr } = await supabase.from('bands').insert({
      name: newBand.name,
      coach_id: newBand.coach_id || userId,
      school_id: admin.school_id,
      status: 'active',
      photo_url: newBand.photo_url || null
    }).select().single();

    if (bErr || !band) {
      alert("Fehler beim Erstellen der Band: " + bErr?.message);
      return;
    }

    // 2. Add Song (if selected)
    if (newBand.song_id) {
       const { data: bs, error: bsErr } = await supabase.from('band_songs').insert({
         band_id: band.id,
         song_id: newBand.song_id,
         status: 'ready'
       }).select().single();
       
       if (bs) {
          // Add Slots for members
          for (const m of selectedMembers) {
             await supabase.from('band_song_slots').insert({
               band_song_id: bs.id,
               user_id: m.user_id,
               instrument: m.instrument,
               status: 'joined'
             });
          }
       } else {
         console.error("Fehler beim Verknüpfen des Songs:", bsErr);
       }
    }

    // 3. Add Members
    // First, the coach
    const coachInsertData: any = { 
      band_id: band.id, 
      user_id: newBand.coach_id || userId, 
      role: 'coach',
      instrument: 'Coach'
    };
    const { error: coachErr } = await supabase.from('band_members').insert(coachInsertData);
    if (coachErr && coachErr.message.includes('role')) {
       const fallbackCoach = { ...coachInsertData };
       delete fallbackCoach.role;
       await supabase.from('band_members').insert(fallbackCoach);
    } else if (coachErr) {
       console.error("Fehler beim Hinzufügen des Coachs:", coachErr);
    }
    
    for (const m of selectedMembers) {
       const memberInsertData: any = {
         band_id: band.id,
         user_id: m.user_id,
         role: 'member',
         instrument: m.instrument
       };
       const { error: memErr } = await supabase.from('band_members').insert(memberInsertData);
       if (memErr && memErr.message.includes('role')) {
          const fallbackMember = { ...memberInsertData };
          delete fallbackMember.role;
          await supabase.from('band_members').insert(fallbackMember);
       } else if (memErr) {
          console.error("Fehler beim Hinzufügen des Mitglieds:", memErr);
       }
    }

    setShowAddBand(false);
    setNewBand({ name: '', song_id: '', coach_id: userId, photo_url: '' });
    setSelectedMembers([]);
    fetchData();
  };
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id) return;

    // Check limits if enabled
    if (admin?.schools?.limits_enabled) {
      const maxTeachers = admin.schools.max_teachers ?? 2;
      if (teachers.length >= maxTeachers) {
        alert(`Limit erreicht! Deine Schule darf maximal ${maxTeachers} Lehrer/Admins registrieren. Kontaktiere deinen Master-Admin.`);
        return;
      }
    }

    const { data, error } = await supabase.from('users').insert({
      school_id: admin.school_id, 
      role: newTeacher.isAdmin ? 'admin' : 'teacher', 
      first_name: newTeacher.firstName, 
      last_name: newTeacher.lastName, 
      instrument: newTeacher.instrument || '',
      photo_url: newTeacher.photoUrl,
      qr_token: crypto.randomUUID()
    }).select().single();
    if (error) alert('Fehler: ' + error.message);
    else if (data) { setTeachers([...teachers, data]); setShowAddTeacher(false); setNewTeacher({ firstName: '', lastName: '', isAdmin: false, instrument: '', photoUrl: '' }); }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (id === userId) return alert('Du kannst dich nicht selbst löschen!');
    if (window.confirm('Möchtest du diesen Lehrer wirklich löschen?')) {
      try {
        // Cleanup related data
        await supabase.from('sessions').delete().eq('user_id', id);
        await supabase.from('band_members').delete().eq('user_id', id);
        await supabase.from('band_songs').update({ suggested_by: null }).eq('suggested_by', id);
        await supabase.from('lab_planning').delete().eq('user_id', id);
        await supabase.from('band_shoutbox').delete().eq('user_id', id);
        await supabase.from('band_song_slots').delete().eq('user_id', id);
        await supabase.from('help_requests').delete().eq('user_id', id);
        
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        
        setTeachers(teachers.filter(t => t.id !== id));
      } catch (err: any) {
        alert('Fehler beim Löschen: ' + err.message);
      }
    }
  };

  const handleToggleObserver = async (t: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !t.is_observer;
    // Optimistic update
    setTeachers((prev: any[]) => prev.map(x => x.id === t.id ? { ...x, is_observer: newValue } : x));
    const { error } = await supabase.from('users').update({ is_observer: newValue }).eq('id', t.id);
    if (error) {
      // Rollback on failure
      setTeachers((prev: any[]) => prev.map(x => x.id === t.id ? { ...x, is_observer: !newValue } : x));
      alert('Fehler beim Speichern: ' + error.message);
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    const { error } = await supabase.from('users').update({
      first_name: editingTeacher.first_name,
      last_name: editingTeacher.last_name,
      role: editingTeacher.role,
      instrument: editingTeacher.instrument,
      photo_url: editingTeacher.photo_url,
      bio: editingTeacher.bio,
      expertise: editingTeacher.expertise,
      bands: editingTeacher.bands,
      gear: editingTeacher.gear,
      listening: editingTeacher.listening
    }).eq('id', editingTeacher.id);
    
    if (error) alert('Fehler: ' + error.message);
    else {
      setTeachers(teachers.map(t => t.id === editingTeacher.id ? editingTeacher : t));
      setEditingTeacher(null);
      alert('Lehrer-Profil erfolgreich aktualisiert! ✅');
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id) return;
    
    const { data: roomData, error: roomError } = await supabase.from('rooms').insert({
      school_id: admin.school_id, 
      name: newRoomName,
      latitude: newRoomLocation?.lat,
      longitude: newRoomLocation?.lng,
      sort_order: rooms.length
    }).select().single();
    
    if (roomError) {
      alert('Fehler beim Raum anlegen: ' + roomError.message);
      return;
    }

    if (roomData) { 
      const stationsToInsert = [];
      
      // Always add Teacher iPad
      stationsToInsert.push({
        room_id: roomData.id,
        name: 'Lehrer iPad',
        color: '#22c55e',
        instrument: 'Tablet',
        pos_x: 50,
        pos_y: 50
      });

      if (newRoomStationCount > 0) {
        for (let i = 0; i < newRoomStationCount; i++) {
          stationsToInsert.push({
            room_id: roomData.id,
            name: `iPad ${i + 1}`
          });
        }
      }

      await supabase.from('stations').insert(stationsToInsert);

      fetchData();
      setShowAddRoom(false); 
      setNewRoomName(''); 
      setNewRoomLocation(null);
      setNewRoomStationCount(5);
    }
  };

  const captureGPSForRoom = () => {
    if (!navigator.geolocation) {
      alert('GPS wird nicht unterstützt.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewRoomLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => alert('Fehler beim Abrufen des Standorts. Bitte Berechtigungen prüfen.'),
      { enableHighAccuracy: true }
    );
  };

  const handleAddStation = async (e: React.FormEvent, roomId: string) => {
    e.preventDefault();
    const { data, error } = await supabase.from('stations').insert({
      room_id: roomId, name: newStationName, color: newStationColor
    }).select().single();
    if (error) alert('Fehler: ' + error.message);
    else if (data) { 
      setStations([...stations, data]); 
      setShowAddStationForRoom(null); 
      setNewStationName(''); 
      setNewStationColor('#64748b');
    }
  };

  const triggerBatchAddStations = (roomId: string) => {
    setShowBatchiPadModal({ roomId });
    setBatchiPadCount(1);
  };

  const executeBatchAddStations = async () => {
    if (!showBatchiPadModal) return;
    const roomId = showBatchiPadModal.roomId;
    const count = batchiPadCount;
    if (isNaN(count) || count <= 0) {
      alert("Bitte eine gültige Anzahl (Zahl größer als 0) eingeben.");
      return;
    }

    const roomStations = stations.filter(s => s.room_id === roomId && s.name.startsWith('iPad '));
    let nextNum = 1;
    roomStations.forEach(s => {
      const match = s.name.match(/^iPad\s+(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    });

    const stationsToInsert = [];
    for (let i = 0; i < count; i++) {
      const currentNum = nextNum + i;
      let color = '#64748b';
      if (currentNum === 1 || currentNum === 2) color = '#ef4444';
      else if (currentNum === 3 || currentNum === 4) color = '#a855f7';
      else if (currentNum === 5 || currentNum === 6) color = '#3b82f6';
      else if (currentNum === 7 || currentNum === 8) color = '#eab308';

      stationsToInsert.push({
        room_id: roomId,
        name: `iPad ${currentNum}`,
        color: color
      });
    }

    const { data, error } = await supabase.from('stations').insert(stationsToInsert).select();
    if (error) {
      alert('Fehler beim Anlegen der iPads: ' + error.message);
    } else if (data) {
      setStations([...stations, ...data]);
      setShowBatchiPadModal(null);
    }
  };



  const handleUpdateRoomName = async (roomId: string) => {
    if (!editingRoomName.trim()) return;
    const { error } = await supabase.from('rooms').update({ name: editingRoomName }).eq('id', roomId);
    if (error) alert(error.message);
    else {
      setRooms(rooms.map(r => r.id === roomId ? { ...r, name: editingRoomName } : r));
      setEditingRoomId(null);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Raum und alle darin enthaltenen iPads wirklich löschen?')) return;
    const { error } = await supabase.from('rooms').delete().eq('id', roomId);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleRoomDragStart = (e: React.DragEvent, roomId: string) => {
    setDraggedRoomId(roomId);
    draggedRoomIdRef.current = roomId;
    e.dataTransfer.setData('text/plain', roomId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRoomDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRoomDragEnter = (e: React.DragEvent, roomId: string) => {
    e.preventDefault();
    const activeDraggedId = draggedRoomIdRef.current || draggedRoomId;
    if (activeDraggedId && activeDraggedId !== roomId) {
      setDragOverRoomId(roomId);
    }
  };

  const handleRoomDragLeave = () => {
    setDragOverRoomId(null);
  };

  const handleRoomDrop = async (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedRoomIdRef.current || draggedRoomId;
    if (!sourceId || sourceId === targetRoomId) {
      setDraggedRoomId(null);
      draggedRoomIdRef.current = null;
      setDragOverRoomId(null);
      return;
    }

    // Optimistically update local rooms state
    const sourceIndex = rooms.findIndex(r => r.id === sourceId);
    const targetIndex = rooms.findIndex(r => r.id === targetRoomId);
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedRoomId(null);
      draggedRoomIdRef.current = null;
      setDragOverRoomId(null);
      return;
    }

    const reorderedRooms = [...rooms];
    const [movedRoom] = reorderedRooms.splice(sourceIndex, 1);
    reorderedRooms.splice(targetIndex, 0, movedRoom);

    // Reassign sort_order values locally
    const updatedRooms = reorderedRooms.map((room, idx) => ({
      ...room,
      sort_order: idx
    }));

    setRooms(updatedRooms);
    setDraggedRoomId(null);
    draggedRoomIdRef.current = null;
    setDragOverRoomId(null);

    // Persist reordered sort_order values to the database
    try {
      const updatePromises = updatedRooms.map((room, idx) =>
        supabase
          .from('rooms')
          .update({ sort_order: idx })
          .eq('id', room.id)
      );
      await Promise.all(updatePromises);
      console.log('Successfully reordered rooms in database');
    } catch (err) {
      console.error('Error persisting room order:', err);
      alert('Fehler beim Speichern der Raumreihenfolge.');
      if (admin?.school_id) {
        const { data: roomsData } = await supabase
          .from('rooms')
          .select('*')
          .eq('school_id', admin.school_id)
          .eq('is_groovelab_active', true)
          .order('sort_order', { ascending: true });
        if (roomsData) setRooms(roomsData);
      }
    }
  };

  const handleRoomDragEnd = () => {
    setDraggedRoomId(null);
    draggedRoomIdRef.current = null;
    setDragOverRoomId(null);
  };

  const handleDeleteStation = async (stationId: string) => {
    if (!window.confirm('Dieses iPad wirklich entfernen?')) return;
    const { error } = await supabase.from('stations').delete().eq('id', stationId);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleUpdateStationColor = async (stationId: string, newColor: string) => {
    const station = stations.find(s => s.id === stationId);
    if (!station) return;

    // Find partner in pair (1-2, 3-4, etc.)
    const nameMatch = station.name.match(/\d+$/);
    const partnerId = nameMatch ? (() => {
      const num = parseInt(nameMatch[0]);
      const partnerNum = num % 2 === 0 ? num - 1 : num + 1;
      const partnerName = station.name.replace(/\d+$/, partnerNum.toString());
      return stations.find(s => s.name === partnerName && s.room_id === station.room_id)?.id;
    })() : null;

    const idsToUpdate = [stationId];
    if (partnerId) idsToUpdate.push(partnerId);

    const { error } = await supabase.from('stations').update({ color: newColor }).in('id', idsToUpdate);
    if (error) {
      alert('Fehler: ' + error.message);
    } else {
      setStations(stations.map(s => idsToUpdate.includes(s.id) ? { ...s, color: newColor } : s));
    }
  };

  const handleAddGeofencePoint = async (roomId: string, manualLat?: number, manualLng?: number) => {
    if (!manualLat && !window.confirm('Aktuellen Standort als weiteren Kalibrierungs-Punkt für diesen Raum hinzufügen? (Radius: 20m)')) return;
    
    const updatePoint = async (lat: number, lng: number) => {
      console.log(`[Admin] Punkt hinzufügen: ${lat}, ${lng}`);
      
      const { data: latestRoom, error: fetchError } = await supabase
        .from('rooms')
        .select('geofence_points')
        .eq('id', roomId)
        .single();

      if (fetchError || !latestRoom) return;

      let currentPoints = Array.isArray(latestRoom.geofence_points) ? [...latestRoom.geofence_points] : [];
      const newPoint = { lat, lng, timestamp: new Date().toISOString() };
      currentPoints.push(newPoint);

      await supabase.from('rooms').update({ 
        geofence_points: currentPoints,
        latitude: lat,
        longitude: lng
      }).eq('id', roomId);
      
      fetchData();
    };

    if (manualLat && manualLng) {
      updatePoint(manualLat, manualLng);
      return;
    }
    
    const tryScan = (highAccuracy: boolean) => {
      const geoOptions = {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 5000 : 10000,
        maximumAge: 0 
      };

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        console.log(`[Admin] Scan erfolgreich: ${lat}, ${lng}`);

        // 1. Frischesten Stand des Raumes direkt aus der DB holen (verhindert Race Conditions)
        const { data: latestRoom, error: fetchError } = await supabase
          .from('rooms')
          .select('name, geofence_points')
          .eq('id', roomId)
          .single();

        if (fetchError || !latestRoom) {
          alert('Fehler beim Abrufen der aktuellen Raumdaten: ' + (fetchError?.message || 'Nicht gefunden'));
          return;
        }

        // 2. Punkte sicher zusammenführen
        let currentPoints: Array<{ lat: number, lng: number, timestamp: string }> = [];
        if (latestRoom.geofence_points && Array.isArray(latestRoom.geofence_points)) {
          currentPoints = [...latestRoom.geofence_points];
        }

        const newPoint = { 
          lat: Number(lat.toFixed(8)), 
          lng: Number(lng.toFixed(8)), 
          timestamp: new Date().toISOString() 
        };
        
        currentPoints.push(newPoint);

        // 3. Update an Supabase senden
        const { error: updateError } = await supabase.from('rooms').update({
          geofence_points: currentPoints,
          latitude: Number(lat.toFixed(8)),
          longitude: Number(lng.toFixed(8))
        }).eq('id', roomId);
        
        if (updateError) {
          console.error('[Admin] DB Fehler:', updateError);
          alert('Datenbank-Fehler beim Speichern: ' + updateError.message);
        } else {
          alert(`Punkt ${currentPoints.length} erfolgreich für "${latestRoom.name}" hinzugefügt! ✅`);
          await fetchData(); 
        }
      }, (err) => {
        if (highAccuracy) {
          console.log('[Admin] High Accuracy failed, trying normal...');
          tryScan(false);
        } else {
          alert('Standort-Fehler: ' + err.message);
        }
      }, geoOptions);
    };

    tryScan(true);
  };

  const handleDeleteGeofencePoint = async (roomId: string, index: number) => {
    if (!window.confirm('Diesen Geofence-Punkt wirklich löschen?')) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    
    const points: any[] = Array.isArray(room.geofence_points) ? [...room.geofence_points] : [];
    points.splice(index, 1);
    
    // Update lat/lng to the last remaining point or null
    const lastPoint = points.length > 0 ? points[points.length - 1] : null;

    const { error } = await supabase.from('rooms').update({
      geofence_points: points,
      latitude: lastPoint?.lat || null,
      longitude: lastPoint?.lng || null
    }).eq('id', roomId);
    
    if (error) alert(error.message);
    else fetchData();
  };

  const handleClearGeofencePoints = async (roomId: string) => {
    if (!window.confirm('Alle gespeicherten Kalibrierungs-Punkte für diesen Raum löschen?')) return;
    const { error } = await supabase.from('rooms').update({
      geofence_points: [],
      latitude: null,
      longitude: null
    }).eq('id', roomId);
    if (error) alert(error.message);
    else fetchData();
  };

  const handleAutoParseLinks = (text: string, isEditing: boolean) => {
    const lines = text.split(/[\n,;]/);
    const urls: Record<string, string> = {
      pdf_guitar_url: '',
      pdf_bass_url: '',
      pdf_drums_url: '',
      pdf_keys_url: '',
      pdf_vocals_url: ''
    };
    
    const current = isEditing ? editingSong : newSong;
    if (!current) return;
    urls.pdf_guitar_url = current.pdf_guitar_url || '';
    urls.pdf_bass_url = current.pdf_bass_url || '';
    urls.pdf_drums_url = current.pdf_drums_url || '';
    urls.pdf_keys_url = current.pdf_keys_url || '';
    urls.pdf_vocals_url = current.pdf_vocals_url || '';

    lines.forEach(line => {
      const trimmed = line.trim();
      const urlMatch = trimmed.match(/(https?:\/\/[^\s"'><]+)/);
      if (!urlMatch) return;
      const url = urlMatch[1];
      const lower = trimmed.toLowerCase();
      
      if (lower.includes('gitarre') || lower.includes('guitar') || lower.includes('git')) {
        urls.pdf_guitar_url = url;
      } else if (lower.includes('bass')) {
        urls.pdf_bass_url = url;
      } else if (lower.includes('drums') || lower.includes('drum') || lower.includes('schlagzeug') || lower.includes('schlag')) {
        urls.pdf_drums_url = url;
      } else if (lower.includes('piano') || lower.includes('keys') || lower.includes('keyboard') || lower.includes('tasten')) {
        urls.pdf_keys_url = url;
      } else if (lower.includes('vocals') || lower.includes('gesang') || lower.includes('lyrics') || lower.includes('text') || lower.includes('sing')) {
        urls.pdf_vocals_url = url;
      }
    });

    if (isEditing) {
      setEditingSong({
        ...editingSong,
        ...urls
      });
    } else {
      setNewSong({
        ...newSong,
        ...urls
      });
    }
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id) return;

    if (bulkModeSongs) {
      const lines = bulkTextSongs.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      if (admin?.schools?.limits_enabled) {
        const maxSongs = admin.schools.max_songs ?? 5;
        if (songs.length + lines.length > maxSongs) {
          alert(`Limit überschritten! Du kannst nicht ${lines.length} Songs hinzufügen, da das Maximum bei ${maxSongs} liegt (Aktuell: ${songs.length}).`);
          return;
        }
      }

      const insertPayloads = lines.map(line => {
        let artist = 'Unbekannt';
        let title = line;
        if (line.includes(' - ')) {
          const parts = line.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }
        return {
          school_id: admin.school_id, 
          artist, 
          title, 
          level: 1, 
          media_link: '',
          tomplay_url: '',
          pdf_folder_url: '',
          guitar_pro_url: '',
          pdf_drums_url: '',
          pdf_guitar_url: '',
          pdf_bass_url: '',
          pdf_vocals_url: '',
          pdf_keys_url: '',
          playalong_url: '',
          bypass_wlan_check: false,
          instrumentation: { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 },
          is_campus_active: activePlatform === 'campus',
          is_groovelab_active: activePlatform !== 'campus',
          teacher_id: userId
        };
      });

      let { data, error } = await supabase.from('songs').insert(insertPayloads).select();

      if (error && (error.message.includes('playalong_url') || error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('cache'))) {
        console.warn('[AdminDashboard] playalong_url column missing, retrying bulk insert without it');
        const strippedPayloads = insertPayloads.map(({ playalong_url, ...stripped }) => stripped);
        const retryResult = await supabase.from('songs').insert(strippedPayloads).select();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) alert('Fehler: ' + error.message);
      else if (data) {
        setSongs([...songs, ...data]);
        setShowAddSong(false);
        setBulkModeSongs(false);
        setBulkTextSongs('');
      }
      return;
    }

    if (admin?.schools?.limits_enabled) {
      const maxSongs = admin.schools.max_songs ?? 5;
      if (songs.length >= maxSongs) {
        alert(`Limit erreicht! Deine Schule darf maximal ${maxSongs} Songs in der Mediathek verwalten. Kontaktiere deinen Master-Admin.`);
        return;
      }
    }
    
    const insertPayload: any = {
      school_id: admin.school_id, 
      artist: newSong.artist, 
      title: newSong.title, 
      level: newSong.level, 
      media_link: newSong.media_link,
      tomplay_url: newSong.tomplay_url,
      pdf_folder_url: newSong.pdf_folder_url || '',
      guitar_pro_url: newSong.guitar_pro_url || '',
      pdf_drums_url: newSong.pdf_drums_url || '',
      pdf_guitar_url: newSong.pdf_guitar_url || '',
      pdf_bass_url: newSong.pdf_bass_url || '',
      pdf_vocals_url: newSong.pdf_vocals_url || '',
      pdf_keys_url: newSong.pdf_keys_url || '',
      playalong_url: newSong.playalong_url || '',
      bypass_wlan_check: !!newSong.bypass_wlan_check,
      instrumentation: newSong.instrumentation,
      is_campus_active: activePlatform === 'campus',
      is_groovelab_active: activePlatform !== 'campus',
      teacher_id: userId
    };

    let { data, error } = await supabase.from('songs').insert(insertPayload).select().single();
    
    if (error && (error.message.includes('playalong_url') || error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('cache'))) {
      console.warn('[AdminDashboard] playalong_url column missing, retrying insert without it');
      const { playalong_url, ...strippedPayload } = insertPayload;
      const retryResult = await supabase.from('songs').insert(strippedPayload).select().single();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) alert('Fehler: ' + error.message);
    else if (data) { 
      setSongs([...songs, data]); 
      setShowAddSong(false); 
      setNewSong({ artist: '', title: '', level: 1, media_link: '', tomplay_url: '', pdf_folder_url: '', guitar_pro_url: '', pdf_drums_url: '', pdf_guitar_url: '', pdf_bass_url: '', pdf_vocals_url: '', pdf_keys_url: '', playalong_url: '', bypass_wlan_check: false, instrumentation: { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 } }); 
    }
  };

  const handleUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong) return;

    const updatePayload: any = {
      artist: editingSong.artist,
      title: editingSong.title,
      level: editingSong.level,
      media_link: editingSong.media_link,
      tomplay_url: editingSong.tomplay_url,
      pdf_folder_url: editingSong.pdf_folder_url || '',
      guitar_pro_url: editingSong.guitar_pro_url || '',
      pdf_drums_url: editingSong.pdf_drums_url || '',
      pdf_guitar_url: editingSong.pdf_guitar_url || '',
      pdf_bass_url: editingSong.pdf_bass_url || '',
      pdf_vocals_url: editingSong.pdf_vocals_url || '',
      pdf_keys_url: editingSong.pdf_keys_url || '',
      playalong_url: editingSong.playalong_url || '',
      bypass_wlan_check: !!editingSong.bypass_wlan_check,
      instrumentation: editingSong.instrumentation
    };

    let { error } = await supabase.from('songs').update(updatePayload).eq('id', editingSong.id);
    
    // Fallback: If playalong_url column doesn't exist, retry without it
    if (error && (error.message.includes('playalong_url') || error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('cache'))) {
      console.warn('[AdminDashboard] playalong_url column missing, retrying update without it');
      const { playalong_url, ...strippedPayload } = updatePayload;
      const retryResult = await supabase.from('songs').update(strippedPayload).eq('id', editingSong.id);
      error = retryResult.error;
    }

    if (error) alert('Fehler: ' + error.message);
    else {
      setSongs(songs.map(s => s.id === editingSong.id ? editingSong : s));
      setEditingSong(null);
      alert('Song erfolgreich aktualisiert! ✅');
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!window.confirm('Song wirklich aus der Bibliothek löschen? Damit wird er auch aus allen Schüler-Boards, der Rejection-History und sämtlichen Bands entfernt.')) return;
    try {
      console.log('[Admin] Starting deep delete for song:', songId);
      
      // 1. Cleanup all dependencies
      // Delete rejection history for this song
      await supabase.from('rejection_history').delete().eq('song_id', songId);
      
      // Handle Bands and their dependencies
      const { data: bandsToDelete } = await supabase.from('bands').select('id').eq('song_id', songId);
      if (bandsToDelete && bandsToDelete.length > 0) {
        const bandIds = bandsToDelete.map(b => b.id);
        
        // Cleanup band members and shoutbox
        await supabase.from('band_members').delete().in('band_id', bandIds);
        await supabase.from('band_shoutbox').delete().in('band_id', bandIds);
        
        // Cleanup band song slots
        const { data: bandSongs } = await supabase.from('band_songs').select('id').in('band_id', bandIds);
        if (bandSongs && bandSongs.length > 0) {
          await supabase.from('band_song_slots').delete().in('band_song_id', bandSongs.map(bs => bs.id));
        }
        
        // Delete the bands themselves
        await supabase.from('bands').delete().in('id', bandIds);
      }

      // Cleanup ALL band_song_slots for this song (including proposals without bands)
      const { data: allBS } = await supabase.from('band_songs').select('id').eq('song_id', songId);
      if (allBS && allBS.length > 0) {
        await supabase.from('band_song_slots').delete().in('band_song_id', allBS.map(bs => bs.id));
      }

      // Cleanup remaining student skills and song mappings
      await supabase.from('user_song_skills').delete().eq('song_id', songId);
      await supabase.from('band_songs').delete().eq('song_id', songId);
      
      // 2. Finally delete the song record
      const { error } = await supabase.from('songs').delete().eq('id', songId);
      if (error) throw error;
      
      console.log('[Admin] Delete successful');
      setSongs(prev => prev.filter(s => s.id !== songId));
      alert('Song wurde inklusive aller Verknüpfungen erfolgreich gelöscht. 🗑️');
    } catch (err: any) {
      console.error('[Admin] Global Delete error:', err);
      alert('Fehler beim Löschen: ' + err.message + '\n\nDetails: Prüfe die Konsole für mehr Infos.');
    }
  };


  const [studentBands, setStudentBands] = useState<any[]>([]);
  const [studentDetailTab, setStudentDetailTab] = useState<'profile' | 'logbook' | 'contract'>('profile');
  const [showFullPhoto, setShowFullPhoto] = useState(false);

  const fetchStudentProfile = async (student: any) => {
    setSelectedStudent(student);
    setStudentDetailTab('profile'); // Reset to default tab

    // Fetch student's bands and filter out duplicates
    const { data: bandsData } = await supabase
      .from('band_members')
      .select(`
        bands (
          *,
          band_members (
            *,
            users (*)
          ),
          band_songs (
            *,
            songs (*)
          )
        )
      `)
      .eq('user_id', student.id);
    
    const uniqueBandsList: any[] = [];
    const seenBandIds = new Set();
    (bandsData || []).forEach((m: any) => {
      const b = Array.isArray(m.bands) ? m.bands[0] : m.bands;
      if (b && !seenBandIds.has(b.id)) {
        seenBandIds.add(b.id);
        uniqueBandsList.push(b);
      }
    });
    setStudentBands(uniqueBandsList);

    const { data: skills } = await supabase
      .from('user_song_skills')
      .select('*, songs(*)')
      .eq('user_id', student.id);
    
    setStudentDetails(skills || []);

    const { data: rejHistory } = await supabase
      .from('rejection_history')
      .select('*, songs(*)')
      .eq('user_id', student.id)
      .order('rejected_at', { ascending: false });
    setStudentRejections(rejHistory || []);

    const { data: allSessions } = await supabase
      .from('sessions')
      .select('check_in_time, check_out_time, station_id')
      .eq('user_id', student.id);
    
    if (allSessions) {
      const openingHours = admin?.schools?.opening_hours;
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      // Filter for "Logbuch" (must be at station AND on active day)
      const logSessions = allSessions.filter(s => {
        if (!s.station_id) return false;
        if (openingHours) {
          const d = new Date(s.check_in_time);
          const dayConfig = openingHours[dayNames[d.getDay()]];
          if (!dayConfig || !dayConfig.active) return false;
        }
        return true;
      });

      setStudentSessions([...logSessions].sort((a: any, b: any) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime()));
      let labMins = 0;
      let homeMins = 0;

      allSessions.forEach(s => {
        const start = new Date(s.check_in_time);
        const end = s.check_out_time ? new Date(s.check_out_time) : new Date();
        const duration = Math.floor((end.getTime() - start.getTime()) / 60000);
        const mins = Math.max(0, duration);
        
        // Only count as lab mins if it's a valid log session (at station and during opening hours)
        const isValidLog = logSessions.some(ls => ls.check_in_time === s.check_in_time && ls.station_id === s.station_id);
        
        if (s.station_id && isValidLog) {
          labMins += mins;
        } else if (!s.station_id) {
          homeMins += mins;
        }
      });

      setStudentLabMins(labMins);
      setStudentHomeMins(homeMins);

      // Erweiterte Statistiken
      const avgDuration = allSessions.length > 0 ? Math.round((labMins + homeMins) / allSessions.length) : 0;
      const lastSession = allSessions.length > 0 ? new Date(allSessions[0].check_in_time) : null;
      
      // Fokus Instrument
      const instXp: Record<string, number> = {};
      skills?.forEach((s: any) => {
        const xp = s.is_stage_ready || s.progress_percent === 100 ? 500 : s.progress_percent * 2;
        instXp[s.instrument] = (instXp[s.instrument] || 0) + xp;
      });
      const topInst = Object.entries(instXp).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Keines';

      // Streak berechnen (einzigartige Kalenderwochen)
      const weeks = new Set();
      allSessions.forEach(s => {
        const d = new Date(s.check_in_time);
        const year = d.getFullYear();
        const firstDayOfYear = new Date(year, 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        weeks.add(`${year}-${week}`);
      });

      (student as any).stats = {
        avgDuration,
        lastActive: lastSession ? lastSession.toLocaleDateString() : 'Nie',
        topInstrument: topInst,
        sessionCount: allSessions.length,
        streak: weeks.size
      };
    }

    const { data: planning } = await supabase
      .from('lab_planning')
      .select('*')
      .eq('user_id', student.id);
    setStudentPlanning(planning || []);
  };

  if (!admin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', color: '#64748b', fontSize: '1rem', fontWeight: 600 }}>
        Lade Dashboard...
      </div>
    );
  }

  if (!admin) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b', fontWeight: 600 }}>Lädt...</div>;


  
  const sidebarItems = [
    { id: 'live', label: 'Live Lab', icon: Monitor },
    { id: 'students', label: 'Schüler', icon: Users },
    { id: 'bands', label: 'Bands', icon: Award },
    { id: 'team', label: 'Team', icon: Shield },
    { id: 'rooms', label: 'Räume', icon: Box },
    { id: 'songs', label: 'Songs', icon: Music },
    { id: 'stats', label: 'Statistik', icon: LucideBarChart },
    { id: 'gallery', label: 'ID Galerie', icon: QrCode },
    { id: 'setup', label: 'Einstellungen', icon: Settings },
  ];

  const renderLiveTab = () => (
    <div style={{ marginTop: '0px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TeacherDashboard 
        key={`${activePlatform}-${activeTab}`}
        userId={userId} 
        hideHeader={activePlatform === 'campus' ? false : true} 
        hideSidebar={true}
        viewMode="admin" 
        initialTab={activePlatform === 'campus' ? 'briefing' : 'live'}
        onTabChange={(id) => onTabChange?.(id)}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />
    </div>
  );

  const renderBandsTab = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    const filteredBands = allBands.filter(band => {
      const matchesSearch = band.name.toLowerCase().includes(bandSearch.toLowerCase());
      const matchesLetter = !bandLetter || band.name.toUpperCase().startsWith(bandLetter);
      
      let matchesCoach = true;
      if (selectedCoachId === 'none') {
        matchesCoach = !band.coach_id;
      } else if (selectedCoachId !== 'all') {
        matchesCoach = band.coach_id === selectedCoachId;
      }
      
      return matchesSearch && matchesLetter && matchesCoach;
    });

    return (
      <div style={{ marginTop: '0px' }}>
        <div 
          className="glass-panel" 
          style={{ 
            background: 'white', 
            borderRadius: '20px', 
            border: '1px solid rgba(0, 0, 0, 0.05)', 
            padding: '24px', 
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px' 
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <div style={{ background: `${brandColor}15`, color: brandColor, padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                <Award size={16} />
              </div>
              Bands
            </h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '200px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Band suchen..." 
                  value={bandSearch}
                  onChange={(e) => setBandSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
              <button 
                onClick={() => setShowAddBand(!showAddBand)} 
                style={{ 
                  background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`, 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.8rem', 
                  fontWeight: 900,
                  boxShadow: `0 4px 12px -3px ${brandColor}50`,
                  transition: 'all 0.2s ease'
                }}
              >
                <Plus size={16} strokeWidth={3} /> Band erstellen
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            {/* Main Column: Band Management */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {showAddBand && (
            <form onSubmit={handleCreateBandManually} className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: 'white', borderRadius: '24px', border: `1px solid ${brandColor}20`, boxShadow: '0 20px 50px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Neue Band manuell zusammenstellen</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Band Name</label>
                  <input required placeholder="z.B. The Rockstars" value={newBand.name} onChange={e => setNewBand({...newBand, name: e.target.value})} style={{ padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Song (Optional)</label>
                  <select value={newBand.song_id} onChange={e => setNewBand({...newBand, song_id: e.target.value})} style={{ padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700 }}>
                    <option value="">-- Kein Song --</option>
                    {songs.map(s => <option key={s.id} value={s.id}>{s.artist} - {s.title}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Coach / Leitung</label>
                  <select value={newBand.coach_id} onChange={e => setNewBand({...newBand, coach_id: e.target.value})} style={{ padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700 }}>
                    {teachers.filter(t => !t.is_observer).map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Avatar URL (Optional)</label>
                  <input placeholder="https://..." value={newBand.photo_url} onChange={e => setNewBand({...newBand, photo_url: e.target.value})} style={{ padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                </div>
              </div>

              <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>Mitglieder hinzufügen</label>
                
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      placeholder="Schüler suchen..." 
                      value={memberToSearch} 
                      onChange={e => setMemberToSearch(e.target.value)} 
                      style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem' }} 
                    />
                    {memberToSearch && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                        {students.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(memberToSearch.toLowerCase())).map(s => (
                          <div 
                            key={s.id} 
                            onClick={() => {
                              if (!selectedMembers.find(m => m.user_id === s.id)) {
                                setSelectedMembers([...selectedMembers, { user_id: s.id, instrument: 'E-Gitarre' }]);
                              }
                              setMemberToSearch('');
                            }}
                            style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}
                            
                            
                          >
                            <img src={s.photo_url || '/avatar_ghost.jpg'} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                            {s.first_name} {s.last_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedMembers.map((m, idx) => {
                    const student = students.find(s => s.id === m.user_id);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={student?.photo_url || '/avatar_ghost.jpg'} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{student?.first_name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <select 
                            value={m.instrument} 
                            onChange={e => {
                              const next = [...selectedMembers];
                              next[idx].instrument = e.target.value;
                              setSelectedMembers(next);
                            }}
                            style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            {Object.keys(ADMIN_INSTRUMENT_ICONS).map(inst => <option key={inst} value={inst}>{inst}</option>)}
                          </select>
                          <button 
                            type="button" 
                            onClick={() => setSelectedMembers(selectedMembers.filter((_, i) => i !== idx))} 
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {selectedMembers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '12px', color: '#94a3b8', fontSize: '0.8rem', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>Noch keine Mitglieder hinzugefügt.</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', boxShadow: `0 8px 20px -6px ${brandColor}40` }}>Band erstellen & Aktivieren</button>
                <button type="button" onClick={() => setShowAddBand(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}>Abbrechen</button>
              </div>
            </form>
          )}

          {/* Coach Filter Bar */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', padding: '8px 12px', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>Coaches:</span>
            <button 
              onClick={() => setSelectedCoachId('all')}
              style={{ 
                padding: '6px 14px', 
                borderRadius: '10px', 
                background: selectedCoachId === 'all' ? brandColor : '#f8fafc', 
                color: selectedCoachId === 'all' ? 'white' : '#64748b', 
                fontWeight: 800, 
                cursor: 'pointer', 
                fontSize: '0.75rem',
                boxShadow: selectedCoachId === 'all' ? `0 4px 12px ${brandColor}30` : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid ' + (selectedCoachId === 'all' ? brandColor : '#e2e8f0')
              }}
              
              
            >
              Alle Coaches
            </button>
            <button 
              onClick={() => setSelectedCoachId('none')}
              style={{ 
                padding: '6px 14px', 
                borderRadius: '10px', 
                background: selectedCoachId === 'none' ? brandColor : '#f8fafc', 
                color: selectedCoachId === 'none' ? 'white' : '#64748b', 
                fontWeight: 800, 
                cursor: 'pointer', 
                fontSize: '0.75rem',
                boxShadow: selectedCoachId === 'none' ? `0 4px 12px ${brandColor}30` : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid ' + (selectedCoachId === 'none' ? brandColor : '#e2e8f0')
              }}
              
              
            >
              Ohne Coach
            </button>
            {teachers.filter(t => !t.is_observer).map(t => {
              const isSelected = selectedCoachId === t.id;
              return (
                <button 
                  key={t.id}
                  onClick={() => setSelectedCoachId(isSelected ? 'all' : t.id)}
                  style={{ 
                    padding: '4px 14px 4px 6px', 
                    borderRadius: '10px', 
                    background: isSelected ? brandColor : '#f8fafc', 
                    color: isSelected ? 'white' : '#475569', 
                    fontWeight: 800, 
                    cursor: 'pointer', 
                    fontSize: '0.75rem',
                    boxShadow: isSelected ? `0 4px 12px ${brandColor}30` : 'none',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid ' + (isSelected ? brandColor : '#e2e8f0')
                  }}
                  
                  
                >
                  <img 
                    src={t.photo_url || '/avatar_ghost.jpg'} 
                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: isSelected ? '1px solid white' : '1px solid rgba(0,0,0,0.1)' }} 
                    alt="" 
                  />
                  {t.first_name} {t.last_name || ''}
                </button>
              );
            })}
          </div>

          {/* Alphabet Bar */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '8px', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
            <button 
              onClick={() => setBandLetter(null)}
              style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', background: !bandLetter ? brandColor : 'transparent', color: !bandLetter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }}
            >
              ALL
            </button>
            {alphabet.map(l => (
              <button 
                key={l}
                onClick={() => setBandLetter(bandLetter === l ? null : l)}
                style={{ 
                  width: '32px', height: '32px', borderRadius: '10px', border: 'none', 
                  background: bandLetter === l ? brandColor : 'transparent', 
                  color: bandLetter === l ? 'white' : '#64748b', 
                  fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' 
                }}
              >
                {l}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredBands.map((band: any) => {
              const uniqueMembersList = (() => {
                const grouped: Record<string, any> = {};
                (band.band_members || []).forEach((m: any) => {
                  const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
                  const uid = u?.id || m.external_name || m.user_id || m.student_id;
                  if (uid) {
                    grouped[uid] = { ...m, user: u };
                  }
                });
                return Object.values(grouped);
              })();

              return (
                <div key={band.id} className="glass-panel" 
                  onClick={() => onOpenBandProfile?.(band)}
                  style={{ 
                    background: 'white', borderRadius: '24px', padding: '20px 24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', alignItems: 'center', gap: '24px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  
                  
                >
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {band.photo_url ? (
                      <img src={band.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    ) : (
                      <Music size={24} color="white" />
                    )}
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', margin: '0 0 4px 0' }}>{band.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: brandColor, textTransform: 'uppercase' }}>{band.genre || 'Bandprojekt'}</span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{uniqueMembersList.length} Mitglieder</span>
                    </div>
                  </div>

                  {/* Dedicated Coach Column */}
                  <div>
                    {band.coach ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '6px 14px', borderRadius: '14px', border: '1px solid #e2e8f0' }} title={`Coach: ${band.coach.first_name} ${band.coach.last_name || ''}`}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', background: 'white' }}>
                          <img src={band.coach.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coach</span>
                          <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 850 }}>{band.coach.first_name} {band.coach.last_name ? band.coach.last_name[0] + '.' : ''}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '6px 14px', borderRadius: '14px', border: '1px dashed #cbd5e1', opacity: 0.7 }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', color: '#64748b' }}>
                          👤
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coach</span>
                          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 800 }}>Kein Coach</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {uniqueMembersList.slice(0, 5).map((m: any, i: number) => {
                      const u = m.user;
                      return (
                        <div key={i} style={{ width: '32px', height: '32px', borderRadius: '10px', overflow: 'hidden', border: '2px solid white', marginLeft: i === 0 ? 0 : '-12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', background: 'white' }} title={`${u?.first_name || m.external_name || 'Mitglied'} (${m.instrument})`}>
                          <img src={u?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        </div>
                      );
                    })}
                    {uniqueMembersList.length > 5 && (
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f1f5f9', border: '2px solid white', marginLeft: '-12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>
                        +{uniqueMembersList.length - 5}
                      </div>
                    )}
                  </div>

                <div style={{ display: 'flex', gap: '12px' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditingBand(band)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: '#64748b' }}><Monitor size={18} /></button>
                  <button 
                    onClick={async () => {
                      if(window.confirm(`Band "${band.name}" wirklich komplett auflösen?`)) {
                        await supabase.from('bands').delete().eq('id', band.id);
                        fetchData();
                      }
                    }}
                    style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '10px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                    
                    
                    title="Band auflösen"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
            {filteredBands.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '32px', border: '2px dashed #e2e8f0' }}>
                  <div style={{ fontSize: '3rem', margin: '0 auto 20px auto', width: '80px', height: '80px', background: '#f8fafc', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔍</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>Keine Bands gefunden</h3>
                  <p style={{ color: '#64748b' }}>Probiere einen anderen Suchbegriff oder Buchstaben.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Teacher Vocal Finder Widget */}
        <div style={{ width: '350px', background: '#f8fafc', borderRadius: '32px', padding: '24px', alignSelf: 'start', position: 'sticky', top: '24px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Mic size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Vocal Finder</h3>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>Manuelle Sänger-Zuweisung</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {allBands.filter(band => {
              const members = band.band_members || [];
              const vocalists = members.filter((m: any) => (m.instrument || '').toLowerCase().includes('vocal') || (m.instrument || '').toLowerCase().includes('gesang'));
              return vocalists.length < 2;
            }).slice(0, 5).map(band => (
              <div key={band.id} style={{ background: 'white', padding: '20px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>{band.name}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{band.songs?.title || 'No Song'}</div>
                </div>

                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setShowAddMember(showAddMember === band.id ? null : band.id)}
                    style={{ width: '100%', padding: '10px', borderRadius: '12px', border: `1px solid ${brandColor}30`, background: `${brandColor}05`, color: brandColor, fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Plus size={14} /> Sänger hinzufügen
                  </button>

                  {showAddMember === band.id && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9', padding: '12px', zIndex: 100, marginTop: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                      <input 
                        autoFocus
                        placeholder="Musiker oder Externe suchen..." 
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', marginBottom: '8px' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {students.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(memberSearch.toLowerCase())).map(s => (
                          <button 
                            key={s.id}
                            onClick={async () => {
                              await supabase.from('band_members').insert({ band_id: band.id, user_id: s.id, instrument: 'Vocals', role: 'member' });
                              const activeProject = (band.band_songs || []).find((bs: any) => bs.status === 'ready' || bs.status === 'proposal');
                              if (activeProject) {
                                await supabase.from('band_song_slots').insert({ band_song_id: activeProject.id, user_id: s.id, instrument: 'Vocals', status: 'joined' });
                              }
                              setShowAddMember(null);
                              setMemberSearch('');
                              fetchData();
                            }}
                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', textAlign: 'left' }}
                            
                            
                          >
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden' }}>
                              <img src={s.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{s.first_name} {s.last_name}</div>
                              {s.is_external_vocalist && <div style={{ fontSize: '0.6rem', color: brandColor, fontWeight: 700 }}>Externer Gesang</div>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {allBands.filter(band => {
              const vocalists = (band.band_members || []).filter((m: any) => (m.instrument || '').toLowerCase().includes('vocal'));
              return vocalists.length < 2;
            }).length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8rem' }}>Alle Bands sind stimmlich besetzt! 🎉</div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
    );
  };


  const handleDeleteAllStudents = async () => {
    const confirmDelete = window.confirm("Möchtest du WIRKLICH ALLE Schüler löschen? Dies kann nicht rückgängig gemacht werden!");
    if (!confirmDelete) return;

    try {
      const studentIds = students.map(s => s.id);
      if (studentIds.length === 0) return;

      await supabase.from('band_members').delete().in('user_id', studentIds);
      await supabase.from('user_song_skills').delete().in('user_id', studentIds);
      await supabase.from('sessions').delete().in('user_id', studentIds);
      await supabase.from('band_songs').update({ suggested_by: null }).in('suggested_by', studentIds);
      await supabase.from('lab_planning').delete().in('user_id', studentIds);
      await supabase.from('band_shoutbox').delete().in('user_id', studentIds);
      await supabase.from('band_song_slots').delete().in('user_id', studentIds);
      await supabase.from('help_requests').delete().in('user_id', studentIds);
      await supabase.from('avatars').delete().in('user_id', studentIds);
      await supabase.from('users').delete().in('id', studentIds);

      setStudents([]);
      alert("Alle Schüler wurden erfolgreich gelöscht.");
    } catch (err: any) {
      console.error("Fehler beim Löschen aller Schüler:", err);
      alert("Ein Fehler ist aufgetreten.");
    }
  };

  const renderStudentsTab = () => {
    const brandColor = '#16a34a';
    return (
      <div style={{ marginTop: '0px' }}>
        <div 
          className="glass-panel" 
          style={{ 
            background: 'white', 
            borderRadius: '20px', 
            border: '1px solid rgba(0, 0, 0, 0.05)', 
            padding: '16px 20px', 
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <div style={{ background: `${brandColor}15`, color: brandColor, padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                <Users size={16} />
              </div>
              Schülerverwaltung ({students.length})
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              {/* Apple-like Segmented Switch for Active / Archive */}
              <div style={{
                display: 'flex',
                background: 'rgba(241, 245, 249, 0.8)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '4px',
                borderRadius: '16px',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                position: 'relative'
              }}>
                <button
                  onClick={() => setListType('active')}
                  style={{
                    flex: 1, padding: '8px 16px', borderRadius: '12px', border: 'none',
                    background: listType === 'active' ? 'white' : 'transparent',
                    color: listType === 'active' ? brandColor : '#64748b',
                    fontWeight: listType === 'active' ? 800 : 600, fontSize: '0.85rem',
                    boxShadow: listType === 'active' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: listType === 'active' ? '#22c55e' : 'transparent' }} />
                  Aktive Schüler
                </button>
                <button
                  onClick={() => setListType('archive')}
                  style={{
                    flex: 1, padding: '8px 16px', borderRadius: '12px', border: 'none',
                    background: listType === 'archive' ? 'white' : 'transparent',
                    color: listType === 'archive' ? '#16a34a' : '#64748b',
                    fontWeight: listType === 'archive' ? 800 : 600, fontSize: '0.85rem',
                    boxShadow: listType === 'archive' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: listType === 'archive' ? '#16a34a' : 'transparent' }} />
                  Archiv
                </button>
              </div>
            </div>
          </div>

          {showAddStudent && (
            <form onSubmit={handleAddStudent} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'white', borderRadius: '20px', border: `1px solid ${brandColor}20` }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Neuen Schüler anlegen</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                  <input required placeholder="Vorname" value={newStudent.firstName} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname (Initial)</label>
                  <input required placeholder="Nachname" value={newStudent.lastName} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Instrument</label>
                <select 
                  value={newStudent.instrument || 'Gitarre'} 
                  onChange={e => setNewStudent({...newStudent, instrument: e.target.value})} 
                  style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }}
                >
                  <option value="Gitarre">Gitarre</option>
                  <option value="Bass">Bass</option>
                  <option value="Drums">Drums</option>
                  <option value="Piano / Keys">Piano / Keys</option>
                  <option value="Vocals">Vocals</option>
                  <option value="Trompete">Trompete</option>
                  <option value="Posaune">Posaune</option>
                  <option value="Horn">Horn</option>
                  <option value="Cello">Cello</option>
                  <option value="Geige">Geige</option>
                  <option value="Klarinette">Klarinette</option>
                  <option value="Querflöte">Querflöte</option>
                  <option value="Saxofon">Saxofon</option>
                </select>
              </div>

              {/* External Vocalist Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                 <div 
                   onClick={() => setNewStudent({...newStudent, isExternalVocalist: !newStudent.isExternalVocalist, photoUrl: '/avatar_ghost.jpg'})}
                   style={{ 
                     width: '44px', height: '24px', borderRadius: '20px', 
                     background: newStudent.isExternalVocalist ? brandColor : '#cbd5e1', 
                     position: 'relative', cursor: 'pointer', transition: 'all 0.2s' 
                   }}
                 >
                   <div style={{ 
                     position: 'absolute', top: '2px', left: newStudent.isExternalVocalist ? '22px' : '2px', 
                     width: '20px', height: '20px', background: 'white', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', transition: 'all 0.2s' 
                   }}></div>
                 </div>
                 <div>
                   <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>Gesangsschüler (Extern)</div>
                   <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Kein Profilzugriff, Platzhalter für Band-Gesang</div>
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>Speichern</button>
                <button type="button" onClick={() => setShowAddStudent(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
              </div>
            </form>
          )}

          {showBulkAddStudents && (
            <form onSubmit={handleBulkAddSubmit} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', background: 'white', borderRadius: '20px', border: `1px solid ${brandColor}20` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} color={brandColor} /> Mehrere Schüler schnell anlegen
                </h3>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowBulkAddStudents(false);
                    setBulkInput('');
                    setParsedStudents([]);
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Clickable Instrument Avatars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Klasse wählen (Instrument)</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '4px 0' }}>
                  {[
                    { name: 'Gitarre', label: 'Gitarre' },
                    { name: 'Bass', label: 'Bass' },
                    { name: 'Drums', label: 'Drums' },
                    { name: 'Piano / Keys', label: 'Piano' },
                    { name: 'Gesang', label: 'Gesang' },
                    { name: 'Trompete', label: 'Trompete' },
                    { name: 'Posaune', label: 'Posaune' },
                    { name: 'Horn', label: 'Horn' },
                    { name: 'Cello', label: 'Cello' },
                    { name: 'Geige', label: 'Geige' },
                    { name: 'Klarinette', label: 'Klarinette' },
                    { name: 'Querflöte', label: 'Querflöte' },
                    { name: 'Saxofon', label: 'Saxofon' }
                  ].map(inst => {
                    const isActive = defaultInstrumentForBulk === inst.name;
                    return (
                      <button
                        key={inst.name}
                        type="button"
                        onClick={() => {
                          setDefaultInstrumentForBulk(inst.name);
                          parseBulkInput(bulkInput, inst.name);
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '14px',
                          border: isActive ? `2px solid ${brandColor}` : '2px solid #e2e8f0',
                          background: isActive ? `${brandColor}0d` : 'white',
                          color: isActive ? brandColor : '#475569',
                          fontWeight: 800,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                        }}
                      >
                        <img 
                          src={getInstrumentAvatarUrl(inst.name)} 
                          style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'cover' }} 
                        />
                        {inst.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Schülerliste (Namen)</label>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Füge einen Schülernamen pro Zeile ein. Alle Schüler werden der oben ausgewählten Klasse zugewiesen.
                </div>
                <textarea 
                  placeholder="Beispiel:&#10;Lukas Müller&#10;Marie Schmidt&#10;Felix Becker"
                  value={bulkInput}
                  onChange={e => {
                    setBulkInput(e.target.value);
                    parseBulkInput(e.target.value, defaultInstrumentForBulk);
                  }}
                  style={{ 
                    padding: '14px', 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0', 
                    background: '#f8fafc', 
                    fontWeight: 600,
                    minHeight: '140px',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    lineHeight: '1.4',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="submit" 
                  disabled={isBulkSaving || parsedStudents.length === 0}
                  style={{ 
                    flex: 1, 
                    background: parsedStudents.length === 0 ? '#cbd5e1' : brandColor, 
                    color: 'white', 
                    border: 'none', 
                    padding: '14px', 
                    borderRadius: '12px', 
                    fontWeight: 800, 
                    cursor: parsedStudents.length === 0 || isBulkSaving ? 'not-allowed' : 'pointer',
                    opacity: isBulkSaving ? 0.7 : 1
                  }}
                >
                  {isBulkSaving ? 'Speichern...' : `Alle ${parsedStudents.length} Schüler anlegen`}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowBulkAddStudents(false);
                    setBulkInput('');
                    setParsedStudents([]);
                  }} 
                  style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
              </div>
            </form>
          )}

          {editingStudent && (
            <form onSubmit={handleUpdateStudent} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#f0fdf4', border: `1px solid #bbf7d0`, borderRadius: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>Schüler bearbeiten</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <input required placeholder="Vorname" value={editingStudent.first_name || ''} onChange={e => setEditingStudent({...editingStudent, first_name: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />
                <input required placeholder="Nachname" value={editingStudent.last_name || ''} onChange={e => setEditingStudent({...editingStudent, last_name: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Instrument</label>
                  <select 
                    value={editingStudent.instrument || 'Gitarre'} 
                    onChange={e => setEditingStudent({...editingStudent, instrument: e.target.value})} 
                    style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }}
                  >
                    <option value="Gitarre">Gitarre</option>
                    <option value="Bass">Bass</option>
                    <option value="Drums">Drums</option>
                    <option value="Piano / Keys">Piano / Keys</option>
                    <option value="Vocals">Vocals</option>
                    <option value="Trompete">Trompete</option>
                    <option value="Posaune">Posaune</option>
                    <option value="Horn">Horn</option>
                    <option value="Cello">Cello</option>
                    <option value="Geige">Geige</option>
                    <option value="Klarinette">Klarinette</option>
                    <option value="Querflöte">Querflöte</option>
                    <option value="Saxofon">Saxofon</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Genereller Login-Status</label>
                  <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '12px', padding: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setEditingStudent({...editingStudent, status: 'active'})}
                      style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                        background: (editingStudent.status || 'active') === 'active' ? '#ffffff' : 'transparent',
                        color: (editingStudent.status || 'active') === 'active' ? '#16a34a' : '#64748b',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: (editingStudent.status || 'active') === 'active' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      ✅ Aktiv
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStudent({...editingStudent, status: 'bypass'})}
                      style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                        background: editingStudent.status === 'bypass' ? '#ffffff' : 'transparent',
                        color: editingStudent.status === 'bypass' ? '#ef4444' : '#64748b',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: editingStudent.status === 'bypass' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      🚫 Gesperrt (Bypass)
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    <input type="checkbox" checked={editingStudent.is_trial || false} onChange={e => setEditingStudent({...editingStudent, is_trial: e.target.checked})} />
                    In Probezeit
                  </label>
                </div>

                {editingStudent.is_trial && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Probezeit Ende</label>
                    <input type="date" value={editingStudent.trial_ends_at ? new Date(editingStudent.trial_ends_at).toISOString().split('T')[0] : ''} onChange={e => setEditingStudent({...editingStudent, trial_ends_at: e.target.value || null})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Vertragsende</label>
                  <input type="date" value={editingStudent.contract_ends_at ? new Date(editingStudent.contract_ends_at).toISOString().split('T')[0] : ''} onChange={e => setEditingStudent({...editingStudent, contract_ends_at: e.target.value || null})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>Aktualisieren</button>
                <button type="button" onClick={() => setEditingStudent(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
              </div>
            </form>
          )}

          <div style={{ position: 'relative', marginBottom: '4px', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Schüler suchen..." 
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              style={{ width: '100%', padding: '12px 14px 12px 48px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '14px', width: '100%' }}>
            {students.filter(s => {
              const isArchived = s.contract_ends_at && new Date(s.contract_ends_at).getTime() < Date.now();
              if (listType === 'active' && isArchived) return false;
              if (listType === 'archive' && !isArchived) return false;

              const inst = s.instrument?.toLowerCase() || 'gitarre';
              let normInst = s.instrument || 'Gitarre';
              if (inst.includes('guitar') || inst.includes('gitarre')) normInst = 'Gitarre';
              else if (inst.includes('bass')) normInst = 'Bass';
              else if (inst.includes('drum') || inst.includes('schlagzeug')) normInst = 'Drums';
              else if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier')) normInst = 'Piano';
              else if (inst.includes('vocal') || inst.includes('gesang')) normInst = 'Vocals';

              if (instrumentFilter !== 'all' && normInst !== instrumentFilter) return false;

              const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
              return fullName.includes(studentSearch.toLowerCase());
            }).map(s => {
              const avatarSrc = getInstrumentAvatarUrl(s.instrument);

              return (
                <div 
                  key={s.id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '14px 18px', 
                    background: 'white', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    borderRadius: '24px', 
                    border: '1px solid #e2e8f0', 
                    borderLeft: `5px solid ${brandColor}`, 
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
                    transition: 'transform 0.2s, box-shadow 0.2s', 
                    cursor: 'default' 
                  }} 
                >
                  <div 
                    onClick={() => fetchStudentProfile(s)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
                  >
                    <div style={{ position: 'relative' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px', 
                        background: `${brandColor}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        border: '2px solid white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        position: 'relative'
                      }}>
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: brandColor, position: 'absolute', zIndex: 0 }}>{s.first_name?.[0]}</span>
                        <img 
                          src={activePlatform === 'campus' ? resolveCampusAvatar(s) : (s.photo_url || '/avatar_ghost.jpg')} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ fontWeight: 900, color: '#000000', fontSize: '1rem', letterSpacing: '-0.01em', lineHeight: '1.2' }}>{s.first_name} {s.last_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#7d7d82', fontFamily: 'monospace', fontWeight: 600 }}>ID: {s.id.split('-')[0].toUpperCase()}</div>
                        {s.is_trial && (
                          <div style={{ padding: '1px 5px', background: '#fef2f2', color: '#ef4444', borderRadius: '5px', fontSize: '0.6rem', fontWeight: 900 }}>
                            ⏳ PROBE
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingStudent(s); }} 
                      style={{ 
                        background: "#ffffff", 
                        border: "1px solid #cbd5e1", 
                        padding: "8px", 
                        borderRadius: "10px", 
                        cursor: "pointer", 
                        color: "#475569", 
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }} 
                      className="hover-scale-mini"
                      title="Bearbeiten"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedQRUser(s); }} 
                      style={{ 
                        background: "#ffffff", 
                        border: "1px solid #cbd5e1", 
                        padding: "8px", 
                        borderRadius: "10px", 
                        cursor: "pointer", 
                        color: "#475569", 
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }} 
                      className="hover-scale-mini"
                      title="QR Code"
                    >
                      <QrCode size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderTeachersTab = () => (
    <div style={{ marginTop: '0px' }}>
      <div 
        className="glass-panel" 
        style={{ 
          background: 'white', 
          borderRadius: '20px', 
          border: '1px solid rgba(0, 0, 0, 0.05)', 
          padding: '16px 20px', 
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px' 
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <div style={{ background: `${brandColor}15`, color: brandColor, padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              <Shield size={16} />
            </div>
            Team
          </h2>
        </div>

        {editingTeacher && (
          <form onSubmit={handleUpdateTeacher} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#f8fafc', border: `1.5px solid ${brandColor}20`, borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Profil bearbeiten</h3>
              <div style={{ padding: '6px 12px', background: 'white', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, color: brandColor, border: '1px solid #e2e8f0' }}>
                ID: {editingTeacher.id.slice(0,8)}...
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                <input required placeholder="Vorname" value={editingTeacher.first_name} onChange={e => setEditingTeacher({...editingTeacher, first_name: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                <input required placeholder="Nachname" value={editingTeacher.last_name} onChange={e => setEditingTeacher({...editingTeacher, last_name: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status & Rolle</label>
              <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '12px', padding: '3px' }}>
                <button
                  type="button"
                  onClick={() => setEditingTeacher({...editingTeacher, role: 'teacher'})}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: '10px',
                    background: editingTeacher.role === 'teacher' ? '#ffffff' : 'transparent',
                    color: editingTeacher.role === 'teacher' ? brandColor : '#64748b',
                    fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: editingTeacher.role === 'teacher' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Lehrkraft / Coach
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTeacher({...editingTeacher, role: 'admin'})}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: '10px',
                    background: editingTeacher.role === 'admin' ? '#ffffff' : 'transparent',
                    color: editingTeacher.role === 'admin' ? '#ef4444' : '#64748b',
                    fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: editingTeacher.role === 'admin' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Lehrer (Admin)
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Instrumente (Icons anklicken):</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {["Gitarre", "Bass", "Drums", "Vocals", "Piano / Keys"].map(inst => {
                  const currentInstruments = (editingTeacher.instrument || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                  const isSelected = currentInstruments.includes(inst);
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => {
                        const next = isSelected ? currentInstruments.filter((s: string) => s !== inst) : [...currentInstruments, inst];
                        setEditingTeacher({...editingTeacher, instrument: next.join(', ')});
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', 
                        border: `1.5px solid ${isSelected ? brandColor : '#e2e8f0'}`,
                        background: isSelected ? `${brandColor}10` : 'white',
                        color: isSelected ? '#1e293b' : '#64748b',
                        fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: isSelected ? `0 2px 8px ${brandColor}15` : 'none'
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>{ADMIN_INSTRUMENT_ICONS[inst]}</span> {inst}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Musikalischer Werdegang (Bio)</label>
              <textarea placeholder="Erzähle etwas über deinen Werdegang..." value={editingTeacher.bio || ''} onChange={e => setEditingTeacher({...editingTeacher, bio: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '80px', fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.4 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Expertise & Stile</label>
                <input placeholder="z.B. Jazz, Rock, Metal..." value={editingTeacher.expertise || ''} onChange={e => setEditingTeacher({...editingTeacher, expertise: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Bands & Projekte</label>
                <input placeholder="z.B. Bands..." value={editingTeacher.bands || ''} onChange={e => setEditingTeacher({...editingTeacher, bands: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Lieblingsbands</label>
              <input placeholder="z.B. Metallica..." value={editingTeacher.listening || ''} onChange={e => setEditingTeacher({...editingTeacher, listening: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: `0 4px 15px ${brandColor}20`, transition: 'all 0.2s' }}>Änderungen speichern</button>
              <button type="button" onClick={() => setEditingTeacher(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer' }}>Abbrechen</button>
            </div>
          </form>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {teachers.map(t => {
            const isObserver = !!t.is_observer;
            const accentColor = isObserver ? '#94a3b8' : (t.role === 'admin' ? '#f59e0b' : brandColor);
            return (
              <div 
                key={t.id} 
                className="glass-panel" 
                style={{ 
                  padding: '16px 20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  background: isObserver ? '#f8fafc' : 'white', 
                  borderRadius: '20px', 
                  border: `1px solid ${isObserver ? '#e2e8f0' : '#f1f5f9'}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setEditingTeacher(t)}
              >
                {/* Left accent bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '6px', background: accentColor, transition: 'background 0.3s' }}></div>
                
                {/* Avatar */}
                <div style={{ width: '80px', height: '80px', borderRadius: '20px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', opacity: isObserver ? 0.65 : 1, transition: 'opacity 0.3s' }}>
                  <img src={t.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                </div>
                
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: isObserver ? '#94a3b8' : '#1e293b', margin: 0, transition: 'color 0.3s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.first_name} {t.last_name}</h3>
                    {t.role === 'admin' && !isObserver && <Shield size={14} color="#f59e0b" />}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', transition: 'color 0.3s' }}>
                    {isObserver ? '👁 Hospitant' : 'Lehrer'}
                  </div>

                  {/* Lehrer / Hospitant Toggle */}
                  <div
                    onClick={(e) => handleToggleObserver(t, e)}
                    title={isObserver ? 'Auf Lehrer-Modus umschalten' : 'Auf Hospitant-Modus umschalten'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      padding: '4px 8px 4px 4px',
                      borderRadius: '16px',
                      background: isObserver ? '#f1f5f9' : `${brandColor}10`,
                      border: `1.5px solid ${isObserver ? '#e2e8f0' : `${brandColor}20`}`,
                      transition: 'all 0.25s'
                    }}
                  >
                    {/* Toggle pill */}
                    <div style={{
                      width: '36px', height: '20px',
                      borderRadius: '10px',
                      background: isObserver ? '#cbd5e1' : brandColor,
                      position: 'relative',
                      transition: 'background 0.25s',
                      flexShrink: 0,
                      boxShadow: isObserver ? 'none' : `0 2px 6px ${brandColor}30`
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: isObserver ? '2px' : '18px',
                        width: '16px', height: '16px',
                        background: 'white',
                        borderRadius: '50%',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                        transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)'
                      }}></div>
                    </div>
                    {/* Label */}
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isObserver ? '#94a3b8' : brandColor, letterSpacing: '0.02em', transition: 'color 0.25s' }}>
                      {isObserver ? 'Hospitant' : 'Lehrer aktiv'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {t.instrument?.split(',')
                      .map((inst: string) => inst.trim())
                      .filter(Boolean)
                      .map((inst: string) => (
                        <span key={inst} style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>{ADMIN_INSTRUMENT_ICONS[inst] || '🎸'}</span> {inst}
                        </span>
                      ))
                    }
                  </div>
                </div>
                
                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedQRUser(t)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><QrCode size={18} /></button>
                  <button onClick={() => handleDeleteTeacher(t.id)} style={{ background: '#fff1f2', border: '1px solid #fecaca', padding: '10px', borderRadius: '10px', cursor: 'pointer', color: '#ef4444', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={18} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderCampusRoomsTab = () => {
    const isEditing = !!(selectedBooking && (!selectedBooking.isSchedule || selectedBooking.teacherId === userId));
    
    const handleQuickDuration = (mins: number) => {
      const [sh, sm] = bookingStartTime.split(':').map(Number);
      const total = sh * 60 + sm + mins;
      const eh = Math.floor(total / 60) % 24;
      const em = total % 60;
      setBookingEndTime(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
      setIsDateFilterActive(true);
    };

    // Helper to extract unique floors for this school's rooms
    const uniqueFloors = Array.from(new Set(rooms.map(r => r.floor || 'Allgemein'))).sort((a, b) => {
      const order = ['ug', 'eg', 'og', 'allgemein'];
      const getIndex = (f: string) => {
        const lf = f.toLowerCase();
        if (lf.includes('ug')) return 0;
        if (lf.includes('eg')) return 1;
        if (lf.includes('og')) {
          const num = parseInt(lf.replace(/[^0-9]/g, '')) || 1;
          return 2 + num / 10;
        }
        return 10;
      };
      return getIndex(a) - getIndex(b);
    });

    const changeWeek = (weeks: number) => {
      const d = new Date(bookingDate);
      d.setDate(d.getDate() + weeks * 7);
      setBookingDate(d.toISOString().split('T')[0]);
    };

    const getCalendarWeek = (dateStr: string) => {
      const date = new Date(dateStr);
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const getWeekRange = (dateStr: string) => {
      const d = new Date(dateStr);
      const day = d.getDay();
      const diff = d.getDate() - (day === 0 ? 6 : day - 1);
      const mon = new Date(d.setDate(diff));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const format = (dt: Date) => dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      return `${format(mon)} - ${format(sun)}.${d.getFullYear() !== mon.getFullYear() ? ' ' + sun.getFullYear() : ''}`;
    };

    const getWeekdayDate = (dayIdx: number, baseDateStr: string) => {
      const d = new Date(baseDateStr);
      const day = d.getDay();
      const diff = d.getDate() - (day === 0 ? 6 : day - 1) + dayIdx;
      const targetDate = new Date(d.setDate(diff));
      return targetDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    };

    const isTodayInWeek = (baseDateStr: string) => {
      const today = new Date();
      const d = new Date(baseDateStr);
      const day = d.getDay();
      const diff = d.getDate() - (day === 0 ? 6 : day - 1);
      const mon = new Date(d.setDate(diff));
      mon.setHours(0,0,0,0);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23,59,59,999);
      return today >= mon && today <= sun;
    };

    const isDayToday = (dayIdx: number, baseDateStr: string) => {
      const today = new Date();
      const d = new Date(baseDateStr);
      const day = d.getDay();
      const diff = d.getDate() - (day === 0 ? 6 : day - 1) + dayIdx;
      const targetDate = new Date(d.setDate(diff));
      return today.toDateString() === targetDate.toDateString();
    };

    const handleCancelBooking = async (bookingId: string | string[]) => {
      const ids = Array.isArray(bookingId) ? bookingId : [bookingId];
      
      const manualIds = ids.filter(id => !id.includes('-') && !scheduleOccurrences.some(o => o.id === id));
      const occurIds = ids.filter(id => id.includes('-') || scheduleOccurrences.some(o => o.id === id));
      
      if (manualIds.length > 0) {
        setCampusBookings(prev => prev.filter(b => !manualIds.includes(b.id)));
      }
      
      if (occurIds.length > 0) {
        if (!window.confirm('Möchtest du diese Terminverschiebung wirklich stornieren? Der Termin wird auf die ursprüngliche Zeit zurückgesetzt.')) return;
        try {
          for (const occId of occurIds) {
            const occ = scheduleOccurrences.find(o => o.id === occId);
            if (occ) {
              if (occ.original_date && occ.original_start_time) {
                const { error } = await supabase
                  .from('schedule_occurrences')
                  .update({
                    date: occ.original_date,
                    start_time: occ.original_start_time,
                    status: 'scheduled'
                  })
                  .eq('id', occId);
                if (error) throw error;
              } else {
                const { error } = await supabase
                  .from('schedule_occurrences')
                  .delete()
                  .eq('id', occId);
                if (error) throw error;
              }
            }
          }
          await fetchData();
        } catch (err) {
          console.error('Error canceling occurrence reschedule:', err);
          alert('Fehler beim Stornieren der Verschiebung.');
        }
      }
    };

    // Map bookings and weekly schedules
    // Merge consecutive schedules for this campus view
    const mergedSchedules = (() => {
      if (!schedules || schedules.length === 0) return [];
      
      const groups: { [key: string]: any[] } = {};
      schedules.forEach((s: any) => {
        const key = `${s.room_id}_${s.day_of_week}_${s.teacher_id}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      });

      const merged: any[] = [];
      Object.values(groups).forEach((groupList: any) => {
        const parsed = groupList.map((s: any) => {
          const startTimeStr = s.time_slot || s.start_time || '';
          const durationMin = s.duration || s.duration_minutes || 45;
          const [shStr, smStr] = startTimeStr.split(':');
          const sh = parseInt(shStr) || 0;
          const sm = parseInt(smStr) || 0;
          const startMin = sh * 60 + sm;
          const endMin = startMin + durationMin;
          return { ...s, startMin, endMin };
        });

        parsed.sort((a: any, b: any) => a.startMin - b.startMin);

        const mergedGroup: any[] = [];
        parsed.forEach((item: any) => {
          if (mergedGroup.length === 0) {
            mergedGroup.push({ ...item });
          } else {
            const last = mergedGroup[mergedGroup.length - 1];
            if (item.startMin <= last.endMin + 5) {
              last.endMin = Math.max(last.endMin, item.endMin);
            } else {
              mergedGroup.push({ ...item });
            }
          }
        });

        mergedGroup.forEach((item: any) => {
          const sh = Math.floor(item.startMin / 60);
          const sm = item.startMin % 60;
          item.time_slot = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
          item.duration = item.endMin - item.startMin;
          merged.push(item);
        });
      });
      return merged;
    })();

    const getBookingsForSlot = (dayIdx: number, hourStr: string) => {
      if (!selectedRoom) return [];
      
      const dateParts = bookingDate.split('-');
      const currentSelectedDate = dateParts.length === 3
        ? new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
        : new Date(bookingDate);
      const dayOfWeek = currentSelectedDate.getDay();
      const diffToMon = currentSelectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      const mondayOfSelectedWeek = new Date(currentSelectedDate.setDate(diffToMon));
      mondayOfSelectedWeek.setHours(0,0,0,0);

      const sundayOfSelectedWeek = new Date(mondayOfSelectedWeek);
      sundayOfSelectedWeek.setDate(mondayOfSelectedWeek.getDate() + 6);
      sundayOfSelectedWeek.setHours(23,59,59,999);

      // 1. Manual bookings
      const manualForSlot = campusBookings.filter((b: any) => {
        if (b.roomId !== selectedRoom.id) return false;
        const bDate = new Date(b.date);
        if (bDate < mondayOfSelectedWeek || bDate > sundayOfSelectedWeek) return false;
        
        const bDayIndex = getWeekdayIndex(b.date);
        if (bDayIndex !== dayIdx) return false;

        const slotHour = parseInt(hourStr.split(':')[0]);
        const startHour = parseInt(b.startTime.split(':')[0]);
        const endHour = parseInt(b.endTime.split(':')[0]);
        
        return slotHour >= startHour && slotHour < endHour;
      });

      // 2. Weekly recurring schedules
      const DAYS_MAP = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const targetDay = DAYS_MAP[dayIdx];
      const targetDayInt = dayIdx + 1; // 1 = Monday, 7 = Sunday
      const schedulesForSlot = mergedSchedules.filter((s: any) => {
        if (s.room_id !== selectedRoom.id) return false;
        
        const startTimeStr = s.time_slot || s.start_time;
        if (!startTimeStr) return false;
        
        const matchesDay = s.day_of_week === targetDay || 
                           s.day_of_week === targetDayInt || 
                           String(s.day_of_week) === String(targetDayInt);
        if (!matchesDay) return false;

        if (s.start_date && s.interval_weeks && s.interval_weeks > 1) {
          const sDateParts = s.start_date.split('-');
          const sDate = sDateParts.length === 3 
            ? new Date(parseInt(sDateParts[0]), parseInt(sDateParts[1]) - 1, parseInt(sDateParts[2]))
            : new Date(s.start_date);
          sDate.setHours(0, 0, 0, 0);
          
          const sDayOfWeek = sDate.getDay();
          const sDiffToMon = sDate.getDate() - (sDayOfWeek === 0 ? 6 : sDayOfWeek - 1);
          const sMonday = new Date(sDate.setDate(sDiffToMon));
          sMonday.setHours(0, 0, 0, 0);

          const cMonday = new Date(mondayOfSelectedWeek);
          cMonday.setHours(0, 0, 0, 0);

          const msDiff = cMonday.getTime() - sMonday.getTime();
          if (msDiff < 0) return false;

          const weekDiff = Math.round(msDiff / (7 * 24 * 60 * 60 * 1000));
          if (weekDiff % s.interval_weeks !== 0) return false;
        }

        const durationMin = s.duration || s.duration_minutes || 45;
        
        const slotHour = parseInt(hourStr.split(':')[0]);
        const slotStartMin = slotHour * 60;
        const slotEndMin = (slotHour + 1) * 60;

        const [shStr, smStr] = startTimeStr.split(':');
        const sh = parseInt(shStr) || 0;
        const sm = parseInt(smStr) || 0;
        const schedStartMin = sh * 60 + sm;
        const schedEndMin = schedStartMin + durationMin;
        
        return schedStartMin < slotEndMin && schedEndMin > slotStartMin;
      });

      // Convert schedules to booking format
      const mappedSchedules = schedulesForSlot.map((s: any) => {
        const isApproved = s.status === 'approved' || s.is_approved === true;
        const startTimeStr = s.time_slot || s.start_time || '';
        const durationMin = s.duration || s.duration_minutes || 45;
        
        // Calculate end_time string
        let endTimeStr = s.end_time || '';
        if (startTimeStr && !endTimeStr) {
          const [shStr, smStr] = startTimeStr.split(':');
          const sh = parseInt(shStr) || 0;
          const sm = parseInt(smStr) || 0;
          const totalMin = sh * 60 + sm + durationMin;
          const eh = Math.floor(totalMin / 60) % 24;
          const em = totalMin % 60;
          endTimeStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
        }

        const teacherName = s.teacher 
          ? `${s.teacher.first_name} ${s.teacher.last_name}` 
          : (s.teacher_name || 'Lehrer');

        return {
          id: s.id,
          roomId: s.room_id,
          roomName: selectedRoom.name,
          date: '', // Weekly recurring
          startTime: startTimeStr,
          endTime: endTimeStr,
          purpose: s.purpose || (s.subject_name ? `Unterricht: ${s.subject_name}` : 'Unterricht'),
          teacherId: s.teacher_id,
          teacherName: teacherName,
          isSchedule: true,
          isApproved
        };
      });

      // 3. Dynamic rescheduled occurrences
      const targetDate = new Date(mondayOfSelectedWeek);
      targetDate.setDate(mondayOfSelectedWeek.getDate() + dayIdx);
      const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

      const dynamicForSlot = scheduleOccurrences.filter((occ: any) => {
        const roomId = occ.schedules?.room_id || null;
        if (roomId !== selectedRoom.id) return false;
        if (occ.date !== targetDateStr) return false;

        if (occ.status === 'cancelled' || occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick') {
          return false;
        }

        const templateTime = occ.schedules?.time_slot || '';
        const templateDay = occ.schedules?.day_of_week || 0;

        const occDate = new Date(occ.date);
        const rawDay = occDate.getDay();
        const actualDayOfWeek = rawDay === 0 ? 7 : rawDay;

        const hasTimeMoved = templateTime && occ.start_time.substring(0, 5) !== templateTime.substring(0, 5);
        const hasDayMoved = templateDay && actualDayOfWeek !== templateDay;
        
        const hasFallbackDateMoved = occ.original_date && occ.date !== occ.original_date;
        const hasFallbackTimeMoved = occ.original_start_time && occ.start_time.substring(0, 5) !== occ.original_start_time.substring(0, 5);

        const hasMoved = occ.schedules 
          ? (hasTimeMoved || hasDayMoved)
          : (hasFallbackDateMoved || hasFallbackTimeMoved);

        if (!hasMoved) return false;

        const durationMin = occ.duration || 45;
        const slotHour = parseInt(hourStr.split(':')[0]);
        const slotStartMin = slotHour * 60;
        const slotEndMin = (slotHour + 1) * 60;

        const [shStr, smStr] = occ.start_time.split(':');
        const sh = parseInt(shStr) || 0;
        const sm = parseInt(smStr) || 0;
        const occStartMin = sh * 60 + sm;
        const occEndMin = occStartMin + durationMin;

        return occStartMin < slotEndMin && occEndMin > slotStartMin;
      });

      const mappedDynamics = dynamicForSlot.map((occ: any) => {
        const startTimeStr = occ.start_time.substring(0, 5);
        const durationMin = occ.duration || 45;

        const [shStr, smStr] = startTimeStr.split(':');
        const sh = parseInt(shStr) || 0;
        const sm = parseInt(smStr) || 0;
        const totalMin = sh * 60 + sm + durationMin;
        const eh = Math.floor(totalMin / 60) % 24;
        const em = totalMin % 60;
        const endTimeStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

        const teacherName = occ.teacher 
          ? `${occ.teacher.first_name} ${occ.teacher.last_name}` 
          : 'Lehrer';

        return {
          id: occ.id,
          roomId: occ.schedules?.room_id,
          roomName: selectedRoom.name,
          date: occ.date,
          startTime: startTimeStr,
          endTime: endTimeStr,
          purpose: occ.student ? `Unterricht: ${occ.student.first_name} ${occ.student.last_name}` : 'Unterricht',
          teacherId: occ.teacher_id,
          teacherName: teacherName,
          isSchedule: true,
          isApproved: occ.status === 'rescheduled_confirmed',
          status: occ.status
        };
      });

      // 4. Draft/Preview booking during input
      const draftPreviewBooking: any[] = [];
      if (showPreviewField && !selectedBooking && bookingDate && bookingStartTime && bookingEndTime && selectedRoom) {
        const previewParts = bookingDate.split('-');
        const previewDate = previewParts.length === 3
          ? new Date(parseInt(previewParts[0]), parseInt(previewParts[1]) - 1, parseInt(previewParts[2]))
          : new Date(bookingDate);
        previewDate.setHours(0, 0, 0, 0);
        if (previewDate >= mondayOfSelectedWeek && previewDate <= sundayOfSelectedWeek) {
          const previewDayIdx = getWeekdayIndex(bookingDate);
          if (previewDayIdx === dayIdx) {
            const slotHour = parseInt(hourStr.split(':')[0]);
            const startHour = parseInt(bookingStartTime.split(':')[0]);
            const endHour = parseInt(bookingEndTime.split(':')[0]);
            if (slotHour >= startHour && slotHour < endHour) {
              draftPreviewBooking.push({
                id: 'preview_draft_booking',
                roomId: selectedRoom.id,
                roomName: selectedRoom.name,
                date: bookingDate,
                startTime: bookingStartTime,
                endTime: bookingEndTime,
                purpose: bookingPurpose || 'Eigennutzung',
                teacherId: userId,
                teacherName: admin ? `${admin.first_name} ${admin.last_name}` : 'Lehrer',
                isPreview: true
              });
            }
          }
        }
      }

      return [...manualForSlot, ...mappedSchedules, ...mappedDynamics, ...draftPreviewBooking];
    };

    // Check if room is occupied during selected time slot
    const isRoomOccupied = (roomId: string) => {
      const dateBookings = campusBookings.filter((b: any) => b.date === bookingDate);
      const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayVal = new Date(bookingDate).getDay();
      const targetDay = DAYS_MAP[dayVal];
      const targetDayInt = dayVal === 0 ? 7 : dayVal; // 1 = Monday, 7 = Sunday

      const hasBooking = dateBookings.some((b: any) => {
        if (b.roomId !== roomId) return false;
        if (selectedBooking && b.id === selectedBooking.id) return false;
        return !(b.endTime <= bookingStartTime || b.startTime >= bookingEndTime);
      });


      const hasSchedule = mergedSchedules.some((s: any) => {
        if (s.room_id !== roomId) return false;
        
        const startTimeStr = s.time_slot || s.start_time;
        if (!startTimeStr) return false;
        
        const matchesDay = s.day_of_week === targetDay || 
                           s.day_of_week === targetDayInt || 
                           String(s.day_of_week) === String(targetDayInt);
        if (!matchesDay) return false;

        const durationMin = s.duration || s.duration_minutes || 45;

        // User booking range in minutes
        const [uShStr, uSmStr] = bookingStartTime.split(':');
        const uSh = parseInt(uShStr) || 0;
        const uSm = parseInt(uSmStr) || 0;
        const userStartMin = uSh * 60 + uSm;

        const [uEhStr, uEmStr] = bookingEndTime.split(':');
        const uEh = parseInt(uEhStr) || 0;
        const uEm = parseInt(uEmStr) || 0;
        const userEndMin = uEh * 60 + uEm;

        // Schedule range in minutes
        const [shStr, smStr] = startTimeStr.split(':');
        const sh = parseInt(shStr) || 0;
        const sm = parseInt(smStr) || 0;
        const schedStartMin = sh * 60 + sm;
        const schedEndMin = schedStartMin + durationMin;

        return schedStartMin < userEndMin && schedEndMin > userStartMin;
      });

      const hasDynamic = scheduleOccurrences.some((occ: any) => {
        const rId = occ.schedules?.room_id || null;
        if (rId !== roomId) return false;
        if (occ.date !== bookingDate) return false;

        if (occ.status === 'cancelled' || occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick') {
          return false;
        }

        const templateTime = occ.schedules?.time_slot || '';
        const templateDay = occ.schedules?.day_of_week || 0;

        const occDate = new Date(occ.date);
        const rawDay = occDate.getDay();
        const actualDayOfWeek = rawDay === 0 ? 7 : rawDay;

        const hasTimeMoved = templateTime && occ.start_time.substring(0, 5) !== templateTime.substring(0, 5);
        const hasDayMoved = templateDay && actualDayOfWeek !== templateDay;
        
        const hasFallbackDateMoved = occ.original_date && occ.date !== occ.original_date;
        const hasFallbackTimeMoved = occ.original_start_time && occ.start_time.substring(0, 5) !== occ.original_start_time.substring(0, 5);

        const hasMoved = occ.schedules 
          ? (hasTimeMoved || hasDayMoved)
          : (hasFallbackDateMoved || hasFallbackTimeMoved);

        if (!hasMoved) return false;

        const durationMin = occ.duration || 45;

        // User booking range in minutes
        const [uShStr, uSmStr] = bookingStartTime.split(':');
        const uSh = parseInt(uShStr) || 0;
        const uSm = parseInt(uSmStr) || 0;
        const userStartMin = uSh * 60 + uSm;

        const [uEhStr, uEmStr] = bookingEndTime.split(':');
        const uEh = parseInt(uEhStr) || 0;
        const uEm = parseInt(uEmStr) || 0;
        const userEndMin = uEh * 60 + uEm;

        const [shStr, smStr] = occ.start_time.split(':');
        const sh = parseInt(shStr) || 0;
        const sm = parseInt(smStr) || 0;
        const occStartMin = sh * 60 + sm;
        const occEndMin = occStartMin + durationMin;

        return occStartMin < userEndMin && occEndMin > userStartMin;
      });

      return hasBooking || hasSchedule || hasDynamic;
    };

    // Check if room is occupied *right now* (Ist-Zustand)
    const isRoomOccupiedNow = (roomId: string) => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const currentMin = now.getHours() * 60 + now.getMinutes();

      const todayBookings = campusBookings.filter((b: any) => b.roomId === roomId && b.date === todayStr);
      const hasBookingNow = todayBookings.some((b: any) => {
        const [sh, sm] = b.startTime.split(':').map(Number);
        const [eh, em] = b.endTime.split(':').map(Number);
        const bStart = sh * 60 + sm;
        const bEnd = eh * 60 + em;
        return currentMin >= bStart && currentMin < bEnd;
      });

      if (hasBookingNow) return true;

      const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayVal = now.getDay();
      const targetDay = DAYS_MAP[dayVal];
      const targetDayInt = dayVal === 0 ? 7 : dayVal;

      const hasScheduleNow = mergedSchedules.some((s: any) => {
        if (s.room_id !== roomId) return false;
        const startTimeStr = s.time_slot || s.start_time;
        if (!startTimeStr) return false;
        
        const matchesDay = s.day_of_week === targetDay || 
                           s.day_of_week === targetDayInt || 
                           String(s.day_of_week) === String(targetDayInt);
        if (!matchesDay) return false;

        const durationMin = s.duration || s.duration_minutes || 45;
        const [shStr, smStr] = startTimeStr.split(':');
        const sh = parseInt(shStr) || 0;
        const sm = parseInt(smStr) || 0;
        const schedStartMin = sh * 60 + sm;
        const schedEndMin = schedStartMin + durationMin;

        return currentMin >= schedStartMin && currentMin < schedEndMin;
      });

      return hasScheduleNow;
    };

    // Filter rooms by floor AND availability (if date filter is active)
    const roomsToRender = (rooms.filter(room => {
      if (selectedFloor !== 'Alle' && room.floor !== selectedFloor) return false;
      if (roomSearchQuery.trim()) {
        const query = roomSearchQuery.toLowerCase();
        const matchesName = room.name?.toLowerCase().includes(query);
        const matchesFloor = room.floor?.toLowerCase().includes(query);
        const matchesDesc = room.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesFloor && !matchesDesc) return false;
      }
      return true;
    })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    // Derived selected room to keep logic aligned
    const selectedRoom = roomsToRender.find(r => r.id === selectedCampusRoomId) || roomsToRender[0] || rooms.find(r => r.id === selectedCampusRoomId) || rooms[0];

    const handleAddBooking = (roomId: string) => {
      const roomName = rooms.find(r => r.id === roomId)?.name || 'Raum';
      const studentObj = students.find(s => s.id === bookingStudentId);
      const studentName = studentObj ? `Unterricht: ${studentObj.first_name} ${studentObj.last_name}` : 'Unterricht';
      const finalPurpose = bookingType === 'lesson' ? studentName : (bookingPurpose || 'Eigennutzung');

      if (isRecurring) {
        // Build the recurring schedule
        const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const parts = bookingDate.split('-');
        const d = parts.length === 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : new Date(bookingDate);
        const targetDayName = DAYS_MAP[d.getDay()];

        const [shStr, smStr] = bookingStartTime.split(':');
        const [ehStr, emStr] = bookingEndTime.split(':');
        const startMin = (parseInt(shStr) || 0) * 60 + (parseInt(smStr) || 0);
        const endMin = (parseInt(ehStr) || 0) * 60 + (parseInt(emStr) || 0);
        const durationMin = Math.max(15, endMin - startMin);

        const newSchedule = {
          id: 'sched_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          room_id: roomId,
          day_of_week: targetDayName,
          time_slot: bookingStartTime,
          duration: durationMin,
          purpose: finalPurpose,
          teacher_id: userId,
          teacher: admin ? { first_name: admin.first_name, last_name: admin.last_name } : { first_name: 'Lehrer', last_name: '' },
          status: 'approved',
          start_date: bookingDate,
          interval_weeks: recurringInterval
        };

        setSchedules(prev => [...prev, newSchedule]);
      } else {
        const newBooking = {
          id: 'cb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          roomId,
          roomName,
          date: bookingDate,
          startTime: bookingStartTime,
          endTime: bookingEndTime,
          purpose: finalPurpose,
          teacherId: userId,
          teacherName: admin ? `${admin.first_name} ${admin.last_name}` : 'Lehrer'
        };

        setCampusBookings(prev => [...prev, newBooking]);
      }

      setIsDateFilterActive(false);
      setSuccessAnimationRoomId(roomId);
      setTimeout(() => setSuccessAnimationRoomId(null), 1000);
      
      // Clear inputs
      setBookingPurpose('');
      setBookingStudentId('');
      setStudentSearchTerm('');
      setIsRecurring(false);
      setShowPreviewField(false);
      setRecurringInterval(1);
    };

    const handleUpdateBooking = () => {
      if (!selectedBooking) return;

      const studentObj = students.find(s => s.id === bookingStudentId);
      const studentName = studentObj ? `Unterricht: ${studentObj.first_name} ${studentObj.last_name}` : 'Unterricht';
      const finalPurpose = bookingType === 'lesson' ? studentName : (bookingPurpose || 'Eigennutzung');

      if (selectedBooking.isSchedule) {
        // Schedule blocks are recurring – create a manual booking override for this specific date
        const roomName = rooms.find((r: any) => r.id === selectedBooking.roomId)?.name || selectedBooking.roomName || 'Raum';
        const override = {
          id: 'cb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          roomId: selectedBooking.roomId,
          roomName,
          date: bookingDate,
          startTime: bookingStartTime,
          endTime: bookingEndTime,
          purpose: finalPurpose,
          teacherId: userId,
          teacherName: admin ? `${admin.first_name} ${admin.last_name}` : 'Lehrer'
        };
        setCampusBookings(prev => [...prev, override]);
      } else {
        setCampusBookings(prev => prev.map((b: any) => {
          if (b.id === selectedBooking.id) {
            return {
              ...b,
              date: bookingDate,
              startTime: bookingStartTime,
              endTime: bookingEndTime,
              purpose: finalPurpose
            };
          }
          return b;
        }));
      }

      setSelectedBooking(null);
      setBookingPurpose('');
      setBookingStudentId('');
      setStudentSearchTerm('');
      setIsDateFilterActive(false);
      setShowPreviewField(false);
      setRecurringInterval(1);
    };


    const handleCellClick = (dayIdx: number, hourStr: string, e: React.MouseEvent<HTMLDivElement>) => {
      const currentSelectedDate = new Date(bookingDate);
      const dayOfWeek = currentSelectedDate.getDay();
      const diffToMon = currentSelectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      const targetDate = new Date(currentSelectedDate.setDate(diffToMon + dayIdx));
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const startH = parseInt(hourStr.split(':')[0]);
      const startStr = `${String(startH).padStart(2, '0')}:00`;
      const endStr = `${String(startH + 1).padStart(2, '0')}:00`;

      setBookingDate(targetDateStr);
      setBookingStartTime(startStr);
      setBookingEndTime(endStr);
      setIsDateFilterActive(true);
      setShowMyBookingsOnly(false); // Make sure booking sidebar is shown

    };


    const handleCellDoubleClick = (dayIdx: number, hourStr: string) => {
      if (!selectedRoom) return;

      const slotBookings = getBookingsForSlot(dayIdx, hourStr);
      if (slotBookings.length > 0) return;

      const currentSelectedDate = new Date(bookingDate);
      const dayOfWeek = currentSelectedDate.getDay();
      const diffToMon = currentSelectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      const targetDate = new Date(currentSelectedDate.setDate(diffToMon + dayIdx));
      const targetDateStr = targetDate.toISOString().split('T')[0];

      const startH = parseInt(hourStr.split(':')[0]);
      const startStr = `${String(startH).padStart(2, '0')}:00`;
      const endStr = `${String(startH + 1).padStart(2, '0')}:00`;

      const newBooking = {
        id: 'cb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        date: targetDateStr,
        startTime: startStr,
        endTime: endStr,
        purpose: 'Unterricht',
        teacherId: userId,
        teacherName: admin ? `${admin.first_name} ${admin.last_name}` : 'Lehrer'
      };

      setCampusBookings(prev => [...prev, newBooking]);
      setDraftBooking(null);
      setIsDateFilterActive(false);
      setSuccessAnimationRoomId(selectedRoom.id);
      setTimeout(() => setSuccessAnimationRoomId(null), 1000);
    };


    const parseTimeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const formatMinutesToTime = (mins: number) => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const handleDragStart = (e: React.DragEvent, bookingId: string) => {
      e.dataTransfer.setData('text/plain', bookingId);
      e.dataTransfer.effectAllowed = 'move';
    };

    const handleDropOnCell = (e: React.DragEvent, targetDayIdx: number, targetHourStr: string) => {
      e.preventDefault();
      setDragOverCell(null);
      const bookingId = e.dataTransfer.getData('text/plain');
      if (!bookingId) return;

      const booking = campusBookings.find((b: any) => b.id === bookingId);
      if (!booking) return;

      if (booking.teacherId !== userId) return;

      // Calculate target date
      const currentSelectedDate = new Date(bookingDate);
      const dayOfWeek = currentSelectedDate.getDay();
      const diffToMon = currentSelectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      const targetDate = new Date(currentSelectedDate.setDate(diffToMon + targetDayIdx));
      const targetDateStr = targetDate.toISOString().split('T')[0];

      // Calculate duration of original booking
      const startMins = parseTimeToMinutes(booking.startTime);
      const endMins = parseTimeToMinutes(booking.endTime);
      const duration = endMins - startMins;

      // Calculate new start/end times
      const newStartMins = parseTimeToMinutes(targetHourStr);
      const newEndMins = newStartMins + duration;

      const newStartTime = formatMinutesToTime(newStartMins);
      const newEndTime = formatMinutesToTime(newEndMins);

      // Update the booking in local state
      setCampusBookings(prev => prev.map((b: any) => {
        if (b.id === bookingId) {
          return {
            ...b,
            date: targetDateStr,
            startTime: newStartTime,
            endTime: newEndTime
          };
        }
        return b;
      }));
    };

    const handleResizeStart = (
      e: React.PointerEvent<HTMLDivElement>,
      booking: any,
      edge: 'top' | 'bottom'
    ) => {
      e.stopPropagation();
      const handleElement = e.currentTarget;
      const cardElement = handleElement.parentElement;
      if (!cardElement) return;

      const parentCell = cardElement.parentElement;
      if (!parentCell) return;

      const cellHeight = parentCell.clientHeight || 56;
      const startY = e.clientY;

      const initialStartMins = parseTimeToMinutes(booking.startTime);
      const initialEndMins = parseTimeToMinutes(booking.endTime);

      handleElement.setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvent: PointerEvent) => {
        moveEvent.stopPropagation();
        const deltaY = moveEvent.clientY - startY;
        const deltaMins = Math.round((deltaY / cellHeight) * 60);

        // Snap to 5 minutes
        const step = 5;
        const snappedDeltaMins = Math.round(deltaMins / step) * step;

        if (edge === 'bottom') {
          let newEndMins = initialEndMins + snappedDeltaMins;
          if (newEndMins < initialStartMins + 15) {
            newEndMins = initialStartMins + 15;
          }
          if (newEndMins > 24 * 60) {
            newEndMins = 24 * 60;
          }

          const newEndTime = formatMinutesToTime(newEndMins);
          setCampusBookings(prev =>
            prev.map(b => (b.id === booking.id ? { ...b, endTime: newEndTime } : b))
          );
        } else {
          let newStartMins = initialStartMins + snappedDeltaMins;
          if (newStartMins > initialEndMins - 15) {
            newStartMins = initialEndMins - 15;
          }
          if (newStartMins < 0) {
            newStartMins = 0;
          }

          const newStartTime = formatMinutesToTime(newStartMins);
          setCampusBookings(prev =>
            prev.map(b => (b.id === booking.id ? { ...b, startTime: newStartTime } : b))
          );
        }
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        upEvent.stopPropagation();
        handleElement.releasePointerCapture(upEvent.pointerId);
        handleElement.removeEventListener('pointermove', onPointerMove);
        handleElement.removeEventListener('pointerup', onPointerUp);
      };

      handleElement.addEventListener('pointermove', onPointerMove);
      handleElement.addEventListener('pointerup', onPointerUp);
    };



     // Merge overlapping/consecutive bookings for "Meine Buchungen" sidebar
     const groupedMyBookings: { [key: string]: any[] } = {};
     
     // Own manual bookings
     const ownManualBookings = campusBookings.filter((b: any) => b.teacherId === userId);
     
     // Own rescheduled occurrences
     const ownRescheduledOccurs = scheduleOccurrences
       .filter((occ: any) => occ.teacher_id === userId && (occ.status === 'pending_reschedule' || occ.status === 'rescheduled_confirmed'))
       .map((occ: any) => {
         const startTimeStr = occ.start_time.substring(0, 5);
         const durationMin = occ.duration || 45;
         const [shStr, smStr] = startTimeStr.split(':');
         const sh = parseInt(shStr) || 0;
         const sm = parseInt(smStr) || 0;
         const totalMin = sh * 60 + sm + durationMin;
         const eh = Math.floor(totalMin / 60) % 24;
         const em = totalMin % 60;
         const endTimeStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
         
         const roomName = occ.schedules?.rooms?.name || occ.schedules?.room_name || (rooms && rooms.find((r: any) => r.id === occ.schedules?.room_id)?.name) || 'Raum';
         
         return {
           id: occ.id,
           roomId: occ.schedules?.room_id,
           roomName: roomName,
           date: occ.date,
           startTime: startTimeStr,
           endTime: endTimeStr,
           purpose: occ.student ? `Unterricht: ${occ.student.first_name} ${occ.student.last_name}` : 'Unterricht',
           teacherId: userId,
           status: occ.status,
           isSchedule: true
         };
       });

     const combinedOwnBookings = [...ownManualBookings, ...ownRescheduledOccurs];

     combinedOwnBookings.forEach((b: any) => {
       const key = `${b.roomId}_${b.date}`;
       if (!groupedMyBookings[key]) {
         groupedMyBookings[key] = [];
       }
       groupedMyBookings[key].push(b);
     });

    const myBookings: any[] = [];
    Object.values(groupedMyBookings).forEach((list: any[]) => {
      const parsed = list.map((b: any) => {
        const [shStr, smStr] = b.startTime.split(':');
        const sh = parseInt(shStr) || 0;
        const sm = parseInt(smStr) || 0;
        const [ehStr, emStr] = b.endTime.split(':');
        const eh = parseInt(ehStr) || 0;
        const em = parseInt(emStr) || 0;
        const startMin = sh * 60 + sm;
        let endMin = eh * 60 + em;
        if (endMin <= startMin) {
          endMin = startMin + 30;
        }
        return { ...b, startMin, endMin };
      });

      parsed.sort((a, b) => a.startMin - b.startMin);

      const mergedList: any[] = [];
      parsed.forEach((item) => {
        if (mergedList.length === 0) {
          mergedList.push({
            ...item,
            ids: [item.id]
          });
        } else {
          const last = mergedList[mergedList.length - 1];
          if (item.startMin <= last.endMin) {
            last.endMin = Math.max(last.endMin, item.endMin);
            last.ids.push(item.id);
            if (last.purpose && item.purpose && last.purpose !== item.purpose) {
              const cleanedPurpose = item.purpose.replace(/^Unterricht:\s*/i, '');
              if (!last.purpose.includes(cleanedPurpose)) {
                last.purpose = `${last.purpose} & ${cleanedPurpose}`;
              }
            }
          } else {
            mergedList.push({
              ...item,
              ids: [item.id]
            });
          }
        }
      });

      mergedList.forEach((m: any) => {
        const sh = String(Math.floor(m.startMin / 60)).padStart(2, '0');
        const sm = String(m.startMin % 60).padStart(2, '0');
        const eh = String(Math.floor(m.endMin / 60)).padStart(2, '0');
        const em = String(m.endMin % 60).padStart(2, '0');
        myBookings.push({
          ...m,
          startTime: `${sh}:${sm}`,
          endTime: `${eh}:${em}`
        });
      });
    });

    const DAYS_OF_WEEK = [
      { label: 'Montag', value: 'Monday', short: 'Mo' },
      { label: 'Dienstag', value: 'Tuesday', short: 'Di' },
      { label: 'Mittwoch', value: 'Wednesday', short: 'Mi' },
      { label: 'Donnerstag', value: 'Thursday', short: 'Do' },
      { label: 'Freitag', value: 'Friday', short: 'Fr' },
      { label: 'Samstag', value: 'Saturday', short: 'Sa' },
      { label: 'Sonntag', value: 'Sunday', short: 'So' }
    ];

    const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
      const hour = 8 + i;
      return `${String(hour).padStart(2, '0')}:00`;
    });

    const getWeekdayIndex = (dateStr: string) => {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const day = d.getDay();
        return day === 0 ? 6 : day - 1;
      }
      const d = new Date(dateStr);
      const day = d.getDay();
      return day === 0 ? 6 : day - 1;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '0px' }}>
        <style>{`
          .custom-calendar-scrollbar::-webkit-scrollbar {
            width: 5px;
            height: 5px;
          }
          .custom-calendar-scrollbar::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 10px;
          }
          .custom-calendar-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
            transition: background 0.2s;
          }
          .custom-calendar-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.4); opacity: 0.6; }
            100% { transform: scale(1); opacity: 1; }
          }
          .pulsing-dot {
            animation: pulse 2.5s infinite ease-in-out;
          }
          .premium-input {
            padding: 10px 14px;
            border-radius: 12px;
            border: 1.5px solid #cbd5e1;
            font-size: 0.85rem;
            font-weight: 700;
            outline: none;
            color: #1e293b;
            background: #f8fafc;
            height: 42px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
          }
          .premium-input:focus {
            border-color: ${brandColor};
            background: #ffffff;
            color: #000000;
            box-shadow: 0 0 0 3px ${brandColor}18, inset 0 1px 2px rgba(0, 0, 0, 0.01);
          }
          .room-picker-card {
            min-width: 190px;
            padding: 14px;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .room-picker-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.04);
          }
          @media (max-width: 1024px) {
            .calendar-header-flex {
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 12px !important;
            }
            .calendar-controls-wrapper {
              width: 100% !important;
              justify-content: space-between !important;
              gap: 12px !important;
            }
            .calendar-today-btn {
              padding: 10px 18px !important;
              font-size: 0.8rem !important;
              height: 44px !important;
              border-radius: 14px !important;
              min-width: 88px !important;
            }
            .calendar-week-pagination {
              padding: 6px 14px !important;
              border-radius: 16px !important;
              height: 44px !important;
              flex-grow: 1 !important;
              justify-content: space-between !important;
            }
            .calendar-week-chevron-btn {
              padding: 10px 14px !important;
              border-radius: 12px !important;
              min-width: 44px !important;
              height: 44px !important;
            }
          }
          .rooms-board-grid {
            grid-template-columns: 1fr 340px;
          }
          @media (max-width: 1400px) {
            .rooms-board-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        <div className="rooms-board-grid" style={{ display: 'grid', gap: '20px', alignItems: 'stretch', minWidth: 0 }}>
          {/* Left Column: Room catalog and weekly calendar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            
            {/* Room Horizontal Picker */}
            <div 
              className="glass-panel" 
              style={{ 
                background: 'white', 
                borderRadius: '24px', 
                border: '1px solid rgba(0, 0, 0, 0.04)', 
                padding: '18px 24px', 
                boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.02), 0 2px 12px -2px rgba(0, 0, 0, 0.01)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1c1c1e', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, letterSpacing: '-0.02em' }}>
                  <div style={{ background: `${brandColor}12`, color: brandColor, padding: '6px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
                    <Box size={16} />
                  </div>
                  Campus Räumlichkeiten
                </h2>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Smart Room Search Field */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f2f2f7', borderRadius: '12px', padding: '6px 12px', gap: '6px', border: '1px solid rgba(0,0,0,0.01)', width: '200px', transition: 'all 0.2s' }}>
                      <Search size={14} color="#8e8e93" />
                      <input
                        type="text"
                        placeholder="Raum suchen..."
                        value={roomSearchQuery}
                        onChange={(e) => {
                          setRoomSearchQuery(e.target.value);
                          setIsRoomSearchDropdownOpen(true);
                        }}
                        onFocus={() => setIsRoomSearchDropdownOpen(true)}
                        onBlur={() => {
                          setTimeout(() => setIsRoomSearchDropdownOpen(false), 200);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          outline: 'none',
                          fontSize: '0.78rem',
                          color: '#1c1c1e',
                          fontWeight: 600,
                          width: '100%',
                          padding: 0
                        }}
                      />
                      {roomSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setRoomSearchQuery('');
                            setIsRoomSearchDropdownOpen(false);
                          }}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                        >
                          <X size={12} color="#8e8e93" />
                        </button>
                      )}
                    </div>

                    {/* Autocomplete Dropdown List */}
                    {isRoomSearchDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '6px',
                        background: '#ffffff',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '6px'
                      }}>
                        {rooms
                          .filter(r => {
                            const query = roomSearchQuery.toLowerCase().trim();
                            if (!query) return true;
                            return (
                              r.name?.toLowerCase().includes(query) ||
                              r.floor?.toLowerCase().includes(query) ||
                              r.description?.toLowerCase().includes(query)
                            );
                          })
                          .map(r => (
                            <div
                              key={r.id}
                              onClick={() => {
                                setRoomSearchQuery(r.name);
                                setSelectedFloor('Alle');
                                setSelectedCampusRoomId(r.id);
                                setIsRoomSearchDropdownOpen(false);
                              }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '0.74rem',
                                color: '#1c1c1e',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                transition: 'background 0.15s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f2f7'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <span>{r.name}</span>
                              <span style={{ fontSize: '0.62rem', color: '#8e8e93', textTransform: 'uppercase', alignSelf: 'center' }}>
                                {r.floor === 'Allgemein' ? 'Standard' : r.floor}
                              </span>
                            </div>
                          ))}
                        {rooms.filter(r => {
                          const query = roomSearchQuery.toLowerCase().trim();
                          if (!query) return true;
                          return (
                            r.name?.toLowerCase().includes(query) ||
                            r.floor?.toLowerCase().includes(query) ||
                            r.description?.toLowerCase().includes(query)
                          );
                        }).length === 0 && (
                          <div style={{ padding: '8px 10px', fontSize: '0.74rem', color: '#8e8e93', textAlign: 'center' }}>
                            Keine Räume gefunden
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Segmented Control for Floor filter */}
                  <div style={{ 
                    background: '#f2f2f7', 
                    borderRadius: '14px', 
                    padding: '3px', 
                    display: 'flex', 
                    gap: '2px', 
                    border: '1px solid rgba(0,0,0,0.01)',
                    alignItems: 'center',
                  }}>
                    {['Alle', ...uniqueFloors].map((floor) => {
                      const isSelected = selectedFloor === floor;
                      return (
                        <button
                          key={floor}
                          onClick={() => setSelectedFloor(floor)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '11px',
                            border: 'none',
                            background: isSelected ? '#ffffff' : 'transparent',
                            color: isSelected ? brandColor : '#636366',
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                          }}
                        >
                          {floor === 'Allgemein' ? 'Standard' : floor}
                        </button>
                      );
                    })}
                  </div>

                  {/* Highlighted "Meine Buchungen" Button */}
                  <button
                    onClick={() => setShowMyBookingsOnly(prev => !prev)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '14px',
                      border: showMyBookingsOnly ? 'none' : '1.5px solid #af52de40',
                      background: showMyBookingsOnly 
                        ? 'linear-gradient(135deg, #af52de, #8b5cf6)' 
                        : '#f6f0ff',
                      color: showMyBookingsOnly ? '#ffffff' : '#6d28d9',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: showMyBookingsOnly 
                        ? '0 6px 16px rgba(175, 82, 222, 0.35)' 
                        : '0 2px 4px rgba(0,0,0,0.01)',
                      transform: showMyBookingsOnly ? 'scale(1.02)' : 'none',
                    }}
                  >
                    <span>Meine Buchungen</span>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      background: showMyBookingsOnly ? '#ffffff' : '#af52de', 
                      color: showMyBookingsOnly ? '#af52de' : '#ffffff', 
                      padding: '2px 8px', 
                      borderRadius: '8px', 
                      fontWeight: 900 
                    }}>
                      {myBookings.length}
                    </span>
                  </button>

                </div>
              </div>

              {/* Active Filter Info Banner */}
              {isDateFilterActive && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  background: '#fff9e6', 
                  border: '1px solid #ffe699', 
                  borderRadius: '14px', 
                  padding: '10px 16px', 
                  marginBottom: '16px',
                  animation: 'fadeIn 0.25s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#b27b00', fontWeight: 700 }}>
                    <span>📅</span>
                    <span>Anzeige gefiltert für: {new Date(bookingDate).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}, {bookingStartTime} - {bookingEndTime} Uhr</span>
                  </div>
                  <button 
                    onClick={() => {
                      setIsDateFilterActive(false);
                      setBookingDate(new Date().toISOString().split('T')[0]);
                    }}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      color: '#b27b00', 
                      fontWeight: 800, 
                      fontSize: '0.75rem', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Filter zurücksetzen ✕
                  </button>
                </div>
              )}

              {/* Rooms List Container */}
              <div 
                className="custom-calendar-scrollbar" 
                style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  overflowX: 'auto', 
                  paddingBottom: '8px', 
                  width: '100%', 
                  minWidth: 0,
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {roomsToRender.map((room) => {
                  const isSelected = selectedCampusRoomId === room.id;
                  const occupiedNow = isRoomOccupiedNow(room.id);
                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedCampusRoomId(room.id)}
                      className="room-picker-card"
                      style={{
                        background: isSelected ? `${brandColor}06` : 'white',
                        border: isSelected ? `2px solid ${brandColor}` : '1.5px solid #e5e5ea',
                        boxShadow: isSelected ? `0 8px 24px ${brandColor}12` : 'none',
                        opacity: 1
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                        <div style={{ 
                          fontWeight: 800, 
                          fontSize: '0.85rem', 
                          color: isSelected ? brandColor : '#1c1c1e',
                          lineHeight: 1.25,
                          wordBreak: 'break-word',
                          flex: 1
                        }}>
                          {room.name}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const favKey = `groovelab_favorite_room_id_${userId}`;
                            if (favoriteRoomId === room.id) {
                              localStorage.removeItem(favKey);
                              setFavoriteRoomId(null);
                            } else {
                              localStorage.setItem(favKey, room.id);
                              setFavoriteRoomId(room.id);
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '4px',
                            flexShrink: 0
                          }}
                        >
                          <Star
                            size={14}
                            fill={favoriteRoomId === room.id ? "#fbbf24" : "none"}
                            color={favoriteRoomId === room.id ? "#fbbf24" : "#8e8e93"}
                          />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: 'auto' }}>
                        {occupiedNow ? (
                          <span style={{ padding: '3px 8px', background: '#ffebeb', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, color: '#ff453a' }}>
                            Belegt
                          </span>
                        ) : (
                          <span style={{ padding: '3px 8px', background: '#eafaf1', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, color: '#1e7a44' }}>
                            Frei
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly Availability Calendar Grid */}
            <div 
              className="calendar-grid-card glass-panel" 
              onClick={() => setDraftBooking(null)}
              style={{ 
                position: 'relative',
                background: 'white', 
                borderRadius: '24px', 
                border: '1px solid rgba(0, 0, 0, 0.04)', 
                padding: '20px 24px', 
                boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.02), 0 2px 12px -2px rgba(0, 0, 0, 0.01)'
              }}
            >
              <div className="calendar-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1c1c1e', margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>Wochenübersicht: {selectedRoom?.name || 'Wähle einen Raum'}</span>
                    {myRooms.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '6px' }}>
                        {myRooms.map((r: any) => {
                          const isSelected = selectedCampusRoomId === r.id;
                           return (
                             <button
                               key={r.id}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedCampusRoomId(r.id);
                               }}
                               title={r.name}
                               style={{
                                 display: 'inline-flex',
                                 alignItems: 'center',
                                 gap: '3px',
                                 padding: '3px 8px',
                                 borderRadius: '6px',
                                 fontSize: '0.62rem',
                                 fontWeight: 900,
                                 cursor: 'pointer',
                                 transition: 'all 0.15s ease',
                                 border: isSelected ? `1.5px solid ${brandColor}` : '1.5px solid #e5e5ea',
                                 background: isSelected ? `${brandColor}12` : '#f8fafc',
                                 color: isSelected ? brandColor : '#48484a',
                                 boxShadow: isSelected ? `0 2px 6px ${brandColor}15` : 'none'
                               }}
                             >
                               <span style={{ fontSize: '0.68rem', color: isSelected ? brandColor : '#8e8e93' }}>★</span>
                               {r.name.length > 10 ? r.name.substring(0, 10) + '...' : r.name}
                             </button>
                           );
                        })}
                      </div>
                    )}
                  </h3>
                </div>

                {/* Week Pagination and Today Button */}
                <div className="calendar-controls-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => {
                      const today = new Date();
                      const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                      setBookingDate(dateStr);
                    }}
                    className="calendar-today-btn"
                    style={{
                      border: '1px solid #e5e5ea',
                      background: 'white',
                      cursor: 'pointer',
                      padding: '8px 14px',
                      borderRadius: '12px',
                      color: '#1c1c1e',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      height: '38px',
                      minWidth: '70px'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f2f7'; e.currentTarget.style.borderColor = brandColor; e.currentTarget.style.color = brandColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e5e5ea'; e.currentTarget.style.color = '#1c1c1e'; }}
                  >
                    Heute
                  </button>

                  <div className="calendar-week-pagination" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f2f2f7', padding: '4px 10px', borderRadius: '14px', border: '1px solid #e5e5ea', height: '38px' }}>
                    <button
                      onClick={() => changeWeek(-1)}
                      className="calendar-week-chevron-btn"
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#8e8e93',
                        borderRadius: '10px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="calendar-week-label" style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1c1c1e', minWidth: '155px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span style={{ color: brandColor, fontWeight: 900 }}>KW {getCalendarWeek(bookingDate)}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#636366' }}>({getWeekRange(bookingDate)})</span>
                    </span>
                    <button
                      onClick={() => changeWeek(1)}
                      className="calendar-week-chevron-btn"
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#8e8e93',
                        borderRadius: '10px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar Grid Container */}
              <div style={{ overflowX: 'auto', width: '100%' }} className="custom-calendar-scrollbar">
                <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #e5e5ea', borderRadius: '16px', overflow: 'hidden', minWidth: '950px' }}>
                  {/* Header Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', background: '#ffffff', borderBottom: '1px solid #e5e5ea' }}>
                    <div style={{ padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#8e8e93', textAlign: 'center', borderRight: '1px solid #e5e5ea' }}>Zeit</div>
                    {DAYS_OF_WEEK.map((day, dayIdx) => {
                      const isToday = isTodayInWeek(bookingDate) && isDayToday(dayIdx, bookingDate);
                      return (
                        <div 
                          key={day.value} 
                          style={{ 
                            padding: '12px 4px', 
                            fontSize: '0.74rem', 
                            fontWeight: 800, 
                            color: isToday ? brandColor : '#1c1c1e', 
                            textAlign: 'center', 
                            borderRight: dayIdx < 6 ? '1px solid #e5e5ea' : 'none',
                            position: 'relative',
                            background: isToday ? `${brandColor}04` : '#ffffff'
                          }}
                        >
                          {isToday && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: brandColor }} />
                          )}
                          <div>{day.label}</div>
                          <div style={{ fontSize: '0.65rem', color: isToday ? brandColor : '#8e8e93', marginTop: '3px', fontWeight: 700 }}>
                            {getWeekdayDate(dayIdx, bookingDate)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Hourly Rows */}
                  <div ref={calendarScrollRef} className="custom-calendar-scrollbar" style={{ display: 'flex', flexDirection: 'column', maxHeight: '420px', overflowY: 'auto', position: 'relative' }}>
                    {TIME_SLOTS.map((hour) => {
                      const slotHourInt = parseInt(hour.split(':')[0]);
                      
                      return (
                        <div key={hour} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '1px solid #f2f2f7', minHeight: '56px', position: 'relative' }}>
                          {/* Time cell - Apple Minimalist Style */}
                          <div style={{ padding: '10px 4px', fontSize: '0.72rem', fontWeight: 700, color: '#8e8e93', textAlign: 'center', background: '#ffffff', borderRight: '1px solid #e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {hour}
                          </div>
                          {/* Day cells */}
                          {DAYS_OF_WEEK.map((day, dayIdx) => {
                            const slotBookings = getBookingsForSlot(dayIdx, hour);
                            const isToday = isTodayInWeek(bookingDate) && isDayToday(dayIdx, bookingDate);
                            const currentHour = new Date().getHours();
                            const currentMin = new Date().getMinutes();
                            const showTimeIndicator = isToday && currentHour === slotHourInt;
                            const isDraggedOver = dragOverCell && dragOverCell.dayIdx === dayIdx && dragOverCell.hour === hour;

                            return (
                              <div
                                key={day.value}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCellClick(dayIdx, hour, e);
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  handleCellDoubleClick(dayIdx, hour);
                                }}
                                onDragOver={(e) => {

                                  e.preventDefault();
                                  if (!isDraggedOver) {
                                    setDragOverCell({ dayIdx, hour });
                                  }
                                }}
                                onDragLeave={() => {
                                  setDragOverCell(null);
                                }}
                                onDrop={(e) => {
                                  handleDropOnCell(e, dayIdx, hour);
                                }}
                                style={{
                                  padding: '4px',
                                  borderRight: dayIdx < 6 ? '1px solid #f2f2f7' : 'none',
                                  position: 'relative',
                                  background: isDraggedOver 
                                    ? `${brandColor}12` 
                                    : (isToday ? `${brandColor}01` : 'white'),
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '3px',
                                  justifyContent: 'stretch',
                                  cursor: 'pointer',
                                  boxShadow: isDraggedOver ? `inset 0 0 0 2px ${brandColor}` : 'none',
                                  transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
                                }}
                              >
                                {/* Real-time indicator line */}
                                {showTimeIndicator && (
                                  <div style={{ 
                                    position: 'absolute', 
                                    top: `${(currentMin / 60) * 100}%`, 
                                    left: 0, 
                                    right: 0, 
                                    height: '2px', 
                                    background: '#ff453a', 
                                    zIndex: 10,
                                    pointerEvents: 'none',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}>
                                    <div className="pulsing-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff453a', marginLeft: '-4px', boxShadow: '0 0 6px rgba(255, 69, 58, 0.6)' }} />
                                  </div>
                                )}



                                {slotBookings.map((b: any, bIdx: number) => {
                                  const isOwnBooking = b.teacherId === userId || (admin && b.teacherName && b.teacherName.trim().toLowerCase() === `${admin.first_name || ''} ${admin.last_name || ''}`.trim().toLowerCase());
                                  const colWidth = 100 / slotBookings.length;
                                  const colLeft = bIdx * colWidth;
                                  const isSchedule = b.isSchedule;
                                  const isOwnSchedule = isSchedule && isOwnBooking;
                                  const isRescheduled = b.status === 'pending_reschedule' || b.status === 'rescheduled_confirmed';
                                  const hasConflict = isRescheduled && slotBookings.length > 1;
                                  
                                  // Apple Calendar Color Schemes
                                  let bg = 'rgba(142, 142, 147, 0.12)';
                                  let textColor = '#48484a';
                                  let leftAccentColor = '#8e8e93';

                                  if (b.isPreview) {
                                    bg = 'rgba(0, 122, 255, 0.04)';
                                    textColor = '#007aff';
                                    leftAccentColor = '#007aff';
                                  } else if (isRescheduled) {
                                    if (isOwnBooking) {
                                      bg = 'rgba(175, 82, 222, 0.12)';
                                      textColor = '#6d28d9';
                                      leftAccentColor = '#af52de';
                                    } else {
                                      bg = 'rgba(255, 149, 0, 0.12)';
                                      textColor = '#b25e00';
                                      leftAccentColor = '#ff9500';
                                    }
                                  } else if (isSchedule) {
                                    if (b.isApproved) {
                                      bg = 'rgba(52, 199, 89, 0.12)';
                                      textColor = '#1e7a44';
                                      leftAccentColor = '#34c759';
                                    } else {
                                      bg = 'rgba(255, 204, 0, 0.15)';
                                      textColor = '#946600';
                                      leftAccentColor = '#ffcc00';
                                    }
                                  } else {
                                    bg = 'rgba(175, 82, 222, 0.12)';
                                    textColor = '#6d28d9';
                                    leftAccentColor = '#af52de';
                                  }

                                  const [shStr, smStr] = b.startTime.split(':');
                                  const sh = parseInt(shStr) || 0;
                                  const sm = parseInt(smStr) || 0;
                                  const [ehStr, emStr] = b.endTime.split(':');
                                  const eh = parseInt(ehStr) || 0;
                                  const em = parseInt(emStr) || 0;
                                  const durationHrs = (eh * 60 + em - (sh * 60 + sm)) / 60;
                                  const slotH = parseInt(hour.split(':')[0]);
                                  
                                  // Only draw on starting hour slot
                                  if (slotH !== sh) return null;

                                  return (
                                    <div
                                      key={b.id}
                                      onClick={(e) => {
                                        if (b.isPreview) return;
                                        e.stopPropagation();
                                        setSelectedBooking(b);
                                        if (!b.isSchedule) {
                                          // Always populate form for own manual bookings
                                          setBookingDate(b.date);
                                          setBookingStartTime(b.startTime);
                                          setBookingEndTime(b.endTime);
                                          setBookingPurpose(b.purpose || '');
                                          setIsDateFilterActive(true);
                                          setShowMyBookingsOnly(false);
                                        } else if (b.teacherId === userId) {
                                          // Schedule block: use current bookingDate as base
                                          setBookingStartTime(b.startTime);
                                          setBookingEndTime(b.endTime);
                                          setBookingPurpose(b.purpose || '');
                                          setIsDateFilterActive(true);
                                          setShowMyBookingsOnly(false);
                                        }
                                      }}

                                      draggable={isOwnBooking && !isSchedule && !b.isPreview}
                                      onDragStart={(e) => {
                                        if (isOwnBooking && !isSchedule && !b.isPreview) {
                                          handleDragStart(e, b.id);
                                        }
                                      }}
                                      onDragEnd={() => {
                                        setDragOverCell(null);
                                      }}
                                      title={b.isPreview ? `Vorschau: ${b.purpose} (${b.startTime} - ${b.endTime})` : `${b.purpose} (${b.startTime} - ${b.endTime}) - ${b.teacherName}`}
                                      style={{
                                        background: isOwnSchedule && !b.isPreview ? leftAccentColor : bg,
                                        border: b.isPreview ? `2.2px dashed ${leftAccentColor}` : `1px solid ${hasConflict ? '#ff9500' : (isOwnSchedule ? 'rgba(255, 255, 255, 0.15)' : leftAccentColor + '25')}`,
                                        borderLeft: b.isPreview ? `2.2px dashed ${leftAccentColor}` : `3px solid ${hasConflict ? '#ff9500' : (isOwnSchedule ? brandColor : leftAccentColor)}`,
                                        borderRadius: '8px',
                                        padding: '6px 8px',
                                        fontSize: '0.70rem',
                                        fontWeight: 800,
                                        color: isOwnSchedule && !b.isPreview ? '#ffffff' : textColor,
                                        position: 'absolute',
                                        top: `calc(${(sm / 60) * 100}% + 4px)`,
                                        left: `calc(${colLeft}% + 4px)`,
                                        width: `calc(${colWidth}% - 8px)`,
                                        height: `calc(${durationHrs * 100}% - 8px)`,
                                        zIndex: 5,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'flex-start',
                                        boxShadow: b.isPreview ? 'none' : '0 1px 3px rgba(0,0,0,0.02)',
                                        overflow: 'hidden',
                                        cursor: b.isPreview ? 'default' : (isOwnBooking ? 'grab' : 'pointer')
                                      }}
                                    >
                                      
                                      {/* Resize Handles */}
                                      {isOwnBooking && !isSchedule && !b.isPreview && (
                                        <>
                                          <div
                                            onPointerDown={(e) => handleResizeStart(e, b, 'top')}
                                            style={{
                                              position: 'absolute',
                                              top: 0,
                                              left: 5,
                                              right: 0,
                                              height: '6px',
                                              cursor: 'ns-resize',
                                              zIndex: 20,
                                              background: 'transparent'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(109, 40, 217, 0.25)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                          />
                                          <div
                                            onPointerDown={(e) => handleResizeStart(e, b, 'bottom')}
                                            style={{
                                              position: 'absolute',
                                              bottom: 0,
                                              left: 5,
                                              right: 0,
                                              height: '6px',
                                              cursor: 'ns-resize',
                                              zIndex: 20,
                                              background: 'transparent'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(109, 40, 217, 0.25)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                          />
                                        </>
                                      )}

                                      {isRescheduled && !isOwnBooking && (
                                        <div style={{
                                          position: 'absolute',
                                          right: '8px',
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          fontSize: '1.3rem',
                                          fontWeight: 950,
                                          opacity: 0.25,
                                          userSelect: 'none',
                                          pointerEvents: 'none',
                                          fontFamily: 'Urbanist, sans-serif'
                                        }}>
                                          R
                                        </div>
                                      )}

                                      {isSchedule && !isRescheduled && (
                                        <div style={{
                                          position: 'absolute',
                                          bottom: '4px',
                                          left: '50%',
                                          transform: 'translateX(-50%)',
                                          opacity: 0.35,
                                          pointerEvents: 'none',
                                          userSelect: 'none',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center'
                                        }}>
                                          <Lock size={11} />
                                        </div>
                                      )}

                                      {isOwnSchedule && !b.isPreview ? (
                                        <>
                                          <div style={{
                                            background: '#ffffff',
                                            color: '#000000',
                                            padding: '6px 8px',
                                            margin: '-6px -8px 0 -8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2px'
                                          }}>
                                            {/* Time range */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.64rem', fontWeight: 800 }}>
                                              <span style={{ display: 'flex', alignItems: 'center' }}>
                                                <GraduationCap size={10} style={{ marginRight: '3px' }} />
                                                {b.startTime} - {b.endTime}
                                              </span>
                                            </div>
                                            {/* Teacher Name */}
                                            {durationHrs >= 0.75 && (
                                              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', fontWeight: 700 }}>
                                                {b.teacherName}
                                              </div>
                                            )}
                                          </div>
                                          {/* Purpose */}
                                          {durationHrs >= 1.0 && b.purpose && b.purpose.trim().toLowerCase() !== 'eigennutzung' && (
                                            <div style={{ fontSize: '0.64rem', opacity: 0.8, marginTop: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {b.isPreview ? 'Vorschau' : b.purpose}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <>
                                          {/* Time range */}
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.64rem', marginBottom: '4px', fontWeight: 800 }}>
                                            <span style={{ display: 'flex', alignItems: 'center' }}>
                                              {isSchedule && <GraduationCap size={10} style={{ marginRight: '3px' }} />}
                                              {b.startTime} - {b.endTime}{b.isPreview && ' (Vorschau)'}
                                            </span>
                                          </div>

                                          {/* Conflict badge */}
                                          {hasConflict && (
                                            <div style={{
                                              fontSize: '0.58rem',
                                              fontWeight: 900,
                                              textTransform: 'uppercase',
                                              color: '#ff9500',
                                              background: 'rgba(255, 149, 0, 0.12)',
                                              border: '1px solid rgba(255, 149, 0, 0.25)',
                                              padding: '1px 3px',
                                              borderRadius: '3px',
                                              width: 'fit-content'
                                            }}>
                                              ⚠️ Doppelbelegung
                                            </div>
                                          )}

                                          {/* Teacher Name */}
                                          {durationHrs >= 0.75 && (
                                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', fontWeight: 700 }}>
                                              {b.teacherName}
                                            </div>
                                          )}

                                          {/* Purpose */}
                                          {durationHrs >= 1.0 && b.purpose && b.purpose.trim().toLowerCase() !== 'eigennutzung' && (
                                            <div style={{ fontSize: '0.64rem', opacity: 0.8, marginTop: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {b.isPreview ? 'Vorschau' : b.purpose}
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>


            </div>
          </div>

          {/* Right Sidebar: Booking Form OR Meine Buchungen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', alignSelf: 'stretch' }}>
            
            {showMyBookingsOnly ? (
              /* Meine Buchungen (Shown only when showMyBookingsOnly is true) */
              <div 
                className="glass-panel" 
                style={{ 
                  background: 'white', 
                  borderRadius: '24px', 
                  border: '1px solid rgba(0, 0, 0, 0.04)', 
                  padding: '20px', 
                  boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.02), 0 2px 12px -2px rgba(0, 0, 0, 0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1c1c1e', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Meine Buchungen
                    <span style={{ fontSize: '0.72rem', background: 'rgba(175, 82, 222, 0.12)', color: '#af52de', padding: '2px 8px', borderRadius: '8px', fontWeight: 900 }}>
                      {myBookings.length}
                    </span>
                  </h3>

                  <button
                    onClick={() => setShowMyBookingsOnly(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#8e8e93',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px',
                      borderRadius: '50%',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = brandColor; e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#8e8e93'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <ArrowLeft size={16} />
                  </button>
                </div>

                {/* Cancel All Button */}
                {myBookings.length >= 2 && (
                  <button
                    onClick={() => {
                      const allIds = myBookings.flatMap(b => b.ids || [b.id]);
                      handleCancelBooking(allIds);
                    }}
                    style={{
                      background: '#ff453a15',
                      color: '#ff453a',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      marginBottom: '12px',
                      width: '100%',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#ff453a25'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#ff453a15'}
                  >
                    Alle stornieren
                  </button>
                )}

                <div className="custom-calendar-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                  {myBookings.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#8e8e93', fontWeight: 700, textAlign: 'center', padding: '16px', border: '1.5px dashed #e5e5ea', borderRadius: '14px', background: '#f2f2f7' }}>
                      Du hast noch keine Buchungen vorgenommen.
                    </div>
                  ) : (
                    myBookings.map((b: any) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setBookingDate(b.date);
                          setSelectedCampusRoomId(b.roomId);
                          setSelectedBooking(b);
                          setBookingStartTime(b.startTime);
                          setBookingEndTime(b.endTime);
                          setBookingPurpose(b.purpose || '');
                          setIsDateFilterActive(true);
                          setShowMyBookingsOnly(false);
                        }}
                        style={{
                          padding: '12px 14px',
                          background: '#f6f0ff',
                          border: '1.5px solid #af52de20',
                          borderRadius: '14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease, border-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#af52de60';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#af52de20';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a' }}>
                            {new Date(b.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} • {b.startTime} - {b.endTime}
                          </span>
                          <div style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 550, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#6d28d9', fontWeight: 700 }}>
                              {b.roomName}
                            </span>
                            {b.purpose && b.purpose.toLowerCase() !== 'unterricht' && (
                              <span style={{ fontWeight: 500, opacity: 0.85 }}>
                                {` (${b.purpose.replace(/^Unterricht:\s*/i, '')})`}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancelBooking(b.ids || b.id); }}
                          style={{
                            background: '#ff453a15',
                            color: '#ff453a',
                            border: 'none',
                            borderRadius: '10px',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          title="Buchung stornieren"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Booking Form (Shown when showMyBookingsOnly is false) */
              <div 
                className="glass-panel" 
                onClickCapture={() => setShowPreviewField(true)}
                onFocusCapture={() => setShowPreviewField(true)}
                style={{ 
                  background: isEditing ? '#f6f0ff' : 'white', 
                  borderRadius: '18px', 
                  border: isEditing ? '1.5px solid #af52de40' : '1px solid rgba(0, 0, 0, 0.04)', 
                  padding: '14px 16px', 
                  boxShadow: isEditing 
                    ? '0 8px 32px rgba(175, 82, 222, 0.08), 0 2px 12px rgba(175, 82, 222, 0.04)' 
                    : '0 4px 24px -4px rgba(0, 0, 0, 0.02), 0 2px 12px -2px rgba(0, 0, 0, 0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.3s ease'
                }}
              >

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0, gap: '10px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1c1c1e', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                    <span style={{ color: brandColor }}>⚡</span> Raum buchen
                  </h3>
                  <select
                    value={selectedCampusRoomId || ''}
                    onChange={(e) => {
                      setSelectedCampusRoomId(e.target.value);
                    }}
                    className="premium-input"
                    style={{ 
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      background: '#f2f2f7', 
                      color: '#1c1c1e', 
                      height: '28px', 
                      padding: '2px 24px 2px 10px', 
                      fontSize: '0.74rem', 
                      fontWeight: 700,
                      width: 'auto', 
                      minWidth: '100px', 
                      flexShrink: 1,
                      border: '1px solid rgba(0, 0, 0, 0.04)',
                      borderRadius: '8px',
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                      backgroundSize: '10px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {rooms.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Datum</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => {
                        setBookingDate(e.target.value);
                        setIsDateFilterActive(true);
                      }}
                      onClick={() => setIsDateFilterActive(true)}
                      onFocus={() => setIsDateFilterActive(true)}
                      className="premium-input"
                      style={{
                        borderColor: isDateFilterActive ? '#ffe699' : '#e5e5ea',
                        background: isDateFilterActive ? '#ffffff' : '#f2f2f7',
                        color: isDateFilterActive ? '#1c1c1e' : '#8e8e93',
                        boxShadow: isDateFilterActive ? '0 0 0 3px rgba(255, 230, 153, 0.25)' : 'none',
                        height: '36px',
                        padding: '6px 10px',
                        fontSize: '0.78rem',
                        flex: 1
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPreviewField(prev => !prev);
                      }}
                      style={{
                        height: '36px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: showPreviewField ? brandColor : '#e5e5ea',
                        background: showPreviewField ? 'rgba(0, 122, 255, 0.08)' : '#ffffff',
                        color: showPreviewField ? brandColor : '#8e8e93',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      👁️ Vorschau
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Von</label>
                    <select
                      value={bookingStartTime}
                      onChange={(e) => {
                        setBookingStartTime(e.target.value);
                        setIsDateFilterActive(true);
                      }}
                      onFocus={() => setIsDateFilterActive(true)}
                      className="premium-input"
                      style={{
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        borderColor: isDateFilterActive ? '#ffe699' : 'rgba(0, 0, 0, 0.06)',
                        background: isDateFilterActive ? '#ffffff' : '#f2f2f7',
                        color: '#1c1c1e',
                        boxShadow: isDateFilterActive ? '0 0 0 3px rgba(255, 230, 153, 0.25)' : 'none',
                        height: '36px',
                        padding: '6px 28px 6px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        borderRadius: '10px',
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                        backgroundSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {Array.from({ length: 27 }, (_, i) => {
                        const min = i * 30 + 480;
                        const hh = String(Math.floor(min / 60)).padStart(2, '0');
                        const mm = String(min % 60).padStart(2, '0');
                        return `${hh}:${mm}`;
                      }).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Bis</label>
                    <select
                      value={bookingEndTime}
                      onChange={(e) => {
                        setBookingEndTime(e.target.value);
                        setIsDateFilterActive(true);
                      }}
                      onFocus={() => setIsDateFilterActive(true)}
                      className="premium-input"
                      style={{
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        borderColor: isDateFilterActive ? '#ffe699' : 'rgba(0, 0, 0, 0.06)',
                        background: isDateFilterActive ? '#ffffff' : '#f2f2f7',
                        color: '#1c1c1e',
                        boxShadow: isDateFilterActive ? '0 0 0 3px rgba(255, 230, 153, 0.25)' : 'none',
                        height: '36px',
                        padding: '6px 28px 6px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        borderRadius: '10px',
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                        backgroundSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {Array.from({ length: 27 }, (_, i) => {
                        const min = (i + 1) * 30 + 480;
                        const hh = String(Math.floor(min / 60)).padStart(2, '0');
                        const mm = String(min % 60).padStart(2, '0');
                        return `${hh}:${mm}`;
                      }).filter(t => t > bookingStartTime).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Duration Quick Buttons */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '-2px' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(30)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '1px solid #e5e5ea',
                      borderRadius: '8px',
                      padding: '4px 6px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      color: '#8e8e93',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = brandColor; e.currentTarget.style.color = brandColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e5ea'; e.currentTarget.style.color = '#8e8e93'; }}
                  >
                    30 Min.
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(45)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '1px solid #e5e5ea',
                      borderRadius: '8px',
                      padding: '4px 6px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      color: '#8e8e93',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = brandColor; e.currentTarget.style.color = brandColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e5ea'; e.currentTarget.style.color = '#8e8e93'; }}
                  >
                    45 Min.
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(60)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '1px solid #e5e5ea',
                      borderRadius: '8px',
                      padding: '4px 6px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      color: '#8e8e93',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = brandColor; e.currentTarget.style.color = brandColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e5ea'; e.currentTarget.style.color = '#8e8e93'; }}
                  >
                    60 Min.
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Notiz (nur für dich sichtbar)</label>
                  <input
                    placeholder="z.B. Klavierübung, Setup vorbereiten..."
                    value={bookingPurpose}
                    onChange={(e) => setBookingPurpose(e.target.value)}
                    className="premium-input"
                    style={{ height: '36px', padding: '6px 10px', fontSize: '0.78rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Buchungs-Typ</label>
                  <div style={{ display: 'flex', background: '#f2f2f7', borderRadius: '8px', padding: '2px', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(false)}
                      style={{
                        flex: 1,
                        background: !isRecurring ? '#ffffff' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 0',
                        fontSize: '0.74rem',
                        fontWeight: !isRecurring ? 800 : 600,
                        color: !isRecurring ? '#1c1c1e' : '#8e8e93',
                        boxShadow: !isRecurring ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      Einzeltermin
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(true)}
                      style={{
                        flex: 1,
                        background: isRecurring ? '#ffffff' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 0',
                        fontSize: '0.74rem',
                        fontWeight: isRecurring ? 800 : 600,
                        color: isRecurring ? '#1c1c1e' : '#8e8e93',
                        boxShadow: isRecurring ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      Serientermin (wöchentlich)
                    </button>
                  </div>
                </div>

                {isRecurring && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Wochenrhythmus</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={recurringInterval}
                        onChange={(e) => setRecurringInterval(Math.max(1, parseInt(e.target.value) || 1))}
                        className="premium-input"
                        style={{ height: '36px', padding: '6px 10px', fontSize: '0.78rem', width: '80px', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '0.74rem', color: '#8e8e93', fontWeight: 600 }}>
                        {recurringInterval === 1 ? 'jede Woche (Standard)' : `alle ${recurringInterval} Wochen`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Overlap Warning Badge */}
                {selectedRoom && isRoomOccupied(selectedRoom.id) && (
                  <div style={{
                    background: '#fff9e6',
                    border: '1px solid #ffeeba',
                    borderRadius: '10px',
                    padding: '6px 10px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    lineHeight: '1.2'
                  }}>
                    <span>⚠️ Raum im Zeitraum belegt. Buchung wird parallel angezeigt.</span>
                  </div>
                )}

                <button
                  onClick={() => selectedRoom && (isEditing ? handleUpdateBooking() : handleAddBooking(selectedRoom.id))}
                  disabled={!selectedRoom}
                  style={{
                    background: brandColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: (!selectedRoom) ? 'not-allowed' : 'pointer',
                    opacity: (!selectedRoom) ? 0.45 : 1,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '38px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedRoom) {
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedRoom) {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  {!selectedRoom 
                    ? 'Wähle einen Raum' 
                    : isEditing 
                      ? (selectedBooking?.isSchedule ? 'Als Einzeltermin übernehmen' : 'Änderung speichern')
                      : `${selectedRoom.name} buchen`}

                </button>

              </div>
            )}
          </div>
        </div>
      </div>
    );
  };  const renderGroovelabRoomsTab = () => {
    const groovelabBrandColor = '#eab308';
    
    return (
      <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ 
            background: 'linear-gradient(135deg, #ffffff, #f8fafc)', 
            border: '1px solid #e2e8f0', 
            borderRadius: '24px', 
            padding: '24px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '8px',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: `${groovelabBrandColor}15`, color: groovelabBrandColor, padding: '14px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 20px -6px ${groovelabBrandColor}30` }}>
                <Box size={28} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  Räume & Übeplätze
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  Verwalte deine Räume und ordne Kiosk-Stationen zu
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>{rooms.length}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Räume</div>
              </div>
              <div style={{ width: '1px', height: '32px', background: '#cbd5e1' }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>{stations.length}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>iPads Gesamt</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
            {rooms.map((room, index) => (
              <div 
                key={room.id} 
                className="glass-panel" 
                draggable
                onDragStart={e => handleRoomDragStart(e, room.id)}
                onDragOver={handleRoomDragOver}
                onDragEnter={e => handleRoomDragEnter(e, room.id)}
                onDragLeave={handleRoomDragLeave}
                onDrop={e => handleRoomDrop(e, room.id)}
                onDragEnd={handleRoomDragEnd}
                style={{ 
                  padding: '24px', 
                  background: 'white', 
                  borderRadius: '24px', 
                  border: dragOverRoomId === room.id ? `2px dashed ${groovelabBrandColor}` : '1px solid #f1f5f9',
                  opacity: draggedRoomId === room.id ? 0.4 : 1,
                  cursor: 'grab',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Kopfzeile: Hauptinformationen & Aktionen */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <GripVertical size={18} color="#cbd5e1" style={{ cursor: 'grab' }} />
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${groovelabBrandColor}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box size={20} color={groovelabBrandColor} />
                      </div>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                      {index + 1}. {room.name}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setCustomizingRoom(room)} style={{ padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color={groovelabBrandColor} /> Layout
                    </button>
                    <button onClick={() => triggerBatchAddStations(room.id)} style={{ padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: groovelabBrandColor, cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Plus size={14} /> iPad
                    </button>
                  </div>
                </div>

                {/* Fußzeile: Sekundäre Einstellungen (Geofence) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderTop: '1px solid #f8fafc', paddingTop: '16px' }}>
                  {/* Linke Seite: Geofence Tags & Löschen-Link */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {(room.geofence_points || []).map((pt: any, idx: number) => (
                      <div key={idx} style={{ 
                        background: '#fef9c3', 
                        border: '1px solid #fef08a', 
                        borderRadius: '8px', 
                        padding: '6px 10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '0.7rem',
                        color: '#854d0e',
                        fontWeight: 700
                      }}>
                        <MapPin size={10} /> Punkt {idx + 1}
                        <button 
                          onClick={() => handleDeleteGeofencePoint(room.id, idx)}
                          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                          title="Punkt löschen"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    
                    {(room.geofence_points?.length > 0 || room.latitude) && (
                      <button 
                        onClick={() => handleClearGeofencePoints(room.id)}
                        style={{ background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', padding: '6px' }}
                      >
                        Alle löschen
                      </button>
                    )}
                  </div>

                  {/* Rechte Seite: Geofence Kontrollen (Scan / Manuell) */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={() => handleAddGeofencePoint(room.id)}
                      style={{ 
                        background: '#fffbeb', 
                        border: '1px dashed #fcd34d', 
                        borderRadius: '8px', 
                        padding: '6px 10px', 
                        color: '#92400e', 
                        fontSize: '0.7rem', 
                        fontWeight: 800, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Aktuellen Standort scannen"
                    >
                      <MapPin size={12} /> Scan
                    </button>

                    <button 
                      onClick={() => setShowManualInput(showManualInput === room.id ? null : room.id)}
                      style={{ 
                        background: '#f8fafc', 
                        border: '1px dashed #cbd5e1', 
                        borderRadius: '8px', 
                        padding: '6px 10px', 
                        color: '#64748b', 
                        fontSize: '0.7rem', 
                        fontWeight: 800, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={12} /> Manuell
                    </button>

                    {showManualInput === room.id && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', animation: 'fadeIn 0.2s' }}>
                        <input 
                          placeholder="Lat, Lng" 
                          value={manualCoords[room.id] || ''} 
                          onChange={e => setManualCoords({...manualCoords, [room.id]: e.target.value})}
                          style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.7rem', width: '140px' }} 
                        />
                        <button 
                          onClick={() => {
                            const parts = manualCoords[room.id]?.split(',').map(s => s.trim());
                            if (parts?.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
                              handleAddGeofencePoint(room.id, Number(parts[0]), Number(parts[1]));
                              setManualCoords({...manualCoords, [room.id]: ''});
                              setShowManualInput(null);
                            } else {
                              alert('Format: 47.123, 7.456');
                            }
                          }}
                          style={{ background: groovelabBrandColor, color: 'white', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Set
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stations
                    .filter(s => s.room_id === room.id)
                    .sort((a, b) => {
                      const aIsLehrer = a.name.toLowerCase() === 'lehrer ipad';
                      const bIsLehrer = b.name.toLowerCase() === 'lehrer ipad';
                      if (aIsLehrer && !bIsLehrer) return -1;
                      if (!aIsLehrer && bIsLehrer) return 1;
                      return 0;
                    })
                    .map(station => (
                      <div key={station.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, color: '#475569' }}>
                          <Tablet size={16} color={getStationColor(station.name)} /> {station.name}
                        </div>
                        {station.name.toLowerCase() !== 'lehrer ipad' && (
                          <button onClick={() => handleDeleteStation(station.id)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  {stations.filter(s => s.room_id === room.id).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8125rem', border: '1px dashed #e2e8f0', borderRadius: '14px' }}>Keine Übeplätze definiert.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderRoomsTab = () => {
    return activePlatform === 'groovelab' ? renderGroovelabRoomsTab() : renderCampusRoomsTab();
  };

  const renderSongsTab = () => {
    const brandColor = '#fbbc05';
    const filteredLehrwerke = lehrwerke.filter(item => 
      item.title.toLowerCase().includes(songSearch.toLowerCase()) || 
      (item.author || '').toLowerCase().includes(songSearch.toLowerCase())
    );

    const handleAddLehrwerkSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (bulkModeLehrwerke) {
        const lines = bulkTextLehrwerke.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return;

        const insertPayloads = lines.map(line => {
          let title = line;
          let author = null;
          let totalPages = 50;

          if (line.includes(' - ')) {
            const parts = line.split(' - ');
            title = parts[0].trim();
            if (parts.length === 2) {
              const second = parts[1].trim();
              if (/^\d+$/.test(second)) {
                totalPages = parseInt(second, 10);
              } else {
                author = second;
              }
            } else if (parts.length >= 3) {
              author = parts[1].trim();
              totalPages = parseInt(parts[2].trim(), 10) || 50;
            }
          }

          return {
            title,
            author,
            total_pages: totalPages,
            school_id: admin?.school_id,
            teacher_id: userId
          };
        });

        const { data, error } = await supabase
          .from('lehrwerke')
          .insert(insertPayloads)
          .select();

        if (error) {
          alert('Fehler beim Sammel-Import: ' + error.message);
        } else if (data) {
          const mapped = data.map((d: any) => ({
            ...d,
            totalPages: d.total_pages || 50
          }));
          setLehrwerke(prev => [...prev, ...mapped]);
          setShowAddLehrwerk(false);
          setBulkModeLehrwerke(false);
          setBulkTextLehrwerke('');
        }
        return;
      }

      if (!newLehrwerk.title) return;
      
      const insertPayload = {
        title: newLehrwerk.title,
        author: newLehrwerk.author || null,
        total_pages: Number(newLehrwerk.totalPages) || 50,
        school_id: admin?.school_id,
        teacher_id: userId
      };

      const { data, error } = await supabase
        .from('lehrwerke')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error("Error creating Lehrwerk:", error);
        return;
      }

      if (data) {
        const created = {
          ...data,
          totalPages: data.total_pages || 50
        };
        setLehrwerke(prev => [...prev, created]);
        setShowAddLehrwerk(false);
        setNewLehrwerk({ title: '', author: '', totalPages: 50 });
      }
    };

    const handleEditLehrwerkSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingLehrwerk || !editingLehrwerk.title) return;

      const updatePayload = {
        title: editingLehrwerk.title,
        author: editingLehrwerk.author || null,
        total_pages: Number(editingLehrwerk.totalPages) || 50
      };

      const { error } = await supabase
        .from('lehrwerke')
        .update(updatePayload)
        .eq('id', editingLehrwerk.id);

      if (error) {
        console.error("Error updating Lehrwerk:", error);
        return;
      }

      setLehrwerke(prev => prev.map(item => item.id === editingLehrwerk.id ? { ...item, ...updatePayload, totalPages: updatePayload.total_pages } : item));
      setEditingLehrwerk(null);
    };

    const handleDeleteLehrwerk = async (id: string) => {
      const { error } = await supabase
        .from('lehrwerke')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting Lehrwerk:", error);
        return;
      }

      setLehrwerke(prev => prev.filter(item => item.id !== id));
      if (editingLehrwerk?.id === id) setEditingLehrwerk(null);
    };

    return (
      <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch', width: '100%', flexWrap: 'wrap' }}>
        {/* Left Side: Main Mediathek Area */}
        <div 
          className="glass-panel" 
          style={{ 
            flex: 1,
            minWidth: '480px',
            background: 'white', 
            borderRadius: '20px', 
            border: '1px solid rgba(0, 0, 0, 0.05)', 
            padding: '24px 30px', 
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '24px' 
          }}
        >
        {/* Header Area */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.85rem', color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontWeight: 900 }}>
              <div style={{ background: `${brandColor}15`, color: brandColor, padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                <Library size={20} />
              </div>
              <span>Songs</span>
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '4px 0 0 0', fontWeight: 600 }}>
              {admin?.role === 'teacher' 
                ? 'Verwalte deine Songs für den Unterricht.' 
                : 'Verwalte alle Songs deiner Musikschule.'}
            </p>
          </div>
        </div>

        {/* Unified Smart Search Field */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            placeholder="Songs nach Titel/Interpret oder Lehrwerke nach Titel/Autor durchsuchen..." 
            value={songSearch}
            onChange={e => setSongSearch(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px 14px 12px 48px', 
              borderRadius: '14px', 
              border: '1px solid #e2e8f0', 
              background: '#f8fafc', 
              fontWeight: 600, 
              fontSize: '0.92rem', 
              outline: 'none', 
              transition: 'all 0.2s',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.01)'
            }}
          />
        </div>

        {/* Two Columns Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: activePlatform === 'campus' ? 'repeat(auto-fit, minmax(420px, 1fr))' : '1fr', 
          gap: '30px', 
          alignItems: 'flex-start' 
        }}>
          {/* Left Column: Songs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Music size={16} color={brandColor} /> Songs ({songs.length})
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddSong(!showAddSong)} 
                style={{ 
                  background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`, 
                  color: '#1e293b', 
                  border: 'none', 
                  padding: '6px 12px', 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.75rem', 
                  fontWeight: 900,
                  boxShadow: `0 4px 10px -3px ${brandColor}40`,
                  transition: 'all 0.2s ease'
                }}
              >
                <Plus size={14} strokeWidth={3} /> Song hinzufügen
              </button>
            </div>

            {showAddSong && (
              <form onSubmit={handleAddSong} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white', borderRadius: '16px', border: `1px solid ${brandColor}20`, boxShadow: '0 8px 24px rgba(0,0,0,0.02)' }}>
                {/* Mode Toggles */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setBulkModeSongs(false)}
                    style={{
                      background: 'none', border: 'none', padding: '4px 8px', fontSize: '0.78rem', fontWeight: !bulkModeSongs ? 800 : 600,
                      color: !bulkModeSongs ? brandColor : '#64748b', borderBottom: !bulkModeSongs ? `2px solid ${brandColor}` : 'none', cursor: 'pointer', outline: 'none'
                    }}
                  >
                    Einzeln hinzufügen
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkModeSongs(true)}
                    style={{
                      background: 'none', border: 'none', padding: '4px 8px', fontSize: '0.78rem', fontWeight: bulkModeSongs ? 800 : 600,
                      color: bulkModeSongs ? brandColor : '#64748b', borderBottom: bulkModeSongs ? `2px solid ${brandColor}` : 'none', cursor: 'pointer', outline: 'none'
                    }}
                  >
                    Sammel-Onboarding
                  </button>
                </div>

                {!bulkModeSongs ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Interpret / Band</label>
                        <input required placeholder="z.B. Nirvana" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Songtitel</label>
                        <input required placeholder="z.B. Smells Like Teenspirit" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                      </div>
                    </div>

                    {activePlatform !== 'campus' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Cloud Link</label>
                        <input placeholder="https://cloud.folder.link..." value={newSong.media_link} onChange={e => setNewSong({...newSong, media_link: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Mehrere Songs eintragen</label>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Format: Interpret - Songtitel (eine Zeile pro Song)</p>
                    <textarea
                      required
                      placeholder={`Nirvana - Smells Like Teen Spirit\nMichael Jackson - Billie Jean\nColdplay - Yellow`}
                      value={bulkTextSongs}
                      onChange={e => setBulkTextSongs(e.target.value)}
                      style={{
                        width: '100%', height: '140px', padding: '12px', borderRadius: '10px',
                        border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace',
                        outline: 'none', resize: 'none'
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="submit" style={{ flex: 2, background: brandColor, color: '#1e293b', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Importieren / Speichern</button>
                  <button type="button" onClick={() => { setShowAddSong(false); setBulkModeSongs(false); setBulkTextSongs(''); }} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>Abbrechen</button>
                </div>
              </form>
            )}

            {editingSong && (
              <form onSubmit={handleUpdateSong} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.02)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0369a1', margin: 0 }}>Song bearbeiten</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Interpret</label>
                    <input required placeholder="Interpret" value={editingSong.artist} onChange={e => setEditingSong({...editingSong, artist: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Titel</label>
                    <input required placeholder="Titel" value={editingSong.title} onChange={e => setEditingSong({...editingSong, title: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ flex: 2, background: brandColor, color: '#1e293b', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Speichern</button>
                  <button type="button" onClick={() => setEditingSong(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>Abbrechen</button>
                </div>
              </form>
            )}

            {/* Songs List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {songs.filter(song => {
                const matchesSearch = songSearch === '' || 
                  song.title?.toLowerCase().includes(songSearch.toLowerCase()) || 
                  song.artist?.toLowerCase().includes(songSearch.toLowerCase());
                
                const matchesPlatform = activePlatform === 'campus' 
                  ? song.is_campus_active 
                  : song.is_groovelab_active;
                  
                return matchesSearch && matchesPlatform;
              }).map(song => {
                const lwColor = getSongColor(song.title || '');
                const coverBg = `linear-gradient(135deg, ${lwColor.from} 0%, ${lwColor.to} 100%)`;
                return (
                  <div key={song.id} className="glass-panel hover-scale" 
                    onClick={() => {
                      setSelectedSongForDetail(song);
                      fetchSongAssignments(song.id);
                      setStudentDetailSearch('');
                    }}
                    style={{ 
                      padding: '14px 18px', 
                      display: 'flex', 
                      gap: '12px',
                      alignItems: 'center', 
                      background: 'white', 
                      borderRadius: '24px', 
                      border: editingSong?.id === song.id ? `2px solid ${brandColor}` : '1px solid #cbd5e1', 
                      borderLeft: `5px solid ${lwColor.from}`,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)', 
                      transition: 'all 0.2s ease',
                      minHeight: '92px',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Pink/Peach Sleeve + Vinyl peeking out Cover Icon */}
                    <div style={{ position: 'relative', width: '68px', height: '56px', flexShrink: 0 }}>
                      {/* Vinyl record peeking out from the right */}
                      <div style={{
                        position: 'absolute',
                        right: '4px',
                        top: '5px',
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: '#090a0f',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1
                      }}>
                        {/* Center hole/label */}
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: lwColor.to, opacity: 0.45 }} />
                      </div>
                      {/* Cover Sleeve */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '56px',
                        height: '56px',
                        background: coverBg,
                        borderRadius: '16px',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                        border: `1px solid ${lwColor.text}18`
                      }}>
                        <span style={{ fontSize: '28px', lineHeight: 1, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.1))' }}>🎵</span>
                      </div>
                    </div>

                    {/* Title and Artist */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.15rem', letterSpacing: '-0.02em', lineHeight: '1.2' }}>{song.title}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>von {song.artist}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '16px' }}>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        const inst = song.instrumentation || {};
                        const norm: any = { 'E-Gitarre': 0, 'E-Bass': 0, 'E-Drums': 0, 'E-Piano': 0 };
                        Object.entries(inst).forEach(([k, v]) => {
                          const lower = k.toLowerCase();
                          if (lower === 'guitar' || lower === 'e-gitarre') norm['E-Gitarre'] = v;
                          else if (lower === 'bass' || lower === 'e-bass') norm['E-Bass'] = v;
                          else if (lower === 'drums' || lower === 'e-drums') norm['E-Drums'] = v;
                          else if (lower === 'piano' || lower === 'keys' || lower === 'e-piano') norm['E-Piano'] = v;
                          else if (lower === 'vocals' || lower === 'gesang') norm['Vocals'] = v;
                          else norm[k] = v;
                        });
                        setEditingSong({...song, instrumentation: norm});
                      }} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', width: '44px', height: '44px', borderRadius: '12px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={18} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteSong(song.id); }} style={{ background: '#fff1f2', border: '1px solid #fecaca', width: '44px', height: '44px', borderRadius: '12px', cursor: 'pointer', color: '#ef4444', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={18} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Lehrwerke */}
          {activePlatform === 'campus' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Library size={16} color={brandColor} /> Lehrwerke ({lehrwerke.length})
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setShowAddLehrwerk(!showAddLehrwerk);
                  setEditingLehrwerk(null);
                }} 
                style={{ 
                  background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`, 
                  color: 'white', 
                  border: 'none', 
                  padding: '6px 12px', 
                  borderRadius: '10px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.75rem', 
                  fontWeight: 900,
                  boxShadow: `0 4px 10px -3px ${brandColor}40`,
                  transition: 'all 0.2s ease'
                }}
              >
                <Plus size={14} strokeWidth={3} /> Lehrwerk hinzufügen
              </button>
            </div>

            {showAddLehrwerk && (
              <form onSubmit={handleAddLehrwerkSubmit} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white', borderRadius: '16px', border: `1px solid ${brandColor}20`, boxShadow: '0 8px 24px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Neues Lehrwerk</h4>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setBulkModeLehrwerke(false)}
                      style={{
                        background: 'none', border: 'none', padding: '4px 8px', fontSize: '0.78rem', fontWeight: !bulkModeLehrwerke ? 800 : 600,
                        color: !bulkModeLehrwerke ? brandColor : '#64748b', borderBottom: !bulkModeLehrwerke ? `2px solid ${brandColor}` : 'none', cursor: 'pointer', outline: 'none'
                      }}
                    >
                      Einzeln
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkModeLehrwerke(true)}
                      style={{
                        background: 'none', border: 'none', padding: '4px 8px', fontSize: '0.78rem', fontWeight: bulkModeLehrwerke ? 800 : 600,
                        color: bulkModeLehrwerke ? brandColor : '#64748b', borderBottom: bulkModeLehrwerke ? `2px solid ${brandColor}` : 'none', cursor: 'pointer', outline: 'none'
                      }}
                    >
                      Sammel-Onboarding
                    </button>
                  </div>
                </div>

                {!bulkModeLehrwerke ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>Titel</label>
                      <input required placeholder="z.B. GrooveLab Drums Vol. 2" value={newLehrwerk.title} onChange={e => setNewLehrwerk({...newLehrwerk, title: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>Autor</label>
                      <input placeholder="z.B. Max Mustermann" value={newLehrwerk.author || ''} onChange={e => setNewLehrwerk({...newLehrwerk, author: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>Seiten</label>
                      <input type="number" min="1" max="1000" placeholder="50" value={newLehrwerk.totalPages} onChange={e => setNewLehrwerk({...newLehrwerk, totalPages: Number(e.target.value) || 50})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Mehrere Lehrwerke eintragen</label>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Format: Titel - Autor - Seitenzahl (eine Zeile pro Lehrwerk)</p>
                    <textarea
                      required
                      placeholder={`GrooveLab Drums Vol. 2 - Max Mustermann - 50\nGitarrenschule 1 - Hans Müller - 64\nKlavierfibel - Unbekannt - 40`}
                      value={bulkTextLehrwerke}
                      onChange={e => setBulkTextLehrwerke(e.target.value)}
                      style={{
                        width: '100%', height: '140px', padding: '12px', borderRadius: '10px',
                        border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace',
                        outline: 'none', resize: 'none'
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Importieren / Speichern</button>
                  <button type="button" onClick={() => { setShowAddLehrwerk(false); setBulkModeLehrwerke(false); setBulkTextLehrwerke(''); }} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>Abbrechen</button>
                </div>
              </form>
            )}

            {editingLehrwerk && (
              <form onSubmit={handleEditLehrwerkSubmit} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'white', borderRadius: '16px', border: `1px solid ${brandColor}20`, boxShadow: '0 8px 24px rgba(0,0,0,0.02)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Lehrwerk bearbeiten</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>Titel</label>
                    <input required placeholder="z.B. GrooveLab Drums Vol. 2" value={editingLehrwerk.title} onChange={e => setEditingLehrwerk({...editingLehrwerk, title: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>Autor</label>
                    <input placeholder="z.B. Max Mustermann" value={editingLehrwerk.author || ''} onChange={e => setEditingLehrwerk({...editingLehrwerk, author: e.target.value})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>Seiten</label>
                    <input type="number" min="1" max="1000" placeholder="50" value={editingLehrwerk.totalPages || 50} onChange={e => setEditingLehrwerk({...editingLehrwerk, totalPages: Number(e.target.value) || 50})} style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', fontWeight: 600 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Speichern</button>
                  <button type="button" onClick={() => setEditingLehrwerk(null)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}>Abbrechen</button>
                </div>
              </form>
            )}

            {/* Lehrwerke List (1 element per line) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              {filteredLehrwerke.map(item => {
                const gradient = getLehrwerkColor(item.title);
                return (
                  <div 
                    key={item.id} 
                    className="glass-panel hover-scale" 
                    onClick={() => {
                      setSelectedLehrwerkForDetail(item);
                      setStudentDetailSearch('');
                    }}
                    style={{ 
                      padding: '14px 18px', 
                      background: 'white', 
                      display: 'flex', 
                      gap: '12px', 
                      alignItems: 'center', 
                      borderRadius: '24px', 
                      border: editingLehrwerk?.id === item.id ? `2px solid ${brandColor}` : '1px solid #e2e8f0', 
                      borderLeft: `5px solid ${gradient.from}`,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      minHeight: '92px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ 
                      width: '44px', 
                      height: '58px', 
                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`, 
                      borderRadius: '6px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: gradient.text, 
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                      flexShrink: 0
                    }}>
                      <BookOpen size={18} color={gradient.text} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</h4>
                      {item.author && <p style={{ margin: '0 0 2px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>von {item.author}</p>}
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>📖 {item.totalPages || 50} Seiten</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLehrwerk(item);
                          setShowAddLehrwerk(false);
                        }}
                        style={{ 
                          background: '#f8fafc', 
                          border: '1px solid #e2e8f0', 
                          width: '44px', 
                          height: '44px', 
                          borderRadius: '12px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          cursor: 'pointer', 
                          color: '#64748b', 
                          transition: 'all 0.2s' 
                        }}
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLehrwerk(item.id);
                        }} 
                        style={{ 
                          background: '#fff1f2', 
                          border: 'none', 
                          width: '44px', 
                          height: '44px', 
                          borderRadius: '12px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          cursor: 'pointer', 
                          color: '#ef4444', 
                          transition: 'all 0.2s' 
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      </div>

    </div>
  );
};

  const renderStatsTab = () => {
    if (!stats) return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ fontSize: '1.2rem', color: '#64748b', fontWeight: 600 }}>Lade Statistiken...</div>
      </div>
    );

    // Format minutes to hours/minutes
    const formatMins = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h === 0) return `${m} Min.`;
      return `${h} Std. ${m} Min.`;
    };

    // Formatted reset date
    const resetFormatted = stats.resetDateStr 
      ? new Date(stats.resetDateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;

    return (
      <div style={{ marginTop: '0px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Top Header Card */}
        <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${brandColor}15`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Akademie-Statistiken</h2>
              <p style={{ color: '#64748b', margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Echtzeit-Einblicke in die Übe-Aktivität und Repertoire-Erfolge deiner Schule.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {[
              { label: 'Schüler Gesamt', value: stats.studentCount, icon: Users, color: '#10b981', bg: '#f0fdf4' },
              { label: 'Songs in Library', value: stats.songCount, icon: Music, color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Team-Mitglieder', value: teachers.length, icon: Shield, color: '#8b5cf6', bg: '#f5f3ff' },
              { 
                label: 'Zeit im Lab', 
                value: formatMins(stats.labMins), 
                icon: Clock, 
                color: '#f59e0b', 
                bg: '#fffbeb', 
                subText: resetFormatted ? `Seit Reset: ${resetFormatted}` : 'Seit Installation' 
              }
            ].map((stat, idx) => (
              <div key={idx} style={{ padding: '24px', background: stat.bg, borderRadius: '24px', border: `1px solid ${stat.color}15`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'white', color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                    <stat.icon size={18} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', marginTop: '12px' }}>{stat.value}</div>
                  {stat.subText && (
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a1a1aa', marginTop: '4px' }}>{stat.subText}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Challenges & Wochentage Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
          
          {/* Left: Challenges per Instrument */}
          <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏆</span> Gemeisterte Challenges (Stage Ready)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'center' }}>
              {[
                { name: 'E-Gitarre', value: stats.stageReadyPerInst?.guitar || 0, icon: '🎸', color: '#ef4444' }, // Red
                { name: 'E-Piano / Keys', value: stats.stageReadyPerInst?.keys || 0, icon: '🎹', color: '#a855f7' }, // Purple
                { name: 'E-Drums', value: stats.stageReadyPerInst?.drums || 0, icon: '🥁', color: '#3b82f6' }, // Blue
                { name: 'E-Bass', value: stats.stageReadyPerInst?.bass || 0, icon: '🎸', color: '#eab308' }, // Yellow
                { name: 'Vocals / Gesang', value: stats.stageReadyPerInst?.vocals || 0, icon: '🎤', color: '#ec4899' } // Pink
              ].map((inst, idx) => {
                const maxVal = Math.max(...Object.values(stats.stageReadyPerInst || {}).map(Number), 1);
                const percent = Math.round((inst.value / maxVal) * 100);
                
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 800, color: '#334155' }}>
                        <span style={{ fontSize: '1.1rem' }}>{inst.icon}</span>
                        <span>{inst.name}</span>
                      </div>
                      <span style={{ background: `${inst.color}15`, color: inst.color, padding: '2px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900 }}>
                        {inst.value} Meister
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(3, percent)}%`, height: '100%', background: inst.color, borderRadius: '5px', transition: 'width 1s ease-out' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Weekday Attendance */}
          <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📅</span> Auslastung nach Wochentag
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '220px', padding: '0 10px 10px 10px', borderBottom: '1px solid #e2e8f0' }}>
              {(stats.weekdayData || []).map((dayData: any, idx: number) => {
                const maxMins = Math.max(...(stats.weekdayData || []).map((d: any) => d.mins), 1);
                const heightPercent = Math.round((dayData.mins / maxMins) * 100);

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '40px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: brandColor }}>
                      {dayData.mins}h
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: `${Math.max(6, heightPercent * 1.5)}px`, 
                      maxHeight: '150px',
                      background: `linear-gradient(180deg, ${brandColor} 0%, ${brandColor}60 100%)`, 
                      borderRadius: '8px 8px 0 0',
                      transition: 'all 0.5s ease'
                    }}></div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                      {dayData.day}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginTop: '12px', fontWeight: 600 }}>
              Übe-Stunden aufgeteilt nach Wochentagen.
            </div>
          </div>
        </div>

        {/* Bottom: Leaderboard & Popular Songs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          
          {/* XP Leaderboard */}
          <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔥</span> XP Leaderboard (Top 5 Schüler)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(stats.leaderboard || []).map((user: any, idx: number) => (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b', width: '20px' }}>
                      #{idx + 1}
                    </div>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
                      <img src={user.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    </div>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                      {user.first_name} {user.last_name}
                    </div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)' }}>
                    <Star size={12} fill="white" /> {user.xp} XP
                  </div>
                </div>
              ))}
              {(stats.leaderboard || []).length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem' }}>
                  Noch keine XP gesammelt.
                </div>
              )}
            </div>
          </div>

          {/* Popular Songs */}
          <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎵</span> Beliebteste Songs (Repertoire-Hits)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(stats.topSongs || []).map((song: any, idx: number) => {
                const parts = song.name.split(' - ');
                const title = parts[0];
                const artist = parts[1] || 'Unbekannt';

                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${brandColor}10`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem' }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>{title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{artist}</div>
                      </div>
                    </div>
                    <div style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 850, border: '1px solid #dbeafe' }}>
                      🔥 {song.count} Schüler üben
                    </div>
                  </div>
                );
              })}
              {(stats.topSongs || []).length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem' }}>
                  Noch keine Songs im Schüler-Repertoire.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  };

  const renderIDGalleryTab = () => (
    <div style={{ marginTop: '0px' }}>
      <IDGallery users={[...teachers, ...students]} brandColor={brandColor} onShowQR={setSelectedQRUser} />
    </div>
  );

  const renderSetupTab = () => (
    <div style={{ marginTop: '0px' }}>
      <DeviceSetupScreen 
        rooms={setupRooms} 
        stations={setupStations} 
        brandColor={brandColor} 
        activeSessions={activeSessions}
        students={students}
        school={admin?.schools}
        admin={admin}
        kiosks={kiosks || []}
        onUpdate={() => fetchData()}
        onCleanupPlanning={handleCleanupPlanning}
        onResetPlanning={handleResetAllPlanning}
      />
    </div>
  );

  const renderBatchiPadModal = () => {
    if (!showBatchiPadModal) return null;
    return (
      <div 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 9999, 
          background: 'rgba(0,0,0,0.3)', 
          backdropFilter: 'blur(15px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          animation: 'fadeIn 0.25s ease-out'
        }}
      >
        <div 
          className="glass-panel"
          style={{ 
            background: 'rgba(255, 255, 255, 0.88)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '16px', 
            width: '290px', 
            boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 1px 8px rgba(0,0,0,0.05)',
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            textAlign: 'center',
            overflow: 'hidden',
            paddingTop: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            animation: 'scaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          <div style={{ padding: '0 16px 18px 16px', width: '100%' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#000000', margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>iPads hinzufügen</h3>
            <p style={{ fontSize: '0.82rem', color: '#3a3a3c', margin: '0 0 16px 0', lineHeight: '1.35', fontWeight: 400 }}>
              Wie viele iPads sollen der Reihe nach angelegt werden?
            </p>
            <input 
              type="number"
              min="1"
              max="50"
              value={batchiPadCount}
              onChange={e => setBatchiPadCount(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                width: '100%',
                padding: '7px 10px',
                border: '1px solid rgba(0, 0, 0, 0.15)',
                background: 'rgba(255, 255, 255, 0.65)',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#000000',
                outline: 'none',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
              }}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') executeBatchAddStations();
              }}
            />
          </div>
          <div style={{ display: 'flex', width: '100%', borderTop: '0.5px solid rgba(0, 0, 0, 0.15)' }}>
            <button 
              type="button" 
              onClick={() => setShowBatchiPadModal(null)} 
              style={{ 
                flex: 1, 
                height: '44px', 
                background: 'transparent', 
                border: 'none', 
                borderRight: '0.5px solid rgba(0, 0, 0, 0.15)', 
                color: '#007aff', 
                fontSize: '1.05rem', 
                fontWeight: 400, 
                cursor: 'pointer', 
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Abbrechen
            </button>
            <button 
              type="button" 
              onClick={executeBatchAddStations} 
              style={{ 
                flex: 1, 
                height: '44px', 
                background: 'transparent', 
                border: 'none', 
                color: '#007aff', 
                fontSize: '1.05rem', 
                fontWeight: 600, 
                cursor: 'pointer', 
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStudentDetailModal = () => {
    if (!selectedStudent) return null;

    return (
      <StudentDetailModal 
        student={selectedStudent} 
        onClose={() => setSelectedStudent(null)} 
        onOpenBandProfile={(band) => {
          setEditingBand(band);
          setSelectedStudent(null);
        }}
        activePlatform={activePlatform === "campus" ? "campus" : "groovelab"}
        onSwitchPlatform={(p) => {}}
      />
    );
  };

  const renderQRModal = () => {
    if (!selectedQRUser) return null;

    const saveAsImage = async () => {
      if (!qrCardRef.current) return;
      try {
        const { toJpeg } = await import('html-to-image');
        const dataUrl = await toJpeg(qrCardRef.current, { 
          quality: 0.95, 
          backgroundColor: selectedQRUser.role === 'student' ? '#064e3b' : '#ffffff',
          cacheBust: true,
          pixelRatio: 2,
        });
        const link = document.createElement('a');
        link.download = selectedQRUser.role === 'student' ? `Campus_Pass_${selectedQRUser.first_name}.jpg` : `Groovelab_ID_${selectedQRUser.first_name}.jpg`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Error saving ID:', err);
      }
    };

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setSelectedQRUser(null)}>
        <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }} onClick={e => e.stopPropagation()}>
          {/* Close Button */}
          <button 
            onClick={() => setSelectedQRUser(null)} 
            style={{ position: 'absolute', top: '-60px', right: '0', background: 'rgba(255,255,255,0.1)', border: 'none', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
          >
            <X size={24} />
          </button>

          {/* ID Card Design */}
          <div 
            ref={qrCardRef}
            style={selectedQRUser.role === 'student' ? {
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
            } : { 
              background: 'white', 
              borderRadius: '32px', 
              boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              width: '100%'
            }}
          >
            {selectedQRUser.role === 'student' ? (
              <>
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
                     src={qrAvatarDataUrl || '/avatar_ghost.jpg'} 
                     onLoad={handleQRImageLoad}
                     crossOrigin="anonymous"
                     alt="Avatar" 
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
                         {selectedQRUser.first_name} {selectedQRUser.last_name}
                       </div>
                     </div>
 
                     <div>
                       <span style={{ fontSize: '0.52rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Musikschule</span>
                       <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', opacity: 0.95, marginTop: '1px', lineHeight: '1.2' }}>
                         {qrSchoolName}
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
                    <QRCode value={selectedQRUser.qr_token || selectedQRUser.id || ''} size={135} />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Lanyard Hole Mockup */}
                <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
                  <div style={{ width: '36px', height: '8px', borderRadius: '4px', background: '#0f172a' }}></div>
                </div>

                {/* Status Header */}
                <div style={{ 
                  background: selectedQRUser.role === 'student' ? brandColor : '#f59e0b', 
                  padding: '10px', 
                  textAlign: 'center',
                  textTransform: 'uppercase'
                }}>
                  <div style={{ color: 'white', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.2em' }}>
                    {selectedQRUser.role === 'student' ? 'Member Access' : 'Staff / Coach'}
                  </div>
                </div>

                {/* Content Area */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px 36px 24px', gap: '20px' }}>
                  {/* Portrait */}
                  <div style={{ 
                    width: '120px', 
                    height: '120px', 
                    borderRadius: '50%', 
                    border: `4px solid ${selectedQRUser.role === 'student' ? brandColor : '#f59e0b'}`,
                    padding: '4px',
                    background: 'white',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    <img 
                      src={qrAvatarDataUrl || '/avatar_ghost.jpg'} 
                      onLoad={handleQRImageLoad}
                      crossOrigin="anonymous"
                      alt="Profile"
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
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{selectedQRUser.first_name}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b', marginTop: '4px' }}>{selectedQRUser.last_name || 'Member'}</div>
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
                    <QRCode value={selectedQRUser.qr_token || selectedQRUser.id} size={150} />
                  </div>
                  
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', margin: 0, fontWeight: 600, lineHeight: 1.4, maxWidth: '220px' }}>
                    Halte diesen Code vor die Kamera des iPads,<br />um dich automatisch am Platz anzumelden.
                  </p>
                </div>

                {/* Bottom Brand Stripe */}
                <div style={{ 
                  height: '12px', 
                  background: `linear-gradient(90deg, ${selectedQRUser.role === 'student' ? brandColor : '#f59e0b'}, #1e293b, ${selectedQRUser.role === 'student' ? brandColor : '#f59e0b'})` 
                }}></div>
              </>
            )}
          </div>

          <button 
            onClick={saveAsImage} 
            style={{ 
              width: '100%', 
              background: selectedQRUser.role === 'student' ? '#137333' : brandColor, 
              color: 'white', 
              border: 'none', 
              padding: '20px', 
              borderRadius: '24px', 
              fontWeight: 900, 
              fontSize: '1rem', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px', 
              marginTop: '24px', 
              boxShadow: `0 15px 35px ${selectedQRUser.role === 'student' ? '#137333' : brandColor}50`, 
              transition: 'all 0.2s' 
            }} 
          >
            <Download size={24} /> Ausweis als JPEG speichern
          </button>
        </div>
      </div>
    );
  };


  const handleSaveRoomSize = async () => {
    if (!customizingRoom) return;
    const { error } = await supabase
      .from('rooms')
      .update({ room_width: roomWidth, room_height: roomHeight })
      .eq('id', customizingRoom.id);

    if (error) {
      alert('Fehler beim Speichern der Raumgröße: ' + error.message);
    } else {
      setRooms(rooms.map(r => r.id === customizingRoom.id ? { ...r, room_width: roomWidth, room_height: roomHeight } : r));
      setCustomizingRoom({ ...customizingRoom, room_width: roomWidth, room_height: roomHeight });
      alert('Raumgröße erfolgreich gespeichert!');
    }
  };

  const handleUpdateInstrument = async (val: string) => {
    if (!activeEditStationId) return;
    setEditingStationInstrument(val);
    setStations(prev => prev.map(s => s.id === activeEditStationId ? { ...s, instrument: val } : s));
    await supabase.from('stations').update({ instrument: val }).eq('id', activeEditStationId);
  };

  const handleUpdateColor = async (val: string) => {
    if (!activeEditStationId) return;
    setEditingStationColor(val);
    setStations(prev => prev.map(s => s.id === activeEditStationId ? { ...s, color: val } : s));
    await supabase.from('stations').update({ color: val }).eq('id', activeEditStationId);
  };

  const handleSaveStationName = async () => {
    if (!activeEditStationId) return;
    setStations(prev => prev.map(s => s.id === activeEditStationId ? { ...s, name: editingStationName } : s));
    const { error } = await supabase.from('stations').update({ name: editingStationName }).eq('id', activeEditStationId);
    if (error) {
      alert('Fehler beim Speichern: ' + error.message);
    }
  };

  const handleApplyDefaultGrid = async () => {
    if (!customizingRoom) return;
    const roomStations = stations.filter(s => s.room_id === customizingRoom.id);
    const updatedStations = roomStations.map(s => {
      const sName = s.name || '';
      const lowName = sName.toLowerCase();
      let pos_x = 50;
      let pos_y = 50;
      
      if (lowName.includes('lehrer') || lowName.includes('teacher')) {
        pos_x = 50;
        pos_y = 50;
      } else {
        const match = sName.match(/\d+/);
        if (match) {
          const num = parseInt(match[0]);
          if (num === 1) { pos_x = 39; pos_y = 75; }
          else if (num === 2) { pos_x = 29; pos_y = 50; }
          else if (num === 3) { pos_x = 18; pos_y = 25; }
          else if (num === 4) { pos_x = 39; pos_y = 25; }
          else if (num === 5) { pos_x = 61; pos_y = 25; }
          else if (num === 6) { pos_x = 82; pos_y = 25; }
          else if (num === 7) { pos_x = 71; pos_y = 50; }
          else if (num === 8) { pos_x = 61; pos_y = 75; }
        }
      }
      return { ...s, pos_x, pos_y };
    });
    
    // Update local state
    setStations(prev => prev.map(s => {
      const updated = updatedStations.find(us => us.id === s.id);
      return updated ? updated : s;
    }));
    
    // Update Database
    for (const us of updatedStations) {
      await supabase.from('stations').update({ pos_x: us.pos_x, pos_y: us.pos_y }).eq('id', us.id);
    }
    
    alert('Symmetrisches Standard-Raster wurde erfolgreich auf die iPads angewendet!');
  };

  const renderRoomLayoutModal = () => {
    if (!customizingRoom) return null;

    const roomStations = stations.filter(s => s.room_id === customizingRoom.id);
    const activeStation = stations.find(s => s.id === activeEditStationId);
    
    // Generate Kiosk URLs
    const getStationKioskUrl = (id: string) => {
      const kiosk = (kiosks || []).find(k => k.station_id === id);
      return kiosk ? `${window.location.origin}/?kiosk_token=${kiosk.secret_token}` : `${window.location.origin}/?kiosk_station_id=${id}`;
    };
    const getRoomKioskUrl = (id: string) => {
      const kiosk = (kiosks || []).find(k => k.room_id === id && !k.station_id);
      return kiosk ? `${window.location.origin}/?kiosk_token=${kiosk.secret_token}` : `${window.location.origin}/?kiosk_room_id=${id}`;
    };

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(12px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse-orange {
            0%, 100% { border-color: #f97316; box-shadow: 0 0 0 0px rgba(249, 115, 22, 0.4); }
            50% { border-color: #ffedd5; box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); }
          }
        `}} />
        <div style={{ background: '#ffffff', width: '100%', maxWidth: '100%', borderRadius: '32px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
          
          {/* Header */}
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Raum-Layout gestalten: {customizingRoom.name}</h2>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>Bewege die iPads an ihre Plätze und konfiguriere die Instrumente.</p>
            </div>
            <button 
              onClick={() => setCustomizingRoom(null)} 
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }}
              
              
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 380px', flex: 1, overflow: 'hidden', height: '100%' }}>
            
            {/* Left: Designer Canvas */}
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', background: '#f8fafc', borderRight: '1px solid #e2e8f0', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
              <div 
                ref={canvasRef}
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: (roomHeight && roomHeight > 0) ? `min(100%, calc(55vh * (${roomWidth} / ${roomHeight})))` : '100%',
                  backgroundColor: '#0f172a', // Sleek architectural layout background
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px',
                  border: '3px solid #334155',
                  borderRadius: '24px',
                  boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.6), 0 10px 30px rgba(15, 23, 42, 0.1)',
                  aspectRatio: `${roomWidth} / ${roomHeight}`,
                  maxHeight: '55vh',
                  minHeight: '320px',
                  overflow: 'hidden'
                }}
              >
                {/* Center helper line */}
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, borderLeft: '1px dashed rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px dashed rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

                {/* Station Nodes */}
                {roomStations.map(station => {
                  const isSelected = activeEditStationId === station.id;
                  const sName = station.name || '';
                  const isTeacher = sName.toLowerCase().includes('lehrer') || sName.toLowerCase().includes('teacher');
                  
                  // Color codes: custom station color with name-based fallback
                  const instColor = station.color && station.color !== '#e5e7eb' && station.color !== '#e2e8f0'
                    ? station.color
                    : getStationColor(sName);

                  const posLeft = station.pos_x !== null && station.pos_x !== undefined ? station.pos_x : 50;
                  const posTop = station.pos_y !== null && station.pos_y !== undefined ? station.pos_y : 50;
                  const isUnplaced = station.pos_x === null || station.pos_y === null;

                  return (
                    <div
                      key={station.id}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setActiveEditStationId(station.id);
                        const canvas = canvasRef.current;
                        if (!canvas) return;
                        const rect = canvas.getBoundingClientRect();

                        let latestX = posLeft;
                        let latestY = posTop;

                        const handlePointerMove = (moveEvent: PointerEvent) => {
                          const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
                          const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
                          let clampedX = Math.max(4, Math.min(96, x));
                          let clampedY = Math.max(5, Math.min(95, y));
                          
                          if (snapToGrid) {
                            clampedX = Math.round(clampedX / 5) * 5;
                            clampedY = Math.round(clampedY / 5) * 5;
                            clampedX = Math.max(5, Math.min(95, clampedX));
                            clampedY = Math.max(5, Math.min(95, clampedY));
                          }
                          
                          latestX = clampedX;
                          latestY = clampedY;
                          
                          setStations(prev => prev.map(s => s.id === station.id ? { ...s, pos_x: clampedX, pos_y: clampedY } : s));
                        };

                        const handlePointerUp = async () => {
                          window.removeEventListener('pointermove', handlePointerMove);
                          window.removeEventListener('pointerup', handlePointerUp);
                          
                          // Save final coords
                          const finalX = Math.round(latestX * 10) / 10;
                          const finalY = Math.round(latestY * 10) / 10;
                          await supabase.from('stations').update({ pos_x: finalX, pos_y: finalY }).eq('id', station.id);
                        };

                        window.addEventListener('pointermove', handlePointerMove);
                        window.addEventListener('pointerup', handlePointerUp);
                      }}
                      style={{
                        position: 'absolute',
                        left: `${posLeft}%`,
                        top: `${posTop}%`,
                        transform: 'translate(-50%, -50%)',
                        cursor: 'grab',
                        zIndex: isSelected ? 100 : 10,
                        touchAction: 'none',
                        userSelect: 'none',
                        width: '18%',
                        aspectRatio: '180 / 210'
                      }}
                    >
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: isSelected ? `${instColor}25` : 'rgba(30, 41, 59, 0.85)',
                        backdropFilter: 'blur(4px)',
                        border: isSelected ? `2.5px solid ${instColor}` : `1.5px solid ${isUnplaced ? '#f97316' : '#475569'}`,
                        borderRadius: '20px',
                        padding: '8px',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        textAlign: 'center',
                        boxShadow: isSelected ? `0 10px 25px -5px ${instColor}50` : '0 4px 10px rgba(0,0,0,0.3)',
                        transition: 'border-color 0.2s, background-color 0.2s',
                        animation: isUnplaced ? 'pulse-orange 2s infinite' : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%', overflow: 'hidden' }}>
                          <Tablet size={12} color={instColor} style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{station.name}</span>
                        </div>
                        {station.instrument && (
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.8, display: 'flex', alignItems: 'center', gap: '3px', maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {station.instrument === 'E-Piano' && '🎹'}
                            {station.instrument === 'E-Drums' && '🥁'}
                            {station.instrument === 'E-Gitarre' && '🎸'}
                            {station.instrument === 'E-Bass' && '🎸'}
                            {station.instrument === 'Vocals' && '🎤'}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{station.instrument}</span>
                          </span>
                        )}
                        {isUnplaced && (
                          <span style={{ fontSize: '0.55rem', color: '#fb923c', fontWeight: 800 }}>Unplatziert</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Customization & QR Tools */}
            <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
              
              {/* Section 1: Room Dimensions */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>Raumgröße (Seitenverhältnis)</h3>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Breite (Meter)</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      min="3" 
                      max="30"
                      value={roomWidth} 
                      onChange={e => setRoomWidth(Number(e.target.value))} 
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.875rem', fontWeight: 700 }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Höhe (Meter)</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      min="2" 
                      max="30"
                      value={roomHeight} 
                      onChange={e => setRoomHeight(Number(e.target.value))} 
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.875rem', fontWeight: 700 }}
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSaveRoomSize}
                  style={{ width: '100%', background: brandColor, color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  Größe aktualisieren
                </button>
              </div>

              {/* Section 1.5: Grid & Alignment Tools */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>Raster & Symmetrie</h3>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                  <input 
                    type="checkbox" 
                    checked={snapToGrid} 
                    onChange={e => setSnapToGrid(e.target.checked)} 
                    style={{ width: '16px', height: '16px', borderRadius: '4px', accentColor: brandColor }}
                  />
                  Am Raster ausrichten (5%-Schritte)
                </label>

                <button 
                  onClick={handleApplyDefaultGrid}
                  style={{ width: '100%', background: '#ffffff', color: '#1e293b', border: '1.5px solid #cbd5e1', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                  
                  
                >
                  ✨ Symmetrisches Standard-Raster anwenden
                </button>
              </div>

              {/* Section 2: Selected Station Configuration */}
              {activeStation ? (
                <div style={{ background: '#ffffff', padding: '24px 20px', borderRadius: '20px', border: `1.5px solid ${brandColor}30`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 950, color: '#0f172a' }}>Konfiguration: {activeStation.name}</h3>
                    <button 
                      onClick={() => setActiveEditStationId(null)}
                      style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Station Name</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input 
                        value={editingStationName}
                        onChange={e => setEditingStationName(e.target.value)}
                        onBlur={handleSaveStationName}
                        style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontWeight: 700 }}
                      />
                      <button onClick={handleSaveStationName} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '10px 14px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', color: '#475569' }}>
                        Set
                      </button>
                    </div>
                  </div>

                  {/* Instrument Select */}
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Musikinstrument</label>
                    <select 
                      value={editingStationInstrument} 
                      onChange={e => handleUpdateInstrument(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', marginTop: '4px', fontSize: '0.875rem', fontWeight: 700, background: 'white' }}
                    >
                      <option value="">-- Instrument wählen --</option>
                      <option value="E-Piano">🎹 E-Piano</option>
                      <option value="E-Drums">🥁 E-Drums</option>
                      <option value="E-Gitarre">🎸 E-Gitarre</option>
                      <option value="E-Bass">🎸 E-Bass</option>
                      <option value="Vocals">🎤 Mikrofon (Gesang)</option>
                      <option value="Tablet">📱 Tablet (Standard/Anderes)</option>
                    </select>
                  </div>

                  {/* Color Selector */}
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>iPad Rahmenfarbe</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {[
                        { hex: '#3b82f6', label: 'Blau' },
                        { hex: '#eab308', label: 'Gelb' },
                        { hex: '#64748b', label: 'Grau' },
                        { hex: '#22c55e', label: 'Grün' },
                        { hex: '#a855f7', label: 'Lila' },
                        { hex: '#ef4444', label: 'Rot' }
                      ].map(colorOpt => {
                        const isColorSelected = editingStationColor === colorOpt.hex;
                        return (
                          <button
                            key={colorOpt.hex}
                            onClick={() => handleUpdateColor(colorOpt.hex)}
                            title={colorOpt.label}
                            type="button"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: colorOpt.hex,
                              border: isColorSelected ? '3px solid #0f172a' : '2px solid transparent',
                              cursor: 'pointer',
                              transform: isColorSelected ? 'scale(1.15)' : 'scale(1)',
                              boxShadow: isColorSelected 
                                ? `0 6px 12px ${colorOpt.hex}60` 
                                : '0 2px 4px rgba(0,0,0,0.06)',
                              transition: 'all 0.2s',
                              padding: 0,
                              outline: 'none'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '8px 0' }} />

                  {/* QR Code and link setup */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', alignSelf: 'flex-start' }}>iPad Kiosk Setup</span>
                    
                    <div style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '16px', background: 'white' }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getStationKioskUrl(activeStation.id))}`}
                        alt="Kiosk Setup QR Code"
                        style={{ width: '180px', height: '180px', display: 'block' }}
                      />
                    </div>
                    
                    <p style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center', margin: 0 }}>
                      Scanne diesen QR-Code mit der Kamera des iPads an dieser Station, um es sofort als Kiosk-Gerät zu sperren.
                    </p>

                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(getStationKioskUrl(activeStation.id));
                        alert('Kiosk-Setup-Link für diesen Platz kopiert!');
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <ExternalLink size={12} /> Setup-Link kopieren
                    </button>
                  </div>

                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', border: '2px dashed #cbd5e1', borderRadius: '20px', color: '#94a3b8', textAlign: 'center' }}>
                  <Tablet size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Kein iPad ausgewählt</span>
                  <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Tippe auf ein iPad auf der Karte links, um es zu konfigurieren oder den Kiosk-QR-Code anzuzeigen.</span>
                </div>
              )}

              {/* Room Kiosk Link */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Allgemeiner Raum-Kiosk Link</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>
                  Nutze diesen Link auf einem Kiosk-iPad, wenn du den Raum-Plan aufrufen möchtest, um die Station manuell auszuwählen.
                </span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(getRoomKioskUrl(customizingRoom.id));
                    alert('Allgemeiner Raum-Kiosk Link kopiert!');
                  }}
                  style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', color: '#475569' }}
                >
                  Raum-Kiosk Link kopieren
                </button>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '20px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
            <button 
              onClick={() => setCustomizingRoom(null)}
              style={{ 
                background: brandColor, 
                color: 'white', 
                border: 'none', 
                padding: '12px 32px', 
                borderRadius: '16px', 
                fontWeight: 800, 
                fontSize: '0.9rem', 
                cursor: 'pointer', 
                boxShadow: '0 8px 20px rgba(0,0,0,0.1)', 
                transition: 'all 0.2s' 
              }}
              
              
            >
              Speichern & Schließen
            </button>
          </div>

        </div>
      </div>
    );
  };

  const renderLogoutDialog = () => {
    if (!showLogoutConfirm) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#fff1f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <LogOut size={32} />
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '8px', color: '#1e293b' }}>Abmelden?</h3>
          <p style={{ color: '#64748b', marginBottom: '32px', fontWeight: 500 }}>Bist du sicher, dass du das Admin-Dashboard verlassen möchtest?</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', color: '#1e293b', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
            <button onClick={handleLogout} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Ja, Abmelden</button>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div style={{ 
      flex: 1, 
      padding: activePlatform === 'campus' 
        ? (activeTab === 'live' ? '0px 10px 10px 10px' : '24px 10px 10px 10px') 
        : '14px 10px 10px 10px', 
      overflowY: activeTab === 'live' ? 'hidden' : 'auto',
      height: activeTab === 'live' ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      width: '100%',
      overflowX: 'hidden'
    }}>
      {activeTab !== 'live' && activeTab !== 'schedule' && (admin as any)?.schools?.limits_enabled && (
        <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: '24px', marginTop: '16px', gap: '20px', flexWrap: 'wrap' }}>
          {/* Quota Progress Indicators */}
          <div style={{ display: 'flex', gap: '20px', background: '#ffffff', padding: '12px 20px', borderRadius: '18px', border: '1.5px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.01)', flexWrap: 'wrap' }}>
            {[
              { label: 'Lehrkräfte', cur: teachers.length, max: (admin as any).schools.max_teachers ?? 2, color: '#3b82f6' },
              { label: 'Schüler', cur: students.length, max: (admin as any).schools.max_students ?? 6, color: '#22c55e' },
              { label: 'Songs', cur: songs.length, max: (admin as any).schools.max_songs ?? 5, color: '#eab308' }
            ].map((item, i) => {
              const pct = Math.min(100, (item.cur / item.max) * 100);
              const isClose = pct >= 90;
              const barColor = isClose ? '#ef4444' : item.color;
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '100px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, color: isClose ? '#ef4444' : '#64748b' }}>
                    <span>{item.label}</span>
                    <span>{item.cur}/{item.max}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </header>
      )}

      {activeTab === 'live' && renderLiveTab()}
      {activeTab === 'schedule' && <ScheduleBoard schoolId={admin.school_id} userId={userId} />}
      {activeTab === 'bands' && renderBandsTab()}
      {activeTab === 'students' && renderStudentsTab()}
      {activeTab === 'team' && renderTeachersTab()}
      {activeTab === 'rooms' && renderRoomsTab()}
      {activeTab === 'songs' && renderSongsTab()}
      {activeTab === 'stats' && renderStatsTab()}
      {activeTab === 'gallery' && renderIDGalleryTab()}
      {activeTab === 'setup' && renderSetupTab()}

      {renderStudentDetailModal()}
      {renderQRModal()}
      {renderRoomLayoutModal()}
      {renderBatchiPadModal()}
      {renderLogoutDialog()}

      {/* Notebook Lehrwerk Detail Modal */}
      {selectedLehrwerkForDetail && (() => {
        const book = selectedLehrwerkForDetail;
        const gradient = getLehrwerkColor(book.title);
        
        // Get list of assigned students
        const assignedList = localProgress.filter((p: any) => p.lehrwerkId === book.id);
        const assignedStudents = students.filter((s: any) => assignedList.some((a: any) => a.studentId === s.id));
        
        // Get list of unassigned students
        const unassignedStudents = students.filter((s: any) => 
          !assignedList.some((a: any) => a.studentId === s.id) &&
          (`${s.first_name || ''} ${s.last_name || ''}`).toLowerCase().includes(studentDetailSearch.toLowerCase())
        );

        const handleAssign = (studentId: string) => {
          try {
            const stored = localStorage.getItem('student_lehrwerke_progress');
            const parsed = stored ? JSON.parse(stored) : [];
            if (parsed.some((a: any) => a.studentId === studentId && a.lehrwerkId === book.id)) return;

            const newAssignment = {
              studentId: studentId,
              lehrwerkId: book.id,
              assignedAt: new Date().toISOString(),
              pageStates: {}
            };
            const updated = [...parsed, newAssignment];
            localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
            setLocalProgress(updated);
          } catch (e) {
            console.error(e);
          }
        };

        const handleUnassign = async (studentId: string) => {
          if (!window.confirm('Bist du sicher, dass du das Lehrwerk und somit den bereits erreichten Fortschritt löschen möchtest?')) return;
          try {
            await supabase
              .from('progress_matrix')
              .delete()
              .eq('student_id', studentId)
              .like('topic_name', `${book.title} - Seite %`);

            const stored = localStorage.getItem('student_lehrwerke_progress');
            const parsed = stored ? JSON.parse(stored) : [];
            const updated = parsed.filter((a: any) => !(a.studentId === studentId && a.lehrwerkId === book.id));
            localStorage.setItem('student_lehrwerke_progress', JSON.stringify(updated));
            setLocalProgress(updated);
          } catch (e) {
            console.error(e);
          }
        };

        const handleUpdatePageProgress = async (studentId: string, pageNum: number, status: string, notes: string) => {
          try {
            const stored = localStorage.getItem('student_lehrwerke_progress');
            const parsed = stored ? JSON.parse(stored) : [];
            const index = parsed.findIndex((p: any) => p.studentId === studentId && p.lehrwerkId === book.id);
            if (index === -1) return;

            const pageStates = parsed[index].pageStates || {};
            pageStates[pageNum] = {
              status: status,
              notes: notes,
              updatedAt: new Date().toISOString()
            };

            parsed[index].pageStates = pageStates;
            localStorage.setItem('student_lehrwerke_progress', JSON.stringify(parsed));
            setLocalProgress(parsed);

            // Sync with Supabase progress_matrix
            const supabaseStatus = status === 'mastered' ? 'MASTERED' : status === 'theory_done' ? 'THEORY_DONE' : 'IN_PROGRESS';
            const isCurrentHomework = status === 'in_progress' || status === 'theory_done';
            await supabase
              .from('progress_matrix')
              .upsert({
                student_id: studentId,
                topic_name: `${book.title} - Seite ${pageNum}`,
                status: supabaseStatus,
                is_current_homework: isCurrentHomework,
                teacher_notes: notes,
                updated_at: new Date().toISOString()
              });
          } catch (e) {
            console.error(e);
          }
        };

        const handleDeletePageProgress = async (studentId: string, pageNum: number) => {
          try {
            const stored = localStorage.getItem('student_lehrwerke_progress');
            const parsed = stored ? JSON.parse(stored) : [];
            const index = parsed.findIndex((p: any) => p.studentId === studentId && p.lehrwerkId === book.id);
            if (index === -1) return;

            const pageStates = parsed[index].pageStates || {};
            delete pageStates[pageNum];

            parsed[index].pageStates = pageStates;
            localStorage.setItem('student_lehrwerke_progress', JSON.stringify(parsed));
            setLocalProgress(parsed);

            // Delete from Supabase progress_matrix
            await supabase
              .from('progress_matrix')
              .delete()
              .eq('student_id', studentId)
              .eq('topic_name', `${book.title} - Seite ${pageNum}`);
          } catch (e) {
            console.error(e);
          }
        };

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            background: 'rgba(9, 9, 11, 0.65)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: '"Inter", sans-serif'
          }}>
            <div style={{
              // The notebook frame/cover matches the book cover's gradient!
              background: `radial-gradient(circle, ${gradient.from} 0%, ${gradient.to} 100%)`,
              borderRadius: '32px',
              width: '100%',
              maxWidth: '1100px',
              height: '80vh',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: `2px solid ${gradient.text}`,
              padding: '10px',
              position: 'relative'
            }} className="animation-slide-up">
              
              {/* Absolute Close Button */}
              <button
                onClick={() => { setSelectedLehrwerkForDetail(null); setSelectedStudentForProgress(null); }}
                style={{
                  position: 'absolute',
                  top: '24px',
                  right: '24px',
                  zIndex: 100,
                  background: 'rgba(255, 255, 255, 0.7)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'}
              >
                <X size={16} />
              </button>

              {/* Inside Pages of the Notebook (Left/Right Pages) */}
              <div style={{
                display: 'flex',
                flex: 1,
                overflow: 'hidden',
                borderRadius: '20px',
                boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.1)',
                position: 'relative'
              }}>
                
                {/* Left Page (Information & Assigned Students) */}
                <div style={{
                  flex: '1 1 50%',
                  minWidth: 0,
                  padding: '32px',
                  overflowY: 'auto',
                  background: '#faf8f2',
                  backgroundImage: 'repeating-linear-gradient(#faf8f2, #faf8f2 27px, #e5e0d4 27px, #e5e0d4 28px)',
                  borderRight: '1px dashed #cbd5e1',
                  position: 'relative'
                }}>
                  {/* Left binder holes on the right edge */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    bottom: '20px',
                    right: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    zIndex: 25
                  }}>
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={idx} style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#121214',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
                      }} />
                    ))}
                  </div>

                  {/* Content Container (shifted to not overlap binder holes) */}
                  <div style={{ paddingRight: '12px' }}>
                    {/* Book Cover / Header info Widget */}
                    <div style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '20px',
                      padding: '20px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03), 0 8px 10px -6px rgba(0,0,0,0.03)',
                      marginBottom: '24px',
                      display: 'flex',
                      gap: '20px',
                      alignItems: 'center'
                    }}>
                      <div style={{ 
                        width: '80px', 
                        height: '105px', 
                        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`, 
                        borderRadius: '4px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                        flexShrink: 0
                      }}>
                        <BookOpen size={36} color={gradient.text} />
                      </div>
                      {isEditingBookHeader ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="text"
                            value={editBookTitle}
                            onChange={e => setEditBookTitle(e.target.value)}
                            placeholder="Titel"
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.95rem',
                              fontWeight: 800,
                              outline: 'none',
                              width: '100%',
                              background: '#f8fafc'
                            }}
                          />
                          <input
                            type="text"
                            value={editBookAuthor}
                            onChange={e => setEditBookAuthor(e.target.value)}
                            placeholder="Autor"
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              outline: 'none',
                              width: '100%',
                              background: '#f8fafc'
                            }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="number"
                              value={editBookTotalPages}
                              onChange={e => setEditBookTotalPages(parseInt(e.target.value) || 0)}
                              placeholder="Seiten"
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                outline: 'none',
                                width: '80px',
                                background: '#f8fafc'
                              }}
                            />
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 650 }}>Seiten</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!editBookTitle.trim()) return;
                                const updatePayload = {
                                  title: editBookTitle,
                                  author: editBookAuthor || null,
                                  total_pages: Number(editBookTotalPages) || 50
                                };
                                const { error } = await supabase
                                  .from('lehrwerke')
                                  .update(updatePayload)
                                  .eq('id', book.id);

                                if (error) {
                                  console.error("Error updating Lehrwerk:", error);
                                  return;
                                }

                                setLehrwerke(prev => prev.map(item => item.id === book.id ? { ...item, ...updatePayload, totalPages: updatePayload.total_pages } : item));
                                setSelectedLehrwerkForDetail({ ...book, ...updatePayload, totalPages: updatePayload.total_pages });
                                setIsEditingBookHeader(false);
                              }}
                              style={{
                                background: '#fbbc05',
                                color: '#1e293b',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Check size={12} /> Speichern
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingBookHeader(false)}
                              style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <X size={12} /> Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                              {book.title}
                            </h2>
                            {book.author && (
                              <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                                von {book.author}
                              </p>
                            )}
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                              📖 {book.totalPages || 50} Seiten
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditBookTitle(book.title);
                              setEditBookAuthor(book.author || '');
                              setEditBookTotalPages(book.totalPages || 50);
                              setIsEditingBookHeader(true);
                            }}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              width: '44px',
                              height: '44px',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#64748b',
                              transition: 'all 0.2s',
                              flexShrink: 0
                            }}
                          >
                            <Pencil size={18} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Assigned Students Widget */}
                    <div style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '24px',
                      padding: '24px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03), 0 8px 10px -6px rgba(0,0,0,0.03)',
                      marginTop: '20px'
                    }}>
                      {/* List of working students */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '6px', margin: '0 0 12px 0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={18} color="#0f172a" /> {selectedStudentForProgress ? 'Ausgewählter Schüler' : `Zugewiesene Schüler (${assignedStudents.length})`}
                        </h3>
                      {!selectedStudentForProgress && (
                        <div style={{ position: 'relative', width: '226px' }}>
                          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                          <input
                            type="text"
                            placeholder="Suchen..."
                            value={studentDetailSearch}
                            onChange={e => setStudentDetailSearch(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '5px 10px 5px 30px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.78rem',
                              fontWeight: 650,
                              outline: 'none',
                              background: 'white'
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {assignedStudents.length === 0 ? (
                      <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.85rem', marginTop: '12px' }}>
                        Bisher arbeitet kein Schüler an diesem Buch.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {assignedStudents
                          .filter((s: any) => !selectedStudentForProgress || s.id === selectedStudentForProgress.id)
                          .filter((s: any) => {
                            if (!studentDetailSearch.trim()) return true;
                            const query = studentDetailSearch.toLowerCase();
                            return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(query);
                          })
                          .map((s: any) => {
                          const initials = `${s.first_name?.[0] || ''}${s.last_name?.[0] || ''}`.toUpperCase();
                          const assignment = assignedList.find((p: any) => p.studentId === s.id);
                          const masteredPages = Object.entries(assignment?.pageStates || {})
                            .filter(([_, state]: [string, any]) => state.status === 'mastered')
                            .map(([pageNum]) => parseInt(pageNum))
                            .sort((a, b) => a - b);
                          return (
                            <div key={s.id} 
                              onClick={() => setSelectedStudentForProgress(s)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: selectedStudentForProgress?.id === s.id ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
                                border: selectedStudentForProgress?.id === s.id ? `2px solid ${gradient.text}` : '1px solid #e2e8f0',
                                padding: '10px 14px',
                                borderRadius: '14px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: gradient.from,
                                  color: gradient.text,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  flexShrink: 0
                                }}>
                                  {initials}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                                    {s.first_name} {s.last_name}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 650 }}>
                                    {masteredPages.length} / {book.totalPages || 50} Seiten geschafft
                                  </span>
                                  {masteredPages.length > 0 && (
                                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontStyle: 'italic', display: 'block', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`Seiten: ${masteredPages.join(', ')}`}>
                                      Seiten: {masteredPages.join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {selectedStudentForProgress ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStudentForTageskompass(selectedStudentForProgress);
                                      setInitialLehrwerkIdForTageskompass(book.id);
                                      setShowTageskompassModal(true);
                                    }}
                                    style={{
                                      background: '#456355',
                                      border: 'none',
                                      borderRadius: '8px',
                                      padding: '6px 12px',
                                      fontSize: '0.78rem',
                                      fontWeight: 800,
                                      color: 'white',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.2s'
                                    }}
                                    className="hover-scale"
                                  >
                                    <BookOpen size={12} /> Protokoll
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedStudentForProgress(null); }}
                                    style={{
                                      background: '#f1f5f9',
                                      border: 'none',
                                      borderRadius: '8px',
                                      padding: '6px 12px',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      color: '#475569',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                  >
                                    <ChevronLeft size={12} /> Zurück
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStudentForTageskompass(s);
                                      setInitialLehrwerkIdForTageskompass(book.id);
                                      setShowTageskompassModal(true);
                                    }}
                                    style={{
                                      background: '#456355',
                                      border: 'none',
                                      borderRadius: '8px',
                                      padding: '6px 12px',
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      color: 'white',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.2s'
                                    }}
                                    className="hover-scale"
                                  >
                                    <BookOpen size={12} /> Protokoll
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleUnassign(s.id); }}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      width: '28px',
                                      height: '28px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderRadius: '50%',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    title="Verbindung trennen"
                                  >
                                    <X size={16} strokeWidth={2.5} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Hausaufgaben KW 23 Ansicht */}
                    {selectedStudentForProgress && (() => {
                      const studentProgressObj = localProgress.find((p: any) => p.studentId === selectedStudentForProgress.id && p.lehrwerkId === book.id);
                      const pageStates = studentProgressObj?.pageStates || {};
                      const homeworkPages = Object.entries(pageStates)
                        .map(([numStr, state]: [string, any]) => ({ num: parseInt(numStr, 10), ...state }))
                        .filter(p => p.status === 'in_progress' || p.status === 'theory_done')
                        .sort((a, b) => a.num - b.num);
                        
                      const hasActive = homeworkPages.length > 0;
                      const hasNotes = weeklyHomeworkNotesList.length > 0;
                      
                      return (
                        <>
                          <div style={{
                            background: '#fffbeb',
                            border: '1.5px solid #fef08a',
                            borderRadius: '16px',
                            padding: '14px 16px',
                            marginTop: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fef08a', paddingBottom: '8px' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#18181b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                🗓️ Hausaufgaben KW {getISOWeekNum(undefined, lessonDayForProgress)}
                              </span>
                            </div>
                            
                            {!hasActive && !hasNotes ? (
                              <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 550, fontStyle: 'italic', lineHeight: '1.4' }}>
                                ✨ Keine aktiven Hausaufgaben erfasst. Markiere Lehrwerke oder Songs.
                              </span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {hasActive && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{
                                      fontSize: '0.88rem',
                                      color: '#09090b',
                                      fontWeight: 800,
                                      letterSpacing: '-0.035em'
                                    }}>
                                      📖 <span>{book.title}</span> <span style={{ color: '#4b5563', fontWeight: 700, marginLeft: '4px' }}>· S. {homeworkPages.map(p => p.num).join(', ')}</span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '2px' }}>
                                      {homeworkPages.map(p => (
                                        <div key={p.num} style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          background: '#ffffff',
                                          color: '#475569',
                                          padding: '4px 10px 4px 12px',
                                          borderRadius: '999px',
                                          fontSize: '0.76rem',
                                          fontWeight: 900,
                                          border: '1px solid rgba(251, 191, 36, 0.3)',
                                          boxShadow: '0 3px 8px rgba(0,0,0,0.03), 0 0 12px rgba(251, 191, 36, 0.32)'
                                        }}>
                                          <span>{p.status === 'theory_done' ? '🧠' : '📄'} S. {p.num}</span>
                                        </div>
                                      ))}
                                    </div>

                                    {(() => {
                                      const pagesWithNotes = homeworkPages.filter(p => p.homeworkNotes && p.homeworkNotes.trim() !== '');
                                      if (pagesWithNotes.length === 0) return null;
                                      return (
                                        <div style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '4px',
                                          padding: '8px 12px',
                                          background: '#ffffff',
                                          border: '1px solid rgba(251, 191, 36, 0.15)',
                                          borderRadius: '12px',
                                          marginTop: '6px',
                                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                                        }}>
                                          {pagesWithNotes.map(p => (
                                            <div key={`p-note-${p.num}`} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '0.74rem', color: '#475569', lineHeight: '1.4' }}>
                                              <span style={{ fontWeight: 800, color: '#b45309', flexShrink: 0 }}>S. {p.num}:</span>
                                              <span style={{ fontWeight: 650, color: '#1e293b' }}>{p.homeworkNotes}</span>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                                
                                {hasNotes && (
                                  <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '6px',
                                    borderTop: '1px solid #fef08a',
                                    paddingTop: '8px',
                                    marginTop: '2px'
                                  }}>
                                    {weeklyHomeworkNotesList.map((note, nIdx) => (
                                      <div key={nIdx} style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        fontSize: '0.72rem', 
                                        color: '#475569', 
                                        fontWeight: 500, 
                                        fontStyle: 'italic',
                                        lineHeight: '1.35',
                                        gap: '8px',
                                        width: '100%'
                                      }}>
                                        <span style={{ whiteSpace: 'pre-line', flex: 1 }}>{note}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteWeeklyHomeworkNote(nIdx)}
                                          style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', padding: '0 4px', fontWeight: 800, marginTop: '1px', flexShrink: 0 }}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Notizen und Textbausteine Block */}
                          <div style={{
                            background: '#ffffff',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '16px',
                            marginTop: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                                Hausaufgaben-Notizen
                              </label>
                               <textarea
                                placeholder="Hausaufgaben, Übetipps oder Notizen für diese Woche..."
                                value={newHomeworkNoteText}
                                onChange={(e) => setNewHomeworkNoteText(e.target.value)}
                                rows={5}
                                style={{
                                  width: '100%',
                                  padding: '12px',
                                  borderRadius: '12px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  background: '#ffffff',
                                  outline: 'none',
                                  resize: 'vertical',
                                  fontStyle: 'italic',
                                  fontFamily: 'inherit'
                                }}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={handleAddWeeklyHomeworkNote}
                              disabled={!newHomeworkNoteText.trim()}
                              style={{
                                background: newHomeworkNoteText.trim() ? gradient.from : '#f1f5f9',
                                color: newHomeworkNoteText.trim() ? gradient.text : '#94a3b8',
                                border: newHomeworkNoteText.trim() ? `1px solid ${gradient.text}` : '1px solid #cbd5e1',
                                borderRadius: '10px',
                                padding: '8px 16px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: newHomeworkNoteText.trim() ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                                alignSelf: 'flex-start'
                              }}
                              className={newHomeworkNoteText.trim() ? "hover-scale-mini" : ""}
                            >
                              ➕ Notiz hinzufügen
                            </button>

                            {/* Schnell-Textbausteine chips */}
                            <div style={{ marginTop: '4px' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
                                ⚡ Schnell-Textbausteine
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {textbausteine
                                  .filter((tb: any) => tb.active && (tb.type === 'both' || tb.type === 'lehrwerke'))
                                  .map((tpl, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                      setNewHomeworkNoteText(prev => prev ? `${prev}\n\n${tpl.text}` : tpl.text);
                                    }}
                                    style={{
                                      background: '#ffffff',
                                      color: '#4b5563',
                                      border: '1px solid #e5e7eb',
                                      padding: '6px 12px',
                                      borderRadius: '9999px',
                                      fontSize: '0.66rem',
                                      fontWeight: 650,
                                      cursor: 'pointer',
                                      transition: 'all 0.12s ease-in-out',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
                                    }}
                                    className="hover-scale-mini"
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = '#f9fafb';
                                      e.currentTarget.style.borderColor = '#cbd5e1';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = '#ffffff';
                                      e.currentTarget.style.borderColor = '#e5e7eb';
                                    }}
                                  >
                                    {tpl.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                    </div> {/* Close Assigned Students Widget */}
                  </div>
                </div>

                {/* Right Page (Assign Students Search & Add OR Selected Student Progress Editor) */}
                <div style={{
                  flex: '1 1 50%',
                  minWidth: 0,
                  padding: '32px',
                  overflowY: 'auto',
                  background: '#faf8f2',
                  backgroundImage: 'repeating-linear-gradient(#faf8f2, #faf8f2 27px, #e5e0d4 27px, #e5e0d4 28px)',
                  position: 'relative'
                }}>
                  {/* Right binder holes on the left edge */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    bottom: '20px',
                    left: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    zIndex: 25
                  }}>
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={idx} style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#121214',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
                      }} />
                    ))}
                  </div>

                  {/* Content Container */}
                  <div style={{ paddingLeft: '12px' }}>
                    {selectedStudentForProgress ? (() => {
                      const studentProgressObj = localProgress.find((p: any) => p.studentId === selectedStudentForProgress.id && p.lehrwerkId === book.id);
                      const pageStates = studentProgressObj?.pageStates || {};
                      
                      // Calculate progress stats
                      const totalPages = book.totalPages || 50;
                      const masteredPagesCount = Object.entries(pageStates)
                        .filter(([_, state]: [string, any]) => state.status === 'mastered')
                        .length;
                      const percent = Math.round((masteredPagesCount / totalPages) * 100);

                      return (
                        <div>
                          {/* 1. Progress Bar */}
                          <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Fortschritt</span>
                              <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>
                                {totalPages} Seiten • {masteredPagesCount} gemeistert ({percent}%)
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                              <div style={{ width: `${percent}%`, height: '100%', background: 'hsl(130, 60%, 52%)', borderRadius: '9999px', transition: 'width 0.3s ease' }} />
                            </div>
                          </div>

                          {/* 2. Brush Tool */}
                          <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '16px 20px', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 850, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🖌️ Pinsel:
                              </span>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                {[
                                  { type: 'unbearbeitet', color: 'hsl(355, 75%, 84%)', label: 'rot = unbearbeitet' },
                                  { type: 'in_progress', color: 'hsl(47, 85%, 84%)', label: 'gelb = Hausaufgabe' },
                                  { type: 'mastered', color: 'hsl(130, 65%, 82%)', label: 'grün = erledigt' },
                                  { type: 'theory_done', color: 'hsl(255, 75%, 84%)', label: 'lila = Theorie' }
                                ].map(b => (
                                  <button
                                    key={b.type}
                                    type="button"
                                    onClick={() => setSelectedBrush(b.type as any)}
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      background: b.color,
                                      border: selectedBrush === b.type ? '3px solid #0f172a' : '1.5px solid #cbd5e1',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                      transform: selectedBrush === b.type ? 'scale(1.15)' : 'none'
                                    }}
                                    title={b.label}
                                  />
                                ))}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '8px', fontSize: '0.68rem', color: '#475569', fontWeight: 650, borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px', whiteSpace: 'nowrap', overflowX: 'auto' }}>
                              <span><span style={{ color: 'hsl(355, 75%, 84%)', marginRight: '4px' }}>●</span>rot = unbearbeitet</span>
                              <span><span style={{ color: 'hsl(47, 85%, 84%)', marginRight: '4px' }}>●</span>gelb = Hausaufgabe</span>
                              <span><span style={{ color: 'hsl(130, 65%, 82%)', marginRight: '4px' }}>●</span>erledigt</span>
                              <span><span style={{ color: 'hsl(255, 75%, 84%)', marginRight: '4px' }}>●</span>lila = Theorie</span>
                            </div>
                          </div>

                          {/* 3. Page Numbers (Farbige Zahlen des Buchs) */}
                          <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '18px 20px', borderRadius: '24px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Seitenübersicht</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
                              {Array.from({ length: totalPages }).map((_, idx) => {
                                const pNum = idx + 1;
                                const pageStateObj = pageStates[pNum];
                                const status = pageStateObj?.status || 'unbearbeitet';
                                
                                let borderColor = 'hsl(355, 70%, 73%)'; // rot = unbearbeitet
                                let textColor = 'hsl(355, 80%, 30%)';
                                let bg = 'hsl(355, 80%, 94%)';
                                
                                if (status === 'in_progress') {
                                  borderColor = 'hsl(47, 80%, 68%)'; // gelb = Hausaufgabe
                                  textColor = 'hsl(47, 85%, 28%)';
                                  bg = 'hsl(47, 90%, 93%)';
                                } else if (status === 'mastered') {
                                  borderColor = 'hsl(130, 60%, 70%)'; // grün = erledigt
                                  textColor = 'hsl(130, 70%, 25%)';
                                  bg = 'hsl(130, 70%, 93%)';
                                } else if (status === 'theory_done') {
                                  borderColor = 'hsl(255, 65%, 73%)'; // lila = Theorie
                                  textColor = 'hsl(255, 75%, 32%)';
                                  bg = 'hsl(255, 80%, 94%)';
                                }
                                
                                return (
                                  <button
                                    key={pNum}
                                    type="button"
                                    onClick={() => {
                                      if (selectedBrush === 'unbearbeitet') {
                                        handleDeletePageProgress(selectedStudentForProgress.id, pNum);
                                      } else {
                                        const notes = pageStateObj?.notes || '';
                                        handleUpdatePageProgress(selectedStudentForProgress.id, pNum, selectedBrush, notes);
                                      }
                                    }}
                                    style={{
                                      width: '38px',
                                      height: '38px',
                                      borderRadius: '50%',
                                      border: `2px solid ${borderColor}`,
                                      background: bg,
                                      color: textColor,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.85rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease-in-out',
                                      outline: 'none'
                                    }}
                                    className="hover-scale-mini"
                                  >
                                    {pNum}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      );
                    })() : (
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0', borderBottom: '2px solid #cbd5e1', paddingBottom: '6px' }}>
                          ➕ Schüler hinzufügen
                        </h3>

                        <div style={{ position: 'relative', marginBottom: '16px', width: '100%' }}>
                          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                          <input
                            type="text"
                            placeholder="Schüler suchen..."
                            value={assignStudentSearch}
                            onChange={e => setAssignStudentSearch(e.target.value)}
                            onFocus={() => setIsAssignSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsAssignSearchFocused(false), 250)}
                            style={{
                              width: '100%',
                              padding: '10px 12px 10px 36px',
                              borderRadius: '12px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.88rem',
                              fontWeight: 650,
                              outline: 'none',
                              background: 'white'
                            }}
                          />
                        </div>

                        {!(isAssignSearchFocused || assignStudentSearch.trim() !== '') ? (
                          <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', marginTop: '32px' }}>
                            Klicke in das Suchfeld, um Schüler anzuzeigen...
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            {students
                              .filter((s: any) => !assignedList.some((a: any) => a.studentId === s.id))
                              .filter((s: any) => {
                                if (assignStudentSearch.trim() === '') return true;
                                return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(assignStudentSearch.toLowerCase());
                              })
                              .map((s: any) => (
                                <div key={s.id} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'white',
                                  border: '1px solid #cbd5e1',
                                  padding: '8px 12px',
                                  borderRadius: '12px',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                                    {s.first_name} {s.last_name}
                                  </span>
                                  <button
                                    onClick={() => {
                                      handleAssign(s.id);
                                      setAssignStudentSearch('');
                                    }}
                                    style={{
                                      background: '#fbbc05',
                                      color: '#1e293b',
                                      border: 'none',
                                      borderRadius: '8px',
                                      padding: '5px 12px',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      transition: 'transform 0.1s'
                                    }}
                                    className="hover-scale-mini"
                                  >
                                    Hinzufügen
                                  </button>
                                </div>
                              ))}
                            {students
                              .filter((s: any) => !assignedList.some((a: any) => a.studentId === s.id))
                              .filter((s: any) => {
                                if (assignStudentSearch.trim() === '') return true;
                                return `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(assignStudentSearch.toLowerCase());
                              }).length === 0 && (
                                <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', marginTop: '12px' }}>
                                  Keine weiteren Schüler zum Zuteilen verfügbar.
                                </p>
                              )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ringbook Spine overlay (Golden Rings) */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  zIndex: 30,
                  pointerEvents: 'none'
                }}>
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} style={{
                      position: 'relative',
                      width: '100%',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '28px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'transparent',
                        border: '3px solid #d4af37',
                        borderTopColor: '#ffe57f',
                        borderLeftColor: '#ffc107',
                        borderRightColor: '#ffc107',
                        borderBottomColor: '#b78a02',
                        boxShadow: '0 3px 5px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
                        transform: 'scaleY(0.8)'
                      }} />
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        )})()}

      {/* Notebook Song Detail Modal */}
      {selectedSongForDetail && (() => {
        const song = selectedSongForDetail;
        const gradient = getSongColor(song.title || '');
        
        // Get list of assigned student skills
        const assignedStudents = assignedSongSkills;
        
        // Get list of unassigned students
        const unassignedStudents = students.filter((s: any) => 
          !assignedStudents.some((a: any) => a.user_id === s.id) &&
          (`${s.first_name || ''} ${s.last_name || ''}`).toLowerCase().includes(assignStudentSearch.toLowerCase())
        );

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            background: 'rgba(9, 9, 11, 0.65)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: '"Inter", sans-serif'
          }}>
            <div style={{
              background: `radial-gradient(circle, ${gradient.from} 0%, ${gradient.to} 100%)`,
              borderRadius: '32px',
              width: '100%',
              maxWidth: '1100px',
              height: '80vh',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: `2px solid ${gradient.text}`,
              padding: '10px',
              position: 'relative'
            }} className="animation-slide-up">
              
              {/* Absolute Close Button */}
              <button
                onClick={async () => {
                  await triggerAutoSaveSongProgress();
                  setSelectedSongForDetail(null);
                  setSelectedStudentForProgress(null);
                  setSelectedSongSkill(null);
                }}
                style={{
                  position: 'absolute',
                  top: '24px',
                  right: '24px',
                  zIndex: 100,
                  background: 'rgba(255, 255, 255, 0.7)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'}
              >
                <X size={16} />
              </button>

              {/* Inside Pages of the Notebook */}
              <div style={{
                display: 'flex',
                flex: 1,
                overflow: 'hidden',
                borderRadius: '20px',
                boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.1)',
                position: 'relative'
              }}>
                
                {/* Left Page (Information & Assigned Students) */}
                <div style={{
                  flex: '1 1 50%',
                  minWidth: 0,
                  padding: '32px',
                  overflowY: 'auto',
                  background: '#faf8f2',
                  backgroundImage: 'repeating-linear-gradient(#faf8f2, #faf8f2 27px, #e5e0d4 27px, #e5e0d4 28px)',
                  borderRight: '1px dashed #cbd5e1',
                  position: 'relative'
                }}>
                  {/* Left binder holes on the right edge */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    bottom: '20px',
                    right: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    zIndex: 25
                  }}>
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={idx} style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#121214',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
                      }} />
                    ))}
                  </div>

                  {/* Content Container */}
                  <div style={{ paddingRight: '12px' }}>
                    {/* Song Cover Widget */}
                    <div style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '20px',
                      padding: '20px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03), 0 8px 10px -6px rgba(0,0,0,0.03)',
                      marginBottom: '24px',
                      display: 'flex',
                      gap: '20px',
                      alignItems: 'center'
                    }}>
                      {/* Sleeve + Vinyl */}
                      <div style={{ position: 'relative', width: '80px', height: '65px', flexShrink: 0 }}>
                        <div style={{
                          position: 'absolute',
                          right: '4px',
                          top: '5px',
                          width: '54px',
                          height: '54px',
                          borderRadius: '50%',
                          background: '#090a0f',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1
                        }}>
                          <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: gradient.to, opacity: 0.45 }} />
                        </div>
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: '65px',
                          height: '65px',
                          background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
                          borderRadius: '16px',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2,
                          border: `1px solid ${gradient.text}18`
                        }}>
                          <span style={{ fontSize: '32px', lineHeight: 1 }}>🎵</span>
                        </div>
                      </div>

                      {isEditingSongHeader ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="text"
                            value={editSongTitle}
                            onChange={e => setEditSongTitle(e.target.value)}
                            placeholder="Titel"
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.95rem',
                              fontWeight: 800,
                              outline: 'none',
                              width: '100%',
                              background: '#f8fafc'
                            }}
                          />
                          <input
                            type="text"
                            value={editSongArtist}
                            onChange={e => setEditSongArtist(e.target.value)}
                            placeholder="Künstler"
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              outline: 'none',
                              width: '100%',
                              background: '#f8fafc'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button
                              type="button"
                              onClick={handleUpdateSongHeader}
                              style={{
                                background: '#fbbc05',
                                color: '#1e293b',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Check size={12} /> Speichern
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingSongHeader(false)}
                              style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <X size={12} /> Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                              {song.title}
                            </h2>
                            <p style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                              von {song.artist}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditSongTitle(song.title || '');
                              setEditSongArtist(song.artist || '');
                              setEditSongInstrumentation(song.instrumentation || {});
                              setIsEditingSongHeader(true);
                            }}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              width: '44px',
                              height: '44px',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#64748b',
                              transition: 'all 0.2s',
                              flexShrink: 0
                            }}
                          >
                            <Pencil size={18} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Assigned Students Widget */}
                    <div style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '24px',
                      padding: '24px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03), 0 8px 10px -6px rgba(0,0,0,0.03)',
                      marginTop: '20px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #cbd5e1', paddingBottom: '6px', margin: '0 0 12px 0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={18} color="#0f172a" /> {selectedStudentForProgress ? 'Ausgewählter Schüler' : `Zugeordnete Schüler (${assignedStudents.length})`}
                        </h3>
                        {!selectedStudentForProgress && (
                          <div style={{ position: 'relative', width: '226px' }}>
                            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                              type="text"
                              placeholder="Suchen..."
                              value={studentDetailSearch}
                              onChange={e => setStudentDetailSearch(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '5px 10px 5px 30px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.78rem',
                                fontWeight: 650,
                                outline: 'none',
                                background: 'white'
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {assignedStudents.length === 0 ? (
                        <p style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.85rem', marginTop: '12px' }}>
                          Bisher arbeitet kein Schüler an diesem Song.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {assignedStudents
                            .filter((s: any) => !selectedStudentForProgress || s.user_id === selectedStudentForProgress.id)
                            .filter((s: any) => {
                              if (!studentDetailSearch.trim()) return true;
                              const query = studentDetailSearch.toLowerCase();
                              const name = `${s.student?.first_name || ''} ${s.student?.last_name || ''}`.toLowerCase();
                              return name.includes(query) || (s.instrument || '').toLowerCase().includes(query);
                            })
                            .map((s: any) => {
                              const initials = `${s.student?.first_name?.[0] || ''}${s.student?.last_name?.[0] || ''}`.toUpperCase();
                              const isSelected = selectedSongSkill?.id === s.id;
                              
                              return (
                                <div key={s.id} 
                                  onClick={() => selectSongSkillForProgress(s)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: isSelected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)',
                                    border: isSelected ? `2px solid ${gradient.text}` : '1px solid #e2e8f0',
                                    padding: '10px 14px',
                                    borderRadius: '14px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      background: gradient.from,
                                      color: gradient.text,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.75rem',
                                      fontWeight: 800,
                                      flexShrink: 0
                                    }}>
                                      {initials}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                                        {s.student?.first_name} {s.student?.last_name}
                                      </span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <div style={{ flex: 1, height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                                          <div style={{ width: `${s.progress_percent || 0}%`, height: '100%', background: (s.is_stage_ready || s.progress_percent === 100) ? 'hsl(130, 65%, 82%)' : 'hsl(47, 85%, 84%)', borderRadius: '2px' }} />
                                        </div>
                                        <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 700, flexShrink: 0 }}>
                                          {s.progress_percent || 0}% Fortschritt
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {selectedStudentForProgress ? (
                                    <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedStudentForTageskompass(selectedStudentForProgress);
                                          setShowTageskompassModal(true);
                                        }}
                                        style={{
                                          background: '#456355',
                                          border: 'none',
                                          borderRadius: '8px',
                                          padding: '6px 12px',
                                          fontSize: '0.78rem',
                                          fontWeight: 800,
                                          color: 'white',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          transition: 'all 0.2s'
                                        }}
                                        className="hover-scale"
                                      >
                                        <BookOpen size={12} /> Protokoll
                                      </button>
                                      <button
                                        onClick={async (e) => { e.stopPropagation(); await triggerAutoSaveSongProgress(); setSelectedStudentForProgress(null); setSelectedSongSkill(null); }}
                                        style={{
                                          background: '#f1f5f9',
                                          border: 'none',
                                          borderRadius: '8px',
                                          padding: '6px 12px',
                                          fontSize: '0.78rem',
                                          fontWeight: 700,
                                          color: '#475569',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          transition: 'all 0.2s'
                                        }}
                                      >
                                        <ChevronLeft size={12} /> Zurück
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedStudentForTageskompass(s.student);
                                          setShowTageskompassModal(true);
                                        }}
                                        style={{
                                          background: '#456355',
                                          border: 'none',
                                          borderRadius: '8px',
                                          padding: '6px 12px',
                                          fontSize: '0.74rem',
                                          fontWeight: 800,
                                          color: 'white',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          transition: 'all 0.2s'
                                        }}
                                        className="hover-scale"
                                      >
                                        <BookOpen size={12} /> Protokoll
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleUnassignStudentFromSong(s.id, s.user_id, song.title, s.instrument); }}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: '#ef4444',
                                          cursor: 'pointer',
                                          width: '28px',
                                          height: '28px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          borderRadius: '50%',
                                          transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        title="Zuweisung löschen"
                                      >
                                        <X size={16} strokeWidth={2.5} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* Lesson Notes & Internal Notes (when student is selected, placed under selected student) */}
                    {selectedStudentForProgress && selectedSongSkill && (
                      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* 2. Lesson Notes Log */}
                        <div style={{ background: '#fffbeb', border: '1.5px solid #fef08a', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#18181b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            🗓️ Hausaufgaben & Übetipps
                          </span>
                          
                          {songStatus === 'in_progress' && (
                            <div style={{
                              fontSize: '0.88rem',
                              color: '#09090b',
                              fontWeight: 800,
                              letterSpacing: '-0.035em',
                              borderBottom: '1px solid #fde047',
                              paddingBottom: '6px',
                              marginBottom: '4px'
                            }}>
                              🎵 <span>{song.artist} - {song.title}</span>
                            </div>
                          )}
                          
                          {songLessonNotesList.length === 0 ? (
                            <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 550, fontStyle: 'italic' }}>
                              Keine Übetipps für diese Woche erfasst.
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {songLessonNotesList.map((note, nIdx) => (
                                <div key={nIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.72rem', color: '#475569', fontWeight: 500, fontStyle: 'italic', gap: '8px' }}>
                                  <span style={{ whiteSpace: 'pre-line', flex: 1 }}>{note}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedList = songLessonNotesList.filter((_, idx) => idx !== nIdx);
                                      setSongLessonNotesList(updatedList);
                                      // Trigger auto-save immediately on notes list modification
                                      handleUpdateSongStudentProgress(
                                        selectedSongSkill.id,
                                        selectedStudentForProgress.id,
                                        selectedSongSkill.instrument,
                                        songRhythmVal,
                                        songFingerVal,
                                        songDynamicsVal,
                                        songTotalProgressVal,
                                        songTotalProgressVal === 100,
                                        songInternalNotes,
                                        updatedList
                                      );
                                    }}
                                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800 }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ borderTop: '1px solid #fef08a', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea
                              placeholder="Übetipps für diese Woche hinzufügen..."
                              value={songLessonNotes}
                              onChange={e => setSongLessonNotes(e.target.value)}
                              rows={6}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.82rem',
                                fontWeight: 650,
                                background: 'white',
                                outline: 'none',
                                fontStyle: 'italic',
                                minHeight: '145px',
                                fontFamily: 'inherit',
                                resize: 'vertical'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!songLessonNotes.trim()) return;
                                const updatedList = [...songLessonNotesList, songLessonNotes.trim()];
                                setSongLessonNotesList(updatedList);
                                setSongLessonNotes('');
                                // Trigger auto-save immediately on notes list addition
                                handleUpdateSongStudentProgress(
                                  selectedSongSkill.id,
                                  selectedStudentForProgress.id,
                                  selectedSongSkill.instrument,
                                  songRhythmVal,
                                  songFingerVal,
                                  songDynamicsVal,
                                  songTotalProgressVal,
                                  songTotalProgressVal === 100,
                                  songInternalNotes,
                                  updatedList
                                );
                              }}
                              disabled={!songLessonNotes.trim()}
                              style={{
                                background: songLessonNotes.trim() ? gradient.from : '#f1f5f9',
                                color: songLessonNotes.trim() ? gradient.text : '#94a3b8',
                                border: songLessonNotes.trim() ? `1px solid ${gradient.text}` : '1px solid #cbd5e1',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                alignSelf: 'flex-start',
                                cursor: songLessonNotes.trim() ? 'pointer' : 'not-allowed'
                              }}
                            >
                              ➕ Hinzufügen
                            </button>
                          </div>

                          {/* Templates for songs */}
                          <div style={{ marginTop: '4px' }}>
                            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>⚡ Schnell-Textbausteine</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {textbausteine
                                  .filter((tb: any) => tb.active && (tb.type === 'both' || tb.type === 'songs'))
                                  .map((tpl, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setSongLessonNotes(prev => prev ? `${prev}\n\n${tpl.text}` : tpl.text)}
                                  style={{ background: 'white', color: '#4b5563', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: '9999px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  {tpl.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Page (Assign Students OR Selected Student Progress Editor) */}
                <div style={{
                  flex: '1 1 50%',
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#faf8f2',
                  backgroundImage: 'repeating-linear-gradient(#faf8f2, #faf8f2 27px, #e5e0d4 27px, #e5e0d4 28px)',
                  position: 'relative',
                  height: '100%',
                  overflow: 'hidden'
                }}>
                  {/* Right binder holes on the left edge */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    bottom: '20px',
                    left: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    zIndex: 25
                  }}>
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={idx} style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#121214',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
                      }} />
                    ))}
                  </div>

                  {/* Content Container (Scrollable) */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px 85px 44px', width: '100%' }}>
                    {selectedStudentForProgress && selectedSongSkill ? (() => {
                      const skill = selectedSongSkill;
                      
                      return (
                        <div>
                          {/* Widget 1: Songstatus */}
                          <div style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            padding: '20px 24px',
                            borderRadius: '24px',
                            marginBottom: '20px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🎵 Songstatus:
                              </span>
                              <div style={{ display: 'flex', gap: '12px' }}>
                                {[
                                  { type: 'unbearbeitet', color: 'hsl(355, 75%, 84%)', label: 'rot = unbearbeitet' },
                                  { type: 'in_progress', color: 'hsl(47, 85%, 84%)', label: 'gelb = hausaufgabe' },
                                  { type: 'mastered', color: 'hsl(130, 65%, 82%)', label: 'grün = gemeistert' }
                                ].map(b => {
                                  const isActive = songStatus === b.type;
                                  return (
                                    <button
                                      key={b.type}
                                      type="button"
                                      onClick={() => {
                                        setSongStatus(b.type as any);
                                        let targetProgress = songTotalProgressVal;
                                        if (b.type === 'unbearbeitet') {
                                          setSongRhythmVal(0);
                                          setSongFingerVal(0);
                                          setSongDynamicsVal(0);
                                          setSongTotalProgressVal(0);
                                          targetProgress = 0;
                                        } else if (b.type === 'in_progress') {
                                          if (songTotalProgressVal === 0 || songTotalProgressVal === 100) {
                                            setSongRhythmVal(25);
                                            setSongFingerVal(25);
                                            setSongDynamicsVal(25);
                                            setSongTotalProgressVal(25);
                                            targetProgress = 25;
                                          }
                                        } else if (b.type === 'mastered') {
                                          setSongRhythmVal(100);
                                          setSongFingerVal(100);
                                          setSongDynamicsVal(100);
                                          setSongTotalProgressVal(100);
                                          targetProgress = 100;
                                        }
                                        if (selectedSongSkill) {
                                          setAssignedSongSkills(prev => prev.map(s => s.id === selectedSongSkill.id ? { ...s, progress_percent: targetProgress, is_stage_ready: b.type === 'mastered' } : s));
                                        }
                                      }}
                                      style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: b.color,
                                        border: isActive ? '3.5px solid #0f172a' : '1.5px solid #cbd5e1',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        transform: isActive ? 'scale(1.1)' : 'none',
                                        boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                                      }}
                                      title={b.label}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                             <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '10px', fontSize: '0.68rem', color: '#64748b', fontWeight: 700, borderTop: '1px solid #f1f5f9', paddingTop: '10px', whiteSpace: 'nowrap', overflowX: 'auto' }}>
                               <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 <span style={{ color: 'hsl(355, 75%, 84%)', fontSize: '0.9rem' }}>●</span> Rot (unbearbeitet)
                               </span>
                               <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 <span style={{ color: 'hsl(47, 85%, 84%)', fontSize: '0.9rem' }}>●</span> Gelb (Hausaufgabe)
                               </span>
                               <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 <span style={{ color: 'hsl(130, 65%, 82%)', fontSize: '0.9rem' }}>●</span> Grün (gemeistert - 100%)
                               </span>
                             </div>
                          </div>

                          {/* Widget 2: Fortschritt */}
                          <div style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            padding: '24px',
                            borderRadius: '24px',
                            marginBottom: '20px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
                                Fortschritt: {songTotalProgressVal}%
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowSongProgressDetails(!showSongProgressDetails)}
                                style={{
                                  background: '#f1f5f9',
                                  border: 'none',
                                  borderRadius: '20px',
                                  padding: '6px 14px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  color: '#475569',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                              >
                                {showSongProgressDetails ? 'Details ausblenden ▲' : 'Details anzeigen ▼'}
                              </button>
                            </div>

                            {/* Main Progress Slider with Black Track and White Thumb */}
                            <div style={{ position: 'relative', width: '100%' }}>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={songTotalProgressVal}
                                onChange={e => {
                                  const val = parseInt(e.target.value);
                                  setSongTotalProgressVal(val);
                                  setSongRhythmVal(val);
                                  setSongFingerVal(val);
                                  setSongDynamicsVal(val);
                                  if (val === 100) {
                                    setSongStatus('mastered');
                                  } else if (val === 0) {
                                    setSongStatus('unbearbeitet');
                                  } else {
                                    setSongStatus('in_progress');
                                  }
                                  if (selectedSongSkill) {
                                    localStorage.setItem(`song_skills_detail_${selectedSongSkill.user_id}_${selectedSongSkill.id}`, JSON.stringify({
                                      rhythm: val,
                                      finger: val,
                                      expression: val
                                    }));
                                    setAssignedSongSkills(prev => prev.map(s => s.id === selectedSongSkill.id ? { ...s, progress_percent: val, is_stage_ready: val === 100 } : s));
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  WebkitAppearance: 'none',
                                  height: '8px',
                                  borderRadius: '4px',
                                  background: `linear-gradient(to right, ${songTotalProgressVal === 100 ? 'hsl(130, 65%, 82%)' : 'hsl(47, 85%, 84%)'} 0%, ${songTotalProgressVal === 100 ? 'hsl(130, 65%, 82%)' : 'hsl(47, 85%, 84%)'} ${songTotalProgressVal}%, #e2e8f0 ${songTotalProgressVal}%, #e2e8f0 100%)`,
                                  outline: 'none',
                                  cursor: 'pointer'
                                }}
                                className="custom-slider-input"
                              />
                              <style dangerouslySetInnerHTML={{__html: `
                                .custom-slider-input::-webkit-slider-thumb {
                                  -webkit-appearance: none;
                                  appearance: none;
                                  width: 20px;
                                  height: 20px;
                                  border-radius: 50%;
                                  background: #ffffff;
                                  border: 1px solid #cbd5e1;
                                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                  cursor: pointer;
                                  transition: transform 0.1s;
                                }
                                .custom-slider-input::-webkit-slider-thumb:hover {
                                  transform: scale(1.15);
                                }
                              `}} />
                            </div>

                            {/* 3 Sub-sliders if details are shown */}
                            {showSongProgressDetails && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                {[
                                  { label: 'Rhythmus & Timing', value: songRhythmVal, color: '#000000', type: 'rhythm' },
                                  { label: 'Finger & Technik', value: songFingerVal, color: '#000000', type: 'finger' },
                                  { label: 'Ausdruck & Performance', value: songDynamicsVal, color: '#000000', type: 'dynamics' }
                                ].map(slider => (
                                  <div key={slider.type} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800 }}>
                                      <span style={{ color: '#475569' }}>{slider.label}</span>
                                      <span style={{ color: '#0f172a' }}>{slider.value}%</span>
                                    </div>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={slider.value}
                                        onChange={e => {
                                          const val = parseInt(e.target.value);
                                          let r = songRhythmVal;
                                          let f = songFingerVal;
                                          let d = songDynamicsVal;
                                          if (slider.type === 'rhythm') { r = val; setSongRhythmVal(val); }
                                          else if (slider.type === 'finger') { f = val; setSongFingerVal(val); }
                                          else if (slider.type === 'dynamics') { d = val; setSongDynamicsVal(val); }
                                          const avg = Math.round((r + f + d) / 3);
                                          setSongTotalProgressVal(avg);
                                          if (avg === 100) {
                                            setSongStatus('mastered');
                                          } else if (avg === 0) {
                                            setSongStatus('unbearbeitet');
                                          } else {
                                            setSongStatus('in_progress');
                                          }
                                          if (selectedSongSkill) {
                                            localStorage.setItem(`song_skills_detail_${selectedSongSkill.user_id}_${selectedSongSkill.id}`, JSON.stringify({
                                              rhythm: r,
                                              finger: f,
                                              expression: d
                                            }));
                                            setAssignedSongSkills(prev => prev.map(s => s.id === selectedSongSkill.id ? { ...s, progress_percent: avg, is_stage_ready: avg === 100 } : s));
                                          }
                                        }}
                                        style={{
                                          width: '100%',
                                          WebkitAppearance: 'none',
                                          height: '8px',
                                          borderRadius: '4px',
                                          background: `linear-gradient(to right, ${slider.color} 0%, ${slider.color} ${slider.value}%, #e2e8f0 ${slider.value}%, #e2e8f0 100%)`,
                                          outline: 'none',
                                          cursor: 'pointer'
                                        }}
                                        className="custom-sub-slider"
                                      />
                                    </div>
                                  </div>
                                ))}
                                <style dangerouslySetInnerHTML={{__html: `
                                  .custom-sub-slider::-webkit-slider-thumb {
                                    -webkit-appearance: none;
                                    appearance: none;
                                    width: 18px;
                                    height: 18px;
                                    border-radius: 50%;
                                    background: #ffffff;
                                    border: 1px solid #cbd5e1;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                    cursor: pointer;
                                    transition: transform 0.1s;
                                  }
                                  .custom-sub-slider::-webkit-slider-thumb:hover {
                                    transform: scale(1.15);
                                  }
                                `}} />
                              </div>
                            )}

                            {/* Mark as Mastered button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSongStatus('mastered');
                                  setSongRhythmVal(100);
                                  setSongFingerVal(100);
                                  setSongDynamicsVal(100);
                                  setSongTotalProgressVal(100);
                                  if (selectedSongSkill) {
                                    setAssignedSongSkills(prev => prev.map(s => s.id === selectedSongSkill.id ? { ...s, progress_percent: 100, is_stage_ready: true } : s));
                                  }
                                }}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '20px',
                                  padding: '8px 16px',
                                  fontSize: '0.82rem',
                                  fontWeight: 800,
                                  color: '#0f172a',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'all 0.15s ease',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = '#f1f5f9';
                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = '#f8fafc';
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                              >
                                Song als gemeistert markieren ⭐
                              </button>
                            </div>
                          </div>

                          {/* Interne Notizen (Lehrer-Sicht) */}
                          <div style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            padding: '20px',
                            borderRadius: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                            marginTop: '20px'
                          }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                              Interne Notizen (Lehrer-Sicht)
                            </label>
                            <textarea
                              placeholder="Notizen zum Schüler, Stärken oder Schwächen..."
                              value={songInternalNotes}
                              onChange={e => setSongInternalNotes(e.target.value)}
                              rows={5}
                              style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '12px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.82rem',
                                fontWeight: 650,
                                outline: 'none',
                                fontFamily: 'inherit',
                                resize: 'vertical'
                              }}
                            />
                          </div>


                        </div>
                      );
                    })() : (
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0', borderBottom: '2px solid #cbd5e1', paddingBottom: '6px' }}>
                          ➕ Schüler zuteilen
                        </h3>

                        <div style={{ position: 'relative', marginBottom: '16px', width: '100%' }}>
                          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                          <input
                            type="text"
                            placeholder="Schüler suchen..."
                            value={assignStudentSearch}
                            onChange={e => setAssignStudentSearch(e.target.value)}
                            onFocus={() => setIsAssignSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsAssignSearchFocused(false), 250)}
                            style={{
                              width: '100%',
                              padding: '10px 12px 10px 36px',
                              borderRadius: '12px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.88rem',
                              fontWeight: 650,
                              outline: 'none',
                              background: 'white'
                            }}
                          />
                        </div>

                        {!(isAssignSearchFocused || assignStudentSearch.trim() !== '') ? (
                          <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', marginTop: '32px' }}>
                            Klicke in das Suchfeld, um Schüler anzuzeigen...
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            {unassignedStudents.map((s: any) => (
                              <div key={s.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'white',
                                border: '1px solid #cbd5e1',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                              }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                                  {s.first_name} {s.last_name}
                                </span>
                                <button
                                  onClick={() => {
                                    handleAssignStudentToSong(s.id, 'Allgemein');
                                    setAssignStudentSearch('');
                                  }}
                                  style={{
                                    background: '#fbbc05',
                                    color: '#1e293b',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '5px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s'
                                  }}
                                  className="hover-scale-mini"
                                >
                                  Hinzufügen
                                </button>
                              </div>
                            ))}
                            {unassignedStudents.length === 0 && (
                              <p style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', marginTop: '12px' }}>
                                Keine weiteren Schüler zum Zuteilen verfügbar.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div> {/* Close Content Container (Scrollable) */}

                  {/* Fixed Footer for Speichern & Schließen */}
                  {selectedStudentForProgress && selectedSongSkill && (
                    <div style={{
                      position: 'absolute',
                      bottom: '24px',
                      left: 'calc(50% + 6px)', // offset slightly to the right to visually center considering binder spacing on the left
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      justifyContent: 'center',
                      zIndex: 100
                    }}>
                      <button
                        type="button"
                        onClick={async () => {
                          await triggerAutoSaveSongProgress();
                          setSelectedSongForDetail(null);
                          setSelectedStudentForProgress(null);
                          setSelectedSongSkill(null);
                        }}
                        style={{
                          background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
                          color: '#000000',
                          border: '1.5px solid #000000',
                          padding: '12px 24px',
                          borderRadius: '16px',
                          fontSize: '0.9rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                      >
                        <Check size={16} strokeWidth={3} /> Speichern & Schließen
                      </button>
                    </div>
                  )}
                </div>

                {/* Ringbook Spine overlay (Golden Rings) */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  zIndex: 30,
                  pointerEvents: 'none'
                }}>
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} style={{
                      position: 'relative',
                      width: '100%',
                      height: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '28px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'transparent',
                        border: '3px solid #d4af37',
                        borderTopColor: '#ffe57f',
                        borderLeftColor: '#ffc107',
                        borderRightColor: '#ffc107',
                        borderBottomColor: '#b78a02',
                        boxShadow: '0 3px 5px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
                        transform: 'scaleY(0.8)'
                      }} />
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        )})()}

      {showTextbausteinModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '950px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚡</span>
                  <span>Textbausteine verwalten</span>
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0', fontWeight: 600 }}>
                  Erstelle, bearbeite oder lösche deine Schnell-Notizvorlagen.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowTextbausteinModal(false);
                  setEditingTextbaustein(null);
                  setTbLabel('');
                  setTbText('');
                  setTbType('both');
                  setTbCategory('rhythm');
                  setTbSearch('');
                  setSelectedCategoryFilter('all');
                }} 
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content: Form and List in Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', minHeight: 0, flex: 1 }}>
              
              {/* Form Column */}
              <form onSubmit={handleSaveTextbaustein} style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', justifyContent: 'space-between', height: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                    {editingTextbaustein ? '✏️ Baustein bearbeiten' : '➕ Neuer Baustein'}
                  </h3>

                  {/* Icon selector button trigger */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Wähle ein Icon</label>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: 'white',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        outline: 'none'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = brandColor}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                      <span style={{ fontSize: '1.8rem', background: '#f1f5f9', width: '48px', height: '48px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {selectedIcon}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>Emoji auswählen</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Klicken, um die Emoji-Liste anzuzeigen</span>
                      </div>
                    </button>
                  </div>

                  {/* Label (Name) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Schnell-Textname (ohne Icon)</label>
                    <input 
                      required 
                      placeholder="z.B. Schnecken-Tempo" 
                      value={tbLabel} 
                      onChange={e => setTbLabel(e.target.value)} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                    />
                  </div>

                  {/* Inhalt des Textbausteins */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Inhalt des Textbausteins</label>
                    <textarea 
                      required 
                      placeholder="Dieser Text wird beim Klicken eingefügt..." 
                      value={tbText} 
                      onChange={e => setTbText(e.target.value)} 
                      rows={8} 
                      style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 650, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  {/* Kategorie */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Kategorie</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { id: 'rhythm', label: '🥁 Rhythmus' },
                        { id: 'technique', label: '🎹 Technik' },
                        { id: 'performance', label: '🎭 Ausdruck' }
                      ].map(cat => {
                        const isSelected = tbCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setTbCategory(cat.id as any)}
                            style={{
                              flex: 1,
                              padding: '8px 4px',
                              borderRadius: '10px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              border: isSelected ? `1.5px solid ${brandColor}` : '1.5px solid #cbd5e1',
                              background: isSelected ? `${brandColor}10` : 'white',
                              color: isSelected ? brandColor : '#475569',
                              transition: 'all 0.15s'
                            }}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scope */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Bereich zuordnen</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(['both', 'songs', 'lehrwerke'] as const).map(type => {
                        const labelMap = { both: 'Beide', songs: 'Songs', lehrwerke: 'Lehrwerke' };
                        const isSelected = tbType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setTbType(type)}
                            style={{
                              flex: 1,
                              padding: '8px 6px',
                              borderRadius: '10px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              border: isSelected ? `1.5px solid ${brandColor}` : '1.5px solid #e2e8f0',
                              background: isSelected ? `${brandColor}10` : 'white',
                              color: isSelected ? brandColor : '#475569',
                              transition: 'all 0.15s'
                            }}
                          >
                            {labelMap[type]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px' }}>
                  <button 
                    type="submit" 
                    style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Speichern
                  </button>
                  {editingTextbaustein && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingTextbaustein(null);
                        setTbLabel('');
                        setTbText('');
                        setTbType('both');
                        setTbCategory('rhythm');
                      }} 
                      style={{ flex: 1, background: '#e2e8f0', color: '#475569', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      Abbrechen
                    </button>
                  )}
                </div>
              </form>

              {/* List Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Bestehende Bausteine</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', padding: '4px 10px', borderRadius: '9999px' }}>
                      {textbausteine.length}
                    </span>
                  </h3>
                </div>

                {/* Search Field */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Bausteine durchsuchen..."
                    value={tbSearch}
                    onChange={e => setTbSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 650,
                      outline: 'none',
                      background: 'white'
                    }}
                  />
                </div>

                {/* Category tabs */}
                <div style={{ display: 'flex', gap: '4px', padding: '2px', background: '#f1f5f9', borderRadius: '12px' }}>
                  {[
                    { id: 'all', label: 'Alle' },
                    { id: 'rhythm', label: '🥁 Rhythmus' },
                    { id: 'technique', label: '🎹 Technik' },
                    { id: 'performance', label: '🎭 Ausdruck' }
                  ].map(cat => {
                    const isSelected = selectedCategoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(cat.id as any)}
                        style={{
                          flex: 1,
                          padding: '6px 4px',
                          borderRadius: '10px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          border: 'none',
                          background: isSelected ? 'white' : 'transparent',
                          color: isSelected ? '#1f2937' : '#64748b',
                          boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          transition: 'all 0.15s'
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingRight: '6px' }}>
                  {textbausteine
                    .filter((tb: any) => {
                      if (selectedCategoryFilter !== 'all' && tb.category !== selectedCategoryFilter) return false;
                      if (tbSearch.trim() !== '') {
                        const query = tbSearch.toLowerCase();
                        return tb.label.toLowerCase().includes(query) || tb.text.toLowerCase().includes(query);
                      }
                      return true;
                    })
                    .map((tb: any) => {
                      const badgeStyle = 
                        tb.type === 'songs' 
                          ? { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5', label: 'Songs' }
                          : tb.type === 'lehrwerke'
                            ? { bg: '#f5f3ff', text: '#6d28d9', border: '#ede9fe', label: 'Lehrwerke' }
                            : { bg: '#eff6ff', text: '#1d4ed8', border: '#dbeafe', label: 'Beide' };

                      const isCurrentEditing = editingTextbaustein?.id === tb.id;

                      return (
                        <div 
                          key={tb.id} 
                          onClick={() => {
                            setEditingTextbaustein(tb);
                            setTbLabel(tb.label); // Note: useEffect will cleanly split label and selectedIcon!
                            setTbText(tb.text);
                            setTbType(tb.type);
                            setTbCategory(tb.category || 'rhythm');
                          }}
                          style={{ 
                            border: isCurrentEditing ? `2px solid ${brandColor}` : '1px solid #e2e8f0', 
                            borderRadius: '16px', 
                            padding: '14px', 
                            background: isCurrentEditing ? `${brandColor}05` : 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            opacity: tb.active ? 1 : 0.6,
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            cursor: 'pointer'
                          }}
                          className="hover-scale-mini"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                              {tb.label}
                            </span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, background: badgeStyle.bg, color: badgeStyle.text, border: `1px solid ${badgeStyle.border}`, padding: '3px 8px', borderRadius: '8px' }}>
                              {badgeStyle.label}
                            </span>
                          </div>

                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#4b5563', lineHeight: '1.4', fontWeight: 650 }}>
                            {tb.text}
                          </p>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px dashed #f1f5f9', paddingTop: '10px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTextbausteinActive(tb.id);
                              }}
                              style={{
                                background: tb.active ? '#f0fdf4' : '#f1f5f9',
                                color: tb.active ? '#16a34a' : '#64748b',
                                border: tb.active ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                padding: '6px 12px',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s'
                              }}
                            >
                              {tb.active ? '🟢 Aktiv' : '⚪ Inaktiv'}
                            </button>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTextbaustein(tb);
                                  setTbLabel(tb.label);
                                  setTbText(tb.text);
                                  setTbType(tb.type);
                                  setTbCategory(tb.category || 'rhythm');
                                }}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  padding: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '8px',
                                  transition: 'all 0.15s'
                                }}
                                className="hover-bg"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTextbaustein(tb.id);
                                }}
                                style={{
                                  background: '#fff1f2',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '8px',
                                  transition: 'all 0.15s'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {showEmojiPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 7000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel animation-scale-up" style={{ background: 'white', padding: '32px', borderRadius: '28px', maxWidth: '640px', width: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Icon auswählen</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Wähle ein passendes Icon für diesen Textbaustein</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowEmojiPicker(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(8, 1fr)', 
              gap: '10px', 
              background: '#f8fafc', 
              padding: '16px', 
              borderRadius: '16px', 
              border: '1px solid #e2e8f0', 
              overflowY: 'auto', 
              flex: 1 
            }}>
              {AVAILABLE_ICONS.filter(icon => {
                const usedIcons = textbausteine
                   .filter(tb => !editingTextbaustein || tb.id !== editingTextbaustein.id)
                   .map(tb => tb.label.split(' ')[0]);
                return !usedIcons.includes(icon);
              }).map(icon => {
                const isSelected = selectedIcon === icon;
                return (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      setSelectedIcon(icon);
                      setShowEmojiPicker(false);
                    }}
                    style={{
                      fontSize: '1.8rem',
                      padding: '10px',
                      borderRadius: '12px',
                      border: isSelected ? `2.5px solid ${brandColor}` : '2px solid transparent',
                      background: isSelected ? `${brandColor}15` : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {icon}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showTageskompassModal && selectedStudentForTageskompass && (
        <MeisterwerkDocumentationModal
          student={{
            id: selectedStudentForTageskompass.id,
            first_name: selectedStudentForTageskompass.first_name,
            last_name: selectedStudentForTageskompass.last_name,
            photo_url: selectedStudentForTageskompass.photo_url || '/avatar_ghost.jpg'
          }}
          onClose={() => {
            setShowTageskompassModal(false);
            setSelectedStudentForTageskompass(null);
            setInitialLehrwerkIdForTageskompass(null);
          }}
          teacherId={userId}
          initialLehrwerkId={initialLehrwerkIdForTageskompass || undefined}
        />
      )}

      {/* Modals for Band Editing (Teacher Sonderrecht) */}
      {editingBand && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <form onSubmit={handleSaveBandEdit} className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Band bearbeiten</h2>
              <button type="button" onClick={() => setEditingBand(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Bandname</label>
                  <input required value={editingBand.name} onChange={e => setEditingBand({...editingBand, name: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '6px', fontWeight: 700, background: '#f8fafc' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Genre</label>
                  <input value={editingBand.genre || ''} onChange={e => setEditingBand({...editingBand, genre: e.target.value})} placeholder="z.B. Rock, Pop" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '6px', fontWeight: 700, background: '#f8fafc' }} />
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Bandcoach</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                    <input 
                      type="checkbox" 
                      checked={editingBand.coach_is_manual} 
                      onChange={e => setEditingBand({...editingBand, coach_is_manual: e.target.checked})} 
                    />
                    Manuell festlegen
                  </label>
                </div>
                
                <select 
                  value={editingBand.coach_id || ''} 
                  onChange={e => setEditingBand({...editingBand, coach_id: e.target.value, coach_is_manual: true})}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, background: 'white' }}
                >
                  <option value="">Kein Coach / Automatisch</option>
                  {teachers.filter(t => !t.is_observer).map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name || ''}</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '8px', fontWeight: 600 }}>
                  {editingBand.coach_is_manual 
                    ? 'Coach wurde manuell zugewiesen.' 
                    : 'Automatisch: Der Lehrer mit den meisten verifizierten Mitgliedern.'}
                </p>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Mitglieder verwalten</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(editingBand.band_members || []).map((m: any) => {
                    const u = Array.isArray(m.users) ? m.users[0] : m.users;
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ width: '32px', height: '32px', borderRadius: '10px', overflow: 'hidden', background: m.user_id ? '#f1f5f9' : '#000000', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             {m.user_id ? (
                               <img src={u?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                             ) : (
                               <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 900 }}>{m.external_name?.[0] || 'E'}</span>
                             )}
                           </div>
                           <div>
                             <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                               {m.user_id ? `${u?.first_name} ${u?.last_name || ''}` : m.external_name}
                             </div>
                             <div style={{ fontSize: '0.7rem', fontWeight: 700, color: brandColor, textTransform: 'uppercase' }}>{m.instrument}</div>
                           </div>
                         </div>
                        <button type="button" onClick={() => handleRemoveMember(m.id)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => setShowAddMember(editingBand.id)} style={{ padding: '16px', borderRadius: '16px', border: '2px dashed #cbd5e1', background: 'transparent', color: brandColor, fontWeight: 800, cursor: 'pointer', marginTop: '4px' }}>
                    + Weiteren Schüler hinzufügen
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)' }}>Änderungen speichern</button>
                <button type="button" onClick={() => setEditingBand(null)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}>Schließen</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Add Member Search Modal */}
      {showAddMember && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '450px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Schüler suchen</h2>
              <button onClick={() => setShowAddMember(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                placeholder="Name eingeben..." 
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700 }}
              />
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
              {(() => {
                const currentMemberIds = editingBand?.band_members?.map((m: any) => m.user_id) || [];
                return students.filter(s => 
                  !currentMemberIds.includes(s.id) &&
                  `${s.first_name} ${s.last_name}`.toLowerCase().includes(memberSearch.toLowerCase())
                ).map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={s.photo_url || '/avatar_ghost.jpg'} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.first_name} {s.last_name}</div>
                   </div>
                   <select 
                     onChange={(e) => handleAddMember(showAddMember, s.id, e.target.value)}
                     defaultValue=""
                     style={{ padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: 800, fontSize: '0.75rem', background: 'white' }}
                   >
                     <option value="" disabled>Instrument?</option>
                     {Object.keys(ADMIN_INSTRUMENT_ICONS).map(inst => <option key={inst} value={inst}>{inst}</option>)}
                   </select>
                </div>
                ));
              })()}
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '24px', paddingTop: '24px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Externen Schüler hinzufügen</h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                  placeholder="Name (z.B. Gesangsschülerin)" 
                  value={externalName}
                  onChange={e => setExternalName(e.target.value)}
                  style={{ flex: 2, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, background: '#f8fafc' }}
                />
                <select 
                  value={externalInstrument}
                  onChange={e => setExternalInstrument(e.target.value)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, background: 'white' }}
                >
                  {Object.keys(INSTRUMENT_COLORS).map(inst => <option key={inst} value={inst}>{inst}</option>)}
                </select>
                <button 
                  type="button"
                  onClick={() => handleAddMember(showAddMember!, null, externalInstrument, externalName)}
                  disabled={!externalName}
                  style={{ padding: '0 20px', borderRadius: '12px', border: 'none', background: brandColor, color: 'white', fontWeight: 800, cursor: 'pointer', opacity: externalName ? 1 : 0.5 }}
                >
                  +
                </button>
              </div>
            </div>
            
            <button onClick={() => setShowAddMember(null)} style={{ width: '100%', marginTop: '20px', padding: '16px', borderRadius: '16px', border: 'none', background: '#f1f5f9', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}

function IDGallery({ users, brandColor, onShowQR }: { users: any[], brandColor: string, onShowQR: (user: any) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'teacher' | 'student' | 'vocalist'>('all');
  
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filterType === 'all') {
      return true;
    } else if (filterType === 'teacher') {
      return u.role === 'teacher' || u.role === 'admin';
    } else if (filterType === 'student') {
      return u.role === 'student' && !u.is_external_vocalist;
    } else if (filterType === 'vocalist') {
      return u.is_external_vocalist;
    }
    return true;
  });

  return (
    <div style={{ marginTop: '0px' }}>
      <style>{`
        .id-card-hover {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .id-card-hover:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: 0 30px 60px rgba(0,0,0,0.15) !important;
          z-index: 10;
        }
      `}</style>
      
      <div className="glass-panel" style={{ padding: '40px', background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(20px)', borderRadius: '32px', border: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)' }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px', letterSpacing: '-0.03em' }}>ID Gallerie</h2>
            <p style={{ color: '#64748b', fontWeight: 500 }}>Vollständige Galerie aller Lehrer und Schüler im Event-Stil.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {/* Filter Switch */}
            <div style={{ background: 'rgba(241, 245, 249, 0.8)', padding: '4px', borderRadius: '14px', display: 'flex', gap: '4px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
              {[
                { type: 'all', label: 'Alle' },
                { type: 'teacher', label: 'Lehrer' },
                { type: 'student', label: 'Schüler' },
                { type: 'vocalist', label: 'Gesangsschüler' }
              ].map(opt => (
                <button 
                  key={opt.type}
                  onClick={() => setFilterType(opt.type as any)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '10px', 
                    border: 'none', 
                    background: filterType === opt.type ? 'white' : 'transparent',
                    color: filterType === opt.type ? '#1e293b' : '#94a3b8',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    boxShadow: filterType === opt.type ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Name suchen..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 12px 12px 48px', 
                  borderRadius: '14px', 
                  border: '1px solid rgba(255,255,255,0.5)', 
                  background: 'rgba(255,255,255,0.8)',
                  color: '#1e293b',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  outline: 'none'
                }} 
              />
            </div>
          </div>
        </div>
        
        <div className="id-gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px' }}>
          {filteredUsers.map(u => (
            <div 
              key={u.id} 
              className="id-card id-card-hover"
              style={{ 
                background: 'white', 
                borderRadius: '24px', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                aspectRatio: '0.62',
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
              onClick={() => onShowQR(u)}
            >
              {/* Lanyard Hole Mockup */}
              <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
                <div style={{ width: '30px', height: '6px', borderRadius: '3px', background: '#0f172a' }}></div>
              </div>

              {/* Status Header */}
              <div style={{ 
                background: u.role === 'student' ? brandColor : '#f59e0b', 
                padding: '6px', 
                textAlign: 'center',
                textTransform: 'uppercase'
              }}>
                <div style={{ color: 'white', fontSize: '0.6rem', fontWeight: 1000, letterSpacing: '0.2em' }}>
                  {u.role === 'student' ? 'Member Access' : 'Staff / Coach'}
                </div>
              </div>

              {/* Content Area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 32px 20px', gap: '20px' }}>
                {/* Portrait */}
                <div style={{ 
                  width: '130px', 
                  height: '130px', 
                  borderRadius: '100px', 
                  border: `4px solid ${u.role === 'student' ? brandColor : '#f59e0b'}`,
                  padding: '6px',
                  background: 'white'
                }}>
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    borderRadius: '50%', 
                    overflow: 'hidden',
                    backgroundImage: `url(${u.photo_url || '/avatar_ghost.jpg'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: '#f1f5f9'
                  }}>
                  </div>
                </div>

                {/* Identity */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 1000, color: '#1e293b', lineHeight: 1.1 }}>{u.first_name}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginTop: '4px' }}>{u.last_name || 'Member'}</div>
                </div>

                {/* QR Code Container */}
                <div style={{ 
                  marginTop: 'auto', 
                  background: '#f8fafc', 
                  padding: '12px', 
                  borderRadius: '16px',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <QRCode value={u.qr_token || ''} size={110} />
                </div>
              </div>

              {/* Bottom Brand Stripe */}
              <div style={{ 
                height: '10px', 
                background: `linear-gradient(90deg, ${u.role === 'student' ? brandColor : '#f59e0b'}, #1e293b, ${u.role === 'student' ? brandColor : '#f59e0b'})` 
              }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeviceSetupScreen({ 
  rooms, 
  stations, 
  brandColor, 
  activeSessions, 
  students, 
  school,
  admin,
  kiosks,
  onUpdate,
  onCleanupPlanning,
  onResetPlanning
}: { 
  rooms: any[], 
  stations: any[], 
  brandColor: string, 
  activeSessions: any[], 
  students: any[], 
  school: any,
  admin: any,
  kiosks: any[],
  onUpdate: () => void,
  onCleanupPlanning: () => void,
  onResetPlanning: () => void
}) {
  const [activeSubTab, setActiveSubTab] = useState<'academy' | 'device' | 'maintenance'>('academy');
  const [selectedRoomId, setSelectedRoomId] = useState(() => rooms[0]?.id || '');
  const effectiveSchool = Array.isArray(school) ? school[0] : school;

  // Academy Setup state
  const [name, setName] = useState(effectiveSchool?.name || '');
  const [lat, setLat] = useState(effectiveSchool?.latitude?.toString() || '');
  const [lng, setLng] = useState(effectiveSchool?.longitude?.toString() || '');
  const [radius, setRadius] = useState(effectiveSchool?.geofence_radius_meters?.toString() || '100');
  const [hours, setHours] = useState<any>(effectiveSchool?.opening_hours || {
    monday: { start: '08:00', end: '20:00', active: true },
    tuesday: { start: '08:00', end: '20:00', active: true },
    wednesday: { start: '08:00', end: '20:00', active: true },
    thursday: { start: '08:00', end: '20:00', active: true },
    friday: { start: '08:00', end: '20:00', active: true },
    saturday: { start: '10:00', end: '16:00', active: false },
    sunday: { start: '10:00', end: '16:00', active: false }
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (effectiveSchool) {
      setName(effectiveSchool.name || '');
      setLat(effectiveSchool.latitude?.toString() || '');
      setLng(effectiveSchool.longitude?.toString() || '');
      setRadius(effectiveSchool.geofence_radius_meters?.toString() || '100');
      setHours(effectiveSchool.opening_hours || {
        monday: { start: '08:00', end: '20:00', active: true },
        tuesday: { start: '08:00', end: '20:00', active: true },
        wednesday: { start: '08:00', end: '20:00', active: true },
        thursday: { start: '08:00', end: '20:00', active: true },
        friday: { start: '08:00', end: '20:00', active: true },
        saturday: { start: '10:00', end: '16:00', active: false },
        sunday: { start: '10:00', end: '16:00', active: false }
      });
    }
  }, [effectiveSchool]);

  const days = [
    { id: 'monday', label: 'Montag' },
    { id: 'tuesday', label: 'Dienstag' },
    { id: 'wednesday', label: 'Mittwoch' },
    { id: 'thursday', label: 'Donnerstag' },
    { id: 'friday', label: 'Freitag' },
    { id: 'saturday', label: 'Samstag' },
    { id: 'sunday', label: 'Sonntag' }
  ];

  const handleSaveAcademy = async () => {
    if (!effectiveSchool?.id) {
      alert('Fehler: Keine Schul-ID gefunden.');
      return;
    }
    setIsSaving(true);
    const { error } = await supabase
      .from('schools')
      .update({ 
        name, 
        opening_hours: hours,
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
        geofence_radius_meters: radius ? Number(radius) : 100
      })
      .eq('id', effectiveSchool.id);
    
    setIsSaving(false);
    if (error) alert('Fehler: ' + error.message);
    else onUpdate();
  };

  const roomStations = stations.filter(s => s.room_id === selectedRoomId);
  const activeRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];
  const activeKiosk = activeRoom ? (kiosks || []).find(k => k.room_id === activeRoom.id && !k.station_id) : null;
  const roomKioskUrl = activeKiosk 
    ? `${window.location.origin}/?kiosk_token=${activeKiosk.secret_token}` 
    : (activeRoom ? `${window.location.origin}/?kiosk_room_id=${activeRoom.id}` : '');

  const getStationByNumber = (num: number) => {
    return roomStations.find(s => {
      const name = s.name || '';
      const lower = name.toLowerCase();
      return lower === `ipad ${num}` || lower === `ipad${num}`;
    });
  };

  const lehrerStation = roomStations.find(s => {
    const name = s.name || '';
    const lower = name.toLowerCase();
    return lower.includes('lehrer') || lower.includes('teacher');
  });

  const renderStationCell = (station: any, defaultName: string, isLarge = false) => {
    if (!station) {
      return (
        <div style={{
          background: '#f8fafc',
          border: '2px dashed #cbd5e1',
          borderRadius: '24px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100px',
          color: '#94a3b8',
          fontSize: '0.75rem',
          fontWeight: 800,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ opacity: 0.6, fontSize: '1.2rem', marginBottom: '4px' }}>📴</div>
          {defaultName} (nicht aktiv)
        </div>
      );
    }

    const activeSession = activeSessions.find(s => s.station_id === station.id);
    const isCurrentDevice = localStorage.getItem('groovelab_station_id') === station.id;

    return (
      <div 
        onClick={async () => {
          if (isCurrentDevice) return;
          if (window.confirm(`Möchtest du dieses iPad fest für "${station.name}" konfigurieren?`)) {
            localStorage.setItem('groovelab_station_id', station.id);
            window.location.reload();
          }
        }}
        style={{
          background: isCurrentDevice 
            ? 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)' 
            : 'white',
          border: isCurrentDevice 
            ? `3px solid ${brandColor}` 
            : '2px solid #f1f5f9',
          borderRadius: '24px',
          padding: '16px',
          minHeight: '110px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          cursor: isCurrentDevice ? 'default' : 'pointer',
          boxShadow: isCurrentDevice 
            ? `0 12px 24px -10px ${brandColor}30, 0 4px 6px -2px ${brandColor}10` 
            : '0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 4px -1px rgba(148, 163, 184, 0.03)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isCurrentDevice ? 'none' : 'translateY(0px)',
          userSelect: 'none'
        }}
        
        
      >
        {isCurrentDevice && (
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: `linear-gradient(135deg, ${brandColor} 0%, #f59e0b 100%)`,
            color: 'white',
            fontSize: '0.6rem',
            fontWeight: 1000,
            padding: '3px 12px',
            borderRadius: '20px',
            boxShadow: `0 4px 8px ${brandColor}40`,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            letterSpacing: '0.05em'
          }}>
            <span>✨</span> DIESES IPAD <span>✨</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
               width: '32px',
               height: '32px',
               borderRadius: '10px',
               background: isCurrentDevice ? `${brandColor}15` : `${station.color && station.color !== '#e5e7eb' && station.color !== '#e2e8f0' ? station.color : getStationColor(station.name)}15`,
               color: isCurrentDevice ? brandColor : (station.color && station.color !== '#e5e7eb' && station.color !== '#e2e8f0' ? station.color : getStationColor(station.name)),
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               fontSize: '1rem',
               transition: 'all 0.2s'
            }}>
              <Tablet size={16} />
            </div>
            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1e293b' }}>
              {station.name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              color: activeSession ? '#10b981' : '#64748b',
              background: activeSession ? '#d1fae5' : '#f1f5f9',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              {activeSession ? 'Besetzt' : 'Frei'}
            </span>
          </div>
        </div>

        <div style={{ 
          margin: '10px 0', 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          background: activeSession ? '#f8fafc' : 'transparent',
          borderRadius: '16px',
          padding: activeSession ? '8px 12px' : '0 12px',
          border: activeSession ? '1px solid #f1f5f9' : 'none'
        }}>
          {activeSession ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundImage: `url(${activeSession.profiles?.photo_url || '/avatar_ghost.jpg'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: '#cbd5e1',
                border: '2px solid white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
              }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', lineHeight: 1.2 }}>
                  {activeSession.profiles?.first_name} {activeSession.profiles?.last_name?.charAt(0)}.
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                  am Üben...
                </div>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700, fontStyle: 'italic' }}>
              Zum Koppeln tippen
            </span>
          )}
        </div>

        <div style={{ width: '100%' }}>
          {isCurrentDevice ? (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (window.confirm("Dieses iPad wirklich entkoppeln und in den Mobil-Modus versetzen?")) {
                  localStorage.removeItem('groovelab_station_id');
                  window.location.reload();
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '12px',
                border: 'none',
                background: '#fee2e2',
                color: '#ef4444',
                fontSize: '0.75rem',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
              
              
            >
              <span>🔌</span> Kopplung aufheben
            </button>
          ) : (
            <div style={{
              width: '100%',
              padding: '8px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              color: '#64748b',
              fontSize: '0.75rem',
              fontWeight: 800,
              textAlign: 'center',
              transition: 'all 0.15s'
            }}>
              Koppeln
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: '0px' }}>
      {/* Premium sub-tab navigation */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: '#f1f5f9', padding: '6px', borderRadius: '16px', width: 'fit-content' }}>
        <button
          onClick={() => setActiveSubTab('academy')}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            background: activeSubTab === 'academy' ? 'white' : 'transparent',
            color: activeSubTab === 'academy' ? '#1e293b' : '#64748b',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: activeSubTab === 'academy' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Shield size={16} /> Einstellungen
        </button>
        <button
          onClick={() => setActiveSubTab('device')}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            background: activeSubTab === 'device' ? 'white' : 'transparent',
            color: activeSubTab === 'device' ? '#1e293b' : '#64748b',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: activeSubTab === 'device' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Monitor size={16} /> Geräte-Setup
        </button>
        <button
          onClick={() => setActiveSubTab('maintenance')}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            background: activeSubTab === 'maintenance' ? 'white' : 'transparent',
            color: activeSubTab === 'maintenance' ? '#1e293b' : '#64748b',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: activeSubTab === 'maintenance' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={16} /> Systemwartung
        </button>
      </div>

      {/* Subtab 1: Geräte-Setup (Classroom grid kiosk view) */}
      {activeSubTab === 'device' && (
        <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Räumliche Kiosk-Übersicht</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>Manuelle Umbuchungen & Echtzeit-iPad-Platzierungen vornehmen.</p>
            </div>
            
            {/* iPad local configuration reset */}
            {localStorage.getItem('groovelab_station_id') && (
              <button 
                onClick={() => {
                  if (window.confirm("Dieses Gerät wirklich entkoppeln und in den Mobil-Modus versetzen?")) {
                    localStorage.removeItem('groovelab_station_id'); 
                    window.location.reload(); 
                  }
                }}
                style={{ 
                  background: '#fee2e2', 
                  border: 'none', 
                  padding: '10px 18px', 
                  borderRadius: '12px', 
                  color: '#ef4444', 
                  fontWeight: 800, 
                  fontSize: '0.8rem',
                  cursor: 'pointer' 
                }}
              >
                Geräte-Kopplung aufheben
              </button>
            )}
          </div>

          {/* Room Selector Tab Bar */}
          {rooms.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {rooms.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoomId(r.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: selectedRoomId === r.id ? brandColor : '#f1f5f9',
                    color: selectedRoomId === r.id ? 'white' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}

          {/* Prominent Kiosk Link & QR Code Banner */}
          {activeRoom && (
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '24px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '1.5px dashed #cbd5e1',
              borderRadius: '24px',
              padding: '20px 24px',
              marginBottom: '24px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
              animation: 'fadeIn 0.3s'
            }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: `linear-gradient(135deg, ${brandColor} 0%, #f59e0b 100%)`,
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: 900,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    boxShadow: `0 4px 10px ${brandColor}20`
                  }}>
                    WICHTIG
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>
                    Allgemeiner Raum-Kiosk Link für "{activeRoom.name}"
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                  Dies ist der zentrale Einstiegspunkt für Schüler und Lehrer in diesem Raum. Öffne diesen Link auf einem iPad (oder scanne den QR-Code), um die interaktive Raum-Kiosk-Ansicht zu starten.
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    readOnly
                    value={roomKioskUrl}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      background: 'white',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      color: '#334155',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
                      outline: 'none'
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(roomKioskUrl);
                      alert(`Kiosk-Link für Raum "${activeRoom.name}" kopiert!`);
                    }}
                    style={{
                      background: brandColor,
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 18px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    
                    
                  >
                    Kopieren
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'white', padding: '12px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(roomKioskUrl)}`}
                  alt="Raum Kiosk QR Code"
                  style={{ width: '100px', height: '100px' }}
                />
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  QR-Code Scannen
                </span>
              </div>
            </div>
          )}

          {/* Seating Layout Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '20px',
            border: '1px solid #f1f5f9',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            {/* Row 1: iPads 3, 4, 5, 6 */}
            {renderStationCell(getStationByNumber(3), 'iPad 3')}
            {renderStationCell(getStationByNumber(4), 'iPad 4')}
            {renderStationCell(getStationByNumber(5), 'iPad 5')}
            {renderStationCell(getStationByNumber(6), 'iPad 6')}

            {/* Row 2: iPad 2, Lehrer-iPad (spans 2 columns), iPad 7 */}
            {renderStationCell(getStationByNumber(2), 'iPad 2')}
            <div style={{ gridColumn: 'span 2' }}>
              {renderStationCell(lehrerStation, 'Lehrer-iPad', true)}
            </div>
            {renderStationCell(getStationByNumber(7), 'iPad 7')}

            {/* Mittelgang Divider */}
            <div style={{
              gridColumn: 'span 4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 0',
              color: '#94a3b8',
              fontSize: '0.7rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
              borderTop: '1px dashed #e2e8f0',
              borderBottom: '1px dashed #e2e8f0',
              margin: '2px 0',
              userSelect: 'none'
            }}>
              ↕ Mittelgang ↕
            </div>

            {/* Row 3: iPad 1, empty space (entrance), iPad 8 */}
            {renderStationCell(getStationByNumber(1), 'iPad 1')}
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 600 }}>
              Eingang
            </div>
            {renderStationCell(getStationByNumber(8), 'iPad 8')}
          </div>
        </div>
      )}

      {/* Subtab 2: Einstellungen */}
      {activeSubTab === 'academy' && (
        <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${brandColor}10`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Einstellungen</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>Betriebszeiten und Sicherheitseinstellungen für dein Groovelab.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'stretch' }}>
              {/* Left Column: Öffnungszeiten */}
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>Öffnungszeiten</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {days.map((day, idx) => {
                    const isActive = hours[day.id]?.active !== false; // default open
                    return (
                      <div
                        key={day.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0',
                          padding: '13px 16px',
                          background: idx % 2 === 0 ? '#f8fafc' : 'white',
                          borderRadius: idx === 0 ? '14px 14px 0 0' : idx === days.length - 1 ? '0 0 14px 14px' : '0',
                          borderBottom: idx < days.length - 1 ? '1px solid #f1f5f9' : 'none',
                          opacity: isActive ? 1 : 0.55,
                          transition: 'opacity 0.2s'
                        }}
                      >
                        {/* Day label */}
                        <div style={{ width: '110px', fontWeight: 700, color: '#1e293b', fontSize: '0.88rem', flexShrink: 0 }}>{day.label}</div>

                        {/* Time inputs */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <input
                            type="time"
                            value={hours[day.id]?.start || '08:00'}
                            disabled={!isActive}
                            onChange={e => setHours({...hours, [day.id]: {...(hours[day.id] || {}), active: isActive, start: e.target.value}})}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              background: isActive ? 'white' : '#f8fafc',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              color: isActive ? '#1e293b' : '#94a3b8',
                              cursor: isActive ? 'text' : 'not-allowed',
                              outline: 'none',
                              width: '100px'
                            }}
                          />
                          <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.8rem' }}>–</span>
                          <input
                            type="time"
                            value={hours[day.id]?.end || '20:00'}
                            disabled={!isActive}
                            onChange={e => setHours({...hours, [day.id]: {...(hours[day.id] || {}), active: isActive, end: e.target.value}})}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              background: isActive ? 'white' : '#f8fafc',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              color: isActive ? '#1e293b' : '#94a3b8',
                              cursor: isActive ? 'text' : 'not-allowed',
                              outline: 'none',
                              width: '100px'
                            }}
                          />
                        </div>

                        {/* Apple-style pill toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            color: isActive ? '#16a34a' : '#ef4444',
                            minWidth: '42px',
                            textAlign: 'right'
                          }}>
                            {isActive ? 'OFFEN' : 'ZU'}
                          </span>
                          <button
                            onClick={() => setHours({...hours, [day.id]: {...(hours[day.id] || {}), active: !isActive, start: hours[day.id]?.start || '08:00', end: hours[day.id]?.end || '20:00'}})}
                            style={{
                              position: 'relative',
                              width: '44px',
                              height: '26px',
                              borderRadius: '13px',
                              border: 'none',
                              background: isActive ? '#22c55e' : '#e2e8f0',
                              cursor: 'pointer',
                              transition: 'background 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              flexShrink: 0,
                              padding: 0,
                              outline: 'none',
                              boxShadow: isActive ? '0 0 0 2px #bbf7d0' : 'none'
                            }}
                            aria-label={isActive ? 'Tag schließen' : 'Tag öffnen'}
                          >
                            <div style={{
                              position: 'absolute',
                              top: '3px',
                              left: isActive ? '21px' : '3px',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: 'white',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                              transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Sicherheit & Geofencing */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0px' }}>Login-Sicherheit & Geofencing</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      onClick={() => setHours({ ...hours, enforce_hours: true })}
                      style={{ 
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: `2px solid ${hours.enforce_hours !== false ? brandColor : '#e2e8f0'}`,
                        background: hours.enforce_hours !== false ? `${brandColor}05` : 'white',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: hours.enforce_hours !== false ? brandColor : '#1e293b', marginBottom: '2px' }}>Strikte Öffnungszeiten</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.3 }}>Labor-Login mit Geotracking NUR innerhalb der Öffnungszeiten erlaubt.</div>
                    </button>
                    <button 
                      onClick={() => setHours({ ...hours, enforce_hours: false })}
                      style={{ 
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: `2px solid ${hours.enforce_hours === false ? brandColor : '#e2e8f0'}`,
                        background: hours.enforce_hours === false ? `${brandColor}05` : 'white',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: hours.enforce_hours === false ? brandColor : '#1e293b', marginBottom: '2px' }}>Flexible Öffnungszeiten</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.3 }}>Labor-Login mit Geotracking AUCH außerhalb der Öffnungszeiten erlaubt.</div>
                    </button>
                  </div>

                  <div style={{ height: '1px', background: '#e2e8f0', margin: '8px 0' }} />

                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0px' }}>Geofencing (Standort-Prüfung)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      onClick={() => setHours({ ...hours, geofence_bypass: false })}
                      style={{ 
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: `2px solid ${hours.geofence_bypass !== true ? brandColor : '#e2e8f0'}`,
                        background: hours.geofence_bypass !== true ? `${brandColor}05` : 'white',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: hours.geofence_bypass !== true ? brandColor : '#1e293b', marginBottom: '2px' }}>Geofencing Aktivieren (Standard)</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.3 }}>Beim Login wird der Standort des Geräts abgefragt. Nur wenn der Standort des Geräts und der des Groove Lab Raums übereinstimmen, wird er im Live Lab eingeloggt und sichtbar.</div>
                    </button>
                    <button 
                      onClick={() => setHours({ ...hours, geofence_bypass: true })}
                      style={{ 
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: `2px solid ${hours.geofence_bypass === true ? brandColor : '#e2e8f0'}`,
                        background: hours.geofence_bypass === true ? `${brandColor}05` : 'white',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: hours.geofence_bypass === true ? brandColor : '#1e293b', marginBottom: '2px' }}>Geofencing Ausschalten (Bypass)</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.3 }}>Jeder Login führt direkt ins Live Lab. Die Standortabfrage wird komplett übersprungen.</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSaveAcademy}
              disabled={isSaving}
              style={{ 
                width: 'fit-content',
                background: brandColor, 
                color: 'white', 
                border: 'none', 
                padding: '12px 28px', 
                borderRadius: '10px', 
                fontWeight: 800, 
                fontSize: '0.85rem',
                cursor: 'pointer',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              {isSaving ? 'Speichere...' : 'Einstellungen speichern'}
            </button>
          </div>
        </div>
      )}

      {/* Subtab 3: Systemwartung */}
      {activeSubTab === 'maintenance' && (
        <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444', margin: 0 }}>Systemwartung & Bereinigung</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>Hier kannst du Datenleichen entfernen und die Datenbank konsistent halten.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>Wochenplan bereinigen</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Entfernt inaktive Daten und synchronisiert Rosteinträge, um Dateileichen aus der Scheduler-Tabelle zu entfernen.</div>
              <button 
                onClick={onCleanupPlanning}
                style={{ 
                  width: 'fit-content',
                  background: 'white', 
                  border: '1px solid #fee2e2', 
                  color: '#ef4444', 
                  padding: '10px 18px', 
                  borderRadius: '10px', 
                  fontWeight: 700, 
                  fontSize: '0.8rem', 
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                
                
              >
                Wochenplan bereinigen (Datenleichen entfernen)
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>Wochenplan komplett leeren</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Versetzt den Scheduler für alle Schüler in den Ausgangszustand und löscht alle eingetragenen Zeitslots. Dieser Schritt kann nicht rückgängig gemacht werden!</div>
              <button 
                onClick={onResetPlanning}
                style={{ 
                  width: 'fit-content',
                  background: 'white', 
                  border: '1px solid #fee2e2', 
                  color: '#ef4444', 
                  padding: '10px 18px', 
                  borderRadius: '10px', 
                  fontWeight: 700, 
                  fontSize: '0.8rem', 
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                
                
              >
                Wochenplan komplett leeren
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>Übe-Statistiken zurücksetzen</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Setzt die aufgezeichneten Minuten und Übezeiten für alle Schülerprofile auf 0 zurück. Nützlich zum Beginn eines neuen Semesters.</div>
              <button 
                onClick={async () => {
                  if (window.confirm("Möchtest du die Übe-Statistik (eingeloggte Minuten) wirklich für alle Schüler zurücksetzen?")) {
                    setIsSaving(true);
                    const updatedHours = {
                      ...hours,
                      stats_reset_at: new Date().toISOString()
                    };
                    const { error } = await supabase
                      .from('schools')
                      .update({ opening_hours: updatedHours })
                      .eq('id', school.id);
                    setIsSaving(true);
                    if (error) alert("Fehler: " + error.message);
                    else {
                      setHours(updatedHours);
                      alert("Statistiken erfolgreich zurückgesetzt!");
                      onUpdate();
                    }
                  }
                }}
                style={{ 
                  width: 'fit-content',
                  background: 'white', 
                  border: '1px solid #fee2e2', 
                  color: '#ef4444', 
                  padding: '10px 18px', 
                  borderRadius: '10px', 
                  fontWeight: 700, 
                  fontSize: '0.8rem', 
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                
                
              >
                Übe-Statistiken zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
