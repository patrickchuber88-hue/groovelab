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
    user_id = "02b976e8-0893-443b-a41a-5e7010fd05f3"
    school_id = "74713df2-6176-4a41-a8cd-9fbebe34e9b8"
    
    print("Testing Stage 2 Queries...")
    
    # 1. user_song_skills
    try:
        url = f"{SUPABASE_URL}/rest/v1/user_song_skills?user_id=eq.{user_id}&select=id,progress_percent,is_stage_ready,is_pending_approval,instrument,part_number,difficulty_level,is_favorite,verified_by_id,songs(*)"
        make_request(url)
        print("  1. user_song_skills: Success")
    except Exception as e:
        print(f"  1. user_song_skills: Failed - {e}")

    # 2. songs (wall)
    try:
        url = f"{SUPABASE_URL}/rest/v1/songs?school_id=eq.{school_id}&is_campus_active=eq.false&select=id,artist,title,media_link,instrumentation,user_song_skills(id,song_id,instrument,part_number,difficulty_level,is_stage_ready,user_id,created_at,formation_group,profiles:users!user_song_skills_user_id_fkey(first_name,photo_url,school_id)),band_songs(id,band_id,status,is_exclusive,difficulty_level,bands(id,name,photo_url,school_id),band_song_slots(id,user_id,instrument,status,profiles:users!band_song_slots_user_id_fkey(first_name,photo_url)))"
        make_request(url)
        print("  2. songs (wall): Success")
    except Exception as e:
        print(f"  2. songs (wall): Failed - {e}")

    # 3. band_members
    try:
        url = f"{SUPABASE_URL}/rest/v1/band_members?bands.school_id=eq.{school_id}&select=user_id,bands!inner(id,status,song_id,school_id,band_songs(song_id,status))"
        make_request(url)
        print("  3. band_members: Success")
    except Exception as e:
        print(f"  3. band_members: Failed - {e}")

    # 4. bands
    try:
        url = f"{SUPABASE_URL}/rest/v1/bands?school_id=eq.{school_id}&status=in.(forming,active)&select=*,band_members(*,profiles:users(id,first_name,photo_url)),band_songs(*,band_song_slots(*,profiles:users!user_id(id,first_name,photo_url,user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id,song_id,instrument,progress_percent,is_pending_approval,is_stage_ready))))"
        make_request(url)
        print("  4. bands: Success")
    except Exception as e:
        print(f"  4. bands: Failed - {e}")

    # 5. songs (library)
    try:
        url = f"{SUPABASE_URL}/rest/v1/songs?school_id=eq.{school_id}&is_campus_active=eq.false&order=level,artist&select=*"
        make_request(url)
        print("  5. songs (library): Success")
    except Exception as e:
        print(f"  5. songs (library): Failed - {e}")

    # 6. userBands
    try:
        # For bandIds, let's assume empty list first or mock one
        url = f"{SUPABASE_URL}/rest/v1/bands?select=*,songs(*),band_members(*,users(*)),band_songs(*,songs(*),band_song_slots(*,profiles:users!user_id(id,first_name,photo_url,user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id,song_id,instrument,progress_percent,is_pending_approval,is_stage_ready)))),coach:users!coach_id(first_name,last_name,photo_url)"
        make_request(url)
        print("  6. userBands: Success")
    except Exception as e:
        print(f"  6. userBands: Failed - {e}")

    # 7. bands (school)
    try:
        url = f"{SUPABASE_URL}/rest/v1/bands?school_id=eq.{school_id}&order=name&select=*,songs(title,artist,instrumentation),band_members(*,users!user_id(*)),band_songs(*,songs(id,title,artist,instrumentation),band_song_slots(*,profiles:users!user_id(id,first_name,photo_url,user_song_skills:user_song_skills!user_song_skills_user_id_fkey(id,song_id,instrument,progress_percent,is_pending_approval,is_stage_ready)))),coach:users!coach_id(first_name,last_name,photo_url)"
        make_request(url)
        print("  7. bands (school): Success")
    except Exception as e:
        print(f"  7. bands (school): Failed - {e}")

    # 8. teachers
    try:
        url = f"{SUPABASE_URL}/rest/v1/users?school_id=eq.{school_id}&role=in.(teacher,admin)&order=first_name&select=*"
        make_request(url)
        print("  8. teachers: Success")
    except Exception as e:
        print(f"  8. teachers: Failed - {e}")

    # 9. activeSessions
    try:
        url = f"{SUPABASE_URL}/rest/v1/sessions?users.school_id=eq.{school_id}&check_out_time=is.null&select=user_id,station_id,users!inner(role,school_id,last_seen)"
        make_request(url)
        print("  9. activeSessions: Success")
    except Exception as e:
        print(f"  9. activeSessions: Failed - {e}")

if __name__ == "__main__":
    main()
