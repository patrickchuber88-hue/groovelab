import re

file_path = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/SecretaryDashboard.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's find: campusSubTab === 'onboarding' && (() => {
# and search for the end of the block.
# We will match the entire IIFE structure.
pattern = r"\{\/\* Subtab: Onboarding \*\/\}\s*\{campusSubTab === 'onboarding' && \(\(\) => \{.*?\}\)\(\)\}"

new_code = """{/* Subtab: Onboarding */}
              {campusSubTab === 'onboarding' && (() => {
                // Deduplicate teachers
                const allUniqueTeachers = [...campusTeachers, ...bypassTeachers, ...coaches].reduce((acc: any[], t: any) => {
                  if (!acc.some(existing => existing.id === t.id)) {
                    acc.push(t);
                  }
                  return acc;
                }, []);

                const uniqueInstruments = Array.from(new Set(allUniqueTeachers.map((t: any) => t.instrument || 'Allgemein'))).sort((a: string, b: string) => a.localeCompare(b, 'de'));

                const filteredTeachers = allUniqueTeachers.filter((t: any) => {
                  const firstName = (t.firstName || t.first_name || '').toLowerCase();
                  const lastName = (t.lastName || t.last_name || '').toLowerCase();
                  const email = (t.email || '').toLowerCase();
                  const query = teacherSearchQuery.toLowerCase().trim();
                  
                  const matchesSearch = !query || firstName.includes(query) || lastName.includes(query) || email.includes(query);
                  const matchesInstrument = teacherFilterInstrument === 'All' || (t.instrument || 'Allgemein') === teacherFilterInstrument;
                  
                  const isCampus = t.isCampusActive || t.is_campus_active;
                  const isActive = t.isActive ?? t.is_active;
                  const matchesStatus = teacherStatusTab === 'all' ||
                    (teacherStatusTab === 'active' && isCampus && isActive) ||
                    (teacherStatusTab === 'inactive' && !isActive);
                    
                  return matchesSearch && matchesStatus && matchesInstrument;
                }).sort((a: any, b: any) => {
                  const nameA = `${a.firstName || a.first_name || ''} ${a.lastName || a.last_name || ''}`.toLowerCase().trim();
                  const nameB = `${b.firstName || b.first_name || ''} ${b.lastName || b.last_name || ''}`.toLowerCase().trim();
                  return nameA.localeCompare(nameB, 'de');
                });

                // Helper for beautiful pastel background based on teacher name (distributed A-Z)
                const getAvatarGradient = (name: string) => {
                  const firstChar = (name || 'A').trim().toUpperCase().charAt(0);
                  const code = firstChar.charCodeAt(0);
                  const index = (code >= 65 && code <= 90) ? (code - 65) : 0;
                  const hue = Math.floor((index / 26) * 360);
                  return `linear-gradient(135deg, hsl(${hue}, 85%, 94%) 0%, hsl(${hue}, 80%, 84%) 100%)`;
                };
                const getAvatarTextColor = (name: string) => {
                  const firstChar = (name || 'A').trim().toUpperCase().charAt(0);
                  const code = firstChar.charCodeAt(0);
                  const index = (code >= 65 && code <= 90) ? (code - 65) : 0;
                  const hue = Math.floor((index / 26) * 360);
                  return `hsl(${hue}, 90%, 25%)`;
                };

                return (
                  <>
                    <div style={{ display: 'flex', gap: '24px', width: '100%', alignItems: 'flex-start' }}>
                      <div className="google-card" style={{ 
                        flex: 1.8,
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '24px', 
                        padding: '24px',
                        borderRadius: '24px',
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.01)',
                        minWidth: '850px'
                      }}>
                        {/* TITLE BLOCK */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Users size={22} style={{ color: '#0f172a' }} />
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>
                              Lehrerverwaltung
                            </h3>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={() => setIsCsvExpanded(!isCsvExpanded)}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                borderRadius: '12px', 
                                padding: '8px 16px', 
                                fontSize: '0.8rem', 
                                fontWeight: 800,
                                background: isCsvExpanded ? '#f1f5f9' : '#ffffff',
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer',
                                fontFamily: 'Urbanist',
                                transition: 'all 0.2s'
                              }}
                            >
                              📄 Sammel-Onboarding (CSV) {isCsvExpanded ? '▲' : '▼'}
                            </button>

                            <button
                              onClick={() => {
                                setShowAddTeacherModal(true);
                                if (teacherFilterInstrument && teacherFilterInstrument !== 'All') {
                                  setNewTeacherInstrument(teacherFilterInstrument);
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
                                boxShadow: '0 4px 10px rgba(52,168,83,0.15)',
                                transition: 'all 0.2s'
                              }}
                            >
                              ➕ Lehrkraft anlegen
                            </button>
                          </div>
                        </div>

                        {/* CSV BOX */}
                        {isCsvExpanded && (
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.5)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            padding: '24px',
                            borderRadius: '20px',
                            border: '1px solid rgba(0, 0, 0, 0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.01)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1d1d1f' }}>
                                  Sammel-Onboarding (Lehrer)
                                </h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#86868b', fontWeight: 500 }}>
                                  Füge mehrere Lehrkräfte auf einmal hinzu. Trenne verschiedene Lehrkräfte pro Zeile.
                                </p>
                              </div>
                              {(() => {
                                if (teacherFilterInstrument && teacherFilterInstrument !== 'All') {
                                  return (
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '6px 14px',
                                      background: 'rgba(52, 168, 83, 0.08)',
                                      borderRadius: '100px',
                                      border: '1px solid rgba(52, 168, 83, 0.15)',
                                      transition: 'all 0.2s ease',
                                      animation: 'scaleUp 0.2s ease'
                                    }}>
                                      <span style={{ fontSize: '0.72rem', color: '#137333', fontWeight: 700 }}>Automatische Zuweisung:</span>
                                      <span style={{ fontSize: '0.72rem', color: '#137333', fontWeight: 800 }}>
                                        🎸 {teacherFilterInstrument}
                                      </span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>

                            <div style={{
                              background: 'rgba(0, 0, 0, 0.015)',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              border: '1px solid rgba(0, 0, 0, 0.03)',
                              fontSize: '0.74rem',
                              color: '#636366',
                              lineHeight: '1.4'
                            }}>
                              {teacherFilterInstrument && teacherFilterInstrument !== 'All' ? (
                                <span><strong>Tipp:</strong> Trage einfach nur die Namen ein (z.B. <code>Vorname Nachname</code>). Das Instrument <strong>{teacherFilterInstrument}</strong> wird automatisch zugewiesen!</span>
                              ) : (
                                <span><strong>Format pro Zeile:</strong> <code>Vorname Nachname; E-Mail (optional); Hauptinstrument (optional)</code></span>
                              )}
                            </div>

                            <textarea
                              value={csvText}
                              onChange={(e) => setCsvText(e.target.value)}
                              placeholder={
                                teacherFilterInstrument && teacherFilterInstrument !== 'All'
                                  ? "Sebastian Bach\\nWolfgang Mozart"
                                  : "Sebastian Bach; sebastian@bach.de; Klavier\\nWolfgang Mozart; wolfgang@mozart.de; Violine"
                              }
                              style={{
                                width: '100%',
                                height: '100px',
                                borderRadius: '12px',
                                border: '1px solid rgba(0, 0, 0, 0.08)',
                                background: '#ffffff',
                                padding: '12px',
                                fontSize: '0.8rem',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                outline: 'none',
                                resize: 'vertical',
                                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)',
                                transition: 'border-color 0.2s ease'
                              }}
                              onFocus={(e) => e.target.style.borderColor = '#34a853'}
                              onBlur={(e) => e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'}
                            />

                            <button
                              onClick={handleImportTeachers}
                              style={{
                                background: '#34a853',
                                color: '#ffffff',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '12px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                alignSelf: 'flex-start',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.12)',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#2e964b';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(52, 168, 83, 0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#34a853';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(52, 168, 83, 0.12)';
                              }}
                            >
                              Lehrkräfte importieren
                            </button>
                          </div>
                        )}

                        {/* FILTER & SEARCH */}
                        <div style={{ 
                          display: 'flex', 
                          gap: '12px', 
                          background: '#f8fafc', 
                          padding: '12px', 
                          borderRadius: '16px',
                          border: '1px solid #cbd5e1',
                          flexWrap: 'wrap',
                          alignItems: 'center'
                        }}>
                          <div style={{ flex: 1.5, minWidth: '200px', position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem' }}>🔍</span>
                            <input 
                              type="text" 
                              placeholder="Lehrkraft nach Name oder E-Mail suchen..." 
                              value={teacherSearchQuery}
                              onChange={(e) => {
                                setTeacherSearchQuery(e.target.value);
                              }}
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '8px 12px 8px 34px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.78rem',
                                outline: 'none',
                                background: 'white',
                                fontWeight: 700
                              }}
                            />
                          </div>

                          <div style={{ flex: 1, minWidth: '130px' }}>
                            <select 
                              value={teacherFilterInstrument}
                              onChange={(e) => {
                                setTeacherFilterInstrument(e.target.value);
                              }}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: 'white', fontWeight: 700 }}
                            >
                              <option value="All">🎸 Alle Instrumente</option>
                              {uniqueInstruments.map(inst => (
                                <option key={inst} value={inst}>{inst}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ flex: 1, minWidth: '130px' }}>
                            <select
                              value={teacherStatusTab}
                              onChange={(e) => {
                                setTeacherStatusTab(e.target.value as any);
                              }}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', outline: 'none', background: 'white', fontWeight: 700 }}
                            >
                              <option value="all">⚡ Alle</option>
                              <option value="active">🎓 Aktiv (Campus)</option>
                              <option value="inactive">⚪ Inaktiv (Bypass)</option>
                            </select>
                          </div>
                        </div>

                        {/* LIST ROW VIEW CONTAINER */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowX: 'auto', width: '100%' }}>
                          {filteredTeachers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.88rem', fontWeight: 700 }}>
                              Keine Lehrkräfte mit diesen Filtereinstellungen gefunden.
                            </div>
                          ) : (
                            filteredTeachers.map((t: any) => {
                              const isCampus = t.isCampusActive || t.is_campus_active;
                              const isActive = t.isActive ?? t.is_active;
                              const teacherName = `${t.firstName || t.first_name || ''} ${t.lastName || t.last_name || ''}`.trim();

                              return (
                                <div 
                                  key={t.id} 
                                  style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '10px 16px',
                                    borderRadius: '16px',
                                    background: '#ffffff',
                                    border: '1px solid #f1f5f9',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.01)',
                                    minWidth: '850px',
                                    transition: 'all 0.25s ease'
                                  }}
                                  className="hover-scale"
                                >
                                  {/* Avatar & Name */}
                                  <div 
                                    onClick={() => setManageTeacher({
                                      id: t.id,
                                      firstName: t.firstName || t.first_name || '',
                                      lastName: t.lastName || t.last_name || '',
                                      email: t.email || '',
                                      instrument: t.instrument || '',
                                      ausweisNummer: t.ausweisNummer || t.ausweis_nummer || '',
                                      isCampusActive: t.isCampusActive ?? t.is_campus_active ?? false,
                                      isGroovelabActive: t.isGroovelabActive ?? t.is_groovelab_active ?? false,
                                      isActive: t.isActive ?? t.is_active ?? false,
                                      role: t.role || 'teacher',
                                      teacherQrToken: t.teacherQrToken || t.teacher_qr_token || '',
                                      studentCount: t.studentCount || 0,
                                      contractEndsAt: t.contractEndsAt || t.contract_ends_at || null
                                    })}
                                    style={{ 
                                      flex: '1.6', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '14px', 
                                      minWidth: '180px',
                                      cursor: 'pointer'
                                    }}
                                    className="student-name-hover"
                                  >
                                    <div style={{
                                      width: '42px',
                                      height: '42px',
                                      borderRadius: '50%',
                                      background: getAvatarGradient(teacherName),
                                      color: getAvatarTextColor(teacherName),
                                      border: '1px solid rgba(0, 0, 0, 0.05)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.85rem',
                                      fontWeight: 800,
                                      flexShrink: 0
                                    }}>
                                      {(t.firstName || t.first_name || 'S')?.[0]}{(t.lastName || t.last_name || 'L')?.[0]}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1d1d1f' }}>
                                        {teacherName}
                                      </span>
                                      <span style={{ fontSize: '0.74rem', color: '#86868b', fontWeight: 500 }}>
                                        {t.email || 'Keine E-Mail'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Instrument Badge */}
                                  <div style={{ flex: '1', minWidth: '100px' }}>
                                    <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '100px', fontWeight: 800 }}>
                                      🎸 {t.instrument || 'Allgemein'}
                                    </span>
                                  </div>

                                  {/* Status Badges */}
                                  <div style={{ flex: '1', minWidth: '130px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {isCampus && isActive ? (
                                      <span style={{ fontSize: '0.66rem', background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '100px', fontWeight: 800 }}>
                                        🎓 Campus Aktiv
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '0.66rem', background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '100px', fontWeight: 800 }}>
                                        🔑 Bypass (Bereit)
                                      </span>
                                    )}
                                    {(t.contractEndsAt || t.contract_ends_at) && (
                                      <span style={{ fontSize: '0.66rem', background: '#fee2e2', color: '#ef4444', padding: '4px 10px', borderRadius: '100px', fontWeight: 800 }}>
                                        📅 Bis {new Date(t.contractEndsAt || t.contract_ends_at).toLocaleDateString('de-DE')}
                                      </span>
                                    )}
                                  </div>

                                  {/* Student Count */}
                                  <div style={{ flex: '0.8', minWidth: '80px' }}>
                                    <span style={{ fontSize: '0.74rem', color: '#636366', fontWeight: 700 }}>
                                      👥 {t.studentCount || 0} Schüler
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Right Side: Instrumente Sidebar */}
                      <div className="google-card" style={{
                        width: '330px',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        padding: '24px',
                        borderRadius: '24px',
                        background: 'rgba(255, 255, 255, 0.65)',
                        backdropFilter: 'blur(20px) saturate(1.8)',
                        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02)',
                        position: 'sticky',
                        top: '24px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Users size={18} style={{ color: '#1d1d1f' }} />
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, sans-serif' }}>
                            Instrumente
                          </h3>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.74rem', color: '#86868b', fontWeight: 500, lineHeight: 1.4 }}>
                          Klicke auf ein Instrument, um das Sammel-Onboarding zu filtern und Lehrer direkt dafür anzulegen.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                          
                          {/* Option für Alle Instrumente */}
                          <div
                            onClick={() => {
                              setTeacherFilterInstrument('All');
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              borderRadius: '14px',
                              background: teacherFilterInstrument === 'All' ? 'rgba(52, 168, 83, 0.08)' : 'rgba(0, 0, 0, 0.015)',
                              border: teacherFilterInstrument === 'All' ? '1px solid rgba(52, 168, 83, 0.15)' : '1px solid rgba(0, 0, 0, 0.03)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              if (teacherFilterInstrument !== 'All') {
                                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
                                e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.06)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (teacherFilterInstrument !== 'All') {
                                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.015)';
                                e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.03)';
                              }
                            }}
                          >
                            {teacherFilterInstrument === 'All' && (
                              <div style={{
                                position: 'absolute',
                                left: '3px',
                                top: '10px',
                                bottom: '10px',
                                width: '3.5px',
                                borderRadius: '2px',
                                background: '#34a853'
                              }} />
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                                color: '#475569',
                                border: '1px solid rgba(0, 0, 0, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                flexShrink: 0
                              }}>
                                🎸
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1d1d1f' }}>
                                  Alle Instrumente anzeigen
                                </span>
                                <span style={{ fontSize: '0.74rem', color: '#86868b', fontWeight: 500, marginTop: '1px' }}>
                                  Gesamtübersicht
                                </span>
                              </div>
                            </div>
                            <div style={{
                              background: teacherFilterInstrument === 'All' ? 'rgba(52, 168, 83, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                              color: teacherFilterInstrument === 'All' ? '#137333' : '#636366',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: '20px',
                              transition: 'all 0.2s ease'
                            }}>
                              {allUniqueTeachers.length} Lehrer
                            </div>
                          </div>

                          {uniqueInstruments.map((inst: string) => {
                            const isSelected = teacherFilterInstrument === inst;
                            const assignedCount = allUniqueTeachers.filter(t => (t.instrument || 'Allgemein') === inst).length;

                            return (
                              <div
                                key={inst}
                                onClick={() => {
                                  setTeacherFilterInstrument(inst);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  borderRadius: '14px',
                                  background: isSelected ? 'rgba(52, 168, 83, 0.08)' : 'rgba(0, 0, 0, 0.015)',
                                  border: isSelected ? '1px solid rgba(52, 168, 83, 0.15)' : '1px solid rgba(0, 0, 0, 0.03)',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
                                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.06)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.015)';
                                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.03)';
                                  }
                                }}
                              >
                                {isSelected && (
                                  <div style={{
                                    position: 'absolute',
                                    left: '3px',
                                    top: '10px',
                                    bottom: '10px',
                                    width: '3.5px',
                                    borderRadius: '2px',
                                    background: '#34a853'
                                  }} />
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                  <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: getAvatarGradient(inst),
                                    color: getAvatarTextColor(inst),
                                    border: '1px solid rgba(0, 0, 0, 0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    flexShrink: 0
                                  }}>
                                    {inst.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {inst}
                                    </span>
                                  </div>
                                </div>
                                <div style={{
                                  background: isSelected ? 'rgba(52, 168, 83, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                                  color: isSelected ? '#137333' : '#636366',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  transition: 'all 0.2s ease'
                                }}>
                                  {assignedCount} Lehrer
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* NEW MANUAL TEACHER CREATION MODAL */}
                    {showAddTeacherModal && (
                      <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(15, 23, 42, 0.4)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'Inter, sans-serif'
                      }}>
                        <div style={{
                          background: '#ffffff',
                          borderRadius: '24px',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                          width: '500px',
                          maxHeight: '90vh',
                          overflowY: 'auto',
                          border: '1px solid #e2e8f0',
                          animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}>
                          {/* Modal Header */}
                          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: 'Urbanist' }}>➕ Neue Lehrkraft anlegen</h3>
                              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Erstellt ein inaktives Bypass-Profil. Bereit zur Aktivierung.</p>
                            </div>
                            <button
                              onClick={() => setShowAddTeacherModal(false)}
                              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}
                            >
                              <X size={20} />
                            </button>
                          </div>

                          {/* Modal Form */}
                          <form onSubmit={handleCreateTeacher}>
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Vorname *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newTeacherFirstName}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setNewTeacherFirstName(val);
                                      setNewTeacherEmail(`${val.toLowerCase().trim().replace(/\\s+/g, '')}.${newTeacherLastName.toLowerCase().trim().replace(/\\s+/g, '')}@musaek.de`);
                                    }}
                                    placeholder="z.B. Sebastian"
                                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                  />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Nachname *</label>
                                  <input
                                    type="text"
                                    required
                                    value={newTeacherLastName}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setNewTeacherLastName(val);
                                      setNewTeacherEmail(`${newTeacherFirstName.toLowerCase().trim().replace(/\\s+/g, '')}.${val.toLowerCase().trim().replace(/\\s+/g, '')}@musaek.de`);
                                    }}
                                    placeholder="z.B. Bach"
                                    style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                  />
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>E-Mail-Adresse *</label>
                                <input
                                  type="email"
                                  required
                                  value={newTeacherEmail}
                                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                                  placeholder="z.B. bach@musikschule.de"
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Hauptinstrument / Fach</label>
                                <input
                                  type="text"
                                  value={newTeacherInstrument}
                                  onChange={(e) => setNewTeacherInstrument(e.target.value)}
                                  placeholder="z.B. Klavier, Gitarre, Violine"
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                              </div>


                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>Endzeit / Vertragsende (Zugriff erlischt automatisch)</label>
                                <input
                                  type="date"
                                  value={newTeacherContractEndsAt}
                                  onChange={(e) => setNewTeacherContractEndsAt(e.target.value)}
                                  style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                                />
                              </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderRadius: '0 0 24px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                              <button
                                type="button"
                                onClick={() => setShowAddTeacherModal(false)}
                                className="google-btn-secondary"
                                style={{ borderRadius: '12px', fontSize: '0.82rem' }}
                              >
                                Abbrechen
                              </button>
                              <button
                                type="submit"
                                className="google-btn-primary"
                                style={{ background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '0.82rem', fontWeight: 700 }}
                              >
                                Lehrkraft anlegen
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}"""

# We compile the regex
match = re.search(pattern, content, re.DOTALL)
if match:
    new_content = content.replace(match.group(0), new_code)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("PATTERN NOT FOUND")
