import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Music, Shield, Clock, CheckCircle, AlertTriangle, Flame, Zap, Car, Calendar, MapPin, User, Check, Sparkles, Play, Pause, BookOpen } from 'lucide-react';

// ─── Helper: Device Key Storage ──────────────────────────────────────────────
const DEVICE_KEY_PREFIX = 'gl_device_key_';

const getOrCreateDeviceKey = (): string => {
  let key = localStorage.getItem('gl_global_device_key');
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem('gl_global_device_key', key);
  }
  return key;
};

const isPairedForToken = (token: string): boolean => {
  return localStorage.getItem(`${DEVICE_KEY_PREFIX}${token}`) === 'paired';
};

const markPairedForToken = (token: string): void => {
  localStorage.setItem(`${DEVICE_KEY_PREFIX}${token}`, 'paired');
};

// ─── Main Component ───────────────────────────────────────────────────────────
interface QRLandingPageProps {
  token: string;
}

type PageState = 'loading' | 'pin_required' | 'profile' | 'error';

interface ProfileData {
  id: string;
  first_name: string;
  last_name: string;
  instrument: string | null;
  photo_url: string | null;
  role: string;
  school_name: string;
  is_campus_active: boolean;
  is_groovelab_active: boolean;
  app_usage_mode: string;
}

export function QRLandingPage({ token }: QRLandingPageProps) {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // PIN-Eingabe
  const [pinInput, setPinInput] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAttempts, setPinAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;

  // Student Dashboard & Gamification States
  const [schedules, setSchedules] = useState<any[]>([]);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [practiceLoggedToday, setPracticeLoggedToday] = useState(false);
  const [activeDriver, setActiveDriver] = useState<'Du' | 'Mama' | 'Papa' | 'Oma'>('Du');

  // Chauffeur-info Klick-Wechsel
  const handleDriverCycle = () => {
    setActiveDriver(prev => {
      if (prev === 'Du') return 'Mama';
      if (prev === 'Mama') return 'Papa';
      if (prev === 'Papa') return 'Oma';
      return 'Du';
    });
  };

  // Multi-Mode specific states
  const [progressItems, setProgressItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'action' | 'homework'>('action');
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Focus Timer interval effect
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // ── Init: Device prüfen oder direkt Profil laden ──────────────────────────
  useEffect(() => {
    const init = async () => {
      if (!token) {
        setErrorMsg('Ungültiger QR-Code – kein Token gefunden.');
        setPageState('error');
        return;
      }

      try {
        // Token temporär setzen, damit der supabase custom-fetch-wrapper ihn als Header mitschickt
        sessionStorage.setItem('groovelab_qr_token', token);

        // Vorab Namen des Schülers holen
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, first_name, last_name, school_id, is_campus_active, is_groovelab_active, app_usage_mode')
          .eq('qr_token', token)
          .single();

        if (userError || !userData) {
          sessionStorage.removeItem('groovelab_qr_token');
          setErrorMsg('Dieser QR-Code ist ungültig oder gehört keinem Nutzer.');
          setPageState('error');
          return;
        }

        let schoolName = 'Musikschule';
        if (userData.school_id) {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('name')
            .eq('id', userData.school_id)
            .single();
          if (schoolData) {
            schoolName = schoolData.name;
          }
        }

        setProfile({
          id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          instrument: null,
          photo_url: null,
          role: 'student',
          school_name: schoolName,
          is_campus_active: userData.is_campus_active ?? true,
          is_groovelab_active: userData.is_groovelab_active ?? true,
          app_usage_mode: userData.app_usage_mode ?? 'student_only'
        });

        // Prüfen ob Gerät bereits bekannt ist
        const alreadyPaired = isPairedForToken(token);

        if (alreadyPaired) {
          sessionStorage.setItem('groovelab_user_id', userData.id);
          sessionStorage.setItem('groovelab_qr_token', token);
          setPageState('profile');
        } else {
          // Neues Gerät → Device-Pairing prüfen via RPC
          const deviceKey = getOrCreateDeviceKey();
          const { data, error } = await supabase.rpc('check_qr_device', {
            p_qr_token: token,
            p_device_key: deviceKey,
          });

          if (error) throw error;

          if (data?.paired === true) {
            markPairedForToken(token);
            sessionStorage.setItem('groovelab_user_id', userData.id);
            sessionStorage.setItem('groovelab_qr_token', token);
            setPageState('profile');
          } else {
            sessionStorage.removeItem('groovelab_qr_token');
            setPageState('pin_required');
          }
        }
      } catch (err: any) {
        sessionStorage.removeItem('groovelab_qr_token');
        sessionStorage.removeItem('groovelab_user_id');
        console.error('[QRLanding] check_qr_device error:', err);
        setErrorMsg('Verbindungsfehler. Bitte versuche es erneut.');
        setPageState('error');
      }
    };

    init();
  }, [token]);

  // Cleanup tokens from sessionStorage when component unmounts
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('groovelab_user_id');
      sessionStorage.removeItem('groovelab_qr_token');
    };
  }, []);

  // ── Dashboard-Daten laden ──────────────────────────────────────────────────
  useEffect(() => {
    if (pageState !== 'profile' || !profile) return;

    const fetchDashboardData = async () => {
      setLoadingDashboard(true);
      try {
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone

        // 1. Wochenpläne holen
        const { data: schData } = await supabase
          .from('schedules')
          .select(`
            *,
            teacher:teacher_id(first_name, last_name),
            room:room_id(name)
          `)
          .eq('student_id', profile.id);

        // 2. Heutige Termine/Overrides holen
        const { data: occData } = await supabase
          .from('schedule_occurrences')
          .select(`
            *,
            teacher:teacher_id(first_name, last_name)
          `)
          .eq('student_id', profile.id)
          .eq('date', todayStr);

        // 3. Statistiken holen
        const { data: statsData } = await supabase
          .from('student_stats')
          .select('*')
          .eq('student_id', profile.id)
          .maybeSingle();

        // 4. Hausaufgaben (progress_matrix) holen
        const { data: matrixItems } = await supabase
          .from('progress_matrix')
          .select('*')
          .eq('student_id', profile.id)
          .order('updated_at', { ascending: false });

        setSchedules(schData || []);
        setOccurrences(occData || []);
        setStats(statsData || null);
        setProgressItems(matrixItems || []);

        if (statsData && statsData.last_practice_date === todayStr) {
          setPracticeLoggedToday(true);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoadingDashboard(false);
      }
    };

    fetchDashboardData();
  }, [pageState, profile]);

  // Synthetischer Audio-Erfolgston (HTML5 AudioContext)
  const playSuccessChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.15);
        
        gain.gain.setValueAtTime(0, now + index * 0.15);
        gain.gain.linearRampToValueAtTime(0.15, now + index * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.15 + 1.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + index * 0.15);
        osc.stop(now + index * 0.15 + 1.5);
      });
    } catch (e) {
      console.warn("AudioContext success chime failed:", e);
    }
  };

  // Blitz-Übung loggen
  const handleQuickLogPractice = async (minutes: number) => {
    if (practiceLoggedToday || !profile || loadingDashboard) return;
    setLoadingDashboard(true);

    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');

      // Aktuelle Stats abrufen
      const { data: currentStats } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', profile.id)
        .maybeSingle();

      const currentStreak = currentStats?.streak_flame || 0;
      let newStreak = 1;

      if (currentStats) {
        if (currentStats.last_practice_date === yesterdayStr) {
          newStreak = currentStreak + 1;
        } else if (currentStats.last_practice_date === todayStr) {
          newStreak = currentStreak; // bereits heute geübt
        } else {
          newStreak = 1;
        }
      }

      const totalMins = (currentStats?.total_focus_minutes || 0) + minutes;
      const monthlyMins = (currentStats?.monthly_focus_minutes || 0) + minutes;
      const newXp = (currentStats?.current_xp || 0) + (minutes * 10);

      // 1. Fokus-Protokoll schreiben
      await supabase.from('fokus_logs').insert({
        user_id: profile.id,
        duration_minutes: minutes,
        duration_seconds: minutes * 60,
        is_extra: false,
        flame_level: newStreak >= 9 ? 'Helden-Feuer' : (newStreak >= 4 ? 'Mittlere Flamme' : 'Kleine Flamme'),
        created_at: new Date().toISOString()
      });

      // 2. Statistiken aktualisieren (student_stats)
      await supabase.from('student_stats').upsert({
        student_id: profile.id,
        total_focus_minutes: totalMins,
        monthly_focus_minutes: monthlyMins,
        streak_flame: newStreak,
        last_practice_date: todayStr,
        current_xp: newXp,
        updated_at: new Date().toISOString()
      });

      // 3. Avatar-Tabelle updaten
      const { data: avatarRecord } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (avatarRecord) {
        await supabase.from('avatars').update({
          xp: newXp,
          streak_flame: newStreak,
          last_focus_date: todayStr
        }).eq('id', avatarRecord.id);
      }

      playSuccessChime();

      setStats({
        total_focus_minutes: totalMins,
        monthly_focus_minutes: monthlyMins,
        streak_flame: newStreak,
        last_practice_date: todayStr,
        current_xp: newXp
      });
      setPracticeLoggedToday(true);

    } catch (err) {
      console.error('Error logging practice:', err);
      alert('Fehler beim Speichern deiner Übungszeit.');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleFinishFocusSession = async () => {
    if (elapsedSeconds < 5) {
      alert("Übe mindestens ein paar Sekunden, um deine Session zu speichern!");
      return;
    }
    const loggedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    await handleQuickLogPractice(loggedMinutes);
    setElapsedSeconds(0);
    setTimerRunning(false);
  };

  // ── PIN-Eingabe: Ziffern-Eingabe-Handler ─────────────────────────────────
  const handlePinDigit = (digit: string) => {
    if (pinInput.length < 2) {
      setPinInput(prev => prev + digit);
    }
  };

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const handlePinSubmit = async () => {
    if (!pinInput || pinLoading) return;
    if (pinAttempts >= MAX_ATTEMPTS) {
      setPinError(`Zu viele Fehlversuche. Bitte wende dich an deine Schule.`);
      return;
    }

    setPinLoading(true);
    setPinError(null);

    try {
      const deviceKey = getOrCreateDeviceKey();
      const { data, error } = await supabase.rpc('verify_qr_device', {
        p_qr_token: token,
        p_pin: pinInput,
        p_device_key: deviceKey,
      });

      if (error) throw error;

      if (data?.success === true) {
        markPairedForToken(token);
        if (profile) {
          sessionStorage.setItem('groovelab_user_id', profile.id);
        }
        sessionStorage.setItem('groovelab_qr_token', token);
        setPageState('profile');
      } else if (data?.error === 'no_birth_date') {
        setPinError('Kein Geburtstag hinterlegt. Bitte wende dich an deine Schule.');
        setPinInput('');
      } else if (data?.error === 'user_not_found') {
        setPinError('Dieser QR-Code ist ungültig.');
        setPinInput('');
      } else {
        const remaining = MAX_ATTEMPTS - (pinAttempts + 1);
        setPinAttempts(prev => prev + 1);
        if (remaining <= 0) {
          setPinError('Zu viele Fehlversuche. Bitte wende dich an deine Schule.');
        } else {
          setPinError(`Falsche PIN. Noch ${remaining} Versuch${remaining === 1 ? '' : 'e'}.`);
        }
        setPinInput('');
      }
    } catch (err: any) {
      console.error('[QRLanding] verify_qr_device error:', err);
      setPinError('Verbindungsfehler. Bitte versuche es erneut.');
      setPinInput('');
    } finally {
      setPinLoading(false);
    }
  };

  // ── Helper: Homework parsing & rendering ──────────────────────────────────
  const getHomeworkNotes = (): string[] => {
    for (const item of progressItems) {
      if (item.homework_notes && item.homework_notes.trim()) {
        try {
          const raw = item.homework_notes;
          if (raw.startsWith('[') && raw.endsWith(']')) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          } else {
            const lines = raw
              .split('\n')
              .filter((line: string) => !line.trim().startsWith('• 📖') && !line.trim().startsWith('• 🎵') && !line.trim().startsWith('• 🗑️'))
              .map((l: string) => l.trim())
              .filter(Boolean);
            if (lines.length > 0) return lines;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  };

  const formatPageNumbers = (pages: number[]): string => {
    if (pages.length === 0) return '';
    const sorted = [...pages].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = start;
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        if (start === end) ranges.push(`${start}`);
        else ranges.push(`${start}–${end}`);
        start = sorted[i];
        end = start;
      }
    }
    if (start === end) ranges.push(`${start}`);
    else ranges.push(`${start}–${end}`);
    
    if (ranges.length === 1) return `S. ${ranges[0]}`;
    const last = ranges.pop();
    return `S. ${ranges.join(', ')} & ${last}`;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const renderHomeworkWidget = () => {
    const notesList = getHomeworkNotes();
    const activeHWs = progressItems.filter(item => item.is_current_homework && !item.topic_name.startsWith('Hausaufgabe KW '));
    
    const groupedLehrwerke: Record<string, number[]> = {};
    activeHWs.forEach(item => {
      if (item.topic_name.includes(' - Seite ')) {
        const parts = item.topic_name.split(' - Seite ');
        const bookTitle = parts[0].trim();
        const pageNum = parseInt(parts[1], 10);
        if (!groupedLehrwerke[bookTitle]) {
          groupedLehrwerke[bookTitle] = [];
        }
        if (!isNaN(pageNum) && !groupedLehrwerke[bookTitle].includes(pageNum)) {
          groupedLehrwerke[bookTitle].push(pageNum);
        }
      }
    });

    const activeBooks = Object.entries(groupedLehrwerke);

    if (activeBooks.length === 0 && notesList.length === 0) {
      return (
        <div style={{
          background: '#f8fafc',
          border: '1.5px dashed #cbd5e1',
          borderRadius: '24px',
          padding: '24px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 650 }}>
            Keine aktuellen Hausaufgaben erfasst ✨
          </p>
        </div>
      );
    }

    return (
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '24px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#4f46e5', background: '#e0e7ff', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
            Hausaufgaben
          </span>
        </div>

        {activeBooks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeBooks.map(([bookTitle, pages]) => (
              <div key={bookTitle} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                  📖 {bookTitle}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6366f1', marginLeft: '22px' }}>
                  {formatPageNumbers(pages)}
                </span>
              </div>
            ))}
          </div>
        )}

        {notesList.length > 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderTop: activeBooks.length > 0 ? '1px solid #f1f5f9' : 'none',
            paddingTop: activeBooks.length > 0 ? '12px' : 0
          }}>
            {notesList.map((note, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: '#fbbf24', fontSize: '0.9rem', lineHeight: '1.2rem' }}>📌</span>
                <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 650, lineHeight: '1.3rem' }}>
                  {note}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderLessonInfoCard = (lesson: any, isToday: boolean) => {
    if (isToday && lesson) {
      return (
        <div style={{
          background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '20px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#2563eb', background: '#dbeafe', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
              Heute Unterricht
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={16} color="#64748b" />
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                {lesson.start_time?.substring(0, 5)} Uhr ({lesson.duration || 45} Min)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={16} color="#64748b" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                Bei {lesson.teacher ? `${lesson.teacher.first_name} ${lesson.teacher.last_name}` : 'Lehrkraft'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={16} color="#64748b" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                {lesson.room_name}
              </span>
            </div>
          </div>

          {/* Chauffeur info toggle */}
          <button
            type="button"
            onClick={handleDriverCycle}
            style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1.5px solid #bfdbfe',
              borderRadius: '16px',
              padding: '12px 14px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              transition: 'transform 0.15s, border-color 0.2s',
              fontFamily: 'inherit',
              outline: 'none',
              marginTop: '4px'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = ''}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Car size={16} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Wer fährt heute?
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e3a8a', marginTop: '1px' }}>
                {activeDriver === 'Du' ? 'Du fährst heute! 🚗' : `${activeDriver} fährt heute! 🚗`}
              </div>
            </div>
          </button>
        </div>
      );
    }

    // Standard Unterrichtstermin
    const daysGerman = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const nextSchedule = schedules[0];
    if (nextSchedule) {
      return (
        <div style={{
          background: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '20px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#475569', background: '#e2e8f0', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
              Dein Unterrichtstermin
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={16} color="#64748b" />
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                {daysGerman[nextSchedule.day_of_week]}s um {nextSchedule.time_slot?.substring(0, 5)} Uhr
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={16} color="#64748b" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                Bei {nextSchedule.teacher ? `${nextSchedule.teacher.first_name} ${nextSchedule.teacher.last_name}` : 'Lehrkraft'}
              </span>
            </div>
            {nextSchedule.room?.name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={16} color="#64748b" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                  {nextSchedule.room.name}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderSegmentedControl = () => {
    const isParentMode = profile?.app_usage_mode === 'parent_hybrid';
    return (
      <div style={{
        display: 'flex',
        background: '#e2e8f0',
        borderRadius: '16px',
        padding: '4px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('action')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            borderRadius: '12px',
            background: activeTab === 'action' ? '#ffffff' : 'transparent',
            color: activeTab === 'action' ? '#0f172a' : '#64748b',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'action' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          {isParentMode ? '👪 Schnell-Eingabe' : '📱 Üben'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('homework')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            borderRadius: '12px',
            background: activeTab === 'homework' ? '#ffffff' : 'transparent',
            color: activeTab === 'homework' ? '#0f172a' : '#64748b',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'homework' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          📖 Hausaufgaben
        </button>
      </div>
    );
  };

  const renderPracticeLoggedDone = () => {
    return (
      <div style={{
        background: '#f0fdf4',
        border: '1.5px solid #bbf7d0',
        borderRadius: '24px',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(22, 163, 74, 0.06)'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#dcfce7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Check size={26} color="#16a34a" strokeWidth={3} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#14532d' }}>
            Üben erledigt! 🎉
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#166534', fontWeight: 650, lineHeight: 1.4 }}>
            Deine Übungszeit wurde heute erfolgreich eingetragen und dein Streak ist gesichert. Weiter so!
          </p>
        </div>
      </div>
    );
  };

  // ── Render: Loading ───────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div style={styles.fullScreen}>
        <div style={styles.loadingDot} />
        <p style={{ color: '#94a3b8', fontWeight: 600, marginTop: '16px', fontSize: '0.9rem' }}>
          Lade...
        </p>
      </div>
    );
  }

  // ── Render: Error ─────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div style={styles.fullScreen}>
        <div style={{ ...styles.card, maxWidth: '340px', textAlign: 'center', gap: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <AlertTriangle size={32} color="#ef4444" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Ungültiger Code</h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>{errorMsg}</p>
          </div>
          <div style={styles.brandFooter}>
            <Music size={14} color="#eab308" />
            <span>Campus GrooveLab</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: PIN Required ──────────────────────────────────────────────────
  if (pageState === 'pin_required') {
    const blocked = pinAttempts >= MAX_ATTEMPTS;

    return (
      <div style={styles.fullScreen}>
        <div style={{ ...styles.card, maxWidth: '360px', gap: '28px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: '#fef9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Shield size={28} color="#eab308" />
            </div>
            {profile && (
              <h2 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', fontWeight: 800, color: '#137333' }}>
                Hallo {profile.first_name} {profile.last_name}!
              </h2>
            )}
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Gerät bestätigen
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
              Erstes Mal auf diesem Gerät.<br />
              Gib den <strong>Tag deines Geburtstags</strong> ein.
            </p>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
              Beispiel: Geburtstag am 15. März → <strong>15</strong>
            </p>
          </div>

          {/* PIN Display */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {[0, 1].map(i => (
              <div key={i} style={{
                width: '56px',
                height: '64px',
                borderRadius: '16px',
                background: '#f8fafc',
                border: `2px solid ${pinInput.length > i ? '#eab308' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                fontWeight: 900,
                color: '#0f172a',
                transition: 'border-color 0.2s',
                boxShadow: pinInput.length > i ? '0 0 0 4px rgba(234,179,8,0.12)' : 'none'
              }}>
                {pinInput[i] ? '●' : ''}
              </div>
            ))}
          </div>

          {/* Error */}
          {pinError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '0.85rem',
              color: '#dc2626',
              fontWeight: 700,
              textAlign: 'center'
            }}>
              {pinError}
            </div>
          )}

          {/* Numpad */}
          {!blocked && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key) => (
                <button
                  key={key}
                  disabled={pinLoading || !key}
                  onClick={() => {
                    if (key === '⌫') handlePinDelete();
                    else if (key) handlePinDigit(key);
                  }}
                  style={{
                    padding: '18px',
                    borderRadius: '16px',
                    border: 'none',
                    background: key === '⌫' ? '#fee2e2' : key === '' ? 'transparent' : '#f1f5f9',
                    color: key === '⌫' ? '#ef4444' : '#0f172a',
                    fontSize: key === '⌫' ? '1.2rem' : '1.4rem',
                    fontWeight: 800,
                    cursor: key ? 'pointer' : 'default',
                    transition: 'background 0.15s, transform 0.1s',
                    visibility: key === '' ? 'hidden' : 'visible',
                    boxShadow: key ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                  }}
                  onMouseDown={e => e.currentTarget.style.transform = key ? 'scale(0.92)' : ''}
                  onMouseUp={e => e.currentTarget.style.transform = ''}
                >
                  {key}
                </button>
              ))}
            </div>
          )}

          {/* Confirm Button */}
          {!blocked && (
            <button
              disabled={pinInput.length === 0 || pinLoading}
              onClick={handlePinSubmit}
              style={{
                width: '100%',
                padding: '18px',
                borderRadius: '16px',
                border: 'none',
                background: pinInput.length > 0 ? '#eab308' : '#e2e8f0',
                color: pinInput.length > 0 ? '#0f172a' : '#94a3b8',
                fontSize: '1rem',
                fontWeight: 900,
                cursor: pinInput.length > 0 ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {pinLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={styles.spinnerInline} /> Prüfe...
                </span>
              ) : (
                <>
                  <CheckCircle size={20} /> Bestätigen
                </>
              )}
            </button>
          )}

          <div style={styles.brandFooter}>
            <Music size={14} color="#eab308" />
            <span>Campus GrooveLab · Dieses Gerät wird einmalig gespeichert</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Profile (10-Sekunden-Interface) ───────────────────────────────
  if (pageState === 'profile' && profile) {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const currentDayOfWeek = new Date().getDay() || 7; // Monday = 1, ..., Sunday = 7

    // Check if there is an occurrence today
    const occurrenceToday = occurrences.find(o => o.date === todayStr);

    // Check if there is a weekly schedule today
    const scheduleToday = schedules.find(s => s.day_of_week === currentDayOfWeek);

    // Determine if there is a lesson today (and it is not canceled)
    let lessonToday: any = null;
    let isTodayLessonScheduled = false;
    let isCanceled = false;

    if (occurrenceToday) {
      lessonToday = occurrenceToday;
      isTodayLessonScheduled = true;
      isCanceled = ['cancelled', 'teacher_sick', 'canceled_by_student', 'canceled_by_teacher_sick'].includes(occurrenceToday.status);
    } else if (scheduleToday) {
      const overridingOcc = occurrences.find(o => o.schedule_id === scheduleToday.id && o.date === todayStr);
      if (overridingOcc) {
        lessonToday = overridingOcc;
        isTodayLessonScheduled = true;
        isCanceled = ['cancelled', 'teacher_sick', 'canceled_by_student', 'canceled_by_teacher_sick'].includes(overridingOcc.status);
      } else {
        lessonToday = {
          ...scheduleToday,
          start_time: scheduleToday.time_slot,
          room_name: scheduleToday.room?.name || 'Groovelab Raum'
        };
        isTodayLessonScheduled = true;
        isCanceled = scheduleToday.status === 'canceled_by_teacher_sick';
      }
    }

    const isLessonDay = isTodayLessonScheduled && !isCanceled;

    return (
      <div style={styles.fullScreen}>
        <div style={{ ...styles.card, maxWidth: '380px', gap: '0', padding: 0, overflow: 'hidden' }}>
          {/* Header Banner */}
          <div style={{
            background: isLessonDay 
              ? 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)' 
              : 'linear-gradient(135deg, #14532d 0%, #064e3b 100%)',
            padding: '24px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div>
              <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '2px' }}>
                KÜHLSCHRANK & AUTO MODUS
              </span>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.025em' }}>
                {profile.first_name} {profile.last_name}
              </h1>
            </div>
          </div>

          {/* Thin separator */}
          <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)' }}></div>

          {/* Main Content Area */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {loadingDashboard ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '12px' }}>
                <div style={styles.loadingDot} />
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 650 }}>Lade Dashboard...</span>
              </div>
            ) : !profile.is_campus_active ? (
              /* ==============================================================
                 WEG 1: Inactive for Campus
                 ============================================================== */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {renderLessonInfoCard(lessonToday, isLessonDay)}
                {renderHomeworkWidget()}
              </div>
            ) : profile.app_usage_mode === 'parent_hybrid' ? (
              /* ==============================================================
                 WEG 3: PARENT_HYBRID (Jüngere Kinder & Eltern)
                 ============================================================== */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {renderLessonInfoCard(lessonToday, isLessonDay)}
                {renderSegmentedControl()}
                {activeTab === 'action' ? (
                  practiceLoggedToday ? (
                    renderPracticeLoggedDone()
                  ) : (
                    <div style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '28px',
                      padding: '24px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '18px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                          Übezeit eintragen
                        </h3>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 650 }}>
                          Wähle aus, wie lange heute geübt wurde:
                        </p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%' }}>
                        {[3, 5, 10].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => handleQuickLogPractice(mins)}
                            style={{
                              padding: '16px 8px',
                              borderRadius: '20px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#ffffff',
                              fontSize: '0.95rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
                              transition: 'transform 0.15s, box-shadow 0.2s',
                              fontFamily: 'inherit',
                              outline: 'none'
                            }}
                            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
                            onMouseUp={e => e.currentTarget.style.transform = ''}
                          >
                            {mins} Min.
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                ) : (
                  renderHomeworkWidget()
                )}
              </div>
            ) : (
              /* ==============================================================
                 WEG 2: STUDENT_ONLY (Selbstnutzer)
                 ============================================================== */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {renderLessonInfoCard(lessonToday, isLessonDay)}
                {renderSegmentedControl()}
                {activeTab === 'action' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Gamification Streak/XP Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Streak flame */}
                      <div style={{
                        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                        border: '1.5px solid #fed7aa',
                        borderRadius: '20px',
                        padding: '14px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 10px rgba(234, 88, 12, 0.03)'
                      }}>
                        <Flame size={24} color="#ea580c" fill="#ea580c" />
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: '#c2410c' }}>
                          {stats?.streak_flame || 0} Tage
                        </span>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase' }}>
                          Übungs-Streak
                        </span>
                      </div>

                      {/* XP points */}
                      <div style={{
                        background: 'linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%)',
                        border: '1.5px solid #fde047',
                        borderRadius: '20px',
                        padding: '14px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 10px rgba(202, 138, 4, 0.03)'
                      }}>
                        <Sparkles size={24} color="#ca8a04" fill="#ca8a04" />
                        <span style={{ fontSize: '1rem', fontWeight: 900, color: '#854d0e' }}>
                          {stats?.current_xp || 0} XP
                        </span>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#713f12', textTransform: 'uppercase' }}>
                          Erfahrungspunkte
                        </span>
                      </div>
                    </div>

                    {/* Focus Timer Session UI */}
                    {practiceLoggedToday ? (
                      renderPracticeLoggedDone()
                    ) : (
                      <div style={{
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '28px',
                        padding: '24px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '20px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.03)'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            FOKUS-TIMER
                          </span>
                          <h3 style={{ margin: '2px 0 0 0', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                            Übesitzung starten
                          </h3>
                        </div>

                        {/* Digital Timer Face in Apple Watch Style */}
                        <div style={{
                          width: '140px',
                          height: '140px',
                          borderRadius: '50%',
                          background: '#0f172a',
                          border: '4px solid #1e293b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.4), 0 10px 20px rgba(15, 23, 42, 0.15)',
                          position: 'relative'
                        }}>
                          <span style={{
                            fontFamily: 'monospace, monospace',
                            fontSize: '2rem',
                            fontWeight: 900,
                            color: '#ffffff',
                            letterSpacing: '0.02em'
                          }}>
                            {formatTime(elapsedSeconds)}
                          </span>
                          
                          {/* Animated spinning loader when running */}
                          {timerRunning && (
                            <div style={{
                              position: 'absolute',
                              inset: '6px',
                              borderRadius: '50%',
                              border: '2px solid transparent',
                              borderTopColor: '#3b82f6',
                              animation: 'spin 2s linear infinite'
                            }} />
                          )}
                        </div>

                        {/* Controls */}
                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                          {!timerRunning && elapsedSeconds === 0 ? (
                            <button
                              type="button"
                              onClick={() => setTimerRunning(true)}
                              style={{
                                flex: 1,
                                padding: '16px',
                                borderRadius: '18px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                color: '#ffffff',
                                fontSize: '0.95rem',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2)'
                              }}
                            >
                              <Play size={16} fill="#ffffff" /> Starten
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setTimerRunning(!timerRunning)}
                                style={{
                                  flex: 1,
                                  padding: '16px',
                                  borderRadius: '18px',
                                  border: '1.5px solid #cbd5e1',
                                  background: '#ffffff',
                                  color: '#334155',
                                  fontSize: '0.95rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px'
                                }}
                              >
                                {timerRunning ? <Pause size={16} fill="#334155" /> : <Play size={16} fill="#334155" />}
                                {timerRunning ? 'Pause' : 'Weiter'}
                              </button>
                              <button
                                type="button"
                                onClick={handleFinishFocusSession}
                                style={{
                                  flex: 1,
                                  padding: '16px',
                                  borderRadius: '18px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: '#ffffff',
                                  fontSize: '0.95rem',
                                  fontWeight: 900,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
                                }}
                              >
                                <Check size={16} strokeWidth={3} /> Beenden
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  renderHomeworkWidget()
                )}
              </div>
            )}

            {/* Secure Session Info Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.65rem',
              color: '#94a3b8',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: '4px'
            }}>
              <Shield size={12} color="#94a3b8" />
              <span>Sichere passwortlose Verbindung</span>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  fullScreen: {
    position: 'fixed' as const,
    inset: 0,
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
    padding: '20px',
    overflowY: 'auto' as const,
  },
  card: {
    background: 'white',
    borderRadius: '32px',
    width: '100%',
    boxShadow: '0 25px 60px rgba(15,23,42,0.12)',
    border: '1px solid #f1f5f9',
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  brandFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '0.7rem',
    color: '#94a3b8',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginTop: '4px',
  },
  loadingDot: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid #e2e8f0',
    borderTopColor: '#eab308',
    animation: 'spin 0.8s linear infinite',
  },
  spinnerInline: {
    display: 'inline-block',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: '2px solid rgba(0,0,0,0.15)',
    borderTopColor: '#0f172a',
    animation: 'spin 0.8s linear infinite',
  },
  chip: (bg: string, color: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    background: bg,
    color: color,
    fontSize: '0.72rem',
    fontWeight: 800,
    padding: '5px 12px',
    borderRadius: '100px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  }),
};
