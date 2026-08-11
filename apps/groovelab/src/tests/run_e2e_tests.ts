import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Setup browser globals for Node.js environment
const mockStorage = () => {
  const storage: Record<string, string> = {};
  return {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
    key: (index: number) => Object.keys(storage)[index] || null,
    get length() { return Object.keys(storage).length; }
  };
};

if (typeof global.sessionStorage === 'undefined') {
  (global as any).sessionStorage = mockStorage();
}
if (typeof global.localStorage === 'undefined') {
  (global as any).localStorage = mockStorage();
}

// Load environment variables from .env.local in root and subfolders
const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env.local') });
dotenv.config({ path: path.resolve(cwd, 'apps/groovelab/.env.local') });

// Define database types
interface User {
  id: string;
  role: 'student' | 'teacher' | 'admin' | 'secretary';
  school_id: string;
  first_name: string;
  last_name: string;
  is_master_admin?: boolean;
  parent_pin?: string;
  pin_enforced_for_preview?: boolean;
  has_parent_pin?: boolean;
}

interface School {
  id: string;
  name: string;
}

interface Lesson {
  id: string;
  teacher_id: string;
  student_id: string;
  school_id: string;
  date: string;
  start_time: string;
  duration: number;
  status: string;
}

interface CampusEvent {
  id: string;
  school_id: string;
  title: string;
  description?: string;
  event_date: string;
  event_end_date?: string;
  start_time: string;
  end_time?: string;
  category: string;
  created_by: string;
  is_public: boolean;
  visibility?: 'all' | 'teachers' | 'students' | 'private';
}

interface ProgramPoint {
  id: string;
  event_id: string;
  school_id: string;
  teacher_id?: string;
  name: string;
  ensemble_band?: string;
  performer_count: number;
  duration: number;
  preferred_time?: string;
  title?: string;
  artist?: string;
  composer?: string;
  arranger?: string;
  publisher?: string;
  tech_requirements?: string;
  chairs_needed: number;
  music_stands_needed: number;
  remarks?: string;
  stage_number: number;
  sort_order: number;
  is_pause: boolean;
  status: 'submitted' | 'approved' | 'rejected';
  additional_feedback_responses: Record<string, any>;
  songs?: any[];
  instrument?: string | null;
  is_scheduled: boolean;
}

// In-Memory Mock Database
class MockDatabase {
  users: User[] = [];
  schools: School[] = [];
  lessons: Lesson[] = [];
  campus_events: CampusEvent[] = [];
  campus_event_program_points: ProgramPoint[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.users = [
      { id: 'teacher-1', role: 'teacher', school_id: 'school-1', first_name: 'John', last_name: 'Doe' },
      { id: 'teacher-2', role: 'teacher', school_id: 'school-1', first_name: 'Alice', last_name: 'Smith' },
      { id: 'student-1', role: 'student', school_id: 'school-1', first_name: 'Jane', last_name: 'Smith', parent_pin: '1234', has_parent_pin: true, pin_enforced_for_preview: false },
      { id: 'student-2', role: 'student', school_id: 'school-1', first_name: 'Bob', last_name: 'Jones', has_parent_pin: false, pin_enforced_for_preview: false },
      { id: 'admin-1', role: 'admin', school_id: 'school-1', first_name: 'Admin', last_name: 'User' },
      { id: 'secretary-1', role: 'secretary', school_id: 'school-1', first_name: 'Sec', last_name: 'Retary' },
      { id: 'master-1', role: 'admin', school_id: 'school-1', first_name: 'Master', last_name: 'Admin', is_master_admin: true }
    ];

    this.schools = [
      { id: 'school-1', name: 'Groove Academy' }
    ];

    this.lessons = [
      { id: 'lesson-1', teacher_id: 'teacher-1', student_id: 'student-1', school_id: 'school-1', date: '2026-06-17', start_time: '10:00', duration: 45, status: 'scheduled' },
      { id: 'lesson-2', teacher_id: 'teacher-1', student_id: 'student-2', school_id: 'school-1', date: '2026-06-18', start_time: '11:00', duration: 45, status: 'scheduled' },
      { id: 'lesson-3', teacher_id: 'teacher-2', student_id: 'student-1', school_id: 'school-1', date: '2026-06-17', start_time: '14:00', duration: 60, status: 'scheduled' }
    ];

    this.campus_events = [
      { id: 'event-1', school_id: 'school-1', title: 'Summer Festival 2026', event_date: '2026-07-01', start_time: '14:00', end_time: '18:00', category: 'Konzert', created_by: 'admin-1', is_public: true, visibility: 'all' }
    ];

    this.campus_event_program_points = [];
  }

  async runQuery(table: string, options: any) {
    const userId = sessionStorage.getItem('groovelab_user_id');
    const user = this.users.find(u => u.id === userId);

    let data: any[] = [];
    if (table === 'users') {
      data = JSON.parse(JSON.stringify(this.users));
    } else if (table === 'schools') {
      data = JSON.parse(JSON.stringify(this.schools));
    } else if (table === 'lessons') {
      if (!user) {
        data = [];
      } else if (user.role === 'admin' || user.role === 'secretary') {
        data = [];
      } else if (user.role === 'teacher') {
        data = JSON.parse(JSON.stringify(this.lessons)).filter((l: any) => l.teacher_id === user.id);
      } else if (user.role === 'student') {
        data = JSON.parse(JSON.stringify(this.lessons)).filter((l: any) => l.student_id === user.id);
      } else {
        data = [];
      }
    } else if (table === 'campus_events') {
      data = JSON.parse(JSON.stringify(this.campus_events));
      
      // Multi-tenant / Visibility logic
      if (user && user.role === 'student') {
        data = data.filter(e => e.visibility !== 'teachers' && e.visibility !== 'private');
      } else if (!user) {
        data = data.filter(e => e.visibility !== 'teachers' && e.visibility !== 'private');
      }
    } else if (table === 'campus_event_program_points') {
      data = JSON.parse(JSON.stringify(this.campus_event_program_points));

      // Multi-tenant isolation logic
      if (user && user.role === 'teacher') {
        // Teachers should only see program points for events they have access to.
        // If an event is private, only the creator or event school people can see,
        // but here we filter program points of private events if they don't belong to the teacher.
        data = data.filter(pp => {
          const event = this.campus_events.find(e => e.id === pp.event_id);
          if (event && event.visibility === 'private' && pp.teacher_id !== user.id) {
            return false;
          }
          return true;
        });
      } else if (user && user.role === 'student') {
        // Students cannot see feedback fields or private event program points
        data = data.map(pp => ({ ...pp, additional_feedback_responses: {} }));
      }
    } else {
      throw { message: `relation "${table}" does not exist`, code: '42P01' };
    }

    // Apply filters
    if (options.filters && options.filters.length > 0) {
      for (const filter of options.filters) {
        data = data.filter(item => {
          if (filter.col.includes('.')) return true;
          if (filter.isIn) {
            return filter.val.includes(item[filter.col]);
          }
          return item[filter.col] === filter.val;
        });
      }
    }

    // Apply ordering
    if (options.orderByCol) {
      data.sort((a, b) => {
        const valA = a[options.orderByCol];
        const valB = b[options.orderByCol];
        if (valA === valB) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;
        const res = valA < valB ? -1 : 1;
        return options.orderAsc ? res : -res;
      });
    }

    // Handle delete
    if (options.isDelete) {
      if (!options.filters || options.filters.length === 0) {
        throw new Error('Deletes must have filters in mock database');
      }
      
      const toDelete = data;
      const idsToDelete = toDelete.map(item => item.id);
      
      if (table === 'campus_events') {
        this.campus_events = this.campus_events.filter(e => !idsToDelete.includes(e.id));
        // Cascade delete program points
        this.campus_event_program_points = this.campus_event_program_points.filter(pp => !idsToDelete.includes(pp.event_id));
      } else if (table === 'campus_event_program_points') {
        this.campus_event_program_points = this.campus_event_program_points.filter(pp => !idsToDelete.includes(pp.id));
      } else if (table === 'lessons') {
        this.lessons = this.lessons.filter(l => !idsToDelete.includes(l.id));
      }
      return toDelete;
    }

    // Handle update
    if (options.updateData) {
      if (!options.filters || options.filters.length === 0) {
        throw new Error('Updates must have filters in mock database');
      }

      // Perform validation checks
      if (table === 'campus_event_program_points') {
        // Status validation
        if (options.updateData.status && !['submitted', 'approved', 'rejected'].includes(options.updateData.status)) {
          throw { message: 'new row for relation "campus_event_program_points" violates check constraint "status_check"', code: '23514' };
        }
        // Duration validation
        if (options.updateData.duration !== undefined && options.updateData.duration <= 0) {
          throw { message: 'duration must be greater than 0', code: '23514' };
        }
        // Performer count validation
        if (options.updateData.performer_count !== undefined && options.updateData.performer_count < 1) {
          throw { message: 'performer_count must be at least 1', code: '23514' };
        }
        // Sort order validation
        if (options.updateData.sort_order !== undefined && options.updateData.sort_order < 0) {
          throw { message: 'sort_order must be non-negative', code: '23514' };
        }
        // Stage number validation
        if (options.updateData.stage_number !== undefined && options.updateData.stage_number < 1) {
          throw { message: 'stage_number must be at least 1', code: '23514' };
        }

        // Security check: teacher cannot edit approved point
        if (user && user.role === 'teacher') {
          for (const item of data) {
            if (item.status === 'approved' && options.updateData.name !== undefined) {
              throw { message: 'Cannot edit name of an approved program point', code: '42501' };
            }
            if (item.status === 'rejected' && options.updateData.name !== undefined) {
              throw { message: 'Cannot edit name of a rejected program point', code: '42501' };
            }
          }
        }

        // Check if we are updating additional_feedback_responses on a rejected point
        if (options.updateData.additional_feedback_responses) {
          for (const item of data) {
            if (item.status === 'rejected') {
              throw { message: 'Cannot request feedback on a rejected program point', code: '42501' };
            }
          }
        }

        // Feedback validation: questions and answers length
        if (options.updateData.additional_feedback_responses) {
          const fb = options.updateData.additional_feedback_responses;
          if (fb.questions && fb.answers) {
            if (fb.answers.length > 0 && fb.questions.length !== fb.answers.length) {
              throw { message: 'Questions and answers length mismatch', code: '23514' };
            }
          }
          if (fb.questions && fb.questions.length === 0 && fb.status === 'pending') {
            throw { message: 'Questions list cannot be empty', code: '23514' };
          }
        }
      }

      const updatedRows: any[] = [];
      const targetList: any[] = table === 'campus_events' ? this.campus_events :
                         table === 'campus_event_program_points' ? this.campus_event_program_points :
                         table === 'users' ? this.users :
                         table === 'lessons' ? this.lessons : [];

      for (const item of targetList) {
        const matches = options.filters.every((f: any) => item[f.col] === f.val);
        if (matches) {
          // Security checks for updates
          if (table === 'campus_event_program_points') {
            if (user && user.role === 'teacher') {
              if (item.teacher_id && item.teacher_id !== user.id) {
                throw { message: 'Permission denied for modifying other teacher point', code: '42501' };
              }
              if (options.updateData.status && options.updateData.status !== 'submitted') {
                throw { message: 'Teachers cannot approve or reject program points', code: '42501' };
              }
              // Prevent teacher from changing questions
              if (options.updateData.additional_feedback_responses && options.updateData.additional_feedback_responses.questions) {
                const newQuestions = options.updateData.additional_feedback_responses.questions;
                const oldQuestions = item.additional_feedback_responses?.questions || [];
                if (JSON.stringify(newQuestions) !== JSON.stringify(oldQuestions)) {
                  throw { message: 'Teachers cannot modify or add feedback questions', code: '42501' };
                }
              }
              // Prevent teacher from answering if no questions exist
              if (options.updateData.additional_feedback_responses && options.updateData.additional_feedback_responses.answers) {
                const oldQuestions = item.additional_feedback_responses?.questions || [];
                if (oldQuestions.length === 0) {
                  throw { message: 'Cannot submit answers when there are no pending questions', code: '42501' };
                }
              }
              // Prevent teacher from modifying is_scheduled column
              if (options.updateData.is_scheduled !== undefined && options.updateData.is_scheduled !== item.is_scheduled) {
                throw { message: 'Unauthorized column modification', code: '42501' };
              }
            }
          }
          Object.assign(item, options.updateData);
          updatedRows.push(JSON.parse(JSON.stringify(item)));
        }
      }
      return updatedRows;
    }

    // Handle insert
    if (options.insertData) {
      const rowsToInsert = Array.isArray(options.insertData) ? options.insertData : [options.insertData];
      const insertedRows: any[] = [];

      for (const row of rowsToInsert) {
        if (table === 'campus_events') {
          // Validation checks
          if (!row.title || row.title.trim() === '') {
            throw { message: 'null value in column "title" violates not-null constraint', code: '23502' };
          }
          if (!row.event_date || row.event_date.trim() === '') {
            throw { message: 'null value in column "event_date" violates not-null constraint', code: '23502' };
          }
          if (row.end_time && row.start_time && row.end_time < row.start_time) {
            throw { message: 'end_time cannot be before start_time', code: '23514' };
          }
          if (user && user.role === 'student') {
            throw { message: 'Students cannot configure events', code: '42501' };
          }

          const newRow = {
            id: row.id || `event-${Math.random().toString(36).substring(2, 11)}`,
            school_id: row.school_id,
            title: row.title,
            description: row.description || null,
            event_date: row.event_date,
            event_end_date: row.event_end_date || null,
            start_time: row.start_time,
            end_time: row.end_time || null,
            category: row.category || 'Sonstiges',
            created_by: row.created_by || userId || 'unknown',
            is_public: row.is_public === undefined ? true : row.is_public,
            visibility: row.visibility || 'all'
          };
          this.campus_events.push(newRow);
          insertedRows.push(JSON.parse(JSON.stringify(newRow)));
        } else if (table === 'campus_event_program_points') {
          // Validation checks
          const event = this.campus_events.find(e => e.id === row.event_id);
          if (!event) {
            throw { message: 'insert or update on table "campus_event_program_points" violates foreign key constraint "fk_event"', code: '23503' };
          }

          // Security check: teacher submits to private event of someone else
          if (user && user.role === 'teacher') {
            if (event.visibility === 'private' && event.created_by !== user.id) {
              throw { message: 'Cannot submit to another user\'s private event', code: '42501' };
            }
          }

          const status = row.status || 'submitted';
          if (!['submitted', 'approved', 'rejected'].includes(status)) {
            throw { message: 'violates check constraint "status_check"', code: '23514' };
          }
          const performer_count = row.performer_count === undefined ? 1 : row.performer_count;
          if (performer_count < 1) {
            throw { message: 'performer_count must be >= 1', code: '23514' };
          }
          const duration = row.duration;
          if (duration === undefined || duration <= 0) {
            throw { message: 'duration must be > 0', code: '23514' };
          }
          const sort_order = row.sort_order === undefined ? 0 : row.sort_order;
          if (sort_order < 0) {
            throw { message: 'sort_order must be >= 0', code: '23514' };
          }
          const stage_number = row.stage_number === undefined ? 1 : row.stage_number;
          if (stage_number < 1) {
            throw { message: 'stage_number must be >= 1', code: '23514' };
          }
          if (row.chairs_needed !== undefined && row.chairs_needed < 0) {
            throw { message: 'chairs_needed must be non-negative', code: '23514' };
          }
          if (row.music_stands_needed !== undefined && row.music_stands_needed < 0) {
            throw { message: 'music_stands_needed must be non-negative', code: '23514' };
          }

          const newRow = {
            id: row.id || `pp-${Math.random().toString(36).substring(2, 11)}`,
            event_id: row.event_id,
            school_id: row.school_id,
            teacher_id: row.teacher_id || userId || undefined,
            name: row.name,
            ensemble_band: row.ensemble_band || null,
            performer_count,
            duration,
            preferred_time: row.preferred_time || null,
            title: row.title || null,
            artist: row.artist || null,
            composer: row.composer || null,
            arranger: row.arranger || null,
            publisher: row.publisher || null,
            tech_requirements: row.tech_requirements || null,
            chairs_needed: row.chairs_needed === undefined ? 0 : row.chairs_needed,
            music_stands_needed: row.music_stands_needed === undefined ? 0 : row.music_stands_needed,
            remarks: row.remarks || null,
            stage_number,
            sort_order,
            is_pause: row.is_pause || false,
            status,
            additional_feedback_responses: row.additional_feedback_responses || {},
            songs: row.songs || [],
            instrument: row.instrument || null,
            is_scheduled: (user && user.role === 'teacher') ? false : (row.is_scheduled !== undefined ? row.is_scheduled : false)
          };
          this.campus_event_program_points.push(newRow);
          insertedRows.push(JSON.parse(JSON.stringify(newRow)));
        } else if (table === 'lessons') {
          const newRow = {
            id: row.id || `lesson-${Math.random().toString(36).substring(2, 11)}`,
            teacher_id: row.teacher_id,
            student_id: row.student_id,
            school_id: row.school_id,
            date: row.date,
            start_time: row.start_time,
            duration: row.duration,
            status: row.status || 'scheduled'
          };
          this.lessons.push(newRow);
          insertedRows.push(JSON.parse(JSON.stringify(newRow)));
        }
      }
      return Array.isArray(options.insertData) ? insertedRows : insertedRows[0];
    }

    if (options.isSingle) {
      if (data.length === 0) {
        throw { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' };
      }
      return data[0];
    }

    return data;
  }
}

class MockSupabaseQueryBuilder {
  private tableName: string;
  private db: MockDatabase;
  private filters: { col: string; val: any; isIn?: boolean }[] = [];
  private isSingle = false;
  private isDelete = false;
  private updateData: any = null;
  private insertData: any = null;
  private orderByCol: string | null = null;
  private orderAsc = true;
  private selectCols = '*';

  constructor(tableName: string, db: MockDatabase) {
    this.tableName = tableName;
    this.db = db;
  }

  select(columns: string = '*') {
    this.selectCols = columns;
    return this;
  }

  insert(data: any) {
    this.insertData = data;
    return this;
  }

  update(data: any) {
    this.updateData = data;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ col: column, val: value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ col: column, val: values, isIn: true });
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderByCol = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  async execute() {
    try {
      const result = await this.db.runQuery(this.tableName, {
        filters: this.filters,
        isSingle: this.isSingle,
        isDelete: this.isDelete,
        updateData: this.updateData,
        insertData: this.insertData,
        orderByCol: this.orderByCol,
        orderAsc: this.orderAsc,
        selectCols: this.selectCols,
      });
      return { data: result, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message, code: err.code || 'UNKNOWN' } };
    }
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class MockSupabaseClient {
  db: MockDatabase;

  constructor(db: MockDatabase) {
    this.db = db;
  }

  from(tableName: string) {
    return new MockSupabaseQueryBuilder(tableName, this.db);
  }

  rpc(fnName: string, args: any) {
    return {
      then: (onfulfilled?: (value: any) => any) => {
        let data: any = null;
        if (fnName === 'verify_parent_pin') {
          const student = this.db.users.find(u => u.id === args.student_id) as any;
          data = (student && student.parent_pin === args.input_pin);
        }
        if (onfulfilled) {
          onfulfilled({ data, error: null });
        }
        return Promise.resolve({ data, error: null });
      }
    };
  }
}

// Instantiate database
const mockDb = new MockDatabase();

async function seedRealDatabase(serviceClient: any) {
  console.log('Seeding remote Supabase database with test users and lessons...');

  // 1. School
  const { error: schoolError } = await serviceClient.from('schools').upsert([
    { id: '11111111-1111-1111-1111-111111111111', name: 'Groove Academy' }
  ]);
  if (schoolError) {
    console.error('Failed to seed schools:', schoolError);
    throw schoolError;
  }

  // 2. Users
  const usersToSeed = [
    {
      id: '22222222-2222-2222-2222-222222222221',
      school_id: '11111111-1111-1111-1111-111111111111',
      role: 'teacher',
      first_name: 'John',
      last_name: 'Doe',
      roles: ['teacher'],
      is_active: true,
      is_campus_active: true,
      is_groovelab_active: true,
      is_master_admin: false
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      school_id: '11111111-1111-1111-1111-111111111111',
      role: 'teacher',
      first_name: 'Alice',
      last_name: 'Smith',
      roles: ['teacher'],
      is_active: true,
      is_campus_active: true,
      is_groovelab_active: true,
      is_master_admin: false
    },
    {
      id: '33333333-3333-3333-3333-333333333331',
      school_id: '11111111-1111-1111-1111-111111111111',
      role: 'student',
      first_name: 'Jane',
      last_name: 'Smith',
      roles: ['student'],
      is_active: true,
      is_campus_active: true,
      is_groovelab_active: true,
      is_master_admin: false
    },
    {
      id: '33333333-3333-3333-3333-333333333332',
      school_id: '11111111-1111-1111-1111-111111111111',
      role: 'student',
      first_name: 'Bob',
      last_name: 'Jones',
      roles: ['student'],
      is_active: true,
      is_campus_active: true,
      is_groovelab_active: true,
      is_master_admin: false
    },
    {
      id: '44444444-4444-4444-4444-444444444441',
      school_id: '11111111-1111-1111-1111-111111111111',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User',
      roles: ['admin'],
      is_active: true,
      is_campus_active: true,
      is_groovelab_active: true,
      is_master_admin: false
    },
    {
      id: '44444444-4444-4444-4444-444444444442',
      school_id: '11111111-1111-1111-1111-111111111111',
      role: 'secretary',
      first_name: 'Sec',
      last_name: 'Retary',
      roles: ['secretary'],
      is_active: true,
      is_campus_active: true,
      is_groovelab_active: true,
      is_master_admin: false
    },
    {
      id: '99999999-9999-9999-9999-999999999999',
      school_id: '11111111-1111-1111-1111-111111111111',
      role: 'admin',
      first_name: 'Master',
      last_name: 'Admin',
      roles: ['admin'],
      is_active: true,
      is_campus_active: true,
      is_groovelab_active: true,
      is_master_admin: true
    }
  ];

  const { error: usersError } = await serviceClient.from('users_raw').upsert(usersToSeed);
  if (usersError) {
    console.error('Failed to seed users:', usersError);
    throw usersError;
  }

  // 3. Lessons
  const lessonsToSeed = [
    {
      id: '66666666-6666-6666-6666-666666666661',
      teacher_id: '22222222-2222-2222-2222-222222222221',
      student_id: '33333333-3333-3333-3333-333333333331',
      school_id: '11111111-1111-1111-1111-111111111111',
      date: '2026-06-17',
      start_time: '10:00',
      duration: 45,
      status: 'scheduled'
    },
    {
      id: '66666666-6666-6666-6666-666666666662',
      teacher_id: '22222222-2222-2222-2222-222222222221',
      student_id: '33333333-3333-3333-3333-333333333332',
      school_id: '11111111-1111-1111-1111-111111111111',
      date: '2026-06-18',
      start_time: '11:00',
      duration: 45,
      status: 'scheduled'
    },
    {
      id: '66666666-6666-6666-6666-666666666663',
      teacher_id: '22222222-2222-2222-2222-222222222222',
      student_id: '33333333-3333-3333-3333-333333333331',
      school_id: '11111111-1111-1111-1111-111111111111',
      date: '2026-06-17',
      start_time: '14:00',
      duration: 60,
      status: 'scheduled'
    }
  ];

  const { error: lessonsError } = await serviceClient.from('lessons').upsert(lessonsToSeed);
  if (lessonsError) {
    console.error('Failed to seed lessons:', lessonsError);
    throw lessonsError;
  }

  console.log('Successfully completed real database seeding.');
}

// Main Execution
async function main() {
  const useMock = process.env.USE_MOCK === 'true';
  console.log(`====================================================`);
  console.log(`RUNNING GROOVELAB OVERHAUL E2E TESTS`);
  console.log(`Mode: ${useMock ? 'MOCK MODE (In-Memory State)' : 'REAL SUPABASE CLIENT'}`);
  console.log(`====================================================`);

  let client: any;
  if (useMock) {
    client = new MockSupabaseClient(mockDb);
  } else {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for real mode.');
      process.exit(1);
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
    const serviceClient = createClient(supabaseUrl, serviceKey);
    await seedRealDatabase(serviceClient);

    const idMap: Record<string, string> = {
      'school-1': '11111111-1111-1111-1111-111111111111',
      'teacher-1': '22222222-2222-2222-2222-222222222221',
      'teacher-2': '22222222-2222-2222-2222-222222222222',
      'student-1': '33333333-3333-3333-3333-333333333331',
      'student-2': '33333333-3333-3333-3333-333333333332',
      'admin-1': '44444444-4444-4444-4444-444444444441',
      'secretary-1': '44444444-4444-4444-4444-444444444442',
      'master-1': '99999999-9999-9999-9999-999999999999',
      'event-1': '55555555-5555-5555-5555-555555555555',
      'lesson-1': '66666666-6666-6666-6666-666666666661',
      'lesson-2': '66666666-6666-6666-6666-666666666662',
      'lesson-3': '66666666-6666-6666-6666-666666666663',
      'pp-tie-a': '77777777-7777-7777-7777-777777777771',
      'pp-tie-b': '77777777-7777-7777-7777-777777777772',
    };

    const reverseIdMap = Object.entries(idMap).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {} as Record<string, string>);

    const translateToUUID = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'string') {
        return idMap[obj] || obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(translateToUUID);
      }
      if (typeof obj === 'object') {
        const res: any = {};
        for (const [k, v] of Object.entries(obj)) {
          res[k] = translateToUUID(v);
        }
        return res;
      }
      return obj;
    }

    client = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (input, init) => {
          let url = typeof input === 'string' ? input : (input as any).url;
          for (const [mockId, uuidVal] of Object.entries(idMap)) {
            url = url.split(mockId).join(uuidVal);
          }

          const headers = new Headers(init?.headers);
          const userId = sessionStorage.getItem('groovelab_user_id');
          if (userId) {
            headers.set('x-user-id', idMap[userId] || userId);
          }

          const qrToken = sessionStorage.getItem('groovelab_qr_token');
          if (qrToken) {
            headers.set('x-client-info', `supabase-js/2.39.3;qr_token=${idMap[qrToken] || qrToken}`);
          }

          // Adjust Prefer header to return representation instead of minimal
          const pref = headers.get('prefer') || '';
          if (pref.includes('return=minimal')) {
            headers.set('prefer', pref.replace('return=minimal', 'return=representation'));
          } else if (!pref.includes('return=')) {
            headers.set('prefer', pref ? `${pref},return=representation` : 'return=representation');
          }

          let body = init?.body;
          if (body && typeof body === 'string') {
            try {
              const parsed = JSON.parse(body);
              const translated = translateToUUID(parsed);
              body = JSON.stringify(translated);
            } catch (e) {
              for (const [mockId, uuidVal] of Object.entries(idMap)) {
                body = body.split(mockId).join(uuidVal);
              }
            }
          }

          const response = await fetch(url, { ...init, headers, body });
          const text = await response.text();
          let translatedText = text;
          for (const [uuidVal, mockId] of Object.entries(reverseIdMap)) {
            translatedText = translatedText.split(uuidVal).join(mockId);
          }

          let finalResponseText = translatedText;
          if (init?.method === 'POST') {
            try {
              const parsed = JSON.parse(translatedText);
              if (Array.isArray(parsed) && parsed.length === 1) {
                finalResponseText = JSON.stringify(parsed[0]);
              }
            } catch (e) {
              // ignore
            }
          }

          // 204 No Content responses must not have a body
          const hasNoBody = [101, 103, 204, 205, 304].includes(response.status);

          return new Response(hasNoBody ? null : finalResponseText, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
      }
    });
  }

  // Import test cases
  const { testCases } = await import('./e2e_test_cases.ts');

  let passed = 0;
  let failed = 0;
  const failedTests: string[] = [];

  for (const testCase of testCases) {
    if (useMock) {
      mockDb.reset(); // Reset database state for test isolation
    } else {
      // Clear remote database for real-mode test isolation
      try {
        sessionStorage.setItem('groovelab_user_id', 'admin-1');
        // Delete only test events to prevent wiping out user's real events
        const delRes = await client.from('campus_events').delete().in('school_id', ['school-1', '11111111-1111-1111-1111-111111111111']);
        if (delRes.error) {
          console.warn(`[Cleanup] Delete events failed:`, delRes.error);
        }
        // Re-seed event-1
        const insRes = await client.from('campus_events').insert({
          id: 'event-1',
          school_id: 'school-1',
          title: 'Summer Festival 2026',
          event_date: '2026-07-01',
          start_time: '14:00',
          end_time: '18:00',
          category: 'Konzert',
          created_by: 'admin-1',
          is_public: true,
          visibility: 'all'
        });
        if (insRes.error) {
          console.warn(`[Cleanup] Insert event-1 failed:`, insRes.error);
        }
      } catch (e) {
        console.warn('Test isolation cleanup failed:', e);
      }
    }
    
    // Clear storage for test isolation
    sessionStorage.clear();
    localStorage.clear();

    try {
      await testCase.run(client);
      console.log(`[PASS] [Tier ${testCase.tier}] ${testCase.id}: ${testCase.name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] [Tier ${testCase.tier}] ${testCase.id}: ${testCase.name}`);
      console.error(`       Error: ${err.message || err}`);
      failed++;
      failedTests.push(`${testCase.id}: ${testCase.name}`);
    }
  }

  console.log(`====================================================`);
  console.log(`TEST RUN SUMMARY:`);
  console.log(`Total tests run: ${testCases.length}`);
  console.log(`Passed:          ${passed}`);
  console.log(`Failed:          ${failed}`);
  if (failed > 0) {
    console.log(`Failed Tests:`);
    failedTests.forEach(t => console.log(`  - ${t}`));
  }
  console.log(`Success rate:    ${((passed / testCases.length) * 100).toFixed(1)}%`);
  console.log(`====================================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
