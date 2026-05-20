import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function run() {
  console.log("Fetching OpenAPI spec from:", url);
  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  if (!res.ok) {
    console.error("Failed to fetch:", res.status, res.statusText);
    return;
  }
  const schema = await res.json();
  
  console.log("\n--- TABLES ---");
  const tables = Object.keys(schema.definitions || {});
  tables.forEach(t => console.log(t));

  console.log("\n--- RPC FUNCTIONS ---");
  const paths = Object.keys(schema.paths || {});
  const rpcs = paths.filter(p => p.startsWith('/rpc/'));
  rpcs.forEach(r => console.log(r));
  
  // Write to a file for deeper inspection if needed
  fs.writeFileSync('scratch/openapi_spec.json', JSON.stringify(schema, null, 2));
  console.log("\nSaved full OpenAPI spec to scratch/openapi_spec.json");
}

run().catch(console.error);
