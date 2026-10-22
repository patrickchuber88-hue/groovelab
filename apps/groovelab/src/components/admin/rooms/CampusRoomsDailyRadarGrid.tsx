import React from 'react';
import { Calendar, CheckCircle2, Clock, Hourglass, Layers, Lock, MapPin } from 'lucide-react';

export type RoomCalendarViewMode = 'week' | 'radar';

export interface RoomCalendarItem {
  id: string;
  name: string;
  floor?: string;
}

export interface RoomSlotBookingItem {
  id?: string;
  roomId?: string;
  roomName?: string;
  date?: string;
  startTime: string;
  endTime: string;
  purpose?: string;
  title?: string;
  teacherId?: string | null;
  teacherName?: string;
  status?: string;
  is_confirmed?: boolean;
  isSchedule?: boolean;
  isPreview?: boolean;
  is_groovelab?: boolean;
  isGroovelab?: boolean;
  subject_name?: string;
  subject?: string;
}

export interface DayOptionItem {
  label: string;
  value: string;
  short: string;
}

export interface RoomCalendarModeSwitchProps {
  mode: RoomCalendarViewMode;
  onChange: (mode: RoomCalendarViewMode) => void;
  brandColor: string;
}

export const RoomCalendarModeSwitch: React.FC<RoomCalendarModeSwitchProps> = ({
  mode,
  onChange,
  brandColor,
}) => {
  return (
    <div
      role="tablist"
      aria-label="Kalenderansicht wechseln"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#f2f2f7',
        padding: '3px',
        borderRadius: '12px',
        border: '1px solid #e5e5ea',
        height: '36px',
        boxSizing: 'border-box',
        gap: '2px',
      }}
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'week'}
        onClick={() => onChange('week')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 11px',
          borderRadius: '9px',
          border: 'none',
          background: mode === 'week' ? '#ffffff' : 'transparent',
          color: mode === 'week' ? '#0f172a' : '#475569',
          fontWeight: mode === 'week' ? 850 : 650,
          fontSize: '0.73rem',
          cursor: 'pointer',
          boxShadow: mode === 'week' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
          height: '28px',
        }}
      >
        <Calendar size={13} color={mode === 'week' ? brandColor : '#64748b'} strokeWidth={2.3} />
        <span>Wochenübersicht</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={mode === 'radar'}
        onClick={() => onChange('radar')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 11px',
          borderRadius: '9px',
          border: 'none',
          background: mode === 'radar' ? '#ffffff' : 'transparent',
          color: mode === 'radar' ? '#0f172a' : '#475569',
          fontWeight: mode === 'radar' ? 850 : 650,
          fontSize: '0.73rem',
          cursor: 'pointer',
          boxShadow: mode === 'radar' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
          height: '28px',
        }}
      >
        <Layers size={13} color={mode === 'radar' ? brandColor : '#64748b'} strokeWidth={2.3} />
        <span>Tagesradar</span>
      </button>
    </div>
  );
};

export interface CampusRoomsDailyRadarGridProps {
  rooms: RoomCalendarItem[];
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  daysOfWeek: DayOptionItem[];
  timeSlots: string[];
  bookingDate: string;
  activeDayIdx: number;
  onSelectDayIdx: (dayIdx: number) => void;
  getWeekdayDate: (dayIdx: number, baseDateStr: string) => string;
  isTodayInWeek: (baseDateStr: string) => boolean;
  isDayToday: (dayIdx: number, baseDateStr: string) => boolean;
  isRoomOccupiedNow: (roomId: string) => boolean;
  getBookingsForSlot: (
    dayIdx: number,
    hourStr: string,
    targetRoomOverride?: RoomCalendarItem
  ) => RoomSlotBookingItem[];
  onSlotClick: (room: RoomCalendarItem, dayIdx: number, hourStr: string) => void;
  onSlotDoubleClick: (room: RoomCalendarItem, dayIdx: number, hourStr: string) => void;
  onBookingClick: (room: RoomCalendarItem, booking: RoomSlotBookingItem) => void;
  brandColor: string;
}

export const CampusRoomsDailyRadarGrid: React.FC<CampusRoomsDailyRadarGridProps> = ({
  rooms,
  selectedRoomId,
  onSelectRoom,
  daysOfWeek,
  timeSlots,
  bookingDate,
  activeDayIdx,
  onSelectDayIdx,
  getWeekdayDate,
  isTodayInWeek,
  isDayToday,
  isRoomOccupiedNow,
  getBookingsForSlot,
  onSlotClick,
  onSlotDoubleClick,
  onBookingClick,
  brandColor,
}) => {
  const isSelectedDayToday = isTodayInWeek(bookingDate) && isDayToday(activeDayIdx, bookingDate);
  const currentHour = new Date().getHours();
  const currentMin = new Date().getMinutes();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Day Selector Pill Strip (Mo - So) */}
      <div
        role="tablist"
        aria-label="Wochentag im Tagesradar wählen"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: '6px',
          background: '#f8fafc',
          padding: '6px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
        }}
      >
        {daysOfWeek.map((day, dIdx) => {
          const isSelected = activeDayIdx === dIdx;
          const isToday = isTodayInWeek(bookingDate) && isDayToday(dIdx, bookingDate);
          const dateLabel = getWeekdayDate(dIdx, bookingDate);

          return (
            <button
              key={day.value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectDayIdx(dIdx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 6px',
                borderRadius: '11px',
                border: isSelected
                  ? `1.5px solid ${brandColor}`
                  : isToday
                  ? '1.5px solid #86efac'
                  : '1px solid transparent',
                background: isSelected ? '#ffffff' : isToday ? '#f0fdf4' : 'transparent',
                color: isSelected ? '#0f172a' : isToday ? '#15803d' : '#475569',
                fontWeight: isSelected ? 850 : 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 2px 8px rgba(15, 23, 42, 0.06)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{day.label}</span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  color: isSelected ? brandColor : '#64748b',
                }}
              >
                {dateLabel}
              </span>
              {isToday && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#34a853',
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Multi-Room Horizontal Timeline Matrix */}
      <div style={{ overflowX: 'auto', width: '100%' }} className="custom-calendar-scrollbar">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #e5e5ea',
            borderRadius: '16px',
            overflow: 'hidden',
            minWidth: '980px',
            background: '#ffffff',
          }}
        >
          {/* Header Row: Room Column + 12 Hourly Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `176px repeat(${timeSlots.length}, minmax(66px, 1fr))`,
              background: '#f8fafc',
              borderBottom: '1px solid #e5e5ea',
            }}
          >
            <div
              style={{
                padding: '11px 14px',
                fontSize: '0.72rem',
                fontWeight: 850,
                color: '#475569',
                borderRight: '1px solid #e5e5ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Raum ({rooms.length})</span>
              <span style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 700 }}>Status</span>
            </div>

            {timeSlots.map((hour, hIdx) => {
              const slotHourInt = parseInt(hour.split(':')[0], 10);
              const isCurrentHour = isSelectedDayToday && currentHour === slotHourInt;
              return (
                <div
                  key={hour}
                  style={{
                    padding: '11px 4px',
                    fontSize: '0.72rem',
                    fontWeight: isCurrentHour ? 900 : 800,
                    color: isCurrentHour ? brandColor : '#475569',
                    textAlign: 'center',
                    borderRight: hIdx < timeSlots.length - 1 ? '1px solid #e5e5ea' : 'none',
                    background: isCurrentHour ? `${brandColor}08` : 'transparent',
                    position: 'relative',
                  }}
                >
                  {isCurrentHour && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: brandColor,
                      }}
                    />
                  )}
                  {hour}
                </div>
              );
            })}
          </div>

          {/* Room Rows */}
          <div
            className="custom-calendar-scrollbar"
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 350px)',
              minHeight: '420px',
              overflowY: 'auto',
            }}
          >
            {rooms.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                Keine passenden Räume für den gewählten Filter gefunden.
              </div>
            ) : (
              rooms.map((room) => {
                const isRoomSelected = selectedRoomId === room.id;
                const occupiedNow = isRoomOccupiedNow(room.id);
                const roomFloor = !room.floor || room.floor === 'Allgemein' ? 'EG' : room.floor;

                return (
                  <div
                    key={room.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `176px repeat(${timeSlots.length}, minmax(66px, 1fr))`,
                      borderBottom: '1px solid #f1f5f9',
                      minHeight: '58px',
                      background: isRoomSelected ? `${brandColor}04` : '#ffffff',
                    }}
                  >
                    {/* Left Sticky Room Identity Cell */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectRoom(room.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectRoom(room.id);
                        }
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRight: '1px solid #e5e5ea',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        borderLeft: isRoomSelected ? `3px solid ${brandColor}` : '3px solid transparent',
                        background: isRoomSelected ? `${brandColor}08` : '#ffffff',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.79rem',
                            fontWeight: 850,
                            color: isRoomSelected ? brandColor : '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {room.name}
                        </span>
                        <span
                          title={occupiedNow ? 'Aktuell belegt' : 'Jetzt frei'}
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: occupiedNow ? '#ef4444' : '#34a853',
                            flexShrink: 0,
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span
                          style={{
                            fontSize: '0.60rem',
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          <MapPin size={8} strokeWidth={2.5} />
                          {roomFloor}
                        </span>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 750,
                            color: occupiedNow ? '#b91c1c' : '#15803d',
                          }}
                        >
                          {occupiedNow ? 'Belegt' : 'Frei'}
                        </span>
                      </div>
                    </div>

                    {/* Hourly Cells across the Day */}
                    {timeSlots.map((hour, hIdx) => {
                      const slotH = parseInt(hour.split(':')[0], 10);
                      const slotBookings = getBookingsForSlot(activeDayIdx, hour, room);
                      const showNowLine = isSelectedDayToday && currentHour === slotH;

                      return (
                        <div
                          key={`${room.id}_${hour}`}
                          role="button"
                          tabIndex={0}
                          aria-label={`${room.name} um ${hour} Uhr anfragen`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSlotClick(room, activeDayIdx, hour);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            onSlotDoubleClick(room, activeDayIdx, hour);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSlotClick(room, activeDayIdx, hour);
                            }
                          }}
                          style={{
                            borderRight: hIdx < timeSlots.length - 1 ? '1px solid #f1f5f9' : 'none',
                            position: 'relative',
                            cursor: 'pointer',
                            minHeight: '58px',
                            background: showNowLine ? `${brandColor}03` : 'transparent',
                          }}
                        >
                          {showNowLine && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: `${(currentMin / 60) * 100}%`,
                                width: '2px',
                                background: '#ff453a',
                                zIndex: 5,
                                pointerEvents: 'none',
                              }}
                            />
                          )}

                          {slotBookings.map((b, bIdx) => {
                            const [shStr, smStr] = (b.startTime || '12:00').split(':');
                            const sh = parseInt(shStr, 10) || 0;
                            const sm = parseInt(smStr, 10) || 0;
                            const [ehStr, emStr] = (b.endTime || '13:00').split(':');
                            const eh = parseInt(ehStr, 10) || 0;
                            const em = parseInt(emStr, 10) || 0;

                            if (slotH !== sh) return null;

                            const startMin = sh * 60 + sm;
                            const endMin = eh * 60 + em;
                            const durationMin = Math.max(25, endMin - startMin);
                            const leftPercent = (sm / 60) * 100;
                            const widthPercent = (durationMin / 60) * 100;

                            const isSchedule = Boolean(b.isSchedule);
                            const purposeLower = (b.purpose || '').toLowerCase();
                            const teacherLower = (b.teacherName || '').toLowerCase();
                            const subjectLower = (b.subject_name || b.subject || '').toLowerCase();
                            const isGroovelabBlock =
                              b.teacherId === 'groovelab' ||
                              Boolean(b.is_groovelab) ||
                              Boolean(b.isGroovelab) ||
                              purposeLower.includes('groovelab') ||
                              purposeLower.includes('groove lab') ||
                              teacherLower.includes('groovelab') ||
                              teacherLower.includes('groove lab') ||
                              subjectLower.includes('groovelab');

                            const isBookingConfirmed =
                              !isSchedule && b.status === 'confirmed' && b.is_confirmed === true;

                            let cardBg = '#34a853';
                            let cardBorder = '1px solid rgba(0, 0, 0, 0.08)';
                            let textColor = '#ffffff';

                            if (b.isPreview) {
                              cardBg = 'rgba(124, 58, 237, 0.22)';
                              cardBorder = '1.5px dashed #7c3aed';
                              textColor = '#5b21b6';
                            } else if (isGroovelabBlock) {
                              cardBg = '#facc15';
                              cardBorder = '1px solid rgba(0, 0, 0, 0.12)';
                              textColor = '#0f172a';
                            } else if (!isSchedule) {
                              if (isBookingConfirmed) {
                                cardBg = '#8b5cf6';
                                cardBorder = '1.5px solid #7c3aed';
                                textColor = '#ffffff';
                              } else {
                                cardBg =
                                  'repeating-linear-gradient(-45deg, #f5f3ff 0px, #f5f3ff 8px, #ede9fe 8px, #ede9fe 16px)';
                                cardBorder = '1.5px dashed #8b5cf6';
                                textColor = '#5b21b6';
                              }
                            }

                            return (
                              <div
                                key={b.id || `${room.id}_${b.startTime}_${b.endTime}_${bIdx}`}
                                title={`${room.name} · ${b.startTime}–${b.endTime} · ${b.teacherName || 'Lehrkraft'} (${b.purpose || 'Belegung'})`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (b.isPreview || b.id === 'preview_draft_booking') return;
                                  onBookingClick(room, b);
                                }}
                                onDoubleClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'absolute',
                                  top: '5px',
                                  bottom: '5px',
                                  left: `${leftPercent}%`,
                                  width: `calc(${widthPercent}% - 3px)`,
                                  zIndex: 10,
                                  borderRadius: '10px',
                                  background: cardBg,
                                  border: cardBorder,
                                  color: textColor,
                                  padding: '4px 7px',
                                  boxSizing: 'border-box',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '4px',
                                    fontSize: '0.62rem',
                                    fontWeight: 850,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {b.teacherName || 'Lehrkraft'}
                                  </span>
                                  {isSchedule ? (
                                    <Lock size={10} color={textColor} style={{ flexShrink: 0, opacity: 0.85 }} />
                                  ) : isBookingConfirmed ? (
                                    <CheckCircle2 size={10} color={textColor} style={{ flexShrink: 0 }} />
                                  ) : (
                                    <Hourglass size={10} color="#7c3aed" style={{ flexShrink: 0 }} />
                                  )}
                                </div>

                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.58rem',
                                    fontWeight: 750,
                                    opacity: 0.92,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  <Clock size={9} color={textColor} style={{ flexShrink: 0 }} />
                                  <span>
                                    {b.startTime}–{b.endTime}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
