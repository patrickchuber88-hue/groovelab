-- Migration: Upgrades schedules status CHECK constraint to support cancelation, sick, and pending approval statuses
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_status_check;
ALTER TABLE schedules ADD CONSTRAINT schedules_status_check CHECK (status IN ('draft', 'ready_for_admin_review', 'approved', 'canceled_by_student', 'pending_parent_approval', 'teacher_sick'));
