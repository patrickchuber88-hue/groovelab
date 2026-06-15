import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const customFetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set('x-user-id', '88888888-8888-8888-8888-888888888888');
  return fetch(input, { ...init, headers });
};

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: customFetch
  }
});

async function checkHomeworkAudios() {
  console.log("Fetching progress_matrix notes containing audio...");
  const { data: rows, error } = await supabase
    .from('progress_matrix')
    .select('id, topic_name, homework_notes, updated_at')
    .not('homework_notes', 'is', null);

  if (error) {
    console.error("Error fetching progress_matrix:", error);
    return;
  }

  let totalSize = 0;
  let audioCount = 0;
  console.log(`Found ${rows.length} rows in progress_matrix.`);

  for (const row of rows) {
    let notes = [];
    try {
      notes = JSON.parse(row.homework_notes);
    } catch {
      if (typeof row.homework_notes === 'string') {
        notes = [row.homework_notes];
      }
    }

    if (!Array.isArray(notes)) continue;

    for (const note of notes) {
      if (typeof note === 'string' && note.startsWith("AUDIO:")) {
        audioCount++;
        const parts = note.substring(6).split('|');
        const audioUrl = parts[0];
        const duration = parts[1] || 'unknown';
        const date = parts[2] || 'unknown';

        console.log(`\n- Audio #${audioCount}: topic "${row.topic_name}" (Updated: ${row.updated_at})`);
        console.log(`  Duration: ${duration}s, Upload Date: ${date}`);
        console.log(`  URL: ${audioUrl}`);

        if (audioUrl.startsWith("http")) {
          try {
            const res = await fetch(audioUrl, { method: 'HEAD' });
            const contentLength = res.headers.get('content-length');
            if (contentLength) {
              const sizeBytes = parseInt(contentLength, 10);
              totalSize += sizeBytes;
              console.log(`  Size: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB (${sizeBytes} bytes)`);
            } else {
              console.log("  Size: content-length header missing");
            }
          } catch (err) {
            console.log(`  Size check failed: ${err.message}`);
          }
        }
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Total Audio Recordings found: ${audioCount}`);
  console.log(`Total Storage space used: ${(totalSize / (1024 * 1024)).toFixed(2)} MB (${totalSize} bytes)`);
  console.log(`========================================`);
}

checkHomeworkAudios();
