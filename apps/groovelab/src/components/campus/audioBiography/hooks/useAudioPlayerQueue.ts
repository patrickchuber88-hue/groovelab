import { useState, useRef, useEffect, useCallback } from 'react';
import { MilestoneData } from '../types';
import { getBlob } from '../../../../utils/blobStorage';

interface QueueItem {
  id: string;
  title: string;
  subtitle?: string;
  audioUrl: string;
  masteredAudioUrl?: string;
  duration?: number;
  albumTitle?: string;
}

export interface CurrentAlbumMeta {
  title: string;
  subtitle?: string;
  gradient?: string;
  accentColor?: string;
}

export const formatSeconds = (sec?: number): string => {
  if (!sec || isNaN(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export const calcTracksDurationFormatted = (tracks: any[]): string => {
  if (!tracks || tracks.length === 0) return '0 Min';
  const totalSec = tracks.reduce((acc: number, t: any) => acc + (t.duration || 60), 0);
  const mins = Math.ceil(totalSec / 60);
  return `${mins} Min`;
};

export function useAudioPlayerQueue(
  milestones: MilestoneData[] = [],
  _customPlaylists?: any[],
  _shelfMode?: any,
  _selectedCustomPlaylistId?: any,
  _activeSchoolYears?: any[]
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [isPlayingPlaylist, setIsPlayingPlaylist] = useState<boolean>(false);
  const [isMiniPlayerPlaying, setIsMiniPlayerPlaying] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioVolume, setAudioVolume] = useState<number>(1);
  const [isMiniPlayerMuted, setIsMiniPlayerMuted] = useState<boolean>(false);
  const [audioMode, setAudioMode] = useState<'master' | 'raw'>('master');
  const [playbackQueue, setPlaybackQueue] = useState<QueueItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);
  const [currentPlayingTrackMeta, setCurrentPlayingTrackMeta] = useState<{
    rawUrl: string;
    masteredUrl?: string;
    trackId: string;
  } | null>(null);
  const [isPlayingABComparison, setIsPlayingABComparison] = useState<boolean>(false);
  const [abComparisonStage, setAbComparisonStage] = useState<'station1' | 'transition' | 'station9' | null>(null);
  const [currentAlbumMeta, setCurrentAlbumMeta] = useState<CurrentAlbumMeta | null>(null);

  // Initialize hidden audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';

    audio.ontimeupdate = () => {
      setAudioCurrentTime(audio.currentTime);
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    };

    audio.onended = () => {
      playNextInPlaylist();
    };

    audio.onplay = () => setIsMiniPlayerPlaying(true);
    audio.onpause = () => setIsMiniPlayerPlaying(false);

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  const resolvePlayableUrl = useCallback(async (
    audioUrl?: string,
    masteredAudioUrl?: string,
    trackId?: string,
    mode: 'master' | 'raw' = 'master'
  ): Promise<string> => {
    if (mode === 'master' && masteredAudioUrl) {
      return masteredAudioUrl;
    }
    if (audioUrl) {
      return audioUrl;
    }
    if (trackId) {
      const blob = await getBlob(`campus_audio_${trackId}_${mode}`);
      if (blob && blob instanceof Blob) {
        return URL.createObjectURL(blob);
      }
    }
    return masteredAudioUrl || audioUrl || '';
  }, []);

  const playAudioUrl = useCallback((url: string, id: string) => {
    if (!audioRef.current) return;
    if (audioRef.current.src !== url) {
      audioRef.current.src = url;
    }
    audioRef.current.play().then(() => {
      setActivePlayingId(id);
      setIsMiniPlayerPlaying(true);
    }).catch(err => {
      console.warn('Audio play prevented:', err);
    });
  }, []);

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsMiniPlayerPlaying(false);
    }
  }, []);

  const toggleMiniPlayerPlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setIsMiniPlayerPlaying(true)).catch(console.warn);
    } else {
      audioRef.current.pause();
      setIsMiniPlayerPlaying(false);
    }
  }, []);

  const seekMiniPlayer = useCallback((newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setAudioCurrentTime(newTime);
    }
  }, []);

  const playNextInPlaylist = useCallback(async () => {
    if (playbackQueue.length === 0) {
      setIsPlayingPlaylist(false);
      setActivePlayingId(null);
      setIsMiniPlayerPlaying(false);
      return;
    }
    const nextIdx = currentQueueIndex + 1;
    if (nextIdx < playbackQueue.length) {
      setCurrentQueueIndex(nextIdx);
      const nextTrack = playbackQueue[nextIdx];
      const url = await resolvePlayableUrl(nextTrack.audioUrl, nextTrack.masteredAudioUrl, nextTrack.id, audioMode);
      if (url) {
        setCurrentPlayingTrackMeta({ rawUrl: nextTrack.audioUrl || url, masteredUrl: nextTrack.masteredAudioUrl || url, trackId: nextTrack.id });
        playAudioUrl(url, nextTrack.id);
      }
    } else {
      setIsPlayingPlaylist(false);
      setActivePlayingId(null);
      setIsMiniPlayerPlaying(false);
      setCurrentQueueIndex(0);
    }
  }, [playbackQueue, currentQueueIndex, audioMode, resolvePlayableUrl, playAudioUrl]);

  const playPrevInPlaylist = useCallback(async () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setAudioCurrentTime(0);
      return;
    }
    if (playbackQueue.length === 0) return;
    const prevIdx = currentQueueIndex - 1;
    if (prevIdx >= 0) {
      setCurrentQueueIndex(prevIdx);
      const prevTrack = playbackQueue[prevIdx];
      const url = await resolvePlayableUrl(prevTrack.audioUrl, prevTrack.masteredAudioUrl, prevTrack.id, audioMode);
      if (url) {
        setCurrentPlayingTrackMeta({ rawUrl: prevTrack.audioUrl || url, masteredUrl: prevTrack.masteredAudioUrl || url, trackId: prevTrack.id });
        playAudioUrl(url, prevTrack.id);
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setAudioCurrentTime(0);
    }
  }, [playbackQueue, currentQueueIndex, audioMode, resolvePlayableUrl, playAudioUrl]);

  const switchAudioMode = useCallback(async (mode: 'master' | 'raw') => {
    setAudioMode(mode);
    if (currentPlayingTrackMeta && audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const isCurrentlyPlaying = !audioRef.current.paused;
      const newUrl = await resolvePlayableUrl(
        currentPlayingTrackMeta.rawUrl,
        currentPlayingTrackMeta.masteredUrl,
        currentPlayingTrackMeta.trackId,
        mode
      );
      if (newUrl) {
        audioRef.current.src = newUrl;
        audioRef.current.currentTime = currentTime;
        if (isCurrentlyPlaying) {
          audioRef.current.play().catch(console.warn);
        }
      }
    }
  }, [currentPlayingTrackMeta, resolvePlayableUrl]);

  const toggleAudioMode = useCallback(async () => {
    const nextMode = audioMode === 'master' ? 'raw' : 'master';
    await switchAudioMode(nextMode);
  }, [audioMode, switchAudioMode]);

  const handlePlayToggle = useCallback(async (
    audioUrl?: string,
    masteredAudioUrl?: string,
    trackId?: string
  ) => {
    if (!audioUrl && !masteredAudioUrl && !trackId) return;
    const effectiveId = trackId || audioUrl || masteredAudioUrl || '';
    if (activePlayingId === effectiveId && isMiniPlayerPlaying) {
      pauseAudio();
      return;
    }
    const resolved = await resolvePlayableUrl(audioUrl, masteredAudioUrl, trackId, audioMode);
    if (!resolved) return;
    setCurrentPlayingTrackMeta({
      rawUrl: audioUrl || resolved,
      masteredUrl: masteredAudioUrl || resolved,
      trackId: effectiveId
    });
    playAudioUrl(resolved, effectiveId);
  }, [activePlayingId, isMiniPlayerPlaying, pauseAudio, resolvePlayableUrl, audioMode, playAudioUrl]);

  const playAlbumQueue = useCallback(async (
    title: string,
    subtitle: string,
    tracks: any[],
    gradient?: string,
    accentColor?: string
  ) => {
    if (!tracks || tracks.length === 0) return;
    const mappedQueue: QueueItem[] = tracks.map((t: any) => ({
      id: t.id,
      title: t.title,
      subtitle: t.subtitle,
      audioUrl: t.audioUrl,
      masteredAudioUrl: t.masteredAudioUrl,
      duration: t.duration,
      albumTitle: title
    }));
    setPlaybackQueue(mappedQueue);
    setCurrentQueueIndex(0);
    setCurrentAlbumMeta({ title, subtitle, gradient, accentColor });
    setIsPlayingPlaylist(true);

    const first = mappedQueue[0];
    const url = await resolvePlayableUrl(first.audioUrl, first.masteredAudioUrl, first.id, audioMode);
    if (url) {
      setCurrentPlayingTrackMeta({
        rawUrl: first.audioUrl || url,
        masteredUrl: first.masteredAudioUrl || url,
        trackId: first.id
      });
      playAudioUrl(url, first.id);
    }
  }, [audioMode, playAudioUrl, resolvePlayableUrl]);

  const startContinuousPlaylist = useCallback((
    tracks?: any[],
    albumTitle?: string,
    albumSubtitle?: string
  ) => {
    if (!tracks || tracks.length === 0) return;
    playAlbumQueue(albumTitle || 'Playlist', albumSubtitle || '', tracks);
  }, [playAlbumQueue]);

  const startABComparison = useCallback(async () => {
    const track1 = milestones.find(m => m.stepNumber === 1 && m.audioUrl);
    const trackFinal = milestones.find(m => (m.stepNumber === 10 || m.stepNumber === 9) && m.audioUrl);

    if (!track1?.audioUrl && !trackFinal?.audioUrl) {
      alert('Nimm zuerst Meilenstein 01 oder dein Meisterstück auf, um den A/B-Hörvergleich zu starten!');
      return;
    }

    if (isPlayingABComparison) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlayingABComparison(false);
      setAbComparisonStage(null);
      setActivePlayingId(null);
      return;
    }

    setIsPlayingABComparison(true);
    setIsPlayingPlaylist(false);
    setAbComparisonStage('station1');

    const url1 = await resolvePlayableUrl(track1?.audioUrl, track1?.masteredAudioUrl, track1?.id, audioMode);
    if (url1 && track1) {
      if (audioRef.current) audioRef.current.pause();
      const audio1 = new Audio(url1);
      audioRef.current = audio1;
      setActivePlayingId(track1.id);
      setIsMiniPlayerPlaying(true);
      audio1.play().catch(console.warn);

      // Play 8 seconds of Station 01, then crossfade to Station 10
      setTimeout(async () => {
        setAbComparisonStage('transition');
        const urlFinal = await resolvePlayableUrl(trackFinal?.audioUrl, trackFinal?.masteredAudioUrl, trackFinal?.id, audioMode);
        setTimeout(() => {
          if (urlFinal && trackFinal) {
            audio1.pause();
            const audioFinal = new Audio(urlFinal);
            audioRef.current = audioFinal;
            setActivePlayingId(trackFinal.id);
            setAbComparisonStage('station9');
            audioFinal.play().catch(console.warn);

            audioFinal.onended = () => {
              setIsPlayingABComparison(false);
              setAbComparisonStage(null);
              setActivePlayingId(null);
              setIsMiniPlayerPlaying(false);
            };
          } else {
            setIsPlayingABComparison(false);
            setAbComparisonStage(null);
            setActivePlayingId(null);
            setIsMiniPlayerPlaying(false);
          }
        }, 1500);
      }, 8000);
    }
  }, [isPlayingABComparison, milestones, resolvePlayableUrl, audioMode]);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setAudioVolume(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMiniPlayerMuted(prev => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  return {
    audioRef,
    activePlayingId,
    setActivePlayingId,
    isPlayingPlaylist,
    setIsPlayingPlaylist,
    isMiniPlayerPlaying,
    setIsMiniPlayerPlaying,
    audioCurrentTime,
    audioDuration,
    audioVolume,
    isMiniPlayerMuted,
    setIsMiniPlayerMuted,
    audioMode,
    switchAudioMode,
    toggleAudioMode,
    playbackQueue,
    setPlaybackQueue,
    currentQueueIndex,
    setCurrentQueueIndex,
    currentPlayingTrackMeta,
    currentAlbumMeta,
    setCurrentAlbumMeta,
    isPlayingABComparison,
    setIsPlayingABComparison,
    abComparisonStage,
    setAbComparisonStage,
    startABComparison,
    playAudioUrl,
    pauseAudio,
    handlePlayToggle,
    playAlbumQueue,
    startContinuousPlaylist,
    toggleMiniPlayerPlay,
    seekMiniPlayer,
    playNextInPlaylist,
    playPrevInPlaylist,
    setVolume,
    toggleMute,
    resolvePlayableUrl,
    formatSeconds,
    calcTracksDurationFormatted
  };
}
