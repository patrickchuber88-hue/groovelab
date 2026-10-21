import React from 'react';
import { Building2, DoorOpen, Sparkles, Music, Activity } from 'lucide-react';

export interface SecretaryRoomKpiRowProps {
  buildingsCount: number;
  roomsCount: number;
  campusActiveCount: number;
  groovelabActiveCount: number;
  rooms: any[];
  matrixAllocations: any[];
}

export function SecretaryRoomKpiRow({
  buildingsCount,
  roomsCount,
  campusActiveCount,
  groovelabActiveCount,
  rooms = [],
  matrixAllocations = []
}: SecretaryRoomKpiRowProps) {
  // Compute top 5 room utilization metrics with disambiguated names
  const roomEntries = (rooms || []).slice(0, 5).map((rm) => {
    const roomAllocs = (matrixAllocations || []).filter(p => p.roomId === rm.id);
    const bookedMinutes = roomAllocs.reduce((sum: number, p: any) => {
      if (Array.isArray(p.slots) && p.slots.length > 0) {
        return sum + p.slots.reduce((slotSum: number, s: any) => slotSum + (s.duration || 30), 0);
      }
      if (p.startTime && p.endTime) {
        const [sh, sm] = p.startTime.split(':').map(Number);
        const [eh, em] = p.endTime.split(':').map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        return sum + (diff > 0 ? diff : 45);
      }
      return sum + 45;
    }, 0);
    const weeklyCap = rm.weekly_capacity_minutes || 2400;
    const pct = Math.min(100, Math.round((bookedMinutes / weeklyCap) * 100));
    
    // Disambiguate if multiple rooms have same name
    const duplicates = (rooms || []).filter(r => r.name === rm.name);
    const displayName = duplicates.length > 1 && rm.floor ? `${rm.name} (${rm.floor})` : rm.name;
    return { name: displayName, pct };
  });

  const avgPct = roomEntries.length > 0
    ? Math.round(roomEntries.reduce((a, b) => a + b.pct, 0) / roomEntries.length)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* 4 CALM SQUIRCLE KPI METRIC CARDS (APPLE HIG ZERO COLOR-CLASH) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        
        {/* 1. Gebäude / Standorte (Admin Red Accent) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          transition: 'all 0.2s ease'
        }} className="hover-scale">
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(234, 67, 53, 0.08)',
            color: '#ea4335',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Building2 size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Urbanist' }}>
              Gebäude
            </span>
            <strong style={{ fontSize: '1.65rem', fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0f172a', lineHeight: 1 }}>
              {buildingsCount}
            </strong>
          </div>
        </div>

        {/* 2. Räume Gesamt (Neutral Deep Slate) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          transition: 'all 0.2s ease'
        }} className="hover-scale">
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.06)',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <DoorOpen size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Urbanist' }}>
              Räume Gesamt
            </span>
            <strong style={{ fontSize: '1.65rem', fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0f172a', lineHeight: 1 }}>
              {roomsCount}
            </strong>
          </div>
        </div>

        {/* 3. Campus Aktiv (Campus Green Accent) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          transition: 'all 0.2s ease'
        }} className="hover-scale">
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(52, 168, 83, 0.10)',
            color: '#34a853',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Sparkles size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Urbanist' }}>
              Campus Aktiv
            </span>
            <strong style={{ fontSize: '1.65rem', fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0f172a', lineHeight: 1 }}>
              {campusActiveCount}
            </strong>
          </div>
        </div>

        {/* 4. GrooveLab Aktiv (GrooveLab Amber Accent) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          transition: 'all 0.2s ease'
        }} className="hover-scale">
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(234, 179, 8, 0.14)',
            color: '#ca8a04',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Music size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Urbanist' }}>
              GrooveLab Aktiv
            </span>
            <strong style={{ fontSize: '1.65rem', fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#0f172a', lineHeight: 1 }}>
              {groovelabActiveCount}
            </strong>
          </div>
        </div>
      </div>

      {/* COMPACT & HARMONIZED UTILIZATION TICKER (DESKTOP ONLY) */}
      <div 
        className="hidden md:flex" 
        style={{
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          fontSize: '0.74rem',
          color: '#475569',
          fontWeight: 700,
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0f172a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <Activity size={13} style={{ color: '#64748b' }} /> Auslastung:
        </span>
        {roomEntries.map((re, idx) => (
          <span 
            key={idx} 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              background: '#ffffff', 
              border: '1px solid #e2e8f0', 
              padding: '2px 8px', 
              borderRadius: '6px' 
            }}
          >
            <span style={{ color: '#334155' }}>{re.name}:</span>
            <strong style={{ color: re.pct > 75 ? '#dc2626' : re.pct > 40 ? '#16a34a' : '#2563eb' }}>
              {re.pct}%
            </strong>
          </span>
        ))}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(14, 165, 233, 0.10)',
          border: 'none',
          color: '#0369a1',
          padding: '2px 9px',
          borderRadius: '6px',
          fontWeight: 800
        }}>
          <span>Gesamt:</span>
          <strong>{avgPct}%</strong>
        </span>
      </div>
    </div>
  );
}
