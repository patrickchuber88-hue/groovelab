import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { VERWALTUNG_THEME } from '../theme/verwaltungTheme';

interface Duty {
  id: string;
  school_id: string;
  title: string;
  description?: string;
  assigned_user_id?: string;
  due_date?: string;
  status: 'offen' | 'in_bearbeitung' | 'erledigt';
  created_at: string;
}

interface DutiesManagementPanelProps {
  schoolId: string;
  staffMembers: Array<{ id: string; first_name: string; last_name: string; role: string }>;
}

export const DutiesManagementPanel: React.FC<DutiesManagementPanelProps> = ({
  schoolId,
  staffMembers
}) => {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssignedUser, setNewAssignedUser] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const fetchDuties = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('duties')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDuties(data || []);
    } catch (err: any) {
      console.error('Fehler beim Laden der Pflichten:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuties();
  }, [schoolId]);

  const handleCreateDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !schoolId) return;

    try {
      const { error } = await supabase.from('duties').insert({
        school_id: schoolId,
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        assigned_user_id: newAssignedUser || null,
        due_date: newDueDate || null,
        status: 'offen'
      });

      if (error) throw error;

      setNewTitle('');
      setNewDescription('');
      setNewAssignedUser('');
      setNewDueDate('');
      setShowAddModal(false);
      fetchDuties();
    } catch (err: any) {
      alert('Fehler beim Anlegen der Aufgabe: ' + err.message);
    }
  };

  const handleToggleStatus = async (duty: Duty) => {
    const nextStatus = duty.status === 'offen' ? 'erledigt' : 'offen';
    try {
      const { error } = await supabase
        .from('duties')
        .update({ status: nextStatus })
        .eq('id', duty.id);

      if (error) throw error;
      setDuties(duties.map(d => d.id === duty.id ? { ...d, status: nextStatus } : d));
    } catch (err: any) {
      alert('Fehler beim Aktualisieren: ' + err.message);
    }
  };

  const handleDeleteDuty = async (id: string) => {
    if (!window.confirm('Aufgabe wirklich löschen?')) return;
    try {
      const { error } = await supabase.from('duties').delete().eq('id', id);
      if (error) throw error;
      setDuties(duties.filter(d => d.id !== id));
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '24px', background: 'white', borderRadius: '24px', border: `1px solid ${VERWALTUNG_THEME.borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
            📋 Aufgaben- & Pflichten-Board
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Verwaltung interner Schulaufgaben, Fristen und Verantwortlichkeiten
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: VERWALTUNG_THEME.primaryColor,
            color: 'white',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(234, 67, 53, 0.25)'
          }}
        >
          + Neue Aufgabe anlegen
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Aufgaben...</div>
      ) : duties.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1.5px dashed #cbd5e1', color: '#64748b' }}>
          Keine Aufgaben vorhanden. Erstelle die erste Aufgabe für dein Team!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {duties.map(d => {
            const assigned = staffMembers.find(s => s.id === d.assigned_user_id);
            const isDone = d.status === 'erledigt';

            return (
              <div
                key={d.id}
                style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: isDone ? '#f8fafc' : 'white',
                  border: `1px solid ${isDone ? '#e2e8f0' : '#cbd5e1'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  opacity: isDone ? 0.75 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => handleToggleStatus(d)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: VERWALTUNG_THEME.primaryColor }}
                  />
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isDone ? '#64748b' : '#1e293b', textDecoration: isDone ? 'line-through' : 'none' }}>
                      {d.title}
                    </div>
                    {d.description && (
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                        {d.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                      {assigned && <span>👤 Zugewiesen an: <strong>{assigned.first_name} {assigned.last_name}</strong></span>}
                      {d.due_date && <span>📅 Fällig: {d.due_date}</span>}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteDuty(d.id)}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }}
                  title="Aufgabe löschen"
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <form onSubmit={handleCreateDuty} style={{ background: 'white', padding: '28px', borderRadius: '24px', width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
            <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
              ➕ Neue Aufgabe anlegen
            </h4>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>Titel *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="z.B. Instrumenten-Inventar prüfen"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>Beschreibung</label>
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Zusätzliche Details oder Anweisungen..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>Zuweisen an</label>
                <select
                  value={newAssignedUser}
                  onChange={e => setNewAssignedUser(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                >
                  <option value="">-- Nicht zugewiesen --</option>
                  {staffMembers.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>Fälligkeitsdatum</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                style={{ background: VERWALTUNG_THEME.primaryColor, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Speichern
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
