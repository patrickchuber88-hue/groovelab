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
    -- 1. Drop the users_update policy
    DROP POLICY IF EXISTS "users_update" ON public.users;

    -- 2. Recreate the policy to also allow updates if x-qr-token matches qr_token, teacher_qr_token or ausweis_nummer
    CREATE POLICY "users_update" ON public.users FOR UPDATE USING (
        is_master_admin()
        OR (
            check_school_access(school_id)
            AND (
                is_teacher_or_admin()
                OR (id = ((current_setting('request.headers', true))::json->>'x-user-id')::uuid)
            )
        )
        OR (
            get_qr_token() IS NOT NULL
            AND (
                qr_token::text = get_qr_token()
                OR teacher_qr_token = get_qr_token()
                OR UPPER(ausweis_nummer) = UPPER(get_qr_token())
            )
        )
    );

    -- Force PostgREST schema cache reload
    NOTIFY pgrst, 'reload schema';
  `;

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
