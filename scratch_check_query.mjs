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
  return originalLookup(hostname, options, callback);
};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const { data: rawData, error: rawError } = await supabase
    .from('users_raw')
    .select('*')
    .limit(1);
    
  console.log('Result from users_raw:', rawData, rawError);
}

main();
