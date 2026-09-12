import React from "react";
import { BookOpen, CheckCircle, Play, X } from "lucide-react";
import { getLehrwerkColor } from "../studentDateUtils";

export interface StudentLehrwerkDetailModalProps {
  book: any | null;
  onClose: () => void;
  lehrwerke: any[];
  progressItems: any[];
  localProgress: any[];
  studentId: string;
  isMobile?: boolean;
  handleTabChangeLocal: (tab: string, skipResetHwTab?: boolean) => void;
  setSelectedTopic: (topic: string) => void;
}

export const StudentLehrwerkDetailModal: React.FC<StudentLehrwerkDetailModalProps> = ({
  book,
  onClose,
  lehrwerke,
  progressItems,
  localProgress,
  studentId,
  isMobile = false,
  handleTabChangeLocal,
  setSelectedTopic,
}) => {
  if (!book) return null;


        const gradient = getLehrwerkColor(book.title, lehrwerke);
        
        // Find pages/chapters of this book and their status from localProgress and progressItems
        const pagesMap: Record<number, { status: string, notes: string, id?: string }> = {};
        
        // Load from progressItems (Supabase backend)
        progressItems.forEach(item => {
          if (item.topic_name.toLowerCase().startsWith(`${book.title.toLowerCase()} - seite `)) {
            const pageNum = parseInt(item.topic_name.split(' - Seite ')[1], 10);
            if (!isNaN(pageNum)) {
              pagesMap[pageNum] = {
                status: item.status,
                notes: item.teacher_notes || '',
                id: item.id
              };
            }
          }
        });

        // Supplement with localProgress (localStorage)
        const assignment = localProgress.find((p: any) => String(p.studentId) === String(studentId) && String(p.lehrwerkId) === String(book.id));
        if (assignment && assignment.pageStates) {
          Object.entries(assignment.pageStates).forEach(([pageNumStr, stateObj]: [string, any]) => {
            const pageNum = parseInt(pageNumStr, 10);
            if (!isNaN(pageNum)) {
              pagesMap[pageNum] = {
                status: stateObj.status === 'mastered' ? 'MASTERED' : 'IN_PROGRESS',
                notes: stateObj.notes || pagesMap[pageNum]?.notes || '',
                id: pagesMap[pageNum]?.id
              };
            }
          });
        }

        const sortedPages = Object.entries(pagesMap)
          .map(([numStr, details]) => ({ num: parseInt(numStr, 10), ...details }))
          .sort((a, b) => a.num - b.num);

        const activeCount = sortedPages.length;
        const masteredCount = sortedPages.filter(p => p.status === 'MASTERED').length;
        const totalPages = book.totalPages || 50;
        const pctActive = activeCount > 0 ? (masteredCount / activeCount) : 0;

        
return (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            background: 'rgba(9, 9, 11, 0.65)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: '"Plus Jakarta Sans", sans-serif'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: isMobile ? '0' : '28px',
              width: '100%',
              maxWidth: isMobile ? '100vw' : '880px',
              height: isMobile ? '100dvh' : 'auto',
              maxHeight: isMobile ? '100dvh' : '90vh',
              boxShadow: isMobile ? 'none' : '0 24px 60px -12px rgba(0, 0, 0, 0.20)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: isMobile ? 'none' : '1px solid #f1f5f9',
              position: 'relative'
            }} className={isMobile ? "mobile-modal-shell" : "animation-slide-up"}>
              
              {/* Header - Clean Apple Style */}
              <div style={{
                padding: isMobile ? 'max(12px, env(safe-area-inset-top, 12px)) 16px 12px 16px' : '18px 24px',
                background: '#ffffff',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 50,
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: `${gradient.from}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: gradient.from
                  }}>
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: isMobile ? '1.05rem' : '1.18rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      {book.title}
                    </h2>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                      {book.author ? `von ${book.author}` : 'Lehrwerk'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onClose()}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                  className="hover-scale-subtle"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Inside Content: Left Stage + Right Pages Flow */}
              <div
                style={{
                  display: 'flex',
                  flex: isMobile ? '1 1 0%' : 1,
                  minHeight: 0,
                  maxHeight: '100%',
                  overflowY: 'auto',
                  overscrollBehaviorY: 'contain',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                  padding: isMobile ? '16px 14px calc(80px + env(safe-area-inset-bottom, 24px)) 14px' : '24px',
                  gap: '24px',
                  flexDirection: isMobile ? 'column' : 'row'
                }}
                className={isMobile ? "mobile-scroll-container" : ""}
              >
                
                {/* Left Column (Stage & Progress Card) */}
                <div style={{
                  flex: isMobile ? 'none' : '0 0 280px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '20px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '14px'
                  }}>
                    {/* 3D Book Artwork */}
                    <div style={{ 
                      width: '90px', 
                      height: '120px', 
                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`, 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                      borderLeft: '4px solid rgba(255,255,255,0.4)',
                      flexShrink: 0
                    }}>
                      <BookOpen size={36} color={gradient.text} />
                    </div>

                    <div>
                      <h3 style={{ margin: '0 0 3px 0', fontSize: '1.10rem', fontWeight: 850, color: '#0f172a', wordBreak: 'break-word' }}>
                        {book.title}
                      </h3>
                      {book.author && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                          von {book.author}
                        </p>
                      )}
                    </div>

                    {/* Progress Card */}
                    <div style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #f1f5f9',
                      borderRadius: '14px',
                      padding: '14px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>Unterrichts-Fortschritt</span>
                        <span style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 850
                        }}>
                          {Math.round(pctActive * 100)}%
                        </span>
                      </div>

                      <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, pctActive * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
                      </div>

                      <span style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 650 }}>
                        {masteredCount} von {activeCount} aktiven Seiten gemeistert
                      </span>
                    </div>
                  </div>

                  {/* Primary CTA Button */}
                  <button
                    onClick={() => {
                      setSelectedTopic(book.title);
                      onClose();
                      handleTabChangeLocal('practice');
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '13px 18px',
                      borderRadius: '14px',
                      fontWeight: 850,
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(34, 197, 94, 0.28)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale-subtle"
                  >
                    <Play size={15} fill="white" color="white" />
                    <span>Gesamtes Lehrwerk üben</span>
                  </button>
                </div>

                {/* Right Column: Editorial Page Cards with 1-Click Practice */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
                    <div>
                      <h3 style={{ fontSize: '0.96rem', fontWeight: 850, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={15} color="#34a853" /> Aktive Buchseiten ({sortedPages.length})
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                        Tippe auf eine Seite, um gezielt dafür zu üben.
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sortedPages.map((page) => {
                      let badgeBg = '#f8fafc';
                      let badgeColor = '#64748b';
                      let badgeText = 'In Arbeit';

                      if (page.status === 'THEORY_DONE') {
                        badgeBg = '#f3e8ff';
                        badgeColor = '#7c3aed';
                        badgeText = 'Theorie gelesen';
                      } else if (page.status === 'MASTERED') {
                        badgeBg = '#dcfce7';
                        badgeColor = '#15803d';
                        badgeText = '✓ Gemeistert';
                      }

                      return (
                        <div key={page.num} style={{
                          background: '#ffffff',
                          border: '1px solid #f1f5f9',
                          padding: '14px 16px',
                          borderRadius: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          boxShadow: '0 2px 6px -1px rgba(0,0,0,0.03)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                              <span style={{
                                background: '#dcfce7',
                                color: '#15803d',
                                padding: '3px 9px',
                                borderRadius: '100px',
                                fontSize: '0.75rem',
                                fontWeight: 850,
                                flexShrink: 0
                              }}>
                                S. {page.num}
                              </span>
                              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', wordBreak: 'break-word' }}>
                                Seite {page.num}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              <span style={{
                                background: badgeBg,
                                color: badgeColor,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.66rem',
                                fontWeight: 850,
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em'
                              }}>
                                {badgeText}
                              </span>

                              {/* 1-Click Action Button for this specific page */}
                              <button
                                onClick={() => {
                                  setSelectedTopic(`${book.title} - Seite ${page.num}`);
                                  onClose();
                                  handleTabChangeLocal('practice');
                                }}
                                style={{
                                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '5px 12px',
                                  borderRadius: '100px',
                                  fontSize: '0.74rem',
                                  fontWeight: 850,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 2px 6px rgba(34, 197, 94, 0.25)',
                                  transition: 'all 0.15s ease'
                                }}
                                className="hover-scale-subtle"
                              >
                                <Play size={11} fill="white" color="white" />
                                <span>Üben</span>
                              </button>
                            </div>
                          </div>

                          {page.notes && (
                            <div style={{
                              background: '#f0fdf4',
                              border: '1px solid #dcfce7',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              fontSize: '0.76rem',
                              color: '#166534',
                              fontWeight: 650,
                              lineHeight: 1.4,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '6px'
                            }}>
                              <span>💡</span>
                              <span><strong>Tipp der Lehrkraft:</strong> {page.notes}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {sortedPages.length === 0 && (
                      <div style={{
                        padding: '32px 20px',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '0.82rem',
                        fontStyle: 'italic',
                        background: '#f8fafc',
                        borderRadius: '16px',
                        border: '1px solid #f1f5f9'
                      }}>
                        Hier sind aktuell noch keine einzelnen Seiten eingetragen.
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Bottom Clearance Spacer */}
                {isMobile && (
                  <div
                    style={{ height: 'calc(60px + env(safe-area-inset-bottom, 24px))', width: '100%', flexShrink: 0 }}
                    className="mobile-bottom-clearance-spacer"
                  />
                )}
              </div>
            </div>
          </div>
        );
      
};
