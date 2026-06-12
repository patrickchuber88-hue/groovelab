import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Room IDs
const ROOMS = {
  'Raum 4':     'bf7d1660-fb03-48a7-a51e-9a6e6a1c48c9',
  'Groovelab':  'f6b249c4-4587-40d6-b30b-dece81541077',
  'Musikzimmer':'5956fcec-035b-42ca-a07c-55397ae3d8bf',
  'Raum 3':     'fa64c249-5f5b-4e5a-9e27-9afc8d9f128a',
};

// Assignments: teacher -> favorite room
const ASSIGNMENTS = [
  { name: 'Patrick Huber',      id: '03564b1c-e2bb-4ccb-be95-b9fd1ef34829', room: 'Raum 4' },
  { name: 'Boris Stoll',        id: 'ff30d2e9-43ae-432b-bba7-c4766bd57ca4', room: 'Groovelab' },
  { name: 'Klaus Siebold',      id: '9c629cb8-9241-4d5e-9151-da1fd6f4cde4', room: 'Groovelab' },
  { name: 'Manuel Wagner',      id: '97e73f5d-b6d6-47d5-bb47-18ad02bae725', room: 'Musikzimmer' },
  { name: 'pat 1',              id: '0f984a89-cf47-4405-bdc9-ead2acd0ba7e', room: 'Raum 3' },
  { name: 'test test',          id: '54cd24f7-0b5f-4607-9f8c-9b1c97b2846f', room: 'Raum 4' },
];

async function setFavoriteRooms() {
  console.log('=== Setting Favorite Rooms ===\n');

  for (const assignment of ASSIGNMENTS) {
    const roomId = ROOMS[assignment.room];
    if (!roomId) {
      console.error(`❌ Room not found: ${assignment.room}`);
      continue;
    }

    const { error } = await supabase
      .from('users')
      .update({ preferred_room_ids: [roomId] })
      .eq('id', assignment.id);

    if (error) {
      console.error(`❌ Failed to update ${assignment.name}: ${error.message}`);
    } else {
      console.log(`✅ ${assignment.name} → ${assignment.room}`);
    }
  }

  console.log('\n=== DONE ===');

  // Verify
  console.log('\n=== Verification ===');
  const { data: users } = await supabase
    .from('users')
    .select('first_name, last_name, preferred_room_ids')
    .in('id', ASSIGNMENTS.map(a => a.id));

  users?.forEach(u => {
    const room = Object.entries(ROOMS).find(([, id]) => u.preferred_room_ids?.includes(id));
    console.log(`${u.first_name} ${u.last_name}: ${room ? room[0] : 'none'} (${JSON.stringify(u.preferred_room_ids)})`);
  });
}

setFavoriteRooms().catch(console.error);
