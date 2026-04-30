import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msyxlqljswpertszbotf.supabase.co';
const supabaseKey = 'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking profiles...');
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .or('first_name.ilike.%boris%,first_name.ilike.%patrick%');

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log('Found users:', users.length);
  users.forEach(u => {
    console.log('---');
    console.log(`ID: ${u.id}`);
    console.log(`Name: ${u.first_name} ${u.last_name}`);
    console.log(`Role: ${u.role}`);
    console.log(`Bands (Type: ${typeof u.bands}):`, u.bands);
    console.log(`Projects (Type: ${typeof u.projects}):`, u.projects);
    console.log(`Musical Styles (Type: ${typeof u.musical_styles}):`, u.musical_styles);
    console.log(`School ID: ${u.school_id}`);
  });
}

check();
