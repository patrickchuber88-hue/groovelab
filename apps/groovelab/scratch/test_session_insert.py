import urllib.request
import json
import sys

SUPABASE_URL = "https://supabase.campus-groovelab.de"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc"

def test_insert():
    user_id = "02b976e8-0893-443b-a41a-5e7010fd05f3"
    url = f"{SUPABASE_URL}/rest/v1/sessions"
    
    payload = {
        "user_id": user_id,
        "station_id": None,
        "gps_verified": True,
        "check_in_time": "2026-06-03T23:00:00.000Z"
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            print("Session Insert Success:", res_data)
            # If succeeded, delete it immediately to keep DB clean
            session_id = res_data[0]['id']
            del_url = f"{SUPABASE_URL}/rest/v1/sessions?id=eq.{session_id}"
            del_req = urllib.request.Request(
                del_url,
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}"
                },
                method="DELETE"
            )
            with urllib.request.urlopen(del_req) as del_res:
                print("Cleaned up/deleted test session.")
    except Exception as e:
        print("Session Insert Failed:", e)
        if hasattr(e, 'read'):
            print("Error Details:", e.read().decode())

if __name__ == "__main__":
    test_insert()
