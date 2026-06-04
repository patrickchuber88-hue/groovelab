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
    try:
        url_users = f"{SUPABASE_URL}/rest/v1/users?limit=1"
        data = make_request(url_users)
        if data:
            print("Available columns in users table:")
            for k in data[0].keys():
                print(f"  {k}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
