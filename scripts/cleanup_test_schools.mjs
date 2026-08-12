/**
 * cleanup_test_schools.mjs
 * Löscht verwaiste Test-Schulen aus der Produktionsdatenbank,
 * die durch fehlgeschlagene Test-Runs in test_crisis_dashboard.ts angelegt wurden.
 *
 * Ausführen: node scripts/cleanup_test_schools.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../apps/groovelab/.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
 ;

if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL fehlt in .env.local');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceKey);

const TEST_SCHOOL_NAMES = [
  'Other School',
  'Crisis Test School',
  'Haertest School',
  'Onboarding Test School',
];

async function cleanup() {
  console.log('Suche verwaiste Test-Schulen in der Datenbank...\n');

  const { data: schools, error } = await client
    .from('schools')
    .select('id, name, created_at')
    .in('name', TEST_SCHOOL_NAMES)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fehler beim Laden der Schulen:', error.message);
    process.exit(1);
  }

  if (!schools || schools.length === 0) {
    console.log('Keine Test-Schulen gefunden. Datenbank ist sauber.');
    return;
  }

  console.log(schools.length + ' Test-Schulen gefunden:\n');
  schools.forEach(s => console.log('  - [' + s.id + '] "' + s.name + '" (angelegt: ' + s.created_at + ')'));
  console.log('');

  const ids = schools.map(s => s.id);

  const tables = ['schedules', 'schedule_occurrences', 'users_raw', 'crisis_notifications', 'rooms', 'stations'];

  for (const table of tables) {
    const { error: delErr } = await client.from(table).delete().in('school_id', ids);
    if (delErr) {
      console.log('  [warn] ' + table + ': ' + delErr.message);
    } else {
      console.log('  [ok]   ' + table + ': geloescht');
    }
  }

  const { error: schoolDelErr } = await client.from('schools').delete().in('id', ids);
  if (schoolDelErr) {
    console.error('Fehler beim Loeschen der Schulen:', schoolDelErr.message);
    process.exit(1);
  }

  console.log('\n' + ids.length + ' Test-Schulen erfolgreich aus der Datenbank entfernt.');
}

cleanup().catch(err => {
  console.error('Unerwarteter Fehler:', err);
  process.exit(1);
});
