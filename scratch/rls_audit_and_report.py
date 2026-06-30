#!/usr/bin/env python3
import os
import re
import subprocess
import glob

def run_rls_audit():
    migrations_dir = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/supabase/migrations"
    supabase_dir = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/supabase"
    
    # 1. Sammle alle SQL-Dateien in chronologischer Reihenfolge
    sql_files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))
    # Füge Haupt-SQL-Dateien hinzu, falls vorhanden
    for extra in ["production_schema.sql", "final_security_lock.sql"]:
        path = os.path.join(supabase_dir, extra)
        if os.path.exists(path):
            sql_files.append(path)
            
    tables = {} # table_name -> { "created_in": file, "rls_enabled": bool, "policies": [] }
    
    # Reguläre Ausdrücke
    create_table_rx = re.compile(r'(?i)create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_-]+)')
    enable_rls_rx = re.compile(r'(?i)alter\s+table\s+(?:only\s+)?(?:public\.)?([a-zA-Z0-9_-]+)\s+enable\s+row\s+level\s+security')
    disable_rls_rx = re.compile(r'(?i)alter\s+table\s+(?:only\s+)?(?:public\.)?([a-zA-Z0-9_-]+)\s+disable\s+row\s+level\s+security')
    create_policy_rx = re.compile(r'(?i)create\s+policy\s+["\']?([a-zA-Z0-9_\s-]+)["\']?\s+on\s+(?:public\.)?([a-zA-Z0-9_-]+)')
    
    # Parse alle Dateien nacheinander
    for file_path in sql_files:
        filename = os.path.basename(file_path)
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                
            # Finde Tabellenerstellungen
            for match in create_table_rx.finditer(content):
                tbl = match.group(1).lower()
                if tbl not in tables:
                    tables[tbl] = {
                        "created_in": filename,
                        "rls_enabled": False,
                        "policies": []
                    }
                    
            # RLS Aktivierung
            for match in enable_rls_rx.finditer(content):
                tbl = match.group(1).lower()
                if tbl in tables:
                    tables[tbl]["rls_enabled"] = True
                else:
                    # RLS wurde aktiviert, bevor wir CREATE TABLE sahen (oder Tabelle kommt aus System)
                    tables[tbl] = {
                        "created_in": filename,
                        "rls_enabled": True,
                        "policies": []
                    }
                    
            # RLS Deaktivierung
            for match in disable_rls_rx.finditer(content):
                tbl = match.group(1).lower()
                if tbl in tables:
                    tables[tbl]["rls_enabled"] = False
                    
            # Policies
            for match in create_policy_rx.finditer(content):
                pol_name = match.group(1).strip()
                tbl = match.group(2).lower()
                if tbl in tables:
                    tables[tbl]["policies"].append({
                        "name": pol_name,
                        "file": filename
                    })
                else:
                    tables[tbl] = {
                        "created_in": "unknown",
                        "rls_enabled": False,
                        "policies": [{"name": pol_name, "file": filename}]
                    }
        except Exception as e:
            print(f"Fehler beim Lesen von {filename}: {e}")
            
    return tables

def run_e2e_tests():
    print("Starte E2E-Tests in Mock-Modus...")
    env = os.environ.copy()
    env["USE_MOCK"] = "true"
    
    cwd = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app"
    try:
        res = subprocess.run(
            ["npx", "tsx", "apps/groovelab/src/tests/run_e2e_tests.ts"],
            cwd=cwd,
            env=env,
            capture_output=True,
            text=True,
            timeout=180
        )
        return res.returncode, res.stdout, res.stderr
    except Exception as e:
        return -1, "", str(e)

def generate_report(tables, test_code, test_stdout, test_stderr):
    report_path = "/Users/patrickhuber/.gemini/antigravity/brain/5d8ff509-5d38-4b72-97c2-79c577bd8d48/audit_report.md"
    
    # 1. RLS Audit Analyse
    warnings = []
    secured_count = 0
    unsecured_count = 0
    
    for tbl, info in tables.items():
        # Ignoriere System/Hilfstabellen falls nötig
        if tbl in ["spatial_ref_sys"]:
            continue
            
        if not info["rls_enabled"]:
            unsecured_count += 1
            warnings.append(f"⚠️ **{tbl}**: RLS ist **nicht** aktiviert (Erstellt in `{info['created_in']}`).")
        else:
            secured_count += 1
            if not info["policies"]:
                warnings.append(f"ℹ️ **{tbl}**: RLS aktiviert, aber keine spezifischen Policies gefunden.")
                
    # 2. E2E Test Ergebnisse Parsen
    test_summary = "Keine E2E Testergebnisse verfügbar."
    pass_match = re.search(r'(?i)Passed:\s+(\d+)', test_stdout)
    fail_match = re.search(r'(?i)Failed:\s+(\d+)', test_stdout)
    
    passed = pass_match.group(1) if pass_match else "Unbekannt"
    failed = fail_match.group(1) if fail_match else "0"
    
    if "All tests passed" in test_stdout or (failed == "0" and passed != "Unbekannt"):
        test_status = "🟢 ERFOLGREICH"
    else:
        test_status = "🔴 FEHLGESCHLAGEN"
        
    # Schreibe Report
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# 🛡️ Campus-Groovelab Quality & Security Audit Report\n\n")
        f.write(f"Erstellt am: 2026-06-28\n\n")
        
        f.write("## 1. RLS Sicherheits-Audit (Datenbank)\n")
        f.write(f"* **Gesicherte Tabellen (RLS aktiv):** {secured_count}\n")
        f.write(f"* **Ungesicherte Tabellen (RLS inaktiv):** {unsecured_count}\n\n")
        
        if warnings:
            f.write("### Warnungen & Hinweise:\n")
            for w in warnings:
                f.write(f"* {w}\n")
        else:
            f.write("🟢 Alle erfassten Tabellen haben RLS aktiviert und sind geschützt!\n")
            
        f.write("\n### Gefundene Tabellen-Details:\n")
        f.write("| Tabelle | RLS Status | Policies Anzahl | Erstellt in |\n")
        f.write("| :--- | :---: | :---: | :--- |\n")
        for tbl in sorted(tables.keys()):
            if tbl in ["spatial_ref_sys"]:
                continue
            status = "🟢 Aktiv" if tables[tbl]["rls_enabled"] else "🔴 Deaktiviert"
            pol_count = len(tables[tbl]["policies"])
            f.write(f"| `{tbl}` | {status} | {pol_count} | `{tables[tbl]['created_in']}` |\n")
            
        f.write("\n## 2. E2E Test Runner Integration\n")
        f.write(f"* **Status:** {test_status}\n")
        f.write(f"* **Bestandene Tests:** {passed}\n")
        f.write(f"* **Fehlgeschlagene Tests:** {failed}\n\n")
        
        f.write("### Test-Runner Konsolenausgabe (Auszug):\n")
        f.write("```text\n")
        # Schreibe die letzten 40 Zeilen der Testausgabe
        lines = test_stdout.split("\n")
        f.write("\n".join(lines[-40:]))
        f.write("\n```\n")
        
        if test_stderr:
            f.write("\n### Test-Runner Fehler (Stderr):\n")
            f.write(f"```text\n{test_stderr}\n```\n")

    print(f"Audit-Report wurde erfolgreich erstellt unter: {report_path}")

if __name__ == "__main__":
    tables = run_rls_audit()
    code, stdout, stderr = run_e2e_tests()
    generate_report(tables, code, stdout, stderr)
