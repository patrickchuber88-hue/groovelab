import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Award, Lock, Smartphone, HelpCircle, Trophy, Sparkles, Star, 
  ChevronRight, Coffee, Clock, Flame, BookOpen, Share2, Play, 
  Pause, RotateCcw, Volume2, Moon, QrCode, X, EyeOff, Zap, Music, Library
} from 'lucide-react';
import QRCode from 'react-qr-code';

interface Avatar {
  avatar_style: string;
  instrument_type: string;
  evolution_level: number;
  xp: number;
  asset_path: string;
  streak_flame?: number;
}

interface StudentAvatarDashboardProps {
  studentId: string;
  parentActiveTab?: string;
  onTabChange?: (tab: string) => void;
}

const LEVEL_NAMES: Record<string, Record<number, string>> = {
  guitarist: {
    1: 'Garagen-Gitarrist (Lvl 1)',
    2: 'Band-Mitglied (Lvl 2)',
    3: 'Rockstar (Lvl 3)'
  },
  drummer: {
    1: 'Takt-Anfänger (Lvl 1)',
    2: 'Studio-Drummer (Lvl 2)',
    3: 'Rhythmus-Gott (Lvl 3)'
  },
  keyboardist: {
    1: 'Melodien-Sucher (Lvl 1)',
    2: 'Synthie-Pionier (Lvl 2)',
    3: 'Tasten-Virtuose (Lvl 3)'
  },
  vocalist: {
    1: 'Dusch-Sänger (Lvl 1)',
    2: 'Bühnen-Neuling (Lvl 2)',
    3: 'Stimm-König/in (Lvl 3)'
  }
};

const HERO_CLASSES = [
  { id: 'guitarist', name: 'Gitarren-Held', icon: '🎸', desc: 'Melodien und Soli rocken' },
  { id: 'drummer', name: 'Beat-Master', icon: '🥁', desc: 'Den Groove und Takt angeben' },
  { id: 'keyboardist', name: 'Tasten-Magier', icon: '🎹', desc: 'Synthesizer und Klavier beherrschen' },
  { id: 'vocalist', name: 'Vocal-Star', icon: '🎤', desc: 'Die Bühne mit deiner Stimme erobern' }
];

export function StudentAvatarDashboard({ studentId, parentActiveTab, onTabChange }: StudentAvatarDashboardProps) {
  const [isAppUser, setIsAppUser] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selection Screen State
  const [showSelector, setShowSelector] = useState(false);
  const [submittingSelection, setSubmittingSelection] = useState(false);

  // Daily Briefing State
  const [briefingData, setBriefingData] = useState<any>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup'>(() => {
    const initial = parentActiveTab === 'profile' ? 'briefing' : parentActiveTab;
    return (initial as any) || 'briefing';
  });

  useEffect(() => {
    if (parentActiveTab) {
      const mapped = parentActiveTab === 'profile' ? 'briefing' : parentActiveTab;
      if (['briefing', 'hero', 'songs', 'practice_board', 'campus_cup'].includes(mapped)) {
        setActiveTab(mapped as any);
      }
    }
  }, [parentActiveTab]);

  const handleTabChangeLocal = (tab: 'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup') => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Übe-Board / Gyro-Detox Engine state
  const [sessionActive, setSessionActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [isPhoneFlat, setIsPhoneFlat] = useState(false);

  // Campus Cup States
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [monthlyFocusMinutes, setMonthlyFocusMinutes] = useState(0);

  // DIGITAL DETOX TIMER STATE
  const [showDetox, setShowDetox] = useState(false);
  const [detoxMinutes, setDetoxMinutes] = useState(15);
  const [detoxSecondsLeft, setDetoxSecondsLeft] = useState(15 * 60);
  const [isDetoxActive, setIsDetoxActive] = useState(false);
  const [isFaceDown, setIsFaceDown] = useState(false);
  const [detoxCompleted, setDetoxCompleted] = useState(false);
  
  // WRAPPED STORY STATE
  const [showWrapped, setShowWrapped] = useState(false);
  const [wrappedData, setWrappedData] = useState<any>(null);
  const [storySlide, setStorySlide] = useState(0);
  const [wrappedLoading, setWrappedLoading] = useState(false);

  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    fetchStudentAndAvatar();
  }, [studentId]);

  // progress matrix state
  const [progressItems, setProgressItems] = useState<any[]>([]);
  const [isPremiumActive, setIsPremiumActive] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);

  const fetchStudentProgress = async () => {
    setProgressLoading(true);
    try {
      // Try to call backend API
      const resp = await fetch(`/api/student/get-progress?studentId=${studentId}`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('sb-access-token') || ''}`
        }
      });
      if (resp.ok) {
        const data = await resp.json();
        setIsPremiumActive(data.isPremiumActive ?? false);
        setProgressItems(data.progress || []);
        setProgressLoading(false);
        return;
      }

      // Direct Supabase query fallback
      const { data: premiumInfo } = await supabase
        .from('premium_status')
        .select('is_premium_active')
        .eq('student_id', studentId)
        .maybeSingle();

      const premium = premiumInfo?.is_premium_active ?? false;
      setIsPremiumActive(premium);

      const { data: matrixItems } = await supabase
        .from('progress_matrix')
        .select('*')
        .eq('student_id', studentId)
        .order('updated_at', { ascending: false });

      // Apply asymmetric logic locally as fallback
      const sanitized = (matrixItems || []).map((item: any) => {
        if (premium) {
          return item;
        } else {
          return {
            ...item,
            status: undefined,
            teacher_notes: 'Inhalte in der Premium-Version freischalten'
          };
        }
      });

      setProgressItems(sanitized);
    } catch (err) {
      console.error('Error fetching progress matrix:', err);
    } finally {
      setProgressLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const resp = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: studentId })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
      }
      
      // Fallback Mock Upgrade
      alert("Stripe Checkout wird geladen... (Simulation: Upgrade auf Premium erfolgt jetzt)");
      const { error } = await supabase
        .from('premium_status')
        .upsert({ student_id: studentId, is_premium_active: true });
      if (error) throw error;
      
      // Also update users.is_premium_user
      await supabase
        .from('users')
        .update({ is_premium_user: true })
        .eq('id', studentId);
        
      fetchStudentAndAvatar();
      fetchStudentProgress();
    } catch (err) {
      console.error(err);
      alert("Fehler beim Checkout-Prozess.");
    }
  };

  useEffect(() => {
    fetchStudentProgress();
  }, [studentId, activeTab]);

  const fetchRanking = async () => {
    setRankingLoading(true);
    setRankingError(null);
    try {
      const resp = await fetch(`/api/ranking/global?userId=${studentId}`);
      if (resp.ok) {
        const data = await resp.json();
        setRankingData(data.ranking || []);
      } else {
        const errData = await resp.json().catch(() => ({ error: 'Ranking konnte nicht geladen werden.' }));
        setRankingError(errData.error || 'Fehler beim Laden des Rankings.');
      }
    } catch (err: any) {
      // Offline / direct Supabase fallback simulation for Campus Cup:
      try {
        const { data: user } = await supabase
          .from('users')
          .select('school_id, schools(name, allow_global_ranking)')
          .eq('id', studentId)
          .maybeSingle();

        const userSchoolName = (user?.schools as any)?.name || 'Meine Musikschule';
        const allowGlobal = (user?.schools as any)?.allow_global_ranking ?? true;

        if (!allowGlobal) {
          setRankingError('Global ranking access is disabled for your school.');
          setRankingLoading(false);
          return;
        }

        // Generate mock data representing fair Relative-Focus-Index (RFI)
        const mockSchools = [
          { name: 'Popakademie Berlin', rfi: 45.2, isOwnSchool: false },
          { name: 'Rock- & Jazzschule Freiburg', rfi: 38.5, isOwnSchool: false },
          { name: 'Musikschule Hamburg Nord', rfi: 32.1, isOwnSchool: false },
          { name: 'Tonkunst Stuttgart', rfi: 28.4, isOwnSchool: false },
          { name: 'Groove Academy Köln', rfi: 25.9, isOwnSchool: false },
          { name: userSchoolName, rfi: 18.4, isOwnSchool: true },
          { name: 'Klangwelt Dresden', rfi: 14.2, isOwnSchool: false },
          { name: 'School of Rock Leipzig', rfi: 9.8, isOwnSchool: false }
        ];

        mockSchools.sort((a, b) => b.rfi - a.rfi);
        const ranked = mockSchools.map((s, idx) => ({
          rank: idx + 1,
          name: s.name,
          rfi: s.rfi,
          isOwnSchool: s.isOwnSchool
        }));

        setRankingData(ranked);
      } catch (fallbackErr) {
        setRankingError('Fehler beim Laden des Rankings.');
      }
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'campus_cup') {
      fetchRanking();
    }
  }, [activeTab, studentId]);

  // Pre-select homework topic automatically
  useEffect(() => {
    if (progressItems.length > 0 && !selectedTopic) {
      const hw = progressItems.find(i => i.is_current_homework);
      setSelectedTopic(hw ? hw.topic_name : (progressItems[0]?.topic_name || 'Allgemeines Üben'));
    }
  }, [progressItems, selectedTopic]);

  // Gyro Detox Engine Effect
  useEffect(() => {
    if (!sessionActive) {
      setIsPhoneFlat(false);
      return;
    }

    // Timer interval
    const interval = setInterval(() => {
      if (isPhoneFlat) {
        setSecondsElapsed(prev => prev + 1);
      }
    }, 1000);

    // Orientation event handler
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const beta = e.beta || 0;
      const gamma = e.gamma || 0;

      // Phone is flat if beta and gamma are near 0 or 180 (within 15 deg threshold)
      const flat = (Math.abs(beta) < 15 && Math.abs(gamma) < 15) || 
                   (Math.abs(Math.abs(beta) - 180) < 15 && Math.abs(gamma) < 15);

      if (flat) {
        if (!isPhoneFlat) {
          setIsPhoneFlat(true);
        }
      } else {
        if (isPhoneFlat) {
          setIsPhoneFlat(false);
          // High-pitched warning beep
          playBeep(880, 200);
          setTimeout(() => playBeep(880, 200), 250);
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      clearInterval(interval);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [sessionActive, isPhoneFlat]);

  const finishPracticeSession = async () => {
    setSessionActive(false);
    const durationMinutes = Math.max(1, Math.round(secondsElapsed / 60));

    try {
      // 1. Post to API endpoint
      const response = await fetch('/api/student/finish-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('sb-access-token') || ''}`
        },
        body: JSON.stringify({
          studentId,
          topicName: selectedTopic,
          durationMinutes
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Klasse geübt! Du hast +${data.stats.xpAdded} XP erhalten und dein Streak ist bei ${data.stats.streakFlame} Flammen! 🔥`);
        fetchStudentAndAvatar();
        fetchStudentProgress();
        return;
      }

      // 2. Direct Supabase fallback
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Fetch current stats
      const { data: stats } = await supabase
        .from('student_stats')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      let totalFocus = durationMinutes;
      let monthlyFocus = durationMinutes;
      let currentXp = durationMinutes * 10;
      let streakFlame = 1;
      let lastPracticeDate = null;

      if (stats) {
        totalFocus = (stats.total_focus_minutes || 0) + durationMinutes;
        monthlyFocus = (stats.monthly_focus_minutes || 0) + durationMinutes;
        currentXp = (stats.current_xp || 0) + (durationMinutes * 10);
        streakFlame = stats.streak_flame || 0;
        lastPracticeDate = stats.last_practice_date ? String(stats.last_practice_date) : null;
      }

      if (lastPracticeDate === yesterdayStr) {
        streakFlame += 1;
      } else if (lastPracticeDate === todayStr) {
        // Keep same streak
      } else {
        streakFlame = 1;
      }

      // Upsert stats
      await supabase.from('student_stats').upsert({
        student_id: studentId,
        total_focus_minutes: totalFocus,
        monthly_focus_minutes: monthlyFocus,
        streak_flame: streakFlame,
        last_practice_date: todayStr,
        current_xp: currentXp,
        updated_at: new Date().toISOString()
      });

      // Log to focus log
      await supabase.from('fokus_logs').insert({
        user_id: studentId,
        duration_minutes: durationMinutes,
        created_at: new Date().toISOString()
      });

      // Update avatar
      const { data: avatar } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', studentId)
        .maybeSingle();

      if (avatar) {
        await supabase.from('avatars').update({
          xp: currentXp,
          streak_flame: streakFlame,
          last_focus_date: todayStr
        }).eq('id', avatar.id);
      }

      alert(`Klasse geübt! Du hast +${durationMinutes * 10} XP erhalten und dein Streak ist bei ${streakFlame} Flammen! 🔥`);
      fetchStudentAndAvatar();
      fetchStudentProgress();

    } catch (err: any) {
      console.error('Error finishing session:', err);
      alert('Fehler beim Beenden der Session.');
    }
  };

  // Gyroscope API Hook for Digital Detox (beta angle)
  useEffect(() => {
    if (!isDetoxActive || detoxCompleted) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta; // In degree [-180, 180]
      const gamma = event.gamma; // In degree [-90, 90]
      
      if (beta === null) return;
      
      // Placed flat on display (face down): beta is close to 180 or -180, or gamma is tilted.
      // A robust face down detection is Math.abs(beta) > 165 or (Math.abs(beta) < 15 and screen orientation flipped).
      // Let's use Math.abs(beta) > 160 or Math.abs(beta) < -160 or (Math.abs(gamma) > 75 and Math.abs(beta) > 150)
      const faceDown = Math.abs(beta) > 160 || Math.abs(beta) < -160;
      
      if (faceDown && !isFaceDown) {
        setIsFaceDown(true);
        // Play subtle confirmation beep
        playBeep(440, 100);
      } else if (!faceDown && isFaceDown) {
        setIsFaceDown(false);
        // Freeze timer and trigger haptic warning
        triggerWarning();
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isDetoxActive, isFaceDown, detoxCompleted]);

  // Timer Tick Hook
  useEffect(() => {
    if (isDetoxActive && isFaceDown && detoxSecondsLeft > 0 && !detoxCompleted) {
      timerRef.current = setInterval(() => {
        setDetoxSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleDetoxSuccess();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isDetoxActive, isFaceDown, detoxSecondsLeft, detoxCompleted]);

  const triggerWarning = () => {
    // Haptic Vibrate Warning
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
    // High-pitched warning beep
    playBeep(880, 400);
  };

  const playBeep = (freq: number, duration: number) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (duration / 1000));
    } catch (e) {
      console.warn("AudioContext warning beep failed:", e);
    }
  };

  const fetchStudentAndAvatar = async () => {
    try {
      setLoading(true);
      setBriefingLoading(true);
      setError(null);

      // 1. Fetch student user profile with premium state
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, is_app_user, first_name, school_id, is_premium_user')
        .eq('id', studentId)
        .single();

      if (userErr) throw userErr;
      if (!user) return;

      setIsAppUser(user.is_app_user ?? false);
      setIsPremiumUser(user.is_premium_user ?? false);

      // 2. Fetch avatar records
      const { data: avatarRecord, error: avatarErr } = await supabase
        .from('avatars')
        .select('avatar_style, instrument_type, evolution_level, xp, asset_path, streak_flame')
        .eq('user_id', studentId)
        .maybeSingle();

      if (avatarErr) throw avatarErr;

      if (!avatarRecord && user.is_app_user) {
        setShowSelector(true);
      } else {
        setAvatar(avatarRecord);
      }

      // Fetch student stats for Campus Cup
      const { data: statsData } = await supabase
        .from('student_stats')
        .select('monthly_focus_minutes')
        .eq('student_id', studentId)
        .maybeSingle();
      setMonthlyFocusMinutes(statsData?.monthly_focus_minutes || 0);

      // 3. Fetch daily briefing
      try {
        const resp = await fetch(`/api/briefing/student?userId=${studentId}`);
        if (resp.ok) {
          const bd = await resp.json();
          if (bd && bd.success) {
            setBriefingData(bd);
          }
        } else {
          throw new Error('API offline');
        }
      } catch (e) {
        // Fallback local query
        try {
          const schoolId = user.school_id || (user as any).school_id;
          let currentSchoolId = schoolId;

          if (!currentSchoolId) {
            const { data: userWithSchool } = await supabase
              .from('users')
              .select('school_id')
              .eq('id', studentId)
              .single();
            currentSchoolId = userWithSchool?.school_id;
          }

          if (currentSchoolId) {
            const { data: schoolData } = await supabase
              .from('schools')
              .select('allow_messages_global')
              .eq('id', currentSchoolId)
              .single();
            const allowMessages = schoolData?.allow_messages_global ?? true;

            const rawDay = new Date().getDay();
            const todayWeekday = rawDay === 0 ? 7 : rawDay;

            const { data: todaySchedules } = await supabase
              .from('schedules')
              .select(`
                id,
                time_slot,
                status,
                rooms (name),
                teacher:users!schedules_teacher_id_fkey (first_name, last_name)
              `)
              .eq('student_id', studentId)
              .eq('day_of_week', todayWeekday)
              .maybeSingle();

            let todayLesson = null;
            if (todaySchedules) {
              const teacherName = todaySchedules.teacher 
                ? `Herr/Frau ${(todaySchedules.teacher as any).last_name}` 
                : 'Lehrkraft';
              todayLesson = {
                id: todaySchedules.id,
                time: todaySchedules.time_slot,
                room: (todaySchedules.rooms as any)?.name || 'Unterrichtsraum',
                teacher: teacherName,
                status: todaySchedules.status,
                displayString: `Heute ${todaySchedules.time_slot} Uhr, ${(todaySchedules.rooms as any)?.name || 'Raum'} bei ${teacherName}`
              };
            }

            const currentXp = avatarRecord?.xp || 0;
            const currentLevel = avatarRecord?.evolution_level || 1;
            const milestoneTarget = 50;
            const remainingXp = milestoneTarget - (currentXp % milestoneTarget);

            setBriefingData({
              success: true,
              allowMessagesGlobal: allowMessages,
              todayLesson,
              gamification: {
                streakFlame: avatarRecord?.streak_flame || (user.is_premium_user && avatarRecord?.avatar_style === 'Premium_Hero' ? 6 : 0),
                evolutionLevel: currentLevel,
                currentXp,
                remainingXp,
                xpTargetMessage: `Noch ${remainingXp} XP bis zum heutigen Meilenstein!`,
                avatarStyle: avatarRecord?.avatar_style || 'Standard_Silhouette',
                instrumentType: avatarRecord?.instrument_type || 'Unknown'
              }
            });
          }
        } catch (err) {
          console.error('Error in student briefing fallback:', err);
        }
      } finally {
        setBriefingLoading(false);
      }

    } catch (err: any) {
      console.error('Error loading student avatar:', err);
      setError('Fehler beim Laden des Profils.');
      setBriefingLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDetox = () => {
    setDetoxSecondsLeft(detoxMinutes * 60);
    setIsDetoxActive(true);
    setIsFaceDown(false);
    setDetoxCompleted(false);
    setShowDetox(true);
  };

  const handleDetoxSuccess = async () => {
    setDetoxCompleted(true);
    setIsDetoxActive(false);
    playBeep(523.25, 600); // Success musical tone

    try {
      const resp = await fetch('/api/complete-detox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: studentId,
          durationMinutes: detoxMinutes
        })
      });

      if (!resp.ok) {
        // Fallback local update if server completed offline
        const newXp = (avatar?.xp || 0) + 100;
        const currentStreak = (avatar?.streak_flame || 0) + 1;
        await supabase.from('avatars').update({
          xp: newXp,
          streak_flame: currentStreak,
          last_focus_date: new Date().toISOString().split('T')[0]
        }).eq('user_id', studentId);
      }

      fetchStudentAndAvatar();
    } catch (err) {
      console.error("Error finalizing focus session:", err);
    }
  };

  const loadWrappedStory = async () => {
    setWrappedLoading(true);
    try {
      const resp = await fetch(`/api/wrapped?userId=${studentId}`);
      if (resp.ok) {
        const data = await resp.json();
        setWrappedData(data);
      } else {
        // Fallback local mock data
        setWrappedData({
          success: true,
          isPremium: isPremiumUser,
          avatarStyle: isPremiumUser ? 'Premium_Hero' : 'Standard_Silhouette',
          avatarUrl: isPremiumUser ? (avatar?.asset_path || '/avatars/hero_guitarist_lvl1.png') : '/avatars/silhouette_grey.png',
          monthlyFlashback: {
            focusMinutes: isPremiumUser ? 280 : null,
            masteredSongsCount: isPremiumUser ? 4 : null,
            badgeName: isPremiumUser ? 'Mai-Fokus-Badge 🏆' : 'Gesperrt 🔒',
            badgeCode: 'Badge_Mai_2026'
          },
          campusWrapped: {
            focusMinutes: isPremiumUser ? 1420 : null,
            masteredSongsCount: isPremiumUser ? 18 : null
          }
        });
      }
      setStorySlide(0);
      setShowWrapped(true);
    } catch (e) {
      console.error(e);
    } finally {
      setWrappedLoading(false);
    }
  };

  const handleCancelLesson = async (scheduleId: string) => {
    if (!confirm('Möchtest du den heutigen Unterricht wirklich absagen? Der Slot wird für andere freigegeben.')) return;
    try {
      const resp = await fetch('/api/schedule/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, studentId })
      });
      if (resp.ok) {
        fetchStudentAndAvatar();
        return;
      }
      const { error } = await supabase
        .from('schedules')
        .update({ status: 'canceled_by_student' })
        .eq('id', scheduleId);
      if (error) throw error;
      fetchStudentAndAvatar();
    } catch (err) {
      console.error(err);
      alert('Fehler beim Absagen des Unterrichts.');
    }
  };

  const handleParentApproval = async (scheduleId: string, approve: boolean) => {
    try {
      const nextStatus = approve ? 'approved' : 'canceled_by_student';
      const resp = await fetch('/api/schedule/approve-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId, approve })
      });
      if (resp.ok) {
        fetchStudentAndAvatar();
        return;
      }
      const { error } = await supabase
        .from('schedules')
        .update({ status: nextStatus })
        .eq('id', scheduleId);
      if (error) throw error;
      fetchStudentAndAvatar();
    } catch (err) {
      console.error(err);
      alert('Fehler bei der Bestätigung.');
    }
  };

  const handleSelectHero = async (heroClassId: string) => {
    setSubmittingSelection(true);
    try {
      const response = await fetch('/api/select-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentId}`
        },
        body: JSON.stringify({ heroClassId })
      });

      if (response.ok) {
        const result = await response.json();
        setAvatar(result.avatar);
        setShowSelector(false);
        return;
      }

      const assetPaths: Record<string, string> = {
        guitarist: '/avatars/hero_guitarist_lvl1.png',
        drummer: '/avatars/hero_drummer_lvl1.png',
        keyboardist: '/avatars/hero_keys_lvl1.png',
        vocalist: '/avatars/hero_vocals_lvl1.png'
      };

      const fallbackAvatar = {
        user_id: studentId,
        avatar_style: 'Premium_Hero',
        instrument_type: heroClassId,
        evolution_level: 1,
        xp: 0,
        asset_path: assetPaths[heroClassId] || '/avatars/silhouette_standard.png',
        streak_flame: 0
      };

      const { data, error } = await supabase
        .from('avatars')
        .upsert(fallbackAvatar)
        .select('*')
        .single();

      if (error) throw error;
      await supabase.from('users').update({ avatar_url: fallbackAvatar.asset_path }).eq('id', studentId);

      setAvatar(data as Avatar);
      setShowSelector(false);
    } catch (err: any) {
      setError('Auswahl fehlgeschlagen.');
    } finally {
      setSubmittingSelection(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Lade Helden-Profil...</p>
      </div>
    );
  }

  // WENN IS_APP_USER = FALSE
  if (!isAppUser) {
    return (
      <div className="max-w-md mx-auto bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 text-center shadow-2xl animate-fadeIn">
        <div className="relative inline-block mb-6">
          <div className="w-40 h-40 mx-auto rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center overflow-hidden">
            <span className="text-[6rem] grayscale opacity-25">👨‍🎤</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-slate-950/80 border border-slate-700 text-amber-500 h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Lock size={24} className="animate-pulse" />
            </div>
          </div>
        </div>

        <h3 className="text-xl font-black text-white tracking-tight mb-2">Musik-Held gesperrt</h3>
        
        <div className="bg-slate-950/50 border border-slate-800/60 p-5 rounded-2xl text-left space-y-4 mb-6">
          <div className="flex gap-3">
            <div className="h-8 w-8 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
              <Smartphone size={16} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">App-Account erforderlich</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Dieses Konto ist aktuell als analoges Profil registriert. Mit der GrooveLab App kannst du deinen eigenen Charakter steuern!
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-850">
            <div className="h-8 w-8 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Sammle XP & steige auf</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Schalte deinen eigenen Musik-Helden frei, sammle XP im Unterricht und werde zum Rockstar! Frage deine Musikschule nach dem App-Zugang.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // WENN IS_APP_USER = TRUE (Selector Screen if no avatar chosen yet)
  if (showSelector) {
    return (
      <div className="max-w-xl mx-auto bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl animate-fadeIn">
        <div className="text-center mb-6">
          <Sparkles className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
          <h3 className="text-2xl font-black text-white tracking-tight">Wähle deinen Helden!</h3>
          <p className="text-sm text-slate-400 mt-1">Welche Musiker-Klasse passt zu dir? Du kannst sofort XP sammeln.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {HERO_CLASSES.map(hc => (
            <button
              key={hc.id}
              onClick={() => handleSelectHero(hc.id)}
              disabled={submittingSelection}
              className="p-5 bg-slate-950/60 hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-500 rounded-2xl text-left transition-all duration-200 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl bg-slate-900 p-2.5 rounded-xl group-hover:scale-110 transition-transform">{hc.icon}</span>
                <div>
                  <span className="block font-extrabold text-white text-base group-hover:text-indigo-400 transition-all">{hc.name}</span>
                  <span className="block text-xs text-slate-400 font-semibold mt-1 leading-relaxed">{hc.desc}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!avatar) return null;

  const currentLevel = avatar.evolution_level || 1;
  const currentXp = avatar.xp || 0;
  const levelTitle = LEVEL_NAMES[avatar.instrument_type]?.[currentLevel] || `Stufe ${currentLevel}`;

  // XP calculation
  let nextThreshold = 100;
  let prevThreshold = 0;
  if (currentLevel === 2) {
    prevThreshold = 100;
    nextThreshold = 300;
  } else if (currentLevel === 3) {
    prevThreshold = 300;
    nextThreshold = 9999;
  }

  const xpInCurrentLevel = Math.max(0, currentXp - prevThreshold);
  const totalXpInLevel = nextThreshold - prevThreshold;
  const xpPercentage = currentLevel === 3 ? 100 : Math.min(100, (xpInCurrentLevel / totalXpInLevel) * 100);

  // Circular progress calculations for fit style ring
  const circleRadius = 70;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (xpPercentage / 100) * circleCircumference;

  return (
    <div style={{ fontFamily: '"Outfit", "Inter", sans-serif', maxWidth: '480px', margin: '0 auto' }}>
      
      {/* Top Tab Switcher */}
      <div style={{ display: 'flex', gap: '8px', background: '#f1f3f4', padding: '6px', borderRadius: '100px', marginBottom: '24px' }}>
        <button
          onClick={() => handleTabChangeLocal('briefing')}
          style={{
            flex: 1,
            border: 'none',
            background: activeTab === 'briefing' ? '#ffffff' : 'transparent',
            color: activeTab === 'briefing' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'briefing' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Coffee size={15} />
          <span>Briefing</span>
        </button>
        
        <button
          onClick={() => handleTabChangeLocal('songs')}
          style={{
            flex: 1.2,
            border: 'none',
            background: activeTab === 'songs' ? '#ffffff' : 'transparent',
            color: activeTab === 'songs' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'songs' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Music size={15} />
          <span>Songs & Material</span>
        </button>

        <button
          onClick={() => handleTabChangeLocal('practice_board')}
          style={{
            flex: 1.2,
            border: 'none',
            background: activeTab === 'practice_board' ? '#ffffff' : 'transparent',
            color: activeTab === 'practice_board' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'practice_board' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Clock size={15} />
          <span>Übe-Board</span>
        </button>

        <button
          onClick={() => handleTabChangeLocal('campus_cup')}
          style={{
            flex: 1.2,
            border: 'none',
            background: activeTab === 'campus_cup' ? '#ffffff' : 'transparent',
            color: activeTab === 'campus_cup' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'campus_cup' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Trophy size={15} />
          <span>Campus-Cup</span>
        </button>

        <button
          onClick={() => handleTabChangeLocal('hero')}
          style={{
            flex: 1,
            border: 'none',
            background: activeTab === 'hero' ? '#ffffff' : 'transparent',
            color: activeTab === 'hero' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'hero' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Star size={15} />
          <span>Mein Held</span>
        </button>
      </div>

      {activeTab === 'practice_board' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
          {!isPremiumActive ? (
            /* 1. BASIC MODE BLOCKED OVERLAY */
            <div style={{
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(12px)',
              borderRadius: '24px',
              padding: '40px 24px',
              textAlign: 'center',
              border: '1.5px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              minHeight: '400px',
              color: 'white',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }} className="animation-slide-up">
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(245, 158, 11, 0.4)',
                border: '2px solid rgba(255, 255, 255, 0.2)'
              }} className="animate-pulse">
                <Lock size={32} />
              </div>
              <div style={{ maxWidth: '320px' }}>
                <h4 style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', color: '#fef08a' }}>
                  Übe-Board gesperrt
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '10px', fontWeight: 600, lineHeight: 1.5 }}>
                  Lass deine Flamme brennen! Schalte den fokussierten Übe-Timer, deinen Avatar-Level und den automatischen Streak-Zähler für nur 0,49 € frei.
                </p>
              </div>
              <button
                onClick={handleUpgrade}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ca8a04 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 32px',
                  borderRadius: '100px',
                  fontWeight: 950,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 10px 20px rgba(245,158,11,0.25)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                className="hover-scale"
              >
                Jetzt upgraden
              </button>
            </div>
          ) : (
            /* 2. PREMIUM MODE: ÜBE-BOARD Timer & Gyro Detox */
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              position: 'relative'
            }} className="animation-slide-up">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{ background: '#ecfdf5', color: '#10b981', padding: '8px', borderRadius: '12px' }}>
                  <Clock size={18} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', margin: 0 }}>[ ÜBE-BOARD ] Fokus-Timer</h4>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 600 }}>Fokusmodus & Gyroskop-Steuerung</p>
                </div>
              </div>

              {!sessionActive ? (
                /* Timer setup before starting */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Missions-Auswahl (Dropdown) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                      Wähle dein Übe-Thema:
                    </label>
                    <select
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '14px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        backgroundColor: 'white',
                        outline: 'none'
                      }}
                    >
                      <option value="">-- Thema auswählen --</option>
                      {progressItems.map((item) => (
                        <option key={item.id} value={item.topic_name}>
                          {item.topic_name} {item.is_current_homework ? '🎯 (Hausaufgabe)' : ''}
                        </option>
                      ))}
                      <option value="Allgemeines Üben">Allgemeines Üben 🎸</option>
                    </select>
                  </div>

                  {/* Circular visual timer representation (static state) */}
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                    <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                      <svg width="180" height="180" viewBox="0 0 180 180">
                        <circle cx="90" cy="90" r="76" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                        <circle 
                          cx="90" 
                          cy="90" 
                          r="76" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="10" 
                          strokeDasharray={2 * Math.PI * 76}
                          strokeDashoffset={2 * Math.PI * 76}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: '#1e293b' }}>00:00</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Detox-Timer</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                        try {
                          const permission = await (DeviceOrientationEvent as any).requestPermission();
                          if (permission !== 'granted') {
                            alert('Sensor-Rechte werden für den Detox-Modus benötigt.');
                            return;
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }
                      
                      // Pre-select topic
                      if (!selectedTopic) {
                        const hw = progressItems.find(i => i.is_current_homework);
                        setSelectedTopic(hw ? hw.topic_name : (progressItems[0]?.topic_name || 'Allgemeines Üben'));
                      }
                      setSecondsElapsed(0);
                      setSessionActive(true);
                      setIsPhoneFlat(false);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '16px',
                      borderRadius: '16px',
                      fontWeight: 900,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(16,185,129,0.2)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                    className="hover-scale"
                  >
                    🚀 Fokus-Session starten
                  </button>
                </div>
              ) : (
                /* Timer running / Gyro orientation dashboard */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Fokus-Thema:</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{selectedTopic}</div>
                  </div>

                  {/* Circular animated SVG progress ring */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                      <svg width="200" height="200" viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r="85" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                        <circle 
                          cx="100" 
                          cy="100" 
                          r="85" 
                          fill="none" 
                          stroke={isPhoneFlat ? '#10b981' : '#ef4444'} 
                          strokeWidth="12" 
                          strokeDasharray={2 * Math.PI * 85}
                          strokeDashoffset={2 * Math.PI * 85 - (2 * Math.PI * 85 * ((secondsElapsed % 60) / 60))}
                          strokeLinecap="round"
                          transform="rotate(-90 100 100)"
                          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                        />
                      </svg>
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: 950, color: '#0f172a', fontFamily: 'monospace' }}>
                          {String(Math.floor(secondsElapsed / 60)).padStart(2, '0')}:
                          {String(secondsElapsed % 60).padStart(2, '0')}
                        </span>
                        <span style={{ fontSize: '0.62rem', fontWeight: 900, color: isPhoneFlat ? '#10b981' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
                          {isPhoneFlat ? 'Üben Aktiv' : 'Pausiert'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gyro Sensor feedback */}
                  <div style={{
                    padding: '16px 20px',
                    borderRadius: '16px',
                    background: isPhoneFlat ? '#ecfdf5' : '#fef2f2',
                    border: isPhoneFlat ? '1.5px solid #a7f3d0' : '1.5px solid #fca5a5',
                    color: isPhoneFlat ? '#065f46' : '#991b1b',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    lineHeight: 1.4
                  }}>
                    {isPhoneFlat ? (
                      <div>
                        <strong>Perfekte Lage! 📱</strong>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>Das Handy liegt flach auf dem Display. Der Timer läuft im Hintergrund.</p>
                      </div>
                    ) : (
                      <div className="animate-pulse">
                        <strong>🚨 Fokus unterbrochen!</strong>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', opacity: 0.9 }}>Lege das Handy wieder auf das Display, um weiterzuüben.</p>
                      </div>
                    )}
                  </div>

                  {/* Display Down Fullscreen Blackout Overlay */}
                  {sessionActive && isPhoneFlat && (
                    <div 
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#18181b',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#27272a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          Fokus active...
                        </div>
                        <div style={{ fontSize: '1rem', color: '#18181b', marginTop: '8px' }}>
                          {String(Math.floor(secondsElapsed / 60)).padStart(2, '0')}:{String(secondsElapsed % 60).padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={finishPracticeSession}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '14px',
                        borderRadius: '14px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
                        textTransform: 'uppercase'
                      }}
                    >
                      🏁 Session Beenden
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Möchtest du diese Session wirklich abbrechen? Der Fortschritt geht verloren.')) {
                          setSessionActive(false);
                        }
                      }}
                      style={{
                        padding: '14px',
                        borderRadius: '14px',
                        border: '1.5px solid #fca5a5',
                        background: '#fef2f2',
                        color: '#ef4444',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'songs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {progressLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              Songs & Material werden geladen...
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '8px', borderRadius: '12px' }}>
                  <Music size={18} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', margin: 0 }}>[ SONGS & MATERIAL ]</h4>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 600 }}>Deine Meilensteine & Hausaufgaben</p>
                </div>
              </div>

              {isPremiumActive ? (
                /* PREMIUM MODE: Beautiful tile grid */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Pinned current homework "Aktuelle Mission" */}
                  {progressItems.some(item => item.is_current_homework) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        🎯 Aktuelle Mission
                      </span>
                      {progressItems.filter(item => item.is_current_homework).map(item => {
                        let statusColor = '#eab308';
                        let statusBg = '#fffbeb';
                        let statusText = 'In Arbeit';

                        if (item.status === 'THEORY_DONE') {
                          statusColor = '#a855f7';
                          statusBg = '#f3e8ff';
                          statusText = 'Theorie gelesen';
                        } else if (item.status === 'MASTERED') {
                          statusColor = '#10b981';
                          statusBg = '#d1fae5';
                          statusText = 'Meisterwerk!';
                        }

                        return (
                          <div 
                            key={item.id} 
                            style={{
                              background: '#f0fdfa',
                              borderRadius: '20px',
                              border: '2px solid #06b6d4',
                              padding: '20px',
                              boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}
                            className="animate-pulse"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>
                                {item.topic_name}
                              </span>
                              <span style={{
                                background: statusBg,
                                color: statusColor,
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                textTransform: 'uppercase'
                              }}>
                                {statusText}
                              </span>
                            </div>
                            {item.teacher_notes && (
                              <div style={{ background: 'white', padding: '12px 16px', borderRadius: '12px', border: '1px solid #ccfbf1', fontSize: '0.82rem', color: '#0f172a', fontWeight: 600, fontStyle: 'italic' }}>
                                Notiz: {item.teacher_notes}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Complete grid of song tiles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Deine Meilensteine
                    </span>
                    {progressItems.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        Noch keine Songs am Board.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="grid-cols-1 sm:grid-cols-2">
                        {progressItems.map(item => {
                          let tileBg = 'white';
                          let tileBorder = '1px solid #e2e8f0';
                          let badgeBg = '#f1f5f9';
                          let badgeColor = '#475569';
                          let badgeText = 'In Arbeit';

                          if (item.status === 'IN_PROGRESS') {
                            tileBg = '#fffbeb';
                            tileBorder = '1.5px solid #fef08a';
                            badgeBg = '#fef9c3';
                            badgeColor = '#854d0e';
                          } else if (item.status === 'THEORY_DONE') {
                            tileBg = '#faf5ff';
                            tileBorder = '1.5px solid #e9d5ff';
                            badgeBg = '#f3e8ff';
                            badgeColor = '#6b21a8';
                            badgeText = 'Theorie gelesen';
                          } else if (item.status === 'MASTERED') {
                            tileBg = '#f0fdf4';
                            tileBorder = '1.5px solid #a7f3d0';
                            badgeBg = '#d1fae5';
                            badgeColor = '#065f46';
                            badgeText = 'Meisterwerk!';
                          }

                          return (
                            <div 
                              key={item.id} 
                              style={{
                                background: tileBg,
                                border: item.is_current_homework ? '2px solid #06b6d4' : tileBorder,
                                borderRadius: '20px',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                boxShadow: item.is_current_homework ? '0 0 10px rgba(6, 182, 212, 0.1)' : 'none',
                                position: 'relative'
                              }}
                              className={item.is_current_homework ? 'animate-pulse' : 'hover-scale'}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>
                                  {item.topic_name}
                                </span>
                                <span style={{
                                  background: badgeBg,
                                  color: badgeColor,
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  fontSize: '0.62rem',
                                  fontWeight: 900,
                                  textTransform: 'uppercase',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {badgeText}
                                </span>
                              </div>
                              {item.teacher_notes && (
                                <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 550, lineHeight: 1.3 }}>
                                  {item.teacher_notes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* BASIC MODE: Reduced plain text list & Stripe CTA */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Lifeless text list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {progressItems.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        Keine Einträge vorhanden.
                      </div>
                    ) : (
                      progressItems.map(item => (
                        <div 
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            background: '#f8fafc',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          {/* Gray lifeless standard icon */}
                          <div style={{
                            background: '#e2e8f0',
                            color: '#94a3b8',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Music size={14} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b' }}>
                              {item.topic_name}
                            </span>
                            {/* Blurred teacher notes */}
                            <div 
                              className="blur-md select-none" 
                              style={{ 
                                fontSize: '0.72rem', 
                                color: '#94a3b8', 
                                marginTop: '4px',
                                userSelect: 'none'
                              }}
                            >
                              {item.teacher_notes}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Golden Premium Stripe CTA Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
                    border: '2px solid #f59e0b',
                    borderRadius: '24px',
                    padding: '24px',
                    textAlign: 'center',
                    boxShadow: '0 10px 25px rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '14px',
                    marginTop: '8px'
                  }} className="hover-scale">
                    <div style={{
                      background: '#f59e0b',
                      color: 'white',
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)'
                    }}>
                      <Flame size={20} fill="white" />
                    </div>
                    <div>
                      <h5 style={{ fontWeight: 900, fontSize: '0.98rem', color: '#78350f', margin: 0 }}>
                        Hol dir das Meisterwerk-Dashboard!
                      </h5>
                      <p style={{ fontSize: '0.78rem', color: '#92400e', marginTop: '6px', fontWeight: 600, lineHeight: 1.4 }}>
                        Schalte dein interaktives Übe-Dashboard und die farbigen Meister-Kacheln für nur 0,49 € / Monat frei!
                      </p>
                    </div>
                    <button
                      onClick={handleUpgrade}
                      style={{
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '100px',
                        fontWeight: 950,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                        transition: 'all 0.2s',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                      className="hover-scale"
                    >
                      Jetzt freischalten
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'campus_cup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <style>{`
            @keyframes pulse-green {
              0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); border-color: rgba(34, 197, 94, 0.8); }
              70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); border-color: rgba(34, 197, 94, 0.8); }
              100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); border-color: rgba(34, 197, 94, 0.8); }
            }
            .pulsing-own-school {
              animation: pulse-green 2s infinite;
              background-color: #f0fdf4 !important;
              border: 2px solid #22c55e !important;
            }
          `}</style>

          {rankingLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
              Campus-Cup wird geladen...
            </div>
          ) : rankingError ? (
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #fca5a5',
              padding: '24px',
              borderRadius: '24px',
              textAlign: 'center',
              color: '#991b1b',
              fontWeight: 700
            }}>
              {rankingError}
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }} className="animation-slide-up">
              
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{ background: '#fef3c7', color: '#d97706', padding: '8px', borderRadius: '12px' }}>
                  <Trophy size={18} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', margin: 0 }}>[ CAMPUS-CUP ] Leaderboard</h4>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 600 }}>Globales Ranking aller Musikschulen (RFI Index)</p>
                </div>
              </div>

              {/* Leaderboard Table List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Render Top 3 */}
                {rankingData.slice(0, 3).map((item) => {
                  const medal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`;
                  return (
                    <div
                      key={item.name}
                      className={item.isOwnSchool ? 'pulsing-own-school' : ''}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: item.isOwnSchool ? '#f0fdf4' : '#f8fafc',
                        border: item.isOwnSchool ? '2px solid #22c55e' : '1px solid #e2e8f0',
                        padding: '14px 18px',
                        borderRadius: '16px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#64748b', width: '32px', textAlign: 'center' }}>{medal}</span>
                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>
                          {item.name} {item.isOwnSchool && <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '100px', marginLeft: '6px', fontWeight: 900 }}>EIGENE SCHULE</span>}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>{item.rfi}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Min/Schüler</span>
                      </div>
                    </div>
                  );
                })}

                {/* Sandwich Window rendering */}
                {(() => {
                  const ownIndex = rankingData.findIndex(item => item.isOwnSchool);
                  if (ownIndex === -1 || ownIndex < 3) return null;

                  const predecessor = rankingData[ownIndex - 1];
                  const ownSchool = rankingData[ownIndex];
                  const successor = rankingData[ownIndex + 1];
                  const diff = predecessor ? (predecessor.rfi - ownSchool.rfi).toFixed(1) : '0.0';

                  return (
                    <>
                      {/* Divider */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        fontWeight: 900,
                        fontSize: '1.1rem',
                        letterSpacing: '0.15em',
                        padding: '4px 0'
                      }}>
                        •••
                      </div>

                      {/* Predecessor */}
                      {predecessor && (
                        <div
                          key={predecessor.name}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '14px 18px',
                            borderRadius: '16px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#64748b', width: '32px', textAlign: 'center' }}>#{predecessor.rank}</span>
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>{predecessor.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>{predecessor.rfi}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Min/Schüler</span>
                          </div>
                        </div>
                      )}

                      {/* Own School (Pulsing Green) */}
                      <div
                        key={ownSchool.name}
                        className="pulsing-own-school"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '14px 18px',
                          borderRadius: '16px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#15803d', width: '32px', textAlign: 'center' }}>#{ownSchool.rank}</span>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#166534' }}>
                            {ownSchool.name} <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '100px', marginLeft: '6px', fontWeight: 900 }}>EIGENE SCHULE</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#15803d' }}>{ownSchool.rfi}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', opacity: 0.7, textTransform: 'uppercase' }}>Min/Schüler</span>
                        </div>
                      </div>

                      {/* Successor */}
                      {successor && (
                        <div
                          key={successor.name}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '14px 18px',
                            borderRadius: '16px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#64748b', width: '32px', textAlign: 'center' }}>#{successor.rank}</span>
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>{successor.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>{successor.rfi}</span>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Min/Schüler</span>
                          </div>
                        </div>
                      )}

                      {/* Live Difference Calculator */}
                      {predecessor && (
                        <div style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          padding: '12px 16px',
                          borderRadius: '16px',
                          color: '#1e40af',
                          fontSize: '0.78rem',
                          fontWeight: 750,
                          textAlign: 'center',
                          marginTop: '4px'
                        }}>
                          🚀 Noch <strong>+{diff} Minuten</strong> im Schnitt pro Schüler bis Platz {predecessor.rank}!
                        </div>
                      )}
                    </>
                  );
                })()}

              </div>

              {/* Premium Brake Check */}
              {!isPremiumActive ? (
                <div style={{
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
                  border: '1.5px solid #fca5a5',
                  padding: '16px 20px',
                  borderRadius: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)',
                  marginTop: '10px'
                }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991b1b', lineHeight: 1.45 }}>
                    ⚠️ Deine heute geübten Fokus-Minuten wurden nicht für den Campus-Cup gezählt! Aktiviere jetzt Premium für 0,49 €, um deine Schule im Ranking nach oben zu schießen!
                  </div>
                  <button
                    onClick={handleUpgrade}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #ca8a04 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 22px',
                      borderRadius: '100px',
                      fontWeight: 950,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(245,158,11,0.25)',
                      alignSelf: 'flex-start',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}
                  >
                    Jetzt upgraden
                  </button>
                </div>
              ) : (
                <div style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  padding: '14px 18px',
                  borderRadius: '20px',
                  color: '#15803d',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.05)',
                  marginTop: '10px'
                }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>✓</span>
                  <span>Du hast diesen Monat bereits <strong>{monthlyFocusMinutes}</strong> Minuten zum Erfolg deiner Schule beigetragen! Weiter so!</span>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {activeTab === 'briefing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!briefingLoading && briefingData ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '8px', borderRadius: '12px' }}>
                    <Coffee size={18} className="animate-pulse" />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', margin: 0 }}>Guten Morgen!</h4>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 600 }}>Dein heutiger Motivations-Anker</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff7ed', border: '1px solid #ffedd5', color: '#ea580c', fontWeight: 800, fontSize: '0.75rem', padding: '4px 10px', borderRadius: '100px' }}>
                  <Flame size={12} className="fill-orange-600 text-orange-600" />
                  <span>{avatar.streak_flame || briefingData.gamification.streakFlame} Tage</span>
                </div>
              </div>

              {/* Today's lesson */}
              {briefingData.todayLesson ? (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {briefingData.todayLesson.status === 'canceled_by_student' ? (
                    <div>
                      <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: '#ef4444', display: 'block', marginBottom: '4px' }}>Abgesagt</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>Du hast diesen Unterrichtstermin heute abgesagt. Dein Slot ist als Freisprech-Slot markiert.</span>
                    </div>
                  ) : briefingData.todayLesson.status === 'teacher_sick' ? (
                    <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '12px', borderRadius: '12px', color: '#b91c1c' }}>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 900, display: 'block', marginBottom: '4px' }}>🚨 Unterrichtsausfall</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 850 }}>Unterricht entfällt wegen akuter Erkrankung der Lehrkraft. Ihr Kontingent wird gutgeschrieben.</span>
                    </div>
                  ) : briefingData.todayLesson.status === 'pending_parent_approval' ? (
                    <div>
                      <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: '#d97706', display: 'block', marginBottom: '8px' }}>Eltern-Zustimmung ausstehend</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 750, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                        Vorschlag: Heute {briefingData.todayLesson.time} Uhr in {briefingData.todayLesson.room} bei {briefingData.todayLesson.teacher}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleParentApproval(briefingData.todayLesson.id, true)}
                          style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Zustimmen
                        </button>
                        <button 
                          onClick={() => handleParentApproval(briefingData.todayLesson.id, false)}
                          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: '#64748b', display: 'block' }}>Dein Termin heute</span>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <Clock size={16} color="#0b57d0" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b', display: 'block' }}>
                            {briefingData.todayLesson.time} Uhr
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 650, display: 'block', marginTop: '2px' }}>
                            {briefingData.todayLesson.room} bei {briefingData.todayLesson.teacher}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCancelLesson(briefingData.todayLesson.id)}
                        style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        Für heute absagen
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Heute steht kein Unterricht an. Nutze den Tag zum Üben!</span>
                </div>
              )}

              {/* DIGITAL DETOX FOKUSMODUS INTERFACE */}
              <div style={{ background: '#09090b', borderRadius: '20px', padding: '20px', border: '1px solid #27272a', color: 'white', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Moon size={18} color="#eab308" className="animate-pulse" />
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.02em', textTransform: 'uppercase', color: '#f8fafc' }}>Fokusmodus</span>
                  </div>
                  {!isPremiumUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', color: '#eab308', padding: '2px 8px', borderRadius: '100px', fontSize: '0.65rem', fontWeight: 900 }}>
                      <Lock size={10} /> PRO
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ position: 'relative', width: '70px', height: '70px', flexShrink: 0 }}>
                    {/* Circle Background */}
                    <svg width="70" height="70" viewBox="0 0 70 70">
                      <circle cx="35" cy="35" r="30" fill="none" stroke="#27272a" strokeWidth="6" />
                      <circle 
                        cx="35" 
                        cy="35" 
                        r="30" 
                        fill="none" 
                        stroke={isPremiumUser ? '#eab308' : '#71717a'} 
                        strokeWidth="6" 
                        strokeDasharray={2 * Math.PI * 30}
                        strokeDashoffset={2 * Math.PI * 30 * 0.4} // mock fill
                        strokeLinecap="round"
                        transform="rotate(-90 35 35)"
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>
                      {detoxMinutes}m
                    </div>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.78rem', color: '#a1a1aa', margin: 0, lineHeight: '1.4' }}>
                      {isPremiumUser 
                        ? 'Handy umdrehen (flach aufs Display legen) zum Starten. Bildschirm schaltet ab. Drehen pausiert den Timer mit haptischem Feedback.' 
                        : 'Fokus-Timer und haptische Detox-Erlebnisse sind für Premium-Mitglieder reserviert. Upgrade jetzt, um XP-Streaks freizuschalten.'
                      }
                    </p>
                    
                    {isPremiumUser ? (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button 
                          onClick={handleStartDetox}
                          style={{ background: '#eab308', color: '#09090b', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Fokus starten
                        </button>
                        <select 
                          value={detoxMinutes} 
                          onChange={(e) => setDetoxMinutes(Number(e.target.value))}
                          style={{ background: '#27272a', color: 'white', border: '1px solid #3f3f46', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          <option value={1}>1 Minute (Test)</option>
                          <option value={5}>5 Minuten</option>
                          <option value={15}>15 Minuten</option>
                          <option value={30}>30 Minuten</option>
                        </select>
                      </div>
                    ) : (
                      <button 
                        onClick={() => alert("Upgrade auf Premium erforderlich! (Kosten: 0,49 €/Monat)")}
                        style={{ marginTop: '12px', background: '#27272a', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '8px 16px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Lock size={12} /> Detox freischalten
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* CAMPUS WRAPPED / MONTHLY FLASHBACK TRIGGER */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Rückblick &amp; Highlights
                  </span>
                  <Sparkles size={16} color="#4f46e5" />
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={loadWrappedStory}
                    disabled={wrappedLoading}
                    style={{ 
                      flex: 1, 
                      padding: '14px', 
                      background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '14px', 
                      fontSize: '0.8rem', 
                      fontWeight: 800, 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px', 
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)' 
                    }}
                  >
                    {isPremiumUser ? '🎬 Monats-Story' : '🔒 Monats-Story'}
                  </button>
                  
                  <button 
                    onClick={loadWrappedStory}
                    disabled={wrappedLoading}
                    style={{ 
                      flex: 1, 
                      padding: '14px', 
                      background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '14px', 
                      fontSize: '0.8rem', 
                      fontWeight: 800, 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px', 
                      boxShadow: '0 4px 12px rgba(234, 179, 8, 0.15)' 
                    }}
                  >
                    {isPremiumUser ? '🔥 Campus Wrapped' : '🔒 Campus Wrapped'}
                  </button>
                </div>
              </div>

              {/* Gamification progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ fontWeight: 800, color: '#64748b' }}>Milestone-Ziel</span>
                  <span style={{ fontWeight: 900, color: '#0b57d0', background: '#e8f0fe', padding: '2px 8px', borderRadius: '6px' }}>
                    {briefingData.gamification.xpTargetMessage}
                  </span>
                </div>
                <div style={{ width: '100%', background: '#f1f5f9', height: '10px', borderRadius: '100px', overflow: 'hidden' }}>
                  <div 
                    style={{ width: `${Math.max(10, Math.min(100, 100 - (briefingData.gamification.remainingXp / 50) * 100))}%`, height: '100%', borderRadius: '100px', background: 'linear-gradient(90deg, #ea580c, #f59e0b)', transition: 'all 0.5s' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Lade Briefing...</div>
          )}
        </div>
      )}

      {activeTab === 'hero' && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Evolution Badge Top Right */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#e0f2fe',
            border: '1px solid #bae6fd',
            color: '#0369a1',
            fontWeight: 800,
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            padding: '4px 12px',
            borderRadius: '100px'
          }}>
            <Trophy size={11} /> {avatar.instrument_type}
          </div>

          {/* Avatar Showcase */}
          <div style={{ textAlign: 'center', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}>
              {/* Avatar frame */}
              <div style={{
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                background: '#f8fafc',
                border: '3px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.02)',
                transition: 'all 0.3s'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '5rem' }}>
                    {avatar.instrument_type === 'guitarist' ? '🎸' : avatar.instrument_type === 'drummer' ? '🥁' : avatar.instrument_type === 'keyboardist' ? '🎹' : '🎤'}
                  </span>
                </div>
              </div>
              
              <div style={{
                position: 'absolute',
                bottom: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#0b57d0',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.68rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                padding: '4px 14px',
                borderRadius: '100px',
                boxShadow: '0 4px 12px rgba(11, 87, 208, 0.25)',
                border: '2px solid #ffffff',
                whiteSpace: 'nowrap'
              }}>
                Evolution {currentLevel}
              </div>
            </div>

            {/* Info Block */}
            <div style={{ marginTop: '8px' }}>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                {levelTitle.split(' (')[0]}
              </h3>
              <span style={{ color: '#0b57d0', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <Award size={13} /> {levelTitle}
              </span>
            </div>

            {/* XP Progress Bar */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                <span>Erfahrungspunkte (XP)</span>
                <span style={{ color: '#0b57d0', fontFamily: 'monospace', fontWeight: 900 }}>
                  {currentLevel === 3 ? `${currentXp} XP (MAX)` : `${currentXp} / ${nextThreshold} XP`}
                </span>
              </div>

              <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                <div
                  style={{ width: `${xpPercentage}%`, height: '100%', borderRadius: '100px', background: '#0b57d0', transition: 'all 1s' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                {currentLevel === 3 ? (
                  <span>Glückwunsch! Höchste Stufe erreicht!</span>
                ) : (
                  <>
                    <span>Noch {nextThreshold - currentXp} XP bis Evolution {currentLevel + 1}</span>
                    <span>{Math.round(xpPercentage)}%</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9:16 MOBILE STORY GENERATOR MODAL (Wrapped & Flashback) */}
      {/* ======================================================== */}
      {showWrapped && wrappedData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#09090b',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Outfit", sans-serif'
        }}>
          {/* 9:16 Aspect Ratio Container */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '430px',
            height: '100%',
            maxHeight: '860px',
            background: '#000000',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #18181b',
            boxSizing: 'border-box'
          }}>
            {/* Top Indicator Bars */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              right: '16px',
              zIndex: 10000,
              display: 'flex',
              gap: '4px'
            }}>
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} style={{
                  flex: 1,
                  height: '4px',
                  background: idx < storySlide ? '#eab308' : idx === storySlide ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                  borderRadius: '100px',
                  overflow: 'hidden'
                }}>
                  {idx === storySlide && (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: '#eab308',
                      animation: 'storyProgress 5s linear forwards'
                    }} />
                  )}
                </div>
              ))}
            </div>

            {/* Header: Title and Close button */}
            <div style={{
              position: 'absolute',
              top: '32px',
              left: '16px',
              right: '16px',
              zIndex: 10000,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'white', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                GrooveLab Wrapped
              </span>
              <button 
                onClick={() => setShowWrapped(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* STORY SLIDES */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px', boxSizing: 'border-box', color: 'white' }}>
              
              {/* SLIDE 0: INTRO */}
              {storySlide === 0 && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                  <div style={{ fontSize: '6rem', animation: 'bounce 2s infinite' }}>🎬</div>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                    Dein musikalischer Flashback!
                  </h2>
                  <p style={{ color: '#a1a1aa', fontSize: '1rem', fontWeight: 500 }}>
                    Schauen wir uns an, was du diesen Monat im GrooveLab geleistet hast! Bist du bereit für deine Story?
                  </p>
                </div>
              )}

              {/* SLIDE 1: STATISTICS (Censored for Free, Uncensored for Premium) */}
              {storySlide === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ background: '#eab308', color: '#09090b', fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fokus &amp; Übung</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '12px' }}>Deine Meilensteine</h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Focus Minutes Card */}
                    <div style={{ background: '#09090b', border: '1px solid #27272a', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <Clock size={36} color="#eab308" />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800 }}>Fokus-Zeit</div>
                        <div 
                          className={!wrappedData.isPremium ? 'blur-md text-2xl font-black text-white select-none' : 'text-2xl font-black text-white'}
                        >
                          {wrappedData.isPremium ? `${wrappedData.monthlyFlashback.focusMinutes} Minuten` : '9999 Minuten'}
                        </div>
                      </div>
                    </div>

                    {/* Mastered Songs Card */}
                    <div style={{ background: '#09090b', border: '1px solid #27272a', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <BookOpen size={36} color="#10b981" />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 800 }}>Gemeisterte Songs</div>
                        <div 
                          className={!wrappedData.isPremium ? 'blur-md text-2xl font-black text-white select-none' : 'text-2xl font-black text-white'}
                        >
                          {wrappedData.isPremium ? `${wrappedData.monthlyFlashback.masteredSongsCount} Songs` : '88 Songs'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!wrappedData.isPremium && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px', borderRadius: '16px', color: '#ef4444', fontSize: '0.78rem' }}>
                      <EyeOff size={16} />
                      <span>Statistiken ausgeblendet. Upgrade auf Premium erforderlich!</span>
                    </div>
                  )}
                </div>
              )}

              {/* SLIDE 2: AVATAR SHOWCASE (Grayscale for Free, 3D/Color for Premium) */}
              {storySlide === 2 && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                  <div>
                    <span style={{ background: '#10b981', color: 'white', fontSize: '0.7rem', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charakter Evolution</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '12px' }}>Dein Avatar-Status</h2>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <div 
                      className={!wrappedData.isPremium ? 'grayscale w-40 h-40 rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center overflow-hidden' : 'w-40 h-40 rounded-full bg-indigo-950/40 border-4 border-indigo-500 flex items-center justify-center overflow-hidden animate-pulse'}
                    >
                      <span style={{ fontSize: '5.5rem' }}>
                        {avatar.instrument_type === 'guitarist' ? '🎸' : avatar.instrument_type === 'drummer' ? '🥁' : avatar.instrument_type === 'keyboardist' ? '🎹' : '🎤'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                      {wrappedData.isPremium ? levelTitle.split(' (')[0] : 'Analoger Schüler (Silhouette)'}
                    </h3>
                    <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '6px' }}>
                      {wrappedData.isPremium 
                        ? `Evolution Level ${currentLevel} erreicht!`
                        : 'Kostenlose Avatare bleiben grau und leblos. Upgrade, um deinen 3D-Helden zu erwecken!'
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* SLIDE 3: BADGES & VIRAL QR SHARE */}
              {storySlide === 3 && (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>
                      {wrappedData.isPremium ? 'Sammle dein Badge!' : 'Hol dir die Vollversion'}
                    </h2>
                    <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '6px' }}>
                      {wrappedData.isPremium ? 'Hier ist dein exklusives Monats-Badge:' : 'Upgrade für nur 0,49 € / Monat!'}
                    </p>
                  </div>

                  {wrappedData.isPremium ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                      <div style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)' }}>
                        <Trophy size={36} color="white" />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fbbf24' }}>
                        {wrappedData.monthlyFlashback.badgeName}
                      </span>

                      {/* Viral QR Code Generator */}
                      <div style={{ background: 'white', padding: '10px', borderRadius: '16px', marginTop: '8px', boxShadow: '0 10px 30px rgba(255,255,255,0.05)' }}>
                        <QRCode value={`https://groovelab.app/join?ref=${studentId}`} size={100} />
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#71717a' }}>Virale Partner-ID: ref={studentId}</span>

                      {/* One click WhatsApp Status Share */}
                      <a 
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Schau mal! Mein GrooveLab Rückblick diesen Monat: Ich war ${wrappedData.monthlyFlashback.focusMinutes} Minuten fokussiert und habe mein ${wrappedData.monthlyFlashback.badgeName} freigeschaltet! Musik machen ist genial! Werde auch Mitglied: https://groovelab.app/join?ref=${studentId}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ background: '#25d366', color: 'white', textDecoration: 'none', padding: '14px 28px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)' }}
                      >
                        <Share2 size={16} /> Auf WhatsApp teilen
                      </a>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#27272a', border: '2px dashed #3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={32} color="#71717a" />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#a1a1aa' }}>Badge gesperrt</span>

                      {/* Redirect to WhatsApp upgrade trigger */}
                      <a 
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hallo Musikschule! Ich möchte mein GrooveLab-Konto auf Premium upgraden, um Avatare, Streaks und monatliche Stories freizuschalten. Bitte sendet mir den Upgrade-Link für 0,49€.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ background: '#fbbf24', color: '#09090b', textDecoration: 'none', padding: '14px 28px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}
                      >
                        <Zap size={16} /> Jetzt Upgrade anfordern (0,49 €)
                      </a>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Story Navigation Tabs Bottom */}
            <div style={{
              display: 'flex',
              padding: '16px',
              borderTop: '1px solid #18181b',
              background: '#09090b',
              gap: '8px'
            }}>
              <button 
                onClick={() => setStorySlide(prev => Math.max(0, prev - 1))}
                disabled={storySlide === 0}
                style={{ flex: 1, background: '#18181b', border: '1px solid #27272a', color: 'white', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', opacity: storySlide === 0 ? 0.5 : 1 }}
              >
                Zurück
              </button>
              
              <button 
                onClick={() => {
                  if (storySlide === 3) {
                    setShowWrapped(false);
                  } else {
                    setStorySlide(prev => Math.min(3, prev + 1));
                  }
                }}
                style={{ flex: 2, background: '#eab308', border: 'none', color: '#09090b', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer' }}
              >
                {storySlide === 3 ? 'Schließen' : 'Weiter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIGITAL DETOX ACTIVE TIMER OVERLAY (AMOLED Black Screen)  */}
      {/* ======================================================== */}
      {showDetox && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#000000', // AMOLED Black
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontFamily: '"Outfit", sans-serif',
          padding: '24px'
        }}>
          {isFaceDown ? (
            // Full AMOLED-Black with minimal reizarm layout
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Moon size={24} color="#52525b" className="animate-pulse" />
              </div>
              <h1 style={{ fontSize: '4rem', fontWeight: 100, fontFamily: 'monospace', letterSpacing: '-0.02em', color: '#27272a', margin: 0 }}>
                {Math.floor(detoxSecondsLeft / 60)}:{String(detoxSecondsLeft % 60).padStart(2, '0')}
              </h1>
              <p style={{ color: '#27272a', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Digital Detox Aktiv
              </p>
            </div>
          ) : (
            // Warning/Flat check mode when flipped face up
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', maxWidth: '320px' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={40} color="#ef4444" className="animate-bounce" />
              </div>
              
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ef4444', letterSpacing: '-0.03em' }}>
                Handy umdrehen!
              </h2>
              
              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', lineHeight: '1.5', fontWeight: 500 }}>
                Der Timer ist eingefroren. Lege das Smartphone flach auf das Display, um den Fokusmodus fortzusetzen.
              </p>
              
              <div style={{ fontSize: '3rem', fontWeight: 900, color: 'white', fontFamily: 'monospace', margin: '8px 0' }}>
                {Math.floor(detoxSecondsLeft / 60)}:{String(detoxSecondsLeft % 60).padStart(2, '0')}
              </div>

              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button 
                  onClick={() => {
                    setIsDetoxActive(false);
                    setShowDetox(false);
                  }}
                  style={{ flex: 1, padding: '14px', background: '#27272a', border: '1px solid #3f3f46', color: 'white', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {detoxCompleted && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: '#09090b',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Award size={48} color="white" />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white' }}>Fokus abgeschlossen!</h2>
              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginTop: '8px', maxWidth: '280px' }}>
                Sehr gut! Du warst {detoxMinutes} Minuten voll konzentriert. Dir wurden +100 XP auf deinen Avatar gebucht.
              </p>
              
              <button 
                onClick={() => {
                  setShowDetox(false);
                  setDetoxCompleted(false);
                }}
                style={{ marginTop: '24px', background: '#10b981', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
              >
                Zurück zum Dashboard
              </button>
            </div>
          )}
        </div>
      )}
      
    </div>
  );
}
