import dns from 'dns';
const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }
  if (hostname === 'supabase.178.105.10.2.sslip.io') {
    if (opts.all) {
      return cb(null, [{ address: '178.105.10.2', family: 4 }]);
    }
    return cb(null, '178.105.10.2', 4);
  }
  return originalLookup(hostname, options, callback);
};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase.from('stations').select('*').order('name');
  if (error) {
    console.error('Error fetching stations:', error);
    process.exit(1);
  }
  console.log('STATIONS IN DB:');
  console.log(JSON.stringify(data.map(s => ({ id: s.id, name: s.name, color: s.color, instrument: s.instrument, room_id: s.room_id })), null, 2));
}

main();
