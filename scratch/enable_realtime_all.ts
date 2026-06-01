import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.178.105.10.2.sslip.io';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
      ) THEN
        -- schedule_occurrences
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_rel pr
          JOIN pg_class c ON pr.prrelid = c.oid
          JOIN pg_publication p ON pr.prpubid = p.oid
          WHERE p.pubname = 'supabase_realtime' AND c.relname = 'schedule_occurrences'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE schedule_occurrences;
        END IF;

        -- sessions
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_rel pr
          JOIN pg_class c ON pr.prrelid = c.oid
          JOIN pg_publication p ON pr.prpubid = p.oid
          WHERE p.pubname = 'supabase_realtime' AND c.relname = 'sessions'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
        END IF;

        -- crisis_notifications
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_rel pr
          JOIN pg_class c ON pr.prrelid = c.oid
          JOIN pg_publication p ON pr.prpubid = p.oid
          WHERE p.pubname = 'supabase_realtime' AND c.relname = 'crisis_notifications'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE crisis_notifications;
        END IF;

        -- progress_matrix
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_rel pr
          JOIN pg_class c ON pr.prrelid = c.oid
          JOIN pg_publication p ON pr.prpubid = p.oid
          WHERE p.pubname = 'supabase_realtime' AND c.relname = 'progress_matrix'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE progress_matrix;
        END IF;
      END IF;
    END $$;
  `;
  console.log("Enabling Realtime for schedule_occurrences, sessions, crisis_notifications, progress_matrix...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: data2, error: error2 } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Result:", { data: data2, error: error2 });
  } else {
    console.log("Result:", { data, error });
  }
}
run();
