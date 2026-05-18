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

async function backup() {
  console.log('🔄 Starte Datenbank-Backup für GrooveLab...');
  
  // 1. Schule ermitteln
  const { data: schools, error: schoolErr } = await supabase.from('schools').select('*');
  if (schoolErr) {
    console.error('❌ Fehler beim Laden der Schulen:', schoolErr.message);
    process.exit(1);
  }
  
  // Suche nach "Musäk" oder "Säckingen"
  let targetSchool = schools.find(s => 
    s.name.toLowerCase().includes('musäk') || 
    s.name.toLowerCase().includes('säckingen') || 
    s.name.toLowerCase().includes('bad')
  );
  
  if (!targetSchool && schools.length > 0) {
    console.warn('⚠️ Keine Schule mit "Musäk Bad Säckingen" gefunden. Verwende erste verfügbare Schule:', schools[0].name);
    targetSchool = schools[0];
  } else if (!targetSchool) {
    console.error('❌ Keine Schule in der Datenbank gefunden!');
    process.exit(1);
  }
  
  const schoolId = targetSchool.id;
  console.log(`🏫 Ziel-Schule gefunden: "${targetSchool.name}" (${schoolId})`);
  
  const backupData = {
    exported_at: new Date().toISOString(),
    school: targetSchool,
    rooms: [],
    stations: [],
    users: [],
    songs: [],
    user_song_skills: [],
    bands: [],
    band_members: [],
    band_songs: [],
    band_song_slots: [],
    scheduler_plans: [],
    exercises: [],
    user_progress: [],
    sessions: [],
    help_requests: []
  };

  try {
    // 2. Räume laden
    console.log('📖 Lade Räume...');
    const { data: rooms } = await supabase.from('rooms').select('*').eq('school_id', schoolId);
    backupData.rooms = rooms || [];
    const roomIds = backupData.rooms.map(r => r.id);

    // 3. Stationen laden (zugehörig zu den Räumen)
    if (roomIds.length > 0) {
      console.log('📖 Lade Stationen...');
      const { data: stations } = await supabase.from('stations').select('*').in('room_id', roomIds);
      backupData.stations = stations || [];
    }

    // 4. Nutzer laden
    console.log('📖 Lade Benutzerprofile...');
    const { data: users } = await supabase.from('users').select('*').eq('school_id', schoolId);
    backupData.users = users || [];
    const userIds = backupData.users.map(u => u.id);

    // 5. Songs laden
    console.log('📖 Lade Song-Bibliothek...');
    const { data: songs } = await supabase.from('songs').select('*').eq('school_id', schoolId);
    backupData.songs = songs || [];
    const songIds = backupData.songs.map(s => s.id);

    // 6. User Song Skills laden (falls Songs vorhanden)
    if (songIds.length > 0) {
      console.log('📖 Lade Song-Fortschritte (Skills)...');
      const { data: skills } = await supabase.from('user_song_skills').select('*').in('song_id', songIds);
      backupData.user_song_skills = skills || [];
    }

    // 7. Bands laden
    console.log('📖 Lade Bands...');
    const { data: bands } = await supabase.from('bands').select('*').eq('school_id', schoolId);
    backupData.bands = bands || [];
    const bandIds = backupData.bands.map(b => b.id);

    // 8. Bandmitglieder laden
    if (bandIds.length > 0) {
      console.log('📖 Lade Bandmitglieder...');
      const { data: members } = await supabase.from('band_members').select('*').in('band_id', bandIds);
      backupData.band_members = members || [];
    }

    // 9. Band Songs laden
    if (bandIds.length > 0) {
      console.log('📖 Lade Band-Repertoire-Einträge...');
      const { data: bSongs } = await supabase.from('band_songs').select('*').in('band_id', bandIds);
      backupData.band_songs = bSongs || [];
      const bSongIds = backupData.band_songs.map(bs => bs.id);

      // 10. Band Song Slots laden
      if (bSongIds.length > 0) {
        console.log('📖 Lade Band-Instrumenten-Slots...');
        const { data: slots } = await supabase.from('band_song_slots').select('*').in('band_song_id', bSongIds);
        backupData.band_song_slots = slots || [];
      }
    }

    // 11. Wochenpläne laden
    console.log('📖 Lade Wochenpläne...');
    const { data: plans } = await supabase.from('scheduler_plans').select('*').eq('school_id', schoolId);
    backupData.scheduler_plans = plans || [];

    // 12. Übungen laden
    console.log('📖 Lade Übungen...');
    const { data: exercises } = await supabase.from('exercises').select('*').eq('school_id', schoolId);
    backupData.exercises = exercises || [];
    const exerciseIds = backupData.exercises.map(e => e.id);

    // 13. Übungsfortschritte laden
    if (userIds.length > 0) {
      console.log('📖 Lade Übungsfortschritte...');
      const { data: progress } = await supabase.from('user_progress').select('*').in('user_id', userIds);
      backupData.user_progress = progress || [];
    }

    // 14. Sessions laden
    if (userIds.length > 0) {
      console.log('📖 Lade Sitzungen (Sessions)...');
      const { data: sessions } = await supabase.from('sessions').select('*').in('user_id', userIds);
      backupData.sessions = sessions || [];
    }

    // 15. Hilfe-Anfragen laden
    if (userIds.length > 0) {
      console.log('📖 Lade Hilferufe...');
      const { data: help } = await supabase.from('help_requests').select('*').in('user_id', userIds);
      backupData.help_requests = help || [];
    }

    // Backup-Ordner anlegen falls nicht existent
    const backupDir = './backups';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // In JSON-Datei schreiben
    const filename = `backups/groovelab_backup_${targetSchool.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(backupData, null, 2), 'utf8');

    console.log('\n=========================================');
    console.log('✅ BACKUP ERFOLGREICH ERSTELLT!');
    console.log(`Datei gespeichert unter: ${filename}`);
    console.log(`Exporierte Daten-Statistiken für "${targetSchool.name}":`);
    console.log(` - 🏫 Schule: 1`);
    console.log(` - 👥 Benutzer: ${backupData.users.length}`);
    console.log(` - 📖 Räume / Stationen: ${backupData.rooms.length} / ${backupData.stations.length}`);
    console.log(` - 🎵 Songs / Skills: ${backupData.songs.length} / ${backupData.user_song_skills.length}`);
    console.log(` - 🎸 Bands / Mitglieder / Slots: ${backupData.bands.length} / ${backupData.band_members.length} / ${backupData.band_song_slots.length}`);
    console.log(` - 📋 Wochenpläne: ${backupData.scheduler_plans.length}`);
    console.log('=========================================');
    
  } catch (err) {
    console.error('❌ Unerwarteter Fehler beim Backup:', err.message);
  }
}

backup();
