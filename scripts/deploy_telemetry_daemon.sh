#!/usr/bin/env bash
# Campus-Groovelab Telemetry Daemon Deployment Script
# Target Host: Hetzner VPS (178.105.10.2)

set -e

SERVER_IP="178.105.10.2"
REMOTE_PATH="/opt/groovelab/telemetry"

echo "============================================================"
echo "🚀 Campus-Groovelab Telemetry Systemd Daemon Installer"
echo "Target Server: $SERVER_IP"
echo "============================================================"

# 1. Ensure local script is executable
chmod +x "$(dirname "$0")/groovelab_telemetry_agent.py"

# 2. Copy script to remote Hetzner Server
echo "📡 Copying Telemetry Agent script to Hetzner VPS..."
ssh root@$SERVER_IP "mkdir -p $REMOTE_PATH"
scp "$(dirname "$0")/groovelab_telemetry_agent.py" root@$SERVER_IP:$REMOTE_PATH/groovelab_telemetry_agent.py

# 3. Create Systemd Service unit file on remote Hetzner Server
echo "⚙️ Configuring Systemd Service (groovelab-telemetry.service)..."
ssh root@$SERVER_IP "cat << 'EOF' > /etc/systemd/system/groovelab-telemetry.service
[Unit]
Description=Campus-Groovelab Realtime Server Telemetry Daemon
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 $REMOTE_PATH/groovelab_telemetry_agent.py
Restart=always
RestartSec=10
Environment=\"PYTHONUNBUFFERED=1\"

[Install]
WantedBy=multi-user.target
EOF"

# 4. Enable and start Systemd Service
echo "🔄 Reloading Systemd & Starting groovelab-telemetry.service..."
ssh root@$SERVER_IP "systemctl daemon-reload && systemctl enable groovelab-telemetry.service && systemctl restart groovelab-telemetry.service"

# 5. Check Service Status
echo "✅ Checking Service Status..."
ssh root@$SERVER_IP "systemctl status groovelab-telemetry.service --no-pager"

echo "============================================================"
echo "🎉 Telemetry Daemon successfully installed & active on Hetzner VPS!"
echo "Check your Masterdashboard Telemetrie & Health Board to see live 30s updates."
echo "============================================================"
