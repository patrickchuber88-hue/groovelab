-- Lösche alle vorhandenen Daten (Vorsicht: Nur für Development!)
TRUNCATE TABLE user_progress, exercises, sessions, stations, rooms, users, schools CASCADE;

-- 1. Schule anlegen
INSERT INTO schools (id, name, logo_url, primary_color)
VALUES ('11111111-1111-1111-1111-111111111111', 'Groovelab Academy', '', '#3b82f6');

-- 2. Räume und Plätze anlegen
INSERT INTO rooms (id, school_id, name)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Main Hall');

INSERT INTO stations (id, room_id, name)
VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Platz 3');

-- 3. Schüler anlegen (Alex M.)
INSERT INTO users (id, school_id, role, first_name, last_name, instrument)
VALUES ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'student', 'Alex', 'M.', 'Guitar');

-- 4. Session anlegen (Alex ist gerade eingecheckt)
INSERT INTO sessions (user_id, station_id, presence_minutes)
VALUES ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 120);

-- 5. Übungen anlegen
INSERT INTO exercises (id, school_id, title) VALUES
('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'Pentatonic Scale Mastery'),
('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', 'Rhythm Fundamentals'),
('55555555-5555-5555-5555-555555555553', '11111111-1111-1111-1111-111111111111', 'Improvisation Jam');

-- 6. Fortschritt für Alex anlegen
INSERT INTO user_progress (user_id, exercise_id, current_level, progress_percent, stage_ready_badge) VALUES
('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555551', 3, 90, FALSE),
('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555552', 1, 45, FALSE),
('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555553', 2, 10, FALSE);
