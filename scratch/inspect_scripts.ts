import fs from 'fs'

function run() {
  const html = fs.readFileSync('scratch/dropbox_folder.html', 'utf8')
  
  // Search for any script tags containing 'preloadedState' or similar
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
  let match
  let count = 0
  
  console.log('--- Analyzing Script Tags ---')
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1]
    count++
    
    // Look for file entries or keys
    if (content.includes('entries') || content.includes('file') || content.includes('props') || content.includes('Preload') || content.includes('InitReactApp')) {
      console.log(`Script ${count}: Length: ${content.length}`)
      // Look for files or names in the script
      const lines = content.split('\n')
      for (const line of lines) {
        if (line.includes('entries') || line.includes('props') || line.includes('preloadedState') || line.includes('InitReactApp')) {
          console.log('Matching Line (first 300 chars):', line.trim().substring(0, 300))
        }
      }
    }
  }
}

run()
