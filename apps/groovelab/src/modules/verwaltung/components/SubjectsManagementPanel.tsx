import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { VERWALTUNG_THEME } from '../theme/verwaltungTheme';

interface Subject {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

interface SubjectsManagementPanelProps {
  schoolId: string;
  onSubjectsUpdated?: () => void;
}

export const SubjectsManagementPanel: React.FC<SubjectsManagementPanelProps> = ({
  schoolId,
  onSubjectsUpdated
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Instrumental');
  const [description, setDescription] = useState('');

  const fetchSubjects = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', schoolId)
        .order('name', { ascending: true });

      if (error) throw error;
      setSubjects(data || []);
    } catch (err: any) {
      console.error('Fehler beim Laden der Unterrichtsfächer:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [schoolId]);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !schoolId) return;

    try {
      const { error } = await supabase.from('subjects').insert({
        school_id: schoolId,
        name: name.trim(),
        category: category || 'Instrumental',
        description: description.trim() || null,
        is_active: true
      });

      if (error) throw error;

      setName('');
      setCategory('Instrumental');
      setDescription('');
      setShowAddModal(false);
      fetchSubjects();
      if (onSubjectsUpdated) onSubjectsUpdated();
    } catch (err: any) {
      alert('Fehler beim Anlegen des Fachs: ' + err.message);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('Unterrichtsfach wirklich löschen?')) return;
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
      setSubjects(subjects.filter(s => s.id !== id));
      if (onSubjectsUpdated) onSubjectsUpdated();
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '24px', background: 'white', borderRadius: '24px', border: `1px solid ${VERWALTUNG_THEME.borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
            📚 Unterrichtsfächer & Sparten
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Verwaltung aller an der Musikschule angebotenen Fächer
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
          + Neues Fach anlegen
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Unterrichtsfächer...</div>
      ) : subjects.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1.5px dashed #cbd5e1', color: '#64748b' }}>
          Keine Fächer eingetragen. Lege deine ersten Unterrichtsfächer an!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
          {subjects.map(s => (
            <div
              key={s.id}
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                  {s.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Sparte: {s.category || 'Allgemein'}
                </div>
              </div>

              <button
                onClick={() => handleDeleteSubject(s.id)}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
                title="Fach löschen"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <form onSubmit={handleCreateSubject} style={{ background: 'white', padding: '28px', borderRadius: '24px', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
            <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
              📚 Neues Unterrichtsfach anlegen
            </h4>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Bezeichnung *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="z.B. Klavier, Gitarre, Gesang"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Sparte / Kategorie</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
              >
                <option value="Instrumental">Instrumental</option>
                <option value="Vokal">Vokal / Gesang</option>
                <option value="Ensemble / Band">Ensemble / Band</option>
                <option value="Theorie / Gehörbildung">Theorie / Gehörbildung</option>
                <option value="Früherziehung">Elementare Musikpädagogik (EMP)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Beschreibung</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Kurze Beschreibung..."
                rows={2}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
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
