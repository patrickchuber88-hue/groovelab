import dns from 'dns';
const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }
  if (hostname === 'supabase.campus-groovelab.de') {
    if (opts.all) {
      return cb(null, [{ address: '178.105.10.2', family: 4 }]);
    }
    return cb(null, '178.105.10.2', 4);
  }
  return originalLookup.call(dns, hostname, options, cb);
};

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = 'https://supabase.campus-groovelab.de';
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const supabase = createClient(url, key);

async function run() {
  const studentId = '0f22f0ba-df3c-457e-b600-7c4c2bce745c';
  
  const { data, error } = await supabase
    .from('progress_matrix')
    .select('*')
    .eq('student_id', studentId)
    .order('updated_at', { ascending: false });
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${data.length} progress matrix entries:`);
  data.forEach(item => {
    console.log(`\n- ID: ${item.id}`);
    console.log(`  Topic: ${item.topic_name}`);
    console.log(`  Status: ${item.status}`);
    console.log(`  Is Current: ${item.is_current_homework}`);
    console.log(`  Homework Notes: ${item.homework_notes}`);
    console.log(`  Teacher Notes: ${item.teacher_notes}`);
    console.log(`  Updated At: ${item.updated_at}`);
  });
}

run();
