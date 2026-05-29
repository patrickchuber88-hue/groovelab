import { createClient } from '@supabase/supabase-js'

const url = 'http://supabase.178.105.10.2.sslip.io'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI'
const supabase = createClient(url, key)

async function run() {
  const { data: users } = await supabase.from('users').select('id, first_name, last_name, role, teacher_id')
  console.log("Users:", JSON.stringify(users, null, 2))
}

run()
