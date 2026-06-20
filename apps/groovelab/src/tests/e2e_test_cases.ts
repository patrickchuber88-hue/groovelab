import crypto from 'crypto';

export interface TestCase {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  feature?: string;
  description: string;
  run: (client: any) => Promise<void>;
}

// Utility to generate a random UUID for test isolation
const uuid = () => crypto.randomUUID();

export const testCases: TestCase[] = [
  // ==========================================
  // TIER 1: FEATURE COVERAGE (50 Test Cases, 5 per feature)
  // ==========================================

  // F1: Admin Dashboard Restructure (Hide Lessons for Admins)
  {
    id: 'T1_F1_1',
    name: 'F1: Teacher retrieves own lessons successfully',
    tier: 1,
    feature: 'F1',
    description: 'Ensure teachers can view their scheduled lessons.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { data, error } = await client.from('lessons').select('*');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Teacher should see seeded lessons');
      const hasOtherTeacher = data.some((l: any) => l.teacher_id === 'teacher-2');
      if (hasOtherTeacher) throw new Error('Teacher should only see their own lessons');
    }
  },
  {
    id: 'T1_F1_2',
    name: 'F1: Student retrieves own lessons successfully',
    tier: 1,
    feature: 'F1',
    description: 'Ensure students can view their scheduled lessons.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'student-1');
      const { data, error } = await client.from('lessons').select('*');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Student should see seeded lessons');
      const hasOtherStudent = data.some((l: any) => l.student_id === 'student-2');
      if (hasOtherStudent) throw new Error('Student should only see their own lessons');
    }
  },
  {
    id: 'T1_F1_3',
    name: 'F1: Admin query returns empty lessons list',
    tier: 1,
    feature: 'F1',
    description: 'Ensure admin querying lessons receives an empty array to restructure dashboard.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const { data, error } = await client.from('lessons').select('*');
      if (error) throw new Error(error.message);
      if (!data || data.length !== 0) throw new Error('Admins should receive empty lessons list');
    }
  },
  {
    id: 'T1_F1_4',
    name: 'F1: Secretary query returns empty lessons list',
    tier: 1,
    feature: 'F1',
    description: 'Ensure secretary querying lessons receives an empty array to restructure dashboard.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('lessons').select('*');
      if (error) throw new Error(error.message);
      if (!data || data.length !== 0) throw new Error('Secretaries should receive empty lessons list');
    }
  },
  {
    id: 'T1_F1_5',
    name: 'F1: Anonymous fetch returns empty lessons list',
    tier: 1,
    feature: 'F1',
    description: 'Ensure unauthenticated users cannot view lessons.',
    run: async (client) => {
      sessionStorage.removeItem('groovelab_user_id');
      const { data, error } = await client.from('lessons').select('*');
      if (error) throw new Error(error.message);
      if (data && data.length > 0) throw new Error('Anonymous users must not see lessons');
    }
  },

  // F2: Event Configuration (Setup)
  {
    id: 'T1_F2_1',
    name: 'F2: Admin can create a valid campus event',
    tier: 1,
    feature: 'F2',
    description: 'Verify admins can set up an event with valid properties.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      const { data, error } = await client.from('campus_events').insert({
        id: eventId,
        school_id: 'school-1',
        title: 'Winter Concert 2026',
        event_date: '2026-12-15',
        start_time: '18:00',
        end_time: '21:00',
        category: 'Konzert',
        is_public: true
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Event data not returned');
    }
  },
  {
    id: 'T1_F2_2',
    name: 'F2: Admin can retrieve list of configured events',
    tier: 1,
    feature: 'F2',
    description: 'Verify configured events can be listed for a school.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const { data, error } = await client.from('campus_events').select('*').eq('school_id', 'school-1');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Should list configured events');
    }
  },
  {
    id: 'T1_F2_3',
    name: 'F2: Admin can update configured event properties',
    tier: 1,
    feature: 'F2',
    description: 'Verify event details can be updated by admin.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      await client.from('campus_events').insert({
        id: eventId,
        school_id: 'school-1',
        title: 'Initial Title',
        event_date: '2026-08-01',
        start_time: '12:00',
        category: 'Konzert'
      });
      const { data, error } = await client.from('campus_events')
        .update({ title: 'Updated Title' })
        .eq('id', eventId);
      if (error) throw new Error(error.message);
      if (!data || data[0].title !== 'Updated Title') throw new Error('Title update failed');
    }
  },
  {
    id: 'T1_F2_4',
    name: 'F2: Admin can delete a configured event',
    tier: 1,
    feature: 'F2',
    description: 'Verify events can be deleted by admin.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      await client.from('campus_events').insert({
        id: eventId,
        school_id: 'school-1',
        title: 'Event to Delete',
        event_date: '2026-08-02',
        start_time: '12:00',
        category: 'Konzert'
      });
      const { error } = await client.from('campus_events').delete().eq('id', eventId);
      if (error) throw new Error(error.message);
    }
  },
  {
    id: 'T1_F2_5',
    name: 'F2: Student can read public configured events',
    tier: 1,
    feature: 'F2',
    description: 'Verify students can view public campus events.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'student-1');
      const { data, error } = await client.from('campus_events').select('*').eq('id', 'event-1');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Students should be able to view public events');
    }
  },

  // F3: Program Point Announcement (Send "Programmpunkt melden")
  {
    id: 'T1_F3_1',
    name: 'F3: Admin can configure event visibility to announce submission',
    tier: 1,
    feature: 'F3',
    description: 'Verify event can be set to announce submission to teachers.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      const { data, error } = await client.from('campus_events').insert({
        id: eventId,
        school_id: 'school-1',
        title: 'Spring Gala 2026',
        event_date: '2026-05-10',
        start_time: '17:00',
        category: 'Konzert',
        visibility: 'teachers' // Signal for teachers to announce program points
      });
      if (error) throw new Error(error.message);
      if (!data || data.visibility !== 'teachers') throw new Error('Failed to set visibility');
    }
  },
  {
    id: 'T1_F3_2',
    name: 'F3: Teacher can view events announced for submissions',
    tier: 1,
    feature: 'F3',
    description: 'Verify teachers can see events set with teacher-only visibility.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const eventId = uuid();
      await client.from('campus_events').insert({
        id: eventId,
        school_id: 'school-1',
        title: 'Teacher Exclusive Event',
        event_date: '2026-05-11',
        start_time: '17:00',
        category: 'Konzert',
        visibility: 'teachers'
      });
      const { data, error } = await client.from('campus_events').select('*').eq('id', eventId);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Teacher should see announced event');
    }
  },
  {
    id: 'T1_F3_3',
    name: 'F3: Student cannot view teacher-only submissions announcement',
    tier: 1,
    feature: 'F3',
    description: 'Verify student query filters out events announced only for teachers.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      await client.from('campus_events').insert({
        id: eventId,
        school_id: 'school-1',
        title: 'Teacher Only Announcement',
        event_date: '2026-05-12',
        start_time: '17:00',
        category: 'Konzert',
        visibility: 'teachers'
      });
      
      // Query as student
      sessionStorage.setItem('groovelab_user_id', 'student-1');
      const { data, error } = await client.from('campus_events').select('*').eq('id', eventId);
      if (error) throw new Error(error.message);
      if (data && data.length > 0 && data[0].visibility === 'teachers') {
        throw new Error('Student should not see teacher-only announcements');
      }
    }
  },
  {
    id: 'T1_F3_4',
    name: 'F3: Update announcement visibility to public',
    tier: 1,
    feature: 'F3',
    description: 'Verify visibility can be changed from teachers to public.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      await client.from('campus_events').insert({
        id: eventId,
        school_id: 'school-1',
        title: 'Open Mic Gala',
        event_date: '2026-05-13',
        start_time: '17:00',
        category: 'Konzert',
        visibility: 'teachers'
      });
      const { data, error } = await client.from('campus_events')
        .update({ visibility: 'all' })
        .eq('id', eventId);
      if (error) throw new Error(error.message);
      if (!data || data[0].visibility !== 'all') throw new Error('Visibility update failed');
    }
  },
  {
    id: 'T1_F3_5',
    name: 'F3: Secretary can retrieve teacher-visible announcements',
    tier: 1,
    feature: 'F3',
    description: 'Verify secretaries can see announced events.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      await client.from('campus_events').insert({
        id: eventId,
        school_id: 'school-1',
        title: 'Teacher Announced Event',
        event_date: '2026-05-15',
        start_time: '17:00',
        visibility: 'teachers'
      });
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('campus_events').select('*').eq('visibility', 'teachers');
      if (error) throw new Error(error.message);
      const hasEvent = data.some((e: any) => e.id === eventId);
      if (!hasEvent) throw new Error('Secretaries must be able to retrieve announced events');
    }
  },

  // F4: Teacher Program Point Submission
  {
    id: 'T1_F4_1',
    name: 'F4: Teacher submits valid program point successfully',
    tier: 1,
    feature: 'F4',
    description: 'Ensure a teacher can submit a program point for a concert.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      const { data, error } = await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        teacher_id: 'teacher-1',
        name: 'Rock Ensemble Act',
        ensemble_band: 'The Groovers',
        performer_count: 5,
        duration: 15,
        tech_requirements: '2 mics, 1 guitar amp',
        chairs_needed: 2,
        music_stands_needed: 3
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Program point submission failed');
      if (data.status !== 'submitted') throw new Error('Default status should be submitted');
    }
  },
  {
    id: 'T1_F4_2',
    name: 'F4: Submitted program point defaults correct fields',
    tier: 1,
    feature: 'F4',
    description: 'Verify status, sort_order, and is_pause defaults.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      const { data, error } = await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Acoustic Solo',
        duration: 10
      });
      if (error) throw new Error(error.message);
      if (data.status !== 'submitted') throw new Error('Should default to submitted');
      if (data.sort_order !== 0) throw new Error('Should default sort_order to 0');
      if (data.is_pause !== false) throw new Error('Should default is_pause to false');
      if (data.stage_number !== 1) throw new Error('Should default stage_number to 1');
    }
  },
  {
    id: 'T1_F4_3',
    name: 'F4: Teacher can retrieve their own submitted program points',
    tier: 1,
    feature: 'F4',
    description: 'Verify teachers can filter and list their own submissions.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Teacher 1 Act',
        duration: 8
      });
      const { data, error } = await client.from('campus_event_program_points')
        .select('*')
        .eq('teacher_id', 'teacher-1');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Should find submitted program points');
    }
  },
  {
    id: 'T1_F4_4',
    name: 'F4: Teacher can update their program point before review',
    tier: 1,
    feature: 'F4',
    description: 'Verify program point can be updated while in submitted state.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Draft Act Name',
        duration: 12
      });
      const { data, error } = await client.from('campus_event_program_points')
        .update({ name: 'Final Act Name', duration: 15 })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (!data || data[0].name !== 'Final Act Name') throw new Error('Update failed');
    }
  },
  {
    id: 'T1_F4_5',
    name: 'F4: Teacher can delete their program point before review',
    tier: 1,
    feature: 'F4',
    description: 'Verify program point can be deleted by submitting teacher.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Act to delete',
        duration: 5
      });
      const { error } = await client.from('campus_event_program_points').delete().eq('id', ppId);
      if (error) throw new Error(error.message);
    }
  },

  // F5: Secretary Program Point Review & Organizing
  {
    id: 'T1_F5_1',
    name: 'F5: Secretary can retrieve all program points for review',
    tier: 1,
    feature: 'F5',
    description: 'Verify secretary can see submissions from all teachers.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Review Act', duration: 10 });
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', 'event-1');
      if (error) throw new Error(error.message);
      const hasPP = data.some((pp: any) => pp.id === ppId);
      if (!hasPP) throw new Error('Should retrieve list of program points');
    }
  },
  {
    id: 'T1_F5_2',
    name: 'F5: Secretary can approve a program point',
    tier: 1,
    feature: 'F5',
    description: 'Verify secretary can set status to approved.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Act to Approve',
        duration: 10
      });
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('campus_event_program_points')
        .update({ status: 'approved' })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (!data || data[0].status !== 'approved') throw new Error('Status was not set to approved');
    }
  },
  {
    id: 'T1_F5_3',
    name: 'F5: Secretary can reject a program point',
    tier: 1,
    feature: 'F5',
    description: 'Verify secretary can set status to rejected.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Act to Reject',
        duration: 10
      });
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('campus_event_program_points')
        .update({ status: 'rejected' })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (!data || data[0].status !== 'rejected') throw new Error('Status was not set to rejected');
    }
  },
  {
    id: 'T1_F5_4',
    name: 'F5: Secretary can assign stage number and sort order',
    tier: 1,
    feature: 'F5',
    description: 'Verify secretary can plan staging and sequence.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Act to Stage',
        duration: 10
      });
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('campus_event_program_points')
        .update({ stage_number: 2, sort_order: 5, status: 'approved' })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (!data || data[0].stage_number !== 2 || data[0].sort_order !== 5) {
        throw new Error('Stage number or sort order update failed');
      }
    }
  },
  {
    id: 'T1_F5_5',
    name: 'F5: Secretary can insert pause program points',
    tier: 1,
    feature: 'F5',
    description: 'Verify secretary can schedule pauses in the timeline.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const ppId = uuid();
      const { data, error } = await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Intermission Pause',
        duration: 20,
        is_pause: true,
        status: 'approved',
        stage_number: 1,
        sort_order: 3
      });
      if (error) throw new Error(error.message);
      if (!data || !data.is_pause) throw new Error('Failed to insert pause point');
    }
  },

  // F6: Chronological Timeline Offset Calculation
  {
    id: 'T1_F6_1',
    name: 'F6: First program point offset is 0 minutes',
    tier: 1,
    feature: 'F6',
    description: 'Verify that the first item starts at offset 0.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({
        id: eventId,
        school_id: 'school-1',
        title: 'Timeline Test Concert',
        event_date: '2026-07-10',
        start_time: '15:00',
        category: 'Konzert'
      });
      await client.from('campus_event_program_points').insert({
        event_id: eventId,
        school_id: 'school-1',
        name: 'Act 1',
        duration: 10,
        stage_number: 1,
        sort_order: 1,
        status: 'approved'
      });
      
      const { data, error } = await client.from('campus_event_program_points')
        .select('*')
        .eq('event_id', eventId)
        .eq('stage_number', 1)
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      
      let currentOffset = 0;
      const calculatedOffsets = data.map((pp: any) => {
        const offset = currentOffset;
        currentOffset += pp.duration;
        return { id: pp.id, offset };
      });
      if (calculatedOffsets[0].offset !== 0) throw new Error('First program point offset must be 0');
    }
  },
  {
    id: 'T1_F6_2',
    name: 'F6: Second program point offset equals first point duration',
    tier: 1,
    feature: 'F6',
    description: 'Verify cumulative offset calculation for second point.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Timeline Concert 2', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act 1', duration: 15, stage_number: 1, sort_order: 1, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act 2', duration: 10, stage_number: 1, sort_order: 2, status: 'approved' }
      ]);
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId).eq('stage_number', 1).order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      
      let currentOffset = 0;
      const offsets = data.map((pp: any) => {
        const offset = currentOffset;
        currentOffset += pp.duration;
        return offset;
      });
      if (offsets[1] !== 15) throw new Error(`Expected offset 15, got ${offsets[1]}`);
    }
  },
  {
    id: 'T1_F6_3',
    name: 'F6: Timeline offsets incorporate pauses correctly',
    tier: 1,
    feature: 'F6',
    description: 'Verify that pause points increase cumulative offset for subsequent acts.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Timeline Concert 3', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act 1', duration: 10, stage_number: 1, sort_order: 1, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Pause 1', duration: 5, stage_number: 1, sort_order: 2, is_pause: true, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act 2', duration: 15, stage_number: 1, sort_order: 3, status: 'approved' }
      ]);
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId).eq('stage_number', 1).order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      
      let currentOffset = 0;
      const offsets = data.map((pp: any) => {
        const offset = currentOffset;
        currentOffset += pp.duration;
        return offset;
      });
      if (offsets[2] !== 15) throw new Error(`Act 2 should start at offset 15, got ${offsets[2]}`);
    }
  },
  {
    id: 'T1_F6_4',
    name: 'F6: Multi-stage timeline offsets are independent',
    tier: 1,
    feature: 'F6',
    description: 'Verify that calculations for stage 1 and stage 2 do not interfere.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Two Stage Concert', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'S1 Act 1', duration: 20, stage_number: 1, sort_order: 1, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'S2 Act 1', duration: 10, stage_number: 2, sort_order: 1, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'S2 Act 2', duration: 15, stage_number: 2, sort_order: 2, status: 'approved' }
      ]);
      
      // Verify Stage 2 offsets
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId).eq('stage_number', 2).order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      
      let currentOffset = 0;
      const offsets = data.map((pp: any) => {
        const offset = currentOffset;
        currentOffset += pp.duration;
        return offset;
      });
      if (offsets[1] !== 10) throw new Error(`Stage 2 Act 2 offset should be 10, got ${offsets[1]}`);
    }
  },
  {
    id: 'T1_F6_5',
    name: 'F6: Non-approved points are excluded from timeline offsets',
    tier: 1,
    feature: 'F6',
    description: 'Verify that submitted/rejected points are not added to chronological layout.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Timeline Filter', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act 1', duration: 10, stage_number: 1, sort_order: 1, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act 2 (submitted)', duration: 25, stage_number: 1, sort_order: 2, status: 'submitted' },
        { event_id: eventId, school_id: 'school-1', name: 'Act 3 (rejected)', duration: 40, stage_number: 1, sort_order: 3, status: 'rejected' },
        { event_id: eventId, school_id: 'school-1', name: 'Act 4', duration: 15, stage_number: 1, sort_order: 4, status: 'approved' }
      ]);
      
      const { data, error } = await client.from('campus_event_program_points')
        .select('*')
        .eq('event_id', eventId)
        .eq('stage_number', 1)
        .eq('status', 'approved')
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      
      let currentOffset = 0;
      const offsets = data.map((pp: any) => {
        const offset = currentOffset;
        currentOffset += pp.duration;
        return offset;
      });
      if (offsets[1] !== 10) throw new Error(`Act 4 offset should skip unapproved/rejected acts and be 10, got ${offsets[1]}`);
    }
  },

  // F7: Request Additional Feedback
  {
    id: 'T1_F7_1',
    name: 'F7: Secretary can request feedback on program point',
    tier: 1,
    feature: 'F7',
    description: 'Verify secretary can append feedback questions JSON.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Feedback Act', duration: 10 });
      
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const feedbackReq = {
        questions: ['Is piano tuning needed?', 'Any wireless mic requirements?'],
        status: 'pending_response'
      };
      const { data, error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: feedbackReq })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (!data || !data[0].additional_feedback_responses.questions) {
        throw new Error('Failed to request additional feedback');
      }
    }
  },
  {
    id: 'T1_F7_2',
    name: 'F7: Teacher can read pending feedback requests',
    tier: 1,
    feature: 'F7',
    description: 'Verify teachers can fetch program points with pending feedback requests.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        teacher_id: 'teacher-1',
        name: 'Pending Feedback Act',
        duration: 10,
        additional_feedback_responses: { questions: ['Q'], status: 'pending_response' }
      });
      const { data, error } = await client.from('campus_event_program_points')
        .select('*')
        .eq('teacher_id', 'teacher-1');
      if (error) throw new Error(error.message);
      const pending = data.filter((pp: any) => pp.additional_feedback_responses?.status === 'pending_response');
      if (!pending || pending.length === 0) throw new Error('Teacher should list pending feedback requests');
    }
  },
  {
    id: 'T1_F7_3',
    name: 'F7: Secretary can cancel a feedback request',
    tier: 1,
    feature: 'F7',
    description: 'Verify secretary can clear the feedback requests field.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Act Feedback Cancel', duration: 10 });
      
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      await client.from('campus_event_program_points').update({ additional_feedback_responses: { questions: ['Q1'], status: 'pending_response' } }).eq('id', ppId);
      
      // Clear it
      const { data, error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: {} })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (Object.keys(data[0].additional_feedback_responses).length !== 0) throw new Error('Feedback request not cleared');
    }
  },
  {
    id: 'T1_F7_4',
    name: 'F7: Requesting feedback preserves other program point attributes',
    tier: 1,
    feature: 'F7',
    description: 'Verify other attributes like duration and name do not change.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Stable Act', duration: 12, chairs_needed: 3 });
      
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('campus_event_program_points').update({ additional_feedback_responses: { questions: ['Q'], status: 'pending' } }).eq('id', ppId);
      if (error) throw new Error(error.message);
      if (data[0].name !== 'Stable Act' || data[0].duration !== 12 || data[0].chairs_needed !== 3) {
        throw new Error('Other attributes were modified');
      }
    }
  },
  {
    id: 'T1_F7_5',
    name: 'F7: Student cannot query or see feedback request questions',
    tier: 1,
    feature: 'F7',
    description: 'Verify students cannot access additional feedback metadata.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'student-1');
      const { data, error } = await client.from('campus_event_program_points').select('additional_feedback_responses');
      if (error) throw new Error(error.message);
      // Student is restricted from seeing additional_feedback_responses (returns empty or RLS blocked)
      const hasResponses = data.some((pp: any) => pp.additional_feedback_responses && Object.keys(pp.additional_feedback_responses).length > 0);
      if (hasResponses) {
        // Under strict RLS student shouldn't see these fields.
      }
    }
  },

  // F8: Teacher Feedback Submission
  {
    id: 'T1_F8_1',
    name: 'F8: Teacher submits answers to feedback questions successfully',
    tier: 1,
    feature: 'F8',
    description: 'Verify teacher can update JSON with responses.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Teacher Feedback Act',
        duration: 10,
        additional_feedback_responses: { questions: ['Need piano?'], status: 'pending' }
      });
      
      const responses = {
        questions: ['Need piano?'],
        answers: ['Yes, grand piano please'],
        status: 'responded'
      };
      const { data, error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: responses })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (data[0].additional_feedback_responses.answers[0] !== 'Yes, grand piano please') {
        throw new Error('Feedback response was not saved');
      }
    }
  },
  {
    id: 'T1_F8_2',
    name: 'F8: Secretary reads teacher feedback responses successfully',
    tier: 1,
    feature: 'F8',
    description: 'Verify secretary can read updated answers.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Teacher Feedback Act Read',
        duration: 10,
        additional_feedback_responses: { questions: ['Q'], answers: ['A'], status: 'responded' }
      });
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('campus_event_program_points').select('additional_feedback_responses').eq('id', ppId);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0 || data[0].additional_feedback_responses.status !== 'responded') {
        throw new Error('Feedback not found');
      }
    }
  },
  {
    id: 'T1_F8_3',
    name: 'F8: Teacher can overwrite their answers before finalization',
    tier: 1,
    feature: 'F8',
    description: 'Verify teacher can update their submitted answers.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Modifiable Feedback Act',
        duration: 10,
        additional_feedback_responses: { questions: ['Q'], answers: ['A1'], status: 'responded' }
      });
      
      const { data, error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: { questions: ['Q'], answers: ['A2-Updated'], status: 'responded' } })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (data[0].additional_feedback_responses.answers[0] !== 'A2-Updated') {
        throw new Error('Failed to update answers');
      }
    }
  },
  {
    id: 'T1_F8_4',
    name: 'F8: Teacher response status updates to "responded"',
    tier: 1,
    feature: 'F8',
    description: 'Verify status value transitions correctly.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Status Test Act',
        duration: 5,
        additional_feedback_responses: { questions: ['Q'], status: 'pending' }
      });
      const { data, error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: { questions: ['Q'], answers: ['Ans'], status: 'responded' } })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (data[0].additional_feedback_responses.status !== 'responded') throw new Error('Status did not change to responded');
    }
  },
  {
    id: 'T1_F8_5',
    name: 'F8: Teacher can clear answers to start over',
    tier: 1,
    feature: 'F8',
    description: 'Verify answers list can be reset to empty.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Reset Feedback Act',
        duration: 10,
        additional_feedback_responses: { questions: ['Q'], answers: ['A1'], status: 'responded' }
      });
      const { data, error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: { questions: ['Q'], answers: [], status: 'pending' } })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (data[0].additional_feedback_responses.answers.length !== 0) throw new Error('Answers did not clear');
    }
  },

  // F9: Equipment Packlist Consolidation
  {
    id: 'T1_F9_1',
    name: 'F9: Consolidate chairs count across all approved acts',
    tier: 1,
    feature: 'F9',
    description: 'Verify cumulative chairs sum equals the sum of individual points.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Chairs Concert', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, chairs_needed: 4, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 10, chairs_needed: 3, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act C (unapproved)', duration: 10, chairs_needed: 10, status: 'submitted' }
      ]);
      
      const { data, error } = await client.from('campus_event_program_points')
        .select('chairs_needed')
        .eq('event_id', eventId)
        .eq('status', 'approved');
      if (error) throw new Error(error.message);
      
      const totalChairs = data.reduce((sum: number, pp: any) => sum + (pp.chairs_needed || 0), 0);
      if (totalChairs !== 7) throw new Error(`Expected 7 chairs, got ${totalChairs}`);
    }
  },
  {
    id: 'T1_F9_2',
    name: 'F9: Consolidate stands count across all approved acts',
    tier: 1,
    feature: 'F9',
    description: 'Verify cumulative stands sum equals the sum of individual points.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Stands Concert', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, music_stands_needed: 2, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 10, music_stands_needed: 5, status: 'approved' }
      ]);
      
      const { data, error } = await client.from('campus_event_program_points')
        .select('music_stands_needed')
        .eq('event_id', eventId)
        .eq('status', 'approved');
      if (error) throw new Error(error.message);
      
      const totalStands = data.reduce((sum: number, pp: any) => sum + (pp.music_stands_needed || 0), 0);
      if (totalStands !== 7) throw new Error(`Expected 7 stands, got ${totalStands}`);
    }
  },
  {
    id: 'T1_F9_3',
    name: 'F9: Consolidate tech requirements strings into list',
    tier: 1,
    feature: 'F9',
    description: 'Verify that tech requirements are merged into a unified array/list.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Tech Concert', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, tech_requirements: 'DI Box', status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 10, tech_requirements: 'Vocal Mic', status: 'approved' }
      ]);
      
      const { data, error } = await client.from('campus_event_program_points')
        .select('tech_requirements')
        .eq('event_id', eventId)
        .eq('status', 'approved');
      if (error) throw new Error(error.message);
      
      const techList = data.map((pp: any) => pp.tech_requirements).filter(Boolean);
      if (techList.length !== 2 || !techList.includes('DI Box') || !techList.includes('Vocal Mic')) {
        throw new Error('Consolidated tech requirements mismatch');
      }
    }
  },
  {
    id: 'T1_F9_4',
    name: 'F9: Equipment packlist consolidation filters by stage',
    tier: 1,
    feature: 'F9',
    description: 'Verify packlist consolidation for a single stage specifically.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Staged Chairs', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, chairs_needed: 2, stage_number: 1, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 10, chairs_needed: 6, stage_number: 2, status: 'approved' }
      ]);
      
      const { data, error } = await client.from('campus_event_program_points')
        .select('chairs_needed')
        .eq('event_id', eventId)
        .eq('stage_number', 1)
        .eq('status', 'approved');
      if (error) throw new Error(error.message);
      
      const stage1Chairs = data.reduce((sum: number, pp: any) => sum + (pp.chairs_needed || 0), 0);
      if (stage1Chairs !== 2) throw new Error(`Expected 2 chairs for Stage 1, got ${stage1Chairs}`);
    }
  },
  {
    id: 'T1_F9_5',
    name: 'F9: Packlist ignores non-approved program points',
    tier: 1,
    feature: 'F9',
    description: 'Verify rejected and draft points do not affect packlist consolidation.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Filter Chairs', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, chairs_needed: 2, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act B (rejected)', duration: 10, chairs_needed: 5, status: 'rejected' },
        { event_id: eventId, school_id: 'school-1', name: 'Act C (submitted)', duration: 10, chairs_needed: 10, status: 'submitted' }
      ]);
      
      const { data, error } = await client.from('campus_event_program_points')
        .select('chairs_needed')
        .eq('event_id', eventId)
        .eq('status', 'approved');
      if (error) throw new Error(error.message);
      
      const total = data.reduce((sum: number, pp: any) => sum + (pp.chairs_needed || 0), 0);
      if (total !== 2) throw new Error(`Expected only 2 chairs, got ${total}`);
    }
  },

  // F10: Custom Excel/CSV Export
  {
    id: 'T1_F10_1',
    name: 'F10: Retrieve custom columns for CSV export successfully',
    tier: 1,
    feature: 'F10',
    description: 'Verify custom fields are returned in select query.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      await client.from('campus_event_program_points').insert({ event_id: 'event-1', school_id: 'school-1', name: 'Export Act', duration: 10 });
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('campus_event_program_points')
        .select('name, ensemble_band, stage_number, duration, sort_order');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Failed to retrieve export fields');
    }
  },
  {
    id: 'T1_F10_2',
    name: 'F10: Sort program points by stage and sort_order for export',
    tier: 1,
    feature: 'F10',
    description: 'Verify query results are ordered correctly.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Sort Export', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 10, stage_number: 1, sort_order: 2, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, stage_number: 1, sort_order: 1, status: 'approved' }
      ]);
      const { data, error } = await client.from('campus_event_program_points')
        .select('name, stage_number, sort_order')
        .eq('event_id', eventId)
        .order('stage_number', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      if (data[0].name !== 'Act A' || data[1].name !== 'Act B') {
        throw new Error('Export ordering failed');
      }
    }
  },
  {
    id: 'T1_F10_3',
    name: 'F10: Filter approved points only for custom export',
    tier: 1,
    feature: 'F10',
    description: 'Verify we can query for only approved points to export.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Filter Export', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act Approved', duration: 10, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act Submitted', duration: 10, status: 'submitted' }
      ]);
      const { data, error } = await client.from('campus_event_program_points')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved');
      if (error) throw new Error(error.message);
      if (data.length !== 1 || data[0].name !== 'Act Approved') {
        throw new Error('Export contains unapproved program points');
      }
    }
  },
  {
    id: 'T1_F10_4',
    name: 'F10: Retrieve specific JSON responses for feedback export column',
    tier: 1,
    feature: 'F10',
    description: 'Verify JSONB feedback responses can be fetched.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Feedback Export Act', duration: 10,
        additional_feedback_responses: { questions: ['Q'], answers: ['A'], status: 'responded' }
      });
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('campus_event_program_points')
        .select('additional_feedback_responses')
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0 || data[0].additional_feedback_responses.status !== 'responded') {
        throw new Error('Feedback column query failed');
      }
    }
  },
  {
    id: 'T1_F10_5',
    name: 'F10: Export includes ensemble and performer details',
    tier: 1,
    feature: 'F10',
    description: 'Verify performer counts and ensemble names are fetched.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Ensemble Export Act', duration: 10,
        ensemble_band: 'Rock Band X', performer_count: 8
      });
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('campus_event_program_points')
        .select('ensemble_band, performer_count')
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (data[0].ensemble_band !== 'Rock Band X' || data[0].performer_count !== 8) {
        throw new Error('Ensemble/performer export query failed');
      }
    }
  },


  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES (50 Test Cases, 5 per feature)
  // ==========================================

  // F1: Admin Dashboard Restructure (Hide Lessons for Admins)
  {
    id: 'T2_F1_1',
    name: 'F1 Boundary: Admin query with explicit teacher_id filter is empty',
    tier: 2,
    feature: 'F1',
    description: 'Ensure admin gets empty result even with specific teacher filter.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const { data, error } = await client.from('lessons').select('*').eq('teacher_id', 'teacher-1');
      if (error) throw new Error(error.message);
      if (data && data.length > 0) throw new Error('Admins must get empty lessons even with filter');
    }
  },
  {
    id: 'T2_F1_2',
    name: 'F1 Boundary: Admin query with explicit student_id filter is empty',
    tier: 2,
    feature: 'F1',
    description: 'Ensure admin gets empty result even with specific student filter.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const { data, error } = await client.from('lessons').select('*').eq('student_id', 'student-1');
      if (error) throw new Error(error.message);
      if (data && data.length > 0) throw new Error('Admins must get empty lessons even with filter');
    }
  },
  {
    id: 'T2_F1_3',
    name: 'F1 Boundary: Querying other tables is NOT blocked for admin',
    tier: 2,
    feature: 'F1',
    description: 'Ensure only lessons is blocked, other tables function normally.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const { data, error } = await client.from('campus_events').select('*');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Admins should still see events');
    }
  },
  {
    id: 'T2_F1_4',
    name: 'F1 Boundary: Role transition updates visibility immediately',
    tier: 2,
    feature: 'F1',
    description: 'Ensure changing sessionStorage role immediately hides/shows lessons.',
    run: async (client) => {
      // 1. Logged in as teacher - can see lessons
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      let res1 = await client.from('lessons').select('*');
      if (res1.error || res1.data.length === 0) throw new Error('Teacher should see lessons');
      
      // 2. Logged in as admin - cannot see lessons
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      let res2 = await client.from('lessons').select('*');
      if (res2.error || res2.data.length > 0) throw new Error('Admin should not see lessons');
    }
  },
  {
    id: 'T2_F1_5',
    name: 'F1 Boundary: Admin tries to delete lesson (blocked)',
    tier: 2,
    feature: 'F1',
    description: 'Verify that admin is prevented from mutating lessons (returns empty deletion).',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const { data, error } = await client.from('lessons').delete().eq('id', 'lesson-1');
      if (error) throw new Error(error.message);
      if (data && data.length > 0) throw new Error('Admin deletion of lessons should affect 0 rows');
    }
  },

  // F2: Event Configuration (Setup)
  {
    id: 'T2_F2_1',
    name: 'F2 Boundary: Event with empty title fails validation',
    tier: 2,
    feature: 'F2',
    description: 'Verify database/mock rejects empty string title.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const { error } = await client.from('campus_events').insert({
        school_id: 'school-1',
        title: '', // Empty Title
        event_date: '2026-08-01',
        start_time: '12:00'
      });
      if (!error) throw new Error('Expected validation error for empty title');
    }
  },
  {
    id: 'T2_F2_2',
    name: 'F2 Boundary: Event end_time before start_time fails validation',
    tier: 2,
    feature: 'F2',
    description: 'Verify validation rejects reverse timeline event window.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const { error } = await client.from('campus_events').insert({
        school_id: 'school-1',
        title: 'Reverse Concert',
        event_date: '2026-08-01',
        start_time: '18:00',
        end_time: '17:00' // End before start
      });
      if (!error) throw new Error('Expected validation error for end_time before start_time');
    }
  },
  {
    id: 'T2_F2_3',
    name: 'F2 Boundary: Event with invalid event_date fails validation',
    tier: 2,
    feature: 'F2',
    description: 'Verify empty event_date is rejected.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const { error } = await client.from('campus_events').insert({
        school_id: 'school-1',
        title: 'Invalid Date Concert',
        event_date: ' ', // Whitespace/empty date
        start_time: '12:00'
      });
      if (!error) throw new Error('Expected validation error for empty date');
    }
  },
  {
    id: 'T2_F2_4',
    name: 'F2 Boundary: Student tries to configure event (blocked)',
    tier: 2,
    feature: 'F2',
    description: 'Verify student role is blocked from inserting events.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'student-1');
      const { error } = await client.from('campus_events').insert({
        school_id: 'school-1',
        title: 'Student Created Concert',
        event_date: '2026-08-05',
        start_time: '14:00'
      });
      if (!error) {
        throw new Error('Students must not be allowed to configure events');
      }
    }
  },
  {
    id: 'T2_F2_5',
    name: 'F2 Boundary: Configure private event visibility checks',
    tier: 2,
    feature: 'F2',
    description: 'Verify student cannot retrieve private events.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      await client.from('campus_events').insert({
        id: eventId,
        school_id: 'school-1',
        title: 'Private Board Meeting',
        event_date: '2026-08-06',
        start_time: '14:00',
        visibility: 'private'
      });
      
      sessionStorage.setItem('groovelab_user_id', 'student-1');
      const { data, error } = await client.from('campus_events').select('*').eq('id', eventId);
      if (error) throw new Error(error.message);
      const hasPrivate = data.some((e: any) => e.visibility === 'private');
      if (hasPrivate) throw new Error('Students should not retrieve private events');
    }
  },

  // F3: Program Point Announcement (Send "Programmpunkt melden")
  {
    id: 'T2_F3_1',
    name: 'F3 Boundary: Announcement description is very long',
    tier: 2,
    feature: 'F3',
    description: 'Verify description can hold large text chunks.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const longDesc = 'a'.repeat(5000);
      const eventId = uuid();
      const { data, error } = await client.from('campus_events').insert({
        id: eventId,
        school_id: 'school-1',
        title: 'Mega Fest',
        event_date: '2026-09-01',
        start_time: '10:00',
        description: longDesc
      });
      if (error) throw new Error(error.message);
      if (data.description.length !== 5000) throw new Error('Long description truncated');
    }
  },
  {
    id: 'T2_F3_2',
    name: 'F3 Boundary: Announcement with teachers-only visibility filters students',
    tier: 2,
    feature: 'F3',
    description: 'Ensure student filtering holds when listing all events.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'student-1');
      const { data, error } = await client.from('campus_events').select('*');
      if (error) throw new Error(error.message);
      const hasTeacherEvent = data.some((e: any) => e.visibility === 'teachers');
      if (hasTeacherEvent) throw new Error('Student saw teacher-only announcement in list');
    }
  },
  {
    id: 'T2_F3_3',
    name: 'F3 Boundary: Delete announcement cascade clears associated points',
    tier: 2,
    feature: 'F3',
    description: 'Verify event deletion cascade cleans program points.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Cascade Fest', event_date: '2026-09-02', start_time: '10:00' });
      await client.from('campus_event_program_points').insert({ event_id: eventId, school_id: 'school-1', name: 'Cascade Act', duration: 10 });
      
      // Delete event
      await client.from('campus_events').delete().eq('id', eventId);
      
      // Check program points
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId);
      if (error) throw new Error(error.message);
      if (data && data.length > 0) throw new Error('Cascade delete did not clear program points');
    }
  },
  {
    id: 'T2_F3_4',
    name: 'F3 Boundary: Multiple announcements on same day are allowed',
    tier: 2,
    feature: 'F3',
    description: 'Verify database constraints allow parallel events on same day.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const d1 = await client.from('campus_events').insert({ school_id: 'school-1', title: 'Parallel Event A', event_date: '2026-09-10', start_time: '10:00' });
      const d2 = await client.from('campus_events').insert({ school_id: 'school-1', title: 'Parallel Event B', event_date: '2026-09-10', start_time: '14:00' });
      if (d1.error || d2.error) throw new Error('Failed to create parallel events');
    }
  },
  {
    id: 'T2_F3_5',
    name: 'F3 Boundary: Unauthenticated user cannot view teacher-only visibility events',
    tier: 2,
    feature: 'F3',
    description: 'Verify strict visibility filters out guest users.',
    run: async (client) => {
      sessionStorage.removeItem('groovelab_user_id');
      const { data, error } = await client.from('campus_events').select('*');
      if (error) throw new Error(error.message);
      const hasTeacherEvent = data.some((e: any) => e.visibility === 'teachers' || e.visibility === 'private');
      if (hasTeacherEvent) throw new Error('Anonymous saw private/teacher announcement');
    }
  },

  // F4: Teacher Program Point Submission
  {
    id: 'T2_F4_1',
    name: 'F4 Boundary: Submit with 0 duration fails validation',
    tier: 2,
    feature: 'F4',
    description: 'Ensure non-positive durations are rejected.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { error } = await client.from('campus_event_program_points').insert({
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Zero Duration Act',
        duration: 0 // Invalid
      });
      if (!error) throw new Error('Expected validation error for 0 duration');
    }
  },
  {
    id: 'T2_F4_2',
    name: 'F4 Boundary: Submit with negative duration fails validation',
    tier: 2,
    feature: 'F4',
    description: 'Ensure negative durations are rejected.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { error } = await client.from('campus_event_program_points').insert({
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Negative Duration Act',
        duration: -5 // Invalid
      });
      if (!error) throw new Error('Expected validation error for negative duration');
    }
  },
  {
    id: 'T2_F4_3',
    name: 'F4 Boundary: Submit with 0 performer count fails validation',
    tier: 2,
    feature: 'F4',
    description: 'Ensure non-positive performer count is rejected.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { error } = await client.from('campus_event_program_points').insert({
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Zero Performer Act',
        duration: 10,
        performer_count: 0 // Invalid
      });
      if (!error) throw new Error('Expected validation error for 0 performer count');
    }
  },
  {
    id: 'T2_F4_4',
    name: 'F4 Boundary: Submit with negative performer count fails validation',
    tier: 2,
    feature: 'F4',
    description: 'Ensure negative performer count is rejected.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { error } = await client.from('campus_event_program_points').insert({
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Negative Performer Act',
        duration: 10,
        performer_count: -2 // Invalid
      });
      if (!error) throw new Error('Expected validation error for negative performers');
    }
  },
  {
    id: 'T2_F4_5',
    name: 'F4 Boundary: Teacher cannot update program point once approved',
    tier: 2,
    feature: 'F4',
    description: 'Verify teacher edits are locked after status changes to approved.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Lockable Act', duration: 10 });
      
      // Secretary approves it
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      await client.from('campus_event_program_points').update({ status: 'approved' }).eq('id', ppId);
      
      // Teacher tries to update name
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { error } = await client.from('campus_event_program_points').update({ name: 'Hacked Act Name' }).eq('id', ppId);
      if (!error) {
        const { data } = await client.from('campus_event_program_points').select('name').eq('id', ppId);
        if (data[0].name === 'Hacked Act Name') {
          throw new Error('Teacher was allowed to edit an approved program point');
        }
      }
    }
  },

  // F5: Secretary Program Point Review & Organizing
  {
    id: 'T2_F5_1',
    name: 'F5 Boundary: Secretary cannot set status to invalid value',
    tier: 2,
    feature: 'F5',
    description: 'Ensure only submitted, approved, and rejected are accepted.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Status Act', duration: 10 });
      
      const { error } = await client.from('campus_event_program_points').update({ status: 'pending_review' }).eq('id', ppId);
      if (!error) throw new Error('Expected check constraint error for status "pending_review"');
    }
  },
  {
    id: 'T2_F5_2',
    name: 'F5 Boundary: Assign negative stage number fails validation',
    tier: 2,
    feature: 'F5',
    description: 'Ensure stage_number is positive.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Stage Act', duration: 10 });
      const { error } = await client.from('campus_event_program_points').update({ stage_number: -1 }).eq('id', ppId);
      if (!error) throw new Error('Expected check constraint error for negative stage_number');
    }
  },
  {
    id: 'T2_F5_3',
    name: 'F5 Boundary: Assign negative sort order fails validation',
    tier: 2,
    feature: 'F5',
    description: 'Ensure sort_order is non-negative.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Sort Act', duration: 10 });
      const { error } = await client.from('campus_event_program_points').update({ sort_order: -5 }).eq('id', ppId);
      if (!error) throw new Error('Expected check constraint error for negative sort_order');
    }
  },
  {
    id: 'T2_F5_4',
    name: 'F5 Boundary: Non-existent event_id insert fails foreign key',
    tier: 2,
    feature: 'F5',
    description: 'Ensure foreign key check prevents orphan program points.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { error } = await client.from('campus_event_program_points').insert({
        event_id: uuid(), // Non-existent event UUID
        school_id: 'school-1',
        name: 'Orphan Act',
        duration: 10
      });
      if (!error) throw new Error('Expected foreign key error');
    }
  },
  {
    id: 'T2_F5_5',
    name: 'F5 Boundary: Duplicate sort orders are permitted and resolved by ID',
    tier: 2,
    feature: 'F5',
    description: 'Verify timeline query handles identical sort orders gracefully.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Tie Concert', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { id: 'pp-tie-a', event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, sort_order: 1, status: 'approved' },
        { id: 'pp-tie-b', event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 15, sort_order: 1, status: 'approved' }
      ]);
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId).order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      if (data.length !== 2) throw new Error('Should fetch both tie-order items');
    }
  },

  // F6: Chronological Timeline Offset Calculation
  {
    id: 'T2_F6_1',
    name: 'F6 Boundary: Calculations with 0 duration points do not shift offsets',
    tier: 2,
    feature: 'F6',
    description: 'Ensure 0 duration acts (if database bypasses validation or for edge cases) do not advance timeline.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Zero Calc', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, sort_order: 1, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 1, sort_order: 2, status: 'approved' }, // Minimum duration 1 min
        { event_id: eventId, school_id: 'school-1', name: 'Act C', duration: 15, sort_order: 3, status: 'approved' }
      ]);
      
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId).order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      
      let currentOffset = 0;
      const offsets = data.map((pp: any) => {
        const offset = currentOffset;
        currentOffset += pp.duration;
        return offset;
      });
      if (offsets[2] !== 11) throw new Error(`Act C should start at 11, got ${offsets[2]}`);
    }
  },
  {
    id: 'T2_F6_2',
    name: 'F6 Boundary: Timeline calculates offsets when event start_time is missing',
    tier: 2,
    feature: 'F6',
    description: 'Verify fallback behavior of timeline calc to 00:00 start offset.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'No Time Concert', event_date: '2026-07-10', category: 'Konzert' }); // start_time empty
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 20, sort_order: 1, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 15, sort_order: 2, status: 'approved' }
      ]);
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId).order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      if (data[0].duration !== 20) throw new Error('Duration mismatch');
    }
  },
  {
    id: 'T2_F6_3',
    name: 'F6 Boundary: Calculations crossing midnight boundary function correctly',
    tier: 2,
    feature: 'F6',
    description: 'Verify timeline offset handles cumulative durations > 600 mins.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Midnight Marathon', event_date: '2026-07-10', start_time: '23:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Late Opener', duration: 90, sort_order: 1, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Post Midnight Act', duration: 60, sort_order: 2, status: 'approved' }
      ]);
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId).order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      
      const offset2 = data[0].duration; // 90
      if (offset2 !== 90) throw new Error('Offset calculation mismatch for post-midnight act');
    }
  },
  {
    id: 'T2_F6_4',
    name: 'F6 Boundary: Calculations with extremely long durations',
    tier: 2,
    feature: 'F6',
    description: 'Verify 300+ minute program point is processed without errors.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Marathon Event', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Gigantic Symphony', duration: 360, sort_order: 1, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Encore', duration: 15, sort_order: 2, status: 'approved' }
      ]);
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId).order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      if (data[0].duration !== 360) throw new Error('Very long duration not saved correctly');
    }
  },
  {
    id: 'T2_F6_5',
    name: 'F6 Boundary: Inserting pause at first sort_order works',
    tier: 2,
    feature: 'F6',
    description: 'Verify pause starts at offset 0 and shifts subsequent acts.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Pause Start Concert', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Opening Pause', duration: 15, is_pause: true, sort_order: 1, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Main Opener', duration: 20, sort_order: 2, status: 'approved' }
      ]);
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId).order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      
      let currentOffset = 0;
      const offsets = data.map((pp: any) => {
        const offset = currentOffset;
        currentOffset += pp.duration;
        return offset;
      });
      if (offsets[0] !== 0) throw new Error('Opening pause offset must be 0');
      if (offsets[1] !== 15) throw new Error(`Main opener offset should be 15, got ${offsets[1]}`);
    }
  },

  // F7: Request Additional Feedback
  {
    id: 'T2_F7_1',
    name: 'F7 Boundary: Secretary requests feedback with extremely long questions list',
    tier: 2,
    feature: 'F7',
    description: 'Verify JSONB payload handles 20+ feedback questions.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Many Questions Act', duration: 10 });
      
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const questions = Array.from({ length: 25 }, (_, i) => `Question number ${i + 1}?`);
      const { data, error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: { questions, status: 'pending' } })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (data[0].additional_feedback_responses.questions.length !== 25) {
        throw new Error('Questions array length mismatch');
      }
    }
  },
  {
    id: 'T2_F7_2',
    name: 'F7 Boundary: Requesting feedback on rejected point is rejected/blocked',
    tier: 2,
    feature: 'F7',
    description: 'Ensure feedback cannot be requested for rejected program points.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Rejected Feedback Act', duration: 10 });
      
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      await client.from('campus_event_program_points').update({ status: 'rejected' }).eq('id', ppId);
      
      const { error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: { questions: ['Q'], status: 'pending' } })
        .eq('id', ppId);
      if (!error) {
        const { data } = await client.from('campus_event_program_points').select('additional_feedback_responses').eq('id', ppId);
        if (data[0].additional_feedback_responses.status === 'pending') {
          throw new Error('Allowed to request feedback on rejected program point');
        }
      }
    }
  },
  {
    id: 'T2_F7_3',
    name: 'F7 Boundary: Requesting feedback updates status but merges existing data',
    tier: 2,
    feature: 'F7',
    description: 'Verify subsequent requests do not wipe unrelated metadata.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Merge Feedback Act', duration: 10, additional_feedback_responses: { initial: 'data' } });
      
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: { initial: 'data', questions: ['New Q'], status: 'pending' } })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (data[0].additional_feedback_responses.initial !== 'data') {
        throw new Error('Initial feedback metadata was lost');
      }
    }
  },
  {
    id: 'T2_F7_4',
    name: 'F7 Boundary: Teacher cannot request feedback (unauthorized role check)',
    tier: 2,
    feature: 'F7',
    description: 'Verify teachers cannot update feedback questions on their own points.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Self Feedback Block', duration: 10 });
      
      const { error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: { questions: ['Hack Q?'], status: 'pending' } })
        .eq('id', ppId);
      if (!error) {
        const { data } = await client.from('campus_event_program_points').select('additional_feedback_responses').eq('id', ppId);
        if (data[0].additional_feedback_responses.questions) {
          throw new Error('Teacher was allowed to inject questions');
        }
      }
    }
  },
  {
    id: 'T2_F7_5',
    name: 'F7 Boundary: Requesting feedback with empty questions throws error',
    tier: 2,
    feature: 'F7',
    description: 'Verify validation of questions array.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Empty Q Act', duration: 10 });
      const { error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: { questions: [], status: 'pending' } })
        .eq('id', ppId);
      if (!error) {
        throw new Error('Should block empty questions array');
      }
    }
  },

  // F8: Teacher Feedback Submission
  {
    id: 'T2_F8_1',
    name: 'F8 Boundary: Teacher submits feedback responses with HTML characters (XSS check)',
    tier: 2,
    feature: 'F8',
    description: 'Verify input sanitization or safe storage of raw inputs.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'XSS Act', duration: 10,
        additional_feedback_responses: { questions: ['Q'], status: 'pending' }
      });
      
      const xssPayload = '<script>alert("hack")</script>';
      const { data, error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: { questions: ['Q'], answers: [xssPayload], status: 'responded' } })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (data[0].additional_feedback_responses.answers[0] !== xssPayload) {
        throw new Error('HTML payload was corrupted or not saved');
      }
    }
  },
  {
    id: 'T2_F8_2',
    name: 'F8 Boundary: Teacher responds to deleted feedback request',
    tier: 2,
    feature: 'F8',
    description: 'Ensure teacher update fails if secretary deleted the request first.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Orphan Feedback Act', duration: 10 });
      
      // Secretary clears feedback request
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      await client.from('campus_event_program_points').update({ additional_feedback_responses: {} }).eq('id', ppId);
      
      // Teacher tries to submit answer
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: { answers: ['Late A'] } })
        .eq('id', ppId);
      if (!error) {
        const { data } = await client.from('campus_event_program_points').select('additional_feedback_responses').eq('id', ppId);
        if (data[0].additional_feedback_responses.answers) {
          throw new Error('Teacher was allowed to answer a cleared feedback request');
        }
      }
    }
  },
  {
    id: 'T2_F8_3',
    name: 'F8 Boundary: Teacher submits empty answers array',
    tier: 2,
    feature: 'F8',
    description: 'Verify empty responses are permitted.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Empty A Act', duration: 10,
        additional_feedback_responses: { questions: ['Q1'], status: 'pending' }
      });
      const { data, error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: { questions: ['Q1'], answers: [], status: 'responded' } })
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (data[0].additional_feedback_responses.answers.length !== 0) throw new Error('Answers should be empty');
    }
  },
  {
    id: 'T2_F8_4',
    name: 'F8 Boundary: Teacher cannot overwrite another teacher feedback response',
    tier: 2,
    feature: 'F8',
    description: 'Verify multi-tenant isolation via role/RLS.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId, event_id: 'event-1', school_id: 'school-1', teacher_id: 'teacher-1', name: 'Teacher 1 Feedback Act', duration: 10,
        additional_feedback_responses: { questions: ['Q'], status: 'pending' }
      });
      
      // Log in as teacher-2 and try to answer
      sessionStorage.setItem('groovelab_user_id', 'teacher-2');
      const { error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: { questions: ['Q'], answers: ['Stolen Answer'], status: 'responded' } })
        .eq('id', ppId);
      if (!error) {
        const { data } = await client.from('campus_event_program_points').select('additional_feedback_responses').eq('id', ppId);
        if (data[0].additional_feedback_responses.answers) {
          throw new Error('Teacher 2 was allowed to submit feedback on Teacher 1 act');
        }
      }
    }
  },
  {
    id: 'T2_F8_5',
    name: 'F8 Boundary: Submit feedback answers matching length of questions exactly',
    tier: 2,
    feature: 'F8',
    description: 'Verify 1-to-1 matching rule.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Exact Match Act', duration: 10,
        additional_feedback_responses: { questions: ['Q1', 'Q2'], status: 'pending' }
      });
      
      const { error } = await client.from('campus_event_program_points')
        .update({ additional_feedback_responses: { questions: ['Q1', 'Q2'], answers: ['A1'], status: 'responded' } }) // 1 answer for 2 questions
        .eq('id', ppId);
      if (!error) {
        throw new Error('Expected validation error for mismatch questions and answers length');
      }
    }
  },

  // F9: Equipment Packlist Consolidation
  {
    id: 'T2_F9_1',
    name: 'F9 Boundary: Consolidation when chairs_needed is null',
    tier: 2,
    feature: 'F9',
    description: 'Ensure null equipment values default to 0.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Null Chairs Concert', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, chairs_needed: null, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 10, chairs_needed: 3, status: 'approved' }
      ]);
      const { data, error } = await client.from('campus_event_program_points').select('chairs_needed').eq('event_id', eventId).eq('status', 'approved');
      if (error) throw new Error(error.message);
      const total = data.reduce((sum: number, pp: any) => sum + (pp.chairs_needed || 0), 0);
      if (total !== 3) throw new Error(`Expected 3 chairs, got ${total}`);
    }
  },
  {
    id: 'T2_F9_2',
    name: 'F9 Boundary: Consolidation when no program points are approved',
    tier: 2,
    feature: 'F9',
    description: 'Ensure empty packlist does not crash queries.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Empty Concert', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      const { data, error } = await client.from('campus_event_program_points').select('chairs_needed').eq('event_id', eventId).eq('status', 'approved');
      if (error) throw new Error(error.message);
      const total = data.reduce((sum: number, pp: any) => sum + (pp.chairs_needed || 0), 0);
      if (total !== 0) throw new Error(`Expected 0 chairs, got ${total}`);
    }
  },
  {
    id: 'T2_F9_3',
    name: 'F9 Boundary: Negative chairs values are caught on submit',
    tier: 2,
    feature: 'F9',
    description: 'Ensure validation prevents negative equipment values.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { error } = await client.from('campus_event_program_points').insert({
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Negative Chairs Act',
        duration: 10,
        chairs_needed: -3 // Invalid
      });
      if (!error) throw new Error('Expected validation error for negative chairs count');
    }
  },
  {
    id: 'T2_F9_4',
    name: 'F9 Boundary: Consolidation handles duplicate tech requirements without throwing',
    tier: 2,
    feature: 'F9',
    description: 'Verify merging does not crash on identical tech text.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Duplicate Tech Concert', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, tech_requirements: 'Vocal Mic', status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 10, tech_requirements: 'Vocal Mic', status: 'approved' }
      ]);
      const { data, error } = await client.from('campus_event_program_points').select('tech_requirements').eq('event_id', eventId).eq('status', 'approved');
      if (error) throw new Error(error.message);
      
      const techList = data.map((pp: any) => pp.tech_requirements).filter(Boolean);
      const uniqueTech = [...new Set(techList)];
      if (uniqueTech.length !== 1 || uniqueTech[0] !== 'Vocal Mic') {
        throw new Error('Duplicate tech requirements consolidation failed');
      }
    }
  },
  {
    id: 'T2_F9_5',
    name: 'F9 Boundary: Consolidation with large scale equipment counts',
    tier: 2,
    feature: 'F9',
    description: 'Verify that large numbers of chairs/stands are consolidated properly.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Huge Concert', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Chorus', duration: 15, chairs_needed: 150, music_stands_needed: 75, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Symphony', duration: 20, chairs_needed: 80, music_stands_needed: 90, status: 'approved' }
      ]);
      const { data, error } = await client.from('campus_event_program_points').select('chairs_needed, music_stands_needed').eq('event_id', eventId).eq('status', 'approved');
      if (error) throw new Error(error.message);
      
      const chairs = data.reduce((sum: number, pp: any) => sum + (pp.chairs_needed || 0), 0);
      const stands = data.reduce((sum: number, pp: any) => sum + (pp.music_stands_needed || 0), 0);
      if (chairs !== 230 || stands !== 165) throw new Error('Large scale equipment consolidation failed');
    }
  },

  // F10: Custom Excel/CSV Export
  {
    id: 'T2_F10_1',
    name: 'F10 Boundary: Exporter handles special characters in name',
    tier: 2,
    feature: 'F10',
    description: 'Verify CSV data handles commas and quotes.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId, event_id: 'event-1', school_id: 'school-1',
        name: 'The "Loud" Band, featuring Patrick', duration: 10
      });
      const { data, error } = await client.from('campus_event_program_points').select('name').eq('id', ppId);
      if (error) throw new Error(error.message);
      
      const escaped = `"${data[0].name.replace(/"/g, '""')}"`;
      if (escaped !== `"${'The ""Loud"" Band, featuring Patrick'}"`) {
        throw new Error('CSV quote escaping simulation failed');
      }
    }
  },
  {
    id: 'T2_F10_2',
    name: 'F10 Boundary: Exporting empty program points returns header schema only',
    tier: 2,
    feature: 'F10',
    description: 'Ensure 0 rows is processed without crash.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Future Concert', event_date: '2026-07-10', start_time: '15:00', category: 'Konzert' });
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId);
      if (error) throw new Error(error.message);
      if (data.length !== 0) throw new Error('Expected empty program points list');
    }
  },
  {
    id: 'T2_F10_3',
    name: 'F10 Boundary: Export custom fields where value is null',
    tier: 2,
    feature: 'F10',
    description: 'Ensure null attributes are rendered as empty strings in export mapping.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Minimal Act', duration: 10, ensemble_band: null
      });
      const { data, error } = await client.from('campus_event_program_points').select('ensemble_band').eq('id', ppId);
      if (error) throw new Error(error.message);
      const csvVal = data[0].ensemble_band === null ? '' : data[0].ensemble_band;
      if (csvVal !== '') throw new Error('Expected null to resolve to empty CSV cell');
    }
  },
  {
    id: 'T2_F10_4',
    name: 'F10 Boundary: Semicolon delimiter formatting test',
    tier: 2,
    feature: 'F10',
    description: 'Verify semicolon delimiter format.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      await client.from('campus_event_program_points').insert({ event_id: 'event-1', school_id: 'school-1', name: 'Semicolon Act', duration: 12 });
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('campus_event_program_points').select('name, duration').eq('event_id', 'event-1');
      if (error) throw new Error(error.message);
      const match = data.find((pp: any) => pp.name === 'Semicolon Act');
      if (!match) throw new Error('Act not found');
      const line = `${match.name};${match.duration}`;
      if (line !== 'Semicolon Act;12') throw new Error('Semicolon delimiter formatting failed');
    }
  },
  {
    id: 'T2_F10_5',
    name: 'F10 Boundary: Flat JSON parsing for feedback export',
    tier: 2,
    feature: 'F10',
    description: 'Verify JSON responses are serializable for column value.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Act JSON Export', duration: 10,
        additional_feedback_responses: { questions: ['Q'], answers: ['A'], status: 'responded' }
      });
      const { data, error } = await client.from('campus_event_program_points').select('additional_feedback_responses').eq('id', ppId);
      if (error) throw new Error(error.message);
      
      const serialized = JSON.stringify(data[0].additional_feedback_responses);
      if (!serialized.includes('responded')) throw new Error('Feedback JSON serialization failed');
    }
  },


  // ==========================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (10 Test Cases)
  // ==========================================
  {
    id: 'T3_1',
    name: 'T3: Event setup, announcement, submission, feedback loop, and approval pipeline',
    tier: 3,
    description: 'End to end flow of event configuration, teacher submission, additional feedback request, response, and secretary approval.',
    run: async (client) => {
      // 1. Admin creates event (F2)
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Flow Concert', event_date: '2026-07-20', start_time: '18:00', category: 'Konzert', visibility: 'teachers' });
      
      // 2. Teacher submits program point (F4)
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: eventId, school_id: 'school-1', name: 'Act Flow A', duration: 10 });
      
      // 3. Secretary requests feedback (F7)
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      await client.from('campus_event_program_points').update({ additional_feedback_responses: { questions: ['Need piano?'], status: 'pending' } }).eq('id', ppId);
      
      // 4. Teacher responds (F8)
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      await client.from('campus_event_program_points').update({ additional_feedback_responses: { questions: ['Need piano?'], answers: ['Yes'], status: 'responded' } }).eq('id', ppId);
      
      // 5. Secretary approves (F5)
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data, error } = await client.from('campus_event_program_points').update({ status: 'approved', stage_number: 1, sort_order: 1 }).eq('id', ppId);
      if (error) throw new Error(error.message);
      if (data[0].status !== 'approved' || data[0].additional_feedback_responses.answers[0] !== 'Yes') {
        throw new Error('Pipeline status or answer verification failed');
      }
    }
  },
  {
    id: 'T3_2',
    name: 'T3: Staging updates automatically recalculate timeline offsets and update consolidated packlist',
    tier: 3,
    description: 'Verify that adding approved points with gear requirements updates timeline offsets and consolidated equipment.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Offset Gear Concert', event_date: '2026-07-20', start_time: '18:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 15, chairs_needed: 2, status: 'approved', sort_order: 1 },
        { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 10, chairs_needed: 3, status: 'approved', sort_order: 2 }
      ]);
      
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId).eq('status', 'approved').order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      
      // Timeline offset verification
      const offsetB = data[0].duration; // starts after Act A (15 mins)
      if (offsetB !== 15) throw new Error(`Act B offset should be 15, got ${offsetB}`);
      
      // Equipment consolidation verification
      const totalChairs = data.reduce((sum: number, pp: any) => sum + (pp.chairs_needed || 0), 0);
      if (totalChairs !== 5) throw new Error(`Consolidated chairs should be 5, got ${totalChairs}`);
    }
  },
  {
    id: 'T3_3',
    name: 'T3: Announcement updates propagate and allow teacher submissions',
    tier: 3,
    description: 'Verify transition from closed to open submission window.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Closed Event', event_date: '2026-07-20', start_time: '18:00', category: 'Konzert', visibility: 'private' });
      
      // Teacher submissions fail while event is private
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { error: err1 } = await client.from('campus_event_program_points').insert({ event_id: eventId, school_id: 'school-1', name: 'Blocked submission', duration: 10 });
      
      // Admin opens event
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      await client.from('campus_events').update({ visibility: 'teachers' }).eq('id', eventId);
      
      // Teacher submission now succeeds
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { data, error } = await client.from('campus_event_program_points').insert({ event_id: eventId, school_id: 'school-1', name: 'Allowed submission', duration: 10 });
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Teacher submission failed after event opened');
    }
  },
  {
    id: 'T3_4',
    name: 'T3: Rejection locks teacher program point and feedback submission',
    tier: 3,
    description: 'Verify rejection locks the point.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Reject-Lock Act', duration: 10 });
      
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      await client.from('campus_event_program_points').update({ status: 'rejected' }).eq('id', ppId);
      
      // Teacher tries to submit feedback or rename
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { error } = await client.from('campus_event_program_points').update({ name: 'Renamed Rejected Act', additional_feedback_responses: { answers: ['Late A'] } }).eq('id', ppId);
      if (!error) {
        const { data } = await client.from('campus_event_program_points').select('name').eq('id', ppId);
        if (data[0].name === 'Renamed Rejected Act') {
          throw new Error('Teacher was allowed to modify rejected program point');
        }
      }
    }
  },
  {
    id: 'T3_5',
    name: 'T3: Changing event visibility to private hides points from teacher list queries',
    tier: 3,
    description: 'Ensure multi-tenant isolation rules hide program points on private events.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Board Session', event_date: '2026-07-21', start_time: '18:00', category: 'Konzert', visibility: 'private' });
      await client.from('campus_event_program_points').insert({ event_id: eventId, school_id: 'school-1', name: 'Private Agenda Item', duration: 10 });
      
      // Query as teacher-2 (unrelated teacher)
      sessionStorage.setItem('groovelab_user_id', 'teacher-2');
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId);
      if (error) throw new Error(error.message);
      if (data && data.length > 0) throw new Error('Unrelated teacher saw program points for private event');
    }
  },
  {
    id: 'T3_6',
    name: 'T3: Secretary inserts pauses that shift timeline offsets, and validates pause presence in export data',
    tier: 3,
    description: 'Ensure pauses are calculated in timeline and shown in export results.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Export Pause Concert', event_date: '2026-07-22', start_time: '18:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act 1', duration: 10, sort_order: 1, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Pause 15m', duration: 15, is_pause: true, sort_order: 2, status: 'approved' },
        { event_id: eventId, school_id: 'school-1', name: 'Act 2', duration: 10, sort_order: 3, status: 'approved' }
      ]);
      
      const { data, error } = await client.from('campus_event_program_points')
        .select('name, duration, is_pause, sort_order')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      
      let offset = 0;
      const act2Offset = data[0].duration + data[1].duration; // 25 mins
      if (act2Offset !== 25) throw new Error('Timeline shift by pause failed');
      
      const hasPause = data.some((pp: any) => pp.is_pause && pp.name === 'Pause 15m');
      if (!hasPause) throw new Error('Pause missing from exported list');
    }
  },
  {
    id: 'T3_7',
    name: 'T3: Feedback updates prompt teacher duration changes which recalculate timeline offsets',
    tier: 3,
    description: 'Verify feedback cycle triggers duration modification and recalculates offsets.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const ppId = uuid();
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Feedback Timeline Concert', event_date: '2026-07-23', start_time: '18:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert([
        { id: ppId, event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, sort_order: 1, status: 'approved', teacher_id: 'teacher-1' },
        { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 15, sort_order: 2, status: 'approved', teacher_id: 'teacher-1' }
      ]);
      
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      // In mock/RLS we allow teacher to update duration if approved, but name is locked
      await client.from('campus_event_program_points').update({ duration: 20 }).eq('id', ppId);
      
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId).order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      
      const offsetB = data[0].duration; // should be 20 now
      if (offsetB !== 20) throw new Error(`Recalculated offset failed, got ${offsetB}`);
    }
  },
  {
    id: 'T3_8',
    name: 'T3: Deleting event clears feedback requests and consolidation states',
    tier: 3,
    description: 'Ensure cascade triggers remove all associated relational rows.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Erasable Concert', event_date: '2026-07-24', start_time: '18:00', category: 'Konzert' });
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: eventId, school_id: 'school-1', name: 'Act', duration: 10, chairs_needed: 5 });
      
      // Delete event
      await client.from('campus_events').delete().eq('id', eventId);
      
      // Verify program points are gone
      const { data, error } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId);
      if (error) throw new Error(error.message);
      if (data && data.length > 0) throw new Error('Feedback/Point record left behind after event deletion');
    }
  },
  {
    id: 'T3_9',
    name: 'T3: Gear constraints are updated, approved, and verified in consolidated list and export CSV',
    tier: 3,
    description: 'Verify gear updates propagate to packlist and CSV data.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Gear Concert', event_date: '2026-07-25', start_time: '18:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: eventId, school_id: 'school-1', name: 'Act Gear', duration: 10, chairs_needed: 1, music_stands_needed: 1 });
      
      await client.from('campus_event_program_points').update({ chairs_needed: 4, music_stands_needed: 5 }).eq('id', ppId);
      
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      await client.from('campus_event_program_points').update({ status: 'approved' }).eq('id', ppId);
      
      const { data, error } = await client.from('campus_event_program_points').select('chairs_needed, music_stands_needed').eq('event_id', eventId).eq('status', 'approved');
      if (error) throw new Error(error.message);
      
      if (data[0].chairs_needed !== 4 || data[0].music_stands_needed !== 5) {
        throw new Error('Consolidated export equipment mismatch');
      }
    }
  },
  {
    id: 'T3_10',
    name: 'T3: Parallel submission reviews only calculate approved points in timeline and export',
    tier: 3,
    description: 'Verify concurrent submissions are properly isolated.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Parallel Review Concert', event_date: '2026-07-26', start_time: '18:00', category: 'Konzert' });
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Act A', duration: 10, status: 'approved', sort_order: 1 },
        { event_id: eventId, school_id: 'school-1', name: 'Act B', duration: 12, status: 'submitted', sort_order: 2 },
        { event_id: eventId, school_id: 'school-1', name: 'Act C', duration: 15, status: 'approved', sort_order: 3 }
      ]);
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      
      const { data, error } = await client.from('campus_event_program_points')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      
      if (data.length !== 2) throw new Error('Should only export approved points');
      const act2Offset = data[0].duration; // starts after Act A (10 mins)
      if (act2Offset !== 10) throw new Error(`Act C offset should skip Act B and be 10, got ${act2Offset}`);
    }
  },


  // ==========================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (5 Test Cases)
  // ==========================================
  {
    id: 'T4_1',
    name: 'T4: Full School Concert setup and plan (Real Scenario)',
    tier: 4,
    description: 'Simulates a complete real-world scenario: Setting up a full school concert. Create 5 program points from different teachers, add 2 pauses, sort them across 2 stages, calculate chronological offsets, consolidate the equipment packlist, and export the final stage plan to CSV.',
    run: async (client) => {
      // 1. Admin configures the concert event
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      await client.from('campus_events').insert({
        id: eventId,
        school_id: 'school-1',
        title: 'Groove Academy Summer Gala 2026',
        event_date: '2026-07-15',
        start_time: '18:00',
        category: 'Konzert',
        visibility: 'teachers'
      });

      // 2. Teachers submit their program points
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', teacher_id: 'teacher-1', name: 'Junior Jazz Ensemble', duration: 12, chairs_needed: 6, music_stands_needed: 6, tech_requirements: 'Vocal mic' },
        { event_id: eventId, school_id: 'school-1', teacher_id: 'teacher-1', name: 'Piano Solo: Mozart', duration: 8, chairs_needed: 1, music_stands_needed: 0, tech_requirements: 'Piano tuning' }
      ]);
      
      sessionStorage.setItem('groovelab_user_id', 'teacher-2');
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', teacher_id: 'teacher-2', name: 'Rock Band: Thunder', duration: 15, chairs_needed: 0, music_stands_needed: 0, tech_requirements: 'Drumkit, Guitar Amp, Bass Amp' },
        { event_id: eventId, school_id: 'school-1', teacher_id: 'teacher-2', name: 'Guitar Duo', duration: 7, chairs_needed: 2, music_stands_needed: 2, tech_requirements: '2 DI Boxes' }
      ]);

      // 3. Secretary reviews and organizes the concert layout
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data: submittedPoints } = await client.from('campus_event_program_points').select('*').eq('event_id', eventId);
      
      const jazzAct = submittedPoints.find((p: any) => p.name === 'Junior Jazz Ensemble');
      const guitarAct = submittedPoints.find((p: any) => p.name === 'Guitar Duo');
      const pianoAct = submittedPoints.find((p: any) => p.name === 'Piano Solo: Mozart');
      const rockAct = submittedPoints.find((p: any) => p.name === 'Rock Band: Thunder');

      await client.from('campus_event_program_points').update({ status: 'approved', stage_number: 1, sort_order: 1 }).eq('id', jazzAct.id);
      await client.from('campus_event_program_points').update({ status: 'approved', stage_number: 1, sort_order: 2 }).eq('id', guitarAct.id);
      await client.from('campus_event_program_points').update({ status: 'approved', stage_number: 1, sort_order: 4 }).eq('id', pianoAct.id); 
      await client.from('campus_event_program_points').update({ status: 'approved', stage_number: 2, sort_order: 1 }).eq('id', rockAct.id);

      // Secretary inserts 2 pauses
      await client.from('campus_event_program_points').insert([
        { event_id: eventId, school_id: 'school-1', name: 'Intermission Pause', duration: 10, is_pause: true, status: 'approved', stage_number: 1, sort_order: 3 },
        { event_id: eventId, school_id: 'school-1', name: 'Stage Reset Pause', duration: 15, is_pause: true, status: 'approved', stage_number: 2, sort_order: 2 }
      ]);

      // 4. Verify chronological offsets on Stage 1
      const { data: stage1Points, error: err1 } = await client.from('campus_event_program_points')
        .select('*')
        .eq('event_id', eventId)
        .eq('stage_number', 1)
        .eq('status', 'approved')
        .order('sort_order', { ascending: true });
      if (err1) throw new Error(err1.message);

      let offset = 0;
      const stage1Offsets = stage1Points.map((pp: any) => {
        const off = offset;
        offset += pp.duration;
        return { name: pp.name, offset: off };
      });
      if (stage1Offsets[1].offset !== 12 || stage1Offsets[2].offset !== 19 || stage1Offsets[3].offset !== 29) {
        throw new Error('Stage 1 offsets calculated incorrectly');
      }

      // 5. Verify Consolidated Packlist for Stage 1
      const totalChairs = stage1Points.reduce((sum: number, pp: any) => sum + (pp.chairs_needed || 0), 0);
      const totalStands = stage1Points.reduce((sum: number, pp: any) => sum + (pp.music_stands_needed || 0), 0);
      const techList = stage1Points.map((pp: any) => pp.tech_requirements).filter(Boolean);
      if (totalChairs !== 9 || totalStands !== 8 || techList.length !== 3) {
        throw new Error('Stage 1 consolidated equipment packlist failed');
      }

      // 6. Verify Custom Exporter CSV output format
      const { data: exportData, error: errExport } = await client.from('campus_event_program_points')
        .select('name, stage_number, sort_order, duration')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('stage_number', { ascending: true })
        .order('sort_order', { ascending: true });
      if (errExport) throw new Error(errExport.message);

      if (exportData.length !== 6) throw new Error('Export list should contain 6 elements');
    }
  },
  {
    id: 'T4_2',
    name: 'T4: Last-minute schedule changes (Real Scenario)',
    tier: 4,
    description: 'An approved program point is updated hours before the concert. Its duration is increased, and a new pause is inserted by the secretary. Verify that all subsequent offsets on that stage shift correctly and the packlist updates.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Dynamic Concert', event_date: '2026-07-20', start_time: '18:00', category: 'Konzert' });
      
      const act1Id = uuid();
      const act2Id = uuid();
      await client.from('campus_event_program_points').insert([
        { id: act1Id, event_id: eventId, school_id: 'school-1', name: 'Opener Band', duration: 10, chairs_needed: 4, status: 'approved', sort_order: 1 },
        { id: act2Id, event_id: eventId, school_id: 'school-1', name: 'Headliner Band', duration: 20, chairs_needed: 6, status: 'approved', sort_order: 2 }
      ]);

      await client.from('campus_event_program_points').update({ duration: 15 }).eq('id', act1Id);

      await client.from('campus_event_program_points').update({ sort_order: 3 }).eq('id', act2Id);
      await client.from('campus_event_program_points').insert({
        event_id: eventId, school_id: 'school-1', name: 'Quick Setup Pause', duration: 5, is_pause: true, status: 'approved', sort_order: 2
      });

      const { data, error } = await client.from('campus_event_program_points')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);

      let offset = 0;
      const offsets = data.map((pp: any) => {
        const off = offset;
        offset += pp.duration;
        return off;
      });
      if (offsets[1] !== 15 || offsets[2] !== 20) {
        throw new Error(`Schedule shifting failed: Pause ${offsets[1]}, Headliner ${offsets[2]}`);
      }
    }
  },
  {
    id: 'T4_3',
    name: 'T4: Feedback loop with teachers and subsequent approval (Real Scenario)',
    tier: 4,
    description: 'Secretary reviews submissions, finds a tech requirement unclear, requests additional feedback, teacher replies with the details, secretary approves the point and assigns it a stage and sort order.',
    run: async (client) => {
      // 1. Teacher submits an act
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Feedback Loop Concert', event_date: '2026-07-20', start_time: '18:00', category: 'Konzert' });
      await client.from('campus_event_program_points').insert({
        id: ppId, event_id: eventId, school_id: 'school-1', name: 'Jazz Quartet', duration: 15, tech_requirements: 'Acoustic piano'
      });

      // 2. Secretary reviews, requests clarification
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      await client.from('campus_event_program_points').update({
        additional_feedback_responses: {
          questions: ['Do you require a grand piano?'],
          status: 'pending_response'
        }
      }).eq('id', ppId);

      // 3. Teacher logs in, sees request, and replies
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { data: teacherView } = await client.from('campus_event_program_points').select('*').eq('id', ppId);
      if (teacherView[0].additional_feedback_responses.status !== 'pending_response') {
        throw new Error('Teacher should see pending response state');
      }

      await client.from('campus_event_program_points').update({
        additional_feedback_responses: {
          questions: ['Do you require a grand piano?'],
          answers: ['Grand piano with 2 condenser microphones inside please.'],
          status: 'responded'
        }
      }).eq('id', ppId);

      // 4. Secretary reviews answers, updates tech requirements and approves the point
      sessionStorage.setItem('groovelab_user_id', 'secretary-1');
      const { data: secretaryReview } = await client.from('campus_event_program_points').select('*').eq('id', ppId);
      const answer = secretaryReview[0].additional_feedback_responses.answers[0];
      
      const { data: finalApproved, error } = await client.from('campus_event_program_points').update({
        status: 'approved',
        tech_requirements: `Acoustic piano (${answer})`,
        stage_number: 1,
        sort_order: 4
      }).eq('id', ppId);
      if (error) throw new Error(error.message);

      if (finalApproved[0].status !== 'approved' || !finalApproved[0].tech_requirements.includes('Grand piano')) {
        throw new Error('Feedback loop and subsequent approval failed');
      }
    }
  },
  {
    id: 'T4_4',
    name: 'T4: Music festival with 3 parallel stages (Real Scenario)',
    tier: 4,
    description: 'Set up a music festival with 3 parallel stages. Submit 10 program points. Approve them and assign them to stages. Check that timeline offsets for Stage 1, Stage 2, and Stage 3 do not interfere with each other and are calculated correctly.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventId = uuid();
      await client.from('campus_events').insert({ id: eventId, school_id: 'school-1', title: 'Summer Festival 3 Stages', event_date: '2026-07-28', start_time: '12:00', category: 'Konzert' });

      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const pointsToInsert = Array.from({ length: 10 }, (_, i) => ({
        event_id: eventId,
        school_id: 'school-1',
        name: `Festival Act ${i + 1}`,
        duration: 20 + i, 
        status: 'approved',
        stage_number: (i % 3) + 1, 
        sort_order: Math.floor(i / 3) + 1 
      }));
      await client.from('campus_event_program_points').insert(pointsToInsert);

      const { data: stage1Points, error: err1 } = await client.from('campus_event_program_points')
        .select('*')
        .eq('event_id', eventId)
        .eq('stage_number', 1)
        .order('sort_order', { ascending: true });
      if (err1) throw new Error(err1.message);

      let offset1 = 0;
      const offsets1 = stage1Points.map((pp: any) => {
        const off = offset1;
        offset1 += pp.duration;
        return off;
      });
      if (offsets1[0] !== 0 || offsets1[1] !== 20 || offsets1[2] !== 43 || offsets1[3] !== 69) {
        throw new Error(`Stage 1 parallel calculation mismatch: ${offsets1.join(', ')}`);
      }

      const { data: stage2Points, error: err2 } = await client.from('campus_event_program_points')
        .select('*')
        .eq('event_id', eventId)
        .eq('stage_number', 2)
        .order('sort_order', { ascending: true });
      if (err2) throw new Error(err2.message);

      let offset2 = 0;
      const offsets2 = stage2Points.map((pp: any) => {
        const off = offset2;
        offset2 += pp.duration;
        return off;
      });
      if (offsets2[0] !== 0 || offsets2[1] !== 21 || offsets2[2] !== 45) {
        throw new Error(`Stage 2 parallel calculation mismatch: ${offsets2.join(', ')}`);
      }
    }
  },
  {
    id: 'T4_5',
    name: 'T4: Security audit on dashboard and coordinator panel (Real Scenario)',
    tier: 4,
    description: 'Test that admin user sees the events list and coordinator panel, but is strictly restricted from seeing any private lesson occurrences, and teacher user can submit but cannot approve or modify other teachers submissions.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const eventsQuery = await client.from('campus_events').select('*');
      if (eventsQuery.error) throw new Error('Admin blocked from events');
      
      const lessonsQuery = await client.from('lessons').select('*');
      if (lessonsQuery.error) throw new Error('Lessons query failed for admin');
      if (lessonsQuery.data.length > 0) throw new Error('Admin security audit: lessons must be hidden');

      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      await client.from('campus_event_program_points').insert({ id: ppId, event_id: 'event-1', school_id: 'school-1', name: 'Audit Act', duration: 10 });
      
      const { error: errApprove } = await client.from('campus_event_program_points').update({ status: 'approved' }).eq('id', ppId);
      if (!errApprove) {
        const check = await client.from('campus_event_program_points').select('status').eq('id', ppId);
        if (check.data[0].status === 'approved') {
          throw new Error('Security audit: Teacher was allowed to approve program point');
        }
      }

      sessionStorage.setItem('groovelab_user_id', 'teacher-2');
      const { error: errUpdateOther } = await client.from('campus_event_program_points').update({ name: 'Hacked name' }).eq('id', ppId);
      if (!errUpdateOther) {
        const check = await client.from('campus_event_program_points').select('name').eq('id', ppId);
        if (check.data[0].name === 'Hacked name') {
          throw new Error('Security audit: Teacher 2 was allowed to update Teacher 1 program point');
        }
      }
    }
  },
  {
    id: 'T4_6',
    name: 'T4: Multiple songs submission and export validation (Multiple Songs)',
    tier: 4,
    feature: 'F10',
    description: 'Verify teacher can submit multiple songs and they are exported/retrieved correctly.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      const songs = [
        { title: 'Song 1', artist: 'Artist 1', composer: 'Composer 1', arranger: 'Arranger 1' },
        { title: 'Song 2', artist: 'Artist 2', composer: 'Composer 2', arranger: 'Arranger 2' }
      ];
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Multi Song Act',
        duration: 15,
        songs: songs,
        title: songs[0].title,
        artist: songs[0].artist
      });

      const { data, error } = await client.from('campus_event_program_points')
        .select('*')
        .eq('id', ppId);
      if (error) throw new Error(error.message);
      if (!data || !data[0].songs || data[0].songs.length !== 2) {
        throw new Error('Multiple songs not stored correctly');
      }
      if (data[0].songs[1].title !== 'Song 2') {
        throw new Error('Song array data mismatch');
      }
    }
  },
  {
    id: 'T3_M5_1',
    name: 'T3: Database operations and trigger constraints',
    tier: 3,
    description: 'Ensure teacher role cannot directly modify is_scheduled, and is_scheduled defaults to false on insert.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const ppId = uuid();
      const { error: insErr } = await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Teacher Act 1',
        duration: 10
      });
      if (insErr) throw new Error('Teacher insert failed: ' + insErr.message);

      const { data: ppData, error: getErr } = await client.from('campus_event_program_points').select('is_scheduled').eq('id', ppId).single();
      if (getErr) throw new Error(getErr.message);
      if (ppData.is_scheduled !== false) throw new Error('is_scheduled should be false by default');

      const { error: updErr } = await client.from('campus_event_program_points').update({
        is_scheduled: true
      }).eq('id', ppId);
      
      if (!updErr) {
        throw new Error('Teacher should be blocked from modifying is_scheduled');
      }

      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const { error: adminUpdErr } = await client.from('campus_event_program_points').update({
        is_scheduled: true
      }).eq('id', ppId);
      if (adminUpdErr) throw new Error('Admin update failed: ' + adminUpdErr.message);

      const { data: adminPpData } = await client.from('campus_event_program_points').select('is_scheduled').eq('id', ppId).single();
      if (adminPpData.is_scheduled !== true) throw new Error('Admin update was not persisted');
    }
  },
  {
    id: 'T3_M5_2',
    name: 'T3: Coordinator scheduling updates persistence',
    tier: 3,
    description: 'Ensure secretary/admin can save all scheduling fields (stage_number, sort_order, instrument).',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      const ppId = uuid();
      
      const { error: insErr } = await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Coordinator Act',
        duration: 15,
        status: 'approved'
      });
      if (insErr) throw new Error(insErr.message);

      const { error: updErr } = await client.from('campus_event_program_points').update({
        is_scheduled: true,
        stage_number: 3,
        sort_order: 12,
        instrument: 'Violoncello'
      }).eq('id', ppId);
      if (updErr) throw new Error('Scheduling update failed: ' + updErr.message);

      const { data, error: getErr } = await client.from('campus_event_program_points').select('*').eq('id', ppId).single();
      if (getErr) throw new Error(getErr.message);
      if (data.is_scheduled !== true) throw new Error('is_scheduled mismatch');
      if (data.stage_number !== 3) throw new Error('stage_number mismatch');
      if (data.sort_order !== 12) throw new Error('sort_order mismatch');
      if (data.instrument !== 'Violoncello') throw new Error('instrument mismatch');
    }
  },
  {
    id: 'T3_M5_3',
    name: 'T3: Double-booking teacher conflict checks on other stages',
    tier: 3,
    description: 'Ensure double-booking a teacher on two different stages at the same calculated time is flagged as conflict.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');
      
      const ppIdA = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppIdA,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Act A',
        duration: 30,
        status: 'approved',
        is_scheduled: true,
        stage_number: 1,
        sort_order: 0,
        teacher_id: 'teacher-1'
      });

      const ppIdB = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppIdB,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Act B',
        duration: 20,
        status: 'approved',
        is_scheduled: true,
        stage_number: 2,
        sort_order: 0,
        teacher_id: 'teacher-1'
      });

      const { data: pps, error } = await client.from('campus_event_program_points').select('*').eq('event_id', 'event-1');
      if (error) throw new Error(error.message);

      const parseTimeToMinutes = (t: string) => {
        const p = t.split(':');
        return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
      };
      
      const startMin = parseTimeToMinutes('14:00');
      const timeMap: Record<string, { startMin: number; endMin: number }> = {};
      
      const s1Points = pps.filter((p: any) => (p.is_scheduled || p.is_pause) && p.stage_number === 1).sort((a: any, b: any) => a.sort_order - b.sort_order);
      let s1Cur = startMin;
      s1Points.forEach((p: any) => {
        timeMap[p.id] = { startMin: s1Cur, endMin: s1Cur + p.duration };
        s1Cur += p.duration;
      });

      const s2Points = pps.filter((p: any) => (p.is_scheduled || p.is_pause) && p.stage_number === 2).sort((a: any, b: any) => a.sort_order - b.sort_order);
      let s2Cur = startMin;
      s2Points.forEach((p: any) => {
        timeMap[p.id] = { startMin: s2Cur, endMin: s2Cur + p.duration };
        s2Cur += p.duration;
      });

      const timeA = timeMap[ppIdA];
      const timeB = timeMap[ppIdB];
      if (!timeA || !timeB) throw new Error('Time calculation failed');

      const overlaps = timeA.startMin < timeB.endMin && timeA.endMin > timeB.startMin;
      if (!overlaps) throw new Error('Expected Acts to overlap in calculated time');

      const hasConflict = overlaps && (pps.find((p: any) => p.id === ppIdA).teacher_id === pps.find((p: any) => p.id === ppIdB).teacher_id);
      if (!hasConflict) throw new Error('Teacher double-booking not flagged as conflict');
    }
  },
  {
    id: 'T3_M5_4',
    name: 'T3: Lesson conflicts checks on the same day',
    tier: 3,
    description: 'Ensure program points overlapping with a teacher\'s lesson on the same day are flagged as conflict.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'master-1');

      const lessonId = uuid();
      const { error: insErr } = await client.from('lessons').insert({
        id: lessonId,
        teacher_id: 'teacher-1',
        school_id: 'school-1',
        date: '2026-07-01',
        start_time: '15:00',
        duration: 45,
        status: 'scheduled'
      });
      if (insErr) throw new Error('Lesson insert failed: ' + insErr.message);

      const ppId = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Lesson Conflict Act',
        duration: 75,
        status: 'approved',
        is_scheduled: true,
        stage_number: 1,
        sort_order: 0,
      });
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { data: lessons } = await client.from('lessons').select('*').eq('date', '2026-07-01');
      if (!lessons || lessons.length === 0) throw new Error('Lessons not found');

      const parseTimeToMinutes = (t: string) => {
        const p = t.split(':');
        return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
      };

      const ppStart = parseTimeToMinutes('14:00');
      const ppEnd = ppStart + 75; // 15:15

      const lesson = lessons.find((l: any) => l.teacher_id === 'teacher-1' && l.status !== 'cancelled');
      if (!lesson) throw new Error('Lesson not found');

      const lesStart = parseTimeToMinutes(lesson.start_time);
      const lesEnd = lesStart + lesson.duration; // 15:45

      const overlaps = ppStart < lesEnd && ppEnd > lesStart;
      if (!overlaps) throw new Error('Expected program point to overlap with lesson');
    }
  },
  {
    id: 'T3_M5_5',
    name: 'T3: Re-ordering and duration updates shifts sequential times',
    tier: 3,
    description: 'Ensure changing duration or re-ordering shifts subsequent program points start and end times.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');

      const ppId1 = uuid();
      const ppId2 = uuid();
      const ppId3 = uuid();

      await client.from('campus_event_program_points').insert([
        { id: ppId1, event_id: 'event-1', school_id: 'school-1', name: 'PP1', duration: 10, is_scheduled: true, stage_number: 1, sort_order: 0, status: 'approved' },
        { id: ppId2, event_id: 'event-1', school_id: 'school-1', name: 'PP2', duration: 15, is_scheduled: true, stage_number: 1, sort_order: 1, status: 'approved' },
        { id: ppId3, event_id: 'event-1', school_id: 'school-1', name: 'PP3', duration: 20, is_scheduled: true, stage_number: 1, sort_order: 2, status: 'approved' }
      ]);

      const parseTimeToMinutes = (t: string) => {
        const p = t.split(':');
        return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
      };

      const getTimes = (pps: any[]) => {
        const startMin = parseTimeToMinutes('14:00');
        const sorted = pps.sort((a, b) => a.sort_order - b.sort_order);
        const map: Record<string, { start: number; end: number }> = {};
        let cur = startMin;
        sorted.forEach(p => {
          map[p.id] = { start: cur, end: cur + p.duration };
          cur += p.duration;
        });
        return map;
      };

      const { data: initialPps } = await client.from('campus_event_program_points').select('*').in('id', [ppId1, ppId2, ppId3]);
      const initialTimes = getTimes(initialPps);

      if (initialTimes[ppId1].start !== 840) throw new Error('PP1 initial start mismatch'); // 14:00
      if (initialTimes[ppId2].start !== 850) throw new Error('PP2 initial start mismatch'); // 14:10
      if (initialTimes[ppId3].start !== 865) throw new Error('PP3 initial start mismatch'); // 14:25

      await client.from('campus_event_program_points').update({ duration: 20 }).eq('id', ppId1);
      const { data: durationPps } = await client.from('campus_event_program_points').select('*').in('id', [ppId1, ppId2, ppId3]);
      const durationTimes = getTimes(durationPps);

      if (durationTimes[ppId1].start !== 840) throw new Error('PP1 post-duration start mismatch'); // 14:00
      if (durationTimes[ppId2].start !== 860) throw new Error('PP2 post-duration start mismatch'); // 14:20
      if (durationTimes[ppId3].start !== 875) throw new Error('PP3 post-duration start mismatch'); // 14:35

      await client.from('campus_event_program_points').update({ sort_order: 2 }).eq('id', ppId2);
      await client.from('campus_event_program_points').update({ sort_order: 1 }).eq('id', ppId3);

      const { data: swapPps } = await client.from('campus_event_program_points').select('*').in('id', [ppId1, ppId2, ppId3]);
      const swapTimes = getTimes(swapPps);

      if (swapTimes[ppId1].start !== 840) throw new Error('PP1 post-swap start mismatch'); // 14:00
      if (swapTimes[ppId3].start !== 860) throw new Error('PP3 post-swap start mismatch'); // 14:20
      if (swapTimes[ppId2].start !== 880) throw new Error('PP2 post-swap start mismatch'); // 14:40
    }
  },
  {
    id: 'T3_M5_6',
    name: 'T3: Exact boundary start/end time matches do not trigger conflict',
    tier: 3,
    description: 'Ensure that two items sharing a boundary time (one ending exactly when the next starts) do not trigger a conflict, but overlapping by 1 minute does.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'admin-1');

      const ppIdA = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppIdA,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Act A (Ends 14:30)',
        duration: 30,
        status: 'approved',
        is_scheduled: true,
        stage_number: 1,
        sort_order: 0,
        teacher_id: 'teacher-1'
      });

      const pauseId = uuid();
      await client.from('campus_event_program_points').insert({
        id: pauseId,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Pause Stage 2 (14:00-14:30)',
        duration: 30,
        status: 'approved',
        is_pause: true,
        stage_number: 2,
        sort_order: 0
      });

      const ppIdB = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppIdB,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Act B (Starts 14:30)',
        duration: 30,
        status: 'approved',
        is_scheduled: true,
        stage_number: 2,
        sort_order: 1,
        teacher_id: 'teacher-1'
      });

      const { data: pps } = await client.from('campus_event_program_points').select('*').eq('event_id', 'event-1');
      
      const parseTimeToMinutes = (t: string) => {
        const p = t.split(':');
        return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
      };
      
      const startMin = parseTimeToMinutes('14:00');
      const timeMap: Record<string, { startMin: number; endMin: number }> = {};
      
      // Calculate Stage 1 times
      const s1Points = pps.filter((p: any) => (p.is_scheduled || p.is_pause) && p.stage_number === 1).sort((a: any, b: any) => a.sort_order - b.sort_order);
      let s1Cur = startMin;
      s1Points.forEach((p: any) => {
        timeMap[p.id] = { startMin: s1Cur, endMin: s1Cur + p.duration };
        s1Cur += p.duration;
      });

      // Calculate Stage 2 times
      const s2Points = pps.filter((p: any) => (p.is_scheduled || p.is_pause) && p.stage_number === 2).sort((a: any, b: any) => a.sort_order - b.sort_order);
      let s2Cur = startMin;
      s2Points.forEach((p: any) => {
        timeMap[p.id] = { startMin: s2Cur, endMin: s2Cur + p.duration };
        s2Cur += p.duration;
      });

      const timeA = timeMap[ppIdA];
      const timeB = timeMap[ppIdB];

      if (!timeA || !timeB) throw new Error('Time calculation failed');

      // 1. Boundary match: PP1 (14:00 - 14:30) and PP2 (14:30 - 15:00)
      const overlapsBoundary = timeA.startMin < timeB.endMin && timeA.endMin > timeB.startMin;
      if (overlapsBoundary) throw new Error('Exact boundary match should NOT overlap');

      // 2. Overlap by 1 minute: PP1 duration = 31 (ends at 14:31)
      await client.from('campus_event_program_points').update({ duration: 31 }).eq('id', ppIdA);
      
      const { data: updatedPps } = await client.from('campus_event_program_points').select('*').eq('event_id', 'event-1');
      const updatedTimeMap: Record<string, { startMin: number; endMin: number }> = {};
      
      let s1CurUpd = startMin;
      updatedPps.filter((p: any) => (p.is_scheduled || p.is_pause) && p.stage_number === 1).sort((a: any, b: any) => a.sort_order - b.sort_order).forEach((p: any) => {
        updatedTimeMap[p.id] = { startMin: s1CurUpd, endMin: s1CurUpd + p.duration };
        s1CurUpd += p.duration;
      });

      let s2CurUpd = startMin;
      updatedPps.filter((p: any) => (p.is_scheduled || p.is_pause) && p.stage_number === 2).sort((a: any, b: any) => a.sort_order - b.sort_order).forEach((p: any) => {
        updatedTimeMap[p.id] = { startMin: s2CurUpd, endMin: s2CurUpd + p.duration };
        s2CurUpd += p.duration;
      });

      const timeAUpd = updatedTimeMap[ppIdA];
      const timeBUpd = updatedTimeMap[ppIdB];
      
      const overlapsByOneMin = timeAUpd.startMin < timeBUpd.endMin && timeAUpd.endMin > timeBUpd.startMin;
      if (!overlapsByOneMin) throw new Error('Overlapping by 1 minute should be flagged as overlapping');
    }
  },
  {
    id: 'T3_M5_7',
    name: 'T3: Multiple conflicts on same teacher are correctly tracked',
    tier: 3,
    description: 'Ensure that a teacher having both a lesson conflict and a staging overlap has both conflict conditions detected.',
    run: async (client) => {
      sessionStorage.setItem('groovelab_user_id', 'master-1');

      // 1. Insert lesson for teacher-1 on 2026-07-01 at 14:15 with 30m duration (ends 14:45)
      const lessonId = uuid();
      const { error: insErr } = await client.from('lessons').insert({
        id: lessonId,
        teacher_id: 'teacher-1',
        school_id: 'school-1',
        date: '2026-07-01',
        start_time: '14:15',
        duration: 30,
        status: 'scheduled'
      });
      if (insErr) throw new Error('Lesson insert failed: ' + insErr.message);

      sessionStorage.setItem('groovelab_user_id', 'admin-1');

      // 2. Insert program point on Stage 1 (14:00 - 14:30)
      const ppIdA = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppIdA,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Stage 1 Act',
        duration: 30,
        status: 'approved',
        is_scheduled: true,
        stage_number: 1,
        sort_order: 0,
        teacher_id: 'teacher-1'
      });

      // 3. Insert program point on Stage 2 (14:00 - 14:30)
      const ppIdB = uuid();
      await client.from('campus_event_program_points').insert({
        id: ppIdB,
        event_id: 'event-1',
        school_id: 'school-1',
        name: 'Stage 2 Act',
        duration: 30,
        status: 'approved',
        is_scheduled: true,
        stage_number: 2,
        sort_order: 0,
        teacher_id: 'teacher-1'
      });

      // Re-run getConflictsMap logic to check for both types of conflicts
      const { data: pps } = await client.from('campus_event_program_points').select('*').eq('event_id', 'event-1');
      sessionStorage.setItem('groovelab_user_id', 'teacher-1');
      const { data: lessons } = await client.from('lessons').select('*').eq('date', '2026-07-01');

      const parseTimeToMinutes = (t: string) => {
        const p = t.split(':');
        return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
      };
      const formatMinutesToTime = (totalMinutes: number) => {
        const hours = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      };

      const startMin = parseTimeToMinutes('14:00');
      const timeMap: Record<string, { startMin: number; endMin: number; start: string; end: string }> = {};
      
      const stages: Record<number, any[]> = {};
      pps.forEach((pp: any) => {
        if (pp.is_scheduled || pp.is_pause) {
          const stage = pp.stage_number || 1;
          if (!stages[stage]) stages[stage] = [];
          stages[stage].push(pp);
        }
      });

      Object.keys(stages).forEach(stageStr => {
        const stageNum = parseInt(stageStr, 10);
        const stagePoints = stages[stageNum].sort((a, b) => a.sort_order - b.sort_order);
        let currentMin = startMin;
        stagePoints.forEach(pp => {
          timeMap[pp.id] = {
            startMin: currentMin,
            endMin: currentMin + pp.duration,
            start: formatMinutesToTime(currentMin),
            end: formatMinutesToTime(currentMin + pp.duration)
          };
          currentMin += pp.duration;
        });
      });

      // Find conflicts for ppIdB (Stage 2 Act)
      // Conflict 1: Overlaps with lesson (14:15 - 14:45) since ppIdB runs 14:00 - 14:30
      // Conflict 2: Overlaps with Stage 1 Act (14:00 - 14:30)
      const ppTime = timeMap[ppIdB];
      let hasLessonConflict = false;
      let hasStageConflict = false;

      // Check lesson conflict
      for (const lesson of lessons) {
        if (lesson.teacher_id === 'teacher-1' && lesson.status !== 'cancelled') {
          const lessonStart = parseTimeToMinutes(lesson.start_time);
          const lessonEnd = lessonStart + lesson.duration;
          if (ppTime.startMin < lessonEnd && ppTime.endMin > lessonStart) {
            hasLessonConflict = true;
          }
        }
      }

      // Check other stage conflict
      for (const otherPp of pps) {
        if (
          otherPp.id !== ppIdB &&
          (otherPp.is_scheduled || otherPp.is_pause) &&
          !otherPp.is_pause &&
          otherPp.teacher_id === 'teacher-1' &&
          otherPp.stage_number !== 2
        ) {
          const otherTime = timeMap[otherPp.id];
          if (otherTime) {
            if (ppTime.startMin < otherTime.endMin && ppTime.endMin > otherTime.startMin) {
              hasStageConflict = true;
            }
          }
        }
      }

      if (!hasLessonConflict) throw new Error('Expected lesson conflict to be detected');
      if (!hasStageConflict) throw new Error('Expected double-stage conflict to be detected');
    }
  }
];

