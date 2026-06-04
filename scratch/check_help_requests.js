const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://supabase.campus-groovelab.de';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'help_requests' });
  if (error) {
    // If RPC doesn't exist, we can try running a direct sql or just select the first item.
    console.error('RPC error:', error);
    
    // Let's try to fetch one row and print keys:
    // If no row, let's insert one with user_id: '54cd24f7-0b5f-4607-9f8c-9b1c97b2846f' and immediately delete it
    const { data: inserted, error: insertError } = await supabase
      .from('help_requests')
      .insert({ user_id: '54cd24f7-0b5f-4607-9f8c-9b1c97b2846f', status: 'pending' })
      .select();
    
    if (insertError) {
      console.error('Insert error:', insertError);
    } else {
      console.log('Inserted row keys:', Object.keys(inserted[0]));
      await supabase.from('help_requests').delete().eq('id', inserted[0].id);
    }
  } else {
    console.log('Columns:', data);
  }
}

check();
