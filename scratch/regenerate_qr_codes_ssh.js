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
    -- 1. Temporarily disable the protection trigger
    ALTER TABLE public.users DISABLE TRIGGER protect_user_login_credentials_trigger;

    -- 2. Update students (role = 'student')
    UPDATE public.users
    SET 
      qr_token = gen_random_uuid(),
      teacher_qr_token = null,
      is_pin_activated = false,
      personal_pin = null, -- Reset personal_pin so new PIN setup is required
      ausweis_nummer = 'GL-' || floor(1000 + random() * 9000)::text
    WHERE 
      role = 'student' 
      AND (is_master_admin IS NOT TRUE);

    -- 3. Update teachers (role = 'teacher' excluding admins/secretaries/masters)
    UPDATE public.users
    SET 
      teacher_qr_token = 't_' || substring(md5(random()::text) from 1 for 24),
      qr_token = null,
      is_pin_activated = false,
      personal_pin = null, -- Reset personal_pin so new PIN setup is required
      ausweis_nummer = (
        CASE 
          WHEN is_campus_active = true AND is_groovelab_active = true THEN 'CG-'
          WHEN is_campus_active = true THEN 'C-'
          WHEN is_groovelab_active = true THEN 'G-'
          ELSE 'C-'
        END
      ) || floor(1000 + random() * 9000)::text
    WHERE 
      role = 'teacher' 
      AND (is_master_admin IS NOT TRUE)
      AND role NOT IN ('secretary', 'admin');

    -- 4. Re-enable the protection trigger
    ALTER TABLE public.users ENABLE TRIGGER protect_user_login_credentials_trigger;

    -- Force PostgREST schema cache reload
    NOTIFY pgrst, 'reload schema';
  `;

  // We write the SQL to psql stdin via the SSH stream
  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log(`SSH command finished with code ${code}.`);
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
