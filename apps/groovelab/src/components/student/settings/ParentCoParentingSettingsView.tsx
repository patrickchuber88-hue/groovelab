import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Mail, Check, Trash2, HeartHandshake } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export interface ParentCoParentingSettingsViewProps {
  studentUser: any;
  studentId: string;
}

export const ParentCoParentingSettingsView: React.FC<ParentCoParentingSettingsViewProps> = ({
  studentUser,
  studentId,
}) => {
  const [relations, setRelations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newRelation, setNewRelation] = useState<string>('mother');
  const [canBilling, setCanBilling] = useState<boolean>(false);
  const [canAbsences, setCanAbsences] = useState<boolean>(true);
  const [canPermissions, setCanPermissions] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRelations = async () => {
    try {
      const { data, error } = await supabase
        .from('student_parent_relations')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setRelations(data);
      }
    } catch (e) {
      console.warn('Could not load relations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelations();
  }, [studentId]);

  const handleAddGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('invite_coparent', {
        p_student_id: studentId,
        p_email: newEmail,
        p_name: newName,
        p_relation: newRelation,
        p_can_billing: canBilling,
        p_can_absences: canAbsences,
        p_can_permissions: canPermissions,
      });

      if (error || (data && !data.success)) {
        alert('Fehler beim Hinzufügen der Erziehungsperson.');
      } else {
        setSuccessMsg('Erziehungsperson erfolgreich verknüpft.');
        setShowAddModal(false);
        setNewEmail('');
        setNewName('');
        fetchRelations();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      alert('Aktion konnte nicht ausgeführt werden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveGuardian = async (relationId: string) => {
    if (!window.confirm('Möchtest du die Verknüpfung zu dieser Person wirklich aufheben?')) return;
    try {
      await supabase.from('student_parent_relations').delete().eq('id', relationId);
      setRelations(prev => prev.filter(r => r.id !== relationId));
    } catch (e) {
      alert('Konnte nicht entfernt werden.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Card */}
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
        borderRadius: '20px',
        padding: '20px',
        border: '1.5px solid #bae6fd',
        boxShadow: '0 4px 16px -2px rgba(2, 132, 199, 0.08)',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284c7',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              flexShrink: 0
            }}>
              <HeartHandshake size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Co-Parenting &amp; Erziehungsberechtigte
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#475569', fontWeight: 600, lineHeight: 1.4 }}>
                Gemeinsam für dein Kind: Verknüpfe beide Elternteile mit separaten Zugängen und differenzierten Rechten (z. B. nur Absagen vs. Zahlungsverwaltung).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '12px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.80rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
              minHeight: '44px',
              touchAction: 'manipulation'
            }}
            className="hover-scale"
          >
            <UserPlus size={16} />
            <span>Person hinzufügen</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '12px',
          padding: '10px 14px',
          color: '#15803d',
          fontSize: '0.80rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Guardians List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {relations.length === 0 ? (
          <div style={{
            padding: '36px 20px',
            borderRadius: '18px',
            background: '#ffffff',
            border: '1.5px dashed #cbd5e1',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.82rem'
          }}>
            Noch keine weiteren Erziehungsberechtigten hinterlegt. Klicke auf „Person hinzufügen“, um einen zweiten Elternteil einzubinden.
          </div>
        ) : (
          relations.map((rel) => (
            <div
              key={rel.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 18px',
                borderRadius: '16px',
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                gap: '12px',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: '#f0fdf4',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 850,
                  fontSize: '0.90rem'
                }}>
                  {rel.parent_display_name ? rel.parent_display_name.slice(0, 1).toUpperCase() : 'E'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{rel.parent_display_name}</strong>
                    <span style={{ fontSize: '0.70rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: 750 }}>
                      {rel.relationship_type === 'mother' ? 'Mutter' : rel.relationship_type === 'father' ? 'Vater' : 'Erziehungsberechtigte(r)'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{rel.parent_email}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {rel.can_manage_absences && (
                      <span style={{ fontSize: '0.66rem', background: '#ecfdf5', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontWeight: 750 }}>
                        ✓ Absagen melden
                      </span>
                    )}
                    {rel.can_manage_billing && (
                      <span style={{ fontSize: '0.66rem', background: '#eff6ff', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: 750 }}>
                        ✓ Gebühren/Zahler
                      </span>
                    )}
                    {rel.can_manage_permissions && (
                      <span style={{ fontSize: '0.66rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 750 }}>
                        ✓ Schutzrechte
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveGuardian(rel.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px'
                }}
                className="hover-scale"
                title="Erziehungsperson entfernen"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <form
            onSubmit={handleAddGuardian}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '26px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
              Zweiten Elternteil / Vormund einbinden
            </h3>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Name der Erziehungsperson
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="z. B. Maria Muster"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
                E-Mail-Adresse
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="maria@beispiel.de"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Rolle
              </label>
              <select
                value={newRelation}
                onChange={e => setNewRelation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  background: '#ffffff',
                  boxSizing: 'border-box'
                }}
              >
                <option value="mother">Mutter</option>
                <option value="father">Vater</option>
                <option value="guardian">Gesetzlicher Vormund</option>
                <option value="grandparent">Großelternteil / Betreuung</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#334155', fontWeight: 650, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={canAbsences}
                  onChange={e => setCanAbsences(e.target.checked)}
                />
                <span>Darf Unterrichtsstunden absagen / Krankmeldungen senden</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#334155', fontWeight: 650, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={canBilling}
                  onChange={e => setCanBilling(e.target.checked)}
                />
                <span>Erhält Rechnungsbelege / ist zahlungspflichtig</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#334155', fontWeight: 650, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={canPermissions}
                  onChange={e => setCanPermissions(e.target.checked)}
                />
                <span>Darf Schutzeinstellungen &amp; Bildschirmzeiten verwalten</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 850,
                  fontSize: '0.82rem',
                  cursor: isSubmitting ? 'wait' : 'pointer'
                }}
              >
                {isSubmitting ? 'Wird gespeichert...' : 'Verknüpfen'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
