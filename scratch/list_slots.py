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

# Fetch band_song_slots
req_url = f"{url}/rest/v1/band_song_slots?select=*,band_songs(*,songs(*)),profiles:users!user_id(*)"
req = urllib.request.Request(req_url, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        html = response.read()
        slots = json.loads(html.decode('utf-8'))
        
        print("Band Song Slots:")
        for s in slots:
            song_title = s.get('band_songs', {}).get('songs', {}).get('title')
            user_name = s.get('profiles', {}).get('first_name')
            print(f"Slot ID: {s['id']}, Song: {song_title}, User: {user_name}, Instrument: {s['instrument']}, Part: {s['part_number']}, Status: {s['status']}")
except Exception as e:
    print("Error:", e)
