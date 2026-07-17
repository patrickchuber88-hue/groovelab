import json
import urllib.request

def check_school():
    url = "https://supabase.campus-groovelab.de/rest/v1/schools?id=eq.cc05137f-5904-4774-80be-6a172c52bf99"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys"
    
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}"
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(json.dumps(data, indent=2))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_school()
