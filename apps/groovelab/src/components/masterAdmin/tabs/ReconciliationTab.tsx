import React, { useState, useMemo } from 'react';
import { 
  CreditCard, Search, Tag, Shield, Clock, RefreshCw, Check, CheckCircle, 
  Upload, FileText, Copy, AlertCircle, Building2, User, ChevronRight, X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface PendingUser {
  id: string;
  first_name?: string;
  last_name?: string;
  school_id: string;
  role?: string;
  is_campus_active?: boolean;
  is_groovelab_active?: boolean;
  is_active?: boolean;
  ausweis_nummer?: string;
  is_pin_activated?: boolean;
  created_at?: string;
  payment_status?: string;
  is_hardship_exempt?: boolean;
  [key: string]: any;
}

interface School {
  id: string;
  name: string;
  primary_color?: string;
  logo_url?: string | null;
  [key: string]: any;
}

interface MasterPricing {
  priceCampus: number;
  priceGroovelab: number;
  priceKombi: number;
  priceTeacher: number;
  priceStudent: number;
}

interface ReconciliationTabProps {
  pendingUsers: PendingUser[];
  schools: School[];
  masterPricing: MasterPricing;
  loadingPending: boolean;
  onRefresh: () => void;
  onBatchActivate: (ids: string[]) => Promise<void>;
  onSingleActivate: (id: string) => Promise<void>;
}

export const ReconciliationTab: React.FC<ReconciliationTabProps> = ({
  pendingUsers,
  schools,
  masterPricing,
  loadingPending,
  onRefresh,
  onBatchActivate,
  onSingleActivate
}) => {
  const [activeFilterTab, setActiveFilterTab] = useState<'open' | 'active' | 'exempt' | 'all'>('open');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  
  // CSV Import Modal State
  const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
  const [csvText, setCsvText] = useState<string>('');
  const [matchedResults, setMatchedResults] = useState<{ hash: string; userId: string; name: string; amount?: string }[]>([]);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionSuccessToast(msg);
    setTimeout(() => setActionSuccessToast(null), 3000);
  };

  // Helper to generate unique GoBD reference CG-[HASH8]-[YYMM]
  const getReferenceCode = (user: PendingUser) => {
    const rawHash = (user.ausweis_nummer || user.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `CG-${rawHash}-${yy}${mm}`;
  };

  // Helper to anonymize student name to "Vorname N." (DSGVO compliant)
  const getAnonymizedName = (user: PendingUser) => {
    if (!user.first_name) return `Direktkunde ${user.id.slice(0, 8).toUpperCase()}`;
    const first = user.first_name.trim();
    const lastInitial = user.last_name ? ` ${user.last_name.trim()[0]}.` : '';
    return `${first}${lastInitial}`;
  };

  // Filter pending users
  const filteredUsers = useMemo(() => {
    return pendingUsers.filter(u => {
      // 1. Status Filter
      if (activeFilterTab === 'open' && u.is_campus_active) return false;
      if (activeFilterTab === 'active' && !u.is_campus_active) return false;
      if (activeFilterTab === 'exempt' && !u.is_hardship_exempt) return false;

      // 2. School Filter
      if (selectedSchoolId !== 'all' && u.school_id !== selectedSchoolId) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const school = schools.find(s => s.id === u.school_id);
        const ref = getReferenceCode(u).toLowerCase();
        const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
        const matches = name.includes(q) || 
                        (school?.name || '').toLowerCase().includes(q) ||
                        ref.includes(q) ||
                        (u.ausweis_nummer || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [pendingUsers, activeFilterTab, selectedSchoolId, searchQuery, schools]);

  // Statistics counters
  const openCount = pendingUsers.filter(u => !u.is_campus_active).length;
  const activeCount = pendingUsers.filter(u => u.is_campus_active).length;
  const exemptCount = pendingUsers.filter(u => u.is_hardship_exempt).length;
  const totalOpenAmount = (openCount * (masterPricing.priceStudent || 0.49) * 12).toFixed(2).replace('.', ',');

  // CSV Parsing Engine for Bank Statements
  const handleParseCsv = () => {
    if (!csvText.trim()) return;
    const regex = /CG-([A-Z0-9]{4,12})-(\d{4})/gi;
    const matches = Array.from(csvText.matchAll(regex));
    
    const results: { hash: string; userId: string; name: string }[] = [];
    const seenIds = new Set<string>();

    for (const match of matches) {
      const fullCode = match[0].toUpperCase();
      const hashPart = match[1].toUpperCase();
      
      const foundUser = pendingUsers.find(u => {
        const uHash = (u.ausweis_nummer || u.id).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return uHash.startsWith(hashPart) || hashPart.startsWith(uHash.slice(0, 8));
      });

      if (foundUser && !seenIds.has(foundUser.id)) {
        seenIds.add(foundUser.id);
        results.push({
          hash: fullCode,
          userId: foundUser.id,
          name: getAnonymizedName(foundUser)
        });
      }
    }
    setMatchedResults(results);
  };

  const handleExemptStudent = async (user: PendingUser) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_hardship_exempt: true, is_campus_active: true })
        .eq('id', user.id);
      if (error) throw error;
      showToast(`Schüler "${getAnonymizedName(user)}" als Härtefall befreit & freigeschaltet.`);
      onRefresh();
    } catch (err: any) {
      alert('Fehler bei Härtefall-Befreiung: ' + err.message);
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast('Verwendungszweck in Zwischenablage kopiert!');
    setTimeout(() => setCopyToast(null), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      
      {/* Toast Notification */}
      {(actionSuccessToast || copyToast) && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.86rem',
          fontWeight: 700
        }}>
          <CheckCircle size={16} color="#10b981" />
          <span>{actionSuccessToast || copyToast}</span>
        </div>
      )}

      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.03em', fontFamily: '"Outfit", sans-serif' }}>
                Zahlungsabgleich & Aktivierungen
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.86rem', color: '#64748b', fontWeight: 550 }}>
                Zahlungseingänge für Schüler-Aktivierungen abgleichen, Bankauszüge importieren und Zugänge freischalten.
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {selectedUserIds.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.80rem', fontWeight: 800, color: '#0f172a', background: 'rgba(59, 130, 246, 0.1)', padding: '6px 12px', borderRadius: '8px' }}>
                {selectedUserIds.length} ausgewählt
              </span>
              <button
                onClick={() => onBatchActivate(selectedUserIds)}
                disabled={loadingPending}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#10b981',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                }}
              >
                <Check size={14} /> Ausgewählte freischalten ({selectedUserIds.length})
              </button>
              <button
                onClick={() => setSelectedUserIds([])}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.80rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Aufheben
              </button>
            </div>
          )}

          {/* Bank CSV Import Button */}
          <button
            onClick={() => {
              setCsvText('');
              setMatchedResults([]);
              setShowCsvModal(true);
            }}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.25)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.15)';
            }}
          >
            <Upload size={14} /> CAMT.053 &amp; Bank-CSV abgleichen
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loadingPending}
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#94a3b8';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <RefreshCw size={13} className={loadingPending ? 'animate-spin' : ''} /> Aktualisieren
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="hover-scale-mini">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Clock size={14} color="#f59e0b" /> Offene Zahlungen
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>{openCount}</span>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>({totalOpenAmount} € fällig)</span>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="hover-scale-mini">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <CheckCircle size={14} color="#10b981" /> Gematcht & Aktiv
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981', fontFamily: '"Outfit", sans-serif' }}>{activeCount}</span>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Profile aktiv</span>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="hover-scale-mini">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Shield size={14} color="#3b82f6" /> Härtefälle / Befreit
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#3b82f6', fontFamily: '"Outfit", sans-serif' }}>{exemptCount}</span>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Befreite Schüler</span>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }} className="hover-scale-mini">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.70rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Tag size={14} color="#64748b" /> GoBD Referenzschema
          </div>
          <div style={{ marginTop: '6px' }}>
            <code style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px' }}>
              CG-[HASH]-[YYMM]
            </code>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '12px 16px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '2px' }}>
          <button
            onClick={() => setActiveFilterTab('open')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeFilterTab === 'open' ? '#ffffff' : 'transparent',
              color: activeFilterTab === 'open' ? '#0f172a' : '#64748b',
              boxShadow: activeFilterTab === 'open' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Offen ({openCount})
          </button>
          <button
            onClick={() => setActiveFilterTab('active')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeFilterTab === 'active' ? '#ffffff' : 'transparent',
              color: activeFilterTab === 'active' ? '#0f172a' : '#64748b',
              boxShadow: activeFilterTab === 'active' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Aktiv & Bezahlt ({activeCount})
          </button>
          <button
            onClick={() => setActiveFilterTab('exempt')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeFilterTab === 'exempt' ? '#ffffff' : 'transparent',
              color: activeFilterTab === 'exempt' ? '#0f172a' : '#64748b',
              boxShadow: activeFilterTab === 'exempt' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Befreit ({exemptCount})
          </button>
          <button
            onClick={() => setActiveFilterTab('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeFilterTab === 'all' ? '#ffffff' : 'transparent',
              color: activeFilterTab === 'all' ? '#0f172a' : '#64748b',
              boxShadow: activeFilterTab === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            Alle ({pendingUsers.length})
          </button>
        </div>

        {/* School Dropdown Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={15} color="#64748b" />
          <select
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#0f172a',
              outline: 'none'
            }}
          >
            <option value="all">Alle Musikschulen ({schools.length})</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Search Field */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Name, Schule, CG-Code..."
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Main Split-Screen: List & Detail Pane */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', minHeight: '520px' }}>
        
        {/* Left: Students List */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* List Header */}
          <div style={{
            padding: '10px 16px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.76rem',
            color: '#64748b',
            fontWeight: 700
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedUserIds(filteredUsers.map(u => u.id));
                  } else {
                    setSelectedUserIds([]);
                  }
                }}
                style={{ width: '14px', height: '14px', borderRadius: '3px', cursor: 'pointer' }}
              />
              <span>Alle {filteredUsers.length} auswählen</span>
            </label>
            <span>{filteredUsers.length} Einträge</span>
          </div>

          {/* List Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', maxHeight: '580px' }}>
            {loadingPending ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Lade Schülerdaten...</div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: '0.90rem', fontWeight: 800, color: '#0f172a' }}>Keine Zahlungsrückstände</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>Alle angezeigten Schüler-Zahlungen sind abgeglichen.</div>
              </div>
            ) : (
              filteredUsers.map(u => {
                const school = schools.find(s => s.id === u.school_id);
                const isSelected = selectedUserIds.includes(u.id);
                const isFocused = selectedUser?.id === u.id;
                const refCode = getReferenceCode(u);

                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isFocused ? '#eff6ff' : '#ffffff',
                      border: isFocused ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
                      marginBottom: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
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
                      style={{ width: '15px', height: '15px', borderRadius: '3px', cursor: 'pointer', flexShrink: 0 }}
                    />

                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: school?.primary_color ? `${school.primary_color}15` : '#e0f2fe',
                      color: school?.primary_color || '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      <User size={14} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 800 }}>
                          {getAnonymizedName(u)}
                        </strong>
                        <span style={{ fontSize: '0.74rem', fontWeight: 800, color: u.is_campus_active ? '#15803d' : '#d97706' }}>
                          5,88 € / J.
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>
                          {school?.name || 'Schule'}
                        </span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <code style={{ fontSize: '0.66rem', fontWeight: 800, color: '#0284c7', background: '#f0f9ff', padding: '1px 4px', borderRadius: '4px' }}>
                          {refCode}
                        </code>
                        {u.is_campus_active ? (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#15803d', background: '#f0fdf4', padding: '1px 5px', borderRadius: '4px' }}>
                            Aktiv
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '1px 5px', borderRadius: '4px' }}>
                            Offen
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={14} color="#94a3b8" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Student Detail Pane */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {selectedUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Detail Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Schüler-Zahlungsakte
                  </span>
                  <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>
                    {getAnonymizedName(selectedUser)}
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                    {schools.find(s => s.id === selectedUser.school_id)?.name || 'Musikschule'}
                  </span>
                </div>
                {selectedUser.is_campus_active ? (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '6px' }}>
                    ● Aktiv / Bezahlt
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '6px' }}>
                    ● Zahlung Ausstehend
                  </span>
                )}
              </div>

              {/* Verwendungszweck Card */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Offizieller GoBD Verwendungszweck
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <code style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0284c7', fontFamily: 'monospace' }}>
                    {getReferenceCode(selectedUser)}
                  </code>
                  <button
                    onClick={() => handleCopyCode(getReferenceCode(selectedUser))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      color: '#475569'
                    }}
                  >
                    <Copy size={11} /> Kopieren
                  </button>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '6px' }}>
                  100% DSGVO-konform: Keine Klarnamen auf Kontoauszügen.
                </div>
              </div>

              {/* Financial Calculation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Cloud- & Modul-Bereitstellung (Campus)</span>
                  <strong style={{ color: '#0f172a' }}>0,49 € / Mo.</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Abrechnungsintervall</span>
                  <strong style={{ color: '#0f172a' }}>Jahresbeitrag (12 Monate)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Plattform-Rabatt</span>
                  <strong style={{ color: '#15803d' }}>0,00 €</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '0.90rem' }}>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>Gesamtbetrag Überweisung</span>
                  <strong style={{ fontWeight: 900, color: '#0f172a', fontFamily: '"Outfit", sans-serif' }}>5,88 €</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                {!selectedUser.is_campus_active && (
                  <button
                    onClick={() => {
                      onSingleActivate(selectedUser.id);
                      showToast(`Zahlung für ${getAnonymizedName(selectedUser)} bestätigt.`);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      background: '#10b981',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                    }}
                  >
                    <Check size={15} /> Zahlungseingang bestätigen & freischalten
                  </button>
                )}

                {!selectedUser.is_hardship_exempt && (
                  <button
                    onClick={() => handleExemptStudent(selectedUser)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Shield size={13} /> Als Härtefall / Geschwisterkind befreien
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto' }}>
              <User size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#475569' }}>Kein Schüler ausgewählt</div>
              <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>Wähle einen Schüler aus der Liste aus, um Zahlungsdetails einzusehen.</div>
            </div>
          )}
        </div>
      </div>

      {/* CSV Bank Import Modal */}
      {showCsvModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '620px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
                  Bankauszug / CSV Zahlungsabgleich
                </h3>
              </div>
              <button onClick={() => setShowCsvModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748b', lineHeight: 1.4 }}>
              Füge den Text oder Inhalt deines Online-Banking-Kontoauszugs (CSV / Text) ein. Unser Parser erkennt automatisch alle Verwendungszwecke im Format <code>CG-[HASH]-[YYMM]</code>.
            </p>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Beispiel: 2026-08-13; Überweisung; 5,88 EUR; Verwendungszweck: CG-F63B8EDE-2607..."
              rows={6}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                outline: 'none'
              }}
            />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleParseCsv}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Texte analysieren & Matchen
              </button>
            </div>

            {matchedResults.length > 0 && (
              <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '14px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={15} /> {matchedResults.length} Zahlungen erfolgreich erkannt:
                </div>
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                  {matchedResults.map((r, i) => (
                    <div key={i} style={{ fontSize: '0.74rem', color: '#166534', display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>{r.name}</strong> ({r.hash})</span>
                      <span>5,88 €</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={async () => {
                    await onBatchActivate(matchedResults.map(r => r.userId));
                    setShowCsvModal(false);
                    showToast(`${matchedResults.length} Schüler per Bankabgleich freigeschaltet.`);
                  }}
                  style={{
                    marginTop: '12px',
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Alle {matchedResults.length} gematchten Schüler jetzt freischalten
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
