import React, { useState, useMemo } from 'react';
import { Calendar, Check, CheckCircle2, ChevronDown, ChevronUp, Clock, Trash2 } from 'lucide-react';

export interface CampusBookingItem {
  id: string;
  ids?: string[];
  roomId: string;
  roomName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  purpose?: string;
  teacherId?: string;
  teacherName?: string;
  status: string;
  is_confirmed?: boolean;
  isApproved?: boolean;
  isSchedule?: boolean;
  [key: string]: any;
}

export interface CampusMyBookingsListProps {
  myBookings: CampusBookingItem[];
  selectedBookingId?: string | null;
  isStaff?: boolean;
  brandColor?: string;
  onSelectBooking: (booking: CampusBookingItem) => void;
  onCancelBooking: (ids: string | string[]) => void | Promise<void>;
  onApproveBooking?: (id: string) => void | Promise<void>;
  onClose?: () => void;
}

const formatGermanDateWithWeekday = (dateStr: string): string => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
      const weekday = d.toLocaleDateString('de-DE', { timeZone: 'UTC', weekday: 'short' }).replace(/\.$/, '');
      const dayMonth = d.toLocaleDateString('de-DE', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
      return `${weekday}, ${dayMonth}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
};

const getBerlinTodayStr = (): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
};

const getWeekBounds = (baseDateStr: string) => {
  const parts = baseDateStr.split('-');
  const d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
  const day = d.getUTCDay(); // 0 is Sunday, 1 is Monday
  const daysToSunday = day === 0 ? 0 : 7 - day;
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() + daysToSunday);

  const nextSunday = new Date(sunday);
  nextSunday.setUTCDate(sunday.getUTCDate() + 7);

  const toStr = (dt: Date) => dt.toISOString().slice(0, 10);
  return {
    thisWeekEnd: toStr(sunday),
    nextWeekEnd: toStr(nextSunday)
  };
};

export const CampusMyBookingsList: React.FC<CampusMyBookingsListProps> = ({
  myBookings,
  selectedBookingId,
  isStaff = false,
  brandColor = '#10b981',
  onSelectBooking,
  onCancelBooking,
  onApproveBooking,
  onClose
}) => {
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [confirmCancelAll, setConfirmCancelAll] = useState<boolean>(false);
  const [showPastBookings, setShowPastBookings] = useState<boolean>(false);

  const todayStr = useMemo(() => getBerlinTodayStr(), []);
  const { thisWeekEnd, nextWeekEnd } = useMemo(() => getWeekBounds(todayStr), [todayStr]);

  // Chronologically sort bookings
  const sortedBookings = useMemo(() => {
    return [...myBookings].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [myBookings]);

  // Split into upcoming and past
  const { upcomingBookings, pastBookings } = useMemo(() => {
    const upcoming: CampusBookingItem[] = [];
    const past: CampusBookingItem[] = [];

    sortedBookings.forEach((b) => {
      if (b.date < todayStr) {
        past.push(b);
      } else {
        upcoming.push(b);
      }
    });

    return { upcomingBookings: upcoming, pastBookings: past };
  }, [sortedBookings, todayStr]);

  // Group upcoming bookings into smart sections
  const groupedUpcoming = useMemo(() => {
    const groups: { title: string; bookings: CampusBookingItem[] }[] = [];
    const thisWeekList: CampusBookingItem[] = [];
    const nextWeekList: CampusBookingItem[] = [];
    const laterList: CampusBookingItem[] = [];

    upcomingBookings.forEach((b) => {
      if (b.date <= thisWeekEnd) {
        thisWeekList.push(b);
      } else if (b.date <= nextWeekEnd) {
        nextWeekList.push(b);
      } else {
        laterList.push(b);
      }
    });

    if (thisWeekList.length > 0) {
      groups.push({ title: 'Diese Woche', bookings: thisWeekList });
    }
    if (nextWeekList.length > 0) {
      groups.push({ title: 'Nächste Woche', bookings: nextWeekList });
    }
    if (laterList.length > 0) {
      groups.push({ title: 'Kommende Termine', bookings: laterList });
    }

    return groups;
  }, [upcomingBookings, thisWeekEnd, nextWeekEnd]);

  const handleCancelClick = (e: React.MouseEvent, booking: CampusBookingItem) => {
    e.stopPropagation();
    if (confirmCancelId === booking.id) {
      setConfirmCancelId(null);
      onCancelBooking(booking.ids || booking.id);
    } else {
      setConfirmCancelId(booking.id);
      setConfirmCancelAll(false);
    }
  };

  const handleCancelAllClick = () => {
    if (confirmCancelAll) {
      setConfirmCancelAll(false);
      const allIds = myBookings.flatMap((b) => b.ids || [b.id]);
      onCancelBooking(allIds);
    } else {
      setConfirmCancelAll(true);
      setConfirmCancelId(null);
    }
  };

  const renderBookingCard = (b: CampusBookingItem) => {
    const isBookingConfirmed = !b.isSchedule && b.status === 'confirmed' && b.is_confirmed === true;
    const isSelected = !!selectedBookingId && (selectedBookingId === b.id || b.ids?.includes(selectedBookingId));
    const isConfirmingCancel = confirmCancelId === b.id;

    return (
      <div
        key={b.id}
        role="button"
        tabIndex={0}
        aria-label={`Buchung am ${formatGermanDateWithWeekday(b.date)}, ${b.startTime} bis ${b.endTime} Uhr, ${b.roomName}`}
        onClick={() => {
          setConfirmCancelId(null);
          onSelectBooking(b);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setConfirmCancelId(null);
            onSelectBooking(b);
          }
        }}
        style={{
          padding: '12px 14px',
          background: isBookingConfirmed
            ? '#fae8ff'
            : 'repeating-linear-gradient(-45deg, #faf5ff 0px, #faf5ff 8px, #ffffff 8px, #ffffff 16px)',
          border: isSelected
            ? '2px solid #7c3aed'
            : isBookingConfirmed
            ? '2px solid #8b5cf6'
            : '2px dashed #8b5cf6',
          borderRadius: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: isSelected
            ? '0 0 0 2px rgba(124, 58, 237, 0.25), 0 4px 12px rgba(124, 58, 237, 0.12)'
            : '0 2px 6px rgba(0, 0, 0, 0.02)',
          transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = '#9333ea';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.borderColor = isBookingConfirmed ? '#8b5cf6' : '#a855f7';
            e.currentTarget.style.transform = 'none';
          }
        }}
      >
        {/* Row 1: Date & Time (Left) + Actions (Right) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.80rem',
              fontWeight: 850,
              color: '#0f172a',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap'
            }}
          >
            {formatGermanDateWithWeekday(b.date)} • {b.startTime} – {b.endTime} Uhr
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* Secretary / Staff Approve Button */}
            {!isBookingConfirmed && isStaff && !b.isSchedule && onApproveBooking && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveBooking(b.id);
                }}
                style={{
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#15803d',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  height: '28px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  whiteSpace: 'nowrap'
                }}
                title="Buchung als Sekretariat freigeben"
                aria-label="Buchung freigeben"
              >
                <Check size={12} strokeWidth={3} />
                <span>Freigeben</span>
              </button>
            )}

            {/* Cancel Button with 2-Click Inline Confirm */}
            <button
              type="button"
              onClick={(e) => handleCancelClick(e, b)}
              style={{
                background: isConfirmingCancel ? '#ef4444' : '#ff453a15',
                color: isConfirmingCancel ? '#ffffff' : '#ff453a',
                border: 'none',
                borderRadius: '8px',
                padding: isConfirmingCancel ? '4px 8px' : '0',
                width: isConfirmingCancel ? 'auto' : '28px',
                height: '28px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isConfirmingCancel ? '0 2px 6px rgba(239, 68, 68, 0.3)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isConfirmingCancel) e.currentTarget.style.background = '#ff453a25';
              }}
              onMouseLeave={(e) => {
                if (!isConfirmingCancel) e.currentTarget.style.background = '#ff453a15';
              }}
              title={isConfirmingCancel ? 'Klicken zum Bestätigen der Stornierung' : 'Buchung stornieren'}
              aria-label={isConfirmingCancel ? 'Löschen bestätigen' : 'Buchung stornieren'}
            >
              <Trash2 size={13} strokeWidth={2.4} />
              {isConfirmingCancel && <span>Sicher?</span>}
            </button>
          </div>
        </div>

        {/* Row 2: Room & Purpose (Left) + Status Badge (Right) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
            <span
              style={{
                fontSize: '0.74rem',
                color: '#6d28d9',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {b.teacherName === 'Schule' ? `Schule • ${b.roomName}` : b.roomName}
            </span>

            {b.purpose && b.purpose.toLowerCase() !== 'unterricht' && (
              <span
                style={{
                  fontSize: '0.72rem',
                  color: '#475569',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={b.purpose.replace(/^Unterricht:\s*/i, '')}
              >
                • {b.purpose.replace(/^Unterricht:\s*/i, '')}
              </span>
            )}
          </div>

          {/* Status Badge */}
          <span
            style={{
              fontSize: '0.64rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '100px',
              background: isBookingConfirmed ? 'rgba(34, 197, 94, 0.14)' : 'rgba(234, 179, 8, 0.14)',
              border: isBookingConfirmed
                ? '1px solid rgba(34, 197, 94, 0.28)'
                : '1px solid rgba(234, 179, 8, 0.28)',
              color: isBookingConfirmed ? '#15803d' : '#9a3412',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: isBookingConfirmed
                ? '0 1px 4px rgba(34, 197, 94, 0.12)'
                : '0 1px 4px rgba(234, 179, 8, 0.1)',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
            title={
              isBookingConfirmed
                ? 'Buchung vom Sekretariat bestätigt'
                : 'Unter Vorbehalt (Sekretariat prüft diese Reservierung)'
            }
          >
            {isBookingConfirmed ? (
              <>
                <CheckCircle2 size={11} strokeWidth={2.6} style={{ color: '#16a34a' }} />
                <span>Bestätigt</span>
              </>
            ) : (
              <>
                <Clock size={11} strokeWidth={2.4} style={{ color: '#9a3412' }} />
                <span>Unter Vorbehalt</span>
              </>
            )}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Mass Cancellation Button */}
      {myBookings.length >= 2 && (
        <button
          type="button"
          onClick={handleCancelAllClick}
          style={{
            background: confirmCancelAll ? '#ef4444' : '#ff453a15',
            color: confirmCancelAll ? '#ffffff' : '#ff453a',
            border: 'none',
            padding: '8px 14px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            width: '100%',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            if (!confirmCancelAll) e.currentTarget.style.background = '#ff453a25';
          }}
          onMouseLeave={(e) => {
            if (!confirmCancelAll) e.currentTarget.style.background = '#ff453a15';
          }}
        >
          <Trash2 size={13} strokeWidth={2.4} />
          <span>
            {confirmCancelAll
              ? `Wirklich alle ${myBookings.length} stornieren?`
              : 'Alle Buchungen stornieren'}
          </span>
        </button>
      )}

      {/* Booking List Container */}
      <div
        className="custom-calendar-scrollbar"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: 'calc(100vh - 310px)',
          overflowY: 'auto'
        }}
      >
        {myBookings.length === 0 ? (
          <div
            style={{
              fontSize: '0.78rem',
              color: '#8e8e93',
              fontWeight: 700,
              textAlign: 'center',
              padding: '24px 16px',
              border: '1.5px dashed #e5e5ea',
              borderRadius: '14px',
              background: '#f2f2f7'
            }}
          >
            Du hast aktuell keine Raumbuchungen vorgenommen.
          </div>
        ) : (
          <>
            {/* Upcoming Grouped Sections */}
            {groupedUpcoming.map((group) => (
              <div key={group.title} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: '#64748b',
                    letterSpacing: '0.05em',
                    padding: '0 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Calendar size={12} strokeWidth={2.5} />
                  <span>{group.title}</span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      background: '#e2e8f0',
                      color: '#475569',
                      padding: '1px 6px',
                      borderRadius: '10px'
                    }}
                  >
                    {group.bookings.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.bookings.map(renderBookingCard)}
                </div>
              </div>
            ))}

            {upcomingBookings.length === 0 && pastBookings.length > 0 && (
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#64748b',
                  fontWeight: 700,
                  textAlign: 'center',
                  padding: '16px',
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '14px',
                  background: '#f8fafc'
                }}
              >
                Keine anstehenden Termine vorhanden.
              </div>
            )}

            {/* Past Bookings Toggle & Section */}
            {pastBookings.length > 0 && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowPastBookings((prev) => !prev)}
                  style={{
                    background: 'transparent',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '0.72rem',
                    fontWeight: 750,
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {showPastBookings ? (
                    <>
                      <ChevronUp size={13} strokeWidth={2.4} />
                      <span>Vergangene Buchungen verbergen</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={13} strokeWidth={2.4} />
                      <span>
                        + {pastBookings.length}{' '}
                        {pastBookings.length === 1 ? 'vergangene Buchung' : 'vergangene Buchungen'}{' '}
                        anzeigen
                      </span>
                    </>
                  )}
                </button>

                {showPastBookings && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      opacity: 0.85
                    }}
                  >
                    {pastBookings.map(renderBookingCard)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
