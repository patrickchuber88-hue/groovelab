# Analysis Report: Milestone 5 - Drag-and-Drop Program Board & Conflict Prevention

This analysis details the recommendations for implementing the Drag-and-Drop Program Board and Conflict Prevention features for Milestone 5 of the Groovelab App.

---

## 1. Database Schema & Migration Requirements

### Schema Additions
To support Milestone 5, the `campus_event_program_points` table requires two new columns:
1. `instrument` (`TEXT NULL`): Captures the specific instrument associated with the program point.
2. `is_scheduled` (`BOOLEAN DEFAULT FALSE NOT NULL`): Tracks whether the program point has been placed onto a stage timeline.

### Migration Script
A new migration file should be created: `supabase/migrations/174_add_instrument_and_is_scheduled_to_program_points.sql`.

```sql
-- Migration: 174_add_instrument_and_is_scheduled_to_program_points
-- Description: Adds instrument and is_scheduled columns, and updates the validation trigger.

-- 1. Add columns to campus_event_program_points
ALTER TABLE public.campus_event_program_points ADD COLUMN IF NOT EXISTS instrument TEXT NULL;
ALTER TABLE public.campus_event_program_points ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. Update trigger function to prevent unauthorized scheduling mutations by teachers
CREATE OR REPLACE FUNCTION public.validate_campus_event_program_point()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET row_security = off
AS $$
DECLARE
    v_role public.user_role;
    v_user_id uuid;
    v_is_master boolean;
BEGIN
    NEW.id := COALESCE(NEW.id, gen_random_uuid());
    NEW.chairs_needed := COALESCE(NEW.chairs_needed, 0);
    NEW.music_stands_needed := COALESCE(NEW.music_stands_needed, 0);
    NEW.is_pause := COALESCE(NEW.is_pause, FALSE);
    NEW.performer_count := COALESCE(NEW.performer_count, 1);
    NEW.stage_number := COALESCE(NEW.stage_number, 1);
    NEW.sort_order := COALESCE(NEW.sort_order, 0);
    NEW.status := COALESCE(NEW.status, 'submitted');
    NEW.additional_feedback_responses := COALESCE(NEW.additional_feedback_responses, '{}'::jsonb);
    NEW.is_scheduled := COALESCE(NEW.is_scheduled, FALSE);

    v_is_master := public.is_master_admin();
    IF v_is_master THEN
        RETURN NEW;
    END IF;

    v_user_id := public.get_current_user_id();
    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_role := public.get_current_user_role();

    -- INSERT VALIDATIONS
    IF TG_OP = 'INSERT' THEN
        IF v_role IS NULL OR v_role = 'student' THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_role = 'teacher' THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.campus_events
                WHERE id = NEW.event_id 
                  AND (
                    visibility IN ('teachers', 'all', 'students')
                    OR (visibility = 'private' AND created_by = v_user_id)
                  )
            ) THEN
                RAISE EXCEPTION 'Cannot submit program point for another user''s private event';
            END IF;

            NEW.status := 'submitted';
            NEW.is_pause := false;
            NEW.sort_order := 0;
            NEW.stage_number := 1;
            NEW.is_scheduled := false;
            
            IF NEW.teacher_id IS NULL THEN
                NEW.teacher_id := v_user_id;
            ELSIF NEW.teacher_id IS DISTINCT FROM v_user_id THEN
                RAISE EXCEPTION 'Cannot insert program point for another teacher';
            END IF;
        END IF;

    -- UPDATE VALIDATIONS
    ELSIF TG_OP = 'UPDATE' THEN
        IF v_role IS NULL OR v_role = 'student' THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        IF v_role = 'teacher' THEN
            IF OLD.teacher_id IS DISTINCT FROM v_user_id THEN
                RAISE EXCEPTION 'Cannot modify another teacher''s program point';
            END IF;

            IF OLD.status = 'rejected' THEN
                RAISE EXCEPTION 'Cannot modify a rejected program point';
            END IF;

            IF OLD.status = 'approved' AND OLD.name IS DISTINCT FROM NEW.name THEN
                RAISE EXCEPTION 'Cannot modify the name of an approved program point';
            END IF;

            -- Prevent teachers from modifying admin-only columns, including scheduling
            IF OLD.status IS DISTINCT FROM NEW.status
               OR OLD.stage_number IS DISTINCT FROM NEW.stage_number
               OR OLD.sort_order IS DISTINCT FROM NEW.sort_order
               OR OLD.is_pause IS DISTINCT FROM NEW.is_pause
               OR OLD.event_id IS DISTINCT FROM NEW.event_id
               OR OLD.school_id IS DISTINCT FROM NEW.school_id
               OR OLD.teacher_id IS DISTINCT FROM NEW.teacher_id
               OR OLD.is_scheduled IS DISTINCT FROM NEW.is_scheduled
            THEN
                RAISE EXCEPTION 'Unauthorized column modification';
            END IF;

            IF (OLD.additional_feedback_responses IS NULL 
                OR NOT (OLD.additional_feedback_responses ? 'questions')
                OR jsonb_typeof(OLD.additional_feedback_responses->'questions') <> 'array'
                OR jsonb_array_length(OLD.additional_feedback_responses->'questions') = 0)
            THEN
                IF NEW.additional_feedback_responses IS DISTINCT FROM OLD.additional_feedback_responses THEN
                    RAISE EXCEPTION 'Cannot respond to a cleared/deleted feedback request';
                END IF;
            END IF;

            IF COALESCE(OLD.additional_feedback_responses->'questions', '[]'::jsonb) IS DISTINCT FROM COALESCE(NEW.additional_feedback_responses->'questions', '[]'::jsonb) THEN
                RAISE EXCEPTION 'Teachers cannot modify feedback questions';
            END IF;
        END IF;
    END IF;

    -- GLOBAL/SHARED VALIDATIONS
    IF NEW.additional_feedback_responses ? 'questions' 
       AND jsonb_typeof(NEW.additional_feedback_responses->'questions') = 'array' 
       AND NEW.additional_feedback_responses->>'status' IN ('pending', 'pending_response') 
    THEN
        IF jsonb_array_length(NEW.additional_feedback_responses->'questions') = 0 THEN
            RAISE EXCEPTION 'Questions list cannot be empty when requesting feedback';
        END IF;
    END IF;

    IF NEW.additional_feedback_responses->>'status' = 'responded' THEN
        IF NOT (NEW.additional_feedback_responses ? 'questions' AND jsonb_typeof(NEW.additional_feedback_responses->'questions') = 'array')
           OR NOT (NEW.additional_feedback_responses ? 'answers' AND jsonb_typeof(NEW.additional_feedback_responses->'answers') = 'array')
        THEN
            RAISE EXCEPTION 'Answers length must match questions length';
        ELSIF jsonb_array_length(NEW.additional_feedback_responses->'answers') > 0
           AND jsonb_array_length(NEW.additional_feedback_responses->'questions') IS DISTINCT FROM jsonb_array_length(NEW.additional_feedback_responses->'answers')
        THEN
            RAISE EXCEPTION 'Answers length must match questions length';
        END IF;
    END IF;

    IF NEW.status = 'rejected' 
       AND NEW.additional_feedback_responses ? 'status'
       AND NEW.additional_feedback_responses->>'status' IN ('pending', 'pending_response') 
    THEN
        RAISE EXCEPTION 'Cannot request feedback on a rejected program point';
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
```

---

## 2. React Two-Column Drag-and-Drop Layout

To construct the scheduler layout in React:
- **Left Column**: Approved, Unscheduled Program Points (`is_scheduled === false` and `status === 'approved'`).
- **Right Column**: Board containing individual Stage Columns (from Stage 1 to `stage_count`). Each Stage Column acts as a drop target zone.

### Drag & Drop State and UI Implementation Structure
```tsx
// CampusEventsBoard.tsx - Proposed Scheduler View inside timeline tab

export function SchedulerBoard({ programPoints, stageCount, onUpdatePoint }) {
  const unscheduledPoints = programPoints.filter(pp => !pp.is_scheduled && pp.status === 'approved');
  
  const handleDragStart = (e: React.DragEvent, ppId: string) => {
    e.dataTransfer.setData('text/plain', ppId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnStage = async (e: React.DragEvent, stageNumber: number) => {
    e.preventDefault();
    const ppId = e.dataTransfer.getData('text/plain');
    if (!ppId) return;

    // Calculate new sort_order (append to end of stage list)
    const stagePoints = programPoints.filter(pp => pp.is_scheduled && pp.stage_number === stageNumber);
    const newSortOrder = stagePoints.length;

    await onUpdatePoint(ppId, {
      is_scheduled: true,
      stage_number: stageNumber,
      sort_order: newSortOrder
    });
  };

  const handleDropOnUnscheduled = async (e: React.DragEvent) => {
    e.preventDefault();
    const ppId = e.dataTransfer.getData('text/plain');
    if (!ppId) return;

    await onUpdatePoint(ppId, {
      is_scheduled: false,
      sort_order: 0
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', height: '600px' }}>
      {/* Column 1: Unscheduled Program Points Pool */}
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDropOnUnscheduled}
        style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '2px dashed #cbd5e1', overflowY: 'auto' }}
      >
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.86rem', fontWeight: 800 }}>📥 Ungeplant ({unscheduledPoints.length})</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {unscheduledPoints.map(pp => (
            <div
              key={pp.id}
              draggable
              onDragStart={(e) => handleDragStart(e, pp.id)}
              style={{ padding: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'grab' }}
            >
              <strong style={{ fontSize: '0.8rem', display: 'block' }}>{pp.name}</strong>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>⏱️ {pp.duration} Min | 🎸 {pp.instrument || 'Kein Instrument'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: Stage Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stageCount}, 1fr)`, gap: '16px', overflowX: 'auto' }}>
        {Array.from({ length: stageCount }, (_, idx) => {
          const stageNumber = idx + 1;
          const stagePoints = programPoints
            .filter(pp => pp.is_scheduled && pp.stage_number === stageNumber)
            .sort((a, b) => a.sort_order - b.sort_order);

          return (
            <div
              key={stageNumber}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnStage(e, stageNumber)}
              style={{ background: '#f1f5f9', padding: '16px', borderRadius: '16px', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 800 }}>🎭 Bühne {stageNumber}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {stagePoints.map((pp, listIdx) => (
                  <div
                    key={pp.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, pp.id)}
                    style={{ padding: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'grab' }}
                  >
                    <strong style={{ fontSize: '0.8rem', display: 'block' }}>{pp.name}</strong>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>⏱️ {pp.duration} Min</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 3. Sequential Time Calculations & Magnetic Snapping

Because the schedule relies on "magnetic snapping" (each act immediately follows the previous one), calculated times are strictly derived in the UI from the event's start time and sequential durations.

### Calculation Logic
Given:
- `event_start_time`: e.g. `"14:30"`
- `stagePoints` sorted by `sort_order`

```typescript
export function calculateTimelineTimes(stagePoints: any[], eventStartTime: string) {
  if (!eventStartTime) return stagePoints;
  const [startH, startM] = eventStartTime.split(':').map(Number);
  let currentMinutes = startH * 60 + startM;

  return stagePoints.map(pp => {
    // Start Time String
    const sh = Math.floor(currentMinutes / 60) % 24;
    const sm = currentMinutes % 60;
    const startTimeStr = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;

    // Add duration
    currentMinutes += pp.duration;

    // End Time String
    const eh = Math.floor(currentMinutes / 60) % 24;
    const em = currentMinutes % 60;
    const endTimeStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

    return {
      ...pp,
      calculated_start: startTimeStr,
      calculated_end: endTimeStr,
    };
  });
}
```

---

## 4. Teacher Conflict Double-Booking Checks

A conflict exists if a teacher is assigned to multiple overlapping program points or lessons on the same day.

### Implementation Logic
1. Load lessons scheduled for the event date:
   ```typescript
   const { data: lessons } = await supabase.from('lessons').eq('date', eventDate);
   ```
2. Convert all times (lessons and program points) to minutes-from-midnight on that day to ease bounds comparison.
3. Compare bounds using overlap logic: `start1 < end2 && end1 > start2`.

```typescript
function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function detectTeacherConflicts(scheduledPoints: any[], lessons: any[]) {
  // 1. Map all points to their minutes ranges
  const pointsWithMinutes = scheduledPoints.map(pp => ({
    ...pp,
    startMin: parseTimeToMinutes(pp.calculated_start),
    endMin: parseTimeToMinutes(pp.calculated_end)
  }));

  // 2. Map all lessons to minutes ranges
  const lessonsWithMinutes = lessons.map(l => {
    const startMin = parseTimeToMinutes(l.start_time);
    return {
      ...l,
      startMin,
      endMin: startMin + l.duration
    };
  });

  // 3. Perform overlap checking
  return pointsWithMinutes.map(pp => {
    if (!pp.teacher_id) return { ...pp, hasConflict: false, conflictDetails: null };

    // Check overlap with another program point
    const doubleBookedPoint = pointsWithMinutes.find(other => 
      other.id !== pp.id &&
      other.teacher_id === pp.teacher_id &&
      pp.startMin < other.endMin &&
      pp.endMin > other.startMin
    );

    if (doubleBookedPoint) {
      return {
        ...pp,
        hasConflict: true,
        conflictDetails: `Double-booking: Überschneidet sich mit "${doubleBookedPoint.name}"`
      };
    }

    // Check overlap with a private lesson
    const conflictingLesson = lessonsWithMinutes.find(lesson => 
      lesson.teacher_id === pp.teacher_id &&
      pp.startMin < lesson.endMin &&
      pp.endMin > lesson.startMin
    );

    if (conflictingLesson) {
      return {
        ...pp,
        hasConflict: true,
        conflictDetails: `Unterrichts-Konflikt: Überschneidet sich mit Einzelunterricht (${conflictingLesson.start_time} - ${conflictingLesson.endMin} min)`
      };
    }

    return { ...pp, hasConflict: false, conflictDetails: null };
  });
}
```

---

## 5. Manual Entries Modal

Allows coordinators to directly add approved, scheduled entries (pauses, MC announcements, guest acts) to the timeline.

### Form State & Insertion Logic
```tsx
export function ManualEntryModal({ isOpen, onClose, onSave, defaultStageNumber }) {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(10);
  const [teacherId, setTeacherId] = useState('');
  const [ensembleBand, setEnsembleBand] = useState('');
  const [instrument, setInstrument] = useState('');
  const [stageNumber, setStageNumber] = useState(defaultStageNumber || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Titel erforderlich');

    onSave({
      name,
      duration,
      teacher_id: teacherId || null,
      ensemble_band: ensembleBand || null,
      instrument: instrument || null,
      stage_number: stageNumber,
      is_scheduled: true,
      status: 'approved' // Automatically approved since it is created by coordinator
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <form onSubmit={handleSubmit} className="modal-content">
        <h3>➕ Manueller Programmpunkt</h3>
        <input placeholder="Name (z.B. Eröffnungsrede)" value={name} onChange={e => setName(e.target.value)} required />
        <input type="number" placeholder="Dauer (Minuten)" value={duration} onChange={e => setDuration(Number(e.target.value))} required />
        <input placeholder="Ensemble / Band" value={ensembleBand} onChange={e => setEnsembleBand(e.target.value)} />
        <input placeholder="Instrument" value={instrument} onChange={e => setInstrument(e.target.value)} />
        <select value={stageNumber} onChange={e => setStageNumber(Number(e.target.value))}>
          <option value={1}>Bühne 1</option>
          <option value={2}>Bühne 2</option>
        </select>
        <button type="submit">Hinzufügen</button>
        <button type="button" onClick={onClose}>Abbrechen</button>
      </form>
    </div>
  );
}
```

---

## 6. E2E Test Cases Structure

To verify these additions, append the following E2E test cases to `apps/groovelab/src/tests/e2e_test_cases.ts` and update `MockDatabase` in `run_e2e_tests.ts` to support the new schema fields and validations.

### Recommended Test Cases code

```typescript
  // ==========================================
  // TIER 3: Milestone 5 Scheduling & Conflict Prevention
  // ==========================================

  {
    id: 'T3_M5_1',
    name: 'M5: Database insertion supports instrument and is_scheduled columns',
    tier: 3,
    feature: 'M5',
    description: 'Ensure new columns default and insert correctly.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const ppId = uuid();
      const { data, error } = await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Instrument Act',
        duration: 15,
        instrument: 'Violin',
        is_scheduled: true
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Data not returned');
      if (data.instrument !== 'Violin') throw new Error('Failed to save instrument');
      if (data.is_scheduled !== true) throw new Error('Failed to save is_scheduled state');
    }
  },
  {
    id: 'T3_M5_2',
    name: 'M5: Teacher is blocked from scheduling program points (is_scheduled lock)',
    tier: 3,
    feature: 'M5',
    description: 'Ensure teachers cannot bypass scheduling restrictions.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      
      // Submit initially
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Teacher Act 1',
        duration: 10
      });

      // Try to schedule own point (must throw trigger restriction)
      const { error } = await client.from('campus_event_program_points')
        .update({ is_scheduled: true, stage_number: 2 })
        .eq('id', ppId);
      
      if (!error) throw new Error('Teacher should be blocked from scheduling points');
    }
  },
  {
    id: 'T3_M5_3',
    name: 'M5: Admin can schedule program points successfully',
    tier: 3,
    feature: 'M5',
    description: 'Verify admins can move points onto a stage.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Admin-Scheduled Act',
        duration: 10
      });

      const { data, error } = await client.from('campus_event_program_points')
        .update({ is_scheduled: true, stage_number: 2, sort_order: 1 })
        .eq('id', ppId);

      if (error) throw new Error(error.message);
      if (!data || data[0].is_scheduled !== true || data[0].stage_number !== 2) {
        throw new Error('Staging/scheduling update failed for admin');
      }
    }
  },
  {
    id: 'T3_M5_4',
    name: 'M5: Overlapping program points for the same teacher flags conflict',
    tier: 3,
    feature: 'M5',
    description: 'Ensure two acts overlapping in calculated sequential times trigger conflict.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const pp1Id = uuid();
      const pp2Id = uuid();

      // Add two program points for teacher-1
      await client.from('campus_event_program_points').insert([
        { id: pp1Id, event_id: 'event-1', school_id: 'school-1', teacher_id: 'teacher-1', name: 'Act 1', duration: 30, stage_number: 1, sort_order: 0, is_scheduled: true, status: 'approved' },
        { id: pp2Id, event_id: 'event-1', school_id: 'school-1', teacher_id: 'teacher-1', name: 'Act 2', duration: 30, stage_number: 2, sort_order: 0, is_scheduled: true, status: 'approved' }
      ]);

      const { data, error } = await client.from('campus_event_program_points')
        .select('*')
        .eq('event_id', 'event-1')
        .eq('is_scheduled', true);

      if (error) throw new Error(error.message);

      // Perform local validation using the recommended conflict checker
      const eventStart = '14:00'; // Event-1 default start time
      const stage1 = calculateTimelineTimes(data.filter((pp: any) => pp.stage_number === 1), eventStart);
      const stage2 = calculateTimelineTimes(data.filter((pp: any) => pp.stage_number === 2), eventStart);

      const combined = [...stage1, ...stage2];
      const conflicts = detectTeacherConflicts(combined, []);
      
      const hasConflicts = conflicts.every((c: any) => c.hasConflict === true);
      if (!hasConflicts) {
        throw new Error('Conflict checker failed to detect overlapping program points for teacher');
      }
    }
  },
  {
    id: 'T3_M5_5',
    name: 'M5: Program point overlapping with teacher lesson flags conflict',
    tier: 3,
    feature: 'M5',
    description: 'Ensure a scheduled point overlapping with teacher lesson flags conflict.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const ppId = uuid();

      // Add point for teacher-1 on stage 1 (starts at 14:00, ends at 14:30)
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        teacher_id: 'teacher-1',
        name: 'Lesson Overlap Act',
        duration: 30,
        stage_number: 1,
        sort_order: 0,
        is_scheduled: true,
        status: 'approved'
      });

      // Seed conflicting lesson (starts 14:15, duration 45 mins)
      await client.from('lessons').insert({
        id: uuid(),
        teacher_id: 'teacher-1',
        student_id: 'student-1',
        school_id: 'school-1',
        date: '2026-07-01', // Date of event-1
        start_time: '14:15',
        duration: 45,
        status: 'scheduled'
      });

      const { data: ppData } = await client.from('campus_event_program_points').select('*').eq('id', ppId);
      const { data: lessonData } = await client.from('lessons').select('*').eq('teacher_id', 'teacher-1');

      const stage1Calculated = calculateTimelineTimes(ppData, '14:00');
      const conflicts = detectTeacherConflicts(stage1Calculated, lessonData);

      if (!conflicts[0].hasConflict) {
        throw new Error('Conflict checker failed to detect lesson overlap');
      }
    }
  }
```

---

## 7. Mock Database Updates in `run_e2e_tests.ts`

To ensure E2E tests execute properly under mock mode, `MockDatabase` must be modified:
1. Update TS interfaces:
   ```typescript
   interface ProgramPoint {
     // ...
     instrument?: string;
     is_scheduled: boolean;
   }
   ```
2. Update the default columns in `runQuery` under `campus_event_program_points` table insert:
   ```typescript
   const is_scheduled = row.is_scheduled || false;
   const instrument = row.instrument || null;
   ```
3. Implement trigger check bypass in `update` queries when a teacher tries to update `is_scheduled`:
   ```typescript
   if (user && user.role === 'teacher') {
     if (options.updateData.is_scheduled !== undefined) {
       throw { message: 'Unauthorized column modification', code: '42501' };
     }
   }
   ```
