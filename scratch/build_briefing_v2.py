import json

filename = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"
with open(filename, "r") as f:
    content = f.read()

# We need to replace everything inside:
# {activeTab === 'briefing' && ( ... )}
# Let's find the start and end.
import re

start_marker = "{activeTab === 'briefing' && ("
end_marker = "{activeTab === 'termine' && ("

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers.")
    exit(1)

new_briefing_ui = """{activeTab === 'briefing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* TOP 4 KPIs ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            
            {/* KPI 1: XP */}
            <div style={{ background: 'linear-gradient(135deg, #0b57d0 0%, #3b82f6 100%)', borderRadius: '16px', color: 'white', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 25px rgba(11, 87, 208, 0.15)' }}>
              <div style={{ padding: '20px', zIndex: 2 }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Urbanist', sans-serif" }}>{currentXp || 0}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '4px', opacity: 0.9 }}>Gesammelte XP</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.1)', padding: '10px 20px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', zIndex: 2 }}>LEVEL 1 ERREICHT</div>
              <div style={{ position: 'absolute', right: '-10px', top: '10px', opacity: 0.15, zIndex: 1 }}>
                <Star size={100} fill="currentColor" />
              </div>
            </div>

            {/* KPI 2: Songs */}
            <div style={{ background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', borderRadius: '16px', color: 'white', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 25px rgba(22, 163, 74, 0.15)' }}>
              <div style={{ padding: '20px', zIndex: 2 }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Urbanist', sans-serif" }}>{wrappedData?.monthlyFlashback?.masteredSongsCount || 0} <span style={{ fontSize: '1.2rem', opacity: 0.8 }}>/ 3</span></div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '4px', opacity: 0.9 }}>Verifizierte Songs</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.1)', padding: '10px 20px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', zIndex: 2 }}>SONG-ZIELE GESCHAFFT</div>
              <div style={{ position: 'absolute', right: '-10px', top: '10px', opacity: 0.15, zIndex: 1 }}>
                <Award size={100} />
              </div>
            </div>

            {/* KPI 3: Fokus */}
            <div style={{ background: 'linear-gradient(135deg, #eab308 0%, #facc15 100%)', borderRadius: '16px', color: '#1f2937', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 25px rgba(234, 179, 8, 0.15)' }}>
              <div style={{ padding: '20px', zIndex: 2 }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Urbanist', sans-serif" }}>{wrappedData?.monthlyFlashback?.focusMinutes || 0}m</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '4px', opacity: 0.9 }}>Übe-Minuten</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.05)', padding: '10px 20px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', zIndex: 2 }}>FOKUS DES MONATS</div>
              <div style={{ position: 'absolute', right: '-10px', top: '10px', opacity: 0.1, zIndex: 1 }}>
                <Clock size={100} />
              </div>
            </div>

            {/* KPI 4: Streak */}
            <div style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', borderRadius: '16px', color: 'white', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 25px rgba(234, 88, 12, 0.15)' }}>
              <div style={{ padding: '20px', zIndex: 2 }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, fontFamily: "'Urbanist', sans-serif" }}>{avatar?.streak_flame || 0}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '4px', opacity: 0.9 }}>Übungsserie (Tage)</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.1)', padding: '10px 20px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', zIndex: 2 }}>STARTE DEINE SERIE! ⚡️</div>
              <div style={{ position: 'absolute', right: '-10px', top: '10px', opacity: 0.15, zIndex: 1 }}>
                <Flame size={100} />
              </div>
            </div>

          </div>

          {/* MAIN 2-COLUMN LAYOUT */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
            
            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Welcome Block */}
              <div style={{ background: '#ffffff', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: '0 0 16px 0', color: '#1e293b', fontFamily: "'Urbanist', sans-serif" }}>
                  Hallo. <span style={{ color: '#0b57d0' }}>{user?.name || 'Schüler Patrick'} 👋</span>
                </h2>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, margin: 0, flex: 1, fontWeight: 500 }}>
                    Ein neuer Moment für Musik. Mit jeder kurzen Übungseinheit vertiefst du dein Gefühl für das Instrument. Nimm dir heute ein paar ruhige Minuten für deine Übungsziele – deine Serie bleibt dir damit sicher erhalten.
                  </p>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Music size={40} color="#0b57d0" strokeWidth={1.5} />
                  </div>
                </div>
                
                {briefingData?.todayLesson || scheduleOccurrences?.length > 0 ? (
                  <div style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', color: '#7c3aed', padding: '8px 16px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                    <Calendar size={14} />
                    <span>Nächster Unterricht: {briefingData?.todayLesson ? `Heute, ${briefingData.todayLesson.time} Uhr` : (() => {
                      const next = scheduleOccurrences[0];
                      if(!next) return 'Demnächst';
                      const d = new Date(next.date);
                      return `${d.toLocaleDateString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit'})} - ${next.schedule?.start_time?.substring(0,5)} Uhr`;
                    })()}</span>
                  </div>
                ) : (
                  <div style={{ marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', color: '#7c3aed', padding: '8px 16px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                    <Calendar size={14} />
                    <span>Nächster Unterricht: Demnächst</span>
                  </div>
                )}
              </div>

              {/* Hausaufgaben & Übesoll Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Hausaufgaben */}
                <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderLeft: '6px solid #22c55e' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>AKTUELLE HAUSAUFGABEN (2):</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎹 🎸 GrooveLab Guitar Vol. 1
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}><strong>S. 6</strong> Nr. 5 ist gut üben</span>
                      <div style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '4px', padding: '2px 4px' }}><Check size={14} strokeWidth={3} /></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}><strong>S. 7</strong> Inhalt der Seite üben und meistern! 📖</span>
                      <div style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '4px', padding: '2px 4px' }}><Check size={14} strokeWidth={3} /></div>
                    </div>
                  </div>
                </div>

                {/* Übesoll */}
                <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flex: 1 }}>
                    <div style={{ color: '#cbd5e1' }}>
                      <Flame size={32} fill="currentColor" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>TÄGLICHES ÜBESOLL (HEUTE)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Tägliche Übezeit noch offen</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>Starte jetzt deinen Fokus-Übemodus, um deine Flammen zu schützen! ⚡️</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('practice_board')}
                    style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', padding: '12px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}>
                    🚀 Üben starten
                  </button>
                </div>
              </div>

              {/* Flame Tiers */}
              <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>🔥 Übe-Serie & Flammen</h3>
                  <div style={{ background: '#ffedd5', color: '#ea580c', fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: '100px' }}>0 Tage</div>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#ef4444' }}>🔥 Helden-Feuer aktiv! Mindestzeit: 10 Min.</span>
                  <span style={{ color: '#eab308' }}>🔥 Serie aktiv! Täglich mindestens 10 Min. ⚡️</span>
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                  {/* Kleine Flamme */}
                  <div style={{ background: '#fef08a', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '100px' }}>
                    <div style={{ color: '#eab308' }}><Flame size={24} fill="currentColor" /></div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#854d0e' }}>Kleine Flamme</div>
                    <div style={{ fontSize: '0.65rem', color: '#a16207' }}>Stufe 1 (Tag 3+) | 3 Min |</div>
                  </div>
                  {/* Mittlere Flamme */}
                  <div style={{ background: '#ffedd5', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '100px' }}>
                    <div style={{ color: '#f97316' }}><Flame size={24} fill="currentColor" /></div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#9a3412' }}>Mittlere Flamme</div>
                    <div style={{ fontSize: '0.65rem', color: '#c2410c' }}>Stufe 2 (Tag 6+) | 5 Min |</div>
                  </div>
                  {/* Helden-Feuer */}
                  <div style={{ background: '#fee2e2', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '100px' }}>
                    <div style={{ color: '#ef4444' }}><Flame size={24} fill="currentColor" /></div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#991b1b' }}>Helden-Feuer</div>
                    <div style={{ fontSize: '0.65rem', color: '#b91c1c' }}>Stufe 3 (Tag 9+) | 10 Min |</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>👍 Joker bereit</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>Test:</span>
                    <select style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem' }}><option>Tag 0</option></select>
                    <select style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem' }}><option>0 Fehl</option></select>
                    <button style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600 }}>Real Geübt</button>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Nächste Termine */}
              <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="#ef4444" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Nächste Termine</h3>
                  </div>
                  <button onClick={() => handleTabChangeLocal('termine')} style={{ background: 'transparent', border: 'none', color: '#0b57d0', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Alle anzeigen</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {scheduleOccurrences && scheduleOccurrences.length > 0 ? scheduleOccurrences.slice(0,3).map(occ => {
                    const d = new Date(occ.date);
                    const isCanceled = occ.status === 'canceled_by_student' || occ.status === 'teacher_sick';
                    return (
                      <div key={occ.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', opacity: isCanceled ? 0.6 : 1 }}>
                        <div style={{ width: '48px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                          <div style={{ background: '#ef4444', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '4px 0', textTransform: 'uppercase' }}>{d.toLocaleDateString('de-DE', {month: 'short'})}</div>
                          <div style={{ background: 'white', color: '#1e293b', fontSize: '1.2rem', fontWeight: 900, padding: '6px 0' }}>{d.toLocaleDateString('de-DE', {day: '2-digit'})}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>{d.toLocaleDateString('de-DE', {weekday: 'long'})}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{occ.schedule?.start_time?.substring(0,5)} <span style={{ color: '#22c55e' }}>Groovelab</span></div>
                        </div>
                        {isCanceled && (
                          <div style={{ background: '#fee2e2', color: '#ef4444', fontSize: '0.65rem', fontWeight: 800, padding: '4px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>Abgesagt</div>
                        )}
                      </div>
                    );
                  }) : (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>Keine Termine verfügbar.</div>
                  )}
                </div>
              </div>

              {/* LIVE CAMPUS FEED */}
              <div style={{ background: '#ffffff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                  <Sparkles size={18} color="#eab308" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Campus Feed</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Feed Item 1 */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ background: '#fef08a', color: '#854d0e', fontSize: '0.65rem', fontWeight: 800, padding: '4px 8px', borderRadius: '100px' }}>AKTION</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Heute</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>🎸 Sommer Rock-Bandcamp 2026</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>Melde dich jetzt für unser Band-Camp an! Frist endet in 4 Tagen.</div>
                  </div>

                  {/* Feed Item 2 */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '0.65rem', fontWeight: 800, padding: '4px 8px', borderRadius: '100px' }}>WICHTIG</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Vor 2 Tagen</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>🎹 Neue Digitalpianos im Studio 3</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>Ab sofort stehen euch 4 neue Yamaha Masterpianos zum Üben bereit!</div>
                  </div>

                  {/* Feed Item 3 */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.65rem', fontWeight: 800, padding: '4px 8px', borderRadius: '100px' }}>ERFOLG</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Vor 3 Tagen</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>🎉 Stuttgart knackt die 400</div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>Über 400 aktive Musiker am Campus Stuttgart! Wir feiern euch.</div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}"""

new_content = content[:start_idx] + new_briefing_ui + content[end_idx:]

with open(filename, "w") as f:
    f.write(new_content)

print("Briefing V2 UI updated.")
