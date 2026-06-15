#!/bin/bash
echo "🎸 GrooveLab Gemini Key Setup"
echo "============================="
read -p "Bitte füge deinen Gemini API-Schlüssel hier ein und drücke Enter: " key
if [ -z "$key" ]; then
  echo "Fehler: Kein Schlüssel eingegeben!"
  exit 1
fi
echo "Übertrage Schlüssel zum Server..."
ssh -o StrictHostKeyChecking=no -i /Users/patrickhuber/.ssh/id_ed25519 root@178.105.10.2 "sed -i '/GEMINI_API_KEY/d' /root/supabase-project/.env && echo 'GEMINI_API_KEY=$key' >> /root/supabase-project/.env && cd /root/supabase-project && docker compose up -d functions"
echo "✅ Fertig! Der Schlüssel wurde auf dem Server eingetragen und der Dienst neu gestartet."
