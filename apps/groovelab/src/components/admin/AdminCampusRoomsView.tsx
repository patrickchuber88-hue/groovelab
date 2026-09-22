import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ArrowLeft, Box, Calendar, Check, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, Clock, Disc, DoorClosed, ExternalLink, Eye, Hourglass, Info, Lock,
  MapPin, Maximize2, Music, Plus, Search, Sliders, Star, Trash2, Users,
  Volume2, X, XCircle, Zap
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { formatTeacherFullName, maskLastName } from "../../utils/nameHelper";

const capitalizeName = (str: string | null | undefined): string => {
  if (!str) return "";
  return str.trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
};

const checkRoomMatchesInstrumentFilter = (room: any, filterType: string, schoolId?: string): boolean => {
  if (!filterType || filterType.toLowerCase() === 'alle' || filterType.toLowerCase() === 'all') return true;
  if (!room) return false;

  const localMap = (() => {
    const sId = schoolId || room.school_id;
    if (!sId) return {};
    try {
      return JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${sId}`) || '{}');
    } catch { return {}; }
  })();

  const rawInsts = (Array.isArray(room.room_instruments) && room.room_instruments.length > 0)
    ? room.room_instruments
    : (localMap[room.id] || []);

  const assignedNames: string[] = [];
  if (Array.isArray(rawInsts)) {
    rawInsts.forEach((item: any) => {
      if (typeof item === 'string') {
        assignedNames.push(item);
      } else if (item && typeof item === 'object') {
        if (item.name) assignedNames.push(item.name);
        if (item.model) assignedNames.push(item.model);
      }
    });
  }

  if (Array.isArray(room.equipment)) {
    room.equipment.forEach((eq: any) => {
      if (typeof eq === 'string') assignedNames.push(eq);
    });
  }

  // Pure inventory corpus: room name + description + assigned instruments (clean, without unsuitable_instruments blacklist)
  const searchCorpus = `${room.name || ''} ${room.description || ''} ${assignedNames.join(' ')}`.toLowerCase();
  const filterKey = filterType.toLowerCase();

  if (filterKey === 'klavier' || filterKey === 'piano') {
    return ['klavier', 'piano', 'flügel', 'e-piano', 'epiano', 'keyboard', 'keys', 'stagepiano', 'digitalpiano', 'tasten']
      .some(term => searchCorpus.includes(term));
  }

  if (filterKey === 'schlagzeug' || filterKey === 'drums' || filterKey === 'drum') {
    return ['schlagzeug', 'drum', 'e-drum', 'edrum', 'percussion', 'perkussion', 'cajon', 'becken', 'snare']
      .some(term => searchCorpus.includes(term));
  }

  if (filterKey === 'pa') {
    return ['pa', 'gesang', 'gesangsanlage', 'box', 'boxen', 'lautsprecher', 'mikrofon', 'mic', 'mischpult', 'mixer', 'monitor']
      .some(term => searchCorpus.includes(term));
  }

  return searchCorpus.includes(filterKey);
};


export interface AdminCampusRoomsViewProps {
  activePlatform: string;
  admin: any;
  userId: string;
  rooms: any[];
  setRooms?: (r: any) => void;
  schoolObj: any;
  students: any[];
  teachers?: any[];
  schedules: any[];
  setSchedules: React.Dispatch<React.SetStateAction<any[]>>;
  campusBookings: any[];
  setCampusBookings: React.Dispatch<React.SetStateAction<any[]>>;
  dbRoomBookings: any[];
  scheduleOccurrences: any[];
  holidays: any[];
  roomSearchQuery: string;
  setRoomSearchQuery: (q: string) => void;
  selectedCampusRoomId: string;
  setSelectedCampusRoomId: (id: string) => void;
  selectedFloor: string;
  setSelectedFloor: (f: string) => void;
  selectedEquipmentFilter: string;
  setSelectedEquipmentFilter: (eq: string) => void;
  showOnlyFreeNow: boolean;
  setShowOnlyFreeNow: React.Dispatch<React.SetStateAction<boolean>>;
  showMyBookingsOnly: boolean;
  setShowMyBookingsOnly: React.Dispatch<React.SetStateAction<boolean>>;
  isDateFilterActive: boolean;
  setIsDateFilterActive: (val: boolean) => void;
  bookingDate: string;
  setBookingDate: (d: string) => void;
  bookingStartTime: string;
  setBookingStartTime: (t: string) => void;
  bookingEndTime: string;
  setBookingEndTime: (t: string) => void;
  bookingPurpose: string;
  setBookingPurpose: (p: string) => void;
  bookingType: any;
  setBookingType: (t: any) => void;
  bookingStudentId: string;
  setBookingStudentId: (s: string) => void;
  bookingTargetType: any;
  setBookingTargetType: (t: any) => void;
  externalBookingPartnerName: string;
  setExternalBookingPartnerName: (name: string) => void;
  selectedBooking: any;
  setSelectedBooking: (b: any) => void;
  isRecurring: boolean;
  setIsRecurring: (val: boolean) => void;
  recurringInterval: number;
  setRecurringInterval: (interval: number) => void;
  showPreviewField: boolean;
  setShowPreviewField: React.Dispatch<React.SetStateAction<boolean>>;
  showMobileRoomSlider: boolean;
  setShowMobileRoomSlider: React.Dispatch<React.SetStateAction<boolean>>;
  mobileSelectedDayIdx: number;
  setMobileSelectedDayIdx: (idx: number) => void;
  favoriteRoomId: string | null;
  setFavoriteRoomId: (id: string | null) => void;
  dragOverCell: any;
  setDragOverCell: (cell: any) => void;
  showRoomFinderBar: boolean;
  setShowRoomFinderBar: React.Dispatch<React.SetStateAction<boolean>>;
  finderStartTime: string;
  setFinderStartTime: (t: string) => void;
  finderEndTime: string;
  setFinderEndTime: (t: string) => void;
  roomBlockedSlots: any[];
  calendarScrollRef: any;
  fetchData: () => Promise<void>;
  showRealNames: boolean;
  isMobile: boolean;
  hoveredInstrumentIdx: number | null;
  setHoveredInstrumentIdx: (idx: number | null) => void;
  setDraftBooking: (b: any) => void;
  setFinderResultCount: (c: number | null) => void;
  setIsRoomSearchDropdownOpen: (open: boolean) => void;
  setStudentSearchTerm: (term: string) => void;
  setSuccessAnimationRoomId: (id: string | null) => void;
}

export const AdminCampusRoomsView: React.FC<AdminCampusRoomsViewProps> = ({
  activePlatform,
  admin,
  userId,
  rooms,
  setRooms,
  schoolObj,
  students,
  teachers,
  schedules,
  setSchedules,
  campusBookings,
  setCampusBookings,
  dbRoomBookings,
  scheduleOccurrences,
  holidays,
  roomSearchQuery,
  setRoomSearchQuery,
  selectedCampusRoomId,
  setSelectedCampusRoomId,
  selectedFloor,
  setSelectedFloor,
  selectedEquipmentFilter,
  setSelectedEquipmentFilter,
  showOnlyFreeNow,
  setShowOnlyFreeNow,
  showMyBookingsOnly,
  setShowMyBookingsOnly,
  isDateFilterActive,
  setIsDateFilterActive,
  bookingDate,
  setBookingDate,
  bookingStartTime,
  setBookingStartTime,
  bookingEndTime,
  setBookingEndTime,
  bookingPurpose,
  setBookingPurpose,
  bookingType,
  setBookingType,
  bookingStudentId,
  setBookingStudentId,
  bookingTargetType,
  setBookingTargetType,
  externalBookingPartnerName,
  setExternalBookingPartnerName,
  selectedBooking,
  setSelectedBooking,
  isRecurring,
  setIsRecurring,
  recurringInterval,
  setRecurringInterval,
  showPreviewField,
  setShowPreviewField,
  showMobileRoomSlider,
  setShowMobileRoomSlider,
  mobileSelectedDayIdx,
  setMobileSelectedDayIdx,
  favoriteRoomId,
  setFavoriteRoomId,
  dragOverCell,
  setDragOverCell,
  showRoomFinderBar,
  setShowRoomFinderBar,
  finderStartTime,
  setFinderStartTime,
  finderEndTime,
  setFinderEndTime,
  roomBlockedSlots,
  calendarScrollRef,
  fetchData,
  showRealNames,
  isMobile,
  hoveredInstrumentIdx,
  setHoveredInstrumentIdx,
  setDraftBooking,
  setFinderResultCount,
  setIsRoomSearchDropdownOpen,
  setStudentSearchTerm,
  setSuccessAnimationRoomId,
}) => {
    const brandColor = activePlatform === 'campus' ? '#34a853' : (activePlatform === 'groovelab' ? '#eab308' : '#ea4335');
    const isEditing = !!(selectedBooking && (!selectedBooking.isSchedule || selectedBooking.teacherId === userId));
    const isStaff = admin?.role?.toLowerCase() === 'secretary' || admin?.role?.toLowerCase() === 'admin';
    
    // Fast lookup map for resolving teacher names from teacher_id
    const teacherLookupMap = useMemo(() => {
      const map: Record<string, string> = {};
      (teachers || []).forEach((t: any) => {
        if (t?.id) {
          const name = formatTeacherFullName(t);
          map[t.id] = name;
          const cleanId = t.id.replace(/^teacher-/i, '');
          map[cleanId] = name;
        }
      });
      return map;
    }, [teachers]);

    const handleQuickDuration = (mins: number) => {
      const [sh, sm] = bookingStartTime.split(':').map(Number);
      const total = sh * 60 + sm + mins;
      const eh = Math.floor(total / 60) % 24;
      const em = total % 60;
      setBookingEndTime(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
      setIsDateFilterActive(true);
    };

    // Helper to extract unique floors for this school's rooms
    const uniqueFloors = Array.from(new Set(rooms.map(r => {
      const f = r.floor;
      return (!f || f === 'Allgemein') ? 'EG' : f;
    }))).sort((a, b) => {
      const getIndex = (f: string) => {
        const lf = f.toLowerCase();
        if (lf.includes('ug')) return 0;
        if (lf.includes('eg')) return 1;
        if (lf.includes('og')) {
          const num = parseInt(lf.replace(/[^0-9]/g, '')) || 1;
          return 2 + num / 10;
        }
        return 10;
      };
      return getIndex(a) - getIndex(b);
    });

    const toBerlinYYYYMMDD = (d: Date): string => {
      try {
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Berlin',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(d);
      } catch (e) {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    };

    const parseLocalDate = (dateStr: string): Date => {
      if (!dateStr) return new Date();
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
      }
      return new Date(dateStr);
    };

    const changeWeek = (weeks: number) => {
      const d = parseLocalDate(bookingDate);
      d.setUTCDate(d.getUTCDate() + weeks * 7);
      setBookingDate(toBerlinYYYYMMDD(d));
    };

    const getCalendarWeek = (dateStr: string) => {
      const date = parseLocalDate(dateStr);
      const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const getWeekRange = (dateStr: string) => {
      const d = parseLocalDate(dateStr);
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1);
      const mon = new Date(d.setUTCDate(diff));
      const sun = new Date(mon);
      sun.setUTCDate(mon.getUTCDate() + 6);
      const format = (dt: Date) => dt.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit' });
      const yearFormat = (dt: Date) => dt.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', year: 'numeric' });
      return `${format(mon)} - ${format(sun)}.${d.getUTCFullYear() !== mon.getUTCFullYear() ? ' ' + yearFormat(sun) : ''}`;
    };

    const getWeekdayDate = (dayIdx: number, baseDateStr: string) => {
      const d = parseLocalDate(baseDateStr);
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1) + dayIdx;
      d.setUTCDate(diff);
      return d.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit' });
    };

    const isTodayInWeek = (baseDateStr: string) => {
      const today = new Date();
      const todayBerlinStr = toBerlinYYYYMMDD(today);
      const todayBerlin = parseLocalDate(todayBerlinStr);
      
      const d = parseLocalDate(baseDateStr);
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1);
      const mon = new Date(d.setUTCDate(diff));
      const sun = new Date(mon);
      sun.setUTCDate(mon.getUTCDate() + 6);
      
      return todayBerlin >= mon && todayBerlin <= sun;
    };

    const isDayToday = (dayIdx: number, baseDateStr: string) => {
      const today = new Date();
      const todayBerlinStr = toBerlinYYYYMMDD(today);
      
      const d = parseLocalDate(baseDateStr);
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - (day === 0 ? 6 : day - 1) + dayIdx;
      d.setUTCDate(diff);
      
      return todayBerlinStr === toBerlinYYYYMMDD(d);
    };

    const handleCancelBooking = async (bookingId: string | string[]) => {
      const ids = Array.isArray(bookingId) ? bookingId : [bookingId];
      
      const blockedSlotIds = ids.filter(id => roomBlockedSlots.some(s => s.id === id));
      if (blockedSlotIds.length > 0) {
        if (!window.confirm('Möchtest du diese wöchentliche Blockierung wirklich löschen?')) return;
        try {
          const { error } = await supabase
            .from('room_blocked_slots')
            .delete()
            .in('id', blockedSlotIds);
          if (error) throw error;
          await fetchData();
        } catch (err: any) {
          console.error('Error deleting blocked slot:', err);
          alert('Fehler beim Löschen der Blockierung: ' + err.message);
        }
        return;
      }

      const localManualIds = ids.filter(id => !id.includes('-') && !scheduleOccurrences.some(o => o.id === id));
      const dbBookingIds = ids.filter(id => dbRoomBookings.some(b => b.id === id));
      const occurIds = ids.filter(id => 
        (id.includes('-') || scheduleOccurrences.some(o => o.id === id)) && 
        !dbRoomBookings.some(b => b.id === id) &&
        !dbBookingIds.some(dbId => {
          const dbB = dbRoomBookings.find(b => b.id === dbId);
          const occ = scheduleOccurrences.find(o => o.id === id);
          return dbB && occ && dbB.date === occ.date && dbB.startTime.substring(0, 5) === occ.start_time.substring(0, 5);
        })
      );
      
      if (localManualIds.length > 0) {
        setCampusBookings(prev => prev.filter(b => !localManualIds.includes(b.id)));
      }
      
      if (dbBookingIds.length > 0) {
        if (!window.confirm('Möchtest du diese Raumbuchung wirklich löschen/stornieren?')) return;
        try {
          for (const bId of dbBookingIds) {
            const b = dbRoomBookings.find(db => db.id === bId);
            if (!b) continue;

            // Check if term-coupled
            const { data: occ } = await supabase
              .from('schedule_occurrences')
              .select('*, schedules(*)')
              .eq('date', b.date)
              .eq('start_time', b.startTime.length === 5 ? `${b.startTime}:00` : b.startTime)
              .eq('teacher_id', b.teacherId)
              .maybeSingle();

            if (occ) {
              const regularRoomId = occ.schedules?.room_id;
              if (regularRoomId) {
                if (b.roomId === regularRoomId) {
                  // Revert occurrence
                  if (occ.original_date && occ.original_start_time) {
                    const { error: updErr } = await supabase
                      .from('schedule_occurrences')
                      .update({
                        date: occ.original_date,
                        start_time: occ.original_start_time,
                        status: 'scheduled'
                      })
                      .eq('id', occ.id);
                    if (updErr) throw updErr;
                  } else {
                    const { error: delErr } = await supabase
                      .from('schedule_occurrences')
                      .delete()
                      .eq('id', occ.id);
                    if (delErr) throw delErr;
                  }
                  
                  // Delete room booking
                  const { error: delErr } = await supabase
                    .from('room_bookings')
                    .delete()
                    .eq('id', b.id);
                  if (delErr) throw delErr;
                  
                  alert('Die Terminverschiebung wurde storniert und auf die ursprüngliche Zeit zurückgesetzt.');
                } else {
                  const { error: updErr } = await supabase
                    .from('room_bookings')
                    .update({ room_id: regularRoomId })
                    .eq('id', b.id);
                  if (updErr) throw updErr;
                  
                  const { data: roomData } = await supabase
                    .from('rooms')
                    .select('name')
                    .eq('id', regularRoomId)
                    .maybeSingle();
                  const roomName = roomData?.name || 'regulären Unterrichtsraum';
                  alert(`Der Raum für den Termin wurde wieder auf den ${roomName} zurückgesetzt.`);
                }
              } else {
                alert('Für diesen Termin wurde noch kein regulärer Raum zugeordnet.');
                continue;
              }
            } else {
              // Not term-coupled, delete directly
              const { error: delErr } = await supabase
                .from('room_bookings')
                .delete()
                .eq('id', bId);
              if (delErr) throw delErr;
            }
          }
          window.dispatchEvent(new CustomEvent('refresh-bookings'));
          await fetchData();
        } catch (err) {
          console.error('Error canceling db room booking:', err);
          alert('Fehler beim Löschen der Raumbuchung.');
        }
      }
      
      if (occurIds.length > 0) {
        if (!window.confirm('Möchtest du diese Terminverschiebung wirklich stornieren? Der Termin wird auf die ursprüngliche Zeit zurückgesetzt.')) return;
        try {
          for (const occId of occurIds) {
            const occ = scheduleOccurrences.find(o => o.id === occId);
            if (occ) {
              if (occ.original_date && occ.original_start_time) {
                const { error } = await supabase
                  .from('schedule_occurrences')
                  .update({
                    date: occ.original_date,
                    start_time: occ.original_start_time,
                    status: 'scheduled'
                  })
                  .eq('id', occId);
                if (error) throw error;
              } else {
                const { error } = await supabase
                  .from('schedule_occurrences')
                  .delete()
                  .eq('id', occId);
                if (error) throw error;
              }
            }
          }
          await fetchData();
        } catch (err) {
          console.error('Error canceling occurrence reschedule:', err);
          alert('Fehler beim Stornieren der Verschiebung.');
        }
      }
    };

    // Map bookings and weekly schedules
    // Merge consecutive schedules for this campus view
    const mergedSchedules = (() => {
      const virtualGroovelabSchedules: any[] = [];
      const opHours = schoolObj?.opening_hours || {};
      const dayKeys = ['', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const DAYS_MAP = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const glRooms = rooms.filter((r: any) => r.name && r.name.toLowerCase().includes('groovelab'));

      for (let d = 1; d <= 7; d++) {
        const dayKey = dayKeys[d];
        const dayHours = opHours[dayKey];
        if (dayHours && dayHours.active === true) {
          const startTimeStr = dayHours.start || '14:00';
          const endTimeStr = dayHours.end || '18:00';
          // Calculate duration in minutes
          const [shStr, smStr] = startTimeStr.split(':');
          const [ehStr, emStr] = endTimeStr.split(':');
          const duration = (parseInt(ehStr) * 60 + parseInt(emStr)) - (parseInt(shStr) * 60 + parseInt(smStr));

          // 1% Monolith Goldstandard: Assign strictly to the designated GrooveLab room
          const designatedRoomId = dayHours.roomId || 
            glRooms.find((r: any) => r.is_groovelab_active === true)?.id || 
            glRooms.find((r: any) => (r.name || '').toLowerCase() === 'groovelab')?.id || 
            glRooms[0]?.id || 
            (rooms.length > 0 ? rooms[0].id : 'groovelab');

          virtualGroovelabSchedules.push({
            id: `virtual_groovelab_schedule_${d}`,
            room_id: designatedRoomId,
            day_of_week: DAYS_MAP[d],
            teacher_id: 'groovelab',
            teacher: { first_name: 'GrooveLab', last_name: '' },
            teacher_name: 'GrooveLab',
            purpose: 'GrooveLab Plattform',
            time_slot: startTimeStr,
            start_time: startTimeStr,
            end_time: endTimeStr,
            duration: duration,
            status: 'approved',
            is_approved: true
          });
        }
      }

      const allSchedules = [...(schedules || []), ...virtualGroovelabSchedules];
      if (allSchedules.length === 0) return [];
      
      const groups: { [key: string]: any[] } = {};
      allSchedules.forEach((s: any) => {
        const key = `${s.room_id}_${s.day_of_week}_${s.teacher_id}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      });

      const merged: any[] = [];
      Object.values(groups).forEach((groupList: any) => {
        const parsed = groupList.map((s: any) => {
          const startTimeStr = s.time_slot || s.start_time || '';
          const durationMin = s.duration || s.duration_minutes || 45;
          const [shStr, smStr] = startTimeStr.split(':');
          const sh = parseInt(shStr) || 0;
          const sm = parseInt(smStr) || 0;
          const startMin = sh * 60 + sm;
          const endMin = startMin + durationMin;
          return { ...s, startMin, endMin };
        });

        parsed.sort((a: any, b: any) => a.startMin - b.startMin);

        const mergedGroup: any[] = [];
        parsed.forEach((item: any) => {
          if (mergedGroup.length === 0) {
            mergedGroup.push({ ...item });
          } else {
            const last = mergedGroup[mergedGroup.length - 1];
            if (item.startMin <= last.endMin + 5) {
              last.endMin = Math.max(last.endMin, item.endMin);
            } else {
              mergedGroup.push({ ...item });
            }
          }
        });

        mergedGroup.forEach((item: any) => {
          const sh = Math.floor(item.startMin / 60);
          const sm = item.startMin % 60;
          item.time_slot = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
          item.duration = item.endMin - item.startMin;
          merged.push(item);
        });
      });
      return merged;
    })();

    const parseRoomName = (name: string) => {
      const trimmed = name.trim();
      const match = trimmed.match(/^(.*?)\s*(\d+)$/);
      if (match) {
        return {
          prefix: match[1].trim(),
          number: parseInt(match[2], 10)
        };
      }
      return {
        prefix: trimmed,
        number: null
      };
    };

    // Check if room is occupied *right now* (Ist-Zustand)
    const isRoomOccupiedNow = (roomId: string) => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      const currentMin = now.getHours() * 60 + now.getMinutes();

      const isHolidayNow = holidays.some(h => todayStr >= h.start && todayStr <= h.end);
      if (isHolidayNow) {
        // If it is a holiday right now, only check if there is an active Nachholtermin right now
        const hasDynamicNow = scheduleOccurrences.some((occ: any) => {
          const rId = occ.schedules?.room_id || null;
          if (rId !== roomId) return false;
          if (occ.date !== todayStr) return false;
          if (occ.status === 'cancelled' || occ.status === 'teacher_ausfall' || occ.status === 'canceled_by_teacher_ausfall') {
            return false;
          }
          const isRescheduledFromOutside = occ.original_date && 
            occ.original_date !== occ.date && 
            !holidays.some(h => occ.original_date >= h.start && occ.original_date <= h.end);
          if (!isRescheduledFromOutside) return false;

          const durationMin = occ.duration || 45;
          const [shStr, smStr] = occ.start_time.split(':');
          const sh = parseInt(shStr) || 0;
          const sm = parseInt(smStr) || 0;
          const occStartMin = sh * 60 + sm;
          const occEndMin = occStartMin + durationMin;
          return currentMin >= occStartMin && currentMin < occEndMin;
        });
        return hasDynamicNow;
      }

      const todayBookings = campusBookings.filter((b: any) => b.roomId === roomId && b.date === todayStr);
      const hasBookingNow = todayBookings.some((b: any) => {
        const [sh, sm] = b.startTime.split(':').map(Number);
        const [eh, em] = b.endTime.split(':').map(Number);
        const bStart = sh * 60 + sm;
        const bEnd = eh * 60 + em;
        return currentMin >= bStart && currentMin < bEnd;
      });

      if (hasBookingNow) return true;

      const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayVal = now.getDay();
      const targetDay = DAYS_MAP[dayVal];
      const targetDayInt = dayVal === 0 ? 7 : dayVal;

      const hasScheduleNow = mergedSchedules.some((s: any) => {
        if (s.room_id !== roomId) return false;
        const startTimeStr = s.time_slot || s.start_time;
        if (!startTimeStr) return false;
        
        const matchesDay = s.day_of_week === targetDay || 
                           s.day_of_week === targetDayInt || 
                           String(s.day_of_week) === String(targetDayInt);
        if (!matchesDay) return false;

        const durationMin = s.duration || s.duration_minutes || 45;
        const [shStr, smStr] = startTimeStr.split(':');
        const sh = parseInt(shStr) || 0;
        const sm = parseInt(smStr) || 0;
        const schedStartMin = sh * 60 + sm;
        const schedEndMin = schedStartMin + durationMin;

        return currentMin >= schedStartMin && currentMin < schedEndMin;
      });

      return hasScheduleNow;
    };

    // Filter rooms by floor, equipment, search query AND availability filters
    const roomsToRender = (rooms.filter(room => {
      if (activePlatform === 'campus' && room.is_campus_active === false) return false;
      if (selectedFloor && selectedFloor.toLowerCase() !== 'alle' && selectedFloor.toLowerCase() !== 'all') {
        const normalizedRoomFloor = (!room.floor || room.floor === 'Allgemein') ? 'EG' : room.floor;
        if (normalizedRoomFloor !== selectedFloor && room.floor !== selectedFloor) return false;
      }
      if (selectedEquipmentFilter && selectedEquipmentFilter.toLowerCase() !== 'alle' && selectedEquipmentFilter.toLowerCase() !== 'all') {
        if (!checkRoomMatchesInstrumentFilter(room, selectedEquipmentFilter, admin?.school_id)) {
          return false;
        }
      }
      if (roomSearchQuery.trim()) {
        const query = roomSearchQuery.toLowerCase();
        const matchesName = room.name?.toLowerCase().includes(query);
        const matchesFloor = room.floor?.toLowerCase().includes(query);
        const matchesDesc = room.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesFloor && !matchesDesc) return false;
      }
      // Instant Availability Filter: "Jetzt frei"
      if (showOnlyFreeNow && isRoomOccupiedNow(room.id)) {
        return false;
      }
      // Slot Availability Filter: "Freier Slot"
      if (isDateFilterActive) {
        const toMin = (t: string) => { const [h, m] = t.split(':'); return parseInt(h || '0') * 60 + parseInt(m || '0'); };
        const newStart = toMin(bookingStartTime);
        const newEnd = toMin(bookingEndTime);
        
        const hasBooking = campusBookings.some((b: any) => {
          if (b.roomId !== room.id || b.date !== bookingDate) return false;
          const bStart = toMin(b.startTime);
          const bEnd = toMin(b.endTime);
          return bStart < newEnd && bEnd > newStart;
        });
        if (hasBooking) return false;

        const parsedD = parseLocalDate(bookingDate);
        const rawDay = parsedD.getUTCDay();
        const targetDayInt = rawDay === 0 ? 7 : rawDay;
        const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDay = DAYS_MAP[rawDay];

        const hasSchedule = mergedSchedules.some((s: any) => {
          if (s.room_id !== room.id) return false;
          const matchesDay = s.day_of_week === targetDay || s.day_of_week === targetDayInt || String(s.day_of_week) === String(targetDayInt);
          if (!matchesDay) return false;
          const startTimeStr = s.time_slot || s.start_time;
          if (!startTimeStr) return false;
          const sStart = toMin(startTimeStr);
          const sEnd = sStart + (s.duration || 45);
          return sStart < newEnd && sEnd > newStart;
        });
        if (hasSchedule) return false;

        const hasBlockedSlot = roomBlockedSlots.some((s: any) => {
          if (s.room_id !== room.id || s.day_of_week !== targetDayInt) return false;
          const blockStart = toMin((s.start_time || '00:00').substring(0, 5));
          const blockEnd = toMin((s.end_time || '23:59').substring(0, 5));
          return blockStart < newEnd && blockEnd > newStart;
        });
        if (hasBlockedSlot) return false;
      }
      return true;
    })).sort((a, b) => {
      const parsedA = parseRoomName(a.name || '');
      const parsedB = parseRoomName(b.name || '');
      const prefixCompare = parsedA.prefix.localeCompare(parsedB.prefix, 'de', { sensitivity: 'base' });
      if (prefixCompare !== 0) return prefixCompare;
      
      const numA = parsedA.number !== null ? parsedA.number : -1;
      const numB = parsedB.number !== null ? parsedB.number : -1;
      return numA - numB;
    });

    // Derived selected room to keep logic aligned
    const selectedRoom = selectedCampusRoomId === 'all'
      ? { id: 'all', name: 'Alle Räume' }
      : (roomsToRender.find(r => r.id === selectedCampusRoomId) || roomsToRender[0] || rooms.find(r => r.id === selectedCampusRoomId) || rooms[0]);

    const getBookingsForSlot = (dayIdx: number, hourStr: string) => {
      if (!selectedRoom) return [];
      
      const mondayOfSelectedWeek = parseLocalDate(bookingDate);
      const dayOfWeek = mondayOfSelectedWeek.getUTCDay();
      const diffToMon = mondayOfSelectedWeek.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      mondayOfSelectedWeek.setUTCDate(diffToMon);

      const targetDate = new Date(mondayOfSelectedWeek);
      targetDate.setUTCDate(mondayOfSelectedWeek.getUTCDate() + dayIdx);
      const targetDateStr = toBerlinYYYYMMDD(targetDate);

      // Check if day falls inside any holiday
      const activeHoliday = holidays.find(h => targetDateStr >= h.start && targetDateStr <= h.end);

      const sundayOfSelectedWeek = new Date(mondayOfSelectedWeek);
      sundayOfSelectedWeek.setUTCDate(mondayOfSelectedWeek.getUTCDate() + 6);

      const DAYS_MAP = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const targetDay = DAYS_MAP[dayIdx];
      const targetDayInt = dayIdx + 1; // 1 = Monday, 7 = Sunday

      // 1. Manual room bookings
      const manualForSlot = campusBookings.filter((b: any) => {
        if (b.roomId !== selectedRoom.id) return false;
        const bDate = parseLocalDate(b.date);
        if (bDate < mondayOfSelectedWeek || bDate > sundayOfSelectedWeek) return false;
        
        const bDayIndex = getWeekdayIndex(b.date);
        if (bDayIndex !== dayIdx) return false;

        const slotHour = parseInt(hourStr.split(':')[0]);
        const slotStartMin = slotHour * 60;
        const slotEndMin = (slotHour + 1) * 60;

        const [shStr, smStr] = b.startTime.split(':');
        const sh = parseInt(shStr) || 0;
        const sm = parseInt(smStr) || 0;
        const bStartMin = sh * 60 + sm;

        const [ehStr, emStr] = b.endTime.split(':');
        const eh = parseInt(ehStr) || 0;
        const em = parseInt(emStr) || 0;
        const bEndMin = eh * 60 + em;
        
        return bStartMin < slotEndMin && bEndMin > slotStartMin;
      });

      // 1b. Database manual room bookings
      const dbManualForSlot = dbRoomBookings.filter((b: any) => {
        if (b.roomId !== selectedRoom.id) return false;
        const bDate = parseLocalDate(b.date);
        if (bDate < mondayOfSelectedWeek || bDate > sundayOfSelectedWeek) return false;
        
        const bDayIndex = getWeekdayIndex(b.date);
        if (bDayIndex !== dayIdx) return false;

        const slotHour = parseInt(hourStr.split(':')[0]);
        const slotStartMin = slotHour * 60;
        const slotEndMin = (slotHour + 1) * 60;

        const [shStr, smStr] = b.startTime.split(':');
        const sh = parseInt(shStr) || 0;
        const sm = parseInt(smStr) || 0;
        const bStartMin = sh * 60 + sm;

        const [ehStr, emStr] = b.endTime.split(':');
        const eh = parseInt(ehStr) || 0;
        const em = parseInt(emStr) || 0;
        const bEndMin = eh * 60 + em;
        
        return bStartMin < slotEndMin && bEndMin > slotStartMin;
      });

      // Combine local and DB manual bookings, de-duplicating by date + room + start_time
      const combinedManuals = [...manualForSlot];
      dbManualForSlot.forEach((dbB: any) => {
        const isDup = combinedManuals.some((m: any) => 
          m.date === dbB.date && 
          m.startTime === dbB.startTime && 
          m.roomId === dbB.roomId
        );
        if (!isDup) {
          combinedManuals.push(dbB);
        }
      });

      // 2. Build merged Teaching Blocks for active lessons on this day in this room
      interface LessonSlot {
        teacherId: string;
        teacherName: string;
        purpose: string;
        startMin: number;
        endMin: number;
      }
      const activeLessons: LessonSlot[] = [];

      // 1% Monolith Goldstandard: Strict room matching - never leak unassigned schedules into rooms
      const isRoomMatch = (targetRoomId?: string) => {
        if (!selectedRoom) return false;
        if (selectedRoom.id === 'all') return true;
        if (targetRoomId && targetRoomId === selectedRoom.id) return true;
        return false;
      };

      // A. Regular weekly recurring schedules
      const daySchedules = (mergedSchedules || []).filter((s: any) => {
        const sRoomId = s.room_id || s.roomId;
        if (!isRoomMatch(sRoomId)) return false;
        const matchesDay = s.day_of_week === targetDay || 
                           s.day_of_week === targetDayInt || 
                           String(s.day_of_week) === String(targetDayInt);
        return matchesDay;
      });

      daySchedules.forEach((s: any) => {
        const startTimeStr = s.time_slot || s.start_time;
        if (!startTimeStr) return;
        const durationMin = s.duration || s.duration_minutes || 45;
        const [shStr, smStr] = startTimeStr.split(':');
        const startMin = (parseInt(shStr) || 0) * 60 + (parseInt(smStr) || 0);
        const endMin = startMin + durationMin;

        // Check if cancelled or rescheduled away on targetDateStr
        const occ = (scheduleOccurrences || []).find((o: any) => 
          o.schedule_id === s.id && 
          (o.original_date === targetDateStr || o.date === targetDateStr)
        );

        if (occ) {
          if (['cancelled', 'teacher_ausfall', 'canceled_by_student', 'canceled_by_teacher_ausfall'].includes(occ.status)) {
            return; // Cancelled lesson
          }
          if (occ.date !== targetDateStr) {
            return; // Rescheduled away
          }
        }

        const rawTeacherName = s.teacher 
          ? formatTeacherFullName(s.teacher)
          : (s.teacher_name 
              ? formatTeacherFullName(s.teacher_name) 
              : (teacherLookupMap[s.teacher_id] || teacherLookupMap[(s.teacher_id || '').replace(/^teacher-/i, '')] || (s.teacher_id === 'groovelab' ? 'GrooveLab' : 'Lehrer')));

        const defaultPurpose = s.teacher_id === 'groovelab' ? 'GrooveLab Plattform' : 'Regulärer Unterricht';

        activeLessons.push({
          teacherId: s.teacher_id || 'unknown',
          teacherName: rawTeacherName || (s.teacher_id === 'groovelab' ? 'GrooveLab' : 'Lehrer'),
          purpose: s.purpose || defaultPurpose,
          startMin,
          endMin
        });
      });

      // B. Rescheduled occurrences moved TO targetDateStr in selectedRoom
      (scheduleOccurrences || []).forEach((occ: any) => {
        const roomId = occ.schedules?.room_id || occ.room_id;
        if (!isRoomMatch(roomId)) return;
        if (occ.date !== targetDateStr) return;
        if (['cancelled', 'teacher_ausfall', 'canceled_by_student', 'canceled_by_teacher_ausfall'].includes(occ.status)) return;

        const startTimeStr = occ.start_time ? occ.start_time.substring(0, 5) : '';
        if (!startTimeStr) return;
        const [shStr, smStr] = startTimeStr.split(':');
        const startMin = (parseInt(shStr) || 0) * 60 + (parseInt(smStr) || 0);
        const durationMin = occ.duration || 45;
        const endMin = startMin + durationMin;

        const rawTeacherName = occ.teacher 
          ? formatTeacherFullName(occ.teacher)
          : (teacherLookupMap[occ.teacher_id] || teacherLookupMap[(occ.teacher_id || '').replace(/^teacher-/i, '')] || 'Lehrer');

        activeLessons.push({
          teacherId: occ.teacher_id || 'unknown',
          teacherName: rawTeacherName || 'Lehrer',
          purpose: occ.purpose || 'Regulärer Unterricht',
          startMin,
          endMin
        });
      });

      // Group by teacher and merge contiguous/overlapping intervals
      const teacherMap: Record<string, LessonSlot[]> = {};
      activeLessons.forEach((item) => {
        const key = item.teacherId !== 'unknown' ? item.teacherId : item.teacherName;
        if (!teacherMap[key]) {
          teacherMap[key] = [];
        }
        teacherMap[key].push(item);
      });

      const mergedBlocks: LessonSlot[] = [];
      Object.keys(teacherMap).forEach((tKey) => {
        const list = teacherMap[tKey];
        if (!list || list.length === 0) return;
        list.sort((a, b) => a.startMin - b.startMin);
        const minStart = list[0].startMin;
        const maxEnd = Math.max(...list.map(item => item.endMin));
        mergedBlocks.push({
          teacherId: list[0].teacherId,
          teacherName: list[0].teacherName,
          purpose: list[0].purpose || (list[0].teacherId === 'groovelab' ? 'GrooveLab Plattform' : 'Regulärer Unterricht'),
          startMin: minStart,
          endMin: maxEnd
        });
      });

      // Filter merged teaching blocks that intersect with hourStr slot
      const slotHour = parseInt(hourStr.split(':')[0]);
      const slotStartMin = slotHour * 60;
      const slotEndMin = (slotHour + 1) * 60;

      const mappedSchedules = mergedBlocks
        .filter(b => b.startMin < slotEndMin && b.endMin > slotStartMin)
        .map((b, idx) => {
          const sh = Math.floor(b.startMin / 60) % 24;
          const sm = b.startMin % 60;
          const eh = Math.floor(b.endMin / 60) % 24;
          const em = b.endMin % 60;

          const startTime = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
          const endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

          return {
            id: `teaching_block_${b.teacherId}_${dayIdx}_${b.startMin}_${idx}`,
            roomId: selectedRoom.id,
            roomName: selectedRoom.name,
            date: targetDateStr,
            startTime,
            endTime,
            purpose: b.purpose || (b.teacherId === 'groovelab' ? 'GrooveLab Plattform' : 'Regulärer Unterricht'),
            teacherId: b.teacherId,
            teacherName: b.teacherName,
            isSchedule: true,
            isScheduleBlock: true,
            isApproved: true
          };
        });

      // 3. Weekly recurring blocked slots (Sperrzeiten)
      const blockedSlotsForSlot = roomBlockedSlots.filter((s: any) => {
        if (s.room_id !== selectedRoom.id) return false;
        if (s.day_of_week !== targetDayInt) return false;

        const startTimeStr = s.start_time ? s.start_time.substring(0, 5) : '';
        const endTimeStr = s.end_time ? s.end_time.substring(0, 5) : '';
        if (!startTimeStr || !endTimeStr) return false;

        const [shStr, smStr] = startTimeStr.split(':');
        const bStartMin = (parseInt(shStr) || 0) * 60 + (parseInt(smStr) || 0);

        const [ehStr, emStr] = endTimeStr.split(':');
        const bEndMin = (parseInt(ehStr) || 0) * 60 + (parseInt(emStr) || 0);

        return bStartMin < slotEndMin && bEndMin > slotStartMin;
      });

      const mappedBlockedSlots = blockedSlotsForSlot.map((s: any) => {
        const startTimeStr = s.start_time ? s.start_time.substring(0, 5) : '00:00';
        const endTimeStr = s.end_time ? s.end_time.substring(0, 5) : '23:59';

        return {
          id: s.id,
          roomId: s.room_id,
          roomName: selectedRoom.name,
          date: targetDateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          purpose: s.reason || 'Sperrung',
          teacherId: null,
          teacherName: 'Kooperation',
          isBlockedSlot: true,
          isSchedule: true,
          isApproved: true
        };
      });

      // 4. Draft/Preview booking during input
      const draftPreviewBooking: any[] = [];
      if (showPreviewField && !selectedBooking && bookingDate && bookingStartTime && bookingEndTime && selectedRoom) {
        const previewParts = bookingDate.split('-');
        const previewDate = previewParts.length === 3
          ? new Date(parseInt(previewParts[0]), parseInt(previewParts[1]) - 1, parseInt(previewParts[2]))
          : new Date(bookingDate);
        previewDate.setHours(0, 0, 0, 0);
        if (previewDate >= mondayOfSelectedWeek && previewDate <= sundayOfSelectedWeek) {
          const previewDayIdx = getWeekdayIndex(bookingDate);
          if (previewDayIdx === dayIdx) {
            const startHour = parseInt(bookingStartTime.split(':')[0]);
            const endHour = parseInt(bookingEndTime.split(':')[0]);
            if (slotHour >= startHour && slotHour < endHour) {
              const isStaff = admin?.role?.toLowerCase() === 'secretary' || admin?.role?.toLowerCase() === 'admin';
              const creatorName = admin 
                ? `${capitalizeName(admin.first_name)} ${capitalizeName(admin.last_name)}`.trim()
                : 'Lehrer';
              const defaultPurpose = bookingPurpose || 'Eigennutzung';
              
              let finalPurpose = defaultPurpose;
              if (isStaff) {
                if (defaultPurpose === 'Unterricht' || defaultPurpose.startsWith('Unterricht:') || defaultPurpose === 'Eigennutzung') {
                  finalPurpose = creatorName;
                }
              }
              const finalTeacherName = isStaff ? 'Schule' : creatorName;

              draftPreviewBooking.push({
                id: 'preview_draft_booking',
                roomId: selectedRoom.id,
                roomName: selectedRoom.name,
                date: bookingDate,
                startTime: bookingStartTime,
                endTime: bookingEndTime,
                purpose: finalPurpose,
                teacherId: userId,
                teacherName: finalTeacherName,
                isPreview: true
              });
            }
          }
        }
      }

      if (activeHoliday) {
        // Show schedule blocks during holidays too (dimmed) so admins/teachers can see the planned schedule
        const holidaySchedules = mappedSchedules.map((s: any) => ({ ...s, isDuringHoliday: true }));
        return [...combinedManuals, ...holidaySchedules, ...mappedBlockedSlots, ...draftPreviewBooking];
      }

      // Filter out manual bookings that are fully covered by a teacher's own schedule block
      const toMinLocal = (t: string) => { const [h, m] = t.split(':'); return (parseInt(h||'0'))*60+(parseInt(m||'0')); };

      const filteredManuals = combinedManuals.filter((manual: any) => {
        const manualStart = toMinLocal(manual.startTime);
        const manualEnd   = toMinLocal(manual.endTime);

        const coveredByOwnSchedule = mappedSchedules.some((sched: any) => {
          if (sched.roomId !== manual.roomId) return false;
          const isOwnTeacher = sched.teacherId === manual.teacherId;
          if (!isOwnTeacher) return false;
          const schedStart = toMinLocal(sched.startTime);
          const schedEnd   = toMinLocal(sched.endTime);
          return manualStart >= schedStart && manualEnd <= schedEnd;
        });

        return !coveredByOwnSchedule;
      });

      return [...filteredManuals, ...mappedSchedules, ...mappedBlockedSlots, ...draftPreviewBooking];
    };

    // Check if room is occupied during selected time slot
    const isRoomOccupied = (roomId: string) => {
      const isHoliday = holidays.some(h => bookingDate >= h.start && bookingDate <= h.end);
      const dateBookings = campusBookings.filter((b: any) => b.date === bookingDate);
      const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      const parsedBookingDate = parseLocalDate(bookingDate);
      const dayVal = parsedBookingDate.getUTCDay();
      const targetDay = DAYS_MAP[dayVal];
      const targetDayInt = dayVal === 0 ? 7 : dayVal; // 1 = Monday, 7 = Sunday

      // Helper: convert "HH:MM" to minutes
      const toMin = (t: string) => { const [h, m] = t.split(':'); return parseInt(h||'0')*60+parseInt(m||'0'); };
      const newStart = toMin(bookingStartTime);
      const newEnd   = toMin(bookingEndTime);

      // Returns true if the new booking is *fully contained within* an existing own block
      const isCoveredByOwnBlock = (blockStart: number, blockEnd: number, ownerId: string | null) => {
        const isOwn = ownerId === userId || (admin && ownerId && ownerId === userId);
        return isOwn && newStart >= blockStart && newEnd <= blockEnd;
      };

      const hasDbBooking = dbRoomBookings.some((b: any) => {
        if (b.roomId !== roomId) return false;
        if (b.date !== bookingDate) return false;
        if (selectedBooking && b.id === selectedBooking.id) return false;
        if (!(b.endTime <= bookingStartTime || b.startTime >= bookingEndTime)) {
          // External bookings are completely untouchable and cannot be overlapped
          if (b.title?.startsWith('[EXTERN]') || b.purpose?.startsWith('[EXTERN]')) return true;
          // Overlap detected — but allow if new booking is fully inside own block
          if (isCoveredByOwnBlock(toMin(b.startTime), toMin(b.endTime), b.teacherId)) return false;
          return true;
        }
        return false;
      });

      const hasBooking = dateBookings.some((b: any) => {
        if (b.roomId !== roomId) return false;
        if (selectedBooking && b.id === selectedBooking.id) return false;
        if (!(b.endTime <= bookingStartTime || b.startTime >= bookingEndTime)) {
          if (b.purpose?.startsWith('[EXTERN]') || b.title?.startsWith('[EXTERN]')) return true;
          if (isCoveredByOwnBlock(toMin(b.startTime), toMin(b.endTime), b.teacherId)) return false;
          return true;
        }
        return false;
      }) || hasDbBooking;

      const hasSchedule = isHoliday ? false : mergedSchedules.some((s: any) => {
        if (s.room_id !== roomId) return false;
        
        const startTimeStr = s.time_slot || s.start_time;
        if (!startTimeStr) return false;
        
        const matchesDay = s.day_of_week === targetDay || 
                           s.day_of_week === targetDayInt || 
                           String(s.day_of_week) === String(targetDayInt);
        if (!matchesDay) return false;

        const durationMin = s.duration || s.duration_minutes || 45;

        const schedStart = toMin(startTimeStr);
        const schedEnd   = schedStart + durationMin;

        // Check overlap
        if (!(schedStart < newEnd && schedEnd > newStart)) return false;

        // Allow if new booking is fully inside the teacher's own schedule block
        const schedTeacherId = s.teacher_id || null;
        if (isCoveredByOwnBlock(schedStart, schedEnd, schedTeacherId)) return false;

        return true;
      });

      const hasDynamic = scheduleOccurrences.some((occ: any) => {
        const rId = occ.schedules?.room_id || null;
        if (rId !== roomId) return false;
        if (occ.date !== bookingDate) return false;

        if (occ.status === 'cancelled' || occ.status === 'teacher_ausfall' || occ.status === 'canceled_by_teacher_ausfall') {
          return false;
        }

        const templateTime = occ.schedules?.time_slot || '';
        const templateDay = occ.schedules?.day_of_week || 0;

        const occDate = parseLocalDate(occ.date);
        const rawDay = occDate.getUTCDay();
        const actualDayOfWeek = rawDay === 0 ? 7 : rawDay;

        const hasTimeMoved = templateTime && occ.start_time.substring(0, 5) !== templateTime.substring(0, 5);
        const hasDayMoved = templateDay && actualDayOfWeek !== templateDay;
        
        const hasFallbackDateMoved = occ.original_date && occ.date !== occ.original_date;
        const hasFallbackTimeMoved = occ.original_start_time && occ.start_time.substring(0, 5) !== occ.original_start_time.substring(0, 5);

        const hasMoved = (occ.status === 'pending_reschedule' || occ.status === 'rescheduled_confirmed') || (
          (occ.schedules && occ.schedules.time_slot)
            ? (hasTimeMoved || hasDayMoved)
            : (hasFallbackDateMoved || hasFallbackTimeMoved)
        );

        if (!hasMoved) return false;

        if (isHoliday) {
          const isRescheduledFromOutside = occ.original_date && 
            occ.original_date !== occ.date && 
            !holidays.some(h => occ.original_date >= h.start && occ.original_date <= h.end);
          if (!isRescheduledFromOutside) return false;
        }

        const durationMin = occ.duration || 45;
        const occStart = toMin(occ.start_time);
        const occEnd   = occStart + durationMin;

        if (!(occStart < newEnd && occEnd > newStart)) return false;

        // Allow if new booking is fully inside own teacher's dynamic occurrence window
        const occTeacherId = occ.schedules?.teacher_id || null;
        if (isCoveredByOwnBlock(occStart, occEnd, occTeacherId)) return false;

        return true;
      });

      const hasBlockedSlot = roomBlockedSlots.some((s: any) => {
        if (s.room_id !== roomId) return false;
        if (s.day_of_week !== targetDayInt) return false;

        const blockStart = toMin((s.start_time || '00:00').substring(0, 5));
        const blockEnd   = toMin((s.end_time || '23:59').substring(0, 5));

        return blockStart < newEnd && blockEnd > newStart;
      });

      return hasBooking || hasSchedule || hasDynamic || hasBlockedSlot;
    };

    const handleAddBooking = async (roomId: string) => {
      const roomName = rooms.find(r => r.id === roomId)?.name || 'Raum';
      const isStaff = admin?.role?.toLowerCase() === 'secretary' || admin?.role?.toLowerCase() === 'admin';
      const creatorName = admin 
        ? `${capitalizeName(admin.first_name)} ${capitalizeName(admin.last_name)}`.trim()
        : 'Lehrer';

      const studentObj = students.find(s => s.id === bookingStudentId);
      const studentName = studentObj ? `Unterricht: ${studentObj.first_name} ${maskLastName(studentObj.last_name, showRealNames)}` : 'Unterricht';
      const defaultPurpose = bookingType === 'lesson' ? studentName : (bookingPurpose || 'Eigennutzung');
      
      let finalPurpose = defaultPurpose;
      if (isStaff) {
        if (defaultPurpose === 'Unterricht' || defaultPurpose.startsWith('Unterricht:') || defaultPurpose === 'Eigennutzung') {
          finalPurpose = creatorName;
        }
      }
      const finalTeacherName = isStaff ? 'Schule' : creatorName;

      let externalInstitutionName = '';
      if (bookingTargetType === 'external') {
        externalInstitutionName = externalBookingPartnerName.trim() || 'Externe Belegung';
      }

      if (isRecurring) {
        if (bookingTargetType === 'external') {
          const resolvedSchoolId = admin?.school_id || (rooms.find(r => r.id === roomId)?.school_id);
          const parts = bookingDate.split('-');
          const d = parts.length === 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : new Date(bookingDate);
          const rawDay = d.getDay();
          const dayOfWeekInt = rawDay === 0 ? 7 : rawDay;

          try {
            const { error } = await supabase
              .from('room_blocked_slots')
              .insert({
                school_id: resolvedSchoolId,
                room_id: roomId,
                day_of_week: dayOfWeekInt,
                start_time: bookingStartTime.length === 5 ? `${bookingStartTime}:00` : bookingStartTime,
                end_time: bookingEndTime.length === 5 ? `${bookingEndTime}:00` : bookingEndTime,
                reason: `[EXTERN] ${externalInstitutionName}` + (bookingPurpose ? ` | ${bookingPurpose}` : '')
              });

            if (error) throw error;
            await fetchData();
          } catch (dbErr: any) {
            console.error('Error inserting room blocked slot:', dbErr);
            alert('Fehler beim Speichern der wöchentlichen Blockierung: ' + dbErr.message);
            return;
          }
        } else {
          // Build the recurring schedule
          const DAYS_MAP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const parts = bookingDate.split('-');
          const d = parts.length === 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : new Date(bookingDate);
          const targetDayName = DAYS_MAP[d.getDay()];

          const [shStr, smStr] = bookingStartTime.split(':');
          const [ehStr, emStr] = bookingEndTime.split(':');
          const startMin = (parseInt(shStr) || 0) * 60 + (parseInt(smStr) || 0);
          const endMin = (parseInt(ehStr) || 0) * 60 + (parseInt(emStr) || 0);
          const durationMin = Math.max(15, endMin - startMin);

          const newSchedule = {
            id: 'sched_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            room_id: roomId,
            day_of_week: targetDayName,
            time_slot: bookingStartTime,
            duration: durationMin,
            purpose: finalPurpose,
            teacher_id: userId,
            teacher: { first_name: finalTeacherName, last_name: '' },
            status: 'approved',
            start_date: bookingDate,
            interval_weeks: recurringInterval
          };

          setSchedules(prev => [...prev, newSchedule]);
        }
      } else {
        const resolvedSchoolId = admin?.school_id || (rooms.find(r => r.id === roomId)?.school_id);
        // Regel: Wenn ein Lehrer einen Raum bucht, muss er immer durch das Sekretariat bestätigt werden.
        // Dies gilt ausnahmslos auch, wenn der Lehrer eine Doppelrolle als Admin oder Sekretariat hat.
        const status = 'pending';
        const finalTitle = bookingTargetType === 'external'
          ? `[EXTERN] ${externalInstitutionName}` + (bookingPurpose ? ` | ${bookingPurpose}` : '')
          : finalPurpose;

        try {
          const { error } = await supabase
            .from('room_bookings')
            .insert({
              school_id: resolvedSchoolId,
              room_id: roomId,
              booked_by: userId,
              date: bookingDate,
              start_time: bookingStartTime.length === 5 ? `${bookingStartTime}:00` : bookingStartTime,
              end_time: bookingEndTime.length === 5 ? `${bookingEndTime}:00` : bookingEndTime,
              title: finalTitle,
              status: status
            });
            
          if (error) throw error;
          
          window.dispatchEvent(new CustomEvent('refresh-bookings'));
          await fetchData();
        } catch (dbErr: any) {
          console.error('Error inserting room booking:', dbErr);
          alert('Fehler beim Speichern der Raumbuchung: ' + dbErr.message);
          return;
        }
      }

      setIsDateFilterActive(false);
      setSuccessAnimationRoomId(roomId);
      setTimeout(() => setSuccessAnimationRoomId(null), 1000);
      
      // Clear inputs & close mobile sheet
      setShowMobileRoomSlider(false);
      setBookingPurpose('');
      setBookingStudentId('');
      setStudentSearchTerm('');
      setIsRecurring(false);
      setShowPreviewField(false);
      setRecurringInterval(1);
      setBookingTargetType('internal');
      setExternalBookingPartnerName('');
    };

    const handleApproveBooking = async (bookingId: string) => {
      try {
        const { error } = await supabase
          .from('room_bookings')
          .update({ status: 'approved' })
          .eq('id', bookingId);

        if (error) throw error;

        window.dispatchEvent(new CustomEvent('refresh-bookings'));
        await fetchData();
        alert('Raumbuchung erfolgreich vom Sekretariat freigegeben.');
      } catch (err: any) {
        alert('Fehler beim Bestätigen der Raumbuchung: ' + err.message);
      }
    };

    const handleUpdateBooking = async () => {
      if (!selectedBooking) return;

      const isStaff = admin?.role?.toLowerCase() === 'secretary' || admin?.role?.toLowerCase() === 'admin';
      const creatorName = admin 
        ? `${capitalizeName(admin.first_name)} ${capitalizeName(admin.last_name)}`.trim()
        : 'Lehrer';

      const studentObj = students.find(s => s.id === bookingStudentId);
      const studentName = studentObj ? `Unterricht: ${studentObj.first_name} ${maskLastName(studentObj.last_name, showRealNames)}` : 'Unterricht';
      const defaultPurpose = bookingType === 'lesson' ? studentName : (bookingPurpose || 'Eigennutzung');
      
      let finalPurpose = defaultPurpose;
      if (isStaff) {
        if (defaultPurpose === 'Unterricht' || defaultPurpose.startsWith('Unterricht:') || defaultPurpose === 'Eigennutzung') {
          finalPurpose = creatorName;
        }
      }
      const finalTeacherName = isStaff ? 'Schule' : creatorName;

      if (selectedBooking.isSchedule) {
        // Schedule blocks are recurring – create a manual booking override for this specific date
        const resolvedSchoolId = admin?.school_id || (rooms.find((r: any) => r.id === selectedBooking.roomId)?.school_id);
        // Regel: Wenn ein Lehrer einen Raum bucht, muss er immer durch das Sekretariat bestätigt werden.
        const status = 'pending';

        try {
          const { error } = await supabase
            .from('room_bookings')
            .insert({
              school_id: resolvedSchoolId,
              room_id: selectedBooking.roomId,
              booked_by: userId,
              date: bookingDate,
              start_time: bookingStartTime.length === 5 ? `${bookingStartTime}:00` : bookingStartTime,
              end_time: bookingEndTime.length === 5 ? `${bookingEndTime}:00` : bookingEndTime,
              title: finalPurpose,
              status: status
            });
            
          if (error) throw error;
          
          window.dispatchEvent(new CustomEvent('refresh-bookings'));
          await fetchData();
        } catch (dbErr: any) {
          console.error('Error inserting room booking override:', dbErr);
          alert('Fehler beim Speichern der Raumbuchung: ' + dbErr.message);
          return;
        }
      } else {
        // Update database booking
        // Regel: Wenn ein Lehrer einen Raum bucht/anpasst, muss er immer durch das Sekretariat bestätigt werden.
        const status = 'pending';
        try {
          const { error } = await supabase
            .from('room_bookings')
            .update({
              date: bookingDate,
              start_time: bookingStartTime.length === 5 ? `${bookingStartTime}:00` : bookingStartTime,
              end_time: bookingEndTime.length === 5 ? `${bookingEndTime}:00` : bookingEndTime,
              title: finalPurpose,
              status: status
            })
            .eq('id', selectedBooking.id);

          if (error) throw error;

          window.dispatchEvent(new CustomEvent('refresh-bookings'));
          await fetchData();
        } catch (dbErr: any) {
          console.error('Error updating room booking:', dbErr);
          alert('Fehler beim Aktualisieren der Raumbuchung: ' + dbErr.message);
          return;
        }
      }

      setShowMobileRoomSlider(false);
      setSelectedBooking(null);
      setBookingPurpose('');
      setBookingStudentId('');
      setStudentSearchTerm('');
      setIsDateFilterActive(false);
      setShowPreviewField(false);
      setRecurringInterval(1);
    };

    const handleDeleteBooking = async () => {
      if (!selectedBooking || selectedBooking.isSchedule) return;
      
      const confirmDelete = window.confirm('Möchtest du diesen Termin wirklich löschen?');
      if (!confirmDelete) return;
      
      try {
        const { error } = await supabase
          .from('room_bookings')
          .delete()
          .eq('id', selectedBooking.id);
          
        if (error) throw error;
        
        window.dispatchEvent(new CustomEvent('refresh-bookings'));
        await fetchData();
      } catch (dbErr: any) {
        console.error('Error deleting room booking:', dbErr);
        alert('Fehler beim Löschen der Raumbuchung: ' + dbErr.message);
        return;
      }
      
      setSelectedBooking(null);
      setBookingPurpose('');
      setBookingStudentId('');
      setStudentSearchTerm('');
      setIsDateFilterActive(false);
      setShowPreviewField(false);
      setRecurringInterval(1);
    };


    const handleCellClick = (dayIdx: number, hourStr: string, e?: React.MouseEvent<any>) => {
      const currentSelectedDate = parseLocalDate(bookingDate);
      const dayOfWeek = currentSelectedDate.getUTCDay();
      const diffToMon = currentSelectedDate.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      currentSelectedDate.setUTCDate(diffToMon + dayIdx);
      const targetDateStr = `${currentSelectedDate.getUTCFullYear()}-${String(currentSelectedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(currentSelectedDate.getUTCDate()).padStart(2, '0')}`;

      const startH = parseInt(hourStr.split(':')[0]);
      const startStr = `${String(startH).padStart(2, '0')}:00`;
      const endStr = `${String(startH + 1).padStart(2, '0')}:00`;

      if (showPreviewField && bookingDate === targetDateStr && bookingStartTime && bookingEndTime) {
        // Same day: merge the time slots!
        const parseToMin = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };
        const formatFromMin = (mins: number) => {
          const h = Math.floor(mins / 60) % 24;
          const m = mins % 60;
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        const currentStartMin = parseToMin(bookingStartTime);
        const currentEndMin = parseToMin(bookingEndTime);
        const clickedStartMin = parseToMin(startStr);
        const clickedEndMin = parseToMin(endStr);

        const newStartMin = Math.min(currentStartMin, clickedStartMin);
        const newEndMin = Math.max(currentEndMin, clickedEndMin);

        setBookingStartTime(formatFromMin(newStartMin));
        setBookingEndTime(formatFromMin(newEndMin));
      } else {
        // Different day or no preview: start new selection
        setBookingDate(targetDateStr);
        setBookingStartTime(startStr);
        setBookingEndTime(endStr);
      }
      setIsDateFilterActive(true);
      setShowMyBookingsOnly(false); // Make sure booking sidebar is shown
      setShowPreviewField(true); // Force preview card to show immediately on first click
    };


    const handleCellDoubleClick = (dayIdx: number, hourStr: string) => {
      if (!selectedRoom) return;

      const currentSelectedDate = parseLocalDate(bookingDate);
      const dayOfWeek = currentSelectedDate.getUTCDay();
      const diffToMon = currentSelectedDate.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      currentSelectedDate.setUTCDate(diffToMon + dayIdx);
      const targetDateStr = `${currentSelectedDate.getUTCFullYear()}-${String(currentSelectedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(currentSelectedDate.getUTCDate()).padStart(2, '0')}`;

      const startH = parseInt(hourStr.split(':')[0]);
      const startStr = `${String(startH).padStart(2, '0')}:00`;
      const endStr = `${String(startH + 1).padStart(2, '0')}:00`;

      if (showPreviewField && bookingDate === targetDateStr && bookingStartTime && bookingEndTime) {
        // Second double click on same day: set end time based on the clicked hour slot
        const parseToMin = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };
        const formatFromMin = (mins: number) => {
          const h = Math.floor(mins / 60) % 24;
          const m = mins % 60;
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        const currentStartMin = parseToMin(bookingStartTime);
        const clickedEndMin = parseToMin(endStr);

        if (clickedEndMin > currentStartMin) {
          setBookingEndTime(formatFromMin(clickedEndMin));
        } else {
          setBookingStartTime(startStr);
        }
      } else {
        // First double click: start preview
        setBookingDate(targetDateStr);
        setBookingStartTime(startStr);
        setBookingEndTime(endStr);
      }
      setIsDateFilterActive(true);
      setShowMyBookingsOnly(false);
      setShowPreviewField(true);
    };


    const parseTimeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const formatMinutesToTime = (mins: number) => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const handleDragStart = (e: React.DragEvent, bookingId: string) => {
      e.dataTransfer.setData('text/plain', bookingId);
      e.dataTransfer.effectAllowed = 'move';
    };

    const handleDropOnCell = (e: React.DragEvent, targetDayIdx: number, targetHourStr: string) => {
      e.preventDefault();
      setDragOverCell(null);
      const bookingId = e.dataTransfer.getData('text/plain');
      if (!bookingId) return;

      const booking = campusBookings.find((b: any) => b.id === bookingId);
      if (!booking) return;

      if (booking.teacherId !== userId) return;

      // Calculate target date
      const currentSelectedDate = new Date(bookingDate);
      const dayOfWeek = currentSelectedDate.getDay();
      const diffToMon = currentSelectedDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      const targetDate = new Date(currentSelectedDate.setDate(diffToMon + targetDayIdx));
      const targetDateStr = targetDate.toISOString().split('T')[0];

      // Calculate duration of original booking
      const startMins = parseTimeToMinutes(booking.startTime);
      const endMins = parseTimeToMinutes(booking.endTime);
      const duration = endMins - startMins;

      // Calculate new start/end times
      const newStartMins = parseTimeToMinutes(targetHourStr);
      const newEndMins = newStartMins + duration;

      const newStartTime = formatMinutesToTime(newStartMins);
      const newEndTime = formatMinutesToTime(newEndMins);

      const toMin = (t: string) => { const [h, m] = t.split(':'); return parseInt(h||'0')*60+parseInt(m||'0'); };

      // Validate against external blockings (recurring)
      const hasBlockedConflict = roomBlockedSlots.some((s: any) => {
        if (s.room_id !== booking.roomId) return false;
        if (s.day_of_week !== (targetDayIdx + 1)) return false;

        const blockStart = toMin((s.start_time || '00:00').substring(0, 5));
        const blockEnd   = toMin((s.end_time || '23:59').substring(0, 5));

        return blockStart < newEndMins && blockEnd > newStartMins;
      });

      // Validate against single external bookings (DB)
      const hasDbConflict = dbRoomBookings.some((dbB: any) => {
        if (dbB.roomId !== booking.roomId) return false;
        if (dbB.date !== targetDateStr) return false;
        if (dbB.id === bookingId) return false;
        if (dbB.title?.startsWith('[EXTERN]') || dbB.purpose?.startsWith('[EXTERN]')) {
          const dbStart = toMin(dbB.startTime.substring(0, 5));
          const dbEnd = toMin(dbB.endTime.substring(0, 5));
          return dbStart < newEndMins && dbEnd > newStartMins;
        }
        return false;
      });

      // Validate against single external bookings (local)
      const hasLocalConflict = campusBookings.some((cb: any) => {
        if (cb.roomId !== booking.roomId) return false;
        if (cb.date !== targetDateStr) return false;
        if (cb.id === bookingId) return false;
        if (cb.purpose?.startsWith('[EXTERN]') || cb.title?.startsWith('[EXTERN]')) {
          const cbStart = toMin(cb.startTime.substring(0, 5));
          const cbEnd = toMin(cb.endTime.substring(0, 5));
          return cbStart < newEndMins && cbEnd > newStartMins;
        }
        return false;
      });

      if (hasBlockedConflict || hasDbConflict || hasLocalConflict) {
        alert('Verschieben blockiert: Dieser Zeitraum überschneidet sich mit einer externen Blockierung/Kooperation.');
        return;
      }

      // Update the booking in local state
      setCampusBookings(prev => prev.map((b: any) => {
        if (b.id === bookingId) {
          return {
            ...b,
            date: targetDateStr,
            startTime: newStartTime,
            endTime: newEndTime
          };
        }
        return b;
      }));
    };

    const handleResizeStart = (
      e: React.PointerEvent<HTMLDivElement>,
      booking: any,
      edge: 'top' | 'bottom'
    ) => {
      e.stopPropagation();
      const handleElement = e.currentTarget;
      const cardElement = handleElement.parentElement;
      if (!cardElement) return;

      const parentCell = cardElement.parentElement;
      if (!parentCell) return;

      const cellHeight = parentCell.clientHeight || 56;
      const startY = e.clientY;

      const initialStartMins = parseTimeToMinutes(booking.startTime);
      const initialEndMins = parseTimeToMinutes(booking.endTime);

      handleElement.setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvent: PointerEvent) => {
        moveEvent.stopPropagation();
        const deltaY = moveEvent.clientY - startY;
        const deltaMins = Math.round((deltaY / cellHeight) * 60);

        // Snap to 5 minutes
        const step = 5;
        const snappedDeltaMins = Math.round(deltaMins / step) * step;

        if (edge === 'bottom') {
          let newEndMins = initialEndMins + snappedDeltaMins;
          if (newEndMins < initialStartMins + 15) {
            newEndMins = initialStartMins + 15;
          }
          if (newEndMins > 24 * 60) {
            newEndMins = 24 * 60;
          }

          const newEndTime = formatMinutesToTime(newEndMins);
          setCampusBookings(prev =>
            prev.map(b => (b.id === booking.id ? { ...b, endTime: newEndTime } : b))
          );
        } else {
          let newStartMins = initialStartMins + snappedDeltaMins;
          if (newStartMins > initialEndMins - 15) {
            newStartMins = initialEndMins - 15;
          }
          if (newStartMins < 0) {
            newStartMins = 0;
          }

          const newStartTime = formatMinutesToTime(newStartMins);
          setCampusBookings(prev =>
            prev.map(b => (b.id === booking.id ? { ...b, startTime: newStartTime } : b))
          );
        }
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        upEvent.stopPropagation();
        handleElement.releasePointerCapture(upEvent.pointerId);
        handleElement.removeEventListener('pointermove', onPointerMove);
        handleElement.removeEventListener('pointerup', onPointerUp);

        // Check if final size overlaps with an external block
        setCampusBookings(currentBookings => {
          const finalB = currentBookings.find(b => b.id === booking.id);
          if (!finalB) return currentBookings;

          const toMin = (t: string) => { const [h, m] = t.split(':'); return parseInt(h||'0')*60+parseInt(m||'0'); };
          const finalStart = toMin(finalB.startTime);
          const finalEnd = toMin(finalB.endTime);

          // Recurring check
          const parsedD = parseLocalDate(finalB.date);
          const rawDay = parsedD.getUTCDay();
          const targetDayIntVal = rawDay === 0 ? 7 : rawDay;

          const hasBlockedConflict = roomBlockedSlots.some((s: any) => {
            if (s.room_id !== finalB.roomId) return false;
            if (s.day_of_week !== targetDayIntVal) return false;

            const blockStart = toMin((s.start_time || '00:00').substring(0, 5));
            const blockEnd   = toMin((s.end_time || '23:59').substring(0, 5));

            return blockStart < finalEnd && blockEnd > finalStart;
          });

          // DB external check
          const hasDbConflict = dbRoomBookings.some((dbB: any) => {
            if (dbB.roomId !== finalB.roomId) return false;
            if (dbB.date !== finalB.date) return false;
            if (dbB.id === finalB.id) return false;
            if (dbB.title?.startsWith('[EXTERN]') || dbB.purpose?.startsWith('[EXTERN]')) {
              const dbStart = toMin(dbB.startTime.substring(0, 5));
              const dbEnd = toMin(dbB.endTime.substring(0, 5));
              return dbStart < finalEnd && dbEnd > finalStart;
            }
            return false;
          });

          // Local external check
          const hasLocalConflict = currentBookings.some((cb: any) => {
            if (cb.roomId !== finalB.roomId) return false;
            if (cb.date !== finalB.date) return false;
            if (cb.id === finalB.id) return false;
            if (cb.purpose?.startsWith('[EXTERN]') || cb.title?.startsWith('[EXTERN]')) {
              const cbStart = toMin(cb.startTime.substring(0, 5));
              const cbEnd = toMin(cb.endTime.substring(0, 5));
              return cbStart < finalEnd && cbEnd > finalStart;
            }
            return false;
          });

          if (hasBlockedConflict || hasDbConflict || hasLocalConflict) {
            alert('Größenänderung blockiert: Der ausgewählte Zeitraum überschneidet sich mit einer externen Blockierung/Kooperation.');
            // Revert
            return currentBookings.map(b => b.id === booking.id ? {
              ...b,
              startTime: formatMinutesToTime(initialStartMins),
              endTime: formatMinutesToTime(initialEndMins)
            } : b);
          }

          return currentBookings;
        });
      };

      handleElement.addEventListener('pointermove', onPointerMove);
      handleElement.addEventListener('pointerup', onPointerUp);
    };



     // Merge overlapping/consecutive bookings for "Meine Buchungen" sidebar
     const groupedMyBookings: { [key: string]: any[] } = {};
     
     // Own manual bookings (combining local storage memory and database bookings)
     const ownManualBookings = [
       ...campusBookings.filter((b: any) => b.teacherId === userId),
       ...dbRoomBookings.filter((b: any) => b.teacherId === userId)
     ];
     
     // Own rescheduled occurrences
     const ownRescheduledOccurs = scheduleOccurrences
       .filter((occ: any) => occ.teacher_id === userId && (occ.status === 'pending_reschedule' || occ.status === 'rescheduled_confirmed'))
       .map((occ: any) => {
         const startTimeStr = occ.start_time.substring(0, 5);
         const durationMin = occ.duration || 45;
         const [shStr, smStr] = startTimeStr.split(':');
         const sh = parseInt(shStr) || 0;
         const sm = parseInt(smStr) || 0;
         const totalMin = sh * 60 + sm + durationMin;
         const eh = Math.floor(totalMin / 60) % 24;
         const em = totalMin % 60;
         const endTimeStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
         
         const roomName = occ.schedules?.rooms?.name || occ.schedules?.room_name || (rooms && rooms.find((r: any) => r.id === occ.schedules?.room_id)?.name) || 'Raum';
         
         return {
           id: occ.id,
           roomId: occ.schedules?.room_id,
           roomName: roomName,
           date: occ.date,
           startTime: startTimeStr,
           endTime: endTimeStr,
           purpose: occ.student ? `Unterricht: ${occ.student.first_name} ${maskLastName(occ.student.last_name, showRealNames)}` : 'Unterricht',
           teacherId: userId,
           status: occ.status,
           isSchedule: true
         };
       });

     const combinedOwnBookings = [...ownManualBookings, ...ownRescheduledOccurs];

     combinedOwnBookings.forEach((b: any) => {
       const key = `${b.roomId}_${b.date}`;
       if (!groupedMyBookings[key]) {
         groupedMyBookings[key] = [];
       }
       groupedMyBookings[key].push(b);
     });

    const myBookings: any[] = [];
    Object.values(groupedMyBookings).forEach((list: any[]) => {
      const parsed = list.map((b: any) => {
        const [shStr, smStr] = b.startTime.split(':');
        const sh = parseInt(shStr) || 0;
        const sm = parseInt(smStr) || 0;
        const [ehStr, emStr] = b.endTime.split(':');
        const eh = parseInt(ehStr) || 0;
        const em = parseInt(emStr) || 0;
        const startMin = sh * 60 + sm;
        let endMin = eh * 60 + em;
        if (endMin <= startMin) {
          endMin = startMin + 30;
        }
        return { ...b, startMin, endMin };
      });

      parsed.sort((a, b) => a.startMin - b.startMin);

      const mergedList: any[] = [];
      parsed.forEach((item) => {
        if (mergedList.length === 0) {
          mergedList.push({
            ...item,
            ids: [item.id]
          });
        } else {
          const last = mergedList[mergedList.length - 1];
          if (item.startMin <= last.endMin) {
            last.endMin = Math.max(last.endMin, item.endMin);
            last.ids.push(item.id);
            if (last.purpose && item.purpose && last.purpose !== item.purpose) {
              const cleanedPurpose = item.purpose.replace(/^Unterricht:\s*/i, '');
              if (!last.purpose.includes(cleanedPurpose)) {
                last.purpose = `${last.purpose} & ${cleanedPurpose}`;
              }
            }
          } else {
            mergedList.push({
              ...item,
              ids: [item.id]
            });
          }
        }
      });

      mergedList.forEach((m: any) => {
        const sh = String(Math.floor(m.startMin / 60)).padStart(2, '0');
        const sm = String(m.startMin % 60).padStart(2, '0');
        const eh = String(Math.floor(m.endMin / 60)).padStart(2, '0');
        const em = String(m.endMin % 60).padStart(2, '0');
        myBookings.push({
          ...m,
          startTime: `${sh}:${sm}`,
          endTime: `${eh}:${em}`
        });
      });
    });

    const DAYS_OF_WEEK = [
      { label: 'Montag', value: 'Monday', short: 'Mo' },
      { label: 'Dienstag', value: 'Tuesday', short: 'Di' },
      { label: 'Mittwoch', value: 'Wednesday', short: 'Mi' },
      { label: 'Donnerstag', value: 'Thursday', short: 'Do' },
      { label: 'Freitag', value: 'Friday', short: 'Fr' },
      { label: 'Samstag', value: 'Saturday', short: 'Sa' },
      { label: 'Sonntag', value: 'Sunday', short: 'So' }
    ];

    const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
      const hour = 8 + i;
      return `${String(hour).padStart(2, '0')}:00`;
    });

    const getWeekdayIndex = (dateStr: string) => {
      const d = parseLocalDate(dateStr);
      const day = d.getUTCDay();
      return day === 0 ? 6 : day - 1;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '0px' }}>
        <style>{`
          .custom-calendar-scrollbar::-webkit-scrollbar {
            width: 5px;
            height: 5px;
          }
          .custom-calendar-scrollbar::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 10px;
          }
          .custom-calendar-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
            transition: background 0.2s;
          }
          .custom-calendar-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.4); opacity: 0.6; }
            100% { transform: scale(1); opacity: 1; }
          }
          .pulsing-dot {
            animation: pulse 2.5s infinite ease-in-out;
          }
          .premium-input {
            padding: 10px 14px;
            border-radius: 12px;
            border: 1.5px solid #cbd5e1;
            font-size: 0.85rem;
            font-weight: 700;
            outline: none;
            color: #1e293b;
            background: #f8fafc;
            height: 42px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
          }
          .premium-input:focus {
            border-color: ${brandColor};
            background: #ffffff;
            color: #000000;
            box-shadow: 0 0 0 3px ${brandColor}18, inset 0 1px 2px rgba(0, 0, 0, 0.01);
          }
          .room-picker-card {
            min-width: 190px;
            padding: 14px;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .room-picker-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.04);
          }
          @media (max-width: 800px) {
            .calendar-header-flex {
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 12px !important;
            }
            .calendar-controls-wrapper {
              width: 100% !important;
              justify-content: space-between !important;
              gap: 8px !important;
            }
            .calendar-today-btn {
              padding: 8px 14px !important;
              font-size: 0.78rem !important;
              height: 40px !important;
              border-radius: 12px !important;
              min-width: 72px !important;
              flex-shrink: 0 !important;
            }
            .calendar-week-pagination {
              padding: 4px 8px !important;
              border-radius: 14px !important;
              height: 40px !important;
              flex-grow: 1 !important;
              min-width: 0 !important;
              justify-content: space-between !important;
              gap: 4px !important;
            }
            .calendar-week-chevron-btn {
              padding: 6px !important;
              border-radius: 10px !important;
              min-width: 36px !important;
              height: 36px !important;
              flex-shrink: 0 !important;
            }
            .calendar-week-label {
              min-width: 0 !important;
              font-size: 0.72rem !important;
              flex-shrink: 1 !important;
              white-space: nowrap !important;
              gap: 4px !important;
            }
          }
          .rooms-board-grid {
            grid-template-columns: 1fr 340px;
          }
          @media (max-width: 1400px) {
            .rooms-board-grid {
              grid-template-columns: 1fr !important;
            }
          }
          .sim-viewport-mobile .rooms-board-grid,
          .sim-viewport-portrait .rooms-board-grid,
          .sim-viewport-tablet .rooms-board-grid,
          .sim-viewport-landscape .rooms-board-grid {
            grid-template-columns: 100% !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        `}</style>

        <div 
          className="rooms-board-grid" 
          style={{ 
            display: isMobile ? 'flex' : 'grid', 
            flexDirection: isMobile ? 'column' : undefined,
            gridTemplateColumns: isMobile ? '100%' : undefined,
            gap: isMobile ? '12px' : '20px', 
            alignItems: 'stretch', 
            minWidth: 0,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* Left Column: Room catalog and weekly calendar */}
          {isMobile ? (
            /* 📱 Masterwork Mobile Rooms Architecture */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', paddingBottom: '30px' }}>
              
              {/* 0. Apple-Grade Segmented Room Switcher with Visual Peek & Micro-Header */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                {/* Micro Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 850, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Raum wählen • {rooms.length} Räume
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMobileRoomSlider(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: brandColor,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '2px 4px'
                    }}
                  >
                    <span>Alle Räume</span>
                    <ChevronDown size={12} strokeWidth={2.6} />
                  </button>
                </div>

                {/* Horizontal Snap Scroll Container with Visual Peek */}
                <div 
                  style={{
                    display: 'flex',
                    gap: '10px',
                    overflowX: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    scrollSnapType: 'x mandatory',
                    paddingBottom: '4px',
                    paddingTop: '2px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }} 
                  className="custom-calendar-scrollbar"
                >
                  {roomsToRender.map((room) => {
                    const isSelected = selectedCampusRoomId === room.id || selectedRoom?.id === room.id;
                    const occupiedNow = isRoomOccupiedNow(room.id);
                    const roomFloor = (!room.floor || room.floor === 'Allgemein') ? 'EG' : room.floor;

                    return (
                      <button
                        key={room.id}
                        id={`mobile-room-pill-${room.id}`}
                        type="button"
                        onClick={() => setSelectedCampusRoomId(room.id)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          padding: '10px 14px',
                          borderRadius: '18px',
                          background: isSelected ? brandColor : '#ffffff',
                          color: isSelected ? '#ffffff' : '#0f172a',
                          border: isSelected ? `2px solid ${brandColor}` : '1.5px solid #e2e8f0',
                          cursor: 'pointer',
                          flexShrink: 0,
                          minWidth: '138px',
                          maxWidth: '148px',
                          scrollSnapAlign: 'start',
                          boxShadow: isSelected ? `0 6px 16px ${brandColor}35` : '0 2px 6px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease',
                          textAlign: 'left'
                        }}
                      >
                        {/* Top Line: Name + Live Status Dot */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '6px' }}>
                          <span style={{
                            fontSize: '0.84rem',
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {room.name}
                          </span>
                          <span style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: isSelected ? '#ffffff' : (occupiedNow ? '#ef4444' : '#22c55e'),
                            boxShadow: isSelected ? 'none' : (occupiedNow ? '0 0 6px rgba(239,68,68,0.5)' : '0 0 6px rgba(34,197,94,0.5)'),
                            flexShrink: 0
                          }} />
                        </div>

                        {/* Bottom Line: Floor Badge + Status Text */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: 850,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            background: isSelected ? 'rgba(255,255,255,0.22)' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#64748b'
                          }}>
                            {roomFloor}
                          </span>
                          <span style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            color: isSelected ? '#ffffff' : (occupiedNow ? '#ef4444' : '#16a34a')
                          }}>
                            {occupiedNow ? 'Belegt' : 'Frei'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1. Unified Masterwork Header & 7-Days Strip Card */}
              <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                border: '1px solid #e2e8f0',
                padding: '16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.04)'
              }}>
                {/* Row 1: Dedicated Spacious Week Navigation Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '4px 8px', borderRadius: '14px', border: '1px solid #e2e8f0', minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => changeWeek(-1)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#64748b', flexShrink: 0 }}
                      title="Vorherige Woche"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', flex: 1, minWidth: 0 }}>
                      <span style={{ color: brandColor }}>KW {getCalendarWeek(bookingDate)}</span>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', marginLeft: '4px', fontWeight: 650 }}>({getWeekRange(bookingDate)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => changeWeek(1)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#64748b', flexShrink: 0 }}
                      title="Nächste Woche"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                      setBookingDate(dateStr);
                      const d = today.getDay();
                      setMobileSelectedDayIdx(d === 0 ? 6 : d - 1);
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      color: '#0f172a',
                      padding: '6px 12px',
                      borderRadius: '12px',
                      fontWeight: 850,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      flexShrink: 0
                    }}
                  >
                    Heute
                  </button>
                </div>

                {/* Row 2: 7-Days Strip (Strict 7-Column CSS Grid) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: '4px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {DAYS_OF_WEEK.map((day, dIdx) => {
                    const isSelected = mobileSelectedDayIdx === dIdx;
                    const isToday = isTodayInWeek(bookingDate) && isDayToday(dIdx, bookingDate);
                    const dayDateStr = getWeekdayDate(dIdx, bookingDate);
                    const dayNumber = dayDateStr.split('.')[0];
                    const dayHasBookings = TIME_SLOTS.some(h => getBookingsForSlot(dIdx, h).length > 0);

                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          setMobileSelectedDayIdx(dIdx);
                          const cur = parseLocalDate(bookingDate);
                          const dayOfWeek = cur.getUTCDay();
                          const diffToMon = cur.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
                          cur.setUTCDate(diffToMon + dIdx);
                          setBookingDate(toBerlinYYYYMMDD(cur));
                        }}
                        style={{
                          width: '100%',
                          minWidth: 0,
                          padding: '9px 0px',
                          borderRadius: '14px',
                          border: isSelected ? `2px solid ${brandColor}` : (isToday ? '1.5px solid #86efac' : '1px solid #e2e8f0'),
                          background: isSelected ? brandColor : (isToday ? '#f0fdf4' : '#ffffff'),
                          color: isSelected ? '#ffffff' : (isToday ? '#15803d' : '#1e293b'),
                          fontWeight: isSelected ? 900 : 700,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? `0 4px 14px ${brandColor}35` : 'none',
                          boxSizing: 'border-box',
                          overflow: 'hidden'
                        }}
                      >
                        <span style={{ fontSize: '0.62rem', opacity: isSelected ? 0.95 : 0.65, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.02em', whiteSpace: 'nowrap', display: 'block', textAlign: 'center' }}>
                          {day.short}
                        </span>
                        <span style={{ fontSize: '0.90rem', fontWeight: 900, lineHeight: 1.1, whiteSpace: 'nowrap', display: 'block', textAlign: 'center' }}>
                          {dayNumber}
                        </span>
                        {isToday ? (
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#ffffff' : '#22c55e', marginTop: '1px' }} />
                        ) : dayHasBookings ? (
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#ffffff' : '#94a3b8', marginTop: '1px', opacity: isSelected ? 0.8 : 0.6 }} />
                        ) : (
                          <span style={{ width: 4, height: 4, marginTop: '1px' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Interactive Consolidated Visual Agenda Timeline for the selected day */}
              {(() => {
                // 1. Gather all unique bookings on mobileSelectedDayIdx
                const allDayBookingsMap = new Map<string, any>();
                TIME_SLOTS.forEach((h) => {
                  const list = getBookingsForSlot(mobileSelectedDayIdx, h);
                  list.forEach((b: any) => {
                    const key = b.id || `${b.startTime}-${b.endTime}-${b.teacherName || b.teacherId}`;
                    if (!allDayBookingsMap.has(key)) {
                      allDayBookingsMap.set(key, b);
                    }
                  });
                });

                const dayBookingsList = Array.from(allDayBookingsMap.values()).sort((a, b) => {
                  const [ah, am] = (a.startTime || '00:00').split(':').map(Number);
                  const [bh, bm] = (b.startTime || '00:00').split(':').map(Number);
                  return (ah * 60 + (am || 0)) - (bh * 60 + (bm || 0));
                });

                // 2. Build continuous chronological timeline segments from 08:00 to 21:00 (480 to 1260 mins)
                interface TimelineSegment {
                  type: 'booking' | 'free';
                  startTime: string;
                  endTime: string;
                  startMin: number;
                  endMin: number;
                  durationMin: number;
                  booking?: any;
                }

                const timelineSegments: TimelineSegment[] = [];
                let currentPointerMin = 8 * 60; // 08:00
                const dayEndMin = 21 * 60; // 21:00

                dayBookingsList.forEach((b) => {
                  const [sh, sm] = (b.startTime || '08:00').split(':').map(Number);
                  const [eh, em] = (b.endTime || '09:00').split(':').map(Number);
                  const bStartMin = Math.max(8 * 60, (sh || 0) * 60 + (sm || 0));
                  const bEndMin = Math.min(dayEndMin, (eh || 0) * 60 + (em || 0));

                  // If there is a free gap before this booking
                  if (bStartMin > currentPointerMin) {
                    const gapStart = `${String(Math.floor(currentPointerMin / 60)).padStart(2, '0')}:${String(currentPointerMin % 60).padStart(2, '0')}`;
                    const gapEnd = `${String(Math.floor(bStartMin / 60)).padStart(2, '0')}:${String(bStartMin % 60).padStart(2, '0')}`;
                    timelineSegments.push({
                      type: 'free',
                      startTime: gapStart,
                      endTime: gapEnd,
                      startMin: currentPointerMin,
                      endMin: bStartMin,
                      durationMin: bStartMin - currentPointerMin
                    });
                  }

                  // Add the consolidated booking block (exactly 1 time!)
                  if (bEndMin > currentPointerMin) {
                    timelineSegments.push({
                      type: 'booking',
                      startTime: b.startTime,
                      endTime: b.endTime,
                      startMin: bStartMin,
                      endMin: bEndMin,
                      durationMin: Math.max(30, bEndMin - bStartMin),
                      booking: b
                    });
                    currentPointerMin = Math.max(currentPointerMin, bEndMin);
                  }
                });

                // If there is a remaining free gap until 21:00
                if (currentPointerMin < dayEndMin) {
                  const gapStart = `${String(Math.floor(currentPointerMin / 60)).padStart(2, '0')}:${String(currentPointerMin % 60).padStart(2, '0')}`;
                  const gapEnd = '21:00';
                  timelineSegments.push({
                    type: 'free',
                    startTime: gapStart,
                    endTime: gapEnd,
                    startMin: currentPointerMin,
                    endMin: dayEndMin,
                    durationMin: dayEndMin - currentPointerMin
                  });
                }

                const totalBookingsCount = dayBookingsList.length;

                return (
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    border: '1px solid #e2e8f0',
                    padding: '18px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)',
                    position: 'relative'
                  }}>
                    {/* Header Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.90rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                          Tagesbelegung ({DAYS_OF_WEEK[mobileSelectedDayIdx].label}, {getWeekdayDate(mobileSelectedDayIdx, bookingDate)})
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {totalBookingsCount === 0 ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '3px 8px', borderRadius: '8px' }}>
                            Ganzer Tag frei
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0f172a', background: '#f1f5f9', padding: '3px 8px', borderRadius: '8px' }}>
                            {totalBookingsCount} {totalBookingsCount === 1 ? 'Belegung' : 'Belegungen'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chronological Unified Segments */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {timelineSegments.map((seg, sIdx) => {
                        const durHours = Math.floor(seg.durationMin / 60);
                        const durMins = seg.durationMin % 60;
                        const durationFormatted = durHours > 0 
                          ? `${durHours}${durMins > 0 ? `,${Math.round((durMins / 60) * 10)}` : ''} Std.` 
                          : `${durMins} Min.`;

                        if (seg.type === 'free') {
                          return (
                            <div
                              key={`free_${seg.startTime}_${seg.endTime}_${sIdx}`}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '11px 14px',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#0f172a' }}>
                                    {seg.startTime} – {seg.endTime} Uhr
                                  </span>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '2px 7px', borderRadius: '6px' }}>
                                    Frei ({durationFormatted})
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setBookingStartTime(seg.startTime);
                                  setBookingEndTime(seg.endTime);
                                  setSelectedBooking(null);
                                  setShowMyBookingsOnly(false);
                                  setShowMobileRoomSlider(true);
                                }}
                                style={{
                                  background: brandColor,
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '10px',
                                  padding: '6px 14px',
                                  fontSize: '0.74rem',
                                  fontWeight: 850,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: `0 2px 8px ${brandColor}25`
                                }}
                              >
                                <Plus size={13} strokeWidth={2.6} />
                                <span>Anfragen</span>
                              </button>
                            </div>
                          );
                        }

                        // Booking Block (Senior UI Premium Card with Left Accent Bar & Pure Typography)
                        const b = seg.booking;
                        const isSchedule = b.isSchedule;
                        const isGroovelabBlock = b.teacherId === 'groovelab' || 
                                                 (b as any).is_groovelab || (b as any).isGroovelab ||
                                                 (b.purpose && b.purpose.toLowerCase().includes('groovelab')) ||
                                                 (b.purpose && b.purpose.toLowerCase().includes('groove lab')) ||
                                                 (b.teacherName && b.teacherName.toLowerCase().includes('groovelab')) ||
                                                 (b.teacherName && b.teacherName.toLowerCase().includes('groove lab')) ||
                                                 (b.subject_name && b.subject_name.toLowerCase().includes('groovelab')) ||
                                                 (b.subject && b.subject.toLowerCase().includes('groovelab'));
                        const isBookingConfirmed = b.status === 'approved' || b.status === 'confirmed' || b.isApproved === true || b.is_confirmed === true;
                        const isOwnBooking = b.teacherId === userId;

                        let accentColor = '#34a853'; // Campus Green
                        let badgeBg = '#dcfce7';
                        let badgeTextColor = '#15803d';

                        if (b.isPreview) {
                          accentColor = '#7c3aed';
                          badgeBg = '#ede9fe';
                          badgeTextColor = '#7c3aed';
                        } else if (isGroovelabBlock) {
                          accentColor = '#eab308';
                          badgeBg = '#fef9c3';
                          badgeTextColor = '#854d0e';
                        } else if (!isSchedule) {
                          accentColor = isBookingConfirmed ? '#8b5cf6' : '#a855f7';
                          badgeBg = isBookingConfirmed ? '#ede9fe' : '#fae8ff';
                          badgeTextColor = isBookingConfirmed ? '#6d28d9' : '#a21caf';
                        }

                        return (
                          <div
                            key={b.id || `booking_${seg.startTime}_${seg.endTime}_${sIdx}`}
                            onClick={() => {
                              if (isOwnBooking || !b.isSchedule) {
                                setSelectedBooking(b);
                                setBookingDate(b.date || bookingDate);
                                setBookingStartTime(b.startTime);
                                setBookingEndTime(b.endTime);
                                setBookingPurpose(b.purpose || '');
                                setShowMyBookingsOnly(false);
                                setShowMobileRoomSlider(true);
                              }
                            }}
                            style={{
                              position: 'relative',
                              borderRadius: '18px',
                              background: '#ffffff',
                              border: '1px solid rgba(0, 0, 0, 0.08)',
                              boxShadow: '0 4px 18px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
                              overflow: 'hidden',
                              padding: '14px 16px 14px 18px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              cursor: (isOwnBooking || !b.isSchedule) ? 'pointer' : 'default',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* Left Solid Color Accent Bar */}
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              bottom: 0,
                              left: 0,
                              width: '5px',
                              background: accentColor
                            }} />

                            {/* Top Line: Time + Duration Badge + Status Icon */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={13} color={accentColor} />
                                <span style={{ fontSize: '0.80rem', fontWeight: 850, color: '#0f172a' }}>
                                  {b.startTime} – {b.endTime} Uhr
                                </span>
                                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: badgeTextColor, background: badgeBg, padding: '2px 7px', borderRadius: '6px' }}>
                                  {durationFormatted}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isOwnBooking && (
                                  <span style={{
                                    fontSize: '0.62rem',
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    fontWeight: 800
                                  }}>
                                    Deine Buchung
                                  </span>
                                )}

                                {isSchedule ? (
                                  <Lock size={14} color="#94a3b8" />
                                ) : isBookingConfirmed ? (
                                  <CheckCircle2 size={14} color="#22c55e" />
                                ) : (
                                  <Hourglass size={14} color="#f59e0b" />
                                )}
                              </div>
                            </div>

                            {/* Middle Line: Teacher Name */}
                            <div style={{
                              fontSize: '0.98rem',
                              fontWeight: 900,
                              color: '#0f172a',
                              letterSpacing: '-0.01em'
                            }}>
                              {b.teacherName || 'Lehrkraft'}
                            </div>

                            {/* Bottom Line: Purpose and Details */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                color: '#475569'
                              }}>
                                {b.purpose || (isSchedule ? (b.teacherId === 'groovelab' ? 'GrooveLab Plattform' : 'Regulärer Unterricht') : 'Raumbuchung')}
                              </span>

                              {isOwnBooking && !b.isSchedule && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBooking(b);
                                    setBookingDate(b.date || bookingDate);
                                    setBookingStartTime(b.startTime);
                                    setBookingEndTime(b.endTime);
                                    setBookingPurpose(b.purpose || '');
                                    setShowMyBookingsOnly(false);
                                    setShowMobileRoomSlider(true);
                                  }}
                                  style={{
                                    border: '1px solid #cbd5e1',
                                    background: '#f8fafc',
                                    color: '#0f172a',
                                    borderRadius: '8px',
                                    padding: '3px 10px',
                                    fontSize: '0.70rem',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Bearbeiten
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Mobile Floating Action Bar: Meine Buchungen + Raum buchen */}
              <div 
                role="toolbar"
                aria-label="Mobile Schnellaktionen"
                style={{
                position: 'fixed',
                bottom: '80px',
                right: '16px',
                zIndex: 999,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {/* Meine Buchungen (Purple Pill) */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBooking(null);
                    setShowMyBookingsOnly(true);
                    setShowMobileRoomSlider(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '11px 16px',
                    fontSize: '0.82rem',
                    fontWeight: 850,
                    boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Calendar size={15} strokeWidth={2.4} />
                  <span>Meine ({myBookings.length})</span>
                </button>

                {/* + Raum buchen (Campus Green Pill) */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBooking(null);
                    setShowMyBookingsOnly(false);
                    setShowMobileRoomSlider(true);
                  }}
                  style={{
                    background: `linear-gradient(135deg, ${brandColor}, #15803d)`,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '11px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 850,
                    boxShadow: `0 8px 24px ${brandColor}40`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={16} strokeWidth={2.6} />
                  <span>Raum anfragen</span>
                </button>
              </div>
            </div>
          ) : (
            /* 🖥️ Desktop Left Column: Room catalog and weekly calendar */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0, paddingBottom: '0px' }}>
              
              {/* Room Horizontal Picker & Filter Bar */}
              <div 
                className="glass-panel" 
                style={{ 
                  background: 'white', 
                  borderRadius: '24px', 
                  border: '1px solid rgba(0, 0, 0, 0.04)', 
                  padding: '18px 24px', 
                  boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.02), 0 2px 12px -2px rgba(0, 0, 0, 0.01)'
                }}
              >
                {/* Apple Unified High-Density 1-Row Toolbar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'nowrap',
                  position: 'relative',
                  marginBottom: '18px'
                }}>
                  {/* 1. Branding / Title Cluster */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div style={{ background: `${brandColor}12`, color: brandColor, padding: '6px', borderRadius: '10px', display: 'flex', alignItems: 'center' }}>
                      <Box size={16} />
                    </div>
                    <h2 style={{ fontSize: '1.02rem', fontWeight: 900, color: '#1c1c1e', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Campus Räume</span>
                      <span style={{ fontSize: '0.68rem', background: '#f2f2f7', color: '#636366', padding: '2px 7px', borderRadius: '100px', fontWeight: 800 }}>
                        {rooms.length}
                      </span>
                    </h2>
                  </div>

                  {/* 2. Apple Spotlight Search Input */}
                  <div style={{ position: 'relative', flex: '0 1 180px', minWidth: '130px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: '#f2f2f7',
                      border: '1px solid rgba(0,0,0,0.04)',
                      borderRadius: '11px',
                      padding: '3px 8px 3px 10px',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}>
                      <Search size={13} color="#8e8e93" style={{ flexShrink: 0 }} />
                      <input
                        type="text"
                        placeholder="Raum suchen..."
                        value={roomSearchQuery}
                        onChange={(e) => {
                          setRoomSearchQuery(e.target.value);
                          setIsRoomSearchDropdownOpen(true);
                        }}
                        onFocus={() => setIsRoomSearchDropdownOpen(true)}
                        onBlur={() => {
                          setTimeout(() => setIsRoomSearchDropdownOpen(false), 200);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          outline: 'none',
                          fontSize: '0.75rem',
                          color: '#1c1c1e',
                          fontWeight: 600,
                          width: '100%',
                          minWidth: '50px',
                          padding: '3px 0'
                        }}
                      />
                      {roomSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setRoomSearchQuery('');
                            setIsRoomSearchDropdownOpen(false);
                          }}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                        >
                          <X size={11} color="#8e8e93" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3. Availability Quick-Filters Cluster */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setShowOnlyFreeNow(prev => !prev)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: showOnlyFreeNow ? '#ecfdf5' : '#f2f2f7',
                        color: showOnlyFreeNow ? '#15803d' : '#475569',
                        border: showOnlyFreeNow ? '1.5px solid #86efac' : '1px solid rgba(0,0,0,0.03)',
                        borderRadius: '11px',
                        padding: '5px 9px',
                        fontSize: '0.70rem',
                        fontWeight: showOnlyFreeNow ? 850 : 650,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        boxShadow: showOnlyFreeNow ? '0 2px 6px rgba(34, 197, 94, 0.12)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      title="Nur Räume anzeigen, die jetzt im Moment frei sind"
                    >
                      <Zap size={11} fill={showOnlyFreeNow ? '#15803d' : 'none'} color={showOnlyFreeNow ? '#15803d' : '#64748b'} />
                      <span>Jetzt frei</span>
                    </button>

                    {isDateFilterActive ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsDateFilterActive(false);
                          setFinderResultCount(null);
                        }}
                        title="Zeitfilter zurücksetzen"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1.5px solid #86efac',
                          borderRadius: '11px',
                          padding: '5px 9px',
                          fontSize: '0.70rem',
                          fontWeight: 850,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 6px rgba(34, 197, 94, 0.12)'
                        }}
                      >
                        <Clock size={11} strokeWidth={2.4} />
                        <span>{bookingStartTime}-{bookingEndTime}</span>
                        <X size={11} strokeWidth={3} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowRoomFinderBar(prev => !prev)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: showRoomFinderBar ? `${brandColor}18` : '#f2f2f7',
                          color: showRoomFinderBar ? brandColor : '#475569',
                          border: showRoomFinderBar ? `1.5px solid ${brandColor}50` : '1px solid rgba(0,0,0,0.03)',
                          borderRadius: '11px',
                          padding: '5px 9px',
                          fontSize: '0.70rem',
                          fontWeight: showRoomFinderBar ? 850 : 650,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease'
                        }}
                        title="Freien Zeitraum oder Slot suchen"
                      >
                        <Clock size={11} strokeWidth={2.2} color={showRoomFinderBar ? brandColor : '#64748b'} />
                        <span>Freier Slot</span>
                        <ChevronDown size={10} strokeWidth={2.5} />
                      </button>
                    )}

                    {showRoomFinderBar && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        width: '320px',
                        background: '#ffffff',
                        borderRadius: '18px',
                        border: '1px solid rgba(0,0,0,0.08)',
                        padding: '16px',
                        boxShadow: '0 14px 34px -4px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06)',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        animation: 'fadeIn 0.15s ease'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} color={brandColor} strokeWidth={2.4} />
                            Freien Zeitraum finden
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowRoomFinderBar(false)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[
                            { label: 'Heute', offset: 0 },
                            { label: 'Morgen', offset: 1 },
                            { label: 'In 2 Tagen', offset: 2 }
                          ].map((chip) => {
                            const d = new Date();
                            d.setDate(d.getDate() + chip.offset);
                            const dateStr = d.toISOString().split('T')[0];
                            const isSelected = bookingDate === dateStr;
                            return (
                              <button
                                key={chip.label}
                                type="button"
                                onClick={() => setBookingDate(dateStr)}
                                style={{
                                  flex: 1,
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: isSelected ? `${brandColor}15` : '#f1f5f9',
                                  color: isSelected ? brandColor : '#475569',
                                  fontSize: '0.68rem',
                                  fontWeight: isSelected ? 850 : 650,
                                  cursor: 'pointer'
                                }}
                              >
                                {chip.label}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.60rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Datum</label>
                            <input
                              type="date"
                              value={bookingDate}
                              onChange={(e) => setBookingDate(e.target.value)}
                              style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.74rem', fontWeight: 700, background: '#f8fafc', color: '#1c1c1e', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.60rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Von</label>
                            <select
                              value={finderStartTime}
                              onChange={(e) => setFinderStartTime(e.target.value)}
                              style={{ padding: '6px 6px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.74rem', fontWeight: 700, background: '#f8fafc', color: '#1c1c1e', width: '100%', boxSizing: 'border-box' }}
                            >
                              {Array.from({ length: 27 }, (_, i) => {
                                const min = i * 30 + 480;
                                const hh = String(Math.floor(min / 60)).padStart(2, '0');
                                const mm = String(min % 60).padStart(2, '0');
                                return `${hh}:${mm}`;
                              }).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <label style={{ fontSize: '0.60rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Bis</label>
                            <select
                              value={finderEndTime}
                              onChange={(e) => setFinderEndTime(e.target.value)}
                              style={{ padding: '6px 6px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.74rem', fontWeight: 700, background: '#f8fafc', color: '#1c1c1e', width: '100%', boxSizing: 'border-box' }}
                            >
                              {Array.from({ length: 27 }, (_, i) => {
                                const min = i * 30 + 480;
                                const hh = String(Math.floor(min / 60)).padStart(2, '0');
                                const mm = String(min % 60).padStart(2, '0');
                                return `${hh}:${mm}`;
                              }).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBookingStartTime(finderStartTime);
                            setBookingEndTime(finderEndTime);
                            setIsDateFilterActive(true);
                            setShowRoomFinderBar(false);
                          }}
                          style={{
                            padding: '8px',
                            borderRadius: '10px',
                            background: brandColor,
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 850,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: `0 4px 12px ${brandColor}30`
                          }}
                        >
                          <Search size={12} strokeWidth={2.5} />
                          <span>Freie Räume anzeigen</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 4. Filter Controls Cluster */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'nowrap' }}>
                    <div style={{ 
                      background: '#f2f2f7', 
                      borderRadius: '11px', 
                      padding: '2px', 
                      display: 'flex', 
                      gap: '2px', 
                      border: '1px solid rgba(0,0,0,0.02)',
                      alignItems: 'center',
                      flexShrink: 0
                    }}>
                      {['Alle', ...uniqueFloors].map((floor) => {
                        const isSelected = selectedFloor === floor;
                        return (
                          <button
                            key={floor}
                            onClick={() => setSelectedFloor(floor)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '9px',
                              border: 'none',
                              background: isSelected ? '#ffffff' : 'transparent',
                              color: isSelected ? brandColor : '#636366',
                              fontWeight: isSelected ? 850 : 600,
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {floor}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ 
                      background: '#f2f2f7', 
                      borderRadius: '11px', 
                      padding: '2px', 
                      display: 'flex', 
                      gap: '2px', 
                      alignItems: 'center',
                      flexShrink: 0
                    }}>
                      {[
                        { label: 'Alle', value: 'Alle', icon: null },
                        { label: 'Klavier', value: 'klavier', icon: Music },
                        { label: 'Drums', value: 'schlagzeug', icon: Disc },
                        { label: 'PA', value: 'pa', icon: Volume2 }
                      ].map((eq) => {
                        const isSelected = selectedEquipmentFilter === eq.value;
                        const IconComponent = eq.icon;
                        return (
                          <button
                            key={eq.value}
                            onClick={() => setSelectedEquipmentFilter(eq.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '9px',
                              border: 'none',
                              background: isSelected ? brandColor : 'transparent',
                              color: isSelected ? '#ffffff' : '#636366',
                              fontWeight: isSelected ? 850 : 600,
                              fontSize: '0.70rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {IconComponent && <IconComponent size={11} strokeWidth={2.2} />}
                            <span>{eq.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Rooms List Container */}
                <div 
                  className="custom-calendar-scrollbar" 
                  style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    overflowX: 'auto', 
                    paddingTop: '6px',
                    paddingBottom: '8px', 
                    width: '100%', 
                    minWidth: 0,
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {roomsToRender.map((room) => {
                    const isSelected = selectedCampusRoomId === room.id;
                    const occupiedNow = isRoomOccupiedNow(room.id);
                    const roomFloor = (!room.floor || room.floor === 'Allgemein') ? 'EG' : room.floor;

                    return (
                      <div
                        key={room.id}
                        onClick={() => setSelectedCampusRoomId(room.id)}
                        className="room-picker-card"
                        style={{
                          background: isSelected ? `${brandColor}06` : 'white',
                          border: isSelected ? `2px solid ${brandColor}` : '1.5px solid #e5e5ea',
                          boxShadow: isSelected ? `0 8px 24px ${brandColor}12` : 'none',
                          opacity: 1,
                          padding: '12px 14px',
                          borderRadius: '16px',
                          minWidth: '160px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                          <div style={{ 
                            fontWeight: 800, 
                            fontSize: '0.85rem', 
                            color: isSelected ? brandColor : '#1c1c1e',
                            lineHeight: 1.25,
                            wordBreak: 'break-word',
                            flex: 1
                          }}>
                            {room.name}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const favKey = `groovelab_favorite_room_id_${userId}`;
                              if (favoriteRoomId === room.id) {
                                localStorage.removeItem(favKey);
                                setFavoriteRoomId(null);
                              } else {
                                localStorage.setItem(favKey, room.id);
                                setFavoriteRoomId(room.id);
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: '4px',
                              flexShrink: 0
                            }}
                          >
                            <Star
                              size={14}
                              fill={favoriteRoomId === room.id ? "#fbbf24" : "none"}
                              color={favoriteRoomId === room.id ? "#fbbf24" : "#8e8e93"}
                            />
                          </button>
                        </div>

                        {/* Floor Badge */}
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', fontSize: '0.72rem', color: '#636366' }}>
                          <span style={{ fontSize: '0.62rem', background: '#f2f2f7', color: '#475569', padding: '1px 6px', borderRadius: '5px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <MapPin size={9} strokeWidth={2.5} />
                            {roomFloor}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: 'auto' }}>
                          {occupiedNow ? (
                            <span style={{ padding: '3px 8px', background: '#fce8e6', borderRadius: '8px', fontSize: '0.66rem', fontWeight: 800, color: '#c5221f', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ea4335' }} />
                              Belegt
                            </span>
                          ) : (
                            <span style={{ padding: '3px 8px', background: '#e6f4ea', borderRadius: '8px', fontSize: '0.66rem', fontWeight: 800, color: '#137333', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34a853', boxShadow: '0 0 4px #34a853' }} />
                              Jetzt frei
                            </span>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekly / Daily Availability Calendar Grid */}
              <div 
                className="calendar-grid-card glass-panel" 
                onClick={() => setDraftBooking(null)}
                style={{ 
                  position: 'relative',
                  background: 'white', 
                  borderRadius: '24px', 
                  border: '1px solid rgba(0, 0, 0, 0.04)', 
                  padding: '20px 24px', 
                  boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.02), 0 2px 12px -2px rgba(0, 0, 0, 0.01)'
                }}
              >
                <div className="calendar-header-flex" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1c1c1e', margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>Wochenübersicht: {selectedRoom?.name || 'Wähle einen Raum'}</span>
                    </h3>
                  </div>

                  {/* View Switcher & Week Controls */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: 'auto', justifyContent: 'space-between' }}>
                    <div className="calendar-controls-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => {
                          const today = new Date();
                          const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                          setBookingDate(dateStr);
                          const d = today.getDay();
                          setMobileSelectedDayIdx(d === 0 ? 6 : d - 1);
                        }}
                        className="calendar-today-btn"
                        style={{
                          border: '1px solid #e5e5ea',
                          background: 'white',
                          cursor: 'pointer',
                          padding: '6px 12px',
                          borderRadius: '10px',
                          color: '#1c1c1e',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          height: '36px'
                        }}
                      >
                        Heute
                      </button>

                      <div className="calendar-week-pagination" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f2f2f7', padding: '3px 8px', borderRadius: '12px', border: '1px solid #e5e5ea', height: '36px' }}>
                        <button
                          onClick={() => changeWeek(-1)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#8e8e93' }}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="calendar-week-label" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1c1c1e', whiteSpace: 'nowrap' }}>
                          <span style={{ color: brandColor, fontWeight: 900 }}>KW {getCalendarWeek(bookingDate)}</span>
                          <span style={{ fontSize: '0.66rem', color: '#636366', marginLeft: '4px' }}>({getWeekRange(bookingDate)})</span>
                        </span>
                        <button
                          onClick={() => changeWeek(1)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#8e8e93' }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full 7-Day Calendar Grid Container */}
                <div style={{ overflowX: 'auto', width: '100%' }} className="custom-calendar-scrollbar">
                  <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #e5e5ea', borderRadius: '16px', overflow: 'hidden', minWidth: '950px' }}>
                    {/* Header Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', background: '#ffffff', borderBottom: '1px solid #e5e5ea' }}>
                      <div style={{ padding: '12px 10px', fontSize: '0.72rem', fontWeight: 800, color: '#8e8e93', textAlign: 'center', borderRight: '1px solid #e5e5ea' }}>Zeit</div>
                      {DAYS_OF_WEEK.map((day, dayIdx) => {
                        const isToday = isTodayInWeek(bookingDate) && isDayToday(dayIdx, bookingDate);
                        
                        const d = parseLocalDate(bookingDate);
                        const dayVal = d.getUTCDay();
                        const diff = d.getUTCDate() - (dayVal === 0 ? 6 : dayVal - 1) + dayIdx;
                        d.setUTCDate(diff);
                        const targetDateStr = toBerlinYYYYMMDD(d);
                        
                        const activeHoliday = holidays.find(h => targetDateStr >= h.start && targetDateStr <= h.end);

                        return (
                          <div 
                            key={day.value} 
                            style={{ 
                              padding: activeHoliday ? '6px 4px' : '12px 4px', 
                              fontSize: '0.74rem', 
                              fontWeight: 800, 
                              color: isToday ? brandColor : '#1c1c1e', 
                              textAlign: 'center', 
                              borderRight: dayIdx < 6 ? '1px solid #e5e5ea' : 'none',
                              position: 'relative',
                              background: isToday ? `${brandColor}04` : '#ffffff',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {isToday && (
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: brandColor }} />
                            )}
                            <div>{day.label}</div>
                            <div style={{ fontSize: '0.65rem', color: isToday ? brandColor : '#8e8e93', marginTop: '2px', fontWeight: 700 }}>
                              {getWeekdayDate(dayIdx, bookingDate)}
                            </div>
                            {activeHoliday && (
                              <div style={{ 
                                marginTop: '4px', 
                                fontSize: '0.55rem', 
                                background: '#ffe2e2', 
                                color: '#ff3b30', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '90%'
                              }} title={activeHoliday.name}>
                                🌴 {activeHoliday.name}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Hourly Rows */}
                    <div ref={calendarScrollRef} className="custom-calendar-scrollbar" style={{ display: 'flex', flexDirection: 'column', maxHeight: '420px', overflowY: 'auto', position: 'relative', paddingTop: '1px' }}>
                      {TIME_SLOTS.map((hour) => {
                        const slotHourInt = parseInt(hour.split(':')[0]);
                        
                        return (
                          <div key={hour} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', borderBottom: '1px solid #f2f2f7', minHeight: '56px', position: 'relative' }}>
                            {/* Time cell */}
                            <div style={{ padding: '10px 4px', fontSize: '0.72rem', fontWeight: 700, color: '#8e8e93', textAlign: 'center', background: '#ffffff', borderRight: '1px solid #e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {hour}
                            </div>
                            {/* Day cells */}
                            {DAYS_OF_WEEK.map((day, dayIdx) => {
                              const slotBookings = getBookingsForSlot(dayIdx, hour);
                              const isToday = isTodayInWeek(bookingDate) && isDayToday(dayIdx, bookingDate);
                              const currentHour = new Date().getHours();
                              const currentMin = new Date().getMinutes();
                              const showTimeIndicator = isToday && currentHour === slotHourInt;
                              const isDraggedOver = dragOverCell && dragOverCell.dayIdx === dayIdx && dragOverCell.hour === hour;

                              return (
                                <div
                                  key={day.value}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCellClick(dayIdx, hour, e);
                                  }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    handleCellDoubleClick(dayIdx, hour);
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    if (!isDraggedOver) {
                                      setDragOverCell({ dayIdx, hour });
                                    }
                                  }}
                                  onDragLeave={() => {
                                    setDragOverCell(null);
                                  }}
                                  onDrop={(e) => {
                                    handleDropOnCell(e, dayIdx, hour);
                                  }}
                                  style={{
                                    padding: '4px',
                                    borderRight: dayIdx < 6 ? '1px solid #f2f2f7' : 'none',
                                    position: 'relative',
                                    background: isDraggedOver 
                                      ? `${brandColor}12` 
                                      : (isToday ? `${brandColor}01` : 'white'),
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px',
                                    justifyContent: 'stretch',
                                    cursor: 'pointer',
                                    boxShadow: isDraggedOver ? `inset 0 0 0 2px ${brandColor}` : 'none',
                                    transition: 'background-color 0.15s ease, box-shadow 0.15s ease'
                                  }}
                                >
                                  {showTimeIndicator && (
                                    <div style={{ 
                                      position: 'absolute', 
                                      top: `${(currentMin / 60) * 100}%`, 
                                      left: 0, 
                                      right: 0, 
                                      height: '2px', 
                                      background: '#ff453a', 
                                      boxShadow: '0 0 6px rgba(255, 69, 58, 0.6)' 
                                    }} />
                                  )}

                                  {slotBookings.map((b: any, bIdx: number) => {
                                    const [shStr, smStr] = (b.startTime || '12:00').split(':');
                                    const sh = parseInt(shStr) || 0;
                                    const sm = parseInt(smStr) || 0;
                                    const [ehStr, emStr] = (b.endTime || '13:00').split(':');
                                    const eh = parseInt(ehStr) || 0;
                                    const em = parseInt(emStr) || 0;
                                    const slotH = parseInt(hour.split(':')[0]);
                                    
                                    // Only render at the starting hour slot of the booking block
                                    if (slotH !== sh) return null;

                                    const startMin = sh * 60 + sm;
                                    const endMin = eh * 60 + em;
                                    const durationMin = Math.max(30, endMin - startMin);
                                    const rowHeight = 56;
                                    const topOffset = (sm / 60) * rowHeight;
                                    const cardHeight = Math.max(46, (durationMin / 60) * rowHeight - 4);

                                    const isSchedule = b.isSchedule;
                                    const isGroovelabBlock = b.teacherId === 'groovelab' || 
                                                             (b as any).is_groovelab || (b as any).isGroovelab ||
                                                             (b.purpose && b.purpose.toLowerCase().includes('groovelab')) ||
                                                             (b.purpose && b.purpose.toLowerCase().includes('groove lab')) ||
                                                             (b.teacherName && b.teacherName.toLowerCase().includes('groovelab')) ||
                                                             (b.teacherName && b.teacherName.toLowerCase().includes('groove lab')) ||
                                                             (b.subject_name && b.subject_name.toLowerCase().includes('groovelab')) ||
                                                             (b.subject && b.subject.toLowerCase().includes('groovelab'));
                                    const isBookingConfirmed = b.status === 'approved' || b.status === 'confirmed' || b.isApproved === true || b.is_confirmed === true;

                                    let cardBg = '#34a853'; // Default Campus Green
                                    let cardBorder = '1px solid rgba(0, 0, 0, 0.08)';
                                    let headerTimeColor = '#15803d';
                                    let bodyTextColor = '#ffffff';

                                    if (b.isPreview) {
                                      cardBg = 'rgba(124, 58, 237, 0.25)';
                                      cardBorder = '1.5px dashed #7c3aed';
                                      headerTimeColor = '#7c3aed';
                                      bodyTextColor = '#6d28d9';
                                    } else if (isGroovelabBlock) {
                                      cardBg = '#eab308';
                                      cardBorder = '1px solid rgba(0, 0, 0, 0.1)';
                                      headerTimeColor = '#854d0e';
                                      bodyTextColor = '#1e293b';
                                    } else if (!isSchedule) {
                                      // Manual booking
                                      cardBg = isBookingConfirmed 
                                        ? '#8b5cf6' 
                                        : 'repeating-linear-gradient(-45deg, #7c3aed 0px, #7c3aed 10px, #6d28d9 10px, #6d28d9 20px)';
                                      cardBorder = '1px solid rgba(0, 0, 0, 0.1)';
                                      headerTimeColor = '#7c3aed';
                                      bodyTextColor = '#ffffff';
                                    }

                                    return (
                                      <div
                                        key={b.id || `${b.startTime}-${b.endTime}-${bIdx}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedBooking(b);
                                        }}
                                        style={{
                                          position: 'absolute',
                                          top: `${topOffset + 2}px`,
                                          left: '3px',
                                          right: '3px',
                                          height: `${cardHeight}px`,
                                          zIndex: 10,
                                          borderRadius: '12px',
                                          background: cardBg,
                                          border: cardBorder,
                                          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                                          overflow: 'hidden',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          justifyContent: 'space-between',
                                          cursor: 'pointer',
                                          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                                        }}
                                        className="hover-scale"
                                      >
                                        {/* Top Header White Pill/Card */}
                                        <div style={{
                                          background: '#ffffff',
                                          borderRadius: '8px',
                                          padding: '5px 8px',
                                          margin: '3px 3px 0 3px',
                                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '2px'
                                        }}>
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            color: headerTimeColor
                                          }}>
                                            <Clock size={11} color={headerTimeColor} />
                                            <span>{b.startTime} - {b.endTime}</span>
                                          </div>
                                          <div style={{
                                            fontSize: '0.74rem',
                                            fontWeight: 900,
                                            color: '#0f172a',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }}>
                                            {b.teacherName || 'Lehrkraft'}
                                          </div>
                                        </div>

                                        {/* Card Body with Purpose and Icon */}
                                        <div style={{
                                          padding: '6px 8px 6px 8px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          justifyContent: 'space-between',
                                          flex: 1
                                        }}>
                                          <div style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 800,
                                            color: bodyTextColor,
                                            lineHeight: 1.2
                                          }}>
                                            {b.purpose || (isSchedule ? (isGroovelabBlock ? 'GrooveLab Plattform' : 'Regulärer Unterricht') : 'Raumbuchung')}
                                          </div>

                                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                            {isSchedule ? (
                                              <Lock size={12} color={bodyTextColor} style={{ opacity: 0.85 }} />
                                            ) : isBookingConfirmed ? (
                                              <CheckCircle2 size={12} color={bodyTextColor} style={{ opacity: 0.85 }} />
                                            ) : (
                                              <Hourglass size={12} color={bodyTextColor} style={{ opacity: 0.85 }} />
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
           {/* Right Sidebar: Booking Form OR Meine Buchungen */}
          {!isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', alignSelf: 'stretch' }}>
              {/* Apple / Linear Segmented Control Header */}
              <div style={{
                display: 'flex',
                background: '#f2f2f7',
                padding: '4px',
                borderRadius: '16px',
                gap: '4px',
                border: '1px solid rgba(0,0,0,0.04)'
              }}>
                <button
                  type="button"
                  onClick={() => setShowMyBookingsOnly(false)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: !showMyBookingsOnly ? '#ffffff' : 'transparent',
                    color: !showMyBookingsOnly ? '#0f172a' : '#64748b',
                    fontWeight: !showMyBookingsOnly ? 850 : 650,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: !showMyBookingsOnly ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Zap size={14} color={!showMyBookingsOnly ? brandColor : '#64748b'} strokeWidth={2.4} />
                  <span>Raum anfragen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMyBookingsOnly(true)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: showMyBookingsOnly ? '#ffffff' : 'transparent',
                    color: showMyBookingsOnly ? '#0f172a' : '#64748b',
                    fontWeight: showMyBookingsOnly ? 850 : 650,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: showMyBookingsOnly ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Calendar size={14} color={showMyBookingsOnly ? '#7c3aed' : '#64748b'} strokeWidth={2.4} />
                  <span>Meine Buchungen</span>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 900,
                    background: showMyBookingsOnly ? '#7c3aed' : '#cbd5e1',
                    color: '#ffffff',
                    padding: '1px 6px',
                    borderRadius: '100px'
                  }}>
                    {myBookings.length}
                  </span>
                </button>
              </div>

              {showMyBookingsOnly ? (
              /* Meine Buchungen (Shown only when showMyBookingsOnly is true) */
              <div 
                className="glass-panel" 
                style={{ 
                  background: 'white', 
                  borderRadius: '24px', 
                  border: '1px solid rgba(0, 0, 0, 0.04)', 
                  padding: '20px', 
                  boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.02), 0 2px 12px -2px rgba(0, 0, 0, 0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1c1c1e', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Meine Buchungen
                    <span style={{ fontSize: '0.72rem', background: 'rgba(175, 82, 222, 0.12)', color: '#af52de', padding: '2px 8px', borderRadius: '8px', fontWeight: 900 }}>
                      {myBookings.length}
                    </span>
                  </h3>

                  <button
                    onClick={() => setShowMyBookingsOnly(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#8e8e93',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px',
                      borderRadius: '50%',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = brandColor; e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#8e8e93'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <ArrowLeft size={16} />
                  </button>
                </div>

                {/* Cancel All Button */}
                {myBookings.length >= 2 && (
                  <button
                    onClick={() => {
                      const allIds = myBookings.flatMap(b => b.ids || [b.id]);
                      handleCancelBooking(allIds);
                    }}
                    style={{
                      background: '#ff453a15',
                      color: '#ff453a',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      marginBottom: '12px',
                      width: '100%',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#ff453a25'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#ff453a15'}
                  >
                    Alle stornieren
                  </button>
                )}

                <div className="custom-calendar-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                  {myBookings.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#8e8e93', fontWeight: 700, textAlign: 'center', padding: '16px', border: '1.5px dashed #e5e5ea', borderRadius: '14px', background: '#f2f2f7' }}>
                      Du hast noch keine Buchungen vorgenommen.
                    </div>
                  ) : (
                    myBookings.map((b: any) => {
                      const isBookingConfirmed = b.status === 'approved' || b.status === 'confirmed' || b.isApproved === true || b.is_confirmed === true;

                      return (
                        <div
                          key={b.id}
                          onClick={() => {
                            setBookingDate(b.date);
                            setSelectedFloor('Alle');
                            setSelectedCampusRoomId(b.roomId);
                            setSelectedBooking(b);
                            setBookingStartTime(b.startTime);
                            setBookingEndTime(b.endTime);
                            setBookingPurpose(b.purpose || '');
                            setIsDateFilterActive(false);
                            setShowMyBookingsOnly(false);
                          }}
                          style={{
                            padding: '12px 14px',
                            background: isBookingConfirmed 
                              ? '#fae8ff' 
                              : 'repeating-linear-gradient(-45deg, #faf5ff 0px, #faf5ff 8px, #ffffff 8px, #ffffff 16px)',
                            border: isBookingConfirmed ? '2px solid #a855f7' : '2px dashed #a855f7',
                            borderRadius: '14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease, border-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#9333ea';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#a855f7';
                            e.currentTarget.style.transform = 'none';
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a' }}>
                              {new Date(b.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} • {b.startTime} - {b.endTime}
                            </span>
                            <div style={{ fontSize: '0.74rem', color: '#6d28d9', fontWeight: 700 }}>
                              {b.teacherName === 'Schule' ? (
                                <>
                                  <strong style={{ fontWeight: 900 }}>Schule</strong> • {b.roomName}
                                </>
                              ) : b.roomName}
                            </div>
                            {b.purpose && b.purpose.toLowerCase() !== 'unterricht' && (
                              <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600, marginTop: '1px' }}>
                                {b.purpose.replace(/^Unterricht:\s*/i, '')}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{
                              fontSize: '0.64rem',
                              fontWeight: 800,
                              padding: '3px 9px',
                              borderRadius: '100px',
                              background: isBookingConfirmed ? 'rgba(34, 197, 94, 0.14)' : 'rgba(234, 179, 8, 0.14)',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                              border: isBookingConfirmed ? '1px solid rgba(34, 197, 94, 0.28)' : '1px solid rgba(234, 179, 8, 0.28)',
                              color: isBookingConfirmed ? '#15803d' : '#9a3412',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: isBookingConfirmed ? '0 2px 6px rgba(34, 197, 94, 0.12)' : '0 2px 6px rgba(234, 179, 8, 0.1)',
                              whiteSpace: 'nowrap',
                              letterSpacing: '-0.01em'
                            }}>
                              {isBookingConfirmed ? (
                                <>
                                  <CheckCircle2 size={11} strokeWidth={2.6} style={{ color: '#16a34a' }} />
                                  <span>Bestätigt</span>
                                </>
                              ) : (
                                <>
                                  <Clock size={11} strokeWidth={2.4} style={{ color: '#9a3412' }} />
                                  <span>Unter Vorbehalt (Sekretariat prüft)</span>
                                </>
                              )}
                            </span>

                            {!isBookingConfirmed && isStaff && !b.isSchedule && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleApproveBooking(b.id); }}
                                style={{
                                  background: '#34c75918',
                                  color: '#16a34a',
                                  border: '1px solid #86efac',
                                  borderRadius: '10px',
                                  padding: '0 8px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.70rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  transition: 'background 0.2s',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Buchung als Sekretariat freigeben"
                              >
                                <Check size={13} strokeWidth={3} />
                                <span>Freigeben</span>
                              </button>
                            )}

                            <button
                              onClick={(e) => { e.stopPropagation(); handleCancelBooking(b.ids || b.id); }}
                              style={{
                                background: '#ff453a15',
                                color: '#ff453a',
                                border: 'none',
                                borderRadius: '10px',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#ff453a30'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#ff453a15'}
                              title="Buchung stornieren"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Booking Form (Shown when showMyBookingsOnly is false) */
              <div 
                className="glass-panel" 
                onClickCapture={() => setShowPreviewField(true)}
                onFocusCapture={() => setShowPreviewField(true)}
                style={{ 
                  background: isEditing ? '#f6f0ff' : 'white', 
                  borderRadius: '18px', 
                  border: isEditing ? '1.5px solid #af52de40' : '1px solid rgba(0, 0, 0, 0.04)', 
                  padding: '14px 16px', 
                  boxShadow: isEditing 
                    ? '0 8px 32px rgba(175, 82, 222, 0.08), 0 2px 12px rgba(175, 82, 222, 0.04)' 
                    : '0 4px 24px -4px rgba(0, 0, 0, 0.02), 0 2px 12px -2px rgba(0, 0, 0, 0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.3s ease'
                }}
              >

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0, gap: '10px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1c1c1e', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                    <div style={{ background: `${brandColor}15`, color: brandColor, padding: '4px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                      <Zap size={13} strokeWidth={2.5} />
                    </div>
                    <span>Raumanfrage</span>
                  </h3>
                  <select
                    value={selectedCampusRoomId || ''}
                    onChange={(e) => {
                      setSelectedCampusRoomId(e.target.value);
                    }}
                    className="premium-input"
                    style={{ 
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      background: '#f2f2f7', 
                      color: '#1c1c1e', 
                      height: '28px', 
                      padding: '2px 24px 2px 10px', 
                      fontSize: '0.74rem', 
                      fontWeight: 700,
                      width: 'auto', 
                      minWidth: '100px', 
                      flexShrink: 1,
                      border: '1px solid rgba(0, 0, 0, 0.04)',
                      borderRadius: '8px',
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                      backgroundSize: '10px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {rooms.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Datum</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => {
                        setBookingDate(e.target.value);
                        setIsDateFilterActive(true);
                      }}
                      onClick={() => setIsDateFilterActive(true)}
                      onFocus={() => setIsDateFilterActive(true)}
                      className="premium-input"
                      style={{
                        borderColor: isDateFilterActive ? '#ffe699' : '#e5e5ea',
                        background: isDateFilterActive ? '#ffffff' : '#f2f2f7',
                        color: isDateFilterActive ? '#1c1c1e' : '#8e8e93',
                        boxShadow: isDateFilterActive ? '0 0 0 3px rgba(255, 230, 153, 0.25)' : 'none',
                        height: '36px',
                        padding: '6px 10px',
                        fontSize: '0.78rem',
                        flex: 1
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPreviewField(prev => !prev);
                      }}
                      style={{
                        height: '36px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: showPreviewField ? brandColor : '#e5e5ea',
                        background: showPreviewField ? `${brandColor}15` : '#ffffff',
                        color: showPreviewField ? brandColor : '#64748b',
                        fontSize: '0.74rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Eye size={13} strokeWidth={2.2} />
                      <span>Vorschau</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Von</label>
                    <select
                      value={bookingStartTime}
                      onChange={(e) => {
                        setBookingStartTime(e.target.value);
                        setIsDateFilterActive(true);
                      }}
                      onFocus={() => setIsDateFilterActive(true)}
                      className="premium-input"
                      style={{
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        borderColor: isDateFilterActive ? '#ffe699' : 'rgba(0, 0, 0, 0.06)',
                        background: isDateFilterActive ? '#ffffff' : '#f2f2f7',
                        color: '#1c1c1e',
                        boxShadow: isDateFilterActive ? '0 0 0 3px rgba(255, 230, 153, 0.25)' : 'none',
                        height: '36px',
                        padding: '6px 28px 6px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        borderRadius: '10px',
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                        backgroundSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {Array.from({ length: 27 }, (_, i) => {
                        const min = i * 30 + 480;
                        const hh = String(Math.floor(min / 60)).padStart(2, '0');
                        const mm = String(min % 60).padStart(2, '0');
                        return `${hh}:${mm}`;
                      }).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Bis</label>
                    <select
                      value={bookingEndTime}
                      onChange={(e) => {
                        setBookingEndTime(e.target.value);
                        setIsDateFilterActive(true);
                      }}
                      onFocus={() => setIsDateFilterActive(true)}
                      className="premium-input"
                      style={{
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        borderColor: isDateFilterActive ? '#ffe699' : 'rgba(0, 0, 0, 0.06)',
                        background: isDateFilterActive ? '#ffffff' : '#f2f2f7',
                        color: '#1c1c1e',
                        boxShadow: isDateFilterActive ? '0 0 0 3px rgba(255, 230, 153, 0.25)' : 'none',
                        height: '36px',
                        padding: '6px 28px 6px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        borderRadius: '10px',
                        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                        backgroundSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {Array.from({ length: 27 }, (_, i) => {
                        const min = (i + 1) * 30 + 480;
                        const hh = String(Math.floor(min / 60)).padStart(2, '0');
                        const mm = String(min % 60).padStart(2, '0');
                        return `${hh}:${mm}`;
                      }).filter(t => t > bookingStartTime).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Duration Quick Buttons */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '-2px' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(30)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '1px solid #e5e5ea',
                      borderRadius: '8px',
                      padding: '4px 6px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      color: '#8e8e93',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = brandColor; e.currentTarget.style.color = brandColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e5ea'; e.currentTarget.style.color = '#8e8e93'; }}
                  >
                    30 Min.
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(45)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '1px solid #e5e5ea',
                      borderRadius: '8px',
                      padding: '4px 6px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      color: '#8e8e93',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = brandColor; e.currentTarget.style.color = brandColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e5ea'; e.currentTarget.style.color = '#8e8e93'; }}
                  >
                    45 Min.
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(60)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '1px solid #e5e5ea',
                      borderRadius: '8px',
                      padding: '4px 6px',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      color: '#8e8e93',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = brandColor; e.currentTarget.style.color = brandColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e5ea'; e.currentTarget.style.color = '#8e8e93'; }}
                  >
                    60 Min.
                  </button>
                </div>

                {isStaff && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Buchungs-Zweck</label>
                    <div style={{ display: 'flex', background: '#f2f2f7', borderRadius: '8px', padding: '2px', gap: '2px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setBookingTargetType('internal');
                          setBookingPurpose('');
                        }}
                        style={{
                          flex: 1,
                          background: bookingTargetType === 'internal' ? '#ffffff' : 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 0',
                          fontSize: '0.74rem',
                          fontWeight: bookingTargetType === 'internal' ? 800 : 600,
                          color: bookingTargetType === 'internal' ? '#1c1c1e' : '#8e8e93',
                          boxShadow: bookingTargetType === 'internal' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        Interne Buchung
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBookingTargetType('external');
                        }}
                        style={{
                          flex: 1,
                          background: bookingTargetType === 'external' ? '#ffffff' : 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 0',
                          fontSize: '0.74rem',
                          fontWeight: bookingTargetType === 'external' ? 800 : 600,
                          color: bookingTargetType === 'external' ? '#1c1c1e' : '#8e8e93',
                          boxShadow: bookingTargetType === 'external' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        Externe Institution
                      </button>
                    </div>
                  </div>
                )}

                {isStaff && bookingTargetType === 'external' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Name der externen Institution / Partner</label>
                    <input
                      type="text"
                      placeholder="z.B. Grundschule West, Kindergarten..."
                      value={externalBookingPartnerName}
                      onChange={(e) => setExternalBookingPartnerName(e.target.value)}
                      className="premium-input"
                      style={{ height: '36px', padding: '6px 10px', fontSize: '0.78rem' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    {bookingTargetType === 'external' ? 'Zweck / Notiz' : 'Notiz (nur für dich sichtbar)'}
                  </label>
                  <input
                    placeholder={bookingTargetType === 'external' ? 'z.B. Mittagsschule, AG, Kursangebot...' : 'z.B. Klavierübung, Setup vorbereiten...'}
                    value={bookingPurpose}
                    onChange={(e) => setBookingPurpose(e.target.value)}
                    className="premium-input"
                    style={{ height: '36px', padding: '6px 10px', fontSize: '0.78rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Buchungs-Typ</label>
                  <div style={{ display: 'flex', background: '#f2f2f7', borderRadius: '8px', padding: '2px', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(false)}
                      style={{
                        flex: 1,
                        background: !isRecurring ? '#ffffff' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 0',
                        fontSize: '0.74rem',
                        fontWeight: !isRecurring ? 800 : 600,
                        color: !isRecurring ? '#1c1c1e' : '#8e8e93',
                        boxShadow: !isRecurring ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      Einzeltermin
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(true)}
                      style={{
                        flex: 1,
                        background: isRecurring ? '#ffffff' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 0',
                        fontSize: '0.74rem',
                        fontWeight: isRecurring ? 800 : 600,
                        color: isRecurring ? '#1c1c1e' : '#8e8e93',
                        boxShadow: isRecurring ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      Serientermin (wöchentlich)
                    </button>
                  </div>
                </div>

                {isRecurring && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Wochenrhythmus</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={recurringInterval}
                        onChange={(e) => setRecurringInterval(Math.max(1, parseInt(e.target.value) || 1))}
                        className="premium-input"
                        style={{ height: '36px', padding: '6px 10px', fontSize: '0.78rem', width: '80px', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '0.74rem', color: '#8e8e93', fontWeight: 600 }}>
                        {recurringInterval === 1 ? 'jede Woche (Standard)' : `alle ${recurringInterval} Wochen`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Overlap Block — hard block, not a warning */}
                {selectedRoom && isRoomOccupied(selectedRoom.id) && (
                  <div style={{
                    background: '#fff1f0',
                    border: '1px solid #fca5a5',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: '#b91c1c',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                    lineHeight: '1.4'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>Dieser Raum ist im gewählten Zeitraum bereits von einer anderen Person gebucht. Bitte wähle einen anderen Raum oder eine andere Zeit.</span>
                  </div>
                )}

                <button
                  onClick={() => selectedRoom && !isRoomOccupied(selectedRoom.id) && (isEditing ? handleUpdateBooking() : handleAddBooking(selectedRoom.id))}
                  disabled={!selectedRoom || isRoomOccupied(selectedRoom.id)}
                  style={{
                    background: (!selectedRoom || isRoomOccupied(selectedRoom.id)) ? '#94a3b8' : brandColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: (!selectedRoom || isRoomOccupied(selectedRoom.id)) ? 'not-allowed' : 'pointer',
                    opacity: (!selectedRoom || isRoomOccupied(selectedRoom.id)) ? 0.55 : 1,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '38px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedRoom) {
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedRoom) {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  {!selectedRoom 
                    ? 'Wähle einen Raum' 
                    : isEditing 
                      ? (selectedBooking?.isSchedule ? 'Als Einzeltermin übernehmen' : 'Änderung speichern')
                      : bookingTargetType === 'external'
                        ? 'Externe Blockierung speichern'
                        : `${selectedRoom.name} unter Vorbehalt anfragen`}

                </button>

                {/* ℹ️ Subsidiaritäts- & Vorbehalts-Hinweis */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '0.69rem',
                  color: '#64748b',
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '4px'
                }}>
                  <Info size={13} style={{ flexShrink: 0, color: '#0284c7' }} />
                  <span>
                    <strong>Voranfrage unter Vorbehalt:</strong> Die verbindliche Raumzuteilung erfolgt nach Prüfung durch das Schulsekretariat im Schul-ERP.
                  </span>
                </div>

                {isEditing && !selectedBooking?.isSchedule && (
                  <button
                    onClick={handleDeleteBooking}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#ea4335',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      height: '38px',
                      boxShadow: '0 4px 12px rgba(234, 67, 53, 0.25)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#d32f2f';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ea4335';
                    }}
                  >
                    Termin löschen
                  </button>
                )}

              </div>
            )}

            {/* properties widget */}
            {selectedRoom && (
              <div 
                className="glass-panel" 
                style={{ 
                  background: 'white', 
                  borderRadius: '18px', 
                  border: '1px solid rgba(0, 0, 0, 0.04)', 
                  padding: '14px 16px', 
                  boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.02), 0 2px 12px -2px rgba(0, 0, 0, 0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sliders size={15} style={{ color: brandColor }} />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1c1c1e', margin: 0 }}>
                    Eigenschaften
                  </h3>
                </div>

                {/* Grid stats: Size and Max Students */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {/* Size */}
                  <div style={{ 
                    background: '#f8fafc', 
                    border: '1px solid rgba(0,0,0,0.02)', 
                    borderRadius: '12px', 
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Maximize2 size={14} style={{ color: '#64748b' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.62rem', color: '#8e8e93', fontWeight: 800, textTransform: 'uppercase' }}>Größe</span>
                      <span style={{ fontSize: '0.8rem', color: '#1c1c1e', fontWeight: 700 }}>{selectedRoom.qm || '—'} qm</span>
                    </div>
                  </div>

                  {/* Max Students */}
                  <div style={{ 
                    background: '#f8fafc', 
                    border: '1px solid rgba(0,0,0,0.02)', 
                    borderRadius: '12px', 
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Users size={14} style={{ color: '#64748b' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.62rem', color: '#8e8e93', fontWeight: 800, textTransform: 'uppercase' }}>Kapazität</span>
                      <span style={{ fontSize: '0.8rem', color: '#1c1c1e', fontWeight: 700 }}>{selectedRoom.max_students || '1'} Schüler</span>
                    </div>
                  </div>
                </div>

                {/* Acoustics & Instruments */}
                {(() => {
                  const schoolId = selectedRoom.school_id || admin?.school_id || '';
                  const roomInsts = selectedRoom.room_instruments || (() => {
                    try {
                      const map = JSON.parse(localStorage.getItem(`groovelab_room_instruments_mappings_${schoolId}`) || '{}');
                      return map[selectedRoom.id] || [];
                    } catch { return []; }
                  })();
                  
                  const unsuitableInsts = selectedRoom.unsuitable_instruments || (() => {
                    try {
                      const map = JSON.parse(localStorage.getItem(`groovelab_room_unsuitable_mappings_${schoolId}`) || '{}');
                      return map[selectedRoom.id] || [];
                    } catch { return []; }
                  })();

                  return (
                    <>
                      {/* Vorhandene Instrumente */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          Vorhandene Instrumente
                        </span>
                        {roomInsts && roomInsts.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {roomInsts.map((inst: any, idx: number) => {
                              let linkUrl = '';
                              try {
                                const localLinkMap = JSON.parse(localStorage.getItem(`groovelab_instrument_links_${schoolId}`) || '{}');
                                linkUrl = localLinkMap[inst.name] || '';
                              } catch {}

                              return (
                                <div 
                                  key={idx} 
                                  style={{ position: 'relative' }}
                                  onMouseEnter={() => setHoveredInstrumentIdx(idx)}
                                  onMouseLeave={() => setHoveredInstrumentIdx(null)}
                                >
                                  {linkUrl ? (
                                    <a 
                                      href={linkUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: 'inline-block',
                                        fontSize: '0.74rem',
                                        background: '#eff6ff',
                                        color: '#0b57d0',
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        border: '1.5px solid #bfdbfe',
                                        cursor: 'pointer',
                                        textDecoration: 'none',
                                        transition: 'all 0.15s ease'
                                      }}
                                      className="hover-scale-mini"
                                    >
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <ExternalLink size={10} strokeWidth={2.4} />
                                        {inst.name}
                                      </span>
                                    </a>
                                  ) : (
                                    <span style={{
                                      display: 'inline-block',
                                      fontSize: '0.74rem',
                                      background: '#f1f5f9',
                                      color: '#334155',
                                      padding: '4px 10px',
                                      borderRadius: '8px',
                                      fontWeight: 700,
                                      border: '1px solid #e2e8f0',
                                      cursor: inst.model ? 'help' : 'default'
                                    }}>
                                      {inst.name}
                                    </span>
                                  )}

                                  {inst.model && hoveredInstrumentIdx === idx && (
                                    <div style={{
                                      position: 'absolute',
                                      bottom: '100%',
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      marginBottom: '6px',
                                      background: '#0f172a',
                                      color: 'white',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      whiteSpace: 'nowrap',
                                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                      zIndex: 50
                                    }}>
                                      {inst.model}
                                      <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: 0,
                                        height: 0,
                                        borderLeft: '4px solid transparent',
                                        borderRight: '4px solid transparent',
                                        borderTop: '4px solid #0f172a'
                                      }} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', fontWeight: 600 }}>
                            Keine Instrumente angegeben
                          </span>
                        )}
                      </div>

                      {/* Ungeeignete Instrumente */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          Akustisch ungeeignet für
                        </span>
                        {unsuitableInsts && unsuitableInsts.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {unsuitableInsts.map((inst: string, idx: number) => (
                              <span 
                                key={idx} 
                                style={{ 
                                  fontSize: '0.74rem', 
                                  background: '#fef2f2', 
                                  color: '#b91c1c', 
                                  padding: '4px 8px', 
                                  borderRadius: '8px', 
                                  fontWeight: 750,
                                  border: '1px solid #fee2e2',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <XCircle size={11} strokeWidth={2.4} style={{ color: '#ef4444' }} />
                                <span>{inst}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', fontWeight: 650 }}>
                            Keine Einschränkungen
                          </span>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* Sonstiges (Comments) */}
                {selectedRoom.sonstiges && selectedRoom.sonstiges.trim() && (
                  <div style={{ 
                    borderTop: '1px solid #f1f5f9', 
                    paddingTop: '8px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '4px' 
                  }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      Sonstiges
                    </span>
                    <p style={{ 
                      fontSize: '0.74rem', 
                      color: '#475569', 
                      fontWeight: 600, 
                      margin: 0, 
                      background: '#f8fafc',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: '1px solid rgba(0,0,0,0.01)'
                    }}>
                      {selectedRoom.sonstiges}
                    </p>
                  </div>
                )}

              </div>
            )}
          </div>
          )}

          {/* Mobile Bottom-Sheet Slider (Apple-Grade Slide-Up Drawer) */}
          {isMobile && showMobileRoomSlider && (
            <div 
              role="dialog"
              aria-modal="true"
              aria-label="Raum-Details und Buchungen"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                animation: 'fadeIn 0.2s ease-out'
              }}
              onClick={() => setShowMobileRoomSlider(false)}
            >
              <div 
                style={{
                  background: '#ffffff',
                  borderTopLeftRadius: '28px',
                  borderTopRightRadius: '28px',
                  maxHeight: '90vh',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 -15px 50px rgba(0, 0, 0, 0.25)',
                  overflow: 'hidden',
                  boxSizing: 'border-box'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Apple Drag Handle */}
                <div style={{ width: '40px', height: '5px', background: '#cbd5e1', borderRadius: '100px', margin: '12px auto 4px auto', flexShrink: 0 }} />

                {/* Sheet Header */}
                <div style={{
                  padding: '14px 20px 12px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      background: `${brandColor}15`,
                      color: brandColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <DoorClosed size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                        {selectedBooking ? 'Raumbuchung verwalten' : `${selectedRoom?.name || 'Raum'} anfragen (unter Vorbehalt)`}
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                        {new Date(bookingDate).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowMobileRoomSlider(false)}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b'
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Sheet Scrollable Content */}
                <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }} className="custom-calendar-scrollbar">
                  
                  {/* Toggle: Raum buchen vs Meine Buchungen */}
                  <div style={{
                    display: 'flex',
                    background: '#f2f2f7',
                    padding: '3px',
                    borderRadius: '14px',
                    gap: '4px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowMyBookingsOnly(false)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '11px',
                        border: 'none',
                        background: !showMyBookingsOnly ? '#ffffff' : 'transparent',
                        color: !showMyBookingsOnly ? '#0f172a' : '#64748b',
                        fontWeight: !showMyBookingsOnly ? 850 : 650,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        boxShadow: !showMyBookingsOnly ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      {selectedBooking ? '✏️ Buchung anpassen' : '⚡ Neuer Termin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMyBookingsOnly(true)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '11px',
                        border: 'none',
                        background: showMyBookingsOnly ? '#ffffff' : 'transparent',
                        color: showMyBookingsOnly ? '#7c3aed' : '#64748b',
                        fontWeight: showMyBookingsOnly ? 850 : 650,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        boxShadow: showMyBookingsOnly ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>Meine Buchungen</span>
                      <span style={{ fontSize: '0.68rem', background: '#7c3aed', color: '#ffffff', padding: '1px 6px', borderRadius: '100px', fontWeight: 900 }}>
                        {myBookings.length}
                      </span>
                    </button>
                  </div>

                  {showMyBookingsOnly ? (
                    /* List of Own Bookings */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {myBookings.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Keine aktiven Raumbuchungen vorhanden.</p>
                        </div>
                      ) : (
                        myBookings.map((b: any) => (
                          <div key={b.id} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 900, fontSize: '0.90rem', color: '#0f172a' }}>{b.roomName || 'Raum'}</span>
                              <span style={{ fontSize: '0.70rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>{b.date}</span>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700 }}>
                              ⏰ {b.startTime} - {b.endTime} Uhr • {b.purpose || 'Eigennutzung'}
                            </span>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleCancelBooking(b.ids || b.id);
                                }}
                                style={{
                                  flex: 1,
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer'
                                }}
                              >
                                🗑️ Stornieren
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    /* Booking Form */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      
                      {/* Room Selector if not fixed */}
                      <div>
                        <label style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Raum:</label>
                        <select 
                          value={selectedCampusRoomId || ''} 
                          onChange={(e) => setSelectedCampusRoomId(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', background: '#ffffff', boxSizing: 'border-box' }}
                        >
                          {rooms.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.name} ({(!r.floor || r.floor === 'Allgemein') ? 'EG' : r.floor})</option>
                          ))}
                        </select>
                      </div>

                      {/* Date Picker */}
                      <div>
                        <label style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Datum:</label>
                        <input 
                          type="date" 
                          value={bookingDate} 
                          onChange={(e) => setBookingDate(e.target.value)} 
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', background: '#ffffff', boxSizing: 'border-box' }} 
                        />
                      </div>

                      {/* 1-Tap Quick-Duration Presets */}
                      <div>
                        <label style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                          Dauer (1-Tap):
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                          {[
                            { label: '30m', mins: 30 },
                            { label: '45m', mins: 45 },
                            { label: '60m', mins: 60 },
                            { label: '90m', mins: 90 }
                          ].map((d) => (
                            <button
                              key={d.mins}
                              type="button"
                              onClick={() => handleQuickDuration(d.mins)}
                              style={{
                                padding: '8px 4px',
                                borderRadius: '10px',
                                border: '1.5px solid #e2e8f0',
                                background: '#f8fafc',
                                color: '#0f172a',
                                fontWeight: 800,
                                fontSize: '0.76rem',
                                cursor: 'pointer'
                              }}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Time Pickers */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Von:</label>
                          <input 
                            type="time" 
                            value={bookingStartTime} 
                            onChange={(e) => setBookingStartTime(e.target.value)} 
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', background: '#ffffff', boxSizing: 'border-box' }} 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Bis:</label>
                          <input 
                            type="time" 
                            value={bookingEndTime} 
                            onChange={(e) => setBookingEndTime(e.target.value)} 
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', background: '#ffffff', boxSizing: 'border-box' }} 
                          />
                        </div>
                      </div>

                      {/* Quick Purpose Chips */}
                      <div>
                        <label style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                          Zweck-Schnellauswahl:
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                          {[
                            '🎹 Mein Unterricht',
                            '🎵 Eigennutzung / Üben',
                            '👥 Band / Ensemble',
                            '🏫 Vertretungsstunde'
                          ].map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => setBookingPurpose(chip)}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '10px',
                                border: bookingPurpose === chip ? `2px solid ${brandColor}` : '1.5px solid #e2e8f0',
                                background: bookingPurpose === chip ? `${brandColor}15` : '#f8fafc',
                                color: bookingPurpose === chip ? brandColor : '#334155',
                                fontWeight: bookingPurpose === chip ? 850 : 650,
                                fontSize: '0.74rem',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Purpose Input */}
                      <div>
                        <label style={{ fontSize: '0.70rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Notiz / Eigener Text:</label>
                        <input 
                          type="text" 
                          placeholder="z. B. Nachholstunde, Vorbereitung..." 
                          value={bookingPurpose} 
                          onChange={(e) => setBookingPurpose(e.target.value)} 
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', background: '#ffffff', boxSizing: 'border-box' }} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Bottom Action Bar */}
                {!showMyBookingsOnly && (
                  <div style={{
                    padding: '14px 20px',
                    paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
                    borderTop: '1px solid #f1f5f9',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedRoom) {
                          if (isEditing) {
                            handleUpdateBooking();
                          } else {
                            handleAddBooking(selectedRoom.id);
                          }
                          setShowMobileRoomSlider(false);
                        }
                      }}
                      style={{
                        background: `linear-gradient(135deg, ${brandColor}, #15803d)`,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '14px',
                        fontWeight: 900,
                        fontSize: '0.90rem',
                        cursor: 'pointer',
                        boxShadow: `0 4px 16px ${brandColor}35`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>🟢</span>
                      <span>{isEditing ? 'Raumanfrage anpassen' : 'Raumanfrage unter Vorbehalt senden'}</span>
                    </button>

                    {/* ℹ️ Subsidiaritäts- & Vorbehalts-Hinweis */}
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '0.69rem',
                      color: '#64748b',
                      lineHeight: 1.4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Info size={13} style={{ flexShrink: 0, color: '#0284c7' }} />
                      <span>
                        <strong>Voranfrage unter Vorbehalt:</strong> Die verbindliche Raumzuteilung erfolgt nach Prüfung durch das Schulsekretariat im Schul-ERP.
                      </span>
                    </div>

                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteBooking();
                          setShowMobileRoomSlider(false);
                        }}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px',
                          fontWeight: 800,
                          fontSize: '0.80rem',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️ Buchung stornieren / freigeben
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowMobileRoomSlider(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.80rem',
                        fontWeight: 700,
                        padding: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Abbrechen
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
};

export default AdminCampusRoomsView;
