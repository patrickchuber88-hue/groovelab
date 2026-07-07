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

const sql = `
CREATE OR REPLACE FUNCTION public.school_has_no_users(p_school_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_school_id IS NULL THEN
        RETURN false;
    END IF;
    RETURN NOT EXISTS (
        SELECT 1 FROM public.users_raw WHERE school_id = p_school_id
    );
END;
$$;
`;

conn.on('ready', () => {
  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('close', (code) => {
      console.log(`Command closed with code ${code}`);
      conn.end();
    }).on('data', (data) => {
      output += data.toString();
    });
    stream.write(sql);
    stream.end();
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect(config);
