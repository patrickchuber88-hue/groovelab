import urllib.request
import json

SUPABASE_URL = "https://supabase.campus-groovelab.de"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc"

def make_request(url):
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}"
        }
    )
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def main():
    print("Fetching 5 most recent sessions...")
    try:
        url = f"{SUPABASE_URL}/rest/v1/sessions?select=id,check_in_time,check_out_time,user_id,users(first_name,last_name,role,is_pin_activated)&order=check_in_time.desc&limit=5"
        data = make_request(url)
        for s in data:
            u = s.get('users') or {}
            name = f"{u.get('first_name') or ''} {u.get('last_name') or ''}".strip()
            print(f"Session: {s['id']}")
            print(f"  Time: {s['check_in_time']}")
            print(f"  User: {name} (ID: {s['user_id']}, Role: {u.get('role')})")
            print(f"  PIN Activated: {u.get('is_pin_activated')}")
            print("-" * 40)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
