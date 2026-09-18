import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Printer, X } from 'lucide-react';
import { IDBadgeCard } from '../IDBadgeCard';

export interface AdminIDGalleryViewProps {
  users: any[];
  brandColor: string;
  onShowQR: (user: any) => void;
  activePlatform?: string;
}

export const AdminIDGalleryView: React.FC<AdminIDGalleryViewProps> = ({
  users,
  brandColor,
  onShowQR,
  activePlatform
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'teacher' | 'student' | 'vocalist'>('all');
  const [selectedPrintIds, setSelectedPrintIds] = useState<Record<string, boolean>>({});

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filterType === 'all') {
      return true;
    } else if (filterType === 'teacher') {
      return u.role === 'teacher' || u.role === 'admin';
    } else if (filterType === 'student') {
      return u.role === 'student' && !u.is_external_vocalist;
    } else if (filterType === 'vocalist') {
      return u.is_external_vocalist;
    }
    return true;
  });

  const toggleSelectForPrint = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPrintIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const selectAllForPrint = () => {
    const next: Record<string, boolean> = {};
    filteredUsers.forEach(u => {
      next[u.id] = true;
    });
    setSelectedPrintIds(next);
  };

  const clearAllForPrint = () => {
    setSelectedPrintIds({});
  };

  const selectedUsers = filteredUsers.filter(u => selectedPrintIds[u.id]);
  const selectedCount = selectedUsers.length;
  const pageCount = Math.ceil(selectedCount / 9);

  return (
    <div style={{ marginTop: '0px' }}>
      <style>{`
        .id-card-hover {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .id-card-hover:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: 0 30px 60px rgba(0,0,0,0.15) !important;
          z-index: 10;
        }

        #print-id-cards-container {
          display: none !important;
        }

        @media print {
          #root {
            display: none !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          #print-id-cards-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
          }

          #print-id-cards-container img {
            opacity: 1 !important;
          }

          .print-page {
            width: 210mm !important;
            height: 297mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            padding: 15mm 15mm !important;
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            grid-template-rows: repeat(3, 1fr) !important;
            gap: 12px !important;
            background: white !important;
          }

          .print-page:not(:last-child) {
            page-break-after: always !important;
            break-after: page !important;
          }

          .print-card-wrapper {
            box-sizing: border-box !important;
            border: 1px dashed #cbd5e1 !important;
            padding: 6px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
          }
        }
      `}</style>
      
      <div className="glass-panel" style={{ padding: '40px', background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(20px)', borderRadius: '32px', border: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)' }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px', letterSpacing: '-0.03em' }}>ID Gallerie</h2>
            <p style={{ color: '#64748b', fontWeight: 500 }}>Vollständige Galerie aller Lehrer und Schüler im Event-Stil.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {/* Filter Switch */}
            <div style={{ background: 'rgba(241, 245, 249, 0.8)', padding: '4px', borderRadius: '14px', display: 'flex', gap: '4px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
              {[
                { type: 'all', label: 'Alle' },
                { type: 'teacher', label: 'Lehrer' },
                { type: 'student', label: 'Schüler' },
                { type: 'vocalist', label: 'Gesangsschüler' }
              ].map(opt => (
                <button 
                  key={opt.type}
                  onClick={() => setFilterType(opt.type as any)}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '10px', 
                    border: 'none', 
                    background: filterType === opt.type ? 'white' : 'transparent',
                    color: filterType === opt.type ? '#1e293b' : '#94a3b8',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    boxShadow: filterType === opt.type ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Name suchen..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 12px 12px 48px', 
                  borderRadius: '14px', 
                  border: '1px solid rgba(255,255,255,0.5)', 
                  background: 'rgba(255,255,255,0.8)',
                  color: '#1e293b',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  outline: 'none'
                }} 
              />
            </div>
          </div>
        </div>
        
        <div className="id-gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px' }}>
          {filteredUsers.map(u => (
            <IDBadgeCard 
              key={u.id}
              user={u} 
              activePlatform={activePlatform} 
              selectedPrint={selectedPrintIds[u.id]} 
              onToggleSelectPrint={(e) => toggleSelectForPrint(u.id, e)} 
              onClick={() => onShowQR(u)} 
              style={{ width: '100%', height: 'auto', aspectRatio: '0.62', cursor: 'pointer' }} 
              showSubtext={false} 
            />
          ))}
        </div>
      </div>

      {/* Floating Action Panel for printing */}
      {selectedCount > 0 && (
        <div 
          role="toolbar"
          aria-label="Aktionen für ausgewählte Ausweise"
          style={{
          position: 'fixed',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '16px 28px',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          zIndex: 9999,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
          color: 'white',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <style>{`
            @keyframes slideUp {
              from { transform: translate(-50%, 50px); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>
              {selectedCount} {selectedCount === 1 ? 'Ausweis' : 'Ausweise'} ausgewählt
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
              Benötigt {pageCount} {pageCount === 1 ? 'DIN A4 Seite' : 'DIN A4 Seiten'}
            </span>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)' }} />

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={selectAllForPrint}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#f8fafc',
                padding: '10px 16px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            >
              Alle auswählen
            </button>
            
            <button
              onClick={clearAllForPrint}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                padding: '10px 16px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              Auswahl aufheben
            </button>

            <button
              onClick={() => window.print()}
              style={{
                background: '#ea4335',
                border: 'none',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(234, 67, 53, 0.3)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#d93025'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#ea4335'}
            >
              <Printer size={16} />
              Drucken
            </button>

            <button
              onClick={clearAllForPrint}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: '#cbd5e1',
                padding: '10px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Hidden Print Container */}
      {selectedCount > 0 && createPortal(
        <div id="print-id-cards-container">
          {Array.from({ length: pageCount }).map((_, pageIdx) => {
            const pageUsers = selectedUsers.slice(pageIdx * 9, (pageIdx + 1) * 9);
            return (
              <div key={pageIdx} className="print-page">
                {pageUsers.map(u => {
                  return (
                    <div key={u.id} className="print-card-wrapper">
                      <IDBadgeCard 
                        user={u} 
                        activePlatform={activePlatform} 
                        isPrintVersion={true}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export const IDGallery = AdminIDGalleryView;
export default AdminIDGalleryView;
