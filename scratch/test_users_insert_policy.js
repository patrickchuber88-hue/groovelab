const { Client } = require('ssh2');
const fs = require('fs');

const config = {
  host: '178.105.10.2',
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync('/Users/patrickhuber/.ssh/id_ed25519'),
  readyTimeout: 10000
};

const conn = new Client();

const testQueries = [
  // Test 1: plain values
  `CREATE POLICY users_insert_test ON public.users_raw FOR INSERT WITH CHECK (
    public.is_master_admin()
    OR ((public.get_user_school_id() = school_id) AND public.is_teacher_or_admin())
    OR public.school_has_no_users(school_id)
    OR (
        EXISTS (
            SELECT 1 FROM public.invite_tokens
            WHERE token = public.get_invite_token()::uuid
              AND school_id = users_raw.school_id
              AND role = users_raw.role::text
              AND used_at IS NULL
        )
    )
  );`
];

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

    stream.write(testQueries[0]);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
}).connect(config);
