import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function testTeacherDashboard() {
  const { data: teachers } = await supabase.from('users').select('*').eq('role', 'teacher');
  if (!teachers || teachers.length === 0) {
    console.error("No teachers found");
    return;
  }
  
  for (const user of teachers) {
    console.log(`\n-------------------------------------`);
    console.log(`Simulating for teacher: ${user.first_name} ${user.last_name}, ID: ${user.id}`);
    
    const userId = user.id;
    try {
      const { data: teacherProfile } = await supabase
        .from('users')
        .select('school_id, schools(allow_messages_global)')
        .eq('id', userId)
        .single();

      console.log("Teacher Profile:", teacherProfile);

      const schoolData = Array.isArray(teacherProfile.schools) ? teacherProfile.schools[0] : teacherProfile.schools;
      const allowMessages = schoolData?.allow_messages_global ?? true;

      const rawDay = new Date().getDay();
      const todayWeekday = rawDay === 0 ? 7 : rawDay;

      const { data: slots, error: slotsError } = await supabase
        .from('schedules')
        .select(`
          id,
          time_slot,
          duration,
          status,
          day_of_week,
          rooms (id, name),
          student:users!schedules_student_id_fkey (
            id,
            first_name,
            last_name,
            is_app_user,
            instrument,
            avatars (avatar_style, evolution_level, xp)
          )
        `)
        .eq('teacher_id', userId)
        .eq('day_of_week', todayWeekday);

      if (slotsError) {
        console.error("Slots fetch error:", slotsError);
        continue;
      }
      
      console.log(`Fetched slots count: ${slots?.length}`);
      
      const todayStr = new Date().toISOString().substring(0, 10);
      const { data: occurrences, error: occError } = await supabase
        .from('schedule_occurrences')
        .select(`
          id,
          date,
          original_date,
          start_time,
          status,
          schedule_id,
          student_id,
          schedules (
            duration,
            rooms (id, name)
          ),
          student:users!schedule_occurrences_student_id_fkey (
            id,
            first_name,
            last_name,
            is_app_user,
            instrument,
            avatars (avatar_style, evolution_level, xp)
          )
        `)
        .eq('teacher_id', userId)
        .or(`date.eq.${todayStr},original_date.eq.${todayStr}`);

      if (occError) {
        console.error("Occurrences fetch error:", occError);
        continue;
      }

      console.log(`Fetched occurrences count: ${occurrences?.length}`);

      // Map regular schedules
      let timeline = (slots || []).map((slot) => {
        const student = slot.student;
        const avatar = student?.avatars?.[0] || null;
        const isAnalogStickerUser = !student?.is_app_user || avatar?.avatar_style === 'Standard_Silhouette';

        return {
          scheduleId: slot.id,
          timeSlot: slot.time_slot,
          duration: slot.duration,
          status: slot.status,
          roomId: slot.rooms?.id || null,
          room: slot.rooms?.name || 'Hauptraum',
          instrument: student?.instrument || 'Klavier',
          student: student ? {
            id: student.id,
            name: `${student.first_name} ${student.last_name}`,
            isAppUser: student.is_app_user ?? false,
            isAnalogStickerUser
          } : null
        };
      });

      console.log("Mapped initial timeline. Length:", timeline.length);

      // Merge occurrences
      if (occurrences && occurrences.length > 0) {
        occurrences.forEach((occ) => {
          const student = occ.student;
          const avatar = student?.avatars?.[0] || null;
          const isAnalogStickerUser = !student?.is_app_user || avatar?.avatar_style === 'Standard_Silhouette';
          const formattedTime = occ.start_time ? occ.start_time.substring(0, 5) : '00:00';
          const occStudentId = occ.student?.id || occ.student_id;

          if (occ.original_date === todayStr && occ.date !== todayStr) {
            timeline = timeline.filter((t) => t.student?.id !== occStudentId);
          } else if (occ.date === todayStr) {
            const existingIdx = timeline.findIndex((t) => t.student?.id === occStudentId);
            const mappedItem = {
              scheduleId: occ.schedule_id || occ.id,
              timeSlot: formattedTime,
              duration: occ.schedules?.duration || 30,
              status: occ.status,
              roomId: occ.schedules?.rooms?.id || null,
              room: occ.schedules?.rooms?.name || 'Hauptraum',
              instrument: student?.instrument || 'Klavier',
              student: student ? {
                id: student.id,
                name: `${student.first_name} ${student.last_name}`,
                isAppUser: student.is_app_user ?? false,
                isAnalogStickerUser
              } : null
            };

            if (occ.status === 'cancelled') {
              mappedItem.status = 'canceled_by_student';
            }

            if (existingIdx !== -1) {
              timeline[existingIdx] = mappedItem;
            } else {
              timeline.push(mappedItem);
            }
          }
        });
      }

      console.log("After merging occurrences timeline length:", timeline.length);
      
      // Check if any timeSlot is null/undefined
      const badSlots = timeline.filter(t => !t.timeSlot);
      console.log("Timeline slots missing timeSlot:", badSlots.length);
      if (badSlots.length > 0) {
        console.log("Bad slots details:", badSlots);
      }

      // Sort timeline
      timeline.sort((a, b) => {
        if (!a.timeSlot || !b.timeSlot) {
          console.error("Sorting error: a.timeSlot or b.timeSlot is missing!", { a, b });
        }
        return a.timeSlot.localeCompare(b.timeSlot);
      });

      console.log("Timeline sorted successfully!");

    } catch (err) {
      console.error("Uncaught simulation error:", err);
    }
  }
}

testTeacherDashboard();
