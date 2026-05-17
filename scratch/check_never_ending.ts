import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://msyxlqljswpertszbotf.supabase.co',
  'sb_publishable_GF8tj3-jMPuOUGMC5tDamA_NUrNyGh4'
)

async function check() {
  const { data: songs, error } = await supabase
    .from('songs')
    .select('*')

  if (error) {
    console.error('Error fetching songs:', error)
    return
  }

  console.log('--- Database Record for Never Ending ---')
  console.log(JSON.stringify(songs, null, 2))
}

check()
