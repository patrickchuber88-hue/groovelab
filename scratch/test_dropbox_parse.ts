async function run() {
  const testUrl = 'https://www.dropbox.com/scl/fo/492vskq8m854z5sz/h?rlkey=abc'
  
  try {
    console.log('Fetching Dropbox folder page with native fetch...')
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    console.log('Status:', response.status)
    const html = await response.text()
    console.log('HTML Length:', html.length)
    
    // Let's look for file patterns or JSON blobs in the HTML
    // Dropbox preloaded state usually contains lists of file entries with properties like 'name', 'is_dir', 'preview_url', etc.
    const match = html.match(/InitReactApp.*?;/s)
    if (match) {
      console.log('Found InitReactApp data!')
      console.log(match[0].substring(0, 1000))
    } else {
      console.log('No InitReactApp string found.')
      // Search for any occurrence of filename-like strings or json keys
      const hasMetadata = html.includes('metadata')
      console.log('Contains metadata:', hasMetadata)
    }
  } catch (err: any) {
    console.error('Error:', err.message)
  }
}

run()
