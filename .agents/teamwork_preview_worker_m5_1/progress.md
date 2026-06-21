# Progress Tracker

Last visited: 2026-06-19T17:28:40+02:00

## Current Milestone: Milestone 5 - Drag-and-Drop Program Board & Conflict Prevention (Remediation)

- [ ] React UI in `apps/groovelab/src/components/CampusEventsBoard.tsx`
  - [ ] Two-column layout (Left Column: Scheduled Timeline, Right Column: Unscheduled submissions)
  - [ ] Drag-and-drop support (drop to schedule/reorder, drop to unschedule)
  - [ ] Card details (times, name, ensemble, teacher, instrument) and pause blocks
  - [ ] Conflict flagging and editable duration input
  - [ ] Stage select switcher (if stageCount > 1)
  - [ ] Manual Entry modal ("Beitrag hinzufügen")
- [ ] Conflict Prevention Logic
  - [ ] Fix canceled lesson check in getConflictsMap (use .startsWith('cancel'))
  - [ ] Block drag/duration edits if ANY program point has a conflict
  - [ ] Call fetchEventDayLessons in event panel selection useEffect
- [ ] Verify Work
  - [ ] Compile check (npx tsc --noEmit)
  - [ ] Mock mode tests (USE_MOCK=true)
  - [ ] Real mode tests (USE_MOCK=false)
