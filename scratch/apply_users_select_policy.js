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
            -- Allow students/parents to read details of teachers they have schedules/occurrences with
            OR EXISTS (
                SELECT 1
                FROM public.schedules s
                JOIN public.users_raw stud ON stud.id = s.student_id
                WHERE s.teacher_id = users_raw.id
                AND stud.qr_token::text = get_qr_token()
            )
            OR EXISTS (
                SELECT 1
                FROM public.schedule_occurrences o
                JOIN public.users_raw stud ON stud.id = o.student_id
                WHERE o.teacher_id = users_raw.id
                AND stud.qr_token::text = get_qr_token()
            )
        )
    )
    OR check_school_access(school_id)
    OR school_has_no_users(school_id)
);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

SELECT 'users_select RLS updated successfully' as status;
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
