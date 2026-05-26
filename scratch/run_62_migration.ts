import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://supabase.178.105.10.2.sslip.io';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    -- 1. Update schedules check constraint to include 'canceled_by_teacher_sick'
    ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_status_check;
    ALTER TABLE public.schedules ADD CONSTRAINT schedules_status_check CHECK (status IN ('draft', 'ready_for_admin_review', 'approved', 'canceled_by_student', 'pending_parent_approval', 'teacher_sick', 'canceled_by_teacher_sick'));

    -- 2. Create notification status type
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
            CREATE TYPE notification_status AS ENUM ('UNREAD', 'READ');
        END IF;
    END $$;

    -- 3. Create crisis_notifications table
    CREATE TABLE IF NOT EXISTS public.crisis_notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        slot_start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
        status notification_status DEFAULT 'UNREAD',
        notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 4. Disable RLS for operations
    ALTER TABLE public.crisis_notifications DISABLE ROW LEVEL SECURITY;
    GRANT ALL ON public.crisis_notifications TO authenticated, anon, service_role;

    -- Force PostgREST schema cache reload
    NOTIFY pgrst, 'reload schema';
  `;

  console.log("Applying migration 62 on remote database...");
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
