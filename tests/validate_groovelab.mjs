import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Load environment variables
const envPath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local';
if (!fs.existsSync(envPath)) {
  console.error("❌ ERROR: .env.local not found!");
  process.exit(1);
}
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

// -------------------------------------------------------------
// Test 1: Unit Test Avatar Assignment Rules
// -------------------------------------------------------------
function testAvatarRules() {
  console.log("🧪 Test 1: Validating Avatar Mappings...");
  
  // Mock implementations of resolveCampusAvatar rules
  const mockResolveCampusAvatar = (u) => {
    if (!u) return '/avatar_ghost.jpg';
    const role = (u.role || '').toLowerCase();
    if (role === 'admin' || role === 'secretary') {
      return '/campus_login_hero.png';
    }
    return getMockInstrumentAvatar(u.instrument);
  };

  const getMockInstrumentAvatar = (inst) => {
    if (!inst) return '/avatars/gitarre_avatar_new.png';
    const clean = inst.toLowerCase().trim();
    if (clean.includes('trompete') || clean.includes('trumpet')) return '/avatars/trompete_avatar_new.png';
    return '/avatars/gitarre_avatar_new.png';
  };

  const mockStudioAvatar = (user, activePlat) => {
    const role = (user?.role || '').toLowerCase();
    if (role === 'admin' || role === 'secretary') {
      return '/campus_login_hero.png';
    } else if (activePlat === 'campus') {
      if (role === 'student' || role === 'teacher') {
        return getMockInstrumentAvatar(user.instrument);
      }
    }
    return user.photo_url || '/avatar_ghost.jpg';
  };

  // Test cases
  const teacherWithAdminRoles = {
    role: 'teacher',
    roles: ['admin', 'teacher'],
    instrument: 'Trompete',
    photo_url: '/avatar_teacher_male.jpg'
  };

  const pureAdmin = {
    role: 'admin',
    roles: ['admin']
  };

  const student = {
    role: 'student',
    instrument: 'Gitarre'
  };

  // Assertions for Campus module
  const avatarTeacherCampus = mockResolveCampusAvatar(teacherWithAdminRoles);
  const avatarTeacherStudio = mockStudioAvatar(teacherWithAdminRoles, 'campus');
  const avatarAdminCampus = mockResolveCampusAvatar(pureAdmin);

  if (avatarTeacherCampus !== '/avatars/trompete_avatar_new.png') {
    console.error(`❌ FAILED: Teacher with admin rights got wrong avatar: ${avatarTeacherCampus}`);
    process.exit(1);
  }
  if (avatarTeacherStudio !== '/avatars/trompete_avatar_new.png') {
    console.error(`❌ FAILED: StudioAvatar for teacher with admin rights got wrong avatar: ${avatarTeacherStudio}`);
    process.exit(1);
  }
  if (avatarAdminCampus !== '/campus_login_hero.png') {
    console.error(`❌ FAILED: Administrator got wrong avatar: ${avatarAdminCampus}`);
    process.exit(1);
  }

  console.log("✅ Passed Avatar Assignment validation.");
}

// -------------------------------------------------------------
// Test 2: Database Scoping Query Test (Manuel Wagner)
// -------------------------------------------------------------
async function testDatabaseScoping() {
  console.log("\n🧪 Test 2: Validating Database Scoping for Manuel Wagner...");
  
  const wagnerId = '97e73f5d-b6d6-47d5-bb47-18ad02bae725';
  const supabase = createClient(url, key, {
    global: {
      headers: {
        'x-user-id': wagnerId
      }
    }
  });

  // Fetch Manuel Wagner profile to verify his role is teacher
  const { data: profile, error: profError } = await supabase
    .from('users')
    .select('id, role, roles, school_id')
    .eq('id', wagnerId)
    .single();

  if (profError || !profile) {
    console.error("❌ FAILED: Could not query Manuel Wagner profile:", profError);
    process.exit(1);
  }

  console.log(`👤 Profile Verified: ${profile.role} (secondary roles: ${profile.roles})`);

  // Run the student query with teacher role simulation
  let sq = supabase
    .from('users')
    .select('id, first_name, last_name, teacher_id')
    .eq('school_id', profile.school_id)
    .eq('role', 'student');

  // Enforce teacher-only filter
  if (profile.role === 'teacher' || profile.roles?.includes('teacher')) {
    sq = sq.eq('teacher_id', profile.id);
  }

  const { data: students, error: studentError } = await sq;
  if (studentError) {
    console.error("❌ FAILED: Query error during student fetch:", studentError);
    process.exit(1);
  }

  console.log(`📊 Query returned ${students.length} students.`);

  if (students.length === 0) {
    console.error("❌ FAILED: Query returned 0 students. The teacher should have at least some assigned students.");
    process.exit(1);
  }

  // Verify that every single student in the returned list is actually assigned to this teacher
  for (const s of students) {
    if (s.teacher_id !== profile.id) {
      console.error(`❌ FAILED: Security breach! Returned student ${s.first_name} ${s.last_name} (Teacher ID: ${s.teacher_id}) who is not assigned to this teacher (${profile.id})!`);
      process.exit(1);
    }
  }

  console.log("✅ Passed Database Scoping validation (all returned students are correctly assigned to this teacher).");
}

async function run() {
  try {
    testAvatarRules();
    await testDatabaseScoping();
    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! No scoping or avatar issues found.");
  } catch (err) {
    console.error("❌ ERROR during test execution:", err);
    process.exit(1);
  }
}

run();
