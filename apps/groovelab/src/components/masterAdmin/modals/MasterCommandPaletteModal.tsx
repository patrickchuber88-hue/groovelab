import React from 'react';
import { 
  Search, Activity, Layers, Clock, Receipt, Cpu, Tag, Wrench, Database, Building2
} from 'lucide-react';
import type { School } from '../MasterAdminTypes';

interface MasterCommandPaletteModalProps {
  isOpen: boolean;
  search: string;
  setSearch: (query: string) => void;
  onClose: () => void;
  onNavigateTab: (tabId: any) => void;
  schools: School[];
  onSelectSchool: (school: School) => void;
}

export const MasterCommandPaletteModal: React.FC<MasterCommandPaletteModalProps> = ({
  isOpen,
  search,
  setSearch,
  onClose,
  onNavigateTab,
  schools,
  onSelectSchool
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh'
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Befehlspalette und Schnellsuche"
        style={{
          width: '640px',
          maxWidth: '92vw',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15, 23, 42, 0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Search size={20} color="#64748b" />
          <input
            type="text"
            autoFocus
            placeholder="Tippe einen Befehl oder suche nach Schulen, Aktivierungen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '1.05rem',
              fontWeight: 600,
              color: '#0f172a',
              background: 'transparent'
            }}
          />
          <kbd style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>ESC</kbd>
        </div>

        {/* Search Results / Command Groups */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px' }}>
            Navigation &amp; Boards
          </div>

          {[
            { id: 'executive', label: 'Master Cockpit', desc: 'MRR, ARR & Platform Status', icon: <Activity size={16} color="#ea4335" /> },
            { id: 'schools', label: 'Schulen & Tenants', desc: 'Musikschulen verwalten & anlegen', icon: <Layers size={16} color="#475569" /> },
            { id: 'briefing', label: 'Briefing Board', desc: 'Schüler-Aktivierungen & CG-Hashes', icon: <Clock size={16} color="#475569" /> },
            { id: 'billing', label: 'Financial Control', desc: 'Rechnungen RE-... und CG-...', icon: <Receipt size={16} color="#475569" /> },
            { id: 'telemetry', label: 'Telemetrie & Health', desc: 'Server CPU, RAM & DB Telemetrie', icon: <Cpu size={16} color="#475569" /> },
            { id: 'pricing', label: 'Preise & Kampagnen', desc: 'Standard-Abonnementpreise & Rabatt-Aktionen', icon: <Tag size={16} color="#475569" /> },
            { id: 'maintenance', label: 'Wartung & Betrieb', desc: 'Notfall-Killswitch, Live-Countdown & Broadcast-Banner', icon: <Wrench size={16} color="#475569" /> },
            { id: 'backup', label: 'Backup & Reset', desc: 'PostgreSQL-Snapshots, DSGVO Art. 20 Export & Resets', icon: <Database size={16} color="#475569" /> },
            { id: 'operator', label: 'Betreiber & Zugang', desc: 'Betreibergesellschaft, Bankkonto & Root-Zugang', icon: <Building2 size={16} color="#475569" /> }
          ]
          .filter(item => !search || item.label.toLowerCase().includes(search.toLowerCase()) || item.desc.toLowerCase().includes(search.toLowerCase()))
          .map(item => (
            <div
              key={item.id}
              onClick={() => {
                onNavigateTab(item.id);
                onClose();
                setSearch('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {item.icon}
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>{item.label}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.desc}</span>
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Öffnen ↵</span>
            </div>
          ))}

          {/* Matching Schools */}
          {schools.filter(s => search && s.name?.toLowerCase().includes(search.toLowerCase())).length > 0 && (
            <>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '14px 12px 6px 12px', borderTop: '1px solid rgba(15, 23, 42, 0.05)' }}>
                Gefundene Schulen
              </div>
              {schools
                .filter(s => search && s.name?.toLowerCase().includes(search.toLowerCase()))
                .slice(0, 5)
                .map(school => (
                  <div
                    key={school.id}
                    onClick={() => {
                      onSelectSchool(school);
                      onClose();
                      setSearch('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: school.primary_color || '#3b82f6' }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{school.name}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#059669', background: 'rgba(16, 185, 129, 0.08)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                      Inspektion Drawer ↵
                    </span>
                  </div>
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
