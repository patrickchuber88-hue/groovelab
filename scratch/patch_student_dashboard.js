const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../apps/groovelab/src/components/StudentAvatarDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. activeTab localStorage
content = content.replace(
  "  const [activeTab, setActiveTab] = useState<'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup' | 'profile' | 'all_appointments' | 'lehrwerke' | 'flashback' | 'events' | 'mediathek'>(() => {",
  "  const [activeTab, setActiveTab] = useState<'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup' | 'profile' | 'all_appointments' | 'lehrwerke' | 'flashback' | 'events' | 'mediathek'>(() => {\n    const saved = localStorage.getItem('studentDashboardActiveTab');\n    if (saved && !parentActiveTab) return saved as any;"
);

content = content.replace(
  "  const handleTabChangeLocal = (tab: 'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup' | 'profile' | 'all_appointments' | 'lehrwerke' | 'flashback' | 'events' | 'mediathek') => {\n    setActiveTab(tab);\n    if (onTabChange) {\n      onTabChange(tab);\n    }\n  };",
  "  const handleTabChangeLocal = (tab: 'briefing' | 'hero' | 'songs' | 'practice_board' | 'campus_cup' | 'profile' | 'all_appointments' | 'lehrwerke' | 'flashback' | 'events' | 'mediathek') => {\n    setActiveTab(tab);\n    localStorage.setItem('studentDashboardActiveTab', tab);\n    if (onTabChange) {\n      onTabChange(tab);\n    }\n  };"
);

// 2. Add scheduleOccurrences to state
content = content.replace(
  "  const [schedules, setSchedules] = useState<any[]>([]);",
  "  const [schedules, setSchedules] = useState<any[]>([]);\n  const [scheduleOccurrences, setScheduleOccurrences] = useState<any[]>([]);"
);

// 3. fetch scheduleOccurrences
content = content.replace(
  "      const statsPromise = (async () => {",
  "      const occPromise = (async () => {\n        try {\n          const todayStr = new Date().toISOString().split('T')[0];\n          const res = await supabase\n            .from('schedule_occurrences')\n            .select('*, teacher:users!schedule_occurrences_teacher_id_fkey(first_name, last_name)')\n            .eq('student_id', studentId)\n            .gte('date', todayStr);\n          return res;\n        } catch (e) {\n          return { data: [], error: null };\n        }\n      })();\n\n      const statsPromise = (async () => {"
);

content = content.replace(
  "      const [userData, avatarData, schedulesData, statsData] = await Promise.all([",
  "      const [userData, avatarData, schedulesData, statsData, occData] = await Promise.all(["
);

content = content.replace(
  "        userPromise, avatarPromise, schedsPromise, statsPromise",
  "        userPromise, avatarPromise, schedsPromise, statsPromise, occPromise"
);

content = content.replace(
  "      setSchedules(schedulesData.data || []);",
  "      setSchedules(schedulesData.data || []);\n      setScheduleOccurrences(occData.data || []);"
);

// 4. Update getNextOccurrences
content = content.replace(
  "  const getNextOccurrences = (schedules: any[]) => {",
  "  const getNextOccurrences = (schedules: any[], scheduleOccurrences: any[] = []) => {"
);

const getNextOccurrencesReplacement = `    const occurrences: any[] = [];
    const today = new Date();
    
    // Process occurrences from schedules
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      const rawDay = targetDate.getDay();
      const targetWeekday = rawDay === 0 ? 7 : rawDay;

      const matchingSchedules = schedules.filter(s => s.day_of_week === targetWeekday);
      matchingSchedules.forEach(sched => {
        const targetDateStr = \`\${targetDate.getFullYear()}-\${String(targetDate.getMonth() + 1).padStart(2, '0')}-\${String(targetDate.getDate()).padStart(2, '0')}\`;
        
        // Skip if this schedule occurrence has an override in scheduleOccurrences
        const hasOverride = scheduleOccurrences.some(occ => occ.schedule_id === sched.id && (occ.original_date === targetDateStr || occ.date === targetDateStr));
        if (hasOverride) return;

        const exception = (sched.schedule_exceptions || []).find((ex: any) => ex.exception_date === targetDateStr);
        const effectiveStatus = exception ? exception.status : sched.status;

        if (dayOffset === 0) {
          const [hour, min] = (sched.time_slot || '00:00').split(':').map(Number);
          const schedTime = new Date(today);
          schedTime.setHours(hour, min, 0, 0);
          if (schedTime.getTime() < today.getTime()) {
            return;
          }
        }

        const weekdayNames = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
        const hasRoomChanged = !!sched.room_changed || !!sched.is_room_changed || (effectiveStatus === 'room_changed');
        occurrences.push({
          id: \`\${sched.id}-\${targetDate.getDate()}\`,
          schedule_id: sched.id,
          date: new Date(targetDate),
          dateStr: targetDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          weekday: weekdayNames[targetWeekday],
          time: (sched.time_slot || '').substring(0, 5),
          room: sched.rooms?.name || 'Raum 102',
          room_changed: hasRoomChanged,
          teacher: sched.teacher ? \`\${sched.teacher.first_name} \${sched.teacher.last_name}\` : 'Lehrkraft',
          status: effectiveStatus
        });
      });
    }

    // Process explicit overrides from scheduleOccurrences
    const weekdayNames = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    scheduleOccurrences.forEach(occ => {
      const occDate = new Date(occ.date);
      // Skip if past today
      if (occDate.getTime() < new Date(today.setHours(0,0,0,0)).getTime()) return;
      
      if (occDate.getTime() === new Date(today.setHours(0,0,0,0)).getTime()) {
        const [hour, min] = (occ.start_time || '00:00').split(':').map(Number);
        const schedTime = new Date(today);
        schedTime.setHours(hour, min, 0, 0);
        if (schedTime.getTime() < new Date().getTime()) {
          return;
        }
      }

      occurrences.push({
        id: occ.id,
        schedule_id: occ.schedule_id,
        date: occDate,
        dateStr: occDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        weekday: weekdayNames[occDate.getDay() || 7],
        time: (occ.start_time || '').substring(0, 5),
        room: 'Raum', // Room might be derived if needed
        room_changed: true, // Mark as changed so user knows
        teacher: occ.teacher ? \`\${occ.teacher.first_name} \${occ.teacher.last_name}\` : 'Lehrkraft',
        status: occ.status
      });
    });

    occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
    return occurrences.slice(0, 6);
  };`;

// We replace the body of getNextOccurrences
content = content.replace(/    const occurrences: any\[\] = \[\];[\s\S]*?return occurrences.slice\(0, 6\);\n  \};/m, getNextOccurrencesReplacement);

// 5. Update call site
content = content.replace(
  "  const upcomingLessons = getNextOccurrences(schedules);",
  "  const upcomingLessons = getNextOccurrences(schedules, scheduleOccurrences);"
);

fs.writeFileSync(file, content);
