import React from 'react';
import { X } from 'lucide-react';

export interface TeacherEditStudentModalProps {
  editingStudent: any;
  setEditingStudent: (student: any | null) => void;
  handleUpdateStudent: (e: React.FormEvent) => Promise<void>;
  activePlatform: string;
  schoolData?: any;
}

export const TeacherEditStudentModal: React.FC<TeacherEditStudentModalProps> = ({
  editingStudent,
  setEditingStudent,
  handleUpdateStudent,
  activePlatform,
  schoolData
}) => {
  if (!editingStudent) return null;

  const isCampus = activePlatform === 'campus' && schoolData?.has_campus_subscription !== false;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        zIndex: 1500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
      onClick={() => setEditingStudent(null)}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-student-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          border: '1.5px solid #e2e8f0',
          borderRadius: '32px',
          width: '100%',
          maxWidth: '500px',
          padding: '32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 id="edit-student-modal-title" style={{ fontSize: '1.35rem', fontWeight: 950, color: '#1e293b', margin: 0 }}>
            Schüler bearbeiten
          </h3>
          <button 
            type="button"
            onClick={() => setEditingStudent(null)}
            aria-label="Schließen"
            style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleUpdateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vorname</label>
            <input 
              type="text" 
              required
              value={editingStudent.first_name || ''} 
              onChange={e => setEditingStudent({...editingStudent, first_name: e.target.value})} 
              style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              {isCampus ? 'Nachname' : 'Nachname (Initial)'}
            </label>
            <input 
              type="text" 
              required
              value={editingStudent.last_name || ''} 
              onChange={e => setEditingStudent({...editingStudent, last_name: e.target.value})} 
              style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</label>
            <select 
              value={editingStudent.status || 'active'}
              onChange={e => setEditingStudent({...editingStudent, status: e.target.value})}
              style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem', background: 'white' }}
            >
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </div>

          {activePlatform === 'campus' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                id="editIsExternalVocalist"
                checked={Boolean(editingStudent.is_external_vocalist)} 
                onChange={e => setEditingStudent({...editingStudent, is_external_vocalist: e.target.checked})} 
              />
              <label htmlFor="editIsExternalVocalist" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>Externer Sänger (Vocals)</label>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              id="editIsTrial"
              checked={Boolean(editingStudent.is_trial)} 
              onChange={e => setEditingStudent({...editingStudent, is_trial: e.target.checked})} 
            />
            <label htmlFor="editIsTrial" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>In Testphase (Trial)</label>
          </div>

          {editingStudent.is_trial && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Testphase Ende</label>
              <input 
                type="date" 
                value={editingStudent.trial_ends_at ? editingStudent.trial_ends_at.substring(0, 10) : ''} 
                onChange={e => setEditingStudent({...editingStudent, trial_ends_at: e.target.value})} 
                style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Vertragsende (optional)</label>
            <input 
              type="date" 
              value={editingStudent.contract_ends_at ? editingStudent.contract_ends_at.substring(0, 10) : ''} 
              onChange={e => setEditingStudent({...editingStudent, contract_ends_at: e.target.value})} 
              style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          {/* Campus app_usage_mode Toggle (Only for Campus) */}
          {activePlatform === 'campus' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Campus-Nutzungsmodus</label>
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setEditingStudent({...editingStudent, app_usage_mode: 'student_only'})}
                  style={{
                    flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                    background: (editingStudent.app_usage_mode || 'student_only') === 'student_only' ? '#ffffff' : 'transparent',
                    color: (editingStudent.app_usage_mode || 'student_only') === 'student_only' ? '#8b5cf6' : '#64748b',
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: (editingStudent.app_usage_mode || 'student_only') === 'student_only' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  📱 Selbstnutzer
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStudent({...editingStudent, app_usage_mode: 'parent_hybrid'})}
                  style={{
                    flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                    background: editingStudent.app_usage_mode === 'parent_hybrid' ? '#ffffff' : 'transparent',
                    color: editingStudent.app_usage_mode === 'parent_hybrid' ? '#8b5cf6' : '#64748b',
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: editingStudent.app_usage_mode === 'parent_hybrid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  👪 Eltern-Hybrid
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button 
              type="button" 
              onClick={() => setEditingStudent(null)}
              style={{ flex: 1, padding: '14px', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 800, color: '#475569', cursor: 'pointer' }}
            >
              Abbrechen
            </button>
            <button 
              type="submit" 
              style={{ flex: 1, padding: '14px', borderRadius: '16px', border: 'none', background: '#8b5cf6', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)' }}
            >
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
