import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function testFetchData() {
  const userId = '03564b1c-e2bb-4ccb-be95-b9fd1ef34829';
  const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
  if (!user) {
    console.error("Teacher not found");
    return;
  }
  
  console.log(`Simulating AdminDashboard fetchData for user: ${user.first_name} ${user.last_name}, Role: ${user.role}, ID: ${user.id}`);
  
  const activeTab = 'live'; // default tab for teachers
  const activePlatform = 'campus'; // default platform
  
  try {
    const { data: adminData, error: adminErr } = await supabase
      .from('users')
      .select('*, schools(*)')
      .eq('id', userId)
      .single();
      
    if (adminErr) {
      console.error("Error fetching adminData:", adminErr);
      return;
    }
    
    console.log("Admin Data fetched successfully. School ID:", adminData?.school_id);
    
    if (adminData?.school_id) {
      const { data: kiosksData, error: kiosksErr } = await supabase
        .from('kiosks')
        .select('*')
        .eq('school_id', adminData.school_id);
        
      if (kiosksErr) {
        console.error("Error fetching kiosks:", kiosksErr);
        return;
      }
      console.log(`Fetched kiosks: ${kiosksData?.length}`);
      
      if (activeTab === 'live') {
        const { data: sData, error: sessErr } = await supabase
          .from('sessions')
          .select('*, profiles:users!inner(*), stations(*)')
          .eq('profiles.school_id', adminData.school_id)
          .is('check_out_time', null)
          .order('check_in_time', { ascending: false });
          
        if (sessErr) {
          console.error("Error fetching sessions:", sessErr);
          return;
        }
        console.log(`Fetched active sessions: ${sData?.length}`);
      }
    }
    
    console.log("fetchData simulated successfully with no errors!");
  } catch (err) {
    console.error("Uncaught simulation error:", err);
  }
}

testFetchData();
