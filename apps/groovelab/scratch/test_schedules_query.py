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
    student_id = "02b976e8-0893-443b-a41a-5e7010fd05f3"
    print("Testing Schedules select statement...")
    try:
        url = f"{SUPABASE_URL}/rest/v1/schedules?student_id=eq.{student_id}&select=id,time_slot,status,teacher_id,rooms(name),teacher:users!schedules_teacher_id_fkey(first_name,last_name)"
        data = make_request(url)
        print("Schedules query Success:", data)
    except Exception as e:
        print("Schedules query Failed:", e)
        if hasattr(e, 'read'):
            print("Error Details:", e.read().decode())

if __name__ == "__main__":
    main()
