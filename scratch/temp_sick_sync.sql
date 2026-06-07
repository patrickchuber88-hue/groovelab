DO $$
DECLARE
  start_d date := '2026-06-07';
  end_d date := '2026-06-21';
  curr_d date := start_d;
  t_id uuid := '03564b1c-e2bb-4ccb-be95-b9fd1ef34829';
  sched record;
  slot_time timestamp;
  hours int;
  minutes int;
  raw_dow int;
BEGIN
  DELETE FROM crisis_notifications WHERE teacher_id = t_id AND slot_start_datetime >= '2026-06-07 00:00:00';

  WHILE curr_d <= end_d LOOP
    raw_dow := extract(isodow from curr_d);
    
    FOR sched IN SELECT * FROM schedules WHERE teacher_id = t_id AND day_of_week = raw_dow AND student_id IS NOT NULL LOOP
      hours := split_part(sched.time_slot, ':', 1)::int;
      minutes := split_part(sched.time_slot, ':', 2)::int;
      
      slot_time := curr_d + make_interval(hours => hours, mins => minutes);
      
      IF slot_time >= '2026-06-07 14:00:00' THEN
        INSERT INTO crisis_notifications (teacher_id, student_id, slot_start_datetime, status)
        VALUES (t_id, sched.student_id, slot_time, 'UNREAD');
      END IF;
    END LOOP;
    
    curr_d := curr_d + 1;
  END LOOP;
END $$;
