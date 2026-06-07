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
const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-user-id': '0f984a89-cf47-4405-bdc9-ead2acd0ba7e'
    }
  }
});

async function testInsert() {
  console.log("Attempting to insert a test event...");
  const { data, error } = await supabase
    .from('campus_events')
    .insert({
      school_id: '74713df2-6176-4a41-a8cd-9fbebe34e9b8',
      title: 'Test Event 123',
      event_date: '2026-06-20',
      start_time: '12:00:00',
      category: 'Sonstiges',
      created_by: '0f984a89-cf47-4405-bdc9-ead2acd0ba7e',
      is_public: false
    })
    .select();

  if (error) {
    console.error("Supabase Error details:", JSON.stringify(error, null, 2));
  } else {
    console.log("Success! Data:", data);
  }
}

testInsert();
