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
    print("Fetching students...")
    try:
        url_users = f"{SUPABASE_URL}/rest/v1/users?role=eq.student&select=id,first_name,last_name,role,qr_token,teacher_qr_token,school_id,is_app_user"
        students = make_request(url_users)
    except Exception as e:
        print(f"Error fetching users: {e}")
        return

    null_school = []
    is_app_user_false = []
    
    for s in students:
        if not s.get('school_id'):
            null_school.append(s)
        if not s.get('is_app_user'):
            is_app_user_false.append(s)
            
    print(f"\nTotal Students: {len(students)}")
    print(f"Students with null school_id: {len(null_school)}")
    print(f"Students with is_app_user = false or null: {len(is_app_user_false)}")
    
    if null_school:
        print("\n--- Students with null school_id ---")
        for s in null_school:
            print(f"  {s.get('first_name')} {s.get('last_name')} (ID: {s.get('id')})")
            
    if is_app_user_false:
        print("\n--- Students with is_app_user = false/null ---")
        for s in is_app_user_false[:15]:  # show up to 15
            print(f"  {s.get('first_name')} {s.get('last_name')} (ID: {s.get('id')})")
        if len(is_app_user_false) > 15:
            print(f"  ... and {len(is_app_user_false) - 15} more")

if __name__ == "__main__":
    main()
