# Synthesis Report: M2 Database Migration Schema & Constraints (Gen 2 Remediation)

We have consolidated the database schema recommendations from the Gen 2 Explorer subagents. Below is the finalized design to resolve all integrity violations, RLS visibility leaks, and bulk insert failures reported during the audit.

## Redesigned Database Schema changes

### 1. Backdoor Removal
- Remove all references to the `x-bypass-forcing` header in trigger logic and RLS policies. Validation must be absolute and cannot be bypassed from client-side headers.

### 2. PostgREST Coalescing for Default Values
- PostgREST bulk inserts send `NULL` for omitted columns. At the top of the `validate_campus_event_program_point` trigger function, we will perform trigger-level coalescing for all defaultable fields before check constraints are evaluated:
  - `NEW.chairs_needed := COALESCE(NEW.chairs_needed, 0);`
  - `NEW.music_stands_needed := COALESCE(NEW.music_stands_needed, 0);`
  - `NEW.is_pause := COALESCE(NEW.is_pause, FALSE);`
  - `NEW.performer_count := COALESCE(NEW.performer_count, 1);`
  - `NEW.stage_number := COALESCE(NEW.stage_number, 1);`
  - `NEW.sort_order := COALESCE(NEW.sort_order, 0);`
  - `NEW.status := COALESCE(NEW.status, 'submitted');`
  - `NEW.additional_feedback_responses := COALESCE(NEW.additional_feedback_responses, '{}'::jsonb);`

### 3. Correct RLS SELECT Policy on `campus_events`
- Redefine `campus_events_select` to check role matching explicitly, ensuring students are blocked from viewing teacher-only announcements:
  ```sql
  CREATE POLICY campus_events_select ON public.campus_events 
  FOR SELECT USING (
    public.is_master_admin()
    OR (
      public.check_school_access(school_id)
      AND (
        created_by = public.get_current_user_id()
        OR (assigned_student_ids IS NOT NULL AND public.get_current_user_id() = ANY(assigned_student_ids))
        OR (
          (visibility = 'all')
          OR (visibility = 'teachers' AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
          OR (visibility = 'students' AND public.get_current_user_role() IN ('student', 'teacher', 'admin', 'secretary'))
        )
      )
    )
  );
  ```

### 4. Boundary Feedback Validation Adjustments
- Permit empty answers array `[]` in trigger checks even if questions array has items (resolving `T2_F8_3` which expects empty answers to be allowed for pending responses).

### 5. Test Harness Reversal
- Instruct the worker to restore `apps/groovelab/src/tests/run_e2e_tests.ts` by removing the `headers.set('x-bypass-forcing', 'true');` line.
