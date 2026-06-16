# Project: Groovelab Event Coordinator Overhaul

## Architecture
- **Frontend**: Single Page React app using Vite (`apps/groovelab/src/`).
- **Database/Backend**: Supabase JS SDK client-side calls directly targeting PostgreSQL tables/views. Row-Level Security (RLS) policies govern data access based on custom header `x-user-id` (representing the authenticated user ID).
- **Core Event Panel**: `apps/groovelab/src/components/CampusEventsBoard.tsx` serves as the central UI for scheduling, rendering a grid. This file will be modified to conditionally hide lessons for admins/secretaries, and to show the coordinator workflow.
- **Teacher Program Point Entry**: Embedded within the Event details view inside `CampusEventsBoard.tsx` when accessed by teachers.
- **Shared Data Structures**:
  - `campus_events`: Stores primary event records (metadata, times, stages).
  - `campus_event_program_points`: Stores individual program acts, pauses, and metadata (tech, seating, ordering).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | E2E Test Suite | Build E2E test infrastructure & test cases (Tiers 1-4) | None | DONE |
| M2 | Database Migration | Apply schema migrations for event config and program points | None | DONE |
| M3 | UI & Coordinator Layout | Secretary UI redesign: hide lessons, swap timeline to left, start coordinator sidebar (R1) | M2 | IN_PROGRESS (d97e50fc-b6ef-4215-8afc-81c6c95186b0) |
| M4 | Submission & Feedback Flow | Configure events, send announcements, support teacher program point submissions (R2/R3) | M3 | PLANNED |
| M5 | Stage Planner & Assembly | Order points, assign stages, insert pauses, calculate timeline offsets (R2) | M4 | PLANNED |
| M6 | Packlist & CSV Export | Consolidated equipment list and custom columns CSV exporter (R3/R4) | M5 | PLANNED |
| M7 | E2E Pass & Hardening | Pass all E2E tests, write Tier 5 adversarial tests, achieve full robustness | M1, M6 | PLANNED |

## Code Layout
- Component: `apps/groovelab/src/components/CampusEventsBoard.tsx`
- Migrations: `supabase/migrations/173_event_coordinator_schema.sql`
- Test suite: `apps/groovelab/src/tests/` (or root testing script)

## Interface Contracts
### Supabase `campus_event_program_points` Table Contract
- `id`: UUID (Primary Key, default gen_random_uuid())
- `event_id`: UUID (Foreign Key to `campus_events.id`, CASCADE ON DELETE)
- `school_id`: UUID (Foreign Key to `schools.id`, CASCADE ON DELETE)
- `teacher_id`: UUID (Foreign Key to `users.id`, nullable)
- `name`: TEXT (Name of program point)
- `ensemble_band`: TEXT (Nullable)
- `performer_count`: INTEGER (Default 1)
- `duration`: INTEGER (In minutes)
- `preferred_time`: TEXT (Nullable)
- `title`: TEXT (Nullable)
- `artist`: TEXT (Nullable)
- `composer`: TEXT (Nullable)
- `arranger`: TEXT (Nullable)
- `publisher`: TEXT (Nullable)
- `tech_requirements`: TEXT (Nullable)
- `chairs_needed`: INTEGER (Default 0)
- `music_stands_needed`: INTEGER (Default 0)
- `remarks`: TEXT (Nullable)
- `stage_number`: INTEGER (Default 1)
- `sort_order`: INTEGER (Default 0)
- `is_pause`: BOOLEAN (Default FALSE)
- `status`: TEXT (Default 'submitted', check constraint IN ('submitted', 'approved', 'rejected'))
- `additional_feedback_responses`: JSONB (Default '{}')
