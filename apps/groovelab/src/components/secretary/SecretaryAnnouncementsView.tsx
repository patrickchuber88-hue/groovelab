import React, { useState } from 'react';
import { 
  ArrowUp, ArrowDown, Trash2, Plus, Upload, CheckCircle, 
  Clock, AlertTriangle, AlertCircle, FileText, Download, 
  HelpCircle, Search, Edit2, CheckCircle2, ChevronDown, 
  ChevronUp, User, X, ClipboardList
} from 'lucide-react';
import { formatTeacherFullName } from '../../utils/nameHelper';

export interface AnnouncementItem {
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
  is_anonymous?: boolean;
  created_at?: string;
}

// Backward-compatibility alias
export type DutyItem = AnnouncementItem;

export interface AnnouncementResponseItem {
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

// Backward-compatibility alias
export type DutyResponseItem = AnnouncementResponseItem;

export interface SecretaryAnnouncementsViewProps {
  announcements?: AnnouncementItem[];
  announcementsLoading?: boolean;
  allUniqueTeachers?: any[];
  editingAnnouncementId?: string | null;
  setEditingAnnouncementId?: (id: string | null) => void;
  newAnnouncementTitle?: string;
  setNewAnnouncementTitle?: (title: string) => void;
  newAnnouncementDescription?: string;
  setNewAnnouncementDescription?: (desc: string) => void;
  newAnnouncementType?: 'todo' | 'questionnaire';
  setNewAnnouncementType?: (type: 'todo' | 'questionnaire') => void;
  newAnnouncementPriority?: 'standard' | 'critical';
  setNewAnnouncementPriority?: (prio: 'standard' | 'critical') => void;
  newAnnouncementIsAnonymous?: boolean;
  setNewAnnouncementIsAnonymous?: (anon: boolean) => void;
  newAnnouncementTargetType?: 'all' | 'group' | 'individual';
  setNewAnnouncementTargetType?: (target: 'all' | 'group' | 'individual') => void;
  newAnnouncementTargetGroup?: string;
  setNewAnnouncementTargetGroup?: (group: string) => void;
  newAnnouncementTargetTeacherId?: string;
  setNewAnnouncementTargetTeacherId?: (id: string) => void;
  newAnnouncementDueDate?: string;
  setNewAnnouncementDueDate?: (date: string) => void;
  newAnnouncementRecurrence?: 'none' | 'monthly' | 'half_yearly';
  setNewAnnouncementRecurrence?: (rec: 'none' | 'monthly' | 'half_yearly') => void;
  newAnnouncementAttachmentUrl?: string;
  setNewAnnouncementAttachmentUrl?: (url: string) => void;
  newAnnouncementQuestions?: Array<string | { text: string; type?: 'text' | 'choice' | 'boolean'; options?: string[] }>;
  setNewAnnouncementQuestions?: React.Dispatch<React.SetStateAction<Array<string | { text: string; type?: 'text' | 'choice' | 'boolean'; options?: string[] }>>>;
  uploadingAnnouncementAttachment?: boolean;
  handleUploadAnnouncementAttachment?: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSaveAnnouncement?: () => Promise<void>;
  handleDeleteAnnouncement?: (id: string) => Promise<void>;
  handleEditAnnouncement?: (announcement: any) => void;
  handleResetAnnouncementForm?: () => void;
  selectedAnnouncementForStats?: any;
  setSelectedAnnouncementForStats?: (announcement: any) => void;
  announcementResponses?: any[];
  fetchAnnouncementStats?: (announcement: any) => Promise<void>;
  statsModalTab?: 'status' | 'qa' | 'overview';
  setStatsModalTab?: (tab: any) => void;
  statsStatusFilter?: 'all' | 'completed' | 'pending';
  setStatsStatusFilter?: (filter: 'all' | 'completed' | 'pending') => void;
  statsSearchQuery?: string;
  setStatsSearchQuery?: (query: string) => void;
  expandedResponseIds?: Record<string, boolean>;
  setExpandedResponseIds?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleExportAnnouncementPdf?: () => void;
  handleExportAnnouncementCsv?: () => void;

  // Backward-compatibility props aliases
  duties?: AnnouncementItem[];
  dutiesLoading?: boolean;
  editingDutyId?: string | null;
  setEditingDutyId?: (id: string | null) => void;
  newDutyTitle?: string;
  setNewDutyTitle?: (title: string) => void;
  newDutyDescription?: string;
  setNewDutyDescription?: (desc: string) => void;
  newDutyType?: 'todo' | 'questionnaire';
  setNewDutyType?: (type: 'todo' | 'questionnaire') => void;
  newDutyPriority?: 'standard' | 'critical';
  setNewDutyPriority?: (prio: 'standard' | 'critical') => void;
  newDutyIsAnonymous?: boolean;
  setNewDutyIsAnonymous?: (anon: boolean) => void;
  newDutyTargetType?: 'all' | 'group' | 'individual';
  setNewDutyTargetType?: (target: 'all' | 'group' | 'individual') => void;
  newDutyTargetGroup?: string;
  setNewDutyTargetGroup?: (group: string) => void;
  newDutyTargetTeacherId?: string;
  setNewDutyTargetTeacherId?: (id: string) => void;
  newDutyDueDate?: string;
  setNewDutyDueDate?: (date: string) => void;
  newDutyRecurrence?: 'none' | 'monthly' | 'half_yearly';
  setNewDutyRecurrence?: (rec: 'none' | 'monthly' | 'half_yearly') => void;
  newDutyAttachmentUrl?: string;
  setNewDutyAttachmentUrl?: (url: string) => void;
  newDutyQuestions?: Array<string | { text: string; type?: 'text' | 'choice' | 'boolean'; options?: string[] }>;
  setNewDutyQuestions?: React.Dispatch<React.SetStateAction<Array<string | { text: string; type?: 'text' | 'choice' | 'boolean'; options?: string[] }>>>;
  uploadingDutyAttachment?: boolean;
  handleUploadDutyAttachment?: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSaveDuty?: () => Promise<void>;
  handleDeleteDuty?: (id: string) => Promise<void>;
  handleEditDuty?: (duty: any) => void;
  handleResetDutyForm?: () => void;
  selectedDutyForStats?: any;
  setSelectedDutyForStats?: (duty: any) => void;
  dutyResponses?: any[];
  fetchDutyStats?: (duty: any) => Promise<void>;
  handleExportDutyPdf?: () => void;
  handleExportDutyCsv?: () => void;
}

export const SecretaryAnnouncementsView: React.FC<SecretaryAnnouncementsViewProps> = (props) => {
  const announcements = props.announcements || props.duties || [];
  const announcementsLoading = props.announcementsLoading ?? props.dutiesLoading ?? false;
  const allUniqueTeachers = props.allUniqueTeachers || [];
  const editingAnnouncementId = props.editingAnnouncementId ?? props.editingDutyId ?? null;
  const newAnnouncementTitle = props.newAnnouncementTitle ?? props.newDutyTitle ?? '';
  const setNewAnnouncementTitle = props.setNewAnnouncementTitle || props.setNewDutyTitle || (() => {});
  const newAnnouncementDescription = props.newAnnouncementDescription ?? props.newDutyDescription ?? '';
  const setNewAnnouncementDescription = props.setNewAnnouncementDescription || props.setNewDutyDescription || (() => {});
  const newAnnouncementType = props.newAnnouncementType ?? props.newDutyType ?? 'todo';
  const setNewAnnouncementType = props.setNewAnnouncementType || props.setNewDutyType || (() => {});
  const newAnnouncementPriority = props.newAnnouncementPriority ?? props.newDutyPriority ?? 'standard';
  const setNewAnnouncementPriority = props.setNewAnnouncementPriority || props.setNewDutyPriority || (() => {});
  const newAnnouncementIsAnonymous = props.newAnnouncementIsAnonymous ?? props.newDutyIsAnonymous ?? false;
  const setNewAnnouncementIsAnonymous = props.setNewAnnouncementIsAnonymous || props.setNewDutyIsAnonymous;
  const newAnnouncementTargetType = props.newAnnouncementTargetType ?? props.newDutyTargetType ?? 'all';
  const setNewAnnouncementTargetType = props.setNewAnnouncementTargetType || props.setNewDutyTargetType || (() => {});
  const newAnnouncementTargetGroup = props.newAnnouncementTargetGroup ?? props.newDutyTargetGroup ?? 'guitar';
  const setNewAnnouncementTargetGroup = props.setNewAnnouncementTargetGroup || props.setNewDutyTargetGroup || (() => {});
  const newAnnouncementTargetTeacherId = props.newAnnouncementTargetTeacherId ?? props.newDutyTargetTeacherId ?? '';
  const setNewAnnouncementTargetTeacherId = props.setNewAnnouncementTargetTeacherId || props.setNewDutyTargetTeacherId || (() => {});
  const newAnnouncementDueDate = props.newAnnouncementDueDate ?? props.newDutyDueDate ?? '';
  const setNewAnnouncementDueDate = props.setNewAnnouncementDueDate || props.setNewDutyDueDate || (() => {});
  const newAnnouncementRecurrence = props.newAnnouncementRecurrence ?? props.newDutyRecurrence ?? 'none';
  const setNewAnnouncementRecurrence = props.setNewAnnouncementRecurrence || props.setNewDutyRecurrence || (() => {});
  const newAnnouncementAttachmentUrl = props.newAnnouncementAttachmentUrl ?? props.newDutyAttachmentUrl ?? '';
  const setNewAnnouncementAttachmentUrl = props.setNewAnnouncementAttachmentUrl || props.setNewDutyAttachmentUrl || (() => {});
  const newAnnouncementQuestions = props.newAnnouncementQuestions ?? props.newDutyQuestions ?? [];
  const setNewAnnouncementQuestions = props.setNewAnnouncementQuestions || props.setNewDutyQuestions || (() => {});
  const uploadingAnnouncementAttachment = props.uploadingAnnouncementAttachment ?? props.uploadingDutyAttachment ?? false;
  const handleUploadAnnouncementAttachment = props.handleUploadAnnouncementAttachment || props.handleUploadDutyAttachment || (async () => {});
  const handleSaveAnnouncement = props.handleSaveAnnouncement || props.handleSaveDuty || (async () => {});
  const handleDeleteAnnouncement = props.handleDeleteAnnouncement || props.handleDeleteDuty || (async () => {});
  const handleEditAnnouncement = props.handleEditAnnouncement || props.handleEditDuty || (() => {});
  const handleResetAnnouncementForm = props.handleResetAnnouncementForm || props.handleResetDutyForm || (() => {});
  const selectedAnnouncementForStats = props.selectedAnnouncementForStats ?? props.selectedDutyForStats ?? null;
  const setSelectedAnnouncementForStats = props.setSelectedAnnouncementForStats || props.setSelectedDutyForStats || (() => {});
  const announcementResponses = props.announcementResponses || props.dutyResponses || [];
  const fetchAnnouncementStats = props.fetchAnnouncementStats || props.fetchDutyStats || (async () => {});
  const statsModalTab = props.statsModalTab || 'status';
  const setStatsModalTab = props.setStatsModalTab || (() => {});
  const statsStatusFilter = props.statsStatusFilter || 'all';
  const setStatsStatusFilter = props.setStatsStatusFilter || (() => {});
  const statsSearchQuery = props.statsSearchQuery || '';
  const setStatsSearchQuery = props.setStatsSearchQuery || (() => {});
  const expandedResponseIds = props.expandedResponseIds || {};
  const setExpandedResponseIds = props.setExpandedResponseIds || (() => {});
  const handleExportAnnouncementPdf = props.handleExportAnnouncementPdf || props.handleExportDutyPdf;
  const handleExportAnnouncementCsv = props.handleExportAnnouncementCsv || props.handleExportDutyCsv;

  const [newQuestionInput, setNewQuestionInput] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<'text' | 'choice' | 'boolean'>('text');
  const [newQuestionOptions, setNewQuestionOptions] = useState('');

  const handleMoveQuestion = (idx: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newAnnouncementQuestions.length) return;
    const updated = [...newAnnouncementQuestions];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setNewAnnouncementQuestions(updated);
  };

  const getTargetedTeachers = (item: any) => {
    if (item.target_type === 'all') return allUniqueTeachers;
    if (item.target_type === 'individual') {
      const found = allUniqueTeachers.find(t => t.id === item.target_teacher_id);
      return found ? [found] : [];
    }
    if (item.target_type === 'group') {
      return allUniqueTeachers.filter(t => {
        const inst = (t.instrument || '').toLowerCase();
        const targetGrp = (item.target_group || '').toLowerCase();
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
            Mitteilungen & Informationen
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: '1.5' }}>
          Hier erstellst und verwaltest du zentrale Mitteilungen, Terminerinnerungen, Kenntnisnahmen und Umfragen für deine Lehrkräfte. Wichtige Mitteilungen werden den Lehrkräften als hervorgehobenes Banner im Dashboard angezeigt, ohne den Unterrichtsbetrieb zu stören.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: CREATE FORM */}
        <div className="google-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
            {editingAnnouncementId ? 'Mitteilung bearbeiten' : 'Mitteilung anlegen'}
          </h4>

          {/* SECTION 1: ALLGEMEINE INFOS */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Allgemeine Infos</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Titel der Mitteilung *</label>
              <input
                type="text"
                value={newAnnouncementTitle}
                onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                placeholder="z. B. Brandschutzbelehrung & Schließzeiten für Oktober"
                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Mitteilungstext / Beschreibung</label>
              <textarea
                value={newAnnouncementDescription}
                onChange={(e) => setNewAnnouncementDescription(e.target.value)}
                placeholder="Detaillierte Informationen, Fristen oder Hinweise..."
                rows={3}
                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Format der Mitteilung</label>
              <select
                value={newAnnouncementType}
                onChange={(e) => {
                  setNewAnnouncementType(e.target.value as any);
                  setNewAnnouncementQuestions([]);
                }}
                style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
              >
                <option value="todo">Mitteilung mit digitaler Kenntnisnahme (Gelesen & Verstanden)</option>
                <option value="questionnaire">Fragebogen / Abfrage</option>
              </select>
            </div>
          </div>

          {/* SECTION 2: ZIELGRUPPE & DRINGLICHKEIT */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Zielgruppe & Dringlichkeit</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Dringlichkeit</label>
                <select
                  value={newAnnouncementPriority}
                  onChange={(e) => setNewAnnouncementPriority(e.target.value as any)}
                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                >
                  <option value="standard">Standard (im Infobrett & Feed)</option>
                  <option value="critical">Wichtig (Banner oben im Dashboard)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Empfänger-Gruppe</label>
                <select
                  value={newAnnouncementTargetType}
                  onChange={(e) => setNewAnnouncementTargetType(e.target.value as any)}
                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: 'white' }}
                >
                  <option value="all">Alle Lehrkräfte</option>
                  <option value="group">Instrumenten-Fachgruppe</option>
                  <option value="individual">Einzelne Lehrkraft</option>
                </select>
              </div>
            </div>

            {newAnnouncementTargetType === 'group' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Fachgruppe auswählen</label>
                <select
                  value={newAnnouncementTargetGroup}
                  onChange={(e) => setNewAnnouncementTargetGroup(e.target.value)}
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

            {newAnnouncementTargetType === 'individual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Lehrkraft auswählen</label>
                <select
                  value={newAnnouncementTargetTeacherId}
                  onChange={(e) => setNewAnnouncementTargetTeacherId(e.target.value)}
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
          {newAnnouncementType === 'questionnaire' && (
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ea4335', textTransform: 'uppercase', letterSpacing: '0.05em' }}>3. Fragebogen-Design (Fragen)</div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'white', padding: '6px 12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={newAnnouncementIsAnonymous || false}
                    onChange={(e) => setNewAnnouncementIsAnonymous && setNewAnnouncementIsAnonymous(e.target.checked)}
                    style={{ width: '15px', height: '15px', accentColor: '#ea4335', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1e293b' }}>
                    🔒 Anonyme Befragung (DSGVO-konform)
                  </span>
                </label>
              </div>
              
              {/* Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {newAnnouncementQuestions.map((q, idx) => {
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
                            disabled={idx === newAnnouncementQuestions.length - 1}
                            onClick={() => handleMoveQuestion(idx, 'down')}
                            style={{ border: 'none', background: 'transparent', color: idx === newAnnouncementQuestions.length - 1 ? '#cbd5e1' : '#64748b', cursor: idx === newAnnouncementQuestions.length - 1 ? 'not-allowed' : 'pointer', padding: '4px', borderRadius: '6px' }}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setNewAnnouncementQuestions(newAnnouncementQuestions.filter((_, qIdx) => qIdx !== idx))}
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
                      onClick={() => setNewQuestionType(t.id as any)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '8px',
                        border: 'none',
                        background: newQuestionType === t.id ? '#fce8e6' : '#f1f5f9',
                        color: newQuestionType === t.id ? '#ea4335' : '#475569',
                        fontSize: '0.70rem',
                        fontWeight: newQuestionType === t.id ? 800 : 600,
                        cursor: 'pointer'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={newQuestionInput}
                  onChange={(e) => setNewQuestionInput(e.target.value)}
                  placeholder="Fragetext eingeben..."
                  style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.80rem', outline: 'none' }}
                />

                {newQuestionType === 'choice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b' }}>Antwort-Optionen (durch Komma getrennt):</label>
                    <input
                      type="text"
                      value={newQuestionOptions}
                      onChange={(e) => setNewQuestionOptions(e.target.value)}
                      placeholder="z. B. Ja, Nein, Vielleicht oder Termin A, Termin B"
                      style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none' }}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!newQuestionInput.trim()) return;
                    let newQ: any;
                    if (newQuestionType === 'text') {
                      newQ = { text: newQuestionInput.trim(), type: 'text' };
                    } else if (newQuestionType === 'boolean') {
                      newQ = { text: newQuestionInput.trim(), type: 'boolean', options: ['Ja', 'Nein'] };
                    } else if (newQuestionType === 'choice') {
                      const opts = newQuestionOptions.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
                      newQ = {
                        text: newQuestionInput.trim(),
                        type: 'choice',
                        options: opts.length > 0 ? opts : ['Ja', 'Nein']
                      };
                    }
                    setNewAnnouncementQuestions([...newAnnouncementQuestions, newQ]);
                    setNewQuestionInput('');
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
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Rückmeldung erbeten bis</label>
              <input
                type="date"
                value={newAnnouncementDueDate}
                onChange={(e) => setNewAnnouncementDueDate(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Wiederholung</label>
              <select
                value={newAnnouncementRecurrence}
                onChange={(e) => setNewAnnouncementRecurrence(e.target.value as any)}
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
                id="announcement-file-upload"
                onChange={handleUploadAnnouncementAttachment}
                style={{ display: 'none' }}
                accept=".pdf,image/*"
              />
              <label
                htmlFor="announcement-file-upload"
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
                {uploadingAnnouncementAttachment ? 'Wird hochgeladen...' : (newAnnouncementAttachmentUrl ? 'Anhang ersetzen' : 'Datei auswählen (PDF/Bild)')}
              </label>
              {newAnnouncementAttachmentUrl && (
                <button
                  type="button"
                  onClick={() => setNewAnnouncementAttachmentUrl('')}
                  style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: '10px', padding: '10px', cursor: 'pointer' }}
                  title="Anhang entfernen"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div style={{
            position: 'sticky',
            bottom: '12px',
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '12px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px #e2e8f0',
            display: 'flex',
            gap: '10px',
            marginTop: '10px'
          }}>
            <button
              type="button"
              onClick={handleSaveAnnouncement}
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
              {editingAnnouncementId ? 'Änderungen speichern' : 'Mitteilung veröffentlichen'}
            </button>
            {editingAnnouncementId && (
              <button
                type="button"
                onClick={handleResetAnnouncementForm}
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

        {/* RIGHT COLUMN: ANNOUNCEMENTS LIST */}
        <div className="google-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
              Aktive & geplante Mitteilungen ({announcements.length})
            </h4>
          </div>

          {announcementsLoading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
              Lade Mitteilungen...
            </div>
          ) : announcements.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <FileText size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#64748b' }}>Keine Mitteilungen vorhanden</div>
              <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Erstelle links eine neue Mitteilung für deine Lehrkräfte.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {announcements.map((item) => {
                const targetTeachers = getTargetedTeachers(item);
                return (
                  <div
                    key={item.id}
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
                            background: item.priority === 'critical' ? '#fee2e2' : '#f1f5f9',
                            color: item.priority === 'critical' ? '#ef4444' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {item.priority === 'critical' && <AlertTriangle size={10} />}
                            {item.priority === 'critical' ? 'Wichtig (Dashboard-Banner)' : 'Standard'}
                          </span>

                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: item.duty_type === 'questionnaire' ? '#e0e7ff' : '#f0fdf4',
                            color: item.duty_type === 'questionnaire' ? '#4f46e5' : '#16a34a'
                          }}>
                            {item.duty_type === 'questionnaire' ? (item.is_anonymous ? '🔒 Anonyme Umfrage' : 'Umfrage') : 'Kenntnisnahme'}
                          </span>

                          {item.due_date && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} /> Rückmeldung erbeten bis: {new Date(item.due_date).toLocaleDateString('de-DE')}
                            </span>
                          )}
                        </div>

                        <h5 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                          {item.title}
                        </h5>

                        {item.description && (
                          <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748b', lineHeight: '1.4' }}>
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleEditAnnouncement(item)}
                          style={{ border: 'none', background: '#f1f5f9', color: '#475569', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
                          title="Bearbeiten"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnnouncement(item.id)}
                          style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
                          title="Löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                      {item.attachment_url ? (
                        <a 
                          href={item.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textDecoration: 'none' }}
                        >
                          <Download size={12} /> Anhang herunterladen
                        </a>
                      ) : <div />}

                      <button
                        onClick={() => fetchAnnouncementStats(item)}
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
      {selectedAnnouncementForStats && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-stats-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAnnouncementForStats(null);
          }}
          style={{
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
                <h4 id="announcement-stats-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedAnnouncementForStats.title}
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  {selectedAnnouncementForStats.is_anonymous ? '🔒 Anonyme Rückmeldungen (DSGVO-geschützt)' : 'Status & Kenntnisnahmen der Lehrkräfte'}
                </div>
              </div>
              <button
                onClick={() => setSelectedAnnouncementForStats(null)}
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
                  Bestätigt
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
                {handleExportAnnouncementCsv && (
                  <button
                    onClick={handleExportAnnouncementCsv}
                    style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Download size={11} /> CSV
                  </button>
                )}
                {handleExportAnnouncementPdf && (
                  <button
                    onClick={handleExportAnnouncementPdf}
                    style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FileText size={11} /> PDF
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {announcementResponses.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  Keine Daten vorhanden.
                </div>
              ) : (
                announcementResponses.map((resp, respIdx) => (
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
                        {selectedAnnouncementForStats.is_anonymous 
                          ? `Anonyme Lehrkraft #${respIdx + 1}`
                          : (resp.teacher ? formatTeacherFullName(resp.teacher) : 'Lehrkraft')}
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
                      {resp.status === 'completed' ? 'Bestätigt' : 'Ausstehend'}
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

// Backward-compatibility export alias
export const SecretaryDutiesView = SecretaryAnnouncementsView;
