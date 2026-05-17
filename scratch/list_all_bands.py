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

# Fetch bands
req_url = f"{url}/rest/v1/bands?select=*,band_members(*),band_songs(*,songs(*),band_song_slots(*))&school_id=eq.11111111-1111-1111-1111-111111111111"
req = urllib.request.Request(req_url, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        html = response.read()
        bands = json.loads(html.decode('utf-8'))
        
        print("All Bands and their songs/slots:")
        for b in bands:
            print(f"Band ID: {b['id']}, Name: {b['name']}, Status: {b['status']}")
            print(f"  Members:")
            for m in b.get('band_members', []):
                print(f"    - User: {m['user_id']}, Instrument: {m['instrument']}")
            print(f"  Songs:")
            for bs in b.get('band_songs', []):
                print(f"    - Song: {bs.get('songs', {}).get('title')} (Status: {bs['status']})")
                print(f"      Slots:")
                for s in bs.get('band_song_slots', []):
                    print(f"        * Slot: {s['instrument']} (User: {s['user_id']}, Status: {s['status']}, Part: {s.get('part_number')})")
except Exception as e:
    print("Error:", e)
