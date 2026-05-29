import re

with open("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx", "r") as f:
    content = f.read()

# 1. Update initial activeTab state mapping and useEffect
old_state_block = """  const [activeTab, setActiveTab] = useState<string>(() => {
    const initial = parentActiveTab === 'profile' ? 'briefing' : parentActiveTab;
    return (initial as any) || 'briefing';
  });

  useEffect(() => {
    if (parentActiveTab) {
      const mapped = parentActiveTab === 'profile' ? 'briefing' : parentActiveTab;
      if (['briefing', 'hero', 'songs', 'practice_board', 'campus_cup'].includes(mapped)) {
        setActiveTab(mapped as any);
      }
    }
  }, [parentActiveTab]);"""

new_state_block = """  const [activeTab, setActiveTab] = useState<string>(() => {
    let initial = parentActiveTab === 'profile' ? 'briefing' : parentActiveTab;
    if (initial === 'mediathek') initial = 'songs';
    if (initial === 'termine' || initial === 'all_appointments') initial = 'events';
    return (initial as any) || 'briefing';
  });

  useEffect(() => {
    if (parentActiveTab) {
      let mapped = parentActiveTab === 'profile' ? 'briefing' : parentActiveTab;
      if (mapped === 'mediathek') mapped = 'songs';
      if (mapped === 'termine' || mapped === 'all_appointments') mapped = 'events';
      if (['briefing', 'hero', 'songs', 'practice_board', 'campus_cup', 'events'].includes(mapped)) {
        setActiveTab(mapped as any);
      }
    }
  }, [parentActiveTab]);"""

content = content.replace(old_state_block, new_state_block)

# 2. Add activeTab === 'events' block right before activeTab === 'briefing'
events_block = """      {activeTab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            position: 'relative'
          }} className="animation-slide-up">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div style={{ background: '#fee2e2', color: '#ef4444', padding: '8px', borderRadius: '12px' }}>
                <Calendar size={18} />
              </div>
              <div>
                <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', margin: 0 }}>[ DEINE TERMINE & EVENTS ]</h4>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 600 }}>Deine geplanten Unterrichtsstunden & Konzerte</p>
              </div>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              {scheduleOccurrences && scheduleOccurrences.length > 0 ? (
                scheduleOccurrences.map(occ => {
                  const d = new Date(occ.date);
                  const isCanceled = occ.status === 'canceled_by_student' || occ.status === 'teacher_sick';
                  
                  let statusBadgeText = 'Aktiv';
                  let statusBadgeColor = '#22c55e';
                  let statusBadgeBg = '#dcfce7';
                  
                  if (occ.status === 'canceled_by_student') {
                    statusBadgeText = 'Von dir abgesagt';
                    statusBadgeColor = '#ef4444';
                    statusBadgeBg = '#fee2e2';
                  } else if (occ.status === 'teacher_sick') {
                    statusBadgeText = 'Lehrer krank gemeldet';
                    statusBadgeColor = '#ef4444';
                    statusBadgeBg = '#fee2e2';
                  }

                  return (
                    <div 
                      key={occ.id} 
                      style={{ 
                        display: 'flex', 
                        gap: '20px', 
                        alignItems: 'center', 
                        padding: '16px 20px', 
                        borderRadius: '16px', 
                        border: '1px solid #e2e8f0', 
                        background: '#f8fafc',
                        opacity: isCanceled ? 0.6 : 1,
                        transition: 'transform 0.2s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
                      }}
                      className="hover-scale-subtle"
                    >
                      {/* Date Badge */}
                      <div style={{ 
                        width: '56px', 
                        borderRadius: '14px', 
                        overflow: 'hidden', 
                        border: '1.5px solid #e2e8f0', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        textAlign: 'center',
                        flexShrink: 0
                      }}>
                        <div style={{ background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 900, padding: '4px 0', textTransform: 'uppercase' }}>
                          {d.toLocaleDateString('de-DE', {month: 'short'})}
                        </div>
                        <div style={{ background: 'white', color: '#1e293b', fontSize: '1.4rem', fontWeight: 900, padding: '6px 0', lineHeight: 1.1 }}>
                          {d.toLocaleDateString('de-DE', {day: '2-digit'})}
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>• Unterricht</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>⏱️ {occ.start_time?.substring(0,5)} Uhr</span>
                          {occ.schedule?.room && (
                            <span style={{ color: '#0b57d0' }}>• Raum: {occ.schedule.room}</span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div style={{ 
                        background: statusBadgeBg, 
                        color: statusBadgeColor, 
                        fontSize: '0.7rem', 
                        fontWeight: 900, 
                        padding: '6px 12px', 
                        borderRadius: '100px', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}>
                        {statusBadgeText}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ 
                  background: '#f8fafc', 
                  border: '1.5px dashed #e2e8f0', 
                  borderRadius: '16px', 
                  padding: '40px 24px', 
                  textAlign: 'center', 
                  color: '#64748b', 
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
                  Keine zukünftigen Termine oder Events eingetragen.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

"""

content = content.replace("      {activeTab === 'briefing' && (", events_block + "      {activeTab === 'briefing' && (")

with open("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx", "w") as f:
    f.write(content)

print("Patch complete")
