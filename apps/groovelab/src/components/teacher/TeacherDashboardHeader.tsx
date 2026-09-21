import React from 'react';
import { 
  Users, Sparkles, Settings, LayoutDashboard, Radio, GraduationCap, Eye, EyeOff, Search, Box 
} from 'lucide-react';
import { CampusGroovelabBrand } from '../CampusGroovelabBrand';
import { AvatarImage } from '../common/AvatarImage';

export interface TeacherDashboardHeaderProps {
  activePlatform: 'campus' | 'groovelab';
  schoolName?: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showRealNames: boolean;
  toggleRealNames: () => void;
  onOpenCommandPalette: () => void;
  teacher?: any;
}

export function TeacherDashboardHeader({
  activePlatform,
  schoolName,
  activeTab,
  setActiveTab,
  showRealNames,
  toggleRealNames,
  onOpenCommandPalette,
  teacher
}: TeacherDashboardHeaderProps) {
  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '12px 24px'
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Logo & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <CampusGroovelabBrand />
          <div style={{
            height: '24px',
            width: '1px',
            background: '#cbd5e1'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '4px 10px',
              borderRadius: '8px',
              background: activePlatform === 'campus' ? '#e6f4ea' : '#fef9c3',
              color: activePlatform === 'campus' ? '#34a853' : '#854d0e'
            }}>
              {activePlatform === 'campus' ? 'Campus Lehrkraft' : 'GrooveLab Studio'}
            </span>
            {schoolName && (
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                {schoolName}
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '16px',
          gap: '4px'
        }}>
          {[
            { id: 'briefing', label: 'Briefing', icon: LayoutDashboard },
            { id: 'live', label: 'Live Lab', icon: Radio },
            ...(activePlatform === 'campus' ? [{ id: 'rooms', label: 'Räume', icon: Box }] : []),
            { id: 'students', label: 'Schüler', icon: Users },
            { id: 'bands', label: 'Bands', icon: Sparkles },
            { id: 'coaches', label: 'Kollegium', icon: GraduationCap },
            { id: 'settings', label: 'Einstellungen', icon: Settings }
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? '#0f172a' : '#64748b',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontWeight: isSelected ? 900 : 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} color={isSelected ? (activePlatform === 'campus' ? '#34a853' : '#ca8a04') : '#64748b'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Actions & Privacy Eye */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={toggleRealNames}
            title={showRealNames ? 'Datenschutz-Modus aktivieren (Vorname N.)' : 'Vollständige Schülernamen anzeigen'}
            style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#475569',
              fontSize: '0.8rem',
              fontWeight: 800
            }}
          >
            {showRealNames ? <Eye size={16} color="#34a853" /> : <EyeOff size={16} color="#64748b" />}
            <span>{showRealNames ? 'Klartext' : 'Anonym'}</span>
          </button>

          <button
            onClick={onOpenCommandPalette}
            title="Spotlight Suche (⌘K)"
            style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '8px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#94a3b8',
              fontSize: '0.8rem',
              fontWeight: 700
            }}
          >
            <Search size={14} />
            <span>Suche...</span>
            <kbd style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '6px', fontSize: '0.7rem' }}>⌘K</kbd>
          </button>

          {teacher && (
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '14px',
              overflow: 'hidden',
              border: '2px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <AvatarImage src={teacher.photo_url} user={{ ...teacher, isTeacherContext: true }} activePlatform={activePlatform} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
