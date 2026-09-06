import React, { useState, useEffect } from 'react';
import { useWindowSize } from 'react-use';
import { 
  Music, Users, Play, ChevronDown, ExternalLink, 
  Clock, Award, Zap, Star, Check, X, Trash2 
} from 'lucide-react';
import { StudioAvatar } from './StudioAvatar';
import { APP_INSTRUMENT_ICONS, APP_INSTRUMENT_COLORS, brandColor } from '../constants/instruments';

export interface GroupedSongCardProps {
  songGroup: any;
  onUpdateProgress: (skillId: string, progress: number, meta?: any) => void;
  onSubmitForApproval: (skill: any) => void;
  isBandReady?: boolean;
  onDelete: (songId: string) => void;
  userBands?: any[];
  userId?: string;
  isExpanded?: boolean;
  onToggle: () => void;
  onOpenPdfViewer?: (song: any, folderUrl: string) => void;
}

export function GroupedSongCard({ 
  songGroup, 
  onUpdateProgress, 
  onSubmitForApproval, 
  isBandReady, 
  onDelete, 
  userBands = [], 
  userId, 
  isExpanded, 
  onToggle,
  onOpenPdfViewer
}: GroupedSongCardProps) {
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const [activeDifficulty, setActiveDifficulty] = useState<'starter' | 'original'>('starter');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isChallengeHovered, setIsChallengeHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const currentLevelSkills = (songGroup.skills || []).filter((s: any) => s.difficulty_level === activeDifficulty);

  // Find the band this song belongs to (Finalized Band or Pending Proposal)
  const matchingBand = (songGroup.isBandSong || true) ? userBands.find((b: any) => 
    b.band_songs?.some((bs: any) => bs.song_id === songGroup.song_id) ||
    b.songs?.id === songGroup.song_id ||
    (b.status === 'proposal' && b.song_id === songGroup.song_id)
  ) : null;

  // Generate all required slots based on song instrumentation
  const instrumentation = songGroup.instrumentation || {};
  const slots: any[] = [];
  
  // Normalize instrumentation keys to prevent duplicates like "Guitar" and "E-Gitarre"
  const normalizedInst: Record<string, number> = {};
  Object.entries(instrumentation).forEach(([inst, count]) => {
    let key = inst;
    const lower = inst.toLowerCase();
    if (lower === 'guitar' || lower === 'e-gitarre') key = 'E-Gitarre';
    else if (lower === 'bass' || lower === 'e-bass') key = 'E-Bass';
    else if (lower === 'drums' || lower === 'e-drums') key = 'E-Drums';
    else if (lower === 'piano' || lower === 'keys' || lower === 'e-piano') key = 'E-Piano';
    else if (lower === 'vocals' || lower === 'gesang') key = 'Vocals';
    
    normalizedInst[key] = Math.max(normalizedInst[key] || 0, count as number);
  });

  Object.entries(normalizedInst).forEach(([inst, count]) => {
    if (inst.toLowerCase().includes('vocals') || inst.toLowerCase().includes('gesang')) return;
    for (let i = 1; i <= (count as number); i++) {
      slots.push({ instrument: inst, partNumber: i });
    }
  });

  if (slots.length === 0) {
    const uniqueInsts = Array.from(new Set((songGroup.skills || []).map((s: any) => s.instrument)));
    uniqueInsts.forEach((inst: any) => {
       if (!inst.toLowerCase().includes('vocals')) slots.push({ instrument: inst, partNumber: 1 });
    });
  }

  const getBaseInst = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('gitarre') || n.includes('guitar')) return 'Guitar';
    if (n.includes('drums') || n.includes('schlagzeug')) return 'Drums';
    if (n.includes('piano') || n.includes('keys')) return 'Piano';
    if (n.includes('bass')) return 'Bass';
    return name;
  };

  slots.sort((a, b) => {
    const orderMap: Record<string, number> = { 'Guitar': 1, 'Drums': 2, 'Piano': 3, 'Bass': 4 };
    const idxA = orderMap[getBaseInst(a.instrument)] || 99;
    const idxB = orderMap[getBaseInst(b.instrument)] || 99;
    if (idxA !== idxB) return idxA - idxB;
    return a.partNumber - b.partNumber;
  });

  const displaySkills = slots.map(slot => {
    const existing = currentLevelSkills.find((s: any) => {
      const sInst = (s.instrument || '').toLowerCase();
      const tInst = slot.instrument.toLowerCase();
      const isMatch = sInst === tInst || 
             (sInst === 'guitar' && tInst === 'e-gitarre') || (sInst === 'e-gitarre' && tInst === 'guitar') ||
             (sInst === 'bass' && tInst === 'e-bass') || (sInst === 'e-bass' && tInst === 'bass') ||
             (sInst === 'drums' && tInst === 'e-drums') || (sInst === 'e-drums' && tInst === 'drums') ||
             (sInst === 'piano' && tInst === 'e-piano') || (sInst === 'e-piano' && tInst === 'piano') || (sInst === 'keys' && tInst === 'e-piano');
      
      return isMatch && (s.part_number || 1) === slot.partNumber;
    });
    const result = existing ? { ...existing } : {
      id: `mock::${songGroup.song_id}::${slot.instrument}::${slot.partNumber}::${activeDifficulty}`,
      song_id: songGroup.song_id,
      instrument: slot.instrument,
      part_number: slot.partNumber,
      difficulty_level: activeDifficulty,
      progress: 0,
      is_stage_ready: false,
      is_pending_approval: false,
      isMock: true
    };
    if (!result.part_number) {
      result.part_number = slot.partNumber;
    }
    return result;
  });

  const getSkillLabel = (s: any) => {
    const inst = songGroup?.instrumentation || {};
    const reqCount = inst[s.instrument] || 0;
    if (reqCount > 1) {
      return `${s.instrument} ${s.part_number || 1}`;
    }
    const totalWithSameInst = displaySkills.filter((x: any) => x.instrument === s.instrument).length;
    if (totalWithSameInst > 1) {
      return `${s.instrument} ${s.part_number || 1}`;
    }
    return s.instrument;
  };

  const [activeSlotId, setActiveSlotId] = useState(() => {
    const pending = displaySkills.find((s: any) => s?.is_pending_approval);
    if (pending) return pending.id;

    const userBandInst = matchingBand?.myInstrument;
    if (userBandInst) {
      const matchedSlot = displaySkills.find((s: any) => {
        const sBase = getBaseInst(s.instrument);
        const uBase = getBaseInst(userBandInst);
        if (sBase === uBase) {
          const partMatch = userBandInst.match(/\d+/);
          const userPartNum = partMatch ? parseInt(partMatch[0]) : 1;
          return (s.part_number || 1) === userPartNum;
        }
        return false;
      });
      if (matchedSlot) return matchedSlot.id;
      
      const baseMatchedSlot = displaySkills.find((s: any) => getBaseInst(s.instrument) === getBaseInst(userBandInst));
      if (baseMatchedSlot) return baseMatchedSlot.id;
    }

    return displaySkills[0]?.id || '';
  });

  useEffect(() => {
    if (!displaySkills.find((s: any) => s?.id === activeSlotId)) {
      let prevInst = '';
      let prevPart = 1;

      if (activeSlotId.startsWith('mock::')) {
        const parts = activeSlotId.split('::');
        prevInst = parts[2];
        prevPart = parseInt(parts[3]) || 1;
      } else {
        const prevSkill = (songGroup.skills || []).find((s: any) => s.id === activeSlotId);
        if (prevSkill) {
          prevInst = prevSkill.instrument;
          prevPart = prevSkill.part_number || 1;
        }
      }
      
      if (prevInst) {
         const match = displaySkills.find((s: any) => 
            s.instrument === prevInst && 
            (s.part_number || 1) === prevPart
         );
         if (match) {
           setActiveSlotId(match.id);
           return;
         }
      }

      setActiveSlotId(displaySkills[0]?.id || '');
    }
  }, [activeDifficulty, displaySkills]);

  const activeSkill = displaySkills.find((s: any) => s?.id === activeSlotId) || (() => {
    if (activeSlotId && activeSlotId.startsWith('mock::')) {
      const parts = activeSlotId.split('::');
      const inst = parts[2];
      const partNum = parseInt(parts[3]) || 1;
      return displaySkills.find((s: any) => s.instrument === inst && (s.part_number || 1) === partNum);
    }
    return null;
  })() || displaySkills[0] || { progress: 0 };

  const [localProgress, setLocalProgress] = useState(activeSkill.progress);
  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(activeSkill.progress);
    }
  }, [activeSkill.id, activeSkill.progress, isDragging]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '32px', marginBottom: '16px', position: 'relative' }}>
      <div 
        onClick={onToggle}
        className={`glass-panel animation-slide-up ${isBandReady ? 'band-ready' : ''} ${activeSkill.progress >= 90 && !activeSkill.is_stage_ready ? 'challenge-glow' : ''}`} 
        style={{ 
          padding: isExpanded ? (isMobile ? '20px' : '32px') : (isMobile ? '14px 16px' : '20px 24px'), 
          position: 'relative', 
          overflow: 'visible', 
          borderRadius: isMobile ? '20px' : '28px', 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1, 
          background: 'white', 
          borderLeft: `${isMobile ? '5px' : '8px'} solid ${isBandReady ? '#f59e0b' : (APP_INSTRUMENT_COLORS[activeSkill.instrument] || '#cbd5e1')}`,
          boxShadow: activeSkill.progress >= 90 && !activeSkill.is_stage_ready ? `0 0 30px ${brandColor}22` : '0 10px 30px rgba(0,0,0,0.02)',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          cursor: 'pointer'
        }}
      >
        {songGroup.isBandSong && (
          <div style={{ 
            position: 'absolute', 
            top: '-10px', 
            right: isMobile ? '16px' : '60px', 
            background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
            color: 'white', 
            fontSize: '0.65rem', 
            fontWeight: 900, 
            padding: '4px 12px', 
            borderRadius: '100px', 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            boxShadow: '0 8px 16px rgba(245, 158, 11, 0.4)', 
            zIndex: 20,
            border: '2px solid white'
          }}>
            <Users size={12} fill="white" /> Band Song
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '16px' : '32px', width: '100%', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: isMobile ? '100%' : '320px', flexShrink: 0 }}>
            <div 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (songGroup.tomplay_url || songGroup.media_link) window.open(songGroup.tomplay_url || songGroup.media_link, '_blank'); 
              }}
              style={{ 
                width: isMobile ? '44px' : '52px', height: isMobile ? '44px' : '52px', borderRadius: isMobile ? '12px' : '16px', 
                background: (songGroup.tomplay_url || songGroup.media_link) ? 'linear-gradient(135deg, #f8fafc, #f1f5f9)' : '#f8fafc', 
                color: (songGroup.tomplay_url || songGroup.media_link) ? brandColor : '#cbd5e1', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: (songGroup.tomplay_url || songGroup.media_link) ? 'pointer' : 'default', 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                flexShrink: 0,
                boxShadow: (songGroup.tomplay_url || songGroup.media_link) ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                border: '1px solid #f1f5f9'
              }}
              className={(songGroup.tomplay_url || songGroup.media_link) ? "hover-scale" : ""}
            >
              <Music size={isMobile ? 20 : 24} />
            </div>
            
            <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                {songGroup.artist}
              </div>
              <div style={{ fontSize: isMobile ? '1.05rem' : '1.25rem', fontWeight: 900, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1 }}>
                {songGroup.title}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            {displaySkills.map((s: any) => (
              <div 
                key={s.id} 
                onClick={(e) => { e.stopPropagation(); setActiveSlotId(s.id); if (!isExpanded) onToggle(); }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: s.id === activeSlotId ? '5.5px 11.5px' : '6px 12px',
                  background: s.id === activeSlotId 
                    ? '#ffffff' 
                    : (s.progress > 0 ? APP_INSTRUMENT_COLORS[s.instrument] + '10' : '#f8fafc'),
                  borderRadius: '12px',
                  border: s.id === activeSlotId 
                    ? `1.5px solid ${APP_INSTRUMENT_COLORS[s.instrument] || brandColor}` 
                    : '1px solid ' + (s.progress > 0 ? APP_INSTRUMENT_COLORS[s.instrument] + '20' : '#f1f5f9'),
                  opacity: s.id === activeSlotId ? 1 : (s.progress > 0 ? 0.9 : 0.35),
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer'
                }}
                title={getSkillLabel(s) + ' (' + s.progress + '%)'}
              >
                <span style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {APP_INSTRUMENT_ICONS[s.instrument] || '🎸'}
                  {displaySkills.filter((x: any) => x.instrument === s.instrument).length > 1 && (
                    <span style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 900, 
                      opacity: 0.9, 
                      color: (s.id === activeSlotId || s.progress > 0) ? (APP_INSTRUMENT_COLORS[s.instrument] || brandColor) : '#94a3b8' 
                    }}>{s.part_number || 1}</span>
                  )}
                </span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 900, 
                  color: (s.id === activeSlotId || s.progress > 0) ? (APP_INSTRUMENT_COLORS[s.instrument] || brandColor) : '#94a3b8' 
                }}>
                  {s.id === activeSlotId ? localProgress : s.progress}%
                </span>
              </div>
            ))}
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? '16px' : '32px', 
            flexShrink: 0, 
            paddingLeft: isMobile ? 0 : '20px', 
            borderLeft: (!isMobile && width > 1000) ? '1px solid #f1f5f9' : 'none', 
            marginLeft: isMobile ? 0 : 'auto',
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'space-between' : 'flex-start',
            borderTop: isMobile ? '1px solid #f1f5f9' : 'none',
            paddingTop: isMobile ? '12px' : 0,
            marginTop: isMobile ? '4px' : 0
          }}>
            <div style={{ textAlign: isMobile ? 'left' : 'right', minWidth: isMobile ? 'auto' : '100px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Gesamt</div>
              <div style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 950, color: localProgress >= 100 ? '#34a853' : (APP_INSTRUMENT_COLORS[activeSkill.instrument] || brandColor), lineHeight: 1 }}>
                {localProgress}%
              </div>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onToggle(); }} 
              style={{ 
                width: isMobile ? '36px' : '44px', height: isMobile ? '36px' : '44px', borderRadius: isMobile ? '10px' : '14px', 
                background: isExpanded ? '#1e293b' : '#f8fafc', 
                border: 'none', 
                color: isExpanded ? 'white' : '#64748b', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                boxShadow: isExpanded ? '0 8px 16px rgba(0,0,0,0.15)' : 'none',
                flexShrink: 0
              }}
            >
              <ChevronDown size={isMobile ? 20 : 24} />
            </button>
          </div>
        </div>

        <div style={{ 
          maxHeight: isExpanded ? '1000px' : '0', 
          opacity: isExpanded ? 1 : 0, 
          overflow: 'hidden', 
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
          marginTop: isExpanded ? '32px' : '0', 
          paddingTop: isExpanded ? '32px' : '0', 
          borderTop: isExpanded ? '2px solid #f8fafc' : 'none' 
        }}>
          <div style={{ display: 'flex', gap: isMobile ? '20px' : '48px', alignItems: 'flex-start', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ flex: isMobile ? '1 1 100%' : 2, minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>Schwierigkeitsgrad:</div>
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '14px', padding: '5px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveDifficulty('starter'); }} 
                      style={{ 
                        background: activeDifficulty === 'starter' ? 'white' : 'transparent', 
                        color: activeDifficulty === 'starter' ? '#34a853' : '#64748b', 
                        border: 'none', padding: '8px 20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', 
                        boxShadow: activeDifficulty === 'starter' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.3s'
                      }}
                    >
                      Starter
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveDifficulty('original'); }} 
                      style={{ 
                        background: activeDifficulty === 'original' ? 'white' : 'transparent', 
                        color: activeDifficulty === 'original' ? '#f59e0b' : '#64748b', 
                        border: 'none', padding: '8px 20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', 
                        boxShadow: activeDifficulty === 'original' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.3s'
                      }}
                    >
                      Pro
                    </button>
                  </div>
                </div>

                {/* Media & Tomplay Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {songGroup.media_link && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(songGroup.media_link, '_blank', 'noopener,noreferrer');
                      }}
                      className="cloud-link-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '12px',
                        background: '#f1f5f9',
                        color: '#0f172a',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title="Externer Streaming-Dienst (Spotify / YouTube)"
                    >
                      <Play size={14} style={{ fill: '#0f172a' }} />
                      <span>Song anhören</span>
                      <ExternalLink size={12} style={{ opacity: 0.6 }} />
                    </button>
                  )}
                  {songGroup.tomplay_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(songGroup.tomplay_url, '_blank', 'noopener,noreferrer');
                      }}
                      className="cloud-link-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '12px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title="Tomplay (Interaktive Noten)"
                    >
                      <Music size={14} style={{ strokeWidth: 2.5 }} />
                      <span>Tomplay Noten</span>
                      <ExternalLink size={12} style={{ opacity: 0.6 }} />
                    </button>
                  )}
                </div>
              </div>

              {activeSkill.is_pending_approval ? (
                <div style={{ background: 'linear-gradient(135deg, #fefce8, #fef9c3)', color: '#ca8a04', padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #fde047' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <Clock size={28} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>Wartet auf Bestätigung</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.8 }}>Dein Lehrer schaut sich deine Performance gerade an.</div>
                  </div>
                </div>
              ) : activeSkill.is_stage_ready ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ 
                    width: '64px', height: '64px', borderRadius: '20px', 
                    background: 'white', border: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '2rem', boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
                    flexShrink: 0
                  }}>
                    {APP_INSTRUMENT_ICONS[activeSkill.instrument]}
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #e6f4ea, #e6f4ea)', color: '#34a853', padding: '24px', borderRadius: '24px', flex: 1, display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #e6f4ea' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <Award size={28} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{getSkillLabel(activeSkill)} Meisterleistung!</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.8 }}>Du hast dieses Instrument zu 100% gemeistert.</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span style={{ fontSize: '1.2rem' }}>{APP_INSTRUMENT_ICONS[activeSkill.instrument]}</span>
                       {getSkillLabel(activeSkill)} Training
                    </span>
                    <span style={{ color: APP_INSTRUMENT_COLORS[activeSkill.instrument] || brandColor }}>{localProgress}%</span>
                  </div>
                  
                  <div style={{ position: 'relative', width: '100%', height: '40px', display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px' }}></div>
                    
                    <div style={{ 
                      position: 'absolute', 
                      height: '12px', 
                      width: `${localProgress}%`, 
                      background: APP_INSTRUMENT_COLORS[activeSkill.instrument] || brandColor, 
                      borderRadius: '6px', 
                      transition: 'width 0.2s ease-out' 
                    }}></div>
                    
                    <input 
                      type="range" 
                      min="0" max="90" step="5"
                      value={localProgress} 
                      onPointerDown={(e) => { e.stopPropagation(); setIsDragging(true); }}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setLocalProgress(val);
                      }}
                      onPointerUp={(e) => {
                        setIsDragging(false);
                        const finalVal = parseInt(e.currentTarget.value);
                        setLocalProgress(finalVal);
                        onUpdateProgress(activeSkill.id, finalVal, { 
                          songId: activeSkill.song_id, 
                          instrument: activeSkill.instrument, 
                          difficulty: activeSkill.difficulty_level,
                          partNumber: activeSkill.part_number || 1
                        });
                      }}
                      onPointerCancel={(e) => {
                        setIsDragging(false);
                        const finalVal = parseInt(e.currentTarget.value);
                        setLocalProgress(finalVal);
                        onUpdateProgress(activeSkill.id, finalVal, { 
                          songId: activeSkill.song_id, 
                          instrument: activeSkill.instrument, 
                          difficulty: activeSkill.difficulty_level,
                          partNumber: activeSkill.part_number || 1
                        });
                      }}
                      style={{ 
                        width: '100%', 
                        height: '40px', 
                        appearance: 'none', 
                        background: 'transparent', 
                        cursor: 'pointer', 
                        position: 'relative', 
                        zIndex: 10,
                        margin: 0,
                        color: APP_INSTRUMENT_COLORS[activeSkill.instrument] || brandColor
                      }} 
                      className="custom-range-slider"
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '200px', paddingTop: isMobile ? '12px' : '40px' }}>
              {!activeSkill.is_pending_approval && !activeSkill.is_stage_ready && localProgress >= 90 && (
                <button 
                  onMouseEnter={() => setIsChallengeHovered(true)}
                  onMouseLeave={() => setIsChallengeHovered(false)}
                  onClick={() => onSubmitForApproval({ ...activeSkill, progress: localProgress })} 
                  style={{ 
                    width: '100%', padding: '18px', borderRadius: '20px', 
                    background: isChallengeHovered ? '#000000' : brandColor, 
                    color: 'white', border: 'none', 
                    fontWeight: 900, fontSize: '1rem', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
                    boxShadow: isChallengeHovered ? `0 15px 30px rgba(0,0,0,0.3)` : `0 12px 24px ${brandColor}44`,
                    transform: isChallengeHovered ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }} 
                >
                  <Zap size={22} fill="white" /> CHALLENGE STARTEN
                </button>
              )}
            </div>
          </div>

          {songGroup.isBandSong && matchingBand && (() => {
            const required = songGroup.instrumentation || {};
            
            const normalize = (name: string) => {
              const n = (name || '').toLowerCase().trim();
              if (n === 'guitar' || n === 'e-gitarre') return 'E-Gitarre';
              if (n === 'bass' || n === 'e-bass') return 'E-Bass';
              if (n === 'drums' || n === 'e-drums' || n === 'schlagzeug') return 'E-Drums';
              if (n === 'piano' || n === 'keys' || n === 'e-piano') return 'E-Piano';
              if (n === 'vocals' || n === 'gesang') return 'Vocals';
              return name;
            };

            const filled: Record<string, number> = {};
            (matchingBand.band_members || []).forEach((m: any) => {
              const norm = normalize(m.instrument);
              filled[norm] = (filled[norm] || 0) + 1;
            });
            
            const missing: string[] = [];
            let isFullyStaffed = true;
            
            const bandSong = matchingBand.band_songs?.find((bs: any) => bs.song_id === songGroup.song_id);
            const isSongActive = 
              (matchingBand.songs?.id === songGroup.song_id) || 
              (bandSong?.status === 'active');

            if (isSongActive) {
              isFullyStaffed = true;
            } else {
              const order = ['E-Gitarre', 'E-Drums', 'E-Piano', 'E-Bass'];
              order.forEach(targetInst => {
                const matchingEntries = Object.entries(required).filter(([inst]) => {
                  const norm = normalize(inst);
                  const normTarget = normalize(targetInst);
                  return norm === normTarget;
                });

                matchingEntries.forEach(([inst, count]) => {
                  const normTarget = normalize(inst);
                  if (normTarget === 'Vocals') return;
                  
                  const needed = count as number;
                  const current = filled[normTarget] || 0;
                  if (current < needed) {
                    isFullyStaffed = false;
                    for(let i=0; i < (needed-current); i++) missing.push(inst);
                  }
                });
              });
            }

            return (
              <div style={{ marginTop: '32px', padding: '24px', background: isFullyStaffed ? 'linear-gradient(135deg, #f8fafc, #f1f5f9)' : '#f8fafc', borderRadius: '24px', border: isFullyStaffed ? '2px solid #eab308' : '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: '#ec4899' }}><Users size={20} /></div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Band-Belegung: <span style={{ color: '#ec4899' }}>{matchingBand.name}</span>
                    </div>
                  </div>
                  
                  {isFullyStaffed ? (
                    <div style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)', color: 'white', padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)' }}>
                      <Star size={14} fill="white" /> VOLLSTÄNDIG
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8' }}>
                      {missing.length} Platz {missing.length === 1 ? 'frei' : 'frei'}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {(() => {
                    const grouped: Record<string, any> = {};
                    (matchingBand.band_members || []).forEach((m: any) => {
                      const u = Array.isArray(m.users) ? m.users[0] : m.users;
                      const uid = u?.id || m.external_name || m.user_id;
                      if (!uid) return;
                      if (!grouped[uid]) {
                        grouped[uid] = { ...m, user: u, instruments: [m.instrument] };
                      } else {
                        if (!grouped[uid].instruments.includes(m.instrument)) {
                          grouped[uid].instruments.push(m.instrument);
                        }
                      }
                    });

                    return Object.values(grouped).map((member: any, idx: number) => {
                      const u = member.user;
                      const nonVocals = member.instruments.filter((inst: string) => !inst.toLowerCase().includes('vocals') && !inst.toLowerCase().includes('gesang'));
                      const displayInst = nonVocals.length > 0 ? nonVocals[0] : member.instruments[0];

                      return (
                        <div key={`mem-${idx}`} style={{ 
                          display: 'flex', alignItems: 'center', gap: '10px', 
                          background: 'white', padding: '8px 14px', borderRadius: '16px', 
                          border: member.user_id === userId ? '1.5px solid #ef4444' : '1px solid #f1f5f9',
                          boxShadow: member.user_id === userId ? '0 4px 12px rgba(239, 68, 68, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)' 
                        }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
                            {member.user_id ? (
                               <StudioAvatar src={u?.photo_url} user={u} />
                            ) : (
                               <div style={{ width: '100%', height: '100%', background: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900 }}>{member.external_name?.[0] || 'E'}</div>
                            )}
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                            {APP_INSTRUMENT_ICONS[displayInst] || '🎸'} {member.user_id ? (u?.first_name || 'Mitglied') : member.external_name}
                          </div>
                        </div>
                      );
                    });
                  })()}
                  
                  {missing.map((inst, idx) => (
                    <div key={`miss-${idx}`} style={{ 
                      display: 'flex', alignItems: 'center', gap: '10px', 
                      background: 'rgba(0,0,0,0.02)', padding: '8px 14px', borderRadius: '16px', 
                      border: '1px dashed #cbd5e1', opacity: 0.6
                    }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                        ?
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8' }}>
                        {APP_INSTRUMENT_ICONS[inst] || '🎸'} Gesucht
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {isConfirmingDelete ? (
          <div style={{ display: 'flex', gap: '8px', animation: 'scaleIn 0.2s' }}>
             <button 
              onClick={() => onDelete(songGroup.song_id)}
              style={{ 
                width: '52px', height: '52px', borderRadius: '18px', 
                background: '#f43f5e', border: 'none', color: 'white', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
              title="Endgültig löschen"
            >
              <Check size={24} strokeWidth={3} />
            </button>
            <button 
              onClick={() => setIsConfirmingDelete(false)}
              style={{ 
                width: '52px', height: '52px', borderRadius: '18px', 
                background: '#94a3b8', border: 'none', color: 'white', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
              title="Abbrechen"
            >
              <X size={24} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsConfirmingDelete(true)}
            style={{ 
              width: '52px', height: '52px', borderRadius: '18px', 
              background: '#fff1f2', 
              border: '1px solid #ffe4e6', 
              color: '#f43f5e', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              cursor: 'pointer', transition: 'all 0.2s',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(244, 63, 94, 0.1)'
            }}
            className="hover-scale"
            title="Arrangement entfernen"
          >
            <Trash2 size={24} />
          </button>
        )}
      </div>
    </div>
  );
}

export default GroupedSongCard;
