import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

function getISOWeek(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

async function main() {
  const studentId = '7ecf29bc-b580-4974-9387-1eae9ac90515';
  
  const { data: matrixItems } = await supabase
    .from('progress_matrix')
    .select('*')
    .eq('student_id', studentId)
    .order('updated_at', { ascending: false });

  console.log("Found raw progress items:", matrixItems?.length);

  const activeHWs = (matrixItems || []).filter(item => item.is_current_homework && !item.topic_name.startsWith('Hausaufgabe KW '));
  console.log("activeHWs count:", activeHWs.length, activeHWs);

  const currentWeek = getISOWeek();
  console.log("currentWeek:", currentWeek);

  const activeTheories = (matrixItems || []).filter(item => 
    item.status === 'THEORY_DONE' && 
    item.updated_at && 
    getISOWeek(item.updated_at) === currentWeek &&
    !item.topic_name.startsWith('Hausaufgabe KW ')
  );
  console.log("activeTheories count:", activeTheories.length);

  const getHomeworkNotes = () => {
    for (const item of (matrixItems || [])) {
      if (item.homework_notes && item.homework_notes.trim()) {
        try {
          const raw = item.homework_notes;
          if (raw.startsWith('[') && raw.endsWith(']')) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          } else {
            const lines = raw
              .split('\n')
              .filter((line) => !line.trim().startsWith('• 📖') && !line.trim().startsWith('• 🎵') && !line.trim().startsWith('• 🗑️'))
              .map((l) => l.trim())
              .filter(Boolean);
            if (lines.length > 0) {
              return lines;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  };
  const notesList = getHomeworkNotes();
  console.log("notesList count:", notesList.length, notesList);
}

main();
