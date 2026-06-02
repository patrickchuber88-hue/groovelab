const { Client } = require('ssh2');
const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  password: 'LlYoQzfwy$v=',
  readyTimeout: 10000
};

const sql = `
-- 1. Add columns to user_song_skills
ALTER TABLE public.user_song_skills ADD COLUMN IF NOT EXISTS part_number INTEGER DEFAULT 1;
ALTER TABLE public.user_song_skills ADD COLUMN IF NOT EXISTS difficulty_level TEXT NOT NULL DEFAULT 'original' CHECK (difficulty_level IN ('starter', 'original'));
ALTER TABLE public.user_song_skills ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- 2. Update unique constraint on user_song_skills to match App.tsx onConflict target
ALTER TABLE public.user_song_skills DROP CONSTRAINT IF EXISTS user_song_skills_user_id_song_id_key;
ALTER TABLE public.user_song_skills DROP CONSTRAINT IF EXISTS user_song_skills_user_id_song_id_difficulty_level_key;
ALTER TABLE public.user_song_skills DROP CONSTRAINT IF EXISTS user_song_skills_user_id_song_id_instrument_difficulty_level_part_number_key;
ALTER TABLE public.user_song_skills DROP CONSTRAINT IF EXISTS user_song_skills_user_id_song_id_instrument_difficulty_level_part_key;

-- We also make sure the table has a unique constraint for the onConflict UPSERT target:
ALTER TABLE public.user_song_skills ADD CONSTRAINT user_song_skills_user_id_song_id_instrument_difficulty_level_part_key UNIQUE (user_id, song_id, instrument, difficulty_level, part_number);

-- 3. Force schema reload for PostgREST
NOTIFY pgrst, 'reload schema';
`;

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log(`Migration finished with code ${code}.`);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });

    stream.write(sql);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
