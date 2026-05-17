import re
import json
import urllib.request

with open('.env.local', 'r') as f:
    env = f.read()

url = re.search(r'VITE_SUPABASE_URL=(.*)', env).group(1).strip().replace("'", "").replace('"', "")
key = re.search(r'VITE_SUPABASE_ANON_KEY=(.*)/rest', env or '').group(1).strip().replace("'", "").replace('"', "") if '/rest' in env else re.search(r'VITE_SUPABASE_ANON_KEY=(.*)', env).group(1).strip().replace("'", "").replace('"', "")

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}'
}

# Fetch band_members
req_url = f"{url}/rest/v1/band_members?select=*,bands(*),profiles:users!user_id(*)"
req = urllib.request.Request(req_url, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        html = response.read()
        members = json.loads(html.decode('utf-8'))
        
        print("Band Members:")
        for m in members:
            band_name = m.get('bands', {}).get('name')
            user_name = m.get('profiles', {}).get('first_name')
            print(f"Band: {band_name}, User: {user_name}, Instrument: {m['instrument']}")
except Exception as e:
    print("Error:", e)
