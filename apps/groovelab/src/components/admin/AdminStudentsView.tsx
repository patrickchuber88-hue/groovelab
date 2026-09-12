import React from "react";
import {
  Calendar, Eye, EyeOff, FileText, Pencil, QrCode, School, Search,
  Trash2, Users
} from "lucide-react";
import { maskLastName } from "../../utils/nameHelper";
import { StudioAvatar, getInstrumentAvatarUrl } from "../StudioAvatar";
import { ADMIN_INSTRUMENT_ICONS } from "./AdminStatsView";

export interface AdminStudentsViewProps {
  activePlatform: string;
  admin: any;
  userId: string;
  schoolObj: any;
  students: any[];
  setStudents: React.Dispatch<React.SetStateAction<any[]>>;
  studentSearch: string;
  setStudentSearch: (s: string) => void;
  listType: "active" | "archive";
  setListType: (t: "active" | "archive") => void;
  instrumentFilter: string;
  setInstrumentFilter: (f: string) => void;
  showAddStudent: boolean;
  setShowAddStudent: (val: boolean) => void;
  showBulkAddStudents: boolean;
  setShowBulkAddStudents: (val: boolean) => void;
  bulkInput: string;
  setBulkInput: (val: string) => void;
  parsedStudents: any[];
  setParsedStudents: React.Dispatch<React.SetStateAction<any[]>>;
  defaultInstrumentForBulk: string;
  setDefaultInstrumentForBulk: (val: string) => void;
  isBulkSaving: boolean;
  setIsBulkSaving: (val: boolean) => void;
  newStudent: any;
  setNewStudent: (s: any) => void;
  editingStudent: any;
  setEditingStudent: (s: any) => void;
  showRealNames: boolean;
  toggleRealNames: () => void;
  canManageStudents: boolean;
  hasTimetableOnboarding: (student: any) => boolean;
  windowWidth: number;
  isMobile: boolean;
  setSelectedStudent: (s: any) => void;
  setSelectedQRUser: (u: any) => void;
  setSelectedTimetableStudent: (s: any) => void;
  setSelectedStudentForTageskompass: (s: any) => void;
  setShowTageskompassModal: (val: boolean) => void;
  setShowParentInfoSheetModal: (val: boolean) => void;
  fetchStudentProfile: (student: any) => void | Promise<void>;
  handleAddStudent: (e: React.FormEvent) => Promise<void>;
  handleBulkAddSubmit: (e: React.FormEvent) => Promise<void>;
  handleDeleteStudent: (id: string) => void;
  handleUpdateStudent: (e: React.FormEvent) => Promise<void>;
  parseBulkInput: (text: string, currentInstrument: string) => void;
  resolveUserAvatar: (u: any, activePlatform?: string) => string;
}

export const AdminStudentsView: React.FC<AdminStudentsViewProps> = ({
  activePlatform,
  admin,
  userId,
  schoolObj,
  students,
  setStudents,
  studentSearch,
  setStudentSearch,
  listType,
  setListType,
  instrumentFilter,
  setInstrumentFilter,
  showAddStudent,
  setShowAddStudent,
  showBulkAddStudents,
  setShowBulkAddStudents,
  bulkInput,
  setBulkInput,
  parsedStudents,
  setParsedStudents,
  defaultInstrumentForBulk,
  setDefaultInstrumentForBulk,
  isBulkSaving,
  setIsBulkSaving,
  newStudent,
  setNewStudent,
  editingStudent,
  setEditingStudent,
  showRealNames,
  toggleRealNames,
  canManageStudents,
  hasTimetableOnboarding,
  windowWidth,
  isMobile,
  setSelectedStudent,
  setSelectedQRUser,
  setSelectedTimetableStudent,
  setSelectedStudentForTageskompass,
  setShowTageskompassModal,
  setShowParentInfoSheetModal,
  fetchStudentProfile,
  handleAddStudent,
  handleBulkAddSubmit,
  handleDeleteStudent,
  handleUpdateStudent,
  parseBulkInput,
  resolveUserAvatar
}) => {
    const brandColor = activePlatform === 'campus' ? '#34a853' : (activePlatform === 'groovelab' ? '#eab308' : '#ea4335');
    const isSimMobile = typeof document !== 'undefined' && Boolean(document.querySelector('.sim-viewport-mobile, .sim-viewport-portrait, .sim-viewport-tablet, .sim-viewport-landscape, .sim-viewport-iphone14, [class*="sim-viewport-mobile"], [class*="sim-viewport-tablet"]'));
    const isMobileLayout = windowWidth < 768 || isSimMobile;

    const activeStudentsCount = students.filter(s => !(s.contract_ends_at && new Date(s.contract_ends_at).getTime() < Date.now())).length;

    return (
      <div style={{ marginTop: '0px' }}>
        <div 
          className="glass-panel" 
          style={{ 
            background: 'white', 
            borderRadius: '20px', 
            border: '1px solid rgba(0, 0, 0, 0.05)', 
            padding: '16px 20px', 
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}
        >
          <div className="schueler-header-wrap" style={{ display: 'flex', flexDirection: isMobileLayout ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobileLayout ? 'stretch' : 'center', gap: '12px', marginBottom: '4px', width: '100%' }}>
            <h2 style={{ fontSize: isMobileLayout ? '1.4rem' : '1.75rem', fontWeight: 900, color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <div style={{ background: activePlatform === 'campus' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 179, 8, 0.15)', color: activePlatform === 'campus' ? '#34a853' : '#eab308', padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                <Users size={16} />
              </div>
              Schülerverwaltung ({activeStudentsCount})
            </h2>
            <div className="schueler-header-controls" style={{ display: 'flex', flexDirection: isMobileLayout ? 'column' : 'row', gap: '10px', width: isMobileLayout ? '100%' : 'auto', alignItems: 'center' }}>
              <div className="schueler-header-actions" style={{ display: 'flex', flexDirection: windowWidth < 768 ? 'column' : 'row', gap: '8px', width: windowWidth < 768 ? '100%' : 'auto' }}>
                <button
                  type="button"
                  onClick={() => toggleRealNames()}
                  aria-label={showRealNames ? "Nachnamen anonymisieren / maskieren" : "Nachnamen für 10 Sekunden einblenden"}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    background: showRealNames ? '#fee2e2' : '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: showRealNames ? '#ef4444' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    height: '38px',
                    width: windowWidth < 768 ? '100%' : 'auto',
                    boxSizing: 'border-box'
                  }}
                  title={showRealNames ? "Nachnamen anonymisieren / maskieren" : "Nachnamen für 10 Sekunden einblenden"}
                >
                  {showRealNames ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showRealNames ? "Namen maskieren" : "Namen anzeigen"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowParentInfoSheetModal(true)}
                  aria-label="Druckfertiges 1-Seiter Eltern-Infoblatt als PDF herunterladen oder drucken"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    height: '38px',
                    width: windowWidth < 768 ? '100%' : 'auto',
                    boxSizing: 'border-box'
                  }}
                  className="hover-scale"
                  title="Druckfertiges 1-Seiter Eltern-Infoblatt mit Schullogo & QR-Code als PDF herunterladen oder drucken"
                >
                  <FileText size={14} color="#059669" />
                  <span>Eltern-Infoblatt (PDF)</span>
                </button>
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 750,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    height: '38px',
                    width: windowWidth < 768 ? '100%' : 'auto',
                    boxSizing: 'border-box',
                    justifyContent: 'center'
                  }}
                  title="Schülerinnen und Schüler werden verbindlich zentral im Schulsekretariat angelegt."
                >
                  <School size={14} color="#64748b" />
                  <span>Schüler-Anlage im Sekretariat</span>
                </div>
              </div>
            </div>
          </div>


          {editingStudent && (
            <form onSubmit={handleUpdateStudent} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: activePlatform === 'campus' ? '#e6f4ea' : (activePlatform === 'groovelab' ? '#fefce8' : '#fce8e6'), border: `1px solid ${brandColor}`, borderRadius: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: brandColor }}>Schüler bearbeiten</h3>
              <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 768 ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <input required aria-label="Vorname" placeholder="Vorname" value={editingStudent.first_name || ''} onChange={e => setEditingStudent({...editingStudent, first_name: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />
                <input required aria-label={schoolObj?.has_campus_subscription !== false ? "Nachname" : "Nachname (Initial)"} placeholder={schoolObj?.has_campus_subscription !== false ? "Nachname" : "Nachname (Initial)"} value={editingStudent.last_name || ''} onChange={e => setEditingStudent({...editingStudent, last_name: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Instrument</label>
                  <select 
                    value={editingStudent.instrument || 'Gitarre'} 
                    onChange={e => setEditingStudent({...editingStudent, instrument: e.target.value})} 
                    style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }}
                  >
                    <option value="Gitarre">Gitarre</option>
                    <option value="Bass">Bass</option>
                    <option value="Drums">Drums</option>
                    <option value="Piano / Keys">Piano / Keys</option>
                    <option value="Vocals">Vocals</option>
                    <option value="Trompete">Trompete</option>
                    <option value="Posaune">Posaune</option>
                    <option value="Horn">Horn</option>
                    <option value="Cello">Cello</option>
                    <option value="Geige">Geige</option>
                    <option value="Klarinette">Klarinette</option>
                    <option value="Querflöte">Querflöte</option>
                    <option value="Saxofon">Saxofon</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Genereller Login-Status</label>
                  <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '12px', padding: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setEditingStudent({...editingStudent, status: 'active'})}
                      style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                        background: (editingStudent.status || 'active') === 'active' ? '#ffffff' : 'transparent',
                        color: (editingStudent.status || 'active') === 'active' ? (activePlatform === 'campus' ? '#34a853' : '#eab308') : '#64748b',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: (editingStudent.status || 'active') === 'active' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      ✅ Aktiv
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStudent({...editingStudent, status: 'bypass'})}
                      style={{
                        flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                        background: editingStudent.status === 'bypass' ? '#ffffff' : 'transparent',
                        color: editingStudent.status === 'bypass' ? '#ef4444' : '#64748b',
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: editingStudent.status === 'bypass' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      🚫 Gesperrt (Bypass)
                    </button>
                  </div>
                </div>

                {/* Campus app_usage_mode Toggle (Only for Campus) */}
                {activePlatform === 'campus' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Campus-Nutzungsmodus</label>
                    <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '12px', padding: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setEditingStudent({...editingStudent, app_usage_mode: 'student_only'})}
                        style={{
                          flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                          background: (editingStudent.app_usage_mode || 'student_only') === 'student_only' ? '#ffffff' : 'transparent',
                          color: (editingStudent.app_usage_mode || 'student_only') === 'student_only' ? brandColor : '#64748b',
                          fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                          boxShadow: (editingStudent.app_usage_mode || 'student_only') === 'student_only' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                        }}
                      >
                        📱 Selbstnutzer (Student)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingStudent({...editingStudent, app_usage_mode: 'parent_hybrid'})}
                        style={{
                          flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                          background: editingStudent.app_usage_mode === 'parent_hybrid' ? '#ffffff' : 'transparent',
                          color: editingStudent.app_usage_mode === 'parent_hybrid' ? brandColor : '#64748b',
                          fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                          boxShadow: editingStudent.app_usage_mode === 'parent_hybrid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                        }}
                      >
                        👪 Eltern-Hybrid
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    <input type="checkbox" checked={editingStudent.is_trial || false} onChange={e => setEditingStudent({...editingStudent, is_trial: e.target.checked})} />
                    In Probezeit
                  </label>
                </div>

                {editingStudent.is_trial && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Probezeit Ende</label>
                    <input aria-label="Probezeit Ende" type="date" value={editingStudent.trial_ends_at ? new Date(editingStudent.trial_ends_at).toISOString().split('T')[0] : ''} onChange={e => setEditingStudent({...editingStudent, trial_ends_at: e.target.value || null})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Vertragsende</label>
                  <input aria-label="Vertragsende" type="date" value={editingStudent.contract_ends_at ? new Date(editingStudent.contract_ends_at).toISOString().split('T')[0] : ''} onChange={e => setEditingStudent({...editingStudent, contract_ends_at: e.target.value || null})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" style={{ flex: 1, background: brandColor, color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>Aktualisieren</button>
                <button type="button" onClick={() => setEditingStudent(null)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>Abbrechen</button>
              </div>
            </form>
          )}

          <div style={{ position: 'relative', marginBottom: '4px', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              aria-label="Schüler suchen"
              placeholder="Schüler suchen..." 
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              style={{ width: '100%', padding: '12px 14px 12px 48px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobileLayout ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px', width: '100%', paddingBottom: isMobileLayout ? '120px' : '0px' }}>
            {(() => {
              const filtered = students.filter(s => {
                const isArchived = s.contract_ends_at && new Date(s.contract_ends_at).getTime() < Date.now();
                if (isArchived) return false;

                const inst = s.instrument?.toLowerCase() || 'gitarre';
                let normInst = s.instrument || 'Gitarre';
                if (inst.includes('guitar') || inst.includes('gitarre')) normInst = 'Gitarre';
                else if (inst.includes('bass')) normInst = 'Bass';
                else if (inst.includes('drum') || inst.includes('schlagzeug')) normInst = 'Drums';
                else if (inst.includes('piano') || inst.includes('keys') || inst.includes('klavier')) normInst = 'Piano';
                else if (inst.includes('vocal') || inst.includes('gesang')) normInst = 'Vocals';

                if (instrumentFilter !== 'all' && normInst !== instrumentFilter) return false;

                const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
                return fullName.includes(studentSearch.toLowerCase());
              });

              // Group merging logic for teacher board
              const groupMap: Record<string, any[]> = {};
              filtered.forEach(s => {
                if (s.group_id) {
                  if (!groupMap[s.group_id]) groupMap[s.group_id] = [];
                  groupMap[s.group_id].push(s);
                }
              });

              const displayStudents: any[] = [];
              const processedGroupIds = new Set<string>();

              filtered.forEach(s => {
                if (s.group_id && groupMap[s.group_id]?.length >= 2) {
                  if (!processedGroupIds.has(s.group_id)) {
                    processedGroupIds.add(s.group_id);
                    const members = groupMap[s.group_id];
                    const mergedStudent = {
                      ...members[0],
                      id: members[0].id,
                      first_name: members.map(m => `${m.first_name || ''} ${maskLastName(m.last_name, showRealNames)}`.trim()).join(' & '),
                      last_name: '',
                      isGroup: true,
                      group_id: s.group_id,
                      groupStudents: members
                    };
                    displayStudents.push(mergedStudent);
                  }
                } else {
                  displayStudents.push(s);
                }
              });

              if (displayStudents.length === 0) {
                return (
                  <div style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center', background: '#f8fafc', borderRadius: '20px', border: '1px dashed #cbd5e1' }}>
                    <Users size={36} color="#94a3b8" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#475569', marginBottom: '4px' }}>
                      Keine Schüler gefunden
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>
                      {studentSearch ? 'Keine Schüler entsprechen deinen Suchkriterien.' : 'Neue Schülerinnen und Schüler werden zentral im Schulsekretariat angelegt.'}
                    </div>
                  </div>
                );
              }

              return displayStudents.map(s => {
                return (
                  <div 
                    key={s.id} 
                    className="glass-panel schueler-card-item" 
                    style={{ 
                      padding: isMobileLayout ? '14px 12px' : '18px 22px', 
                      background: 'white', 
                      display: 'flex', 
                      flexDirection: isMobileLayout ? 'column' : 'row',
                      justifyContent: 'space-between', 
                      alignItems: isMobileLayout ? 'stretch' : 'center', 
                      gap: isMobileLayout ? '12px' : '8px',
                      borderRadius: '24px', 
                      border: '1px solid #e2e8f0', 
                      borderLeft: `6px solid ${brandColor}`, 
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
                      transition: 'transform 0.2s, box-shadow 0.2s', 
                      cursor: 'default' 
                    }} 
                  >
                    <div 
                      role="button"
                      tabIndex={0}
                      aria-label={`Details für Schüler ${s.isGroup ? s.first_name : `${s.first_name} ${maskLastName(s.last_name, showRealNames)}`} öffnen`}
                      onClick={() => fetchStudentProfile(s)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fetchStudentProfile(s);
                        }
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', flex: 1, outline: 'none', borderRadius: '16px' }}
                    >
                      <div style={{ position: 'relative' }}>
                        <div style={{ 
                          width: '56px', 
                          height: '56px', 
                          borderRadius: '16px', 
                          background: `${brandColor}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          border: '2px solid white',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          position: 'relative'
                        }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: brandColor, position: 'absolute', zIndex: 0 }}>{s.first_name?.[0]}</span>
                          <img 
                            src={resolveUserAvatar(s, activePlatform)} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontWeight: 900, color: '#000000', fontSize: '1.1rem', letterSpacing: '-0.01em', lineHeight: '1.2' }}>
                          {s.isGroup ? s.first_name : `${s.first_name} ${maskLastName(s.last_name, showRealNames)}`}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {s.isGroup && (
                            <div style={{ padding: '2px 6px', background: '#e0f2fe', color: '#0284c7', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 900 }}>
                              👥 Gruppe
                            </div>
                          )}
                          {s.is_trial ? (
                            <div style={{ padding: '2px 6px', background: '#fef7e0', color: '#b06000', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 900 }}>
                              ⏳ PROBE
                            </div>
                          ) : (activePlatform === 'campus' ? s.is_campus_active : s.is_groovelab_active) ? (
                            <div style={{ padding: '2px 6px', background: activePlatform === 'campus' ? '#e6f4ea' : '#fefce8', color: activePlatform === 'campus' ? '#34a853' : '#eab308', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 900 }}>
                              Aktiv
                            </div>
                          ) : (
                            <div style={{ padding: '2px 6px', background: '#f1f3f4', color: '#5f6368', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 900 }}>
                              Basis
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  <div 
                    className="schueler-action-buttons"
                    style={{ 
                      display: isMobileLayout ? 'grid' : 'flex', 
                      gridTemplateColumns: isMobileLayout 
                        ? (activePlatform === 'campus' ? (canManageStudents ? 'repeat(5, 1fr)' : 'repeat(3, 1fr)') : (canManageStudents ? 'repeat(3, 1fr)' : 'repeat(1, 1fr)'))
                        : 'none',
                      gap: '8px', 
                      marginLeft: isMobileLayout ? '0px' : '8px',
                      width: isMobileLayout ? '100%' : 'auto',
                      marginTop: isMobileLayout ? '6px' : '0px'
                    }}
                  >
                    {canManageStudents && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingStudent(s); }} 
                          aria-label={`Schüler ${s.isGroup ? s.first_name : `${s.first_name} ${maskLastName(s.last_name, showRealNames)}`} bearbeiten`}
                          style={{ 
                            background: "#ffffff", 
                            border: "1px solid #cbd5e1", 
                            padding: "10px", 
                            minHeight: '44px',
                            borderRadius: "12px", 
                            cursor: "pointer", 
                            color: "#475569", 
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%'
                          }} 
                          className="hover-scale-mini"
                          title="Bearbeiten"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteStudent(s.id); }} 
                          aria-label={`Schüler ${s.isGroup ? s.first_name : `${s.first_name} ${maskLastName(s.last_name, showRealNames)}`} löschen`}
                          style={{ 
                            background: activePlatform === 'groovelab' ? '#fefce8' : '#fff1f2', 
                            border: activePlatform === 'groovelab' ? '1px solid #fef08a' : '1px solid #fecaca', 
                            padding: "10px", 
                            minHeight: '44px',
                            borderRadius: "12px", 
                            cursor: "pointer", 
                            color: activePlatform === 'groovelab' ? '#eab308' : '#ef4444', 
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%'
                          }} 
                          className="hover-scale-mini"
                          title="Löschen"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                    {/* Hausaufgabenheft / Schüler-Protokoll Button (ONLY FOR CAMPUS MODULE) */}
                    {activePlatform === 'campus' && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedStudentForTageskompass(s);
                          setShowTageskompassModal(true); 
                        }} 
                        aria-label={`Hausaufgabenheft und Schüler-Protokoll für ${s.isGroup ? s.first_name : `${s.first_name} ${maskLastName(s.last_name, showRealNames)}`} öffnen`}
                        style={{ 
                          background: '#e6f4ea', 
                          border: '1px solid #a7f3d0', 
                          padding: "10px", 
                          minHeight: '44px',
                          borderRadius: "12px", 
                          cursor: "pointer", 
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%'
                        }} 
                        className="hover-scale-mini"
                        title="Hausaufgabenheft & Schüler-Protokoll öffnen"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={`url(#bookHeaderGrad-${s.id})`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <defs>
                            <linearGradient id={`bookHeaderGrad-${s.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#34a853" />
                              <stop offset="100%" stopColor="#4f46e5" />
                            </linearGradient>
                          </defs>
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                        </svg>
                      </button>
                    )}
                    {/* Stundenplan-Onboarding Status Icon (ONLY FOR CAMPUS MODULE) */}
                    {activePlatform === 'campus' && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedTimetableStudent(s); 
                        }} 
                        aria-label={hasTimetableOnboarding(s) ? `Stundenplan-Slot für ${s.isGroup ? s.first_name : `${s.first_name} ${maskLastName(s.last_name, showRealNames)}`} ansehen` : `Stundenplan für ${s.isGroup ? s.first_name : `${s.first_name} ${maskLastName(s.last_name, showRealNames)}`} einrichten`}
                        style={{ 
                          background: hasTimetableOnboarding(s) ? '#e6f4ea' : '#fefce8', 
                          border: hasTimetableOnboarding(s) ? '1px solid #a7f3d0' : '1px solid #fef08a', 
                          padding: "10px", 
                          minHeight: '44px',
                          borderRadius: "12px", 
                          cursor: "pointer", 
                          color: hasTimetableOnboarding(s) ? '#34a853' : '#d97706', 
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          width: '100%'
                        }} 
                        className="hover-scale-mini"
                        title={hasTimetableOnboarding(s) ? "Stundenplan-Onboarding: Abgeschlossen (Klicken für Slot-Details)" : "Stundenplan-Onboarding: Ausstehend (Klicken für Manuelles Eintragen)"}
                      >
                        <Calendar size={18} />
                        <div style={{
                          position: 'absolute',
                          top: '-3px',
                          right: '-3px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: hasTimetableOnboarding(s) ? '#34a853' : '#eab308',
                          border: '2px solid white'
                        }} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedQRUser(s); }} 
                      aria-label={`QR-Zugangskarte und Login-Token für ${s.isGroup ? s.first_name : `${s.first_name} ${maskLastName(s.last_name, showRealNames)}`} anzeigen`}
                      style={{ 
                        background: "#ffffff", 
                        border: "1px solid #cbd5e1", 
                        padding: "10px", 
                        minHeight: '44px',
                        borderRadius: "12px", 
                        cursor: "pointer", 
                        color: "#475569", 
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%'
                      }} 
                      className="hover-scale-mini"
                      title="QR Code & Ausweis"
                    >
                      <QrCode size={18} />
                    </button>
                  </div>
                </div>
              );
            });
          })()}
          </div>
        </div>
      </div>
    );
};
