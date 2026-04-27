import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Monitor, Music, AlertCircle, Check, X, Award, Users, Pencil, Camera, QrCode, Star, ChevronDown, ChevronUp, BarChart as LucideBarChart, ExternalLink } from 'lucide-react';
import { QRCodeModal } from './QRCodeModal';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart as RechartsBarChart, Bar, XAxis, Tooltip, Cell
} from 'recharts';

const INSTRUMENT_ICONS: Record<string, string> = { Guitar: '🎸', Bass: '🎸', Drums: '🥁', Keys: '🎹', Vocals: '🎤' };

interface TeacherDashboardProps {
  userId: string;
  onLogout?: () => void;
  hideHeader?: boolean;
  locationMode?: 'lab' | 'home';
}

export function TeacherDashboard({ userId, onLogout, hideHeader = false, locationMode = 'home' }: TeacherDashboardProps) {
  const [teacher, setTeacher] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [homeActiveSessions, setHomeActiveSessions] = useState<any[]>([]);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [studentRejections, setStudentRejections] = useState<any[]>([]);
  const [studentLabMins, setStudentLabMins] = useState(0);
  const [studentHomeMins, setStudentHomeMins] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [studentActivity, setStudentActivity] = useState<any[]>([]);
  const [studentRadarData, setStudentRadarData] = useState<any[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [selectedQRUser, setSelectedQRUser] = useState<any>(null);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [rejections, setRejections] = useState<any[]>([]);
  const [isHomeSessionsExpanded, setIsHomeSessionsExpanded] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [songRequests, setSongRequests] = useState<any[]>([]);
  const [showAddRequestModal, setShowAddRequestModal] = useState<any>(null);

  const TEACHER_AVATARS = [
    { id: 't_multi', url: '/avatar_teacher_male.jpg', label: 'Multi-Instrumentalist' },
    { id: 't_coach', url: '/avatar_teacher_female.jpg', label: 'Band Coach' },
    { id: 't_legend', url: '/avatar_teacher_expert.jpg', label: 'Session Legend' }
  ];

  useEffect(() => {
    fetchData();
    
    // Einfaches Polling für Live-Monitoring alle 5 Sekunden
    const interval = setInterval(() => {
      fetchMonitoringData();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    const { data: teacherData } = await supabase
      .from('users')
      .select('*, schools(*)')
      .eq('id', userId)
      .single();
    setTeacher(teacherData);

    if (teacherData?.school_id) {
      fetchMonitoringData(teacherData.school_id);
    }
  };
  
  const fetchMonitoringData = async (schoolId?: string) => {
    const sId = schoolId || teacher?.school_id;
    if (!sId) return;
    
    // Räume und Tische laden
    const { data: stationsData } = await supabase
      .from('stations')
      .select('*, rooms!inner(school_id)')
      .eq('rooms.school_id', sId)
      .order('name');
    if (stationsData) setStations(stationsData);

    // Alle Sessions von heute laden (für Live-View und Historie)
    const today = new Date();
    today.setHours(0,0,0,0);

    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*, users(first_name, last_name), stations(name)')
      .gte('check_in_time', today.toISOString())
      .order('check_in_time', { ascending: false });
      
    if (sessionsData) {
      // Aktive Sessions (wer ist gerade eingeloggt?)
      // Nur Sessions der letzten 8h berücksichtigen, um "Leichen" zu vermeiden
      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
      const active = sessionsData.filter(s => !s.check_out_time && new Date(s.check_in_time) > eightHoursAgo);
      
      // Labor-Sessions (mit station_id)
      const labSessions = active.filter(s => s.station_id);
      
      // Für die iPad-Kacheln nehmen wir nur die aktuellste aktive Session pro Tisch
      const activeByStation = labSessions.filter((s, index, self) => 
        index === self.findIndex((t) => t.station_id === s.station_id)
      );
      
      // Home-Sessions (ohne station_id) - absolut EINDEUTIG pro User (nur der aktuellste Login zählt als aktiv)
      const homeSessions = active
        .filter(s => !s.station_id)
        .sort((a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime())
        .filter((s, index, self) => 
          index === self.findIndex((t) => t.user_id === s.user_id)
        );
      
      setActiveSessions(activeByStation);
      setHomeActiveSessions(homeSessions);
      setHistorySessions(sessionsData);
    }

    // Aktive Hilfe-Rufe laden
    const { data: helpData } = await supabase
      .from('help_requests')
      .select('*')
      .eq('status', 'pending');
    if (helpData) setHelpRequests(helpData);

    // Pending Approvals
      const { data: pendingData } = await supabase
        .from('user_song_skills')
        .select('*, users(first_name, last_name, photo_url), songs(title, artist)')
        .eq('is_pending_approval', true);
      if (pendingData) setPendingApprovals(pendingData);

      // Song Requests
      const { data: requestData } = await supabase
        .from('song_requests')
        .select('*, users(first_name, last_name, photo_url)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (requestData) setSongRequests(requestData);

    // Heutige Highlights laden (Stage Ready heute erreicht)
    const { data: highlightsData } = await supabase
      .from('user_song_skills')
      .select(`
        id,
        instrument,
        user_id,
        users (first_name, last_name),
        songs (title, artist),
        highlighted_at
      `)
      .eq('is_stage_ready', true)
      .eq('progress_percent', 100)
      .gte('highlighted_at', today.toISOString());
    if (highlightsData) setHighlights(highlightsData);

    // Heutige Niederlagen laden (Ablehnungen heute)
    const { data: rejectionsData } = await supabase
      .from('rejection_history')
      .select(`
        id,
        instrument,
        user_id,
        users (first_name, last_name),
        songs (title, artist),
        rejected_at
      `)
      .gte('rejected_at', today.toISOString());
    if (rejectionsData) setRejections(rejectionsData);
  };

  const handleForceLogout = async (sessionId: string) => {
    const { error } = await supabase.from('sessions').update({ check_out_time: new Date().toISOString() }).eq('id', sessionId);
    if (error) alert(error.message);
    else fetchMonitoringData();
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm('Diesen Wunsch wirklich löschen?')) return;
    const { error } = await supabase.from('song_requests').delete().eq('id', requestId);
    if (error) alert(error.message);
    else setSongRequests(songRequests.filter(r => r.id !== requestId));
  };

  const handleAcceptRequest = async (request: any) => {
    setShowAddRequestModal(request);
  };

  const handleAddSongFromRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const artist = (form.elements.namedItem('artist') as HTMLInputElement).value;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const level = parseInt((form.elements.namedItem('level') as HTMLSelectElement).value);

    const { error } = await supabase.from('songs').insert({
      school_id: teacher.school_id,
      artist,
      title,
      level,
      instrumentation: { Guitar: 1, Bass: 1, Drums: 1, Keys: 0, Vocals: 1 }
    }).select().single();

    if (error) {
      alert('Fehler: ' + error.message);
    } else {
      // Mark request as accepted
      await supabase.from('song_requests').update({ status: 'accepted' }).eq('id', showAddRequestModal.id);
      setSongRequests(songRequests.filter(r => r.id !== showAddRequestModal.id));
      setShowAddRequestModal(null);
      alert('Song wurde in die Bibliothek übernommen!');
    }
  };

  const clearHelpRequest = async (stationId: string) => {
    await supabase
      .from('help_requests')
      .update({ status: 'resolved' })
      .eq('station_id', stationId)
      .eq('status', 'pending');
    
    fetchMonitoringData();
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

  const fetchStudentProfile = async (student: any) => {
    setSelectedStudent(student);
    const { data: skills } = await supabase
      .from('user_song_skills')
      .select('*, songs(*)')
      .eq('user_id', student.id);
    
    setStudentDetails(skills || []);

    // Niederlagen (Herausforderungen) laden
    const { data: rejHistory } = await supabase
      .from('rejection_history')
      .select('*, songs(*)')
      .eq('user_id', student.id)
      .order('rejected_at', { ascending: false });
    setStudentRejections(rejHistory || []);

    // Präsenzminuten laden
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

      // Radar Chart Data (XP pro Instrument)
      const radarBase: Record<string, number> = { Guitar: 0, Bass: 0, Drums: 0, Keys: 0, Vocals: 0 };
      skills?.forEach((s: any) => {
        if (radarBase[s.instrument] !== undefined) {
          radarBase[s.instrument] += (s.is_stage_ready || s.progress_percent === 100 ? 500 : s.progress_percent * 2);
        }
      });
      setStudentRadarData(Object.entries(radarBase).map(([inst, xp]) => ({ instrument: inst, xp })));

      // Activity Chart Data (Letzte 7 Tage)
      const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = days[d.getDay()];
        const mins = allSessions
          .filter(s => new Date(s.check_in_time).toDateString() === d.toDateString())
          .reduce((acc, s) => {
            const start = new Date(s.check_in_time);
            const end = s.check_out_time ? new Date(s.check_out_time) : new Date();
            return acc + Math.floor((end.getTime() - start.getTime()) / 60000);
          }, 0);
        last7.push({ day: dayStr, mins });
      }
      setStudentActivity(last7);

      // Erweiterte Statistiken
      const avgDuration = allSessions.length > 0 ? Math.round((labMins + homeMins) / allSessions.length) : 0;
      const lastSession = allSessions.length > 0 ? new Date(allSessions[0].check_in_time) : null;
      
      // Fokus Instrument
      const topInst = Object.entries(radarBase).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Keines';

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

  const handleApprove = async (skill: any) => {
    try {
      // 1. Freischalten
      await supabase.from('user_song_skills').update({
        is_stage_ready: true,
        progress_percent: 100,
        is_pending_approval: false,
        highlighted_at: new Date().toISOString()
      }).eq('id', skill.id);

      // 2. Band-Matching prüfen
      await checkAndFormBand(skill.song_id);
      
      fetchMonitoringData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (skill: any) => {
    try {
      // 1. Niederlage loggen
      await supabase.from('rejection_history').insert({
        user_id: skill.user_id,
        song_id: skill.song_id,
        instrument: skill.instrument,
        teacher_id: userId
      });

      // 2. Fortschritt zurücksetzen
      await supabase.from('user_song_skills').update({
        is_pending_approval: false,
        progress_percent: 0
      }).eq('id', skill.id);
      
      fetchMonitoringData();
    } catch (err) {
      console.error(err);
    }
  };

  const checkAndFormBand = async (songId: string) => {
    if (!teacher?.school_id) return;
    const { data: song } = await supabase.from('songs').select('instrumentation').eq('id', songId).single();
    if (!song?.instrumentation) return;
    
    const { data: readySkills } = await supabase.from('user_song_skills').select('id, user_id, instrument').eq('song_id', songId).eq('is_stage_ready', true);
    const { data: existingBands } = await supabase.from('bands').select('id, band_members(user_id)').eq('song_id', songId);
    
    const assignedUserIds = new Set();
    existingBands?.forEach(b => b.band_members?.forEach((bm: any) => assignedUserIds.add(bm.user_id)));
    
    const available = readySkills?.filter(s => !assignedUserIds.has(s.user_id)) || [];
    const counts: any = { Guitar: [], Bass: [], Drums: [], Keys: [], Vocals: [] };
    available.forEach(s => {
       if (counts[s.instrument]) counts[s.instrument].push(s);
    });
    
    const req = song.instrumentation;
    let canForm = true;
    let selectedMembers: any[] = [];
    
    for (const inst in req) {
       const needed = req[inst];
       if (needed > 0) {
          if (counts[inst].length < needed) {
             canForm = false;
             break;
          } else {
             selectedMembers.push(...counts[inst].slice(0, needed));
          }
       }
    }
    
    if (canForm) {
       const { data: newBand } = await supabase.from('bands').insert({ song_id: songId, school_id: teacher.school_id }).select().single();
       if (newBand) {
          const membersToInsert = selectedMembers.map(m => ({
             band_id: newBand.id,
             user_id: m.user_id,
             instrument: m.instrument,
             confetti_seen: false
          }));
          await supabase.from('band_members').insert(membersToInsert);
       }
    }
  };

  if (!teacher) return <div className="app-container flex-center">Lade Dashboard...</div>;
  const brandColor = 'var(--primary-color)';

  const getDurationText = (checkInTime: string) => {
    const checkIn = new Date(checkInTime);
    const now = new Date();
    const diffMs = now.getTime() - checkIn.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `${diffMins} Min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      setShowCamera(true);
      const video = document.getElementById('teacher-camera-video') as HTMLVideoElement;
      if (video) video.srcObject = stream;
    } catch (err) {
      alert('Kamera konnte nicht gestartet werden.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = document.getElementById('teacher-camera-video') as HTMLVideoElement;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const photoUrl = canvas.toDataURL('image/jpeg');
      updateTeacherPhoto(photoUrl);
      stopCamera();
    }
  };

  const updateTeacherPhoto = async (url: string) => {
    const { error } = await supabase.from('users').update({ photo_url: url }).eq('id', userId);
    if (error) alert(error.message);
    else {
      setTeacher({ ...teacher, photo_url: url });
      setShowEditProfile(false);
    }
  };

  const content = (
    <main className="main-content" style={{ marginTop: hideHeader ? '0' : '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="flex-between">
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Monitor size={20} color={brandColor} /> Live-Räume
          </h2>
        </div>

        {/* Heutige Highlights (Bühnenreife Schüler) */}
        {highlights.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.2)', border: '2px solid #fde68a', marginBottom: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#b45309' }}>
              <Star size={20} fill="#f59e0b" /> Heutige Highlights 🎉
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {highlights.map(h => (
                <div key={h.id} style={{ background: 'white', padding: '12px 16px', borderRadius: '16px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    {INSTRUMENT_ICONS[h.instrument] || '🎵'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{h.users?.first_name} {h.users?.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>{h.songs?.title}</div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: '16px', fontSize: '0.8rem', color: '#b45309', opacity: 0.8, textAlign: 'center', fontWeight: 600 }}>
              Idee: Lass diese Schüler ihren Song heute kurz vor der Gruppe vorspielen! 🎸
            </p>
          </div>
        )}

        {/* Heutige Niederlagen (Übe-Fokus) */}
        {rejections.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)', border: '2px solid #fecaca', marginBottom: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#991b1b' }}>
              <AlertCircle size={20} /> Übe-Fokus heute 🎯
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {rejections.map(r => (
                <div key={r.id} style={{ background: 'white', padding: '12px 16px', borderRadius: '16px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    {INSTRUMENT_ICONS[r.instrument] || '🎵'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{r.users?.first_name} {r.users?.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>{r.songs?.title}</div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: '16px', fontSize: '0.8rem', color: '#991b1b', opacity: 0.8, textAlign: 'center', fontWeight: 600 }}>
              Diese Schüler haben heute eine Herausforderung nicht bestanden. Zeit für gezieltes Feedback!
            </p>
          </div>
        )}
        {pendingApprovals.length > 0 && (
          <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 32px rgba(234, 179, 8, 0.15)', border: `2px solid ${brandColor}`, marginBottom: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: brandColor }}>
              <Award size={20} /> Ausstehende Prüfungen ({pendingApprovals.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingApprovals.map(app => {
                const session = activeSessions.find(s => s.user_id === app.user_id);
                const stationLabel = session?.stations?.name || 'N/A';
                
                return (
                  <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb', opacity: session ? 1 : 0.7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ background: 'white', padding: '8px 12px', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center', minWidth: '70px' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Gerät</div>
                        <div style={{ fontWeight: 800, color: session ? brandColor : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{stationLabel}</div>
                      </div>
                      <div>
                        <div 
                          onClick={() => fetchStudentProfile({ id: app.user_id, first_name: app.users.first_name, last_name: app.users.last_name })}
                          style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: brandColor, textDecoration: 'underline' }}
                        >
                          {app.users.first_name} {app.users.last_name}
                          {session && <span style={{ fontSize: '0.7rem', color: '#16a34a', background: '#f0fdf4', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>seit {getDurationText(session.check_in_time)}</span>}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{app.songs.title} ({app.instrument})</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleReject(app)} style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid #fca5a5', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={20} />
                      </button>
                      <button onClick={() => handleApprove(app)} style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Check size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Song-Wünsche (Vorschläge von Schülern) */}
        {songRequests.length > 0 && (
          <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 8px 32px rgba(59, 130, 246, 0.1)', border: '2px solid #3b82f6', marginBottom: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#3b82f6' }}>
              <Music size={20} /> Song-Wünsche ({songRequests.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {songRequests.map(req => (
                <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {req.users?.photo_url ? (
                      <img src={req.users.photo_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f620', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                        {req.users?.first_name?.[0]}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{req.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Vorschlag von {req.users?.first_name} {req.users?.last_name}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleDeleteRequest(req.id)} style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #fca5a5', background: 'white', color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                      Ablehnen
                    </button>
                    <button onClick={() => handleAcceptRequest(req)} style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: 'white', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
                      In Bibliothek übernehmen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Übersicht aller Tische (Auto-Refresh 5s)</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {stations.map(st => {
              const session = activeSessions.find(s => s.station_id === st.id);
              const needsHelp = helpRequests.some(h => h.station_id === st.id);

              return (
                <div 
                  key={st.id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '16px', 
                    background: needsHelp ? '#fef2f2' : (st.color ? `${st.color}15` : 'white'), 
                    borderLeft: `6px solid ${needsHelp ? '#ef4444' : (st.color || (session ? brandColor : '#e5e7eb'))}`,
                    border: needsHelp ? '1px solid #fca5a5' : (st.color ? `1px solid ${st.color}33` : '1px solid rgba(0,0,0,0.05)'),
                    borderLeftWidth: '6px',
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => needsHelp && clearHelpRequest(st.id)}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: needsHelp ? '#991b1b' : '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative', width: '16px', height: '16px' }}>
                      <input 
                        type="color" 
                        value={st.color || '#cbd5e1'} 
                        onChange={(e) => handleUpdateStationColor(st.id, e.target.value)}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
                      />
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: st.color || '#cbd5e1', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 1 }}></div>
                    </div>
                    {st.name}
                  </div>
                  
                  {session ? (
                    <div 
                      onClick={() => fetchStudentProfile({ id: session.user_id, first_name: session.users?.first_name, last_name: session.users?.last_name })}
                      style={{ fontSize: '0.75rem', color: st.color || brandColor, marginTop: '8px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <span style={{ textDecoration: 'underline' }}>👤 {session.users?.first_name} {session.users?.last_name?.charAt(0)}.</span>
                      <span style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>{getDurationText(session.check_in_time)}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                      Leer
                    </div>
                  )}

                  {needsHelp && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', color: '#ef4444', animation: 'pulseGlow 2s infinite' }}>
                      <AlertCircle size={20} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        {homeActiveSessions.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 
              onClick={() => setIsHomeSessionsExpanded(!isHomeSessionsExpanded)}
              style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', cursor: 'pointer', background: 'rgba(59, 130, 246, 0.05)', padding: '8px 12px', borderRadius: '8px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                AKTIVE HOME-SESSIONS ({homeActiveSessions.length})
              </div>
              {isHomeSessionsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </h3>
            
            {isHomeSessionsExpanded && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {homeActiveSessions.map(session => (
                  <div 
                    key={session.id}
                    className="glass-panel"
                    style={{ 
                      padding: '16px', 
                      background: '#eff6ff', 
                      borderLeft: '4px solid #3b82f6',
                      border: '1px solid #bfdbfe',
                      borderLeftWidth: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div 
                      onClick={() => fetchStudentProfile({ id: session.user_id, first_name: session.users?.first_name, last_name: session.users?.last_name })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e40af', textDecoration: 'underline' }}>
                        👤 {session.users?.first_name} {session.users?.last_name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#1e40af', marginTop: '4px', opacity: 0.8 }}>
                        Seit {new Date(session.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

          {/* Daily Login History */}
          <div style={{ marginTop: '40px' }}>
            <h3 
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'rgba(0,0,0,0.02)', padding: '10px 16px', borderRadius: '12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} /> Logins heute ({historySessions.length})
              </div>
              {isHistoryExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </h3>

            {isHistoryExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historySessions.map(s => (
                  <div 
                    key={s.id} 
                    onClick={() => fetchStudentProfile({ id: s.user_id, first_name: s.users?.first_name, last_name: s.users?.last_name })}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', fontSize: '0.875rem', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.check_out_time ? '#e5e7eb' : '#22c55e' }}></div>
                      <span style={{ fontWeight: 600, color: brandColor }}>{s.users?.first_name} {s.users?.last_name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>an {s.stations?.name || 'Mobil'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date(s.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {s.check_out_time && ` - ${new Date(s.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        {!s.check_out_time && <span style={{ color: '#22c55e', marginLeft: '4px', fontWeight: 600 }}>Aktiv</span>}
                      </div>
                      {!s.check_out_time && s.station_id && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleForceLogout(s.id); }}
                          style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Beenden
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {historySessions.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Noch keine Logins heute.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Student Profile Modal */}
        {selectedStudent && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
            <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '440px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  background: brandColor,
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 12px auto', 
                  fontSize: '2.5rem', 
                  fontWeight: 800, 
                  border: '4px solid #f0f9ff',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <img 
                    src={selectedStudent.photo_url || '/avatar_ghost.jpg'} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 2 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span style={{ position: 'relative', zIndex: 1 }}>{selectedStudent.first_name?.[0]}</span>
                </div>
                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{selectedStudent.first_name} {selectedStudent.last_name}</h3>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
                {selectedStudent.age && <span>{selectedStudent.age} Jahre</span>}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
                {(selectedStudent.musical_styles || []).map((s: string) => (
                  <span key={s} style={{ fontSize: '0.6rem', fontWeight: 800, background: '#f3f4f6', padding: '2px 8px', borderRadius: '100px', color: '#64748b', border: '1px solid #e5e7eb' }}>
                    {s}
                  </span>
                ))}
              </div>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <button onClick={() => window.print()} style={{ background: 'white', border: '1px solid #e2e8f0', color: '#1e293b', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ExternalLink size={14} /> Bericht drucken / PDF
                </button>
              </div>
            </div>

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

                  <div style={{ background: 'white', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <LucideBarChart size={14} /> Analyse
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Instrumental-Radar</div>
                        <div style={{ width: '100%', height: '180px' }}>
                          <ResponsiveContainer>
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={studentRadarData}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="instrument" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
                              <Radar
                                name="XP"
                                dataKey="xp"
                                stroke={brandColor}
                                fill={brandColor}
                                fillOpacity={0.5}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Aktivität (7 Tage)</div>
                        <div style={{ width: '100%', height: '180px' }}>
                          <ResponsiveContainer>
                            <RechartsBarChart data={studentActivity}>
                              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
                              <Tooltip 
                                cursor={{ fill: 'rgba(234, 179, 8, 0.05)' }} 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }}
                              />
                              <Bar dataKey="mins" radius={[4, 4, 0, 0]}>
                                {studentActivity.map((_entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === studentActivity.length - 1 ? brandColor : '#e2e8f0'} />
                                ))}
                              </Bar>
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        </div>
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
                        {studentRejections.map(r => (
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
    </main>
  );

  if (hideHeader) {
    return content;
  }

  return (
    <div className="app-container" style={{ background: '#f9fafb' }}>
      <header className="header" style={{ background: 'white', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="school-brand" style={{ gap: '16px' }}>
          <div 
            onClick={() => setShowEditProfile(true)}
            style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%', 
              border: `2px solid ${brandColor}`,
              cursor: 'pointer',
              position: 'relative',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <img 
              src={teacher.photo_url || '/avatar_ghost.jpg'} 
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 2 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              alt=""
            />
            <span style={{ fontSize: '1rem', fontWeight: 800, color: brandColor, zIndex: 1 }}>{teacher.first_name?.[0]}</span>
            <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'white', borderRadius: '50%', padding: '2px', border: '1px solid #e5e7eb', zIndex: 3 }}>
              <Pencil size={10} color={brandColor} />
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{teacher.first_name} {teacher.last_name}</div>
            <div style={{ fontSize: '0.75rem', color: brandColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {teacher.role === 'admin' ? 'Academy Director' : 'Groovelab Coach'}
            </div>
          </div>
          {locationMode === 'lab' ? (
            <div style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #fde68a' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></div>
              LABOR
            </div>
          ) : (
            <div style={{ background: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #bfdbfe' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></div>
              HOME
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={() => setSelectedQRUser(teacher)} 
            style={{ 
              background: 'white', 
              border: '1px solid rgba(0,0,0,0.1)', 
              padding: '8px 16px', 
              borderRadius: '12px', 
              cursor: 'pointer', 
              color: brandColor, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontWeight: 700,
              fontSize: '0.875rem'
            }}
          >
            <QrCode size={18} /> Ausweis
          </button>
          <button onClick={onLogout} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <LogOut size={20} />
          </button>
        </div>
      </header>
      {content}
      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '440px', width: '100%', position: 'relative' }}>
            <button onClick={() => setShowEditProfile(false)} style={{ position: 'absolute', top: 20, right: 20, background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}><X size={16} /></button>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px', textAlign: 'center' }}>Profil anpassen</h3>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>Wähle einen Multiinstrumental-Avatar oder nimm ein eigenes Foto auf.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {TEACHER_AVATARS.map(av => (
                <button 
                  key={av.id}
                  onClick={() => updateTeacherPhoto(av.url)}
                  style={{ background: 'none', border: teacher.photo_url === av.url ? `3px solid ${brandColor}` : '3px solid transparent', borderRadius: '20px', padding: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <img src={av.url} style={{ width: '100%', borderRadius: '16px' }} alt={av.label} />
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '4px', color: teacher.photo_url === av.url ? brandColor : '#64748b' }}>{av.label}</div>
                </button>
              ))}
            </div>

            <button 
              onClick={startCamera}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', fontWeight: 700, cursor: 'pointer', marginBottom: '12px' }}
            >
              <Camera size={20} /> Eigenes Foto aufnehmen
            </button>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <video 
            id="teacher-camera-video"
            autoPlay 
            playsInline 
            ref={v => { if (v) v.srcObject = cameraStream; }} 
            style={{ width: '100%', maxHeight: '70vh', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', bottom: '40px', display: 'flex', gap: '20px' }}>
            <button onClick={stopCamera} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}><X size={30} /></button>
            <button onClick={capturePhoto} style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid black' }}></div>
            </button>
          </div>
        </div>
      )}
      {/* QR Code Modal */}
      {selectedQRUser && <QRCodeModal user={selectedQRUser} onClose={() => setSelectedQRUser(null)} />}
      {/* Add Song from Request Modal */}
      {showAddRequestModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', background: 'white', padding: '32px', position: 'relative' }}>
            <button onClick={() => setShowAddRequestModal(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={24} />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '8px' }}>Song in Bibliothek übernehmen</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>Vorschlag von {showAddRequestModal.users?.first_name}</p>

            <form onSubmit={handleAddSongFromRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Interpret</label>
                <input name="artist" placeholder="z.B. Nirvana" required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Songtitel</label>
                <input name="title" defaultValue={showAddRequestModal.title} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Level</label>
                <select name="level" required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <option value="1">Level 1 (Anfänger)</option>
                  <option value="2">Level 2 (Fortgeschritten)</option>
                  <option value="3">Level 3 (Profi)</option>
                </select>
              </div>
              <button type="submit" style={{ background: brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', marginTop: '12px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                Song jetzt veröffentlichen 🚀
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
