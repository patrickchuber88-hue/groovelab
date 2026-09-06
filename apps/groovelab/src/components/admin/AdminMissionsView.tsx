import React from "react";
import { Search, Award, Check } from "lucide-react";
import { maskLastName } from "../../utils/nameHelper";
import { ADMIN_INSTRUMENT_ICONS } from "./AdminStatsView";

const INSTRUMENT_COLORS: Record<string, string> = {
  "Guitar": "#ef4444", "E-Gitarre": "#ef4444",
  "Bass": "#eab308", "E-Bass": "#eab308", 
  "Drums": "#3b82f6", "E-Drums": "#3b82f6", 
  "Vocals": "#34a853", 
  "Piano": "#a855f7", "E-Piano": "#a855f7", "Keys": "#a855f7" 
};

const normalizeInstrument = (name: string) => {
  const n = (name || "").toLowerCase().trim();
  if (n.includes("gitarre") || n.includes("guitar")) return "Guitar";
  if (n.includes("bass")) return "Bass";
  if (n.includes("drums") || n.includes("schlagzeug")) return "Drums";
  if (n.includes("piano") || n.includes("keys") || n.includes("klavier")) return "Keys";
  if (n.includes("vocals") || n.includes("gesang")) return "Vocals";
  return name;
};

export interface AdminMissionsViewProps {
  activePlatform: string;
  submissions: any[];
  missionSearch: string;
  setMissionSearch: (q: string) => void;
  missionsActiveSubTab: "assignments" | "templates" | "approvals";
  setMissionsActiveSubTab: (tab: "assignments" | "templates" | "approvals") => void;
  missionFilter: "pending" | "approved" | "all";
  setMissionFilter: (filter: "pending" | "approved" | "all") => void;
  editingTemplateConfig: any;
  setEditingTemplateConfig: (cfg: any) => void;
  isEditingTemplate: boolean;
  setIsEditingTemplate: (val: boolean) => void;
  studentMissionsMap: any;
  missionTemplates: any[];
  activeSessions: any[];
  students: any[];
  songs: any[];
  showRealNames: boolean;
  handleApproveSubmission: (subId: string) => Promise<void>;
  handleRejectSubmission: (subId: string) => Promise<void>;
  handleSaveTemplate: (e: React.FormEvent) => Promise<void>;
  handleCreateNewTemplate: () => void;
  handleAssignTemplate: (tmplId: string, studentId: string) => Promise<void>;
  handleGeneratePin: (studentId: string, level: number) => Promise<void>;
  handleUpdateStudentLevel: (studentId: string, delta: number) => Promise<void>;
  resolveUserAvatar: (u: any, activePlatform?: string) => string;
}

export const AdminMissionsView: React.FC<AdminMissionsViewProps> = ({
  activePlatform,
  submissions,
  missionSearch,
  setMissionSearch,
  missionsActiveSubTab,
  setMissionsActiveSubTab,
  missionFilter,
  setMissionFilter,
  editingTemplateConfig,
  setEditingTemplateConfig,
  isEditingTemplate,
  setIsEditingTemplate,
  studentMissionsMap,
  missionTemplates,
  activeSessions,
  students,
  songs,
  showRealNames,
  handleApproveSubmission,
  handleRejectSubmission,
  handleSaveTemplate,
  handleCreateNewTemplate,
  handleAssignTemplate,
  handleGeneratePin,
  handleUpdateStudentLevel,
  resolveUserAvatar
}) => {
    const brandColor = activePlatform === 'campus' ? '#34a853' : (activePlatform === 'groovelab' ? '#eab308' : '#ea4335');
    
    const filteredSubmissions = submissions.filter(sub => {
      const studentName = `${sub.users?.first_name || ''} ${sub.users?.last_name || ''}`.toLowerCase();
      const songTitle = `${sub.songs?.title || ''} ${sub.songs?.artist || ''} ${sub.topic_name || ''}`.toLowerCase();
      return studentName.includes(missionSearch.toLowerCase()) || songTitle.includes(missionSearch.toLowerCase());
    });

    return (
      <div style={{ marginTop: '0px' }}>
        <div 
          className="glass-panel" 
          style={{ 
            background: 'white', 
            borderRadius: '20px', 
            border: '1px solid rgba(0, 0, 0, 0.05)', 
            padding: '10px', 
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02), 0 2px 8px -1px rgba(0, 0, 0, 0.01)',
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px' 
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#18181b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <div style={{ background: `${brandColor}15`, color: brandColor, padding: '5px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                <Award size={18} />
              </div>
              Missions- & Gamification-Board
            </h2>
          </div>

          {/* Sub-tab Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', gap: '20px' }}>
            {[
              { id: 'assignments', label: 'Zuweisung & Fortschritt' },
              { id: 'templates', label: 'Missions-Vorlagen' },
              { id: 'approvals', label: 'Einsendungen / Abnahmen' }
            ].map(tab => (
              <span
                key={tab.id}
                onClick={() => setMissionsActiveSubTab(tab.id as any)}
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: missionsActiveSubTab === tab.id ? brandColor : '#64748b',
                  cursor: 'pointer',
                  borderBottom: missionsActiveSubTab === tab.id ? `3px solid ${brandColor}` : '3px solid transparent',
                  paddingBottom: '8px',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </span>
            ))}
          </div>

          {/* SUB-TAB 1: ASSIGNMENTS */}
          {missionsActiveSubTab === 'assignments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Schüler suchen..."
                  value={missionSearch}
                  onChange={e => setMissionSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 42px',
                    borderRadius: '16px',
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 16px', fontWeight: 800, color: '#475569' }}>Schüler</th>
                      <th style={{ padding: '14px 16px', fontWeight: 800, color: '#475569' }}>Aktuelle Stufe (Level)</th>
                      <th style={{ padding: '14px 16px', fontWeight: 800, color: '#475569' }}>Missions-Vorlage</th>
                      <th style={{ padding: '14px 16px', fontWeight: 800, color: '#475569' }}>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .filter(s => `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(missionSearch.toLowerCase()))
                      .map(student => {
                        const progress = studentMissionsMap[student.id] || { current_level: 1, template_id: '' };
                        return (
                          <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <img 
                                src={resolveUserAvatar(student, activePlatform)} 
                                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} 
                                alt="" 
                              />
                              <span style={{ fontWeight: 700, color: '#1e293b' }}>{student.first_name} {maskLastName(student.last_name, showRealNames)}</span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <select
                                value={progress.current_level}
                                onChange={e => handleUpdateStudentLevel(student.id, parseInt(e.target.value, 10))}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontWeight: 700 }}
                              >
                                {[1, 2, 3, 4, 5, 6].map(lvl => (
                                  <option key={lvl} value={lvl}>Level {lvl}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <select
                                value={progress.template_id || ''}
                                onChange={e => handleAssignTemplate(student.id, e.target.value)}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontWeight: 700 }}
                              >
                                <option value="">-- Keine Vorlage --</option>
                                {missionTemplates.map(t => (
                                  <option key={t.id} value={t.id}>{t.title} {t.is_default ? '(Standard)' : ''}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              {progress.current_level >= 2 && (
                                <button
                                  onClick={() => handleGeneratePin(student.id, progress.current_level)}
                                  style={{
                                    background: '#e6f4ea',
                                    color: '#34a853',
                                    border: '1.5px solid #e6f4ea',
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Foto-PIN generieren
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: TEMPLATES */}
          {missionsActiveSubTab === 'templates' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!isEditingTemplate ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={handleCreateNewTemplate}
                      style={{
                        background: brandColor,
                        color: 'white',
                        border: 'none',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      Neue Vorlage erstellen
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {missionTemplates.map(temp => (
                      <div
                        key={temp.id}
                        style={{
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: '#1e293b' }}>{temp.title}</span>
                          {temp.is_default && (
                            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800 }}>
                              Standard
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div>Level 1: {temp.level_1_config?.songs_required} Song(s)</div>
                          <div>Level 2: {temp.level_2_config?.streak_required} Tage Streak + {temp.level_2_config?.focus_minutes_required} Min Fokus</div>
                          <div>Level 3: {temp.level_3_config?.songs_required} Song(s)</div>
                        </div>

                        <button
                          onClick={() => {
                            setEditingTemplateConfig(temp);
                            setIsEditingTemplate(true);
                          }}
                          style={{
                            background: '#f1f5f9',
                            border: 'none',
                            padding: '8px',
                            borderRadius: '10px',
                            color: '#475569',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          Bearbeiten
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Template Editor Form */
                <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontWeight: 800, color: '#475569', fontSize: '0.8rem' }}>Name der Vorlage</label>
                    <input
                      type="text"
                      value={editingTemplateConfig.title}
                      onChange={e => setEditingTemplateConfig({ ...editingTemplateConfig, title: e.target.value })}
                      style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontWeight: 600 }}
                      required
                    />
                  </div>

                  {/* Level 1 Config */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontWeight: 800, color: '#1e293b' }}>Stufe 1 (Level 1)</h4>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Songs benötigt</label>
                        <input
                          type="number"
                          value={editingTemplateConfig.level_1_config?.songs_required || 0}
                          onChange={e => setEditingTemplateConfig({
                            ...editingTemplateConfig,
                            level_1_config: { ...editingTemplateConfig.level_1_config, songs_required: parseInt(e.target.value, 10) }
                          })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Level 2 Config */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontWeight: 800, color: '#1e293b' }}>Stufe 2 (Level 2)</h4>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Übe-Streak (Tage)</label>
                        <input
                          type="number"
                          value={editingTemplateConfig.level_2_config?.streak_required || 0}
                          onChange={e => setEditingTemplateConfig({
                            ...editingTemplateConfig,
                            level_2_config: { ...editingTemplateConfig.level_2_config, streak_required: parseInt(e.target.value, 10) }
                          })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Fokus-Minuten</label>
                        <input
                          type="number"
                          value={editingTemplateConfig.level_2_config?.focus_minutes_required || 0}
                          onChange={e => setEditingTemplateConfig({
                            ...editingTemplateConfig,
                            level_2_config: { ...editingTemplateConfig.level_2_config, focus_minutes_required: parseInt(e.target.value, 10) }
                          })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Level 3 Config */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontWeight: 800, color: '#1e293b' }}>Stufe 3 (Level 3)</h4>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Songs benötigt</label>
                        <input
                          type="number"
                          value={editingTemplateConfig.level_3_config?.songs_required || 0}
                          onChange={e => setEditingTemplateConfig({
                            ...editingTemplateConfig,
                            level_3_config: { ...editingTemplateConfig.level_3_config, songs_required: parseInt(e.target.value, 10) }
                          })}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingTemplate(false);
                        setEditingTemplateConfig(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        background: 'white',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        border: 'none',
                        background: brandColor,
                        color: 'white',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Speichern
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* SUB-TAB 3: APPROVALS */}
          {missionsActiveSubTab === 'approvals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Ausstehende Song-Verifizierungen
                </span>
                <div style={{
                  display: 'flex',
                  background: 'rgba(241, 245, 249, 0.8)',
                  padding: '4px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  {[
                    { id: 'pending', label: 'Ausstehend' },
                    { id: 'approved', label: 'Verifiziert' },
                    { id: 'all', label: 'Alle' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setMissionFilter(opt.id as any)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: missionFilter === opt.id ? 'white' : 'transparent',
                        color: missionFilter === opt.id ? '#0f172a' : '#64748b',
                        fontWeight: 800,
                        fontSize: '0.7rem',
                        cursor: 'pointer'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div style={{ 
                  background: '#f8fafc', 
                  borderRadius: '20px', 
                  padding: '48px 24px', 
                  textAlign: 'center', 
                  border: '1px dashed #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{ background: '#e6f4ea', color: '#34a853', padding: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Award size={24} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>
                    Keine Abnahmen ausstehend!
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '20px' }}>
                  {filteredSubmissions.map(sub => {
                    const isInLab = activeSessions.some(sess => sess.user_id === sub.user_id);
                    const norm = normalizeInstrument(sub.instrument);
                    return (
                      <div 
                        key={sub.id} 
                        className="hover-scale"
                        style={{ 
                          background: 'white', 
                          padding: '20px', 
                          borderRadius: '24px', 
                          border: '1.5px solid #f1f5f9',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          position: 'relative'
                        }}
                      >
                        {activePlatform !== 'campus' && (
                          <div style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: isInLab ? '#e6f4ea' : '#f1f5f9',
                            color: isInLab ? '#34a853' : '#64748b',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '0.65rem',
                            fontWeight: 900,
                            textTransform: 'uppercase'
                          }}>
                            {isInLab ? 'IM LAB' : 'HOME'}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img 
                            src={resolveUserAvatar(sub.users, activePlatform)} 
                            style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover', border: '1.5px solid #f1f5f9' }} 
                            alt="" 
                          />
                          <div>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>
                              {sub.users?.first_name} {sub.users?.last_name}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                              Schüler
                            </span>
                          </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ 
                              width: '24px', height: '24px', borderRadius: '8px', 
                              background: INSTRUMENT_COLORS[norm] || '#cbd5e1', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              fontSize: '0.8rem'
                            }}>
                              {ADMIN_INSTRUMENT_ICONS[sub.instrument] || '🎸'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {sub.songs?.title || sub.topic_name || 'Unbekanntes Thema'}
                              </div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>
                                {sub.songs?.artist || 'Matrix-Mission'}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                            <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, color: '#475569' }}>
                              {sub.difficulty_level === 'original' ? '⚡ PRO' : '🚀 STARTER'}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34a853' }}>
                              {sub.progress_percent || 100}% bereit
                            </span>
                          </div>
                        </div>

                        {sub.is_pending_approval ? (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button
                              onClick={() => handleRejectSubmission(sub.id)}
                              style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '12px',
                                border: '1.5px solid #fca5a5',
                                background: '#fef2f2',
                                color: '#ef4444',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                cursor: 'pointer'
                              }}
                            >
                              Ablehnen
                            </button>
                            <button
                              onClick={() => handleApproveSubmission(sub.id)}
                              style={{
                                flex: 1.5,
                                padding: '10px',
                                borderRadius: '12px',
                                border: 'none',
                                background: brandColor,
                                color: 'white',
                                fontWeight: 900,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                boxShadow: `0 4px 12px ${brandColor}20`
                              }}
                            >
                              Freigeben
                            </button>
                          </div>
                        ) : (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '6px', 
                            padding: '8px', 
                            background: '#e6f4ea', 
                            color: '#34a853', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem', 
                            fontWeight: 850 
                          }}>
                            <Check size={14} /> Verifiziert
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
};
