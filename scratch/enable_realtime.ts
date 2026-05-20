import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function run() {
  const sql = `
    -- Try to add user_song_skills to supabase_realtime publication
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
      ) THEN
        -- Check if it is already in the publication
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_rel pr
          JOIN pg_class c ON pr.prrelid = c.oid
          JOIN pg_publication p ON pr.prpubid = p.oid
          WHERE p.pubname = 'supabase_realtime' AND c.relname = 'user_song_skills'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE user_song_skills;
        END IF;
      END IF;
    END $$;
  `;
  console.log("Adding user_song_skills to realtime publication...");
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  console.log("Result:", { data, error });
}
run();
