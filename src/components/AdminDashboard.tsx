import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Music, AlertCircle, Library, Shield, LogOut, Users, Monitor, QrCode, Plus, Pencil, Trash2, Box, BarChart as LucideBarChart, Clock, Star, PieChart as LucidePieChart, TrendingUp, Tablet, ExternalLink } from 'lucide-react';
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
import { QRCodeModal } from './QRCodeModal';
import { TeacherDashboard } from './TeacherDashboard';
import { ElegantBirthdayPicker } from './ElegantBirthdayPicker';

const INSTRUMENT_ICONS: Record<string, string> = { Guitar: '🎸', Bass: '🎸', Drums: '🥁', Keys: '🎹', Vocals: '🎤' };

const TEACHER_AVATARS = [
  { id: 't_multi', url: '/avatar_teacher_male.jpg', label: 'Multi-Instrumentalist' },
  { id: 't_coach', url: '/avatar_teacher_female.jpg', label: 'Band Coach' },
  { id: 't_legend', url: '/avatar_teacher_expert.jpg', label: 'Session Legend' }
];

interface AdminDashboardProps {
  userId: string;
  onLogout: () => void;
}

export function AdminDashboard({ userId, onLogout }: AdminDashboardProps) {
  const [admin, setAdmin] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'students' | 'team' | 'rooms' | 'songs' | 'stats'>('live');
  
   const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', birthDate: '' });
  
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

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    const { data: adminData } = await supabase
      .from('users')
      .select('*, schools(*)')
      .eq('id', userId)
      .single();
    setAdmin(adminData);

    if (adminData?.school_id) {
      if (activeTab === 'students') {
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
      }
    }
  };

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
    const { data, error } = await supabase.from('users').insert({
      school_id: admin.school_id, role: 'student', first_name: newStudent.firstName, last_name: newStudent.lastName, birth_date: newStudent.birthDate || null
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
      qr_token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
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

  if (!admin) return <div className="app-container flex-center">Lade Dashboard...</div>;
  const brandColor = 'var(--primary-color)';

  return (
    <div className="app-container" style={{ background: '#f9fafb' }}>
      <header className="header" style={{ background: 'white', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="school-brand">
          <div className="school-logo" style={{ color: brandColor, background: 'white', border: '1px solid rgba(0,0,0,0.05)' }}>
            <Music size={24} />
          </div>
          <div className="school-name">Admin: {admin.first_name}</div>
        </div>
        <button onClick={onLogout} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <LogOut size={20} />
        </button>
      </header>

      <div style={{ padding: '0 20px', display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button onClick={() => setActiveTab('live')} style={{ flex: 1, padding: '12px 4px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer', background: activeTab === 'live' ? brandColor : 'white', color: activeTab === 'live' ? 'white' : 'var(--text-muted)', boxShadow: activeTab === 'live' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem' }}>
          <Monitor size={14} /> Live
        </button>
        <button onClick={() => setActiveTab('students')} style={{ flex: 1, padding: '12px 4px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer', background: activeTab === 'students' ? brandColor : 'white', color: activeTab === 'students' ? 'white' : 'var(--text-muted)', boxShadow: activeTab === 'students' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem' }}>
          <Users size={14} /> Schüler
        </button>
        <button onClick={() => setActiveTab('team')} style={{ flex: 1, padding: '12px 4px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer', background: activeTab === 'team' ? brandColor : 'white', color: activeTab === 'team' ? 'white' : 'var(--text-muted)', boxShadow: activeTab === 'team' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem' }}>
          <Shield size={14} /> Team
        </button>
        <button onClick={() => setActiveTab('rooms')} style={{ flex: 1, padding: '12px 4px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer', background: activeTab === 'rooms' ? brandColor : 'white', color: activeTab === 'rooms' ? 'white' : 'var(--text-muted)', boxShadow: activeTab === 'rooms' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem' }}>
          <Box size={14} /> Räume
        </button>
        <button onClick={() => setActiveTab('songs')} style={{ flex: 1, padding: '12px 4px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer', background: activeTab === 'songs' ? brandColor : 'white', color: activeTab === 'songs' ? 'white' : 'var(--text-muted)', boxShadow: activeTab === 'songs' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem' }}>
          <Library size={14} /> Songs
        </button>
        <button onClick={() => setActiveTab('stats')} style={{ flex: 1, padding: '12px 4px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer', background: activeTab === 'stats' ? brandColor : 'white', color: activeTab === 'stats' ? 'white' : 'var(--text-muted)', boxShadow: activeTab === 'stats' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem' }}>
          <LucideBarChart size={14} /> Statistik
        </button>
      </div>

      {activeTab === 'live' && <TeacherDashboard userId={userId} hideHeader={true} />}

      {activeTab === 'stats' && stats && (
        <main className="main-content" style={{ marginTop: '24px', paddingBottom: '40px' }}>
          <div className="print-header" style={{ display: 'none', marginBottom: '24px' }}>
            <h2>Statistik-Bericht: {(admin as any)?.schools?.name}</h2>
            <p>Stand: {new Date().toLocaleDateString()}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }} className="no-print">
            <button onClick={() => window.print()} style={{ background: 'white', border: '1px solid #e2e8f0', color: '#1e293b', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ExternalLink size={16} /> Bericht exportieren (PDF)
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="glass-panel" style={{ padding: '24px', background: 'white', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${brandColor}15`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schüler gesamt</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b' }}>{stats.studentCount}</div>
              </div>
            </div>
            
            <div className="glass-panel" style={{ padding: '24px', background: 'white', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${brandColor}15`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Library size={24} />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Songbibliothek</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b' }}>{stats.songCount}</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f59e0b20', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={24} fill="#f59e0b" />
              </div>
              <div>
                <div style={{ color: '#b45309', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Band Ready Songs</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f59e0b' }}>{stats.bandReadyCount}</div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', background: 'white', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color={brandColor} /> Übe-Statistiken (Durchschnitt)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Groovelab Session</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: brandColor }}>{stats.avgLabSessionMins}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)' }}>Min. / Besuch</span>
                </div>
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '12px' }}>
                  <div style={{ width: `${Math.min(100, (stats.avgLabSessionMins / 60) * 100)}%`, height: '100%', background: brandColor, borderRadius: '3px' }}></div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Home Übezeit</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: '#3b82f6' }}>{Math.round(stats.avgHomeMinsPerWeek / 60)}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)' }}>Std. / Woche</span>
                </div>
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '12px' }}>
                  <div style={{ width: `${Math.min(100, (stats.avgHomeMinsPerWeek / 600) * 100)}%`, height: '100%', background: '#3b82f6', borderRadius: '3px' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', background: 'white', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color={brandColor} /> Live-Frequenz (Wann sind die Kinder da?)
            </h3>
            <div style={{ width: '100%', height: '200px' }}>
              <ResponsiveContainer>
                <RechartsBarChart data={stats.hourlyAttendance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} />
                  <Bar dataKey="count" fill={brandColor} radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', background: 'white', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LucidePieChart size={20} color={brandColor} /> XP-Verteilung nach Instrumenten
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px', alignItems: 'center' }}>
              <div style={{ width: '100%', height: '350px' }}>
                <ResponsiveContainer>
                  <RechartsPieChart>
                    <Pie
                      data={stats.instXp}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={10}
                      dataKey="value"
                    >
                      {stats.instXp.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={INSTRUMENT_COLORS[entry.name] || brandColor} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '12px' }} 
                      itemStyle={{ fontWeight: 700 }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {stats.instXp.sort((a: any, b: any) => b.value - a.value).map((entry: any) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: INSTRUMENT_COLORS[entry.name] }}></div>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{entry.name}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: brandColor }}>{entry.value.toLocaleString()} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', background: 'white', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color={brandColor} /> Auslastung (Wochentage)
            </h3>
            <div style={{ width: '100%', height: '240px' }}>
              <ResponsiveContainer>
                <RechartsBarChart data={stats.weekdayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} />
                  <Bar dataKey="mins" radius={[6, 6, 6, 6]} barSize={40}>
                    {stats.weekdayData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? brandColor : `${brandColor}80`} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </main>
      )}

      {activeTab === 'students' && (
        <main className="main-content" style={{ marginTop: '24px' }}>
          <div className="glass-panel" style={{ padding: '20px', background: brandColor, color: 'white', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{(admin as any)?.schools?.name}</h2>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Alle Räume mit 20m Radius aktiv.</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="flex-between">
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={20} color={brandColor} /> Schülerverwaltung</h2>
              <button onClick={() => setShowAddStudent(!showAddStudent)} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600 }}><Plus size={16} /> Neu</button>
            </div>
            {showAddStudent && (
              <form onSubmit={handleAddStudent} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'white' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Neuen Schüler anlegen</h3>
                <input required placeholder="Vorname" value={newStudent.firstName} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <input required placeholder="Nachname" value={newStudent.lastName} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <ElegantBirthdayPicker 
                  label="Geburtsdatum"
                  value={newStudent.birthDate || '2010-01-01'}
                  onChange={newVal => setNewStudent({...newStudent, birthDate: newVal})}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Anlegen</button>
                  <button type="button" onClick={() => setShowAddStudent(false)} style={{ flex: 1, background: '#f3f4f6', color: 'var(--text-main)', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
                </div>
              </form>
            )}

            {editingStudent && (
              <form onSubmit={handleUpdateStudent} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fffbeb', border: '1px solid #fef3c7' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Schüler bearbeiten</h3>
                <input required placeholder="Vorname" value={editingStudent.first_name} onChange={e => setEditingStudent({...editingStudent, first_name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white' }} />
                <input required placeholder="Nachname" value={editingStudent.last_name} onChange={e => setEditingStudent({...editingStudent, last_name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white' }} />
                <ElegantBirthdayPicker 
                  label="Geburtsdatum"
                  value={editingStudent.birth_date || '2010-01-01'}
                  onChange={newVal => setEditingStudent({...editingStudent, birth_date: newVal})}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Aktualisieren</button>
                  <button type="button" onClick={() => setEditingStudent(null)} style={{ flex: 1, background: 'white', color: 'var(--text-main)', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
                </div>
              </form>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {students.map(s => (
                <div key={s.id} className="glass-panel" style={{ padding: '16px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: brandColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <img 
                        src={s.photo_url || '/avatar_ghost.jpg'} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 2 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', zIndex: 1 }}>{s.first_name?.[0]}</span>
                    </div>
                    <div 
                      onClick={() => fetchStudentProfile(s)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ fontWeight: 600, color: brandColor, textDecoration: 'underline' }}>{s.first_name} {s.last_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {s.id.split('-')[0]}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditingStudent(s)} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)' }} title="Bearbeiten"><Pencil size={18} /></button>
                    <button onClick={() => setSelectedQRUser(s)} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: brandColor }} title="QR Code"><QrCode size={18} /></button>
                    <button onClick={() => handleDeleteStudent(s.id)} style={{ background: 'white', border: '1px solid #fecaca', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444' }} title="Löschen"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {activeTab === 'team' && (
        <main className="main-content" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="flex-between">
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={20} color={brandColor} /> Kollegium</h2>
              <button onClick={() => setShowAddTeacher(!showAddTeacher)} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600 }}><Plus size={16} /> Neu</button>
            </div>
            {showAddTeacher && (
              <form onSubmit={handleAddTeacher} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'white' }}>
                <input required placeholder="Vorname" value={newTeacher.firstName} onChange={e => setNewTeacher({...newTeacher, firstName: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <input required placeholder="Nachname" value={newTeacher.lastName} onChange={e => setNewTeacher({...newTeacher, lastName: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 600 }}><input type="checkbox" checked={newTeacher.isAdmin} onChange={e => setNewTeacher({...newTeacher, isAdmin: e.target.checked})} /> Admin-Rechte</label>
                
                <div style={{ padding: '8px 0' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Avatar wählen:</label>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    {TEACHER_AVATARS.map(av => (
                      <div 
                        key={av.id}
                        onClick={() => setNewTeacher({...newTeacher, photoUrl: av.url})}
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          borderRadius: '50%', 
                          overflow: 'hidden', 
                          border: `3px solid ${newTeacher.photoUrl === av.url ? brandColor : 'transparent'}`,
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
                
                <div style={{ padding: '4px 0' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Fächer / Instrumente:</label>
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
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '12px', border: '1px solid #e5e7eb',
                            background: isSelected ? brandColor : 'white',
                            color: isSelected ? 'white' : 'var(--text-main)',
                            fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          <span>{INSTRUMENT_ICONS[inst]}</span> {inst}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button type="submit" style={{ background: brandColor, color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Speichern</button>
              </form>
            )}
            {editingTeacher && (
              <form onSubmit={handleUpdateTeacher} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f0f9ff', border: '1px solid #e0f2fe' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Lehrer bearbeiten</h3>
                <input required placeholder="Vorname" value={editingTeacher.first_name} onChange={e => setEditingTeacher({...editingTeacher, first_name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white' }} />
                <input required placeholder="Nachname" value={editingTeacher.last_name} onChange={e => setEditingTeacher({...editingTeacher, last_name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white' }} />
                <select value={editingTeacher.role} onChange={e => setEditingTeacher({...editingTeacher, role: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white' }}>
                  <option value="teacher">Lehrer</option>
                  <option value="admin">Master-Lehrer (Admin)</option>
                </select>

                <div style={{ padding: '8px 0' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>Avatar wählen:</label>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    {TEACHER_AVATARS.map(av => (
                      <div 
                        key={av.id}
                        onClick={() => setEditingTeacher({...editingTeacher, photo_url: av.url})}
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          borderRadius: '50%', 
                          overflow: 'hidden', 
                          border: `3px solid ${editingTeacher.photo_url === av.url ? brandColor : 'transparent'}`,
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
                <div style={{ padding: '8px 0' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Fächer / Instrumente:</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {Object.keys(INSTRUMENT_ICONS).map(inst => {
                      const isSelected = (editingTeacher.instrument || '').includes(inst);
                      return (
                        <button
                          key={inst}
                          type="button"
                          onClick={() => {
                            const current = (editingTeacher.instrument || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                            const next = current.includes(inst) ? current.filter((s: string) => s !== inst) : [...current, inst];
                            setEditingTeacher({...editingTeacher, instrument: next.join(', ')});
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '12px', border: '1px solid #e5e7eb',
                            background: isSelected ? brandColor : 'white',
                            color: isSelected ? 'white' : 'var(--text-main)',
                            fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          <span>{INSTRUMENT_ICONS[inst]}</span> {inst}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <textarea placeholder="Bands / Projekte" value={editingTeacher.bands || ''} onChange={e => setEditingTeacher({...editingTeacher, bands: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', minHeight: '60px' }} />
                <textarea placeholder="Equipment / Gear" value={editingTeacher.gear || ''} onChange={e => setEditingTeacher({...editingTeacher, gear: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', minHeight: '60px' }} />
                <textarea placeholder="Musical Journey" value={editingTeacher.projects || ''} onChange={e => setEditingTeacher({...editingTeacher, projects: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', minHeight: '60px' }} />
                <textarea placeholder="Wird gerade gehört (Listening)" value={editingTeacher.listening || ''} onChange={e => setEditingTeacher({...editingTeacher, listening: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', minHeight: '60px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Aktualisieren</button>
                  <button type="button" onClick={() => setEditingTeacher(null)} style={{ flex: 1, background: 'white', color: 'var(--text-main)', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
                </div>
              </form>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {teachers.map(t => (
                <div key={t.id} className="glass-panel" style={{ padding: '16px', background: 'white', borderLeft: t.role === 'admin' ? `4px solid ${brandColor}` : 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setEditingTeacher(t)}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    border: '1px solid #e5e7eb', 
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <img 
                      src={t.photo_url || '/avatar_ghost.jpg'} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 2 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: brandColor, zIndex: 1 }}>{t.first_name?.[0]}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>{t.first_name} {t.last_name} {t.role === 'admin' && <Shield size={14} color={brandColor} />}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rolle: {t.role === 'admin' ? 'Master-Lehrer' : 'Lehrer'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setEditingTeacher(t)} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)' }} title="Bearbeiten"><Pencil size={18} /></button>
                    <button onClick={() => setSelectedQRUser(t)} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: brandColor }} title="QR Code"><QrCode size={18} /></button>
                    <button onClick={() => handleDeleteTeacher(t.id)} style={{ background: 'white', border: '1px solid #fecaca', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444' }} title="Löschen"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {activeTab === 'rooms' && (
        <main className="main-content" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="flex-between">
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Box size={20} color={brandColor} /> Räume & iPads</h2>
              <button onClick={() => setShowAddRoom(!showAddRoom)} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600 }}><Plus size={16} /> Neu</button>
            </div>
                {showAddRoom && (
              <form onSubmit={handleAddRoom} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'white', borderRadius: '20px', boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Neuen Raum konfigurieren</div>
                
                <input required placeholder="Raum Name (z.B. Band-Room A)" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '1rem' }} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Geostandort (Zentrum des Raums)</label>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '0.875rem', color: newRoomLocation ? 'var(--text-main)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <QrCode size={16} />
                      {newRoomLocation ? `${newRoomLocation.lat.toFixed(4)}, ${newRoomLocation.lng.toFixed(4)}` : 'Standort noch nicht erfasst'}
                    </div>
                    <button type="button" onClick={captureGPSForRoom} style={{ background: 'white', border: `1px solid ${brandColor}`, color: brandColor, padding: '8px 16px', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                      Jetzt scannen
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    Anzahl der iPad-Plätze <span>{newRoomStationCount}</span>
                  </label>
                  <input 
                    type="range" min="0" max="30" step="1" 
                    value={newRoomStationCount} 
                    onChange={e => setNewRoomStationCount(parseInt(e.target.value))} 
                    style={{ width: '100%', accentColor: brandColor }} 
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Die Plätze werden automatisch als "iPad 1", "iPad 2" usw. angelegt.</div>
                </div>

                <button type="submit" style={{ background: brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)', marginTop: '8px' }}>Raum & iPads erstellen</button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {rooms.map(room => (
                <div key={room.id} className="glass-panel" style={{ padding: '16px', background: 'white' }}>
                  <div className="flex-between" style={{ marginBottom: '16px', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ background: '#fef3c7', color: '#b45309', padding: '10px', borderRadius: '12px' }}>
                        <Box size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{room.name}</h3>
                        {room.latitude && (
                          <div style={{ fontSize: '0.7rem', color: brandColor, fontWeight: 700, fontFamily: 'monospace', marginTop: '4px', background: '#fffbeb', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                            {room.latitude.toFixed(6)}, {room.longitude.toFixed(6)}
                          </div>
                        )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.75rem', color: (room.geofence_points?.length > 0 || room.latitude) ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
                              📍 {room.geofence_points?.length || (room.latitude ? 1 : 0)} Punkt(e) kalibriert (20m Radius)
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => handleAddGeofencePoint(room.id)}
                                style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 800 }}
                              >
                                <Plus size={12} /> Punkt hinzufügen
                              </button>
                              {(room.geofence_points?.length > 0 || room.latitude) && (
                                <button 
                                  onClick={() => handleClearGeofencePoints(room.id)}
                                  style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}
                                >
                                  Löschen
                                </button>
                              )}
                            </div>
                          </div>
                      </div>
                      <button onClick={() => handleDeleteRoom(room.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.4, padding: '4px' }} title="Raum löschen">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <button onClick={() => setShowAddStationForRoom(room.id)} style={{ background: 'transparent', border: 'none', color: brandColor, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 700 }}><Plus size={16} /> iPad</button>
                  </div>
                  
                  {showAddStationForRoom === room.id && (
                    <form onSubmit={(e) => handleAddStation(e, room.id)} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <input required placeholder="Tisch Name (z.B. iPad 1)" value={newStationName} onChange={e => setNewStationName(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                      <input type="color" value={newStationColor} onChange={e => setNewStationColor(e.target.value)} style={{ width: '40px', height: '38px', padding: '2px', borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer' }} title="iPad Farbe" />
                      <button type="submit" style={{ background: brandColor, color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Speichern</button>
                    </form>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stations.filter(s => s.room_id === room.id).map(station => (
                      <div key={station.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#1e293b' }}>
                            <input 
                              type="color" 
                              value={station.color || '#e5e7eb'} 
                              onChange={(e) => handleUpdateStationColor(station.id, e.target.value)} 
                              style={{ width: '20px', height: '20px', border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'transparent' }} 
                              title="Farbe ändern"
                            />
                            <Tablet size={16} color="#64748b" /> {station.name}
                          </div>
                          <button onClick={() => handleDeleteStation(station.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.4 }} title="Löschen">
                            <Trash2 size={14} />
                          </button>
                        </div>

                      </div>
                    ))}
                    {stations.filter(s => s.room_id === room.id).length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Noch keine Tische in diesem Raum.</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {activeTab === 'songs' && (
        <main className="main-content" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="flex-between">
              <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Library size={20} color={brandColor} /> Songbibliothek</h2>
              <button onClick={() => setShowAddSong(!showAddSong)} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 600 }}><Plus size={16} /> Neu</button>
            </div>
            
            {showAddSong && (
              <form onSubmit={handleAddSong} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'white' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input required placeholder="Interpret (z.B. Nirvana)" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <input required placeholder="Titel" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Level (1-3):</label>
                  <input type="number" min="1" max="3" required value={newSong.level} onChange={e => setNewSong({...newSong, level: parseInt(e.target.value)})} style={{ width: '60px', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }} />
                </div>

                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#f9fafb' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>Benötigte Instrumente für eine Band:</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {['Guitar', 'Bass', 'Drums', 'Keys', 'Vocals'].map(inst => (
                      <div key={inst} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '4px 8px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, width: '40px' }}>{inst}</span>
                        <input 
                          type="number" min="0" max="5" 
                          value={(newSong.instrumentation as any)[inst]} 
                          onChange={e => setNewSong({...newSong, instrumentation: {...newSong.instrumentation, [inst]: parseInt(e.target.value) || 0}})}
                          style={{ width: '40px', padding: '4px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input placeholder="PDF / Noten Link" type="url" value={newSong.media_link} onChange={e => setNewSong({...newSong, media_link: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <input placeholder="Tomplay Link" type="url" value={newSong.tomplay_url} onChange={e => setNewSong({...newSong, tomplay_url: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                </div>
                
                <button type="submit" style={{ background: brandColor, color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Song in Katalog aufnehmen</button>
              </form>
            )}
            {editingSong && (
              <form onSubmit={handleUpdateSong} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f0f9ff', border: '1px solid #e0f2fe' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Song bearbeiten</h3>
                <input required placeholder="Interpret" value={editingSong.artist} onChange={e => setEditingSong({...editingSong, artist: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white' }} />
                <input required placeholder="Songtitel" value={editingSong.title} onChange={e => setEditingSong({...editingSong, title: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white' }} />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>Level (1-3):</label>
                  <input type="number" min="1" max="3" required value={editingSong.level} onChange={e => setEditingSong({...editingSong, level: parseInt(e.target.value)})} style={{ width: '60px', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', textAlign: 'center', background: 'white' }} />
                </div>

                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: 'white' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>Benötigte Instrumente:</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {['Guitar', 'Bass', 'Drums', 'Keys', 'Vocals'].map(inst => (
                      <div key={inst} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f9fafb', padding: '4px 8px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, width: '40px' }}>{inst}</span>
                        <input 
                          type="number" min="0" max="5" 
                          value={(editingSong.instrumentation as any)[inst] || 0} 
                          onChange={e => setEditingSong({...editingSong, instrumentation: {...editingSong.instrumentation, [inst]: parseInt(e.target.value) || 0}})}
                          style={{ width: '40px', padding: '4px', borderRadius: '4px', border: '1px solid #e5e7eb', textAlign: 'center' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input placeholder="PDF Link" type="url" value={editingSong.media_link || ''} onChange={e => setEditingSong({...editingSong, media_link: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white' }} />
                  <input placeholder="Tomplay Link" type="url" value={editingSong.tomplay_url || ''} onChange={e => setEditingSong({...editingSong, tomplay_url: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white' }} />
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Aktualisieren</button>
                  <button type="button" onClick={() => setEditingSong(null)} style={{ flex: 1, background: 'white', color: 'var(--text-main)', border: '1px solid #e5e7eb', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
                </div>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {songs.map(song => (
                <div key={song.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderLeft: `4px solid ${brandColor}` }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{song.artist} - {song.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Level {song.level}</span>
                      {song.media_link && (
                        <a href={song.media_link} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}>
                          <ExternalLink size={12} /> PDF
                        </a>
                      )}
                      {song.tomplay_url && (
                        <a href={song.tomplay_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                          <Music size={12} /> Tomplay
                        </a>
                      )}
                    </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setEditingSong(song)} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)' }} title="Bearbeiten"><Pencil size={18} /></button>
                      <button onClick={() => handleDeleteSong(song.id)} style={{ background: 'white', border: '1px solid #fecaca', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444' }} title="Löschen"><Trash2 size={18} /></button>
                    </div>
                  </div>
              ))}
              {songs.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Noch keine Songs in der Bibliothek.</p>}
            </div>
          </div>
        </main>
      )}

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '440px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                margin: '0 auto 12px auto', 
                border: `4px solid ${brandColor}`, 
                overflow: 'hidden', 
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <img 
                  src={selectedStudent.photo_url || '/avatar_ghost.jpg'} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 2 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  alt="Student" 
                />
                <span style={{ fontSize: '2rem', fontWeight: 800, color: brandColor, zIndex: 1 }}>{selectedStudent.first_name?.[0]}</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{selectedStudent.first_name} {selectedStudent.last_name}</h3>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
                {selectedStudent.birth_date && (
                  <span>
                    {new Date().getFullYear() - new Date(selectedStudent.birth_date).getFullYear()} Jahre 
                    <span style={{ opacity: 0.5, fontSize: '0.75rem', marginLeft: '4px' }}>
                      ({new Date(selectedStudent.birth_date).toLocaleDateString('de-DE')})
                    </span>
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
                {(selectedStudent.musical_styles || []).map((s: string) => (
                  <span key={s} style={{ fontSize: '0.6rem', fontWeight: 800, background: '#f3f4f6', padding: '2px 8px', borderRadius: '100px', color: '#64748b', border: '1px solid #e5e7eb' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {selectedStudent.wish_song && (
              <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '12px', border: '1px solid #d1fae5', marginBottom: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>Wunsch-Song</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#064e3b' }}>" {selectedStudent.wish_song} "</div>
              </div>
            )}

            {studentDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', background: '#f9fafb', padding: '16px', borderRadius: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: brandColor }}>{studentDetails.length}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Songs</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: brandColor }}>
                      {studentDetails.reduce((acc: number, s: any) => acc + (s.is_stage_ready || s.progress_percent === 100 ? 500 : s.progress_percent * 2), 0)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gesamt XP</div>
                  </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.25rem', color: brandColor }}>
                        {studentLabMins}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lab Min</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.25rem', color: brandColor }}>
                        {studentHomeMins}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Home Min</div>
                    </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: brandColor }}>
                      {studentDetails.filter((s: any) => s.is_stage_ready).length}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Stage Ready</div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={14} /> Lern-Statistik
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Ø Dauer</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{selectedStudent.stats?.avgDuration || 0} Min</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Zuletzt hier</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{selectedStudent.stats?.lastActive}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Fokus-Instrument</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{INSTRUMENT_ICONS[selectedStudent.stats?.topInstrument] || ''} {selectedStudent.stats?.topInstrument}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>Wochen aktiv</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{selectedStudent.stats?.streak || 0} 🔥</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Monitor size={14} /> My Gear
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {Object.entries((selectedStudent.equipment_list || []).reduce((acc: any, item: any) => {
                      if (!acc[item.category]) acc[item.category] = [];
                      acc[item.category].push(item.model);
                      return acc;
                    }, {})).map(([cat, models]: [any, any], idx: number) => {
                      const getIcon = (c: string) => {
                        const props = { size: 20, strokeWidth: 1.5 };
                        if (c === 'E-Drums') return <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '6px', borderRadius: '8px' }}><Music {...props} /></div>;
                        if (c === 'E-Bass') return <div style={{ background: '#fff7ed', color: '#ea580c', padding: '6px', borderRadius: '8px' }}><Music {...props} /></div>;
                        if (c === 'E-Piano') return <div style={{ background: '#eff6ff', color: '#2563eb', padding: '6px', borderRadius: '8px' }}><Music {...props} /></div>;
                        return <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: '6px', borderRadius: '8px' }}><Music {...props} /></div>;
                      };
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '8px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                          {getIcon(cat)}
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{cat}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{models.join(', ')}</div>
                          </div>
                        </div>
                      );
                    })}
                    {(selectedStudent.equipment_list || []).length === 0 && (
                      <div style={{ gridColumn: '1/-1', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Kein Equipment eingetragen.</div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Pencil size={14} /> Lehrer-Notizen
                  </div>
                  <textarea 
                    placeholder="Pädagogische Beobachtungen..."
                    defaultValue={selectedStudent.teacher_notes || ''}
                    onBlur={async (e) => {
                      await supabase.from('users').update({ teacher_notes: e.target.value }).eq('id', selectedStudent.id);
                    }}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '0.875rem', minHeight: '80px', fontFamily: 'inherit', background: '#fff' }}
                  />
                </div>

                {/* Highlights (Meisterstücke) */}
                {studentDetails && studentDetails.filter((s: any) => s.progress_percent === 100).length > 0 && (
                  <div style={{ marginTop: '24px', background: '#fffbeb', padding: '20px', borderRadius: '20px', border: '1px solid #fde68a' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#b45309', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Star size={14} fill="#f59e0b" color="#f59e0b" /> Meisterstücke
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {studentDetails.filter((s: any) => s.progress_percent === 100).map((s: any) => (
                        <div key={s.id} style={{ background: 'white', padding: '10px', borderRadius: '12px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{INSTRUMENT_ICONS[s.instrument]}</span>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.songs?.title}</div>
                            <div style={{ fontSize: '0.65rem', color: '#b45309' }}>Road to Rockstar 🏆</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejections / Focus List */}
                {studentRejections.length > 0 && (
                  <div style={{ marginTop: '24px', background: '#fff1f2', padding: '20px', borderRadius: '20px', border: '1px solid #fecaca' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#991b1b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={14} /> Übe-Fokus (Niederlagen)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {studentRejections.map((r: any) => (
                        <div key={r.id} style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{r.songs?.title}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(r.rejected_at).toLocaleDateString()} • {r.instrument}</div>
                          </div>
                          <div style={{ fontSize: '1.2rem' }}>{INSTRUMENT_ICONS[r.instrument]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '16px 0 8px 0' }}>Aktuelles Repertoire</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.values(studentDetails.reduce((acc: any, skill: any) => {
                    const songId = skill.songs?.id;
                    if (!acc[songId]) {
                      acc[songId] = { title: skill.songs?.title, artist: skill.songs?.artist, skills: [] };
                    }
                    acc[songId].skills.push(skill);
                    return acc;
                  }, {})).map((group: any, idx: number) => (
                    <div key={idx} style={{ padding: '16px', background: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{group.artist}</div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{group.title}</div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {group.skills.map((skill: any) => (
                          <div key={skill.id} style={{ background: 'white', padding: '8px 12px', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{INSTRUMENT_ICONS[skill.instrument] || '🎵'}</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{skill.instrument}</span>
                            </div>
                            <div style={{ fontWeight: 800, color: skill.is_stage_ready ? '#16a34a' : brandColor, fontSize: '0.875rem' }}>{skill.progress_percent}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {studentDetails.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '20px' }}>Noch keine Songs im Repertoire.</div>}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>Lade Details...</div>
            )}

            <button 
              onClick={() => { setSelectedStudent(null); setStudentDetails(null); }} 
              style={{ marginTop: '24px', background: '#f3f4f6', color: 'var(--text-main)', border: 'none', padding: '16px', borderRadius: '12px', width: '100%', fontWeight: 700, cursor: 'pointer' }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {selectedQRUser && <QRCodeModal user={selectedQRUser} onClose={() => setSelectedQRUser(null)} />}
    </div>
  );
}
