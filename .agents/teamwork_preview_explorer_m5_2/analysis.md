# Milestone 5 Analysis: Drag-and-Drop Program Board & Conflict Prevention

This analysis details findings and recommendations for implementing the Milestone 5 features: **Drag-and-Drop Program Board** and **Conflict Prevention** within the GrooveLab application.

## Summary of Findings
* The current timeline implementation (`CampusEventsBoard.tsx`) uses a static list of program points with swap buttons rather than a dynamic drag-and-drop board.
* The database schema (`campus_event_program_points` table and trigger) must be extended to support the `instrument` and `is_scheduled` columns, with strict RLS policies and validation constraints to lock modifications for non-admin roles (e.g., teachers).
* The E2E test suite mock engine (`run_e2e_tests.ts`) and test suite (`e2e_test_cases.ts`) are highly functional (currently passing 116/116 tests) and must be updated to mock and verify these scheduling features.

---

## 1. Database Schema and Migration Recommendation

### Migration file: `supabase/migrations/174_event_coordinator_drag_drop.sql`
A migration is required to add columns to the `campus_event_program_points` table and update the validation trigger. 

#### SQL Schema Changes:
```sql
-- Migration: 174_event_coordinator_drag_drop
-- Description: Adds 'instrument' and 'is_scheduled' columns, and updates the validation trigger.

-- 1. Alter Table
ALTER TABLE public.campus_event_program_points ADD COLUMN IF NOT EXISTS instrument TEXT;
ALTER TABLE public.campus_event_program_points ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. Update Validation Trigger Function to Lock Columns
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
    -- Coalesce null values for columns with default values
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

    -- Master admin bypasses all constraints
    v_is_master := public.is_master_admin();
    IF v_is_master THEN
        RETURN NEW;
    END IF;

    -- Detect session user (bypass if NULL, e.g., during migrations or seed scripts)
    v_user_id := public.get_current_user_id();
    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Retrieve user role
    v_role := public.get_current_user_role();

    -- ==========================================
    -- INSERT VALIDATIONS
    -- ==========================================
    IF TG_OP = 'INSERT' THEN
        -- Block students/guests from submitting program points
        IF v_role IS NULL OR v_role = 'student' THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        -- Enforce teacher constraints and defaults
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

            -- Force correct defaults for teacher submissions
            NEW.status := 'submitted';
            NEW.is_pause := false;
            NEW.sort_order := 0;
            NEW.stage_number := 1;
            NEW.is_scheduled := false; -- Teachers cannot insert directly into the active schedule
            
            -- Set or verify the teacher owner
            IF NEW.teacher_id IS NULL THEN
                NEW.teacher_id := v_user_id;
            ELSIF NEW.teacher_id IS DISTINCT FROM v_user_id THEN
                RAISE EXCEPTION 'Cannot insert program point for another teacher';
            END IF;
        END IF;

    -- ==========================================
    -- UPDATE VALIDATIONS
    -- ==========================================
    ELSIF TG_OP = 'UPDATE' THEN
        -- Block students/guests from updating
        IF v_role IS NULL OR v_role = 'student' THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;

        -- Enforce teacher update locks
        IF v_role = 'teacher' THEN
            -- Ensure they own the program point
            IF OLD.teacher_id IS DISTINCT FROM v_user_id THEN
                RAISE EXCEPTION 'Cannot modify another teacher''s program point';
            END IF;

            -- 1. Rejected status locks the point completely
            IF OLD.status = 'rejected' THEN
                RAISE EXCEPTION 'Cannot modify a rejected program point';
            END IF;

            -- 2. Approved status locks the name and instrument
            IF OLD.status = 'approved' AND OLD.name IS DISTINCT FROM NEW.name THEN
                RAISE EXCEPTION 'Cannot modify the name of an approved program point';
            END IF;
            IF OLD.status = 'approved' AND OLD.instrument IS DISTINCT FROM NEW.instrument THEN
                RAISE EXCEPTION 'Cannot modify the instrument of an approved program point';
            END IF;

            -- 3. Teachers cannot modify admin-only columns
            IF OLD.status IS DISTINCT FROM NEW.status
               OR OLD.stage_number IS DISTINCT FROM NEW.stage_number
               OR OLD.sort_order IS DISTINCT FROM NEW.sort_order
               OR OLD.is_pause IS DISTINCT FROM NEW.is_pause
               OR OLD.is_scheduled IS DISTINCT FROM NEW.is_scheduled -- Teachers cannot schedule/unschedule
               OR OLD.event_id IS DISTINCT FROM NEW.event_id
               OR OLD.school_id IS DISTINCT FROM NEW.school_id
               OR OLD.teacher_id IS DISTINCT FROM NEW.teacher_id
            THEN
                RAISE EXCEPTION 'Unauthorized column modification';
            END IF;

            -- 4. Block teachers from responding to cleared/deleted feedback requests
            IF (OLD.additional_feedback_responses IS NULL 
                OR NOT (OLD.additional_feedback_responses ? 'questions')
                OR jsonb_typeof(OLD.additional_feedback_responses->'questions') <> 'array'
                OR jsonb_array_length(OLD.additional_feedback_responses->'questions') = 0)
            THEN
                IF NEW.additional_feedback_responses IS DISTINCT FROM OLD.additional_feedback_responses THEN
                    RAISE EXCEPTION 'Cannot respond to a cleared/deleted feedback request';
                END IF;
            END IF;

            -- 5. Teachers cannot modify the feedback questions list
            IF COALESCE(OLD.additional_feedback_responses->'questions', '[]'::jsonb) IS DISTINCT FROM COALESCE(NEW.additional_feedback_responses->'questions', '[]'::jsonb) THEN
                RAISE EXCEPTION 'Teachers cannot modify feedback questions';
            END IF;
        END IF;
    END IF;

    -- ==========================================
    -- GLOBAL/SHARED VALIDATIONS (All Roles)
    -- ==========================================
    
    -- 1. Empty questions validation when requesting feedback
    IF NEW.additional_feedback_responses ? 'questions' 
       AND jsonb_typeof(NEW.additional_feedback_responses->'questions') = 'array' 
       AND NEW.additional_feedback_responses->>'status' IN ('pending', 'pending_response') 
    THEN
        IF jsonb_array_length(NEW.additional_feedback_responses->'questions') = 0 THEN
            RAISE EXCEPTION 'Questions list cannot be empty when requesting feedback';
        END IF;
    END IF;

    -- 2. Questions and answers length match validation on response submission
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

    -- 3. Block requesting feedback on a rejected program point
    IF NEW.status = 'rejected' 
       AND NEW.additional_feedback_responses ? 'status'
       AND NEW.additional_feedback_responses->>'status' IN ('pending', 'pending_response') 
    THEN
        RAISE EXCEPTION 'Cannot request feedback on a rejected program point';
    END IF;

    RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
```

---

## 2. React Two-Column Drag-and-Drop Board Layout

To build a high-fidelity drag-and-drop experience, integrate a two-column board structure within `CampusEventsBoard.tsx` when `coordinatorTab === 'timeline'` is active.

```tsx
{coordinatorTab === 'timeline' && (
  <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', height: '650px' }}>
    
    {/* COLUMN 1: Unscheduled Program Points Pool */}
    <div style={{ background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Ungeplante Beiträge</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>Beiträge hierher ziehen, um sie vom Ablaufplan zu entfernen.</p>
      </div>
      
      {/* Drop Zone: Pool */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDropOnPool(e)}
        style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        {programPoints.filter(pp => !pp.is_scheduled).map(pp => (
          <div
            key={pp.id}
            draggable
            onDragStart={(e) => handleDragStart(e, pp.id)}
            style={{
              padding: '12px',
              background: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              cursor: 'grab',
              fontSize: '0.8rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <strong>{pp.name}</strong>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: '#64748b' }}>
              <span>⏱️ {pp.duration} Min</span>
              {pp.instrument && <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>🎸 {pp.instrument}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* COLUMN 2: Multi-Stage Scheduled Timeline */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header controls: Add Pause and Manual Entry buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => setShowManualEntryModal(true)} style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
          + Manueller Eintrag
        </button>
        {/* Pause form inline */}
      </div>

      <div style={{ display: 'flex', gap: '16px', flex: 1, overflowX: 'auto' }}>
        {Array.from({ length: stageCount }).map((_, stageIdx) => {
          const stageNum = stageIdx + 1;
          const stagePoints = getSequentialStagePoints(stageNum);

          return (
            <div
              key={stageNum}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropOnStage(e, stageNum)}
              style={{
                flex: 1,
                minWidth: '280px',
                background: '#f8fafc',
                borderRadius: '16px',
                border: '1.5px dashed #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9', textAlign: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>Bühne {stageNum}</h4>
              </div>

              <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stagePoints.map((pp, index) => {
                  const conflict = checkTeacherConflict(pp, stagePoints);
                  return (
                    <div
                      key={pp.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, pp.id)}
                      style={{
                        padding: '12px',
                        background: pp.is_pause ? '#fffbeb' : '#ffffff',
                        borderRadius: '12px',
                        border: conflict ? '2px solid #ef4444' : (pp.is_pause ? '1px solid #fef3c7' : '1px solid #e2e8f0'),
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        cursor: 'grab'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', display: 'block' }}>
                            {pp.calculated_start_time} - {pp.calculated_end_time}
                          </span>
                          <strong style={{ fontSize: '0.82rem' }}>{pp.name}</strong>
                        </div>
                        {conflict && (
                          <span style={{ background: '#fef2f2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 800 }}>
                            ⚠️ Konflikt
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.7rem', color: '#64748b' }}>
                        <span>⏱️ {pp.duration} Min</span>
                        {pp.instrument && <span style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>🎸 {pp.instrument}</span>}
                      </div>
                      {conflict && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.65rem', color: '#ef4444', fontWeight: 600 }}>
                          {conflict}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
)}
```

### Drag & Drop State Sync Handlers:
```typescript
const handleDragStart = (e: React.DragEvent, id: string) => {
  e.dataTransfer.setData('text/plain', id);
  e.dataTransfer.effectAllowed = 'move';
};

const handleDropOnStage = async (e: React.DragEvent, targetStage: number) => {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  if (!id) return;

  const targetPoints = programPoints.filter(pp => pp.is_scheduled && pp.stage_number === targetStage);
  const newSortOrder = targetPoints.length;

  try {
    const { error } = await supabase
      .from('campus_event_program_points')
      .update({
        is_scheduled: true,
        stage_number: targetStage,
        sort_order: newSortOrder,
        status: 'approved' // Automatically approve when dragged onto stage
      })
      .eq('id', id);

    if (error) throw error;
    
    // Update local state
    setProgramPoints(prev => prev.map(pp => 
      pp.id === id ? { ...pp, is_scheduled: true, stage_number: targetStage, sort_order: newSortOrder, status: 'approved' } : pp
    ));
  } catch (err: any) {
    alert('Fehler beim Platzieren: ' + err.message);
  }
};

const handleDropOnPool = async (e: React.DragEvent) => {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  if (!id) return;

  try {
    const { error } = await supabase
      .from('campus_event_program_points')
      .update({ is_scheduled: false })
      .eq('id', id);

    if (error) throw error;
    
    // Update local state
    setProgramPoints(prev => prev.map(pp => 
      pp.id === id ? { ...pp, is_scheduled: false } : pp
    ));
  } catch (err: any) {
    alert('Fehler beim Entfernen aus dem Ablaufplan: ' + err.message);
  }
};
```

---

## 3. Magnetic Snapping & Sequential Times Calculation

By sorting elements strictly by `sort_order` and calculating their execution times based on the cumulative duration of preceding acts, we create a **magnetic snapping layout** that automatically pulls acts together and avoids scheduling gaps.

### Calculations Logic:
```typescript
interface EnrichedProgramPoint extends CampusEvent {
  calculated_start_time: string;
  calculated_end_time: string;
}

// Enriches a list of stage program points with sequential times
const calculateSequentialTimes = (
  eventStartTime: string, // e.g. "18:00"
  points: any[]
): EnrichedProgramPoint[] => {
  const baseTime = eventStartTime || '00:00';
  let cumulativeMinutes = 0;

  return points
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(pp => {
      const start = addMinutesToTimeStr(baseTime, cumulativeMinutes);
      cumulativeMinutes += pp.duration;
      const end = addMinutesToTimeStr(baseTime, cumulativeMinutes);

      return {
        ...pp,
        calculated_start_time: start,
        calculated_end_time: end
      };
    });
};

// Helper to add minutes to time string (handles midnight crossing)
const addMinutesToTimeStr = (timeStr: string, minutesToAdd: number): string => {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);

  const totalMinutes = h * 60 + m + minutesToAdd;
  const finalHours = Math.floor(totalMinutes / 60) % 24;
  const finalMinutes = totalMinutes % 60;

  return `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
};
```

Whenever items are moved or their durations change, sorting is reapplied and offsets recalculate dynamically, creating a gap-free timeline.

---

## 4. Teacher Conflict / Double-Booking Prevention

A conflict occurs if a teacher is assigned to a program point that overlaps with:
1. A scheduled **lesson** for that teacher on the same date.
2. **Another program point** (in the current event or another event) at the same time.

### React Verification Logic:
```typescript
// Fetches external lessons on the day of the event
const [teacherLessons, setTeacherLessons] = useState<any[]>([]);

useEffect(() => {
  if (!selectedEvent) return;
  const fetchDayLessons = async () => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('date', selectedEvent.event_date);
    setTeacherLessons(data || []);
  };
  fetchDayLessons();
}, [selectedEvent]);

// Checks if a program point has an overlap conflict
const checkTeacherConflict = (currentPp: any, stagePoints: any[]): string | null => {
  if (!currentPp.teacher_id || currentPp.is_pause) return null;

  const currentStart = timeToMinutes(currentPp.calculated_start_time);
  const currentEnd = timeToMinutes(currentPp.calculated_end_time);

  // 1. Check lessons overlap
  const teacherDayLessons = teacherLessons.filter(l => l.teacher_id === currentPp.teacher_id);
  for (const lesson of teacherDayLessons) {
    const lessonStart = timeToMinutes(lesson.start_time);
    const lessonEnd = lessonStart + lesson.duration;

    if (currentStart < lessonEnd && lessonStart < currentEnd) {
      return `Kollision mit Unterrichtsstunde (${lesson.start_time} - ${addMinutesToTimeStr(lesson.start_time, lesson.duration)})`;
    }
  }

  // 2. Check program points overlap (including other stages)
  const allScheduledDayPoints = programPoints.filter(pp => 
    pp.is_scheduled && 
    pp.id !== currentPp.id && 
    pp.teacher_id === currentPp.teacher_id
  );

  // Note: Ensure all compared program points have calculated start/end times
  for (const otherPp of allScheduledDayPoints) {
    if (!otherPp.calculated_start_time || !otherPp.calculated_end_time) continue;
    const otherStart = timeToMinutes(otherPp.calculated_start_time);
    const otherEnd = timeToMinutes(otherPp.calculated_end_time);

    if (currentStart < otherEnd && otherStart < currentEnd) {
      return `Kollision mit Beitrag "${otherPp.name}" (Bühne ${otherPp.stage_number}: ${otherPp.calculated_start_time} - ${otherPp.calculated_end_time})`;
    }
  }

  return null;
};

const timeToMinutes = (timeStr: string): number => {
  const parts = timeStr.split(':');
  return parseInt(parts[0] || '0', 10) * 60 + parseInt(parts[1] || '0', 10);
};
```

---

## 5. Manual Entries Modal Implementation

To allow coordinators to add speeches, intermissions, or setup times, introduce a **Manual Entry Modal**.

### Modal Fields & State:
```tsx
const [showManualEntryModal, setShowManualEntryModal] = useState(false);
const [entryName, setEntryName] = useState('');
const [entryDuration, setEntryDuration] = useState('10');
const [entryInstrument, setEntryInstrument] = useState('');
const [entryIsPause, setEntryIsPause] = useState(false);
const [entryStage, setEntryStage] = useState(1);
const [entryTech, setEntryTech] = useState('');
```

### Save Handler:
```typescript
const handleCreateManualEntry = async () => {
  if (!entryName.trim()) {
    alert('Bitte Namen angeben.');
    return;
  }
  const durVal = parseInt(entryDuration, 10);
  if (isNaN(durVal) || durVal <= 0) {
    alert('Ungültige Dauer.');
    return;
  }

  try {
    const targetStagePoints = programPoints.filter(pp => pp.is_scheduled && pp.stage_number === entryStage);
    
    const { data, error } = await supabase
      .from('campus_event_program_points')
      .insert({
        event_id: selectedEvent.id,
        school_id: schoolId,
        name: entryName.trim(),
        duration: durVal,
        instrument: entryInstrument.trim() || null,
        is_pause: entryIsPause,
        stage_number: entryStage,
        sort_order: targetStagePoints.length,
        is_scheduled: true, // Placed directly on schedule
        status: 'approved' // Automatically approved
      })
      .select()
      .single();

    if (error) throw error;
    
    setProgramPoints(prev => [...prev, data]);
    setShowManualEntryModal(false);
    // Reset form fields
    setEntryName('');
    setEntryDuration('10');
    setEntryInstrument('');
    setEntryIsPause(false);
  } catch (err: any) {
    alert('Fehler beim Erstellen des Eintrags: ' + err.message);
  }
};
```

---

## 6. E2E Test Cases Structure & Integration

To verify these implementations without breaking existing coverage, add the columns to the mock engine in `run_e2e_tests.ts` and define new tests in `e2e_test_cases.ts` (using Feature Code `F11`).

### Mock Database Adjustments (`run_e2e_tests.ts`):
1. In `ProgramPoint` interface, append:
   ```typescript
   instrument?: string;
   is_scheduled: boolean;
   ```
2. In `MockDatabase.runQuery` (under `campus_event_program_points` table insert check):
   ```typescript
   // Default is_scheduled to false
   const is_scheduled = row.is_scheduled === undefined ? false : row.is_scheduled;
   const instrument = row.instrument || null;

   // If teacher is inserting: force is_scheduled to false
   if (user && user.role === 'teacher') {
     if (is_scheduled === true) {
       throw { message: 'Teachers cannot insert scheduled program points', code: '42501' };
     }
   }
   ```
3. In `MockDatabase.runQuery` (under update checks):
   ```typescript
   if (user && user.role === 'teacher') {
     if (options.updateData.is_scheduled !== undefined) {
       throw { message: 'Unauthorized column modification', code: '42501' };
     }
     if (item.status === 'approved' && options.updateData.instrument !== undefined) {
       throw { message: 'Cannot modify the instrument of an approved program point', code: '42501' };
     }
   }
   ```

### Proposed E2E Test Cases (`e2e_test_cases.ts`):

#### Tier 1: Feature Verification
* **`T1_F11_1: Admin can schedule program point`**
  Verify admin can set `is_scheduled = true`, set `stage_number = 2`, and set `instrument` for a program point.
* **`T1_F11_2: Teacher cannot bypass schedule locking`**
  Ensure teachers are blocked from setting `is_scheduled = true` on insert or update.
* **`T1_F11_3: Calculate sequential times and offsets`**
  Verify in-memory chronological calculations properly sequence items (0, +15 min, +30 min) based on stage sort order.
* **`T1_F11_4: Create manual entries`**
  Verify admin can insert program points directly with `is_scheduled = true`, status `approved`, and `is_pause = true/false`.
* **`T1_F11_5: Detect teacher lessons double-booking`**
  Add a scheduled program point overlapping with a seeded lesson for the same teacher and verify that the front-end conflict checker returns a conflict error/warning.

#### Tier 2: Boundary Tests
* **`T2_F11_1: Lock instrument for approved program point`**
  Ensure database validation throws an error if teacher attempts to modify `instrument` once status is `approved`.
* **`T2_F11_2: Magnetic snapping shifts subsequent items`**
  Assert that updating the duration of the first item on a stage shifts the calculated start time of the second item automatically.

#### Tier 3: Flow / Pipeline Integration
* **`T3_F11_1: End-to-end event planning sequence`**
  1. Teacher submits program point with name "Solo" and instrument "Guitar".
  2. Secretary approves the point.
  3. Secretary schedules the point on Stage 1.
  4. Conflict detection identifies overlap with a lesson.
  5. Secretary drags it to Stage 2 (resolving conflict).
  6. Exporter validates the final correct sequential time slots and instrument in the CSV payload.
