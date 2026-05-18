import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log("Creating Shoutbox tables in database...");

  const sql = `
    -- Create shoutbox_messages table
    CREATE TABLE IF NOT EXISTS public.shoutbox_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        target_type TEXT NOT NULL, -- 'all', 'students', 'teachers', 'specific'
        target_user_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Array of specific user IDs if target_type is 'specific'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create shoutbox_reads table to track who read which message
    CREATE TABLE IF NOT EXISTS public.shoutbox_reads (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        message_id UUID REFERENCES public.shoutbox_messages(id) ON DELETE CASCADE,
        read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, message_id)
    );

    -- Disable Row Level Security for development
    ALTER TABLE public.shoutbox_messages DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.shoutbox_reads DISABLE ROW LEVEL SECURITY;
  `;

  console.log("Executing SQL via 'exec_sql' RPC...");
  try {
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      console.log("exec_sql failed:", error.message);
    } else {
      console.log("✅ Shoutbox tables successfully created via exec_sql RPC!");
      return;
    }
  } catch (err) {
    console.log("exec_sql threw:", err.message);
  }

  console.log("Trying 'execute_sql' RPC with 'sql_query' parameter...");
  try {
    const { error } = await supabase.rpc('execute_sql', { sql_query: sql });
    if (error) {
      console.log("execute_sql failed:", error.message);
    } else {
      console.log("✅ Shoutbox tables successfully created via execute_sql RPC!");
      return;
    }
  } catch (err) {
    console.log("execute_sql threw:", err.message);
  }
}

run();
