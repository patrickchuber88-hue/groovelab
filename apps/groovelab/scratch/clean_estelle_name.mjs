import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const targetUrl = 'https://supabase.campus-groovelab.de';
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(targetUrl, SERVICE_KEY);

async function cleanName() {
  console.log('Cleaning Estelle Leichner name in DB...');

  const { data: users } = await supabase.from('users').select('id, first_name, last_name');
  (users || []).forEach(async u => {
    const fn = String(u.first_name || '');
    const ln = String(u.last_name || '');
    if (fn.toLowerCase().includes('estelle') || ln.toLowerCase().includes('leichner')) {
      console.log('USER MATCH:', u.id, fn, ln);
      const cleanLast = ln.replace(/\s*\d+\.?\s*$/, '').trim();
      const cleanFirst = fn.replace(/\s*\d+\.?\s*$/, '').trim();
      await supabase.from('users').update({ first_name: cleanFirst, last_name: cleanLast }).eq('id', u.id);
      console.log('Updated user:', u.id, cleanFirst, cleanLast);
    }
  });

  const { data: pending } = await supabase.from('pending_students_decrypted').select('*');
  (pending || []).forEach(async p => {
    const fn = String(p.first_name || '');
    const ln = String(p.last_name || '');
    if (fn.toLowerCase().includes('estelle') || ln.toLowerCase().includes('leichner')) {
      console.log('PENDING MATCH:', p.id, fn, ln);
      const cleanLast = ln.replace(/\s*\d+\.?\s*$/, '').trim();
      const cleanFirst = fn.replace(/\s*\d+\.?\s*$/, '').trim();
      await supabase.from('pending_students').update({ first_name: cleanFirst, last_name: cleanLast }).eq('id', p.id);
      await supabase.from('student_last_names').update({ last_name: cleanLast }).eq('student_id', p.id);
      console.log('Updated pending & last name:', p.id, cleanFirst, cleanLast);
    }
  });
}

cleanName();
