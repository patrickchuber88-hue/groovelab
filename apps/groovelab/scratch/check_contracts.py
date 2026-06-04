import urllib.request
import json
from datetime import datetime

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
    print("Fetching student user details...")
    try:
        url_users = f"{SUPABASE_URL}/rest/v1/users?role=eq.student&select=id,first_name,last_name,contract_ends_at,contract_decision_made"
        students = make_request(url_users)
        print(f"Found {len(students)} students.")
    except Exception as e:
        print(f"Error: {e}")
        return

    now = datetime.now()
    
    print("\n--- EXPIRED OR PROMPT STUCK STUDENTS ---")
    count = 0
    for s in students:
        ends_at = s.get('contract_ends_at')
        decision = s.get('contract_decision_made')
        name = f"{s.get('first_name') or ''} {s.get('last_name') or ''}".strip()
        
        is_expired = False
        if ends_at:
            try:
                dt = datetime.strptime(ends_at.split('T')[0], "%Y-%m-%d")
                if dt < now:
                    is_expired = True
            except Exception:
                pass
                
        needs_prompt = (ends_at and not is_expired and (decision is False or decision is None))
        
        if is_expired or needs_prompt:
            print(f"Student: {name} (ID: {s['id']})")
            print(f"  Contract Ends: {ends_at}")
            print(f"  Decision Made: {decision}")
            print(f"  Status: {'EXPIRED' if is_expired else 'NEEDS PROMPT'}")
            print("-" * 40)
            count += 1
            
    print(f"Total problematic student contracts: {count}")

if __name__ == "__main__":
    main()
