import json

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

# 1. ADD KPIs BEFORE THE HEADER
header_target = """              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>"""

kpi_grid = """              {/* Compact space-saving KPI row directly above Greeting (strictly one-line, responsive) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <style>{`
                  .kpi-label-desktop { display: inline !important; }
                  .kpi-label-mobile { display: none !important; }
                  @media (max-width: 1024px) {
                    .kpi-label-desktop { display: none !important; }
                    .kpi-label-mobile { display: inline !important; }
                  }
                  @media (max-width: 640px) {
                    .dashboard-kpi-card-icon { display: none !important; }
                    .dashboard-kpi-card-inner { padding: 8px 6px !important; gap: 4px !important; }
                  }
                `}</style>
                {/* Card 1: Gesammelte XP */}
                <div style={{ 
                   position: 'relative', overflow: 'hidden', background: '#007bff', color: 'white',
                   borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 123, 255, 0.06)',
                   display: 'flex', alignItems: 'center', minHeight: '44px',
                   transition: 'all 0.25s ease'
                }} className="hover-scale">
                  <div className="dashboard-kpi-card-inner" style={{ padding: '8px 12px', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Urbanist', sans-serif" }}>{currentXp}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.9, whiteSpace: 'nowrap' }}>
                      <span className="kpi-label-desktop">Gesammelte XP</span>
                      <span className="kpi-label-mobile">XP</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Verifizierte Songs */}
                <div style={{ 
                   position: 'relative', overflow: 'hidden', background: '#28a745', color: 'white',
                   borderRadius: '12px', boxShadow: '0 4px 12px rgba(40, 167, 69, 0.06)',
                   display: 'flex', alignItems: 'center', minHeight: '44px',
                   transition: 'all 0.25s ease'
                }} className="hover-scale">
                  <div className="dashboard-kpi-card-inner" style={{ padding: '8px 12px', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Urbanist', sans-serif" }}>{wrappedData.monthlyFlashback.masteredSongsCount}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.9, whiteSpace: 'nowrap' }}>
                      <span className="kpi-label-desktop">Songs Gemeistert</span>
                      <span className="kpi-label-mobile">Songs</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Fokus Minuten */}
                <div style={{ 
                   position: 'relative', overflow: 'hidden', background: '#ffc107', color: '#1f2937',
                   borderRadius: '12px', boxShadow: '0 4px 12px rgba(255, 193, 7, 0.06)',
                   display: 'flex', alignItems: 'center', minHeight: '44px',
                   transition: 'all 0.25s ease'
                }} className="hover-scale">
                  <div className="dashboard-kpi-card-inner" style={{ padding: '8px 12px', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Urbanist', sans-serif" }}>{wrappedData.monthlyFlashback.focusMinutes}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.9, whiteSpace: 'nowrap' }}>
                      <span className="kpi-label-desktop">Fokus Minuten</span>
                      <span className="kpi-label-mobile">Fokus</span>
                    </div>
                  </div>
                </div>

                {/* Card 4: Streak */}
                <div style={{ 
                   position: 'relative', overflow: 'hidden', background: '#dc3545', color: 'white',
                   borderRadius: '12px', boxShadow: '0 4px 12px rgba(220, 53, 69, 0.06)',
                   display: 'flex', alignItems: 'center', minHeight: '44px',
                   transition: 'all 0.25s ease'
                }} className="hover-scale">
                  <div className="dashboard-kpi-card-inner" style={{ padding: '8px 12px', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Urbanist', sans-serif" }}>{avatar.streak_flame || briefingData.gamification.streakFlame}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.9, whiteSpace: 'nowrap' }}>
                      <span className="kpi-label-desktop">Tage Streak</span>
                      <span className="kpi-label-mobile">Streak</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>"""

content = content.replace(header_target, kpi_grid)


# 2. APPLE GLASS TIMETABLE
apple_glass_target = """              {/* Today's lesson */}
              {briefingData.todayLesson ? (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {briefingData.todayLesson.status === 'canceled_by_student' ? (
                    <div>
                      <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: '#ef4444', display: 'block', marginBottom: '4px' }}>Abgesagt</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>Du hast diesen Unterrichtstermin heute abgesagt. Dein Slot ist als Freisprech-Slot markiert.</span>
                    </div>
                  ) : briefingData.todayLesson.status === 'teacher_sick' ? (
                    <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '12px', borderRadius: '12px', color: '#b91c1c' }}>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 900, display: 'block', marginBottom: '4px' }}>🚨 Unterrichtsausfall</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 850 }}>Unterricht entfällt wegen akuter Erkrankung der Lehrkraft. Ihr Kontingent wird gutgeschrieben.</span>
                    </div>
                  ) : briefingData.todayLesson.status === 'pending_parent_approval' ? (
                    <div>
                      <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: '#d97706', display: 'block', marginBottom: '8px' }}>Eltern-Zustimmung ausstehend</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 750, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                        Vorschlag: Heute {briefingData.todayLesson.time} Uhr in {briefingData.todayLesson.room} bei {briefingData.todayLesson.teacher}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleParentApproval(briefingData.todayLesson.id, true)}
                          style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Zustimmen
                        </button>
                        <button 
                          onClick={() => handleParentApproval(briefingData.todayLesson.id, false)}
                          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: '#64748b', display: 'block' }}>Dein Termin heute</span>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <Clock size={16} color="#0b57d0" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b', display: 'block' }}>
                            {briefingData.todayLesson.time} Uhr
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 650, display: 'block', marginTop: '2px' }}>
                            {briefingData.todayLesson.room} bei {briefingData.todayLesson.teacher}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCancelLesson(briefingData.todayLesson.id)}
                        style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        Für heute absagen
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Heute steht kein Unterricht an. Nutze den Tag zum Üben!</span>
                </div>
              )}"""

apple_glass_replacement = """              {/* Today's lesson (Apple Glass Timetable Design) */}
              {briefingData.todayLesson ? (
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.4)', 
                  backdropFilter: 'blur(16px)', 
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.6)', 
                  borderRadius: '20px', 
                  padding: '20px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  boxShadow: '0 8px 32px rgba(31, 38, 135, 0.05)'
                }}>
                  {briefingData.todayLesson.status === 'canceled_by_student' ? (
                    <div>
                      <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: '#ef4444', display: 'block', marginBottom: '4px' }}>Abgesagt</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>Du hast diesen Unterrichtstermin heute abgesagt. Dein Slot ist als Freisprech-Slot markiert.</span>
                    </div>
                  ) : briefingData.todayLesson.status === 'teacher_sick' ? (
                    <div style={{ background: 'rgba(254, 226, 226, 0.6)', border: '1px solid #fecaca', padding: '12px', borderRadius: '12px', color: '#b91c1c' }}>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 900, display: 'block', marginBottom: '4px' }}>🚨 Unterrichtsausfall</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 850 }}>Unterricht entfällt wegen akuter Erkrankung der Lehrkraft. Ihr Kontingent wird gutgeschrieben.</span>
                    </div>
                  ) : briefingData.todayLesson.status === 'pending_parent_approval' ? (
                    <div>
                      <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: '#d97706', display: 'block', marginBottom: '8px' }}>Eltern-Zustimmung ausstehend</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 750, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                        Vorschlag: Heute {briefingData.todayLesson.time} Uhr in {briefingData.todayLesson.room} bei {briefingData.todayLesson.teacher}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleParentApproval(briefingData.todayLesson.id, true)}
                          style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Zustimmen
                        </button>
                        <button 
                          onClick={() => handleParentApproval(briefingData.todayLesson.id, false)}
                          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: '#64748b', display: 'block' }}>Dein Termin heute</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0b57d0', background: 'rgba(11, 87, 208, 0.1)', padding: '2px 8px', borderRadius: '100px' }}>{briefingData.todayLesson.duration_minutes || 30} Min</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Clock size={24} color="#0b57d0" />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '2px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b', display: 'block', lineHeight: 1 }}>
                            {briefingData.todayLesson.time} Uhr
                          </span>
                          <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600, display: 'block' }}>
                            {briefingData.todayLesson.room} bei {briefingData.todayLesson.teacher}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCancelLesson(briefingData.todayLesson.id)}
                        style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', padding: '0', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s', marginTop: '4px' }}
                      >
                        Für heute absagen
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.4)', 
                  backdropFilter: 'blur(16px)', 
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.6)', 
                  borderRadius: '20px', 
                  padding: '20px', 
                  textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(31, 38, 135, 0.05)'
                }}>
                  <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>Heute steht kein Unterricht an. Nutze den Tag zum Üben!</span>
                </div>
              )}"""
content = content.replace(apple_glass_target, apple_glass_replacement)


# 3. FIX GREETING
greeting_target = """                    <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', margin: 0 }}>Guten Morgen!</h4>"""
greeting_replacement = """                    <h4 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0b57d0', margin: 0 }}>Guten Morgen, {avatar.student_name.split(' ')[0]}!</h4>"""
content = content.replace(greeting_target, greeting_replacement)

# 4. REMOVE BORDER FROM BRIEFING SECTION
briefing_target = """            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>"""
briefing_replacement = """            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: 'none',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>"""
content = content.replace(briefing_target, briefing_replacement)

with open(filename, "w") as f:
    f.write(content)

print("Applied beautifully.")
