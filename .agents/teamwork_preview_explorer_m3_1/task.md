# Explorer Task: M3 UI & Coordinator Layout Analysis - Instance 1

## Objective
Analyze the UI component `apps/groovelab/src/components/CampusEventsBoard.tsx` and design the layout changes for Milestone M3.

## Scope
- Find where lesson columns ("Unterrichtstermine") are rendered in `CampusEventsBoard.tsx`.
- Find how the user's role is retrieved (e.g. check if the component checks `userRole === 'admin'` or `userRole === 'secretary'`).
- Determine how to conditionally hide the lesson column completely for admins and secretaries, so it only shows for teachers/students.
- Determine how to shift "Campus & Schultermine" column to the left to occupy the main layout space.
- Design the layout for the central event planning dashboard / coordinator panel.
- Ensure compliance with layout guidelines in `CLAUDE.md` (no overlaps, viewport adaptability, no hardcoded heights, fluid wrap).

## Outputs
- Structured handoff report in `handoff.md` within this directory, detailing component lines to edit and the exact JSX/CSS changes required.
