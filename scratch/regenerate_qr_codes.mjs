import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import crypto from 'crypto'

const env = fs.readFileSync('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/.env.local', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

// Initialize Supabase with the x-user-id header set to the Master Admin ID to bypass RLS policies
const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-user-id': '88888888-8888-8888-8888-888888888888'
    }
  }
});

function generateSecureQrToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 't_';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function generateStarterPin(role, isCampus, isGroovelab) {
  let prefix = 'C';
  if (role === 'admin' || role === 'secretary') {
    prefix = 'V';
  } else if (isCampus && isGroovelab) {
    prefix = 'CG';
  } else if (isCampus) {
    prefix = 'C';
  } else if (isGroovelab) {
    prefix = 'G';
  } else {
    prefix = 'C';
  }
  const randomNum = Math.floor(1000 + Math.random() * 9000).toString();
  return `${prefix}-${randomNum}`;
}

async function run() {
  console.log("Fetching users to regenerate QR codes and Ausweis IDs (excluding secretary, admin, and master_admin)...");
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, role, is_master_admin, first_name, last_name, is_campus_active, is_groovelab_active');

  if (error) {
    console.error("Error fetching users:", error);
    return;
  }

  let updatedCount = 0;

  for (const user of users) {
    const role = (user.role || '').toLowerCase();
    const isMaster = user.is_master_admin === true;
    
    if (role === 'secretary' || role === 'admin' || isMaster) {
      console.log(`Skipping administrative user: ${user.first_name} ${user.last_name} (${role})`);
      continue;
    }

    const updates = {};
    
    if (role === 'teacher') {
      updates.teacher_qr_token = generateSecureQrToken();
      updates.qr_token = null;
      updates.ausweis_nummer = generateStarterPin('teacher', user.is_campus_active ?? true, user.is_groovelab_active ?? true);
      updates.is_pin_activated = false;
      console.log(`Teacher ${user.first_name} ${user.last_name}: QR=${updates.teacher_qr_token}, Ausweis=${updates.ausweis_nummer}`);
    } else if (role === 'student') {
      updates.qr_token = crypto.randomUUID();
      updates.teacher_qr_token = null;
      updates.ausweis_nummer = 'GL-' + Math.floor(1000 + Math.random() * 9000);
      updates.is_pin_activated = false;
      console.log(`Student ${user.first_name} ${user.last_name}: QR=${updates.qr_token}, Ausweis=${updates.ausweis_nummer}`);
    } else {
      console.log(`Skipping user ${user.first_name} ${user.last_name} with unknown/other role: ${role}`);
      continue;
    }

    const { data: updatedData, error: updateErr } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select();

    if (updateErr) {
      console.error(`Failed to update user ${user.first_name} ${user.last_name}:`, updateErr);
    } else if (!updatedData || updatedData.length === 0) {
      console.error(`Failed to update user ${user.first_name} ${user.last_name}: 0 rows matched (RLS restriction).`);
    } else {
      updatedCount++;
    }
  }

  console.log(`\nSuccessfully regenerated QR codes, Ausweis IDs, and reset PIN states for ${updatedCount} users.`);
}

run();
