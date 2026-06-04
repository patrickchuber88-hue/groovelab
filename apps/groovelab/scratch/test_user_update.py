import urllib.request
import json

SUPABASE_URL = "https://supabase.campus-groovelab.de"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwNDE3ODE1LCJleHAiOjQ5MzQwMTc4MTV9.zOsuxweIlQBi7doeBoUqg9aTR6-qzOr0sjsa0Oee5cc"

def test_update():
    user_id = "02b976e8-0893-443b-a41a-5e7010fd05f3"
    url = f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}"
    
    payload = {
        "personal_pin": "1234",
        "is_pin_activated": True
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
        method="PATCH"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            print("User Update Success:", res_data)
            # Revert update
            revert_payload = {
                "personal_pin": None,
                "is_pin_activated": False
            }
            revert_req = urllib.request.Request(
                url,
                data=json.dumps(revert_payload).encode(),
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json"
                },
                method="PATCH"
            )
            with urllib.request.urlopen(revert_req) as revert_res:
                print("Reverted user update.")
    except Exception as e:
        print("User Update Failed:", e)
        if hasattr(e, 'read'):
            print("Error Details:", e.read().decode())

if __name__ == "__main__":
    test_update()
