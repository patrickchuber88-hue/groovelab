import json

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

# 1. ADD STATE FOR OCCURRENCES
state_target = "const [allSchedules, setAllSchedules] = useState<any[]>([]);"
state_replacement = """const [allSchedules, setAllSchedules] = useState<any[]>([]);
  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);"""
if state_target in content:
    content = content.replace(state_target, state_replacement)

# 2. FETCH OCCURRENCES
fetch_target = """        // Combine current and previous schedules"""
fetch_replacement = """        // Fetch all future schedule occurrences for this student
        const occPromise = (async () => {
          try {
            const todayStr = new Date().toISOString().split('T')[0];
            const { data: occs } = await supabase
              .from('schedule_occurrences')
              .select('id, date, status, schedule:schedule_id(*)')
              .eq('student_id', studentId)
              .gte('date', todayStr)
              .order('date', { ascending: true })
              .limit(10);
            if (occs) {
              setScheduleOccurrences(occs);
            }
          } catch (err) {
            console.error(err);
          }
        })();

        // Combine current and previous schedules"""
if fetch_target in content:
    content = content.replace(fetch_target, fetch_replacement)

# 3. ADD TAB BUTTON
tab_target = "          <Music size={15} />"
tab_btn_target = """        <button
          onClick={() => handleTabChangeLocal('songs')}"""
tab_btn_replacement = """        <button
          onClick={() => handleTabChangeLocal('termine')}
          style={{
            flex: 1.2,
            border: 'none',
            background: activeTab === 'termine' ? '#ffffff' : 'transparent',
            color: activeTab === 'termine' ? '#0b57d0' : '#5f6368',
            padding: '10px 16px',
            borderRadius: '100px',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: activeTab === 'termine' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Calendar size={15} />
          <span>Alle Termine</span>
        </button>

        <button
          onClick={() => handleTabChangeLocal('songs')}"""
if tab_btn_target in content:
    content = content.replace(tab_btn_target, tab_btn_replacement)

# 4. ADD TAB CONTENT
tab_content_target = "{activeTab === 'songs' && ("
tab_content_replacement = """{activeTab === 'termine' && (
        <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '8px', borderRadius: '12px' }}>
              <Calendar size={18} />
            </div>
            <div>
              <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b', margin: 0 }}>Nächste Termine</h4>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Dein Unterrichtsplan für die kommenden Wochen</p>
            </div>
          </div>
          
          {scheduleOccurrences.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
              Keine zukünftigen Termine gefunden.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scheduleOccurrences.map(occ => {
                const isCanceled = occ.status === 'canceled_by_student' || occ.status === 'teacher_sick';
                const dateObj = new Date(occ.date);
                const dayStr = dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
                return (
                  <div key={occ.id} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', 
                    background: isCanceled ? '#fef2f2' : '#f8fafc',
                    opacity: isCanceled ? 0.7 : 1
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ background: isCanceled ? '#fee2e2' : '#ffffff', border: isCanceled ? '1px solid #fca5a5' : '1px solid #e2e8f0', borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '60px' }}>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: isCanceled ? '#ef4444' : '#64748b' }}>{dateObj.toLocaleDateString('de-DE', { weekday: 'short' })}</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: isCanceled ? '#b91c1c' : '#0f172a' }}>{dateObj.getDate()}</span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                            {occ.schedule?.start_time?.substring(0,5)} - {occ.schedule?.end_time?.substring(0,5)} Uhr
                          </span>
                          {isCanceled && (
                            <span style={{ background: '#ef4444', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '100px', fontWeight: 800, textTransform: 'uppercase' }}>
                              Abgesagt
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                          {occ.schedule?.room_name || 'Raum'} • {occ.schedule?.teacher_name || 'Lehrkraft'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'songs' && ("""
if tab_content_target in content:
    content = content.replace(tab_content_target, tab_content_replacement)

# Update the state type
type_target = "const [activeTab, setActiveTab] = useState<'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup'>(() => {"
type_replacement = "const [activeTab, setActiveTab] = useState<'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup' | 'termine'>(() => {"
if type_target in content:
    content = content.replace(type_target, type_replacement)
type_target2 = "const handleTabChangeLocal = (tab: 'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup') => {"
type_replacement2 = "const handleTabChangeLocal = (tab: 'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup' | 'termine') => {"
if type_target2 in content:
    content = content.replace(type_target2, type_replacement2)


with open(filename, "w") as f:
    f.write(content)

print("Added appointments tab.")
