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
DROP POLICY IF EXISTS campus_direct_messages_all ON public.campus_direct_messages;

CREATE POLICY campus_direct_messages_all ON public.campus_direct_messages FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE (u.id = sender_id OR u.id = recipient_id) 
        AND (
            public.check_school_access(u.school_id)
            OR u.qr_token::text = public.get_qr_token() 
            OR u.teacher_qr_token = public.get_qr_token()
        )
    )
);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

SELECT 'campus_direct_messages RLS updated successfully' as status;
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
