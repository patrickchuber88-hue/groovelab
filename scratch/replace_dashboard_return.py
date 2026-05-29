import re

file_path = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Declare studentName state variable at the top (after isPremiumUser)
target_state = "  const [isPremiumUser, setIsPremiumUser] = useState(false);\n  const [avatar, setAvatar] = useState<Avatar | null>(null);"
replacement_state = "  const [isPremiumUser, setIsPremiumUser] = useState(false);\n  const [studentName, setStudentName] = useState('Max Schüler');\n  const [avatar, setAvatar] = useState<Avatar | null>(null);"
content = content.replace(target_state, replacement_state)

# 2. Add unblock safeguard inside fetchStudentAndAvatar
target_safeguard = "      setIsAppUser(user.is_app_user ?? false);\n      setIsPremiumUser(user.is_premium_user ?? false);"
replacement_safeguard = """      setStudentName(user.first_name || 'Max Schüler');

      if (user && !user.is_app_user) {
        await supabase
          .from('users')
          .update({ is_app_user: true })
          .eq('id', studentId);
        setIsAppUser(true);
      } else {
        setIsAppUser(user.is_app_user ?? false);
      }
      setIsPremiumUser(user.is_premium_user ?? false);"""
content = content.replace(target_safeguard, replacement_safeguard)

# 3. Find start and end positions of the main return block
start_idx = content.find("  return (\n    <div style={{ fontFamily:")
if start_idx == -1:
    print("Error: start return block not found!")
    exit(1)

end_token = "      {/* ======================================================== */}\n      {/* 9:16 MOBILE STORY GENERATOR MODAL (Wrapped & Flashback) */}"
end_idx = content.find(end_token)
if end_idx == -1:
    print("Error: end token not found!")
    exit(1)

# Extract blocks using the 6-space indentation pattern
def extract_block(active_tab_name):
    pattern = f"      {{activeTab === '{active_tab_name}' && ("
    start = content.find(pattern)
    if start == -1:
        print(f"Warning: Tab {active_tab_name} block not found!")
        return ""
    
    # We find the matching closing parenthesized brace
    depth = 0
    idx = start + len(pattern) - 1 # starts at (
    while idx < len(content):
        c = content[idx]
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
            if depth == -1: # found outer closing brace
                # check if next is }
                if content[idx+1] == '}':
                    return content[start : idx+2]
        idx += 1
    return ""

briefing_block_raw = extract_block("briefing")
songs_block = extract_block("songs")
practice_block = extract_block("practice_board")
campus_cup_block = extract_block("campus_cup")
hero_block = extract_block("hero")

print("Extracted tab panels successfully:")
print(f"  Briefing len: {len(briefing_block_raw)}")
print(f"  Songs len: {len(songs_block)}")
print(f"  Practice len: {len(practice_block)}")
print(f"  Campus Cup len: {len(campus_cup_block)}")
print(f"  Hero len: {len(hero_block)}")

# Let's construct the new briefing block with Fokus des Tages Card at the top!
new_briefing_block = """          {activeTab === 'briefing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Fokus des Tages Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                borderRadius: '24px',
                padding: '32px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '24px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Left Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{
                    color: '#8a94a6',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em'
                  }}>
                    FOKUS DES TAGES
                  </div>
                  <h2 style={{
                    margin: 0,
                    fontSize: '1.9rem',
                    fontWeight: 900,
                    color: '#0b0f19',
                    letterSpacing: '-0.02em',
                    lineHeight: '1.2'
                  }}>
                    Schön, dass du da bist, {studentName}.
                  </h2>
                  <p style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    color: '#4b5563',
                    lineHeight: '1.6',
                    fontWeight: 500
                  }}>
                    Ein neuer Moment für Musik. Mit jeder kurzen Übungseinheit vertiefst du dein Gefühl für das Instrument. Nimm dir heute ein paar ruhige Minuten für deine Übungsziele – deine Serie bleibt dir damit sicher erhalten.
                  </p>
                  
                  {/* Pills Row */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#f3f4f6',
                      color: '#374151',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 800
                    }}>
                      <Clock size={14} color="#6b7280" />
                      Morgen wieder Unterricht
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#f3f4f6',
                      color: '#374151',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 800
                    }}>
                      <span style={{ fontSize: '14px' }}>🔥</span>
                      Übungsserie: {avatar?.streak_flame || 0} Tage
                    </div>
                  </div>
                </div>
                
                {/* Right Progress Ring */}
                <div style={{
                  position: 'relative',
                  width: '120px',
                  height: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <div style={{
                    position: 'absolute',
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2
                  }}>
                    <span style={{ fontSize: '32px' }}>🎵</span>
                  </div>
                  
                  <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', zIndex: 1 }}>
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="#5d60f5"
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - 0.42)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>""" + briefing_block_raw.replace("      {activeTab === 'briefing' && (", "").replace("display: 'flex', flexDirection: 'column', gap: '20px'", "display: 'flex', flexDirection: 'column', gap: '24px'")

# Rebuild new return block with 2-Column Responsive widescreen grid
new_return_content = """  return (
    <div style={{ 
      fontFamily: '"Outfit", "Inter", sans-serif', 
      maxWidth: parentActiveTab ? '100%' : '480px', 
      margin: '0 auto' 
    }}>
      
      {/* Top Tab Switcher (Hidden in laptop sidebar menu view) */}
      {!parentActiveTab && (
        <div style={{ 
          display: 'flex', 
          gap: '6px', 
          background: 'rgba(0, 0, 0, 0.04)', 
          padding: '5px', 
          borderRadius: '100px', 
          marginBottom: '28px',
          overflowX: 'auto',
          border: '1px solid rgba(0, 0, 0, 0.02)'
        }}>
          <button
            onClick={() => handleTabChangeLocal('briefing')}
            style={{
              flex: 1,
              border: 'none',
              background: activeTab === 'briefing' ? '#ffffff' : 'transparent',
              color: activeTab === 'briefing' ? '#0b57d0' : '#5f6368',
              padding: '10px 16px',
              borderRadius: '100px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: activeTab === 'briefing' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Coffee size={15} />
            <span>Briefing</span>
          </button>
          
          <button
            onClick={() => handleTabChangeLocal('songs')}
            style={{
              flex: 1.2,
              border: 'none',
              background: activeTab === 'songs' ? '#ffffff' : 'transparent',
              color: activeTab === 'songs' ? '#0b57d0' : '#5f6368',
              padding: '10px 16px',
              borderRadius: '100px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: activeTab === 'songs' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Music size={15} />
            <span>Songs & Material</span>
          </button>

          <button
            onClick={() => handleTabChangeLocal('practice_board')}
            style={{
              flex: 1.2,
              border: 'none',
              background: activeTab === 'practice_board' ? '#ffffff' : 'transparent',
              color: activeTab === 'practice_board' ? '#0b57d0' : '#5f6368',
              padding: '10px 16px',
              borderRadius: '100px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: activeTab === 'practice_board' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Clock size={15} />
            <span>Übe-Board</span>
          </button>

          <button
            onClick={() => handleTabChangeLocal('campus_cup')}
            style={{
              flex: 1.2,
              border: 'none',
              background: activeTab === 'campus_cup' ? '#ffffff' : 'transparent',
              color: activeTab === 'campus_cup' ? '#0b57d0' : '#5f6368',
              padding: '10px 16px',
              borderRadius: '100px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: activeTab === 'campus_cup' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Trophy size={15} />
            <span>Campus-Cup</span>
          </button>

          <button
            onClick={() => handleTabChangeLocal('hero')}
            style={{
              flex: 1,
              border: 'none',
              background: activeTab === 'hero' ? '#ffffff' : 'transparent',
              color: activeTab === 'hero' ? '#0b57d0' : '#5f6368',
              padding: '10px 16px',
              borderRadius: '100px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: activeTab === 'hero' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Star size={15} />
            <span>Mein Held</span>
          </button>
        </div>
      )}

      {/* 2-Column Responsive Widescreen Grid Container */}
      <div className="campus-grid-container" style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '32px',
        marginTop: '24px'
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media (min-width: 1024px) {
            .campus-grid-container {
              grid-template-columns: 1fr 380px !important;
              align-items: flex-start !important;
            }
          }
        ` }} />
        
        {/* Left Column: Active Tab Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
""" + f"\n{new_briefing_block}\n\n{songs_block}\n\n{practice_block}\n\n{campus_cup_block}\n\n{hero_block}\n" + """
        </div>
        
        {/* Right Column: Persistent Widescreen Sidebar (Nächste Termine / News Feed) */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Widget 1: Upcoming Lessons (Nächste Termine) */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: '24px',
            padding: '24px 28px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                <Clock size={16} color="#6366f1" /> NÄCHSTE TERMINE
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {upcomingLessons.map((item, idx) => {
                const dateStr = item.dateStr || '28.05';
                const parts = dateStr.split('.');
                const dayNum = parts[0] || '28';
                const monthNum = parseInt(parts[1] || '5', 10);
                const months = ['', 'JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];
                const monthStr = months[monthNum] || 'MAI';

                return (
                  <div key={item.id || idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '16px',
                    borderBottom: idx === upcomingLessons.length - 1 ? 'none' : '1px solid rgba(0, 0, 0, 0.04)',
                    gap: '14px'
                  }}>
                    {/* iOS Calendar Box */}
                    <div style={{
                      width: '46px',
                      height: '48px',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      flexShrink: 0
                    }}>
                      {/* Top Red Header */}
                      <div style={{
                        background: '#ef4444',
                        color: 'white',
                        fontSize: '9px',
                        fontWeight: 900,
                        textAlign: 'center',
                        padding: '2px 0',
                        letterSpacing: '0.05em'
                      }}>
                        {monthStr}
                      </div>
                      {/* Bottom White Number */}
                      <div style={{
                        flex: 1,
                        background: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 900,
                        color: '#1f2937'
                      }}>
                        {dayNum}
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4b5563' }}>
                        {item.weekday || 'Donnerstag'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1f2937' }}>
                          {item.time || '14:15 Uhr'}
                        </span>
                        <span style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {item.room || 'Raum 102'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => alert(`Verschiebe-Anfrage für den Termin am ${dateStr} wurde gesendet!`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#d97706',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Verschieben
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Möchtest du den Termin am ${dateStr} wirklich absagen?`)) {
                            alert("Der Termin wurde abgesagt. Dein Guthaben wurde erstattet.");
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Absagen
                      </button>
                    </div>
                  </div>
                );
              })}
              {upcomingLessons.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '12px', fontWeight: 700 }}>
                  Keine zukünftigen Termine vorhanden. 😴
                </div>
              )}
            </div>
          </div>

          {/* Widget 2: Live Campus News */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: '24px',
            padding: '24px 28px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              <Sparkles size={16} color="#f59e0b" /> LIVE CAMPUS FEED
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.82rem', color: '#4b5563', lineHeight: '1.4' }}>
                <span style={{ fontSize: '16px' }}>🚀</span>
                <div>
                  <strong>GrooveLab Band Challenge startet!</strong> Am Samstag geht es rund. Übe fleißig und sammle Extra-Punkte.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.82rem', color: '#4b5563', lineHeight: '1.4', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: '16px' }}>🎵</span>
                <div>
                  <strong>Neues Sound-Update:</strong> Jetzt gibt es verbesserte Playalongs im Übe-Board. Hör gleich rein!
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
"""

# Perform replacement
new_content = content[:start_idx] + new_return_content + content[end_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Dashboard returned layout successfully updated with ALL panels included!")
