import json
import urllib.request

def swap_subdomains():
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys"
    
    # 1. Update the old school subdomain to free up the slot
    url_old = "https://supabase.campus-groovelab.de/rest/v1/schools?id=eq.53e83805-1d5a-4ed8-988e-1fb0b8200b9c"
    headers_old = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json"
    }
    payload_old = {"subdomain": "musaek-bad-saeckingen-old"}
    data_old = json.dumps(payload_old).encode('utf-8')
    req_old = urllib.request.Request(url_old, data=data_old, headers=headers_old, method="PATCH")
    try:
        with urllib.request.urlopen(req_old) as response:
            print("Successfully updated old school subdomain to 'musaek-bad-saeckingen-old'")
    except Exception as e:
        print("Error updating old school:", e)
        return

    # 2. Update the new school subdomain to 'musaek-bad-saeckingen'
    url_new = "https://supabase.campus-groovelab.de/rest/v1/schools?id=eq.cc05137f-5904-4774-80be-6a172c52bf99"
    headers_new = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    payload_new = {
        "subdomain": "musaek-bad-saeckingen",
        "is_trial": True,
        "trial_ends_at": "2026-08-12T00:00:00+00:00",
        "status": "active"
    }
    data_new = json.dumps(payload_new).encode('utf-8')
    req_new = urllib.request.Request(url_new, data=data_new, headers=headers_new, method="PATCH")
    try:
        with urllib.request.urlopen(req_new) as response:
            res_data = json.loads(response.read().decode())
            print("Successfully activated trial and linked subdomain for new school!")
            print(json.dumps(res_data, indent=2))
    except Exception as e:
        print("Error updating new school:", e)

if __name__ == "__main__":
    swap_subdomains()
