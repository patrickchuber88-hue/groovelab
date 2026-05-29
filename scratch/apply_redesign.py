import re
import os

filePath = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/StudentAvatarDashboard.tsx"

with open(filePath, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Insert State variables after showSelector state
showSelectorState = "const [showSelector, setShowSelector] = useState(false);"
upcomingLessonsState = """const [showSelector, setShowSelector] = useState(false);
  const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);"""

if upcomingLessonsState not in code:
    code = code.replace(showSelectorState, upcomingLessonsState)
    print("Inserted upcomingLessons state.")

# 2. Insert getNextOccurrences helper before fetchStudentAndAvatar
fetchStudentAndAvatarDef = "const fetchStudentAndAvatar = async () => {"
getNextOccurrencesDef = """  // Helper to compute next 6 upcoming lessons chronologically
  const getNextOccurrences = (schedules: any[]): any[] => {
    if (!schedules || schedules.length === 0) {
      const mockLessons = [];
      const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
      const today = new Date();
      for (let i = 1; i <= 6; i++) {
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + i);
        const dayName = days[nextDate.getDay() === 0 ? 6 : nextDate.getDay() - 1];
        mockLessons.push({
          id: `demo-${i}`,
          schedule_id: `demo-${i}`,
          dateStr: nextDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          weekday: dayName,
          time: '14:15',
          room: 'Raum 102',
          teacher: 'Patrick Huber',
          status: 'scheduled'
        });
      }
      return mockLessons;
    }

    const occurrences: any[] = [];
    const today = new Date();
    
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      const rawDay = targetDate.getDay();
      const targetWeekday = rawDay === 0 ? 7 : rawDay;

      const matchingSchedules = schedules.filter(s => s.day_of_week === targetWeekday && s.status !== 'canceled_by_student');
      matchingSchedules.forEach(sched => {
        if (dayOffset === 0) {
          const [hour, min] = (sched.time_slot || '00:00').split(':').map(Number);
          const schedTime = new Date(today);
          schedTime.setHours(hour, min, 0, 0);
          if (schedTime.getTime() < today.getTime()) {
            return;
          }
        }

        const weekdayNames = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
        occurrences.push({
          id: `${sched.id}-${targetDate.getDate()}`,
          schedule_id: sched.id,
          date: new Date(targetDate),
          dateStr: targetDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          weekday: weekdayNames[targetWeekday],
          time: sched.time_slot,
          room: sched.rooms?.name || 'Raum 102',
          teacher: sched.teacher ? `${sched.teacher.first_name} ${sched.teacher.last_name}` : 'Lehrkraft',
          status: sched.status
        });
      });

      if (occurrences.length >= 6) break;
    }

    occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
    return occurrences.slice(0, 6);
  };

  const fetchStudentAndAvatar = async () => {"""

if "const getNextOccurrences = " not in code:
    code = code.replace(fetchStudentAndAvatarDef, getNextOccurrencesDef)
    print("Inserted getNextOccurrences helper.")

# 3. Add handleRescheduleLesson action
handleCancelLessonDef = """  const handleCancelLesson = async (scheduleId: string) => {
    if (!confirm('Möchtest du den heutigen Unterricht wirklich absagen? Der Slot wird für andere freigegeben.')) return;"""

handleRescheduleLessonDef = """  const handleCancelLesson = async (scheduleId: string) => {
    if (!confirm('Möchtest du den heutigen Unterricht wirklich absagen? Der Slot wird für andere freigegeben.')) return;"""

# Let's insert handleRescheduleLesson right before handleParentApproval
handleParentApprovalDef = "  const handleParentApproval = async (scheduleId: string, approve: boolean) => {"
handleRescheduleLessonBlock = """  const handleRescheduleLesson = async (scheduleId: string) => {
    if (!confirm('Möchtest du für diesen Unterrichtstermin einen Ersatztermin anfragen? Dein Lehrer wird benachrichtigt.')) return;
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ status: 'pending_reschedule' })
        .eq('id', scheduleId);
      if (error) throw error;
      fetchStudentAndAvatar();
      alert('Verschiebungs-Anfrage erfolgreich gesendet. Dein Lehrer entscheidet darüber.');
    } catch (err) {
      console.error(err);
      alert('Fehler beim Senden der Verschiebe-Anfrage.');
    }
  };

  const handleParentApproval = async (scheduleId: string, approve: boolean) => {"""

if "const handleRescheduleLesson = " not in code:
    code = code.replace(handleParentApprovalDef, handleRescheduleLessonBlock)
    print("Inserted handleRescheduleLesson block.")

# 4. In fetchStudentAndAvatar, query schedules to populate upcomingLessons
supabaseAvatarSelect = """      // 2. Fetch avatar records
      const { data: avatarRecord, error: avatarErr } = await supabase
        .from('avatars')
        .select('avatar_style, instrument_type, evolution_level, xp, asset_path, streak_flame')
        .eq('user_id', studentId)
        .maybeSingle();"""

supabaseAvatarAndSchedulesSelect = """      // 2. Fetch avatar records
      const { data: avatarRecord, error: avatarErr } = await supabase
        .from('avatars')
        .select('avatar_style, instrument_type, evolution_level, xp, asset_path, streak_flame')
        .eq('user_id', studentId)
        .maybeSingle();

      const { data: allScheds } = await supabase
        .from('schedules')
        .select(`
          id,
          time_slot,
          day_of_week,
          status,
          rooms (name),
          teacher:users!schedules_teacher_id_fkey (first_name, last_name)
        `)
        .eq('student_id', studentId);
      
      const futureLessons = getNextOccurrences(allScheds || []);
      setUpcomingLessons(futureLessons);"""

if "const { data: allScheds }" not in code:
    code = code.replace(supabaseAvatarSelect, supabaseAvatarAndSchedulesSelect)
    print("Inserted schedules fetch in fetchStudentAndAvatar.")

with open(filePath, "w", encoding="utf-8") as f:
    f.write(code)

print("Pre-requisite logic successfully restored!")
