import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { VERWALTUNG_THEME } from '../theme/verwaltungTheme';

interface Cooperation {
  id: string;
  school_id: string;
  name: string;
  partner_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  subject?: string;
  teacher_id?: string;
  notes?: string;
  status: string;
  created_at: string;
}

interface CooperationsManagementPanelProps {
  schoolId: string;
  teachersList: Array<{ id: string; first_name: string; last_name: string }>;
  subjectsList: string[];
}

export const CooperationsManagementPanel: React.FC<CooperationsManagementPanelProps> = ({
  schoolId,
  teachersList,
  subjectsList
}) => {
  const [cooperations, setCooperations] = useState<Cooperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [notes, setNotes] = useState('');

  const fetchCooperations = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cooperations')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCooperations(data || []);
    } catch (err: any) {
      console.error('Fehler beim Laden der Kooperationen:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCooperations();
  }, [schoolId]);

  const handleCreateCooperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !schoolId) return;

    try {
      const { error } = await supabase.from('cooperations').insert({
        school_id: schoolId,
        name: name.trim(),
        partner_name: partnerName.trim() || null,
        contact_person: contactPerson.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        subject: subject.trim() || null,
        teacher_id: teacherId || null,
        notes: notes.trim() || null,
        status: 'active'
      });

      if (error) throw error;

      setName('');
      setPartnerName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setSubject('');
      setTeacherId('');
      setNotes('');
      setShowAddModal(false);
      fetchCooperations();
    } catch (err: any) {
      alert('Fehler beim Anlegen der Kooperation: ' + err.message);
    }
  };

  const handleDeleteCooperation = async (id: string) => {
    if (!window.confirm('Kooperation wirklich löschen?')) return;
    try {
      const { error } = await supabase.from('cooperations').delete().eq('id', id);
      if (error) throw error;
      setCooperations(cooperations.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '24px', background: 'white', borderRadius: '24px', border: `1px solid ${VERWALTUNG_THEME.borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
            🤝 Kooperationen & Partner-Schulen
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Verwaltung von Ganztagsangeboten, Schulen, Kitas und externen Partnern
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
          + Neue Kooperation anlegen
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Lade Kooperationen...</div>
      ) : cooperations.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1.5px dashed #cbd5e1', color: '#64748b' }}>
          Keine Kooperationen eingetragen. Füge deine erste Partner-Schule oder Kita hinzu!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {cooperations.map(c => {
            const assignedTeacher = teachersList.find(t => t.id === c.teacher_id);

            return (
              <div
                key={c.id}
                style={{
                  padding: '20px',
                  borderRadius: '20px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                    {c.name}
                  </div>
                  <button
                    onClick={() => handleDeleteCooperation(c.id)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
                    title="Löschen"
                  >
                    🗑️
                  </button>
                </div>

                {c.partner_name && (
                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                    🏫 Partner: <strong>{c.partner_name}</strong>
                  </div>
                )}
                {c.contact_person && (
                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                    👤 Ansprechpartner: {c.contact_person}
                  </div>
                )}
                {c.subject && (
                  <div style={{ fontSize: '0.82rem', color: VERWALTUNG_THEME.primaryColor, fontWeight: 700 }}>
                    🎵 Fach/Projekt: {c.subject}
                  </div>
                )}
                {assignedTeacher && (
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    👨‍🏫 Betreuende Lehrkraft: {assignedTeacher.first_name} {assignedTeacher.last_name}
                  </div>
                )}
                {(c.email || c.phone) && (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                    {c.email && <div>✉️ {c.email}</div>}
                    {c.phone && <div>📞 {c.phone}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <form onSubmit={handleCreateCooperation} style={{ background: 'white', padding: '28px', borderRadius: '24px', width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
              🤝 Neue Kooperation anlegen
            </h4>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Bezeichnung der Kooperation *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="z.B. Bläserklasse Goethe-Gymnasium"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Partner-Institution</label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={e => setPartnerName(e.target.value)}
                  placeholder="z.B. Goethe Gymnasium"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Ansprechpartner</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  placeholder="z.B. Hr. Meier"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>E-Mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="partner@schule.de"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Telefon</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0171 1234567"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Fach/Projekt</label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                >
                  <option value="">-- Fach wählen --</option>
                  {subjectsList.map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Betreuende Lehrkraft</label>
                <select
                  value={teacherId}
                  onChange={e => setTeacherId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                >
                  <option value="">-- Lehrkraft wählen --</option>
                  {teachersList.map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Notizen / Besonderheiten</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Vereinbarungen, Notizen..."
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
