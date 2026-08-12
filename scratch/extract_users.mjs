import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabase = createClient(supabaseUrl, SERVICE_KEY);

const targetSchoolIds = [
  '3bf920b9-49b5-4aca-be79-42359fef3f1f', // Musikschule Klangwiese Hamburg
  '01329036-22f0-4424-b9e5-9064df450841', // Rhythmus & Groove Köln
  '46bace52-2d7a-4a87-aae2-5778ded238cb', // Harmonie Institut Dortmund
  '532b4d91-67c8-4194-9cde-f231ecb12bdd', // Melodie Schule Stuttgart
  '41c07ebd-1b59-4f75-8359-408d957dd080', // Akkord Akademie Berlin
  '109e83b3-a1ff-42f0-95b9-db6562f8e77d', // Konservatorium Frankfurt
  'd5838bdd-d779-424b-94d3-878d12c60140', // Tonart Akademie Düsseldorf
  '5e0b8364-12dd-43b1-aeb5-17417d53e957', // Beat Lab Essen
  '6abb3e70-cd0f-420d-b963-64f977f66a64', // Sound Center München
  'ca3c620a-7cde-4281-8522-ae278e137995'  // Symphonie Schule Leipzig
];

async function extract() {
  console.log("Fetching users paginated from the 10 dummy schools...");
  let allUsers = [];
  let from = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const to = from + limit - 1;
    const { data: users, error } = await supabase
      .from('users')
      .select('id, school_id, role, instrument')
      .in('school_id', targetSchoolIds)
      .range(from, to);

    if (error) {
      console.error(`Error fetching users at range ${from}-${to}:`, error);
      return;
    }

    if (users && users.length > 0) {
      allUsers.push(...users);
      console.log(`Fetched range ${from}-${to}: got ${users.length} users. Total so far: ${allUsers.length}`);
      from += limit;
      if (users.length < limit) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`Successfully fetched all ${allUsers.length} users.`);
  fs.writeFileSync('scratch/active_users.json', JSON.stringify(allUsers, null, 2));
  console.log("Saved users to scratch/active_users.json");
}

extract().catch(console.error);
