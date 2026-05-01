import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Music, AlertCircle, Library, Shield, LogOut, Users, User, Monitor, QrCode, Plus, Pencil, Trash2, Box, BarChart as LucideBarChart, Clock, Star, PieChart as LucidePieChart, TrendingUp, Tablet, ExternalLink, Settings, Search, Bell, MapPin, X, Printer } from 'lucide-react';
import { 
  ResponsiveContainer,
  BarChart as RechartsBarChart, Bar, XAxis, Tooltip, Cell,
  PieChart as RechartsPieChart, Pie
} from 'recharts';

const INSTRUMENT_COLORS: Record<string, string> = {
  Guitar: '#f59e0b', // Amber
  Bass: '#8b5cf6',   // Violet
  Drums: '#3b82f6',  // Blue
  Keys: '#ec4899',   // Pink
  Vocals: '#10b981'  // Emerald
};
// Removed unused import
import { TeacherDashboard } from './TeacherDashboard';
import { ElegantBirthdayPicker } from './ElegantBirthdayPicker';
import QRCode from 'react-qr-code';

const INSTRUMENT_ICONS: Record<string, string> = { Guitar: '🎸', Bass: '🎸', Drums: '🥁', Keys: '🎹', Vocals: '🎤' };

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
  { id: 'b_def', url: '/avatar_boy.jpg', label: 'Boy' },
  { id: 'b_bass', url: '/avatar_boy_bass.jpg', label: 'Boy Bass' },
  { id: 'b_drums', url: '/avatar_boy_drums.jpg', label: 'Boy Drums' },
  { id: 'b_guitar', url: '/avatar_boy_guitar.jpg', label: 'Boy Guitar' },
  { id: 'b_piano', url: '/avatar_boy_piano.jpg', label: 'Boy Piano' },
  { id: 'g_def', url: '/avatar_girl.jpg', label: 'Girl' },
  { id: 'g_bass', url: '/avatar_girl_bass.jpg', label: 'Girl Bass' },
  { id: 'g_drums', url: '/avatar_girl_drums.jpg', label: 'Girl Drums' },
  { id: 'g_guitar', url: '/avatar_girl_guitar.jpg', label: 'Girl Guitar' },
  { id: 'g_piano', url: '/avatar_girl_piano.jpg', label: 'Girl Piano' }
];

interface AdminDashboardProps {
  userId: string;
  onLogout: () => void;
  forceTab?: string;
  onTabChange?: (tab: string) => void;
}

export function AdminDashboard({ userId, onLogout, forceTab, onTabChange }: AdminDashboardProps) {
  const [admin, setAdmin] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [galleryStudents, setGalleryStudents] = useState<any[]>([]);
  const [setupRooms, setSetupRooms] = useState<any[]>([]);
  const [setupStations, setSetupStations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('groovelab_active_tab') || forceTab || 'live');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', birthDate: '', photoUrl: '' });
  
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
  const [newSong, setNewSong] = useState({ artist: '', title: '', level: 1, media_link: '', tomplay_url: '', instrumentation: { Guitar: 1, Bass: 1, Drums: 1, Keys: 0, Vocals: 1 } });
  
  const [selectedQRUser, setSelectedQRUser] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [studentLabMins, setStudentLabMins] = useState(0);
  const [studentHomeMins, setStudentHomeMins] = useState(0);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [studentRejections, setStudentRejections] = useState<any[]>([]);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [editingSong, setEditingSong] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogoutStudent = async (sessionId: string) => {
    if (!window.confirm('Schüler wirklich ausloggen?')) return;
    await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', sessionId);
    fetchData();
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
      last_name: newStudent.lastName, 
      birth_date: newStudent.birthDate || null,
      photo_url: newStudent.photoUrl || null,
      qr_token: qrToken
    }).select().single();
    
    if (error) alert('Fehler: ' + error.message);
    else if (data) { 
      setStudents([...students, data]); 
      setShowAddStudent(false); 
      setNewStudent({ firstName: '', lastName: '', birthDate: '' }); 
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
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) alert(error.message);
      else setStudents(students.filter(s => s.id !== id));
    }
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
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) alert(error.message);
      else setTeachers(teachers.filter(t => t.id !== id));
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
      bands: editingTeacher.bands,
      projects: editingTeacher.projects,
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

  const handleAddGeofencePoint = async (roomId: string) => {
    if (!window.confirm('Aktuellen Standort als weiteren Kalibrierungs-Punkt für diesen Raum hinzufügen? (Radius: 20m)')) return;
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      
      const room = rooms.find(r => r.id === roomId);
      const points = Array.isArray(room?.geofence_points) ? [...room.geofence_points] : [];
      points.push({ lat, lng });

      const { error } = await supabase.from('rooms').update({
        geofence_points: points,
        latitude: lat,
        longitude: lng
      }).eq('id', roomId);
      
      if (error) alert(error.message);
      else {
        alert('Punkt hinzugefügt! ✅');
        fetchData();
      }
    }, (err) => alert('Fehler: ' + err.message), { enableHighAccuracy: true });
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
      instrumentation: newSong.instrumentation
    }).select().single();
    if (error) alert('Fehler: ' + error.message);
    else if (data) { 
      setSongs([...songs, data]); 
      setShowAddSong(false); 
      setNewSong({ artist: '', title: '', level: 1, media_link: '', tomplay_url: '', instrumentation: { Guitar: 1, Bass: 1, Drums: 1, Keys: 0, Vocals: 1 } }); 
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
    if (!window.confirm('Song wirklich aus der Bibliothek löschen?')) return;
    const { error } = await supabase.from('songs').delete().eq('id', songId);
    if (error) alert(error.message);
    else setSongs(songs.filter(s => s.id !== songId));
  };

  const fetchStudentProfile = async (student: any) => {
    setSelectedStudent(student);
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
      let labMins = 0;
      let homeMins = 0;

      allSessions.forEach(s => {
        const start = new Date(s.check_in_time);
        const end = s.check_out_time ? new Date(s.check_out_time) : new Date();
        const duration = Math.floor((end.getTime() - start.getTime()) / 60000);
        const mins = Math.max(0, duration);
        
        if (s.station_id) {
          labMins += mins;
        } else {
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

  const brandColor = admin.schools?.brand_color || '#eab308';
  
  const sidebarItems = [
    { id: 'live', label: 'Live Lab', icon: Monitor },
    { id: 'students', label: 'Schüler', icon: Users },
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

  const renderStudentsTab = () => (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="flex-between">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={24} color={brandColor} /> Schülerverwaltung
          </h2>
          <button onClick={() => setShowAddStudent(!showAddStudent)} style={{ background: brandColor, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 700 }}>
            <Plus size={18} /> Neu anlegen
          </button>
        </div>

        {showAddStudent && (
          <form onSubmit={handleAddStudent} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'white', borderRadius: '20px', border: `1px solid ${brandColor}20` }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Neuen Schüler anlegen</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <input required placeholder="Vorname" value={newStudent.firstName} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
              <input required placeholder="Nachname" value={newStudent.lastName} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
            </div>
            <ElegantBirthdayPicker 
              label="Geburtsdatum"
              value={newStudent.birthDate || '2010-01-01'}
              onChange={newVal => setNewStudent({...newStudent, birthDate: newVal})}
            />

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Avatar wählen:</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {STUDENT_AVATARS.map(av => (
                  <div 
                    key={av.id}
                    onClick={() => setNewStudent({...newStudent, photoUrl: av.url})}
                    style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      border: `3px solid ${newStudent.photoUrl === av.url ? brandColor : 'white'}`,
                      boxShadow: newStudent.photoUrl === av.url ? `0 0 0 2px ${brandColor}30` : '0 2px 8px rgba(0,0,0,0.06)',
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
            <ElegantBirthdayPicker 
              label="Geburtsdatum"
              value={editingStudent.birth_date || '2010-01-01'}
              onChange={newVal => setEditingStudent({...editingStudent, birth_date: newVal})}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>Aktualisieren</button>
              <button type="button" onClick={() => setEditingStudent(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
            </div>
          </form>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {students.map(s => (
            <div key={s.id} className="glass-panel" style={{ padding: '16px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '20px', border: '1px solid #f1f5f9', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                <div 
                  onClick={() => fetchStudentProfile(s)}
                  style={{ cursor: 'pointer' }}
                >
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
        <div className="flex-between">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Shield size={24} color={brandColor} /> Kollegium & Team
          </h2>
          <button onClick={() => setShowAddTeacher(!showAddTeacher)} style={{ background: brandColor, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 700 }}>
            <Plus size={18} /> Team-Mitglied
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
                {Object.keys(INSTRUMENT_ICONS).map(inst => {
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
                      <span>{INSTRUMENT_ICONS[inst]}</span> {inst}
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
          <form onSubmit={handleUpdateTeacher} className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0369a1' }}>Profil bearbeiten</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <input required placeholder="Vorname" value={editingTeacher.first_name} onChange={e => setEditingTeacher({...editingTeacher, first_name: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />
              <input required placeholder="Nachname" value={editingTeacher.last_name} onChange={e => setEditingTeacher({...editingTeacher, last_name: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />
            </div>
            
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Status & Rolle:</label>
              <select value={editingTeacher.role} onChange={e => setEditingTeacher({...editingTeacher, role: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700 }}>
                <option value="teacher">Lehrkraft / Coach</option>
                <option value="admin">Master-Lehrkraft (Admin)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>BANDS / PROJEKTE</label>
                <textarea value={editingTeacher.bands || ''} onChange={e => setEditingTeacher({...editingTeacher, bands: e.target.value})} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '80px', fontSize: '0.9rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>EQUIPMENT / GEAR</label>
                <textarea value={editingTeacher.gear || ''} onChange={e => setEditingTeacher({...editingTeacher, gear: e.target.value})} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '80px', fontSize: '0.9rem' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: 800, cursor: 'pointer' }}>Änderungen speichern</button>
              <button type="button" onClick={() => setEditingTeacher(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
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
                  {t.role === 'admin' ? 'Master Coach' : 'Academy Coach'}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {t.instrument?.split(',').map((inst: string) => (
                    <span key={inst} style={{ padding: '6px 12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                      {INSTRUMENT_ICONS[inst.trim()] || '🎸'} {inst.trim()}
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
        <div className="flex-between">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Box size={24} color={brandColor} /> Räume & Übeplätze
          </h2>
          <button onClick={() => setShowAddRoom(!showAddRoom)} style={{ background: brandColor, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 700 }}>
            <Plus size={18} /> Neuer Raum
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
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{room.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <button 
                        onClick={() => handleAddGeofencePoint(room.id)}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          background: room.latitude ? '#f0fdf4' : '#fff7ed', 
                          border: `1px solid ${room.latitude ? '#bbf7d0' : '#ffedd5'}`, 
                          color: room.latitude ? '#166534' : '#9a3412',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <MapPin size={12} />
                        {room.latitude ? 'Geofence aktiv' : 'Kein Geofence'} • Scan
                      </button>
                      {room.latitude && (
                        <button 
                          onClick={() => handleClearGeofencePoints(room.id)}
                          style={{ padding: '4px', color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
                          title="Löschen"
                        >
                          <X size={12} />
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
                  <input required placeholder="iPad Name (z.B. Platz 1)" value={newStationName} onChange={e => setNewStationName(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }} />
                  <button type="submit" style={{ background: brandColor, color: 'white', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem' }}>OK</button>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stations.filter(s => s.room_id === room.id).map(station => (
                  <div key={station.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, color: '#475569' }}>
                      <Tablet size={16} color="#94a3b8" /> {station.name}
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
        <div className="flex-between">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Library size={24} color={brandColor} /> Songbibliothek
          </h2>
          <button onClick={() => setShowAddSong(!showAddSong)} style={{ background: brandColor, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 700 }}>
            <Plus size={18} /> Song hinzufügen
          </button>
        </div>
        
        {showAddSong && (
          <form onSubmit={handleAddSong} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'white', borderRadius: '20px', border: `1px solid ${brandColor}20` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <input required placeholder="Interpret / Band" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
              <input required placeholder="Songtitel" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800 }}>Song speichern</button>
              <button type="button" onClick={() => setShowAddSong(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700 }}>Abbrechen</button>
            </div>
          </form>
        )}

        {editingSong && (
          <form onSubmit={handleUpdateSong} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0369a1' }}>Song bearbeiten</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <input required placeholder="Interpret" value={editingSong.artist} onChange={e => setEditingSong({...editingSong, artist: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />
              <input required placeholder="Titel" value={editingSong.title} onChange={e => setEditingSong({...editingSong, title: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800 }}>Aktualisieren</button>
              <button type="button" onClick={() => setEditingSong(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '12px', fontWeight: 700 }}>Abbrechen</button>
            </div>
          </form>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {songs.map(song => (
            <div key={song.id} className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: '20px', border: '1px solid #f1f5f9', borderLeft: `6px solid ${brandColor}` }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{song.artist}</div>
                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>{song.title}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setEditingSong(song)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', cursor: 'pointer', color: '#64748b' }}><Pencil size={18} /></button>
                <button onClick={() => handleDeleteSong(song.id)} style={{ background: '#fff1f2', border: '1px solid #fecaca', padding: '10px', borderRadius: '10px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={18} /></button>
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
      <AcademySetup school={admin?.schools} brandColor={brandColor} onUpdate={() => fetchData()} />
      <DeviceSetupScreen rooms={rooms} stations={stations} brandColor={brandColor} />
    </div>
  );

  const renderStudentDetailModal = () => {
    if (!selectedStudent) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: 'white', borderRadius: '32px', position: 'relative', animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <button onClick={() => setSelectedStudent(null)} style={{ position: 'absolute', top: '24px', right: '24px', width: '40px', height: '40px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#64748b', zIndex: 10 }}>×</button>
          
          <div style={{ height: '140px', background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`, position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: '-40px', left: '32px', display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '28px', border: '5px solid white', background: '#f8fafc', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                <img src={selectedStudent.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>{selectedStudent.first_name} {selectedStudent.last_name}</h3>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#64748b' }}>Mitglied der Akademie</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '64px 32px 32px 32px' }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Pädagogische Notizen</div>
                  <textarea 
                    defaultValue={selectedStudent.teacher_notes || ''}
                    onBlur={async (e) => {
                      await supabase.from('users').update({ teacher_notes: e.target.value }).eq('id', selectedStudent.id);
                    }}
                    placeholder="Eindrücke festhalten..."
                    style={{ width: '100%', background: 'transparent', border: 'none', resize: 'none', minHeight: '100px', fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}
                  />
                </div>
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Aktivität & Status</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#475569' }}>Konto aktiv</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Registriert seit: {new Date(selectedStudent.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
             </div>

             <div style={{ textAlign: 'center' }}>
               <button onClick={() => setSelectedQRUser(selectedStudent)} style={{ width: '100%', background: `${brandColor}10`, color: brandColor, border: `1px solid ${brandColor}30`, padding: '16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                 <QrCode size={20} /> Digitalen ID-Pass anzeigen
               </button>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderQRModal = () => {
    if (!selectedQRUser) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedQRUser(null)}>
        <div className="glass-panel" style={{ background: 'white', padding: '48px', borderRadius: '40px', textAlign: 'center', width: '90%', maxWidth: '440px', boxShadow: '0 30px 100px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-24px', marginRight: '-24px', marginBottom: '8px' }}>
            <button onClick={() => setSelectedQRUser(null)} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>✕</button>
          </div>
          <div style={{ width: '80px', height: '80px', borderRadius: '24px', overflow: 'hidden', margin: '0 auto 24px', border: `3px solid ${brandColor}`, boxShadow: `0 8px 20px ${brandColor}30` }}>
            <img src={selectedQRUser.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>{selectedQRUser.first_name} {selectedQRUser.last_name}</div>
          <div style={{ fontSize: '0.875rem', color: brandColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '32px' }}>Student Pass / Digital ID</div>
          
          <div style={{ background: 'white', padding: '24px', borderRadius: '32px', border: '1px solid #f1f5f9', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', display: 'inline-block', marginBottom: '32px' }}>
            <QRCode value={selectedQRUser.qr_token || selectedQRUser.id} size={250} level="H" />
          </div>
          
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '32px', fontWeight: 500 }}>
            Halte diesen Code vor die Kamera des iPads,<br />um dich automatisch am Platz anzumelden.
          </p>
          
          <button onClick={() => window.print()} style={{ width: '100%', background: brandColor, color: 'white', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'} onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}>
            <Monitor size={18} /> QR-Code drucken
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
    <div style={{ flex: 1, padding: '24px 48px 48px 48px', overflowY: 'auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1e293b', letterSpacing: '-0.03em', margin: 0 }}>
            {sidebarItems.find(i => i.id === activeTab)?.label}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: 500, marginTop: '4px' }}>
            {(admin as any).schools?.name} • Management Dashboard
          </p>
        </div>
      </header>

      {activeTab === 'live' && renderLiveTab()}
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
    </div>
  );
}

function IDGallery({ users, brandColor, onShowQR }: { users: any[], brandColor: string, onShowQR: (user: any) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredUsers = users.filter(u => 
    u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Name suchen..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '14px 14px 14px 48px', 
                borderRadius: '16px', 
                border: '1px solid rgba(255,255,255,0.5)', 
                background: 'rgba(255,255,255,0.8)',
                color: '#1e293b',
                fontWeight: 600,
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                outline: 'none'
              }} 
            />
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
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                    <img src={u.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
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

function AcademySetup({ school, brandColor, onUpdate }: { school: any, brandColor: string, onUpdate: () => void }) {
  const [name, setName] = useState(school?.name || '');
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
      .update({ name, opening_hours: hours })
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
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Akademie Name</label>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', maxWidth: '400px', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, fontSize: '1.1rem' }}
          />
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
