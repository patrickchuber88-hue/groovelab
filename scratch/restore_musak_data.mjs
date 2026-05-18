import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// .env.local auslesen
const envPath = './.env.local';
if (!fs.existsSync(envPath)) {
  console.error('Fehler: .env.local wurde nicht gefunden!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Fehler: VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY in .env.local fehlt!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
  console.log('🔄 Suche nach Backup-Dateien in ./backups...');
  
  const backupDir = './backups';
  if (!fs.existsSync(backupDir)) {
    console.error('❌ Kein backups/-Ordner gefunden!');
    process.exit(1);
  }

  const files = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('groovelab_backup_') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error('❌ Keine Backup-Dateien (*.json) im backups/-Ordner gefunden!');
    process.exit(1);
  }

  const newestBackup = path.join(backupDir, files[0]);
  console.log(`📂 Lade neuestes Backup: ${newestBackup}`);

  const backupData = JSON.parse(fs.readFileSync(newestBackup, 'utf8'));
  console.log(`⏰ Backup-Zeitpunkt: ${backupData.exported_at}`);
  console.log(`🏫 Schule im Backup: "${backupData.school.name}" (${backupData.school.id})`);

  try {
    // 1. Schule wiederherstellen
    console.log('✏️ Stelle Schule wieder her...');
    const { error: sErr } = await supabase.from('schools').upsert(backupData.school);
    if (sErr) throw sErr;

    // 2. Räume
    if (backupData.rooms.length > 0) {
      console.log(`✏️ Stelle Räume wieder her (${backupData.rooms.length})...`);
      const { error: rErr } = await supabase.from('rooms').upsert(backupData.rooms);
      if (rErr) throw rErr;
    }

    // 3. Stationen
    if (backupData.stations.length > 0) {
      console.log(`✏️ Stelle Stationen wieder her (${backupData.stations.length})...`);
      const { error: stErr } = await supabase.from('stations').upsert(backupData.stations);
      if (stErr) throw stErr;
    }

    // 4. Benutzer
    if (backupData.users.length > 0) {
      console.log(`✏️ Stelle Benutzer wieder her (${backupData.users.length})...`);
      const { error: uErr } = await supabase.from('users').upsert(backupData.users);
      if (uErr) throw uErr;
    }

    // 5. Songs
    if (backupData.songs.length > 0) {
      console.log(`✏️ Stelle Song-Bibliothek wieder her (${backupData.songs.length})...`);
      const { error: soErr } = await supabase.from('songs').upsert(backupData.songs);
      if (soErr) throw soErr;
    }

    // 6. User Song Skills
    if (backupData.user_song_skills.length > 0) {
      console.log(`✏️ Stelle Song-Fortschritte wieder her (${backupData.user_song_skills.length})...`);
      const { error: skErr } = await supabase.from('user_song_skills').upsert(backupData.user_song_skills);
      if (skErr) throw skErr;
    }

    // 7. Bands
    if (backupData.bands.length > 0) {
      console.log(`✏️ Stelle Bands wieder her (${backupData.bands.length})...`);
      const { error: bErr } = await supabase.from('bands').upsert(backupData.bands);
      if (bErr) throw bErr;
    }

    // 8. Bandmitglieder
    if (backupData.band_members.length > 0) {
      console.log(`✏️ Stelle Bandmitglieder wieder her (${backupData.band_members.length})...`);
      const { error: mErr } = await supabase.from('band_members').upsert(backupData.band_members);
      if (mErr) throw mErr;
    }

    // 9. Band Songs
    if (backupData.band_songs.length > 0) {
      console.log(`✏️ Stelle Band-Repertoire wieder her (${backupData.band_songs.length})...`);
      const { error: bsErr } = await supabase.from('band_songs').upsert(backupData.band_songs);
      if (bsErr) throw bsErr;
    }

    // 10. Band Song Slots
    if (backupData.band_song_slots.length > 0) {
      console.log(`✏️ Stelle Band-Instrumenten-Slots wieder her (${backupData.band_song_slots.length})...`);
      const { error: slErr } = await supabase.from('band_song_slots').upsert(backupData.band_song_slots);
      if (slErr) throw slErr;
    }

    // 11. Wochenpläne
    if (backupData.scheduler_plans.length > 0) {
      console.log(`✏️ Stelle Wochenpläne wieder her (${backupData.scheduler_plans.length})...`);
      const { error: pErr } = await supabase.from('scheduler_plans').upsert(backupData.scheduler_plans);
      if (pErr) throw pErr;
    }

    // 12. Übungen
    if (backupData.exercises.length > 0) {
      console.log(`✏️ Stelle Übungen wieder her (${backupData.exercises.length})...`);
      const { error: exErr } = await supabase.from('exercises').upsert(backupData.exercises);
      if (exErr) throw exErr;
    }

    // 13. Übungsfortschritte
    if (backupData.user_progress.length > 0) {
      console.log(`✏️ Stelle Übungsfortschritte wieder her (${backupData.user_progress.length})...`);
      const { error: prErr } = await supabase.from('user_progress').upsert(backupData.user_progress);
      if (prErr) throw prErr;
    }

    // 14. Sessions
    if (backupData.sessions.length > 0) {
      console.log(`✏️ Stelle Sitzungen wieder her (${backupData.sessions.length})...`);
      const { error: seErr } = await supabase.from('sessions').upsert(backupData.sessions);
      if (seErr) throw seErr;
    }

    // 15. Hilferufe
    if (backupData.help_requests.length > 0) {
      console.log(`✏️ Stelle Hilferufe wieder her (${backupData.help_requests.length})...`);
      const { error: hErr } = await supabase.from('help_requests').upsert(backupData.help_requests);
      if (hErr) throw hErr;
    }

    console.log('\n=========================================');
    console.log('✅ WIEDERHERSTELLUNG ERFOLGREICH ABGESCHLOSSEN!');
    console.log(`Alle Daten für "${backupData.school.name}" wurden fehlerfrei hochgeladen.`);
    console.log('=========================================');

  } catch (err) {
    console.error('\n❌ FEHLER BEI DER WIEDERHERSTELLUNG:', err.message);
  }
}

restore();
