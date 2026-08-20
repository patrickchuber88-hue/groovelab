import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, Volume2, Plus, Minus, RotateCcw, Activity } from 'lucide-react';
import { CampusTuner } from './campus/CampusTuner';

interface LiveStageToolboxModalProps {
  initialTab?: 'tuner' | 'metronome';
  onClose: () => void;
}

export const LiveStageToolboxModal: React.FC<LiveStageToolboxModalProps> = ({
  initialTab = 'tuner',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'tuner' | 'metronome'>(initialTab);

  // Metronome State
  const [bpm, setBpm] = useState<number>(120);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timeSignature, setTimeSignature] = useState<number>(4); // beats per bar
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [accentDownbeat, setAccentDownbeat] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.7);

  // Tap Tempo state
  const tapTimesRef = useRef<number[]>([]);

  // Web Audio Context & Timer refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<any>(null);
  const currentBeatRef = useRef<number>(0);

  // Initialize Audio Context on user interaction
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Play a single click sound
  const playClick = useCallback((isAccent: boolean) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isAccent ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(isAccent ? 1320 : 880, ctx.currentTime);

      const peakGain = volume * (isAccent ? 0.8 : 0.5);
      gain.gain.setValueAtTime(peakGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.045);
    } catch (e) {
      console.warn('Metronome audio error:', e);
    }
  }, [getAudioContext, volume]);

  // Metronome Loop
  useEffect(() => {
    if (isPlaying && activeTab === 'metronome') {
      currentBeatRef.current = 0;
      setCurrentBeat(0);

      // Play first beat immediately
      playClick(accentDownbeat);

      const intervalMs = (60 / bpm) * 1000;
      intervalRef.current = setInterval(() => {
        currentBeatRef.current = (currentBeatRef.current + 1) % timeSignature;
        const isAccent = accentDownbeat && currentBeatRef.current === 0;
        setCurrentBeat(currentBeatRef.current);
        playClick(isAccent);
      }, intervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentBeat(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, bpm, timeSignature, accentDownbeat, playClick, activeTab]);

  // Cleanup on unmount or tab switch
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch {}
      }
    };
  }, []);

  // Stop metronome when switching to tuner to avoid audio interference
  const handleTabSwitch = (newTab: 'tuner' | 'metronome') => {
    if (newTab === 'tuner' && isPlaying) {
      setIsPlaying(false);
    }
    setActiveTab(newTab);
  };

  // Tap Tempo Handler
  const handleTap = () => {
    const now = Date.now();
    const taps = tapTimesRef.current.filter(t => now - t < 3000); // keep taps within last 3 seconds
    taps.push(now);
    tapTimesRef.current = taps;

    if (taps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      const clampedBpm = Math.min(260, Math.max(30, calculatedBpm));
      setBpm(clampedBpm);
    }
  };

  // Tempo markings helper
  const getTempoLabel = (tempo: number): string => {
    if (tempo < 60) return 'Largo (Breit & Langsam)';
    if (tempo < 76) return 'Adagio (Ruhig)';
    if (tempo < 108) return 'Andante (Gehend)';
    if (tempo < 120) return 'Moderato (Mäßig)';
    if (tempo < 168) return 'Allegro (Lebhaft & Schnell)';
    if (tempo < 200) return 'Vivace (Sehr lebhaft)';
    return 'Presto (Sehr schnell)';
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div 
        className="animation-pop-in"
        style={{
          background: '#ffffff',
          borderRadius: '28px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          background: '#fafafa'
        }}>
          {/* Tabs Switcher */}
          <div style={{
            display: 'flex',
            background: '#e2e8f0',
            padding: '4px',
            borderRadius: '14px',
            gap: '4px'
          }}>
            <button
              onClick={() => handleTabSwitch('tuner')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'tuner' ? '#ffffff' : 'transparent',
                color: activeTab === 'tuner' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'tuner' ? 850 : 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'tuner' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {/* Monochrome Stimmgabel */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 12v10" />
                <path d="M18 2v7a6 6 0 0 1-12 0V2" />
              </svg>
              <span>Stimmgerät (Tuner)</span>
            </button>

            <button
              onClick={() => handleTabSwitch('metronome')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'metronome' ? '#ffffff' : 'transparent',
                color: activeTab === 'metronome' ? '#0f172a' : '#64748b',
                fontWeight: activeTab === 'metronome' ? 850 : 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'metronome' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {/* Monochrome Mechanical Metronome Icon */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L4 20h16L12 2z" />
                <path d="M12 10l5-3" />
                <circle cx="17" cy="7" r="1.5" fill="currentColor" />
              </svg>
              <span>Metronom</span>
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            className="hover-scale"
            title="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          boxSizing: 'border-box'
        }}>
          {activeTab === 'tuner' ? (
            <div style={{ width: '100%' }}>
              <CampusTuner onBack={onClose} uiLevel="pro" />
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              width: '100%',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif"
            }}>
              {/* BPM Big Display */}
              <div style={{
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{
                  fontSize: '4.2rem',
                  fontWeight: 950,
                  color: '#0f172a',
                  lineHeight: 1,
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: '-0.03em'
                }}>
                  {bpm}
                </div>
                <div style={{
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: '#34a853',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginTop: '4px'
                }}>
                  BPM • {getTempoLabel(bpm)}
                </div>
              </div>

              {/* Visual Beat Indicator Dots */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 20px',
                background: '#f8fafc',
                borderRadius: '100px',
                border: '1px solid #e2e8f0'
              }}>
                {Array.from({ length: timeSignature }).map((_, idx) => {
                  const isActive = isPlaying && currentBeat === idx;
                  const isFirstBeat = idx === 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        width: isFirstBeat ? '18px' : '14px',
                        height: isFirstBeat ? '18px' : '14px',
                        borderRadius: '50%',
                        background: isActive 
                          ? (isFirstBeat ? '#34a853' : '#60a5fa') 
                          : '#cbd5e1',
                        boxShadow: isActive 
                          ? `0 0 12px ${isFirstBeat ? 'rgba(52, 168, 83, 0.8)' : 'rgba(96, 165, 250, 0.8)'}` 
                          : 'none',
                        transform: isActive ? 'scale(1.25)' : 'scale(1)',
                        transition: 'all 0.08s ease'
                      }}
                    />
                  );
                })}
              </div>

              {/* BPM Adjuster Buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                maxWidth: '400px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => setBpm(prev => Math.max(30, prev - 5))}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#334155',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                  className="hover-scale"
                >
                  -5
                </button>
                <button
                  onClick={() => setBpm(prev => Math.max(30, prev - 1))}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  className="hover-scale"
                >
                  <Minus size={18} />
                </button>

                {/* Slider */}
                <input
                  type="range"
                  min="30"
                  max="260"
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: '#34a853',
                    cursor: 'pointer'
                  }}
                />

                <button
                  onClick={() => setBpm(prev => Math.min(260, prev + 1))}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  className="hover-scale"
                >
                  <Plus size={18} />
                </button>
                <button
                  onClick={() => setBpm(prev => Math.min(260, prev + 5))}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#334155',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                  className="hover-scale"
                >
                  +5
                </button>
              </div>

              {/* Main Play / Stop Button & Tap Tempo */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                width: '100%',
                maxWidth: '400px',
                marginTop: '6px'
              }}>
                <button
                  onClick={() => {
                    getAudioContext();
                    setIsPlaying(prev => !prev);
                  }}
                  style={{
                    flex: 1.5,
                    padding: '16px 24px',
                    borderRadius: '18px',
                    border: 'none',
                    background: isPlaying 
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                      : 'linear-gradient(135deg, #34a853, #2e944b)',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '1.05rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: isPlaying 
                      ? '0 8px 24px rgba(239, 68, 68, 0.35)' 
                      : '0 8px 24px rgba(52, 168, 83, 0.35)',
                    transition: 'all 0.2s'
                  }}
                  className="hover-scale"
                >
                  {isPlaying ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" />}
                  <span>{isPlaying ? 'STOPPEN' : 'STARTEN'}</span>
                </button>

                <button
                  onClick={handleTap}
                  style={{
                    flex: 1,
                    padding: '16px 20px',
                    borderRadius: '18px',
                    border: '1.5px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontWeight: 900,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s'
                  }}
                  className="hover-scale"
                  title="Im Takt tippen um Tempo zu erfassen"
                >
                  <Activity size={18} color="#34a853" />
                  <span>TAP TEMPO</span>
                </button>
              </div>

              {/* Time Signature & Accent controls */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                maxWidth: '400px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9'
              }}>
                {/* Time Signatures */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Takt:</span>
                  {[2, 3, 4, 6].map(beats => (
                    <button
                      key={beats}
                      onClick={() => setTimeSignature(beats)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '8px',
                        border: timeSignature === beats ? '1.5px solid #34a853' : '1px solid #e2e8f0',
                        background: timeSignature === beats ? '#e6f4ea' : '#f8fafc',
                        color: timeSignature === beats ? '#34a853' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      {beats}/4
                    </button>
                  ))}
                </div>

                {/* Accent Checkbox */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 750,
                  color: '#475569',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={accentDownbeat}
                    onChange={(e) => setAccentDownbeat(e.target.checked)}
                    style={{ accentColor: '#34a853', cursor: 'pointer' }}
                  />
                  <span>Akzent (Eins)</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
