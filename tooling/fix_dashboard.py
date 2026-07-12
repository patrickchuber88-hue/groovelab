with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

import re

# Action Panel Block
action_panel = """
      {/* Action Panel (Right) - Now Global for Admin Dashboard */}
      <aside className="admin-action-panel no-print">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="#ef4444" /> Hilfe-Rufe ({helpRequests.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            {helpRequests.map(hr => (
              <div key={hr.id} className="action-card pulse-yellow" style={{ borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#b45309' }}>{hr.stations?.name || 'Mobil'}</div>
                <div style={{ fontSize: '0.75rem', color: '#b45309', opacity: 0.8, marginTop: '2px' }}>{hr.users?.first_name} braucht Unterstützung</div>
                <button 
                  onClick={async () => {
                    await supabase.from('help_requests').update({ status: 'resolved' }).eq('id', hr.id);
                    fetchMonitoringData();
                  }}
                  style={{ marginTop: '10px', width: '100%', background: '#f59e0b', color: 'white', border: 'none', padding: '6px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Quittieren
                </button>
              </div>
            ))}
            {helpRequests.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', border: '1px dashed #e2e8f0', borderRadius: '12px' }}>
                Keine aktiven Hilfe-Rufe
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Monitor size={18} color={brandColor} /> Lab-Auslastung
          </h3>
          <div style={{ marginTop: '16px', background: '#f8fafc', padding: '20px', borderRadius: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: brandColor }}>{activeSessions.length}<span style={{ fontSize: '1rem', color: '#94a3b8' }}>/8</span></div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>Plätze belegt</div>
            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', marginTop: '12px', overflow: 'hidden' }}>
              <div style={{ width: f"{(activeSessions.length / 8) * 100}%", height: '100%', background: brandColor, transition: 'width 0.5s ease' }}></div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={18} color="#eab308" /> Heutige Highlights
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
             <div className="action-card" style={{ fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 800 }}>Mika S.</span> hat Level 2 auf den <span style={{ color: brandColor }}>Drums</span> erreicht! 🏆
             </div>
             <div className="action-card" style={{ fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 800 }}>Neuer Song</span> in der Bibliothek: "Flowers" von Miley Cyrus.
             </div>
          </div>
        </div>
      </aside>
"""

# Replace the end of the file
pattern = r'</main>\s+</div>\s+\);\s+\}'
replacement = f'</main>{action_panel}    </div>\n  );\n}}'

new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(new_content)
