import React, { useState } from 'react';
import { 
  BookOpen, Plus, FileText, Edit2, Trash2 
} from 'lucide-react';
import { getAlphabeticalHue } from '../../utils/adminColorHelpers';

export interface SecretarySubjectsViewProps {
  schoolId: string;
  subjects: any[];
  allTeachers?: any[];
  students?: any[];
  supabase: any;
  onRefresh?: () => Promise<void> | void;
}

const FACHGRUPPEN_MAP: Record<string, string> = {
  guitar: 'Gitarre & Bass',
  piano: 'Klavier, Keyboard & Tasten',
  vocals: 'Gesang & Stimme',
  drums: 'Schlagzeug & Rhythmus',
  strings: 'Streichinstrumente',
  winds: 'Blasinstrumente',
  early_education: 'Früherziehung & Grundfächer',
  other: 'Sonstige Instrumente / Theorie & Ensemble',
  Allgemein: 'Allgemein'
};

const getCategoryLabel = (cat: string) => {
  return FACHGRUPPEN_MAP[cat] || cat || 'Allgemein';
};

const getAlphabeticalColor = (name: string) => {
  const trimmed = (name || '').trim();
  if (trimmed.toLowerCase() === 'ohne zuweisung') {
    return {
      avatarBg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      avatarColor: '#475569'
    };
  }
  const hue = getAlphabeticalHue(trimmed);
  const avatarBg = `linear-gradient(135deg, hsl(${hue}, 85%, 94%) 0%, hsl(${hue}, 80%, 84%) 100%)`;
  const avatarColor = `hsl(${hue}, 90%, 25%)`;
  return { avatarBg, avatarColor };
};

export const SecretarySubjectsView: React.FC<SecretarySubjectsViewProps> = ({
  schoolId,
  subjects,
  allTeachers = [],
  students = [],
  supabase,
  onRefresh
}) => {
  const [subjectSearchQuery, setSubjectSearchQuery] = useState<string>('');
  const [subjectFilterCategory, setSubjectFilterCategory] = useState<string>('All');
  const [showAddSubjectModal, setShowAddSubjectModal] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>('');
  const [newSubjectDescription, setNewSubjectDescription] = useState<string>('');
  const [newSubjectCategory, setNewSubjectCategory] = useState<string>('Allgemein');
  const [showEditSubjectModal, setShowEditSubjectModal] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [editSubjectName, setEditSubjectName] = useState<string>('');
  const [editSubjectCategory, setEditSubjectCategory] = useState<string>('Allgemein');
  const [editSubjectDescription, setEditSubjectDescription] = useState<string>('');
  const [isSubjectCsvExpanded, setIsSubjectCsvExpanded] = useState<boolean>(false);
  const [subjectCsvText, setSubjectCsvText] = useState<string>('');

  const nonPlaceholderSubjects = subjects.filter(s => {
    const name = (s.name || '').toLowerCase().trim();
    return name !== 'ohne zuweisung' && name !== 'allgemein';
  });

  const filtered = nonPlaceholderSubjects.filter(s => {
    const name = (s.name || '').toLowerCase();
    const desc = (s.description || '').toLowerCase();
    const cat = (s.category || '').toLowerCase();
    const query = subjectSearchQuery.toLowerCase().trim();

    const matchesSearch = !query || name.includes(query) || desc.includes(query) || cat.includes(query);
    const matchesCategory = subjectFilterCategory === 'All' || s.category === subjectFilterCategory;

    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = Array.from(new Set(nonPlaceholderSubjects.map(s => s.category || 'Allgemein'))).sort((a, b) => a.localeCompare(b));

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    try {
      const dup = subjects.find(s => s.name.toLowerCase().trim() === newSubjectName.toLowerCase().trim());
      if (dup) {
        alert(`Das Fach "${newSubjectName}" existiert bereits.`);
        return;
      }

      const { error } = await supabase
        .from('subjects')
        .insert({
          school_id: schoolId,
          name: newSubjectName.trim(),
          description: newSubjectDescription.trim() || null,
          category: newSubjectCategory || 'Allgemein'
        });

      if (error) throw error;

      alert(`Fach "${newSubjectName}" wurde erfolgreich angelegt.`);
      setNewSubjectName('');
      setNewSubjectDescription('');
      setNewSubjectCategory('Allgemein');
      setShowAddSubjectModal(false);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      alert('Fehler beim Anlegen des Fachs: ' + err.message);
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editSubjectName.trim()) return;

    try {
      const oldName = editingSubject.name;
      const newName = editSubjectName.trim();

      const dup = subjects.find(s => s.id !== editingSubject.id && s.name.toLowerCase().trim() === newName.toLowerCase());
      if (dup) {
        alert(`Ein anderes Fach mit dem Namen "${newName}" existiert bereits.`);
        return;
      }

      const { error } = await supabase
        .from('subjects')
        .update({
          name: newName,
          category: editSubjectCategory || 'Allgemein',
          description: editSubjectDescription.trim() || null
        })
        .eq('id', editingSubject.id);

      if (error) throw error;

      if (oldName !== newName && schoolId) {
        try {
          await supabase
            .from('users')
            .update({ instrument: newName })
            .eq('school_id', schoolId)
            .eq('instrument', oldName);
        } catch (cascadeErr) {
          console.warn('Subject rename cascade warning:', cascadeErr);
        }
      }

      alert(`Fach "${newName}" wurde erfolgreich aktualisiert.`);
      setShowEditSubjectModal(false);
      setEditingSubject(null);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      alert('Fehler beim Aktualisieren des Fachs: ' + err.message);
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    const assignedTeachers = (allTeachers || []).filter((t: any) => (t.instrument || '').toLowerCase().trim() === name.toLowerCase().trim());
    const assignedStudents = (students || []).filter((s: any) => (s.instrument || '').toLowerCase().trim() === name.toLowerCase().trim());
    const totalAssigned = assignedTeachers.length + assignedStudents.length;

    let confirmMsg = `Möchtest du das Fach "${name}" wirklich unwiderruflich löschen?`;
    if (totalAssigned > 0) {
      confirmMsg = `⚠️ Achtung: Das Fach "${name}" ist aktuell ${assignedTeachers.length} Lehrkraft/Lehrkräften und ${assignedStudents.length} Schüler(n) zugewiesen.\n\nBeim Löschen werden diese Zuweisungen sicher auf "ohne Zuweisung" zurückgesetzt.\n\nMöchtest du das Fach wirklich löschen?`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      if (totalAssigned > 0 && schoolId) {
        await supabase
          .from('users')
          .update({ instrument: 'ohne Zuweisung' })
          .eq('school_id', schoolId)
          .eq('instrument', name);
      }

      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);
      if (error) throw error;
      alert(`Fach "${name}" wurde gelöscht.`);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      alert('Fehler beim Löschen des Fachs: ' + err.message);
    }
  };

  const handleImportSubjects = async () => {
    if (!subjectCsvText.trim()) {
      alert("Bitte gib CSV-Daten ein.");
      return;
    }

    const lines = subjectCsvText.split('\n');
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const isDuplicate = subjects.some(s => s.name.toLowerCase().trim() === trimmed.toLowerCase());
      if (isDuplicate) {
        errors.push(`Fach "${trimmed}" existiert bereits (Übersprungen).`);
        failCount++;
        continue;
      }

      try {
        const { error } = await supabase
          .from('subjects')
          .insert({
            school_id: schoolId,
            name: trimmed,
            description: null,
            category: 'Allgemein'
          });

        if (error) throw error;
        successCount++;
      } catch (err: any) {
        console.error('Import error for line:', line, err);
        errors.push(`Zeile "${line}": ${err.message || err}`);
        failCount++;
      }
    }

    if (errors.length > 0) {
      alert(`Import abgeschlossen: ${successCount} Fächer erfolgreich angelegt, ${failCount} Übersprungen/Fehler.\n\nDetails:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...weitere Details in der Konsole.' : ''}`);
    } else {
      alert(`Import abgeschlossen: ${successCount} Fächer erfolgreich angelegt.`);
    }

    setSubjectCsvText('');
    setIsSubjectCsvExpanded(false);
    if (onRefresh) await onRefresh();
  };

  return (
    <div style={{ width: '100%' }}>
      <div className="google-card" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px', 
        padding: '24px',
        borderRadius: '24px',
        border: '1.5px solid #cbd5e1',
        background: '#ffffff',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={22} style={{ color: '#0f172a' }} />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
              Unterrichtsfächer
            </h3>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsSubjectCsvExpanded(!isSubjectCsvExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '0.8rem',
                fontWeight: 800,
                background: isSubjectCsvExpanded ? '#f1f5f9' : '#ffffff',
                color: '#475569',
                border: '1.5px solid #cbd5e1',
                cursor: 'pointer',
                fontFamily: 'Urbanist',
                transition: 'all 0.2s'
              }}
            >
              <FileText size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Sammel-Onboarding (CSV) {isSubjectCsvExpanded ? '▲' : '▼'}
            </button>

            <button
              onClick={() => {
                setShowAddSubjectModal(true);
                if (subjectFilterCategory && subjectFilterCategory !== 'All') {
                  setNewSubjectCategory(subjectFilterCategory);
                }
              }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                borderRadius: '12px', 
                padding: '8px 16px', 
                fontSize: '0.8rem', 
                fontWeight: 800,
                background: '#34a853',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Urbanist',
                boxShadow: '0 4px 10px rgba(52, 168, 83,0.15)',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={15} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Fach anlegen
            </button>
          </div>
        </div>

        {/* Collapsible CSV Box */}
        {isSubjectCsvExpanded && (
          <div style={{ background: '#f8fafc', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', fontWeight: 800 }}><FileText size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Sammel-Onboarding (CSV)</h4>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: '1.4' }}>
              Gib eine Liste von Fächern ein (ein Fachname pro Zeile). Bereits vorhandene Fächer werden automatisch übersprungen.
            </p>
            <textarea
              value={subjectCsvText}
              onChange={(e) => setSubjectCsvText(e.target.value)}
              placeholder="z.B.&#10;Gitarre&#10;Klavier&#10;Gesang&#10;Querflöte"
              rows={5}
              style={{ padding: '8px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'monospace', outline: 'none' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Standard-Fächer schnell hinzufügen:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['ohne Zuweisung', 'Schlagzeug', 'Piano', 'Gitarre', 'Gesang', 'Geige', 'Querflöte', 'Saxophon', 'Bass', 'Keyboard', 'Trompete'].map(inst => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => {
                      const lines = subjectCsvText.split('\n').map(l => l.trim()).filter(Boolean);
                      if (!lines.some(l => l.toLowerCase() === inst.toLowerCase())) {
                        setSubjectCsvText(prev => prev.trim() ? prev.trim() + '\n' + inst : inst);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '100px',
                      padding: '4px 12px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'Urbanist'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#94a3b8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    <Plus size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {inst}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleImportSubjects}
              style={{ background: '#475569', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 16px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', alignSelf: 'flex-start' }}
            >
              📥 Fächer importieren
            </button>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              value={subjectSearchQuery}
              onChange={(e) => setSubjectSearchQuery(e.target.value)}
              placeholder="Fach nach Name oder Beschreibung suchen..."
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '14px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                fontFamily: 'Urbanist',
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          <select
            value={subjectFilterCategory}
            onChange={(e) => setSubjectFilterCategory(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              fontFamily: 'Urbanist',
              fontWeight: 600,
              outline: 'none',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="All">Alle Kategorien ({nonPlaceholderSubjects.length})</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{getCategoryLabel(cat)} ({nonPlaceholderSubjects.filter(s => s.category === cat).length})</option>
            ))}
          </select>
        </div>

        {/* Subjects List Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowX: 'auto', width: '100%' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <BookOpen size={40} style={{ color: '#cbd5e1', display: 'block', margin: '0 auto 8px' }} />
              Keine Fächer gefunden. Lege ein neues Fach an oder ändere die Suchkriterien.
            </div>
          ) : (
            filtered.map(s => {
              const { avatarBg, avatarColor } = getAlphabeticalColor(s.name);

              return (
                <div 
                  key={s.id} 
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderRadius: '16px',
                    border: '1px solid #f1f5f9',
                    background: '#ffffff',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.01)',
                    transition: 'all 0.25s ease',
                    minWidth: '850px'
                  }}
                  className="hover-scale"
                >
                  {/* Icon & Title / Description */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '2', minWidth: '220px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: avatarBg,
                      color: avatarColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: 900,
                      fontFamily: 'Urbanist',
                      flexShrink: 0
                    }}>
                      {s.name.trim().charAt(0).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                        Kategorie: {getCategoryLabel(s.category)}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div style={{ flex: '0.5', minWidth: '90px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => {
                        setEditingSubject(s);
                        setEditSubjectName(s.name || '');
                        setEditSubjectCategory(s.category || 'Allgemein');
                        setEditSubjectDescription(s.description || '');
                        setShowEditSubjectModal(true);
                      }}
                      title="Fach bearbeiten"
                      style={{
                        padding: '7px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#e2e8f0';
                        e.currentTarget.style.color = '#0f172a';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.color = '#475569';
                      }}
                    >
                      <Edit2 size={15} />
                    </button>

                    {s.name.toLowerCase() !== 'ohne zuweisung' && (
                      <button
                        onClick={() => handleDeleteSubject(s.id, s.name)}
                        title="Fach löschen"
                        style={{
                          padding: '7px',
                          borderRadius: '10px',
                          border: '1px solid #fee2e2',
                          background: '#fff5f5',
                          cursor: 'pointer',
                          color: '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fee2e2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#fff5f5';
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Add Subject */}
      {showAddSubjectModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-subject-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddSubjectModal(false);
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 id="add-subject-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                <Plus size={18} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#34a853' }} /> Neues Unterrichtsfach anlegen
              </h3>
              <button 
                type="button"
                aria-label="Dialog schließen"
                onClick={() => setShowAddSubjectModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubject} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="new-subject-name" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Name des Fachs *</label>
                <input 
                  id="new-subject-name"
                  type="text" 
                  required
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="z.B. Blockflöte, Klavier, Gesang"
                  aria-label="Name des neuen Unterrichtsfachs"
                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="new-subject-category" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Kategorie / Sparte *</label>
                <select
                  id="new-subject-category"
                  aria-label="Kategorie des neuen Unterrichtsfachs"
                  value={newSubjectCategory}
                  onChange={(e) => setNewSubjectCategory(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                >
                  <option value="Allgemein">Allgemein</option>
                  <option value="guitar">Gitarre & Bass</option>
                  <option value="piano">Klavier, Keyboard & Tasten</option>
                  <option value="vocals">Gesang & Stimme</option>
                  <option value="drums">Schlagzeug & Rhythmus</option>
                  <option value="strings">Streichinstrumente (Geige, Cello etc.)</option>
                  <option value="winds">Blasinstrumente (Flöte, Trompete etc.)</option>
                  <option value="early_education">Früherziehung & Grundfächer (EMP)</option>
                  <option value="other">Theorie, Ensemble & Sonstiges</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Beschreibung (optional)</label>
                <textarea 
                  value={newSubjectDescription}
                  onChange={(e) => setNewSubjectDescription(e.target.value)}
                  placeholder="Optionale Beschreibung des Unterrichtsfachs..."
                  rows={3}
                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  style={{ background: '#34a853', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(52, 168, 83,0.15)' }}
                >
                  Fach anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Subject */}
      {showEditSubjectModal && editingSubject && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-subject-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditSubjectModal(false);
              setEditingSubject(null);
            }
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 id="edit-subject-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} style={{ color: '#34a853' }} /> Unterrichtsfach bearbeiten
              </h3>
              <button 
                type="button"
                aria-label="Dialog schließen"
                onClick={() => {
                  setShowEditSubjectModal(false);
                  setEditingSubject(null);
                }}
                style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUpdateSubject} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="edit-subject-name" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Name des Fachs *</label>
                <input 
                  id="edit-subject-name"
                  type="text" 
                  required
                  value={editSubjectName}
                  onChange={(e) => setEditSubjectName(e.target.value)}
                  placeholder="z.B. Klavier, Gitarre, Gesang"
                  aria-label="Name des zu bearbeitenden Fachs"
                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="edit-subject-category" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Kategorie / Sparte *</label>
                <select
                  id="edit-subject-category"
                  aria-label="Kategorie des zu bearbeitenden Fachs"
                  value={editSubjectCategory}
                  onChange={(e) => setEditSubjectCategory(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                >
                  <option value="Allgemein">Allgemein</option>
                  <option value="guitar">Gitarre & Bass</option>
                  <option value="piano">Klavier, Keyboard & Tasten</option>
                  <option value="vocals">Gesang & Stimme</option>
                  <option value="drums">Schlagzeug & Rhythmus</option>
                  <option value="strings">Streichinstrumente (Geige, Cello etc.)</option>
                  <option value="winds">Blasinstrumente (Flöte, Trompete etc.)</option>
                  <option value="early_education">Früherziehung & Grundfächer (EMP)</option>
                  <option value="other">Theorie, Ensemble & Sonstiges</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Beschreibung (optional)</label>
                <textarea 
                  value={editSubjectDescription}
                  onChange={(e) => setEditSubjectDescription(e.target.value)}
                  placeholder="Optionale Beschreibung des Unterrichtsfachs..."
                  rows={3}
                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSubjectModal(false);
                    setEditingSubject(null);
                  }}
                  style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  style={{ background: '#34a853', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(52, 168, 83,0.15)' }}
                >
                  Änderungen speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecretarySubjectsView;
