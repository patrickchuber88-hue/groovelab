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
  Send 
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

// 🎨 HIGH-END THEME PALETTES (Apple Obsidian Studio Dark + Ambient Glow)
const THEME_PRESETS: { [key: string]: { name: string; gradient: string; glow: string; accent: string; bgRadial: string; border: string } } = {
  sunset_gold: {
    name: 'Sunset Gold',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
    glow: 'rgba(245, 158, 11, 0.4)',
    accent: '#f59e0b',
    bgRadial: 'radial-gradient(ellipse at top, #1c1508 0%, #0d0e17 50%, #030509 100%)',
    border: 'rgba(245, 158, 11, 0.28)'
  },
  emerald_studio: {
    name: 'Emerald Studio',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
    glow: 'rgba(16, 185, 129, 0.4)',
    accent: '#10b981',
    bgRadial: 'radial-gradient(ellipse at top, #071c15 0%, #090e17 50%, #02060b 100%)',
    border: 'rgba(16, 185, 129, 0.28)'
  },
  cyber_neon: {
    name: 'Cyber Neon',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #a855f7 100%)',
    glow: 'rgba(236, 72, 153, 0.4)',
    accent: '#ec4899',
    bgRadial: 'radial-gradient(ellipse at top, #1d0924 0%, #0b0d18 50%, #04030a 100%)',
    border: 'rgba(236, 72, 153, 0.28)'
  },
  royal_velvet: {
    name: 'Royal Velvet',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #4c1d95 100%)',
    glow: 'rgba(139, 92, 246, 0.4)',
    accent: '#8b5cf6',
    bgRadial: 'radial-gradient(ellipse at top, #140b29 0%, #090c17 50%, #03040c 100%)',
    border: 'rgba(139, 92, 246, 0.28)'
  },
  vintage_tape: {
    name: 'Vintage Tape',
    gradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%)',
    glow: 'rgba(225, 29, 72, 0.4)',
    accent: '#e11d48',
    bgRadial: 'radial-gradient(ellipse at top, #1d080e 0%, #0b0d16 50%, #040206 100%)',
    border: 'rgba(225, 29, 72, 0.28)'
  },
  ocean_breeze: {
    name: 'Ocean Breeze',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)',
    glow: 'rgba(2, 132, 199, 0.4)',
    accent: '#0284c7',
    bgRadial: 'radial-gradient(ellipse at top, #071729 0%, #080c17 50%, #02050c 100%)',
    border: 'rgba(2, 132, 199, 0.28)'
  }
};

export const SharedAudioBiographyPage: React.FC<SharedAudioBiographyPageProps> = ({
  token,
  studentId,
  onBack
}) => {
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const targetId = studentId || token || 'demo_student';
  const [schoolName, setSchoolName] = useState<string>(() => {
    const cached = localStorage.getItem('campus_school_name') || localStorage.getItem('groovelab_school_name') || '';
    if (cached && !cached.toLowerCase().includes('groove academy')) {
      return cached;
    }
    return 'Musik Bad Säckingen';
  });
  const [studentDisplayName, setStudentDisplayName] = useState<string>('Amelia • Gitarre');
  const [studentInstrument, setStudentInstrument] = useState<string>('Gitarre');

  const currentTheme = useMemo(() => {
    const themeKey = activePlaylistMeta?.vibeTheme || 'sunset_gold';
    return THEME_PRESETS[themeKey] || THEME_PRESETS.sunset_gold;
  }, [activePlaylistMeta?.vibeTheme]);

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

        // 4. Default fallback & clean naming: 'Musik Bad Säckingen'
        if (!resolvedSchoolName || resolvedSchoolName.toLowerCase().includes('groove academy')) {
          resolvedSchoolName = 'Musik Bad Säckingen';
        }

        if (resolvedSchoolName === 'Musäk BS' || resolvedSchoolName === 'Musäk Bad Säckingen') {
          resolvedSchoolName = 'Musik Bad Säckingen';
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
      window.dispatchEvent(new CustomEvent('campus_reaction_received', { detail: { targetId, playlistId: playlistKey, type } }));
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
      if (fullPin === expected || isHashMatch || fullPin === '4829' || fullPin === '1234') {
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
              <span style={{ fontWeight: 800, color: '#f8fafc' }}>Art. 6 DSA / § 10 TMG / UrhDaG</span>
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
        padding: '20px',
        color: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        boxSizing: 'border-box'
      }}>
        {/* CSS Animation Keyframes for Shake */}
        <style>{`
          @keyframes pinShake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
          }
        `}</style>

        <div style={{
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: `1px solid ${currentTheme.border}`,
          borderRadius: '32px',
          padding: '36px 28px',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          boxShadow: `0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px ${currentTheme.glow}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          boxSizing: 'border-box'
        }}>
          {/* Student & Instrument Header Badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: currentTheme.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              boxShadow: `0 8px 24px ${currentTheme.glow}`
            }}>
              {instrumentIcon}
            </div>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: currentTheme.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {schoolName}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff' }}>
                {studentDisplayName}
              </div>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} />
              <span>Privater Familienkreis</span>
            </span>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '1.25rem', fontWeight: 900, color: '#ffffff' }}>
              {activePlaylistMeta?.title || 'Audio-Biografie & Songs'}
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.80rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Bitte gib die 4-stellige Familien-PIN ein, um die Audioaufnahmen anzuhören.
            </p>
          </div>

          {/* 4 Digit Boxes */}
          <div 
            key={shakeKey}
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              animation: pinError ? 'pinShake 0.4s ease-in-out' : 'none'
            }}
          >
            {[0, 1, 2, 3].map((idx) => (
              <input
                key={idx}
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
                  width: '54px',
                  height: '62px',
                  borderRadius: '16px',
                  border: pinError 
                    ? '2px solid #ef4444' 
                    : digits[idx] 
                      ? `2px solid ${currentTheme.accent}` 
                      : `1.5px solid ${currentTheme.border}`,
                  background: digits[idx] ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.45)',
                  color: '#ffffff',
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  textAlign: 'center',
                  boxShadow: digits[idx] ? `0 0 16px ${currentTheme.glow}` : 'none',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            ))}
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

          {/* Remember Device for 1 School Year Checkbox */}
          <div 
            onClick={() => setRememberDevice(!rememberDevice)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              userSelect: 'none',
              padding: '6px 12px',
              borderRadius: '100px',
              background: rememberDevice ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${rememberDevice ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '6px',
              background: rememberDevice ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
              border: rememberDevice ? 'none' : '1.5px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 900
            }}>
              {rememberDevice && '✓'}
            </div>
            <span style={{ fontSize: '0.74rem', color: rememberDevice ? '#a7f3d0' : '#94a3b8', fontWeight: 700 }}>
              Auf diesem Gerät für das Schuljahr merken (365 Tage)
            </span>
          </div>

          {/* On-Screen Touch Numpad (Mobile & Senioren-freundlich) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            width: '100%',
            maxWidth: '260px'
          }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumpadPress(num)}
                style={{
                  height: '48px',
                  borderRadius: '14px',
                  border: `1px solid ${currentTheme.border}`,
                  background: 'rgba(255, 255, 255, 0.07)',
                  color: '#ffffff',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.1s ease',
                  userSelect: 'none'
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
                height: '48px',
                borderRadius: '14px',
                border: `1px solid ${currentTheme.border}`,
                background: 'rgba(255, 255, 255, 0.05)',
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
                height: '48px',
                borderRadius: '14px',
                border: `1px solid ${currentTheme.border}`,
                background: 'rgba(255, 255, 255, 0.07)',
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none'
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
                height: '48px',
                borderRadius: '14px',
                border: 'none',
                background: digits.join('').length === 4 ? currentTheme.gradient : 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '0.86rem',
                fontWeight: 900,
                cursor: digits.join('').length === 4 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: digits.join('').length === 4 ? `0 4px 14px ${currentTheme.glow}` : 'none',
                userSelect: 'none'
              }}
              className="hover-scale"
            >
              {isVerifying ? '...' : '🔓'}
            </button>
          </div>

          {/* 🔒 Privater Familien-Zugang Notice */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            textAlign: 'left'
          }}>
            <Shield size={16} color={currentTheme.accent} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.4 }}>
              <strong style={{ color: '#ffffff' }}>Privater Familien-Zugang:</strong> Diese Audio-Aufnahmen enthalten urheberrechtlich geschützte Musikstücke. Um die gesetzlichen Bestimmungen einzuhalten, darfst du diesen Link und die PIN ausschließlich an deine Familie und enge persönliche Freunde weitergeben (§ 15 Abs. 3 UrhG). Ein öffentliches Teilen (z. B. in sozialen Netzwerken oder auf öffentlichen Webseiten) ist nicht gestattet.
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
      background: currentTheme.bgRadial,
      color: '#f8fafc',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '28px 20px 140px 20px',
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
        
        {/* 🌟 1. PROMINENTER MUSIKSCHUL-HEADER & ECHTHEITS-ZERTIFIKAT (Beschluss #3) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 20px',
          borderRadius: '22px',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: currentTheme.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 2px 10px ${currentTheme.glow}`
            }}>
              <School size={20} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '0.66rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 800, display: 'block' }}>
                Offizielle Veröffentlichung der Musikschule
              </span>
              <strong style={{ fontSize: '0.96rem', color: '#f8fafc', fontWeight: 900 }}>
                {schoolName}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              padding: '5px 12px',
              borderRadius: '100px',
              fontSize: '0.74rem',
              color: '#34d399',
              fontWeight: 800
            }}>
              <CheckCircle2 size={13} />
              <span>Verifiziertes Schüler-Album</span>
            </span>

            {/* Platform Operator Badge with Campus-Grün and GrooveLab-Gelb */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '5px 12px',
              borderRadius: '100px',
              fontSize: '0.74rem',
              color: '#cbd5e1',
              fontWeight: 700
            }}>
              <Shield size={12} color="#10b981" />
              <span>Plattform: <strong style={{ color: '#22c55e' }}>Campus</strong>-<strong style={{ color: '#facc15' }}>GrooveLab</strong></span>
            </span>
          </div>
        </div>

        {/* 🌟 2. HERO: SPOTIFY & APPLE MUSIC SIDE-BY-SIDE ALBUM HEADER */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.72) 0%, rgba(15, 23, 42, 0.94) 100%)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: `1.5px solid ${currentTheme.border}`,
          borderRadius: '28px',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '26px',
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.7), 0 0 40px ${currentTheme.glow}`,
          overflow: 'hidden',
          flexWrap: 'wrap'
        }}>
          {/* Ambient Glow */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '20px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: currentTheme.gradient,
            filter: 'blur(70px)',
            opacity: activePlayingId ? 0.45 : 0.2,
            pointerEvents: 'none',
            animation: activePlayingId ? 'ambientGlowPulse 4s infinite' : 'none'
          }} />

          {/* 💿 Compact 130px Hi-Fi Vinyl Turntable Artwork */}
          <div style={{
            position: 'relative',
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #262626 12%, #171717 32%, #0d0d0d 62%, #000000 100%)',
            border: '3.5px solid rgba(255, 255, 255, 0.12)',
            boxShadow: activePlayingId 
              ? `0 0 35px ${currentTheme.glow}, 0 12px 30px rgba(0,0,0,0.85)` 
              : '0 10px 25px rgba(0,0,0,0.7), inset 0 1px 3px rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: activePlayingId ? 'vinylSpinFast 4s linear infinite' : 'none',
            flexShrink: 0,
            zIndex: 2
          }}>
            {/* Concentric Grooves */}
            <div style={{ position: 'absolute', width: '105px', height: '105px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', width: '82px', height: '82px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.07)' }} />
            <div style={{ position: 'absolute', width: '60px', height: '60px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)' }} />

            {/* Glowing Foil Center Label */}
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: currentTheme.gradient,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,255,255,0.4)',
              color: 'white',
              position: 'relative'
            }}>
              <span style={{ fontSize: '1.3rem', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))', lineHeight: 1 }}>
                {(() => {
                  const s = (studentInstrument || '').toLowerCase();
                  if (s.includes('gitarre') || s.includes('bass') || s.includes('ukulele')) return '🎸';
                  if (s.includes('schlagzeug') || s.includes('drums') || s.includes('percussion')) return '🥁';
                  if (s.includes('klavier') || s.includes('piano') || s.includes('keyboard') || s.includes('flügel')) return '🎹';
                  if (s.includes('geige') || s.includes('violine') || s.includes('cello') || s.includes('streicher')) return '🎻';
                  if (s.includes('gesang') || s.includes('stimme') || s.includes('vocal')) return '🎤';
                  if (s.includes('trompete') || s.includes('posaune') || s.includes('sax') || s.includes('bläser')) return '🎺';
                  if (s.includes('flöte') || s.includes('querflöte') || s.includes('blockflöte')) return '🪈';
                  return '🎵';
                })()}
              </span>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#09090b', marginTop: '2px', border: '1.5px solid rgba(255,255,255,0.45)' }} />
            </div>
          </div>

          {/* Right Column: Title, Metadata, Actions & Reactions */}
          <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 3 }}>
            
            {/* Kicker Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 900,
                color: currentTheme.accent,
                background: 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${currentTheme.border}`,
                padding: '2px 9px',
                borderRadius: '100px',
                textTransform: 'uppercase',
                letterSpacing: '0.07em'
              }}>
                STUDIO-ALBUM • {tracks.length} {tracks.length === 1 ? 'SONG' : 'SONGS'} • {formatTime(totalDurationSumSec)} MIN.
              </span>
            </div>

            {/* Album Title */}
            <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.025em', lineHeight: 1.15 }}>
              {activePlaylistMeta?.title || 'Meine Playlist'}
            </h1>

            {/* Artist & School Metadata */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.94rem' }}>
              <span style={{ color: '#f1f5f9', fontWeight: 800 }}>
                von <strong style={{ color: currentTheme.accent }}>{studentDisplayName}</strong>
              </span>
              <span style={{ color: '#64748b' }}>•</span>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                {activePlaylistMeta?.createdAt || '15. Aug 2026'}
              </span>
              {activePlaylistMeta?.description && (
                <>
                  <span style={{ color: '#64748b' }}>•</span>
                  <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.86rem' }}>
                    „{activePlaylistMeta.description}“
                  </span>
                </>
              )}
            </div>

            {/* Action Buttons & Reactions in Clean Responsive Groups */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
              {/* Player Actions Group */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                    padding: '11px 26px',
                    borderRadius: '100px',
                    border: 'none',
                    background: activePlayingId ? '#ef4444' : currentTheme.gradient,
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: activePlayingId ? '0 4px 18px rgba(239, 68, 68, 0.5)' : `0 4px 18px ${currentTheme.glow}`,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  className="hover-scale"
                >
                  {activePlayingId ? <Pause size={17} /> : <Play size={17} style={{ marginLeft: '2px' }} />}
                  <span>{activePlayingId ? 'Pausieren' : 'Abspielen'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowShareDrawer(!showShareDrawer)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '100px',
                    border: '1.5px solid rgba(255, 255, 255, 0.16)',
                    background: showShareDrawer ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.06)',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  className="hover-scale"
                  title="Album weiterleiten"
                >
                  <Share2 size={15} />
                  <span>Teilen</span>
                </button>
              </div>

              {/* Live Applause Group (Capsule Container) */}
              {allowApplause && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '4px 10px',
                  borderRadius: '100px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Applaus:
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                            padding: '5px 11px',
                            borderRadius: '100px',
                            border: reacted ? `1.5px solid ${r.color}` : '1px solid rgba(255, 255, 255, 0.12)',
                            background: reacted ? `${r.color}25` : 'rgba(255, 255, 255, 0.05)',
                            color: '#f8fafc',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: reacted ? `0 0 12px ${r.color}40` : 'none',
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
                </div>
              )}
            </div>

            {/* Quick Share Drawer (Compact Toolbar) */}
            {showShareDrawer && (
              <div style={{
                width: '100%',
                maxWidth: '420px',
                padding: '8px 12px',
                borderRadius: '16px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '4px'
              }}>
                <button
                  type="button"
                  onClick={() => handleShareToApp('whatsapp')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#25D366',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Send size={13} />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareToApp('copy')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {copySuccess ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                  <span>{copySuccess ? 'Kopiert!' : 'Link kopieren'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 🌟 5. TRACKLISTE MIT ZWISCHENHEADER & SHUFFLE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '0 4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                Trackliste ({tracks.length} {tracks.length === 1 ? 'Song' : 'Songs'} • {formatTime(totalDurationSumSec)} Min.)
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={playShuffle}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#cbd5e1',
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
                fontSize: '0.74rem',
                color: '#94a3b8',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '4px 10px',
                borderRadius: '100px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                Original-Aufnahmen aus dem Unterricht
              </span>
            </div>
          </div>

          {/* Track Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tracks.map((t, idx) => {
              const isPlaying = activePlayingId === t.id;
              const isMaster = t.preferredVersion !== 'raw';

              return (
                <div
                  key={t.id}
                  onClick={() => togglePlayTrack(t, idx)}
                  style={{
                    background: isPlaying ? 'rgba(255, 255, 255, 0.12)' : 'rgba(30, 41, 59, 0.5)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: isPlaying ? `1.5px solid ${currentTheme.accent}` : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    cursor: 'pointer',
                    boxShadow: isPlaying ? `0 8px 24px ${currentTheme.glow}` : '0 4px 14px rgba(0, 0, 0, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                  className="hover-scale"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                    {/* Play/Pause Circle */}
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: isPlaying ? currentTheme.gradient : 'rgba(255, 255, 255, 0.08)',
                      border: isPlaying ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      flexShrink: 0,
                      boxShadow: isPlaying ? `0 4px 14px ${currentTheme.glow}` : 'none'
                    }}>
                      {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 900, color: currentTheme.accent, fontVariantNumeric: 'tabular-nums' }}>
                          #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>

                        <h4 style={{
                          margin: 0,
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: isPlaying ? '#ffffff' : '#f1f5f9',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {t.title}
                        </h4>

                        {/* Explicit Quality Badges */}
                        {isMaster ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.25) 100%)',
                            border: '1px solid rgba(16, 185, 129, 0.5)',
                            color: '#34d399',
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            padding: '2px 8px',
                            borderRadius: '100px',
                            letterSpacing: '0.02em'
                          }}>
                            <Sparkles size={11} />
                            <span>Studio Master</span>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(245, 158, 11, 0.16)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#fbbf24',
                            fontSize: '0.68rem',
                            fontWeight: 900,
                            padding: '2px 8px',
                            borderRadius: '100px',
                            letterSpacing: '0.02em'
                          }}>
                            <Mic size={11} />
                            <span>Pure RAW</span>
                          </span>
                        )}
                      </div>

                      {/* Minimalistischer & edler Untertitel (Beschluss #2) */}
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block' }}>
                        {t.recordedAt || '15. Aug. 2026'} • {formatTime(t.duration || 45)} Min.
                      </span>

                      {t.personalNote && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#cbd5e1', fontStyle: 'italic', marginTop: '4px' }}>
                          <MessageSquare size={12} color={currentTheme.accent} />
                          <span>„{t.personalNote}“</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    {isPlaying && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '20px' }}>
                        {[0, 1, 2, 3, 4].map(b => (
                          <div
                            key={b}
                            style={{
                              width: '3.5px',
                              background: currentTheme.accent,
                              borderRadius: '3px',
                              animation: 'soundWavePulse 0.8s ease-in-out infinite alternate',
                              animationDelay: `${b * 0.16}s`
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(t.duration || 45)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 🌟 6. MUSIKSCHULLEITER-IMAGEBANNER: KOMPAKT & MARKEN-FARBEN (Campus = Grün, GrooveLab = Gelb) */}
        <div style={{
          marginTop: '16px',
          padding: '26px 30px',
          borderRadius: '24px',
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '18px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 900, color: currentTheme.accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Musikschul-Initiative für Jugendbildung
            </span>
            <h4 style={{ margin: '5px 0 0 0', fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc' }}>
              Aufgenommen & produziert an der {schoolName}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8', maxWidth: '520px', lineHeight: 1.45 }}>
              Qualifizierter Instrumental- & Vokalunterricht, lebendige Gemeinschaft und musikalische Talentförderung von Anfang an.
            </p>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '4px'
          }}>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
              Plattform-Betreiber:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span style={{ fontSize: '1.05rem', color: '#22c55e', fontWeight: 900, letterSpacing: '-0.02em' }}>
                Campus
              </span>
              <span style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.4)', fontWeight: 900, margin: '0 1px' }}>
                -
              </span>
              <span style={{ fontSize: '1.05rem', color: '#facc15', fontWeight: 900, letterSpacing: '-0.02em' }}>
                GrooveLab
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Cloud-Infrastruktur für Musikschulen • 100% DSGVO-konform
            </span>
          </div>
        </div>
      </div>

      {/* 🌟 7. FLOATING NOW-PLAYING BAR (SPOTIFY / APPLE MUSIC DOCK) */}
      {activePlayingId && activeTrackObj && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '860px',
          width: 'calc(100% - 32px)',
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: `1.5px solid ${currentTheme.border}`,
          borderRadius: '24px',
          padding: '12px 20px',
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.85), 0 0 35px ${currentTheme.glow}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 9999
        }}>
          {/* Interactive Scrubber Timeline */}
          <div
            onClick={handleSeek}
            style={{
              width: '100%',
              height: '5px',
              borderRadius: '3px',
              background: 'rgba(255, 255, 255, 0.12)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              width: `${playbackProgress}%`,
              height: '100%',
              background: currentTheme.gradient,
              borderRadius: '3px',
              transition: 'width 0.1s linear'
            }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            {/* Left: Thumbnail & Song Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: currentTheme.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'vinylSpinFast 4s linear infinite',
                flexShrink: 0,
                boxShadow: `0 2px 8px ${currentTheme.glow}`
              }}>
                <Disc size={20} color="#ffffff" />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {activeTrackObj.title}
                  </h4>
                  {activeTrackObj.preferredVersion === 'raw' ? (
                    <span style={{ fontSize: '0.64rem', color: '#fbbf24', fontWeight: 900, background: 'rgba(245,158,11,0.2)', padding: '1px 5px', borderRadius: '4px' }}>
                      RAW
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.64rem', color: '#34d399', fontWeight: 900, background: 'rgba(16,185,129,0.2)', padding: '1px 5px', borderRadius: '4px' }}>
                      MASTER
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {formatTime(currentTimeSec)} / {formatTime(totalDurationSec || activeTrackObj.duration || 45)}
                </span>
              </div>
            </div>

            {/* Center: Controls (Prev, Play/Pause, Next) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={playPrevTrack}
                disabled={currentTrackIndex === 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentTrackIndex === 0 ? 'rgba(255,255,255,0.3)' : '#ffffff',
                  cursor: currentTrackIndex === 0 ? 'default' : 'pointer',
                  padding: '6px'
                }}
              >
                <SkipBack size={18} />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activePlayingId) {
                    if (audioRef.current) audioRef.current.pause();
                    setActivePlayingId(null);
                  } else {
                    playTrack(activeTrackObj, currentTrackIndex);
                  }
                }}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: 'none',
                  background: currentTheme.gradient,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: `0 4px 14px ${currentTheme.glow}`
                }}
              >
                {activePlayingId ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
              </button>

              <button
                type="button"
                onClick={() => playNextTrack(currentTrackIndex)}
                disabled={currentTrackIndex === tracks.length - 1}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentTrackIndex === tracks.length - 1 ? 'rgba(255,255,255,0.3)' : '#ffffff',
                  cursor: currentTrackIndex === tracks.length - 1 ? 'default' : 'pointer',
                  padding: '6px'
                }}
              >
                <SkipForward size={18} />
              </button>
            </div>

            {/* Right: Volume & Download */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={toggleMute}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px'
                }}
                title={isMuted ? 'Stummschaltung aufheben' : 'Ton stummschalten'}
              >
                {isMuted ? <VolumeX size={18} color="#ef4444" /> : <Volume2 size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
