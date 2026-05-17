import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log('[Test] Starting mock band creation transaction...');
  
  const userId = '4f1097ca-fd80-4f74-829c-ce6fc24354a1'; // Schüler 1
  const schoolId = '11111111-1111-1111-1111-111111111111'; // Schüler 1's school
  const songId = '3fed9d04-d28f-4f8d-936a-05145e95dea0'; // Smells Like Teen Spirit
  
  // 1. Create Band record (status: forming)
  const bandName = "Mock Test Band " + Math.floor(Math.random() * 1000);
  const { data: newBand, error: bErr } = await supabase
    .from('bands')
    .insert({ 
      name: bandName, 
      school_id: schoolId,
      song_id: songId,
      status: 'forming',
      formation_group: 'mock_test_formation_group'
    })
    .select()
    .single();
  
  if (bErr || !newBand) {
    console.error('❌ Band creation failed:', bErr);
    return;
  }
  console.log('✅ Band created successfully:', newBand.id, newBand.name);

  // 2. Create Band Song project
  const { data: bSong, error: bsErr } = await supabase
    .from('band_songs')
    .insert({ 
      band_id: newBand.id, 
      song_id: songId, 
      status: 'active',
      suggested_by: userId 
    })
    .select()
    .single();
  
  if (bsErr || !bSong) {
    console.error('❌ Band song slot creation failed:', bsErr);
    // Cleanup
    await supabase.from('bands').delete().eq('id', newBand.id);
    return;
  }
  console.log('✅ Band song created successfully:', bSong.id);

  // 3. Insert mock members
  const memberInserts = [
    { band_id: newBand.id, user_id: '4f1097ca-fd80-4f74-829c-ce6fc24354a1', instrument: 'E-Gitarre' },
    { band_id: newBand.id, user_id: '7b65c4fb-3cad-47cd-bc60-d10698e418e1', instrument: 'E-Drums' },
    { band_id: newBand.id, user_id: 'c4fa4738-5964-4019-a17a-f94db52ada87', instrument: 'E-Piano' },
    { band_id: newBand.id, user_id: '4865bc10-d428-46b0-b459-c02c75b8d0e5', instrument: 'E-Bass' }
  ];

  const { error: memErr } = await supabase.from('band_members').insert(memberInserts);
  if (memErr) {
    console.error('❌ Adding members failed:', memErr);
    // Cleanup
    await supabase.from('band_songs').delete().eq('id', bSong.id);
    await supabase.from('bands').delete().eq('id', newBand.id);
    return;
  }
  console.log('✅ Band members inserted successfully');

  // 4. Insert slots
  const slotInserts = memberInserts.map(m => ({
    band_song_id: bSong.id,
    user_id: m.user_id,
    instrument: m.instrument,
    status: m.user_id === userId ? 'accepted' : 'joined'
  }));

  const { error: slotErr } = await supabase.from('band_song_slots').insert(slotInserts);
  if (slotErr) {
    console.error('❌ Creating slots failed:', slotErr);
    // Cleanup
    await supabase.from('band_members').delete().eq('band_id', newBand.id);
    await supabase.from('band_songs').delete().eq('id', bSong.id);
    await supabase.from('bands').delete().eq('id', newBand.id);
    return;
  }
  console.log('✅ Band song slots created successfully');
  
  // Cleanup test data to keep the database perfectly clean!
  console.log('[Test] Cleaning up test records...');
  await supabase.from('band_song_slots').delete().eq('band_song_id', bSong.id);
  await supabase.from('band_members').delete().eq('band_id', newBand.id);
  await supabase.from('band_songs').delete().eq('id', bSong.id);
  await supabase.from('bands').delete().eq('id', newBand.id);
  console.log('✅ Cleanup complete! Transaction was 100% successful and clean.');
}

run();
