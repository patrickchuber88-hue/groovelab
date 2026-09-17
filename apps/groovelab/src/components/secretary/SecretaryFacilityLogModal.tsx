import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Download, 
  X, 
  DoorOpen, 
  Music, 
  RotateCcw, 
  Check, 
  Calendar, 
  Filter, 
  Layers, 
  User, 
  Clock,
  Sparkles
} from 'lucide-react';
import { UserNote } from '../../services/notesService';
import { formatCleanNoteContent } from '../notes/notesConstants';

export interface SecretaryFacilityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomIssues: UserNote[];
  rooms?: any[];
  schoolId?: number | string;
  onResolveIssue: (issueId: string) => Promise<void> | void;
  onReopenIssue: (issueId: string) => Promise<void> | void;
}

export const SecretaryFacilityLogModal: React.FC<SecretaryFacilityLogModalProps> = ({
  isOpen,
  onClose,
  roomIssues,
  rooms = [],
  schoolId,
  onResolveIssue,
  onReopenIssue
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  // Close on Escape key press (WCAG 2.2 AA)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract unique room names/IDs present in issues or rooms
  const availableRooms = useMemo(() => {
    const roomSet = new Set<string>();
    rooms.forEach(r => {
      if (r?.name) roomSet.add(r.name);
    });
    roomIssues.forEach(i => {
      if (i.room_id) roomSet.add(i.room_id);
    });
    return Array.from(roomSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [rooms, roomIssues]);

  // Calculate Metrics
  const totalCount = roomIssues.length;
  const openCount = useMemo(() => {
    return roomIssues.filter(i => !i.is_completed && !i.is_acknowledged).length;
  }, [roomIssues]);
  const resolvedCount = totalCount - openCount;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;

  // Filter & Sort Issues
  const filteredIssues = useMemo(() => {
    return roomIssues.filter(issue => {
      const isResolved = Boolean(issue.is_completed || issue.is_acknowledged);
      
      // Status filter
      if (statusFilter === 'open' && isResolved) return false;
      if (statusFilter === 'resolved' && !isResolved) return false;

      // Room filter
      if (selectedRoomId !== 'all') {
        const issueRoom = (issue.room_id || '').toLowerCase();
        const target = selectedRoomId.toLowerCase();
        const matchesRoom = issueRoom === target || issueRoom.includes(target) || (issue.tags || []).some(t => t.toLowerCase().includes(target));
        if (!matchesRoom) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const cleanContent = formatCleanNoteContent(issue.content, issue.student_name).toLowerCase();
        const author = (issue.author_name || '').toLowerCase();
        const room = (issue.room_id || '').toLowerCase();
        if (!cleanContent.includes(query) && !author.includes(query) && !room.includes(query)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [roomIssues, statusFilter, selectedRoomId, searchQuery, sortBy]);

  // CSV Export for facility auditing & insurance records
  const handleExportCsv = () => {
    const headers = ['Mangel-ID', 'Erstellt am', 'Raum', 'Mangel-Beschreibung', 'Gemeldet von', 'Status', 'Behoben am', 'Behoben von'];
    const rows = filteredIssues.map(issue => {
      const isResolved = Boolean(issue.is_completed || issue.is_acknowledged);
      const createdDate = new Date(issue.created_at).toLocaleString('de-DE');
      const resolvedDate = issue.acknowledged_at ? new Date(issue.acknowledged_at).toLocaleString('de-DE') : '-';
      const cleanContent = formatCleanNoteContent(issue.content, issue.student_name).replace(/"/g, '""');
      const author = (issue.author_name || 'Lehrkraft').replace(/"/g, '""');
      const room = (issue.room_id || 'Allgemein').replace(/"/g, '""');
      const statusText = isResolved ? 'Behoben' : 'Offen';
      const resolvedByText = issue.resolved_by === 'teacher' ? 'Lehrkraft' : (issue.resolved_by === 'secretary' ? 'Sekretariat' : (isResolved ? 'Sekretariat' : '-'));

      return [
        `"${issue.id}"`,
        `"${createdDate}"`,
        `"${room}"`,
        `"${cleanContent}"`,
        `"${author}"`,
        `"${statusText}"`,
        `"${resolvedDate}"`,
        `"${resolvedByText}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Campus-Groovelab_Maengel_Logbuch_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Mängel- und Facility-Logbuch"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          animation: 'campusModalScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* MODAL HEADER */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              color: '#dc2626',
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #fecaca',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.12)'
            }}>
              <Wrench size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}>
                  Mängel- & Facility-Logbuch
                </h2>
                <span style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  borderRadius: '8px',
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 750
                }}>
                  Revisionssicher
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                Lückenlose Dokumentation aller gemeldeten Raum- und Ausstattungsmängel inklusive Status und Behebungsnachweis.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* METRICS & AUDIT OVERVIEW BAR */}
        <div style={{
          padding: '16px 28px',
          background: '#f8fafc',
          borderBottom: '1px solid #f1f5f9',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px'
        }}>
          {/* Total */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Gesamt Einträge</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{totalCount}</div>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: '10px', padding: '8px', color: '#475569' }}>
              <Layers size={18} />
            </div>
          </div>

          {/* Open */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '12px 16px',
            border: openCount > 0 ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: openCount > 0 ? '#dc2626' : '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Offene Bedarfe</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: openCount > 0 ? '#dc2626' : '#0f172a' }}>{openCount}</div>
            </div>
            <div style={{ background: openCount > 0 ? '#fee2e2' : '#f1f5f9', borderRadius: '10px', padding: '8px', color: openCount > 0 ? '#dc2626' : '#475569' }}>
              <AlertTriangle size={18} />
            </div>
          </div>

          {/* Resolved */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>Behoben</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d' }}>{resolvedCount}</div>
            </div>
            <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '8px', color: '#15803d' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>

          {/* Resolution Rate */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Erledigungsquote</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{resolutionRate}%</div>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: '10px', padding: '8px', color: '#0f172a' }}>
              <Sparkles size={18} />
            </div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH, FILTERS & EXPORT */}
        <div style={{
          padding: '14px 28px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
            {/* Search Input */}
            <div style={{
              position: 'relative',
              flex: 1,
              maxWidth: '320px'
            }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Mangel, Lehrkraft oder Raum suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Suche zurücksetzen"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Room Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                aria-label="Raum filtern"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#334155',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Alle Räume ({roomIssues.length})</option>
                {availableRooms.map(rName => {
                  const count = roomIssues.filter(i => (i.room_id || '').toLowerCase() === rName.toLowerCase()).length;
                  return (
                    <option key={rName} value={rName}>
                      {rName} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Status Segmented Switcher */}
            <div 
              role="tablist"
              aria-label="Statusfilter"
              style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '3px'
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9px',
                  border: 'none',
                  background: statusFilter === 'all' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'all' ? '#0f172a' : '#64748b',
                  fontSize: '0.76rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  boxShadow: statusFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Alle ({totalCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'open'}
                onClick={() => setStatusFilter('open')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9px',
                  border: 'none',
                  background: statusFilter === 'open' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'open' ? '#dc2626' : '#64748b',
                  fontSize: '0.76rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  boxShadow: statusFilter === 'open' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Offen ({openCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === 'resolved'}
                onClick={() => setStatusFilter('resolved')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9px',
                  border: 'none',
                  background: statusFilter === 'resolved' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'resolved' ? '#15803d' : '#64748b',
                  fontSize: '0.76rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  boxShadow: statusFilter === 'resolved' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Behoben ({resolvedCount})
              </button>
            </div>

            {/* CSV Export Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredIssues.length === 0}
              aria-label="Mängellogbuch als CSV exportieren"
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '8px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#334155',
                cursor: filteredIssues.length === 0 ? 'not-allowed' : 'pointer',
                opacity: filteredIssues.length === 0 ? 0.5 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Download size={14} />
              <span>CSV Export</span>
            </button>
          </div>
        </div>

        {/* ISSUE CARDS LIST CONTAINER */}
        <div style={{
          padding: '20px 28px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {filteredIssues.length === 0 ? (
            <div style={{
              background: '#f8fafc',
              borderRadius: '20px',
              padding: '48px 24px',
              textAlign: 'center',
              border: '1.5px dashed #cbd5e1'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: '#e2e8f0',
                color: '#64748b',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <CheckCircle2 size={24} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                Keine Einträge für diese Filterauswahl
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                {statusFilter === 'open' 
                  ? 'Alle Räume und Ausstattungen sind intakt. Keine offenen Mängel!' 
                  : 'Passe den Suchbegriff oder den Raumfilter an, um Einträge einzusehen.'}
              </p>
            </div>
          ) : (
            filteredIssues.map((issue) => {
              const isResolved = Boolean(issue.is_completed || issue.is_acknowledged);
              const createdDate = new Date(issue.created_at);
              const dateFormatted = createdDate.toLocaleDateString('de-DE', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit', 
                minute: '2-digit' 
              });
              const cleanContent = formatCleanNoteContent(issue.content, issue.student_name);
              const authorDisplay = issue.author_name || 'Lehrkraft';
              const isEquip = (issue.tags && issue.tags.includes('#Ausstattung')) || 
                              issue.content.toLowerCase().includes('klavier') || 
                              issue.content.toLowerCase().includes('piano') || 
                              issue.content.toLowerCase().includes('drum') || 
                              issue.content.toLowerCase().includes('gitarre') || 
                              issue.content.toLowerCase().includes('saite') || 
                              issue.content.toLowerCase().includes('kabel') || 
                              issue.content.toLowerCase().includes('pedal') || 
                              issue.content.toLowerCase().includes('netzteil');

              const resolvedDateFormatted = issue.acknowledged_at 
                ? new Date(issue.acknowledged_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : null;

              const isProcessing = isProcessingId === issue.id;

              return (
                <div 
                  key={issue.id} 
                  style={{
                    background: isResolved ? '#f8fafc' : '#fffbfb',
                    border: isResolved ? '1px solid #e2e8f0' : '1.5px solid #fee2e2',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                    transition: 'all 0.15s ease',
                    boxShadow: isResolved ? 'none' : '0 2px 8px rgba(220, 38, 38, 0.04)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '280px' }}>
                    {/* Room / Equipment Chip */}
                    <div style={{
                      background: isResolved ? '#f1f5f9' : '#fee2e2',
                      color: isResolved ? '#475569' : '#dc2626',
                      borderRadius: '10px',
                      padding: '6px 10px',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      flexShrink: 0,
                      border: isResolved ? '1px solid #e2e8f0' : '1px solid #fecaca'
                    }}>
                      {isEquip ? <Music size={13} /> : <DoorOpen size={13} />}
                      <span>{issue.room_id || (isEquip ? 'Ausstattung' : 'Raum')}</span>
                    </div>

                    {/* Content Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        {/* Status Badge */}
                        {isResolved ? (
                          <span style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #86efac',
                            borderRadius: '6px',
                            padding: '1px 7px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Check size={11} /> Behoben
                          </span>
                        ) : (
                          <span style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            padding: '1px 7px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <AlertTriangle size={11} /> Offen
                          </span>
                        )}

                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Gemeldet von <strong>{authorDisplay}</strong> am {dateFormatted} Uhr
                        </span>
                      </div>

                      {/* Cleaned Note Text */}
                      <div style={{ 
                        fontSize: '0.88rem', 
                        fontWeight: 700, 
                        color: isResolved ? '#334155' : '#0f172a', 
                        lineHeight: '1.4',
                        marginBottom: isResolved && resolvedDateFormatted ? '6px' : '0'
                      }}>
                        {cleanContent || issue.content}
                      </div>

                      {/* Resolution Audit Trail */}
                      {isResolved && resolvedDateFormatted && (
                        <div style={{
                          fontSize: '0.72rem',
                          color: '#15803d',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'rgba(34, 197, 94, 0.08)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: 650
                        }}>
                          <CheckCircle2 size={12} />
                          <span>Behoben am {resolvedDateFormatted} Uhr ({issue.resolved_by === 'teacher' ? 'Lehrkraft' : 'Sekretariat'})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACTION CONTROLS */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isResolved ? (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={async () => {
                          setIsProcessingId(issue.id);
                          try {
                            await onResolveIssue(issue.id);
                          } finally {
                            setIsProcessingId(null);
                          }
                        }}
                        style={{
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '0.76rem',
                          fontWeight: 750,
                          cursor: isProcessing ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)',
                          opacity: isProcessing ? 0.7 : 1,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Check size={13} />
                        <span>Als behoben markieren</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={async () => {
                          setIsProcessingId(issue.id);
                          try {
                            await onReopenIssue(issue.id);
                          } finally {
                            setIsProcessingId(null);
                          }
                        }}
                        style={{
                          background: '#ffffff',
                          color: '#475569',
                          border: '1.5px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '7px 12px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: isProcessing ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          opacity: isProcessing ? 0.7 : 1,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <RotateCcw size={12} />
                        <span>Wiedereröffnen</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid #f1f5f9',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
            Campus-Groovelab • Enterprise Facility Governance • OWASP ASVS Level 3
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 18px',
              fontSize: '0.8rem',
              fontWeight: 750,
              cursor: 'pointer'
            }}
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};
