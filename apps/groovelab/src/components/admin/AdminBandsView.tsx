import React from "react";
import { Award, Mic, Monitor, Music, Plus, Search, Trash2, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { maskLastName } from "../../utils/nameHelper";
import { ADMIN_INSTRUMENT_ICONS } from "./AdminStatsView";

export interface AdminBandsViewProps {
  activePlatform: string;
  allBands: any[];
  bandSearch: string;
  setBandSearch: (q: string) => void;
  bandLetter: string | null;
  setBandLetter: (l: string | null) => void;
  selectedCoachId: string;
  setSelectedCoachId: (id: string) => void;
  showAddBand: boolean;
  setShowAddBand: (val: boolean) => void;
  newBand: any;
  setNewBand: (b: any) => void;
  setEditingBand: (b: any) => void;
  teachers: any[];
  songs: any[];
  students: any[];
  showRealNames: boolean;
  onOpenBandProfile?: (band: any) => void;
  handleCreateBandManually: (e: React.FormEvent) => Promise<void>;
  selectedMembers: { user_id: string; instrument: string }[];
  setSelectedMembers: React.Dispatch<React.SetStateAction<{ user_id: string; instrument: string }[]>>;
  memberToSearch: string;
  setMemberToSearch: (s: string) => void;
  showAddMember: string | null;
  setShowAddMember: (id: string | null) => void;
  memberSearch: string;
  setMemberSearch: (s: string) => void;
  fetchData: () => Promise<void>;
}

export const AdminBandsView: React.FC<AdminBandsViewProps> = ({
  activePlatform,
  allBands,
  bandSearch,
  setBandSearch,
  bandLetter,
  setBandLetter,
  selectedCoachId,
  setSelectedCoachId,
  showAddBand,
  setShowAddBand,
  newBand,
  setNewBand,
  setEditingBand,
  teachers,
  songs,
  students,
  showRealNames,
  onOpenBandProfile,
  handleCreateBandManually,
  selectedMembers,
  setSelectedMembers,
  memberToSearch,
  setMemberToSearch,
  showAddMember,
  setShowAddMember,
  memberSearch,
  setMemberSearch,
  fetchData
}) => {
    const brandColor = activePlatform === 'campus' ? '#34a853' : (activePlatform === 'groovelab' ? '#eab308' : '#ea4335');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    const filteredBands = allBands.filter(band => {
      const matchesSearch = band.name.toLowerCase().includes(bandSearch.toLowerCase());
      const matchesLetter = !bandLetter || band.name.toUpperCase().startsWith(bandLetter);
      
      let matchesCoach = true;
      if (selectedCoachId === 'none') {
        matchesCoach = !band.coach_id;
      } else if (selectedCoachId !== 'all') {
        matchesCoach = band.coach_id === selectedCoachId;
      }
      
      return matchesSearch && matchesLetter && matchesCoach;
    });

    return (
      <div style={{ marginTop: '0px' }}>
        <div 
          className="glass-panel" 
          style={{ 
            background: 'white', 
            borderRadius: '20px', 
            border: '1px solid rgba(0, 0, 0, 0.05)', 
            padding: '10px', 
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px' 
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <div style={{ background: `${brandColor}15`, color: brandColor, padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                <Award size={16} />
              </div>
              Bands
            </h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '200px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Band suchen..." 
                  value={bandSearch}
                  onChange={(e) => setBandSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
              <button 
                onClick={() => setShowAddBand(!showAddBand)} 
                style={{ 
                  background: `linear-gradient(135deg, ${brandColor}, ${brandColor}ee)`, 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.8rem', 
                  fontWeight: 900,
                  boxShadow: `0 4px 12px -3px ${brandColor}50`,
                  transition: 'all 0.2s ease'
                }}
              >
                <Plus size={16} strokeWidth={3} /> Band erstellen
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            {/* Main Column: Band Management */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {showAddBand && (
            <form onSubmit={handleCreateBandManually} className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: 'white', borderRadius: '24px', border: `1px solid ${brandColor}20`, boxShadow: '0 20px 50px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Neue Band manuell zusammenstellen</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Band Name</label>
                  <input required placeholder="z.B. The Rockstars" value={newBand.name} onChange={e => setNewBand({...newBand, name: e.target.value})} style={{ padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Song (Optional)</label>
                  <select value={newBand.song_id} onChange={e => setNewBand({...newBand, song_id: e.target.value})} style={{ padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700 }}>
                    <option value="">-- Kein Song --</option>
                    {[...songs].sort((a, b) => {
                      const artistCompare = (a.artist || '').localeCompare(b.artist || '', 'de', { sensitivity: 'base' });
                      if (artistCompare !== 0) return artistCompare;
                      return (a.title || '').localeCompare(b.title || '', 'de', { sensitivity: 'base' });
                    }).map(s => <option key={s.id} value={s.id}>{s.artist} - {s.title}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Coach / Leitung</label>
                  <select value={newBand.coach_id} onChange={e => setNewBand({...newBand, coach_id: e.target.value})} style={{ padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700 }}>
                    {teachers.filter(t => !t.is_observer).map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Avatar URL (Optional)</label>
                  <input placeholder="https://..." value={newBand.photo_url} onChange={e => setNewBand({...newBand, photo_url: e.target.value})} style={{ padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600 }} />
                </div>
              </div>

              <div style={{ padding: '24px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>Mitglieder hinzufügen</label>
                
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      placeholder="Schüler suchen..." 
                      value={memberToSearch} 
                      onChange={e => setMemberToSearch(e.target.value)} 
                      style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem' }} 
                    />
                    {memberToSearch && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                        {students.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(memberToSearch.toLowerCase())).map(s => (
                          <div 
                            key={s.id} 
                            onClick={() => {
                              if (!selectedMembers.find(m => m.user_id === s.id)) {
                                setSelectedMembers([...selectedMembers, { user_id: s.id, instrument: 'E-Gitarre' }]);
                              }
                              setMemberToSearch('');
                            }}
                            style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}
                            
                            
                          >
                            <img src={s.photo_url || '/avatar_ghost.jpg'} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                            {s.first_name} {maskLastName(s.last_name, showRealNames)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedMembers.map((m, idx) => {
                    const student = students.find(s => s.id === m.user_id);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'white', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={student?.photo_url || '/avatar_ghost.jpg'} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{student?.first_name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <select 
                            value={m.instrument} 
                            onChange={e => {
                              const next = [...selectedMembers];
                              next[idx].instrument = e.target.value;
                              setSelectedMembers(next);
                            }}
                            style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            {Object.keys(ADMIN_INSTRUMENT_ICONS).map(inst => <option key={inst} value={inst}>{inst}</option>)}
                          </select>
                          <button 
                            type="button" 
                            onClick={() => setSelectedMembers(selectedMembers.filter((_, i) => i !== idx))} 
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {selectedMembers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '12px', color: '#94a3b8', fontSize: '0.8rem', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>Noch keine Mitglieder hinzugefügt.</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', boxShadow: `0 8px 20px -6px ${brandColor}40` }}>Band erstellen & Aktivieren</button>
                <button type="button" onClick={() => setShowAddBand(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer' }}>Abbrechen</button>
              </div>
            </form>
          )}

          {/* Coach Filter Bar */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', padding: '8px 12px', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>Coaches:</span>
            <button 
              onClick={() => setSelectedCoachId('all')}
              style={{ 
                padding: '6px 14px', 
                borderRadius: '10px', 
                background: selectedCoachId === 'all' ? brandColor : '#f8fafc', 
                color: selectedCoachId === 'all' ? 'white' : '#64748b', 
                fontWeight: 800, 
                cursor: 'pointer', 
                fontSize: '0.75rem',
                boxShadow: selectedCoachId === 'all' ? `0 4px 12px ${brandColor}30` : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid ' + (selectedCoachId === 'all' ? brandColor : '#e2e8f0')
              }}
              
              
            >
              Alle Coaches
            </button>
            <button 
              onClick={() => setSelectedCoachId('none')}
              style={{ 
                padding: '6px 14px', 
                borderRadius: '10px', 
                background: selectedCoachId === 'none' ? brandColor : '#f8fafc', 
                color: selectedCoachId === 'none' ? 'white' : '#64748b', 
                fontWeight: 800, 
                cursor: 'pointer', 
                fontSize: '0.75rem',
                boxShadow: selectedCoachId === 'none' ? `0 4px 12px ${brandColor}30` : 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid ' + (selectedCoachId === 'none' ? brandColor : '#e2e8f0')
              }}
              
              
            >
              Ohne Coach
            </button>
            {teachers.filter(t => !t.is_observer).map(t => {
              const isSelected = selectedCoachId === t.id;
              return (
                <button 
                  key={t.id}
                  onClick={() => setSelectedCoachId(isSelected ? 'all' : t.id)}
                  style={{ 
                    padding: '4px 14px 4px 6px', 
                    borderRadius: '10px', 
                    background: isSelected ? brandColor : '#f8fafc', 
                    color: isSelected ? 'white' : '#475569', 
                    fontWeight: 800, 
                    cursor: 'pointer', 
                    fontSize: '0.75rem',
                    boxShadow: isSelected ? `0 4px 12px ${brandColor}30` : 'none',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid ' + (isSelected ? brandColor : '#e2e8f0')
                  }}
                  
                  
                >
                  <img 
                    src={t.photo_url || '/avatar_ghost.jpg'} 
                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: isSelected ? '1px solid white' : '1px solid rgba(0,0,0,0.1)' }} 
                    alt="" 
                  />
                  {t.first_name} {t.last_name || ''}
                </button>
              );
            })}
          </div>

          {/* Alphabet Bar */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', padding: '8px', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
            <button 
              onClick={() => setBandLetter(null)}
              style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', background: !bandLetter ? brandColor : 'transparent', color: !bandLetter ? 'white' : '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }}
            >
              ALL
            </button>
            {alphabet.map(l => (
              <button 
                key={l}
                onClick={() => setBandLetter(bandLetter === l ? null : l)}
                style={{ 
                  width: '32px', height: '32px', borderRadius: '10px', border: 'none', 
                  background: bandLetter === l ? brandColor : 'transparent', 
                  color: bandLetter === l ? 'white' : '#64748b', 
                  fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' 
                }}
              >
                {l}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredBands.map((band: any) => {
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
                <div key={band.id} className="glass-panel" 
                  onClick={() => onOpenBandProfile?.(band)}
                  style={{ 
                    background: 'white', borderRadius: '24px', padding: '20px 24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                    display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', alignItems: 'center', gap: '24px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  
                  
                >
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {band.photo_url ? (
                      <img src={band.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    ) : (
                      <Music size={24} color="white" />
                    )}
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', margin: '0 0 4px 0' }}>{band.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: brandColor, textTransform: 'uppercase' }}>{band.genre || 'Bandprojekt'}</span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{uniqueMembersList.length} Mitglieder</span>
                    </div>
                  </div>

                  {/* Dedicated Coach Column */}
                  <div>
                    {band.coach ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '6px 14px', borderRadius: '14px', border: '1px solid #e2e8f0' }} title={`Coach: ${band.coach.first_name} ${band.coach.last_name || ''}`}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', background: 'white' }}>
                          <img src={band.coach.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coach</span>
                          <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 850 }}>{band.coach.first_name} {band.coach.last_name || ''}</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '6px 14px', borderRadius: '14px', border: '1px dashed #cbd5e1', opacity: 0.7 }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', color: '#64748b' }}>
                          👤
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coach</span>
                          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 800 }}>Kein Coach</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {uniqueMembersList.slice(0, 5).map((m: any, i: number) => {
                      const u = m.user;
                      return (
                        <div key={i} style={{ width: '32px', height: '32px', borderRadius: '10px', overflow: 'hidden', border: '2px solid white', marginLeft: i === 0 ? 0 : '-12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', background: 'white' }} title={`${u?.first_name || m.external_name || 'Mitglied'} (${m.instrument})`}>
                          <img src={u?.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        </div>
                      );
                    })}
                    {uniqueMembersList.length > 5 && (
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f1f5f9', border: '2px solid white', marginLeft: '-12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>
                        +{uniqueMembersList.length - 5}
                      </div>
                    )}
                  </div>

                <div style={{ display: 'flex', gap: '12px' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditingBand(band)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: '#64748b' }}><Monitor size={18} /></button>
                  <button 
                    onClick={async () => {
                      if(window.confirm(`Band "${band.name}" wirklich komplett auflösen?`)) {
                        await supabase.from('bands').delete().eq('id', band.id);
                        fetchData();
                      }
                    }}
                    style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '10px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                    
                    
                    title="Band auflösen"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
            {filteredBands.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '32px', border: '2px dashed #e2e8f0' }}>
                  <div style={{ fontSize: '3rem', margin: '0 auto 20px auto', width: '80px', height: '80px', background: '#f8fafc', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔍</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>Keine Bands gefunden</h3>
                  <p style={{ color: '#64748b' }}>Probiere einen anderen Suchbegriff oder Buchstaben.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Teacher Vocal Finder Widget */}
        <div style={{ width: '350px', background: '#f8fafc', borderRadius: '32px', padding: '24px', alignSelf: 'start', position: 'sticky', top: '24px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Mic size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Vocal Finder</h3>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>Manuelle Sänger-Zuweisung</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {allBands.filter(band => {
              const members = band.band_members || [];
              const vocalists = members.filter((m: any) => (m.instrument || '').toLowerCase().includes('vocal') || (m.instrument || '').toLowerCase().includes('gesang'));
              return vocalists.length < 2;
            }).slice(0, 5).map(band => (
              <div key={band.id} style={{ background: 'white', padding: '20px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>{band.name}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{band.songs?.title || 'No Song'}</div>
                </div>

                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setShowAddMember(showAddMember === band.id ? null : band.id)}
                    style={{ width: '100%', padding: '10px', borderRadius: '12px', border: `1px solid ${brandColor}30`, background: `${brandColor}05`, color: brandColor, fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Plus size={14} /> Sänger hinzufügen
                  </button>

                  {showAddMember === band.id && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9', padding: '12px', zIndex: 100, marginTop: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                      <input 
                        autoFocus
                        placeholder="Musiker oder Externe suchen..." 
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', marginBottom: '8px' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {students.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(memberSearch.toLowerCase())).map(s => (
                          <button 
                            key={s.id}
                            onClick={async () => {
                              await supabase.from('band_members').insert({ band_id: band.id, user_id: s.id, instrument: 'Vocals', role: 'member' });
                              const activeProject = (band.band_songs || []).find((bs: any) => bs.status === 'ready' || bs.status === 'proposal');
                              if (activeProject) {
                                await supabase.from('band_song_slots').insert({ band_song_id: activeProject.id, user_id: s.id, instrument: 'Vocals', status: 'joined' });
                              }
                              setShowAddMember(null);
                              setMemberSearch('');
                              fetchData();
                            }}
                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', textAlign: 'left' }}
                            
                            
                          >
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden' }}>
                              <img src={s.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{s.first_name} {maskLastName(s.last_name, showRealNames)}</div>
                              {s.is_external_vocalist && <div style={{ fontSize: '0.6rem', color: brandColor, fontWeight: 700 }}>Externer Gesang</div>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {allBands.filter(band => {
              const vocalists = (band.band_members || []).filter((m: any) => (m.instrument || '').toLowerCase().includes('vocal'));
              return vocalists.length < 2;
            }).length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.8rem' }}>Alle Bands sind stimmlich besetzt! 🎉</div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
    );
};
