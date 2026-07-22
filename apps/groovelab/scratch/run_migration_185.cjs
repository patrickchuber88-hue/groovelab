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

const sql = `
CREATE OR REPLACE FUNCTION public.verify_onboarding(
    input_first_name TEXT,
    input_last_name TEXT,
    input_instrument TEXT,
    input_day INT
)
RETURNS TABLE (
    success BOOLEAN,
    student_id UUID,
    message TEXT
) AS $$
DECLARE
    client_ip TEXT;
    recent_attempts INT;
    matched_student_id UUID;
    clean_input_last TEXT;
BEGIN
    client_ip := COALESCE(
        current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
        '127.0.0.1'
    );

    DELETE FROM public.onboarding_attempts WHERE attempted_at < NOW() - INTERVAL '15 minutes';

    SELECT COUNT(*)::INT INTO recent_attempts
    FROM public.onboarding_attempts
    WHERE ip_address = client_ip;

    IF recent_attempts >= 15 THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Zu viele Fehlversuche. Bitte versuche es in 15 Minuten erneut.';
        RETURN;
    END IF;

    clean_input_last := LOWER(TRIM(input_last_name));

    -- Match by first name, instrument, birth day, and flexible last name (matching full name, prefix, single/double n, or initial)
    SELECT s.id INTO matched_student_id
    FROM public.students s
    JOIN public.student_first_names sfn ON s.id = sfn.student_id
    JOIN public.student_last_names sln ON s.id = sln.student_id
    JOIN public.activation_days ad ON s.id = ad.student_id
    WHERE pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()) ILIKE TRIM(input_first_name)
      AND (s.instrument = TRIM(input_instrument) OR s.instrument = 'ohne Zuweisung' OR TRIM(input_instrument) = 'ohne Zuweisung')
      AND ad.day_of_birth = input_day
      AND (
        sln.last_name ILIKE clean_input_last
        OR clean_input_last ILIKE sln.last_name || '%'
        OR sln.last_name ILIKE clean_input_last || '%'
        OR LEFT(LOWER(sln.last_name), 3) = LEFT(clean_input_last, 3)
        OR REPLACE(LOWER(sln.last_name), 'nn', 'n') = REPLACE(clean_input_last, 'nn', 'n')
        OR LEFT(LOWER(sln.last_name), 1) = LEFT(clean_input_last, 1)
      )
    LIMIT 1;

    -- Fallback: check users table directly
    IF matched_student_id IS NULL THEN
        SELECT u.id INTO matched_student_id
        FROM public.users u
        LEFT JOIN public.activation_days ad ON u.id = ad.student_id
        WHERE u.first_name ILIKE TRIM(input_first_name)
          AND (u.instrument = TRIM(input_instrument) OR u.instrument = 'ohne Zuweisung' OR TRIM(input_instrument) = 'ohne Zuweisung')
          AND (
            u.last_name ILIKE clean_input_last
            OR clean_input_last ILIKE u.last_name || '%'
            OR u.last_name ILIKE clean_input_last || '%'
            OR LEFT(LOWER(u.last_name), 1) = LEFT(clean_input_last, 1)
            OR REPLACE(LOWER(u.last_name), 'nn', 'n') = REPLACE(clean_input_last, 'nn', 'n')
          )
          AND (ad.day_of_birth = input_day OR EXTRACT(DAY FROM u.birth_date)::INT = input_day)
        LIMIT 1;
    END IF;

    IF matched_student_id IS NOT NULL THEN
        DELETE FROM public.onboarding_attempts WHERE ip_address = client_ip;
        RETURN QUERY SELECT TRUE, matched_student_id, 'Verifiziert';
    ELSE
        INSERT INTO public.onboarding_attempts (ip_address) VALUES (client_ip);
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Eingabe überprüfen';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, extensions;
`;

conn.on('ready', () => {
  console.log('SSH connection established!');

  conn.exec('docker exec -i supabase-db psql -U postgres -d postgres', (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log('Migration applied successfully!');
      
      // Test verify_onboarding with "Elisabeth", "Zimmermann", "Gitarre", 1
      const testSql = `SELECT * FROM public.verify_onboarding('Elisabeth', 'Zimmermann', 'Gitarre', 1);`;
      
      conn.exec(`docker exec -i supabase-db psql -U postgres -d postgres -c "${testSql}"`, (err2, stream2) => {
        if (err2) throw err2;
        stream2.on('data', (d) => console.log('TEST RESULT:\n' + d)).on('close', () => conn.end());
      });

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
