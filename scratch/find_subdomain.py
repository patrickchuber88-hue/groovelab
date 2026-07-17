import json
import urllib.request

def find_subdomain():
    url = "https://supabase.campus-groovelab.de/rest/v1/schools?subdomain=eq.musaek-bad-saeckingen"
    service_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys"
    
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}"
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print("Row with subdomain:")
            print(json.dumps(data, indent=2))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    find_subdomain()
