import subprocess
import getpass
import sys

print("🎸 GrooveLab Gemini Key Setup (Python)")
print("======================================")

# 1. Get key securely
try:
    key = getpass.getpass("Bitte füge deinen Gemini API-Schlüssel (AIzaSy...) ein und drücke Enter: ")
except Exception as e:
    key = input("Bitte füge deinen Gemini API-Schlüssel (AIzaSy...) ein und drücke Enter: ")

key = key.strip()
if not key:
    print("Fehler: Kein Schlüssel eingegeben!")
    sys.exit(1)

# 2. Command to execute on server
cmd = f"sed -i '/GEMINI_API_KEY/d' /root/supabase-project/.env && echo 'GEMINI_API_KEY={key}' >> /root/supabase-project/.env && cd /root/supabase-project && docker compose up -d functions"

print("Übertrage Schlüssel zum Server...")
try:
    # Run SSH command
    res = subprocess.run([
        "ssh", 
        "-o", "StrictHostKeyChecking=no",
        "-i", "/Users/patrickhuber/.ssh/id_ed25519",
        "root@178.105.10.2",
        cmd
    ], capture_output=True, text=True, check=True)
    
    print("STDOUT:", res.stdout)
    print("✅ Fertig! Der Schlüssel wurde auf dem Server eingetragen und der Dienst neu gestartet.")
except subprocess.CalledProcessError as e:
    print("❌ Fehler bei der Ausführung des Befehls auf dem Server:")
    print("STDERR:", e.stderr)
    print("STDOUT:", e.stdout)
    sys.exit(1)
except Exception as e:
    print("❌ Allgemeiner Fehler:", str(e))
    sys.exit(1)
