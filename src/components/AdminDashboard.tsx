import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Calendar, AlertCircle, Library, Shield, LogOut, Users, User, Monitor, QrCode, Plus, Pencil, Trash2, Box, BarChart as LucideBarChart, Clock, Star, PieChart as LucidePieChart, TrendingUp, Tablet, ExternalLink, Settings, Search, Bell, MapPin, X, Printer, Award, Download, Mic, Check } from 'lucide-react';
import { 
  ResponsiveContainer,
  BarChart as RechartsBarChart, Bar, XAxis, Tooltip, Cell,
  PieChart as RechartsPieChart, Pie,
  Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';

const INSTRUMENT_COLORS: Record<string, string> = {
  "Guitar": "#ef4444", "E-Gitarre": "#ef4444",
  "Bass": "#eab308", "E-Bass": "#eab308", 
  "Drums": "#3b82f6", "E-Drums": "#3b82f6", 
  "Vocals": "#22c55e", 
  "Piano": "#a855f7", "E-Piano": "#a855f7", "Keys": "#a855f7" 
};
const ADMIN_INSTRUMENT_ICONS: Record<string, string> = { 
  "Gitarre": "🎸", "Guitar": "🎸", "E-Gitarre": "🎸",
  "Bass": "🎸", "E-Bass": "🎸", 
  "Drums": "🥁", "E-Drums": "🥁", 
  "Vocals": "🎤", "Gesang": "🎤",
  "Piano / Keys": "🎹", "Piano": "🎹", "E-Piano": "🎹", "Keys": "🎹"
};
const brandColor = "#eab308";
// Removed unused import
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
  // Younger / Kids - Warm Acoustic Style
  { id: 'g_guitar', url: '/avatar_girl_guitar.jpg', label: 'Classic Girl Guitar' },
  { id: 'b_guitar', url: '/avatar_boy_guitar.jpg', label: 'Classic Boy Guitar' },
  { id: 'g_piano', url: '/avatar_girl_piano.jpg', label: 'Classic Girl Piano' },
  { id: 'b_piano', url: '/avatar_boy_piano.jpg', label: 'Classic Boy Piano' },
  { id: 'g_drums', url: '/avatar_girl_drums.jpg', label: 'Classic Girl Drums' },
  { id: 'b_drums', url: '/avatar_boy_drums.jpg', label: 'Classic Boy Drums' },
  { id: 'g_bass', url: '/avatar_girl_bass.jpg', label: 'Classic Girl Bass' },
  { id: 'b_bass', url: '/avatar_boy_bass.jpg', label: 'Classic Boy Bass' },
  
  // Teenagers & Mid-Age - Warm Acoustic / Studio Style
  { id: 'teen_girl_eguitar_focused', url: '/avatars/teen_girl_eguitar_focused.png', label: 'Teen Girl Electric Guitar' },
  { id: 'student_teen_boy_guitar_1', url: '/avatars/student_teen_boy_guitar_1.png', label: 'Teen Boy Guitar (Casual)' },
  { id: 'student_girl_eguitar_3', url: '/avatars/student_girl_eguitar_3.png', label: 'Student Girl Guitar 3' },
  { id: 'teen_boy_eguitar_17', url: '/avatars/teen_boy_eguitar_17.png', label: 'Teen Boy Guitar (Rock)' },
  { id: 'student_girl_piano_2', url: '/avatars/student_girl_piano_2.png', label: 'Student Girl Piano 2' },
  { id: 'student_boy_vocals_1', url: '/avatars/student_boy_vocals_1.png', label: 'Student Boy Singer' },
  { id: 'student_girl_eguitar_2', url: '/avatars/student_girl_eguitar_2.png', label: 'Student Girl Guitar 2' },
  { id: 'student_boy_piano_2', url: '/avatars/student_boy_piano_2.png', label: 'Student Boy Piano 2' },
  { id: 'student_girl_ebass_1', url: '/avatars/student_girl_ebass_1.png', label: 'Student Girl Bass 1' },
  { id: 'student_boy_keyboard_1', url: '/avatars/student_boy_keyboard_1.png', label: 'Student Boy Keyboard' },
  { id: 'student_girl_drums_2', url: '/avatars/student_girl_drums_2.png', label: 'Student Girl Drums 2' },
  { id: 'student_boy_eguitar_2', url: '/avatars/student_boy_eguitar_2.png', label: 'Student Boy Guitar 2' },
  { id: 'student_girl_drums_3', url: '/avatars/student_girl_drums_3.png', label: 'Student Girl Drums 3' },
  { id: 'student_boy_ebass_1', url: '/avatars/student_boy_ebass_1.png', label: 'Student Boy Bass 1' },
  { id: 'student_girl_vocals_1', url: '/avatars/student_girl_vocals_1.png', label: 'Student Girl Singer' },
  { id: 'student_boy_drums_2', url: '/avatars/student_boy_drums_2.png', label: 'Student Boy Drums 2' },
  { id: 'voc_f', url: '/vocalist_female.png', label: 'Vocalist Female' },
  { id: 'student_boy_drums_3', url: '/avatars/student_boy_drums_3.png', label: 'Student Boy Drums 3' },
  
  // Digital Neon & Additional Teens
  { id: 'bandstyle_girl_eguitar', url: '/avatars/bandstyle_girl_eguitar.png', label: 'Bandstyle Girl Guitar' },
  { id: 'student_boy_producer_1', url: '/avatars/student_boy_producer_1.png', label: 'Student Boy Producer' },
  { id: 'bandstyle_girl_ebass', url: '/avatars/bandstyle_girl_ebass.png', label: 'Bandstyle Girl Bass' },
  { id: 'voc_m', url: '/vocalist_male.png', label: 'Vocalist Male' },
  { id: 'bandstyle_girl_edrums', url: '/avatars/bandstyle_girl_edrums.png', label: 'Bandstyle Girl Drums' },
  { id: 'student_bass_1', url: '/avatars/student_bass_1.png', label: 'Student Bass 1' },
  { id: 'bandstyle_girl_epiano', url: '/avatars/bandstyle_girl_epiano.png', label: 'Bandstyle Girl Piano' },
  { id: 'student_drums_1', url: '/avatars/student_drums_1.png', label: 'Student Drums 1' },
  
  // Remaining neutral acoustic teen boys
  { id: 'student_eguitar_1', url: '/avatars/student_eguitar_1.png', label: 'Student Guitar 1' },
  { id: 'student_piano_1', url: '/avatars/student_piano_1.png', label: 'Student Piano 1' },
  { id: 'student_vocals_1', url: '/avatars/student_vocals_1.png', label: 'Student Singer 1' },
  { id: 'student_tech_1', url: '/avatars/student_tech_1.png', label: 'Student Tech Pro' },
  
  // Remaining neon boys
  { id: 'bandstyle_boy_eguitar', url: '/avatars/bandstyle_boy_eguitar.png', label: 'Bandstyle Boy Guitar' },
  { id: 'bandstyle_boy_ebass', url: '/avatars/bandstyle_boy_ebass.png', label: 'Bandstyle Boy Bass' },
  { id: 'bandstyle_boy_edrums', url: '/avatars/bandstyle_boy_edrums.png', label: 'Bandstyle Boy Drums' },
  { id: 'bandstyle_boy_epiano', url: '/avatars/bandstyle_boy_epiano.png', label: 'Bandstyle Boy Piano' },
  
  // REQUESTED END-AVATARS
  { id: 'teen_boy_acoustic_guitar', url: '/avatars/teen_boy_acoustic_guitar.png', label: 'Teen Boy Acoustic Guitar' },
  { id: 'teen_girl_acoustic_guitar', url: '/avatars/teen_girl_acoustic_guitar.png', label: 'Teen Girl Acoustic Guitar' },
  { id: 'avatar_girl_new', url: '/avatar_girl_1777237237899.png', label: 'Girl (Premium)' },
  { id: 'b_def', url: '/avatar_boy.jpg', label: 'Classic Boy' }
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
}

export function AdminDashboard({ userId, onLogout, forceTab, onTabChange, onOpenBandProfile }: AdminDashboardProps) {
  const [admin, setAdmin] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [allBands, setAllBands] = useState<any[]>([]);
  const [galleryStudents, setGalleryStudents] = useState<any[]>([]);
  const [setupRooms, setSetupRooms] = useState<any[]>([]);
  const [setupStations, setSetupStations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('groovelab_active_tab') || forceTab || 'live');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  
  const [bandSearch, setBandSearch] = useState('');
  const [bandLetter, setBandLetter] = useState<string | null>(null);
  const [editingBand, setEditingBand] = useState<any>(null);
  const [showAddMember, setShowAddMember] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalInstrument, setExternalInstrument] = useState('Vocals');
  
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', birthDate: '', photoUrl: '/avatar_ghost.jpg', isExternalVocalist: false });
  const [vocalistOnlyMode, setVocalistOnlyMode] = useState(false);
  
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
  
  const [showAddStationForRoom, setShowAddStationForRoom] = useState<string | null>(null);
  const [newStationName, setNewStationName] = useState('');
  const [newStationColor, setNewStationColor] = useState('#e5e7eb');
  
  const [showAddSong, setShowAddSong] = useState(false);
  const [newSong, setNewSong] = useState({ artist: '', title: '', level: 1, media_link: '', tomplay_url: '', pdf_folder_url: '', pdf_drums_url: '', pdf_guitar_url: '', pdf_bass_url: '', pdf_vocals_url: '', pdf_keys_url: '', guitar_pro_url: '', bypass_wlan_check: false, instrumentation: { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 } as Record<string, number> });
  
  const [songSearch, setSongSearch] = useState('');
  const [songSearchType, setSongSearchType] = useState<'title' | 'artist'>('title');
  const [songAlphaFilter, setSongAlphaFilter] = useState<string | null>(null);
  
  const [selectedQRUser, setSelectedQRUser] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [studentLabMins, setStudentLabMins] = useState(0);
  const [studentHomeMins, setStudentHomeMins] = useState(0);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSessions, setStudentSessions] = useState<any[]>([]);
  const [studentRejections, setStudentRejections] = useState<any[]>([]);
  const qrCardRef = React.useRef<HTMLDivElement>(null);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [editingSong, setEditingSong] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [manualCoords, setManualCoords] = useState<Record<string, string>>({});
  const [showManualInput, setShowManualInput] = useState<string | null>(null);

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');

  const brandColor = admin?.schools?.brand_color || '#eab308';

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
      const { error } = await supabase.from('band_members').insert({
        band_id: bandId,
        user_id: userId,
        instrument: instrument,
        external_name: extName,
        confetti_seen: true
      });
      if (error) throw error;
      
      const { data: bandSongs } = await supabase.from('band_songs').select('id').eq('band_id', bandId);
      if (bandSongs && bandSongs.length > 0) {
         const slotsToInsert = bandSongs.map((bs: any) => ({
            band_song_id: bs.id,
            user_id: userId,
            instrument: instrument,
            status: 'joined',
            external_name: extName || null
         }));
         await supabase.from('band_song_slots').insert(slotsToInsert);
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
  }, [activeTab]);

  useEffect(() => {
    if (forceTab) {
      setActiveTab(forceTab);
      localStorage.setItem('groovelab_active_tab', forceTab);
    }
  }, [forceTab]);

  const fetchData = async () => {
    const { data: adminData } = await supabase
      .from('users')
      .select('*, schools(*)')
      .eq('id', userId)
      .single();
    setAdmin(adminData);

    if (adminData?.school_id) {
      if (activeTab === 'live') {
        const { data: sData } = await supabase
          .from('sessions')
          .select('*, profiles:users(*), stations(*)')
          .eq('school_id', adminData.school_id)
          .is('check_out_time', null)
          .order('start_time', { ascending: false });
        setActiveSessions(sData || []);
      } else if (activeTab === 'students') {
        const { data: studentsData } = await supabase
          .from('users')
          .select('*')
          .eq('school_id', adminData.school_id)
          .eq('role', 'student')
          .order('first_name');
        if (studentsData) setStudents(studentsData);
      } else if (activeTab === 'team') {
        const { data: teachersData } = await supabase
          .from('users')
          .select('*')
          .eq('school_id', adminData.school_id)
          .in('role', ['teacher', 'admin'])
          .order('first_name');
        if (teachersData) setTeachers(teachersData);
      } else if (activeTab === 'rooms') {
        const { data: roomsData } = await supabase
          .from('rooms')
          .select('*')
          .eq('school_id', adminData.school_id)
          .order('name');
        if (roomsData) setRooms(roomsData);

        const { data: stationsData } = await supabase
          .from('stations')
          .select('*, rooms!inner(school_id)')
          .eq('rooms.school_id', adminData.school_id)
          .order('name');
        if (stationsData) setStations(stationsData);
      } else if (activeTab === 'songs') {
        const { data: songsData } = await supabase
          .from('songs')
          .select('*')
          .eq('school_id', adminData.school_id)
          .order('artist');
        if (songsData) setSongs(songsData);
      } else if (activeTab === 'bands') {
        const { data: bandsData } = await supabase
          .from('bands')
          .select('*, songs(title, artist, instrumentation), band_members(*, users(*))')
          .eq('school_id', adminData.school_id)
          .order('name');
        if (bandsData) {
          setAllBands(bandsData); 
        }
        // Also fetch students for the search function in band edit
        const { data: studentsData } = await supabase
          .from('users')
          .select('*')
          .eq('school_id', adminData.school_id)
          .eq('role', 'student')
          .order('first_name');
        if (studentsData) setStudents(studentsData);
        
        // Also fetch teachers for coach selection
        const { data: teachersData } = await supabase
          .from('users')
          .select('*')
          .eq('school_id', adminData.school_id)
          .in('role', ['teacher', 'admin'])
          .order('first_name');
        if (teachersData) setTeachers(teachersData);
      } else if (activeTab === 'stats') {
        fetchStats(adminData.school_id);
      } else if (activeTab === 'gallery') {
        const { data: allUsers } = await supabase.from('users').select('*').eq('school_id', adminData.school_id).order('first_name');
        if (allUsers) {
          setStudents(allUsers.filter(u => u.role === 'student'));
          setTeachers(allUsers.filter(u => u.role === 'teacher' || u.role === 'admin'));
        }
      } else if (activeTab === 'setup') {
        const { data: rData } = await supabase.from('rooms').select('*').eq('school_id', adminData.school_id).order('name');
        setSetupRooms(rData || []);
        const { data: sData } = await supabase.from('stations').select('*, rooms!inner(school_id)').eq('rooms.school_id', adminData.school_id).order('name');
        setSetupStations(sData || []);
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

  const fetchStats = async (schoolId: string) => {
    const { count: studentCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'student');
    const { count: songCount } = await supabase.from('songs').select('*', { count: 'exact', head: true }).eq('school_id', schoolId);
    const { data: sessions } = await supabase.from('sessions').select('check_in_time, check_out_time, station_id').not('check_out_time', 'is', null);
    const { data: skills } = await supabase.from('user_song_skills').select('progress_percent, instrument');

    let totalMins = 0;
    let labMins = 0;
    let homeMins = 0;
    
    sessions?.forEach(s => {
      const start = new Date(s.check_in_time);
      const end = new Date(s.check_out_time!);
      const mins = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
      totalMins += mins;
      if (s.station_id) labMins += mins;
      else homeMins += mins;
    });

    const levelDist = { level1: 0, level2: 0, level3: 0 };
    const { data: songsData } = await supabase.from('songs').select('level');
    songsData?.forEach(s => {
      if (s.level === 1) levelDist.level1++;
      if (s.level === 2) levelDist.level2++;
      if (s.level === 3) levelDist.level3++;
    });

    const instUsage: any = {};
    const instXp: any = {};
    skills?.forEach(s => {
      instUsage[s.instrument] = (instUsage[s.instrument] || 0) + 1;
      const xp = s.progress_percent * 2;
      instXp[s.instrument] = (instXp[s.instrument] || 0) + xp;
    });

    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const weekdayData = days.map((day, idx) => {
      const mins = sessions?.filter(s => new Date(s.check_in_time).getDay() === idx)
        .reduce((acc, s) => {
          const start = new Date(s.check_in_time);
          const end = new Date(s.check_out_time!);
          return acc + Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
        }, 0) || 0;
      return { day, mins: Math.round(mins / 60) };
    });

    const { data: bandWallData } = await supabase.from('user_song_skills').select('song_id, instrument').eq('is_stage_ready', true);
    const songStatus: any = {};
    bandWallData?.forEach(s => {
      if (!songStatus[s.song_id]) songStatus[s.song_id] = new Set();
      songStatus[s.song_id].add(s.instrument);
    });
    const bandReadyCount = Object.values(songStatus).filter((set: any) => set.size >= 3).length;

    setStats({
      studentCount,
      songCount,
      totalMins,
      labMins,
      homeMins,
      levelDist,
      instUsage,
      instXp: Object.entries(instXp).map(([name, value]) => ({ name, value })),
      weekdayData,
      bandReadyCount,
      avgLabSessionMins: (sessions?.filter(s => s.station_id).length || 0) > 0 
        ? Math.round(labMins / (sessions?.filter(s => s.station_id).length || 1)) 
        : 0,
      avgHomeMinsPerWeek: (() => {
        const allDates = sessions?.map(s => new Date(s.check_in_time).getTime()) || [];
        if (allDates.length === 0) return 0;
        const minDate = Math.min(...allDates);
        const maxDate = Math.max(...allDates);
        const weeks = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24 * 7)));
        return Math.round(homeMins / weeks);
      })(),
      hourlyAttendance: (() => {
        const hourly = Array.from({ length: 15 }, (_, i) => ({ hour: `${i + 8}:00`, count: 0 })); // 8:00 to 22:00
        sessions?.filter(s => s.station_id).forEach(s => {
          const hr = new Date(s.check_in_time).getHours();
          if (hr >= 8 && hr <= 22) {
            hourly[hr - 8].count++;
          }
        });
        return hourly;
      })()
    });
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id) return;
    
    const qrToken = crypto.randomUUID();
    
    const { data, error } = await supabase.from('users').insert({
      school_id: admin.school_id, 
      role: 'student', 
      first_name: newStudent.firstName, 
      last_name: newStudent.lastName.length > 1 ? newStudent.lastName.charAt(0) + '.' : newStudent.lastName, 
      birth_date: null,
      photo_url: newStudent.photoUrl || '/avatar_ghost.jpg',
      qr_token: qrToken,
      is_external_vocalist: newStudent.isExternalVocalist,
      instrument: newStudent.isExternalVocalist ? 'Vocals' : 'Musiker'
    }).select().single();
    
    if (error) alert('Fehler: ' + error.message);
    else if (data) { 
      setStudents([...students, data]); 
      setShowAddStudent(false); 
      setNewStudent({ firstName: '', lastName: '', birthDate: '', photoUrl: '/avatar_ghost.jpg', isExternalVocalist: false }); 
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const { error } = await supabase.from('users').update({
      first_name: editingStudent.first_name,
      last_name: editingStudent.last_name,
      birth_date: editingStudent.birth_date
    }).eq('id', editingStudent.id);
    
    if (error) alert('Fehler: ' + error.message);
    else {
      setStudents(students.map(s => s.id === editingStudent.id ? editingStudent : s));
      setEditingStudent(null);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (window.confirm('Möchtest du diesen Schüler wirklich löschen? Alle Fortschritte gehen verloren.')) {
      try {
        // Cleanup related data to avoid FK constraint errors and orphaned entries
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
        
        setStudents(students.filter(s => s.id !== id));
      } catch (err: any) {
        alert('Fehler beim Löschen: ' + err.message);
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
    await supabase.from('band_members').insert({ 
      band_id: band.id, 
      user_id: newBand.coach_id || userId, 
      role: 'coach',
      instrument: 'Coach'
    });
    
    for (const m of selectedMembers) {
       await supabase.from('band_members').insert({
         band_id: band.id,
         user_id: m.user_id,
         role: 'member',
         instrument: m.instrument
       });
    }

    setShowAddBand(false);
    setNewBand({ name: '', song_id: '', coach_id: userId, photo_url: '' });
    setSelectedMembers([]);
    fetchData();
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id) return;
    const { data, error } = await supabase.from('users').insert({
      school_id: admin.school_id, 
      role: newTeacher.isAdmin ? 'admin' : 'teacher', 
      first_name: newTeacher.firstName, 
      last_name: newTeacher.lastName, 
      instrument: newTeacher.instrument || 'Guitar',
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
      longitude: newRoomLocation?.lng
    }).select().single();
    
    if (roomError) {
      alert('Fehler beim Raum anlegen: ' + roomError.message);
      return;
    }

    if (roomData) { 
      if (newRoomStationCount > 0) {
        const bulkStations = Array.from({ length: newRoomStationCount }).map((_, i) => ({
          room_id: roomData.id,
          name: `iPad ${i + 1}`
        }));
        await supabase.from('stations').insert(bulkStations);
      }

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
      setNewStationColor('#e5e7eb');
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

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin?.school_id) return;
    const { data, error } = await supabase.from('songs').insert({
      school_id: admin.school_id, 
      artist: newSong.artist, 
      title: newSong.title, 
      level: newSong.level, 
      media_link: newSong.media_link,
      tomplay_url: newSong.tomplay_url,
      pdf_folder_url: newSong.pdf_folder_url || '',
      pdf_drums_url: newSong.pdf_drums_url || '',
      pdf_guitar_url: newSong.pdf_guitar_url || '',
      pdf_bass_url: newSong.pdf_bass_url || '',
      pdf_vocals_url: newSong.pdf_vocals_url || '',
      pdf_keys_url: newSong.pdf_keys_url || '',
      guitar_pro_url: newSong.guitar_pro_url || '',
      bypass_wlan_check: !!newSong.bypass_wlan_check,
      instrumentation: newSong.instrumentation
    }).select().single();
    if (error) alert('Fehler: ' + error.message);
    else if (data) { 
      setSongs([...songs, data]); 
      setShowAddSong(false); 
      setNewSong({ artist: '', title: '', level: 1, media_link: '', tomplay_url: '', pdf_folder_url: '', pdf_drums_url: '', pdf_guitar_url: '', pdf_bass_url: '', pdf_vocals_url: '', pdf_keys_url: '', guitar_pro_url: '', bypass_wlan_check: false, instrumentation: { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1, 'E-Piano': 1 } }); 
    }
  };

  const handleUpdateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong) return;
    const { error } = await supabase.from('songs').update({
      artist: editingSong.artist,
      title: editingSong.title,
      level: editingSong.level,
      media_link: editingSong.media_link,
      tomplay_url: editingSong.tomplay_url,
      pdf_folder_url: editingSong.pdf_folder_url || '',
      pdf_drums_url: editingSong.pdf_drums_url || '',
      pdf_guitar_url: editingSong.pdf_guitar_url || '',
      pdf_bass_url: editingSong.pdf_bass_url || '',
      pdf_vocals_url: editingSong.pdf_vocals_url || '',
      pdf_keys_url: editingSong.pdf_keys_url || '',
      guitar_pro_url: editingSong.guitar_pro_url || '',
      bypass_wlan_check: !!editingSong.bypass_wlan_check,
      instrumentation: editingSong.instrumentation
    }).eq('id', editingSong.id);
    
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
  const [studentDetailTab, setStudentDetailTab] = useState<'profile' | 'logbook'>('profile');

  const fetchStudentProfile = async (student: any) => {
    setSelectedStudent(student);
    setStudentDetailTab('profile'); // Reset to default tab

    // Fetch student's bands and filter out duplicates
    const { data: bandsData } = await supabase
      .from('band_members')
      .select('bands(*)')
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
    { id: 'setup', label: 'Setup', icon: Settings },
  ];

  const renderLiveTab = () => (
    <div style={{ marginTop: '0' }}>
      <TeacherDashboard 
        userId={userId} 
        hideHeader={true} 
        viewMode="admin" 
        onTabChange={(id) => onTabChange?.(id)}
      />
    </div>
  );

  const renderBandsTab = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    const filteredBands = allBands.filter(band => {
      const matchesSearch = band.name.toLowerCase().includes(bandSearch.toLowerCase());
      const matchesLetter = !bandLetter || band.name.toUpperCase().startsWith(bandLetter);
      return matchesSearch && matchesLetter;
    });

    return (
      <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', gap: '32px' }}>
          {/* Main Column: Band Management */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '14px', margin: 0 }}>
              <div style={{ background: `${brandColor}15`, color: brandColor, padding: '10px', borderRadius: '14px', display: 'flex', alignItems: 'center' }}>
                <Award size={24} />
              </div>
              Band-Verwaltung
            </h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Band suchen..." 
                  value={bandSearch}
                  onChange={(e) => setBandSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 16px 10px 42px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, outline: 'none' }}
                />
              </div>
              <button 
                onClick={() => setShowAddBand(!showAddBand)} 
                style={{ 
                  background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`, 
                  color: 'white', 
                  border: 'none', 
                  padding: '12px 24px', 
                  borderRadius: '16px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  fontSize: '0.9rem', 
                  fontWeight: 900,
                  boxShadow: `0 8px 20px -6px ${brandColor}60`
                }}
              >
                <Plus size={20} strokeWidth={3} /> Band erstellen
              </button>
            </div>
          </div>

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
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
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
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', gap: '24px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: brandColor, textTransform: 'uppercase' }}>{band.genre || 'Bandprojekt'}</span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{uniqueMembersList.length} Mitglieder</span>
                    </div>
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
                    onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
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
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
    );
  };


  const renderStudentsTab = () => (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '14px', margin: 0 }}>
            <div style={{ background: `${brandColor}15`, color: brandColor, padding: '10px', borderRadius: '14px', display: 'flex', alignItems: 'center' }}>
              <Users size={24} />
            </div>
            Schülerverwaltung
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Filter Switch */}
            <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '16px', display: 'flex', gap: '4px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
              <button 
                onClick={() => setVocalistOnlyMode(false)}
                style={{ 
                  padding: '8px 20px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  background: !vocalistOnlyMode ? 'white' : 'transparent',
                  color: !vocalistOnlyMode ? '#1e293b' : '#94a3b8',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: !vocalistOnlyMode ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Musiker
              </button>
              <button 
                onClick={() => setVocalistOnlyMode(true)}
                style={{ 
                  padding: '8px 20px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  background: vocalistOnlyMode ? 'white' : 'transparent',
                  color: vocalistOnlyMode ? '#1e293b' : '#94a3b8',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: vocalistOnlyMode ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Gesangsschüler
              </button>
            </div>

            <button 
              onClick={() => setShowAddStudent(!showAddStudent)} 
              style={{ 
                background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`, 
                color: 'white', 
                border: 'none', 
                padding: '12px 24px', 
                borderRadius: '16px', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                fontSize: '0.9rem', 
                fontWeight: 900,
                boxShadow: `0 8px 20px -6px ${brandColor}60`,
                transition: 'all 0.2s ease'
              }}
            >
              <Plus size={20} strokeWidth={3} /> Neu anlegen
            </button>
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

            {/* Avatar Picker removed: students now get the ghost avatar by default */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>Speichern</button>
              <button type="button" onClick={() => setShowAddStudent(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
            </div>
          </form>
        )}

        {editingStudent && (
          <form onSubmit={handleUpdateStudent} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#fffbeb', border: `1px solid #fde68a`, borderRadius: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b45309' }}>Schüler bearbeiten</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <input required placeholder="Vorname" value={editingStudent.first_name} onChange={e => setEditingStudent({...editingStudent, first_name: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />
              <input required placeholder="Nachname" value={editingStudent.last_name} onChange={e => setEditingStudent({...editingStudent, last_name: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>Aktualisieren</button>
              <button type="button" onClick={() => setEditingStudent(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
            </div>
          </form>
        )}

        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Schüler suchen..." 
            value={studentSearch}
            onChange={e => setStudentSearch(e.target.value)}
            style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {students.filter(s => {
            const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
            const matchesSearch = fullName.includes(studentSearch.toLowerCase());
            const matchesType = vocalistOnlyMode ? s.is_external_vocalist : !s.is_external_vocalist;
            return matchesSearch && matchesType;
          }).map(s => (
            <div key={s.id} className="glass-panel" style={{ padding: '16px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '20px', border: '1px solid #f1f5f9', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div 
                onClick={() => fetchStudentProfile(s)}
                style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', flex: 1 }}
              >
                <div style={{ 
                  width: '52px', 
                  height: '52px', 
                  borderRadius: '16px', 
                  background: `${brandColor}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '2px solid white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <img 
                    src={s.photo_url || '/avatar_ghost.jpg'} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 2 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: brandColor, zIndex: 1 }}>{s.first_name?.[0]}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.05rem' }}>{s.first_name} {s.last_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>ID: {s.id.split('-')[0].toUpperCase()}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setEditingStudent(s)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "10px", cursor: "pointer", color: "#64748b", transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'} title="Bearbeiten"><Pencil size={18} /></button>
                <button onClick={() => setSelectedQRUser(s)} style={{ background: `${brandColor}10`, border: `1px solid ${brandColor}30`, padding: "10px", borderRadius: "10px", cursor: "pointer", color: brandColor }} title="QR Code"><QrCode size={18} /></button>
                <button onClick={() => handleDeleteStudent(s.id)} style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "10px", borderRadius: "10px", cursor: "pointer", color: "#ef4444" }} title="Löschen"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTeachersTab = () => (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '14px', margin: 0 }}>
            <div style={{ background: `${brandColor}15`, color: brandColor, padding: '10px', borderRadius: '14px', display: 'flex', alignItems: 'center' }}>
              <Shield size={24} />
            </div>
            Kollegium & Team
          </h2>
          <button 
            onClick={() => setShowAddTeacher(!showAddTeacher)} 
            style={{ 
              background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`, 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '16px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              fontSize: '0.9rem', 
              fontWeight: 900,
              boxShadow: `0 8px 20px -6px ${brandColor}60`,
              transition: 'all 0.2s ease'
            }}
          >
            <Plus size={20} strokeWidth={3} /> Team-Mitglied
          </button>
        </div>

        {showAddTeacher && (
          <form onSubmit={handleAddTeacher} className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: 'white', borderRadius: '24px', border: `1px solid ${brandColor}20` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <input required placeholder="Vorname" value={newTeacher.firstName} onChange={e => setNewTeacher({...newTeacher, firstName: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
              <input required placeholder="Nachname" value={newTeacher.lastName} onChange={e => setNewTeacher({...newTeacher, lastName: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
              <input type="checkbox" id="isAdmin" checked={newTeacher.isAdmin} onChange={e => setNewTeacher({...newTeacher, isAdmin: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: brandColor }} />
              <label htmlFor="isAdmin" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>Master-Lehrer Rechte (Admin-Dashboard Zugriff)</label>
            </div>
            
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Profilbild wählen:</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                {TEACHER_AVATARS.map(av => (
                  <div 
                    key={av.id}
                    onClick={() => setNewTeacher({...newTeacher, photoUrl: av.url})}
                    style={{ 
                      width: '72px', 
                      height: '72px', 
                      borderRadius: '24px', 
                      overflow: 'hidden', 
                      border: `4px solid ${newTeacher.photoUrl === av.url ? brandColor : 'white'}`,
                      boxShadow: newTeacher.photoUrl === av.url ? `0 0 0 2px ${brandColor}30` : '0 4px 12px rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: '#f1f5f9'
                    }}
                  >
                    <img src={av.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={av.label} />
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Instrumente / Schwerpunkte:</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {["Gitarre", "Bass", "Drums", "Vocals", "Piano / Keys"].map(inst => {
                  const isSelected = (newTeacher.instrument || '').includes(inst);
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => {
                        const current = (newTeacher.instrument || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                        const next = current.includes(inst) ? current.filter((s: string) => s !== inst) : [...current, inst];
                        setNewTeacher({...newTeacher, instrument: next.join(', ')});
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                        background: isSelected ? brandColor : 'white',
                        color: isSelected ? 'white' : '#1e293b',
                        fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      <span>{ADMIN_INSTRUMENT_ICONS[inst]}</span> {inst}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer' }}>Mitglied hinzufügen</button>
              <button type="button" onClick={() => setShowAddTeacher(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
            </div>
          </form>
        )}

        {editingTeacher && (
          <form onSubmit={handleUpdateTeacher} className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px', background: '#f8fafc', border: `2px solid ${brandColor}20`, borderRadius: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Profil bearbeiten</h3>
              <div style={{ padding: '8px 16px', background: 'white', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, color: brandColor, border: '1px solid #e2e8f0' }}>
                ID: {editingTeacher.id.slice(0,8)}...
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                <input required placeholder="Vorname" value={editingTeacher.first_name} onChange={e => setEditingTeacher({...editingTeacher, first_name: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                <input required placeholder="Nachname" value={editingTeacher.last_name} onChange={e => setEditingTeacher({...editingTeacher, last_name: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status & Rolle</label>
              <select value={editingTeacher.role} onChange={e => setEditingTeacher({...editingTeacher, role: e.target.value})} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, fontSize: '1rem' }}>
                <option value="teacher">Lehrkraft / Coach</option>
                <option value="admin">Lehrer (Admin-Zugriff)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Instrumente (Icons anklicken):</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', borderRadius: '16px', 
                        border: `2px solid ${isSelected ? brandColor : '#e2e8f0'}`,
                        background: isSelected ? `${brandColor}10` : 'white',
                        color: isSelected ? '#1e293b' : '#64748b',
                        fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: isSelected ? `0 4px 12px ${brandColor}20` : 'none'
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>{ADMIN_INSTRUMENT_ICONS[inst]}</span> {inst}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Musikalischer Werdegang (Bio)</label>
              <textarea placeholder="Erzähle etwas über deinen Werdegang..." value={editingTeacher.bio || ''} onChange={e => setEditingTeacher({...editingTeacher, bio: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', minHeight: '120px', fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Expertise & Stile</label>
                <input placeholder="z.B. Jazz, Rock, Metal, Theorie..." value={editingTeacher.expertise || ''} onChange={e => setEditingTeacher({...editingTeacher, expertise: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Bands & Projekte</label>
                <input placeholder="Aktuelle oder ehemalige Bands..." value={editingTeacher.bands || ''} onChange={e => setEditingTeacher({...editingTeacher, bands: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Lieblingsbands</label>
                <input placeholder="z.B. Metallica, Radiohead, Daft Punk..." value={editingTeacher.listening || ''} onChange={e => setEditingTeacher({...editingTeacher, listening: e.target.value})} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }} />
              </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '20px', borderRadius: '20px', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', boxShadow: `0 10px 30px ${brandColor}30`, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>Änderungen speichern</button>
              <button type="button" onClick={() => setEditingTeacher(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '20px', fontWeight: 800, cursor: 'pointer' }}>Abbrechen</button>
            </div>
          </form>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '32px', marginTop: '16px' }}>
          {teachers.map(t => (
            <div 
              key={t.id} 
              className="glass-panel" 
              style={{ 
                padding: '32px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '24px', 
                background: 'white', 
                borderRadius: '32px', 
                border: '1px solid #f1f5f9',
                boxShadow: '0 15px 40px rgba(0,0,0,0.04)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
              onClick={() => setEditingTeacher(t)}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '8px', background: t.role === 'admin' ? '#f59e0b' : brandColor }}></div>
              
              <div style={{ width: '100px', height: '100px', borderRadius: '32px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                <img src={t.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>{t.first_name} {t.last_name}</h3>
                  {t.role === 'admin' && <Shield size={16} color="#f59e0b" />}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: t.role === 'admin' ? '#f59e0b' : brandColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  Lehrer
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {t.instrument?.split(',').map((inst: string) => (
                    <span key={inst} style={{ padding: '6px 12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                      {ADMIN_INSTRUMENT_ICONS[inst.trim()] || '🎸'} {inst.trim()}
                    </span>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setSelectedQRUser(t)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '14px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}><QrCode size={20} /></button>
                <button onClick={() => handleDeleteTeacher(t.id)} style={{ background: '#fff1f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '14px', cursor: 'pointer', color: '#ef4444', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#ffe4e6'} onMouseLeave={e => e.currentTarget.style.background = '#fff1f2'}><Trash2 size={20} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRoomsTab = () => (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '14px', margin: 0 }}>
            <div style={{ background: `${brandColor}15`, color: brandColor, padding: '10px', borderRadius: '14px', display: 'flex', alignItems: 'center' }}>
              <Box size={24} />
            </div>
            Räume & Übeplätze
          </h2>
          <button 
            onClick={() => setShowAddRoom(!showAddRoom)} 
            style={{ 
              background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`, 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '16px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              fontSize: '0.9rem', 
              fontWeight: 900,
              boxShadow: `0 8px 20px -6px ${brandColor}60`,
              transition: 'all 0.2s ease'
            }}
          >
            <Plus size={20} strokeWidth={3} /> Neuer Raum
          </button>
        </div>

        {showAddRoom && (
          <form onSubmit={handleAddRoom} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'white', borderRadius: '20px', border: `1px solid ${brandColor}20` }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Neuen Raum anlegen</h3>
            <input required placeholder="Raum Name (z.B. Studio A, Live Room...)" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>Raum erstellen</button>
              <button type="button" onClick={() => setShowAddRoom(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
            </div>
          </form>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
          {rooms.map(room => (
            <div key={room.id} className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${brandColor}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box size={20} color={brandColor} />
                  </div>
                  <div>
                    {editingRoomId === room.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          autoFocus
                          value={editingRoomName}
                          onChange={e => setEditingRoomName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleUpdateRoomName(room.id);
                            if (e.key === 'Escape') setEditingRoomId(null);
                          }}
                          style={{ 
                            fontSize: '1rem', 
                            fontWeight: 700, 
                            padding: '4px 12px', 
                            borderRadius: '10px', 
                            border: `2px solid ${brandColor}`,
                            outline: 'none',
                            width: '200px'
                          }}
                        />
                        <button 
                          onClick={() => handleUpdateRoomName(room.id)}
                          style={{ 
                            background: brandColor, 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            width: '32px', 
                            height: '32px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: 'pointer' 
                          }}
                        >
                          <Check size={16} strokeWidth={3} />
                        </button>
                        <button 
                          onClick={() => setEditingRoomId(null)}
                          style={{ 
                            background: '#f1f5f9', 
                            color: '#64748b', 
                            border: 'none', 
                            borderRadius: '8px', 
                            width: '32px', 
                            height: '32px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: 'pointer' 
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => { setEditingRoomId(room.id); setEditingRoomName(room.name); }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{room.name}</h3>
                        <Pencil size={14} color="#94a3b8" />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                      {(room.geofence_points || []).map((pt: any, idx: number) => (
                        <div key={idx} style={{ 
                          background: '#f0fdf4', 
                          border: '1px solid #bbf7d0', 
                          borderRadius: '8px', 
                          padding: '6px 10px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '0.7rem',
                          color: '#166534',
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
                            style={{ background: brandColor, color: 'white', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Set
                          </button>
                        </div>
                      )}

                      {(room.geofence_points?.length > 0 || room.latitude) && (
                        <button 
                          onClick={() => handleClearGeofencePoints(room.id)}
                          style={{ background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', padding: '6px' }}
                        >
                          Alle löschen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowAddStationForRoom(room.id)} style={{ padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', color: brandColor, cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Plus size={14} /> iPad
                  </button>
                  <button onClick={() => handleDeleteRoom(room.id)} style={{ padding: '8px', borderRadius: '10px', background: '#fff1f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {showAddStationForRoom === room.id && (
                <form onSubmit={(e) => handleAddStation(e, room.id)} style={{ display: 'flex', gap: '8px', marginBottom: '16px', animation: 'fadeIn 0.3s' }}>
                  <input required placeholder="iPad Name (z.B. iPad 1)" value={newStationName} onChange={e => setNewStationName(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }} />
                  <button type="submit" style={{ background: brandColor, color: 'white', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem' }}>OK</button>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stations.filter(s => s.room_id === room.id).map(station => (
                  <div key={station.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, color: '#475569' }}>
                      <Tablet size={16} color={getStationColor(station.name)} /> {station.name}
                    </div>
                    <button onClick={() => handleDeleteStation(station.id)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }} onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                      <Trash2 size={14} />
                    </button>
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

  const renderSongsTab = () => (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '14px', margin: 0 }}>
            <div style={{ background: `${brandColor}15`, color: brandColor, padding: '10px', borderRadius: '14px', display: 'flex', alignItems: 'center' }}>
              <Library size={24} />
            </div>
            Songbibliothek
          </h2>
          <button 
            onClick={() => setShowAddSong(!showAddSong)} 
            style={{ 
              background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`, 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '16px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              fontSize: '0.9rem', 
              fontWeight: 900,
              boxShadow: `0 8px 20px -6px ${brandColor}60`,
              transition: 'all 0.2s ease'
            }}
          >
            <Plus size={20} strokeWidth={3} /> Song hinzufügen
          </button>
        </div>

        {/* Song Search & Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
              <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                placeholder={`Suche nach ${songSearchType === 'title' ? 'Songtitel' : 'Interpret'}...`}
                value={songSearch}
                onChange={e => setSongSearch(e.target.value)}
                style={{ width: '100%', padding: '16px 20px 16px 54px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}
              />
            </div>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '14px' }}>
              <button 
                onClick={() => setSongSearchType('title')}
                style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: songSearchType === 'title' ? 'white' : 'transparent', color: songSearchType === 'title' ? brandColor : '#64748b', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: songSearchType === 'title' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
              >
                Song
              </button>
              <button 
                onClick={() => setSongSearchType('artist')}
                style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: songSearchType === 'artist' ? 'white' : 'transparent', color: songSearchType === 'artist' ? brandColor : '#64748b', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: songSearchType === 'artist' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
              >
                Interpret
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button 
              onClick={() => setSongAlphaFilter(null)}
              style={{ 
                padding: '8px 16px', minWidth: '54px', borderRadius: '10px', border: 'none', fontSize: '0.75rem', fontWeight: 900,
                background: songAlphaFilter === null ? brandColor : '#f8fafc',
                color: songAlphaFilter === null ? 'white' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ALLE
            </button>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => (
              <button 
                key={char}
                onClick={() => setSongAlphaFilter(char)}
                style={{ 
                  width: '32px', height: '32px', borderRadius: '8px', border: 'none', fontSize: '0.75rem', fontWeight: 800,
                  background: songAlphaFilter === char ? brandColor : 'transparent',
                  color: songAlphaFilter === char ? 'white' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {char}
              </button>
            ))}
          </div>
        </div>


        
        {showAddSong && (
          <form onSubmit={handleAddSong} className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: 'white', borderRadius: '24px', border: `1px solid ${brandColor}20`, boxShadow: '0 20px 50px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Interpret / Band</label>
                <input required placeholder="z.B. Nirvana" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Songtitel</label>
                <input required placeholder="z.B. Smells Like Teenspirit" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Cloud Link (Noten / Material)</label>
              <div style={{ position: 'relative' }}>
                <Box size={20} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input placeholder="https://cloud.folder.link..." value={newSong.media_link} onChange={e => setNewSong({...newSong, media_link: e.target.value})} style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>OneDrive/Dropbox PDF-Ordner (Noten Ordner-Link)</label>
                <input placeholder="https://onedrive.live.com/... oder Dropbox..." value={newSong.pdf_folder_url || ''} onChange={e => setNewSong({...newSong, pdf_folder_url: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>OneDrive Guitar Pro Link (.gp)</label>
                <input placeholder="ms-onedrive://..." value={newSong.guitar_pro_url || ''} onChange={e => setNewSong({...newSong, guitar_pro_url: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ padding: '24px', background: '#eff6ff', borderRadius: '20px', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e3a8a', margin: 0 }}>Instrumenten-spezifische PDFs (Direktanzeige in App)</h4>
                <p style={{ fontSize: '0.8rem', color: '#3b82f6', margin: 0, fontWeight: 600 }}>🌟 Tipp: Kopiere hier direkte Dropbox/OneDrive Links zu den einzelnen PDF-Dateien. Diese werden für Schüler nahtlos direkt in der App geöffnet!</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e3a8a' }}>🎸 PDF E-Gitarre</label>
                  <input placeholder="https://..." value={newSong.pdf_guitar_url || ''} onChange={e => setNewSong({...newSong, pdf_guitar_url: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e3a8a' }}>🎸 PDF E-Bass</label>
                  <input placeholder="https://..." value={newSong.pdf_bass_url || ''} onChange={e => setNewSong({...newSong, pdf_bass_url: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e3a8a' }}>🥁 PDF E-Drums</label>
                  <input placeholder="https://..." value={newSong.pdf_drums_url || ''} onChange={e => setNewSong({...newSong, pdf_drums_url: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e3a8a' }}>🎹 PDF E-Piano / Keys</label>
                  <input placeholder="https://..." value={newSong.pdf_keys_url || ''} onChange={e => setNewSong({...newSong, pdf_keys_url: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e3a8a' }}>🎤 PDF Gesang / Vocals</label>
                <input placeholder="https://..." value={newSong.pdf_vocals_url || ''} onChange={e => setNewSong({...newSong, pdf_vocals_url: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#fffbeb', borderRadius: '16px', border: '1px solid #fef3c7' }}>
              <input type="checkbox" id="add-bypass-wlan" checked={!!newSong.bypass_wlan_check} onChange={e => setNewSong({...newSong, bypass_wlan_check: e.target.checked})} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: brandColor }} />
              <label htmlFor="add-bypass-wlan" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#b45309', cursor: 'pointer' }}>
                WLAN-Sperre für diesen Song ignorieren (Entwickler-Bypass für Home-Testing)
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Arrangement / Instrumente</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                {['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'].map(inst => (
                  <div key={inst} style={{ padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '1.5rem' }}>{ADMIN_INSTRUMENT_ICONS[inst] || '🎵'}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>{inst}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button type="button" onClick={() => setNewSong({...newSong, instrumentation: {...newSong.instrumentation, [inst]: Math.max(0, (newSong.instrumentation[inst] || 0) - 1)}})} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer', fontWeight: 900 }}>-</button>
                      <span style={{ fontWeight: 900, fontSize: '1.1rem', minWidth: '20px', textAlign: 'center' }}>{newSong.instrumentation[inst] || 0}</span>
                      <button type="button" onClick={() => setNewSong({...newSong, instrumentation: {...newSong.instrumentation, [inst]: (newSong.instrumentation[inst] || 0) + 1}})} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: brandColor, color: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer', fontWeight: 900 }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: `0 10px 20px ${brandColor}30` }}>Song in Bibliothek speichern</button>
              <button type="button" onClick={() => setShowAddSong(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}>Abbrechen</button>
            </div>
          </form>
        )}

        {editingSong && (
          <form onSubmit={handleUpdateSong} className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0369a1', margin: 0 }}>Song bearbeiten</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Interpret</label>
                <input required placeholder="Interpret" value={editingSong.artist} onChange={e => setEditingSong({...editingSong, artist: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '1rem', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Titel</label>
                <input required placeholder="Titel" value={editingSong.title} onChange={e => setEditingSong({...editingSong, title: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '1rem', fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Cloud Link (Noten / Material)</label>
              <div style={{ position: 'relative' }}>
                <Box size={20} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input placeholder="https://cloud.folder.link..." value={editingSong.media_link} onChange={e => setEditingSong({...editingSong, media_link: e.target.value})} style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '1rem', fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>OneDrive/Dropbox PDF-Ordner (Noten Ordner-Link)</label>
                <input placeholder="https://onedrive.live.com/... oder Dropbox..." value={editingSong.pdf_folder_url || ''} onChange={e => setEditingSong({...editingSong, pdf_folder_url: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '1rem', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>OneDrive Guitar Pro Link (.gp)</label>
                <input placeholder="ms-onedrive://..." value={editingSong.guitar_pro_url || ''} onChange={e => setEditingSong({...editingSong, guitar_pro_url: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '1rem', fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ padding: '24px', background: '#f0f9ff', borderRadius: '20px', border: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0369a1', margin: 0 }}>Instrumenten-spezifische PDFs (Direktanzeige in App)</h4>
                <p style={{ fontSize: '0.8rem', color: '#0284c7', margin: 0, fontWeight: 600 }}>🌟 Tipp: Kopiere hier direkte Dropbox/OneDrive Links zu den einzelnen PDF-Dateien. Diese werden für Schüler nahtlos direkt in der App geöffnet!</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1' }}>🎸 PDF E-Gitarre</label>
                  <input placeholder="https://..." value={editingSong.pdf_guitar_url || ''} onChange={e => setEditingSong({...editingSong, pdf_guitar_url: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #bae6fd', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1' }}>🎸 PDF E-Bass</label>
                  <input placeholder="https://..." value={editingSong.pdf_bass_url || ''} onChange={e => setEditingSong({...editingSong, pdf_bass_url: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #bae6fd', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1' }}>🥁 PDF E-Drums</label>
                  <input placeholder="https://..." value={editingSong.pdf_drums_url || ''} onChange={e => setEditingSong({...editingSong, pdf_drums_url: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #bae6fd', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1' }}>🎹 PDF E-Piano / Keys</label>
                  <input placeholder="https://..." value={editingSong.pdf_keys_url || ''} onChange={e => setEditingSong({...editingSong, pdf_keys_url: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #bae6fd', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1' }}>🎤 PDF Gesang / Vocals</label>
                <input placeholder="https://..." value={editingSong.pdf_vocals_url || ''} onChange={e => setEditingSong({...editingSong, pdf_vocals_url: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #bae6fd', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#fffbeb', borderRadius: '16px', border: '1px solid #fef3c7' }}>
              <input type="checkbox" id="edit-bypass-wlan" checked={!!editingSong.bypass_wlan_check} onChange={e => setEditingSong({...editingSong, bypass_wlan_check: e.target.checked})} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: brandColor }} />
              <label htmlFor="edit-bypass-wlan" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#b45309', cursor: 'pointer' }}>
                WLAN-Sperre für diesen Song ignorieren (Entwickler-Bypass für Home-Testing)
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Arrangement / Instrumente</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                {['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'].map(inst => (
                  <div key={inst} style={{ padding: '16px', borderRadius: '16px', background: 'white', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '1.5rem' }}>{ADMIN_INSTRUMENT_ICONS[inst] || '🎵'}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>{inst}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button type="button" onClick={() => setEditingSong({...editingSong, instrumentation: {...(editingSong.instrumentation || {}), [inst]: Math.max(0, ((editingSong.instrumentation || {})[inst] || 0) - 1)}})} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 900 }}>-</button>
                      <span style={{ fontWeight: 900, fontSize: '1.1rem', minWidth: '20px', textAlign: 'center' }}>{(editingSong.instrumentation || {})[inst] || 0}</span>
                      <button type="button" onClick={() => setEditingSong({...editingSong, instrumentation: {...(editingSong.instrumentation || {}), [inst]: ((editingSong.instrumentation || {})[inst] || 0) + 1}})} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: brandColor, color: 'white', cursor: 'pointer', fontWeight: 900 }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '18px', borderRadius: '16px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}>Aktualisieren</button>
              <button type="button" onClick={() => setEditingSong(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '18px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}>Abbrechen</button>
            </div>
          </form>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {songs.filter(song => {
            const matchesSearch = songSearch === '' || 
              (songSearchType === 'title' ? song.title : song.artist)?.toLowerCase().includes(songSearch.toLowerCase());
            
            const matchesAlpha = !songAlphaFilter || 
              (songSearchType === 'title' ? song.title : song.artist)?.toUpperCase().startsWith(songAlphaFilter);
            
            return matchesSearch && matchesAlpha;
          }).map(song => (

            <div key={song.id} className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', borderLeft: `6px solid ${brandColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{song.artist}</div>
                  <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.15rem', letterSpacing: '-0.01em' }}>{song.title}</div>
                </div>
                
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(() => {
                    const inst = song.instrumentation || {};
                    const norm: Record<string, number> = {};
                    Object.entries(inst).forEach(([k, v]) => {
                      const lower = k.toLowerCase();
                      let key = k;
                      if (lower === 'guitar' || lower === 'e-gitarre') key = 'E-Gitarre';
                      else if (lower === 'bass' || lower === 'e-bass') key = 'E-Bass';
                      else if (lower === 'drums' || lower === 'e-drums') key = 'E-Drums';
                      else if (lower === 'piano' || lower === 'keys' || lower === 'e-piano') key = 'E-Piano';
                      else if (lower === 'vocals' || lower === 'gesang') key = 'Vocals';
                      norm[key] = Math.max(norm[key] || 0, v as number);
                    });
                    
                    return Object.entries(norm).map(([inst, count]) => (
                      count > 0 && (
                        <div key={inst} style={{ padding: '4px 10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.9rem' }}>{ADMIN_INSTRUMENT_ICONS[inst]}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>{count}</span>
                        </div>
                      )
                    ));
                  })()}
                  {song.media_link && (
                    <div style={{ padding: '4px 10px', borderRadius: '8px', background: `${brandColor}10`, border: `1px solid ${brandColor}20`, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Box size={12} color={brandColor} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: brandColor }}>Cloud</span>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => {
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
                }} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}><Pencil size={20} /></button>
                <button onClick={() => handleDeleteSong(song.id)} style={{ background: '#fff1f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '12px', cursor: 'pointer', color: '#ef4444', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#ffe4e6'} onMouseLeave={e => e.currentTarget.style.background = '#fff1f2'}><Trash2 size={20} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStatsTab = () => (
    <div style={{ marginTop: '24px' }}>
      <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '24px' }}>Akademie-Statistik</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {[
            { label: 'Schüler Gesamt', value: students.length, icon: Users, color: brandColor },
            { label: 'Aktive Übeplätze', value: stations.length, icon: Tablet, color: '#3b82f6' },
            { label: 'Songs in Library', value: songs.length, icon: Music, color: '#10b981' },
            { label: 'Team-Mitglieder', value: teachers.length, icon: Shield, color: '#8b5cf6' }
          ].map((stat, idx) => (
            <div key={idx} style={{ padding: '24px', background: `${stat.color}08`, borderRadius: '24px', border: `1px solid ${stat.color}15` }}>
              <stat.icon size={24} color={stat.color} style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '2rem', fontWeight: 900, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderIDGalleryTab = () => (
    <div style={{ marginTop: '24px' }}>
      <IDGallery users={[...teachers, ...students]} brandColor={brandColor} onShowQR={setSelectedQRUser} />
    </div>
  );

  const renderSetupTab = () => (
    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <AcademySetup 
        school={admin?.schools} 
        brandColor={brandColor} 
        onUpdate={() => fetchData()} 
        onCleanupPlanning={handleCleanupPlanning}
        onResetPlanning={handleResetAllPlanning}
      />
      <DeviceSetupScreen rooms={rooms} stations={stations} brandColor={brandColor} />
    </div>
  );

  const renderStudentDetailModal = () => {
    if (!selectedStudent) return null;

    const calculateAge = (birthDate: string) => {
      if (!birthDate) return null;
      const birth = new Date(birthDate);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      return age;
    };

    const memberSince = selectedStudent.created_at
      ? new Date(selectedStudent.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
      : '';
    const age = calculateAge(selectedStudent.birth_date);

    // Instrument normalization helper
    const getInstrumentIcon = (name: string) => {
      const lower = (name || '').toLowerCase();
      if (lower.includes('gitarre') || lower.includes('guitar')) return '🎸';
      if (lower.includes('bass')) return '🎸';
      if (lower.includes('drum')) return '🥁';
      if (lower.includes('keys') || lower.includes('piano')) return '🎹';
      if (lower.includes('vocals') || lower.includes('gesang') || lower.includes('sing')) return '🎤';
      return '🎵';
    };

    const STUDENT_MODAL_INSTRUMENT_ICONS: Record<string, string> = { Guitar: '🎸', Keys: '🎹', Drums: '🥁', Bass: '🎸', Vocals: '🎤' };

    // Grouping logic for songs
    const groupedSongs = (studentDetails || []).reduce((acc: any, s: any) => {
      const songId = s.song_id;
      const level = s.difficulty_level;
      const key = `${songId}_${level}`;
      if (!acc[key]) {
        acc[key] = {
          id: songId,
          title: s.songs?.title,
          artist: s.songs?.artist,
          level: level,
          instruments: []
        };
      }
      acc[key].instruments.push({
        name: s.instrument,
        part_number: s.part_number || 1,
        progress: s.progress_percent || 0,
        is_stage_ready: s.is_stage_ready
      });
      return acc;
    }, {});

    const songsArray = Object.values(groupedSongs);
    const practiceBoard = songsArray.filter((s: any) => s.instruments.some((i: any) => i.progress > 0 && !i.is_stage_ready));
    const repertoire = songsArray.filter((s: any) => s.instruments.some((i: any) => i.is_stage_ready));

    const studentRadarData = (() => {
      const radarBase: Record<string, number> = { Guitar: 0, Bass: 0, Drums: 0, Keys: 0, Vocals: 0 };
      (studentDetails || []).forEach((s: any) => {
        const sInst = s.instrument?.toLowerCase();
        if (!sInst) return;
        
        let target: string | null = null;
        if (sInst === 'guitar' || sInst === 'e-gitarre') target = 'Guitar';
        else if (sInst === 'bass' || sInst === 'e-bass') target = 'Bass';
        else if (sInst === 'drums' || sInst === 'e-drums') target = 'Drums';
        else if (sInst === 'keys' || sInst === 'piano' || sInst === 'e-piano') target = 'Keys';
        else if (sInst === 'vocals' || sInst === 'gesang') target = 'Vocals';
        
        if (target && radarBase[target] !== undefined) {
          const prog = s.progress_percent || 0;
          const xp = (s.is_stage_ready || prog === 100) ? 500 : prog * 2;
          radarBase[target] += xp;
        }
      });
      return Object.entries(radarBase).map(([inst, xp]) => ({ instrument: inst, xp }));
    })();

    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
          
          {/* Close button */}
          <button onClick={() => setSelectedStudent(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s', zIndex: 10 }}>
            <X size={20} />
          </button>

          {/* Student Profile Header */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', border: '4px solid white', background: '#f1f5f9', flexShrink: 0 }}>
                <img src={selectedStudent.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0, whiteSpace: 'nowrap' }}>{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                    <Calendar size={14} /> Member seit {memberSince}
                  </div>
                  {(selectedStudent.age || age) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                      <User size={14} /> {selectedStudent.age || age} Jahre
                    </div>
                  )}
                  <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}>
                    <Star size={12} fill="white" /> {(studentDetails || []).filter((s: any) => s.is_stage_ready).length * 100} XP
                  </div>
                </div>
                
                {/* Instrument Master Counters */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'nowrap', alignItems: 'center' }}>
                  {['Guitar', 'Keys', 'Drums', 'Bass', 'Vocals'].map(inst => {
                    const count = (studentDetails || []).filter((s: any) => {
                      const sInst = s.instrument?.toLowerCase();
                      const target = inst.toLowerCase();
                      let match = false;
                      if (target === 'guitar') match = sInst === 'guitar' || sInst === 'e-gitarre';
                      else if (target === 'bass') match = sInst === 'bass' || sInst === 'e-bass';
                      else if (target === 'drums') match = sInst === 'drums' || sInst === 'e-drums';
                      else if (target === 'keys') match = sInst === 'keys' || sInst === 'piano' || sInst === 'e-piano';
                      else if (target === 'vocals') match = sInst === 'vocals' || sInst === 'gesang';
                      else match = sInst === target;
                      return match && s.is_stage_ready;
                    }).length;

                    return (
                      <div key={inst} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 10px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '1rem' }}>{STUDENT_MODAL_INSTRUMENT_ICONS[inst] || '🎵'}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: count > 0 ? brandColor : '#94a3b8' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Instrument Badge - One line below */}
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'inline-block', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 850, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {selectedStudent.instrument || 'Multi-Talent'}
                  </div>
                </div>
              </div>
            </div>

            {/* Skill Radar centered dynamically in the empty space */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: '240px' }}>
              <div style={{ width: '240px', height: '165px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'transparent' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={studentRadarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="instrument" tick={({ x, y, payload }) => (
                      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}>
                        {payload.value}
                      </text>
                    )} />
                    <Radar name="XP" dataKey="xp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Premium Tab Navigation */}
          <div style={{ display: 'flex', gap: '16px', borderBottom: '2px solid #f1f5f9', padding: '0 0 12px 0', marginBottom: '28px' }}>
            <button
              onClick={() => setStudentDetailTab('profile')}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '8px 16px',
                fontSize: '0.9rem',
                fontWeight: 900,
                color: studentDetailTab === 'profile' ? brandColor : '#94a3b8',
                borderBottom: studentDetailTab === 'profile' ? `3px solid ${brandColor}` : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                marginBottom: '-14px',
                outline: 'none'
              }}
            >
              <Music size={16} /> Profil & Musik
            </button>
            <button
              onClick={() => setStudentDetailTab('logbook')}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '8px 16px',
                fontSize: '0.9rem',
                fontWeight: 900,
                color: studentDetailTab === 'logbook' ? brandColor : '#94a3b8',
                borderBottom: studentDetailTab === 'logbook' ? `3px solid ${brandColor}` : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                marginBottom: '-14px',
                outline: 'none'
              }}
            >
              <Clock size={16} /> Logbuch & Notizen
            </button>
          </div>

          {/* Tab Content Rendering */}
          {studentDetailTab === 'profile' ? (
            /* TAB 1: PROFIL & MUSIK */
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Üben Board */}
                <section>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#3b82f6', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} /> Üben Board
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {practiceBoard.map((s: any) => (
                      <div key={s.id + s.level} style={{ background: '#f8fafc', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{s.artist}</div>
                            <div style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b' }}>{s.title}</div>
                          </div>
                          <div style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 900, background: s.level === 'starter' ? '#fffbeb' : '#eff6ff', color: s.level === 'starter' ? '#b45309' : '#2563eb' }}>
                            {s.level === 'starter' ? '🚀 STARTER' : '⚡ PRO'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {s.instruments.map((inst: any, idx: number) => (
                            <div key={idx} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', color: inst.progress === 100 ? '#10b981' : (inst.progress > 0 ? brandColor : '#94a3b8') }}>
                              {getInstrumentIcon(inst.name)} {inst.name}{inst.part_number > 1 || (s.instruments.filter((i:any) => i.name === inst.name).length > 1) ? ` ${inst.part_number}` : ''}: {inst.progress}%
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {practiceBoard.length === 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>Keine Songs am Board.</div>
                    )}
                  </div>
                </section>

                {/* Repertoire */}
                <section>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={16} /> Repertoire
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {repertoire.map((s: any) => (
                      <div key={s.id + s.level} style={{ background: '#f0fdf4', padding: '16px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d', opacity: 0.7, textTransform: 'uppercase' }}>{s.artist}</div>
                            <div style={{ fontWeight: 900, fontSize: '1rem', color: '#166534' }}>{s.title}</div>
                          </div>
                          <div style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 900, background: '#dcfce7', color: '#15803d' }}>
                            {s.level === 'starter' ? '🚀 STARTER' : '⚡ PRO'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {s.instruments.filter((i: any) => i.is_stage_ready).map((inst: any, idx: number) => (
                            <div key={idx} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '8px', background: 'white', border: '1px solid #bbf7d0', color: '#10b981' }}>
                              {getInstrumentIcon(inst.name)} {inst.name}{inst.part_number > 1 || (s.instruments.filter((i:any) => i.name === inst.name).length > 1) ? ` ${inst.part_number}` : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {repertoire.length === 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>Noch kein Repertoire.</div>
                    )}
                  </div>
                </section>
              </div>

              <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Meine Bands */}
                <section>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#ec4899', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} /> Bands
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {studentBands.map((b: any) => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#fdf2f8', borderRadius: '20px', border: '1px solid #fbcfe8' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                          <img src={b.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#9d174d' }}>{b.name}</div>
                      </div>
                    ))}
                    {studentBands.length === 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>In keiner Band aktiv.</div>
                    )}
                  </div>
                </section>
              </aside>
            </div>
          ) : (
            /* TAB 2: LOGBUCH & NOTIZEN */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Pädagogische Notizen */}
                <section style={{ padding: '24px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Pädagogische Notizen</div>
                  <textarea 
                    defaultValue={selectedStudent.teacher_notes || ''}
                    onBlur={async (e) => {
                      await supabase.from('users').update({ teacher_notes: e.target.value }).eq('id', selectedStudent.id);
                    }}
                    placeholder="Eindrücke festhalten..."
                    style={{ width: '100%', background: 'transparent', border: 'none', resize: 'none', minHeight: '120px', fontSize: '0.9rem', color: '#475569', fontWeight: 500, outline: 'none' }}
                  />
                </section>

                {/* Aktivität & Status */}
                <section style={{ padding: '24px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>Aktivität & Status</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>Konto aktiv</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Registriert seit: {new Date(selectedStudent.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                </section>

                {/* Digital ID Pass Button */}
                <section>
                  <button onClick={() => setSelectedQRUser(selectedStudent)} style={{ width: '100%', background: `${brandColor}10`, color: brandColor, border: `1px solid ${brandColor}30`, padding: '16px', borderRadius: '20px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s' }}>
                    <QrCode size={20} /> Digitalen ID-Pass anzeigen
                  </button>
                </section>
              </div>

              <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Anwesenheit / Logbuch */}
                <section style={{ padding: '24px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Logbuch / Anwesenheit</div>
                    {studentSessions && studentSessions.length > 0 && (
                      <button 
                        onClick={() => {
                          const getW = (d: Date) => {
                            const date = new Date(d.getTime());
                            date.setHours(0, 0, 0, 0);
                            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
                            const week1 = new Date(date.getFullYear(), 0, 4);
                            return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
                          };
                          
                          const groups: Record<string, any[]> = {};
                          studentSessions.forEach(s => {
                            const d = new Date(s.check_in_time);
                            const kw = getW(d);
                            const key = `${d.getFullYear()}-W${kw}`;
                            if (!groups[key]) groups[key] = [];
                            groups[key].push(s);
                          });

                          let text = `LOGBUCH: ${selectedStudent.first_name} ${selectedStudent.last_name}\n`;
                          text += `Stand: ${new Date().toLocaleDateString()}\n\n`;

                          Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).forEach(([key, sessions]) => {
                            const kw = key.split('-W')[1];
                            let line = `KW${kw}: `;
                            
                            const dayGroups: Record<string, any[]> = {};
                            sessions.forEach(s => {
                              const date = new Date(s.check_in_time).toISOString().split('T')[0];
                              if (!dayGroups[date]) dayGroups[date] = [];
                              dayGroups[date].push(s);
                            });

                            const openingHours = admin?.schools?.opening_hours;

                            Object.entries(dayGroups).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, daySessions], idx) => {
                              const sorted = daySessions.sort((a,b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime());
                              const first = sorted[0];
                              const last = sorted[sorted.length - 1];
                              
                              const d = new Date(first.check_in_time);
                              const dayName = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'][d.getDay()];
                              
                              const sessionStart = new Date(first.check_in_time);
                              const sessionEnd = last.check_out_time ? new Date(last.check_out_time) : new Date();

                              let minutes = 0;
                              let displayStart = sessionStart;
                              const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][sessionStart.getDay()];
                              const config = openingHours?.[dayKey];

                              if (config && config.active) {
                                const [sH, sM] = config.start.split(':').map(Number);
                                const [eH, eM] = config.end.split(':').map(Number);
                                const oStart = new Date(sessionStart); oStart.setHours(sH, sM, 0, 0);
                                const oEnd = new Date(sessionStart); oEnd.setHours(eH, eM, 0, 0);
                                
                                const finalS = new Date(Math.max(sessionStart.getTime(), oStart.getTime()));
                                const finalE = new Date(Math.min(sessionEnd.getTime(), oEnd.getTime()));
                                
                                if (finalS < finalE) {
                                  minutes = Math.floor((finalE.getTime() - finalS.getTime()) / 60000);
                                  displayStart = finalS;
                                } else {
                                  return;
                                }
                              }
                              
                              const displayTime = displayStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              const dur = minutes >= 60 ? `${Math.floor(minutes/60)}h ${minutes%60}m` : `${minutes}m`;
                              line += `${idx > 0 ? ' | ' : ''}${dayName} ${displayTime} Uhr (${dur})`;
                            });
                            text += line + '\n';
                          });

                          const blob = new Blob([text], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `Anwesenheit_${selectedStudent.first_name}_${selectedStudent.last_name}.txt`;
                          link.click();
                          URL.revokeObjectURL(url);
                        }}
                        style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', fontSize: '0.65rem', fontWeight: 800, color: brandColor, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Download size={12} /> EXPORT (.txt)
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                    {(() => {
                      if (!studentSessions || studentSessions.length === 0) {
                        return <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Noch keine Sessions aufgezeichnet.</div>;
                      }

                      const getWeekNum = (d: Date) => {
                        const date = new Date(d.getTime());
                        date.setHours(0, 0, 0, 0);
                        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
                        const week1 = new Date(date.getFullYear(), 0, 4);
                        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
                      };

                      const groups: Record<string, any[]> = {};
                      studentSessions.forEach(s => {
                        const d = new Date(s.check_in_time);
                        const kw = getWeekNum(d);
                        const year = d.getFullYear();
                        const key = `${year}-W${kw}`;
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(s);
                      });

                      return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).map(([key, sessions]) => {
                        const kw = key.split('-W')[1];
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '0.85rem', color: '#475569', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                            <span style={{ fontWeight: 800, color: brandColor, minWidth: '40px', marginTop: '4px' }}>KW{kw}</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {(() => {
                                const dayGroups: Record<string, any[]> = {};
                                sessions.forEach(s => {
                                  const dStr = new Date(s.check_in_time).toISOString().split('T')[0];
                                  if (!dayGroups[dStr]) dayGroups[dStr] = [];
                                  dayGroups[dStr].push(s);
                                });

                                return Object.entries(dayGroups).sort((a, b) => a[0].localeCompare(b[0])).map(([date, daySessions], idx) => {
                                  const sorted = daySessions.sort((a,b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime());
                                  const first = sorted[0];
                                  const last = sorted[sorted.length - 1];
                                  
                                  const d = new Date(first.check_in_time);
                                  const day = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'][d.getDay()];
                                  
                                  const sessionStart = new Date(first.check_in_time);
                                  const sessionEnd = last.check_out_time ? new Date(last.check_out_time) : new Date();

                                  let minutes = 0;
                                  let displayStart = sessionStart;
                                  const openingHours = admin?.schools?.opening_hours;
                                  const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][sessionStart.getDay()];
                                  const config = openingHours?.[dayKey];

                                  if (config && config.active) {
                                    const [sH, sM] = config.start.split(':').map(Number);
                                    const [eH, eM] = config.end.split(':').map(Number);
                                    const oStart = new Date(sessionStart); oStart.setHours(sH, sM, 0, 0);
                                    const oEnd = new Date(sessionStart); oEnd.setHours(eH, eM, 0, 0);
                                    
                                    const finalS = new Date(Math.max(sessionStart.getTime(), oStart.getTime()));
                                    const finalE = new Date(Math.min(sessionEnd.getTime(), oEnd.getTime()));
                                    
                                    if (finalS < finalE) {
                                      minutes = Math.floor((finalE.getTime() - finalS.getTime()) / 60000);
                                      displayStart = finalS;
                                    } else {
                                      return null;
                                    }
                                  }

                                  const displayTime = displayStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                  const duration = minutes >= 60 ? `${Math.floor(minutes/60)}h ${minutes%60}m` : `${minutes}m`;
                                  
                                  return (
                                    <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.75rem' }}>
                                      <span style={{ fontWeight: 900, color: '#1e293b' }}>{day}</span>
                                      <span style={{ fontWeight: 600 }}>{displayTime}</span>
                                      <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 700 }}>({duration})</span>
                                    </span>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>
      </div>
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
          backgroundColor: '#ffffff',
          cacheBust: true,
        });
        const link = document.createElement('a');
        link.download = `Groovelab_ID_${selectedQRUser.first_name}.jpg`;
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

          {/* Unified ID Card Design */}
          <div 
            ref={qrCardRef}
            style={{ 
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
                boxShadow: '0 8px 20px rgba(0,0,0,0.05)'
              }}>
                <div style={{ 
                  width: '100%', 
                  height: '100%', 
                  borderRadius: '50%', 
                  overflow: 'hidden',
                  backgroundImage: `url(${selectedQRUser.photo_url || '/avatar_ghost.jpg'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundColor: '#f1f5f9'
                }}>
                </div>
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
          </div>

          <button 
            onClick={saveAsImage} 
            style={{ width: '100%', background: brandColor, color: 'white', border: 'none', padding: '20px', borderRadius: '24px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '24px', boxShadow: `0 15px 35px ${brandColor}50`, transition: 'all 0.2s' }} 
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} 
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Download size={24} /> Ausweis als JPEG speichern
          </button>
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
    <div style={{ flex: 1, padding: '0px 48px 48px 48px', overflowY: 'auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', marginTop: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.03em', margin: 0 }}>
            {sidebarItems.find(i => i.id === activeTab)?.label}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500, marginTop: '2px' }}>
            {(admin as any)?.schools?.name} • Management Dashboard
          </p>
        </div>
      </header>

      {activeTab === 'live' && renderLiveTab()}
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
      {renderLogoutDialog()}

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
                  {teachers.map(t => (
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
  const [vocalistOnlyMode, setVocalistOnlyMode] = useState(false);
  
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Teachers are always shown if not in vocalistOnlyMode
    // If vocalistOnlyMode, only show external vocalists
    if (vocalistOnlyMode) {
      return matchesSearch && u.is_external_vocalist;
    } else {
      // Normal mode: show teachers AND non-external students
      return matchesSearch && (u.role !== 'student' || !u.is_external_vocalist);
    }
  });

  return (
    <div style={{ marginTop: '24px' }}>
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
            <h2 style={{ fontSize: '2rem', fontWeight: 1000, color: '#1e293b', marginBottom: '8px', letterSpacing: '-0.03em' }}>Pass Collection</h2>
            <p style={{ color: '#64748b', fontWeight: 500 }}>Vollständige Galerie aller Lehrer und Schüler im Event-Stil.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {/* Filter Switch */}
            <div style={{ background: 'rgba(241, 245, 249, 0.8)', padding: '4px', borderRadius: '14px', display: 'flex', gap: '4px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
              <button 
                onClick={() => setVocalistOnlyMode(false)}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: !vocalistOnlyMode ? 'white' : 'transparent',
                  color: !vocalistOnlyMode ? '#1e293b' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  boxShadow: !vocalistOnlyMode ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Musiker
              </button>
              <button 
                onClick={() => setVocalistOnlyMode(true)}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: vocalistOnlyMode ? 'white' : 'transparent',
                  color: vocalistOnlyMode ? '#1e293b' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  boxShadow: vocalistOnlyMode ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                Gesangsschüler
              </button>
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

function AcademySetup({ 
  school, 
  brandColor, 
  onUpdate,
  onCleanupPlanning,
  onResetPlanning
}: { 
  school: any, 
  brandColor: string, 
  onUpdate: () => void,
  onCleanupPlanning: () => void,
  onResetPlanning: () => void
}) {
  const [name, setName] = useState(school?.name || '');
  const [lat, setLat] = useState(school?.latitude?.toString() || '');
  const [lng, setLng] = useState(school?.longitude?.toString() || '');
  const [radius, setRadius] = useState(school?.geofence_radius_meters?.toString() || '100');
  const [hours, setHours] = useState<any>(school?.opening_hours || {
    monday: { start: '08:00', end: '20:00', active: true },
    tuesday: { start: '08:00', end: '20:00', active: true },
    wednesday: { start: '08:00', end: '20:00', active: true },
    thursday: { start: '08:00', end: '20:00', active: true },
    friday: { start: '08:00', end: '20:00', active: true },
    saturday: { start: '10:00', end: '16:00', active: false },
    sunday: { start: '10:00', end: '16:00', active: false }
  });
  const [isSaving, setIsSaving] = useState(false);

  const days = [
    { id: 'monday', label: 'Montag' },
    { id: 'tuesday', label: 'Dienstag' },
    { id: 'wednesday', label: 'Mittwoch' },
    { id: 'thursday', label: 'Donnerstag' },
    { id: 'friday', label: 'Freitag' },
    { id: 'saturday', label: 'Samstag' },
    { id: 'sunday', label: 'Sonntag' }
  ];

  const handleSave = async () => {
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
      .eq('id', school.id);
    
    setIsSaving(false);
    if (error) alert('Fehler: ' + error.message);
    else onUpdate();
  };

  return (
    <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${brandColor}10`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>Akademie-Einstellungen</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Globaler Name und Betriebszeiten für dein Groovelab.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px', gap: '20px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Akademie Name</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, fontSize: '1rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Latitude</label>
            <input 
              value={lat} 
              onChange={e => setLat(e.target.value)}
              placeholder="z.B. 47.567"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, fontSize: '1rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Longitude</label>
            <input 
              value={lng} 
              onChange={e => setLng(e.target.value)}
              placeholder="z.B. 7.796"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, fontSize: '1rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Radius (m)</label>
            <input 
              value={radius} 
              onChange={e => setRadius(e.target.value)}
              type="number"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, fontSize: '1rem' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '16px' }}>Öffnungszeiten</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px' }}>
            {days.map(day => (
              <div key={day.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 100px', alignItems: 'center', gap: '16px', padding: '12px', background: hours[day.id]?.active ? '#f8fafc' : 'transparent', borderRadius: '12px', opacity: hours[day.id]?.active ? 1 : 0.5 }}>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>{day.label}</div>
                <input 
                  type="time" 
                  value={hours[day.id]?.start || '08:00'} 
                  disabled={!hours[day.id]?.active}
                  onChange={e => setHours({...hours, [day.id]: {...(hours[day.id] || {}), start: e.target.value}})}
                  style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }}
                />
                <input 
                  type="time" 
                  value={hours[day.id]?.end || '20:00'} 
                  disabled={!hours[day.id]?.active}
                  onChange={e => setHours({...hours, [day.id]: {...(hours[day.id] || {}), end: e.target.value}})}
                  style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }}
                />
                <button 
                  onClick={() => setHours({...hours, [day.id]: {...(hours[day.id] || {}), active: !hours[day.id]?.active}})}
                  style={{ padding: '8px', borderRadius: '8px', border: 'none', background: hours[day.id]?.active ? '#fee2e2' : '#dcfce7', color: hours[day.id]?.active ? '#ef4444' : '#10b981', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  {hours[day.id]?.active ? 'GESCHL.' : 'OFFEN'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '16px', padding: '24px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '16px' }}>Login-Sicherheit & Geofencing</label>
          <div style={{ display: 'flex', gap: '24px' }}>
            <button 
              onClick={() => setHours({ ...hours, enforce_hours: true })}
              style={{ 
                flex: 1,
                padding: '16px',
                borderRadius: '16px',
                border: `2px solid ${hours.enforce_hours !== false ? brandColor : '#e2e8f0'}`,
                background: hours.enforce_hours !== false ? `${brandColor}05` : 'white',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 800, color: hours.enforce_hours !== false ? brandColor : '#1e293b', marginBottom: '4px' }}>Strikte Öffnungszeiten</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Labor-Login mit Geotracking NUR innerhalb der Öffnungszeiten erlaubt.</div>
            </button>
            <button 
              onClick={() => setHours({ ...hours, enforce_hours: false })}
              style={{ 
                flex: 1,
                padding: '16px',
                borderRadius: '16px',
                border: `2px solid ${hours.enforce_hours === false ? brandColor : '#e2e8f0'}`,
                background: hours.enforce_hours === false ? `${brandColor}05` : 'white',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 800, color: hours.enforce_hours === false ? brandColor : '#1e293b', marginBottom: '4px' }}>Flexible Öffnungszeiten</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Labor-Login mit Geotracking AUCH außerhalb der Öffnungszeiten erlaubt.</div>
            </button>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          style={{ 
            width: 'fit-content',
            background: brandColor, 
            color: 'white', 
            border: 'none', 
            padding: '14px 32px', 
            borderRadius: '12px', 
            fontWeight: 800, 
            cursor: 'pointer',
            opacity: isSaving ? 0.7 : 1
          }}
        >
          {isSaving ? 'Speichere...' : 'Einstellungen speichern'}
        </button>

        <div style={{ marginTop: '48px', padding: '24px', background: '#fef2f2', borderRadius: '24px', border: '1px solid #fee2e2' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> Systemwartung
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#991b1b', marginBottom: '16px' }}>
            Hier kannst du Datenleichen entfernen und die Datenbank konsistent halten.
          </p>
          <button 
            onClick={onCleanupPlanning}
            style={{ background: 'white', border: '1px solid #fee2e2', color: '#ef4444', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
          >
            Wochenplan bereinigen (Datenleichen entfernen)
          </button>
          <button 
            onClick={onResetPlanning}
            style={{ marginLeft: '12px', background: 'white', border: '1px solid #fee2e2', color: '#ef4444', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
          >
            Wochenplan komplett leeren
          </button>
        </div>
      </div>
    </div>
  );
}

function DeviceSetupScreen({ rooms, stations, brandColor }: { rooms: any[], stations: any[], brandColor: string }) {
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedStationId, setSelectedStationId] = useState(() => localStorage.getItem('groovelab_station_id') || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    if (selectedStationId) {
      localStorage.setItem('groovelab_station_id', selectedStationId);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      window.location.reload(); // Reload to apply station mode
    }
  };

  const currentStation = stations.find(s => s.id === selectedStationId);

  return (
    <div style={{ marginTop: '24px' }}>
      <div className="glass-panel" style={{ padding: '32px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f8fafc', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
            <Monitor size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>Geräte-Setup</h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Konfiguriere dieses iPad als festen Groovelab-Arbeitsplatz.</p>
          </div>
        </div>
        
        <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Box size={18} color={brandColor} /> Standort auswählen
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Raum</label>
                <select 
                  value={selectedRoomId} 
                  onChange={e => setSelectedRoomId(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }}
                >
                  <option value="">Bitte Raum wählen...</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              {selectedRoomId && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>iPad Station</label>
                  <select 
                    value={selectedStationId} 
                    onChange={e => setSelectedStationId(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }}
                  >
                    <option value="">Bitte iPad wählen...</option>
                    {stations.filter(s => s.room_id === selectedRoomId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="skip">Keine feste Station (Mobil-Modus)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={handleSave}
              disabled={!selectedStationId}
              style={{ 
                flex: 1,
                background: isSaved ? '#10b981' : brandColor, 
                color: 'white', 
                border: 'none', 
                padding: '16px', 
                borderRadius: '16px', 
                fontWeight: 800, 
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: selectedStationId ? 1 : 0.5,
                transition: 'all 0.3s'
              }}
            >
              {isSaved ? 'Gespeichert! ✓' : 'Konfiguration speichern'}
            </button>
            <button 
              onClick={() => { localStorage.removeItem('groovelab_station_id'); window.location.reload(); }}
              style={{ background: 'white', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}
            >
              Reset
            </button>
          </div>

          {currentStation && (
            <div style={{ marginTop: '16px', padding: '20px', borderRadius: '16px', background: '#f0fdf4', border: '1px solid #dcfce7', color: '#166534', fontSize: '0.875rem' }}>
              <strong>Aktueller Modus:</strong> Dieses Gerät ist als <strong>{currentStation.name}</strong> konfiguriert und wird beim Scannen eines Schüler-QR-Codes automatisch diesen Platz belegen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
