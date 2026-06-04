const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

conn.on('ready', () => {
  console.log('SSH connection established successfully using private key!');

  const sql = `
    -- 1. Drop the users_select policy
    DROP POLICY IF EXISTS "users_select" ON public.users;

    -- 2. Recreate the policy to also allow selecting a user row if the header x-qr-token matches their ausweis_nummer (case-insensitive)
    CREATE POLICY "users_select" ON public.users FOR SELECT USING (
        is_master_admin = true
        OR public.is_master_admin()
        OR (
            public.get_kiosk_token() IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.kiosks k
                WHERE k.secret_token = public.get_kiosk_token()
                AND k.school_id = users.school_id
            )
        )
        OR (
            public.get_kiosk_token() IS NULL AND
            public.get_qr_token() IS NOT NULL AND
            (
                qr_token::text = public.get_qr_token()
                OR teacher_qr_token = public.get_qr_token()
                OR UPPER(ausweis_nummer) = UPPER(public.get_qr_token())
            )
        )
        OR public.check_school_access(school_id)
    );

    -- Force PostgREST schema cache reload
    NOTIFY pgrst, 'reload schema';
  `;

  // We write the SQL to psql stdin via the SSH stream
  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log(`SSH commands finished with code ${code}.`);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT:\n' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR:\n' + data);
    });

    stream.write(sql);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
