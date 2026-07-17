import json
import urllib.request

def update_school():
    url = "https://supabase.campus-groovelab.de/rest/v1/schools?id=eq.cc05137f-5904-4774-80be-6a172c52bf99"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys"
    
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    payload = {
        "subdomain": "musaek-bad-saeckingen",
        "is_trial": True,
        "trial_ends_at": "2026-08-12T00:00:00+00:00",
        "status": "active"
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            print("Update Success! Returned:")
            print(json.dumps(res_data, indent=2))
    except Exception as e:
        print("Error during update:", e)

if __name__ == "__main__":
    update_school()
