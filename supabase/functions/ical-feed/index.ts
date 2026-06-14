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

    // 2. Load standard recurring schedules for the user (Unterrichtstermine)
    let scheduleQuery = supabase
      .from('schedules')
      .select(`
        *,
        teacher:teacher_id(first_name, last_name),
        student:student_id(first_name, last_name),
        room:room_id(name)
      `)

    if (role === 'student') {
      scheduleQuery = scheduleQuery.eq('student_id', userId)
    } else {
      scheduleQuery = scheduleQuery.eq('teacher_id', userId)
    }

    const { data: schedules, error: schErr } = await scheduleQuery
    if (schErr) throw schErr

    // 3. Load overrides/occurrences (Unterrichtstermine Abweichungen)
    let occurrenceQuery = supabase
      .from('schedule_occurrences')
      .select(`
        *,
        teacher:teacher_id(first_name, last_name),
        student:student_id(first_name, last_name)
      `)

    if (role === 'student') {
      occurrenceQuery = occurrenceQuery.eq('student_id', userId)
    } else {
      occurrenceQuery = occurrenceQuery.eq('teacher_id', userId)
    }

    const { data: occurrences, error: occErr } = await occurrenceQuery
    if (occErr) throw occErr

    // 4. Merge regular weekly schedules and occurrences into actual calendar dates
    const now = new Date()
    const schoolStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
    const schoolYearStart = new Date(`${schoolStartYear}-09-01`)
    const schoolYearEnd = new Date(`${schoolStartYear + 1}-07-31`)

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
            const dateStr = targetDate.toISOString().substring(0, 10)

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

    // 5. Query and load Campus-Termine for the user's school
    let campusEvents: any[] = [];
    if (schoolId) {
      const { data: campusData, error: campusErr } = await supabase
        .from('campus_events')
        .select('*, room:room_id(name)')
        .eq('school_id', schoolId);

      if (!campusErr && campusData) {
        campusEvents = campusData;
        // Filter based on roles and visibility settings
        if (role === 'student') {
          campusEvents = campusEvents.filter((ev: any) => {
            const isAssigned = (ev.assigned_student_ids || []).includes(userId) || ev.student_id === userId;
            return ev.created_by === userId || ev.is_public || ev.visibility === 'all' || ev.visibility === 'students' || isAssigned;
          });
        } else if (role === 'teacher') {
          campusEvents = campusEvents.filter((ev: any) => {
            return ev.created_by === userId || ev.is_public || ev.visibility === 'all' || ev.visibility === 'teachers' || ev.visibility === 'students';
          });
        }
        // Admins and Secretaries can see all events
      }
    }

    // 6. Query and fetch school's subscribed external iCal feed if exists
    let subscribedEvents: any[] = [];
    if (schoolId) {
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

            subscribedEvents = rawSubscribed.map((ev: any, index: number) => {
              const title = ev.summary || 'Abonnierter Termin';
              const isHoliday = title.toLowerCase().includes('ferien') || title.toLowerCase().includes('feiertag') || title.toLowerCase().includes('schulfrei');
              let end = ev.dtend ? new Date(ev.dtend) : new Date(ev.dtstart);
              const isAllDay = ev.rawEnd && !ev.rawEnd.includes('T');
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
                is_subscribed: true,
                rawStart: ev.rawStart,
                rawEnd: ev.rawEnd
              };
            });

            // Filter out external events that have customized overrides in the database
            subscribedEvents = subscribedEvents.filter((sub: any) => {
              const hasCustomCopy = campusEvents.some((c: any) => 
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

    // 7a. Write Unterrichtstermine (Lessons)
    for (const occ of allMergedOccurrences) {
      const [yr, mon, dy] = occ.date.split('-').map(Number)
      const [hr, min] = occ.start_time.split(':').map(Number)
      
      const startDt = new Date(Date.UTC(yr, mon - 1, dy, hr, min, 0))
      const endDt = new Date(startDt.getTime() + (occ.duration || 45) * 60 * 1000)

      const dtStartStr = formatIcalDate(startDt)
      const dtEndStr = formatIcalDate(endDt)

      const isCanceled = ['cancelled', 'teacher_sick', 'canceled_by_student', 'canceled_by_teacher_sick'].includes(occ.status)
      const statusText = isCanceled ? 'CANCELLED' : 'CONFIRMED'

      const teacherName = occ.teacher ? `${occ.teacher.first_name} ${occ.teacher.last_name}` : 'Lehrkraft'
      const studentInitials = occ.student ? getInitials(occ.student.first_name, occ.student.last_name) : 'Schüler'

      let summary = ''
      if (role === 'student') {
        summary = isCanceled 
          ? `❌ ABSAGE: ${studentInitials} - Unterricht bei ${teacherName}`
          : `🎵 ${studentInitials} - Unterricht bei ${teacherName}`
      } else {
        summary = isCanceled
          ? `❌ ABSAGE: Unterricht mit ${studentInitials}`
          : `🎵 Unterricht mit ${studentInitials}`
      }

      let descriptionLines = []
      descriptionLines.push(`Status: ${isCanceled ? 'Abgesagt ❌' : 'Bestätigt 📅'}`)
      descriptionLines.push(`Schüler: ${studentInitials}`)
      descriptionLines.push(`Lehrer: ${teacherName}`)
      descriptionLines.push(`Raum: ${occ.room_name}`)
      if (occ.duration) descriptionLines.push(`Dauer: ${occ.duration} Minuten`)
      
      const description = descriptionLines.join('\n')

      icsContent.push('BEGIN:VEVENT')
      icsContent.push(`UID:${occ.id}@groovelab.de`)
      icsContent.push(`DTSTAMP:${stampStr}Z`)
      icsContent.push(`DTSTART;TZID=Europe/Berlin:${dtStartStr}`)
      icsContent.push(`DTEND;TZID=Europe/Berlin:${dtEndStr}`)
      icsContent.push(`SUMMARY:${escapeText(summary)}`)
      icsContent.push(`DESCRIPTION:${escapeText(description)}`)
      icsContent.push(`LOCATION:${escapeText(occ.room_name)}`)
      icsContent.push(`STATUS:${statusText}`)

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

    // 7b. Write Custom Campus-Termine (from database)
    for (const ev of campusEvents) {
      const isHoliday = ev.category === 'Ferien' || ev.category === 'Feiertag';
      const locName = ev.room?.name || ev.location_extern || 'Musikschule';

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:${ev.id}@groovelab.de`);
      icsContent.push(`DTSTAMP:${stampStr}Z`);

      if (isHoliday) {
        // All day event formatting
        const startDayStr = formatAllDayDate(ev.event_date);
        let endDayStr = startDayStr;
        if (ev.event_end_date) {
          const endDate = new Date(ev.event_end_date);
          endDate.setDate(endDate.getDate() + 1); // DTEND is exclusive for DATE values
          const y = endDate.getFullYear();
          const m = String(endDate.getMonth() + 1).padStart(2, '0');
          const d = String(endDate.getDate()).padStart(2, '0');
          endDayStr = `${y}${m}${d}`;
        } else {
          // Single day holiday
          const startDate = new Date(ev.event_date);
          startDate.setDate(startDate.getDate() + 1);
          const y = startDate.getFullYear();
          const m = String(startDate.getMonth() + 1).padStart(2, '0');
          const d = String(startDate.getDate()).padStart(2, '0');
          endDayStr = `${y}${m}${d}`;
        }
        icsContent.push(`DTSTART;VALUE=DATE:${startDayStr}`);
        icsContent.push(`DTEND;VALUE=DATE:${endDayStr}`);
      } else {
        // Timed event formatting
        const [yr, mon, dy] = ev.event_date.split('-').map(Number);
        const [hr, min] = (ev.start_time || '00:00').split(':').map(Number);
        const startDt = new Date(Date.UTC(yr, mon - 1, dy, hr, min, 0));
        
        let endDt = new Date(startDt.getTime() + 60 * 60 * 1000); // Default 1 hour duration
        if (ev.end_time) {
          const [eHr, eMin] = ev.end_time.split(':').map(Number);
          endDt = new Date(Date.UTC(yr, mon - 1, dy, eHr, eMin, 0));
        } else if (ev.event_end_date) {
          const [eYr, eMon, eDy] = ev.event_end_date.split('-').map(Number);
          endDt = new Date(Date.UTC(eYr, eMon - 1, eDy, hr, min, 0));
        }

        icsContent.push(`DTSTART;TZID=Europe/Berlin:${formatIcalDate(startDt)}`);
        icsContent.push(`DTEND;TZID=Europe/Berlin:${formatIcalDate(endDt)}`);
      }

      icsContent.push(`SUMMARY:${escapeText(ev.title)}`);
      icsContent.push(`DESCRIPTION:${escapeText(ev.description || '')}`);
      icsContent.push(`LOCATION:${escapeText(locName)}`);
      icsContent.push('STATUS:CONFIRMED');
      icsContent.push('END:VEVENT');
    }

    // 7c. Write Subscribed External Calendar Events
    for (const ev of subscribedEvents) {
      const isHoliday = ev.category === 'Ferien';
      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:ext-${ev.id}@groovelab.de`);
      icsContent.push(`DTSTAMP:${stampStr}Z`);

      if (isHoliday) {
        const startDayStr = formatAllDayDate(ev.event_date);
        let endDayStr = startDayStr;
        if (ev.event_end_date) {
          const endDate = new Date(ev.event_end_date);
          endDate.setDate(endDate.getDate() + 1);
          const y = endDate.getFullYear();
          const m = String(endDate.getMonth() + 1).padStart(2, '0');
          const d = String(endDate.getDate()).padStart(2, '0');
          endDayStr = `${y}${m}${d}`;
        }
        icsContent.push(`DTSTART;VALUE=DATE:${startDayStr}`);
        icsContent.push(`DTEND;VALUE=DATE:${endDayStr}`);
      } else {
        const [yr, mon, dy] = ev.event_date.split('-').map(Number);
        const [hr, min] = (ev.start_time || '00:00').split(':').map(Number);
        const startDt = new Date(Date.UTC(yr, mon - 1, dy, hr, min, 0));
        
        let endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
        if (ev.event_end_date) {
          const [eYr, eMon, eDy] = ev.event_end_date.split('-').map(Number);
          endDt = new Date(Date.UTC(eYr, eMon - 1, eDy, hr, min, 0));
        }

        icsContent.push(`DTSTART;TZID=Europe/Berlin:${formatIcalDate(startDt)}`);
        icsContent.push(`DTEND;TZID=Europe/Berlin:${formatIcalDate(endDt)}`);
      }

      icsContent.push(`SUMMARY:${escapeText(ev.title)}`);
      icsContent.push(`DESCRIPTION:${escapeText(ev.description || '')}`);
      icsContent.push(`LOCATION:${escapeText(ev.location || 'Musikschule')}`);
      icsContent.push('STATUS:CONFIRMED');
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
