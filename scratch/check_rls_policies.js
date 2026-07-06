import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.rpc('get_policies'); // if custom RPC exists
  console.log("Policies:", data, error);

  // Let's also query pg_policies using custom query/RPC if we can, or just inspect how users table policies behave by sending headers.
  const tokenManuel = '897ed2f0-d0e6-47e8-b799-a09efe9e51e5';
  const idManuel = '97e73f5d-b6d6-47d5-bb47-18ad02bae725';

  // Test 1: Query users where id = idManuel using header x-qr-token = tokenManuel
  const fetchWithQrToken = async () => {
    const res = await fetch(`${url}/rest/v1/users?id=eq.${idManuel}&select=role,roles`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'x-qr-token': tokenManuel
      }
    });
    console.log("Test 1 (x-qr-token only) status:", res.status);
    console.log("Test 1 (x-qr-token only) body:", await res.json());
  };

  // Test 2: Query users where id = idManuel using header x-user-id = idManuel
  const fetchWithUserId = async () => {
    const res = await fetch(`${url}/rest/v1/users?id=eq.${idManuel}&select=role,roles`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'x-user-id': idManuel
      }
    });
    console.log("Test 2 (x-user-id only) status:", res.status);
    console.log("Test 2 (x-user-id only) body:", await res.json());
  };

  // Test 3: Query users where qr_token = tokenManuel using header x-qr-token = tokenManuel
  const fetchByQrToken = async () => {
    const res = await fetch(`${url}/rest/v1/users?qr_token=eq.${tokenManuel}&select=id,role`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'x-qr-token': tokenManuel
      }
    });
    console.log("Test 3 (query by qr_token with header) status:", res.status);
    console.log("Test 3 (query by qr_token with header) body:", await res.json());
  };

  await fetchWithQrToken();
  await fetchWithUserId();
  await fetchByQrToken();
}

run();
