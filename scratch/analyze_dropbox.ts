import fs from 'fs'

async function run() {
  const testUrl = 'https://www.dropbox.com/scl/fo/492vskq8m854z5sz/h?rlkey=abc' // We will just mock or check a real dropbox folder page if we had one
  
  try {
    // Let's read the HTML we fetched in the previous step
    // But since we didn't write it to a file, let's fetch it again and write it to a file first so we can analyze it!
    console.log('Fetching Dropbox folder HTML...')
    const response = await fetch('https://www.dropbox.com/sh/q0k9y8pzn32fwhc/AADvK851y5Kj8z5sz?dl=0', { // Using a sample public folder link
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    const html = await response.text()
    fs.writeFileSync('scratch/dropbox_folder.html', html)
    console.log('Saved HTML to scratch/dropbox_folder.html (Length:', html.length, ')')
    
    // Let's search for file patterns or JSON blobs
    // Find all links containing '.pdf' or shared links
    const matches = html.match(/href="([^"]*\.pdf[^"]*)"/g)
    console.log('PDF links found via href regex:', matches?.length || 0)
    if (matches) {
      console.log('First 5 matches:', matches.slice(0, 5))
    }
    
    // Look for JSON state variables
    const jsonMatches = html.match(/("filename"|"name"|"path"|"bytes"|"file_id"|"preview_url")\s*:\s*("[^"]*")/g)
    console.log('JSON matches found:', jsonMatches?.length || 0)
    if (jsonMatches) {
      console.log('First 10 matches:', jsonMatches.slice(0, 10))
    }
  } catch (err: any) {
    console.error('Error:', err.message)
  }
}

run()
