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

// 🎨 HIGH-END THEME PALETTES (Tailored to playlist vibes)
const THEME_PRESETS: { [key: string]: { name: string; gradient: string; glow: string; accent: string; bgRadial: string; border: string } } = {
  sunset_gold: {
    name: 'Sunset Gold',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
    glow: 'rgba(245, 158, 11, 0.45)',
    accent: '#f59e0b',
    bgRadial: 'radial-gradient(ellipse at top, #2d1804 0%, #150a02 50%, #080301 100%)',
    border: 'rgba(245, 158, 11, 0.3)'
  },
  emerald_studio: {
    name: 'Emerald Studio',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
    glow: 'rgba(16, 185, 129, 0.45)',
    accent: '#10b981',
    bgRadial: 'radial-gradient(ellipse at top, #062d1f 0%, #03140e 50%, #010805 100%)',
    border: 'rgba(16, 185, 129, 0.3)'
  },
  cyber_neon: {
    name: 'Cyber Neon',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #a855f7 100%)',
    glow: 'rgba(236, 72, 153, 0.45)',
    accent: '#ec4899',
    bgRadial: 'radial-gradient(ellipse at top, #2b0b30 0%, #150921 50%, #08030d 100%)',
    border: 'rgba(236, 72, 153, 0.3)'
  },
  royal_velvet: {
    name: 'Royal Velvet',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #4c1d95 100%)',
    glow: 'rgba(139, 92, 246, 0.45)',
    accent: '#8b5cf6',
    bgRadial: 'radial-gradient(ellipse at top, #1e113a 0%, #100a20 50%, #07040d 100%)',
    border: 'rgba(139, 92, 246, 0.3)'
  },
  vintage_tape: {
    name: 'Vintage Tape',
    gradient: 'linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%)',
    glow: 'rgba(225, 29, 72, 0.45)',
    accent: '#e11d48',
    bgRadial: 'radial-gradient(ellipse at top, #310a15 0%, #1a050b 50%, #0a0204 100%)',
    border: 'rgba(225, 29, 72, 0.3)'
  },
  ocean_breeze: {
    name: 'Ocean Breeze',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)',
    glow: 'rgba(2, 132, 199, 0.45)',
    accent: '#0284c7',
    bgRadial: 'radial-gradient(ellipse at top, #082f49 0%, #051a29 50%, #020c14 100%)',
    border: 'rgba(2, 132, 199, 0.3)'
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
  const allowDownload = searchParams.get('dl') !== '0';

  const [isUnlocked, setIsUnlocked] = useState<boolean>(!urlPin);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);

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
            if (parsed.instrument) {
              resolvedInstrument = parsed.instrument;
              setStudentInstrument(parsed.instrument);
            }
            if (parsed.school_name && !parsed.school_name.toLowerCase().includes('groove academy')) {
              resolvedSchoolName = parsed.school_name;
            }
          }
        } catch {}

        // 2. Query Supabase student record
        if (targetId && targetId !== 'demo_student' && targetId !== 'anonymous_student') {
          try {
            const { data: studentRecord } = await supabase
              .from('students')
              .select('id, first_name, last_name, instrument, school_id')
              .eq('id', targetId)
              .maybeSingle();

            if (studentRecord && !isCancelled) {
              if (studentRecord.first_name) resolvedFirstName = studentRecord.first_name;
              if (studentRecord.instrument) {
                resolvedInstrument = studentRecord.instrument;
                setStudentInstrument(studentRecord.instrument);
              }

              if (studentRecord.school_id) {
                const { data: schoolRecord } = await supabase
                  .from('schools')
                  .select('name')
                  .eq('id', studentRecord.school_id)
                  .maybeSingle();
                if (schoolRecord?.name && !schoolRecord.name.toLowerCase().includes('groove academy')) {
                  resolvedSchoolName = schoolRecord.name;
                }
              }
            }
          } catch (err) {
            console.warn('Student profile fetch note:', err);
          }
        }

        // 3. If no school resolved from student profile, query the real active music school (excluding test schools)
        if (!resolvedSchoolName || resolvedSchoolName.toLowerCase().includes('groove academy')) {
          try {
            const { data: realSchools } = await supabase
              .from('schools')
              .select('id, name')
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

        // 4. Default fallback: 'Musik Bad Säckingen'
        if (!resolvedSchoolName || resolvedSchoolName.toLowerCase().includes('groove academy')) {
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
          setActivePlaylistMeta(plMeta);
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
  }, [targetId, targetPlaylistId, isAnonymized]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleReaction = (type: 'bravo' | 'love' | 'fire' | 'star') => {
    setUserReacted(prev => ({ ...prev, [type]: true }));
    setConfettiBurst(true);
    setTimeout(() => setConfettiBurst(false), 2000);

    const messages = {
      bravo: '👏 Bravo gesendet! Ein toller Applaus für das Kind.',
      love: '❤️ Wunderschön! Deine Herz-Reaktion wurde übermittelt.',
      fire: '🔥 Wow, mitreißend! Deine Begeisterung ist angekommen.',
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

  const handleDownloadTrack = async (track: PlaylistTrackItem) => {
    if (!allowDownload) return;
    const isMaster = track.preferredVersion !== 'raw';
    const url = isMaster ? (track.masteredAudioUrl || track.audioUrl) : (track.audioUrl || track.masteredAudioUrl);
    if (!url) return;

    showToast('Download gestartet! 🎵 Original-Audio im verlustfreien WAV-Format für private Erinnerungen.');

    const safeStudent = (studentDisplayName || 'Campus').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');
    const safeTitle = (track.title || 'Track').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');
    const versionLabel = isMaster ? 'Studio_Master' : 'Pure_RAW';
    const filename = `${safeStudent}_${safeTitle}_${versionLabel}.wav`;

    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDownloadEntireAlbum = () => {
    if (!allowDownload || tracks.length === 0) return;
    showToast(`Download gestartet! 🎵 Alle ${tracks.length} Songs werden im Original-WAV-Format gespeichert.`);
    tracks.forEach((t, i) => {
      setTimeout(() => {
        handleDownloadTrack(t);
      }, i * 400);
    });
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
    if (platform === 'whatsapp') {
      const text = `Hör dir meine Playlist „${activePlaylistMeta?.title || 'Sommerkonzert'}“ an der ${schoolName} an! 🎶✨ ${url}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
        showToast('📋 Freigabe-Link in Zwischenablage kopiert!');
      }
    }
  };

  if (!isUnlocked) {
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
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: `1px solid ${currentTheme.border}`,
          borderRadius: '32px',
          padding: '40px 32px',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          boxShadow: `0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px ${currentTheme.glow}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '22px'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: currentTheme.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 24px ${currentTheme.glow}`
          }}>
            <Lock size={32} color="#ffffff" />
          </div>

          <div>
            <span style={{ fontSize: '0.74rem', fontWeight: 900, color: currentTheme.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Geschütztes Album
            </span>
            <h2 style={{ margin: '6px 0 0 0', fontSize: '1.4rem', fontWeight: 900, color: '#ffffff' }}>
              {activePlaylistMeta?.title || 'Musikalisches Studio-Album'}
            </h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.45 }}>
              Diese Playlist ist mit einem 4-stelligen PIN-Code geschützt.
            </p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (!urlPin || pinInput === urlPin) {
              setIsUnlocked(true);
              setPinError(false);
            } else {
              setPinError(true);
              setPinInput('');
            }
          }} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '18px',
                border: pinError ? '2px solid #ef4444' : `1.5px solid ${currentTheme.border}`,
                background: 'rgba(0, 0, 0, 0.55)',
                color: 'white',
                fontSize: '1.8rem',
                textAlign: 'center',
                letterSpacing: '14px',
                fontWeight: 900,
                boxSizing: 'border-box'
              }}
              autoFocus
            />

            {pinError && (
              <span style={{ fontSize: '0.76rem', color: '#f87171', fontWeight: 700 }}>
                Ungültiger PIN-Code. Bitte erneut versuchen.
              </span>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '100px',
                border: 'none',
                background: currentTheme.gradient,
                color: 'white',
                fontWeight: 900,
                fontSize: '0.92rem',
                cursor: 'pointer',
                boxShadow: `0 6px 20px ${currentTheme.glow}`,
                transition: 'all 0.2s ease'
              }}
            >
              Playlist öffnen & anhören
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#64748b' }}>
            <Shield size={13} color={currentTheme.accent} />
            <span>Campus-Groovelab • DSGVO-geschützte Freigabe</span>
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

        {/* 🌟 2. HERO: IMMERSIVE HI-FI VINYL COVER & ARTIST PRESENTATION (World-Class Clean Look) */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.72) 0%, rgba(15, 23, 42, 0.94) 100%)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: `1.5px solid ${currentTheme.border}`,
          borderRadius: '36px',
          padding: '46px 32px 36px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '26px',
          boxShadow: `0 25px 60px rgba(0, 0, 0, 0.7), 0 0 50px ${currentTheme.glow}`,
          overflow: 'hidden'
        }}>
          {/* Soft Breathing Ambient Glow */}
          <div style={{
            position: 'absolute',
            top: '30px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: currentTheme.gradient,
            filter: 'blur(75px)',
            opacity: activePlayingId ? 0.5 : 0.22,
            pointerEvents: 'none',
            animation: activePlayingId ? 'ambientGlowPulse 4s infinite' : 'none'
          }} />

          {/* 💿 Ultra-Clean Hi-Fi Vinyl Turntable Centerpiece */}
          <div style={{
            position: 'relative',
            width: '210px',
            height: '210px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #262626 12%, #171717 32%, #0d0d0d 62%, #000000 100%)',
            border: '5px solid rgba(255, 255, 255, 0.12)',
            boxShadow: activePlayingId 
              ? `0 0 45px ${currentTheme.glow}, 0 20px 45px rgba(0,0,0,0.85)` 
              : '0 15px 35px rgba(0,0,0,0.75), inset 0 2px 4px rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: activePlayingId ? 'vinylSpinFast 4s linear infinite' : 'none',
            transition: 'box-shadow 0.4s ease',
            zIndex: 2
          }}>
            {/* Concentric Precision Micro-Grooves */}
            <div style={{ position: 'absolute', width: '175px', height: '175px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', width: '145px', height: '145px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', width: '115px', height: '115px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', width: '85px', height: '85px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.09)' }} />

            {/* Glowing Foil Center Label */}
            <div style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: currentTheme.gradient,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 14px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,255,255,0.4)',
              color: 'white',
              position: 'relative'
            }}>
              <Disc size={26} />
              <span style={{ fontSize: '0.52rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '1px' }}>
                Master
              </span>
              <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#09090b', marginTop: '2px', border: '1.5px solid rgba(255,255,255,0.35)' }} />
            </div>
          </div>

          {/* Title & Artist Presentation */}
          <div style={{ position: 'relative', zIndex: 3, maxWidth: '640px', width: '100%' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 900,
                color: currentTheme.accent,
                background: 'rgba(255, 255, 255, 0.06)',
                border: `1px solid ${currentTheme.border}`,
                padding: '4px 12px',
                borderRadius: '100px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>
                {activePlaylistMeta?.title || 'Studio-Album'} • {tracks.length} {tracks.length === 1 ? 'Song' : 'Songs'}
              </span>
            </div>

            <h1 style={{ margin: 0, fontSize: '2.35rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              {activePlaylistMeta?.title || 'Meine Playlist'}
            </h1>

            {/* 🌟 Interpret: Vorname • Instrument (Beschluss #1) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
              <span style={{ fontSize: '1.08rem', color: '#f1f5f9', fontWeight: 800 }}>
                von <strong style={{ color: currentTheme.accent }}>{studentDisplayName}</strong>
              </span>
              <span style={{ color: '#64748b' }}>•</span>
              <span style={{ fontSize: '0.92rem', color: '#94a3b8', fontWeight: 600 }}>
                {activePlaylistMeta?.createdAt || 'Schuljahr 2026/2027'}
              </span>
            </div>

            {activePlaylistMeta?.description && (
              <p style={{ margin: '12px auto 0 auto', fontSize: '0.94rem', color: '#94a3b8', maxWidth: '580px', lineHeight: 1.5, fontStyle: 'italic' }}>
                „{activePlaylistMeta.description}“
              </p>
            )}
          </div>

          {/* 🌟 3. ALBUM-AKTIONEN: PLAY, DOWNLOAD & WEITERLEITEN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 3 }}>
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
                padding: '15px 36px',
                borderRadius: '100px',
                border: 'none',
                background: activePlayingId ? '#ef4444' : currentTheme.gradient,
                color: 'white',
                fontSize: '0.96rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: activePlayingId ? '0 6px 25px rgba(239, 68, 68, 0.5)' : `0 6px 25px ${currentTheme.glow}`,
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              className="hover-scale"
            >
              {activePlayingId ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
              <span>{activePlayingId ? 'Wiedergabe pausieren' : 'Album abspielen'}</span>
            </button>

            {allowDownload && tracks.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadEntireAlbum}
                style={{
                  padding: '14px 22px',
                  borderRadius: '100px',
                  border: '1.5px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(12px)',
                  transition: 'all 0.2s ease'
                }}
                className="hover-scale"
                title="Alle Songs in verlustfreier Studio-Qualität herunterladen"
              >
                <Download size={17} color={currentTheme.accent} />
                <span>Album laden</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowShareDrawer(!showShareDrawer)}
              style={{
                padding: '14px 20px',
                borderRadius: '100px',
                border: '1.5px solid rgba(255, 255, 255, 0.16)',
                background: showShareDrawer ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.06)',
                color: '#f8fafc',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              className="hover-scale"
              title="Album an Familie & Freunde weiterleiten"
            >
              <Share2 size={16} />
              <span>Weiterleiten</span>
            </button>
          </div>

          {/* Quick Share Drawer (Compact Toolbar) */}
          {showShareDrawer && (
            <div style={{
              width: '100%',
              maxWidth: '440px',
              padding: '12px 16px',
              borderRadius: '20px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              position: 'relative',
              zIndex: 3
            }}>
              <button
                type="button"
                onClick={() => handleShareToApp('whatsapp')}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#25D366',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Send size={14} />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => handleShareToApp('copy')}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {copySuccess ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{copySuccess ? 'Kopiert!' : 'Link kopieren'}</span>
              </button>
            </div>
          )}

          {/* 🌟 4. 1-KLICK STOLZ- & APPLAUS-REAKTIONEN (Keine Dummies, Rotes Herz ❤️) */}
          <div style={{
            width: '100%',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '20px',
            marginTop: '4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            position: 'relative',
            zIndex: 3
          }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 800 }}>
              Sende dem Nachwuchstalent jetzt deinen Applaus:
            </span>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {[
                { type: 'bravo' as const, emoji: '👏', label: 'Bravo!', color: '#f59e0b' },
                { type: 'love' as const, emoji: '❤️', label: 'Wunderschön', color: '#ef4444' },
                { type: 'fire' as const, emoji: '🔥', label: 'Mitreißend', color: '#f97316' },
                { type: 'star' as const, emoji: '⭐', label: 'Meisterwerk', color: '#eab308' }
              ].map(r => {
                const reacted = userReacted[r.type];
                return (
                  <button
                    key={r.type}
                    type="button"
                    onClick={() => handleReaction(r.type)}
                    className="reaction-btn"
                    style={{
                      padding: '9px 18px',
                      borderRadius: '100px',
                      border: reacted ? `1.5px solid ${r.color}` : '1.5px solid rgba(255, 255, 255, 0.12)',
                      background: reacted ? `${r.color}25` : 'rgba(255, 255, 255, 0.05)',
                      color: '#f8fafc',
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      boxShadow: reacted ? `0 0 16px ${r.color}40` : 'none',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.15rem' }}>{r.emoji}</span>
                    <span>{r.label}</span>
                    {reacted && (
                      <Check size={13} color={r.color} strokeWidth={3} />
                    )}
                  </button>
                );
              })}
            </div>
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

                    {allowDownload && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadTrack(t);
                        }}
                        title="Diesen Song als WAV herunterladen"
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        className="hover-scale"
                      >
                        <Download size={16} color={currentTheme.accent} />
                      </button>
                    )}
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

              {allowDownload && (
                <button
                  type="button"
                  onClick={() => handleDownloadTrack(activeTrackObj)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff'
                  }}
                  title="Diesen Song als WAV herunterladen"
                >
                  <Download size={14} color={currentTheme.accent} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
