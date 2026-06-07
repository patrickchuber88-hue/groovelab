import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Clock, 
  MapPin, 
  Users, 
  Music, 
  Globe, 
  Lock, 
  Settings, 
  Filter, 
  Check, 
  X, 
  AlertCircle, 
  Info, 
  CalendarDays,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Palmtree,
  Building2,
  ExternalLink,
  Eye
} from 'lucide-react';

interface CampusEventsBoardProps {
  userId: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  schoolId: string;
  supabase: any;
  brandColor: string;
}

interface LessonOccurrence {
  id: string;
  schedule_id?: string;
  student_id?: string;
  teacher_id?: string;
  date: string;
  start_time: string;
  duration: number;
  status: 'scheduled' | 'pending_reschedule' | 'rescheduled_confirmed' | 'cancelled' | 'canceled_by_student' | 'teacher_sick' | 'canceled_by_teacher_sick';
  is_virtual?: boolean;
  teacher?: { first_name: string; last_name: string };
  student?: { first_name: string; last_name: string };
  schedule?: { room?: string };
}

interface CampusEvent {
  id: string;
  school_id: string;
  title: string;
  description?: string;
  event_date: string;
  event_end_date?: string;
  start_time: string;
  end_time?: string;
  category: string;
  created_by: string;
  is_public?: boolean;
  created_at?: string;
  location_type?: 'none' | 'intern' | 'extern';
  room_id?: string;
  location_extern?: string;
  room?: { id: string; name: string };
  assigned_student_ids?: string[];
  student_id?: string;
  is_subscribed?: boolean;
  isSubscribed?: boolean;
  ensemble_id?: string;
  band_id?: string;
}

export function CampusEventsBoard({ userId, role, schoolId, supabase, brandColor }: CampusEventsBoardProps) {
  // Tabs for Column 1 (My Lessons)
  const [lessonTab, setLessonTab] = useState<'upcoming' | 'past'>('upcoming');

  // Expanded/Collapsed months state for Column 1
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Filter for Column 2 (School / Subscribed Events Timeline)
  const [eventFilter, setEventFilter] = useState<'all' | 'subscribed' | 'custom'>('all');

  // Core Data States
  const [lessons, setLessons] = useState<LessonOccurrence[]>([]);
  const [customEvents, setCustomEvents] = useState<CampusEvent[]>([]);
  const [subscribedEvents, setSubscribedEvents] = useState<any[]>([]);
  const [calendarUrl, setCalendarUrl] = useState<string>('');
  
  // Loaders
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Form State for creating custom events (Column 3)
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formCategory, setFormCategory] = useState('Sonstiges');
  const [formDescription, setFormDescription] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [submittingForm, setSubmittingForm] = useState(false);

  // Smart search state for Schüler / Ensembles & Bands
  const [participantQuery, setParticipantQuery] = useState('');
  const [participantResults, setParticipantResults] = useState<{id: string; name: string; type: 'student' | 'ensemble' | 'band'; detail?: string}[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<{id: string; name: string; type: 'student' | 'ensemble' | 'band'; detail?: string}[]>([]);
  const [participantSearchOpen, setParticipantSearchOpen] = useState(false);
  const [participantLoading, setParticipantLoading] = useState(false);
  const participantSearchRef = useRef<HTMLDivElement>(null);
  const [myStudentIds, setMyStudentIds] = useState<string[]>([]);
  const [studentEnsembleIds, setStudentEnsembleIds] = useState<string[]>([]);



  // Location / Room state
  const [formLocationType, setFormLocationType] = useState<'none' | 'intern' | 'extern'>('none');
  const [formRoomId, setFormRoomId] = useState('');
  const [formLocationExtern, setFormLocationExtern] = useState('');
  const [schoolRooms, setSchoolRooms] = useState<{id: string; name: string; floor?: string}[]>([]);
  const [availableRooms, setAvailableRooms] = useState<{id: string; name: string; floor?: string}[]>([]);
  const [checkingRooms, setCheckingRooms] = useState(false);

  // Event Detail Modal (Column 2)
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalSearchResults, setModalSearchResults] = useState<any[]>([]);
  const [modalSearchOpen, setModalSearchOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSelectedStudents, setModalSelectedStudents] = useState<any[]>([]);



  // Fetch all initial data
  useEffect(() => {
    fetchLessons();
    fetchCustomEvents();
    fetchSchoolCalendarSettings();
    fetchSchoolRooms();
    if (role === 'student') {
      fetchStudentEnsembles();
    }
  }, [userId, schoolId, role]);


  // Re-check room availability when date, start time or end time changes
  useEffect(() => {
    if (formLocationType === 'intern' && formDate && formStartTime && formEndTime) {
      fetchAvailableRooms(formDate, formStartTime, formEndTime);
    }
  }, [formDate, formStartTime, formEndTime, formLocationType]);

  // Close participant dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (participantSearchRef.current && !participantSearchRef.current.contains(e.target as Node)) {
        setParticipantSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Smart search for participants (debounced 250ms)
  useEffect(() => {
    if (!participantQuery.trim() || participantQuery.trim().length < 1) {
      setParticipantResults([]);
      setParticipantSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setParticipantLoading(true);
      try {
        const q = participantQuery.trim();
        const results: {id: string; name: string; type: 'student' | 'ensemble' | 'band'; detail?: string}[] = [];

        // Search students
        let studentQuery = supabase
          .from('users')
          .select('id, first_name, last_name, instrument')
          .eq('school_id', schoolId)
          .eq('role', 'student');

        if (role === 'teacher') {
          if (myStudentIds.length > 0) {
            studentQuery = studentQuery.in('id', myStudentIds);
          } else {
            studentQuery = studentQuery.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        }

        const { data: students } = await studentQuery
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
          .limit(8);

        if (students) {
          students.forEach((s: any) => {
            results.push({ id: s.id, name: `${s.first_name} ${s.last_name}`, type: 'student', detail: s.instrument || undefined });
          });
        }

        // Search ensembles
        const { data: ensembles } = await supabase
          .from('ensembles')
          .select('id, name, genre')
          .eq('school_id', schoolId)
          .ilike('name', `%${q}%`)
          .limit(5);
        if (ensembles) {
          ensembles.forEach((e: any) => {
            results.push({ id: e.id, name: e.name, type: 'ensemble', detail: e.genre || undefined });
          });
        }

        // Search bands
        const { data: bands } = await supabase
          .from('bands')
          .select('id, name, genre')
          .eq('school_id', schoolId)
          .ilike('name', `%${q}%`)
          .limit(5);
        if (bands) {
          bands.forEach((b: any) => {
            results.push({ id: b.id, name: b.name, type: 'band', detail: b.genre || undefined });
          });
        }

        setParticipantResults(results);
        setParticipantSearchOpen(results.length > 0);
      } catch (err) {
        console.warn('Participant search error:', err);
      } finally {
        setParticipantLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [participantQuery, schoolId, role, myStudentIds]);

  // Search students for modal assignment (restricted to teacher's own students)
  useEffect(() => {
    if (!modalSearchQuery.trim()) {
      setModalSearchResults([]);
      setModalSearchOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setModalLoading(true);
      try {
        const q = modalSearchQuery.trim();
        let query = supabase
          .from('users')
          .select('id, first_name, last_name, instrument')
          .eq('school_id', schoolId)
          .eq('role', 'student');
        
        if (role === 'teacher') {
          if (myStudentIds.length > 0) {
            query = query.in('id', myStudentIds);
          } else {
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        }

        const { data } = await query
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
          .limit(8);

        setModalSearchResults(data || []);
        setModalSearchOpen((data || []).length > 0);
      } catch (err) {
        console.warn('Modal search error:', err);
      } finally {
        setModalLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [modalSearchQuery, schoolId, role, myStudentIds]);

  const normalizeTitle = (t: string) => (t || '').trim().toLowerCase();
  const normalizeTime = (t: string) => {
    if (!t) return '00:00';
    const match = t.match(/^(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : '00:00';
  };

  const handleSelectEvent = async (ev: any) => {
    const isSubscribed = ev.is_subscribed || ev.isSubscribed;
    
    // Resolve catColor/catBg
    let catColor = '#64748b';
    let catBg = '#f1f5f9';
    if (ev.category === 'Konzert') {
      catColor = '#a855f7';
      catBg = '#f3e8ff';
    } else if (ev.category === 'Probe') {
      catColor = '#f59e0b';
      catBg = '#fef3c7';
    } else if (ev.category === 'Sonstiges') {
      catColor = '#3b82f6';
      catBg = '#eff6ff';
    }

    let linkedEvent = { ...ev };
    if (isSubscribed) {
      const existingCopy = customEvents.find(c => 
        c.created_by === userId &&
        normalizeTitle(c.title) === normalizeTitle(ev.title) &&
        c.event_date === ev.event_date &&
        normalizeTime(c.start_time) === normalizeTime(ev.start_time)
      );
      if (existingCopy) {
        linkedEvent = {
          ...linkedEvent,
          id: existingCopy.id,
          is_subscribed: false,
          isSubscribed: false,
          assigned_student_ids: existingCopy.assigned_student_ids || [],
          location_type: existingCopy.location_type,
          room_id: existingCopy.room_id,
          location_extern: existingCopy.location_extern,
          description: existingCopy.description || ev.description
        };
      }
    }

    const isMyEvent = linkedEvent.created_by === userId || !isSubscribed;

    setSelectedEvent({ ...linkedEvent, isSubscribed: isSubscribed && !linkedEvent.id.toString().startsWith('subscribed-') && !linkedEvent.id.toString().startsWith('sub-') ? false : isSubscribed, isMyEvent, catColor, catBg });
    setModalSearchQuery('');
    setModalSearchOpen(false);

    // If the logged-in user is a teacher and there are assigned student IDs, load their profiles!
    const studentIdsToFetch = [...(linkedEvent.assigned_student_ids || [])];
    if (linkedEvent.student_id && !studentIdsToFetch.includes(linkedEvent.student_id)) {
      studentIdsToFetch.push(linkedEvent.student_id);
    }

    if ((role === 'teacher' || role === 'admin' || role === 'secretary') && studentIdsToFetch.length > 0) {
      try {
        const { data } = await supabase
          .from('users')
          .select('id, first_name, last_name, instrument')
          .in('id', studentIdsToFetch);
        if (data) {
          setModalSelectedStudents(data);
          return;
        }
      } catch (err) {
        console.warn('Error loading assigned student profiles:', err);
      }
    }
    setModalSelectedStudents([]);
  };

  const saveEventAssignments = async () => {
    if (!selectedEvent) return;
    try {
      const isSubscribed = selectedEvent.is_subscribed || selectedEvent.isSubscribed;
      const studentIds = modalSelectedStudents.map(s => s.id);

      let result;
      // Double check if a copy of this subscribed event already exists in customEvents (safety)
      let existingCopy = null;
      if (isSubscribed) {
        existingCopy = customEvents.find(c => 
          c.created_by === userId &&
          normalizeTitle(c.title) === normalizeTitle(selectedEvent.title) &&
          c.event_date === selectedEvent.event_date &&
          normalizeTime(c.start_time) === normalizeTime(selectedEvent.start_time)
        );
      }

      if (isSubscribed && !existingCopy) {
        // Subscribed events must be copied into a new custom event row in campus_events
        const eventPayload = {
          school_id: schoolId,
          title: selectedEvent.title,
          description: selectedEvent.description || null,
          event_date: selectedEvent.event_date,
          start_time: normalizeTime(selectedEvent.start_time) + ':00',
          end_time: selectedEvent.end_time ? normalizeTime(selectedEvent.end_time) + ':00' : null,
          category: selectedEvent.category || 'Sonstiges',
          created_by: userId,
          is_public: false,
          assigned_student_ids: studentIds,
          location_type: selectedEvent.location_type || 'none',
          room_id: selectedEvent.room_id || null,
          location_extern: selectedEvent.location_extern || null
        };
        result = await supabase
          .from('campus_events')
          .insert(eventPayload)
          .select('*, room:room_id(id, name)')
          .single();
      } else {
        // Custom events or already copied events can be updated directly
        const targetId = existingCopy ? existingCopy.id : selectedEvent.id;
        result = await supabase
          .from('campus_events')
          .update({ assigned_student_ids: studentIds })
          .eq('id', targetId)
          .select('*, room:room_id(id, name)')
          .single();
      }

      const { data, error } = result;
      if (error) throw error;

      if (data) {
        setCustomEvents(prev => {
          const exists = prev.some(x => x.id === data.id);
          if (exists) {
            return prev.map(x => x.id === data.id ? data : x);
          } else {
            return [...prev, data].sort((a, b) => {
              if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date);
              return a.start_time.localeCompare(b.start_time);
            });
          }
        });
        alert('Zuweisungen erfolgreich gespeichert! 🎉');
        setSelectedEvent(null);
      }
    } catch (err: any) {
      alert('Speichern fehlgeschlagen: ' + err.message);
    }
  };



  // Fetch school settings for subscribed calendar
  const fetchSchoolCalendarSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('calendar_url')
        .eq('id', schoolId)
        .single();
      
      if (error) throw error;
      if (data?.calendar_url) {
        setCalendarUrl(data.calendar_url);
        fetchSubscribedCalendar(data.calendar_url);
      }
    } catch (err) {
      console.error('Error fetching calendar settings:', err);
    }
  };

  // Parse iCal / ICS data client side
  const parseICS = (icsText: string): any[] => {
    const events: any[] = [];
    const lines = icsText.split(/\r?\n/);
    let currentEvent: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.summary && currentEvent.dtstart) {
          events.push(currentEvent);
        }
        currentEvent = null;
      } else if (currentEvent) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.substring(0, colonIdx);
          const value = line.substring(colonIdx + 1);

          if (key.startsWith('SUMMARY')) {
            currentEvent.summary = value;
          } else if (key.startsWith('DESCRIPTION')) {
            currentEvent.description = value.replace(/\\n/g, '\n');
          } else if (key.startsWith('DTSTART')) {
            currentEvent.rawStart = value;
            currentEvent.dtstart = parseICSDate(value);
          } else if (key.startsWith('DTEND')) {
            currentEvent.rawEnd = value;
            currentEvent.dtend = parseICSDate(value);
          } else if (key.startsWith('LOCATION')) {
            currentEvent.location = value;
          }
        }
      }
    }
    return events;
  };

  // Convert iCal format (e.g. 20260611T180000Z) to standard Date object
  const parseICSDate = (icsDateStr: string): Date => {
    // Clean parameter prefix e.g. VALUE=DATE:20260611
    const cleanStr = icsDateStr.includes(':') ? icsDateStr.split(':')[1] : icsDateStr;
    const year = parseInt(cleanStr.substring(0, 4));
    const month = parseInt(cleanStr.substring(4, 6)) - 1;
    const day = parseInt(cleanStr.substring(6, 8));

    if (cleanStr.includes('T')) {
      const hour = parseInt(cleanStr.substring(9, 11));
      const min = parseInt(cleanStr.substring(11, 13));
      const sec = parseInt(cleanStr.substring(13, 15));
      return new Date(Date.UTC(year, month, day, hour, min, sec));
    }
    return new Date(year, month, day);
  };

  // Fetch ICS Feed and parse
  const fetchSubscribedCalendar = async (url: string) => {
    if (!url) return;
    setLoadingCalendar(true);
    setCalendarError(null);

    try {
      // Direct client fetch fallback to proxy if blocked by CORS
      let text = '';
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        text = await res.text();
      } catch (corsErr) {
        // Fallback CORS proxy helper chain
        const proxies = [
          `https://corsproxy.io/?${url}`,
          `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
        ];

        let success = false;
        for (const proxyUrl of proxies) {
          try {
            console.log(`Trying proxy: ${proxyUrl}`);
            const res = await fetch(proxyUrl);
            if (!res.ok) continue;
            
            if (proxyUrl.includes('allorigins')) {
              const json = await res.json();
              text = json.contents;
            } else {
              text = await res.text();
            }

            if (text && text.includes('BEGIN:VCALENDAR')) {
              success = true;
              break;
            }
          } catch (proxyErr) {
            console.warn(`Proxy ${proxyUrl} failed:`, proxyErr);
          }
        }

        if (!success) {
          throw new Error('All CORS proxies failed');
        }
      }

      const parsed = parseICS(text).map((ev: any, index: number) => {
        const title = ev.summary || 'Abonnierter Termin';
        const isHoliday = title.toLowerCase().includes('ferien') || title.toLowerCase().includes('feiertag') || title.toLowerCase().includes('schulfrei');
        
        const isAllDay = ev.rawEnd && !ev.rawEnd.includes('T');
        let end = ev.dtend ? new Date(ev.dtend) : new Date(ev.dtstart);
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

      setSubscribedEvents(parsed);
    } catch (err) {
      console.warn('CORS feed load failed, displaying default/demo calendar entries for this school URL.');
      setCalendarError('Kalender-Feed konnte nicht direkt geladen werden (CORS). Zeige Demo-Kalenderdaten.');
      
      // Inject standard school demo calendar events to ensure a perfect aesthetic
      setSubscribedEvents([
        {
          id: 'sub-demo-1',
          title: 'Großes Sommerkonzert 2026',
          description: 'Unser alljährliches Sommer-Konzert in der Stadthalle. Alle Ensembles spielen!',
          event_date: '2026-06-25',
          start_time: '18:00',
          category: 'Konzert',
          is_subscribed: true
        },
        {
          id: 'sub-demo-2',
          title: 'Lehrerkonferenz & Planungs-Meeting',
          description: 'Meeting aller Lehrkräfte zur Organisation des kommenden Semesters.',
          event_date: '2026-07-02',
          start_time: '10:00',
          category: 'Konferenz',
          is_subscribed: true
        },
        {
          id: 'sub-demo-3',
          title: 'Klassenvorspiel Klavier & Flöte',
          description: 'Schüler präsentieren ihre erlernten Stücke im Kammermusiksaal.',
          event_date: '2026-06-18',
          start_time: '16:00',
          category: 'Klassenvorspiel',
          is_subscribed: true
        }
      ]);
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Fetch teaching schedules/occurrences for Column 1
  const fetchLessons = async () => {
    setLoadingLessons(true);
    try {
      const todayStr = new Date().toISOString().substring(0, 10);
      const startYear = new Date().getFullYear() - 1 + '-09-01';
      const endYear = new Date().getFullYear() + 1 + '-08-31';

      // 1. Load regular schedules
      let scheduleQuery = supabase
        .from('schedules')
        .select(`
          *,
          teacher:teacher_id(first_name, last_name),
          student:student_id(first_name, last_name)
        `);

      if (role === 'student') {
        scheduleQuery = scheduleQuery.eq('student_id', userId);
      } else {
        scheduleQuery = scheduleQuery.eq('teacher_id', userId);
      }

      const { data: schedules, error: schErr } = await scheduleQuery;
      if (schErr) throw schErr;

      // 2. Load overrides/occurrences
      let occurrenceQuery = supabase
        .from('schedule_occurrences')
        .select(`
          *,
          teacher:teacher_id(first_name, last_name),
          student:student_id(first_name, last_name)
        `);

      if (role === 'student') {
        occurrenceQuery = occurrenceQuery.eq('student_id', userId);
      } else {
        occurrenceQuery = occurrenceQuery.eq('teacher_id', userId);
      }

      const { data: occurrences, error: occErr } = await occurrenceQuery;
      if (occErr) throw occErr;

      // Extract teacher's students to filter participant search
      if (role === 'teacher') {
        const studentIdsSet = new Set<string>();
        if (schedules) {
          schedules.forEach((s: any) => {
            if (s.student_id) studentIdsSet.add(s.student_id);
          });
        }
        if (occurrences) {
          occurrences.forEach((o: any) => {
            if (o.student_id) studentIdsSet.add(o.student_id);
          });
        }
        setMyStudentIds(Array.from(studentIdsSet));
      }


      // Generate visual list of occurrences for the school year
      const schoolYearStart = new Date(startYear);
      const schoolYearEnd = new Date(endYear);
      const allMergedOccurrences: LessonOccurrence[] = [];
      const usedActualIds = new Set<string>();

      if (schedules) {
        schedules.forEach((sch: any) => {
          let current = new Date(schoolYearStart);
          while (current <= schoolYearEnd) {
            const currentDay = current.getDay() || 7;
            const diff = sch.day_of_week - currentDay;
            const targetDate = new Date(current);
            targetDate.setDate(current.getDate() + diff);

            if (targetDate >= schoolYearStart && targetDate <= schoolYearEnd) {
              const dateStr = targetDate.toISOString().substring(0, 10);

              // Check if override exists
              const actual = occurrences?.find((occ: any) => 
                (occ.schedule_id === sch.id) && 
                (occ.original_date === dateStr || (!occ.original_date && occ.date === dateStr))
              );

              if (actual) {
                allMergedOccurrences.push({
                  ...actual,
                  schedule: sch
                });
                usedActualIds.add(actual.id);
              } else {
                allMergedOccurrences.push({
                  id: `virtual-${sch.id}-${dateStr}`,
                  schedule_id: sch.id,
                  student_id: sch.student_id,
                  teacher_id: sch.teacher_id,
                  date: dateStr,
                  start_time: sch.time_slot + (sch.time_slot.split(':').length === 2 ? ':00' : ''),
                  duration: sch.duration || 45,
                  status: sch.status === 'canceled_by_teacher_sick' ? 'teacher_sick' : 'scheduled',
                  is_virtual: true,
                  teacher: sch.teacher,
                  student: sch.student,
                  schedule: sch
                });
              }
            }
            current.setDate(current.getDate() + 7);
          }
        });
      }

      if (occurrences) {
        occurrences.forEach((occ: any) => {
          if (!usedActualIds.has(occ.id)) {
            allMergedOccurrences.push(occ);
          }
        });
      }

      // Sort chronologically
      allMergedOccurrences.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      setLessons(allMergedOccurrences);
    } catch (err) {
      console.error('Error fetching lessons schedule:', err);
    } finally {
      setLoadingLessons(false);
    }
  };

  // Fetch custom created events
  const fetchCustomEvents = async () => {
    setLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('campus_events')
        .select('*, room:room_id(id, name)')
        .eq('school_id', schoolId)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      setCustomEvents(data || []);
    } catch (err) {
      console.error('Error fetching custom events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Load all rooms for this school
  const fetchSchoolRooms = async () => {
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
  };

  // Fetch ensembles/bands where current student is a member
  const fetchStudentEnsembles = async () => {
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
  };

  const isAssignedToEvent = (ev: any) => {
    if (ev.student_id === userId) return true;
    if (ev.assigned_student_ids && ev.assigned_student_ids.includes(userId)) return true;
    if (ev.ensemble_id && studentEnsembleIds.includes(ev.ensemble_id)) return true;
    if (ev.band_id && studentEnsembleIds.includes(ev.band_id)) return true;
    return false;
  };



  // Check which rooms are available on a given date + time
  const fetchAvailableRooms = async (date: string, startTime: string, endTime: string) => {
    if (!date || !startTime || schoolRooms.length === 0) {
      setAvailableRooms(schoolRooms);
      return;
    }
    setCheckingRooms(true);
    try {
      const start = startTime; // 'HH:MM'
      const end = endTime || (() => {
        const [h, m] = startTime.split(':').map(Number);
        const endMins = h * 60 + m + 60;
        return `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
      })();

      // Get the day_of_week for the date (1=Mon...7=Sun)
      const d = new Date(date);
      const rawDay = d.getDay();
      const dayOfWeek = rawDay === 0 ? 7 : rawDay;

      // Fetch booked room_ids: from schedules (recurring)
      const { data: schedBooked } = await supabase
        .from('schedules')
        .select('room_id, time_slot, duration')
        .eq('school_id', schoolId)
        .eq('day_of_week', dayOfWeek)
        .not('room_id', 'is', null);

      // Fetch booked room_ids: from campus_events on exact date
      const { data: evBooked } = await supabase
        .from('campus_events')
        .select('room_id, start_time, end_time')
        .eq('school_id', schoolId)
        .eq('event_date', date)
        .not('room_id', 'is', null);

      // Fetch booked room_ids: from room_bookings on exact date
      let rbBooked: any[] = [];
      try {
        const { data: rb } = await supabase
          .from('room_bookings')
          .select('room_id, start_time, end_time')
          .eq('school_id', schoolId)
          .eq('date', date);
        rbBooked = rb || [];
      } catch (_) { /* table may not exist yet */ }

      // Helper: check time overlap
      const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
        return aStart < bEnd && aEnd > bStart;
      };

      const bookedRoomIds = new Set<string>();

      (schedBooked || []).forEach((s: any) => {
        const sStart = (s.time_slot || '00:00').substring(0, 5);
        const durMins = s.duration || 45;
        const [sh, sm] = sStart.split(':').map(Number);
        const endMins = sh * 60 + sm + durMins;
        const sEnd = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
        if (overlaps(sStart, sEnd, start, end)) {
          bookedRoomIds.add(s.room_id);
        }
      });

      (evBooked || []).forEach((ev: any) => {
        const evStart = (ev.start_time || '00:00').substring(0, 5);
        const evEnd = ev.end_time ? ev.end_time.substring(0, 5) : (() => {
          const [h, m] = evStart.split(':').map(Number);
          const em = h * 60 + m + 60;
          return `${String(Math.floor(em / 60)).padStart(2, '0')}:${String(em % 60).padStart(2, '0')}`;
        })();
        if (overlaps(evStart, evEnd, start, end)) {
          bookedRoomIds.add(ev.room_id);
        }
      });

      rbBooked.forEach((rb: any) => {
        const rbStart = (rb.start_time || '00:00').substring(0, 5);
        const rbEnd = rb.end_time ? rb.end_time.substring(0, 5) : (() => {
          const [h, m] = rbStart.split(':').map(Number);
          const em = h * 60 + m + 60;
          return `${String(Math.floor(em / 60)).padStart(2, '0')}:${String(em % 60).padStart(2, '0')}`;
        })();
        if (overlaps(rbStart, rbEnd, start, end)) {
          bookedRoomIds.add(rb.room_id);
        }
      });

      setAvailableRooms(schoolRooms.filter(r => !bookedRoomIds.has(r.id)));
      // Reset selected room if it's no longer available
      if (formRoomId && bookedRoomIds.has(formRoomId)) {
        setFormRoomId('');
      }
    } catch (err) {
      console.warn('Room availability check failed:', err);
      setAvailableRooms(schoolRooms);
    } finally {
      setCheckingRooms(false);
    }
  };

  // Handle Event Creation (Column 3 Form Submission)
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate || !formStartTime || !formCategory) {
      alert('Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    setSubmittingForm(true);
    try {
      const eventPayload: any = {
        school_id: schoolId,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        event_date: formDate,
        start_time: formStartTime + ':00',
        end_time: formEndTime ? formEndTime + ':00' : null,
        category: formCategory,
        created_by: userId,
        is_public: role === 'student' ? false : formIsPublic,
        location_type: formLocationType,
        room_id: formLocationType === 'intern' && formRoomId ? formRoomId : null,
        location_extern: formLocationType === 'extern' && formLocationExtern.trim() ? formLocationExtern.trim() : null,
      };

      const { data, error } = await supabase
        .from('campus_events')
        .insert(eventPayload)
        .select('*, room:room_id(id, name)')
        .single();
      
      if (error) throw error;

      // Auto-create room booking if intern room was selected (teachers/admins/secretary only)
      if (formLocationType === 'intern' && formRoomId && role !== 'student') {
        try {
          await supabase.from('room_bookings').insert({
            school_id: schoolId,
            room_id: formRoomId,
            booked_by: userId,
            campus_event_id: data.id,
            date: formDate,
            start_time: formStartTime + ':00',
            end_time: formEndTime ? formEndTime + ':00' : null,
            title: formTitle.trim()
          });
        } catch (rbErr) {
          console.warn('Could not create room booking (table may not exist yet):', rbErr);
        }
      }

      setCustomEvents(prev => [...prev, data].sort((a, b) => {
        if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date);
        return a.start_time.localeCompare(b.start_time);
      }));

      // Reset Form fields
      setFormTitle('');
      setFormDate('');
      setFormStartTime('');
      setFormEndTime('');
      setFormCategory('Sonstiges');
      setFormDescription('');
      setFormIsPublic(false);
      setSelectedParticipants([]);
      setParticipantQuery('');
      setFormLocationType('none');
      setFormRoomId('');
      setFormLocationExtern('');

      alert('Termin erfolgreich angelegt! 🎉');
    } catch (err: any) {
      alert('Fehler beim Anlegen: ' + err.message);
    } finally {
      setSubmittingForm(false);
    }
  };

  // Delete event handler
  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Möchtest du diesen Termin wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('campus_events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setCustomEvents(prev => prev.filter(ev => ev.id !== id));
    } catch (err: any) {
      alert('Löschen fehlgeschlagen: ' + err.message);
    }
  };

  // Timeline Events merger (Column 2 merges custom + subscribed)
  const getMergedTimelineEvents = () => {
    const todayStr = new Date().toISOString().substring(0, 10);
    
    // Filter custom events visible to this user
    const filteredCustom = customEvents.filter(ev => {
      // Visible if public OR created by current user
      if (!ev.is_public && ev.created_by === userId) {
        // Exclude private copies of subscribed calendar events to prevent duplicates in Column 2
        const isDuplicateOfSubscribed = subscribedEvents.some(sub => 
          normalizeTitle(sub.title) === normalizeTitle(ev.title) && 
          sub.event_date === ev.event_date && 
          normalizeTime(sub.start_time) === normalizeTime(ev.start_time)
        );
        if (isDuplicateOfSubscribed) return false;
      }
      return ev.is_public || ev.created_by === userId;
    });


    const merged = [
      ...subscribedEvents,
      ...filteredCustom.map(ev => ({
        id: ev.id,
        title: ev.title,
        description: ev.description || '',
        event_date: ev.event_date,
        event_end_date: ev.event_end_date || ev.event_date,
        start_time: ev.start_time.substring(0, 5),
        category: ev.category,
        is_subscribed: false,
        created_by: ev.created_by
      }))
    ];

    // Filter based on selected category tab
    const filteredByCategory = merged.filter(ev => {
      if (eventFilter === 'subscribed') return ev.is_subscribed;
      if (eventFilter === 'custom') return !ev.is_subscribed;
      return true;
    });

    // Only show upcoming events including today or events whose period extends to/beyond today
    const upcomingEventsOnly = filteredByCategory.filter(ev => {
      const end = ev.event_end_date || ev.event_date;
      return end >= todayStr;
    });

    // Only show future/recent events (sort chronologically)
    return upcomingEventsOnly.sort((a, b) => {
      if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date);
      return a.start_time.localeCompare(b.start_time);
    });
  };

  // Split lesson list for Column 1
  const getFilteredLessons = () => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const nowTimeStr = new Date().toTimeString().substring(0, 8);

    // Filter out holiday lessons
    const holidayRanges = subscribedEvents.filter(ev => ev.category === 'Ferien');

    return lessons.filter(occ => {
      const isHoliday = holidayRanges.some(h => {
        const start = h.event_date;
        const end = h.event_end_date || h.event_date;
        return occ.date >= start && occ.date <= end;
      });
      if (isHoliday) return false;



      const isPast = occ.date < todayStr || (occ.date === todayStr && occ.start_time < nowTimeStr);
      return lessonTab === 'upcoming' ? !isPast : isPast;
    });
  };

  // Helpers for formatting
  const formatDateGerman = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatWeekday = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('de-DE', { weekday: 'short' });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { weekday: 'short' });
  };

  const getMonthLabel = (monthKey: string) => {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(360px, 1.5fr) minmax(300px, 1fr)',
      gap: '24px',
      alignItems: 'start',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      width: '100%',
      boxSizing: 'border-box',
      padding: '0px'
    }} className="animation-fade-in">
      
      {/* COLUMN 1: MY LESSONS (Unterrichtstermine) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: 'calc(100vh - 120px)',
        overflow: 'hidden'
      }}>
        {/* Title */}
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarDays size={18} color={brandColor} /> Unterrichtstermine
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '4px 0 0 0', fontWeight: 550 }}>
            Deine persönlichen Stundenplandaten
          </p>
        </div>

        {/* Tabs switcher */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px',
          gap: '4px'
        }}>
          <button
            onClick={() => setLessonTab('upcoming')}
            style={{
              flex: 1,
              border: 'none',
              background: lessonTab === 'upcoming' ? '#ffffff' : 'transparent',
              color: lessonTab === 'upcoming' ? '#0f172a' : '#64748b',
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: lessonTab === 'upcoming' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
            }}
          >
            Kommende
          </button>
          <button
            onClick={() => setLessonTab('past')}
            style={{
              flex: 1,
              border: 'none',
              background: lessonTab === 'past' ? '#ffffff' : 'transparent',
              color: lessonTab === 'past' ? '#0f172a' : '#64748b',
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: lessonTab === 'past' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
            }}
          >
            Vergangene
          </button>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
          {loadingLessons ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              Stundenplan lädt...
            </div>
          ) : getFilteredLessons().length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '1.5px dashed #e2e8f0', borderRadius: '16px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              Keine Termine vorhanden.
            </div>
          ) : (() => {
            const grouped: Record<string, any[]> = {};
            const list = getFilteredLessons();
            list.forEach(occ => {
              const monthKey = occ.date.substring(0, 7); // "YYYY-MM"
              if (!grouped[monthKey]) {
                grouped[monthKey] = [];
              }
              grouped[monthKey].push(occ);
            });

            const monthKeys = Object.keys(grouped);
            const currentMonthKey = new Date().toISOString().substring(0, 7);
            monthKeys.sort((a, b) => {
              if (a === currentMonthKey) return -1;
              if (b === currentMonthKey) return 1;
              if (lessonTab === 'past') {
                return b.localeCompare(a);
              }
              return a.localeCompare(b);
            });

            return monthKeys.map((monthKey, idx) => {
              const occs = grouped[monthKey];
              const isExpanded = expandedMonths[monthKey] !== undefined 
                ? expandedMonths[monthKey] 
                : (monthKey === currentMonthKey || idx === 0);

              return (
                <div key={monthKey} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                  {/* Collapsible Month Header */}
                  <div 
                    onClick={() => setExpandedMonths(prev => ({ ...prev, [monthKey]: !isExpanded }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.01)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isExpanded ? <ChevronDown size={15} color="#64748b" /> : <ChevronRight size={15} color="#64748b" />}
                      {getMonthLabel(monthKey)}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: brandColor, background: `${brandColor}15`, padding: '2px 8px', borderRadius: '6px' }}>
                      {occs.length} {occs.length === 1 ? 'Termin' : 'Termine'}
                    </span>
                  </div>

                  {/* Month Events List */}
                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '2px' }}>
                      {occs.map((occ) => {
                        const isCanceled = occ.status === 'canceled_by_student' || occ.status === 'cancelled' || occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick';
                        const isRescheduled = occ.status === 'pending_reschedule' || occ.status === 'rescheduled_confirmed';
                        
                        let rowBg = '#ffffff';
                        let rowBorder = '1px solid #e2e8f0';
                        let textColor = '#0f172a';
                        let subColor = '#64748b';

                        if (isCanceled) {
                          rowBg = '#fef2f2';
                          rowBorder = '1px solid #fee2e2';
                          textColor = '#991b1b';
                          subColor = '#ef4444';
                        } else if (isRescheduled) {
                          rowBg = '#fffbeb';
                          rowBorder = '1px solid #fef3c7';
                          textColor = '#92400e';
                          subColor = '#d97706';
                        }

                        const opponentName = role === 'student'
                          ? `Lehrkraft: ${occ.teacher?.first_name || 'Lehrer'} ${occ.teacher?.last_name || ''}`
                          : `Schüler: ${occ.student?.first_name || 'Schüler'} ${occ.student?.last_name || ''}`;

                        return (
                          <div 
                            key={occ.id}
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              borderRadius: '14px',
                              background: rowBg,
                              border: rowBorder,
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.01)',
                              transition: 'all 0.2s',
                              gap: '12px',
                              boxSizing: 'border-box'
                            }}
                            className="hover-scale-subtle"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                              {/* Date Block */}
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isCanceled ? '#fee2e2' : isRescheduled ? '#fef3c7' : '#f8fafc',
                                borderRadius: '8px',
                                padding: '4px',
                                width: '38px',
                                height: '38px',
                                border: '1px solid rgba(0,0,0,0.03)',
                                flexShrink: 0
                              }}>
                                <span style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', color: subColor, lineHeight: 1 }}>
                                  {formatWeekday(occ.date)}
                                </span>
                                <span style={{ fontSize: '1rem', fontWeight: 900, color: textColor, lineHeight: 1, marginTop: '2px', fontFamily: 'monospace' }}>
                                  {occ.date.substring(8, 10)}
                                </span>
                              </div>

                              {/* Lesson Details */}
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {opponentName}
                                  </span>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: subColor, fontWeight: 700, marginTop: '1px' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={12} /> {formatDateGerman(occ.date)}
                                  </span>
                                  <span>•</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} /> {occ.start_time.substring(0, 5)} Uhr
                                  </span>
                                  <span>•</span>
                                  <span>{occ.duration} Min</span>
                                  {occ.schedule?.room && (
                                    <>
                                      <span>•</span>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <MapPin size={12} /> {occ.schedule.room}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right Status */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              {!isCanceled && !isRescheduled ? (
                                <div 
                                  title="Regulärer Termin"
                                  style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    background: '#22c55e',
                                    border: '2px solid #ffffff',
                                    boxShadow: '0 0 6px rgba(34, 197, 94, 0.4)'
                                  }} 
                                />
                              ) : isCanceled ? (
                                <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', color: '#ef4444', background: '#fee2e2', padding: '2px 6px', borderRadius: '6px' }}>
                                  Ausfall
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', color: '#d97706', background: '#fef3c7', padding: '2px 6px', borderRadius: '6px' }}>
                                  Verschoben
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()
          }
        </div>
      </div>

      {/* COLUMN 2: PUBLIC EVENTS & SCHOOL CALENDAR (Schultermine, Konzerte, Proben) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: 'calc(100vh - 120px)',
        overflow: 'hidden'
      }}>
        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color={brandColor} /> Campus &amp; Schultermine
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '4px 0 0 0', fontWeight: 550 }}>
              Konzerte, Klassenvorspiele &amp; Termine
            </p>
          </div>
        </div>

        {/* Filter Switcher */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px',
          gap: '4px'
        }}>
          <button
            onClick={() => setEventFilter('all')}
            style={{
              flex: 1.2,
              border: 'none',
              background: eventFilter === 'all' ? '#ffffff' : 'transparent',
              color: eventFilter === 'all' ? '#0f172a' : '#64748b',
              padding: '8px 8px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: eventFilter === 'all' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
            }}
          >
            Alle Termine
          </button>
          <button
            onClick={() => setEventFilter('subscribed')}
            style={{
              flex: 1.5,
              border: 'none',
              background: eventFilter === 'subscribed' ? '#ffffff' : 'transparent',
              color: eventFilter === 'subscribed' ? '#0f172a' : '#64748b',
              padding: '8px 8px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: eventFilter === 'subscribed' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
            }}
          >
            Abonnierte Termine
          </button>
          <button
            onClick={() => setEventFilter('custom')}
            style={{
              flex: 1.3,
              border: 'none',
              background: eventFilter === 'custom' ? '#ffffff' : 'transparent',
              color: eventFilter === 'custom' ? '#0f172a' : '#64748b',
              padding: '8px 8px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.72rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: eventFilter === 'custom' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
            }}
          >
            Eigene Termine
          </button>
        </div>

        {/* Unified Timeline List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '2px' }}>
          {loadingEvents || loadingCalendar ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              Termine werden geladen...
            </div>
          ) : getMergedTimelineEvents().length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '1.5px dashed #e2e8f0', borderRadius: '16px', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
              Keine Termine eingetragen.
            </div>
          ) : (
            getMergedTimelineEvents().map((ev: any) => {
              const isSubscribed = ev.is_subscribed;
              const dateObj = new Date(ev.event_date);
              const isMyEvent = ev.created_by === userId;

              // Color codes for categories
              let catColor = '#64748b'; // Default gray
              let catBg = '#f1f5f9';

              const isHolidayEvent = ev.category === 'Ferien' || ev.category === 'Feiertag' || (ev.title || '').toLowerCase().includes('ferien') || (ev.title || '').toLowerCase().includes('feiertag');
              const isMusikschulfest = (ev.title || '').toLowerCase().includes('musikschulfest');
              const isKlassenvorspiel = ev.category === 'Klassenvorspiel' || (ev.title || '').toLowerCase().includes('klassenvorspiel');

              if (isHolidayEvent) {
                catColor = '#10b981'; // Green
                catBg = '#ecfdf5';
              } else if (isMusikschulfest) {
                catColor = '#ef4444'; // Red
                catBg = '#fef2f2';
              } else if (isKlassenvorspiel) {
                catColor = '#3b82f6'; // Blue
                catBg = '#eff6ff';
              } else if (ev.category === 'Konzert') {
                catColor = '#a855f7'; // Purple
                catBg = '#f3e8ff';
              } else if (ev.category === 'Probe') {
                catColor = '#f59e0b'; // Amber
                catBg = '#fef3c7';
              } else if (isSubscribed) {
                catColor = '#64748b';
                catBg = '#f1f5f9';
              }

              return (
                <div
                  key={ev.id}
                  onClick={() => handleSelectEvent(ev)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    borderRadius: '18px',
                    cursor: 'pointer',
                    background: isHolidayEvent 
                      ? 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)' 
                      : isMusikschulfest
                        ? 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)'
                        : isKlassenvorspiel
                          ? 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)'
                          : '#ffffff',
                    border: isHolidayEvent 
                      ? '1px solid #a7f3d0' 
                      : isMusikschulfest
                        ? '1px solid #fca5a5'
                        : isKlassenvorspiel
                          ? '1px solid #bfdbfe'
                          : '1px solid #e2e8f0',
                    borderLeft: `4px solid ${catColor}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.015)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  className="hover-scale-subtle"
                >
                  {/* Top header line: Badges & Trash icon */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        color: catColor,
                        background: catBg,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {ev.category}
                      </span>

                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        color: isSubscribed ? '#475569' : '#0369a1',
                        background: isSubscribed ? '#f1f5f9' : '#e0f2fe',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isSubscribed ? <Globe size={10} /> : <Lock size={10} />}
                        {isSubscribed ? 'Abonniert (iCal)' : 'Eigener Termin'}
                      </span>
                    </div>

                    {!isSubscribed && isMyEvent && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteEvent(ev.id); }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        title="Termin löschen"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    {/* Eye-hint */}
                    <Eye size={12} color="#94a3b8" style={{ marginLeft: isMyEvent ? '0' : 'auto', flexShrink: 0 }} />
                  </div>

                  {/* Title & Date line */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <h4 style={{ 
                      margin: 0, 
                      fontSize: '0.98rem', 
                      fontWeight: 800, 
                      color: isHolidayEvent 
                        ? '#065f46' 
                        : isMusikschulfest
                          ? '#991b1b'
                          : isKlassenvorspiel
                            ? '#1e40af'
                            : '#0f172a', 
                      fontFamily: 'Urbanist', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'flex-start', 
                      gap: '6px', 
                      flex: 1, 
                      textAlign: 'left', 
                      lineHeight: 1.3 
                    }}>
                      {isHolidayEvent && (
                        <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center' }}>
                          <Palmtree size={15} strokeWidth={2.5} />
                        </span>
                      )}
                      {ev.title}
                    </h4>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: isHolidayEvent 
                        ? '#047857' 
                        : isMusikschulfest
                          ? '#b91c1c'
                          : isKlassenvorspiel
                            ? '#2563eb'
                            : '#475569',
                      background: isHolidayEvent 
                        ? '#d1fae5' 
                        : isMusikschulfest
                          ? '#fee2e2'
                          : isKlassenvorspiel
                            ? '#dbeafe'
                            : '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '2px',
                      flexShrink: 0
                    }}>
                      <Calendar size={12} /> {ev.event_end_date && ev.event_end_date !== ev.event_date 
                        ? `von ${formatDateGerman(ev.event_date)} - bis ${formatDateGerman(ev.event_end_date)}` 
                        : formatDateGerman(ev.event_date)}
                    </span>
                  </div>

                  {/* Location badge */}
                  {ev.location_type === 'intern' && ev.room && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px' }}>
                      <Building2 size={11} color="#6366f1" />
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6366f1' }}>{ev.room.name}</span>
                    </div>
                  )}
                  {ev.location_type === 'extern' && ev.location_extern && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px' }}>
                      <MapPin size={11} color="#f59e0b" />
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#78350f' }}>{ev.location_extern}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Subscribed Calendar Info */}
        {calendarUrl && (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '16px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginTop: '8px',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'center' }}>
              🔗 SYNCHRONISIERTER ICAL KALENDER &amp; EIGENE TERMINE
            </span>
          </div>
        )}
      </div>

      {/* COLUMN 3: SIDEBAR - CREATE OWN EVENTS */}
      <div style={{
        background: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: 'calc(100vh - 120px)',
        overflowY: 'auto'
      }}>
        {/* Title */}
        {role === 'student' ? (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={20} color={brandColor} /> Meine Termine
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '4px 0 0 0', fontWeight: 550 }}>
              Termine, denen du zugeteilt bist
            </p>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={20} color={brandColor} /> Eigene Termine
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '4px 0 0 0', fontWeight: 550 }}>
              Erstelle Vorspiele, Konzerte oder Proben
            </p>
          </div>
        )}

        {/* Form or Assigned List */}
        {role === 'student' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {customEvents.filter(ev => isAssignedToEvent(ev)).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', border: '1.5px dashed #e2e8f0', borderRadius: '16px', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600 }}>
                Keine Termine, denen du zugeteilt bist.
              </div>
            ) : (
              customEvents.filter(ev => isAssignedToEvent(ev)).map(ev => {
                const dateObj = new Date(ev.event_date);
                const dateStr = dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });
                
                let catColor = '#64748b';
                let catBg = '#f1f5f9';
                if (ev.category === 'Konzert') {
                  catColor = '#a855f7';
                  catBg = '#f3e8ff';
                } else if (ev.category === 'Probe') {
                  catColor = '#f59e0b';
                  catBg = '#fef3c7';
                } else if (ev.category === 'Sonstiges') {
                  catColor = '#3b82f6';
                  catBg = '#eff6ff';
                }

                return (
                  <div
                    key={ev.id}
                    onClick={() => handleSelectEvent(ev)}
                    style={{
                      padding: '14px',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      borderLeft: `4px solid ${catColor}`,
                      background: '#ffffff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover-scale-subtle"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.58rem', fontWeight: 900, color: catColor, background: catBg, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                        {ev.category}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>
                        {dateStr}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 850, color: '#0f172a', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                      {ev.title}
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        <span>{ev.start_time.substring(0, 5)}{ev.end_time ? ` - ${ev.end_time.substring(0, 5)}` : ''}</span>
                      </div>
                      {ev.location_type === 'intern' && ev.room && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building2 size={12} />
                          <span>{ev.room.name}</span>
                        </div>
                      )}
                      {ev.location_type === 'extern' && ev.location_extern && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} />
                          <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.location_extern}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Titel des Termins *
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="z.B. Klassenvorspiel Patrick"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 650,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Date */}
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Datum *
            </label>
            <input
              type="date"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 650,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Start and End Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Startzeit *
              </label>
              <input
                type="time"
                value={formStartTime}
                onChange={e => setFormStartTime(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 650,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Endzeit
              </label>
              <input
                type="time"
                value={formEndTime}
                onChange={e => setFormEndTime(e.target.value)}
                required={formLocationType === 'intern'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 650,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Ort — Location */}
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Ort
            </label>

            {/* Toggle: Intern / Extern */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px', border: '1px solid #e2e8f0', marginBottom: formLocationType !== 'none' ? '10px' : '0' }}>
              {([
                { id: 'none', label: '—' },
                { id: 'intern', label: '🏫 Intern (Raum)' },
                { id: 'extern', label: '📍 Extern' }
              ] as const).map(opt => {
                const isSel = formLocationType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setFormLocationType(opt.id);
                      setFormRoomId('');
                      setFormLocationExtern('');
                      if (opt.id === 'intern' && formDate && formStartTime && formEndTime) {
                        fetchAvailableRooms(formDate, formStartTime, formEndTime);
                      }
                    }}
                    style={{
                      flex: opt.id === 'none' ? 0.5 : 1,
                      border: 'none',
                      background: isSel ? '#ffffff' : 'transparent',
                      color: isSel ? '#0f172a' : '#64748b',
                      padding: '7px 8px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: isSel ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Intern: Room picker */}
            {formLocationType === 'intern' && (
              <div>
                {!formDate || !formStartTime || !formEndTime ? (
                  <div style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px dashed #e2e8f0', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>
                    Bitte erst Datum, Startzeit &amp; Endzeit wählen
                  </div>
                ) : checkingRooms ? (
                  <div style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>
                    Verfügbarkeit wird geprüft...
                  </div>
                ) : availableRooms.length === 0 ? (
                  <div style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #fee2e2', background: '#fef2f2', fontSize: '0.78rem', color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>
                    Keine Räume frei zu dieser Zeit
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {availableRooms.map(room => {
                      const isSelected = formRoomId === room.id;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setFormRoomId(isSelected ? '' : room.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: isSelected ? `2px solid ${brandColor}` : '1.5px solid #e2e8f0',
                            background: isSelected ? `${brandColor}10` : '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s'
                          }}
                        >
                          <Building2 size={15} color={isSelected ? brandColor : '#94a3b8'} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: isSelected ? brandColor : '#0f172a' }}>{room.name}</div>
                            {room.floor && <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{room.floor}</div>}
                          </div>
                          {isSelected && <Check size={14} color={brandColor} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Extern: Free text */}
            {formLocationType === 'extern' && (
              <input
                type="text"
                value={formLocationExtern}
                onChange={e => setFormLocationExtern(e.target.value)}
                placeholder="z.B. Stadthalle, Konzertsaal Mitte..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 650,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>          {/* Category Switch */}
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Kategorie *
            </label>
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '12px',
              gap: '4px',
              border: '1px solid #e2e8f0'
            }}>
              {[
                { id: 'Konzert', label: 'Konzert' },
                { id: 'Probe', label: 'Probe' },
                { id: 'Sonstiges', label: 'Sonstiges' }
              ].map(cat => {
                const isSelected = formCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormCategory(cat.id)}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: isSelected ? '#ffffff' : 'transparent',
                      color: isSelected ? '#0f172a' : '#64748b',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.04)' : 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Smart Chip-Tag Input: Schüler / Ensembles & Bands */}
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Schüler / Ensembles & Bands
            </label>

            <div
              ref={participantSearchRef}
              style={{ position: 'relative' }}
              onClick={() => { (participantSearchRef.current?.querySelector('input') as HTMLInputElement)?.focus(); }}
            >
              <style dangerouslySetInnerHTML={{__html: `
                .no-autofill-icon::-webkit-contacts-auto-fill-button,
                .no-autofill-icon::-webkit-credentials-auto-fill-button {
                  visibility: hidden !important;
                  display: none !important;
                  pointer-events: none !important;
                  height: 0 !important;
                  width: 0 !important;
                  margin: 0 !important;
                }
              `}} />

              {/* Chip + Input container — looks like one unified field */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '6px',
                padding: selectedParticipants.length > 0 ? '7px 36px 7px 8px' : '0 36px 0 0',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'text',
                minHeight: '42px',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocusCapture={e => {
                const el = e.currentTarget;
                el.style.borderColor = '#94a3b8';
                el.style.boxShadow = '0 0 0 3px rgba(148,163,184,0.12)';
              }}
              onBlurCapture={e => {
                const el = e.currentTarget;
                // only blur if focus left the whole container
                if (!el.contains(e.relatedTarget as Node)) {
                  el.style.borderColor = '#cbd5e1';
                  el.style.boxShadow = 'none';
                }
              }}
              >
                {/* Chips */}
                {selectedParticipants.map((p, idx) => (
                  <span key={p.id} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 7px 3px 8px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    lineHeight: 1.4,
                    background: p.type === 'student' ? '#eff6ff' : p.type === 'ensemble' ? '#f3e8ff' : '#fef3c7',
                    color: p.type === 'student' ? '#1e40af' : p.type === 'ensemble' ? '#7c3aed' : '#92400e',
                    border: `1px solid ${p.type === 'student' ? '#bfdbfe' : p.type === 'ensemble' ? '#ddd6fe' : '#fde68a'}`,
                    userSelect: 'none',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.6rem' }}>
                      {p.type === 'student' ? '👤' : p.type === 'ensemble' ? '🎼' : '🎸'}
                    </span>
                    {p.name}
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedParticipants(prev => prev.filter(x => x.id !== p.id));
                      }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '0', display: 'flex', alignItems: 'center',
                        color: 'inherit', opacity: 0.55, lineHeight: 1,
                        marginLeft: '1px'
                      }}
                    >
                      <X size={10} strokeWidth={2.5} />
                    </button>
                  </span>
                ))}

                {/* Inline text input */}
                <input
                  type="search"
                  className="no-autofill-icon"
                  value={participantQuery}
                  onChange={e => setParticipantQuery(e.target.value)}
                  autoComplete="new-password"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={selectedParticipants.length === 0 ? 'Name eingeben...' : ''}


                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '0.82rem',
                    fontWeight: 650,
                    color: '#0f172a',
                    minWidth: '120px',
                    flex: 1,
                    padding: selectedParticipants.length > 0 ? '3px 0' : '10px 0 10px 12px',
                    lineHeight: 1.5
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Select first non-already-selected result
                      const first = participantResults.find(r => !selectedParticipants.some(s => s.id === r.id));
                      if (first) {
                        setSelectedParticipants(prev => [...prev, first]);
                        setParticipantQuery('');
                        setParticipantSearchOpen(false);
                      }
                    } else if (e.key === 'Backspace' && participantQuery === '' && selectedParticipants.length > 0) {
                      // Remove last chip
                      setSelectedParticipants(prev => prev.slice(0, -1));
                    } else if (e.key === 'Escape') {
                      setParticipantSearchOpen(false);
                      setParticipantQuery('');
                    }
                  }}
                  onFocus={() => { if (participantResults.length > 0) setParticipantSearchOpen(true); }}
                />
              </div>

              {/* Search icon / spinner — absolute right of box */}
              <div style={{
                position: 'absolute', right: '10px', top: '50%',
                transform: 'translateY(-50%)', pointerEvents: 'none',
                color: '#94a3b8', display: 'flex', alignItems: 'center'
              }}>
                {participantLoading
                  ? <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '-0.05em', color: '#94a3b8' }}>···</span>
                  : <Users size={14} />}
              </div>

              {/* Live dropdown */}
              {participantSearchOpen && participantResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0,
                  background: '#ffffff', border: '1.5px solid #e2e8f0',
                  borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.10)',
                  zIndex: 300, overflow: 'hidden', maxHeight: '230px', overflowY: 'auto'
                }}>
                  {(['student', 'ensemble', 'band'] as const).map(type => {
                    const grouped = participantResults.filter(r => r.type === type);
                    if (grouped.length === 0) return null;
                    const groupLabel = type === 'student' ? '👤 Schüler' : type === 'ensemble' ? '🎼 Ensembles' : '🎸 Bands';
                    return (
                      <div key={type}>
                        <div style={{
                          padding: '5px 12px 3px',
                          fontSize: '0.58rem', fontWeight: 900,
                          color: '#b0bec5', textTransform: 'uppercase', letterSpacing: '0.07em',
                          background: '#f8fafc', borderBottom: '1px solid #f0f4f8'
                        }}>{groupLabel}</div>
                        {grouped.map((item, i) => {
                          const alreadySelected = selectedParticipants.some(s => s.id === item.id);
                          // highlight first available item
                          const isFirst = !alreadySelected && grouped.findIndex(g => !selectedParticipants.some(s => s.id === g.id)) === i;
                          return (
                            <div
                              key={item.id}
                              onMouseDown={e => {
                                e.preventDefault();
                                if (!alreadySelected) {
                                  setSelectedParticipants(prev => [...prev, item]);
                                  setParticipantQuery('');
                                  setParticipantSearchOpen(false);
                                }
                              }}
                              style={{
                                padding: '9px 14px',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: alreadySelected ? 'default' : 'pointer',
                                background: isFirst ? '#f0f7ff' : alreadySelected ? '#f8fafc' : '#ffffff',
                                opacity: alreadySelected ? 0.5 : 1,
                                transition: 'background 0.1s',
                                borderBottom: '1px solid #f8fafc'
                              }}
                              onMouseEnter={e => { if (!alreadySelected) e.currentTarget.style.background = '#e8f4ff'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = isFirst ? '#f0f7ff' : alreadySelected ? '#f8fafc' : '#ffffff'; }}
                            >
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{item.name}</div>
                                {item.detail && <div style={{ fontSize: '0.67rem', color: '#94a3b8', fontWeight: 600, marginTop: '1px' }}>{item.detail}</div>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                {isFirst && !alreadySelected && (
                                  <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#94a3b8', background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px', letterSpacing: '0.02em' }}>↵</span>
                                )}
                                {alreadySelected && <Check size={13} color="#22c55e" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No results */}
              {participantSearchOpen && participantResults.length === 0 && !participantLoading && participantQuery.trim().length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0,
                  background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px',
                  padding: '12px 14px', fontSize: '0.78rem', color: '#94a3b8',
                  fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.06)', zIndex: 300
                }}>
                  Keine Ergebnisse für „{participantQuery}“
                </div>
              )}
            </div>
          </div>



          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Beschreibung
            </label>
            <textarea
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Zusätzliche Infos wie Raum, Ort oder Programm..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 650,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
              <input
                type="checkbox"
                id="isPublicEvent"
                checked={formIsPublic}
                onChange={e => setFormIsPublic(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: brandColor,
                  cursor: 'pointer'
                }}
              />
              <label htmlFor="isPublicEvent" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', cursor: 'pointer', userSelect: 'none' }}>
                Schulweit veröffentlichen (Sichtbar für Schüler)
              </label>
            </div>


          {/* Submit Button */}
          <button
            type="submit"
            disabled={submittingForm}
            style={{
              width: '100%',
              background: brandColor,
              color: '#ffffff',
              border: 'none',
              padding: '12px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: `0 4px 14px rgba(0, 0, 0, 0.05)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'opacity 0.2s',
              opacity: submittingForm ? 0.7 : 1
            }}
          >
            {submittingForm ? 'Speichert...' : '+ Termin anlegen'}
          </button>
        </form>
        )}
      </div>

      {/* ── Event Detail Modal ── */}
      {selectedEvent && (() => {
        const ev = selectedEvent;
        const catColor = ev.catColor || '#64748b';
        const catBg = ev.catBg || '#f1f5f9';
        return (
          <div
            onClick={() => setSelectedEvent(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.55)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '460px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
                overflow: 'hidden',
                fontFamily: 'Urbanist, sans-serif'
              }}
            >
              {/* Color bar */}
              <div style={{ height: '5px', background: catColor, width: '100%' }} />

              {/* Header */}
              <div style={{ padding: '22px 22px 0 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 900, color: catColor,
                    background: catBg, padding: '4px 10px', borderRadius: '8px',
                    textTransform: 'uppercase', letterSpacing: '0.04em'
                  }}>
                    {ev.category}
                  </span>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 800,
                    color: ev.isSubscribed ? '#475569' : '#0369a1',
                    background: ev.isSubscribed ? '#f1f5f9' : '#e0f2fe',
                    padding: '4px 10px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    {ev.isSubscribed ? <Globe size={10} /> : <Lock size={10} />}
                    {ev.isSubscribed ? 'iCal Kalender' : 'Eigener Termin'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  style={{
                    background: '#f1f5f9', border: 'none', borderRadius: '50%',
                    width: '34px', height: '34px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <X size={16} color="#64748b" />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '16px 22px 24px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Title */}
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.25 }}>
                  {ev.title}
                </h2>

                {/* Date / Time */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px' }}>
                    <Calendar size={14} color="#64748b" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                      {ev.event_end_date && ev.event_end_date !== ev.event_date
                        ? `${new Date(ev.event_date + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })} – ${new Date(ev.event_end_date + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : new Date(ev.event_date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
                      }
                    </span>
                  </div>
                  {ev.start_time && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px' }}>
                      <Clock size={14} color="#64748b" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                        {ev.start_time.substring(0, 5)}{ev.end_time ? ` – ${ev.end_time.substring(0, 5)}` : ''} Uhr
                      </span>
                    </div>
                  )}
                </div>

                {/* Location */}
                {ev.location_type === 'intern' && ev.room && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f0f1ff', padding: '10px 14px', borderRadius: '12px' }}>
                    <Building2 size={16} color="#6366f1" />
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Raum (intern)</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e1b4b' }}>{ev.room.name}</div>
                    </div>
                  </div>
                )}
                {ev.location_type === 'extern' && ev.location_extern && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fffbeb', padding: '10px 14px', borderRadius: '12px' }}>
                    <MapPin size={16} color="#d97706" />
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Externer Ort</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#78350f' }}>{ev.location_extern}</div>
                    </div>
                  </div>
                )}

                {/* Description */}
                {ev.description && (
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>
                    {ev.description}
                  </div>
                )}

                {/* Zuweisungs-Bereich (nur für Lehrer) */}
                {(role === 'teacher' || role === 'admin' || role === 'secretary') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '6px' }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Empfänger zuweisen (Mehrfachauswahl)
                    </label>
                    
                    {/* Chip box & Input combined */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '6px',
                      padding: modalSelectedStudents.length > 0 ? '6px 8px' : '0',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      minHeight: '40px',
                      position: 'relative',
                      boxSizing: 'border-box'
                    }}>
                      {/* Selected Student Chips */}
                      {modalSelectedStudents.map(student => (
                        <span key={student.id} style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '20px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: '#eff6ff',
                          color: '#1e40af',
                          border: '1px solid #bfdbfe'
                        }}>
                          {student.first_name} {student.last_name || ''}
                          <button
                            type="button"
                            onClick={() => setModalSelectedStudents(prev => prev.filter(s => s.id !== student.id))}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: '0', display: 'flex', alignItems: 'center',
                              color: 'inherit', opacity: 0.6
                            }}
                          >
                            <X size={10} strokeWidth={2.5} />
                          </button>
                        </span>
                      ))}

                      {/* Live search input field */}
                      <input
                        type="search"
                        className="no-autofill-icon"
                        placeholder={modalSelectedStudents.length === 0 ? "Schüler suchen..." : ""}
                        value={modalSearchQuery}
                        onChange={e => setModalSearchQuery(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Backspace' && !modalSearchQuery) {
                            setModalSelectedStudents(prev => prev.slice(0, -1));
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            const filteredResults = modalSearchResults.filter(
                              s => !modalSelectedStudents.some(x => x.id === s.id)
                            );
                            if (filteredResults.length > 0) {
                              const firstStudent = filteredResults[0];
                              setModalSelectedStudents(prev => [...prev, firstStudent]);
                              setModalSearchQuery('');
                              setModalSearchOpen(false);
                            }
                          }
                        }}
                        autoComplete="new-password"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        style={{
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          fontSize: '0.82rem',
                          fontWeight: 650,
                          color: '#0f172a',
                          minWidth: '100px',
                          flex: 1,
                          padding: modalSelectedStudents.length > 0 ? '4px 0' : '10px 12px',
                          height: '37px',
                          boxSizing: 'border-box'
                        }}
                      />

                      {/* Dropdown list (opens upwards) */}
                      {modalSearchOpen && modalSearchResults.length > 0 && (
                        <div style={{
                          position: 'absolute', bottom: 'calc(100% + 5px)', left: 0, right: 0,
                          background: '#ffffff', border: '1.5px solid #e2e8f0',
                          borderRadius: '12px', boxShadow: '0 -12px 32px rgba(0,0,0,0.12)',
                          zIndex: 1100, overflow: 'hidden', maxHeight: '180px', overflowY: 'auto'
                        }}>
                          {modalSearchResults
                            .filter(s => !modalSelectedStudents.some(x => x.id === s.id))
                            .map(student => (
                              <div
                                key={student.id}
                                onMouseDown={() => {
                                  setModalSelectedStudents(prev => [...prev, student]);
                                  setModalSearchQuery('');
                                  setModalSearchOpen(false);
                                }}
                                style={{
                                  padding: '10px 14px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f8fafc',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                                onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                              >
                                <div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                                    {student.first_name} {student.last_name || ''}
                                  </div>
                                  {student.instrument && (
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                                      {student.instrument}
                                    </div>
                                  )}
                                </div>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: brandColor }}>
                                  Hinzufügen
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons (Save Assignments) */}
                    <button
                      type="button"
                      onClick={saveEventAssignments}
                      style={{
                        background: brandColor,
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }}
                    >
                      <Check size={14} /> Zuweisungen speichern
                    </button>
                  </div>
                )}

                {/* Delete button (own events only) */}
                {!ev.isSubscribed && ev.isMyEvent && (
                  <button
                    onClick={() => { handleDeleteEvent(ev.id); setSelectedEvent(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      background: '#fef2f2', border: '1.5px solid #fee2e2', color: '#ef4444',
                      padding: '10px', borderRadius: '12px', cursor: 'pointer',
                      fontWeight: 800, fontSize: '0.82rem', marginTop: '4px',
                      transition: 'all 0.15s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = '#fee2e2'; }}
                    onMouseOut={e => { e.currentTarget.style.background = '#fef2f2'; }}
                  >
                    <Trash2 size={14} />
                    Termin löschen
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
