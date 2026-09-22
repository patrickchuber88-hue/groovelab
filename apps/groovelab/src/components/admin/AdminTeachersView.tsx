import React from "react";
import { Plus, QrCode, Shield, Trash2 } from "lucide-react";
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
  handleToggleObserver?: (teacher: any, e: React.MouseEvent) => Promise<void>;
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
  setSelectedQRUser,
  windowWidth
}) => {
  const brandColor = activePlatform === "campus" ? "#34a853" : (activePlatform === "groovelab" ? "#eab308" : "#ea4335");

  return (
    <div style={{ marginTop: '0px' }}>
      <style>{`
        .team-member-card {
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .team-member-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -6px rgba(15, 23, 42, 0.07), 0 4px 10px -2px rgba(15, 23, 42, 0.03) !important;
          border-color: #cbd5e1 !important;
        }
        .team-action-btn {
          transition: all 0.15s ease;
        }
        .team-action-btn:hover {
          transform: scale(1.06);
        }
        .team-action-btn:active {
          transform: scale(0.94);
        }
      `}</style>
      <div 
        className="glass-panel" 
        style={{ 
          background: 'white', 
          borderRadius: '20px', 
          border: '1px solid rgba(0, 0, 0, 0.05)', 
          padding: '20px 24px', 
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '18px' 
        }}
      >
        {/* Header Bar with Title, Member Count and Add Button */}
        <div style={{ display: 'flex', flexDirection: windowWidth < 768 ? 'column' : 'row', justifyContent: 'space-between', alignItems: windowWidth < 768 ? 'stretch' : 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: windowWidth < 768 ? '1.4rem' : '1.65rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <div style={{ background: `${brandColor}15`, color: brandColor, padding: '6px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
                <Shield size={18} />
              </div>
              Team
            </h2>
            <span style={{ 
              fontSize: '0.8rem', 
              fontWeight: 800, 
              color: '#64748b', 
              background: '#f1f5f9', 
              padding: '3px 10px', 
              borderRadius: '20px',
              border: '1px solid #e2e8f0'
            }}>
              {teachers.length} {teachers.length === 1 ? 'Lehrkraft' : 'Lehrkräfte'}
            </span>
          </div>

          {canManageTeachers && !showAddTeacher && (
            <button
              onClick={() => {
                setShowAddTeacher(true);
                setEditingTeacher(null);
              }}
              aria-label="Neue Lehrkraft hinzufügen"
              style={{
                background: brandColor,
                color: activePlatform === 'groovelab' ? '#0f172a' : 'white',
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
                boxShadow: `0 4px 12px ${brandColor}25`
              }}
              className="hover-scale"
            >
              <Plus size={16} /> Lehrkraft hinzufügen
            </button>
          )}
        </div>

        {/* Add Teacher Form */}
        {showAddTeacher && (
          <form onSubmit={handleAddTeacher} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#f8fafc', border: `1.5px solid ${brandColor}25`, borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Neue Lehrkraft hinzufügen</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 640 ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                <input required aria-label="Vorname" placeholder="Vorname" value={newTeacher.firstName} onChange={e => setNewTeacher({...newTeacher, firstName: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                <input required aria-label="Nachname" placeholder="Nachname" value={newTeacher.lastName} onChange={e => setNewTeacher({...newTeacher, lastName: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
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

            {!newTeacher.isAdmin && (
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Instrumente (Klicken zum Auswählen):</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                          flex: windowWidth < 640 ? '1 1 calc(50% - 8px)' : '1 1 auto',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: `1.5px solid ${isSelected ? brandColor : '#e2e8f0'}`,
                          background: isSelected ? `${brandColor}12` : 'white',
                          color: isSelected ? '#0f172a' : '#64748b',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: isSelected ? `0 2px 8px ${brandColor}15` : 'none',
                          whiteSpace: 'nowrap',
                          textAlign: 'center'
                        }}
                      >
                        {inst}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" style={{ flex: 2, background: brandColor, color: activePlatform === 'groovelab' ? '#0f172a' : 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: `0 4px 15px ${brandColor}20`, transition: 'all 0.2s' }}>Hinzufügen</button>
              <button type="button" onClick={() => { setShowAddTeacher(false); setNewTeacher({ firstName: '', lastName: '', isAdmin: false, instrument: '', photoUrl: '' }); }} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer' }}>Abbrechen</button>
            </div>
          </form>
        )}

        {/* Edit Teacher Form */}
        {editingTeacher && (
          <form onSubmit={handleUpdateTeacher} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#f8fafc', border: `1.5px solid ${brandColor}25`, borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Profil bearbeiten</h3>
              <div style={{ padding: '6px 12px', background: 'white', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, color: brandColor, border: '1px solid #e2e8f0' }}>
                ID: {editingTeacher.id?.slice(0,8)}...
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 640 ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
                <input required aria-label="Vorname" placeholder="Vorname" value={editingTeacher.first_name || ''} onChange={e => setEditingTeacher({...editingTeacher, first_name: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nachname</label>
                <input required aria-label="Nachname" placeholder="Nachname" value={editingTeacher.last_name || ''} onChange={e => setEditingTeacher({...editingTeacher, last_name: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
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

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Instrumente (Klicken zum Auswählen):</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                        flex: windowWidth < 640 ? '1 1 calc(50% - 8px)' : '1 1 auto',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: `1.5px solid ${isSelected ? brandColor : '#e2e8f0'}`,
                        background: isSelected ? `${brandColor}12` : 'white',
                        color: isSelected ? '#0f172a' : '#64748b',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isSelected ? `0 2px 8px ${brandColor}15` : 'none',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                      }}
                    >
                      {inst}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Musikalischer Werdegang (Bio)</label>
              <textarea aria-label="Musikalischer Werdegang (Bio)" placeholder="Erzähle etwas über deinen Werdegang..." value={editingTeacher.bio || ''} onChange={e => setEditingTeacher({...editingTeacher, bio: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '80px', fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.4 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 640 ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Expertise & Stile</label>
                <input aria-label="Expertise & Stile" placeholder="z.B. Jazz, Rock, Metal..." value={editingTeacher.expertise || ''} onChange={e => setEditingTeacher({...editingTeacher, expertise: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Bands & Projekte</label>
                <input aria-label="Bands & Projekte" placeholder="z.B. Bands..." value={editingTeacher.bands || ''} onChange={e => setEditingTeacher({...editingTeacher, bands: e.target.value})} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', fontWeight: 600 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" style={{ flex: 2, background: brandColor, color: activePlatform === 'groovelab' ? '#0f172a' : 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: `0 4px 15px ${brandColor}20`, transition: 'all 0.2s' }}>Änderungen speichern</button>
              <button type="button" onClick={() => setEditingTeacher(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer' }}>Abbrechen</button>
            </div>
          </form>
        )}

        {/* Teachers Cards Grid (Apple Squircle Modern Clean Design - Pure Typography) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '16px' }}>
          {teachers.map(t => {
            const isSelf = t.id === userId;
            const canEdit = isSelf || canManageTeachers;
            const instruments = (t.groovelab_instrument || '')
              .split(',')
              .map((inst: string) => inst.trim())
              .filter(Boolean);

            return (
              <div 
                key={t.id} 
                role="button"
                tabIndex={0}
                aria-label={`Lehrkraft ${t.first_name} ${t.last_name || ''} bearbeiten`}
                className="team-member-card"
                style={{ 
                  padding: '18px 20px', 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '14px', 
                  background: '#ffffff', 
                  borderRadius: '20px', 
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02)',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: canEdit ? 'pointer' : 'default',
                  outline: 'none'
                }}
                onClick={() => {
                  if (canEdit) {
                    setEditingTeacher(t);
                    setShowAddTeacher(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (canEdit) {
                      e.preventDefault();
                      setEditingTeacher(t);
                      setShowAddTeacher(false);
                    }
                  }
                }}
              >
                {/* Top Section: Avatar + Name & Role + Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
                  {/* 58x58 Apple Squircle Avatar */}
                  <div style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                    border: '2px solid #ffffff',
                    background: '#f8fafc'
                  }}>
                    <StudioAvatar src={t.photo_url} user={t} activePlatform={activePlatform} />
                  </div>
                  
                  {/* Teacher Info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <h3 style={{
                      fontSize: '1.08rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      letterSpacing: '-0.01em'
                    }}>
                      {t.first_name} {t.last_name}
                    </h3>

                    {/* Role Micro Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: t.role === 'admin' ? '#fef2f2' : (activePlatform === 'groovelab' ? '#fefce8' : '#f0fdf4'),
                        color: t.role === 'admin' ? '#b91c1c' : (activePlatform === 'groovelab' ? '#854d0e' : '#15803d'),
                        border: `1px solid ${t.role === 'admin' ? '#fee2e2' : (activePlatform === 'groovelab' ? '#fef08a' : '#dcfce7')}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {t.role === 'admin' && <Shield size={11} />}
                        {t.role === 'admin' ? 'Lehrer & Admin' : 'Lehrkraft'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Actions (QR Code and Delete) */}
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button 
                      type="button"
                      onClick={() => setSelectedQRUser(t)} 
                      aria-label={`QR-Zugangskarte und Login-Token für ${t.first_name} ${t.last_name || ''} anzeigen`}
                      title="QR Code & Ausweis"
                      className="team-action-btn"
                      style={{
                        width: '36px',
                        height: '36px',
                        minWidth: '36px',
                        minHeight: '36px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        outline: 'none'
                      }}
                    >
                      <QrCode size={16} />
                    </button>

                    {!isSelf && canManageTeachers && (
                      <button 
                        type="button"
                        onClick={() => handleDeleteTeacher(t.id)} 
                        aria-label={`Lehrkraft ${t.first_name} ${t.last_name || ''} aus Schule löschen`}
                        title="Lehrkraft löschen"
                        className="team-action-btn"
                        style={{
                          width: '36px',
                          height: '36px',
                          minWidth: '36px',
                          minHeight: '36px',
                          background: '#fff1f2',
                          border: '1px solid #ffe4e6',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          color: '#e11d48',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          outline: 'none'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Instruments (Pure Typography, beautifully placed across full card width) */}
                {instruments.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9'
                  }}>
                    {instruments.map((inst: string) => (
                      <span
                        key={inst}
                        style={{
                          padding: '3px 10px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: '#334155',
                          letterSpacing: '0.01em',
                          lineHeight: 1.3
                        }}
                      >
                        {inst}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {teachers.length === 0 && (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: '#f8fafc',
            borderRadius: '20px',
            border: '1.5px dashed #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: `${brandColor}15`, color: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={24} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Noch keine Lehrkräfte im Team</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', maxWidth: '360px' }}>
              Füge Lehrkräfte hinzu, um ihnen Zugänge zu erstellen, Instrumente zuzuweisen und Bands zu koordinieren.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
