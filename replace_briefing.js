const fs = require('fs');
const filePath = 'apps/groovelab/src/components/MasterAdminDashboard.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(line => line.includes("activePortalTab === 'briefing' ? ("));
const endIndex = lines.findIndex(line => line.includes(") : activePortalTab === 'billing' ? ("));

console.log('Start index:', startIndex);
console.log('End index:', endIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find start or end index');
  process.exit(1);
}

const before = lines.slice(0, startIndex + 1);
const after = lines.slice(endIndex);

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
};

const newBriefing = `
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-in">
              {/* Header Panel - Greeting */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
                    Guten Morgen, Patrick.
                  </h2>
                  <p style={{ margin: '6px 0 0 0', fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>
                    Hier ist dein System-Briefing für heute.
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={fetchPendingUsers}
                    disabled={loadingPending}
                    style={{
                      padding: '12px 18px',
                      borderRadius: '14px',
                      background: '#ffffff',
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      color: '#475569',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 10px rgba(15, 23, 42, 0.02)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#ea4335';
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.borderColor = '#ea4335';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.color = '#475569';
                      e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)';
                    }}
                  >
                    <RefreshCw size={14} className={loadingPending ? 'animate-spin' : ''} /> Aktualisieren
                  </button>
                </div>
              </div>

              {/* Stats Cards Dashboard (System Overview) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '24px'
              }}>
                {/* Total Schools */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '24px',
                  padding: '24px',
                  border: '1px solid rgba(15, 23, 42, 0.05)',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.2s',
                  cursor: 'default'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={24} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'block' }}>{stats.totalSchools}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schulen</span>
                  </div>
                </div>

                {/* Total Teachers */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '24px',
                  padding: '24px',
                  border: '1px solid rgba(15, 23, 42, 0.05)',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.2s',
                  cursor: 'default'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Award size={24} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'block' }}>{stats.totalTeachers}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lehrkräfte</span>
                  </div>
                </div>

                {/* Total Students */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '24px',
                  padding: '24px',
                  border: '1px solid rgba(15, 23, 42, 0.05)',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.2s',
                  cursor: 'default'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'block' }}>{stats.totalStudents}</strong>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schüler</span>
                  </div>
                </div>

                {/* Pending Activations (Red Highlight) */}
                <div style={{
                  background: pendingUsers.length > 0 ? 'rgba(234, 67, 53, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '24px',
                  padding: '24px',
                  border: pendingUsers.length > 0 ? '1px solid rgba(234, 67, 53, 0.2)' : '1px solid rgba(15, 23, 42, 0.05)',
                  boxShadow: pendingUsers.length > 0 ? '0 10px 30px rgba(234, 67, 53, 0.1)' : '0 10px 30px rgba(15, 23, 42, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.2s',
                  cursor: 'default'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: pendingUsers.length > 0 ? 'rgba(234, 67, 53, 0.15)' : 'rgba(100, 116, 139, 0.1)', color: pendingUsers.length > 0 ? '#ea4335' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={24} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '2rem', fontWeight: 900, color: pendingUsers.length > 0 ? '#ea4335' : '#0f172a', fontFamily: '"Outfit", sans-serif', display: 'block' }}>{pendingUsers.length}</strong>
                    <span style={{ fontSize: '0.85rem', color: pendingUsers.length > 0 ? '#ea4335' : '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ausstehende Aktivierungen</span>
                  </div>
                </div>
              </div>

              {/* Action Required: Aktivierungs-Center */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Aktionsbedarf</h3>
                  {pendingUsers.length > 0 && (
                    <span style={{ background: '#ea4335', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                      {pendingUsers.length} offen
                    </span>
                  )}
                </div>

                {pendingUsers.length === 0 ? (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: '24px',
                    border: '1px dashed rgba(15, 23, 42, 0.15)',
                    padding: '60px 40px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={32} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Alles erledigt!</h4>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Es liegen aktuell keine offenen Aktivierungen vor. Genieß den Tag.</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '24px', minHeight: '520px', alignItems: 'stretch' }}>
                    
                    {/* Left Pane: List of pending users */}
                    <div style={{
                      flex: '0 0 45%',
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(16px)',
                      borderRadius: '24px',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }}>
                      {/* Batch Action Bar if selected */}
                      {selectedUserIds.length > 0 && (
                        <div style={{ padding: '12px 20px', background: 'rgba(234, 67, 53, 0.05)', borderBottom: '1px solid rgba(234, 67, 53, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ea4335' }}>
                            {selectedUserIds.length} ausgewählt
                          </span>
                          <button
                            onClick={() => handleBatchActivateUsers(selectedUserIds)}
                            disabled={loadingPending}
                            style={{
                              padding: '8px 14px',
                              borderRadius: '10px',
                              background: '#ea4335',
                              border: 'none',
                              color: '#ffffff',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 12px rgba(234, 67, 53, 0.3)',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(234, 67, 53, 0.4)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 67, 53, 0.3)'; }}
                          >
                            Ausgewählte freischalten
                          </button>
                        </div>
                      )}

                      {/* Search Bar inside pane */}
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15, 23, 42, 0.05)', position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '32px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                          type="text"
                          value={pendingSearchQuery}
                          onChange={(e) => setPendingSearchQuery(e.target.value)}
                          placeholder="Suche Name, Schule, Ausweis-Nr..."
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '10px 14px 10px 36px',
                            borderRadius: '12px',
                            border: '1px solid rgba(15, 23, 42, 0.08)',
                            background: '#f8fafc',
                            color: '#0f172a',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = '#ea4335'; e.currentTarget.style.background = '#ffffff'; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.08)'; e.currentTarget.style.background = '#f8fafc'; }}
                        />
                      </div>

                      {/* Bulk Select Utility bar */}
                      <div style={{
                        padding: '10px 20px',
                        background: '#f8fafc',
                        borderBottom: '1px solid rgba(15, 23, 42, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        color: '#64748b',
                        fontWeight: 600
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={pendingUsers.length > 0 && selectedUserIds.length === pendingUsers.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds(pendingUsers.map(u => u.id));
                              } else {
                                setSelectedUserIds([]);
                              }
                            }}
                            style={{ width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer', accentColor: '#ea4335' }}
                          />
                          <span>Alle {pendingUsers.length} auswählen</span>
                        </label>
                      </div>

                      {/* Scrollable list */}
                      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '450px', padding: '12px' }}>
                        {loadingPending ? (
                          <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '28px', height: '28px', border: '3px solid rgba(234, 67, 53, 0.1)', borderTopColor: '#ea4335', borderRadius: '50%' }} className="animate-spin" />
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Lade Schüler...</span>
                          </div>
                        ) : (
                          (() => {
                            const filtered = pendingUsers.filter(u => {
                              const name = \`\${u.first_name || ''} \${u.last_name || ''}\`.toLowerCase();
                              const schoolName = (schools.find(s => s.id === u.school_id)?.name || '').toLowerCase();
                              const refCode = \`CG-\${u.ausweis_nummer || ''}\`.toLowerCase();
                              const query = pendingSearchQuery.toLowerCase();
                              return name.includes(query) || schoolName.includes(query) || refCode.includes(query);
                            });

                            if (filtered.length === 0) {
                              return (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>Keine Treffer</div>
                                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>Die Suche ergab keine Ergebnisse.</div>
                                </div>
                              );
                            }

                            return filtered.map(u => {
                              const school = schools.find(s => s.id === u.school_id);
                              const isSelected = selectedUserIds.includes(u.id);
                              const isFocused = selectedUser?.id === u.id;
                              
                              // Format creation date
                              const ageStr = u.created_at ? (() => {
                                const diff = Date.now() - new Date(u.created_at).getTime();
                                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                if (days === 0) return 'Heute';
                                if (days === 1) return 'Gestern';
                                return \`Vor \${days} Tagen\`;
                              })() : '';

                              return (
                                <div
                                  key={u.id}
                                  onClick={() => setSelectedUser(u)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '14px',
                                    borderRadius: '16px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                    background: isFocused ? 'rgba(234, 67, 53, 0.06)' : 'transparent',
                                    border: isFocused ? '1px solid rgba(234, 67, 53, 0.15)' : '1px solid transparent',
                                    marginBottom: '8px'
                                  }}
                                  className="activation-list-item"
                                  onMouseOver={(e) => { if (!isFocused) e.currentTarget.style.background = '#f8fafc'; }}
                                  onMouseOut={(e) => { if (!isFocused) e.currentTarget.style.background = 'transparent'; }}
                                >
                                  {/* Selection Checkbox */}
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedUserIds(prev => [...prev, u.id]);
                                      } else {
                                        setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                                      }
                                    }}
                                    style={{ width: '18px', height: '18px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0, accentColor: '#ea4335' }}
                                  />

                                  {/* Student Initials Avatar */}
                                  <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    background: school?.primary_color ? \`\${school.primary_color}15\` : 'rgba(15, 23, 42, 0.05)',
                                    color: school?.primary_color || '#0f172a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.9rem',
                                    fontWeight: 800,
                                    flexShrink: 0
                                  }}>
                                    {(u.first_name?.[0] || '') + (u.last_name?.[0] || '')}
                                  </div>

                                  {/* User Info details */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                      <strong style={{ fontSize: '0.95rem', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>
                                        {u.first_name} {u.last_name}
                                      </strong>
                                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{ageStr}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                      <span style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 750,
                                        color: school?.primary_color || '#64748b',
                                        background: school?.primary_color ? \`\${school.primary_color}0d\` : '#f1f5f9',
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '140px'
                                      }}>
                                        {school?.name || 'Unbekannte Schule'}
                                      </span>
                                      <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 800, color: '#334155', background: '#e2e8f0', padding: '4px 8px', borderRadius: '8px' }}>
                                        CG-{u.ausweis_nummer || 'OHNE'}
                                      </span>
                                      {!u.is_campus_active ? (
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ea4335', background: 'rgba(234, 67, 53, 0.1)', padding: '4px 8px', borderRadius: '8px' }}>
                                          Neu
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '4px 8px', borderRadius: '8px' }}>
                                          Zahlung offen
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()
                        )}
                      </div>
                    </div>

                    {/* Right Pane: Detailed View and Actions */}
                    <div style={{
                      flex: '0 0 55%',
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(16px)',
                      borderRadius: '24px',
                      border: '1px solid rgba(15, 23, 42, 0.06)',
                      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.03)',
                      padding: '32px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: selectedUser ? 'flex-start' : 'center',
                      alignItems: selectedUser ? 'stretch' : 'center',
                      textAlign: selectedUser ? 'left' : 'center'
                    }}>
                      {selectedUser ? (
                        (() => {
                          const u = selectedUser;
                          const school = schools.find(s => s.id === u.school_id);
                          const refCode = \`CG-\${u.ausweis_nummer || 'OHNE'}\`;
                          const isActivating = activatingUserId === u.id;
                          
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }} className="animate-fade-in">
                              {/* Profile Header */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}>
                                <div style={{
                                  width: '64px',
                                  height: '64px',
                                  borderRadius: '50%',
                                  background: school?.primary_color ? \`\${school.primary_color}1a\` : 'rgba(15, 23, 42, 0.05)',
                                  color: school?.primary_color || '#0f172a',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.4rem',
                                  fontWeight: 900
                                }}>
                                  {(u.first_name?.[0] || '') + (u.last_name?.[0] || '')}
                                </div>
                                <div>
                                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                                    {u.first_name} {u.last_name}
                                  </h3>
                                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Rolle: Schüler (Campus-Groovelab)</span>
                                </div>
                              </div>

                              {/* Details List */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Musikschule</span>
                                  <strong style={{ fontSize: '0.95rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                    {school?.name || 'Unbekannte Schule'}
                                  </strong>
                                </div>
                                <div>
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zahlungsmethode</span>
                                  <strong style={{ fontSize: '0.95rem', color: '#334155', display: 'block', marginTop: '4px' }}>
                                    {u.student_billing_payment_method === 'bank_transfer' ? 'Überweisung (Vorkasse)' : u.student_billing_payment_method}
                                  </strong>
                                </div>
                              </div>

                              {/* Reference Code Match Card (Apple-Style Highlight) */}
                              <div style={{
                                background: '#f8fafc',
                                borderRadius: '16px',
                                padding: '20px 24px',
                                border: '1px solid rgba(15, 23, 42, 0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                              }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verwendungszweck für Kontomuster</span>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                                  <code style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                                    {refCode}
                                  </code>
                                  
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(refCode);
                                      setCopiedCodeId(u.id);
                                      setTimeout(() => setCopiedCodeId(null), 2000);
                                    }}
                                    style={{
                                      background: copiedCodeId === u.id ? '#ea4335' : '#ffffff',
                                      color: copiedCodeId === u.id ? '#ffffff' : '#475569',
                                      border: copiedCodeId === u.id ? '1px solid #ea4335' : '1px solid rgba(15, 23, 42, 0.08)',
                                      borderRadius: '12px',
                                      padding: '10px 16px',
                                      fontSize: '0.85rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      transition: 'all 0.2s',
                                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
                                    }}
                                  >
                                    {copiedCodeId === u.id ? (
                                      <>Kopiert ✓</>
                                    ) : (
                                      <>
                                        <Copy size={14} /> Kopieren
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Fee calculation details */}
                              <div style={{
                                background: 'rgba(234, 67, 53, 0.03)',
                                border: '1px solid rgba(234, 67, 53, 0.1)',
                                borderRadius: '16px',
                                padding: '20px 24px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <div>
                                  <strong style={{ display: 'block', fontSize: '0.9rem', color: '#991b1b' }}>Zu zahlender Gesamtbetrag:</strong>
                                  <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 650 }}>Monatliche Lizenzgebühr (inkl. MwSt.)</span>
                                </div>
                                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#991b1b' }}>
                                  {priceStudent} €
                                </span>
                              </div>

                              {/* Large Action Buttons */}
                              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                  onClick={() => handleActivateUser(u.id)}
                                  disabled={isActivating}
                                  style={{
                                    width: '100%',
                                    padding: '18px',
                                    borderRadius: '16px',
                                    background: '#ea4335',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontSize: '1rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    boxShadow: '0 8px 24px rgba(234, 67, 53, 0.3)',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                  }}
                                  onMouseOver={(e) => {
                                    if (!isActivating) {
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(234, 67, 53, 0.4)';
                                    }
                                  }}
                                  onMouseOut={(e) => {
                                    if (!isActivating) {
                                      e.currentTarget.style.transform = 'none';
                                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(234, 67, 53, 0.3)';
                                    }
                                  }}
                                >
                                  {isActivating ? (
                                    <><div className="animate-spin" style={{ width: '18px', height: '18px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> Aktiviere...</>
                                  ) : (
                                    <><Check size={20} /> Zahlung erhalten & Account freischalten</>
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => setSelectedUser(null)}
                                  style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '16px',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    color: '#64748b',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                                  onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                                >
                                  Abbrechen
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div style={{ color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(15, 23, 42, 0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={32} style={{ color: '#94a3b8' }} />
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <strong style={{ fontSize: '1.2rem', color: '#0f172a', display: 'block', marginBottom: '8px', fontWeight: 800 }}>Kein Schüler ausgewählt</strong>
                            <span style={{ fontSize: '0.95rem', lineHeight: '1.5', display: 'block', maxWidth: '300px', margin: '0 auto' }}>Wähle einen Schüler aus der Liste aus, um Zahlungsdetails einzusehen und den Account freizuschalten.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
`;

const newContent = [...before, newBriefing, ...after].join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully updated Briefing Board');
