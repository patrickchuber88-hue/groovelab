import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  X, 
  Search, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Users, 
  Music, 
  Guitar, 
  Mic, 
  Headphones, 
  Radio, 
  Trophy, 
  Sparkles, 
  Flame, 
  Layers, 
  Compass, 
  Award,
  ShieldCheck,
  Lock,
  CheckSquare
} from 'lucide-react';
import { formatSingleStudentAnonymized } from '../utils/nameHelper';
import { resolveCampusStudentAvatar } from './StudioAvatar';

export interface CampusCreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedStudents: any[];
  currentUserId: string;
  onGroupCreated: (newGroup: any) => void;
}

const CURATED_ICONS = [
  { id: 'music', label: 'Musik', Icon: Music },
  { id: 'users', label: 'Ensemble', Icon: Users },
  { id: 'guitar', label: 'Gitarre', Icon: Guitar },
  { id: 'mic', label: 'Gesang', Icon: Mic },
  { id: 'headphones', label: 'Studio', Icon: Headphones },
  { id: 'radio', label: 'Band', Icon: Radio },
  { id: 'sparkles', label: 'Projekt', Icon: Sparkles },
  { id: 'trophy', label: 'Meisterklasse', Icon: Trophy },
  { id: 'flame', label: 'Live Lab', Icon: Flame },
  { id: 'layers', label: 'Theorie', Icon: Layers },
  { id: 'compass', label: 'Orchester', Icon: Compass },
  { id: 'award', label: 'Konzert', Icon: Award }
];

const CURATED_COLORS = [
  { id: '#34a853', name: 'Campus-Grün', border: '#2e9549' },
  { id: '#2563eb', name: 'Königsblau', border: '#1d4ed8' },
  { id: '#7c3aed', name: 'Violett', border: '#6d28d9' },
  { id: '#d97706', name: 'Bernstein', border: '#b45309' },
  { id: '#e11d48', name: 'Rose', border: '#be123c' }
];

export const CampusCreateGroupModal: React.FC<CampusCreateGroupModalProps> = ({
  isOpen,
  onClose,
  assignedStudents,
  currentUserId,
  onGroupCreated
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  // Step 2 Fields
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('music');
  const [selectedColor, setSelectedColor] = useState('#34a853');
  const [adminOnlyMessaging, setAdminOnlyMessaging] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSearchQuery('');
      setSelectedStudentIds([]);
      setGroupName('');
      setGroupDescription('');
      setSelectedIcon('music');
      setSelectedColor('#34a853');
      setAdminOnlyMessaging(false);
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Escape key handler for WCAG AA compliance
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!assignedStudents || assignedStudents.length === 0) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return assignedStudents;
    return assignedStudents.filter(s => {
      const fn = (s.first_name || s.name || '').toLowerCase();
      const ln = (s.last_name || s.full_last_name || '').toLowerCase();
      const inst = (s.instrument || s.instrument_type || '').toLowerCase();
      return fn.includes(q) || ln.includes(q) || inst.includes(q);
    });
  }, [assignedStudents, searchQuery]);

  // Selected students lookup
  const selectedStudents = useMemo(() => {
    const map = new Map<string, any>();
    (assignedStudents || []).forEach(s => {
      if (s.id && selectedStudentIds.includes(s.id)) {
        map.set(s.id, s);
      }
    });
    return Array.from(map.values());
  }, [assignedStudents, selectedStudentIds]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const isAllSelected = useMemo(() => {
    if (!filteredStudents || filteredStudents.length === 0) return false;
    return filteredStudents.every(s => selectedStudentIds.includes(s.id));
  }, [filteredStudents, selectedStudentIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredStudents.map(s => s.id));
      setSelectedStudentIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const newIds = new Set(selectedStudentIds);
      filteredStudents.forEach(s => newIds.add(s.id));
      setSelectedStudentIds(Array.from(newIds));
    }
  };

  const handleCreateGroup = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setErrorMessage('Bitte gib einen Gruppennamen ein.');
      return;
    }
    if (selectedStudentIds.length === 0) {
      setErrorMessage('Bitte wähle mindestens einen Schüler für die Gruppe aus.');
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Primary: Server-Side Atomic RPC (OWASP ASVS Level 3)
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_campus_chat_group', {
        p_name: trimmedName,
        p_description: groupDescription.trim() || null,
        p_icon: selectedIcon,
        p_color: selectedColor,
        p_admin_only_messaging: adminOnlyMessaging,
        p_student_ids: selectedStudentIds
      });

      if (!rpcError && rpcData?.success) {
        const newGroupObj = {
          id: rpcData.group_id,
          name: trimmedName,
          description: groupDescription.trim() || null,
          icon: selectedIcon,
          color: selectedColor,
          creator_id: currentUserId,
          admin_only_messaging: adminOnlyMessaging,
          members_count: rpcData.members_count || (selectedStudentIds.length + 1),
          is_archived: false,
          created_at: new Date().toISOString()
        };
        onGroupCreated(newGroupObj);
        onClose();
        return;
      }

      // 2. Fallback in case RPC is not yet migrated on target node: direct client insert
      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', currentUserId)
        .maybeSingle();

      const schoolId = userData?.school_id || (typeof window !== 'undefined' ? sessionStorage.getItem('groovelab_school_id') : null);
      if (!schoolId) {
        throw new Error('Keine zugehörige Musikschule gefunden.');
      }

      const { data: groupInsert, error: groupError } = await supabase
        .from('campus_chat_groups')
        .insert({
          school_id: schoolId,
          name: trimmedName,
          description: groupDescription.trim() || null,
          icon: selectedIcon,
          color: selectedColor,
          creator_id: currentUserId,
          admin_only_messaging: adminOnlyMessaging
        })
        .select()
        .single();

      if (groupError || !groupInsert) {
        if (groupError?.message?.includes('schema cache') || groupError?.code === 'PGRST205') {
          throw new Error('Die Gruppenfunktion wird gerade im Datenbankschema initialisiert (Migration 407). Bitte Schema-Cache aktualisieren.');
        }
        throw new Error(groupError?.message || 'Gruppe konnte nicht gespeichert werden.');
      }

      // Insert creator as creator
      const memberRows = [
        {
          school_id: schoolId,
          group_id: groupInsert.id,
          user_id: currentUserId,
          role: 'creator'
        },
        ...selectedStudentIds.map(sId => ({
          school_id: schoolId,
          group_id: groupInsert.id,
          user_id: sId,
          role: 'member'
        }))
      ];

      await supabase.from('campus_chat_group_members').insert(memberRows);

      // Insert initial system notification message
      await supabase.from('campus_direct_messages').insert({
        group_id: groupInsert.id,
        sender_id: currentUserId,
        recipient_id: currentUserId,
        content: `Gruppe „${trimmedName}“ wurde erstellt.`
      });

      const newGroupObj = {
        ...groupInsert,
        members_count: memberRows.length
      };

      onGroupCreated(newGroupObj);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Fehler beim Erstellen der Gruppe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        boxSizing: 'border-box'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-group-title"
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          border: '1px solid #e2e8f0',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: '#e6f4ea',
                color: '#1e7e34',
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '4px 10px',
                borderRadius: '100px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Schritt {step} von 2
              </span>
              <h2 id="create-group-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                {step === 1 ? 'Teilnehmer auswählen' : 'Gruppe konfigurieren'}
              </h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
              {step === 1 
                ? 'Wähle die Schüler aus deiner Klasse für dieses Ensemble oder Projekt' 
                : 'Gib der Gruppe einen Namen und wähle ein passendes Musik-Icon'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'background 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', boxSizing: 'border-box' }} className="custom-scrollbar">
          {errorMessage && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '16px'
            }}>
              {errorMessage}
            </div>
          )}

          {/* STEP 1: TEILNEHMER AUSWÄHLEN */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Selected Students Chips Bar */}
              {selectedStudents.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Ausgewählt ({selectedStudents.length})
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '8px'
                  }} className="custom-scrollbar">
                    {selectedStudents.map(student => (
                      <div 
                        key={student.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#e6f4ea',
                          border: '1px solid #bbf7d0',
                          borderRadius: '100px',
                          padding: '4px 10px 4px 6px',
                          flexShrink: 0
                        }}
                      >
                        <img 
                          src={resolveCampusStudentAvatar(student)} 
                          alt="" 
                          style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} 
                        />
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534' }}>
                          {formatSingleStudentAnonymized(student.first_name, student.full_last_name || student.last_name, student.id)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleStudent(student.id)}
                          aria-label={`Entfernen ${student.first_name}`}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            color: '#166534'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Schüler suchen..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Action Bar: Counter & "Alle auswählen" Button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px'
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                  {filteredStudents.length} {filteredStudents.length === 1 ? 'Schüler' : 'Schüler'} {searchQuery ? 'gefunden' : 'verfügbar'}
                </span>

                {filteredStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: isAllSelected ? '#e6f4ea' : '#ffffff',
                      border: isAllSelected ? '1px solid #86efac' : '1px solid #cbd5e1',
                      color: isAllSelected ? '#166534' : '#1e293b',
                      borderRadius: '10px',
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease'
                    }}
                    title={isAllSelected ? "Alle Schüler abwählen" : "Alle Schüler auswählen"}
                  >
                    <CheckSquare size={14} style={{ color: isAllSelected ? '#166534' : '#475569' }} />
                    <span>{isAllSelected ? 'Auswahl aufheben' : 'Alle auswählen'}</span>
                  </button>
                )}
              </div>

              {/* Students Checklist */}
              <div style={{
                border: '1px solid #f1f5f9',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#fafbfc'
              }}>
                {filteredStudents.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem', fontWeight: 700 }}>
                    Keine passenden Schüler gefunden.
                  </div>
                ) : (
                  filteredStudents.map(student => {
                    const isChecked = selectedStudentIds.includes(student.id);
                    const displayName = formatSingleStudentAnonymized(student.first_name, student.full_last_name || student.last_name, student.id);
                    const avatarUrl = resolveCampusStudentAvatar(student);

                    return (
                      <div
                        key={student.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleStudent(student.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleStudent(student.id);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: isChecked ? '#f0fdf4' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img 
                            src={avatarUrl} 
                            alt="" 
                            style={{ width: '38px', height: '38px', borderRadius: '12px', objectFit: 'cover', background: '#e2e8f0' }} 
                          />
                          <div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                              {displayName}
                            </div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                              {student.instrument || student.instrument_type || 'Schüler'}
                            </div>
                          </div>
                        </div>

                        {/* Checkbox indicator */}
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '8px',
                          border: isChecked ? '2px solid #34a853' : '2px solid #cbd5e1',
                          background: isChecked ? '#34a853' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s'
                        }}>
                          {isChecked && <Check size={16} color="#ffffff" strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* STEP 2: GRUPPEN-DETAILS FESTLEGEN */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Group Name Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                  Gruppenname <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="z. B. Rock Band Di 17 Uhr, Junior Ensemble..."
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Group Description Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                  Beschreibung (optional)
                </label>
                <input
                  type="text"
                  placeholder="z. B. Vorbereitung für das Schuljahreskonzert 2026"
                  value={groupDescription}
                  onChange={e => setGroupDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Curated Monochrome Icon Grid */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Gruppen-Symbol (Monochrom)
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '10px'
                }}>
                  {CURATED_ICONS.map(item => {
                    const isSelected = selectedIcon === item.id;
                    const IconComp = item.Icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedIcon(item.id)}
                        aria-label={item.label}
                        title={item.label}
                        style={{
                          height: '52px',
                          borderRadius: '14px',
                          border: isSelected ? `2px solid ${selectedColor}` : '1px solid #e2e8f0',
                          background: isSelected ? '#f8fafc' : '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'
                        }}
                      >
                        <IconComp size={22} color={isSelected ? selectedColor : '#64748b'} strokeWidth={isSelected ? 2.5 : 2} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Accent Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Farb-Akzent
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {CURATED_COLORS.map(c => {
                    const isSelected = selectedColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedColor(c.id)}
                        aria-label={c.name}
                        title={c.name}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: c.id,
                          border: isSelected ? '3px solid #ffffff' : 'none',
                          boxShadow: isSelected ? `0 0 0 2px ${c.id}` : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.15s'
                        }}
                      >
                        {isSelected && <Check size={16} color="#ffffff" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Admin-Only Messaging Switch */}
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setAdminOnlyMessaging(prev => !prev)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setAdminOnlyMessaging(prev => !prev);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: '#f8fafc',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: adminOnlyMessaging ? '#e6f4ea' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Lock size={18} color={adminOnlyMessaging ? '#166534' : '#64748b'} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                      Ankündigungskanal
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
                      Nur Lehrkräfte dürfen in der Gruppe schreiben (Schüler lesen mit)
                    </div>
                  </div>
                </div>

                {/* Switch indicator */}
                <div style={{
                  width: '46px',
                  height: '26px',
                  borderRadius: '100px',
                  background: adminOnlyMessaging ? '#34a853' : '#cbd5e1',
                  position: 'relative',
                  transition: 'background 0.2s',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    position: 'absolute',
                    top: '3px',
                    left: adminOnlyMessaging ? '23px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>

              <button
                type="button"
                disabled={selectedStudentIds.length === 0}
                onClick={() => setStep(2)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  background: selectedStudentIds.length > 0 ? '#34a853' : '#cbd5e1',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  cursor: selectedStudentIds.length > 0 ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s'
                }}
              >
                <span>Weiter ({selectedStudentIds.length} gewählt)</span>
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={16} />
                <span>Zurück</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting || !groupName.trim()}
                onClick={handleCreateGroup}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: groupName.trim() && !isSubmitting ? '#34a853' : '#cbd5e1',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  cursor: groupName.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                  boxShadow: groupName.trim() ? '0 4px 12px rgba(52, 168, 83, 0.25)' : 'none'
                }}
              >
                {isSubmitting ? 'Gruppe wird erstellt...' : 'Gruppe erstellen'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
