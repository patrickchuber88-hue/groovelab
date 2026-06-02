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
    elif isinstance(payload, bytes):
        pass
    else:
        raise ValueError("Unsupported payload type")
    return base64.urlsafe_b64encode(payload).decode('utf-8').replace('=', '')

def sign_hs256(header, payload, secret):
    header_encoded = base64url_encode(header)
    payload_encoded = base64url_encode(payload)
    msg = f"{header_encoded}.{payload_encoded}".encode('utf-8')
    sig = hmac.new(secret.encode('utf-8'), msg, hashlib.sha256).digest()
    sig_encoded = base64.urlsafe_b64encode(sig).decode('utf-8').replace('=', '')
    return f"{header_encoded}.{payload_encoded}.{sig_encoded}"

# Generate new secret (plaintext string, e.g. 40 alphanumeric characters to match the old format)
jwt_secret = secrets.token_urlsafe(30) # ~40 chars

# base64url representation of the secret for JWK 'k' parameter
jwk_k = base64url_encode(jwt_secret.encode('utf-8'))

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
    env_content = f.read()

# Parse JWT_JWKS and update the oct key
jwks_match = re.search(r"^JWT_JWKS=(.*)", env_content, re.MULTILINE)
if jwks_match:
    jwks_str = jwks_match.group(1)
    try:
        jwks = json.loads(jwks_str)
        updated = False
        for key in jwks.get("keys", []):
            if key.get("kty") == "oct":
                key["k"] = jwk_k
                updated = True
        if updated:
            new_jwks_str = json.dumps(jwks, separators=(',', ':'))
            env_content = re.sub(r"^JWT_JWKS=.*", f"JWT_JWKS={new_jwks_str}", env_content, flags=re.MULTILINE)
            print("✅ JWT_JWKS successfully updated with new octet key.")
    except Exception as e:
        print("⚠️ Failed to parse JWT_JWKS JSON:", e)

env_content = re.sub(r"^JWT_SECRET=.*", f"JWT_SECRET={jwt_secret}", env_content, flags=re.MULTILINE)
env_content = re.sub(r"^ANON_KEY=.*", f"ANON_KEY={new_anon_key}", env_content, flags=re.MULTILINE)
env_content = re.sub(r"^SERVICE_ROLE_KEY=.*", f"SERVICE_ROLE_KEY={new_service_key}", env_content, flags=re.MULTILINE)

with open(env_path, "w") as f:
    f.write(env_content)

print("SUCCESS")
print(f"NEW_ANON_KEY={new_anon_key}")
print(f"NEW_SERVICE_KEY={new_service_key}")
