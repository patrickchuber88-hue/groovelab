import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, MapPin, Check } from 'lucide-react';

export interface RoomOptionItem {
  id: string;
  name: string;
  floor?: string;
  equipment?: string[];
  [key: string]: any;
}

export interface RoomHeaderDropdownSelectorProps {
  selectedRoomId: string;
  rooms: RoomOptionItem[];
  onSelectRoom: (roomId: string) => void;
  brandColor?: string;
  isRoomOccupiedNow?: (roomId: string) => boolean;
}

export const RoomHeaderDropdownSelector: React.FC<RoomHeaderDropdownSelectorProps> = ({
  selectedRoomId,
  rooms,
  onSelectRoom,
  brandColor = '#34a853',
  isRoomOccupiedNow
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchFilter('');
    }
  }, [isOpen]);

  const selectedRoom = useMemo(() => {
    return rooms.find(r => r.id === selectedRoomId) || rooms[0] || null;
  }, [rooms, selectedRoomId]);

  const isOccupied = useMemo(() => {
    if (!selectedRoom || !isRoomOccupiedNow) return false;
    return isRoomOccupiedNow(selectedRoom.id);
  }, [selectedRoom, isRoomOccupiedNow]);

  const filteredRooms = useMemo(() => {
    if (!searchFilter.trim()) return rooms;
    const query = searchFilter.toLowerCase();
    return rooms.filter(r => 
      (r.name && r.name.toLowerCase().includes(query)) ||
      (r.floor && r.floor.toLowerCase().includes(query))
    );
  }, [rooms, searchFilter]);

  const displayFloor = (!selectedRoom?.floor || selectedRoom.floor === 'Allgemein') ? 'EG' : selectedRoom.floor;

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Interactive Room Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Aktueller Raum: ${selectedRoom?.name || 'Wähle einen Raum'}. Klicken für Raumwechsel`}
        title="Raum wechseln (im Fokus-Modus)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '11px',
          padding: '4px 10px 4px 9px',
          height: '32px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f8fafc';
          e.currentTarget.style.borderColor = '#cbd5e1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ffffff';
          e.currentTarget.style.borderColor = '#e2e8f0';
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = `2px solid ${brandColor}`;
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        {/* Live Status Indicator Dot */}
        <span 
          style={{ 
            width: '7px', 
            height: '7px', 
            borderRadius: '50%', 
            background: isOccupied ? '#dc2626' : '#16a34a',
            boxShadow: isOccupied ? '0 0 0 2px #fee2e2' : '0 0 0 2px #dcfce7',
            flexShrink: 0
          }} 
          title={isOccupied ? 'Jetzt belegt' : 'Jetzt frei'}
        />

        {/* Room Name */}
        <span style={{ 
          fontSize: '0.90rem', 
          fontWeight: 850, 
          color: '#0f172a',
          letterSpacing: '-0.01em',
          maxWidth: '180px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {selectedRoom?.name || 'Wähle Raum'}
        </span>

        {/* Floor Indicator Typography */}
        <span style={{
          fontSize: '0.72rem',
          color: '#64748b',
          fontWeight: 700,
          whiteSpace: 'nowrap'
        }}>
          · {displayFloor}
        </span>

        {/* Animated Chevron */}
        <ChevronDown 
          size={13} 
          strokeWidth={2.4} 
          color="#94a3b8" 
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
            transition: 'transform 0.15s ease' 
          }} 
        />
      </button>

      {/* Spotlight Dropdown Flyout */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          width: '280px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 12px 32px -4px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.05)',
          padding: '10px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          animation: 'fadeIn 0.15s ease'
        }}>
          {/* Search Field */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f2f2f7',
            borderRadius: '10px',
            padding: '5px 8px',
            gap: '6px'
          }}>
            <Search size={13} color="#8e8e93" style={{ flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Raum filtern..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.74rem',
                color: '#1c1c1e',
                fontWeight: 650,
                width: '100%',
                padding: '2px 0'
              }}
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
              >
                <X size={11} color="#8e8e93" />
              </button>
            )}
          </div>

          {/* Rooms Scroll List */}
          <div 
            role="listbox"
            aria-label="Campus Räume Auswahlliste"
            className="custom-calendar-scrollbar"
            style={{
              maxHeight: '230px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              paddingRight: '2px'
            }}
          >
            {filteredRooms.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.74rem', color: '#8e8e93', fontWeight: 600 }}>
                Kein Raum gefunden
              </div>
            ) : (
              filteredRooms.map((r) => {
                const isSelected = r.id === selectedRoomId;
                const occ = isRoomOccupiedNow ? isRoomOccupiedNow(r.id) : false;
                const floor = (!r.floor || r.floor === 'Allgemein') ? 'EG' : r.floor;

                return (
                  <button
                    key={r.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectRoom(r.id);
                      setIsOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '7px 9px',
                      borderRadius: '9px',
                      border: 'none',
                      background: isSelected ? `${brandColor}12` : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.12s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f2f2f7';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span 
                        style={{ 
                          width: '6px', 
                          height: '6px', 
                          borderRadius: '50%', 
                          background: occ ? '#ea4335' : '#34a853',
                          flexShrink: 0
                        }} 
                      />
                      <span style={{ 
                        fontSize: '0.78rem', 
                        fontWeight: isSelected ? 850 : 650, 
                        color: isSelected ? brandColor : '#0f172a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {r.name}
                      </span>
                      <span style={{
                        fontSize: '0.60rem',
                        background: '#f2f2f7',
                        color: '#64748b',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontWeight: 750
                      }}>
                        {floor}
                      </span>
                    </div>

                    {isSelected && (
                      <Check size={13} strokeWidth={2.8} color={brandColor} style={{ flexShrink: 0 }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
