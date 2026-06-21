# Analysis & Recommendations: Milestone 5 - Drag-and-Drop Program Board & Conflict Prevention

This analysis details the recommendations for implementing the Drag-and-Drop Program Board and Conflict Prevention features for Milestone 5 of the Groovelab App.

---

## 1. Database Schema & Migration Requirements

### Why Migration is Needed
The database currently does not store the specific instrument associated with an act, nor does it track whether an act has been scheduled on the board or remains in the unscheduled pool. To support these features, a database migration is necessary to add these fields and to update the validation triggers to enforce business rules.

### Schema Additions
Two new columns must be added to the `public.campus_event_program_points` table:
1. `instrument` (`TEXT NULL`): Captures the specific instrument associated with the program point.
2. `is_scheduled` (`BOOLEAN DEFAULT FALSE NOT NULL`): Tracks whether the program point has been placed onto a stage timeline.

### Updated Trigger Function
To ensure database integrity and role security, the trigger function `public.validate_campus_event_program_point()` must be updated to:
- Reset `is_scheduled` to `false` for teacher submissions during `INSERT` (so teachers cannot auto-schedule their program points).
- Prevent teachers from mutating the `is_scheduled` column during `UPDATE` queries. This matches the existing admin-only column constraints.

### Proposed Migration File (`supabase/migrations/174_add_instrument_and_is_scheduled_to_program_points.sql`)

```sql
-- Migration: 174_add_instrument_and_is_scheduled_to_program_points
-- Description: Adds instrument and is_scheduled columns to campus_event_program_points, and updates the validation trigger.

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

    -- ==========================================
    -- INSERT VALIDATIONS
    -- ==========================================
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
            NEW.is_scheduled := false; -- Prevent teachers from auto-scheduling
            
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

            -- Prevent teachers from modifying admin-only columns, including scheduling-related columns
            IF OLD.status IS DISTINCT FROM NEW.status
               OR OLD.stage_number IS DISTINCT FROM NEW.stage_number
               OR OLD.sort_order IS DISTINCT FROM NEW.sort_order
               OR OLD.is_pause IS DISTINCT FROM NEW.is_pause
               OR OLD.event_id IS DISTINCT FROM NEW.event_id
               OR OLD.school_id IS DISTINCT FROM NEW.school_id
               OR OLD.teacher_id IS DISTINCT FROM NEW.teacher_id
               OR OLD.is_scheduled IS DISTINCT FROM NEW.is_scheduled -- Guard is_scheduled
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

    -- ==========================================
    -- GLOBAL/SHARED VALIDATIONS
    -- ==========================================
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

To replace the simple vertical list in the `timeline` tab, we recommend implementing a two-column board:

- **Left Column**: Unscheduled Pool. Displays program points where `is_scheduled` is `false` and status is `'approved'` (or submitted, if we want to show all approved/submitted points that are not yet on the board).
- **Right Column**: Scheduled Board. Displays vertical columns for each stage (Stage 1 up to `stage_count`).
  - Active stage selector: If `stage_count > 1`, a tab-bar or dropdown at the top allows users to filter the active stage, or view all stages side by side in a scrollable horizontal layout.
  - Drop Target: Both the Unscheduled column and each Stage column are registered as HTML5 Drag-and-Drop drop zones.

### Recommended Component Implementation Sketch

```tsx
// React Drag-and-Drop implementation sketch inside CampusEventsBoard.tsx

interface SchedulerProps {
  programPoints: any[];
  stageCount: number;
  eventStartTime: string;
  onUpdatePoint: (id: string, updates: any) => Promise<void>;
  teachersList: any[];
}

export function DragDropScheduler({ programPoints, stageCount, eventStartTime, onUpdatePoint, teachersList }: SchedulerProps) {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Filter unscheduled points (only approved points can be scheduled)
  const unscheduledPoints = programPoints.filter(pp => !pp.is_scheduled && pp.status === 'approved');

  // Filter scheduled points for the active stage, sorted by sort_order
  const scheduledStagePoints = programPoints
    .filter(pp => pp.is_scheduled && pp.stage_number === activeStage)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Calculate sequential times with magnetic snapping
  const calculatedPoints = calculateTimelineTimes(scheduledStagePoints, eventStartTime);

  const handleDragStart = (e: React.DragEvent, ppId: string) => {
    e.dataTransfer.setData('text/plain', ppId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    setDragOverColumn(targetCol);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDropOnStage = async (e: React.DragEvent, stageNumber: number) => {
    e.preventDefault();
    setDragOverColumn(null);
    const ppId = e.dataTransfer.getData('text/plain');
    if (!ppId) return;

    // Place at the end of the stage track
    const existingPoints = programPoints.filter(pp => pp.is_scheduled && pp.stage_number === stageNumber);
    const newSortOrder = existingPoints.length;

    await onUpdatePoint(ppId, {
      is_scheduled: true,
      stage_number: stageNumber,
      sort_order: newSortOrder
    });
  };

  const handleDropOnUnscheduled = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
    const ppId = e.dataTransfer.getData('text/plain');
    if (!ppId) return;

    await onUpdatePoint(ppId, {
      is_scheduled: false,
      sort_order: 0
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', padding: '10px 0' }}>
      {/* 1. Unscheduled Column */}
      <div 
        onDragOver={(e) => handleDragOver(e, 'unscheduled')}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnUnscheduled}
        style={{
          background: dragOverColumn === 'unscheduled' ? '#f1f5f9' : '#f8fafc',
          border: '2px dashed #cbd5e1',
          borderRadius: '12px',
          padding: '16px',
          height: '600px',
          overflowY: 'auto',
          transition: 'background-color 0.2s'
        }}
      >
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.86rem', fontWeight: 800 }}>📥 Ungeplant ({unscheduledPoints.length})</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {unscheduledPoints.map(pp => (
            <div
              key={pp.id}
              draggable
              onDragStart={(e) => handleDragStart(e, pp.id)}
              style={{
                padding: '12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'grab',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{pp.name}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                ⏱️ {pp.duration} Min. {pp.ensemble_band ? `| 👥 ${pp.ensemble_band}` : ''}
              </div>
              {pp.instrument && (
                <div style={{ fontSize: '0.7rem', color: '#0f172a', background: '#e2e8f0', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginTop: '6px' }}>
                  🎸 {pp.instrument}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Scheduled Board Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Stage selection header */}
        {stageCount > 1 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {Array.from({ length: stageCount }, (_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveStage(idx + 1)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeStage === idx + 1 ? '#0f172a' : '#e2e8f0',
                  color: activeStage === idx + 1 ? '#ffffff' : '#0f172a',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Bühne {idx + 1}
              </button>
            ))}
          </div>
        )}

        {/* Selected Stage Track */}
        <div
          onDragOver={(e) => handleDragOver(e, 'stage')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropOnStage(e, activeStage)}
          style={{
            background: dragOverColumn === 'stage' ? '#e2e8f0' : '#f1f5f9',
            border: '2px solid rgba(0,0,0,0.03)',
            borderRadius: '12px',
            padding: '16px',
            height: '550px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'background-color 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 800 }}>🎭 Bühne {activeStage}</h4>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Startzeit: {eventStartTime || '14:00'} Uhr</span>
          </div>

          {calculatedPoints.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
              Ziehen Sie Programmpunkte hierhin, um sie zu planen.
            </div>
          ) : (
            calculatedPoints.map((pp, listIdx) => {
              const teacherName = teachersList.find(t => t.id === pp.teacher_id);
              const teacherStr = teacherName ? `${teacherName.first_name} ${teacherName.last_name}` : 'Kein Lehrer';
              
              return (
                <div
                  key={pp.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, pp.id)}
                  style={{
                    padding: '12px 16px',
                    background: pp.is_pause ? '#fffbeb' : '#ffffff',
                    border: pp.hasConflict ? '2px solid #ef4444' : (pp.is_pause ? '1px solid #fef3c7' : '1px solid #e2e8f0'),
                    borderRadius: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    cursor: 'grab',
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 80px',
                    alignItems: 'center',
                    gap: '12px',
                    position: 'relative'
                  }}
                >
                  {/* Time Range */}
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569' }}>
                    🕒 {pp.calculated_start} - {pp.calculated_end}
                  </div>

                  {/* Program Point Metadata */}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{pp.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                      ⏱️ {pp.duration} Min. {pp.ensemble_band ? `| 👥 ${pp.ensemble_band}` : ''} | 👨‍🏫 {teacherStr}
                    </div>
                    {pp.instrument && (
                      <span style={{ fontSize: '0.66rem', color: '#475569', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>
                        🎸 {pp.instrument}
                      </span>
                    )}

                    {/* Conflict Badge */}
                    {pp.hasConflict && (
                      <div style={{ color: '#ef4444', fontSize: '0.68rem', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ⚠️ {pp.conflictDetails}
                      </div>
                    )}
                  </div>

                  {/* Actions (Reordering shortcuts & Move Back) */}
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => onUpdatePoint(pp.id, { is_scheduled: false })}
                      title="Aus Zeitplan entfernen"
                      style={{ border: 'none', background: '#fee2e2', color: '#ef4444', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.68rem' }}
                    >
                      ❌
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
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
- `event_start_time`: e.g., `"14:30"`
- `stagePoints` sorted by `sort_order`

The timeline sequential times are calculated by parsing `event_start_time` into cumulative minutes, and adding each act's duration to the running offset.

```typescript
// Calculation logic for sequential times
export function calculateTimelineTimes(stagePoints: any[], eventStartTime: string) {
  if (!eventStartTime) {
    // Fallback: Default to "14:00" if no start time is specified
    eventStartTime = "14:00";
  }
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

A teacher is in conflict if they are scheduled to perform or teach in two overlapping slots on the same day. This includes:
1. Two program points scheduled at the same time on different stages.
2. A program point overlapping with a private lesson scheduled on the same date.

### Implementation Logic
1. Load lessons scheduled for the event date:
   ```typescript
   const { data: lessons } = await supabase.from('lessons').eq('date', eventDate);
   ```
2. Convert all times (lessons and program points) to minutes-from-midnight on that day to ease bounds comparison.
3. Compare ranges using overlap logic: `start1 < end2 && end1 > start2`.

```typescript
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return h * 60 + m;
}

export function detectTeacherConflicts(scheduledPoints: any[], lessons: any[]) {
  // 1. Map all program points to their minutes ranges
  const pointsWithMinutes = scheduledPoints.map(pp => ({
    ...pp,
    startMin: parseTimeToMinutes(pp.calculated_start),
    endMin: parseTimeToMinutes(pp.calculated_end)
  }));

  // 2. Map all lessons to minutes ranges
  const lessonsWithMinutes = (lessons || []).map(l => {
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
        conflictDetails: `Doppelbuchung: Kollision mit "${doubleBookedPoint.name}"`
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
        conflictDetails: `Unterricht: Kollision mit Einzelunterricht (${conflictingLesson.start_time} - ${conflictingLesson.start_time + conflictingLesson.duration} Min.)`
      };
    }

    return { ...pp, hasConflict: false, conflictDetails: null };
  });
}
```

---

## 5. Manual Entries Modal

Allows coordinators to directly add approved, scheduled entries (pauses, MC announcements, guest acts) to the timeline.

### Implementation Details
- Add a "Beitrag hinzufügen" button in the timeline view.
- When clicked, open a Modal Form containing:
  - Name/Titel (required, e.g., "Moderation")
  - Dauer in Min. (required, default 10)
  - Lehrer (optional, selector from school teacher users list)
  - Ensemble / Band (optional, text)
  - Instrument (optional, text)
  - Bühne (default to current active stage)
- When saved, insert the program point directly to the database with:
  - `status: 'approved'` (since created by coordinator)
  - `is_scheduled: true`
  - `stage_number: chosenStage`
  - `sort_order: max(sort_order) + 1` for that stage

### Recommended Form Modal Implementation Sketch

```tsx
interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  defaultStageNumber: number;
  teachers: any[];
}

export function ManualEntryModal({ isOpen, onClose, onSave, defaultStageNumber, teachers }: ManualEntryModalProps) {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('10');
  const [teacherId, setTeacherId] = useState('');
  const [ensembleBand, setEnsembleBand] = useState('');
  const [instrument, setInstrument] = useState('');
  const [stageNumber, setStageNumber] = useState(defaultStageNumber);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDuration('10');
      setTeacherId('');
      setEnsembleBand('');
      setInstrument('');
      setStageNumber(defaultStageNumber);
    }
  }, [isOpen, defaultStageNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Bitte geben Sie einen Namen ein.');
    const durNum = Number(duration);
    if (isNaN(durNum) || durNum <= 0) return alert('Die Dauer muss größer als 0 sein.');

    await onSave({
      name: name.trim(),
      duration: durNum,
      teacher_id: teacherId || null,
      ensemble_band: ensembleBand.trim() || null,
      instrument: instrument.trim() || null,
      stage_number: stageNumber,
      is_scheduled: true,
      status: 'approved'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <form onSubmit={handleSubmit} style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', width: '400px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800 }}>➕ Manueller Programmpunkt</h3>
        
        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Titel *</label>
        <input placeholder="z.B. Eröffnungsrede oder Band-Auftritt" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
        
        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Dauer (Minuten) *</label>
        <input type="number" value={duration} onChange={e => setDuration(e.target.value)} required style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />

        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Verantwortlicher Lehrer (optional)</label>
        <select value={teacherId} onChange={e => setTeacherId(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <option value="">Keiner</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
          ))}
        </select>

        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Ensemble / Band (optional)</label>
        <input placeholder="z.B. Jazz Combo" value={ensembleBand} onChange={e => setEnsembleBand(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />

        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Instrument (optional)</label>
        <input placeholder="z.B. Klavier" value={instrument} onChange={e => setInstrument(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />

        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Bühne</label>
        <select value={stageNumber} onChange={e => setStageNumber(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <option value={1}>Bühne 1</option>
          <option value={2}>Bühne 2</option>
          <option value={3}>Bühne 3</option>
        </select>

        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Abbrechen</button>
          <button type="submit" style={{ padding: '8px 16px', background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Speichern</button>
        </div>
      </form>
    </div>
  );
}
```

---

## 6. E2E Test Cases Structure & Mock Database

To test and verify these additions, update both the Mock database environment and the tests file.

### Step A: Update Mock Database in `apps/groovelab/src/tests/run_e2e_tests.ts`
1. Update `ProgramPoint` interface to include the new columns:
   ```typescript
   interface ProgramPoint {
     // ...
     instrument?: string;
     is_scheduled: boolean;
   }
   ```
2. Update the `runQuery` -> `campus_event_program_points` insert handler:
   ```typescript
   const is_scheduled = row.is_scheduled || false;
   const instrument = row.instrument || null;
   ```
   Add them to `newRow`:
   ```typescript
   const newRow = {
     // ...
     instrument,
     is_scheduled,
     // ...
   };
   ```
3. Update `runQuery` -> `campus_event_program_points` update validations:
   Add a permission check to prevent teachers from modifying `is_scheduled`:
   ```typescript
   if (user && user.role === 'teacher') {
     if (options.updateData.is_scheduled !== undefined) {
       throw { message: 'Unauthorized column modification', code: '42501' };
     }
   }
   ```

### Step B: Recommended E2E Test Cases in `apps/groovelab/src/tests/e2e_test_cases.ts`

Add these test cases to verify the end-to-end flow:

```typescript
  // =========================================================================
  // Tier 3: Milestone 5 Scheduling & Conflict Prevention Tests
  // =========================================================================
  
  {
    id: 'T3_M5_1',
    name: 'M5: Database insertion supports instrument and is_scheduled columns',
    tier: 3,
    feature: 'M5',
    description: 'Verify new columns default and insert correctly.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const ppId = uuid();
      const { data, error } = await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Violin Solo Soloist',
        duration: 12,
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
    description: 'Ensure teachers cannot schedule acts due to trigger restrictions.',
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

      // Add two program points for teacher-1 on different stages
      await client.from('campus_event_program_points').insert([
        { id: pp1Id, event_id: 'event-1', school_id: 'school-1', teacher_id: 'teacher-1', name: 'Stage 1 Act', duration: 30, stage_number: 1, sort_order: 0, is_scheduled: true, status: 'approved' },
        { id: pp2Id, event_id: 'event-1', school_id: 'school-1', teacher_id: 'teacher-1', name: 'Stage 2 Act', duration: 30, stage_number: 2, sort_order: 0, is_scheduled: true, status: 'approved' }
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
      
      const teacher1Conflicts = conflicts.filter((c: any) => c.teacher_id === 'teacher-1' && c.hasConflict);
      if (teacher1Conflicts.length < 2) {
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
