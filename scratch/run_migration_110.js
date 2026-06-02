const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI';

const supabase = createClient(supabaseUrl, serviceKey);

async function executeSQL(sql, description) {
  console.log(`\n⚙️  ${description}`);
  
  // Try via REST API using the SQL endpoint (Supabase self-hosted has /rest/v1/rpc endpoint)
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ sql_query: sql })
  });
  
  if (res.ok) {
    console.log(`   ✅ Erfolgreich`);
    return true;
  }
  
  const errText = await res.text();
  
  // Try alternative endpoint
  const res2 = await fetch(`${supabaseUrl}/pg`, {
    method: 'POST', 
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (res2.ok) {
    console.log(`   ✅ Erfolgreich (via /pg)`);
    return true;
  }
  
  console.log(`   ⚠️  HTTP ${res.status}: ${errText.substring(0, 200)}`);
  return false;
}

async function checkColumnExists() {
  const { data, error } = await supabase
    .from('songs')
    .select('teacher_id')
    .limit(1);
  
  if (error && error.message.includes('teacher_id')) {
    return false;
  }
  return true;
}

async function runMigration() {
  console.log('=== Migration 110: teacher_id in songs ===\n');
  
  // Check if column already exists
  const exists = await checkColumnExists();
  if (exists) {
    console.log('✅ Spalte teacher_id existiert bereits in der songs-Tabelle!');
    
    // Show current songs with teacher_id
    const { data: songs } = await supabase.from('songs').select('id, title, teacher_id').limit(5);
    console.log('\nAktuelle Songs:');
    songs?.forEach(s => console.log(`  - "${s.title}": teacher_id = ${s.teacher_id || 'NULL'}`));
    return;
  }
  
  console.log('❌ Spalte teacher_id fehlt noch - Migration wird über SQL-Endpoint durchgeführt...');
  
  // Try different SQL endpoints
  const statements = [
    {
      sql: 'ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL;',
      desc: 'ADD COLUMN teacher_id zu songs'
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_songs_teacher_id ON public.songs(teacher_id);',
      desc: 'CREATE INDEX idx_songs_teacher_id'
    },
    {
      sql: `NOTIFY pgrst, 'reload schema';`,
      desc: 'NOTIFY pgrst reload schema'
    }
  ];
  
  for (const { sql, desc } of statements) {
    await executeSQL(sql, desc);
  }
  
  // Final check
  console.log('\n=== Finale Überprüfung ===');
  const existsNow = await checkColumnExists();
  if (existsNow) {
    console.log('✅ Migration erfolgreich! teacher_id ist jetzt vorhanden.');
  } else {
    console.log('⚠️  Migration über API nicht möglich. Bitte führen Sie folgende SQL manuell im Supabase Dashboard aus:\n');
    console.log('ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL;');
    console.log("NOTIFY pgrst, 'reload schema';");
  }
}

runMigration().catch(console.error);
