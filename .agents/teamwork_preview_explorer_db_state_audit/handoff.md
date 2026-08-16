# AUDIT REPORT: State Persistence, 1-Click Switchers, Onboarding & Supabase Sync for Campus 3-Level Adaptive UI System

**Role**: Database & State Specialist  
**Target Platform**: Campus-Groovelab  
**Scope**: 3-Level Adaptive UI Architecture (`Junior Level 1`, `Teen Level 2`, `Pro Level 3`)  
**Audit Date**: 2026-08-16  

---

## 1. Observation

### 1.1 1-Click Level Switcher (`CampusLevelSwitcher.tsx`)
- **File**: `apps/groovelab/src/components/campus/CampusLevelSwitcher.tsx`
- **Definition & Types** (Lines 4–10):
  ```tsx
  export type CampusUiLevel = 'junior' | 'teen' | 'pro';

  interface CampusLevelSwitcherProps {
    currentLevel: CampusUiLevel;
    onChange: (level: CampusUiLevel) => void;
    compact?: boolean;
  }
  ```
- **Level Configurations** (Lines 17–42):
  - `junior`: label `'Junior'`, ageHint `'6–10 J.'`, icon `Sparkles`, color `'#16a34a'`, bgActive `'#ffffff'`.
  - `teen`: label `'Teen'`, ageHint `'11–15 J.'`, icon `Zap`, color `'#0284c7'`, bgActive `'#ffffff'`.
  - `pro`: label `'Pro'`, ageHint `'16+ J.'`, icon `Crown`, color `'#7c3aed'`, bgActive `'#ffffff'`.
- **Accessibility & Interaction** (Lines 45–99):
  - Container element provides `role="group"` and `aria-label="Campus UI Level Switcher"`.
  - Buttons have `type="button"`, `title="Ansicht für ${lvl.label} (${lvl.ageHint})"`, smooth transition (`transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'`), and conditional styling based on `currentLevel === lvl.id`.
  - Responsive `compact` mode scales padding from `6px 14px` down to `4px 10px`, font size from `0.8rem` down to `0.72rem`, and icon size from `14px` down to `12px`.
- **Dashboard Placement** (`StudentAvatarDashboard.tsx:6869–6872`):
  - Located in the student dashboard view header, immediately adjacent to the `(Level-Info & Onboarding)` trigger button.

### 1.2 Onboarding Flow & Modal (`CampusLevelSelectModal.tsx`)
- **File**: `apps/groovelab/src/components/campus/CampusLevelSelectModal.tsx`
- **Props & Interface** (Lines 5–15):
  ```tsx
  interface CampusLevelSelectModalProps {
    currentLevel: CampusUiLevel | null;
    onSelectLevel: (level: CampusUiLevel) => void;
    onClose?: () => void;
  }
  ```
- **Trigger Conditions** (`StudentAvatarDashboard.tsx:2379–2385, 6875–6881`):
  - Initial State initialization:
    ```tsx
    const [studentUiLevel, setStudentUiLevel] = useState<CampusUiLevel | null>(() => {
      if (typeof window === 'undefined') return 'junior';
      const saved = localStorage.getItem('campus_student_ui_level');
      if (saved === 'junior' || saved === 'teen' || saved === 'pro') return saved as CampusUiLevel;
      return null;
    });
    const [showLevelModal, setShowLevelModal] = useState<boolean>(false);
    ```
  - Modal rendering trigger:
    ```tsx
    {(!studentUiLevel || showLevelModal) && (
      <CampusLevelSelectModal
        currentLevel={studentUiLevel}
        onSelectLevel={handleLevelChange}
        onClose={studentUiLevel ? () => setShowLevelModal(false) : undefined}
      />
    )}
    ```
  - When `studentUiLevel === null` (first-time login on device without stored level), `onClose` is passed as `undefined`. Consequently, the "Abbrechen & Aktuelle Ansicht beibehalten" button (`CampusLevelSelectModal.tsx:227–245`) is hidden, enforcing mandatory level selection.
  - When opened manually via `(Level-Info & Onboarding)` (`StudentAvatarDashboard.tsx:6853`), `studentUiLevel` is defined, so `onClose` is provided, allowing dismissal.
- **Card Hierarchy & Content** (`CampusLevelSelectModal.tsx:27–60`):
  - **Junior**: Green theme (`#16a34a`), Sparkles icon, 6–10 Jahre, subtitle "Spielerisch & super einfach", features: `['Große Schrift & bunte Symbole', '3-Klick Hausaufgaben & Play', 'Einfacher Countdown-Timer mit Konfetti', 'Panini-Sticker Sammelalbum']`.
  - **Teen**: Sky blue theme (`#0284c7`), Zap icon, 11–15 Jahre, subtitle "Modern & auf den Punkt", features: `['Aufgeräumte Übersicht', 'Aufgaben-Checklisten & Audio-Memos', 'Fokus-Timer mit Presets', 'XP-Levels & Streaks']`.
  - **Pro**: Purple theme (`#7c3aed`), Crown icon, Ab 16 Jahre & Fortgeschrittene, subtitle "Voller Funktionsumfang & Studio-Tools", features: `['4-Spur Sample-Loopstation', 'Vollständiges Meisterwerk-Protokoll', '6-Achsen Skill-Radar', 'Detaillierte Übe-Statistiken']`.

### 1.3 Teacher Control in Student Detail Modal (`StudentDetailModal.tsx`)
- **File**: `apps/groovelab/src/components/StudentDetailModal.tsx`
- **Component State & Mutation Handler** (Lines 120–132):
  ```tsx
  const [studentUiLevel, setStudentUiLevel] = useState<'junior' | 'teen' | 'pro'>(() => {
    return student.campus_ui_level || 'junior';
  });

  const handleLevelChange = async (newLevel: 'junior' | 'teen' | 'pro') => {
    setStudentUiLevel(newLevel);
    student.campus_ui_level = newLevel;
    try {
      await supabase.from('users').update({ campus_ui_level: newLevel }).eq('id', student.id);
    } catch (err: any) {
      console.error('Error updating student campus_ui_level:', err);
    }
  };
  ```
- **Data Fetching on Mount** (Lines 1094, 1113):
  ```tsx
  const { data: latestUser } = await supabase
    .from('users')
    .select('first_name, last_name, is_campus_active, is_groovelab_active, campus_ui_level, lesson_duration, app_usage_mode, exempt_from_direct_billing, custom_student_price, locked_student_price, group_id, school_id, parent_pin')
    .eq('id', student.id)
    .maybeSingle();
  ...
  if (latestUser.campus_ui_level) setStudentUiLevel(latestUser.campus_ui_level);
  ```
- **UI Control Element** (Lines 3350–3420):
  - Section header: `Campus-Ansicht (Level)` / `Altersgerechte Bedienung für den Schüler`.
  - Segmented toggle with 3 buttons:
    - `🐣 6–10 J.` (Junior)
    - `🚀 11–15 J.` (Teen)
    - `👑 16+ J.` (Pro)
  - Active button styled with Campus primary green (`#34a853`), white text, and subtle elevation shadow (`boxShadow: '0 1px 4px rgba(52, 168, 83, 0.3)'`).

### 1.4 Supabase Database Schema & View Definitions
- **Migration 271**: `supabase/migrations/271_fix_users_view_and_onboarding_pin.sql`
  - Base table: `public.users_raw` (Lines 5, 85, 146).
  - View definition: `CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS SELECT ... FROM public.users_raw ur;` (Lines 14–54).
  - View DML trigger: `public.handle_users_view_dml()` (Lines 57–248) attached as `INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users` (Lines 250–254).
  - **Observation on `campus_ui_level`**: The column `campus_ui_level` is **absent** from `users_raw` DDL, **omitted** from `public.users` view columns, and **omitted** from `handle_users_view_dml()` `INSERT` and `UPDATE` routines.
- **Practice Logging Foreign Keys**:
  - `supabase/migrations/60_detox_wrapped_matrix.sql:21–27`:
    ```sql
    CREATE TABLE IF NOT EXISTS public.fokus_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
        duration_minutes INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ```
  - `supabase/migrations/52_campus_erp_integration.sql:55–63`:
    ```sql
    CREATE TABLE IF NOT EXISTS public.avatars (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
        avatar_style VARCHAR(50) DEFAULT 'Standard_Silhouette',
        instrument_type VARCHAR(100),
        evolution_level INT DEFAULT 1,
        asset_path TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ```
- **Discrepancy in `handleJuniorPracticeComplete` (`StudentAvatarDashboard.tsx:2400–2415`)**:
  ```tsx
  const handleJuniorPracticeComplete = async (minutes: number, xpEarned: number) => {
    try {
      await supabase.from('fokus_logs').insert({
        student_id: studentId, // DISCREPANCY: Column in DB is 'user_id', not 'student_id'
        duration_minutes: minutes,
        duration_seconds: minutes * 60,
        xp_earned: xpEarned,
        is_extra: false
      });
      const newXp = (avatar?.xp || 0) + xpEarned;
      setAvatar((prev: any) => ({ ...prev, xp: newXp }));
      await supabase.from('avatars').update({ xp: newXp }).eq('student_id', studentId); // DISCREPANCY: Column in DB is 'user_id', not 'student_id'
    } catch (err) {
      console.error('Error recording practice session in junior/teen dashboard:', err);
    }
  };
  ```

---

## 2. Logic Chain

1. **Client State vs Database State**:
   - In `StudentAvatarDashboard.tsx`, when a user or teacher updates the level via `handleLevelChange(newLevel)`, the frontend sets React state and writes to `localStorage.setItem('campus_student_ui_level', newLevel)`.
   - The component then attempts `supabase.from('users').update({ campus_ui_level: newLevel }).eq('id', studentUser.id)`.
   - In `StudentDetailModal.tsx`, the teacher interface executes the exact same query.

2. **Schema Propagation Failure Trace**:
   - Because `campus_ui_level` is not defined in `users_raw`, not exposed in `public.users` view, and not handled in `handle_users_view_dml()` trigger function, any PostgREST mutation targeting `campus_ui_level` on `public.users` fails.
   - The error is silently swallowed in `StudentAvatarDashboard.tsx:2395–2397` via `catch (e) { console.warn(...) }`.
   - Consequence: State persistence is currently **100% localized to `localStorage`** on the single browser session.

3. **Multi-Device & Teacher Override Impact**:
   - If a teacher overrides a student's level to Junior (or Pro) in `StudentDetailModal.tsx`, the database record is not updated.
   - When the student opens the application on their home tablet or smartphone:
     - The student's device fetches `latestUser` from `users`. Since `campus_ui_level` is missing/null in the database response, `StudentAvatarDashboard.tsx:6096` does not apply the teacher's setting.
     - The student's device falls back to whatever was previously in that device's `localStorage` or presents the onboarding modal again.

4. **Multi-Student (Sibling) Shared Device Edge Case**:
   - In `StudentAvatarDashboard.tsx`, the key used is un-namespaced: `'campus_student_ui_level'`.
   - By comparison, PINs and offline backups use `groovelab_user_pin_${studentId}` and `cg_offline_practice_${studentId}`.
   - On a shared family tablet where siblings switch profiles (Campus Netflix-style profile quick-switch), Child 1 (Junior) setting the level will overwrite the `localStorage` key for Child 2 (Teen/Pro) on initial component mount.

5. **Junior/Teen Practice Session & XP Persistence Gap**:
   - When a student finishes a practice timer in `CampusJuniorDashboard` or `CampusTeenDashboard`, `onCompletePracticeSession` invokes `handleJuniorPracticeComplete`.
   - `handleJuniorPracticeComplete` inserts `{ student_id: studentId, ... }` into `fokus_logs` and updates `avatars` with `.eq('student_id', studentId)`.
   - Because the foreign key column in both `fokus_logs` and `avatars` is named `user_id` (confirmed in migrations 52, 60, and `StudentAvatarDashboard.tsx:5111, 6048, 6192`), this call throws an error and fails to persist XP to the database.

---

## 3. Caveats

- **No Caveats on Source Investigation**: All relevant component files, state transitions, hooks, modals, and SQL migration files were inspected directly.
- **Read-Only Audit Constraint**: Per strict user rules and system instructions, zero SQL write mutations, schema alter scripts, or database test writes were executed against Supabase.
- **Live Remote Schema State**: The audit inspected the checked-in migration files (`supabase/migrations/*.sql`) and application source code. If an ad-hoc column was applied directly on a live remote Supabase instance without a checked-in migration file, the checked-in codebase remains out-of-sync until a formal migration is committed.

---

## 4. Conclusion

1. **1-Click Level Switcher (`CampusLevelSwitcher.tsx`)**:
   - **Status: PASSED (UX & Semantics)**. Instantaneous state updates, clear visual feedback, color-coded level badges (`#16a34a` Junior, `#0284c7` Teen, `#7c3aed` Pro), and accessible `role="group"` and `title` attributes.
2. **Onboarding Modal (`CampusLevelSelectModal.tsx`)**:
   - **Status: PASSED (UX & Flow Logic)**. Correctly enforces initial mandatory choice on first load when state is uninitialized (`studentUiLevel === null`), allows re-triggering via "(Level-Info & Onboarding)", and provides rich, pedagogically sound feature lists.
3. **Teacher Controls (`StudentDetailModal.tsx`)**:
   - **Status: PASSED (UI & Interaction)**. Clean 3-tier button selector (`🐣 6–10 J.`, `🚀 11–15 J.`, `👑 16+ J.`) seamlessly integrated into the Campus configuration pane with Campus green active highlight.
4. **Database & Persistence Synchronization**:
   - **Status: ACTION REQUIRED (Schema & Key Scoping)**.
     - **Issue 1 (High Priority - Migration)**: Create migration `274_add_campus_ui_level.sql` to add `campus_ui_level TEXT DEFAULT 'junior' CHECK (campus_ui_level IN ('junior', 'teen', 'pro'))` to `public.users_raw`, expose it in `public.users` view, and support it in `handle_users_view_dml()` `INSERT`/`UPDATE` triggers.
     - **Issue 2 (Medium Priority - Key Scoping)**: Namespace `localStorage` key to `campus_student_ui_level_${studentId}` (with fallback to `campus_student_ui_level`) in `StudentAvatarDashboard.tsx` to ensure complete sibling isolation on shared devices.
     - **Issue 3 (High Priority - Practice & XP Sync)**: In `StudentAvatarDashboard.tsx:2400–2415`, correct `student_id` to `user_id` for `fokus_logs` insert and `avatars` update.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Database View & Schema Gap**:
   - Inspect `supabase/migrations/271_fix_users_view_and_onboarding_pin.sql` lines 14–54 and lines 146–224. Confirm that `campus_ui_level` is absent from both the `SELECT` column list and the `UPDATE public.users_raw SET ...` block.
2. **Verify Practice Handler Column Names**:
   - Inspect `apps/groovelab/src/components/StudentAvatarDashboard.tsx:2400–2415` vs `apps/groovelab/src/components/StudentAvatarDashboard.tsx:5110–5118` and `supabase/migrations/60_detox_wrapped_matrix.sql:21–27`. Note the use of `student_id` vs `user_id`.
3. **Verify LocalStorage Scoping**:
   - Inspect `apps/groovelab/src/components/StudentAvatarDashboard.tsx:2381, 2389, 6098` and observe the static key `'campus_student_ui_level'`. Compare with line 3968 (`groovelab_user_pin_${studentId}`) and line 5507 (`cg_offline_practice_${studentId}`).
4. **Verify Frontend Level Switching**:
   - Run type-check / build: `npm run build` or `npx tsc --noEmit` inside `apps/groovelab`.
