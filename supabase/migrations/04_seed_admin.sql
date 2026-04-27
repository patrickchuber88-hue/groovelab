-- 1. Admin anlegen (Musikschulleiter)
INSERT INTO users (id, school_id, role, first_name, last_name, instrument)
VALUES (
  '88888888-8888-8888-8888-888888888888', 
  '11111111-1111-1111-1111-111111111111', 
  'admin', 
  'Anna', 
  'Admin', 
  NULL
) ON CONFLICT DO NOTHING;
