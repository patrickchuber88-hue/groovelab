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
    # Felix Richter ID
    user_id = "02b976e8-0893-443b-a41a-5e7010fd05f3"
    
    print("Testing Stage 1 Queries...")
    
    # 1. users with schools
    try:
        url = f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}&select=*,schools(*)"
        data = make_request(url)
        print("User & Schools Query: Success")
        print(f"  School: {data[0].get('schools')}")
    except Exception as e:
        print(f"User & Schools Query: Failed - {e}")

    # 2. sessions
    try:
        url = f"{SUPABASE_URL}/rest/v1/sessions?user_id=eq.{user_id}&check_out_time=is.null&select=*,stations(name)&order=check_in_time.desc&limit=1"
        data = make_request(url)
        print("Sessions Query: Success")
    except Exception as e:
        print(f"Sessions Query: Failed - {e}")

    # 3. memberships
    try:
        url = f"{SUPABASE_URL}/rest/v1/band_members?user_id=eq.{user_id}&select=id,instrument,confetti_seen,bands(id,name,school_id,song_id,status,photo_url,songs(*),band_songs(*,songs(*),band_song_slots(*,profiles:users!user_id(id,first_name,photo_url,user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id,song_id,instrument,progress_percent,is_pending_approval,is_stage_ready)))))"
        data = make_request(url)
        print("Memberships Query: Success")
    except Exception as e:
        print(f"Memberships Query: Failed - {e}")

if __name__ == "__main__":
    main()
