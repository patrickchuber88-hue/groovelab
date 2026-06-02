import base64
import json
import hmac
import hashlib
import secrets
import time
import re

def base64url_encode(payload):
    if isinstance(payload, dict):
        payload = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    elif isinstance(payload, str):
        payload = payload.encode('utf-8')
    return base64.urlsafe_b64encode(payload).decode('utf-8').replace('=', '')

def sign_hs256(header, payload, secret):
    header_encoded = base64url_encode(header)
    payload_encoded = base64url_encode(payload)
    msg = f"{header_encoded}.{payload_encoded}".encode('utf-8')
    sig = hmac.new(secret.encode('utf-8'), msg, hashlib.sha256).digest()
    sig_encoded = base64.urlsafe_b64encode(sig).decode('utf-8').replace('=', '')
    return f"{header_encoded}.{payload_encoded}.{sig_encoded}"

# Generate new secret (base64 random)
jwt_secret = base64.b64encode(secrets.token_bytes(32)).decode('utf-8').replace('=', '').replace('+', '-').replace('/', '_')

now = int(time.time())
exp = now + (60 * 60 * 24 * 365 * 100) # 100 years

header = {"alg": "HS256", "typ": "JWT"}
anon_payload = {"role": "anon", "iss": "supabase", "iat": now, "exp": exp}
service_payload = {"role": "service_role", "iss": "supabase", "iat": now, "exp": exp}

new_anon_key = sign_hs256(header, anon_payload, jwt_secret)
new_service_key = sign_hs256(header, service_payload, jwt_secret)

# Read and modify env file
env_path = "/root/supabase-project/.env"
with open(env_path, "r") as f:
    lines = f.read()

lines = re.sub(r"^JWT_SECRET=.*", f"JWT_SECRET={jwt_secret}", lines, flags=re.MULTILINE)
lines = re.sub(r"^ANON_KEY=.*", f"ANON_KEY={new_anon_key}", lines, flags=re.MULTILINE)
lines = re.sub(r"^SERVICE_ROLE_KEY=.*", f"SERVICE_ROLE_KEY={new_service_key}", lines, flags=re.MULTILINE)

with open(env_path, "w") as f:
    f.write(lines)

print("SUCCESS")
print(f"NEW_ANON_KEY={new_anon_key}")
print(f"NEW_SERVICE_KEY={new_service_key}")
