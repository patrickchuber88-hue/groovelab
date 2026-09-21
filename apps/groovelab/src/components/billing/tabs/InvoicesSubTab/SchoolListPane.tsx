import React, { useEffect } from 'react';
import { Search } from 'lucide-react';
import { Invoice } from '../../types';

interface SchoolListPaneProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (f: string) => void;
  filteredInvoices: Invoice[];
  expandedSchoolId: string | null;
  setExpandedSchoolId: (id: string) => void;
  handleExportCSV: () => void;
}

export const SchoolListPane: React.FC<SchoolListPaneProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  filteredInvoices,
  expandedSchoolId,
  setExpandedSchoolId,
  handleExportCSV
}) => {
  // Apple macOS HIG Keyboard Navigation (Arrow Up / Down) for School Selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (filteredInvoices.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = filteredInvoices.findIndex(inv => inv.schoolId === expandedSchoolId);
        const nextIndex = currentIndex < filteredInvoices.length - 1 ? currentIndex + 1 : 0;
        setExpandedSchoolId(filteredInvoices[nextIndex].schoolId);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = filteredInvoices.findIndex(inv => inv.schoolId === expandedSchoolId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredInvoices.length - 1;
        setExpandedSchoolId(filteredInvoices[prevIndex].schoolId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredInvoices, expandedSchoolId, setExpandedSchoolId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '14px',
        border: '1px solid rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.01)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={14} />
          <input
            type="text"
            placeholder="Musikschule suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 12px 8px 36px',
              borderRadius: '10px',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              fontSize: '0.82rem',
              fontWeight: 500,
              outline: 'none',
              transition: 'all 0.2s',
              background: '#ffffff',
              color: '#0f172a'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#34a853';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(0, 0, 0, 0.08)';
            }}
          />
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Alle' },
              { id: 'active', label: 'Aktiv' },
              { id: 'bypass', label: 'Bypass' },
              { id: 'trial', label: 'Probe' },
              { id: 'suspended', label: 'Gesperrt' }
            ].map(btn => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setStatusFilter(btn.id)}
                className={`filter-btn ${statusFilter === btn.id ? 'filter-btn-active' : ''}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              background: '#ffffff',
              border: '1px solid rgba(52, 168, 83, 0.25)',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '0.80rem',
              fontWeight: 800,
              color: '#059669',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.06)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#ecfdf5';
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = 'rgba(52, 168, 83, 0.25)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            CSV Export
          </button>
        </div>
      </div>

      {/* School list cards */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 4px 4px', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
        <span>SCHULEN ({filteredInvoices.length})</span>
        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8' }}>Mit ↑ / ↓ navigieren</span>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '620px',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {filteredInvoices.length === 0 ? (
          <div style={{
            padding: '32px 16px',
            textAlign: 'center',
            color: '#64748b',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            fontSize: '0.82rem'
          }}>
            Keine Musikschulen gefunden
          </div>
        ) : (
          filteredInvoices.map(inv => {
            const isSelected = expandedSchoolId === inv.schoolId;
            return (
              <div
                key={inv.schoolId}
                onClick={() => setExpandedSchoolId(inv.schoolId)}
                className="school-list-item"
                style={{
                  background: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  border: isSelected ? '2px solid #34a853' : '1px solid rgba(0, 0, 0, 0.06)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: isSelected ? '0 4px 14px rgba(52, 168, 83, 0.12)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: isSelected ? '#e6f4ea' : '#f1f5f9',
                    color: isSelected ? '#34a853' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.88rem'
                  }}>
                    {inv.schoolName?.[0] || 'S'}
                  </div>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a' }}>
                      {inv.schoolName}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {inv.schoolCity || 'Standort unbekannt'} • {inv.totalStudents} Schüler
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '0.90rem', fontWeight: 800, color: '#0f172a' }}>
                    {inv.total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                  </span>
                  <span style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Monatsbeitrag
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
