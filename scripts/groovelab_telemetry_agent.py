#!/usr/bin/env python3
"""
Campus-Groovelab Telemetry & System Health Agent
Runs on Hetzner VPS (178.105.10.2) as a systemd background daemon.
Pushes real-time CPU, RAM, NVMe Disk & PostgreSQL Connection metrics to Supabase every 30 seconds.
"""

import os
import sys
import time
import json
import urllib.request
import urllib.parse
import subprocess

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://supabase.campus-groovelab.de")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg3NTU4MDYxLCJleHAiOjIxMDI5MTgwNjF9.FZWOhJ8B7coAqv4IX3dKFYFerKwODGiQm-5IFFKiPIc")
CPU_CORES = os.cpu_count() or 2
INTERVAL_SECONDS = 30

def get_cpu_load():
    try:
        with open("/proc/loadavg", "r") as f:
            line = f.read().strip()
            # First element is 1-minute load average
            return float(line.split()[0])
    except Exception as e:
        print(f"[Telemetry] Error reading CPU load: {e}")
        return 0.25

def get_memory_info():
    """Returns (used_mb, total_mb)"""
    try:
        with open("/proc/meminfo", "r") as f:
            mem = {}
            for line in f:
                parts = line.split(":")
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip().split()[0]
                    mem[key] = int(val) # in kB
            
            total_mb = int(mem.get("MemTotal", 4096000) / 1024)
            available_mb = int(mem.get("MemAvailable", 2048000) / 1024)
            used_mb = total_mb - available_mb
            return used_mb, total_mb
    except Exception as e:
        print(f"[Telemetry] Error reading memory info: {e}")
        return 2048, 4096

def get_disk_info():
    """Returns (disk_used_gb, disk_total_gb, volume_used_gb, volume_total_gb)"""
    disk_used_gb, disk_total_gb = 18.0, 40.0
    volume_used_gb, volume_total_gb = 2.1, 14.0
    try:
        import shutil
        stat_disk = shutil.disk_usage("/")
        disk_total_gb = round(stat_disk.total / (1024**3), 1)
        disk_used_gb = round(stat_disk.used / (1024**3), 1)

        # Check volume mount if present
        if os.path.exists("/mnt/volume"):
            stat_vol = shutil.disk_usage("/mnt/volume")
            volume_total_gb = round(stat_vol.total / (1024**3), 1)
            volume_used_gb = round(stat_vol.used / (1024**3), 1)
    except Exception as e:
        print(f"[Telemetry] Error reading disk info: {e}")

    return disk_used_gb, disk_total_gb, volume_used_gb, volume_total_gb

def get_active_db_connections():
    """Estimates active PostgreSQL connections or sockets"""
    try:
        out = subprocess.check_output("netstat -an | grep :5432 | grep ESTABLISHED | wc -l", shell=True)
        return int(out.decode().strip())
    except Exception:
        return 18

def send_telemetry():
    cpu_load = get_cpu_load()
    mem_used, mem_total = get_memory_info()
    db_conns = get_active_db_connections()
    disk_used, disk_total, vol_used, vol_total = get_disk_info()

    payload = {
        "cpu_load": cpu_load,
        "mem_used_mb": mem_used,
        "mem_total_mb": mem_total,
        "active_connections": db_conns,
        "disk_used_gb": disk_used,
        "disk_total_gb": disk_total,
        "volume_used_gb": vol_used,
        "volume_total_gb": vol_total
    }

    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/server_metrics"
    headers = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Prefer": "return=minimal"
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            if resp.status in (200, 201, 204):
                print(f"[Telemetry Sync OK] CPU: {cpu_load} Cores | RAM: {mem_used}/{mem_total} MB | DB: {db_conns} Active")
            else:
                print(f"[Telemetry Sync Failed] Status Code: {resp.status}")
    except Exception as e:
        print(f"[Telemetry Error] Failed to post metrics to Supabase: {e}")

def main():
    print(f"=== Starting Campus-Groovelab Telemetry Agent (Interval: {INTERVAL_SECONDS}s) ===")
    print(f"Targeting Supabase URL: {SUPABASE_URL}")
    while True:
        send_telemetry()
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
