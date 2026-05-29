import React from 'react';

export function TestSongs({activeTab, progressLoading, progressItems}: any) {
  return (
    <>
      {activeTab === 'songs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {progressLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              Songs & Material werden geladen...
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '8px', borderRadius: '12px' }}>
                  <Music size={18} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', margin: 0 }}>[ SONGS & MATERIAL ]</h4>
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 600 }}>Deine Meilensteine & Hausaufgaben</p>
                </div>
              </div>

                {/* PREMIUM MODE: Beautiful tile grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Pinned current homework "Aktuelle Mission" */}
                  {progressItems.some(item => item.is_current_homework) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        🎯 Aktuelle Mission
                      </span>
                      {progressItems.filter(item => item.is_current_homework).map(item => {
                        let statusColor = '#eab308';
                        let statusBg = '#fffbeb';
                        let statusText = 'In Arbeit';

                        if (item.status === 'THEORY_DONE') {
                          statusColor = '#a855f7';
                          statusBg = '#f3e8ff';
                          statusText = 'Theorie gelesen';
                        } else if (item.status === 'MASTERED') {
                          statusColor = '#10b981';
                          statusBg = '#d1fae5';
                          statusText = 'Meisterwerk!';
                        }

                        return (
                          <div 
                            key={item.id} 
                            style={{
                              background: '#f0fdfa',
                              borderRadius: '20px',
                              border: '2px solid #06b6d4',
                              padding: '20px',
                              boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}
                            className="animate-pulse"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>
                                {item.topic_name}
                              </span>
                              <span style={{
                                background: statusBg,
                                color: statusColor,
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.7rem',
                                fontWeight: 900,
                                textTransform: 'uppercase'
                              }}>
                                {statusText}
                              </span>
                            </div>
                            {item.teacher_notes && (
                              <div style={{ background: 'white', padding: '12px 16px', borderRadius: '12px', border: '1px solid #ccfbf1', fontSize: '0.82rem', color: '#0f172a', fontWeight: 600, fontStyle: 'italic' }}>
                                Notiz: {item.teacher_notes}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Complete grid of song tiles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Deine Meilensteine
                    </span>
                    {progressItems.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        Noch keine Songs am Board.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="grid-cols-1 sm:grid-cols-2">
                        {progressItems.map(item => {
                          let tileBg = 'white';
                          let tileBorder = '1px solid #e2e8f0';
                          let badgeBg = '#f1f5f9';
                          let badgeColor = '#475569';
                          let badgeText = 'In Arbeit';

                          if (item.status === 'IN_PROGRESS') {
                            tileBg = '#fffbeb';
                            tileBorder = '1.5px solid #fef08a';
                            badgeBg = '#fef9c3';
                            badgeColor = '#854d0e';
                          } else if (item.status === 'THEORY_DONE') {
                            tileBg = '#faf5ff';
                            tileBorder = '1.5px solid #e9d5ff';
                            badgeBg = '#f3e8ff';
                            badgeColor = '#6b21a8';
                            badgeText = 'Theorie gelesen';
                          } else if (item.status === 'MASTERED') {
                            tileBg = '#f0fdf4';
                            tileBorder = '1.5px solid #a7f3d0';
                            badgeBg = '#d1fae5';
                            badgeColor = '#065f46';
                            badgeText = 'Meisterwerk!';
                          }

                          return (
                            <div 
                              key={item.id} 
                              style={{
                                background: tileBg,
                                border: item.is_current_homework ? '2px solid #06b6d4' : tileBorder,
                                borderRadius: '20px',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                boxShadow: item.is_current_homework ? '0 0 10px rgba(6, 182, 212, 0.1)' : 'none',
                                position: 'relative'
                              }}
                              className={item.is_current_homework ? 'animate-pulse' : 'hover-scale'}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>
                                  {item.topic_name}
                                </span>
                                <span style={{
                                  background: badgeBg,
                                  color: badgeColor,
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  fontSize: '0.62rem',
                                  fontWeight: 900,
                                  textTransform: 'uppercase',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {badgeText}
                                </span>
                              </div>
                              {item.teacher_notes && (
                                <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, fontWeight: 550, lineHeight: 1.3 }}>
                                  {item.teacher_notes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* BASIC MODE: Reduced plain text list & Stripe CTA */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Lifeless text list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {progressItems.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        Keine Einträge vorhanden.
                      </div>
                    ) : (
                      progressItems.map(item => (
                        <div 
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            background: '#f8fafc',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0'
                          }}
                        >
                          {/* Gray lifeless standard icon */}
                          <div style={{
                            background: '#e2e8f0',
                            color: '#94a3b8',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Music size={14} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b' }}>
                              {item.topic_name}
                            </span>
                            {/* Blurred teacher notes */}
                            <div 
                              className="blur-md select-none" 
                              style={{ 
                                fontSize: '0.72rem', 
                                color: '#94a3b8', 
                                marginTop: '4px',
                                userSelect: 'none'
                              }}
                            >
                              {item.teacher_notes}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
