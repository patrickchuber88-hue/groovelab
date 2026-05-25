const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = 'http://178.105.10.2:8081';
const jwtSecret = 'R7kfoAsHcoDGXvRnoYx2YttpLL27YyPRFzzAvuiK';
const adminUserId = '553bef93-a006-4aa9-92e6-58f83cff3570'; // Teacher/Admin UUID
const schoolId = 'a3c4dfb7-d35a-4522-a951-cb373f79915f'; // School ID

// Create authenticated user token
const token = jwt.sign(
  {
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    sub: adminUserId,
    email: 'admin@groovelab.de', // just a dummy or real
    role: 'authenticated',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {}
  },
  jwtSecret
);

const supabase = createClient(supabaseUrl, token, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log('Attempting to update school as admin...');
  const { data, error } = await supabase
    .from('schools')
    .update({ name: 'Test School Name Update' })
    .eq('id', schoolId)
    .select();

  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update succeeded! Response:', data);
  }
}

run();
