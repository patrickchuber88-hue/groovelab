import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Mic, Volume2, VolumeX, Trash2, RotateCcw } from 'lucide-react';

interface Track {
  id: number;
  url: string | null;
  blob: Blob | null;
  volume: number;
  isMuted: boolean;
  isRecording: boolean;
  isWaiting: boolean;
}

export const GrooveLoopstation: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([
    { id: 1, url: null, blob: null, volume: 80, isMuted: false, isRecording: false, isWaiting: false },
    { id: 2, url: null, blob: null, volume: 80, isMuted: false, isRecording: false, isWaiting: false },
    { id: 3, url: null, blob: null, volume: 80, isMuted: false, isRecording: false, isWaiting: false },
  ]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [masterLoopDuration, setMasterLoopDuration] = useState<number | null>(null); // in ms
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 100

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementsRef = useRef<{ [key: number]: HTMLAudioElement }>({});
  const mediaRecordersRef = useRef<{ [key: number]: MediaRecorder }>({});
  const recordStartTimesRef = useRef<{ [key: number]: number }>({});
  const progressIntervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const loopTimeoutRef = useRef<any>(null);
  const activeStreamsRef = useRef<MediaStream[]>([]);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const handlePlayToggle = () => {
    initAudio();
    if (isPlaying) {
      stopAll();
    } else {
      playAll();
    }
  };

  const playAll = () => {
    setIsPlaying(true);
    startTimeRef.current = Date.now();

    tracks.forEach((track) => {
      if (track.url && !track.isMuted) {
        const audio = audioElementsRef.current[track.id];
        if (audio) {
          audio.currentTime = 0;
          audio.volume = track.volume / 100;
          audio.play().catch(e => console.warn(e));
        }
      }
    });

    if (masterLoopDuration) {
      const duration = masterLoopDuration;
      const step = 50;
      progressIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) % duration;
        setPlaybackProgress((elapsed / duration) * 100);
      }, step);

      const scheduleNextLoop = () => {
        loopTimeoutRef.current = setTimeout(() => {
          startTimeRef.current = Date.now();
          tracks.forEach((t) => {
            const audio = audioElementsRef.current[t.id];
            if (audio && t.url && !t.isMuted) {
              audio.currentTime = 0;
              audio.play().catch(e => console.warn(e));
            }
          });
          scheduleNextLoop();
        }, duration);
      };
      scheduleNextLoop();
    }
  };

  const stopAll = () => {
    setIsPlaying(false);
    setPlaybackProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);

    tracks.forEach((track) => {
      const audio = audioElementsRef.current[track.id];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  };

  const handleReset = () => {
    stopAll();
    Object.values(mediaRecordersRef.current).forEach((rec) => {
      if (rec.state !== 'inactive') rec.stop();
    });

    tracks.forEach((t) => {
      if (t.url) URL.revokeObjectURL(t.url);
    });

    setTracks([
      { id: 1, url: null, blob: null, volume: 80, isMuted: false, isRecording: false, isWaiting: false },
      { id: 2, url: null, blob: null, volume: 80, isMuted: false, isRecording: false, isWaiting: false },
      { id: 3, url: null, blob: null, volume: 80, isMuted: false, isRecording: false, isWaiting: false },
    ]);
    setMasterLoopDuration(null);
    audioElementsRef.current = {};
    mediaRecordersRef.current = {};
    recordStartTimesRef.current = {};
  };

  const startRecording = async (trackId: number) => {
    initAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamsRef.current.push(stream);
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        // Stop stream tracks to turn off recording light
        stream.getTracks().forEach(track => track.stop());
        activeStreamsRef.current = activeStreamsRef.current.filter(s => s !== stream);

        const audio = new Audio(url);
        audio.loop = false;
        audioElementsRef.current[trackId] = audio;

        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, url, blob, isRecording: false, isWaiting: false } : t))
        );

        if (trackId === 1) {
          const duration = Date.now() - recordStartTimesRef.current[1];
          setMasterLoopDuration(duration);
          setIsPlaying(true);
          startTimeRef.current = Date.now();
          audio.volume = 0.8;
          audio.play().catch(e => console.warn(e));

          const step = 50;
          progressIntervalRef.current = setInterval(() => {
            const elapsed = (Date.now() - startTimeRef.current) % duration;
            setPlaybackProgress((elapsed / duration) * 100);
          }, step);

          const scheduleNextLoop = () => {
            loopTimeoutRef.current = setTimeout(() => {
              startTimeRef.current = Date.now();
              Object.keys(audioElementsRef.current).forEach((k) => {
                const aud = audioElementsRef.current[Number(k)];
                const trackInfo = tracks.find(tr => tr.id === Number(k));
                if (aud && trackInfo?.url && !trackInfo.isMuted) {
                  aud.currentTime = 0;
                  aud.play().catch(e => console.warn(e));
                }
              });
              scheduleNextLoop();
            }, duration);
          };
          scheduleNextLoop();
        }
      };

      mediaRecordersRef.current[trackId] = mediaRecorder;

      if (trackId === 1) {
        recordStartTimesRef.current[1] = Date.now();
        mediaRecorder.start();
        setTracks((prev) =>
          prev.map((t) => (t.id === 1 ? { ...t, isRecording: true } : t))
        );
      } else {
        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, isWaiting: true } : t))
        );

        const msToNextCycle = masterLoopDuration
          ? masterLoopDuration - ((Date.now() - startTimeRef.current) % masterLoopDuration)
          : 0;

        // Enforce a mandatory 4-measure loop pause (4 * masterLoopDuration) to guarantee sample-accurate synchrony (no swallowed attack)
        const totalDelay = msToNextCycle + (masterLoopDuration ? 4 * masterLoopDuration : 0);

        setTimeout(() => {
          recordStartTimesRef.current[trackId] = Date.now();
          mediaRecorder.start();
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, isRecording: true, isWaiting: false } : t))
          );

          setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          }, masterLoopDuration || 5000);

        }, totalDelay);
      }
    } catch (err) {
      console.error('Mic error:', err);
      alert('Mikrofonzugriff verweigert.');
    }
  };

  const stopRecording = (trackId: number) => {
    const recorder = mediaRecordersRef.current[trackId];
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const handleVolumeChange = (trackId: number, vol: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, volume: vol } : t))
    );
    const audio = audioElementsRef.current[trackId];
    if (audio) {
      audio.volume = vol / 100;
    }
  };

  const handleMuteToggle = (trackId: number) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const newMute = !t.isMuted;
          const audio = audioElementsRef.current[trackId];
          if (audio) {
            if (newMute) audio.pause();
            else if (isPlaying) audio.play().catch(e => console.warn(e));
          }
          return { ...t, isMuted: newMute };
        }
        return t;
      })
    );
  };

  const handleDeleteTrack = (trackId: number) => {
    const audio = audioElementsRef.current[trackId];
    if (audio) {
      audio.pause();
      delete audioElementsRef.current[trackId];
    }
    if (tracks[trackId - 1]?.url) {
      URL.revokeObjectURL(tracks[trackId - 1].url!);
    }

    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, url: null, blob: null, isRecording: false, isWaiting: false } : t))
    );

    if (trackId === 1) {
      stopAll();
      setMasterLoopDuration(null);
    }
  };

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(audioElementsRef.current).forEach((audio) => {
        audio.pause();
      });
      activeStreamsRef.current.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
    };
  }, []);

  return (
    <div style={{
      background: 'linear-gradient(145deg, #101012 0%, #1c1c22 100%)',
      borderRadius: '24px',
      padding: '28px 20px',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
      border: '1.5px solid rgba(255,255,255,0.03)',
      maxWidth: '420px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Mobile Header */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#ef4444', letterSpacing: '-0.03em', textTransform: 'uppercase' }}>
          Groove-Loopstation
        </h2>
        <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, marginTop: '4px', display: 'block', letterSpacing: '0.02em' }}>
          Erstelle deine eigenen Loops direkt auf dem Handy!
        </span>
      </div>

      {/* Visual Progress Indicator (Mobile Centered) */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', margin: '6px 0' }}>
        <svg width="150" height="150" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.02)" strokeWidth="6" fill="none" />
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="#ef4444"
            strokeWidth="6"
            fill="none"
            strokeDasharray="264"
            strokeDashoffset={264 - (264 * playbackProgress) / 100}
            strokeLinecap="round"
            style={{ 
              transition: isPlaying ? 'none' : 'stroke-dashoffset 0.15s ease-out', 
              transform: 'rotate(-90deg)', 
              transformOrigin: '50% 50%',
              filter: isPlaying ? 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.5))' : 'none'
            }}
          />
        </svg>
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'SF Mono, monospace', letterSpacing: '-0.02em' }}>
            {masterLoopDuration ? `${(masterLoopDuration / 1000).toFixed(1)}s` : '0.0s'}
          </span>
          <span style={{ fontSize: '0.58rem', color: '#ef4444', fontWeight: 900, letterSpacing: '0.12em', marginTop: '4px' }}>
            {isPlaying ? 'PLAYING' : 'READY'}
          </span>
        </div>
      </div>

      {/* Mobile Global Controls */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="button"
          onClick={handlePlayToggle}
          disabled={!masterLoopDuration}
          style={{
            flex: 2,
            background: isPlaying ? '#ef4444' : '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '16px',
            height: '48px',
            fontSize: '0.8rem',
            fontWeight: 800,
            letterSpacing: '0.05em',
            cursor: masterLoopDuration ? 'pointer' : 'not-allowed',
            opacity: masterLoopDuration ? 1 : 0.45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isPlaying ? '0 4px 15px rgba(239, 68, 68, 0.3)' : '0 4px 15px rgba(52, 168, 83, 0.25)',
            transition: 'all 0.2s ease',
            textTransform: 'uppercase'
          }}
        >
          {isPlaying ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          <span>{isPlaying ? 'STOPPEN' : 'ALL PLAY'}</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.03)',
            color: '#fff',
            border: '1.5px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            height: '48px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Vertical Tracks Strips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tracks.map((track) => {
          const hasAudio = !!track.url;
          return (
            <div
              key={track.id}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: track.isRecording 
                  ? '1.5px solid #ef4444' 
                  : track.isWaiting 
                    ? '1.5px solid #eab308' 
                    : '1px solid rgba(255,255,255,0.04)',
                borderRadius: '18px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Playback animation line */}
              {isPlaying && hasAudio && !track.isMuted && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: '#ef4444',
                  opacity: 0.8
                }} />
              )}

              {/* Large Thumb-Friendly Rec Button */}
              <div>
                {track.isRecording ? (
                  <button
                    type="button"
                    onClick={() => stopRecording(track.id)}
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '46px',
                      height: '46px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 12px rgba(239, 68, 68, 0.45)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Square size={12} fill="currentColor" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startRecording(track.id)}
                    disabled={track.isWaiting || (track.id > 1 && !masterLoopDuration)}
                    style={{
                      background: track.isWaiting 
                        ? '#eab308' 
                        : hasAudio 
                          ? 'rgba(255,255,255,0.05)' 
                          : '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '46px',
                      height: '46px',
                      cursor: (track.isWaiting || (track.id > 1 && !masterLoopDuration)) ? 'not-allowed' : 'pointer',
                      opacity: (track.id > 1 && !masterLoopDuration) ? 0.35 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: !hasAudio && (track.id === 1 || masterLoopDuration) ? '0 4px 10px rgba(239, 68, 68, 0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Mic size={16} />
                  </button>
                )}
              </div>

              {/* Volume Slider & Label */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', fontFamily: 'SF Mono, monospace' }}>SPUR 0{track.id}</span>
                  <span style={{ 
                    fontSize: '0.55rem', 
                    color: track.isRecording ? '#ef4444' : track.isWaiting ? '#eab308' : hasAudio ? '#ef4444' : '#475569', 
                    fontWeight: 800, 
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {track.isRecording ? 'Aufnahme' : track.isWaiting ? 'Wartet...' : hasAudio ? 'Bereit' : 'Leer'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: hasAudio ? 1 : 0.2 }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={track.volume}
                    onChange={(e) => handleVolumeChange(track.id, Number(e.target.value))}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: 'rgba(255,255,255,0.08)',
                      outline: 'none',
                      accentColor: '#ef4444',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              {/* Quick Actions (Mute & Delete) */}
              <div style={{ display: 'flex', gap: '6px', opacity: hasAudio ? 1 : 0.15, pointerEvents: hasAudio ? 'auto' : 'none' }}>
                <button
                  type="button"
                  onClick={() => handleMuteToggle(track.id)}
                  style={{
                    background: track.isMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                    color: track.isMuted ? '#ef4444' : '#94a3b8',
                    border: '1px solid ' + (track.isMuted ? '#ef444440' : 'rgba(255,255,255,0.06)'),
                    borderRadius: '10px',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {track.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteTrack(track.id)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    color: '#94a3b8',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef444440'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
