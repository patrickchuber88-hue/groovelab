import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.campus-groovelab.de';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
