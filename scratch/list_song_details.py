import re
import json
import urllib.request

with open('.env.local', 'r') as f:
    env = f.read()

url = re.search(r'VITE_SUPABASE_URL=(.*)', env).group(1).strip().replace("'", "").replace('"', "")
key = re.search(r'VITE_SUPABASE_ANON_KEY=(.*)', env).group(1).strip().replace("'", "").replace('"', "")

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}'
}

# Fetch songs
req_url = f"{url}/rest/v1/songs?select=*"
req = urllib.request.Request(req_url, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        html = response.read()
        songs = json.loads(html.decode('utf-8'))
        
        print("Songs:")
        for s in songs:
            print(f"Song ID: {s['id']}, Title: {s['title']}, Instrumentation: {s.get('instrumentation')}")
except Exception as e:
    print("Error:", e)
