import fs from 'fs'

function run() {
  const html = fs.readFileSync('scratch/dropbox_folder.html', 'utf8')
  
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
  let match
  let count = 0
  
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1]
    count++
    if (count === 5) {
      fs.writeFileSync('scratch/script5.js', content)
      console.log('Saved Script 5 to scratch/script5.js')
      // Let's print out lines that contain key terms like 'props' or 'entries' or 'InitReactApp'
      const lines = content.split('\n')
      lines.forEach((line, index) => {
        if (line.includes('entries') || line.includes('file') || line.includes('props') || line.includes('url')) {
          console.log(`Line ${index}: ${line.trim().substring(0, 150)}`)
        }
      })
      break
    }
  }
}

run()
