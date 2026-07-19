const { Client } = require('ssh2');
const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: require('fs').readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

const sqlQuery = `
-- 1. Create helper function to avoid RLS recursion on users_raw
CREATE OR REPLACE FUNCTION public.is_teacher_of_qr_student(teacher_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
STABLE
AS $$
DECLARE
    v_qr_token text;
    v_has_access boolean;
BEGIN
    v_qr_token := public.get_qr_token();
    IF v_qr_token IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if the teacher is assigned in schedules
    SELECT EXISTS (
        SELECT 1
        FROM public.schedules s
        JOIN public.users_raw stud ON stud.id = s.student_id
        WHERE s.teacher_id = $1
        AND stud.qr_token::text = v_qr_token
    ) INTO v_has_access;
    
    IF v_has_access THEN
        RETURN true;
    END IF;

    -- Check if the teacher is assigned in schedule occurrences
    SELECT EXISTS (
        SELECT 1
        FROM public.schedule_occurrences o
        JOIN public.users_raw stud ON stud.id = o.student_id
        WHERE o.teacher_id = $1
        AND stud.qr_token::text = v_qr_token
    ) INTO v_has_access;
    
    RETURN v_has_access;
END;
$$;

-- 2. Drop and recreate users_select policy
DROP POLICY IF EXISTS "users_select" ON public.users_raw;

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
            OR ((id)::text = get_qr_token()) -- Allow selection by user UUID (Bypass and Student QR)
            OR public.is_teacher_of_qr_student(id)
        )
    )
    OR check_school_access(school_id)
    OR school_has_no_users(school_id)
);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

SELECT 'non-recursive users_select applied' as status;
`;

conn.on('ready', () => {
  console.log('SSH connection established successfully.');

  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log(`Query finished with code ${code}.`);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:\n' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR:\n' + data);
    });

    stream.write(sqlQuery);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
