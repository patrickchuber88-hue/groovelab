import React, { useMemo, useCallback } from 'react';

export interface UseCampusDashboardMetricsParams {
  user: any;
  loggedInUserId: string | null | undefined;
  userSongs: any[];
  wallSongs: any[];
  userBands: any[];
  totalPresenceMins: number;
  liveSessionMins: number;
  practiceSearchQuery: string;
  practiceSearchType: 'title' | 'artist';
  practiceAlphaFilter: string | null;
  globalPlannedSlots: any[];
  deferredPrompt: any;
  setDeferredPrompt: React.Dispatch<React.SetStateAction<any>>;
  setShowInstallBanner: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UseCampusDashboardMetricsReturn {
  calculateSkillXP: (skill: any) => number;
  studentRadarData: { instrument: string; xp: number }[];
  totalPracticeMins: number;
  practiceSongs: any[];
  repertoireSongs: any[];
  groupedPracticeSongs: any[];
  groupedRepertoireSongs: any[];
  getTeacherTheme: (name: string, userId: string) => any;
  getTeacherColorStyle: (teachersInSlot: any[], loggedInUserId: string | undefined) => any;
  getTeacherPresenceList: () => any[];
  school: any;
  trialDaysLeft: number | null;
  handleInstallPWA: () => Promise<void>;
  handleDismissInstall: () => void;
}

export function useCampusDashboardMetrics({
  user,
  loggedInUserId,
  userSongs,
  wallSongs,
  userBands,
  totalPresenceMins,
  liveSessionMins,
  practiceSearchQuery,
  practiceSearchType,
  practiceAlphaFilter,
  globalPlannedSlots,
  deferredPrompt,
  setDeferredPrompt,
  setShowInstallBanner
}: UseCampusDashboardMetricsParams): UseCampusDashboardMetricsReturn {

  const calculateSkillXP = useCallback((skill: any) => {
    const prog = skill.progress || 0;
    if (skill.is_stage_ready || prog === 100) return 500;
    return prog * 2;
  }, []);

  const studentRadarData = useMemo(() => {
    const radarBase: Record<string, number> = { Guitar: 0, Bass: 0, Drums: 0, Keys: 0, Vocals: 0 };
    (userSongs || []).forEach((s: any) => {
      const sInst = s.instrument?.toLowerCase();
      if (!sInst) return;
      
      let target: string | null = null;
      if (sInst === 'guitar' || sInst === 'e-gitarre') target = 'Guitar';
      else if (sInst === 'bass' || sInst === 'e-bass') target = 'Bass';
      else if (sInst === 'drums' || sInst === 'e-drums') target = 'Drums';
      else if (sInst === 'keys' || sInst === 'piano' || sInst === 'e-piano') target = 'Keys';
      else if (sInst === 'vocals' || sInst === 'gesang') target = 'Vocals';
      
      if (target && radarBase[target] !== undefined) {
        radarBase[target] += calculateSkillXP(s);
      }
    });
    return Object.entries(radarBase).map(([inst, xp]) => ({ instrument: inst, xp }));
  }, [userSongs, calculateSkillXP]);

  const totalPracticeMins = totalPresenceMins + liveSessionMins;

  // Group userSongs by song_id
  const songIdsInPractice = useMemo(() => Array.from(new Set(
    (userSongs || [])
      .filter((s: any) => s.progress < 100 || s.is_pending_approval)
      .map((s: any) => s.song_id)
  )), [userSongs]);

  const practiceSongs = useMemo(() => (userSongs || []).filter((s: any) => songIdsInPractice.includes(s.song_id)), [userSongs, songIdsInPractice]);
  
  const repertoireSongs = useMemo(() => (userSongs || []).filter((s: any) => {
    if (s.instrument === 'Vocals') return true; // All registered vocal songs are part of repertoire
    return s.progress === 100 && s.is_stage_ready && !s.is_pending_approval;
  }), [userSongs]);

  const groupSongs = useCallback((songs: any[]) => Object.values((songs || []).reduce((acc: any, skill: any) => {
    if (!skill || !skill.song_id) return acc;
    if (!acc[skill.song_id]) {
      const wallMatch = (wallSongs || []).find((ws: any) => ws?.song_id === skill.song_id && ws?.level === skill.difficulty_level);
      
      // Check if this is a band song
      const isBandSong = (userBands || []).some((b: any) => 
        b.song_id === skill.song_id || (b.band_songs || []).some((bs: any) => bs.song_id === skill.song_id)
      );

      acc[skill.song_id] = {
        song_id: skill.song_id,
        title: skill.title || 'Unbenannter Song',
        artist: skill.artist || 'Unbekannter Künstler',
        media_link: skill.media_link,
        tomplay_url: skill.tomplay_url,
        playalong_url: skill.playalong_url,
        instrumentation: skill.instrumentation,
        isBandReady: wallMatch?.isComplete || false,
        isBandSong: isBandSong,
        skills: []
      };
    }
    // Deduplicate by instrument AND difficulty level AND part number
    if (!acc[skill.song_id].skills.find((s: any) => 
      s?.instrument === skill.instrument && 
      s?.difficulty_level === skill.difficulty_level &&
      (s?.part_number || 1) === (skill.part_number || 1)
    )) {
      acc[skill.song_id].skills.push(skill);
    }
    return acc;
  }, {})), [wallSongs, userBands]);

  const filteredPractice = useMemo(() => (practiceSongs || []).filter((s: any) => {
    const term = (practiceSearchQuery || '').toLowerCase();
    const matchesSearch = practiceSearchType === 'title' 
      ? (s.title || '').toLowerCase().includes(term)
      : (s.artist || '').toLowerCase().includes(term);
      
    const valForAlpha = practiceSearchType === 'title' ? (s.title || '') : (s.artist || '');
    const matchesAlpha = !practiceAlphaFilter 
      ? true 
      : valForAlpha.trim().toUpperCase().startsWith(practiceAlphaFilter);
      
    return matchesSearch && matchesAlpha;
  }), [practiceSongs, practiceSearchQuery, practiceSearchType, practiceAlphaFilter]);

  const groupedPracticeSongs = useMemo(() => groupSongs(filteredPractice), [groupSongs, filteredPractice]);
  const groupedRepertoireSongs = useMemo(() => groupSongs(repertoireSongs), [groupSongs, repertoireSongs]);

  const getTeacherTheme = useCallback((name: string, userId: string) => {
    const nameLower = (name || '').toLowerCase();
    if (nameLower.includes('patrick')) {
      return {
        solidBg: '#f59e0b', solidBorder: '#d97706',
        lightBg: 'rgba(245, 158, 11, 0.12)', lightBorder: 'rgba(245, 158, 11, 0.5)', lightText: '#d97706'
      };
    }
    if (nameLower.includes('manuel')) {
      return {
        solidBg: '#ea4335', solidBorder: '#c62828',
        lightBg: 'rgba(234, 67, 53, 0.12)', lightBorder: 'rgba(234, 67, 53, 0.5)', lightText: '#ea4335'
      };
    }
    if (nameLower.includes('boris')) {
      return {
        solidBg: '#34a853', solidBorder: '#34a853',
        lightBg: 'rgba(52, 168, 83, 0.12)', lightBorder: 'rgba(52, 168, 83, 0.5)', lightText: '#34a853'
      };
    }
    
    const palettes = [
      { solidBg: '#3b82f6', solidBorder: '#2563eb', lightBg: 'rgba(59, 130, 246, 0.12)', lightBorder: 'rgba(59, 130, 246, 0.5)', lightText: '#2563eb' }, // Blue
      { solidBg: '#8b5cf6', solidBorder: '#7c3aed', lightBg: 'rgba(139, 92, 246, 0.12)', lightBorder: 'rgba(139, 92, 246, 0.5)', lightText: '#7c3aed' }, // Violet
      { solidBg: '#ec4899', solidBorder: '#db2777', lightBg: 'rgba(236, 72, 153, 0.12)', lightBorder: 'rgba(236, 72, 153, 0.5)', lightText: '#db2777' }, // Pink
      { solidBg: '#34a853', solidBorder: '#34a853', lightBg: 'rgba(52, 168, 83, 0.12)', lightBorder: 'rgba(52, 168, 83, 0.5)', lightText: '#34a853' }, // Teal
      { solidBg: '#f43f5e', solidBorder: '#e11d48', lightBg: 'rgba(244, 63, 94, 0.12)', lightBorder: 'rgba(244, 63, 94, 0.5)', lightText: '#e11d48' }, // Rose
    ];
    
    let hash = 0;
    for (let i = 0; i < nameLower.length; i++) {
      hash = nameLower.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palettes.length;
    return palettes[index];
  }, []);

  const getTeacherColorStyle = useCallback((teachersInSlot: any[], currentLoggedInUserId: string | undefined) => {
    if (teachersInSlot.length > 1) {
      const containsMe = teachersInSlot.some(t => t.user_id === currentLoggedInUserId);
      // Sort consistently by first_name to ensure same order of colors & initials (e.g. M+P)
      const sortedTeachers = [...teachersInSlot].sort((a, b) => {
        const nameA = a.profiles?.first_name || '';
        const nameB = b.profiles?.first_name || '';
        return nameA.localeCompare(nameB, 'de-DE');
      });
      const themes = sortedTeachers.map(t => {
        const name = (t.profiles?.first_name || '').toLowerCase();
        return getTeacherTheme(name, t.user_id || '');
      });
      const color1 = themes[0]?.solidBg || '#f59e0b';
      const color2 = themes[1]?.solidBg || '#34a853';
      const lightColor1 = themes[0]?.lightBg || 'rgba(245, 158, 11, 0.12)';
      const lightColor2 = themes[1]?.lightBg || 'rgba(52, 168, 83, 0.12)';

      if (containsMe) {
        return {
          bgColor: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
          border: '1px solid #cbd5e1',
          textColor: 'white'
        };
      } else {
        return {
          bgColor: `linear-gradient(135deg, ${lightColor1} 0%, ${lightColor2} 100%)`,
          border: '1px dashed #cbd5e1',
          textColor: '#475569'
        };
      }
    }

    const primaryTeacher = teachersInSlot[0];
    const teacherName = (primaryTeacher?.profiles?.first_name || '').toLowerCase();
    const isMe = primaryTeacher?.user_id === currentLoggedInUserId;
    
    const theme = getTeacherTheme(teacherName, primaryTeacher?.user_id || '');

    if (isMe) {
      return {
        bgColor: theme.solidBg,
        border: `1px solid ${theme.solidBorder}`,
        textColor: 'white'
      };
    } else {
      return {
        bgColor: theme.lightBg,
        border: `1px dashed ${theme.lightBorder}`,
        textColor: theme.lightText
      };
    }
  }, [getTeacherTheme]);

  const getTeacherPresenceList = useCallback(() => {
    const schoolData = Array.isArray((user as any)?.schools) ? (user as any)?.schools[0] : (user as any)?.schools;
    const hours = schoolData?.opening_hours || {};

    const dayKeys: { [key: string]: string } = {
      'Mo': 'monday',
      'Di': 'tuesday',
      'Mi': 'wednesday',
      'Do': 'thursday',
      'Fr': 'friday',
      'Sa': 'saturday',
      'So': 'sunday'
    };

    const teacherSlots = (globalPlannedSlots || []).filter((s: any) => {
      const isRoleMatch = s.profiles?.role?.toLowerCase() === 'teacher' || 
                          s.profiles?.role?.toLowerCase() === 'admin';
      if (!isRoleMatch) return false;

      const dayKey = dayKeys[s.day];
      if (!dayKey) return false;
      const dayHours = hours[dayKey];
      if (!dayHours || dayHours.active === false) return false;

      return s.time >= dayHours.start && s.time < dayHours.end;
    });
    
    if (teacherSlots.length === 0) return [];

    const teacherGroups: { [userId: string]: { name: string; slots: { day: string; time: string }[] } } = {};
    
    teacherSlots.forEach((slot: any) => {
      const userId = slot.user_id;
      const name = slot.profiles?.first_name || 'Lehrer';
      if (!teacherGroups[userId]) {
        teacherGroups[userId] = { name, slots: [] };
      }
      teacherGroups[userId].slots.push({ day: slot.day, time: slot.time });
    });

    const presenceList: { teacherName: string; day: string; rangeStr: string; sortKey: number }[] = [];
    const dayOrder: { [day: string]: number } = { 'Mo': 1, 'Di': 2, 'Mi': 3, 'Do': 4, 'Fr': 5, 'Sa': 6, 'So': 7 };

    Object.values(teacherGroups).forEach(group => {
      const slotsByDay: { [day: string]: string[] } = {};
      group.slots.forEach(s => {
        if (!slotsByDay[s.day]) slotsByDay[s.day] = [];
        slotsByDay[s.day].push(s.time);
      });

      Object.entries(slotsByDay).forEach(([day, times]) => {
        times.sort();

        const add15 = (t: string) => {
          let [h, m] = t.split(':').map(Number);
          m += 15;
          if (m >= 60) { h += 1; m = 0; }
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        };

        const toMin = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };

        const ranges: { start: string; end: string }[] = [];
        let currentRange: { start: string; end: string } | null = null;

        times.forEach(t => {
          if (!currentRange) {
            currentRange = { start: t, end: add15(t) };
          } else {
            if (toMin(t) === toMin(currentRange.end)) {
              currentRange.end = add15(t);
            } else {
              ranges.push(currentRange);
              currentRange = { start: t, end: add15(t) };
            }
          }
        });
        if (currentRange) ranges.push(currentRange);

        ranges.forEach(r => {
          presenceList.push({
            teacherName: group.name,
            day,
            rangeStr: `${r.start} Uhr - ${r.end} Uhr`,
            sortKey: (dayOrder[day] || 99) * 10000 + toMin(r.start)
          });
        });
      });
    });

    presenceList.sort((a, b) => a.sortKey - b.sortKey);
    return presenceList;
  }, [user, globalPlannedSlots]);

  const school = useMemo(() => Array.isArray(user?.schools) ? user.schools[0] : user?.schools, [user]);
  
  const trialDaysLeft = useMemo(() => {
    if (school?.is_trial && school?.trial_ends_at) {
      const end = new Date(school.trial_ends_at).getTime();
      const now = new Date().getTime();
      return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    }
    return null;
  }, [school]);

  const handleInstallPWA = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  }, [deferredPrompt, setDeferredPrompt, setShowInstallBanner]);

  const handleDismissInstall = useCallback(() => {
    setShowInstallBanner(false);
    localStorage.setItem('groovelab_install_prompt_dismissed', String(Date.now()));
  }, [setShowInstallBanner]);

  return {
    calculateSkillXP,
    studentRadarData,
    totalPracticeMins,
    practiceSongs,
    repertoireSongs,
    groupedPracticeSongs,
    groupedRepertoireSongs,
    getTeacherTheme,
    getTeacherColorStyle,
    getTeacherPresenceList,
    school,
    trialDaysLeft,
    handleInstallPWA,
    handleDismissInstall
  };
}
