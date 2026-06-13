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
    let userQuery = supabase.from('users').select('id, first_name, last_name, role');
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

    const { id: userId, role, first_name, last_name } = user

    // 2. Load standard recurring schedules for the user
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

    // 3. Load overrides/occurrences
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
    // Standard school year timeline: Sept 1st to July 31st (excluding August)
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
          const currentDay = current.getDay() || 7 // Sunday maps to 7
          const diff = sch.day_of_week - currentDay
          const targetDate = new Date(current)
          targetDate.setDate(current.getDate() + diff)

          // Filter out dates outside the school year boundaries, and exclude August (month index 7)
          if (targetDate >= schoolYearStart && targetDate <= schoolYearEnd && targetDate.getMonth() !== 7) {
            const dateStr = targetDate.toISOString().substring(0, 10)

            // Look for matching manual occurrences/overrides
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

    // Add remaining manual occurrences not tied to virtual projections
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

    // Sort chronologically
    allMergedOccurrences.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return (a.start_time || '').localeCompare(b.start_time || '')
    })

    // 5. Generate RFC 5545 iCalendar data stream
    const calendarName = `Unterricht (${first_name} ${last_name})`
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Groovelab//Campus Calendar//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${calendarName}`,
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

    for (const occ of allMergedOccurrences) {
      const [yr, mon, dy] = occ.date.split('-').map(Number)
      const [hr, min] = occ.start_time.split(':').map(Number)
      
      // Construct start/end dates in UTC using local hour mapping to match VTIMEZONE context
      const startDt = new Date(Date.UTC(yr, mon - 1, dy, hr, min, 0))
      const endDt = new Date(startDt.getTime() + (occ.duration || 45) * 60 * 1000)

      const dtStartStr = formatIcalDate(startDt)
      const dtEndStr = formatIcalDate(endDt)

      const isCanceled = ['cancelled', 'teacher_sick', 'canceled_by_student', 'canceled_by_teacher_sick'].includes(occ.status)
      const statusText = isCanceled ? 'CANCELLED' : 'CONFIRMED'

      const teacherName = occ.teacher ? `${occ.teacher.first_name} ${occ.teacher.last_name}` : 'Lehrkraft'
      const studentInitials = occ.student ? getInitials(occ.student.first_name, occ.student.last_name) : 'Schüler'

      // Set elegant, customized calendar titles depending on whether user is student or teacher
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

      // Add detailed description for convenient smartphone viewing
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

      // Add alarms/reminders for active events
      if (!isCanceled) {
        const valarmDateStr = occ.date.replace(/-/g, '')
        // Alarm 1: 08:00 AM morning check
        icsContent.push('BEGIN:VALARM')
        icsContent.push('ACTION:DISPLAY')
        icsContent.push(`TRIGGER;VALUE=DATE-TIME;TZID=Europe/Berlin:${valarmDateStr}T080000`)
        icsContent.push(`DESCRIPTION:Erinnerung: Heute ist dein Unterrichtstermin!`)
        icsContent.push('END:VALARM')

        // Alarm 2: 30 minutes transition warning
        icsContent.push('BEGIN:VALARM')
        icsContent.push('ACTION:DISPLAY')
        icsContent.push('TRIGGER:-PT30M')
        icsContent.push(`DESCRIPTION:Erinnerung: Dein Unterrichtstermin beginnt in 30 Minuten.`)
        icsContent.push('END:VALARM')
      }

      icsContent.push('END:VEVENT')
    }

    icsContent.push('END:VCALENDAR')

    const icsBody = icsContent.join('\r\n')

    // Serve raw .ics calendar feed with dynamic attachments
    return new Response(icsBody, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="groovelab-unterricht.ics"`,
        'Cache-Control': 'public, max-age=600' // cache for 10 minutes to protect DB while keeping it dynamic
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
