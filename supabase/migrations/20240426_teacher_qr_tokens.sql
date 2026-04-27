-- Ensure all teachers/admins have a qr_token
UPDATE users 
SET qr_token = encode(gen_random_bytes(16), 'hex')
WHERE (role = 'teacher' OR role = 'admin') AND (qr_token IS NULL OR qr_token = '');
