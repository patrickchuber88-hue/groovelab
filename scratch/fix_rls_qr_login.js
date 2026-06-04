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
    -- 1. Drop the depending policy first
    DROP POLICY IF EXISTS "users_select" ON public.users;

    -- 2. Drop the old function with the UUID return type
    DROP FUNCTION IF EXISTS public.get_qr_token();

    -- 3. Recreate the function returning text
    CREATE OR REPLACE FUNCTION public.get_qr_token()
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        v_headers text;
        v_token text;
    BEGIN
        v_headers := current_setting('request.headers', true);
        IF v_headers IS NULL OR v_headers = '' THEN
            RETURN NULL;
        END IF;
        v_token := v_headers::json->>'x-qr-token';
        IF v_token IS NULL OR v_token = '' THEN
            RETURN NULL;
        END IF;
        RETURN v_token;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
    $$;

    -- 4. Recreate the policy with correct casts (matching both text and UUIDs)
    CREATE POLICY "users_select" ON public.users FOR SELECT USING (
        public.is_master_admin()
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
