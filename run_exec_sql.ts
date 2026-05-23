import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function run() {
  const sql = `
    -- Add zip_code and city columns to schools table
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS zip_code TEXT;
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS city TEXT;

    -- Add sort_order column to rooms table for drag and drop priority ordering
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

    -- Populate existing rooms sequentially based on creation/id order per school
    WITH ordered_rooms AS (
      SELECT id, row_number() OVER (PARTITION BY school_id ORDER BY id) - 1 as seq
      FROM rooms
    )
    UPDATE rooms
    SET sort_order = ordered_rooms.seq
    FROM ordered_rooms
    WHERE rooms.id = ordered_rooms.id;

    -- Force PostgREST schema cache reload
    NOTIFY pgrst, 'reload schema';
  `;
  console.log("Trying exec_sql...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql failed, trying execute_sql fallback...", error);
    const { data: dataFallback, error: errorFallback } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log("Result:", { data: dataFallback, error: errorFallback });
  } else {
    console.log("Result:", { data, error });
  }
}
run();
