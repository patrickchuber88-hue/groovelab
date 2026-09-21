import { useState, useEffect, useCallback, useMemo } from 'react';
import { MilestoneData, CustomPlaylist, DEFAULT_MILESTONES, SchoolYearLP, computeActiveSchoolYears } from '../types';
import { getBlob, storeBlob, deleteBlob } from '../../../../utils/blobStorage';
import { checkIsAudioTresorActive } from '../../../../domain/stickersAndTresor';
import { supabase } from '../../../../lib/supabase';

interface UseAudioBiographyDataProps {
  studentId: string;
  student: any;
  hasTresorStorage?: boolean;
}

export function useAudioBiographyData(
  propsOrStudent: UseAudioBiographyDataProps | any,
  maybeStudentId?: string
) {
  const studentId = (propsOrStudent && typeof propsOrStudent === 'object' && 'studentId' in propsOrStudent && propsOrStudent.studentId)
    ? propsOrStudent.studentId
    : (maybeStudentId || propsOrStudent?.id || propsOrStudent?.student_id || 'anonymous_student');

  const student = (propsOrStudent && typeof propsOrStudent === 'object' && 'student' in propsOrStudent)
    ? propsOrStudent.student
    : propsOrStudent;

  const explicitHasTresor = (propsOrStudent && typeof propsOrStudent === 'object' && 'hasTresorStorage' in propsOrStudent)
    ? propsOrStudent.hasTresorStorage
    : undefined;

  const STORAGE_KEY = `campus_audio_milestones_${studentId}`;
  const LEGACY_STORAGE_KEY = `campus_audio_biography_${studentId}`;
  const PLAYLISTS_KEY = `campus_audio_playlists_${studentId}`;
  const LEGACY_PLAYLISTS_KEY = `campus_custom_playlists_${studentId}`;
  const THEME_KEY = 'campus_audio_bio_theme';

  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load theme
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
    } catch (e) {
      console.warn('Could not read theme:', e);
    }
  }, []);

  const toggleTheme = useCallback((forcedTheme?: 'dark' | 'light') => {
    setTheme(prev => {
      const next = forcedTheme || (prev === 'light' ? 'dark' : 'light');
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {
        console.warn('Could not save theme:', e);
      }
      return next;
    });
  }, []);

  // Hydration of Milestones and Playlists from LocalStorage + IndexedDB
  useEffect(() => {
    let isCancelled = false;

    const loadAndHydrate = async () => {
      try {
        setIsLoading(true);

        // 1. Milestones
        let loadedMilestones: MilestoneData[] = [];
        const savedMilestones = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
        if (savedMilestones) {
          try {
            const parsed = JSON.parse(savedMilestones);
            loadedMilestones = DEFAULT_MILESTONES.map((def, idx) => {
              const existing = Array.isArray(parsed)
                ? parsed.find((p: any) => p.type === def.type || p.id === `ms_${def.type}_${idx}` || p.id?.includes(def.type))
                : null;
              if (existing) {
                return {
                  ...existing,
                  id: `ms_${def.type}_${idx}`,
                  type: def.type,
                  stepNumber: def.stepNumber,
                  title: def.title,
                  subtitle: def.subtitle,
                  iconName: def.iconName,
                  schoolYear: def.schoolYear || '2026/2027'
                };
              }
              return {
                ...def,
                id: `ms_${def.type}_${idx}`,
                visibility: 'private',
                version: 1,
                isUnerasable: false,
                isVerified: false
              };
            });
          } catch {
            loadedMilestones = DEFAULT_MILESTONES.map((def, idx) => ({
              ...def,
              id: `ms_${def.type}_${idx}`,
              visibility: 'private',
              version: 1,
              isUnerasable: false,
              isVerified: false
            }));
          }
        } else {
          loadedMilestones = DEFAULT_MILESTONES.map((def, idx) => ({
            ...def,
            id: `ms_${def.type}_${idx}`,
            visibility: 'private',
            version: 1,
            isUnerasable: false,
            isVerified: false
          }));
        }

        // Hydrate audio blobs from IndexedDB
        const hydratedMilestones = await Promise.all(
          loadedMilestones.map(async (m) => {
            const rawBlob = await getBlob(`campus_audio_${m.id}_raw`);
            const masterBlob = await getBlob(`campus_audio_${m.id}_master`);
            let audioUrl = m.audioUrl;
            let masteredAudioUrl = m.masteredAudioUrl;

            if (rawBlob && rawBlob instanceof Blob) {
              audioUrl = URL.createObjectURL(rawBlob);
            }
            if (masterBlob && masterBlob instanceof Blob) {
              masteredAudioUrl = URL.createObjectURL(masterBlob);
            }

            let hydratedHistory = m.history;
            if (m.history && Array.isArray(m.history) && m.history.length > 0) {
              hydratedHistory = await Promise.all(
                m.history.map(async (ver) => {
                  const vRawBlob = await getBlob(`campus_audio_${ver.id}_raw`);
                  const vMasterBlob = await getBlob(`campus_audio_${ver.id}_master`);
                  let vAudioUrl = ver.audioUrl;
                  let vMasteredUrl = ver.masteredAudioUrl;
                  if (vRawBlob && vRawBlob instanceof Blob) {
                    vAudioUrl = URL.createObjectURL(vRawBlob);
                  }
                  if (vMasterBlob && vMasterBlob instanceof Blob) {
                    vMasteredUrl = URL.createObjectURL(vMasterBlob);
                  }
                  return {
                    ...ver,
                    audioUrl: vAudioUrl || ver.audioUrl,
                    masteredAudioUrl: vMasteredUrl || ver.masteredAudioUrl
                  };
                })
              );
            }

            return {
              ...m,
              audioUrl: audioUrl || m.audioUrl,
              masteredAudioUrl: masteredAudioUrl || m.masteredAudioUrl,
              history: hydratedHistory
            };
          })
        );

        if (!isCancelled) {
          setMilestones(hydratedMilestones);
        }

        // 2. Playlists
        const starterPlaylists: CustomPlaylist[] = [
          {
            id: 'pl_meilenstein_lp',
            title: '🌟 Meine Meilenstein-LP',
            description: 'Mein musikalisches Lebenswerk – Die wichtigsten Meilensteine',
            vibeTheme: 'sunset_gold',
            iconName: 'star',
            createdAt: 'Schuljahr 2026/2027',
            tracks: []
          },
          {
            id: 'pl_weihnachten',
            title: '🎄 Meine Weihnachts-Playlist',
            description: 'Festliche Klänge für Heiligabend, Familie & Freunde',
            vibeTheme: 'vintage_tape',
            iconName: 'gift',
            createdAt: 'Schuljahr 2026/2027',
            tracks: []
          },
          {
            id: 'pl_lieblingssongs',
            title: '⭐ Meine Lieblingslieder-Playlist',
            description: 'Tracks, die ich einfach immer wieder gerne spiele',
            vibeTheme: 'cyber_neon',
            iconName: 'heart',
            createdAt: 'Schuljahr 2026/2027',
            tracks: []
          },
          {
            id: 'pl_sommerhits',
            title: '☀️ Meine Sommerhits-Playlist',
            description: 'Sonnige Songs, Urlaubs-Soundtracks & Sommerkonzert-Highlights',
            vibeTheme: 'sunset_gold',
            iconName: 'sun',
            createdAt: 'Schuljahr 2026/2027',
            tracks: []
          }
        ];

        let loadedPlaylists: CustomPlaylist[] = [];
        const savedPlaylists = localStorage.getItem(PLAYLISTS_KEY) || localStorage.getItem(LEGACY_PLAYLISTS_KEY);
        if (savedPlaylists) {
          try {
            const parsed = JSON.parse(savedPlaylists);
            const playlistArray = Array.isArray(parsed) ? parsed : [];
            loadedPlaylists = playlistArray.map((pl: CustomPlaylist) => {
              const safeTracks = Array.isArray(pl?.tracks) ? pl.tracks : [];
              if (pl.id === 'pl_sommer_2026' || pl.title?.includes('Sommerkonzert 2026')) {
                return {
                  ...pl,
                  tracks: safeTracks,
                  id: pl.id === 'pl_sommer_2026' ? 'pl_sommerhits' : pl.id,
                  title: '☀️ Meine Sommerhits-Playlist',
                  description: pl.description || 'Sonnige Songs, Urlaubs-Soundtracks & Sommerkonzert-Highlights'
                };
              }
              if (pl.title === '⭐ Meine absoluten Lieblingssongs') {
                return {
                  ...pl,
                  tracks: safeTracks,
                  title: '⭐ Meine Lieblingslieder-Playlist'
                };
              }
              return {
                ...pl,
                tracks: safeTracks
              };
            });

            loadedPlaylists.sort((a, b) => {
              const getOrder = (p: CustomPlaylist) => {
                if (p.id === 'pl_meilenstein_lp') return 0;
                if (p.id === 'pl_weihnachten' || p.title?.toLowerCase().includes('weihnacht')) return 1;
                if (p.id === 'pl_lieblingssongs' || p.title?.toLowerCase().includes('lieblings')) return 2;
                if (p.id === 'pl_sommerhits' || p.id === 'pl_sommer_2026' || p.title?.toLowerCase().includes('sommer')) return 3;
                return 4;
              };
              return getOrder(a) - getOrder(b);
            });
          } catch {
            loadedPlaylists = starterPlaylists;
          }
        } else {
          loadedPlaylists = starterPlaylists;
          try {
            localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(starterPlaylists));
            localStorage.setItem(LEGACY_PLAYLISTS_KEY, JSON.stringify(starterPlaylists));
          } catch (e) {
            console.warn('Could not seed starter playlists:', e);
          }
        }

        const hydratedPlaylists = await Promise.all(
          loadedPlaylists.map(async (pl) => {
            const safeTracks = Array.isArray(pl?.tracks) ? pl.tracks : [];
            const hydratedTracks = await Promise.all(
              safeTracks.map(async (t) => {
                const rawBlob = await getBlob(`campus_audio_${t.id}_raw`);
                const masterBlob = await getBlob(`campus_audio_${t.id}_master`);
                let aUrl = t.audioUrl;
                let mUrl = t.masteredAudioUrl;
                if (rawBlob && rawBlob instanceof Blob) aUrl = URL.createObjectURL(rawBlob);
                if (masterBlob && masterBlob instanceof Blob) mUrl = URL.createObjectURL(masterBlob);
                return {
                  ...t,
                  audioUrl: aUrl || t.audioUrl,
                  masteredAudioUrl: mUrl || t.masteredAudioUrl
                };
              })
            );
            return {
              ...pl,
              tracks: hydratedTracks
            };
          })
        );

        if (!isCancelled) {
          setCustomPlaylists(hydratedPlaylists);
        }
      } catch (err) {
        console.error('Error hydrating audio biography data:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadAndHydrate();

    return () => {
      isCancelled = true;
    };
  }, [STORAGE_KEY, LEGACY_STORAGE_KEY, PLAYLISTS_KEY, LEGACY_PLAYLISTS_KEY]);

  const saveMilestones = useCallback((updated: MilestoneData[]) => {
    setMilestones(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not persist milestones:', e);
    }
  }, [STORAGE_KEY, LEGACY_STORAGE_KEY]);

  const savePlaylists = useCallback((updated: CustomPlaylist[]) => {
    setCustomPlaylists(updated);
    try {
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
      localStorage.setItem(LEGACY_PLAYLISTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not persist playlists:', e);
    }
  }, [PLAYLISTS_KEY, LEGACY_PLAYLISTS_KEY]);

  // Active music school years dynamically computed from student registration date (created_at)
  const activeSchoolYears: SchoolYearLP[] = useMemo(() => {
    return computeActiveSchoolYears(student?.created_at || student?.registered_at);
  }, [student?.created_at, student?.registered_at]);

  const isLight = theme === 'light';

  // HIGH-CONTRAST SPOTIFY ENTERPRISE COLOR TOKENS
  const colors = useMemo(() => ({
    bg: isLight ? '#f8fafc' : '#121212',
    bgMesh: isLight 
      ? 'radial-gradient(circle at top right, rgba(16,185,129,0.06), transparent 50%)' 
      : 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(30, 215, 96, 0.08) 0%, #121212 100%)',
    textPrimary: isLight ? '#0f172a' : '#ffffff',
    textSecondary: isLight ? '#334155' : '#b3b3b3',
    textMuted: isLight ? '#475569' : '#727272',
    cardBg: isLight ? '#ffffff' : '#181818',
    cardBgHover: isLight ? '#f8fafc' : '#242424',
    cardBgHighlight: isLight ? '#f0fdf4' : '#1f2937',
    cardBorder: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)',
    cardBorderHover: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.20)',
    cardBorderHighlight: isLight ? '#86efac' : 'rgba(30, 215, 96, 0.5)',
    panelBg: isLight ? '#f1f5f9' : 'rgba(24, 24, 24, 0.85)',
    panelBorder: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.08)',
    noteBg: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.05)',
    noteBorder: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)',
    shadow: isLight ? '0 4px 20px rgba(0, 0, 0, 0.06)' : '0 10px 30px rgba(0, 0, 0, 0.65)',
    spotifyGreen: '#1ed760',
    emerald: '#10b981',
    gold: '#f59e0b'
  }), [isLight]);

  // 🛡️ Audio-Tresor Storage Add-on Access Gate
  const [tresorAccessLoading, setTresorAccessLoading] = useState<boolean>(true);
  const [hasAudioTresorStorage, setHasAudioTresorStorage] = useState<boolean>(true);

  // Check School Audio-Tresor Storage Add-on Status
  useEffect(() => {
    let isCancelled = false;
    const checkStorageAddon = async () => {
      // Fast path 0: Explicit prop or student boolean
      if (
        explicitHasTresor === true ||
        student?.hasTresorStorage === true ||
        student?.has_tresor_storage === true
      ) {
        if (!isCancelled) {
          setHasAudioTresorStorage(true);
          setTresorAccessLoading(false);
        }
        return;
      }

      // Fast path 1: Canonical helper check
      if (checkIsAudioTresorActive(student)) {
        if (!isCancelled) {
          setHasAudioTresorStorage(true);
          setTresorAccessLoading(false);
        }
        return;
      }

      // Fast path 2: Localhost / Development / Reference school bypass ("musäk", "bad säckingen")
      const hostname = typeof window !== 'undefined' ? window.location?.hostname : '';
      const isLocalOrDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('webcontainer') || hostname.includes('stackblitz');
      const schoolName = (student?.school_name || student?.schools?.name || (typeof localStorage !== 'undefined' ? localStorage.getItem('campus_school_name') : '') || '').toLowerCase();
      const isReferenceSchool = schoolName.includes('bad säckingen') || schoolName.includes('musäk') || schoolName.includes('musaek');

      if (isLocalOrDev || isReferenceSchool) {
        if (!isCancelled) {
          setHasAudioTresorStorage(true);
          setTresorAccessLoading(false);
        }
        return;
      }

      // Fast path 2: Direct Props & Joined School Inspection
      if (student?.schools) {
        const activeGb = Number(student.schools.storage_addon_gb || 0);
        const isStatusValid = student.schools.storage_addon_status !== 'cancelled';
        if (activeGb > 0 && isStatusValid) {
          if (!isCancelled) {
            setHasAudioTresorStorage(true);
            setTresorAccessLoading(false);
          }
          return;
        }
      }

      if (student?.storage_addon_gb !== undefined && student?.storage_addon_gb !== null) {
        const activeGb = Number(student.storage_addon_gb || 0);
        if (activeGb > 0) {
          if (!isCancelled) {
            setHasAudioTresorStorage(true);
            setTresorAccessLoading(false);
          }
          return;
        }
      }

      let targetSchoolId = 
        student?.school_id || 
        (student as any)?.schoolId || 
        (student as any)?.schools?.id ||
        (window as any).__groovelab_school_id || 
        localStorage.getItem('groovelab_school_id') || 
        localStorage.getItem('campus_school_id') || 
        localStorage.getItem('school_id') ||
        sessionStorage.getItem('groovelab_school_id') ||
        sessionStorage.getItem('groovelab_ghost_school_id');

      let schoolData: any = null;

      // 1. Lookup by targetSchoolId
      if (targetSchoolId) {
        try {
          const { data } = await supabase
            .from('schools')
            .select('*')
            .eq('id', targetSchoolId)
            .maybeSingle();
          if (data) schoolData = data;
        } catch (e) {
          console.warn('[Storage Check] ID lookup note:', e);
        }
      }

      // 2. Lookup by student.school_name if ID was missing or not found
      if (!schoolData && (student?.school_name || localStorage.getItem('campus_school_name'))) {
        const sName = student?.school_name || localStorage.getItem('campus_school_name');
        if (sName) {
          try {
            const { data } = await supabase
              .from('schools')
              .select('*')
              .ilike('name', `%${sName}%`)
              .maybeSingle();
            if (data) schoolData = data;
          } catch (e) {
            console.warn('[Storage Check] Name lookup note:', e);
          }
        }
      }

      // 3. Fallback: Query primary active school
      if (!schoolData) {
        try {
          const { data } = await supabase
            .from('schools')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) schoolData = data;
        } catch (e) {
          console.warn('[Storage Check] Primary school fallback lookup note:', e);
        }
      }

      // 4. Merge localStorage Overrides (from Secretary/Admin live bookings)
      try {
        const overridesStr = localStorage.getItem('groovelab_school_overrides') || localStorage.getItem('campus_school_overrides');
        if (overridesStr) {
          const overrides = JSON.parse(overridesStr);
          const sId = targetSchoolId || schoolData?.id;
          if (sId && overrides[sId]) {
            schoolData = { ...(schoolData || {}), ...overrides[sId] };
          } else {
            const allEntries = Object.values(overrides) as any[];
            const activeEntry = allEntries.find(e => Number(e.storage_addon_gb || 0) > 0 && e.storage_addon_status !== 'cancelled');
            if (activeEntry) {
              schoolData = { ...(schoolData || {}), ...activeEntry };
            }
          }
        }
      } catch (e) {
        console.warn('[Storage Check] Overrides check error:', e);
      }

      if (!isCancelled) {
        const activeGb = Number(schoolData?.storage_addon_gb || 0);
        const isStatusValid = schoolData?.storage_addon_status !== 'cancelled';
        const isAddonActive = activeGb > 0 && isStatusValid;

        setHasAudioTresorStorage(Boolean(isAddonActive));
        setTresorAccessLoading(false);
      }
    };

    checkStorageAddon();
    return () => { isCancelled = true; };
  }, [student, studentId, explicitHasTresor]);

  // 👏 Live Familien-Reaktionen & Applaus State
  const [playlistReactions, setPlaylistReactions] = useState<{ [playlistId: string]: { bravo: number; love: number; fire: number; star: number; total: number } }>({});

  const nextMilestone = useMemo(() => {
    return milestones.find(m => !m.audioUrl) || null;
  }, [milestones]);

  const isAllMilestonesCompleted = useMemo(() => {
    return milestones.length >= (DEFAULT_MILESTONES.length || 10) && milestones.every(m => !!m.audioUrl);
  }, [milestones]);

  const station1 = useMemo(() => milestones.find(m => m.stepNumber === 1 && m.audioUrl), [milestones]);
  const stationFinal = useMemo(() => milestones.find(m => m.stepNumber === 10 && m.audioUrl) || milestones.find(m => m.stepNumber === 9 && m.audioUrl), [milestones]);
  const canPlayAB = !!station1 && !!stationFinal;
  const abRecordedCount = (station1 ? 1 : 0) + (stationFinal ? 1 : 0);

  return {
    milestones,
    setMilestones,
    saveMilestones,
    customPlaylists,
    setCustomPlaylists,
    savePlaylists,
    activeSchoolYears,
    theme,
    setTheme,
    toggleTheme,
    isLight,
    colors,
    hasAudioTresorStorage,
    tresorAccessLoading,
    playlistReactions,
    setPlaylistReactions,
    nextMilestone,
    isAllMilestonesCompleted,
    canPlayAB,
    abRecordedCount,
    isLoading
  };
}

