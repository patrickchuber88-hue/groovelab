import { useState, useEffect, useCallback } from 'react';
import { CampusEvent, ProgramPoint } from '../types/campusEvents.types';
import { parseICS } from '../utils/campusEventsUtils';
import { supabase as defaultSupabase } from '../../../../lib/supabase';

interface UseCampusTimelineEventsParams {
  schoolId: string;
  userId: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  supabase?: any;
}

export function useCampusTimelineEvents({
  schoolId,
  userId,
  role,
  supabase = defaultSupabase
}: UseCampusTimelineEventsParams) {
  const [customEvents, setCustomEvents] = useState<CampusEvent[]>([]);
  const [subscribedEvents, setSubscribedEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [calendarUrl, setCalendarUrl] = useState<string>('');
  const [icalActive, setIcalActive] = useState<boolean>(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const [eventFilter, setEventFilter] = useState<'all' | 'subscribed' | 'custom'>('all');
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);
  const [selectedStudentEvent, setSelectedStudentEvent] = useState<any | null>(null);
  const [studentProgramPoints, setStudentProgramPoints] = useState<ProgramPoint[]>([]);
  const [loadingStudentProgramPoints, setLoadingStudentProgramPoints] = useState(false);
  const [selectedEventAllPoints, setSelectedEventAllPoints] = useState<ProgramPoint[]>([]);
  const [loadingSelectedStudentEventPoints, setLoadingSelectedStudentEventPoints] = useState(false);

  const [schoolRooms, setSchoolRooms] = useState<any[]>([]);
  const [schoolAnnouncements, setSchoolAnnouncements] = useState<any[]>([]);
  const [studentEnsembleIds, setStudentEnsembleIds] = useState<string[]>([]);

  // Fetch custom events from DB
  const fetchCustomEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('campus_events')
        .select('*, room:room_id(id, name)')
        .eq('school_id', schoolId)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      setCustomEvents((data || []).map((e: any) => ({
        ...e,
        isMyEvent: e.created_by === userId
      })));
    } catch (err) {
      console.error('Error fetching custom events:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, [schoolId, userId, supabase]);

  // Load all rooms for this school
  const fetchSchoolRooms = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('rooms')
        .select('id, name, floor')
        .eq('school_id', schoolId)
        .eq('is_campus_active', true)
        .order('sort_order', { ascending: true });
      setSchoolRooms(data || []);
    } catch (err) {
      console.warn('Could not load school rooms:', err);
    }
  }, [schoolId, supabase]);

  // Load campus announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('campus_announcements')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(20);
      setSchoolAnnouncements(data || []);
    } catch (err) {
      console.warn('Could not load campus announcements:', err);
    }
  }, [schoolId, supabase]);

  // Fetch ensembles/bands where current student is a member
  const fetchStudentEnsembles = useCallback(async () => {
    if (!userId || role !== 'student') return;
    try {
      const { data, error } = await supabase
        .from('ensemble_members')
        .select('ensemble_id')
        .eq('student_id', userId);
      if (error) throw error;
      if (data) {
        setStudentEnsembleIds(data.map((m: any) => m.ensemble_id).filter(Boolean));
      }
    } catch (err) {
      console.warn('Error fetching student ensembles:', err);
    }
  }, [userId, role, supabase]);

  // Fetch student specific program points
  const fetchStudentProgramPoints = useCallback(async () => {
    if (!userId || role !== 'student') return;
    setLoadingStudentProgramPoints(true);
    try {
      const { data } = await supabase
        .from('campus_event_program_points')
        .select('*')
        .eq('school_id', schoolId);
      
      const filtered = (data || []).filter((pp: any) => {
        const assignedIds = pp.additional_feedback_responses?.assigned_students;
        return Array.isArray(assignedIds) && assignedIds.includes(userId);
      });
      setStudentProgramPoints(filtered);
    } catch (err) {
      console.warn('Error fetching student program points:', err);
    } finally {
      setLoadingStudentProgramPoints(false);
    }
  }, [userId, role, schoolId, supabase]);

  // Fetch ICS Feed and parse
  const fetchSubscribedCalendar = useCallback(async (url: string) => {
    if (!url) return;
    setLoadingCalendar(true);
    setCalendarError(null);

    try {
      const cacheKey = `groovelab_subscribed_cal_${schoolId || 'global'}_${encodeURIComponent(url.slice(0, 40))}`;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          if (parsedCache && typeof parsedCache.timestamp === 'number' && (Date.now() - parsedCache.timestamp < 24 * 60 * 60 * 1000) && Array.isArray(parsedCache.data) && parsedCache.data.length > 0) {
            setSubscribedEvents(parsedCache.data);
            setLoadingCalendar(false);
            return;
          }
        }
      } catch (e) {}

      const urls = (() => {
        try {
          if (url.startsWith('[')) return JSON.parse(url) as string[];
        } catch (e) {}
        if (url.includes(',')) return url.split(',').map(u => u.trim()).filter(Boolean);
        return [url];
      })();

      let combinedEvents: any[] = [];
      let loadFailedCount = 0;

      for (const singleUrl of urls) {
        try {
          let text = '';
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);

          try {
            const res = await fetch(singleUrl, { signal: controller.signal });
            if (!res.ok) throw new Error();
            text = await res.text();
          } catch (corsErr: any) {
            if (corsErr?.name === 'AbortError') {
              console.warn('[CampusEventsBoard] Calendar feed timed out after 2.5s, skipping:', singleUrl);
            } else {
              console.warn('[CampusEventsBoard] Direct calendar sync failed, skipping unreachable external feed:', singleUrl);
            }
            loadFailedCount++;
            continue;
          } finally {
            clearTimeout(timeoutId);
          }

          if (text) {
            const parsedSingle = parseICS(text);
            combinedEvents = [...combinedEvents, ...parsedSingle];
          }
        } catch (err) {
          console.warn('Error fetching calendar URL:', singleUrl, err);
          loadFailedCount++;
        }
      }

      if (combinedEvents.length > 0) {
        const parsed = combinedEvents.map((ev: any, index: number) => {
          const title = ev.summary || 'Abonnierter Termin';
          const isHoliday = title.toLowerCase().includes('ferien') || title.toLowerCase().includes('feiertag') || title.toLowerCase().includes('schulfrei');
          
          const isAllDay = ev.rawEnd && !ev.rawEnd.includes('T');
          const end = ev.dtend ? new Date(ev.dtend) : new Date(ev.dtstart);
          if (ev.dtend && isAllDay) {
            end.setDate(end.getDate() - 1);
          }
          
          const toYYYYMMDD = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };

          return {
            id: `subscribed-${index}`,
            title: title,
            description: ev.description || '',
            event_date: ev.dtstart ? toYYYYMMDD(ev.dtstart) : '',
            event_end_date: toYYYYMMDD(end),
            start_time: ev.dtstart ? ev.dtstart.toTimeString().substring(0, 5) : '00:00',
            category: isHoliday ? 'Ferien' : 'Schultermin',
            is_subscribed: true
          };
        });
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: parsed }));
        } catch (e) {}
        setSubscribedEvents(parsed);
        return;
      }

      if (loadFailedCount === urls.length && urls.length > 0) {
        console.warn('CORS feed load failed, displaying default/demo calendar entries for this school URL.');
        setCalendarError('Kalender-Feed konnte nicht direkt geladen werden (CORS). Zeige Demo-Kalenderdaten.');
      }
      
      // Inject standard school demo calendar events
      setSubscribedEvents([
        {
          id: 'sub-demo-1',
          title: 'Großes Sommerkonzert 2026',
          description: 'Unser alljährliches Sommer-Konzert in der Stadthalle. Alle Ensembles spielen!',
          event_date: '2026-06-25',
          start_time: '18:00',
          category: 'Konzert',
          is_subscribed: true
        }
      ]);
    } catch (err: any) {
      console.error('Error in fetchSubscribedCalendar:', err);
    } finally {
      setLoadingCalendar(false);
    }
  }, [schoolId]);

  // Fetch school settings for subscribed calendar
  const fetchSchoolCalendarSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('calendar_url, opening_hours')
        .eq('id', schoolId)
        .single();
      
      if (error) throw error;
      const campusSettings = data?.opening_hours?.campus_settings || {};
      setIcalActive(campusSettings.ical_active !== false);
      if (data?.calendar_url) {
        setCalendarUrl(data.calendar_url);
        setTimeout(() => {
          fetchSubscribedCalendar(data.calendar_url);
        }, 100);
      }
    } catch (err) {
      console.error('Error fetching calendar settings:', err);
    }
  }, [schoolId, supabase, fetchSubscribedCalendar]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (!window.confirm('Möchtest du diesen Termin wirklich löschen?')) return;
    try {
      const { error } = await supabase
        .from('campus_events')
        .delete()
        .eq('id', eventId);
      if (error) throw error;
      setCustomEvents(prev => prev.filter(e => e.id !== eventId));
      if (selectedEvent?.id === eventId) setSelectedEvent(null);
    } catch (err: any) {
      alert('Fehler beim Löschen des Termins: ' + err.message);
    }
  }, [supabase, selectedEvent]);

  // Load initial data
  useEffect(() => {
    fetchCustomEvents();
    fetchSchoolRooms();
    fetchAnnouncements();
    fetchSchoolCalendarSettings();
    if (role === 'student') {
      fetchStudentEnsembles();
      fetchStudentProgramPoints();
    }
  }, [fetchCustomEvents, fetchSchoolRooms, fetchAnnouncements, fetchSchoolCalendarSettings, role, fetchStudentEnsembles, fetchStudentProgramPoints]);

  return {
    customEvents,
    setCustomEvents,
    subscribedEvents,
    loadingEvents,
    calendarUrl,
    icalActive,
    loadingCalendar,
    calendarError,
    eventFilter,
    setEventFilter,
    expandedMonths,
    setExpandedMonths,
    expandedWeeks,
    setExpandedWeeks,
    selectedEvent,
    setSelectedEvent,
    selectedStudentEvent,
    setSelectedStudentEvent,
    studentProgramPoints,
    loadingStudentProgramPoints,
    selectedEventAllPoints,
    setSelectedEventAllPoints,
    loadingSelectedStudentEventPoints,
    setLoadingSelectedStudentEventPoints,
    schoolRooms,
    schoolAnnouncements,
    studentEnsembleIds,
    fetchCustomEvents,
    fetchSchoolRooms,
    fetchAnnouncements,
    fetchStudentEnsembles,
    fetchStudentProgramPoints,
    fetchSubscribedCalendar,
    fetchSchoolCalendarSettings,
    handleDeleteEvent
  };
}
