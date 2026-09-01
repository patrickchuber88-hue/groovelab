import React, { useState } from 'react';
import { 
  ArrowUp, ArrowDown, Trash2, Plus, Upload, CheckCircle, 
  Clock, AlertTriangle, AlertCircle, FileText, Download, 
  HelpCircle, Search, Edit2, CheckCircle2, ChevronDown, 
  ChevronUp, User, X, ClipboardList
} from 'lucide-react';
import { formatTeacherFullName } from '../../utils/nameHelper';

export interface DutyItem {
  id: string;
  title: string;
  description?: string;
  duty_type: 'todo' | 'questionnaire';
  priority: 'standard' | 'critical';
  target_type: 'all' | 'group' | 'individual';
  target_group?: string;
  target_teacher_id?: string;
  due_date?: string;
  recurrence?: string;
  attachment_url?: string;
  questions?: Array<string | { text: string; type?: 'text' | 'choice' | 'boolean'; options?: string[] }>;
  created_at?: string;
}

export interface DutyResponseItem {
  id: string;
  duty_id: string;
  teacher_id: string;
  status: 'pending' | 'completed';
  response_text?: string;
  created_at: string;
  completed_at?: string;
  teacher?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    instrument?: string;
  };
}

interface SecretaryDutiesViewProps {
  duties: DutyItem[];
  dutiesLoading: boolean;
  allUniqueTeachers: any[];
  editingDutyId: string | null;
  setEditingDutyId: (id: string | null) => void;
  newDutyTitle: string;
  setNewDutyTitle: (title: string) => void;
  newDutyDescription: string;
  setNewDutyDescription: (desc: string) => void;
  newDutyType: 'todo' | 'questionnaire';
  setNewDutyType: (type: 'todo' | 'questionnaire') => void;
  newDutyPriority: 'standard' | 'critical';
  setNewDutyPriority: (prio: 'standard' | 'critical') => void;
  newDutyTargetType: 'all' | 'group' | 'individual';
  setNewDutyTargetType: (target: 'all' | 'group' | 'individual') => void;
  newDutyTargetGroup: string;
  setNewDutyTargetGroup: (group: string) => void;
  newDutyTargetTeacherId: string;
  setNewDutyTargetTeacherId: (id: string) => void;
  newDutyDueDate: string;
  setNewDutyDueDate: (date: string) => void;
  newDutyRecurrence: 'none' | 'monthly' | 'half_yearly';
  setNewDutyRecurrence: (rec: 'none' | 'monthly' | 'half_yearly') => void;
  newDutyAttachmentUrl: string;
  setNewDutyAttachmentUrl: (url: string) => void;
  newDutyQuestions: Array<string | { text: string; type?: 'text' | 'choice' | 'boolean'; options?: string[] }>;
  setNewDutyQuestions: React.Dispatch<React.SetStateAction<Array<string | { text: string; type?: 'text' | 'choice' | 'boolean'; options?: string[] }>>>;
  uploadingDutyAttachment: boolean;
  handleUploadDutyAttachment: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSaveDuty: () => Promise<void>;
  handleDeleteDuty: (id: string) => Promise<void>;
  handleEditDuty: (duty: any) => void;
  handleResetDutyForm: () => void;
  selectedDutyForStats: any;
  setSelectedDutyForStats: (duty: any) => void;
  dutyResponses: any[];
  fetchDutyStats: (duty: any) => Promise<void>;
  statsModalTab: 'status' | 'qa' | 'overview';
  setStatsModalTab: (tab: any) => void;
  statsStatusFilter: 'all' | 'completed' | 'pending';
  setStatsStatusFilter: (filter: 'all' | 'completed' | 'pending') => void;
  statsSearchQuery: string;
  setStatsSearchQuery: (query: string) => void;
  expandedResponseIds: Record<string, boolean>;
  setExpandedResponseIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleExportDutyPdf?: () => void;
  handleExportDutyCsv?: () => void;
}

export const SecretaryDutiesView: React.FC<SecretaryDutiesViewProps> = ({
  duties,
  dutiesLoading,
  allUniqueTeachers,
  editingDutyId,
  setEditingDutyId,
  newDutyTitle,
  setNewDutyTitle,
  newDutyDescription,
  setNewDutyDescription,
  newDutyType,
  setNewDutyType,
  newDutyPriority,
  setNewDutyPriority,
  newDutyTargetType,
  setNewDutyTargetType,
  newDutyTargetGroup,
  setNewDutyTargetGroup,
  newDutyTargetTeacherId,
  setNewDutyTargetTeacherId,
  newDutyDueDate,
  setNewDutyDueDate,
  newDutyRecurrence,
  setNewDutyRecurrence,
  newDutyAttachmentUrl,
  setNewDutyAttachmentUrl,
  newDutyQuestions,
  setNewDutyQuestions,
  uploadingDutyAttachment,
  handleUploadDutyAttachment,
  handleSaveDuty,
  handleDeleteDuty,
  handleEditDuty,
  handleResetDutyForm,
  selectedDutyForStats,
  setSelectedDutyForStats,
  dutyResponses,
  fetchDutyStats,
  statsModalTab,
  setStatsModalTab,
  statsStatusFilter,
  setStatsStatusFilter,
  statsSearchQuery,
  setStatsSearchQuery,
  expandedResponseIds,
  setExpandedResponseIds,
  handleExportDutyPdf,
  handleExportDutyCsv,
}) => {
  const [newDutyQuestionInput, setNewDutyQuestionInput] = useState('');
  const [newDutyQuestionType, setNewDutyQuestionType] = useState<'text' | 'choice' | 'boolean'>('text');
  const [newDutyQuestionOptions, setNewDutyQuestionOptions] = useState('');

  const handleMoveQuestion = (idx: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newDutyQuestions.length) return;
    const updated = [...newDutyQuestions];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setNewDutyQuestions(updated);
  };

  const getTargetedTeachers = (duty: any) => {
    if (duty.target_type === 'all') return allUniqueTeachers;
    if (duty.target_type === 'individual') {
      const found = allUniqueTeachers.find(t => t.id === duty.target_teacher_id);
      return found ? [found] : [];
    }
    if (duty.target_type === 'group') {
      return allUniqueTeachers.filter(t => {
        const inst = (t.instrument || '').toLowerCase();
        const targetGrp = (duty.target_group || '').toLowerCase();
        if (targetGrp === 'guitar') return inst.includes('gitarre') || inst.includes('guitar') || inst.includes('bass');
        if (targetGrp === 'piano') return inst.includes('klavier') || inst.includes('piano') || inst.includes('keyboard') || inst.includes('keys');
        if (targetGrp === 'vocals') return inst.includes('gesang') || inst.includes('vocal') || inst.includes('sing');
        if (targetGrp === 'drums') return inst.includes('schlagzeug') || inst.includes('drum');
        return inst.includes(targetGrp);
      });
    }
    return [];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Apple Style Header Card */}
      <div className="google-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ClipboardList size={24} color="#ea4335" />
          <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Urbanist' }}>
            Dienstliche Aufgaben (Infos & To-Dos der Verwaltung)
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: '1.5' }}>
          Hier erstellst und verwaltest du Pflichtaufgaben, Arbeitsanweisungen und Fragebögen für deine Lehrkräfte. Wichtige Angelegenheiten können mit kritischer Priorität versehen werden, um das Dashboard der Lehrkraft bis zur Erledigung zu blockieren.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: CREATE FORM */}
        <div className="google-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
            {editingDutyId ? 'Aufgabe bearbeiten' : 'Aufgabe anlegen'}
          </h4>

          {/* SECTION 1: ALLGEMEINE INFOS */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Allgemeine Infos</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Titel der Aufgabe *</label>
              <input
                type="text"
                value={newDutyTitle}
                onChange={(e) => setNewDutyTitle(e.target.value)}
                placeholder="z. B. Stundenzettel Juni einreichen"
                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Anweisung / Beschreibung</label>
              <textarea
                value={newDutyDescription}
                onChange={(e) => setNewDutyDescription(e.target.value)}
                placeholder="Detaillierte Beschreibung der Aufgabe..."
                rows={3}
                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Aufgabentyp</label>
              <select
                value={newDutyType}
                onChange={(e) => {
                  setNewDutyType(e.target.value as any);
                  setNewDutyQuestions([]);
                }}
                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
              >
                <option value="todo">To-Do (einfaches Abhaken)</option>
                <option value="questionnaire">Fragebogen / Feedback-Umfrage</option>
              </select>
            </div>
          </div>

          {/* SECTION 2: ZIELGRUPPE & PRIORITÄT */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Zielgruppe & Priorität</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Priorität</label>
                <select
                  value={newDutyPriority}
                  onChange={(e) => setNewDutyPriority(e.target.value as any)}
                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                >
                  <option value="standard">Standard (normaler Feed)</option>
                  <option value="critical">Kritisch (Dashboard blockierend)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Empfänger-Gruppe</label>
                <select
                  value={newDutyTargetType}
                  onChange={(e) => setNewDutyTargetType(e.target.value as any)}
                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                >
                  <option value="all">Alle Lehrkräfte</option>
                  <option value="group">Instrumenten-Fachgruppe</option>
                  <option value="individual">Einzelne Lehrkraft</option>
                </select>
              </div>
            </div>

            {newDutyTargetType === 'group' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Fachgruppe auswählen</label>
                <select
                  value={newDutyTargetGroup}
                  onChange={(e) => setNewDutyTargetGroup(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                >
                  <option value="guitar">Gitarre & Bass</option>
                  <option value="piano">Klavier, Keyboard & Tasten</option>
                  <option value="vocals">Gesang & Stimme</option>
                  <option value="drums">Schlagzeug & Rhythmus</option>
                  <option value="strings">Streichinstrumente (Geige, Cello, Kontrabass etc.)</option>
                  <option value="winds">Blasinstrumente (Flöte, Trompete, Klarinette etc.)</option>
                  <option value="early_education">Früherziehung & Grundfächer</option>
                  <option value="other">Sonstige Instrumente / Theorie & Ensemble</option>
                </select>
              </div>
            )}

            {newDutyTargetType === 'individual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Lehrkraft auswählen</label>
                <select
                  value={newDutyTargetTeacherId}
                  onChange={(e) => setNewDutyTargetTeacherId(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                >
                  <option value="">Lehrkraft wählen...</option>
                  {allUniqueTeachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{formatTeacherFullName(t)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* SECTION 3: FRAGEBOGEN-DESIGN */}
          {newDutyType === 'questionnaire' && (
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.05em' }}>3. Fragebogen-Design (Fragen)</div>
              
              {/* Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {newDutyQuestions.map((q, idx) => {
                  const qText = typeof q === 'string' ? q : q.text;
                  const qType = typeof q === 'string' ? 'text' : (q.type || 'text');
                  const qOptions = typeof q === 'object' && q.options ? q.options : [];

                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'white', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', background: qType === 'choice' ? '#e0f2fe' : (qType === 'boolean' ? '#fef3c7' : '#f1f5f9'), color: qType === 'choice' ? '#0369a1' : (qType === 'boolean' ? '#b45309' : '#475569') }}>
                          {qType === 'choice' ? 'Auswahl' : (qType === 'boolean' ? 'Ja/Nein' : 'Freitext')}
                        </span>
                        <span style={{ fontSize: '0.80rem', color: '#1e293b', fontWeight: 700, flex: 1 }}>{qText}</span>
                        
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, 'up')}
                            style={{ border: 'none', background: 'transparent', color: idx === 0 ? '#cbd5e1' : '#64748b', cursor: idx === 0 ? 'not-allowed' : 'pointer', padding: '4px', borderRadius: '6px' }}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === newDutyQuestions.length - 1}
                            onClick={() => handleMoveQuestion(idx, 'down')}
                            style={{ border: 'none', background: 'transparent', color: idx === newDutyQuestions.length - 1 ? '#cbd5e1' : '#64748b', cursor: idx === newDutyQuestions.length - 1 ? 'not-allowed' : 'pointer', padding: '4px', borderRadius: '6px' }}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setNewDutyQuestions(newDutyQuestions.filter((_, qIdx) => qIdx !== idx))}
                            style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {qOptions && qOptions.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {qOptions.map((opt: string, oIdx: number) => (
                            <span key={oIdx} style={{ fontSize: '0.66rem', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              • {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add New Question Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px', background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', marginRight: '4px' }}>Typ:</span>
                  {[
                    { id: 'text', label: 'Freitext' },
                    { id: 'choice', label: 'Auswahl (Pills)' },
                    { id: 'boolean', label: 'Ja / Nein' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewDutyQuestionType(t.id as any)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '8px',
                        border: 'none',
                        background: newDutyQuestionType === t.id ? '#fce8e6' : '#f1f5f9',
                        color: newDutyQuestionType === t.id ? '#ea4335' : '#475569',
                        fontSize: '0.70rem',
                        fontWeight: newDutyQuestionType === t.id ? 800 : 600,
                        cursor: 'pointer'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={newDutyQuestionInput}
                  onChange={(e) => setNewDutyQuestionInput(e.target.value)}
                  placeholder="Fragetext eingeben..."
                  style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.80rem', outline: 'none' }}
                />

                {newDutyQuestionType === 'choice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b' }}>Antwort-Optionen (durch Komma getrennt):</label>
                    <input
                      type="text"
                      value={newDutyQuestionOptions}
                      onChange={(e) => setNewDutyQuestionOptions(e.target.value)}
                      placeholder="z. B. Ja, Nein, Vielleicht oder Termin A, Termin B"
                      style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none' }}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!newDutyQuestionInput.trim()) return;
                    let newQ: any;
                    if (newDutyQuestionType === 'text') {
                      newQ = { text: newDutyQuestionInput.trim(), type: 'text' };
                    } else if (newDutyQuestionType === 'boolean') {
                      newQ = { text: newDutyQuestionInput.trim(), type: 'boolean', options: ['Ja', 'Nein'] };
                    } else if (newDutyQuestionType === 'choice') {
                      const opts = newDutyQuestionOptions.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
                      newQ = {
                        text: newDutyQuestionInput.trim(),
                        type: 'choice',
                        options: opts.length > 0 ? opts : ['Ja', 'Nein']
                      };
                    }
                    setNewDutyQuestions([...newDutyQuestions, newQ]);
                    setNewDutyQuestionInput('');
                  }}
                  style={{ background: '#ea4335', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <Plus size={13} /> Frage hinzufügen
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Fälligkeitsdatum</label>
              <input
                type="date"
                value={newDutyDueDate}
                onChange={(e) => setNewDutyDueDate(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Wiederholung</label>
              <select
                value={newDutyRecurrence}
                onChange={(e) => setNewDutyRecurrence(e.target.value as any)}
                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
              >
                <option value="none">Einmalig</option>
                <option value="monthly">Monatlich</option>
                <option value="half_yearly">Halbjährlich</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Anhang (PDF, Bild)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="file"
                id="duty-file-upload"
                onChange={handleUploadDutyAttachment}
                style={{ display: 'none' }}
                accept=".pdf,image/*"
              />
              <label
                htmlFor="duty-file-upload"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Upload size={14} />
                {uploadingDutyAttachment ? 'Wird hochgeladen...' : (newDutyAttachmentUrl ? 'Anhang ersetzen' : 'Datei auswählen (PDF/Bild)')}
              </label>
              {newDutyAttachmentUrl && (
                <button
                  type="button"
                  onClick={() => setNewDutyAttachmentUrl('')}
                  style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: '10px', padding: '10px', cursor: 'pointer' }}
                  title="Anhang entfernen"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={handleSaveDuty}
              style={{
                flex: 1,
                background: '#ea4335',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                padding: '12px 20px',
                fontSize: '0.90rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(234, 67, 53, 0.25)'
              }}
            >
              <CheckCircle size={16} />
              {editingDutyId ? 'Änderungen speichern' : 'Aufgabe veröffentlichen'}
            </button>
            {editingDutyId && (
              <button
                type="button"
                onClick={handleResetDutyForm}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DUTIES LIST */}
        <div className="google-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
              Aktive & geplante Aufgaben ({duties.length})
            </h4>
          </div>

          {dutiesLoading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
              Lade Aufgaben...
            </div>
          ) : duties.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <FileText size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#64748b' }}>Keine Aufgaben vorhanden</div>
              <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Erstelle links eine neue Aufgabe für deine Lehrkräfte.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {duties.map((duty) => {
                const targetTeachers = getTargetedTeachers(duty);
                return (
                  <div
                    key={duty.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: duty.priority === 'critical' ? '#fee2e2' : '#f1f5f9',
                            color: duty.priority === 'critical' ? '#ef4444' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {duty.priority === 'critical' && <AlertTriangle size={10} />}
                            {duty.priority === 'critical' ? 'Kritisch (Blockierend)' : 'Standard'}
                          </span>

                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: duty.duty_type === 'questionnaire' ? '#e0e7ff' : '#f0fdf4',
                            color: duty.duty_type === 'questionnaire' ? '#4f46e5' : '#16a34a'
                          }}>
                            {duty.duty_type === 'questionnaire' ? 'Fragebogen' : 'To-Do'}
                          </span>

                          {duty.due_date && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} /> Fällig: {new Date(duty.due_date).toLocaleDateString('de-DE')}
                            </span>
                          )}
                        </div>

                        <h5 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                          {duty.title}
                        </h5>

                        {duty.description && (
                          <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748b', lineHeight: '1.4' }}>
                            {duty.description}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleEditDuty(duty)}
                          style={{ border: 'none', background: '#f1f5f9', color: '#475569', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
                          title="Bearbeiten"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDuty(duty.id)}
                          style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
                          title="Löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                      {duty.attachment_url ? (
                        <a 
                          href={duty.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textDecoration: 'none' }}
                        >
                          <Download size={12} /> Anhang herunterladen
                        </a>
                      ) : <div />}

                      <button
                        onClick={() => fetchDutyStats(duty)}
                        style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s'
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                        onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                      >
                        Auswertung & Details ({targetTeachers.length} Empfänger)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* STATS & DETAILS MODAL */}
      {selectedDutyForStats && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedDutyForStats.title}
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  Status & Rückmeldungen der Lehrkräfte
                </div>
              </div>
              <button
                onClick={() => setSelectedDutyForStats(null)}
                style={{ border: 'none', background: '#f1f5f9', color: '#64748b', borderRadius: '10px', padding: '6px', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation & Filters */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setStatsStatusFilter('all')}
                  style={{
                    background: statsStatusFilter === 'all' ? '#ea4335' : '#ffffff',
                    color: statsStatusFilter === 'all' ? '#ffffff' : '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Alle
                </button>
                <button
                  onClick={() => setStatsStatusFilter('completed')}
                  style={{
                    background: statsStatusFilter === 'completed' ? '#34a853' : '#ffffff',
                    color: statsStatusFilter === 'completed' ? '#ffffff' : '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Erledigt
                </button>
                <button
                  onClick={() => setStatsStatusFilter('pending')}
                  style={{
                    background: statsStatusFilter === 'pending' ? '#f59e0b' : '#ffffff',
                    color: statsStatusFilter === 'pending' ? '#ffffff' : '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Ausstehend
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {handleExportDutyCsv && (
                  <button
                    onClick={handleExportDutyCsv}
                    style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Download size={11} /> CSV
                  </button>
                )}
                {handleExportDutyPdf && (
                  <button
                    onClick={handleExportDutyPdf}
                    style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FileText size={11} /> PDF
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dutyResponses.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  Keine Daten vorhanden.
                </div>
              ) : (
                dutyResponses.map((resp) => (
                  <div
                    key={resp.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <User size={16} color="#64748b" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                        {resp.teacher ? formatTeacherFullName(resp.teacher) : 'Lehrkraft'}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: resp.status === 'completed' ? '#e6f4ea' : '#fef3c7',
                      color: resp.status === 'completed' ? '#34a853' : '#b45309'
                    }}>
                      {resp.status === 'completed' ? 'Erledigt' : 'Offen'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
