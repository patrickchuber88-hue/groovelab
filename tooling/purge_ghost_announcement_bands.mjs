import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function purgeGhostBands() {
  console.log('[Purge] Authenticating as master admin...');
  const baseClient = createClient(url, key);
  const { data: auth, error: authErr } = await baseClient.rpc('authenticate_by_credential', {
    p_credential: '11079eae-664a-49a4-8692-771d83a3193c'
  });

  if (authErr || !auth?.success) {
    console.error('[Purge] Auth failed:', authErr);
    process.exit(1);
  }

  const client = createClient(url, key, {
    global: {
      headers: {
        'x-client-info': 'supabase-js/2.39.3;session_token=' + auth.lease_token
      }
    }
  });

  console.log('[Purge] Querying __SYSTEM_ANNOUNCEMENTS__ bands...');
  const { data: ghostBands, error: findErr } = await client
    .from('bands')
    .select('id, name, school_id')
    .eq('name', '__SYSTEM_ANNOUNCEMENTS__');

  if (findErr) {
    console.error('[Purge] Error fetching ghost bands:', findErr);
    process.exit(1);
  }

  console.log(`[Purge] Found ${ghostBands?.length || 0} candidate ghost bands.`);

  if (!ghostBands || ghostBands.length === 0) {
    console.log('[Purge] Nothing to purge!');
    return;
  }

  const bandIds = ghostBands.map(b => b.id);

  // Safety checks
  const [{ data: mData }, { data: sData }, { data: shData }] = await Promise.all([
    client.from('band_members').select('band_id').in('band_id', bandIds),
    client.from('band_songs').select('band_id').in('band_id', bandIds),
    client.from('band_shoutbox').select('band_id').in('band_id', bandIds)
  ]);

  const activeBandIds = new Set([
    ...(mData || []).map(m => m.band_id),
    ...(sData || []).map(s => s.band_id),
    ...(shData || []).map(sh => sh.band_id)
  ]);

  const safeToDeleteIds = bandIds.filter(id => !activeBandIds.has(id));
  console.log(`[Purge] Safe to delete: ${safeToDeleteIds.length} bands (${activeBandIds.size} bands preserved).`);

  if (safeToDeleteIds.length === 0) {
    console.log('[Purge] No bands eligible for deletion.');
    return;
  }

  // Delete in batches of 50
  let totalDeleted = 0;
  for (let i = 0; i < safeToDeleteIds.length; i += 50) {
    const chunk = safeToDeleteIds.slice(i, i + 50);
    const { error: delErr } = await client
      .from('bands')
      .delete()
      .in('id', chunk);

    if (delErr) {
      console.error(`[Purge] Error deleting chunk ${i}:`, delErr);
    } else {
      totalDeleted += chunk.length;
      console.log(`[Purge] Deleted ${totalDeleted}/${safeToDeleteIds.length} ghost bands...`);
    }
  }

  console.log(`[Purge] Complete! Successfully deleted ${totalDeleted} ghost bands.`);
}

purgeGhostBands();
