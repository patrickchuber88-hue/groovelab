-- Migration 252: Purge all test users and enforce strict teacher-only assignment
DO $$
DECLARE
  v_test_ids UUID[];
BEGIN
  -- Gather student IDs for test profiles matching TestVorname%, Test%, Jane, Bob
  SELECT ARRAY_AGG(DISTINCT id) INTO v_test_ids
  FROM (
    SELECT id FROM public.students
    WHERE id IN (
      SELECT student_id FROM public.student_first_names 
      WHERE pgp_sym_decrypt(first_name, get_encryption_key()) LIKE 'Test%'
         OR pgp_sym_decrypt(first_name, get_encryption_key()) LIKE 'Jane%'
         OR pgp_sym_decrypt(first_name, get_encryption_key()) LIKE 'Bob%'
    )
    UNION
    SELECT id FROM public.users 
    WHERE role = 'student' 
      AND (
        first_name LIKE 'Test%' 
        OR first_name LIKE 'Jane%' 
        OR first_name LIKE 'Bob%'
        OR last_name = 'T.'
        OR email LIKE '%test%'
      )
  ) sub;

  IF v_test_ids IS NOT NULL AND array_length(v_test_ids, 1) > 0 THEN
    -- Purge related records
    DELETE FROM public.schedule_occurrences WHERE student_id = ANY(v_test_ids);
    DELETE FROM public.schedules WHERE student_id = ANY(v_test_ids);
    DELETE FROM public.student_schedule_preferences WHERE student_id = ANY(v_test_ids);
    DELETE FROM public.student_teachers WHERE student_id = ANY(v_test_ids);
    DELETE FROM public.band_members WHERE user_id = ANY(v_test_ids);
    DELETE FROM public.sessions WHERE user_id = ANY(v_test_ids);
    DELETE FROM public.student_first_names WHERE student_id = ANY(v_test_ids);
    DELETE FROM public.student_last_names WHERE student_id = ANY(v_test_ids);
    DELETE FROM public.activation_days WHERE student_id = ANY(v_test_ids);
    DELETE FROM public.parent_email_prefixes WHERE student_id = ANY(v_test_ids);
    DELETE FROM public.parent_email_suffixes WHERE student_id = ANY(v_test_ids);
    DELETE FROM public.email_prefixes WHERE student_id = ANY(v_test_ids);
    DELETE FROM public.email_suffixes WHERE student_id = ANY(v_test_ids);
    
    -- Delete from students and users
    DELETE FROM public.students WHERE id = ANY(v_test_ids);
    DELETE FROM public.users WHERE id = ANY(v_test_ids);
  END IF;
END $$;
