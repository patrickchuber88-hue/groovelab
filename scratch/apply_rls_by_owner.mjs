import { Client } from 'ssh2';
import fs from 'fs';
const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

// SQL 1: For supabase_admin (owns notifications and push_subscriptions)
const sqlAdmin = `
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_all ON public.push_subscriptions;
CREATE POLICY push_subscriptions_all ON public.push_subscriptions FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE u.id = user_id AND public.check_school_access(u.school_id)
    )
);

DROP POLICY IF EXISTS notifications_all ON public.notifications;
CREATE POLICY notifications_all ON public.notifications FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE u.id = user_id AND public.check_school_access(u.school_id)
    )
);
`;

// SQL 2: For postgres (owns all other tables and functions/views)
const sqlPostgres = `
-- Enable RLS on postgres-owned tables
ALTER TABLE public.activation_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_prefixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suffixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_link_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_email_prefixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_email_suffixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_first_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_last_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_onboarding_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_schedule_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_prefixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_suffixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Allow anonymous select onboarding tokens" ON public.student_onboarding_tokens;
DROP POLICY IF EXISTS "Allow school staff manage onboarding tokens" ON public.student_onboarding_tokens;
DROP POLICY IF EXISTS "users_select" ON public.users_raw;
DROP POLICY IF EXISTS "users_update" ON public.users_raw;
DROP POLICY IF EXISTS "users_update" ON public.users;

-- Correct users_select policy
CREATE POLICY "users_select" ON public.users_raw
FOR SELECT
USING (
    public.is_master_admin()
    OR (
        (get_kiosk_token() IS NOT NULL)
        AND (
            EXISTS (
                SELECT 1
                FROM kiosks k
                WHERE ((k.secret_token = get_kiosk_token()) AND (k.school_id = users_raw.school_id))
            )
        )
    )
    OR (
        (get_kiosk_token() IS NULL)
        AND (get_qr_token() IS NOT NULL)
        AND (
            ((qr_token)::text = get_qr_token())
            OR ((teacher_qr_token)::text = get_qr_token())
            OR (upper((ausweis_nummer)::text) = upper(get_qr_token()))
        )
    )
    OR check_school_access(school_id)
    OR school_has_no_users(school_id)
);

-- Fix users_update policy
CREATE POLICY "users_update" ON public.users_raw
FOR UPDATE
USING (
    public.is_master_admin()
    OR (public.check_school_access(school_id) AND (public.is_teacher_or_admin() OR id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid))
)
WITH CHECK (
    public.is_master_admin()
    OR (
        public.check_school_access(school_id)
        AND (
            public.is_teacher_or_admin()
            OR (
                id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid
            )
        )
    )
);

-- RLS Policies
-- students
DROP POLICY IF EXISTS students_all ON public.students;
CREATE POLICY students_all ON public.students FOR ALL USING (
    public.is_master_admin() OR public.check_school_access(school_id)
);

-- student_first_names
DROP POLICY IF EXISTS student_first_names_all ON public.student_first_names;
CREATE POLICY student_first_names_all ON public.student_first_names FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- student_last_names
DROP POLICY IF EXISTS student_last_names_all ON public.student_last_names;
CREATE POLICY student_last_names_all ON public.student_last_names FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- activation_days
DROP POLICY IF EXISTS activation_days_all ON public.activation_days;
CREATE POLICY activation_days_all ON public.activation_days FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- email_prefixes / email_suffixes
DROP POLICY IF EXISTS email_prefixes_all ON public.email_prefixes;
CREATE POLICY email_prefixes_all ON public.email_prefixes FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);
DROP POLICY IF EXISTS email_suffixes_all ON public.email_suffixes;
CREATE POLICY email_suffixes_all ON public.email_suffixes FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- parent_email_prefixes / parent_email_suffixes
DROP POLICY IF EXISTS parent_email_prefixes_all ON public.parent_email_prefixes;
CREATE POLICY parent_email_prefixes_all ON public.parent_email_prefixes FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);
DROP POLICY IF EXISTS parent_email_suffixes_all ON public.parent_email_suffixes;
CREATE POLICY parent_email_suffixes_all ON public.parent_email_suffixes FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- student_schedule_preferences
DROP POLICY IF EXISTS student_schedule_preferences_all ON public.student_schedule_preferences;
CREATE POLICY student_schedule_preferences_all ON public.student_schedule_preferences FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- student_onboarding_tokens
DROP POLICY IF EXISTS student_onboarding_tokens_all ON public.student_onboarding_tokens;
CREATE POLICY student_onboarding_tokens_all ON public.student_onboarding_tokens FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.students s WHERE s.id = student_id AND public.check_school_access(s.school_id)
    )
);

-- user_email_prefixes / user_email_suffixes
DROP POLICY IF EXISTS user_email_prefixes_all ON public.user_email_prefixes;
CREATE POLICY user_email_prefixes_all ON public.user_email_prefixes FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE u.id = user_id AND public.check_school_access(u.school_id)
    )
);
DROP POLICY IF EXISTS user_email_suffixes_all ON public.user_email_suffixes;
CREATE POLICY user_email_suffixes_all ON public.user_email_suffixes FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE u.id = user_id AND public.check_school_access(u.school_id)
    )
);

-- magic_link_logs
DROP POLICY IF EXISTS magic_link_logs_all ON public.magic_link_logs;
CREATE POLICY magic_link_logs_all ON public.magic_link_logs FOR ALL USING (public.is_master_admin());

-- onboarding_attempts
DROP POLICY IF EXISTS onboarding_attempts_all ON public.onboarding_attempts;
CREATE POLICY onboarding_attempts_all ON public.onboarding_attempts FOR ALL USING (public.is_master_admin());

-- campus_direct_messages
DROP POLICY IF EXISTS campus_direct_messages_all ON public.campus_direct_messages;
CREATE POLICY campus_direct_messages_all ON public.campus_direct_messages FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE (u.id = sender_id OR u.id = recipient_id) AND public.check_school_access(u.school_id)
    )
);

-- sessions
DROP POLICY IF EXISTS sessions_all ON public.sessions;
CREATE POLICY sessions_all ON public.sessions FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE u.id = user_id AND public.check_school_access(u.school_id)
    )
);

-- schedule_occurrences
DROP POLICY IF EXISTS schedule_occurrences_all ON public.schedule_occurrences;
CREATE POLICY schedule_occurrences_all ON public.schedule_occurrences FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u WHERE u.id = teacher_id AND public.check_school_access(u.school_id)
    )
);
`;

function executeRemoteSql(user, sql) {
  return new Promise((resolve, reject) => {
    conn.exec(`docker exec -i supabase-db psql -U ${user} -d postgres`, (err, stream) => {
      if (err) return reject(err);
      let output = '';
      let errOutput = '';
      stream.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Failed with code ${code}. Error: ${errOutput}`));
        } else {
          resolve(output);
        }
      }).on('data', (data) => {
        output += data.toString();
      }).stderr.on('data', (data) => {
        errOutput += data.toString();
      });
      stream.write(sql);
      stream.end();
    });
  });
}

conn.on('ready', async () => {
  try {
    console.log("1. Running RLS commands as supabase_admin...");
    const resAdmin = await executeRemoteSql('supabase_admin', sqlAdmin);
    console.log("Admin Output:", resAdmin);

    console.log("2. Running RLS commands as postgres...");
    const resPostgres = await executeRemoteSql('postgres', sqlPostgres);
    console.log("Postgres Output:", resPostgres);

    console.log("✅ Successfully applied all migration segments!");
    conn.end();
  } catch (err) {
    console.error("❌ ERROR running migration:", err.message);
    conn.end();
    process.exit(1);
  }
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
  process.exit(1);
}).connect(config);
