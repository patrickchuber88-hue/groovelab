import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DayConfig {
  start: string;
  end: string;
  start_time?: string;
  end_time?: string;
}

export type TeacherAvailability = Record<string, DayConfig>;

export function useTeacherAvailability(student: any) {
  const [availability, setAvailability] = useState<TeacherAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [teacherName, setTeacherName] = useState<string>('');

  useEffect(() => {
    let active = true;
    let subscription: ReturnType<typeof supabase.channel> | null = null;

    async function fetchAvailability() {
      try {
        setLoading(true);
        let teacherId = student?.teacher_id;
        
        // 1. Determine teacher ID strictly
        if (!teacherId && student?.id) {
          const { data: uRow } = await supabase
            .from('users')
            .select('teacher_id')
            .eq('id', student.id)
            .maybeSingle();
          if (uRow?.teacher_id) teacherId = uRow.teacher_id;
        }

        if (!teacherId && student?.id) {
          const { data: stRow } = await supabase
            .from('students')
            .select('teacher_id')
            .eq('id', student.id)
            .maybeSingle();
          if (stRow?.teacher_id) teacherId = stRow.teacher_id;
        }

        if (!teacherId && student?.id) {
          const { data: pendRow } = await supabase
            .from('pending_students_decrypted')
            .select('teacher_id, created_by')
            .eq('id', student.id)
            .maybeSingle();
          if (pendRow?.teacher_id) teacherId = pendRow.teacher_id;
          else if (pendRow?.created_by) teacherId = pendRow.created_by;
        }

        // 2. Check schedules table
        if (!teacherId && student?.id) {
          const { data: schedRow } = await supabase
            .from('schedules')
            .select('teacher_id')
            .eq('student_id', student.id)
            .not('teacher_id', 'is', null)
            .limit(1)
            .maybeSingle();
          
          if (schedRow?.teacher_id) {
            teacherId = schedRow.teacher_id;
          }
        }

        // 2b. Try logged-in user in localStorage / session (safe fallback for teachers viewing their own students)
        if (!teacherId) {
          try {
            const cachedUser = JSON.parse(sessionStorage.getItem('groovelab_cached_user') || '{}');
            if (cachedUser?.id) {
              teacherId = cachedUser.id;
            }
          } catch (e) {}
        }
        
        if (!teacherId) {
          try {
            const uid = sessionStorage.getItem('groovelab_user_id');
            if (uid) teacherId = uid;
          } catch (e) {}
        }

        if (!teacherId) {
          try {
            const { data: sessData } = await supabase.auth.getSession();
            if (sessData?.session?.user?.id) {
              teacherId = sessData.session.user.id;
            }
          } catch (e) {}
        }

        // If no strict teacherId found, we abort to prevent data leaks.
        if (!teacherId) {
          if (active) {
            setAvailability(null);
            setLoading(false);
          }
          return;
        }

        // 3. Fetch specific teacher row (might return null if blocked by RLS for students)
        console.log("useTeacherAvailability: Resolving for teacherId =", teacherId, "studentId =", student?.id);
        let teacherRow: any = null;
        try {
          const { data } = await supabase
            .from('users')
            .select('id, first_name, last_name, teacher_availability')
            .eq('id', teacherId)
            .maybeSingle();
          teacherRow = data;
        } catch (e) {
          console.warn("useTeacherAvailability: RLS or query block fetching teacherRow:", e);
        }

        if (teacherRow && active) {
          const name = `${teacherRow.first_name || ''} ${teacherRow.last_name || ''}`.trim();
          setTeacherName(name);
          console.log("useTeacherAvailability: teacherRow found:", teacherRow);
        }

        let raw = teacherRow?.teacher_availability;
        if (typeof raw === 'string') {
          try { raw = JSON.parse(raw); } catch (e) {}
        }

        // 3b. Derive working hours automatically from existing schedules if teacher_availability is empty/blocked
        if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
          try {
            const { data: teacherScheds } = await supabase
              .from('schedules')
              .select('day_of_week, time_slot, duration_minutes')
              .eq('teacher_id', teacherId);

            if (teacherScheds && teacherScheds.length > 0) {
              const dayBounds: Record<number, { minMin: number; maxMin: number }> = {};
              
              teacherScheds.forEach((sc: any) => {
                const dayNum = Number(sc.day_of_week);
                if (!dayNum || dayNum < 1 || dayNum > 7) return;

                const timeStr = sc.time_slot || '';
                const [hStr, mStr] = timeStr.split(':');
                const startMinutes = parseInt(hStr || '0', 10) * 60 + parseInt(mStr || '0', 10);
                const dur = Number(sc.duration_minutes) || 30;
                const endMinutes = startMinutes + dur;

                if (!dayBounds[dayNum]) {
                  dayBounds[dayNum] = { minMin: startMinutes, maxMin: endMinutes };
                } else {
                  dayBounds[dayNum].minMin = Math.min(dayBounds[dayNum].minMin, startMinutes);
                  dayBounds[dayNum].maxMin = Math.max(dayBounds[dayNum].maxMin, endMinutes);
                }
              });

              const derived: Record<string, { start: string; end: string }> = {};
              Object.entries(dayBounds).forEach(([dStr, bounds]) => {
                // Add a 30-min buffer before min and after max
                const bufferedMin = Math.max(8 * 60, bounds.minMin - 30);
                const bufferedMax = Math.min(22 * 60, bounds.maxMin + 30);

                const startH = String(Math.floor(bufferedMin / 60)).padStart(2, '0');
                const startM = String(bufferedMin % 60).padStart(2, '0');
                const endH = String(Math.floor(bufferedMax / 60)).padStart(2, '0');
                const endM = String(bufferedMax % 60).padStart(2, '0');

                derived[dStr] = {
                  start: `${startH}:${startM}`,
                  end: `${endH}:${endM}`
                };
              });

              if (Object.keys(derived).length > 0) {
                console.log("useTeacherAvailability: Derived availability from schedules:", derived);
                raw = derived;
              }
            }
          } catch (e) {
            console.warn("useTeacherAvailability: Error deriving from schedules:", e);
          }
        }

        // 4. Fallback: If still no valid availability, fetch FIRST teacher in school who has availability configured
        if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) {
          console.log("useTeacherAvailability: Availability empty. Falling back to school teachers.");
          
          let query = supabase
            .from('users')
            .select('id, first_name, last_name, teacher_availability')
            .in('role', ['teacher', 'admin']);

          const schoolId = student?.school_id || localStorage.getItem('groovelab_active_school_id') || localStorage.getItem('groovelab_school_id');
          if (schoolId) {
            query = query.eq('school_id', schoolId);
          }

          const { data: schoolTeachers } = await query;
          let foundSchoolAvail = null;
          
          if (schoolTeachers && schoolTeachers.length > 0) {
            for (const t of schoolTeachers) {
              let tRaw = t.teacher_availability;
              if (typeof tRaw === 'string') {
                try { tRaw = JSON.parse(tRaw); } catch(e) {}
              }
              if (tRaw && typeof tRaw === 'object' && Object.keys(tRaw).length > 0) {
                foundSchoolAvail = tRaw;
                const tName = `${t.first_name || ''} ${t.last_name || ''}`.trim();
                setTeacherName(tName);
                break;
              }
            }
          }

          if (foundSchoolAvail) {
            console.log("useTeacherAvailability: Fallback found availability from school teacher:", foundSchoolAvail);
            setAvailability(foundSchoolAvail as any);
          } else {
            console.log("useTeacherAvailability: No availability found anywhere, setting to null");
            setAvailability(null);
          }
        } else if (active) {
          console.log("useTeacherAvailability: setting availability to:", raw);
          setAvailability(raw as any);
        }

        // 5. Setup realtime subscription for this specific teacher
        if (teacherId) {
          subscription = supabase
            .channel(`public:users:id=eq.${teacherId}`)
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${teacherId}` },
              (payload: any) => {
                if (payload.new && 'teacher_availability' in payload.new) {
                  let newAvail = payload.new.teacher_availability;
                  if (typeof newAvail === 'string') {
                    try { newAvail = JSON.parse(newAvail); } catch (e) {}
                  }
                  if (newAvail && typeof newAvail === 'object' && Object.keys(newAvail).length > 0) {
                    setAvailability(newAvail as TeacherAvailability);
                  } else {
                    setAvailability(null);
                  }
                }
              }
            )
            .subscribe();
        }

        if (active) {
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err);
          setLoading(false);
        }
      }
    }

    fetchAvailability();

    return () => {
      active = false;
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [student?.id, student?.teacher_id]);

  return { availability, loading, error, teacherName };
}
