import { createClient } from '@supabase/supabase-js'

const url = 'http://supabase.178.105.10.2.sslip.io'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI'
const supabase = createClient(url, key)

async function run() {
  const { data: schedules } = await supabase.from('schedules').select(`
    id,
    day_of_week,
    time_slot,
    student_id,
    teacher_id,
    teacher:users!schedules_teacher_id_fkey(first_name, last_name)
  `)
  console.log("Schedules with teachers:", JSON.stringify(schedules, null, 2))
}

run()
