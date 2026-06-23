import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.178.105.10.2.sslip.io';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkInvoices() {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('school_id', '74713df2-6176-4a41-a8cd-9fbebe34e9b8');
    
  console.log('Invoices for Musäk Bad Säckingen:', invoices);
  if (error) console.error('Error:', error);
}

checkInvoices();
