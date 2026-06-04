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
    print(f"Simulating dashboard loading for student: {student_id}\n")

    # 1. users and schools
    try:
        url = f"{SUPABASE_URL}/rest/v1/users?id=eq.{student_id}&select=*,schools(*)"
        user_data = make_request(url)
        print("  [OK] User + School query")
        user = user_data[0]
        school_id = user['school_id']
    except Exception as e:
        print("  [FAIL] User + School query:", e)
        return

    # 2. avatars
    try:
        url = f"{SUPABASE_URL}/rest/v1/avatars?user_id=eq.{student_id}&select=avatar_style,instrument_type,evolution_level,xp,asset_path,streak_flame"
        avatars = make_request(url)
        print("  [OK] Avatars query")
    except Exception as e:
        print("  [FAIL] Avatars query:", e)

    # 3. student_stats
    try:
        url = f"{SUPABASE_URL}/rest/v1/student_stats?student_id=eq.{student_id}&select=monthly_focus_minutes"
        stats = make_request(url)
        print("  [OK] Student Stats query")
    except Exception as e:
        print("  [FAIL] Student Stats query:", e)

    # 4. schedule_occurrences (fetchSchedule)
    try:
        url = f"{SUPABASE_URL}/rest/v1/schedule_occurrences?student_id=eq.{student_id}&date=gte.2026-06-03&select=*,schedule:schedule_id(*),teacher:users!schedule_occurrences_teacher_id_fkey(first_name,last_name)&order=date.asc,start_time.asc"
        make_request(url)
        print("  [OK] Schedule Occurrences (fetchSchedule)")
    except Exception as e:
        print("  [FAIL] Schedule Occurrences (fetchSchedule):", e)
        if hasattr(e, 'read'):
            print("    Details:", e.read().decode())

    # 5. schedule_occurrences (fetchSchoolYearSchedule)
    try:
        url = f"{SUPABASE_URL}/rest/v1/schedule_occurrences?student_id=eq.{student_id}&date=gte.2025-08-01&date=lte.2026-07-31&select=*,schedule:schedule_id(*),teacher:users!schedule_occurrences_teacher_id_fkey(first_name,last_name)&order=date.asc,start_time.asc"
        make_request(url)
        print("  [OK] Schedule Occurrences (fetchSchoolYearSchedule)")
    except Exception as e:
        print("  [FAIL] Schedule Occurrences (fetchSchoolYearSchedule):", e)

    # 6. schedules (fetchSchoolYearSchedule)
    try:
        url = f"{SUPABASE_URL}/rest/v1/schedules?student_id=eq.{student_id}&select=*,teacher:users!schedules_teacher_id_fkey(first_name,last_name)"
        make_request(url)
        print("  [OK] Schedules (fetchSchoolYearSchedule)")
    except Exception as e:
        print("  [FAIL] Schedules (fetchSchoolYearSchedule):", e)

    # 7. lehrwerke (fetchStudentProgress)
    try:
        url = f"{SUPABASE_URL}/rest/v1/lehrwerke?school_id=eq.{school_id}&select=*&order=title"
        make_request(url)
        print("  [OK] Lehrwerke (fetchStudentProgress)")
    except Exception as e:
        print("  [FAIL] Lehrwerke (fetchStudentProgress):", e)

    # 8. progress_matrix (fetchStudentProgress direct fallback)
    try:
        url = f"{SUPABASE_URL}/rest/v1/progress_matrix?student_id=eq.{student_id}&select=*&order=updated_at.desc"
        make_request(url)
        print("  [OK] Progress Matrix (fetchStudentProgress)")
    except Exception as e:
        print("  [FAIL] Progress Matrix (fetchStudentProgress):", e)

    print("\nSimulation complete. If everything says [OK], the queries are not causing the crash.")

if __name__ == "__main__":
    main()
