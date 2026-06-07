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
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSelect() {
  console.log("Checking relationship query...");
  const { data, error } = await supabase
    .from('campus_events')
    .select('*, room:room_id(id, name)')
    .limit(1);

  if (error) {
    console.error("Query Error details:", JSON.stringify(error, null, 2));
  } else {
    console.log("Success! Data:", data);
  }
}

testSelect();
