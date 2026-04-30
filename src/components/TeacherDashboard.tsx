import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Monitor, Music, AlertCircle, Check, X, Award, Users, Pencil, Camera, QrCode, Star, ChevronDown, ChevronUp, BarChart as LucideBarChart, ExternalLink, Smartphone, Layout, Trophy, Hand, Clock } from 'lucide-react';
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
    
    const { data: stationsData } = await supabase
      .from('stations')
      .select('*, rooms!inner(school_id)')
      .eq('rooms.school_id', sId)
      .order('name');
    if (stationsData) setStations(stationsData);

    const today = new Date();
    today.setHours(0,0,0,0);

    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*, users(first_name, last_name), stations(name)')
      .gte('check_in_time', today.toISOString())
      .order('check_in_time', { ascending: false });
      
    if (sessionsData) {
      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
      const active = sessionsData.filter(s => !s.check_out_time && new Date(s.check_in_time) > eightHoursAgo);
      const labSessions = active.filter(s => s.station_id);
      const activeByStation = labSessions.filter((s, index, self) => 
        index === self.findIndex((t) => t.station_id === s.station_id)
      );
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

    const { data: helpData } = await supabase
      .from('help_requests')
      .select('*')
      .eq('status', 'pending');
    if (helpData) setHelpRequests(helpData);

    const { data: pendingData } = await supabase
      .from('user_song_skills')
      .select('*, users(first_name, last_name, photo_url), songs(title, artist)')
      .eq('is_pending_approval', true);
    if (pendingData) setPendingApprovals(pendingData);

    const { data: requestData } = await supabase
      .from('song_requests')
      .select('*, users(first_name, last_name, photo_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (requestData) setSongRequests(requestData);

    const { data: highlightsData } = await supabase
      .from('user_song_skills')
      .select(`
        id, instrument, user_id,
        users (first_name, last_name),
        songs (title, artist),
        highlighted_at
      `)
      .eq('is_stage_ready', true)
      .eq('progress_percent', 100)
      .gte('highlighted_at', today.toISOString());
    if (highlightsData) setHighlights(highlightsData);

    const { data: rejectionsData } = await supabase
      .from('rejection_history')
      .select(`
        id, instrument, user_id,
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

  const clearHelpRequest = async (stationId: string) => {
    await supabase.from('help_requests').update({ status: 'resolved' }).eq('station_id', stationId).eq('status', 'pending');
    fetchMonitoringData();
  };

  const handleUpdateStationColor = async (stationId: string, newColor: string) => {
    const station = stations.find(s => s.id === stationId);
    if (!station) return;
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
    if (error) alert(error.message);
    else setStations(stations.map(s => idsToUpdate.includes(s.id) ? { ...s, color: newColor } : s));
  };

  const fetchStudentProfile = async (student: any) => {
    setSelectedStudent(student);
    const { data: skills } = await supabase.from('user_song_skills').select('*, songs(*)').eq('user_id', student.id);
    setStudentDetails(skills || []);
    const { data: rejHistory } = await supabase.from('rejection_history').select('*, songs(*)').eq('user_id', student.id).order('rejected_at', { ascending: false });
    setStudentRejections(rejHistory || []);
    const { data: allSessions } = await supabase.from('sessions').select('check_in_time, check_out_time, station_id').eq('user_id', student.id);
    if (allSessions) {
      let labMins = 0; let homeMins = 0;
      allSessions.forEach(s => {
        const start = new Date(s.check_in_time);
        const end = s.check_out_time ? new Date(s.check_out_time) : new Date();
        const duration = Math.floor((end.getTime() - start.getTime()) / 60000);
        if (s.station_id) labMins += duration; else homeMins += duration;
      });
      setStudentLabMins(labMins); setStudentHomeMins(homeMins);
      const radarBase: Record<string, number> = { Guitar: 0, Bass: 0, Drums: 0, Keys: 0, Vocals: 0 };
      skills?.forEach((s: any) => { if (radarBase[s.instrument] !== undefined) radarBase[s.instrument] += (s.is_stage_ready || s.progress_percent === 100 ? 500 : s.progress_percent * 2); });
      setStudentRadarData(Object.entries(radarBase).map(([inst, xp]) => ({ instrument: inst, xp })));
      const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']; const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const mins = allSessions.filter(s => new Date(s.check_in_time).toDateString() === d.toDateString()).reduce((acc, s) => {
          const start = new Date(s.check_in_time); const end = s.check_out_time ? new Date(s.check_out_time) : new Date();
          return acc + Math.floor((end.getTime() - start.getTime()) / 60000);
        }, 0);
        last7.push({ day: days[d.getDay()], mins });
      }
      setStudentActivity(last7);
    }
  };

  const handleApprove = async (skill: any) => {
    await supabase.from('user_song_skills').update({ is_stage_ready: true, progress_percent: 100, is_pending_approval: false, highlighted_at: new Date().toISOString() }).eq('id', skill.id);
    fetchMonitoringData();
  };

  const handleReject = async (skill: any) => {
    await supabase.from('rejection_history').insert({ user_id: skill.user_id, song_id: skill.song_id, instrument: skill.instrument, teacher_id: userId });
    await supabase.from('user_song_skills').update({ is_pending_approval: false, progress_percent: 0 }).eq('id', skill.id);
    fetchMonitoringData();
  };

  const getDurationText = (checkInTime: string) => {
    const diffMins = Math.floor((new Date().getTime() - new Date(checkInTime).getTime()) / 60000);
    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `${diffMins} Min`;
    return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
  };

  const brandColor = 'var(--primary-color)';

  const renderiPadGrid = () => {
    const sections = [
      { title: 'E-PIANO BEREICH', range: [1, 6] },
      { title: 'DRUMS & SPARE', range: [7, 12] },
      { title: 'TISCH LINKS', range: [13, 15] },
      { title: 'TISCH RECHTS', range: [16, 18] }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {sections.map(sec => {
          const secStations = stations.filter(s => {
            const num = parseInt(s.name.replace(/\D/g, ''));
            return num >= sec.range[0] && num <= sec.range[1];
          }).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

          if (secStations.length === 0) return null;

          return (
            <div key={sec.title}>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '4px', height: '16px', background: brandColor, borderRadius: '2px' }}></div>
                {sec.title}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {secStations.map(st => {
                  const session = activeSessions.find(s => s.station_id === st.id);
                  const needsHelp = helpRequests.some(h => h.station_id === st.id);
                  
                  return (
                    <div 
                      key={st.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '16px', 
                        background: needsHelp ? '#fef2f2' : 'white', 
                        border: needsHelp ? '2px solid #ef4444' : '1px solid #e2e8f0',
                        borderRadius: '16px',
                        position: 'relative',
                        transition: 'all 0.3s ease',
                        boxShadow: session ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => needsHelp && clearHelpRequest(st.id)}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', marginBottom: '8px' }}>{st.name}</div>
                      {session ? (
                        <div 
                          onClick={(e) => { e.stopPropagation(); fetchStudentProfile({ id: session.user_id, first_name: session.users?.first_name, last_name: session.users?.last_name, photo_url: session.users?.photo_url }); }}
                          style={{ cursor: 'pointer' }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: brandColor }}>{session.users?.first_name}</div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>{getDurationText(session.check_in_time)}</div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Leer</div>
                      )}
                      {needsHelp && (
                        <div style={{ position: 'absolute', top: '12px', right: '12px', color: '#ef4444', animation: 'pulse 1.5s infinite' }}>
                          <Hand size={18} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const content = (
    <div style={{ display: 'flex', gap: '32px', height: '100%', padding: '0 4px' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px', paddingRight: '12px' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '16px', marginBottom: '24px', display: 'flex', gap: '16px', border: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
           <button style={{ padding: '8px 16px', borderRadius: '10px', background: brandColor, color: 'white', border: 'none', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>Live-Übersicht</button>
           <button style={{ padding: '8px 16px', borderRadius: '10px', background: 'transparent', color: '#64748b', border: 'none', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>Sitzungs-Historie</button>
           <button style={{ padding: '8px 16px', borderRadius: '10px', background: 'transparent', color: '#64748b', border: 'none', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>Song-Anfragen</button>
        </div>
        {renderiPadGrid()}
      </div>

      <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flexShrink: 0 }}>
        <div className="glass-panel" style={{ padding: '20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Hand size={18} /></div>
            <span style={{ fontWeight: 800, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Hilfe-Rufe</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: helpRequests.length > 0 ? '#ef4444' : '#1e293b' }}>{helpRequests.length} Offene Anfragen</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: `${brandColor}15`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Smartphone size={18} /></div>
            <span style={{ fontWeight: 800, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Remote Hub</span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>iPad Fernsteuerung aktiv</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={18} /></div>
            <span style={{ fontWeight: 800, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Song Challenges</span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{pendingApprovals.length} ausstehend</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Layout size={18} /></div>
            <span style={{ fontWeight: 800, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Lab-Auslastung</span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{activeSessions.length} Schüler aktiv</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={18} /></div>
            <span style={{ fontWeight: 800, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Studio Activity</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
             {historySessions.slice(0, 3).map(s => (
               <div key={s.id} style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }}></div>
                 <span style={{ fontWeight: 700 }}>{s.users?.first_name}</span> ist da
               </div>
             ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trophy size={18} /></div>
            <span style={{ fontWeight: 800, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Highlights</span>
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{highlights.length} neue Meisterstücke</div>
        </div>
      </div>
    </div>
  );

  if (hideHeader) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '32px' }}>
           <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', marginBottom: '4px' }}>Live Lab - Zentrale</h2>
           <p style={{ color: '#64748b', fontWeight: 600 }}>Echtzeit-Überwachung & Studio-Steuerung</p>
        </div>
        {content}
        {selectedStudent && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
            <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '440px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: brandColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', fontSize: '2.5rem', fontWeight: 800, border: '4px solid #f0f9ff', position: 'relative', overflow: 'hidden' }}>
                  <img src={selectedStudent.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 2 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span style={{ position: 'relative', zIndex: 1 }}>{selectedStudent.first_name?.[0]}</span>
                </div>
                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{selectedStudent.first_name} {selectedStudent.last_name}</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-around', background: '#f9fafb', padding: '16px', borderRadius: '16px' }}>
                    <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 800, fontSize: '1.25rem', color: brandColor }}>{studentDetails?.length || 0}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SONGS</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 800, fontSize: '1.25rem', color: brandColor }}>{studentLabMins}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LAB MIN</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 800, fontSize: '1.25rem', color: brandColor }}>{studentHomeMins}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>HOME MIN</div></div>
                  </div>
                  <div style={{ maxHeight: '200px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={studentRadarData}>
                        <PolarGrid /><PolarAngleAxis dataKey="instrument" tick={{ fontSize: 10 }} /><Radar name="XP" dataKey="xp" stroke={brandColor} fill={brandColor} fillOpacity={0.6} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} style={{ marginTop: '24px', background: '#f3f4f6', border: 'none', padding: '16px', borderRadius: '12px', width: '100%', fontWeight: 700, cursor: 'pointer' }}>Schließen</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container" style={{ background: '#f9fafb' }}>
      <header className="header" style={{ background: 'white', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="school-brand" style={{ gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Monitor size={24} /></div>
          <div><h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Live Lab Zentrale</h1><p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{teacher.schools?.name || 'Groovelab Studio'}</p></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{teacher.first_name} {teacher.last_name}</div><div style={{ fontSize: '0.75rem', color: brandColor, fontWeight: 700 }}>Dozent</div></div>
          <button onClick={onLogout} className="logout-button" style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}><LogOut size={20} /></button>
        </div>
      </header>
      <main style={{ flex: 1, padding: '32px', overflow: 'hidden' }}>{content}</main>
      {selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '440px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: brandColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', fontSize: '2.5rem', fontWeight: 800, border: '4px solid #f0f9ff', position: 'relative', overflow: 'hidden' }}>
                <img src={selectedStudent.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 2 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span style={{ position: 'relative', zIndex: 1 }}>{selectedStudent.first_name?.[0]}</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{selectedStudent.first_name} {selectedStudent.last_name}</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', background: '#f9fafb', padding: '16px', borderRadius: '16px' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 800, fontSize: '1.25rem', color: brandColor }}>{studentDetails?.length || 0}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SONGS</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 800, fontSize: '1.25rem', color: brandColor }}>{studentLabMins}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LAB MIN</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 800, fontSize: '1.25rem', color: brandColor }}>{studentHomeMins}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>HOME MIN</div></div>
                </div>
            </div>
            <button onClick={() => setSelectedStudent(null)} style={{ marginTop: '24px', background: '#f3f4f6', border: 'none', padding: '16px', borderRadius: '12px', width: '100%', fontWeight: 700, cursor: 'pointer' }}>Schließen</button>
          </div>
        </div>
      )}
    </div>
  );
}
