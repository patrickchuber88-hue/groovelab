import { createClient } from '@supabase/supabase-js'

const url = 'http://supabase.178.105.10.2.sslip.io'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc5NTUzODQzLCJleHAiOjE5MzcyMzM4NDN9.NPFKhuj3WiiJ7pqG7w91QAEy1V696kfTcEunScUAAoI'
const supabase = createClient(url, key)

async function run() {
  console.log("Searching users...")
  const { data: users, error: uErr } = await supabase.from('users').select('*')
  if (users) {
    users.forEach(u => {
      if (JSON.stringify(u).toLowerCase().includes('testlauf')) {
        console.log("Found in user:", u)
      }
    })
  }

  console.log("Searching schools...")
  const { data: schools } = await supabase.from('schools').select('*')
  if (schools) {
    schools.forEach(s => {
      if (JSON.stringify(s).toLowerCase().includes('testlauf')) {
        console.log("Found in school:", s)
      }
    })
  }

  console.log("Searching schedules...")
  const { data: schedules } = await supabase.from('schedules').select('*')
  if (schedules) {
    schedules.forEach(sc => {
      if (JSON.stringify(sc).toLowerCase().includes('testlauf')) {
        console.log("Found in schedule:", sc)
      }
    })
  }
}

run()
