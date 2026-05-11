
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBandMembers() {
    const bandId = '1f510bf7-cece-452f-91f1-ad4c72750b22';
    const { data: members } = await supabase
        .from('band_members')
        .select('*, users(*)')
        .eq('band_id', bandId);
    
    console.log('Band members for Midnight Quest:');
    members.forEach(m => {
        console.log(`- ${m.users?.first_name} (ID: ${m.user_id})`);
    });
}

debugBandMembers();
