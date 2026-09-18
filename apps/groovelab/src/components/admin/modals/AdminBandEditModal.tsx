import React, { useState } from 'react';
import { X, Search, Trash2 } from 'lucide-react';
import { resolveCampusStudentAvatar } from '../../StudioAvatar';

const INSTRUMENT_COLORS: Record<string, string> = {
  "Guitar": "#ef4444", "E-Gitarre": "#ef4444",
  "Bass": "#eab308", "E-Bass": "#eab308", 
  "Drums": "#3b82f6", "E-Drums": "#3b82f6", 
  "Vocals": "#34a853", 
  "Piano": "#a855f7", "E-Piano": "#a855f7", "Keys": "#a855f7" 
};

const ADMIN_INSTRUMENT_OPTIONS = [
  "Gitarre", "Guitar", "E-Gitarre", "Bass", "E-Bass", 
  "Drums", "E-Drums", "Vocals", "Gesang", "Piano / Keys", 
  "Piano", "E-Piano", "Keys"
];

const resolveCampusAvatar = (u: any, teachersList?: any[], schedulesList?: any[], fallbackTeacher?: any): string => {
  if (!u) return '/avatar_ghost.jpg';
  const role = (u.role || '').toLowerCase();
  const roles = Array.isArray(u.roles) ? u.roles.map((r: any) => String(r).toLowerCase()) : [];
  const isExplicitTeacher = role === 'teacher' || u.isTeacherContext === true || u.isTeacher === true;
  const isExplicitStudent = role === 'student';
  
  if (!isExplicitTeacher && !isExplicitStudent) {
    if (role === 'admin' || role === 'secretary' || roles.includes('admin') || roles.includes('secretary')) {
      return '/campus_login_hero.png';
    }
  }
  
  if (role === 'student') {
    return resolveCampusStudentAvatar(u, teachersList || fallbackTeacher, schedulesList);
  } else {
    return resolveCampusStudentAvatar({ ...u, role: 'teacher', isTeacherContext: true });
  }
};

export interface AdminBandEditModalProps {
  editingBand: any | null;
  setEditingBand: (band: any | null) => void;
  onSaveBandEdit: (e: React.FormEvent) => void;
  teachers: any[];
  students: any[];
  schedules: any[];
  onRemoveMember: (memberId: string) => void;
  onAddMember: (bandId: string, userId: string | null, instrument: string, externalName?: string) => void;
  brandColor?: string;
}

export const AdminBandEditModal: React.FC<AdminBandEditModalProps> = ({
  editingBand,
  setEditingBand,
  onSaveBandEdit,
  teachers,
  students,
  schedules,
  onRemoveMember,
  onAddMember,
  brandColor = '#facc15'
}) => {
  const [showAddMember, setShowAddMember] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalInstrument, setExternalInstrument] = useState('Vocals');

  if (!editingBand) return null;

  return (
    <>
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-label="Band bearbeiten" 
        style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 5000, 
          background: 'rgba(0,0,0,0.6)', 
          backdropFilter: 'blur(10px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '20px' 
        }}
      >
        <form 
          onSubmit={onSaveBandEdit} 
          className="glass-panel animation-slide-up" 
          style={{ 
            background: 'white', 
            padding: '32px', 
            borderRadius: '32px', 
            maxWidth: '600px', 
            width: '100%', 
            maxHeight: '90vh', 
            overflowY: 'auto' 
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Band bearbeiten</h2>
            <button 
              type="button" 
              onClick={() => setEditingBand(null)} 
              aria-label="Modal Band bearbeiten schließen"
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Bandname</label>
                <input 
                  required 
                  aria-label="Bandname" 
                  value={editingBand.name || ''} 
                  onChange={e => setEditingBand({ ...editingBand, name: e.target.value })} 
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '6px', fontWeight: 700, background: '#f8fafc' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Genre</label>
                <input 
                  aria-label="Genre" 
                  value={editingBand.genre || ''} 
                  onChange={e => setEditingBand({ ...editingBand, genre: e.target.value })} 
                  placeholder="z.B. Rock, Pop" 
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '6px', fontWeight: 700, background: '#f8fafc' }} 
                />
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Bandcoach</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                  <input 
                    type="checkbox" 
                    checked={editingBand.coach_is_manual || false} 
                    onChange={e => setEditingBand({ ...editingBand, coach_is_manual: e.target.checked })} 
                  />
                  Manuell festlegen
                </label>
              </div>
              
              <select 
                aria-label="Bandcoach auswählen"
                value={editingBand.coach_id || ''} 
                onChange={e => setEditingBand({ ...editingBand, coach_id: e.target.value, coach_is_manual: true })}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, background: 'white' }}
              >
                <option value="">Kein Coach / Automatisch</option>
                {teachers.filter(t => !t.is_observer).map(t => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name || ''}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '8px', fontWeight: 600 }}>
                {editingBand.coach_is_manual 
                  ? 'Coach wurde manuell zugewiesen.' 
                  : 'Automatisch: Der Lehrer mit den meisten verifizierten Mitgliedern.'}
              </p>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Mitglieder verwalten</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(editingBand.band_members || []).map((m: any) => {
                  const u = Array.isArray(m.users) ? m.users[0] : m.users;
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <div style={{ width: '32px', height: '32px', borderRadius: '10px', overflow: 'hidden', background: m.user_id ? '#f1f5f9' : '#000000', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           {m.user_id ? (
                             <img src={resolveCampusAvatar(u, teachers, schedules)} alt={`${u?.first_name || 'Mitglied'} Avatar`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                           ) : (
                             <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 900 }}>{m.external_name?.[0] || 'E'}</span>
                           )}
                         </div>
                         <div>
                           <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                             {m.user_id ? `${u?.first_name} ${u?.last_name || ''}` : m.external_name}
                           </div>
                           <div style={{ fontSize: '0.7rem', fontWeight: 700, color: brandColor, textTransform: 'uppercase' }}>{m.instrument}</div>
                         </div>
                       </div>
                      <button 
                        type="button" 
                        onClick={() => onRemoveMember(m.id)} 
                        aria-label={`Mitglied ${m.user_id ? `${u?.first_name} ${u?.last_name || ''}` : m.external_name} entfernen`}
                        title="Mitglied entfernen"
                        style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
                <button 
                  type="button" 
                  onClick={() => setShowAddMember(editingBand.id)} 
                  style={{ padding: '16px', borderRadius: '16px', border: '2px dashed #cbd5e1', background: 'transparent', color: brandColor, fontWeight: 800, cursor: 'pointer', marginTop: '4px' }}
                >
                  + Weiteren Schüler hinzufügen
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button type="submit" style={{ flex: 2, background: brandColor, color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)' }}>Änderungen speichern</button>
              <button type="button" onClick={() => setEditingBand(null)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: 700, cursor: 'pointer' }}>Schließen</button>
            </div>
          </div>
        </form>
      </div>

      {/* Add Member Search Modal */}
      {showAddMember && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-label="Schüler suchen" 
          style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div className="glass-panel animation-slide-up" style={{ background: 'white', padding: '32px', borderRadius: '32px', maxWidth: '450px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Schüler suchen</h2>
              <button 
                onClick={() => setShowAddMember(null)} 
                aria-label="Dialog Schüler suchen schließen"
                title="Dialog schließen"
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                aria-label="Schüler nach Name suchen"
                placeholder="Name eingeben..." 
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700 }}
              />
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px' }}>
              {(() => {
                const currentMemberIds = editingBand?.band_members?.map((m: any) => m.user_id) || [];
                return students.filter(s => 
                  !currentMemberIds.includes(s.id) &&
                  `${s.first_name} ${s.last_name}`.toLowerCase().includes(memberSearch.toLowerCase())
                ).map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={resolveCampusAvatar(s, teachers, schedules)} alt={`${s.first_name} ${s.last_name} Avatar`} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.first_name} {s.last_name}</div>
                   </div>
                   <select 
                     aria-label={`Instrument für ${s.first_name} ${s.last_name} auswählen`}
                     onChange={(e) => {
                       onAddMember(showAddMember, s.id, e.target.value);
                       setShowAddMember(null);
                     }}
                     defaultValue=""
                     style={{ padding: '8px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: 800, fontSize: '0.75rem', background: 'white' }}
                   >
                     <option value="" disabled>Instrument?</option>
                     {ADMIN_INSTRUMENT_OPTIONS.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                   </select>
                </div>
                ));
              })()}
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '24px', paddingTop: '24px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Externen Schüler hinzufügen</h4>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                  placeholder="Name (z.B. Gesangsschülerin)" 
                  value={externalName}
                  onChange={e => setExternalName(e.target.value)}
                  style={{ flex: 2, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, background: '#f8fafc' }}
                />
                <select 
                  value={externalInstrument}
                  onChange={e => setExternalInstrument(e.target.value)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, background: 'white' }}
                >
                  {Object.keys(INSTRUMENT_COLORS).map(inst => <option key={inst} value={inst}>{inst}</option>)}
                </select>
                <button 
                  type="button"
                  onClick={() => {
                    onAddMember(showAddMember!, null, externalInstrument, externalName);
                    setExternalName('');
                    setShowAddMember(null);
                  }}
                  disabled={!externalName}
                  style={{ padding: '0 20px', borderRadius: '12px', border: 'none', background: brandColor, color: 'white', fontWeight: 800, cursor: 'pointer', opacity: externalName ? 1 : 0.5 }}
                >
                  +
                </button>
              </div>
            </div>
            
            <button onClick={() => setShowAddMember(null)} style={{ width: '100%', marginTop: '20px', padding: '16px', borderRadius: '16px', border: 'none', background: '#f1f5f9', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
          </div>
        </div>
      )}
    </>
  );
};
