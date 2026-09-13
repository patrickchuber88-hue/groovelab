import React from 'react';
import {
  Edit3, Eye, EyeOff, FileText, Headphones,
  Search, Trash2, UserPlus
} from 'lucide-react';
import { maskLastName } from '../../utils/nameHelper';
import { getInstrumentAvatarUrl } from '../StudioAvatar';

export interface TeacherStudentsViewProps {
  allStudents: any[];
  teacher: any;
  activePlatform: string;
  windowWidth: number;
  activeSessions: any[];
  studentSearch: string;
  setStudentSearch: (s: string) => void;
  studentLetter: string | null;
  setStudentLetter: (l: string | null) => void;
  studentInstrumentFilter: string;
  setStudentInstrumentFilter: (i: string) => void;
  showRealNames: boolean;
  toggleRealNames: () => void;
  setShowInviteStudent: (show: boolean) => void;
  setEditingStudent: (s: any) => void;
  setSelectedStudentProfile: (s: any) => void;
  handleDeleteStudent: (id: string) => void;
  teachersManageStudents: boolean;
  onOpenBandProfile?: (band: any) => void;
  AvatarImage: React.ComponentType<any>;
}

export const TeacherStudentsView: React.FC<TeacherStudentsViewProps> = ({
  allStudents,
  teacher,
  activePlatform,
  windowWidth,
  activeSessions,
  studentSearch,
  setStudentSearch,
  studentLetter,
  setStudentLetter,
  studentInstrumentFilter,
  setStudentInstrumentFilter,
  showRealNames,
  toggleRealNames,
  setShowInviteStudent,
  setEditingStudent,
  setSelectedStudentProfile,
  handleDeleteStudent,
  teachersManageStudents,
  onOpenBandProfile,
  AvatarImage,
}) => {
  return (
        <div style={{ display: 'flex', gap: windowWidth < 768 ? '16px' : '32px', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%' }}>
          {/* Main Column */}
          <div style={{ flex: '1 1 300px', minWidth: '0', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Search & Actions Bar */}
            <div className="schueler-header-controls" style={{ display: 'flex', flexDirection: windowWidth < 768 ? 'column' : 'row', gap: windowWidth < 768 ? '10px' : '16px', alignItems: windowWidth < 768 ? 'stretch' : 'center', flexWrap: 'wrap', width: '100%' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: windowWidth < 768 ? '100%' : '200px' }}>
                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  placeholder="Schüler suchen..." 
                  value={studentSearch} 
                  onChange={e => setStudentSearch(e.target.value)} 
                  style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '24px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.9rem', outline: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.01)', boxSizing: 'border-box' }} 
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', width: windowWidth < 768 ? '100%' : 'auto' }}>
                <button
                  onClick={() => toggleRealNames()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    borderRadius: '24px',
                    padding: '14px 20px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    background: showRealNames ? '#fee2e2' : '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: showRealNames ? '#ef4444' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.01)',
                    height: '50px',
                    boxSizing: 'border-box',
                    flex: windowWidth < 768 ? 1 : 'none'
                  }}
                  className="hover-scale"
                  title={showRealNames ? "Auge an: Datenschutz aktiv (Vorname N.)" : "Auge aus: Klarnamen aktiv (Vorname Nachname)"}
                >
                  {showRealNames ? <Eye size={16} /> : <EyeOff size={16} />}
                  <span>{showRealNames ? "Vorname N." : "Klarnamen"}</span>
                </button>
                {teachersManageStudents && (
                  <button
                    onClick={() => setShowInviteStudent(true)}
                    style={{
                      padding: '14px 24px',
                      borderRadius: '24px',
                      border: 'none',
                      background: activePlatform === 'campus' ? '#34a853' : '#eab308',
                      color: activePlatform === 'campus' ? 'white' : '#000000',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      height: '50px',
                      boxSizing: 'border-box',
                      flex: windowWidth < 768 ? 1 : 'none'
                    }}
                    className="hover-scale"
                  >
                    <UserPlus size={16} /> Schüler einladen
                  </button>
                )}
              </div>
            </div>

            {/* A-Z Schnellsuche */}
            <div 
              style={{ 
                display: 'flex', 
                gap: '6px', 
                background: 'white', 
                padding: '12px', 
                borderRadius: '20px', 
                border: '1px solid #e2e8f0',
                overflowX: windowWidth < 768 ? 'auto' : 'visible',
                whiteSpace: 'nowrap',
                WebkitOverflowScrolling: 'touch',
                width: '100%',
                boxSizing: 'border-box'
              }}
              className="no-scrollbar"
            >
              <button 
                onClick={() => setStudentLetter(null)}
                style={{
                  background: studentLetter === null ? (activePlatform === 'campus' ? '#34a853' : '#eab308') : 'transparent',
                  color: studentLetter === null ? (activePlatform === 'campus' ? 'white' : '#000000') : '#64748b',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
              >
                ALLE
              </button>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => {
                const isActive = studentLetter === letter;
                const hasStudents = allStudents.some(s => (s.first_name || '').toUpperCase().startsWith(letter));
                return (
                  <button
                    key={letter}
                    onClick={() => setStudentLetter(isActive ? null : letter)}
                    style={{
                      background: isActive ? (activePlatform === 'campus' ? '#34a853' : '#eab308') : 'transparent',
                      color: isActive ? (activePlatform === 'campus' ? 'white' : '#000000') : hasStudents ? '#1e293b' : '#cbd5e1',
                      border: 'none',
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: isActive ? 950 : 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>

            {/* Students Grid */}
            {(() => {
              const filtered = allStudents.filter(student => {
                // Strict Module Activation Filter:
                // GrooveLab tab MUST ONLY show students who have GrooveLab activated (is_groovelab_active === true)
                // Campus tab shows all assigned students in lesson roster
                const isModuleActive = activePlatform === 'campus'
                  ? true
                  : (student.is_groovelab_active === true || student.isGroovelabActive === true);

                if (!isModuleActive) return false;

                const matchesSearch = (student.first_name || '').toLowerCase().includes(studentSearch.toLowerCase()) || 
                                      (student.last_name || '').toLowerCase().includes(studentSearch.toLowerCase());
                const matchesLetter = studentLetter ? (student.first_name || '').toUpperCase().startsWith(studentLetter) : true;
                const matchesInstrument = studentInstrumentFilter === 'all' || 
                  (student.instrument && student.instrument.toLowerCase().trim() === studentInstrumentFilter.toLowerCase().trim());
                return matchesSearch && matchesLetter && matchesInstrument;
              });

              if (filtered.length === 0) {
                return (
                  <div className="google-card" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '3rem' }}>🔍</div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Keine Schüler gefunden</h3>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '360px', margin: 0 }}>
                      Passe deine Suche oder den A-Z Schnellfilter an, oder erstelle einen neuen Schüler.
                    </p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: windowWidth < 768 ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', width: '100%', boxSizing: 'border-box', paddingBottom: windowWidth < 768 ? '120px' : '0px' }}>
                  {filtered.map(student => {
                    const isSessionActive = activeSessions.some(sess => sess.user_id === student.id);
                    const isGrooveLab = activePlatform === 'groovelab';
                    const isStudentActive = isGrooveLab 
                      ? (student.is_groovelab_active || student.isGroovelabActive)
                      : (student.is_campus_active || student.isCampusActive);

                    return (
                      <div 
                        key={student.id} 
                        role="button"
                        tabIndex={0}
                        aria-label={`Schülerprofil öffnen: ${student.first_name} ${maskLastName(student.last_name, showRealNames)}, ${student.instrument || 'Musiker'}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedStudentProfile(student);
                          }
                        }}
                        className="google-card virtual-card-lg"
                        style={{ 
                          padding: windowWidth < 768 ? '14px 12px' : '24px', 
                          borderRadius: windowWidth < 768 ? '16px' : '24px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '12px',
                          border: isSessionActive ? `2px solid ${isGrooveLab ? '#eab308' : '#34a853'}` : '1px solid #e2e8f0',
                          cursor: 'pointer',
                          width: '100%',
                          maxWidth: '100%',
                          boxSizing: 'border-box',
                          contentVisibility: 'auto',
                          containIntrinsicSize: '0 90px'
                        }}
                        onClick={() => setSelectedStudentProfile(student)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '16px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                            <AvatarImage src={student.photo_url} user={student} activePlatform={activePlatform} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 900, fontSize: '1rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{student.first_name} {maskLastName(student.last_name, showRealNames)}</span>
                              {isStudentActive ? (
                                <span title="Interaktives Campus-Studio aktiv (Übe-Timer, Loopstation & Aufnahmen)" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <Headphones size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
                                </span>
                              ) : (
                                <span title="Basis-Modus aktiv (Digitales Hausaufgabenheft & Notizen)" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                  <FileText size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                </span>
                              )}
                            </div>
                            <div style={{ marginTop: '2px' }}>
                              {isStudentActive ? (
                                <span style={{ 
                                  background: isGrooveLab ? '#fefce8' : '#d1fae5', 
                                  color: isGrooveLab ? '#ca8a04' : '#065f46', 
                                  border: isGrooveLab ? '1px solid #fef08a' : 'none',
                                  fontSize: '0.68rem', 
                                  fontWeight: 800, 
                                  padding: '2px 8px', 
                                  borderRadius: '100px', 
                                  display: 'inline-block' 
                                }}>
                                  Aktiv
                                </span>
                              ) : (
                                <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', display: 'inline-block' }}>
                                  Basis
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {activePlatform === 'campus' && (
                          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px', border: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#64748b', fontWeight: 600 }}>Instrument:</span>
                              <span style={{ fontWeight: 800 }}>{student.instrument || 'Musiker'}</span>
                            </div>
                          </div>
                        )}

                        {teachersManageStudents && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setEditingStudent({
                                id: student.id,
                                first_name: student.first_name,
                                last_name: student.last_name,
                                birth_date: student.birth_date || '',
                                status: student.status || 'active',
                                is_trial: student.is_trial || false,
                                trial_ends_at: student.trial_ends_at || '',
                                contract_ends_at: student.contract_ends_at || '',
                                is_external_vocalist: student.is_external_vocalist || false
                              })}
                              style={{
                                flex: 1,
                                background: '#f1f5f9',
                                border: 'none',
                                padding: '10px 12px',
                                minHeight: '44px',
                                borderRadius: '12px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                color: '#475569',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                            >
                              <Edit3 size={14} /> Bearbeiten
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id)}
                              style={{
                                background: '#fee2e2',
                                border: 'none',
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ef4444',
                                cursor: 'pointer',
                                flexShrink: 0
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Schüler Sidebar */}
          <aside style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Schüler-Statistik Card without limit block */}
            <div style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 900, color: '#1e293b' }}>
                Schüler-Statistik
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '16px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Gesamt registriert</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 950, color: '#8b5cf6' }}>{allStudents.length}</span>
                </div>
              </div>
            </div>

            {/* Premium Instrument Avatar Filter Widget */}
            {(() => {
              const widgetUniqueInstruments = Array.from(new Set(
                allStudents
                  .map((s: any) => s.instrument)
                  .filter((inst: string) => inst && inst.trim().length > 0)
              )) as string[];

              return (
                <div className="google-card" style={{ padding: '20px', borderRadius: '24px', border: '1px solid #cbd5e1', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', fontFamily: 'Urbanist' }}>
                    Instrumenten-Filter
                  </h3>
                  
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    {/* ALL Button */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => setStudentInstrumentFilter('all')}
                        title="Alle Instrumente anzeigen"
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '20px',
                          border: studentInstrumentFilter === 'all' ? '2.5px solid #8b5cf6' : '1px solid #cbd5e1',
                          background: studentInstrumentFilter === 'all' ? '#ffffff' : '#f1f5f9',
                          color: '#1e293b',
                          fontSize: '0.9rem',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontFamily: 'Urbanist',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: studentInstrumentFilter === 'all' ? '0 4px 12px -2px rgba(139, 92, 246, 0.2)' : 'none',
                          transform: studentInstrumentFilter === 'all' ? 'scale(1.08)' : 'scale(1)'
                        }}
                        onMouseEnter={(e) => {
                          if (studentInstrumentFilter !== 'all') {
                            e.currentTarget.style.borderColor = '#8b5cf6';
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (studentInstrumentFilter !== 'all') {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.transform = 'scale(1)';
                          }
                        }}
                      >
                        ALL
                      </button>
                      <span style={{ fontSize: '0.62rem', color: studentInstrumentFilter === 'all' ? '#0f172a' : '#64748b', fontWeight: 800, fontFamily: 'Urbanist' }}>Alle</span>
                    </div>

                    {/* Dynamic Instrument Avatars */}
                    {widgetUniqueInstruments.map((inst: string) => {
                      const instLower = inst.toLowerCase().trim();
                      
                      const avatarUrl = getInstrumentAvatarUrl(inst);

                      const isActive = studentInstrumentFilter.toLowerCase().trim() === instLower;

                      return (
                        <div key={inst} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => setStudentInstrumentFilter(inst)}
                            title={inst}
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '20px',
                              border: isActive ? '2.5px solid #8b5cf6' : '1px solid #cbd5e1',
                              background: isActive ? '#ffffff' : '#f1f5f9',
                              padding: 0,
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: isActive ? '0 4px 12px -2px rgba(139, 92, 246, 0.2)' : 'none',
                              transform: isActive ? 'scale(1.08)' : 'scale(1)'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.borderColor = '#8b5cf6';
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                  e.currentTarget.style.borderColor = '#cbd5e1';
                                  e.currentTarget.style.background = '#f1f5f9';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }
                            }}
                          >
                            <img 
                              src={avatarUrl} 
                              alt={inst} 
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover',
                                opacity: isActive ? 1 : 0.65,
                                transition: 'opacity 0.2s'
                              }} 
                            />
                          </button>
                          <span style={{ 
                            fontSize: '0.62rem', 
                            color: isActive ? '#0f172a' : '#64748b', 
                            fontWeight: 800, 
                            fontFamily: 'Urbanist',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '70px'
                          }}>
                            {inst}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Filter Pill */}
                  {studentInstrumentFilter !== 'all' && (
                    <div style={{
                      alignSelf: 'flex-start',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      background: '#f5f3ff',
                      border: '1px solid #ddd6fe',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      animation: 'fadeIn 0.2s ease-out'
                    }}>
                      <span style={{ fontSize: '0.68rem', color: '#6d28d9', fontWeight: 800, fontFamily: 'Urbanist' }}>
                        Aktiv: {studentInstrumentFilter}
                      </span>
                      <button
                        onClick={() => setStudentInstrumentFilter('all')}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#ef4444',
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fee2e2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title="Filter aufheben"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>
                Onboarding-Tipps
              </h3>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px', fontWeight: 600, lineHeight: 1.4 }}>
                <li>Der QR-Code wird automatisch generiert und dient als Login-Token.</li>
                <li>Schüler können sich selbst ins Live Lab einchecken, indem sie ihren QR-Code an die iPad-Station halten.</li>
                <li>Mitglieder der Testphase werden besonders markiert.</li>
              </ul>
            </div>
          </aside>
        </div>

  );
};
