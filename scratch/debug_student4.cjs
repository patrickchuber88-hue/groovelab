
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStudent4() {
    // 1. Find Student 4
    const { data: students } = await supabase
        .from('users')
        .select('*')
        .ilike('first_name', '%Schüler 4%');
    
    console.log('Students found:', students);

    if (students && students.length > 0) {
        const student = students[0];
        console.log('Student 4 ID:', student.id);
        console.log('Current pending_repertoire_proposal:', student.pending_repertoire_proposal);

        // 2. Find band memberships
        const { data: memberships } = await supabase
            .from('band_members')
            .select('*, bands(*)')
            .eq('user_id', student.id);
        
        console.log('Band memberships:', memberships.map(m => ({
            band_id: m.band_id,
            band_name: m.bands.name,
            user_id: m.user_id
        })));

        // 3. Find band songs for these bands
        const bandIds = memberships.map(m => m.band_id);
        const { data: bandSongs } = await supabase
            .from('band_songs')
            .select('*, songs(*)')
            .in('band_id', bandIds);
        
        console.log('Band songs in their bands:', bandSongs.map(bs => ({
            band_id: bs.band_id,
            song_title: bs.songs.title,
            status: bs.status
        })));
    }
}

debugStudent4();
