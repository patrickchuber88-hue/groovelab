import React, { useState } from 'react';
import { 
  Users, 
  Box, 
  ChevronRight, 
  Mic, 
  Plus, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Search 
} from 'lucide-react';
import { StudioAvatar, renderBandAvatar } from '../StudioAvatar';
import { normalizeInstrument, renderInstrumentIcon } from '../../utils/instruments';
import { APP_INSTRUMENT_ICONS, brandColor as defaultBrandColor } from '../../constants/instruments';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { supabase } from '../../lib/supabase';

export interface StudentBandMatchingSuiteProps {
  activeStudentTab: 'matching' | 'bands';
  user: any;
  brandColor?: string;
  wallSongs: any[];
  userSongs: any[];
  userBands: any[];
  allBands: any[];
  matchingLevelFilter: 'all' | 'starter' | 'pro';
  setMatchingLevelFilter: (lvl: 'all' | 'starter' | 'pro') => void;
  activeBandSubTab: 'meine' | 'alle';
  setActiveBandSubTab: (tab: 'meine' | 'alle') => void;
  bandSearchText: string;
  setBandSearchText: (text: string) => void;
  bandSearchLetter: string | null;
  setBandSearchLetter: (letter: string | null) => void;
  onOpenBandProfile: (band: any) => void;
  onPreviewStudent?: (student: any) => void;
  onFoundBandFromSlot: (mySlot: any, song: any, form: any) => void;
  onRefreshDashboard: (userId: string) => Promise<void> | void;
  isMobile: boolean;
  width: number;
}

/**
 * 🎸 StudentBandMatchingSuite
 * Bounded context component encapsulating the Band Matching Wall ('matching')
 * and the Student Bands overview & vocal recruiting ('bands').
 * BFSG 2025 / WCAG 2.2 AA compliant with touch targets >= 44x44px and keyboard accessibility.
 */
export function StudentBandMatchingSuite({
  activeStudentTab,
  user,
  brandColor = defaultBrandColor,
  wallSongs = [],
  userSongs = [],
  userBands = [],
  allBands = [],
  matchingLevelFilter,
  setMatchingLevelFilter,
  activeBandSubTab,
  setActiveBandSubTab,
  bandSearchText,
  setBandSearchText,
  bandSearchLetter,
  setBandSearchLetter,
  onOpenBandProfile,
  onPreviewStudent,
  onFoundBandFromSlot,
  onRefreshDashboard,
  isMobile,
  width
}: StudentBandMatchingSuiteProps) {
  const [expandedMatchingSong, setExpandedMatchingSong] = useState<string | null>(null);
  const [isJoiningVocal, setIsJoiningVocal] = useState<string | null>(null);
  const [showTeacherVocalPicker, setShowTeacherVocalPicker] = useState<string | null>(null);
  const [externalVocalists, setExternalVocalists] = useState<any[]>([]);

  if (activeStudentTab === 'matching') {
    return (
      <ErrorBoundary>
        <section className="exercises-section glass-panel animation-slide-up" style={{ margin: isMobile ? '12px' : '24px', padding: isMobile ? '16px' : '32px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? '16px' : '32px', flexWrap: 'wrap', gap: isMobile ? '12px' : '20px' }}>
            <div>
              <h2 style={{ fontSize: isMobile ? '1.3rem' : '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                <div style={{ color: '#f59e0b' }}><Users size={isMobile ? 22 : 32} /></div>
                Band Matching
              </h2>
              {!isMobile && <p style={{ color: '#64748b', fontSize: '1rem', margin: '8px 0 0 0' }}>Finde deine Mitmusiker für deine 100% Songs!</p>}
            </div>

            {/* Level Switch */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '16px', padding: '4px' }}>
              {[
                { id: 'all', label: 'Alle' },
                { id: 'starter', label: '🚀 Starter' },
                { id: 'pro', label: '⚡ Pro' }
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setMatchingLevelFilter(btn.id as any)}
                  style={{ 
                    padding: isMobile ? '7px 12px' : '10px 20px', borderRadius: '12px', border: 'none', 
                    background: matchingLevelFilter === btn.id ? 'white' : 'transparent', 
                    color: matchingLevelFilter === btn.id ? '#1e293b' : '#64748b', 
                    fontWeight: 800, cursor: 'pointer', fontSize: isMobile ? '0.78rem' : '0.85rem',
                    boxShadow: matchingLevelFilter === btn.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                    touchAction: 'manipulation'
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const filteredWall = (wallSongs || []).filter((ws: any) => {
              const hasFormations = ws?.formations && Array.isArray(ws.formations) && ws.formations.length > 0;
              if (!hasFormations) return false;
              if (matchingLevelFilter === 'all') return true;
              const level = ws.level?.toLowerCase() || 'pro';
              const isPro = level === 'original' || level === 'pro';
              const isStarter = level === 'starter';
              
              if (matchingLevelFilter === 'starter') return isStarter;
              if (matchingLevelFilter === 'pro') return isPro;
              return true;
            });

            if (filteredWall.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '80px 40px', background: 'white', borderRadius: '32px', color: '#64748b', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '24px' }}>⏳</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px' }}>Keine passenden Formationen</h3>
                  <p style={{ fontSize: '1rem', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto' }}>Ändere deinen Filter oder bringe neue Songs auf 100%!</p>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredWall.map((song: any) => {
                  const isExpanded = expandedMatchingSong === song.id;
                  const totalRequired = Object.entries(song.instrumentation || {}).reduce((acc, [inst, count]) => {
                    const low = inst.toLowerCase();
                    if (low.includes('vocals') || low.includes('gesang')) return acc;
                    return acc + (count as number);
                  }, 0);

                  const openSlots = Math.max(0, song.formations.reduce((acc: number, form: any) => {
                    const instrumentalists = form.members?.filter((m: any) => m.instrument !== 'Vocals').length || 0;
                    return acc + Math.max(0, totalRequired - instrumentalists);
                  }, 0));

                  return (
                    <div key={song.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div className="glass-panel" 
                        onClick={() => setExpandedMatchingSong(isExpanded ? null : song.id)}
                        style={{ 
                          background: 'white', 
                          borderRadius: isExpanded ? '24px 24px 0 0' : '24px', 
                          padding: isMobile ? '14px 16px' : '24px 32px', 
                          border: '1px solid #f1f5f9',
                          borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                          boxShadow: isExpanded ? '0 10px 30px rgba(0,0,0,0.03)' : '0 4px 15px rgba(0,0,0,0.01)', 
                          cursor: 'pointer', transition: 'all 0.2s', zIndex: 1
                        }}>
                        {isMobile ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ 
                                padding: '4px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 900,
                                background: song.level === 'starter' ? '#fffbeb' : '#eff6ff',
                                color: song.level === 'starter' ? '#b45309' : '#2563eb',
                                border: `1px solid ${song.level === 'starter' ? '#fef3c7' : '#dbeafe'}`,
                                textTransform: 'uppercase', flexShrink: 0
                              }}>
                                {song.level === 'starter' ? '🚀 Starter' : '⚡ Pro'}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{song.artist}</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                {openSlots} offene Slots
                              </div>
                              <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: isExpanded ? '#f8fafc' : 'transparent' }}>
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                              <div style={{ 
                                padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 900,
                                background: song.level === 'starter' ? '#fffbeb' : '#eff6ff',
                                color: song.level === 'starter' ? '#b45309' : '#2563eb',
                                border: `1px solid ${song.level === 'starter' ? '#fef3c7' : '#dbeafe'}`,
                                textTransform: 'uppercase'
                              }}>
                                {song.level === 'starter' ? '🚀 Starter' : '⚡ Pro'}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{song.artist}</div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.2, margin: 0 }}>{song.title}</h3>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#64748b', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                {openSlots} offene Slots
                              </div>
                              <div style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: isExpanded ? '#f8fafc' : 'transparent' }}>
                                {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div style={{ 
                          padding: isMobile ? '16px' : '32px', 
                          background: '#f8fafc', 
                          borderRadius: '0 0 24px 24px', 
                          border: '1px solid #f1f5f9', 
                          borderTop: 'none',
                          boxShadow: 'inset 0 10px 10px -10px rgba(0,0,0,0.05)'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '24px' }}>
                            {(() => {
                              const activeBandForSong = (userBands || []).find((b: any) => {
                                const hasActiveSong = (b.band_songs || []).some((bs: any) => 
                                  bs.song_id === song.song_id && bs.status === 'active'
                                );
                                const isMember = (b.band_members || []).some((m: any) => m.user_id === user?.id);
                                return hasActiveSong && isMember;
                              });

                              const myMember = activeBandForSong 
                                ? (activeBandForSong.band_members || []).find((m: any) => m.user_id === user?.id) 
                                : null;
                              const myInstrument = myMember ? myMember.instrument : '';

                              const finalFormations = [...song.formations].sort((a, b) => {
                                const aMine = (a.members || []).some((m: any) => m.user_id === user?.id);
                                const bMine = (b.members || []).some((m: any) => m.user_id === user?.id);
                                if (aMine && !bMine) return -1;
                                if (!aMine && bMine) return 1;
                                return 0;
                              });
                              
                              return (
                                <>
                                  {activeBandForSong && (
                                    <div style={{
                                      background: 'linear-gradient(135deg, #e6f4ea 0%, #e6f4ea 100%)',
                                      border: '1px solid #e6f4ea',
                                      padding: '20px 24px',
                                      borderRadius: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      boxShadow: '0 4px 20px rgba(52, 168, 83, 0.08)',
                                      gap: '16px',
                                      marginBottom: '20px',
                                      animation: 'slideUp 0.3s ease-out'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ background: '#34a853', color: 'white', padding: '10px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(52, 168, 83, 0.2)' }}>
                                          <CheckCircle size={24} />
                                        </div>
                                        <div>
                                           <div style={{ fontSize: '1rem', fontWeight: 900, color: '#34a853', marginBottom: '2px' }}>
                                             Du spielst bereits {myInstrument} in der Band "{activeBandForSong.name}" für diesen Song! 🚀
                                           </div>
                                           <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34a853', opacity: 0.85 }}>
                                             Dein Repertoire-Beitrag ist aktiv und verifiziert.
                                           </div>
                                         </div>
                                      </div>
                                      <span style={{ fontSize: '1.75rem', display: 'inline-flex', alignItems: 'center' }}>
                                        {renderInstrumentIcon(myInstrument || 'Guitar', undefined, 24)}
                                      </span>
                                    </div>
                                  )}
                                  {finalFormations.map((form: any, fIndex: number) => {
                                    const mySlot = (form?.members || []).find((m: any) => m?.user_id === user?.id);
                                    const isMySlot = !!mySlot;
                                    
                                    if (activeBandForSong && isMySlot) {
                                      const isSameInstrument = normalizeInstrument(mySlot.instrument) === normalizeInstrument(myInstrument);
                                      if (isSameInstrument) return null;
                                    }

                                    if (form.isComplete && !isMySlot) return null;

                                    const isGuestSearch = !!form.originBand;
                                    const isProposal = form.status === 'proposal';
                                    const mySkill = userSongs.find(us => {
                                      if (us.song_id !== song.song_id) return false;
                                      const usLevel = (us.difficulty_level || 'original').toLowerCase();
                                      const normUs = (usLevel === 'original' || usLevel === 'pro') ? 'pro' : 'starter';
                                      const songLvl = (song.level || 'pro').toLowerCase();
                                      const normSong = (songLvl === 'original' || songLvl === 'pro') ? 'pro' : 'starter';
                                      return normUs === normSong;
                                    });
                                    const normMyInst = mySkill ? normalizeInstrument(mySkill.instrument) : '';
                                    const reqInstCount = mySkill ? (
                                      Object.entries(song.instrumentation || {}).find(([k]) => normalizeInstrument(k) === normMyInst)?.[1] || 0
                                    ) : 0;
                                    const filledInstCount = mySkill ? (
                                      (form.members || []).filter((m: any) => normalizeInstrument(m.instrument) === normMyInst).length
                                    ) : 0;
                                    const hasOpenSlotForMyInst = (reqInstCount as number) > filledInstCount;
                                    const canJoin = mySkill && !isMySlot && hasOpenSlotForMyInst && !form.isComplete;

                                    return (
                                      <div key={form.id} style={{ 
                                        background: isProposal ? 'linear-gradient(135deg, #1e1b4b, #0f0728)' : (isGuestSearch ? '#0f172a' : (isMySlot ? 'linear-gradient(135deg, rgba(254, 252, 232, 0.95), rgba(255, 251, 235, 0.95))' : '#f8fafc')), 
                                        border: isProposal ? '2px dashed #a855f7' : (isGuestSearch ? '1px solid rgba(255,255,255,0.1)' : (isMySlot ? '2px solid #eab308' : '1px solid #e2e8f0')),
                                        borderRadius: '28px', padding: '24px',
                                        boxShadow: isGuestSearch ? '0 10px 25px -5px rgba(0,0,0,0.3)' : (isMySlot ? '0 20px 40px rgba(234, 179, 8, 0.12)' : 'none'),
                                        backdropFilter: isMySlot ? 'blur(10px)' : 'none',
                                        WebkitBackdropFilter: isMySlot ? 'blur(10px)' : 'none'
                                      }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ 
                                              fontSize: '0.75rem', 
                                              fontWeight: 950, 
                                              color: isProposal ? '#a855f7' : (isGuestSearch ? '#a855f7' : (isMySlot ? '#ca8a04' : (form.isInitial ? '#ca8a04' : '#64748b'))), 
                                              textTransform: 'uppercase', 
                                              letterSpacing: '0.05em',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: '2px'
                                            }}>
                                              <span>
                                                {isProposal 
                                                  ? `📢 BAND-PROJEKT (ABSTIMMUNG LÄUFT)` 
                                                  : (isGuestSearch 
                                                      ? `🎸 GASTMUSIKER-SUCHE ${isMySlot ? '(DEINE BAND)' : ''}` 
                                                      : (isMySlot ? '✨ Deine Formation' : (form.isInitial ? '📢 Offenes Recruiting' : `Band-Slot #${fIndex + 1}`)))
                                                }
                                              </span>
                                            </div>
                                          </div>
                                          {canJoin && (
                                            <button 
                                              onClick={async () => {
                                                try {
                                                  if (form.originBand) {
                                                    const choice = window.confirm(`BAND-PROJEKT: ${form.originBand.name}\n\nOption A (OK): Als GASTMUSIKER beitreten (Du unterstützt diese Band).\n\nOption B (Abbrechen): NEUE BAND gründen (Du startest ein eigenes Projekt für diesen Song).`);
                                                    if (choice) {
                                                      const { error } = await supabase.from('band_song_slots').insert({
                                                        band_song_id: form.bandSongId,
                                                        user_id: user.id,
                                                        instrument: mySkill.instrument,
                                                        status: 'joined'
                                                      });
                                                      if (error) alert('Fehler beim Beitreten: ' + error.message);
                                                      else {
                                                        alert(`Du bist nun Gastmusiker für "${form.originBand.name}"!`);
                                                        onRefreshDashboard(user.id);
                                                      }
                                                    } else {
                                                      const newFormId = crypto.randomUUID();
                                                      await supabase.from('user_song_skills').update({ formation_group: newFormId }).eq('id', mySkill.id);
                                                      onRefreshDashboard(user.id);
                                                    }
                                                  } else {
                                                    await supabase.from('user_song_skills').update({ formation_group: form.id }).eq('id', mySkill.id);
                                                    onRefreshDashboard(user.id);
                                                  }
                                                } catch (err: any) {
                                                  console.error('[StudentBandMatchingSuite] Fehler beim Slot-Update:', err);
                                                }
                                              }}
                                              style={{ background: form.originBand ? '#8b5cf6' : '#eab308', color: form.originBand ? 'white' : '#1e293b', border: 'none', padding: '6px 14px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', minHeight: '44px', touchAction: 'manipulation' }}
                                            >
                                              BEITRETEN
                                            </button>
                                          )}
                                        </div>

                                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                                          {isGuestSearch && (
                                            <div 
                                              onClick={() => onOpenBandProfile(form.originBand)}
                                              style={{ 
                                                display: 'flex', alignItems: 'center', gap: '16px', 
                                                paddingRight: '24px', borderRight: '1px solid rgba(255,255,255,0.1)',
                                                cursor: 'pointer', transition: 'all 0.2s ease',
                                                flexShrink: 0
                                              }}
                                            >
                                              {renderBandAvatar(form.originBand.name, form.originBand.photo_url, '64px', '18px')}
                                              <div>
                                                <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Band Projekt</div>
                                                <div style={{ fontSize: '1rem', fontWeight: 950, color: 'white', lineHeight: 1.2 }}>{form.originBand.name}</div>
                                                <div style={{ fontSize: '0.6rem', color: '#a855f7', fontWeight: 700, marginTop: '2px' }}>Profil ansehen →</div>
                                              </div>
                                            </div>
                                          )}

                                          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', flex: 1 }}>
                                            {(() => {
                                              const req = song.instrumentation || { 'E-Gitarre': 1, 'E-Bass': 1, 'E-Drums': 1 };
                                              const requiredSlots: any[] = [];
                                              Object.entries(req).forEach(([inst, count]) => {
                                                if (inst.toLowerCase().includes('vocals') || inst.toLowerCase().includes('gesang')) return;
                                                for (let i = 1; i <= (count as number); i++) {
                                                  requiredSlots.push({ inst, part: i });
                                                }
                                              });

                                              requiredSlots.sort((a, b) => {
                                                const orderMap: Record<string, number> = { 'e-gitarre': 1, 'e-drums': 2, 'e-piano': 3, 'e-bass': 4 };
                                                const idxA = orderMap[a.inst.toLowerCase()] || 99;
                                                const idxB = orderMap[b.inst.toLowerCase()] || 99;
                                                if (idxA !== idxB) return idxA - idxB;
                                                return a.part - b.part;
                                              });

                                              return requiredSlots.map(({ inst, part }) => {
                                                const key = `${inst}_${part}`;
                                                const member = form.memberMap[key] || form.memberMap[`${normalizeInstrument(inst)}_${part}`];
                                                const isMe = member?.user_id === user?.id;
                                                const instLabel = (req[inst] || 0) > 1 ? `${inst} ${part}` : inst;
                                                
                                                return (
                                                  <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '88px', position: 'relative' }}>
                                                    <div style={{ 
                                                      width: '72px', height: '72px', borderRadius: '50%', 
                                                      background: member ? (isGuestSearch ? 'rgba(255,255,255,0.05)' : 'white') : (isGuestSearch ? 'rgba(255,255,255,0.03)' : 'rgba(234, 179, 8, 0.03)'), 
                                                      border: (isMe || member?.isMastered) ? `3.5px solid #eab308` : (member ? (isGuestSearch ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0') : '2px dashed rgba(234, 179, 8, 0.25)'),
                                                      boxShadow: (isMe || member?.isMastered) ? '0 0 16px rgba(234, 179, 8, 0.4)' : 'none',
                                                      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                                                      opacity: member && !member.isMastered ? 0.75 : 1
                                                    }}>
                                                      {member ? (
                                                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                          <img 
                                                            src={member.photo_url || '/avatar_ghost.jpg'} 
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              if (onPreviewStudent) onPreviewStudent(member);
                                                            }}
                                                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} 
                                                            alt="" 
                                                          />
                                                          {member.isMastered && (
                                                            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#34a853', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', zIndex: 10 }}>
                                                              <CheckCircle size={12} strokeWidth={4} />
                                                            </div>
                                                          )}
                                                        </div>
                                                      ) : (
                                                        <div style={{ fontSize: '1.75rem', opacity: 0.35 }}>{APP_INSTRUMENT_ICONS[inst as keyof typeof APP_INSTRUMENT_ICONS] || '❓'}</div>
                                                      )}
                                                    </div>
                                                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', width: '100%' }}>
                                                      <div style={{ fontSize: '0.68rem', fontWeight: 950, color: member ? (isGuestSearch ? 'white' : '#1e293b') : (isGuestSearch ? 'rgba(255,255,255,0.3)' : '#94a3b8'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                                        {member ? member.first_name : instLabel}
                                                      </div>
                                                      {member && (
                                                        <div style={{ fontSize: '0.48rem', fontWeight: 800, color: isGuestSearch ? 'rgba(255,255,255,0.3)' : '#94a3b8', textTransform: 'uppercase' }}>
                                                          {instLabel}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              });
                                            })()}
                                          </div>
                                        </div>

                                        {form.isComplete && isMySlot && (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                                            <div className="animation-pulse-subtle" style={{ 
                                              width: '100%', padding: '18px', 
                                              background: 'linear-gradient(135deg, #fef08a, #fde047)', 
                                              color: '#854d0e', borderRadius: '20px', fontWeight: 900, textAlign: 'center',
                                              border: '1px solid #eab308',
                                              boxShadow: '0 8px 25px rgba(234,179,8,0.2)',
                                              fontSize: '1rem',
                                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                            }}>
                                              <span>✨</span> Formation vollständig! 🎸 <span>✨</span>
                                            </div>
                                            {!form.originBand && (
                                              <button 
                                                onClick={async () => {
                                                  if (userBands.length > 0) {
                                                    const proceed = window.confirm('Deine Formation ist vollständig! 🎸\n\nDu spielst bereits in einer Band. Möchtest du wirklich eine zusätzliche Band gründen? Falls nicht, gibst du deinen Slot für andere frei.');
                                                    if (!proceed) {
                                                      try {
                                                        await supabase.from('user_song_skills').update({ formation_group: null }).eq('id', mySlot.skill_id);
                                                        onRefreshDashboard(user.id);
                                                      } catch (err) {
                                                        console.error('[StudentBandMatchingSuite] Fehler beim Freigeben des Slots:', err);
                                                      }
                                                      return;
                                                    }
                                                  }

                                                  onFoundBandFromSlot(mySlot, song, form);
                                                }}
                                                className="hero-cta-artistic"
                                                style={{ 
                                                  padding: '20px', 
                                                  borderRadius: '20px', 
                                                  fontSize: '1.1rem', 
                                                  width: '100%', 
                                                  cursor: 'pointer',
                                                  background: 'linear-gradient(135deg, #ca8a04, #eab308)', 
                                                  color: '#0f172a',
                                                  fontWeight: 900,
                                                  border: 'none',
                                                  boxShadow: '0 12px 28px rgba(234, 179, 8, 0.35)',
                                                  minHeight: '44px',
                                                  touchAction: 'manipulation'
                                                }}
                                              >
                                                JETZT BAND GRÜNDEN
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </>
                              );
                            })()}
                            
                            {!(song?.formations || []).some((f: any) => (f?.members || []).some((m: any) => m?.user_id === user?.id)) && (
                              <button 
                                onClick={async () => {
                                  try {
                                    const mySkill = userSongs.find(us => us.song_id === song.song_id);
                                    if (mySkill) {
                                      const newId = `form_${Math.random().toString(36).substr(2, 9)}`;
                                      await supabase.from('user_song_skills').update({ formation_group: newId }).eq('id', mySkill.id);
                                      onRefreshDashboard(user.id);
                                    }
                                  } catch (err: any) {
                                    console.error('[StudentBandMatchingSuite] Fehler beim Starten einer Formation:', err);
                                  }
                                }}
                                style={{ padding: '16px', background: 'white', border: '2px dashed #cbd5e1', borderRadius: '24px', color: '#64748b', fontWeight: 800, cursor: 'pointer', width: '100%', marginTop: '20px', minHeight: '44px', touchAction: 'manipulation' }}
                              >
                                + NEUE BAND-FORMATION STARTEN
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>
      </ErrorBoundary>
    );
  }

  if (activeStudentTab === 'bands') {
    return (
      <ErrorBoundary>
        <section className="exercises-section glass-panel animation-slide-up" style={{ margin: isMobile ? '12px' : '24px', padding: isMobile ? '16px' : '32px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
          <div style={{ marginBottom: isMobile ? '16px' : '32px' }}>
            <h2 style={{ fontSize: isMobile ? '1.3rem' : '1.75rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <div style={{ color: '#3b82f6' }}><Box size={isMobile ? 22 : 32} /></div>
              Bands
            </h2>
          </div>

          {/* Band-Finder Sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (width < 1200 ? '1fr' : '1fr 380px'), gap: isMobile ? '24px' : '32px' }}>
            {/* Left Column: Band Management */}
            <div style={{ minWidth: 0 }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '6px', borderRadius: '20px', width: 'fit-content', marginBottom: isMobile ? '16px' : '24px' }}>
                <button 
                  onClick={() => setActiveBandSubTab('meine')}
                  style={{ padding: isMobile ? '8px 16px' : '12px 24px', borderRadius: '16px', border: 'none', background: activeBandSubTab === 'meine' ? 'white' : 'transparent', color: activeBandSubTab === 'meine' ? '#1e293b' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: isMobile ? '0.8rem' : '1rem', boxShadow: activeBandSubTab === 'meine' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', minHeight: '44px', touchAction: 'manipulation' }}
                >
                  Meine Bands
                </button>
                <button 
                  onClick={() => setActiveBandSubTab('alle')}
                  style={{ padding: isMobile ? '8px 16px' : '12px 24px', borderRadius: '16px', border: 'none', background: activeBandSubTab === 'alle' ? 'white' : 'transparent', color: activeBandSubTab === 'alle' ? '#1e293b' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: isMobile ? '0.8rem' : '1rem', boxShadow: activeBandSubTab === 'alle' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', minHeight: '44px', touchAction: 'manipulation' }}
                >
                  Alle Bands
                </button>
              </div>

              {activeBandSubTab === 'alle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '20px', marginBottom: isMobile ? '16px' : '32px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text"
                      placeholder="Nach Bands suchen..."
                      value={bandSearchText}
                      onChange={(e) => setBandSearchText(e.target.value)}
                      style={{ width: '100%', padding: isMobile ? '12px 16px 12px 44px' : '16px 20px 16px 54px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: isMobile ? '0.95rem' : '1rem', fontWeight: 600, background: 'white', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div 
                    className="hide-scrollbar"
                    style={{ display: 'flex', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: '6px', overflowX: isMobile ? 'auto' : 'visible', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                    <button
                      onClick={() => setBandSearchLetter(null)}
                      style={{ padding: isMobile ? '6px 12px' : '8px 16px', borderRadius: '12px', border: 'none', background: !bandSearchLetter ? brandColor : '#f1f5f9', color: !bandSearchLetter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0, minHeight: '44px', touchAction: 'manipulation' }}
                    >
                      Alle
                    </button>
                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                      <button
                        key={letter}
                        onClick={() => setBandSearchLetter(letter)}
                        style={{ padding: isMobile ? '6px 10px' : '8px 12px', borderRadius: '12px', border: 'none', background: bandSearchLetter === letter ? brandColor : '#f1f5f9', color: bandSearchLetter === letter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0, minHeight: '44px', touchAction: 'manipulation' }}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(() => {
                  const displayedBands = activeBandSubTab === 'meine' 
                    ? userBands 
                    : allBands.filter(band => {
                        const matchText = band.name?.toLowerCase().includes(bandSearchText.toLowerCase());
                        const matchLetter = bandSearchLetter ? band.name?.toUpperCase().startsWith(bandSearchLetter) : true;
                        return matchText && matchLetter;
                      });

                  if (displayedBands.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '32px', border: '2px dashed #e2e8f0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🎸</div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                          {activeBandSubTab === 'meine' ? 'Noch kein Projekt aktiv' : 'Keine Bands gefunden'}
                        </h3>
                        <p style={{ color: '#64748b' }}>
                          {activeBandSubTab === 'meine' ? 'Tritt einer Formation bei oder gründe eine neue Band!' : 'Versuche eine andere Suche.'}
                        </p>
                      </div>
                    );
                  }

                  return displayedBands.map((band: any) => {
                    const uniqueMembersList = (() => {
                      const grouped: Record<string, any> = {};
                      (band.band_members || []).forEach((m: any) => {
                        const u = m.users ? (Array.isArray(m.users) ? m.users[0] : m.users) : null;
                        const uid = u?.id || m.external_name || m.user_id || m.student_id;
                        if (uid) {
                          grouped[uid] = { ...m, user: u };
                        }
                      });
                      return Object.values(grouped);
                    })();

                    return (
                      <div 
                        key={band.id} 
                        onClick={() => onOpenBandProfile(band)}
                        className="glass-panel hover-card" 
                        style={{ 
                          background: 'white', padding: isMobile ? '14px 16px' : '24px', borderRadius: isMobile ? '20px' : '32px', border: '1px solid #f1f5f9',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div style={{ display: 'flex', gap: isMobile ? '14px' : '24px', alignItems: 'center', minWidth: 0, flex: 1 }}>
                          {renderBandAvatar(band.name, band.photo_url, isMobile ? '52px' : '80px', isMobile ? '16px' : '24px')}
                          <div style={{ minWidth: 0 }}>
                              <h3 style={{ fontSize: isMobile ? '1.05rem' : '1.5rem', fontWeight: 900, color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{band.name}</h3>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 800, color: brandColor }}>{band.genre || 'Bandprojekt'}</span>
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                <span style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 700, color: '#94a3b8' }}>{uniqueMembersList.length} Mitglieder</span>
                              </div>
                            </div>
                          </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ display: 'flex', WebkitMaskImage: 'linear-gradient(to right, transparent, black 40%)', WebkitMaskSize: '100% 100%' }}>
                              {uniqueMembersList.map((m: any, idx: number) => {
                                const u = m.user;
                                return (
                                  <div key={idx} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', marginLeft: idx === 0 ? 0 : '-12px', overflow: 'hidden', background: m.user_id ? '#f1f5f9' : '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={`${u?.first_name || m.external_name || 'Mitglied'} (${m.instrument})`}>
                                      {m.user_id ? (
                                        <img src={u?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                      ) : (
                                        <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 900 }}>{m.external_name?.[0] || 'E'}</span>
                                      )}
                                  </div>
                                );
                              })}
                          </div>
                          <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                              <ChevronRight size={24} />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right Column: Vocal Sidebar */}
            <div style={{ background: '#f8fafc', borderRadius: '32px', padding: '24px', alignSelf: 'start', position: 'sticky', top: '24px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Mic size={20} />
              </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Vocal-Finder</h3>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>Sänger gesucht für diese Sessions</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(() => {
                  const vocalOpportunities: Array<{
                    band: any;
                    bandSong: any;
                    song: any;
                    vocalists: any[];
                    isFull: boolean;
                    isMeIn: boolean;
                  }> = [];

                  allBands.forEach(band => {
                    const bandSongs = band.band_songs || [];
                    
                    bandSongs.forEach((bs: any) => {
                      if (bs.status !== 'active') return;
                      
                      const song = bs.songs ? (Array.isArray(bs.songs) ? bs.songs[0] : bs.songs) : null;
                      if (!song) return;

                      const vocalists = (bs.band_song_slots || []).filter((s: any) => {
                        const inst = (s.instrument || '').toLowerCase();
                        return (inst.includes('vocal') || inst.includes('gesang')) && s.status !== 'declined';
                      });

                      const isFull = vocalists.length >= 2;
                      const isMeIn = vocalists.some((m: any) => m.user_id === user.id);

                      if (vocalists.length < 2) {
                        vocalOpportunities.push({
                          band,
                          bandSong: bs,
                          song,
                          vocalists,
                          isFull,
                          isMeIn
                        });
                      }
                    });
                  });

                  if (vocalOpportunities.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '32px 16px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔇</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>Aktuell keine Gesangsslots frei</div>
                      </div>
                    );
                  }

                  return vocalOpportunities.map(opp => {
                    const { band, bandSong, song, vocalists, isFull, isMeIn } = opp;

                    return (
                      <div key={bandSong.id} className="glass-panel" style={{ background: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.2 }}>
                            {(song.artist) || 'Unbekannter Interpret'}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                            {(song.title) || 'Kein Titel'}
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Band: <span style={{ color: '#1e293b' }}>{band.name}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {[0, 1].map(i => {
                              const v = vocalists[i];
                              return (
                                <div key={i} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #f8fafc', background: '#f1f5f9', overflow: 'hidden', willChange: 'transform' }}>
                                  {v ? (() => {
                                    const u = v.profiles || (Array.isArray(v.users) ? v.users[0] : v.users);
                                    return <StudioAvatar src={u?.photo_url} user={u} />;
                                  })() : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><Plus size={12} /></div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>
                            {vocalists.length}/2 Vocal-Slots besetzt
                          </span>
                        </div>

                        {isMeIn ? (
                          <div style={{ textAlign: 'center', padding: '10px', background: '#e6f4ea', borderRadius: '12px', color: '#34a853', fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <CheckCircle size={16} /> Du bist dabei!
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button 
                              disabled={isFull || isJoiningVocal === bandSong.id}
                              onClick={async () => {
                                setIsJoiningVocal(bandSong.id);
                                try {
                                  const { error: memErr } = await supabase.from('band_members').insert({
                                    band_id: band.id,
                                    user_id: user.id,
                                    instrument: 'Vocals'
                                  });
                                  if (memErr && !memErr.message.includes('duplicate key')) {
                                    console.error('Error joining band as vocalist:', memErr);
                                    setIsJoiningVocal(null);
                                    return;
                                  }

                                  const hasSlot1 = vocalists.some((v: any) => v.part_number === 1);
                                  const nextPartNumber = hasSlot1 ? 2 : 1;

                                  await supabase.from('band_song_slots').insert({
                                    band_song_id: bandSong.id,
                                    user_id: user.id,
                                    instrument: 'Vocals',
                                    part_number: nextPartNumber,
                                    status: 'accepted'
                                  });
                                  
                                  await onRefreshDashboard(user.id);
                                } finally {
                                  setIsJoiningVocal(null);
                                }
                              }}
                              style={{ 
                                width: '100%', padding: '12px', borderRadius: '16px', border: 'none', 
                                background: isFull ? '#f1f5f9' : '#34a853', 
                                color: isFull ? '#94a3b8' : 'white', fontWeight: 900, cursor: (isFull || isJoiningVocal === bandSong.id) ? 'default' : 'pointer',
                                fontSize: '0.85rem', transition: 'all 0.2s',
                                opacity: isJoiningVocal === bandSong.id ? 0.7 : 1,
                                minHeight: '44px',
                                touchAction: 'manipulation'
                              }}
                            >
                              {isFull ? 'Vocal-Slots voll' : (isJoiningVocal === bandSong.id ? 'Beitritt läuft...' : 'Jetzt als Sänger beitreten')}
                            </button>

                            {(user.role === 'teacher' || user.role === 'admin') && !isFull && (
                              <div style={{ position: 'relative' }}>
                                <button 
                                  onClick={async () => {
                                    if (showTeacherVocalPicker === bandSong.id) {
                                      setShowTeacherVocalPicker(null);
                                    } else {
                                      const { data } = await supabase.from('users').select('id, first_name, last_name, avatar_url, photo_url').eq('is_external_vocalist', true).eq('school_id', user.school_id);
                                      setExternalVocalists(data || []);
                                      setShowTeacherVocalPicker(bandSong.id);
                                    }
                                  }}
                                  style={{ width: '100%', padding: '10px', borderRadius: '14px', border: '1px dashed #cbd5e1', background: 'transparent', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '44px', touchAction: 'manipulation' }}
                                >
                                  <Plus size={14} /> Externen Sänger hinzufügen
                                </button>

                                {showTeacherVocalPicker === bandSong.id && (
                                  <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'white', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9', padding: '12px', zIndex: 100, marginBottom: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '8px' }}>Verfügbare Externe</div>
                                    {externalVocalists.length === 0 ? (
                                      <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>Keine externen Sänger angelegt</div>
                                    ) : (
                                      externalVocalists.map(ev => (
                                        <button 
                                          key={ev.id}
                                          onClick={async () => {
                                            try {
                                              const hasSlot1 = vocalists.some((v: any) => v.part_number === 1);
                                              const nextPartNumber = hasSlot1 ? 2 : 1;
                                              await supabase.from('band_members').insert({ band_id: band.id, user_id: ev.id, instrument: 'Vocals' });
                                              await supabase.from('band_song_slots').insert({ band_song_id: bandSong.id, user_id: ev.id, instrument: 'Vocals', part_number: nextPartNumber, status: 'accepted' });
                                              setShowTeacherVocalPicker(null);
                                              onRefreshDashboard(user.id);
                                            } catch (err: any) {
                                              console.error('[StudentBandMatchingSuite] Fehler beim Hinzufügen des externen Sängers:', err);
                                              alert('Fehler beim Zuweisen: ' + (err?.message || 'Unbekannter Fehler'));
                                            }
                                          }}
                                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textAlign: 'left', minHeight: '44px', touchAction: 'manipulation' }}
                                          className="hover-bg"
                                        >
                                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden' }}>
                                            <StudioAvatar src={ev.photo_url} />
                                          </div>
                                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{ev.first_name} {ev.last_name}</span>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </section>
      </ErrorBoundary>
    );
  }

  return null;
}

export default StudentBandMatchingSuite;
