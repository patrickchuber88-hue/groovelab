-- 1. Master Teacher anlegen
INSERT INTO users (id, school_id, role, first_name, last_name, instrument)
VALUES (
  '99999999-9999-9999-9999-999999999999', 
  '11111111-1111-1111-1111-111111111111', 
  'teacher', 
  'Max', 
  'Mustermann (Lehrer)', 
  'All'
) ON CONFLICT DO NOTHING;
