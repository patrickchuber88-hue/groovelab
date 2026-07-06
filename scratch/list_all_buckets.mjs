import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('Listing all buckets...');
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error);
    return;
  }
  console.log('Buckets:', buckets);

  for (const bucket of buckets) {
    console.log(`\nListing contents of bucket "${bucket.name}"...`);
    const { data: files, error: fileError } = await supabase.storage.from(bucket.name).list('', { limit: 100 });
    if (fileError) {
      console.error(`Error listing bucket ${bucket.name}:`, fileError);
    } else {
      console.log(`Files in "${bucket.name}":`, files);
    }
  }
}

run().catch(console.error);
