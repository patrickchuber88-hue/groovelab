import React from "react";
import { Plus, QrCode, Shield, Trash2 } from "lucide-react";
import { ADMIN_INSTRUMENT_ICONS } from "./AdminStatsView";
import { StudioAvatar } from "../StudioAvatar";

export interface AdminTeachersViewProps {
  activePlatform: string;
  admin: any;
  userId: string;
  teachers: any[];
  canManageTeachers: boolean;
  showAddTeacher: boolean;
  setShowAddTeacher: (val: boolean) => void;
  newTeacher: any;
  setNewTeacher: (t: any) => void;
  editingTeacher: any;
  setEditingTeacher: (t: any) => void;
  handleAddTeacher: (e: React.FormEvent) => Promise<void>;
  handleUpdateTeacher: (e: React.FormEvent) => Promise<void>;
  handleDeleteTeacher: (teacherId: string) => Promise<void>;
  handleToggleObserver: (teacher: any, e: React.MouseEvent) => Promise<void>;
  setSelectedQRUser: (u: any) => void;
  windowWidth: number;
}

export const AdminTeachersView: React.FC<AdminTeachersViewProps> = ({
  activePlatform,
  admin,
  userId,
  teachers,
  canManageTeachers,
  showAddTeacher,
  setShowAddTeacher,
  newTeacher,
  setNewTeacher,
  editingTeacher,
  setEditingTeacher,
  handleAddTeacher,
  handleUpdateTeacher,
  handleDeleteTeacher,
  handleToggleObserver,
  setSelectedQRUser,
  windowWidth
}) => {
  const brandColor = activePlatform === "campus" ? "#34a853" : (activePlatform === "groovelab" ? "#eab308" : "#ea4335");
  return (
      <div style={{ marginTop: '0px' }}>
      <div 
        className="glass-panel" 
        style={{ 
          background: 'white', 
          borderRadius: '20px', 
          border: '1px solid rgba(0, 0, 0, 0.05)', 
          padding: '16px 20px', 
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px' 
        }}
      >
        <div style={{ display: 'flex', flexDirection: windowWidth < 768 ? 'column' : 'row', justifyContent: 'space-between', alignItems: windowWidth < 768 ? 'stretch' : 'center', gap: '10px', marginBottom: '4px' }}>
          <h2 style={{ fontSize: windowWidth < 768 ? '1.4rem' : '1.75rem', fontWeight: 900, color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <div style={{ background: `${brandColor}15`, color: brandColor, padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              <Shield size={16} />
            </div>
            Team
          </h2>
          {canManageTeachers && !showAddTeacher && (
            <button
              onClick={() => {
                setShowAddTeacher(true);
                setEditingTeacher(null);
              }}
              style={{
                background: brandColor,
                color: activePlatform === 'groovelab' ? '#1e293b' : 'white',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: windowWidth < 768 ? '100%' : 'auto',
                boxShadow: `0 4px 12px ${brandColor}20`
              }}
              className="hover-scale"
            >
              <Plus size={16} /> Lehrkraft hinzufügen
            </button>
          )}
        </div>

        {showAddTeacher && (
          <form onSubmit={handleAddTeacher} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#f8fafc', border: `1.5px solid ${brandColor}20`, borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Neue Lehrkraft hinzufügen</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                <input required placeholder="Vorname" value={newTeacher.firstName} onChange={e => setNewTeacher({...newTeacher, firstName: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                <input required placeholder="Nachname" value={newTeacher.lastName} onChange={e => setNewTeacher({...newTeacher, lastName: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Rolle</label>
              <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '12px', padding: '3px' }}>
                <button
                  type="button"
                  onClick={() => setNewTeacher({...newTeacher, isAdmin: false, photoUrl: '/avatar_ghost.jpg'})}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: '10px',
                    background: !newTeacher.isAdmin ? '#ffffff' : 'transparent',
                    color: !newTeacher.isAdmin ? brandColor : '#64748b',
                    fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: !newTeacher.isAdmin ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Lehrkraft / Coach
                </button>
                <button
                  type="button"
                  onClick={() => setNewTeacher({...newTeacher, isAdmin: true, photoUrl: '/campus_login_hero.png'})}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: '10px',
                    background: newTeacher.isAdmin ? '#ffffff' : 'transparent',
                    color: newTeacher.isAdmin ? brandColor : '#64748b',
                    fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: newTeacher.isAdmin ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Lehrer (Admin)
                </button>
              </div>
            </div>

            {/* Herrenberg Compliance § 7a SGB IV: Beschäftigungsstatus */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Dozenten-Status (Herrenberg-Compliance § 7a SGB IV)
                </label>
                <span style={{ fontSize: '0.64rem', color: newTeacher.employment_type === 'freelance' ? '#2563eb' : '#059669', fontWeight: 700 }}>
                  {newTeacher.employment_type === 'freelance' ? '✓ Freier Dozent (Autonom)' : '✓ Festanstellung (TVöD)'}
                </span>
              </div>
              <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '12px', padding: '3px' }}>
                <button
                  type="button"
                  onClick={() => setNewTeacher({ ...newTeacher, employment_type: 'employed' })}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: '10px',
                    background: (newTeacher.employment_type !== 'freelance') ? '#ffffff' : 'transparent',
                    color: (newTeacher.employment_type !== 'freelance') ? brandColor : '#64748b',
                    fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: (newTeacher.employment_type !== 'freelance') ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Angestellt (TVöD / Fest)
                </button>
                <button
                  type="button"
                  onClick={() => setNewTeacher({ ...newTeacher, employment_type: 'freelance' })}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: '10px',
                    background: (newTeacher.employment_type === 'freelance') ? '#ffffff' : 'transparent',
                    color: (newTeacher.employment_type === 'freelance') ? brandColor : '#64748b',
                    fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: (newTeacher.employment_type === 'freelance') ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Freier Mitarbeiter (Honorar)
                </button>
              </div>
              {newTeacher.employment_type === 'freelance' && (
                <div style={{ fontSize: '0.66rem', color: '#1e40af', background: '#eff6ff', padding: '6px 10px', borderRadius: '8px', border: '1px solid #bfdbfe', lineHeight: 1.35 }}>
                  🛡️ <strong>Herrenberg-Schutz:</strong> Freie Dozenten nutzen die Software weisungsfrei. Keine Anwesenheitsüberwachung oder Weisungsbindung.
                </div>
              )}
            </div>

            {!newTeacher.isAdmin && (
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Instrumente (Icons anklicken):</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto' }}>
                  {["Gitarre", "Bass", "Drums", "Vocals", "Piano / Keys"].map(inst => {
                    const currentInstruments = (newTeacher.instrument || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                    const isSelected = currentInstruments.includes(inst);
                    return (
                      <button
                        key={inst}
                        type="button"
                        onClick={() => {
                          const next = isSelected ? currentInstruments.filter((s: string) => s !== inst) : [...currentInstruments, inst];
                          setNewTeacher({...newTeacher, instrument: next.join(', ')});
                        }}
                        style={{
                          flex: 1,
                          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '10px 8px', borderRadius: '12px', 
                          border: `1.5px solid ${isSelected ? brandColor : '#e2e8f0'}`,
                          background: isSelected ? `${brandColor}10` : 'white',
                          color: isSelected ? '#1e293b' : '#64748b',
                          fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                          boxShadow: isSelected ? `0 2px 8px ${brandColor}15` : 'none',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        <span style={{ fontSize: '1rem' }}>{ADMIN_INSTRUMENT_ICONS[inst]}</span> {inst === "Piano / Keys" ? "Piano" : inst}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" style={{ flex: 2, background: brandColor, color: activePlatform === 'groovelab' ? '#1e293b' : 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: `0 4px 15px ${brandColor}20`, transition: 'all 0.2s' }}>Hinzufügen</button>
              <button type="button" onClick={() => { setShowAddTeacher(false); setNewTeacher({ firstName: '', lastName: '', isAdmin: false, instrument: '', photoUrl: '' }); }} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer' }}>Abbrechen</button>
            </div>
          </form>
        )}

        {editingTeacher && (
          <form onSubmit={handleUpdateTeacher} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#f8fafc', border: `1.5px solid ${brandColor}20`, borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Profil bearbeiten</h3>
              <div style={{ padding: '6px 12px', background: 'white', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, color: brandColor, border: '1px solid #e2e8f0' }}>
                ID: {editingTeacher.id.slice(0,8)}...
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                <input required placeholder="Vorname" value={editingTeacher.first_name} onChange={e => setEditingTeacher({...editingTeacher, first_name: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                <input required placeholder="Nachname" value={editingTeacher.last_name} onChange={e => setEditingTeacher({...editingTeacher, last_name: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status & Rolle</label>
              <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '12px', padding: '3px' }}>
                <button
                  type="button"
                  onClick={() => setEditingTeacher({...editingTeacher, role: 'teacher'})}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: '10px',
                    background: editingTeacher.role === 'teacher' ? '#ffffff' : 'transparent',
                    color: editingTeacher.role === 'teacher' ? brandColor : '#64748b',
                    fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: editingTeacher.role === 'teacher' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Lehrkraft / Coach
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTeacher({...editingTeacher, role: 'admin'})}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: '10px',
                    background: editingTeacher.role === 'admin' ? '#ffffff' : 'transparent',
                    color: editingTeacher.role === 'admin' ? brandColor : '#64748b',
                    fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: editingTeacher.role === 'admin' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Lehrer (Admin)
                </button>
              </div>
            </div>

            {/* Herrenberg Compliance § 7a SGB IV: Beschäftigungsstatus */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Dozenten-Status (Herrenberg-Compliance § 7a SGB IV)
                </label>
                <span style={{ fontSize: '0.64rem', color: editingTeacher.employment_type === 'freelance' ? '#2563eb' : '#059669', fontWeight: 700 }}>
                  {editingTeacher.employment_type === 'freelance' ? '✓ Freier Dozent (Autonom)' : '✓ Festanstellung (TVöD)'}
                </span>
              </div>
              <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '12px', padding: '3px' }}>
                <button
                  type="button"
                  onClick={() => setEditingTeacher({ ...editingTeacher, employment_type: 'employed' })}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: '10px',
                    background: (editingTeacher.employment_type !== 'freelance') ? '#ffffff' : 'transparent',
                    color: (editingTeacher.employment_type !== 'freelance') ? brandColor : '#64748b',
                    fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: (editingTeacher.employment_type !== 'freelance') ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Angestellt (TVöD / Fest)
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTeacher({ ...editingTeacher, employment_type: 'freelance' })}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: '10px',
                    background: (editingTeacher.employment_type === 'freelance') ? '#ffffff' : 'transparent',
                    color: (editingTeacher.employment_type === 'freelance') ? brandColor : '#64748b',
                    fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: (editingTeacher.employment_type === 'freelance') ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  Freier Mitarbeiter (Honorar)
                </button>
              </div>
              {editingTeacher.employment_type === 'freelance' && (
                <div style={{ fontSize: '0.66rem', color: '#1e40af', background: '#eff6ff', padding: '6px 10px', borderRadius: '8px', border: '1px solid #bfdbfe', lineHeight: 1.35 }}>
                  🛡️ <strong>Herrenberg-Schutz:</strong> Freie Dozenten nutzen die Software weisungsfrei. Keine Anwesenheitsüberwachung oder Weisungsbindung.
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Instrumente (Icons anklicken):</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto' }}>
                {["Gitarre", "Bass", "Drums", "Vocals", "Piano / Keys"].map(inst => {
                  const currentInstruments = (editingTeacher.groovelab_instrument || '').split(',').map((s: string) => s.trim()).filter(Boolean);
                  const isSelected = currentInstruments.includes(inst);
                  return (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => {
                        const next = isSelected ? currentInstruments.filter((s: string) => s !== inst) : [...currentInstruments, inst];
                        setEditingTeacher({...editingTeacher, groovelab_instrument: next.join(', ')});
                      }}
                      style={{
                        flex: 1,
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '10px 8px', borderRadius: '12px', 
                        border: `1.5px solid ${isSelected ? brandColor : '#e2e8f0'}`,
                        background: isSelected ? `${brandColor}10` : 'white',
                        color: isSelected ? '#1e293b' : '#64748b',
                        fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: isSelected ? `0 2px 8px ${brandColor}15` : 'none',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>{ADMIN_INSTRUMENT_ICONS[inst]}</span> {inst === "Piano / Keys" ? "Piano" : inst}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Musikalischer Werdegang (Bio)</label>
              <textarea placeholder="Erzähle etwas über deinen Werdegang..." value={editingTeacher.bio || ''} onChange={e => setEditingTeacher({...editingTeacher, bio: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '80px', fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.4 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Expertise & Stile</label>
                <input placeholder="z.B. Jazz, Rock, Metal..." value={editingTeacher.expertise || ''} onChange={e => setEditingTeacher({...editingTeacher, expertise: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Bands & Projekte</label>
                <input placeholder="z.B. Bands..." value={editingTeacher.bands || ''} onChange={e => setEditingTeacher({...editingTeacher, bands: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
            </div>


            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: `0 4px 15px ${brandColor}20`, transition: 'all 0.2s' }}>Änderungen speichern</button>
              <button type="button" onClick={() => setEditingTeacher(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer' }}>Abbrechen</button>
            </div>
          </form>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {teachers.map(t => {
            const isObserver = !!t.is_observer;
            const accentColor = isObserver ? '#94a3b8' : (activePlatform === 'campus' ? '#34a853' : (activePlatform === 'groovelab' ? '#eab308' : (t.role === 'admin' ? '#ea4335' : brandColor)));
            return (
              <div 
                key={t.id} 
                className="glass-panel" 
                style={{ 
                  padding: '16px 20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  background: isObserver ? '#f8fafc' : 'white', 
                  borderRadius: '20px', 
                  border: `1px solid ${isObserver ? '#e2e8f0' : '#f1f5f9'}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  if (t.id === userId || canManageTeachers) {
                    setEditingTeacher(t);
                    setShowAddTeacher(false);
                  }
                }}
              >
                {/* Left accent bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '6px', background: accentColor, transition: 'background 0.3s' }}></div>
                
                {/* Avatar */}
                <div style={{ width: '80px', height: '80px', borderRadius: '20px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', opacity: isObserver ? 0.65 : 1, transition: 'opacity 0.3s' }}>
                  <StudioAvatar src={t.photo_url} user={t} activePlatform={activePlatform} />
                </div>
                
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: isObserver ? '#94a3b8' : '#1e293b', margin: 0, transition: 'color 0.3s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.first_name} {t.last_name}</h3>
                    {t.role === 'admin' && !isObserver && <Shield size={14} color="#f59e0b" />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'color 0.3s' }}>
                      {isObserver ? '👁 Hospitant' : 'Lehrer'}
                    </div>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '6px',
                      background: t.employment_type === 'freelance' ? '#eff6ff' : '#ecfdf5',
                      color: t.employment_type === 'freelance' ? '#1d4ed8' : '#15803d',
                      border: `1px solid ${t.employment_type === 'freelance' ? '#bfdbfe' : '#bbf7d0'}`
                    }}>
                      {t.employment_type === 'freelance' ? 'Honorar (§ 7a SGB IV)' : 'Festangestellt (TVöD)'}
                    </span>
                  </div>

                  {/* Lehrer / Hospitant Toggle */}
                  {(t.id === userId || canManageTeachers) ? (
                    <div
                      onClick={(e) => handleToggleObserver(t, e)}
                      title={isObserver ? 'Auf Lehrer-Modus umschalten' : 'Auf Hospitant-Modus umschalten'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        padding: '4px 8px 4px 4px',
                        borderRadius: '16px',
                        background: isObserver ? '#f1f5f9' : `${brandColor}10`,
                        border: `1.5px solid ${isObserver ? '#e2e8f0' : `${brandColor}20`}`,
                        transition: 'all 0.25s'
                      }}
                    >
                      {/* Toggle pill */}
                      <div style={{
                        width: '36px', height: '20px',
                        borderRadius: '10px',
                        background: isObserver ? '#cbd5e1' : brandColor,
                        position: 'relative',
                        transition: 'background 0.25s',
                        flexShrink: 0,
                        boxShadow: isObserver ? 'none' : `0 2px 6px ${brandColor}30`
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '2px',
                          left: isObserver ? '2px' : '18px',
                          width: '16px', height: '16px',
                          background: 'white',
                          borderRadius: '50%',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                          transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)'
                        }}></div>
                      </div>
                      {/* Label */}
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isObserver ? '#94a3b8' : brandColor, letterSpacing: '0.02em', transition: 'color 0.25s' }}>
                        {isObserver ? 'Hospitant' : 'Lehrer aktiv'}
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                      padding: '4px 8px',
                      borderRadius: '16px',
                      background: isObserver ? '#f1f5f9' : `${brandColor}10`,
                      border: `1.5px solid ${isObserver ? '#e2e8f0' : `${brandColor}20`}`
                    }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isObserver ? '#94a3b8' : brandColor, letterSpacing: '0.02em' }}>
                        {isObserver ? '👁 Hospitant' : 'Lehrer aktiv'}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {t.groovelab_instrument?.split(',')
                      .map((inst: string) => inst.trim())
                      .filter(Boolean)
                      .map((inst: string) => (
                        <span key={inst} style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>{ADMIN_INSTRUMENT_ICONS[inst] || '🎸'}</span> {inst}
                        </span>
                      ))
                    }
                  </div>
                </div>
                
                {/* Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedQRUser(t)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><QrCode size={18} /></button>
                  {t.id !== userId && canManageTeachers && (
                    <button onClick={() => handleDeleteTeacher(t.id)} style={{ background: activePlatform === 'groovelab' ? '#fefce8' : '#fff1f2', border: activePlatform === 'groovelab' ? '1px solid #fef08a' : '1px solid #fecaca', padding: '10px', borderRadius: '10px', cursor: 'pointer', color: activePlatform === 'groovelab' ? '#eab308' : '#ef4444', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={18} /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    );
};
