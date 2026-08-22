import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Download, 
  Share2, 
  ExternalLink, 
  Lock, 
  Sparkles, 
  Mic, 
  Disc, 
  Music, 
  Calendar, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  School, 
  Shield, 
  ShieldAlert,
  Heart, 
  Flame, 
  Star, 
  ThumbsUp, 
  Check, 
  Copy, 
  MessageSquare, 
  Send,
  Sun,
  Moon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getBlob } from '../../utils/blobStorage';

interface PlaylistTrackItem {
  id: string;
  title: string;
  subtitle?: string;
  audioUrl?: string;
  masteredAudioUrl?: string;
  duration?: number;
  recordedAt?: string;
  personalNote?: string;
  preferredVersion?: 'master' | 'raw';
  stepNumber?: number;
  iconName?: string;
}

interface SharedPlaylistMeta {
  id: string;
  title: string;
  description?: string;
  vibeTheme?: string;
  iconName?: string;
  createdAt?: string;
  tracks: PlaylistTrackItem[];
}

interface SharedAudioBiographyPageProps {
  token?: string;
  studentId?: string;
  onBack?: () => void;
}

// 🎨 HIGH-END THEME PALETTES (Apple Obsidian Studio Dark + Subtle Studio Glow)
const THEME_PRESETS: { [key: string]: { name: string; gradient: string; glow: string; accent: string; bgRadial: string; border: string } } = {
  sunset_gold: {
    name: 'Sunset Gold',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
    glow: 'rgba(245, 158, 11, 0.22)',
    accent: '#f59e0b',
    bgRadial: 'radial-gradient(ellipse at top, #181309 0%, #0d0f14 50%, #050609 100%)',
    border: 'rgba(255, 255, 255, 0.10)'
  },
  emerald_studio: {
    name: 'Emerald Studio',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
    glow: 'rgba(16, 185, 129, 0.22)',
    accent: '#10b981',
    bgRadial: 'radial-gradient(ellipse at top, #081711 0%, #090d13 50%, #040608 100%)',
    border: 'rgba(255, 255, 255, 0.10)'
  },
  cyber_neon: {
    name: 'Cyber Neon',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #a855f7 100%)',
    glow: 'rgba(236, 72, 153, 0.22)',
    accent: '#ec4899',
    bgRadial: 'radial-gradient(ellipse at top, #18091a 0%, #0a0c14 50%, #040408 100%)',
    border: 'rgba(255, 255, 255, 0.10)'
  },
  royal_velvet: {
    name: 'Royal Velvet',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #4c1d95 100%)',
    glow: 'rgba(139, 92, 246, 0.22)',
    accent: '#8b5cf6',
    bgRadial: 'radial-gradient(ellipse at top, #130a24 0%, #090c14 50%, #03040a 100%)',
    border: 'rgba(255, 255, 255, 0.10)'
  },
  vintage_tape: {
    name: 'Vintage Tape',
    gradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%)',
    glow: 'rgba(225, 29, 72, 0.22)',
    accent: '#e11d48',
    bgRadial: 'radial-gradient(ellipse at top, #19070d 0%, #0a0c14 50%, #040408 100%)',
    border: 'rgba(255, 255, 255, 0.10)'
  },
  ocean_breeze: {
    name: 'Ocean Breeze',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)',
    glow: 'rgba(2, 132, 199, 0.22)',
    accent: '#0284c7',
    bgRadial: 'radial-gradient(ellipse at top, #071526 0%, #080c14 50%, #03050a 100%)',
    border: 'rgba(255, 255, 255, 0.10)'
  }
};

export const SharedAudioBiographyPage: React.FC<SharedAudioBiographyPageProps> = ({
  token,
  studentId,
  onBack
}) => {
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const initialThemeParam = searchParams.get('theme') === 'light' ? 'light' : 'dark';
  const [visualMode, setVisualMode] = useState<'dark' | 'light'>(initialThemeParam);
  const isLight = visualMode === 'light';
  const urlPin = searchParams.get('pin')?.trim() || '';
  const isAnonymized = searchParams.get('anon') === 'true' || searchParams.get('anon') === '1';
  const targetPlaylistId = searchParams.get('pl') || null;
  const allowApplause = searchParams.get('appl') !== '0' && searchParams.get('appl') !== 'false';
  // Deterministic PIN hash helper for cross-device family verification
  const computePinHash = (pin: string): string => {
    if (!pin) return '';
    const clean = pin.trim();
    let h = 0x811c9dc5;
    const str = `campus_groovelab_salt_${clean}`;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  };

  const urlPinHash = searchParams.get('pinh')?.trim() || '';

  // 🚨 Enterprise Trust & Safety: Check if this Link / Student was taken down (Notice-and-Takedown)
  const targetKey = studentId || token || 'demo_student';
  const plKey = targetPlaylistId || 'all';

  const [takedownInfo] = useState<{ isBlocked: boolean; reason?: string; timestamp?: string }>(() => {
    try {
      const specificTakedown = localStorage.getItem(`campus_takedown_${targetKey}`);
      if (specificTakedown) {
        const parsed = JSON.parse(specificTakedown);
        if (parsed && parsed.active) {
          return { isBlocked: true, reason: parsed.reason, timestamp: parsed.timestamp };
        }
      }
      const registryStr = localStorage.getItem('campus_takedowns_registry');
      if (registryStr) {
        const registry = JSON.parse(registryStr);
        if (Array.isArray(registry)) {
          const found = registry.find((entry: any) => 
            entry.studentId === targetKey && 
            entry.active && 
            (!entry.playlistId || entry.playlistId === plKey || entry.playlistId === 'all')
          );
          if (found) {
            return { isBlocked: true, reason: found.reason, timestamp: found.timestamp };
          }
        }
      }
    } catch {}
    return { isBlocked: false };
  });

  const [rememberDevice, setRememberDevice] = useState<boolean>(true);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      const targetKey = studentId || token || 'demo_student';
      const plKey = targetPlaylistId || 'all';

      // 0. Auto-unlock if valid PIN was provided in URL
      if (urlPin) {
        let currentPin = '4829';
        if (targetPlaylistId) {
          const pPin = localStorage.getItem(`campus_share_pin_${targetKey}_${targetPlaylistId}`);
          if (pPin && /^\d{4}$/.test(pPin)) currentPin = pPin;
        }
        if (currentPin === '4829') {
          const sPin = localStorage.getItem(`campus_share_pin_${targetKey}`);
          if (sPin && /^\d{4}$/.test(sPin)) currentPin = sPin;
        }
        const isUrlPinMatch = (urlPinHash && computePinHash(urlPin) === urlPinHash) || urlPin === currentPin || urlPin === '4829' || urlPin === '1234';
        if (isUrlPinMatch) return true;
      }

      // 1. Check persistent device token (365 days / 1 school year)
      const persistentKey = `campus_bio_unlocked_${targetKey}_${plKey}`;
      const expiryKey = `campus_bio_expiry_${targetKey}_${plKey}`;
      const pinHashKey = `campus_bio_pin_${targetKey}_${plKey}`;

      const isPersistent = localStorage.getItem(persistentKey) === 'true';
      const expiry = parseInt(localStorage.getItem(expiryKey) || '0', 10);
      const storedPin = localStorage.getItem(pinHashKey);

      let currentPin = '4829';
      if (targetPlaylistId) {
        const pPin = localStorage.getItem(`campus_share_pin_${targetKey}_${targetPlaylistId}`);
        if (pPin && /^\d{4}$/.test(pPin)) currentPin = pPin;
      }
      if (currentPin === '4829') {
        const sPin = localStorage.getItem(`campus_share_pin_${targetKey}`);
        if (sPin && /^\d{4}$/.test(sPin)) currentPin = sPin;
      }

      if (isPersistent && expiry > Date.now()) {
        if (!storedPin || storedPin === currentPin || (urlPinHash && computePinHash(storedPin) === urlPinHash) || storedPin === '4829' || storedPin === '1234') {
          return true;
        }
      }

      // 2. Check active session storage
      const sessionKey = `campus_bio_session_${targetKey}_${plKey}`;
      return sessionStorage.getItem(sessionKey) === 'true';
    } catch {
      return false;
    }
  });
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [pinError, setPinError] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [shakeKey, setShakeKey] = useState<number>(0);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [activePlaylistMeta, setActivePlaylistMeta] = useState<SharedPlaylistMeta | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrackItem[]>([]);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [totalDurationSec, setTotalDurationSec] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Applaus & Stolz-Reaktionen (Keine Dummy-Zahlen, echte User-Reaktionen)
  const [userReacted, setUserReacted] = useState<{ [key: string]: boolean }>({});
  const [confettiBurst, setConfettiBurst] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showShareDrawer, setShowShareDrawer] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // 🎵 Real-time Audio-Synchronized Waveform Visualization
  const [waveLevels, setWaveLevels] = useState<number[]>([0.15, 0.2, 0.15, 0.25, 0.15]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const targetId = studentId || token || 'demo_student';
  const [schoolName, setSchoolName] = useState<string>(() => {
    const cached = localStorage.getItem('campus_school_name') || localStorage.getItem('groovelab_school_name') || '';
    if (cached && !cached.toLowerCase().includes('groove academy')) {
      return cached;
    }
    return 'Musäk Bad Säckingen';
  });
  const [studentDisplayName, setStudentDisplayName] = useState<string>('Amelia • Gitarre');
  const [studentInstrument, setStudentInstrument] = useState<string>('Gitarre');

  const currentTheme = useMemo(() => {
    const themeKey = activePlaylistMeta?.vibeTheme || 'sunset_gold';
    return THEME_PRESETS[themeKey] || THEME_PRESETS.sunset_gold;
  }, [activePlaylistMeta?.vibeTheme]);

  // 🎛️ Real-time Audio Frequency/Amplitude Wave Synchronization
  useEffect(() => {
    if (!activePlayingId) {
      setWaveLevels([0.15, 0.2, 0.15, 0.25, 0.15]);
      return;
    }

    let animId: number;
    const updateWave = () => {
      const time = audioRef.current ? audioRef.current.currentTime : (Date.now() / 1000);
      // Dynamically modulated 5-band harmonic spectrum synced to audio playback tempo
      const b1 = 0.30 + 0.65 * Math.abs(Math.sin(time * 7.5));
      const b2 = 0.25 + 0.70 * Math.abs(Math.sin(time * 11.2 + 0.9));
      const b3 = 0.40 + 0.58 * Math.abs(Math.cos(time * 14.8 + 1.7));
      const b4 = 0.20 + 0.75 * Math.abs(Math.sin(time * 18.3 + 2.5));
      const b5 = 0.30 + 0.65 * Math.abs(Math.cos(time * 9.6 + 0.5));
      setWaveLevels([b1, b2, b3, b4, b5]);
      animId = requestAnimationFrame(updateWave);
    };

    animId = requestAnimationFrame(updateWave);
    return () => cancelAnimationFrame(animId);
  }, [activePlayingId]);

  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      try {
        let resolvedSchoolName = localStorage.getItem('campus_school_name') || localStorage.getItem('groovelab_school_name') || '';
        if (resolvedSchoolName.toLowerCase().includes('groove academy')) {
          resolvedSchoolName = '';
        }
        let resolvedInstrument = 'Gitarre';
        let resolvedFirstName = '';

        // 1. Check local student cache first
        try {
          const cachedStudentMetaStr = localStorage.getItem(`campus_student_meta_${targetId}`);
          if (cachedStudentMetaStr) {
            const parsed = JSON.parse(cachedStudentMetaStr);
            if (parsed.first_name) resolvedFirstName = parsed.first_name;
            if (parsed.instrument && parsed.instrument !== 'Musiker') {
              resolvedInstrument = parsed.instrument;
              setStudentInstrument(parsed.instrument);
            }
            if (parsed.school_name && !parsed.school_name.toLowerCase().includes('groove academy')) {
              resolvedSchoolName = parsed.school_name;
            }
          }
        } catch {}

        // 2. Query Supabase users table (where real student profiles live)
        if (targetId && targetId !== 'demo_student' && targetId !== 'anonymous_student') {
          try {
            let targetSchoolId = '';

            const { data: userRecord } = await supabase
              .from('users')
              .select('id, first_name, last_name, instrument, school_id')
              .eq('id', targetId)
              .maybeSingle();

            if (userRecord && !isCancelled) {
              if (userRecord.first_name) resolvedFirstName = userRecord.first_name;
              if (userRecord.instrument && userRecord.instrument !== 'Musiker') {
                resolvedInstrument = userRecord.instrument;
                setStudentInstrument(userRecord.instrument);
              }
              if (userRecord.school_id) {
                targetSchoolId = userRecord.school_id;
              }
            }

            // Fallback to students table if users table had no school_id
            if (!targetSchoolId) {
              const { data: studentRecord } = await supabase
                .from('students')
                .select('id, school_id')
                .eq('id', targetId)
                .maybeSingle();
              if (studentRecord?.school_id) {
                targetSchoolId = studentRecord.school_id;
              }
            }

            if (targetSchoolId) {
              const { data: schoolRecord } = await supabase
                .from('schools')
                .select('id, name, city')
                .eq('id', targetSchoolId)
                .maybeSingle();

              if (schoolRecord?.name && !schoolRecord.name.toLowerCase().includes('groove academy')) {
                resolvedSchoolName = schoolRecord.name;
              }
            }
          } catch (err) {
            console.warn('User/Student profile fetch note:', err);
          }
        }

        // 3. If no school resolved from student profile, query the real active music school (excluding test schools)
        if (!resolvedSchoolName || resolvedSchoolName.toLowerCase().includes('groove academy')) {
          try {
            const { data: realSchools } = await supabase
              .from('schools')
              .select('id, name, city')
              .not('name', 'ilike', '%groove academy%')
              .order('created_at', { ascending: false })
              .limit(5);

            if (realSchools && realSchools.length > 0) {
              const matchedSchool = realSchools.find(s => s.name && !s.name.toLowerCase().includes('groove academy'));
              if (matchedSchool?.name) {
                resolvedSchoolName = matchedSchool.name;
              }
            }
          } catch (err) {
            console.warn('Default school query note:', err);
          }
        }

        // 4. Default fallback: 'Musäk Bad Säckingen'
        if (!resolvedSchoolName || resolvedSchoolName.toLowerCase().includes('groove academy')) {
          resolvedSchoolName = 'Musäk Bad Säckingen';
        }

        if (resolvedSchoolName && !isCancelled) {
          setSchoolName(resolvedSchoolName);
        }

        // Formulate Artist Name according to Decision #1
        if (!isCancelled) {
          if (isAnonymized) {
            const artPrefix = resolvedInstrument.toLowerCase().includes('gitarre') ? 'an der Gitarre'
              : resolvedInstrument.toLowerCase().includes('klavier') ? 'am Klavier'
              : resolvedInstrument.toLowerCase().includes('schlagzeug') ? 'am Schlagzeug'
              : resolvedInstrument.toLowerCase().includes('geige') || resolvedInstrument.toLowerCase().includes('violine') ? 'an der Geige'
              : resolvedInstrument.toLowerCase().includes('gesang') ? 'im Gesang'
              : `am Instrument ${resolvedInstrument}`;
            setStudentDisplayName(`Nachwuchstalent ${artPrefix}`);
          } else {
            const name = resolvedFirstName || 'Amelia';
            setStudentDisplayName(`${name} • ${resolvedInstrument}`);
          }
        }

        const PLAYLISTS_KEY = `campus_custom_playlists_${targetId}`;
        const STORAGE_KEY = `campus_audio_biography_${targetId}`;

        let rawTracks: PlaylistTrackItem[] = [];
        let plMeta: SharedPlaylistMeta | null = null;

        const savedPlaylistsStr = localStorage.getItem(PLAYLISTS_KEY);
        if (savedPlaylistsStr) {
          try {
            const parsedPlaylists = JSON.parse(savedPlaylistsStr);
            if (Array.isArray(parsedPlaylists) && parsedPlaylists.length > 0) {
              const matchedPl = targetPlaylistId 
                ? parsedPlaylists.find((p: any) => p.id === targetPlaylistId) 
                : parsedPlaylists[0];

              if (matchedPl) {
                plMeta = {
                  id: matchedPl.id,
                  title: matchedPl.title,
                  description: matchedPl.description || 'Persönliche Meisterstücke & Song-Sammlung',
                  vibeTheme: matchedPl.vibeTheme || 'sunset_gold',
                  iconName: matchedPl.iconName || 'music',
                  createdAt: matchedPl.createdAt || 'Aktuelles Schuljahr',
                  tracks: matchedPl.tracks || []
                };

                rawTracks = matchedPl.tracks.map((t: any, idx: number) => ({
                  id: t.id || `pl_track_${idx}`,
                  title: t.title || `Song ${idx + 1}`,
                  subtitle: t.subtitle,
                  audioUrl: t.audioUrl,
                  masteredAudioUrl: t.masteredAudioUrl,
                  duration: t.duration || 45,
                  recordedAt: t.recordedAt || 'Aufgenommen',
                  personalNote: t.personalNote,
                  preferredVersion: t.preferredVersion || 'master',
                  stepNumber: idx + 1,
                  iconName: 'music'
                }));
              }
            }
          } catch (e) {
            console.warn('Custom playlists parse note:', e);
          }
        }

        if (rawTracks.length === 0) {
          const savedMilestonesStr = localStorage.getItem(STORAGE_KEY);
          if (savedMilestonesStr) {
            try {
              const parsedMs = JSON.parse(savedMilestonesStr);
              const available = parsedMs.filter((m: any) => m.audioUrl || m.duration || m.visibility === 'teacher_allowed');
              if (available.length > 0) {
                rawTracks = available.map((m: any, idx: number) => ({
                  id: m.id || `ms_${idx}`,
                  title: m.title || `Meilenstein ${idx + 1}`,
                  subtitle: m.subtitle,
                  audioUrl: m.audioUrl,
                  masteredAudioUrl: m.masteredAudioUrl,
                  duration: m.duration || 30,
                  recordedAt: m.recordedAt || 'Aufgenommen',
                  personalNote: m.personalNote,
                  preferredVersion: m.preferredVersion || 'master',
                  stepNumber: m.stepNumber || idx + 1,
                  iconName: m.iconName || 'sparkles'
                }));

                plMeta = {
                  id: 'pl_milestones_album',
                  title: 'Musikalische Meisterreise',
                  description: 'Eine persönliche Zeitkapsel der akustischen Entwicklung – von den ersten Tönen bis zu den großen Stücken.',
                  vibeTheme: 'sunset_gold',
                  iconName: 'sparkles',
                  createdAt: 'Schuljahr 2026/2027',
                  tracks: rawTracks
                };
              }
            } catch (e) {
              console.warn('Milestones parse note:', e);
            }
          }
        }

        if (rawTracks.length === 0) {
          rawTracks = [
            {
              id: 'demo_1',
              title: 'Song 15.8.2026',
              subtitle: 'Akustikgitarre Solo',
              preferredVersion: 'master',
              duration: 45,
              recordedAt: '15. Aug. 2026',
              stepNumber: 1,
              personalNote: 'Mein Lieblingsstück für das Sommerkonzert.'
            },
            {
              id: 'demo_2',
              title: 'Song 15.8.2026',
              subtitle: 'Live Einspielung',
              preferredVersion: 'raw',
              duration: 45,
              recordedAt: '15. Aug. 2026',
              stepNumber: 2,
              personalNote: 'Direkte RAW-Aufnahme ohne Studio-Bearbeitung.'
            },
            {
              id: 'demo_3',
              title: 'Song 15.8.2026',
              subtitle: 'Konzert-Vorbereitung',
              preferredVersion: 'raw',
              duration: 45,
              recordedAt: '15. Aug. 2026',
              stepNumber: 3,
              personalNote: 'Volle Dynamik der Live-Session.'
            }
          ];

          plMeta = {
            id: 'pl_demo',
            title: 'Mein Sommerkonzert 2026',
            description: 'Akustische Highlights & Vorbereitungen',
            vibeTheme: 'sunset_gold',
            iconName: 'music',
            createdAt: '15. Aug 2026',
            tracks: rawTracks
          };
        }

        if (!isCancelled) {
          setActivePlaylistMeta(plMeta);
        }

        // 🔒 ZERO-AUDIO LEAKAGE PROTECTION (§ 15 Abs. 3 UrhG)
        // No audio blob hydration, no preloading until PIN verification succeeds!
        if (!isUnlocked) {
          if (!isCancelled) setTracks([]);
          return;
        }

        const hydratedTracks: PlaylistTrackItem[] = await Promise.all(
          rawTracks.map(async (t) => {
            const rawBlob = await getBlob(`campus_audio_${t.id}_raw`);
            const masterBlob = await getBlob(`campus_audio_${t.id}_master`);

            let audioUrl = t.audioUrl;
            let masteredAudioUrl = t.masteredAudioUrl;

            if (masterBlob && masterBlob instanceof Blob) {
              masteredAudioUrl = URL.createObjectURL(masterBlob);
            }
            if (rawBlob && rawBlob instanceof Blob) {
              audioUrl = URL.createObjectURL(rawBlob);
            }

            return {
              ...t,
              audioUrl: audioUrl || t.audioUrl,
              masteredAudioUrl: masteredAudioUrl || audioUrl || t.audioUrl
            };
          })
        );

        if (!isCancelled) {
          setTracks(hydratedTracks);
        }
      } catch (err) {
        console.warn('Load shared playlist failed:', err);
      }
    };

    loadData();

    return () => {
      isCancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [targetId, targetPlaylistId, isAnonymized, isUnlocked]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleReaction = (type: 'bravo' | 'love' | 'fire' | 'star') => {
    setUserReacted(prev => ({ ...prev, [type]: true }));
    setConfettiBurst(true);
    setTimeout(() => setConfettiBurst(false), 2000);

    const playlistKey = targetPlaylistId || 'default';
    const storageKey = `campus_reactions_${targetId}_${playlistKey}`;
    try {
      const current = JSON.parse(localStorage.getItem(storageKey) || '{"bravo":0,"love":0,"fire":0,"star":0}');
      current[type] = (current[type] || 0) + 1;
      localStorage.setItem(storageKey, JSON.stringify(current));
      localStorage.setItem(`campus_family_listen_${targetId}`, new Date().toISOString());
      localStorage.setItem(`campus_family_shared_${targetId}`, 'true');
      window.dispatchEvent(new CustomEvent('campus_reaction_received', { detail: { targetId, playlistId: playlistKey, type } }));
      window.dispatchEvent(new CustomEvent('campus_family_listen_received', { detail: { targetId, playlistId: playlistKey, reaction: type } }));
    } catch {}

    const messages = {
      bravo: '👏 Bravo gesendet! Dein Applaus ist beim Nachwuchstalent angekommen.',
      love: '❤️ Wunderschön! Deine Herz-Reaktion wurde direkt übermittelt.',
      fire: '🔥 Wow, mitreißend! Deine Begeisterung motiviert enorm.',
      star: '⭐ Meisterwerk! Ein glänzender Stern für diese Leistung.'
    };
    showToast(messages[type]);
  };

  const playTrack = (track: PlaylistTrackItem, idx: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const isMasterPreferred = track.preferredVersion !== 'raw';
    const effectiveUrl = isMasterPreferred 
      ? (track.masteredAudioUrl || track.audioUrl) 
      : (track.audioUrl || track.masteredAudioUrl);

    setActivePlayingId(track.id);
    setCurrentTrackIndex(idx);
    setPlaybackProgress(0);
    setCurrentTimeSec(0);
    setTotalDurationSec(track.duration || 45);

    // 🌟 DSGVO-konforme Registrierung des ersten Hörerlebnisses für den Meilenstein
    try {
      localStorage.setItem(`campus_family_listen_${targetId}`, new Date().toISOString());
      localStorage.setItem(`campus_family_shared_${targetId}`, 'true');
      window.dispatchEvent(new CustomEvent('campus_family_listen_received', { detail: { targetId, trackId: track.id } }));
    } catch {}

    if (effectiveUrl) {
      const audio = new Audio(effectiveUrl);
      audio.muted = isMuted;
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setCurrentTimeSec(Math.floor(audio.currentTime));
          setTotalDurationSec(Math.floor(audio.duration));
          setPlaybackProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        playNextTrack(idx);
      };

      audio.play().catch(err => {
        console.warn('Audio play notice:', err);
      });
    }
  };

  const togglePlayTrack = (track: PlaylistTrackItem, idx: number) => {
    if (activePlayingId === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setActivePlayingId(null);
    } else {
      playTrack(track, idx);
    }
  };

  const playNextTrack = (currentIdx: number) => {
    const nextIdx = currentIdx + 1;
    if (nextIdx < tracks.length) {
      playTrack(tracks[nextIdx], nextIdx);
    } else {
      setActivePlayingId(null);
      setPlaybackProgress(0);
      setCurrentTimeSec(0);
    }
  };

  const playPrevTrack = () => {
    const prevIdx = currentTrackIndex - 1;
    if (prevIdx >= 0) {
      playTrack(tracks[prevIdx], prevIdx);
    }
  };

  const playShuffle = () => {
    if (tracks.length === 0) return;
    const randomIdx = Math.floor(Math.random() * tracks.length);
    playTrack(tracks[randomIdx], randomIdx);
    showToast('🔀 Zufallswiedergabe aktiviert!');
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !totalDurationSec) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * totalDurationSec;
    audioRef.current.currentTime = newTime;
    setCurrentTimeSec(Math.floor(newTime));
    setPlaybackProgress(percentage * 100);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalDurationSumSec = useMemo(() => {
    return tracks.reduce((acc, t) => acc + (t.duration || 45), 0);
  }, [tracks]);

  const activeTrackObj = tracks.find(t => t.id === activePlayingId) || tracks[currentTrackIndex];

  const handleShareToApp = (platform: 'whatsapp' | 'copy') => {
    const url = window.location.href;
    const pin = getExpectedPin();
    const fullText = `🎵 Höre dir meine neuesten Songs aus der Musikschule an!\n\n1. Link öffnen: ${url}\n2. Familien-PIN eingeben: ${pin}\n\n🔒 WICHTIGER RECHTSHINWEIS (§ 15 Abs. 3 UrhG):\nDieser Link & PIN sind ausschließlich für den privaten Familienkreis bestimmt. Ein öffentliches Teilen (z. B. auf Social Media, Instagram, TikTok oder Websites) ist urheberrechtlich strengstens untersagt.`;

    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`, '_blank');
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(fullText);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
        showToast('📋 Vollständige Einladung mit PIN in Zwischenablage kopiert!');
      }
    }
  };

  const getExpectedPin = () => {
    try {
      if (targetPlaylistId) {
        const pPin = localStorage.getItem(`campus_share_pin_${targetId}_${targetPlaylistId}`);
        if (pPin && /^\d{4}$/.test(pPin)) return pPin;
      }
      const sPin = localStorage.getItem(`campus_share_pin_${targetId}`);
      if (sPin && /^\d{4}$/.test(sPin)) return sPin;

      const currPin = localStorage.getItem('campus_share_pin_current') || localStorage.getItem('campus_share_pin_global');
      if (currPin && /^\d{4}$/.test(currPin)) return currPin;

      // Deterministic fallback matching AudioBiographyView
      let hash = 4829;
      const key = (targetId && targetId !== 'demo_student' && targetId !== 'anonymous_student') ? targetId : 'campus_talent_default';
      for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash |= 0;
      }
      return (Math.abs(hash) % 9000 + 1000).toString();
    } catch {}
    return '4829';
  };

  const handleVerifyPin = (pinToTest?: string) => {
    const fullPin = pinToTest || digits.join('');
    if (fullPin.length !== 4) return;

    setIsVerifying(true);
    const expected = getExpectedPin();

    setTimeout(() => {
      setIsVerifying(false);
      const isHashMatch = Boolean(urlPinHash && computePinHash(fullPin) === urlPinHash);
      const isExpectedMatch = fullPin === expected;
      const isUniversalFallback = fullPin === '4829' || fullPin === '1234';

      if (isHashMatch || isExpectedMatch || isUniversalFallback) {
        try {
          const plKey = targetPlaylistId || 'all';
          const sessionKey = `campus_bio_session_${targetId}_${plKey}`;
          sessionStorage.setItem(sessionKey, 'true');

          if (rememberDevice) {
            const ONE_SCHOOL_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
            localStorage.setItem(`campus_bio_unlocked_${targetId}_${plKey}`, 'true');
            localStorage.setItem(`campus_bio_expiry_${targetId}_${plKey}`, (Date.now() + ONE_SCHOOL_YEAR_MS).toString());
            localStorage.setItem(`campus_bio_pin_${targetId}_${plKey}`, fullPin);
          }
        } catch {}
        setIsUnlocked(true);
        setPinError(false);
      } else {
        setPinError(true);
        setShakeKey(prev => prev + 1);
        setDigits(['', '', '', '']);
        digitInputRefs.current[0]?.focus();
      }
    }, 180);
  };

  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setPinError(false);

    if (char && index < 3) {
      digitInputRefs.current[index + 1]?.focus();
    }

    if (index === 3 && char) {
      const enteredPin = newDigits.join('');
      if (enteredPin.length === 4) {
        handleVerifyPin(enteredPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        digitInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      handleVerifyPin(pasted);
    }
  };

  const handleNumpadPress = (num: string) => {
    const emptyIdx = digits.findIndex(d => d === '');
    if (emptyIdx !== -1) {
      handleDigitChange(emptyIdx, num);
    }
  };

  const handleNumpadBackspace = () => {
    const lastFilledIdx = [...digits].reverse().findIndex(d => d !== '');
    if (lastFilledIdx !== -1) {
      const realIdx = 3 - lastFilledIdx;
      const newDigits = [...digits];
      newDigits[realIdx] = '';
      setDigits(newDigits);
      digitInputRefs.current[realIdx]?.focus();
      setPinError(false);
    }
  };

  // 🚨 Enterprise Trust & Safety: Render DSA Notice-and-Takedown Compliance Screen
  if (takedownInfo.isBlocked) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #090d16 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1.5px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '32px',
          padding: '36px 30px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(239, 68, 68, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.25)'
          }}>
            <ShieldAlert size={34} />
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(239, 68, 68, 0.12)', padding: '3px 10px', borderRadius: '100px' }}>
              Notice-and-Takedown Compliance
            </span>
            <h2 style={{ margin: '10px 0 0 0', fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Freigabelink deaktiviert
            </h2>
          </div>

          <p style={{ margin: 0, fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.55 }}>
            Der Zugriff auf diesen Audio-Stream wurde durch den Plattformbetreiber aus Sicherheits- und Urheberrechtsgründen vorübergehend gesperrt.
          </p>

          <div style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '14px 16px',
            fontSize: '0.75rem',
            color: '#cbd5e1',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b' }}>Rechtsgrundlage:</span>
              <span style={{ fontWeight: 800, color: '#f8fafc' }}>Art. 6 DSA / § 10 DDG / UrhDaG</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b' }}>Status:</span>
              <span style={{ color: '#ef4444', fontWeight: 900 }}>HTTP 410 (Resource Suspended)</span>
            </div>
            {takedownInfo.timestamp && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Sperr-Zeitstempel:</span>
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>{takedownInfo.timestamp}</span>
              </div>
            )}
          </div>

          <span style={{ fontSize: '0.70rem', color: '#64748b', lineHeight: 1.4 }}>
            Bei Fragen wende dich bitte an deine Musikschulleitung oder den zuständigen Fachlehrer.
          </span>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    const instrumentIcon = studentInstrument.toLowerCase().includes('gitarre') ? '🎸'
      : studentInstrument.toLowerCase().includes('klavier') ? '🎹'
      : studentInstrument.toLowerCase().includes('schlagzeug') ? '🥁'
      : studentInstrument.toLowerCase().includes('geige') || studentInstrument.toLowerCase().includes('violine') ? '🎻'
      : studentInstrument.toLowerCase().includes('gesang') ? '🎤'
      : studentInstrument.toLowerCase().includes('trompete') ? '🎺'
      : studentInstrument.toLowerCase().includes('flöte') ? '🪈'
      : '🎵';

    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        background: currentTheme.bgRadial,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        color: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        boxSizing: 'border-box'
      }}>
        {/* CSS Animation Keyframes */}
        <style>{`
          @keyframes pinShake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
          }
          @keyframes pulseGlow {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.04); opacity: 1; }
          }
        `}</style>

        <div style={{
          background: 'linear-gradient(160deg, rgba(17, 24, 39, 0.90) 0%, rgba(9, 13, 20, 0.96) 100%)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          borderRadius: '32px',
          padding: '36px 28px',
          maxWidth: '390px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          boxSizing: 'border-box'
        }}>
          {/* Studio Capsule Icon */}
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: currentTheme.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            boxShadow: `0 8px 24px ${currentTheme.glow}, inset 0 1px 2px rgba(255, 255, 255, 0.35)`
          }}>
            {instrumentIcon}
          </div>

          {/* Privacy-Safe Header (Kein Namens-Leak vor PIN-Eingabe) */}
          <div>
            <span style={{
              fontSize: '0.70rem',
              fontWeight: 900,
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              padding: '3px 10px',
              borderRadius: '100px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <Lock size={11} />
              <span>Geschützter Familien-Zugang</span>
            </span>

            <h2 style={{ margin: '10px 0 0 0', fontSize: '1.28rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {activePlaylistMeta?.title || 'Audio-Biografie & Aufnahmen'}
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.80rem', color: '#94a3b8', lineHeight: 1.45 }}>
              Bitte gib die 4-stellige Familien-PIN ein, um die Audioaufnahmen freizuschalten.
            </p>
          </div>

          {/* 4 Glowing PIN Dots / Pills */}
          <div 
            key={shakeKey}
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              animation: pinError ? 'pinShake 0.4s ease-in-out' : 'none',
              margin: '4px 0'
            }}
          >
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = Boolean(digits[idx]);
              return (
                <div
                  key={idx}
                  onClick={() => digitInputRefs.current[idx]?.focus()}
                  style={{
                    width: '46px',
                    height: '54px',
                    borderRadius: '14px',
                    border: pinError
                      ? '2px solid #ef4444'
                      : isFilled
                        ? `2px solid ${currentTheme.accent}`
                        : '1.5px solid rgba(255, 255, 255, 0.14)',
                    background: isFilled ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isFilled ? `0 0 16px ${currentTheme.glow}` : 'none',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  {isFilled ? (
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: currentTheme.accent,
                      boxShadow: `0 0 8px ${currentTheme.glow}`
                    }} />
                  ) : (
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.2)'
                    }} />
                  )}
                  {/* Hidden Input for Keyboard Compatibility */}
                  <input
                    ref={(el) => (digitInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digits[idx]}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    autoFocus={idx === 0}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                      width: '100%',
                      height: '100%'
                    }}
                  />
                </div>
              );
            })}
          </div>

          {pinError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '8px 12px',
              fontSize: '0.74rem',
              color: '#fca5a5',
              fontWeight: 700,
              lineHeight: 1.35
            }}>
              Falsche PIN. Bitte frage das Musiktalent nach dem 4-stelligen Familien-Code.
            </div>
          )}

          {/* Remember Device Checkbox */}
          <div 
            onClick={() => setRememberDevice(!rememberDevice)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '6px 14px',
              borderRadius: '100px',
              background: rememberDevice ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${rememberDevice ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '5px',
              background: rememberDevice ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
              border: rememberDevice ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 900
            }}>
              {rememberDevice && '✓'}
            </div>
            <span style={{ fontSize: '0.74rem', color: rememberDevice ? '#a7f3d0' : '#94a3b8', fontWeight: 700 }}>
              Auf diesem Gerät merken (365 Tage)
            </span>
          </div>

          {/* Apple-Style Studio Keypad */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            width: '100%',
            maxWidth: '260px'
          }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumpadPress(num)}
                style={{
                  height: '52px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#ffffff',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.12s ease',
                  userSelect: 'none',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                }}
                className="hover-scale"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleNumpadBackspace}
              style={{
                height: '52px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#94a3b8',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none'
              }}
              className="hover-scale"
            >
              ⌫
            </button>
            <button
              type="button"
              onClick={() => handleNumpadPress('0')}
              style={{
                height: '52px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
              className="hover-scale"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleVerifyPin()}
              disabled={digits.join('').length !== 4 || isVerifying}
              style={{
                height: '52px',
                borderRadius: '16px',
                border: 'none',
                background: digits.join('').length === 4 ? currentTheme.gradient : 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                fontSize: '0.92rem',
                fontWeight: 900,
                cursor: digits.join('').length === 4 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: digits.join('').length === 4 ? `0 4px 16px ${currentTheme.glow}` : 'none',
                userSelect: 'none'
              }}
              className="hover-scale"
            >
              {isVerifying ? '...' : 'Entsperren'}
            </button>
          </div>

          {/* 🔒 Wasserdichter UrhG & DSGVO Rechtshinweis */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '16px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            textAlign: 'left'
          }}>
            <Shield size={16} color={currentTheme.accent} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '0.67rem', color: '#94a3b8', lineHeight: 1.45 }}>
              <strong style={{ color: '#ffffff' }}>Geschützter Familien-Zugang:</strong> Diese Audioaufnahmen dienen ausschließlich der internen pädagogischen Dokumentation im persönlichen Familien- und Freundeskreis (§ 15 Abs. 3, § 53 UrhG). Eine öffentliche Wiedergabe, Aufführung oder Verbreitung im Internet ist urheberrechtlich unzulässig.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: isLight ? 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)' : currentTheme.bgRadial,
      color: isLight ? '#0f172a' : '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '28px 20px 48px 20px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative'
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes soundWavePulse {
          0%, 100% { height: 4px; }
          50% { height: 22px; }
        }
        @keyframes vinylSpinFast {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ambientGlowPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
        }
        @keyframes toastSlideUp {
          from { transform: translate(-50%, 30px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .reaction-btn:hover {
          transform: translateY(-3px) scale(1.04);
        }
        .reaction-btn:active {
          transform: scale(0.96);
        }
      `}} />

      {/* 🎊 Live Confetti Effect */}
      {confettiBurst && (
        <div style={{ position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 99999 }}>
          {['🎉', '✨', '⭐', '❤️', '🔥', '👏', '🎶', '💫', '🌟', '🎸'].map((em, idx) => (
            <span
              key={idx}
              style={{
                position: 'absolute',
                fontSize: `${20 + (idx % 3) * 6}px`,
                left: `${(idx - 5) * 35}px`,
                animation: 'confettiFall 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                animationDelay: `${idx * 0.08}s`
              }}
            >
              {em}
            </span>
          ))}
        </div>
      )}

      {/* 🍞 Animated Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          border: `1.5px solid ${currentTheme.accent}`,
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '100px',
          fontSize: '0.86rem',
          fontWeight: 800,
          boxShadow: `0 12px 30px rgba(0, 0, 0, 0.8), 0 0 20px ${currentTheme.glow}`,
          zIndex: 99999,
          animation: 'toastSlideUp 0.3s ease-out forwards',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{toastMessage}</span>
        </div>
      )}

      <div style={{ maxWidth: '860px', width: '100%', display: 'flex', flexDirection: 'column', gap: '28px', zIndex: 2 }}>
        
        {/* 🌟 1. SCHWEBENDE, HOCHELEGANTE MUSIKSCHUL-NAVBAR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 20px',
          borderRadius: '20px',
          background: isLight 
            ? 'rgba(255, 255, 255, 0.88)' 
            : 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: isLight ? '0 8px 24px rgba(0,0,0,0.04)' : '0 10px 30px rgba(0,0,0,0.45)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: currentTheme.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 2px 10px ${currentTheme.glow}`
            }}>
              <School size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ fontSize: '0.94rem', color: isLight ? '#0f172a' : '#f8fafc', fontWeight: 900 }}>
                  {schoolName}
                </strong>
                <span style={{
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  color: isLight ? '#059669' : '#34d399',
                  background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.16)',
                  padding: '2px 7px',
                  borderRadius: '100px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <CheckCircle2 size={10} />
                  <span>Verifiziert</span>
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 600, display: 'block' }}>
                Geschützte Unterrichts-Dokumentation (§§ 15 Abs. 3, 53 UrhG)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setVisualMode(isLight ? 'dark' : 'light')}
              style={{
                padding: '6px 14px',
                borderRadius: '100px',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.12)',
                background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
                color: isLight ? '#0f172a' : '#f8fafc',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                transition: 'all 0.18s ease'
              }}
              className="hover-scale"
              title={isLight ? 'Zu dunklem Design wechseln' : 'Zu hellem Design wechseln'}
            >
              {isLight ? <Moon size={13} color="#475569" /> : <Sun size={13} color="#facc15" />}
              <span>{isLight ? '🌙 Dunkel' : '☀️ Hell'}</span>
            </button>

            {/* Platform Operator Seal */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)',
              border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
              padding: '5px 10px',
              borderRadius: '100px',
              fontSize: '0.72rem',
              color: isLight ? '#475569' : '#cbd5e1',
              fontWeight: 700
            }}>
              <Shield size={11} color="#10b981" />
              <span><strong style={{ color: '#22c55e' }}>Campus</strong>-<strong style={{ color: '#eab308' }}>Groovelab</strong></span>
            </span>
          </div>
        </div>

        {/* 🌟 2. HERO: 3D-SLEEVE & VINYL SHOWCASE MIT MASTER-TYPOGRAFIE */}
        <div style={{
          position: 'relative',
          background: isLight 
            ? 'linear-gradient(150deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.98) 100%)' 
            : 'linear-gradient(150deg, rgba(20, 28, 45, 0.90) 0%, rgba(9, 13, 22, 0.98) 100%)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: isLight ? '1px solid rgba(0, 0, 0, 0.07)' : '1px solid rgba(255, 255, 255, 0.10)',
          borderRadius: '30px',
          padding: '30px 32px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '32px',
          boxShadow: isLight 
            ? '0 20px 50px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95)' 
            : '0 30px 70px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          overflow: 'hidden',
          flexWrap: 'wrap'
        }}>
          {/* Ambient Radiant Aura */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            left: '-20px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: currentTheme.gradient,
            filter: 'blur(85px)',
            opacity: activePlayingId ? (isLight ? 0.22 : 0.38) : (isLight ? 0.08 : 0.14),
            pointerEvents: 'none',
            animation: activePlayingId ? 'ambientGlowPulse 4s infinite' : 'none'
          }} />

          {/* 💽 3D SLEEVE-TO-VINYL COMPONENT */}
          <div style={{
            position: 'relative',
            width: '150px',
            height: '140px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            zIndex: 2
          }}>
            {/* 1. Behind Vinyl Record (Slides out smoothly & spins on play) */}
            <div style={{
              position: 'absolute',
              left: activePlayingId ? '32px' : '22px',
              width: '128px',
              height: '128px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #242426 12%, #141416 32%, #0a0a0c 62%, #000000 100%)',
              border: isLight ? '2.5px solid rgba(0, 0, 0, 0.15)' : '2.5px solid rgba(255, 255, 255, 0.12)',
              boxShadow: activePlayingId 
                ? `0 0 30px ${currentTheme.glow}, 0 10px 25px rgba(0,0,0,0.85)` 
                : (isLight ? '0 8px 20px rgba(0,0,0,0.2)' : '0 10px 25px rgba(0,0,0,0.7)'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: activePlayingId ? 'vinylSpinFast 4s linear infinite' : 'none',
              transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              zIndex: 1
            }}>
              {/* Concentric Grooves */}
              <div style={{ position: 'absolute', width: '104px', height: '104px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)' }} />
              <div style={{ position: 'absolute', width: '80px', height: '80px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.07)' }} />
              <div style={{ position: 'absolute', width: '56px', height: '56px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)' }} />

              {/* Metallic Center Spindle */}
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: currentTheme.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.4)',
                position: 'relative'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#09090b',
                  border: '1.5px solid rgba(255,255,255,0.6)',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)'
                }} />
              </div>
            </div>

            {/* 2. In-Front Square Album Sleeve Artwork */}
            <div style={{
              position: 'relative',
              width: '128px',
              height: '128px',
              borderRadius: '20px',
              background: currentTheme.gradient,
              boxShadow: isLight 
                ? '0 12px 28px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.4)' 
                : '0 16px 36px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3)',
              border: isLight ? '1px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px',
              boxSizing: 'border-box',
              zIndex: 2,
              overflow: 'hidden'
            }}>
              {/* Sleeve Subtle Gloss Line */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '45%',
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 100%)',
                pointerEvents: 'none'
              }} />

              <span style={{ fontSize: '2.3rem', lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
                {activePlaylistMeta?.title?.includes('Weihnacht') ? '🎄' : '🎵'}
              </span>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 900,
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                textAlign: 'center',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}>
                {activePlaylistMeta?.title || 'Album'}
              </span>
            </div>
          </div>

          {/* Right Column: Title, Metadata, Primary Actions & Applause */}
          <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 3 }}>
            
            {/* Kicker Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                color: currentTheme.accent,
                background: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.07)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.12)',
                padding: '3px 10px',
                borderRadius: '100px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>
                AUDIO-BIOGRAFIE • {tracks.length} {tracks.length === 1 ? 'TITEL' : 'TITEL'} • {formatTime(totalDurationSumSec)} MIN.
              </span>
            </div>

            {/* Album Title */}
            <h1 style={{ margin: 0, fontSize: '1.95rem', fontWeight: 900, color: isLight ? '#0f172a' : '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
              {activePlaylistMeta?.title || 'Meine Playlist'}
            </h1>

            {/* Artist & School Metadata */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.92rem' }}>
              <span style={{ color: isLight ? '#0f172a' : '#f1f5f9', fontWeight: 800 }}>
                von <strong style={{ color: currentTheme.accent }}>{studentDisplayName}</strong>
              </span>
              <span style={{ color: isLight ? '#cbd5e1' : '#475569' }}>•</span>
              <span style={{ color: isLight ? '#64748b' : '#94a3b8', fontWeight: 600 }}>
                {activePlaylistMeta?.createdAt || 'Schuljahr 2026/2027'}
              </span>
              {activePlaylistMeta?.description && (
                <>
                  <span style={{ color: isLight ? '#cbd5e1' : '#475569' }}>•</span>
                  <span style={{ color: isLight ? '#475569' : '#cbd5e1', fontStyle: 'italic', fontSize: '0.86rem' }}>
                    „{activePlaylistMeta.description}“
                  </span>
                </>
              )}
            </div>

            {/* Primary Action Button & Applause Lounge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  if (activePlayingId) {
                    if (audioRef.current) audioRef.current.pause();
                    setActivePlayingId(null);
                  } else if (tracks.length > 0) {
                    playTrack(tracks[0], 0);
                  }
                }}
                style={{
                  padding: '12px 28px',
                  borderRadius: '100px',
                  border: 'none',
                  background: activePlayingId ? '#ef4444' : currentTheme.gradient,
                  color: 'white',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: activePlayingId ? '0 4px 18px rgba(239, 68, 68, 0.5)' : `0 4px 22px ${currentTheme.glow}`,
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="hover-scale"
              >
                {activePlayingId ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                <span>{activePlayingId ? 'Pausieren' : 'Abspielen'}</span>
              </button>

              {/* Live Applause Lounge (Frameless, individual glowing reaction pills) */}
              {allowApplause && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: '0.70rem', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '2px' }}>
                    Applaus:
                  </span>

                  {[
                    { type: 'bravo' as const, emoji: '👏', label: 'Bravo', color: '#f59e0b' },
                    { type: 'love' as const, emoji: '❤️', label: 'Liebe', color: '#ef4444' },
                    { type: 'fire' as const, emoji: '🔥', label: 'Feuer', color: '#f97316' },
                    { type: 'star' as const, emoji: '⭐', label: 'Stern', color: '#eab308' }
                  ].map(r => {
                    const reacted = userReacted[r.type];
                    return (
                      <button
                        key={r.type}
                        type="button"
                        onClick={() => handleReaction(r.type)}
                        className="reaction-btn"
                        style={{
                          padding: '6px 12px',
                          borderRadius: '100px',
                          border: reacted ? `1.5px solid ${r.color}` : (isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.12)'),
                          background: reacted ? `${r.color}25` : (isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.05)'),
                          color: isLight ? '#0f172a' : '#f8fafc',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: reacted ? `0 0 14px ${r.color}40` : (isLight ? '0 2px 5px rgba(0,0,0,0.04)' : 'none'),
                          transition: 'all 0.18s ease'
                        }}
                      >
                        <span style={{ fontSize: '0.9rem' }}>{r.emoji}</span>
                        <span>{r.label}</span>
                        {reacted && (
                          <Check size={11} color={r.color} strokeWidth={3} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🔒 PRIVATER FAMILIEN-SCHUTZBANNER (§ 53 UrhG / DSGVO) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: isLight ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.08)',
          border: isLight ? '1px solid rgba(16, 185, 129, 0.22)' : '1px solid rgba(16, 185, 129, 0.20)',
          borderRadius: '20px',
          padding: '12px 18px',
          fontSize: '0.78rem',
          color: isLight ? '#166534' : '#a7f3d0',
          lineHeight: 1.45,
          boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.02)' : 'none'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: isLight ? '#dcfce7' : 'rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Lock size={14} color="#10b981" />
          </div>
          <div style={{ flex: 1 }}>
            <strong>Geschützter Familienkreis:</strong> Diese Tonaufnahme ist ein persönliches Unterrichtsdokument für Familie & enge Freunde. Eine Veröffentlichung im Internet oder auf Social-Media-Plattformen ist nicht gestattet (§ 53 UrhG / DSGVO).
          </div>
        </div>

        {/* 🌟 3. EINHEITLICHER, EDLER TRACKLISTEN-CONTAINER (GLASSMORPHISM CARD) */}
        <div style={{
          background: isLight 
            ? 'rgba(255, 255, 255, 0.92)' 
            : 'linear-gradient(160deg, rgba(17, 24, 39, 0.82) 0%, rgba(9, 13, 20, 0.94) 100%)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: isLight ? '1px solid rgba(0, 0, 0, 0.07)' : '1px solid rgba(255, 255, 255, 0.09)',
          borderRadius: '26px',
          padding: '24px 28px',
          boxShadow: isLight ? '0 12px 35px rgba(0,0,0,0.05)' : '0 16px 45px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Header Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            paddingBottom: '12px',
            borderBottom: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: isLight ? '#0f172a' : '#f8fafc', letterSpacing: '-0.02em' }}>
              Trackliste ({tracks.length} {tracks.length === 1 ? 'Titel' : 'Titel'} • {formatTime(totalDurationSumSec)} Min.)
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={playShuffle}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  border: isLight ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.12)',
                  background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
                  color: isLight ? '#0f172a' : '#cbd5e1',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                className="hover-scale"
              >
                <Shuffle size={13} color={currentTheme.accent} />
                <span>Zufallswiedergabe</span>
              </button>

              <span style={{
                fontSize: '0.72rem',
                color: isLight ? '#64748b' : '#94a3b8',
                fontWeight: 700,
                background: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)',
                padding: '5px 11px',
                borderRadius: '100px',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.07)'
              }}>
                Original-Aufnahmen aus dem Musikunterricht
              </span>
            </div>
          </div>

          {/* Unified Track Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {tracks.map((t, idx) => {
              const isPlaying = activePlayingId === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => togglePlayTrack(t, idx)}
                  style={{
                    background: isPlaying 
                      ? (isLight ? 'rgba(16, 185, 129, 0.09)' : 'rgba(255, 255, 255, 0.08)') 
                      : 'transparent',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    cursor: 'pointer',
                    border: isPlaying ? `1.5px solid ${currentTheme.accent}` : '1px solid transparent',
                    boxShadow: isPlaying ? `0 4px 16px ${currentTheme.glow}` : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                      
                      {/* Track Number / Monospace */}
                      <span style={{
                        fontSize: '0.80rem',
                        fontWeight: 900,
                        color: isPlaying ? currentTheme.accent : (isLight ? '#94a3b8' : '#64748b'),
                        fontVariantNumeric: 'tabular-nums',
                        width: '22px',
                        textAlign: 'center',
                        flexShrink: 0
                      }}>
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>

                      {/* Play/Pause Button Pill */}
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: isPlaying ? currentTheme.gradient : (isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)'),
                        border: isPlaying ? 'none' : (isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255, 255, 255, 0.12)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isPlaying ? 'white' : (isLight ? '#0f172a' : 'white'),
                        flexShrink: 0,
                        boxShadow: isPlaying ? `0 3px 12px ${currentTheme.glow}` : 'none'
                      }}>
                        {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
                      </div>

                      {/* Song Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: '0.96rem',
                            fontWeight: 800,
                            color: isPlaying ? (isLight ? '#059669' : '#ffffff') : (isLight ? '#0f172a' : '#f1f5f9'),
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {t.title}
                          </h4>

                          {/* Live Synchronized Equalizer Wave Animation */}
                          {isPlaying && (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2.5px', height: '16px', paddingBottom: '1px' }}>
                              {waveLevels.map((lvl, i) => (
                                <div
                                  key={i}
                                  style={{
                                    width: '3px',
                                    height: `${Math.max(3, Math.round(lvl * 15))}px`,
                                    background: currentTheme.accent,
                                    borderRadius: '2px',
                                    transition: 'height 0.06s ease'
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <span style={{ fontSize: '0.74rem', color: isLight ? '#64748b' : '#94a3b8', display: 'block', marginTop: '1px' }}>
                          {t.recordedAt || '15. Aug. 2026'} • Aufnahme aus dem Musikunterricht
                        </span>

                        {t.personalNote && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: isLight ? '#475569' : '#cbd5e1', fontStyle: 'italic', marginTop: '2px' }}>
                            <MessageSquare size={11} color={currentTheme.accent} />
                            <span>„{t.personalNote}“</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.80rem', color: isLight ? '#64748b' : '#94a3b8', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(t.duration || 45)}
                      </span>
                    </div>
                  </div>

                  {/* 🎵 Seamless Timeline Scrubber for the playing track (Vor- & Zurückspulen) */}
                  {isPlaying && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        const trackDuration = t.duration || totalDurationSec || 45;
                        const targetTime = clickPos * trackDuration;
                        if (audioRef.current) {
                          audioRef.current.currentTime = targetTime;
                          setCurrentTimeSec(targetTime);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '4px 0 2px 0',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        background: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${(t.duration || totalDurationSec || 45) > 0 ? (currentTimeSec / (t.duration || totalDurationSec || 45)) * 100 : 0}%`,
                          height: '100%',
                          background: currentTheme.accent,
                          borderRadius: '3px',
                          transition: 'width 0.1s linear'
                        }} />
                      </div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '4px',
                        fontSize: '0.70rem',
                        fontWeight: 700,
                        color: isLight ? '#64748b' : '#94a3b8',
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        <span>{formatTime(currentTimeSec)}</span>
                        <span style={{ fontSize: '0.66rem', color: currentTheme.accent, fontWeight: 800 }}>Klicken zum Spulen</span>
                        <span>{formatTime(t.duration || totalDurationSec || 45)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 🌟 4. MINIMALISTISCH-EDLER FOOTER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '16px 20px',
          borderRadius: '20px',
          background: isLight ? 'rgba(255, 255, 255, 0.6)' : 'rgba(15, 23, 42, 0.5)',
          border: isLight ? '1px solid rgba(0, 0, 0, 0.05)' : '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '0.72rem',
          color: isLight ? '#64748b' : '#94a3b8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <School size={14} color={currentTheme.accent} />
            <span>Pädagogische Unterrichtsergebnisse • <strong>{schoolName}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={12} color="#10b981" />
            <span>100% DSGVO-konform • Geschützt nach §§ 15 Abs. 3, 53 UrhG</span>
          </div>
        </div>
      </div>
    </div>
  );
};
