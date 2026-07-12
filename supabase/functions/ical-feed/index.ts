import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

// CORS Headers for secure API access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

// Helper to escape text according to RFC 5545 iCalendar specification
const escapeText = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Helper to get privacy-safe initials from a full name (e.g. Jonas Müller -> J. M.)
const getInitials = (firstName: string, lastName: string): string => {
  const getPartInitials = (nameStr: string) => {
    if (!nameStr) return '';
    return nameStr.trim().split(/\s+/).map(part => {
      return part.split('-').map(subPart => subPart ? subPart[0].toUpperCase() + '.' : '').join('-');
    }).join(' ');
  };
  const firstInit = getPartInitials(firstName);
  const lastInit = getPartInitials(lastName);
  return [firstInit, lastInit].filter(Boolean).join(' ');
}

// Normalize helpers for deduplication
const normalizeTitle = (t: string) => (t || '').trim().toLowerCase();
const normalizeTime = (t: string) => {
  if (!t) return '00:00';
  const parts = t.split(':');
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
};

const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
};

const formatMinutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Parse ICS dates in Deno
const parseICSDate = (icsDateStr: string): Date => {
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

// Simple zeilenbasierter ICS Parser
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

// Main Edge Function Handler
Deno.serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing token parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase Client with service role key to bypass RLS and fetch user by token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Database credentials not configured in environment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    })

    // 1. Fetch user associated with this secure QR token or user ID (fallback)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token || '');
    let userQuery = supabase.from('users').select('id, first_name, last_name, role, school_id');
    if (isUuid) {
      userQuery = userQuery.or(`qr_token.eq.${token},id.eq.${token}`);
    } else {
      userQuery = userQuery.eq('qr_token', token);
    }
    const { data: user, error: userErr } = await userQuery.maybeSingle();

    if (userErr) {
      console.error('Error querying user by token:', userErr)
      return new Response(
        JSON.stringify({ error: 'Internal server database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired subscription token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { id: userId, role, first_name, last_name, school_id: schoolId } = user

    // Boundaries: Sync exactly one school year (Sept 1st to July 31st)
    const now = new Date()
    const schoolStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
    const schoolYearStart = new Date(`${schoolStartYear}-09-01`)
    const schoolYearEnd = new Date(`${schoolStartYear + 1}-07-31`)
    const pastBoundaryStr = schoolYearStart.toISOString().substring(0, 10)
    const futureBoundaryStr = schoolYearEnd.toISOString().substring(0, 10)

    // 2. Load standard recurring schedules for the user (Unterrichtstermine)
    let scheduleQuery = supabase
      .from('schedules')
      .select(`
        *,
        teacher:teacher_id(first_name, last_name),
        student:student_id(first_name, last_name, instrument),
        room:room_id(name)
      `)

    if (role === 'student') {
      scheduleQuery = scheduleQuery.eq('student_id', userId)
    } else {
      scheduleQuery = scheduleQuery.eq('teacher_id', userId)
    }

    const { data: schedules, error: schErr } = await scheduleQuery
    if (schErr) throw schErr

    // 3. Load overrides/occurrences (Unterrichtstermine Abweichungen) in date range
    let occurrenceQuery = supabase
      .from('schedule_occurrences')
      .select(`
        *,
        teacher:teacher_id(first_name, last_name),
        student:student_id(first_name, last_name, instrument)
      `)
      .gte('date', pastBoundaryStr)
      .lte('date', futureBoundaryStr)

    if (role === 'student') {
      occurrenceQuery = occurrenceQuery.eq('student_id', userId)
    } else {
      occurrenceQuery = occurrenceQuery.eq('teacher_id', userId)
    }

    const { data: occurrences, error: occErr } = await occurrenceQuery
    if (occErr) throw occErr

    // 4. Merge regular weekly schedules and occurrences into actual calendar dates
    const allMergedOccurrences = []
    const usedActualIds = new Set<string>()

    if (schedules) {
      for (const sch of schedules) {
        let current = new Date(schoolYearStart)
        while (current <= schoolYearEnd) {
          const currentDay = current.getDay() || 7
          const diff = sch.day_of_week - currentDay
          const targetDate = new Date(current)
          targetDate.setDate(current.getDate() + diff)

          if (targetDate >= schoolYearStart && targetDate <= schoolYearEnd && targetDate.getMonth() !== 7) {
            const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`

            const actual = occurrences?.find((occ: any) => 
              (occ.schedule_id === sch.id) && 
              (occ.original_date === dateStr || (!occ.original_date && occ.date === dateStr))
            )

            if (actual) {
              allMergedOccurrences.push({
                ...actual,
                schedule: sch,
                room_name: sch.room?.name || 'Groovelab Raum'
              })
              usedActualIds.add(actual.id)
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
                schedule: sch,
                room_name: sch.room?.name || 'Groovelab Raum'
              })
            }
          }
          current.setDate(current.getDate() + 7)
        }
      }
    }

    if (occurrences) {
      for (const occ of occurrences) {
        if (!usedActualIds.has(occ.id)) {
          allMergedOccurrences.push({
            ...occ,
            room_name: 'Groovelab Raum'
          })
        }
      }
    }

    allMergedOccurrences.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.start_time || '').localeCompare(b.start_time || '')
    })

    // 5. Query and load Campus-Termine for the user's school in date range
    let campusEvents: any[] = [];
    let allSchoolCampusEvents: any[] = [];
    if (schoolId) {
      if (role === 'teacher' || role === 'student') {
        // Query approved program points
        let progPoints: any[] = [];
        if (role === 'teacher') {
          const { data, error } = await supabase
            .from('campus_event_program_points')
            .select('*, event:event_id(*)')
            .eq('teacher_id', userId)
            .eq('status', 'approved');
          if (!error && data) {
            progPoints = data.filter((pp: any) => {
              const eventDate = pp.event?.event_date;
              return eventDate && eventDate >= pastBoundaryStr && eventDate <= futureBoundaryStr;
            });
          }
        } else {
          // For students, fetch approved program points
          const { data, error } = await supabase
            .from('campus_event_program_points')
            .select('*, event:event_id(*)')
            .eq('status', 'approved');
          if (!error && data) {
            // Filter locally where user is in assigned_students & within date range
            progPoints = data.filter((pp: any) => {
              const assigned = pp.additional_feedback_responses?.assigned_students || [];
              const eventDate = pp.event?.event_date;
              const inRange = eventDate && eventDate >= pastBoundaryStr && eventDate <= futureBoundaryStr;
              return inRange && assigned.includes(userId);
            });
          }
        }

        // We also want to include events where the student is directly assigned (assigned_student_ids contains userId or student_id === userId)
        const { data: directEvents, error: deErr } = await supabase
          .from('campus_events')
          .select('*, room:room_id(name)')
          .eq('school_id', schoolId)
          .gte('event_date', pastBoundaryStr)
          .lte('event_date', futureBoundaryStr);

        let directAssignedEventIds: string[] = [];
        if (!deErr && directEvents) {
          const directAssigned = directEvents.filter((ev: any) => {
            const isAssigned = (ev.assigned_student_ids || []).includes(userId) || ev.student_id === userId;
            return isAssigned;
          });
          directAssignedEventIds = directAssigned.map((ev: any) => ev.id);
        }

        const eventIds = [...new Set(progPoints.map((pp: any) => pp.event_id))];
        const allEventIds = [...new Set([...eventIds, ...directAssignedEventIds])];

        if (allEventIds.length > 0) {
          // Load the corresponding events
          const { data: eventsData, error: evErr } = await supabase
            .from('campus_events')
            .select('*, room:room_id(name)')
            .in('id', allEventIds);

          if (!evErr && eventsData) {
            allSchoolCampusEvents = eventsData;

            // For each event, load all its program points to compute timeline start times
            const { data: allEventPoints, error: aepErr } = await supabase
              .from('campus_event_program_points')
              .select('*')
              .in('event_id', allEventIds)
              .or('is_scheduled.eq.true,is_pause.eq.true')
              .eq('status', 'approved');

            const defaultTransitionTime = 10;

            campusEvents = eventsData.map((ev: any) => {
              const pointsForEvent = (allEventPoints || []).filter((p: any) => p.event_id === ev.id);
              
              // Sort by stage, then sort_order
              const sortedPoints = pointsForEvent.sort((a: any, b: any) => {
                const stageA = a.stage_number || 1;
                const stageB = b.stage_number || 1;
                if (stageA !== stageB) return stageA - stageB;
                return a.sort_order - b.sort_order;
              });

              // Calculate start times
              const startMin = parseTimeToMinutes(ev.event_start_time || ev.start_time || '14:00');
              const timeMap: Record<string, { start: string; end: string }> = {};
              
              const stages: Record<number, any[]> = {};
              sortedPoints.forEach((p: any) => {
                const stage = p.stage_number || 1;
                if (!stages[stage]) stages[stage] = [];
                stages[stage].push(p);
              });

              Object.keys(stages).forEach((stageStr) => {
                const stNum = parseInt(stageStr, 10);
                const stPoints = stages[stNum];
                let currentMin = startMin;
                stPoints.forEach((p: any, idx: number) => {
                  const duration = p.duration || 0;
                  if (idx > 0 && !p.is_pause && !stPoints[idx - 1].is_pause) {
                    currentMin += defaultTransitionTime;
                  }
                  timeMap[p.id] = {
                    start: formatMinutesToTime(currentMin),
                    end: formatMinutesToTime(currentMin + duration)
                  };
                  currentMin += duration;
                });
              });

              // Find points in this event for the current user
              const userPointsInEvent = progPoints.filter((p: any) => p.event_id === ev.id);
              
              const performanceNotes = userPointsInEvent.map((p: any) => {
                const time = timeMap[p.id] ? `${timeMap[p.id].start} - ${timeMap[p.id].end}` : 'unbekannt';
                return `Auftrittszeit: ${time} Uhr (Bühne ${p.stage_number || 1}) - Beitrag: ${p.name}`;
              }).join('\n');

              const isDirectlyAssigned = (ev.assigned_student_ids || []).includes(userId) || ev.student_id === userId;
              let newDesc = ev.description || '';
              if (performanceNotes) {
                newDesc = `${newDesc}\n\n--- MEINE AUFTRITTE ---\n${performanceNotes}`.trim();
              } else if (isDirectlyAssigned) {
                newDesc = `${newDesc}\n\n--- MEINE TEILNAHME ---\nDu bist als Teilnehmer bei diesem Event eingetragen.`.trim();
              }

              return {
                ...ev,
                description: newDesc
              };
            });
          }
        }
      } else {
        // Only admins/secretaries get campus events normally
        const { data: campusData, error: campusErr } = await supabase
          .from('campus_events')
          .select('*, room:room_id(name)')
          .eq('school_id', schoolId)
          .gte('event_date', pastBoundaryStr)
          .lte('event_date', futureBoundaryStr);

        if (!campusErr && campusData) {
          allSchoolCampusEvents = campusData;
          campusEvents = [...campusData];
        }
      }
    }

    // 6. Query and fetch school's subscribed external iCal feed if exists (skipped for teachers)
    let subscribedEvents: any[] = [];
    if (schoolId && role !== 'teacher' && role !== 'student') {
      const { data: schoolData } = await supabase
        .from('schools')
        .select('calendar_url')
        .eq('id', schoolId)
        .maybeSingle();

      if (schoolData?.calendar_url) {
        try {
          const res = await fetch(schoolData.calendar_url);
          if (res.ok) {
            const icsText = await res.text();
            const rawSubscribed = parseICS(icsText);

            const mappedEvents = rawSubscribed.map((ev: any, index: number) => {
              const title = ev.summary || 'Abonnierter Termin';
              const isHoliday = title.toLowerCase().includes('ferien') || title.toLowerCase().includes('feiertag') || title.toLowerCase().includes('schulfrei');
              
              const isAllDay = (ev.rawStart && !ev.rawStart.includes('T')) || (ev.rawEnd && !ev.rawEnd.includes('T'));
              let end = ev.dtend ? ev.dtend : ev.dtstart;
              if (ev.dtend && isAllDay) {
                const newEnd = new Date(end.getTime());
                newEnd.setDate(newEnd.getDate() - 1);
                end = newEnd;
              }
              const toYYYYMMDD = (d: Date) => {
                const y = isAllDay ? d.getFullYear() : d.getUTCFullYear();
                const m = String((isAllDay ? d.getMonth() : d.getUTCMonth()) + 1).padStart(2, '0');
                const day = String(isAllDay ? d.getDate() : d.getUTCDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
              };
              return {
                id: `subscribed-${index}`,
                title: title,
                description: ev.description || '',
                event_date: ev.dtstart ? toYYYYMMDD(ev.dtstart) : '',
                event_end_date: toYYYYMMDD(end),
                start_time: ev.dtstart ? (isAllDay ? '00:00' : ev.dtstart.toTimeString().substring(0, 5)) : '00:00',
                category: isHoliday ? 'Ferien' : 'Schultermin',
                is_subscribed: true,
                rawStart: ev.rawStart,
                rawEnd: ev.rawEnd
              };
            });

            // Filter out external events that are outside our school year date range, or have customized overrides
            subscribedEvents = mappedEvents.filter((sub: any) => {
              if (!sub.event_date || sub.event_date < pastBoundaryStr || sub.event_date > futureBoundaryStr) {
                return false;
              }
              const hasCustomCopy = allSchoolCampusEvents.some((c: any) => 
                c.visibility !== 'private' &&
                normalizeTitle(c.title) === normalizeTitle(sub.title) && 
                c.event_date === sub.event_date && 
                normalizeTime(c.start_time) === normalizeTime(sub.start_time)
              );
              return !hasCustomCopy;
            });
          }
        } catch (fetchErr) {
          console.error('Failed to fetch school calendar_url in Edge Function:', fetchErr);
        }
      }
    }

    // 7. Generate RFC 5545 iCalendar data stream
    const calendarName = `Campus & Unterricht (${first_name} ${last_name})`
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Groovelab//Campus Calendar//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${calendarName}`,
      'X-PUBLISHED-TTL:PT1H',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
      'X-WR-TIMEZONE:Europe/Berlin',
      'BEGIN:VTIMEZONE',
      'TZID:Europe/Berlin',
      'BEGIN:DAYLIGHT',
      'TZOFFSETFROM:+0100',
      'TZOFFSETTO:+0200',
      'TZNAME:CEST',
      'DTSTART:19700329T020000',
      'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
      'END:DAYLIGHT',
      'BEGIN:STANDARD',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0100',
      'TZNAME:CET',
      'DTSTART:19701025T030000',
      'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
      'END:STANDARD',
      'END:VTIMEZONE'
    ]

    const formatIcalDate = (d: Date) => {
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const r = String(d.getUTCDate()).padStart(2, '0')
      const h = String(d.getUTCHours()).padStart(2, '0')
      const n = String(d.getUTCMinutes()).padStart(2, '0')
      const s = String(d.getUTCSeconds()).padStart(2, '0')
      return `${y}${m}${r}T${h}${n}${s}`
    }

    const stampStr = formatIcalDate(new Date())

    // Helper to format ISO Date to YYYYMMDD for all-day events
    const formatAllDayDate = (dateStr: string) => {
      return dateStr.replace(/-/g, '');
    }

    // Helper to format timezone-safe local dates
    const getLocalIcalDate = (dateStr: string, timeStr: string) => {
      const cleanDate = dateStr.replace(/-/g, '')
      const cleanTime = timeStr.substring(0, 5).replace(/:/g, '') + '00'
      return `${cleanDate}T${cleanTime}`
    }

    const getEndLocalIcalDate = (dateStr: string, timeStr: string, duration: number) => {
      const [yr, mon, dy] = dateStr.split('-').map(Number)
      const [hr, min] = timeStr.split(':').map(Number)
      const dt = new Date(Date.UTC(yr, mon - 1, dy, hr, min, 0))
      const endDt = new Date(dt.getTime() + duration * 60 * 1000)
      const y = endDt.getUTCFullYear()
      const m = String(endDt.getUTCMonth() + 1).padStart(2, '0')
      const r = String(endDt.getUTCDate()).padStart(2, '0')
      const h = String(endDt.getUTCHours()).padStart(2, '0')
      const n = String(endDt.getUTCMinutes()).padStart(2, '0')
      const s = String(endDt.getUTCSeconds()).padStart(2, '0')
      return `${y}${m}${r}T${h}${n}${s}`
    }

    // 7a. Write Unterrichtstermine (Lessons)
    for (const occ of allMergedOccurrences) {
      const dtStartStr = getLocalIcalDate(occ.date, occ.start_time)
      const dtEndStr = getEndLocalIcalDate(occ.date, occ.start_time, occ.duration || 45)

      const isCanceled = ['cancelled', 'teacher_sick', 'canceled_by_student', 'canceled_by_teacher_sick'].includes(occ.status)
      const statusText = isCanceled ? 'CANCELLED' : 'CONFIRMED'

      const teacherName = occ.teacher ? `${occ.teacher.first_name} ${occ.teacher.last_name}` : 'Lehrkraft'
      
      // Privacy-safe student name: Vorname + Initiale des Nachnamens
      const studentFirstName = occ.student?.first_name || 'Schüler'
      const studentLastName = occ.student?.last_name || ''
      const studentInitial = studentLastName ? ` ${studentLastName[0].toUpperCase()}.` : ''
      const studentName = `${studentFirstName}${studentInitial}`

      const instrumentSuffix = (occ.student && occ.student.instrument) ? ` (${occ.student.instrument})` : ''

      // Build summary title according to status and role
      const prefix = occ.status === 'pending_reschedule'
        ? '🔄 ÄNDERUNG ANGEFRAGT: '
        : occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick'
        ? '🤒 AUSFALL: '
        : isCanceled
        ? '❌ ABGESAGT: '
        : '🎵 '

      let summary = ''
      if (role === 'student') {
        summary = `${prefix}Unterricht bei ${teacherName}`
      } else {
        summary = `${prefix}Unterricht: ${studentName}${instrumentSuffix}`
      }

      // Build structured DESCRIPTION
      let statusDesc = 'Bestätigt 📅'
      if (occ.status === 'pending_reschedule') {
        statusDesc = 'Verschiebung angefragt 🔄'
      } else if (occ.status === 'teacher_sick' || occ.status === 'canceled_by_teacher_sick') {
        statusDesc = 'Ausfall (Lehrer krank) 🤒'
      } else if (isCanceled) {
        statusDesc = 'Abgesagt ❌'
      }

      let descriptionLines = []
      descriptionLines.push(`Status: ${statusDesc}`)
      descriptionLines.push(`Partner: ${role === 'student' ? teacherName : studentName}`)
      if (occ.student && occ.student.instrument) {
        descriptionLines.push(`Instrument: ${occ.student.instrument}`)
      }
      descriptionLines.push(`Raum: ${occ.room_name}`)
      if (occ.duration) {
        descriptionLines.push(`Dauer: ${occ.duration} Minuten`)
      }
      descriptionLines.push('Plattform: Campus-Groovelab')
      descriptionLines.push('Direktlink: https://app.campus-groovelab.de/campus/homework')
      
      const description = descriptionLines.join('\n')

      // Check color (Ensembles / Bands = Blue, regular Unterricht = Green)
      const isBandOrEnsemble = 
        studentName.toLowerCase().includes('band') || 
        studentName.toLowerCase().includes('ensemble') || 
        instrumentSuffix.toLowerCase().includes('band') || 
        instrumentSuffix.toLowerCase().includes('ensemble') || 
        occ.room_name.toLowerCase().includes('band') || 
        occ.room_name.toLowerCase().includes('ensemble') || 
        occ.room_name.toLowerCase().includes('groovelab');

      const color = isBandOrEnsemble ? '#1a73e8' : '#137333';

      icsContent.push('BEGIN:VEVENT')
      icsContent.push(`UID:${occ.id}@groovelab.de`)
      icsContent.push(`DTSTAMP:${stampStr}Z`)
      icsContent.push(`DTSTART;TZID=Europe/Berlin:${dtStartStr}`)
      icsContent.push(`DTEND;TZID=Europe/Berlin:${dtEndStr}`)
      icsContent.push(`SUMMARY:${escapeText(summary)}`)
      icsContent.push(`DESCRIPTION:${escapeText(description)}`)
      icsContent.push(`LOCATION:${escapeText(occ.room_name)}`)
      icsContent.push(`STATUS:${statusText}`)
      icsContent.push(`COLOR:${color}`)

      if (!isCanceled) {
        const valarmDateStr = occ.date.replace(/-/g, '')
        icsContent.push('BEGIN:VALARM')
        icsContent.push('ACTION:DISPLAY')
        icsContent.push(`TRIGGER;VALUE=DATE-TIME;TZID=Europe/Berlin:${valarmDateStr}T080000`)
        icsContent.push(`DESCRIPTION:Erinnerung: Heute ist dein Unterrichtstermin!`)
        icsContent.push('END:VALARM')

        icsContent.push('BEGIN:VALARM')
        icsContent.push('ACTION:DISPLAY')
        icsContent.push('TRIGGER:-PT30M')
        icsContent.push(`DESCRIPTION:Erinnerung: Dein Unterrichtstermin beginnt in 30 Minuten.`)
        icsContent.push('END:VALARM')
      }

      icsContent.push('END:VEVENT')
    }

    // 7b. Write Custom Campus-Termine (from database) - ALWAYS as all-day events
    for (const ev of campusEvents) {
      const locName = ev.room?.name || ev.location_extern || 'Musikschule';

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${ev.id}@groovelab.de`);
      icsContent.push(`DTSTAMP:${stampStr}Z`);

      const startDayStr = formatAllDayDate(ev.event_date);
      let endDayStr = startDayStr;
      
      const endField = ev.event_end_date || ev.event_date;
      const [ey, em, ed] = endField.split('-').map(Number);
      const endDate = new Date(Date.UTC(ey, em - 1, ed));
      endDate.setUTCDate(endDate.getUTCDate() + 1); // DTEND is exclusive for DATE values
      const yStr = endDate.getUTCFullYear();
      const mStr = String(endDate.getUTCMonth() + 1).padStart(2, '0');
      const dStr = String(endDate.getUTCDate()).padStart(2, '0');
      endDayStr = `${yStr}${mStr}${dStr}`;

      icsContent.push(`DTSTART;VALUE=DATE:${startDayStr}`);
      icsContent.push(`DTEND;VALUE=DATE:${endDayStr}`);

      icsContent.push(`SUMMARY:${escapeText(ev.title)}`);
      icsContent.push(`DESCRIPTION:${escapeText(ev.description || '')}`);
      icsContent.push(`LOCATION:${escapeText(locName)}`);
      icsContent.push('STATUS:CONFIRMED');

      // Colors for campus events
      let color = '#e37400'; // Default orange
      const catLower = (ev.category || '').toLowerCase();
      if (catLower.includes('ferien') || catLower.includes('feiertag')) {
        color = '#8f9099';
      } else if (catLower.includes('planung')) {
        color = '#a062ff';
      } else if (catLower.includes('band') || catLower.includes('ensemble')) {
        color = '#1a73e8';
      }
      icsContent.push(`COLOR:${color}`);

      icsContent.push('END:VEVENT');
    }

    // 7c. Write Subscribed External Calendar Events - ALWAYS as all-day events
    for (const ev of subscribedEvents) {
      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:ext-${ev.id}@groovelab.de`);
      icsContent.push(`DTSTAMP:${stampStr}Z`);

      const startDayStr = formatAllDayDate(ev.event_date);
      let endDayStr = startDayStr;
      
      const endField = ev.event_end_date || ev.event_date;
      const [ey, em, ed] = endField.split('-').map(Number);
      const endDate = new Date(Date.UTC(ey, em - 1, ed));
      endDate.setUTCDate(endDate.getUTCDate() + 1); // DTEND is exclusive for DATE values
      const yStr = endDate.getUTCFullYear();
      const mStr = String(endDate.getUTCMonth() + 1).padStart(2, '0');
      const dStr = String(endDate.getUTCDate()).padStart(2, '0');
      endDayStr = `${yStr}${mStr}${dStr}`;

      icsContent.push(`DTSTART;VALUE=DATE:${startDayStr}`);
      icsContent.push(`DTEND;VALUE=DATE:${endDayStr}`);

      icsContent.push(`SUMMARY:${escapeText(ev.title)}`);
      icsContent.push(`DESCRIPTION:${escapeText(ev.description || '')}`);
      icsContent.push(`LOCATION:${escapeText(ev.location || 'Musikschule')}`);
      icsContent.push('STATUS:CONFIRMED');

      // Subscribed external event colors
      let color = '#e37400';
      const catLower = (ev.category || '').toLowerCase();
      if (catLower.includes('ferien') || catLower.includes('feiertag')) {
        color = '#8f9099';
      }
      icsContent.push(`COLOR:${color}`);

      icsContent.push('END:VEVENT');
    }

    icsContent.push('END:VCALENDAR')

    const icsBody = icsContent.join('\r\n')

    return new Response(icsBody, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="groovelab-unterricht.ics"`,
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Unhandled calendar generation error:', error)
    return new Response(
      JSON.stringify({ error: 'Server failed to process calendar generation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
